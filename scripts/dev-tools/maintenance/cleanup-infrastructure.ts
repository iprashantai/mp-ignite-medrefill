/**
 * Clean up infrastructure resources (Practitioners, Organizations, Locations, PractitionerRoles)
 * but preserve developer Practitioners (Neel, Arpit, Prashant)
 *
 * Synthea-generated Practitioners have NPI identifiers from http://hl7.org/fhir/sid/us-npi
 * Developer Practitioners don't have these Synthea NPIs
 */

import { MedplumClient, type IClientStorage } from '@medplum/core';
import type { Practitioner, Organization, Location, PractitionerRole } from '@medplum/fhirtypes';
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

function isSyntheaPractitioner(practitioner: Practitioner): boolean {
  // Synthea practitioners have NPI identifiers
  return !!practitioner.identifier?.some(
    (id) => id.system === 'http://hl7.org/fhir/sid/us-npi'
  );
}

async function deleteSyntheaPractitioners(medplum: MedplumClient): Promise<number> {
  let totalDeleted = 0;
  let hasMore = true;

  console.log('\n🗑️  Deleting Synthea Practitioners (preserving developers)...');

  while (hasMore) {
    const result = await medplum.search('Practitioner', { _count: '100' });

    if (!result.entry || result.entry.length === 0) {
      hasMore = false;
      break;
    }

    for (const entry of result.entry) {
      const practitioner = entry.resource as Practitioner;

      if (isSyntheaPractitioner(practitioner)) {
        // This is a Synthea practitioner - delete it
        if (practitioner.id) {
          try {
            await medplum.deleteResource('Practitioner', practitioner.id);
            totalDeleted++;
          } catch (error) {
            console.error(
              `  ✗ Failed to delete Practitioner/${practitioner.id}:`,
              error instanceof Error ? error.message : String(error)
            );
          }
        }
      } else {
        // This is likely a developer account - preserve it
        const name = practitioner.name?.[0];
        const fullName = name
          ? `${name.given?.join(' ') || ''} ${name.family || ''}`.trim()
          : 'Unknown';
        console.log(`  ✓ Preserving developer: ${fullName} (${practitioner.id})`);
      }
    }

    console.log(`  Deleted ${totalDeleted} Synthea Practitioners so far...`);

    if (result.entry.length < 100) {
      hasMore = false;
    }
  }

  return totalDeleted;
}

async function deleteAllResources(
  medplum: MedplumClient,
  resourceType: 'Organization' | 'Location' | 'PractitionerRole'
): Promise<number> {
  let totalDeleted = 0;
  let hasMore = true;

  console.log(`\n🗑️  Deleting ${resourceType} resources...`);

  while (hasMore) {
    const result = await medplum.search(resourceType, { _count: '100' });

    if (!result.entry || result.entry.length === 0) {
      hasMore = false;
      break;
    }

    const count = result.entry.length;

    for (const entry of result.entry) {
      const resource = entry.resource;
      if (resource?.id) {
        try {
          await medplum.deleteResource(resourceType, resource.id);
          totalDeleted++;
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

  console.log(
    `\n⚠️  WARNING: This will DELETE infrastructure resources from Medplum at ${baseUrl}`
  );
  console.log('⚠️  Developer Practitioners (Neel, Arpit, Prashant) will be preserved\n');
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

  // Delete in dependency order
  deletedCounts['PractitionerRole'] = await deleteAllResources(medplum, 'PractitionerRole');
  deletedCounts['Practitioner'] = await deleteSyntheaPractitioners(medplum);
  deletedCounts['Location'] = await deleteAllResources(medplum, 'Location');
  deletedCounts['Organization'] = await deleteAllResources(medplum, 'Organization');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n\n========== Cleanup Complete ==========');
  console.log(`Time: ${elapsed}s\n`);

  console.log('Deleted Resources:');
  let totalDeleted = 0;
  for (const [type, count] of Object.entries(deletedCounts)) {
    console.log(`  ${type.padEnd(25)} ${count}`);
    totalDeleted += count;
  }
  console.log(`\nTotal resources deleted: ${totalDeleted}`);
}

main().catch(console.error);
