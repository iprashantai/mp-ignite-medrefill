#!/usr/bin/env npx tsx
/**
 * Real Patient PDC Calculator
 *
 * This script fetches real dispense data from Medplum for a specific patient
 * and calculates PDC at both medication-level and measure-level.
 *
 * Run: npx tsx scripts/calculate-real-patient-pdc.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { MedplumClient } from '@medplum/core';
import type { MedicationDispense } from '@medplum/fhirtypes';
import type { IClientStorage } from '@medplum/core';

// Import our PDC calculation functions
import {
  calculatePDC,
  calculateCoverageShortfall,
  calculateRemainingRefills,
  calculateSupplyOnHand,
  calculateDaysToYearEndFromDate,
  calculateFragility,
} from '../src/lib/pdc';

import {
  extractFillDate,
  extractDaysSupply,
  extractMedicationCode,
  classifyDispenseByMeasure,
} from '../src/lib/fhir/dispense-service';

import type { MAMeasure } from '../src/lib/fhir/types';

// =============================================================================
// Extended MA RxNorm Lookup (includes branded/dose-specific codes)
// =============================================================================

/**
 * Extended lookup for MA medications including specific dose forms.
 * The dispense-service uses ingredient codes, but actual dispenses
 * use SCD (Semantic Clinical Drug) codes that include dose/form.
 *
 * This lookup supplements the base lookup for demonstration purposes.
 */
const EXTENDED_MA_RXNORM_CODES: Record<MAMeasure, Set<string>> = {
  // MAC - Statins (including dose-specific codes)
  MAC: new Set([
    '83367', // Atorvastatin (ingredient)
    '617310', // atorvastatin 20 MG Oral Tablet
    '617312', // atorvastatin 40 MG Oral Tablet
    '617314', // atorvastatin 80 MG Oral Tablet
    '617318', // atorvastatin 10 MG Oral Tablet
    '36567', // Simvastatin (ingredient)
    '301542', // Rosuvastatin (ingredient)
    '42463', // Pravastatin (ingredient)
    '6472', // Lovastatin (ingredient)
    '41127', // Fluvastatin (ingredient)
    '861634', // Pitavastatin (ingredient)
  ]),

  // MAD - Diabetes medications
  MAD: new Set([
    '6809', // Metformin (ingredient)
    '860975', // 24 HR Metformin hydrochloride 500 MG Extended Release Oral Tablet
    '860981', // 24 HR Metformin hydrochloride 750 MG Extended Release Oral Tablet
    '861007', // Metformin hydrochloride 500 MG Oral Tablet
    '861010', // Metformin hydrochloride 850 MG Oral Tablet
    '861004', // Metformin hydrochloride 1000 MG Oral Tablet
    '4821', // Glipizide
    '4815', // Glyburide
    '593411', // Sitagliptin
    '33738', // Pioglitazone
    '25789', // Glimepiride
    '614348', // Saxagliptin
    '857974', // Linagliptin
    '1368001', // Canagliflozin
    '1545653', // Empagliflozin
  ]),

  // MAH - Hypertension (ACE Inhibitors, ARBs) including dose-specific codes
  MAH: new Set([
    '310965', // Lisinopril (ingredient)
    '314076', // lisinopril 10 MG Oral Tablet
    '314077', // lisinopril 20 MG Oral Tablet
    '314073', // lisinopril 2.5 MG Oral Tablet
    '314074', // lisinopril 5 MG Oral Tablet
    '52175', // Losartan (ingredient)
    '3827', // Enalapril (ingredient)
    '69749', // Valsartan (ingredient)
    '35296', // Ramipril (ingredient)
    '198188', // ramipril 2.5 MG Oral Capsule
    '198189', // ramipril 5 MG Oral Capsule
    '198190', // ramipril 10 MG Oral Capsule
    '29046', // Benazepril (ingredient)
    '50166', // Fosinopril (ingredient)
    '83515', // Irbesartan (ingredient)
    '73494', // Olmesartan (ingredient)
    '321064', // Telmisartan (ingredient)
    '310798', // Hydrochlorothiazide 25 MG Oral Tablet
    '310792', // Hydrochlorothiazide 12.5 MG Oral Capsule
    '310797', // Hydrochlorothiazide 50 MG Oral Tablet
  ]),
};

