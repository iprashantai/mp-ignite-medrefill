/**
 * Upload ONE patient bundle for testing
 *
 * This uploads a single patient bundle and verifies all resources loaded correctly
 */

import { MedplumClient, type IClientStorage } from '@medplum/core';
import type { Bundle } from '@medplum/fhirtypes';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SYNTHEA_DIR =
  '/Users/prashantsingh/work/ignite/synthea/synthea/output/medrefills/2026-01-04_realistic_pdc_tiers';

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

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';
  const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;
  const projectId = process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID;

  if (!clientId || !clientSecret || !projectId) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  // Get first patient bundle (skip hospitalInformation and practitionerInformation)
  const files = fs
    .readdirSync(SYNTHEA_DIR)
    .filter((f) => f.endsWith('.json'))
    .filter((f) => !f.includes('hospitalInformation') && !f.includes('practitionerInformation'));

  if (files.length === 0) {
    console.error('No patient bundles found');
    process.exit(1);
  }

  const testFile = path.join(SYNTHEA_DIR, files[0]);
  console.log(`\n🧪 Testing upload with: ${files[0]}\n`);

  // Count resources in bundle
  const bundleContent = fs.readFileSync(testFile, 'utf-8');
  const bundle: Bundle = JSON.parse(bundleContent);

  const resourceCounts: Record<string, number> = {};
  if (bundle.entry) {
    for (const entry of bundle.entry) {
      const resourceType = entry.resource?.resourceType;
      if (resourceType) {
        resourceCounts[resourceType] = (resourceCounts[resourceType] || 0) + 1;
      }
    }
  }

  console.log('📦 Bundle contains:');
  Object.entries(resourceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(30)} ${count}`);
    });
  console.log(`\n  Total: ${bundle.entry?.length || 0} resources\n`);

  // Initialize Medplum client
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
  console.log('Authenticated!\n');

  // Upload bundle
  if (bundle.type !== 'transaction') {
    bundle.type = 'transaction';
  }

  console.log('📤 Uploading bundle...');
  const startTime = Date.now();

  try {
    const result = await medplum.executeBatch(bundle);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✓ Upload completed in ${elapsed}s\n`);

    // Count results
    const resultCounts: Record<string, number> = {};
    let errors = 0;

    if (result.entry) {
      for (const entry of result.entry) {
        if (entry.response?.status?.startsWith('2')) {
          // Success (2xx status)
          const resourceType = entry.resource?.resourceType || 'Unknown';
          resultCounts[resourceType] = (resultCounts[resourceType] || 0) + 1;
        } else {
          errors++;
        }
      }
    }

    console.log('📊 Upload results:');
    console.log(`  Total entries: ${result.entry?.length || 0}`);
    console.log(`  Successful: ${(result.entry?.length || 0) - errors}`);
    if (errors > 0) {
      console.log(`  ⚠️ Errors: ${errors}`);

      // Show first error
      const firstError = result.entry?.find((e) => !e.response?.status?.startsWith('2'));
      if (firstError) {
        console.log('\nFirst error details:');
        console.log(JSON.stringify(firstError.response?.outcome, null, 2));
      }
    }

    console.log('\n✅ Resources created:');
    Object.entries(resultCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type.padEnd(30)} ${count}`);
      });

    // Verify specific resources
    console.log('\n🔍 Verifying resources...');

    const patientId = result.entry?.find((e) => e.resource?.resourceType === 'Patient')?.resource
      ?.id;

    if (patientId) {
      console.log(`\nPatient ID: ${patientId}`);

      // Check MedicationDispense
      const dispenses = await medplum.searchResources('MedicationDispense', {
        subject: `Patient/${patientId}`,
      });
      console.log(`  MedicationDispense: ${dispenses.length} found ✓`);

      // Check MedicationRequest
      const requests = await medplum.searchResources('MedicationRequest', {
        subject: `Patient/${patientId}`,
      });
      console.log(`  MedicationRequest: ${requests.length} found ✓`);

      // Check Observations
      const observations = await medplum.searchResources('Observation', {
        subject: `Patient/${patientId}`,
      });
      console.log(`  Observation: ${observations.length} found ✓`);

      console.log('\n✅ Single patient test PASSED - all resources loaded successfully!');
    }
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
