/**
 * Check what data was stored in Medplum after PDC calculation
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { MedplumClient, type IClientStorage } from '@medplum/core';

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

async function main() {
  const medplum = new MedplumClient({
    baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/',
    clientId: process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
    storage: new MemoryStorage(),
  });

  await medplum.startClientLogin(
    process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );

  const patientId = 'e6c411a4-403b-4914-aac3-9e0a9ff4a7fb';

  console.log('\n=== Patient Extensions ===');
  const patient = await medplum.readResource('Patient', patientId);
  console.log('Patient extensions:', JSON.stringify(patient.extension, null, 2));

  console.log('\n=== PDC Observations ===');
  const observations = await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    code: 'https://ignitehealth.io/fhir/CodeSystem/adherence-metrics|pdc-mah',
  });
  console.log('PDC Observations count:', observations.length);
  if (observations.length > 0) {
    const obs = observations[0];
    console.log('Latest observation:');
    console.log('  PDC Value:', obs.valueQuantity?.value);
    console.log('  Effective Date:', obs.effectiveDateTime);
    console.log('  Extensions:', JSON.stringify(obs.extension, null, 2));
  }

  console.log('\n=== Medication PDC Observations ===');
  const medObs = await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    code: 'https://ignitehealth.io/fhir/CodeSystem/adherence-metrics|pdc-medication',
  });
  console.log('Medication PDC Observations count:', medObs.length);
  if (medObs.length > 0) {
    const obs = medObs[0];
    console.log('Latest medication observation:');
    console.log('  PDC Value:', obs.valueQuantity?.value);
    console.log('  Effective Date:', obs.effectiveDateTime);
    console.log('  Extensions count:', obs.extension?.length);
  }
}

main().catch(console.error);
