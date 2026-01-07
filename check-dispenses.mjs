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

console.log('\n=== CHECKING ALL MEDICATIONDISPENSE RESOURCES ===\n');

// Search for ALL dispenses
const allDispenses = await medplum.searchResources('MedicationDispense', {
  _count: '1000'
});

console.log(`Total MedicationDispense resources found: ${allDispenses.length}`);

if (allDispenses.length === 0) {
  console.log('\n⚠️  NO DISPENSES FOUND IN MEDPLUM!');
  console.log('This explains why only 1 patient has PDC data.');
  process.exit(0);
}

// Group by patient
const byPatient = new Map();
const rxnormCodes = new Set();
const statuses = new Map();

allDispenses.forEach(dispense => {
  const patientRef = dispense.subject?.reference || 'Unknown';

  if (!byPatient.has(patientRef)) {
    byPatient.set(patientRef, {
      count: 0,
      medications: new Set(),
      earliestFill: null,
      latestFill: null
    });
  }

  const patientData = byPatient.get(patientRef);
  patientData.count++;

  // Track RxNorm codes
  const rxnorm = dispense.medicationCodeableConcept?.coding?.find(
    c => c.system === 'http://www.nlm.nih.gov/research/umls/rxnorm'
  )?.code;

  if (rxnorm) {
    patientData.medications.add(rxnorm);
    rxnormCodes.add(rxnorm);
  }

  // Track dates
  const fillDate = dispense.whenHandedOver;
  if (fillDate) {
    if (!patientData.earliestFill || fillDate < patientData.earliestFill) {
      patientData.earliestFill = fillDate;
    }
    if (!patientData.latestFill || fillDate > patientData.latestFill) {
      patientData.latestFill = fillDate;
    }
  }

  // Track statuses
  const status = dispense.status || 'unknown';
  statuses.set(status, (statuses.get(status) || 0) + 1);
});

console.log(`\n📊 DISPENSE DISTRIBUTION`);
console.log(`Patients with dispenses: ${byPatient.size}`);
console.log(`Unique RxNorm codes: ${rxnormCodes.size}`);
console.log('\nStatus breakdown:');
for (const [status, count] of statuses.entries()) {
  console.log(`  ${status}: ${count}`);
}

console.log(`\n📋 BREAKDOWN BY PATIENT:\n`);

let i = 1;
for (const [patientRef, data] of byPatient.entries()) {
  const patientId = patientRef.replace('Patient/', '');
  console.log(`${i}. ${patientRef}`);
  console.log(`   Dispenses: ${data.count}`);
  console.log(`   Unique medications: ${data.medications.size}`);
  console.log(`   Date range: ${data.earliestFill || 'N/A'} to ${data.latestFill || 'N/A'}`);
  console.log(`   RxNorm codes: ${Array.from(data.medications).slice(0, 3).join(', ')}${data.medications.size > 3 ? '...' : ''}`);
  console.log();
  i++;
}

// Check if this is the patient with PDC observations
console.log(`\n🔍 CROSS-REFERENCE WITH PDC OBSERVATIONS:`);
console.log(`Patient with PDC data: Patient/e6c411a4-403b-4914-aac3-9e0a9ff4a7fb`);

if (byPatient.has('Patient/e6c411a4-403b-4914-aac3-9e0a9ff4a7fb')) {
  const pdcPatient = byPatient.get('Patient/e6c411a4-403b-4914-aac3-9e0a9ff4a7fb');
  console.log(`✅ This patient HAS dispenses: ${pdcPatient.count} fills`);
  console.log(`   Medications: ${Array.from(pdcPatient.medications).join(', ')}`);
} else {
  console.log(`⚠️  This patient does NOT have dispenses!`);
}

console.log(`\n💡 CONCLUSION:`);
if (byPatient.size === 1) {
  console.log(`All ${allDispenses.length} dispenses belong to ONE patient only.`);
  console.log(`This confirms why only 1 patient has PDC observations.`);
} else if (byPatient.size === 0) {
  console.log(`NO dispenses found in Medplum.`);
} else {
  console.log(`Dispenses are spread across ${byPatient.size} patients.`);
  console.log(`Expected PDC observations: ${byPatient.size} patients`);
  console.log(`Actual PDC observations: 1 patient`);
  console.log(`Gap: ${byPatient.size - 1} patients need PDC recalculation`);
}

// Sample a few dispenses to show structure
if (allDispenses.length > 0) {
  console.log(`\n📄 SAMPLE DISPENSE STRUCTURE (first record):`);
  const sample = allDispenses[0];
  console.log(`ID: ${sample.id}`);
  console.log(`Patient: ${sample.subject?.reference}`);
  console.log(`Status: ${sample.status}`);
  console.log(`When Handed Over: ${sample.whenHandedOver}`);
  console.log(`Days Supply: ${sample.daysSupply?.value}`);
  console.log(`Quantity: ${sample.quantity?.value}`);
  console.log(`Medication:`);
  console.log(JSON.stringify(sample.medicationCodeableConcept, null, 2));
}
