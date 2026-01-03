/**
 * Upload a single Synthea bundle to test project header
 */

import { MedplumClient, type IClientStorage } from '@medplum/core';
import { Bundle } from '@medplum/fhirtypes';
import * as fs from 'fs';
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

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';
  const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID!;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET!;
  const projectId = process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID!;

  const bundlePath =
    '/Users/prashantsingh/work/ignite/synthea/synthea/output/medrefills/2025-12-30_02-54-53/fhir/Abraham100_Bergstrom287_d9741971-2332-1891-d151-0253109837de.json';

  console.log('Testing single patient upload...');
  console.log(`Target Project: ${projectId}\n`);

  // Custom fetch with project header
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
  console.log('✓ Authenticated\n');

  // Upload bundle
  const content = fs.readFileSync(bundlePath, 'utf-8');
  const bundle: Bundle = JSON.parse(content);

  if (bundle.type !== 'transaction') {
    bundle.type = 'transaction';
  }

  console.log(`Uploading: Abraham100 Bergstrom287`);
  console.log(`Bundle has ${bundle.entry?.length || 0} resources\n`);

  const result = await medplum.executeBatch(bundle);
  console.log('✓ Upload completed\n');

  // Verify patient exists
  console.log('Verifying patient in project...');
  const patients = await medplum.search('Patient', { family: 'Bergstrom287' });

  if (patients.entry && patients.entry.length > 0) {
    console.log(`✅ SUCCESS: Found ${patients.entry.length} patient(s) with name Bergstrom287`);
    const patient = patients.entry[0].resource;
    console.log(`   Patient ID: ${patient?.id}`);
    console.log(`   Name: ${patient?.name?.[0]?.given?.[0]} ${patient?.name?.[0]?.family}`);
  } else {
    console.log('⚠️  WARNING: Patient not found - may be in wrong project');
  }

  // Check MedicationDispense
  console.log('\nChecking MedicationDispense resources...');
  const dispenses = await medplum.search('MedicationDispense', { _count: '5' });
  console.log(`   Found ${dispenses.total || 0} MedicationDispense resources`);
}

main().catch(console.error);
