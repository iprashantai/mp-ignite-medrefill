/**
 * Upload Synthea-generated FHIR bundles to Medplum
 *
 * Usage: npx tsx scripts/upload-synthea.ts
 */

import { MedplumClient, type IClientStorage } from '@medplum/core';
import { Bundle } from '@medplum/fhirtypes';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SYNTHEA_DIR = '/Users/prashantsingh/work/ignite/synthea/synthea/output/medrefills/fhir';

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

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';
  const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing MEDPLUM_CLIENT_ID or MEDPLUM_CLIENT_SECRET in .env.local');
    process.exit(1);
  }

  console.log(`Connecting to Medplum at ${baseUrl}`);

  // Initialize Medplum client with memory storage for Node.js
  const medplum = new MedplumClient({
    baseUrl,
    storage: new MemoryStorage(),
    fetch: fetch,
  });

  // Login with client credentials
  console.log('Authenticating...');
  await medplum.startClientLogin(clientId, clientSecret);
  console.log('Authenticated successfully!\n');

  // Get all JSON files
  const files = fs
    .readdirSync(SYNTHEA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(SYNTHEA_DIR, f));

  console.log(`Found ${files.length} Synthea bundles to upload\n`);

  let successful = 0;
  let failed = 0;
  const errors: { file: string; error: string }[] = [];

  const startTime = Date.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filename = path.basename(file);

    try {
      // Read and parse the bundle
      const content = fs.readFileSync(file, 'utf-8');
      const bundle: Bundle = JSON.parse(content);

      // Ensure it's a transaction bundle
      if (bundle.type !== 'transaction') {
        bundle.type = 'transaction';
      }

      // Submit the bundle
      process.stdout.write(`[${i + 1}/${files.length}] ${filename.slice(0, 40).padEnd(40)} `);
      await medplum.executeBatch(bundle);
      console.log('OK');

      successful++;
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ file: filename, error: errorMsg });
      console.log(`FAILED: ${errorMsg.slice(0, 50)}`);
    }

    // Small delay to avoid rate limiting
    if (i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n========== Upload Complete ==========');
  console.log(`Total: ${files.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Time: ${elapsed}s`);

  if (errors.length > 0 && errors.length <= 20) {
    console.log('\nFailed files:');
    errors.forEach((e) => console.log(`  - ${e.file}: ${e.error.slice(0, 100)}`));
  }
}

main().catch(console.error);
