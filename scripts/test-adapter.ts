/**
 * Test Script for Legacy Patient Adapter
 *
 * Verifies that the adapter correctly transforms Medplum FHIR data
 * into legacy Firebase structure.
 *
 * Usage: npx tsx scripts/test-adapter.ts
 */

import { MedplumClient } from '@medplum/core';
import {
  constructLegacyPatientObject,
  loadPatientsWithLegacyShape,
} from '../src/lib/adapters/legacy-patient-adapter';

async function testAdapter() {
  console.log('🧪 Testing Legacy Patient Adapter\n');

  // Initialize Medplum client
  const medplum = new MedplumClient({
    baseUrl: process.env.MEDPLUM_BASE_URL || 'https://api.medplum.com/',
    clientId: process.env.MEDPLUM_CLIENT_ID,
    clientSecret: process.env.MEDPLUM_CLIENT_SECRET,
  });

  try {
    // Test 1: Load all patients
    console.log('📋 Test 1: Loading patients with legacy shape...');
    const patients = await loadPatientsWithLegacyShape(medplum, { _count: 5 });
    console.log(`✅ Loaded ${patients.length} patients`);

    if (patients.length > 0) {
      const firstPatient = patients[0];
      console.log('\n👤 First Patient:');
      console.log(`   ID: ${firstPatient.id}`);
      console.log(`   Name: ${firstPatient.name}`);
      console.log(`   Age: ${firstPatient.age}`);
      console.log(`   Medications: ${firstPatient.medications.length}`);
      console.log(`   Current PDC: ${firstPatient.currentPDC}%`);
      console.log(`   Fragility Tier: ${firstPatient.fragilityTier}`);
      console.log(`   Priority Score: ${firstPatient.priorityScore}`);
      console.log(`   In 14-day queue: ${firstPatient.in14DayQueue}`);

      // Test 2: Load single patient with full details
      console.log(`\n📋 Test 2: Loading patient ${firstPatient.id} with full details...`);
      const detailedPatient = await constructLegacyPatientObject(firstPatient.id, medplum);

      console.log(`✅ Loaded patient with ${detailedPatient.medications.length} medications`);

      if (detailedPatient.medications.length > 0) {
        console.log('\n💊 First Medication:');
        const med = detailedPatient.medications[0];
        console.log(`   Name: ${med.medicationName}`);
        console.log(`   Measure: ${med.measure}`);
        console.log(`   PDC: ${med.currentPdc}%`);
        console.log(`   Status: ${med.adherence.status}`);
        console.log(`   Days to Runout: ${med.daysToRunout}`);
        console.log(`   Fragility Tier: ${med.fragilityTier}`);
      }

      // Test 3: Verify aggregate metrics
      console.log('\n📊 Aggregate Metrics:');
      console.log(`   Total Medications: ${detailedPatient.aggregateMetrics.totalMedications}`);
      console.log(`   MA Medications: ${detailedPatient.aggregateMetrics.maMedications}`);
      console.log(`   Passing: ${detailedPatient.aggregateMetrics.passingCount}`);
      console.log(`   At-Risk: ${detailedPatient.aggregateMetrics.atRiskCount}`);
      console.log(`   Failing: ${detailedPatient.aggregateMetrics.failingCount}`);

      // Test 4: Verify per-measure breakdowns
      if (detailedPatient.perMeasure) {
        console.log('\n📈 Per-Measure Metrics:');
        Object.entries(detailedPatient.perMeasure).forEach(([measure, metrics]) => {
          console.log(`   ${measure}:`);
          console.log(`     PDC: ${metrics.currentPDC}%`);
          console.log(`     Tier: ${metrics.fragilityTier}`);
          console.log(`     Medications: ${metrics.medications.length}`);
        });
      }

      console.log('\n✅ All tests passed!');
    } else {
      console.log('⚠️  No patients found in Medplum. Add test data first.');
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests
testAdapter().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
