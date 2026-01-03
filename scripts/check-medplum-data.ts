/**
 * Check what data exists in Medplum
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
  const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;
  const projectId = process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID;

  console.log('Medplum Configuration:');
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  Client ID: ${clientId}`);
  console.log(`  Project ID: ${projectId}`);
  console.log();

  // Custom fetch to inject project header
  const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
    const headers = new Headers(options?.headers);
    headers.set('X-Medplum-Project', projectId!);
    return fetch(url, { ...options, headers });
  };

  const medplum = new MedplumClient({
    baseUrl,
    storage: new MemoryStorage(),
    fetch: customFetch as typeof fetch,
  });

  console.log('Authenticating...');
  const loginResult = await medplum.startClientLogin(clientId!, clientSecret!);
  console.log('✓ Authenticated');
  console.log(`  Project: ${loginResult.project?.id || 'N/A'}`);
  console.log(`  Project Name: ${loginResult.project?.name || 'N/A'}`);
  console.log();

  // Count resources
  const resourceTypes = [
    'Patient',
    'MedicationDispense',
    'MedicationRequest',
    'Observation',
    'Condition',
    'Encounter',
  ];

  console.log('Resource Counts:');
  for (const resourceType of resourceTypes) {
    const result = await medplum.search(resourceType, { _count: '0', _total: 'accurate' });
    const count = result.total || 0;
    console.log(`  ${resourceType.padEnd(25)} ${count}`);
  }

  // Sample patient data
  console.log('\nSample Patients:');
  const patients = await medplum.search('Patient', { _count: '5' });
  if (patients.entry && patients.entry.length > 0) {
    patients.entry.forEach((entry, i) => {
      const patient = entry.resource;
      console.log(
        `  ${i + 1}. ${patient?.name?.[0]?.given?.[0]} ${patient?.name?.[0]?.family} (${patient?.id})`
      );
    });
  } else {
    console.log('  No patients found!');
  }
}

main().catch(console.error);
