/**
 * Count all resource types in the project
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

  // Custom fetch to inject project header
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

  await medplum.startClientLogin(clientId, clientSecret);

  const resourceTypes = [
    'Patient',
    'MedicationDispense',
    'MedicationRequest',
    'Medication',
    'Observation',
    'Condition',
    'Encounter',
    'Procedure',
    'Claim',
    'ExplanationOfBenefit',
    'DiagnosticReport',
    'CarePlan',
    'CareTeam',
    'AllergyIntolerance',
    'Immunization',
    'DocumentReference',
    'SupplyDelivery',
    'MedicationAdministration',
    'Device',
    'ImagingStudy',
    'Location',
    'Organization',
    'Practitioner',
    'PractitionerRole',
    'Provenance',
  ];

  console.log('Resource Counts:\n');

  let total = 0;
  for (const resourceType of resourceTypes) {
    try {
      const result = await medplum.search(resourceType, { _count: '0', _total: 'accurate' });
      const count = result.total || 0;
      if (count > 0) {
        console.log(`  ${resourceType.padEnd(30)} ${count}`);
        total += count;
      }
    } catch (error) {
      // Skip resource types that might not be supported
    }
  }

  console.log(`\nTotal resources: ${total}`);
}

main().catch(console.error);
