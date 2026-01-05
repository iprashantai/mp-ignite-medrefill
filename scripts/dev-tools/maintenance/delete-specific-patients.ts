/**
 * Delete specific patients and all their related resources
 */

import { MedplumClient, type IClientStorage } from '@medplum/core';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

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

// Resource types to delete (in order - most dependent first)
const RESOURCE_TYPES = [
  'Task',
  'MedicationDispense',
  'MedicationRequest',
  'MedicationAdministration',
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
];

async function deletePatientResources(
  medplum: MedplumClient,
  patientId: string,
  patientName: string
): Promise<void> {
  console.log(`\nDeleting resources for: ${patientName} (${patientId})`);

  let totalDeleted = 0;

  for (const resourceType of RESOURCE_TYPES) {
    try {
      const resources = await medplum.searchResources(resourceType as any, {
        subject: `Patient/${patientId}`,
        _count: '1000',
      });

      if (resources.length > 0) {
        for (const resource of resources) {
          try {
            await medplum.deleteResource(resourceType as any, resource.id!);
          } catch (err) {
            // Continue if individual resource fails
            console.log(`  ⚠ Failed to delete ${resourceType}/${resource.id}`);
          }
        }
        console.log(`  ✓ Deleted ${resources.length} ${resourceType}`);
        totalDeleted += resources.length;

        // Small delay between resource types
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      // Some resource types might not exist, that's ok
    }
  }

  // Delete the patient itself
  await medplum.deleteResource('Patient', patientId);
  console.log(`  ✓ Deleted Patient`);
  totalDeleted++;

  console.log(`Total deleted: ${totalDeleted} resources`);
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

  // Patient family names to delete (remaining ones that failed)
  const PATIENTS_TO_DELETE = [
    // Small partials to re-upload (retry these)
    'Durgan499',   // Adriana394
    'Kerluke267',  // Allyson474
    'Kozey370',    // Brett333
  ];

  console.log('========== Delete Specific Patients ==========');
  console.log(`Patients to delete: ${PATIENTS_TO_DELETE.length}\n`);

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

  let deletedCount = 0;
  let notFoundCount = 0;

  for (const familyName of PATIENTS_TO_DELETE) {
    try {
      // Find patient by family name
      const patients = await medplum.searchResources('Patient', {
        family: familyName,
        _count: '10',
      });

      if (patients.length === 0) {
        console.log(`⊘ Patient not found: ${familyName}`);
        notFoundCount++;
        continue;
      }

      if (patients.length > 1) {
        console.log(`⚠ Multiple patients found for ${familyName}, deleting all ${patients.length}`);
      }

      // Delete each patient and their resources
      for (const patient of patients) {
        await deletePatientResources(medplum, patient.id!, familyName);
        deletedCount++;

        // Wait between deletions to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`✗ Error deleting ${familyName}:`, error instanceof Error ? error.message : String(error));

      // Wait before next patient on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('\n========== Deletion Complete ==========');
  console.log(`Patients deleted: ${deletedCount}`);
  console.log(`Patients not found: ${notFoundCount}`);
}

main().catch(console.error);
