#!/usr/bin/env tsx
/**
 * Calculate PDC for a Single Patient
 *
 * Demonstrates end-to-end flow:
 * 1. Fetch patient from Medplum
 * 2. Get medication dispenses
 * 3. Calculate PDC using Phase 1 engine
 * 4. Calculate fragility tier
 * 5. Store result as FHIR Observation
 */

import { MedplumClient } from '@medplum/core';
import dotenv from 'dotenv';
import { Patient } from '@medplum/fhirtypes';

// Import Phase 1 PDC Engine
import { getPatientDispenses, storePDCObservation } from '../../../src/lib/fhir';
import {
  calculatePDCFromDispenses,
  calculateFragility,
  type PDCResult,
  type FragilityResult,
  type MAMeasure,
} from '../../../src/lib/pdc';

// Load environment
dotenv.config({ path: '.env.local' });

// =============================================================================
// Configuration
// =============================================================================

const PATIENT_ID = process.argv[2]; // Get patient ID from command line
const MEASUREMENT_YEAR = parseInt(process.argv[3] || '2025');
const MEASURE: MAMeasure = (process.argv[4] as MAMeasure) || 'MAC';

if (!PATIENT_ID) {
  console.log('Usage: npx tsx scripts/dev-tools/verification/calculate-patient-pdc.ts <patient-id> [year] [measure]');
  console.log('\nExample:');
  console.log('  npx tsx scripts/dev-tools/verification/calculate-patient-pdc.ts patient-123 2025 MAC');
  console.log('\nOr to get first patient automatically:');
  console.log('  npx tsx scripts/dev-tools/verification/calculate-patient-pdc.ts auto');
  process.exit(1);
}

// =============================================================================
// Main Function
// =============================================================================

