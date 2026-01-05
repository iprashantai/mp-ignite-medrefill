#!/usr/bin/env tsx
/**
 * Count Uploaded Resources
 *
 * Checks how many resources of each type exist in Medplum after upload attempt.
 */

import { MedplumClient, type IClientStorage } from '@medplum/core';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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

const RESOURCE_TYPES = [
  'Organization',
  'Location',
  'Practitioner',
  'PractitionerRole',
  'Patient',
  'Encounter',
  'Condition',
  'MedicationRequest',
  'MedicationDispense',
  'Observation',
  'Procedure',
  'Claim',
  'ExplanationOfBenefit',
  'Coverage',
  'CarePlan',
  'CareTeam',
  'Goal',
  'ImagingStudy',
  'DiagnosticReport',
  'Immunization',
  'AllergyIntolerance',
];

async function main() {
  const medplum = new MedplumClient({
    baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL,
    storage: new MemoryStorage(),
    fetch: fetch,
  });

  console.log('🔐 Authenticating with Medplum...');
  await medplum.startClientLogin(
    process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );
  console.log('✅ Authenticated\n');

  console.log('📊 Resource Counts:');
  console.log('─'.repeat(50));

  let totalCount = 0;

  for (const resourceType of RESOURCE_TYPES) {
    try {
      const bundle = await medplum.search(resourceType, {
        _count: 0,
        _total: 'accurate',
      });

      const count = bundle.total || 0;
      totalCount += count;

      const icon = count > 0 ? '✅' : '  ';
      console.log(`${icon} ${resourceType.padEnd(25)} ${count.toString().padStart(6)}`);
    } catch (error) {
      console.log(`❌ ${resourceType.padEnd(25)} ERROR`);
    }
  }

  console.log('─'.repeat(50));
  console.log(`   ${'TOTAL'.padEnd(25)} ${totalCount.toString().padStart(6)}`);
}

main().catch(console.error);
