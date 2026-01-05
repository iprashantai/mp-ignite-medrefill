/**
 * Upload patients one-by-one with long delays to avoid rate limits
 */

import { MedplumClient, type IClientStorage } from '@medplum/core';
import type { Bundle } from '@medplum/fhirtypes';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SYNTHEA_DIR = process.argv[2] || '/Users/prashantsingh/work/ignite/synthea/synthea/output/medrefills/2026-01-04_50pt_15mo';
const DELAY_SECONDS = parseInt(process.argv[3] || '120'); // 2 minutes default

class MemoryStorage implements IClientStorage {
  private data: Record<string, string> = {};
  getInitPromise(): Promise<void> { return Promise.resolve(); }
  clear(): void { this.data = {}; }
  getString(key: string): string | undefined { return this.data[key]; }
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
  makeKey(key: string): string { return key; }
}

async function getUploadedPatientNames(medplum: MedplumClient): Promise<Set<string>> {
  const patients = await medplum.searchResources('Patient', { _count: '100' });
  const names = new Set<string>();

  for (const patient of patients) {
    const name = patient.name?.[0];
    if (name?.family) {
      names.add(name.family);
    }
  }

  return names;
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

  console.log('========== Slow Batch Upload ==========');
  console.log(`Directory: ${SYNTHEA_DIR}`);
  console.log(`Delay between uploads: ${DELAY_SECONDS}s\n`);

  // Get all patient files
  const files = fs
    .readdirSync(SYNTHEA_DIR)
    .filter(f => f.endsWith('.json'))
    .filter(f => !f.includes('Information'))
    .map(f => path.join(SYNTHEA_DIR, f));

  console.log(`Found ${files.length} patient bundles\n`);

  // Initialize Medplum
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

  // Check which patients are already uploaded
  console.log('Checking already uploaded patients...');
  const uploadedNames = await getUploadedPatientNames(medplum);
  console.log(`Found ${uploadedNames.size} already uploaded\n`);

  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const errors: Array<{ file: string; error: string }> = [];
  const startTime = Date.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filename = path.basename(file);

    // Extract patient name from filename
    const patientName = filename.split('_')[1]?.replace(/\d+$/, '') || '';

    // Skip if already uploaded
    if (uploadedNames.has(patientName)) {
      console.log(`[${i + 1}/${files.length}] ${filename.slice(0, 45).padEnd(45)} ⊘ skipped (already uploaded)`);
      skipped++;
      continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const bundle: Bundle = JSON.parse(content);

      if (bundle.type !== 'transaction') {
        bundle.type = 'transaction';
      }

      process.stdout.write(`[${i + 1}/${files.length}] ${filename.slice(0, 45).padEnd(45)} uploading...`);

      const result = await medplum.executeBatch(bundle);

      // Count successes and failures in result
      let bundleSuccess = 0;
      let bundleFailures = 0;

      if (result.entry) {
        for (const entry of result.entry) {
          if (entry.response?.status?.startsWith('2')) {
            bundleSuccess++;
          } else {
            bundleFailures++;
          }
        }
      }

      if (bundleFailures > 0) {
        console.log(`\r[${i + 1}/${files.length}] ${filename.slice(0, 45).padEnd(45)} ⚠ partial (${bundleSuccess}/${bundle.entry?.length || 0})`);
      } else {
        console.log(`\r[${i + 1}/${files.length}] ${filename.slice(0, 45).padEnd(45)} ✓`);
      }

      successful++;

      // Wait before next upload (except for last one)
      if (i < files.length - 1) {
        process.stdout.write(`   Waiting ${DELAY_SECONDS}s...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_SECONDS * 1000));
        process.stdout.write('\r' + ' '.repeat(60) + '\r');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`\r[${i + 1}/${files.length}] ${filename.slice(0, 45).padEnd(45)} ✗ ${errorMsg.slice(0, 30)}`);
      errors.push({ file: filename, error: errorMsg });
      failed++;

      // Still wait on errors
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_SECONDS * 1000));
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const minutes = Math.floor(parseFloat(elapsed) / 60);
  const seconds = (parseFloat(elapsed) % 60).toFixed(0);

  console.log('\n========== Upload Complete ==========');
  console.log(`Total files: ${files.length}`);
  console.log(`Successful: ${successful} ✓`);
  console.log(`Skipped: ${skipped} ⊘`);
  console.log(`Failed: ${failed} ✗`);
  console.log(`Time: ${minutes}m ${seconds}s`);

  if (errors.length > 0 && errors.length <= 10) {
    console.log('\nFailed files:');
    errors.forEach(e => console.log(`  - ${e.file}: ${e.error.slice(0, 80)}`));
  }
}

main().catch(console.error);
