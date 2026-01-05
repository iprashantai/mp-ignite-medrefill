#!/usr/bin/env npx tsx
/**
 * Step-by-step PDC Calculation Explanation
 *
 * This script shows exactly how PDC is calculated for a patient
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { MedplumClient } from '@medplum/core';
import type { MedicationDispense } from '@medplum/fhirtypes';
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

function extractFillDate(dispense: MedicationDispense): Date | null {
  const dateStr = dispense.whenHandedOver || dispense.whenPrepared;
  if (!dateStr) return null;
  return new Date(dateStr);
}

function extractDaysSupply(dispense: MedicationDispense): number {
  return dispense.daysSupply?.value || 0;
}

function getMedicationName(dispense: MedicationDispense): string {
  return dispense.medicationCodeableConcept?.text ||
         dispense.medicationCodeableConcept?.coding?.[0]?.display ||
         'Unknown';
}

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
    status: 'completed',
    _count: '50',
  });

  console.log('\n' + '='.repeat(80));
  console.log('STEP-BY-STEP PDC CALCULATION EXPLANATION');
  console.log('='.repeat(80));
  console.log(`\nPatient ID: ${PATIENT_ID}`);
  console.log(`Total Dispenses Found: ${dispenses.length}`);

  // =========================================================================
  // STEP 1: Define Measurement Period
  // =========================================================================
  console.log('\n' + '-'.repeat(80));
  console.log('STEP 1: Define Measurement Period');
  console.log('-'.repeat(80));

  const measurementYear = new Date().getFullYear(); // 2026
  const measurementStart = new Date(measurementYear, 0, 1); // Jan 1, 2026
  const today = new Date();
  const yearEnd = new Date(measurementYear, 11, 31); // Dec 31, 2026
  const measurementEnd = today < yearEnd ? today : yearEnd;

  console.log(`\nMeasurement Year: ${measurementYear}`);
  console.log(`Measurement Start: ${measurementStart.toISOString().split('T')[0]}`);
  console.log(`Measurement End (today or Dec 31): ${measurementEnd.toISOString().split('T')[0]}`);

  // =========================================================================
  // STEP 2: Filter Dispenses to Measurement Year
  // =========================================================================
  console.log('\n' + '-'.repeat(80));
  console.log('STEP 2: Filter Dispenses to Measurement Year');
  console.log('-'.repeat(80));

  const dispensesInYear = dispenses.filter(d => {
    const fillDate = extractFillDate(d);
    if (!fillDate) return false;
    return fillDate.getFullYear() === measurementYear;
  });

  console.log(`\nDispenses in ${measurementYear}: ${dispensesInYear.length}`);

  if (dispensesInYear.length === 0) {
    console.log('\n⚠️  No dispenses found in measurement year.');
    console.log('Looking at all dispenses to show the calculation logic...\n');
  }

  // Show all dispenses for context
  console.log('\nAll Dispenses (sorted by date):');
  const sortedDispenses = [...dispenses].sort((a, b) => {
    const dateA = extractFillDate(a);
    const dateB = extractFillDate(b);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  sortedDispenses.forEach((d, i) => {
    const fillDate = extractFillDate(d);
    const daysSupply = extractDaysSupply(d);
    const medName = getMedicationName(d);
    const inYear = fillDate && fillDate.getFullYear() === measurementYear ? '✓' : '✗';
    console.log(`  ${inYear} [${i + 1}] ${fillDate?.toISOString().split('T')[0]} | ${daysSupply} days | ${medName}`);
  });

  // =========================================================================
  // STEP 3: Calculate Treatment Period
  // =========================================================================
  console.log('\n' + '-'.repeat(80));
  console.log('STEP 3: Calculate Treatment Period');
  console.log('-'.repeat(80));

  // For dispenses in measurement year
  const dispensesToUse = dispensesInYear.length > 0 ? dispensesInYear : sortedDispenses;

  // Find first fill date
  let firstFillDate: Date | null = null;
  for (const d of dispensesToUse) {
    const fillDate = extractFillDate(d);
    if (fillDate) {
      if (!firstFillDate || fillDate < firstFillDate) {
        firstFillDate = fillDate;
      }
    }
  }

  if (!firstFillDate) {
    console.log('\n❌ No valid fill dates found');
    return;
  }

  // Treatment period = first fill to measurement end
  const treatmentDays = Math.floor(
    (measurementEnd.getTime() - firstFillDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  console.log(`\nFirst Fill Date: ${firstFillDate.toISOString().split('T')[0]}`);
  console.log(`Measurement End: ${measurementEnd.toISOString().split('T')[0]}`);
  console.log(`Treatment Period: ${treatmentDays} days`);
  console.log(`\nFormula: Treatment Days = (Measurement End - First Fill Date) + 1`);

  // =========================================================================
  // STEP 4: Calculate Covered Days (HEDIS Interval Merging)
  // =========================================================================
  console.log('\n' + '-'.repeat(80));
  console.log('STEP 4: Calculate Covered Days (HEDIS Interval Merging)');
  console.log('-'.repeat(80));

  console.log('\nThis is the key algorithm - we merge overlapping coverage periods.');
  console.log('If a patient refills early, overlapping days only count once.\n');

  // Create coverage intervals
  type Interval = { start: number; end: number; medication: string };
  const intervals: Interval[] = [];

  dispensesToUse.forEach(d => {
    const fillDate = extractFillDate(d);
    const daysSupply = extractDaysSupply(d);
    const medName = getMedicationName(d);

    if (fillDate && daysSupply > 0) {
      const startDay = Math.floor(
        (fillDate.getTime() - firstFillDate!.getTime()) / (1000 * 60 * 60 * 24)
      );
      const endDay = startDay + daysSupply - 1; // -1 because fill day counts as day 1

      intervals.push({
        start: Math.max(0, startDay), // Can't start before first fill
        end: Math.min(endDay, treatmentDays - 1), // Can't extend beyond measurement period
        medication: medName,
      });
    }
  });

  // Sort by start day
  intervals.sort((a, b) => a.start - b.start);

  console.log('Coverage Intervals (before merging):');
  intervals.forEach((interval, i) => {
    console.log(`  [${i + 1}] Day ${interval.start} to Day ${interval.end} (${interval.end - interval.start + 1} days) - ${interval.medication}`);
  });

  // Merge overlapping intervals (HEDIS algorithm)
  console.log('\nMerging overlapping intervals...');

  const mergedIntervals: { start: number; end: number }[] = [];

  for (const interval of intervals) {
    if (mergedIntervals.length === 0) {
      mergedIntervals.push({ start: interval.start, end: interval.end });
    } else {
      const last = mergedIntervals[mergedIntervals.length - 1];

      if (interval.start <= last.end + 1) {
        // Overlapping or adjacent - extend the previous interval
        console.log(`  Merging: [${last.start}-${last.end}] + [${interval.start}-${interval.end}] = [${last.start}-${Math.max(last.end, interval.end)}]`);
        last.end = Math.max(last.end, interval.end);
      } else {
        // Gap - add new interval
        console.log(`  Gap detected between Day ${last.end} and Day ${interval.start}`);
        mergedIntervals.push({ start: interval.start, end: interval.end });
      }
    }
  }

  console.log('\nMerged Intervals:');
  let coveredDays = 0;
  mergedIntervals.forEach((interval, i) => {
    const days = interval.end - interval.start + 1;
    coveredDays += days;
    console.log(`  [${i + 1}] Day ${interval.start} to Day ${interval.end} = ${days} days`);
  });

  // Cap at treatment days
  coveredDays = Math.min(coveredDays, treatmentDays);

  console.log(`\nTotal Covered Days: ${coveredDays}`);

  // =========================================================================
  // STEP 5: Calculate PDC
  // =========================================================================
  console.log('\n' + '-'.repeat(80));
  console.log('STEP 5: Calculate PDC');
  console.log('-'.repeat(80));

  const pdc = (coveredDays / treatmentDays) * 100;

  console.log('\n📊 PDC FORMULA:');
  console.log('   PDC = (Covered Days / Treatment Days) × 100');
  console.log(`   PDC = (${coveredDays} / ${treatmentDays}) × 100`);
  console.log(`   PDC = ${pdc.toFixed(1)}%`);

  // =========================================================================
  // STEP 6: Calculate Gap Days
  // =========================================================================
  console.log('\n' + '-'.repeat(80));
  console.log('STEP 6: Calculate Gap Days');
  console.log('-'.repeat(80));

  const gapDaysUsed = treatmentDays - coveredDays;
  const gapDaysAllowed = Math.floor(treatmentDays * 0.20); // 20% of treatment period
  const gapDaysRemaining = gapDaysAllowed - gapDaysUsed;

  console.log('\n📊 GAP DAYS FORMULAS:');
  console.log(`   Gap Days Used = Treatment Days - Covered Days`);
  console.log(`   Gap Days Used = ${treatmentDays} - ${coveredDays} = ${gapDaysUsed}`);
  console.log('');
  console.log(`   Gap Days Allowed = Treatment Days × 20%`);
  console.log(`   Gap Days Allowed = ${treatmentDays} × 0.20 = ${gapDaysAllowed}`);
  console.log('');
  console.log(`   Gap Days Remaining = Gap Days Allowed - Gap Days Used`);
  console.log(`   Gap Days Remaining = ${gapDaysAllowed} - ${gapDaysUsed} = ${gapDaysRemaining}`);

  // =========================================================================
  // STEP 7: Determine PDC Status
  // =========================================================================
  console.log('\n' + '-'.repeat(80));
  console.log('STEP 7: Determine PDC Status');
  console.log('-'.repeat(80));

  let status: string;
  if (pdc >= 80) {
    status = '✅ PASSING (PDC ≥ 80%)';
  } else if (pdc >= 60) {
    status = '⚠️  AT-RISK (60% ≤ PDC < 80%)';
  } else {
    status = '❌ FAILING (PDC < 60%)';
  }

  console.log(`\n${status}`);
  console.log(`\nPDC Thresholds (HEDIS Standard):`);
  console.log(`   ≥ 80% = Passing (Adherent)`);
  console.log(`   60-79% = At-Risk`);
  console.log(`   < 60% = Failing (Non-Adherent)`);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  console.log(`
Patient: ${PATIENT_ID}
Measurement Year: ${measurementYear}
First Fill Date: ${firstFillDate.toISOString().split('T')[0]}
Measurement End: ${measurementEnd.toISOString().split('T')[0]}

Treatment Days: ${treatmentDays}
Covered Days: ${coveredDays}
Gap Days Used: ${gapDaysUsed}
Gap Days Allowed: ${gapDaysAllowed}
Gap Days Remaining: ${gapDaysRemaining}

PDC: ${pdc.toFixed(1)}%
Status: ${status}
`);
}

main().catch(console.error);
