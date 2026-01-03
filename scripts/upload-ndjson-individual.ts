/**
 * Upload NDJSON files to Medplum using individual resource uploads
 * This version uses updateResource() instead of executeBatch() to ensure
 * the X-Medplum-Project header is respected.
 */

import { MedplumClient, type IClientStorage } from '@medplum/core';
import { Resource } from '@medplum/fhirtypes';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

class MemoryStorage implements IClientStorage {
  private data: Record<string, string> = {};
  getInitPromise(): Promise<void> {
    return Promise.resolve();
  }
  clear(): void {
    this.data = {};
  }
  getString(key: string): string | undefined {
    return this.data[key];
  }
  setString(key: string, value: string | undefined): void {
    if (value === undefined) delete this.data[key];
    else this.data[key] = value;
  }
  getObject<T>(key: string): T | undefined {
    const str = this.getString(key);
    return str ? JSON.parse(str) : undefined;
  }
  setObject<T>(key: string, value: T | undefined): void {
    this.setString(key, value !== undefined ? JSON.stringify(value) : undefined);
  }
  makeKey(key: string): string {
    return key;
  }
}

async function uploadNDJSONFile(
  medplum: MedplumClient,
  filePath: string
): Promise<{ success: number; failed: number }> {
  const filename = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  console.log(`\n📦 Uploading ${filename} (${lines.length} resources)...`);

  let success = 0;
  let failed = 0;

  // Upload resources individually (slower but respects project header)
  for (let i = 0; i < lines.length; i++) {
    try {
      const resource: Resource = JSON.parse(lines[i]);

      // Use createResource for new resources
      if (resource.id) {
        // Try update first (PUT), if it fails try create (POST)
        try {
          await medplum.updateResource(resource);
        } catch (updateError) {
          // If update fails (resource doesn't exist), create it
          await medplum.createResource(resource);
        }
      } else {
        await medplum.createResource(resource);
      }

      success++;

      // Progress indicator every 100 resources
      if ((i + 1) % 100 === 0 || i + 1 === lines.length) {
        process.stdout.write(
          `  Progress: ${i + 1}/${lines.length} (${success} succeeded, ${failed} failed)\r`
        );
      }

      // Small delay to avoid rate limiting
      if (i % 50 === 0 && i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      failed++;
      if (failed < 10) {
        // Only show first 10 errors
        console.error(
          `\n  ✗ Resource ${i + 1} failed:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  console.log(`\n  ✓ ${success} succeeded, ${failed} failed`);
  return { success, failed };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/upload-ndjson-individual.ts <ndjson-directory>');
    console.error(
      'Example: npx tsx scripts/upload-ndjson-individual.ts ../synthea/output/medrefills/2025-12-29_20-05-39/fhir_ndjson'
    );
    process.exit(1);
  }

  const ndjsonDir = args[0];

  if (!fs.existsSync(ndjsonDir)) {
    console.error(`Error: Directory not found: ${ndjsonDir}`);
    process.exit(1);
  }

  const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';
  const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;
  const projectId = process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID;

  if (!clientId || !clientSecret) {
    console.error('Missing MEDPLUM_CLIENT_ID or MEDPLUM_CLIENT_SECRET in .env.local');
    process.exit(1);
  }

  if (!projectId) {
    console.error('Missing NEXT_PUBLIC_MEDPLUM_PROJECT_ID in .env.local');
    process.exit(1);
  }

  console.log(`\n🚀 NDJSON Individual Upload to Medplum`);
  console.log(`Source: ${ndjsonDir}`);
  console.log(`Target: ${baseUrl}`);
  console.log(`Project: ${projectId}`);
  console.log(`\n⚠️  Using individual resource uploads (slower but more reliable)\\n`);

  // Custom fetch to inject project header
  const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
    const headers = new Headers(options?.headers);
    headers.set('X-Medplum-Project', projectId);
    return fetch(url, { ...options, headers });
  };

  const medplum = new MedplumClient({
    baseUrl,
    storage: new MemoryStorage(),
    fetch: customFetch as typeof fetch,
  });

  console.log('Authenticating...');
  await medplum.startClientLogin(clientId, clientSecret);
  console.log('✓ Authenticated\\n');

  // Define upload order to respect FHIR resource dependencies
  const uploadOrder = [
    // Foundation resources (no dependencies)
    'Organization',
    'Location',
    'Practitioner',
    'PractitionerRole',

    // Patient and related
    'Patient',
    'Provenance',

    // Clinical resources
    'Medication',
    'Device',

    // Encounters and observations
    'Encounter',
    'Condition',
    'Observation',
    'Procedure',
    'AllergyIntolerance',
    'Immunization',
    'ImagingStudy',

    // Care and medication management
    'CarePlan',
    'CareTeam',
    'MedicationRequest',
    'MedicationDispense',
    'MedicationAdministration',

    // Diagnostics and documentation
    'DiagnosticReport',
    'DocumentReference',

    // Supply and billing
    'SupplyDelivery',
    'Claim',
    'ExplanationOfBenefit',
  ];

  // Get all NDJSON files and sort by dependency order
  const allFiles = fs.readdirSync(ndjsonDir).filter((f) => f.endsWith('.ndjson'));

  const files: string[] = [];

  // Add files in dependency order
  for (const prefix of uploadOrder) {
    const matching = allFiles.filter((f) => f.startsWith(prefix));
    files.push(...matching.map((f) => path.join(ndjsonDir, f)));
  }

  // Add any remaining files not in the order list
  for (const file of allFiles) {
    const fullPath = path.join(ndjsonDir, file);
    if (!files.includes(fullPath)) {
      files.push(fullPath);
    }
  }

  if (files.length === 0) {
    console.error(`Error: No .ndjson files found in ${ndjsonDir}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} NDJSON files\\n`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  let totalSuccess = 0;
  let totalFailed = 0;

  // Upload each file
  for (const file of files) {
    const { success, failed } = await uploadNDJSONFile(medplum, file);
    totalSuccess += success;
    totalFailed += failed;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\\n' + '='.repeat(60));
  console.log('\\n✅ Upload Complete!');
  console.log(`\\nTime: ${elapsed}s`);
  console.log(`Total resources: ${totalSuccess + totalFailed}`);
  console.log(`  ✓ Succeeded: ${totalSuccess}`);
  console.log(`  ✗ Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.log('\\n⚠️  Some resources failed to upload. Check errors above.');
    process.exit(1);
  }
}

main().catch(console.error);
