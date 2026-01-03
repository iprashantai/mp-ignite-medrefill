/**
 * Upload NDJSON files to Medplum
 *
 * Usage: npx tsx scripts/upload-ndjson.ts <ndjson-directory>
 * Example: npx tsx scripts/upload-ndjson.ts /path/to/synthea/output/fhir_ndjson
 */

import { MedplumClient, type IClientStorage } from '@medplum/core';
import { Resource } from '@medplum/fhirtypes';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// In-memory storage for Node.js environment
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
    if (value === undefined) {
      delete this.data[key];
    } else {
      this.data[key] = value;
    }
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

  // Upload in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, Math.min(i + BATCH_SIZE, lines.length));
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(lines.length / BATCH_SIZE);

    try {
      // Parse resources
      const resources: Resource[] = batch.map((line) => JSON.parse(line));

      // Create a transaction bundle
      const bundle = {
        resourceType: 'Bundle' as const,
        type: 'transaction' as const,
        entry: resources.map((resource) => ({
          request: {
            method: 'PUT' as const,
            url: `${resource.resourceType}/${resource.id}`,
          },
          resource,
        })),
      };

      // Execute batch
      await medplum.executeBatch(bundle);

      process.stdout.write(
        `  Batch ${batchNum}/${totalBatches} ✓ (${i + batch.length}/${lines.length})\r`
      );
      success += batch.length;
    } catch (error) {
      failed += batch.length;
      console.error(
        `\n  ✗ Batch ${batchNum} failed:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    // Small delay to avoid rate limiting
    if (i + BATCH_SIZE < lines.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`\n  ✓ ${success} succeeded, ${failed} failed`);
  return { success, failed };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/upload-ndjson.ts <ndjson-directory>');
    console.error(
      'Example: npx tsx scripts/upload-ndjson.ts ../synthea/output/medrefills/2025-12-29_20-05-39/fhir_ndjson'
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

  console.log(`\n🚀 NDJSON Bulk Upload to Medplum`);
  console.log(`Source: ${ndjsonDir}`);
  console.log(`Target: ${baseUrl}`);
  console.log(`Project: ${projectId}\n`);

  // Initialize Medplum client with custom fetch to inject project header
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

  // Login
  console.log('Authenticating...');
  await medplum.startClientLogin(clientId, clientSecret);
  console.log('✓ Authenticated\n');

  // Get all NDJSON files
  const files = fs
    .readdirSync(ndjsonDir)
    .filter((f) => f.endsWith('.ndjson'))
    .map((f) => path.join(ndjsonDir, f));

  if (files.length === 0) {
    console.error(`Error: No .ndjson files found in ${ndjsonDir}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} NDJSON files\n`);
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

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Upload Complete!');
  console.log(`\nTime: ${elapsed}s`);
  console.log(`Total resources: ${totalSuccess + totalFailed}`);
  console.log(`  ✓ Succeeded: ${totalSuccess}`);
  console.log(`  ✗ Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.log('\n⚠️  Some resources failed to upload. Check errors above.');
    process.exit(1);
  }
}

main().catch(console.error);
