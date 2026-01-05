/**
 * Clean up all patient-related data from Medplum
 * Preserves infrastructure (Practitioners, Organizations, Locations)
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

// Patient-related resources only (delete children first, then parents)
const PATIENT_RESOURCE_TYPES = [
  'Task',
  'MedicationDispense',
  'MedicationRequest',
  'MedicationAdministration',
  'Medication',
  'Observation',
  'Procedure',
  'DiagnosticReport',
  'DocumentReference',
  'ImagingStudy',
  'Immunization',
  'CarePlan',
  'CareTeam',
  'Device',
  'SupplyDelivery',
  'Claim',
  'ExplanationOfBenefit',
  'AllergyIntolerance',
  'Condition',
  'Encounter',
  'Patient',
  'Provenance',
];

async function deleteResourceType(medplum: MedplumClient, resourceType: string): Promise<number> {
  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    const searchResult = await medplum.search(resourceType as any, { _count: '100' });

    if (!searchResult.entry || searchResult.entry.length === 0) {
      hasMore = false;
      break;
    }

    const count = searchResult.entry.length;
    totalDeleted += count;

    for (const entry of searchResult.entry) {
      const resource = entry.resource;
      if (resource?.id) {
        try {
          await medplum.deleteResource(resourceType as any, resource.id);
        } catch (error) {
          console.error(
            `  ✗ Failed to delete ${resourceType}/${resource.id}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }

    console.log(`  Deleted ${count} ${resourceType} resources (${totalDeleted} total)`);

    if (count < 100) {
      hasMore = false;
    }
  }

  return totalDeleted;
}

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';
  const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing MEDPLUM_CLIENT_ID or MEDPLUM_CLIENT_SECRET in .env.local');
    process.exit(1);
  }

  console.log(`\n⚠️  WARNING: This will DELETE ALL patient data from Medplum at ${baseUrl}`);
  console.log('⚠️  Infrastructure (Practitioners, Organizations, Locations) will be preserved\n');
  console.log('Press Ctrl+C now to cancel, or wait 5 seconds to proceed...\n');

  // 5 second countdown
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`Starting in ${i}... `);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log('\n');

  const medplum = new MedplumClient({
    baseUrl,
    storage: new MemoryStorage(),
    fetch: fetch,
  });

  console.log('Authenticating...');
  await medplum.startClientLogin(clientId, clientSecret);
  console.log('Authenticated successfully!\n');

  const startTime = Date.now();
  const deletedCounts: Record<string, number> = {};

  // Delete each resource type
  for (const resourceType of PATIENT_RESOURCE_TYPES) {
    console.log(`\n🗑️  Deleting ${resourceType} resources...`);
    const count = await deleteResourceType(medplum, resourceType);
    deletedCounts[resourceType] = count;

    if (count > 0) {
      console.log(`✓ Deleted ${count} ${resourceType} resources`);
    } else {
      console.log(`  (No ${resourceType} resources found)`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n\n========== Cleanup Complete ==========');
  console.log(`Time: ${elapsed}s\n`);

  console.log('Deleted Resources:');
  let totalDeleted = 0;
  for (const [type, count] of Object.entries(deletedCounts)) {
    if (count > 0) {
      console.log(`  ${type.padEnd(25)} ${count}`);
      totalDeleted += count;
    }
  }
  console.log(`\nTotal resources deleted: ${totalDeleted}`);
}

main().catch(console.error);
