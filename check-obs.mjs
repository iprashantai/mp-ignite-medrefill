import { MedplumClient } from '@medplum/core';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Simple in-memory storage for Node.js
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, value);
  }
  removeItem(key) {
    this.store.delete(key);
  }
  getString(key) {
    return this.getItem(key);
  }
  setString(key, value) {
    return this.setItem(key, value);
  }
  getObject(key) {
    const str = this.getItem(key);
    return str ? JSON.parse(str) : undefined;
  }
  setObject(key, value) {
    return this.setItem(key, JSON.stringify(value));
  }
}

const medplum = new MedplumClient({
  baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL,
  storage: new MemoryStorage(),
  fetch: fetch,
});

await medplum.startClientLogin(
  process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
  process.env.MEDPLUM_CLIENT_SECRET
);

// Search for ALL PDC observations across all patients
console.log('\n=== SEARCHING FOR ALL PDC OBSERVATIONS IN MEDPLUM ===\n');

const allPDCObs = await medplum.searchResources('Observation', {
  code: 'https://ignitehealth.io/fhir/CodeSystem/adherence-metrics|pdc-mac,https://ignitehealth.io/fhir/CodeSystem/adherence-metrics|pdc-mad,https://ignitehealth.io/fhir/CodeSystem/adherence-metrics|pdc-mah',
  _count: '1000'
});

console.log(`Total PDC observations found: ${allPDCObs.length}`);

// Group by patient
const byPatient = new Map();
allPDCObs.forEach(obs => {
  const patientRef = obs.subject?.reference || 'Unknown';
  if (!byPatient.has(patientRef)) {
    byPatient.set(patientRef, { mac: 0, mad: 0, mah: 0, total: 0 });
  }
  const count = byPatient.get(patientRef);
  count.total++;

  const code = obs.code?.coding?.[0]?.code;
  if (code === 'pdc-mac') count.mac++;
  else if (code === 'pdc-mad') count.mad++;
  else if (code === 'pdc-mah') count.mah++;
});

console.log(`\nPatients with PDC observations: ${byPatient.size}`);
console.log('\nBreakdown by patient:');
let i = 1;
for (const [patient, counts] of byPatient.entries()) {
  console.log(`${i}. ${patient}: MAC=${counts.mac}, MAD=${counts.mad}, MAH=${counts.mah} (total: ${counts.total})`);
  i++;
  if (i > 20) {
    console.log(`... and ${byPatient.size - 20} more patients`);
    break;
  }
}
