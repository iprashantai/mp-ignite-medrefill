/**
 * Verify patient medications loaded correctly
 */

import { MedplumClient, type IClientStorage } from '@medplum/core';
import type { Patient, MedicationDispense, MedicationRequest } from '@medplum/fhirtypes';
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

  // Find Abel or Michael patients
  const searchName = process.argv[2] || 'Brown';
  const patients = await medplum.searchResources('Patient', {
    name: searchName,
  });

  console.log(`\n📋 Found ${patients.length} patient(s) with name "Brown":\n`);

  for (const patient of patients) {
    const name = patient.name?.[0];
    const fullName = `${name?.given?.join(' ') || ''} ${name?.family || ''}`.trim();
    console.log(`\n👤 Patient: ${fullName} (${patient.id})`);
    console.log(`   Birth Date: ${patient.birthDate}`);

    // Get MedicationRequests
    const requests = await medplum.searchResources('MedicationRequest', {
      subject: `Patient/${patient.id}`,
      _sort: '-authoredon',
    });

    console.log(`\n   💊 MedicationRequests: ${requests.length}`);
    for (const req of requests.slice(0, 5)) {
      const medication =
        req.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown medication';
      const status = req.status;
      const authored = req.authoredOn;
      console.log(`      - ${medication} (${status}) - ${authored}`);
    }

    // Get MedicationDispenses
    const dispenses = await medplum.searchResources('MedicationDispense', {
      subject: `Patient/${patient.id}`,
      _sort: '-whenhandedover',
    });

    console.log(`\n   🏥 MedicationDispenses: ${dispenses.length}`);
    for (const disp of dispenses.slice(0, 5)) {
      const medication =
        disp.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown medication';
      const status = disp.status;
      const whenHandedOver = disp.whenHandedOver;
      console.log(`      - ${medication} (${status}) - ${whenHandedOver}`);
    }

    // Get Observations
    const observations = await medplum.searchResources('Observation', {
      subject: `Patient/${patient.id}`,
      _count: '1',
      _total: 'accurate',
    });

    console.log(`\n   📊 Observations: ${observations.length}`);
  }
}

main().catch(console.error);
