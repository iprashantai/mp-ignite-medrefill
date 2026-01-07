import { MedplumClient } from '@medplum/core';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Simple in-memory storage
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) { return this.store.get(key) || null; }
  setItem(key, value) { this.store.set(key, value); }
  removeItem(key) { this.store.delete(key); }
  getString(key) { return this.getItem(key); }
  setString(key, value) { return this.setItem(key, value); }
  getObject(key) {
    const str = this.getItem(key);
    return str ? JSON.parse(str) : undefined;
  }
  setObject(key, value) { return this.setItem(key, JSON.stringify(value)); }
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

const patientId = '2ac8d519-beac-23fd-5722-92c15a954e4d';

console.log(`Checking if Patient ${patientId} exists...`);

try {
  const patient = await medplum.readResource('Patient', patientId);
  console.log('✅ Patient EXISTS');
  console.log('Patient details:', {
    id: patient.id,
    name: patient.name?.[0]?.family,
    birthDate: patient.birthDate,
    extensionCount: patient.extension?.length || 0
  });
} catch (error) {
  console.log('❌ Patient NOT FOUND');
  console.log('Error:', error.message);

  // Check if dispenses reference this patient
  console.log('\nChecking MedicationDispense references...');
  const dispenses = await medplum.searchResources('MedicationDispense', {
    subject: `Patient/${patientId}`,
    _count: '5'
  });
  console.log(`Found ${dispenses.length} dispenses referencing Patient/${patientId}`);

  if (dispenses.length > 0) {
    console.log('\n⚠️  DATA INCONSISTENCY DETECTED:');
    console.log('   - MedicationDispense resources reference this patient');
    console.log('   - But Patient resource does not exist');
    console.log('   - This is a data integrity issue!');
  }
}

process.exit(0);
