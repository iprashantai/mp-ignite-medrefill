/**
 * Count all patients with pagination
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
  const medplum = new MedplumClient({
    baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL,
    storage: new MemoryStorage(),
    fetch: fetch,
  });

  await medplum.startClientLogin(
    process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );

  console.log('\n📊 Counting all patients with pagination...\n');

  let allPatients = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const patients = await medplum.searchResources('Patient', {
      _count: limit.toString(),
      _offset: offset.toString(),
    });

    if (patients.length === 0) break;

    allPatients.push(...patients);
    console.log(`  Fetched ${patients.length} patients (total so far: ${allPatients.length})`);

    if (patients.length < limit) break;
    offset += limit;
  }

  console.log(`\n✅ Total patients found: ${allPatients.length}\n`);

  console.log('Sample patients:');
  for (const patient of allPatients.slice(0, 10)) {
    const name = patient.name?.[0];
    const fullName = `${name?.given?.join(' ') || ''} ${name?.family || ''}`.trim();
    console.log(`  - ${fullName} (${patient.id})`);
  }
}

main().catch(console.error);