async function calculatePatientPDC() {
  console.log('🏥 Patient PDC Calculation\n');
  console.log('=' .repeat(80));

  // ---------------------------------------------------------------------------
  // Step 1: Connect to Medplum
  // ---------------------------------------------------------------------------

  console.log('\n🔌 Step 1: Connecting to Medplum');

  // Simple in-memory storage for Node.js scripts
  const memoryStorage = new Map<string, string>();
  const medplum = new MedplumClient({
    baseUrl: process.env.MEDPLUM_BASE_URL,
    clientId: process.env.MEDPLUM_CLIENT_ID,
    clientSecret: process.env.MEDPLUM_CLIENT_SECRET,
    storage: {
      clear: () => memoryStorage.clear(),
      getString: (key: string) => memoryStorage.get(key),
      setString: (key: string, value: string | undefined) => {
        if (value) memoryStorage.set(key, value);
        else memoryStorage.delete(key);
      },
      getObject: <T>(key: string): T | undefined => {
        const value = memoryStorage.get(key);
        return value ? JSON.parse(value) : undefined;
      },
      setObject: <T>(key: string, value: T) => {
        memoryStorage.set(key, JSON.stringify(value));
      },
      makeKey: (key: string) => key,
    },
  });

  await medplum.startClientLogin(
    process.env.MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );

  console.log('  ✅ Connected');

  // ---------------------------------------------------------------------------
  // Step 2: Get Patient
  // ---------------------------------------------------------------------------

  console.log('\n👤 Step 2: Fetching Patient');

  let patientId = PATIENT_ID;

  // Auto mode - get first patient
  if (PATIENT_ID === 'auto') {
    const patientBundle = await medplum.search('Patient', { _count: '1' });
    if (!patientBundle.entry || patientBundle.entry.length === 0) {
      console.log('  ❌ No patients found in database');
      process.exit(1);
    }
    patientId = patientBundle.entry[0].resource!.id!;
    console.log(`  ℹ️  Auto-selected first patient: ${patientId}`);
  }

  const patient = await medplum.readResource('Patient', patientId);

  console.log(`  ✅ Patient: ${patient.name?.[0]?.given?.join(' ')} ${patient.name?.[0]?.family}`);
  console.log(`  📧 ID: ${patient.id}`);
  console.log(`  🎂 Birth Date: ${patient.birthDate}`);

  // ---------------------------------------------------------------------------
  // Step 3: Get Medication Dispenses
  // ---------------------------------------------------------------------------

  console.log(`\n💊 Step 3: Fetching ${MEASURE} Medication Dispenses`);

  const dispenses = await getPatientDispenses(medplum, patientId, MEASUREMENT_YEAR);

  console.log(`  ✅ Found ${dispenses.length} total dispenses for ${MEASUREMENT_YEAR}`);

  if (dispenses.length === 0) {
    console.log('  ❌ No dispenses found - cannot calculate PDC');
    console.log('  ℹ️  Patient needs MedicationDispense records to calculate adherence');
    process.exit(1);
  }

  // Show first few dispenses
  console.log('\n  First 3 dispenses:');
  dispenses.slice(0, 3).forEach((d, i) => {
    const fillDate = d.whenHandedOver?.substring(0, 10);
    const daysSupply = d.daysSupply?.value || 0;
    const medication = d.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown';
    console.log(`    ${i + 1}. ${fillDate} - ${daysSupply} days - ${medication}`);
  });

  // ---------------------------------------------------------------------------
  // Step 4: Calculate PDC
  // ---------------------------------------------------------------------------

  console.log('\n📊 Step 4: Calculating PDC');

  const pdcResult: PDCResult = calculatePDCFromDispenses(
    dispenses,
    MEASUREMENT_YEAR,
    new Date()
  );

  console.log(`  ✅ PDC Calculated`);
  console.log(`     Current PDC: ${pdcResult.pdc.toFixed(1)}%`);
  console.log(`     PDC Status Quo: ${pdcResult.pdcStatusQuo.toFixed(1)}%`);
  console.log(`     PDC Perfect: ${pdcResult.pdcPerfect.toFixed(1)}%`);
  console.log(`     Covered Days: ${pdcResult.coveredDays} / ${pdcResult.treatmentDays}`);
  console.log(`     Gap Days: ${pdcResult.gapDaysUsed} / ${pdcResult.gapDaysAllowed} (${pdcResult.gapDaysRemaining} remaining)`);
  console.log(`     Days to Runout: ${pdcResult.daysUntilRunout} days`);
  console.log(`     Current Supply: ${pdcResult.currentSupply} days`);

  // ---------------------------------------------------------------------------
  // Step 5: Calculate Fragility Tier
  // ---------------------------------------------------------------------------

  console.log('\n🎯 Step 5: Calculating Fragility Tier');

  const fragilityResult: FragilityResult = calculateFragility({
    pdcResult,
    refillsRemaining: 3, // TODO: Get from MedicationRequest
    measureTypes: [MEASURE],
    isNewPatient: false, // TODO: Determine from first fill date
    currentDate: new Date(),
  });

  console.log(`  ✅ Fragility Calculated`);
  console.log(`     Tier: ${fragilityResult.tier}`);
  console.log(`     Urgency: ${fragilityResult.urgencyLevel}`);
  console.log(`     Priority Score: ${fragilityResult.priorityScore}`);
  console.log(`     Delay Budget: ${fragilityResult.delayBudgetPerRefill} days/refill`);
  console.log(`     Contact Window: ${fragilityResult.contactWindow}`);
  console.log(`     Action: ${fragilityResult.action}`);

  // Show flags
  console.log(`\n     Flags:`);
  console.log(`       - Compliant: ${fragilityResult.flags.isCompliant ? '✅' : '❌'}`);
  console.log(`       - Unsalvageable: ${fragilityResult.flags.isUnsalvageable ? '⚠️ YES' : '✅ NO'}`);
  console.log(`       - Out of Meds: ${fragilityResult.flags.isOutOfMeds ? '⚠️ YES' : '✅ NO'}`);
  console.log(`       - Q4: ${fragilityResult.flags.isQ4 ? '📅 YES' : 'NO'}`);

  // Show bonuses
  console.log(`\n     Bonus Breakdown:`);
  console.log(`       - Base Score: ${fragilityResult.bonuses.base}`);
  console.log(`       - Out of Meds: +${fragilityResult.bonuses.outOfMeds}`);
  console.log(`       - Q4: +${fragilityResult.bonuses.q4}`);
  console.log(`       - Multiple MA: +${fragilityResult.bonuses.multipleMA}`);
  console.log(`       - New Patient: +${fragilityResult.bonuses.newPatient}`);

  // ---------------------------------------------------------------------------
  // Step 6: Store as FHIR Observation (Optional)
  // ---------------------------------------------------------------------------

  console.log('\n💾 Step 6: Store as FHIR Observation');

  const shouldStore = process.env.AUTO_STORE_OBSERVATIONS === 'true';

  if (shouldStore) {
    try {
      const observation = await storePDCObservation(medplum, {
        patientId: patient.id!,
        measure: MEASURE,
        pdc: pdcResult.pdc,
        fragility: fragilityResult,
        effectiveDate: new Date(),
      });

      console.log(`  ✅ Observation stored: Observation/${observation.id}`);
    } catch (error) {
      console.log(`  ⚠️  Failed to store observation: ${error}`);
    }
  } else {
    console.log('  ℹ️  Skipped (set AUTO_STORE_OBSERVATIONS=true in .env.local to auto-store)');
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log('\n' + '=' .repeat(80));
  console.log('\n✅ PDC Calculation Complete!\n');

  // Print summary card
  console.log('📋 Summary Card:');
  console.log('┌─────────────────────────────────────────────┐');
  console.log(`│ Patient: ${patient.name?.[0]?.given?.join(' ')} ${patient.name?.[0]?.family}`.padEnd(46) + '│');
  console.log(`│ PDC: ${pdcResult.pdc.toFixed(1)}%`.padEnd(46) + '│');
  console.log(`│ Tier: ${fragilityResult.tier}`.padEnd(46) + '│');
  console.log(`│ Priority: ${fragilityResult.priorityScore}`.padEnd(46) + '│');
  console.log(`│ Action: ${fragilityResult.action}`.padEnd(46) + '│');
  console.log('└─────────────────────────────────────────────┘\n');
}

// =============================================================================
// Run
// =============================================================================

calculatePatientPDC()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
