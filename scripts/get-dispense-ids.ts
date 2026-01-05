#!/usr/bin/env npx tsx
/**
 * Get MedicationDispense identifiers for a patient
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { MedplumClient } from '@medplum/core';
import type { IClientStorage } from '@medplum/core';

class MemoryStorage implements IClientStorage {
  private data: Record<string, string> = {};
  clear() { this.data = {}; }
  getString(key: string) { return this.data[key]; }
  setString(key: string, value: string) { this.data[key] = value; }
  getObject<T>(key: string): T | undefined {
    const str = this.getString(key);
    return str ? JSON.parse(str) : undefined;
  }
  setObject<T>(key: string, value: T) { this.setString(key, JSON.stringify(value)); }
  makeKey(...parts: string[]) { return parts.join(':'); }
}

const PATIENT_ID = 'e6c411a4-403b-4914-aac3-9e0a9ff4a7fb';

async function main() {
  const medplum = new MedplumClient({
    baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/',
    clientId: process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
    storage: new MemoryStorage(),
  });

  const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;

  if (clientId && clientSecret) {
    await medplum.startClientLogin(clientId, clientSecret);
  }

  const dispenses = await medplum.searchResources('MedicationDispense', {
    subject: `Patient/${PATIENT_ID}`,
    _count: '50',
  });

  console.log('\n=== MedicationDispense Identifiers ===\n');
  console.log('Patient ID:', PATIENT_ID);
  console.log('Total dispenses:', dispenses.length);
  console.log('');

  dispenses.forEach((d, i) => {
    console.log(`[${i + 1}] Resource ID: ${d.id}`);

    // Show identifier
    if (d.identifier && d.identifier.length > 0) {
      d.identifier.forEach((id, j) => {
        console.log(`    Identifier[${j}]:`);
        console.log(`      system: ${id.system || 'N/A'}`);
        console.log(`      value:  ${id.value || 'N/A'}`);
      });
    } else {
      console.log('    No identifiers');
    }

    // Show medication info
    const medName = d.medicationCodeableConcept?.text ||
                    d.medicationCodeableConcept?.coding?.[0]?.display ||
                    'Unknown';
    console.log(`    Medication: ${medName}`);

    // Show fill date
    const fillDate = d.whenHandedOver || d.whenPrepared || 'N/A';
    console.log(`    Fill Date: ${fillDate}`);

    // Show days supply
    const daysSupply = d.daysSupply?.value || 'N/A';
    console.log(`    Days Supply: ${daysSupply}`);

    console.log('');
  });
}

main().catch(console.error);
