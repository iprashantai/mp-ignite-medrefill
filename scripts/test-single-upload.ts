/**
 * Test uploading a single resource to verify project header works
 */

import { MedplumClient, type IClientStorage } from '@medplum/core';
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

  console.log(`Testing upload to project: ${projectId}\n`);

  // Custom fetch to inject project header
  const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
    const headers = new Headers(options?.headers);
    headers.set('X-Medplum-Project', projectId);
    console.log(`[DEBUG] Fetch to: ${url}`);
    console.log(`[DEBUG] Project header: ${headers.get('X-Medplum-Project')}`);
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

  // Create a test patient
  const testPatient = {
    resourceType: 'Patient',
    id: 'test-patient-12345',
    name: [
      {
        family: 'TestUpload',
        given: ['Verification'],
      },
    ],
    active: true,
  };

  console.log('Uploading test patient...');
  try {
    const result = await medplum.createResource(testPatient);
    console.log('✓ Upload succeeded');
    console.log(`  Patient ID: ${result.id}`);
  } catch (error) {
    console.error('✗ Upload failed:', error);
  }

  // Query back
  console.log('\nQuerying for test patient...');
  const patients = await medplum.search('Patient', { family: 'TestUpload' });
  console.log(`  Found: ${patients.entry?.length || 0} patients`);

  if (patients.entry && patients.entry.length > 0) {
    console.log('\n✅ SUCCESS: Project header is working!');
  } else {
    console.log('\n⚠️  WARNING: Patient not found after upload');
  }
}

main().catch(console.error);
