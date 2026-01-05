#!/usr/bin/env tsx
/**
 * Batch Calculate PDC for All Patients
 *
 * Processes all patients in Medplum and calculates their PDC scores.
 * This script:
 * 1. Fetches all patients
 * 2. For each patient, gets dispenses and calculates PDC
 * 3. Stores results as FHIR Observations
 * 4. Generates summary report
 */

import { MedplumClient } from '@medplum/core';
import dotenv from 'dotenv';
import { Patient, MedicationDispense } from '@medplum/fhirtypes';

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

const MEASUREMENT_YEAR = parseInt(process.argv[2] || '2025');
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to dry run
const MAX_PATIENTS = parseInt(process.env.MAX_PATIENTS || '100');

interface ProcessingResult {
  patientId: string;
  patientName: string;
  success: boolean;
  pdc?: number;
  tier?: string;
  priorityScore?: number;
  error?: string;
}

// =============================================================================
// Main Function
// =============================================================================

async function batchCalculateAllPatients() {
  console.log('🏥 Batch PDC Calculation for All Patients\n');
  console.log('=' .repeat(80));
  console.log(`Year: ${MEASUREMENT_YEAR}`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '💾 LIVE (will write to DB)'}`);
  console.log(`Max Patients: ${MAX_PATIENTS}`);
  console.log('=' .repeat(80));

  // ---------------------------------------------------------------------------
  // Connect to Medplum
  // ---------------------------------------------------------------------------

  console.log('\n🔌 Connecting to Medplum...');

  const medplum = new MedplumClient({
    baseUrl: process.env.MEDPLUM_BASE_URL,
    clientId: process.env.MEDPLUM_CLIENT_ID,
    clientSecret: process.env.MEDPLUM_CLIENT_SECRET,
  });

  await medplum.startClientLogin(
    process.env.MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );

  console.log('✅ Connected\n');

  // ---------------------------------------------------------------------------
  // Fetch All Patients
  // ---------------------------------------------------------------------------

  console.log('👥 Fetching patients...');

  const patientBundle = await medplum.search('Patient', {
    _count: String(MAX_PATIENTS),
  });

  const patients = (patientBundle.entry || [])
    .map((e) => e.resource as Patient)
    .filter((p) => p.id);

  console.log(`✅ Found ${patients.length} patients\n`);

  if (patients.length === 0) {
    console.log('❌ No patients to process');
    return;
  }

  // ---------------------------------------------------------------------------
  // Process Each Patient
  // ---------------------------------------------------------------------------

  const results: ProcessingResult[] = [];
  let processed = 0;

  for (const patient of patients) {
    processed++;
    const patientName = `${patient.name?.[0]?.given?.join(' ') || ''} ${patient.name?.[0]?.family || ''}`.trim() || 'Unknown';

    console.log(`[${processed}/${patients.length}] Processing: ${patientName} (${patient.id})`);

    try {
      // Get dispenses
      const dispenses = await getPatientDispenses(medplum, patient.id!, MEASUREMENT_YEAR);

      if (dispenses.length === 0) {
        console.log(`  ⚠️  No dispenses found - skipping`);
        results.push({
          patientId: patient.id!,
          patientName,
          success: false,
          error: 'No dispenses',
        });
        continue;
      }

      console.log(`  💊 Found ${dispenses.length} dispenses`);

      // Calculate PDC
      const pdcResult: PDCResult = calculatePDCFromDispenses({
        dispenses,
        measurementYear: MEASUREMENT_YEAR,
        currentDate: new Date(),
      });

      // Calculate Fragility
      const fragilityResult: FragilityResult = calculateFragility({
        pdcResult,
        refillsRemaining: 3,
        measureTypes: ['MAC'], // TODO: Determine actual measures
        isNewPatient: false,
        currentDate: new Date(),
      });

      console.log(`  📊 PDC: ${pdcResult.pdc.toFixed(1)}% | Tier: ${fragilityResult.tier} | Priority: ${fragilityResult.priorityScore}`);

      // Store observation (if not dry run)
      if (!DRY_RUN) {
        await storePDCObservation(medplum, {
          patientId: patient.id!,
          measure: 'MAC', // TODO: Determine measure
          pdc: pdcResult.pdc,
          fragility: fragilityResult,
          effectiveDate: new Date(),
        });
        console.log(`  ✅ Stored`);
      } else {
        console.log(`  ℹ️  (dry run - not stored)`);
      }

      results.push({
        patientId: patient.id!,
        patientName,
        success: true,
        pdc: pdcResult.pdc,
        tier: fragilityResult.tier,
        priorityScore: fragilityResult.priorityScore,
      });
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      results.push({
        patientId: patient.id!,
        patientName,
        success: false,
        error: String(error),
      });
    }

    console.log('');
  }

  // ---------------------------------------------------------------------------
  // Generate Summary Report
  // ---------------------------------------------------------------------------

  console.log('=' .repeat(80));
  console.log('\n📊 SUMMARY REPORT\n');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`Total Patients: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (successful.length > 0) {
    const avgPDC =
      successful.reduce((sum, r) => sum + (r.pdc || 0), 0) / successful.length;

    console.log(`\n📈 PDC Statistics:`);
    console.log(`   Average PDC: ${avgPDC.toFixed(1)}%`);

    // Count by tier
    const tierCounts: Record<string, number> = {};
    successful.forEach((r) => {
      if (r.tier) {
        tierCounts[r.tier] = (tierCounts[r.tier] || 0) + 1;
      }
    });

    console.log(`\n🎯 Fragility Tier Distribution:`);
    Object.entries(tierCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([tier, count]) => {
        const pct = ((count / successful.length) * 100).toFixed(1);
        console.log(`   ${tier}: ${count} (${pct}%)`);
      });

    // Top 10 priority patients
    console.log(`\n🚨 Top 10 Priority Patients:`);
    const top10 = successful
      .filter((r) => r.priorityScore !== undefined)
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, 10);

    top10.forEach((r, i) => {
      console.log(
        `   ${i + 1}. ${r.patientName.padEnd(30)} | PDC: ${r.pdc?.toFixed(1)}% | ${r.tier} | Priority: ${r.priorityScore}`
      );
    });
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed Patients:`);
    failed.forEach((r) => {
      console.log(`   ${r.patientName} (${r.patientId}): ${r.error}`);
    });
  }

  console.log('\n' + '=' .repeat(80));

  if (DRY_RUN) {
    console.log('\n💡 This was a DRY RUN - no data was written to Medplum');
    console.log('   To write results, run: DRY_RUN=false npx tsx <this-script>\n');
  } else {
    console.log('\n✅ All observations have been written to Medplum\n');
  }
}

// =============================================================================
// Run
// =============================================================================

batchCalculateAllPatients()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