/**
 * Classify medication by MA measure using extended lookup
 */
function classifyByMeasureExtended(rxnormCode: string): MAMeasure | null {
  if (EXTENDED_MA_RXNORM_CODES.MAC.has(rxnormCode)) return 'MAC';
  if (EXTENDED_MA_RXNORM_CODES.MAD.has(rxnormCode)) return 'MAD';
  if (EXTENDED_MA_RXNORM_CODES.MAH.has(rxnormCode)) return 'MAH';

  // Fall back to base dispense service lookup
  return null;
}

// =============================================================================
// Configuration
// =============================================================================

const PATIENT_ID = 'c9d7748e-ec35-cff9-9c87-db94a78e2f9c';

// Memory storage for MedplumClient
class MemoryStorage implements IClientStorage {
  private data: Record<string, string> = {};
  clear() {
    this.data = {};
  }
  getString(key: string) {
    return this.data[key];
  }
  setString(key: string, value: string) {
    this.data[key] = value;
  }
  getObject<T>(key: string): T | undefined {
    const str = this.getString(key);
    return str ? JSON.parse(str) : undefined;
  }
  setObject<T>(key: string, value: T) {
    this.setString(key, JSON.stringify(value));
  }
  makeKey(...parts: string[]) {
    return parts.join(':');
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function getMedicationDisplay(dispense: MedicationDispense): string {
  return (
    dispense.medicationCodeableConcept?.text ||
    dispense.medicationCodeableConcept?.coding?.[0]?.display ||
    'Unknown Medication'
  );
}

function groupDispensesByMedication(
  dispenses: MedicationDispense[]
): Map<string, { dispenses: MedicationDispense[]; display: string; measure: MAMeasure | null }> {
  const grouped = new Map<
    string,
    { dispenses: MedicationDispense[]; display: string; measure: MAMeasure | null }
  >();

  for (const dispense of dispenses) {
    const rxnormCode = extractMedicationCode(dispense) || 'unknown';
    const display = getMedicationDisplay(dispense);
    // Try extended lookup first, then base lookup
    const measure = classifyByMeasureExtended(rxnormCode) || classifyDispenseByMeasure(dispense);

    if (!grouped.has(rxnormCode)) {
      grouped.set(rxnormCode, { dispenses: [], display, measure });
    }
    grouped.get(rxnormCode)!.dispenses.push(dispense);
  }

  return grouped;
}

function groupDispensesByMeasure(
  dispenses: MedicationDispense[]
): Map<MAMeasure, MedicationDispense[]> {
  const grouped = new Map<MAMeasure, MedicationDispense[]>();

  for (const dispense of dispenses) {
    const rxnormCode = extractMedicationCode(dispense);
    // Try extended lookup first, then base lookup
    const measure = rxnormCode
      ? classifyByMeasureExtended(rxnormCode) || classifyDispenseByMeasure(dispense)
      : classifyDispenseByMeasure(dispense);

    if (measure) {
      if (!grouped.has(measure)) {
        grouped.set(measure, []);
      }
      grouped.get(measure)!.push(dispense);
    }
  }

  return grouped;
}

// =============================================================================
// Main Script
// =============================================================================

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('  REAL PATIENT PDC CALCULATOR');
  console.log('  Medication-Level & Measure-Level Analysis');
  console.log('═'.repeat(80));

  // Connect to Medplum
  const medplum = new MedplumClient({
    baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/',
    clientId: process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
    storage: new MemoryStorage(),
  });

  const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;

  if (clientId && clientSecret) {
    console.log('\n📡 Connecting to Medplum...');
    await medplum.startClientLogin(clientId, clientSecret);
    console.log('✓ Connected successfully');
  } else {
    console.error('❌ Missing Medplum credentials in .env.local');
    process.exit(1);
  }

  // Fetch patient (handle case where patient resource may not exist)
  console.log(`\n📋 Fetching patient: ${PATIENT_ID}`);
  try {
    const patient = await medplum.readResource('Patient', PATIENT_ID);
    console.log(`✓ Patient found: [Name redacted for PHI compliance]`);
  } catch {
    console.log(`⚠️  Patient resource not found directly, continuing with dispense data...`);
  }

  // Fetch all dispenses for this patient
  console.log('\n💊 Fetching medication dispenses...');
  const allDispenses = await medplum.searchResources('MedicationDispense', {
    subject: `Patient/${PATIENT_ID}`,
    status: 'completed',
    _count: '100',
  });
  console.log(`✓ Found ${allDispenses.length} total dispenses`);

  // Determine measurement years available
  const yearsWithData = new Set<number>();
  for (const d of allDispenses) {
    const fillDate = extractFillDate(d);
    if (fillDate) {
      yearsWithData.add(fillDate.getFullYear());
    }
  }

  const sortedYears = Array.from(yearsWithData).sort();
  console.log(`\n📅 Measurement years with data: ${sortedYears.join(', ')}`);

  // Calculate PDC for each year
  for (const year of sortedYears) {
    console.log('\n' + '━'.repeat(80));
    console.log(`  MEASUREMENT YEAR: ${year}`);
    console.log('━'.repeat(80));

    // Filter dispenses for this year
    const yearDispenses = allDispenses.filter((d) => {
      const fillDate = extractFillDate(d);
      return fillDate && fillDate.getFullYear() === year;
    });

    console.log(`\n  Total dispenses in ${year}: ${yearDispenses.length}`);

    if (yearDispenses.length === 0) {
      console.log('  ⚠️  No dispenses found for this year');
      continue;
    }

    // Calculate current date for this year (use end of year for historical, today for current)
    const today = new Date();
    const isCurrentYear = year === today.getFullYear();
    const currentDate = isCurrentYear ? today : new Date(year, 11, 31);
    const measurementEnd = currentDate;

    // -------------------------------------------------------------------------
    // SECTION 1: Medication-Level PDC
    // -------------------------------------------------------------------------
    console.log('\n  ┌─────────────────────────────────────────────────────────────────────┐');
    console.log('  │  MEDICATION-LEVEL PDC                                               │');
    console.log('  └─────────────────────────────────────────────────────────────────────┘');

    const byMedication = groupDispensesByMedication(yearDispenses);

    for (const [rxnormCode, { dispenses, display, measure }] of byMedication) {
      console.log(`\n  ▸ ${display}`);
      console.log(`    RxNorm: ${rxnormCode} | Measure: ${measure || 'N/A'}`);
      console.log(`    Fills: ${dispenses.length}`);

      // List individual fills
      for (const d of dispenses) {
        const fillDate = extractFillDate(d);
        const daysSupply = extractDaysSupply(d);
        console.log(
          `      - ${fillDate?.toISOString().split('T')[0]} | ${daysSupply} days supply`
        );
      }

      // Convert to fill records
      const fillRecords = dispenses
        .map((d) => {
          const fillDate = extractFillDate(d);
          if (!fillDate) return null;
          return {
            fillDate,
            daysSupply: extractDaysSupply(d),
          };
        })
        .filter((r): r is { fillDate: Date; daysSupply: number } => r !== null);

      if (fillRecords.length === 0) {
        console.log('    ⚠️  No valid fill records');
        continue;
      }

      // Find first fill date
      const firstFillDate = fillRecords.reduce(
        (min, r) => (r.fillDate < min ? r.fillDate : min),
        fillRecords[0].fillDate
      );

      // Skip if first fill is in the future (can't calculate PDC yet)
      if (firstFillDate > currentDate) {
        console.log('\n    ⏳ First fill is in the future - PDC calculation not applicable yet');
        console.log(`       First fill: ${firstFillDate.toISOString().split('T')[0]}`);
        console.log(`       Current date: ${currentDate.toISOString().split('T')[0]}`);
        continue;
      }

      // Define measurement period
      const measurementPeriod = {
        start: firstFillDate,
        end: measurementEnd,
      };

      // Calculate PDC
      const pdcResult = calculatePDC({
        fills: fillRecords,
        measurementPeriod,
        currentDate,
      });

      // Calculate refill metrics
      const lastDispense = dispenses[dispenses.length - 1];
      const supplyOnHand = calculateSupplyOnHand(lastDispense, currentDate);
      const daysToYearEnd = calculateDaysToYearEndFromDate(currentDate);
      const coverageShortfall = calculateCoverageShortfall({
        daysRemainingUntilYearEnd: daysToYearEnd,
        daysOfSupplyOnHand: supplyOnHand,
      });
      const refillResult = calculateRemainingRefills({
        coverageShortfall,
        standardDaysSupply: 30,
        recentFills: dispenses,
      });

      // Calculate fragility (only if MA measure)
      let fragilityInfo = '';
      if (measure) {
        const fragility = calculateFragility({
          pdcResult,
          refillsRemaining: refillResult.remainingRefills,
          measureTypes: [measure],
          isNewPatient: false,
          currentDate,
        });
        fragilityInfo = ` | Tier: ${fragility.tier} | Priority: ${fragility.priorityScore}`;
      }

      // Display results
      console.log('\n    📊 Results:');
      console.log(`       PDC: ${pdcResult.pdc.toFixed(1)}%`);
      console.log(
        `       Covered Days: ${pdcResult.coveredDays} / ${pdcResult.treatmentDays} days`
      );
      console.log(`       Gap Days Used: ${pdcResult.gapDaysUsed}`);
      console.log(`       Gap Days Remaining: ${pdcResult.gapDaysRemaining}`);
      console.log(`       PDC Status Quo: ${pdcResult.pdcStatusQuo?.toFixed(1) ?? 'N/A'}%`);
      console.log(`       PDC Perfect: ${pdcResult.pdcPerfect?.toFixed(1) ?? 'N/A'}%`);
      console.log(`       Days Until Runout: ${pdcResult.daysUntilRunout}`);
      console.log(`       Supply On Hand: ${supplyOnHand} days`);
      console.log(`       Coverage Shortfall: ${coverageShortfall} days`);
      console.log(`       Remaining Refills: ${refillResult.remainingRefills}`);
      console.log(`       Est. Days/Refill: ${refillResult.estimatedDaysPerRefill}`);
      if (fragilityInfo) {
        console.log(`       Fragility${fragilityInfo}`);
      }
    }

    // -------------------------------------------------------------------------
    // SECTION 2: Measure-Level PDC (HEDIS Standard - All Meds Merged)
    // -------------------------------------------------------------------------
    console.log('\n  ┌─────────────────────────────────────────────────────────────────────┐');
    console.log('  │  MEASURE-LEVEL PDC (HEDIS Standard - All Meds Merged)              │');
    console.log('  └─────────────────────────────────────────────────────────────────────┘');

    const byMeasure = groupDispensesByMeasure(yearDispenses);

    if (byMeasure.size === 0) {
      console.log('\n  ⚠️  No MA-relevant medications found for this year');
      continue;
    }

    for (const [measure, dispenses] of byMeasure) {
      const measureName =
        measure === 'MAC'
          ? 'Cholesterol (Statins)'
          : measure === 'MAD'
            ? 'Diabetes'
            : 'Hypertension (RAS Antagonists)';

      console.log(`\n  ▸ ${measure} - ${measureName}`);
      console.log(`    Total Fills: ${dispenses.length} (all medications merged)`);

      // List unique medications in this measure
      const medsInMeasure = new Set<string>();
      for (const d of dispenses) {
        medsInMeasure.add(getMedicationDisplay(d));
      }
      console.log(`    Medications: ${Array.from(medsInMeasure).join(', ')}`);

      // Convert all dispenses to fill records (merged per HEDIS)
      const fillRecords = dispenses
        .map((d) => {
          const fillDate = extractFillDate(d);
          if (!fillDate) return null;
          return {
            fillDate,
            daysSupply: extractDaysSupply(d),
          };
        })
        .filter((r): r is { fillDate: Date; daysSupply: number } => r !== null)
        .sort((a, b) => a.fillDate.getTime() - b.fillDate.getTime());

      if (fillRecords.length === 0) {
        console.log('    ⚠️  No valid fill records');
        continue;
      }

      // Find first fill date
      const firstFillDate = fillRecords[0].fillDate;

      // Skip if first fill is in the future
      if (firstFillDate > currentDate) {
        console.log('\n    ⏳ First fill is in the future - PDC calculation not applicable yet');
        continue;
      }

      // Define measurement period
      const measurementPeriod = {
        start: firstFillDate,
        end: measurementEnd,
      };

      // Calculate PDC with merged intervals
      const pdcResult = calculatePDC({
        fills: fillRecords,
        measurementPeriod,
        currentDate,
      });

      // Calculate fragility
      const fragility = calculateFragility({
        pdcResult,
        refillsRemaining: 3, // Assume typical 3 refills remaining for measure-level
        measureTypes: [measure],
        isNewPatient: false,
        currentDate,
      });

      // Display results
      console.log('\n    📊 Results (HEDIS Merged):');
      console.log(`       PDC: ${pdcResult.pdc.toFixed(1)}%`);
      console.log(
        `       Covered Days: ${pdcResult.coveredDays} / ${pdcResult.treatmentDays} days`
      );
      console.log(`       Gap Days Used: ${pdcResult.gapDaysUsed}`);
      console.log(`       Gap Days Remaining: ${pdcResult.gapDaysRemaining}`);
      console.log(`       PDC Status Quo: ${pdcResult.pdcStatusQuo?.toFixed(1) ?? 'N/A'}%`);
      console.log(`       PDC Perfect: ${pdcResult.pdcPerfect?.toFixed(1) ?? 'N/A'}%`);
      console.log(`       Days Until Runout: ${pdcResult.daysUntilRunout}`);
      console.log(`       Fragility Tier: ${fragility.tier}`);
      console.log(`       Priority Score: ${fragility.priorityScore}`);
      console.log(`       Urgency: ${fragility.urgencyLevel}`);
      console.log(`       Delay Budget: ${fragility.delayBudgetPerRefill} days`);

      // Status indicator
      const status =
        pdcResult.pdc >= 80
          ? '✅ PASSING'
          : pdcResult.pdc >= 60
            ? '⚠️  AT-RISK'
            : '❌ FAILING';
      console.log(`       Status: ${status}`);
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n' + '═'.repeat(80));
  console.log('  CALCULATION COMPLETE');
  console.log('═'.repeat(80));
  console.log(`
  Patient ID: ${PATIENT_ID}
  Total Dispenses: ${allDispenses.length}
  Years with Data: ${sortedYears.join(', ')}

  Key Differences:
  ─────────────────────────────────────────────────────────────────────────────
  • MEDICATION-LEVEL PDC: Calculated for each individual drug (e.g., Lisinopril)
    - Used for patient engagement: "You need 2 more refills of Lisinopril"
    - Includes supply-on-hand, coverage shortfall, remaining refills

  • MEASURE-LEVEL PDC: All drugs in a class merged (per HEDIS standard)
    - Used for Star Rating reporting
    - Overlapping coverage from different drugs counts only once
    - Example: If Lisinopril + Losartan both cover same day, counted once
  `);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
