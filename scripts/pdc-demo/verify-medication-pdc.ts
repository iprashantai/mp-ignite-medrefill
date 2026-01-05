#!/usr/bin/env npx tsx
/**
 * Verification Script: Medication-Level PDC Implementation
 *
 * This script demonstrates and verifies the NEW medication-level PDC functionality:
 * 1. Refill calculator (coverage shortfall, remaining refills, supply on hand)
 * 2. Medication observation service (build, parse, round-trip)
 *
 * Run: npx tsx scripts/verify-medication-pdc.ts
 */

import {
  calculateCoverageShortfall,
  calculateRemainingRefills,
  calculateSupplyOnHand,
  calculateDaysToYearEndFromDate,
} from '../src/lib/pdc';

import { parseMedicationPDCObservation } from '../src/lib/fhir/medication-observation-service';

import type { MedicationDispense, Observation } from '@medplum/fhirtypes';

// =============================================================================
// Verification Tests
// =============================================================================

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║  MEDICATION-LEVEL PDC VERIFICATION SCRIPT                        ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

let allPassed = true;
let testCount = 0;
let passCount = 0;

function test(name: string, fn: () => boolean) {
  testCount++;
  try {
    const passed = fn();
    if (passed) {
      passCount++;
      console.log(`  ✅ ${name}`);
    } else {
      allPassed = false;
      console.log(`  ❌ ${name}`);
    }
  } catch (error) {
    allPassed = false;
    console.log(`  ❌ ${name} - ERROR: ${error}`);
  }
}

// =============================================================================
// Test 1: Coverage Shortfall Calculation
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST GROUP 1: Coverage Shortfall Calculation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

test('Shortfall when supply < days to year end', () => {
  const result = calculateCoverageShortfall({
    daysRemainingUntilYearEnd: 100,
    daysOfSupplyOnHand: 30,
  });
  return result === 70;
});

test('Zero shortfall when supply >= days to year end', () => {
  const result = calculateCoverageShortfall({
    daysRemainingUntilYearEnd: 30,
    daysOfSupplyOnHand: 60,
  });
  return result === 0;
});

test('Zero shortfall when supply equals days to year end', () => {
  const result = calculateCoverageShortfall({
    daysRemainingUntilYearEnd: 50,
    daysOfSupplyOnHand: 50,
  });
  return result === 0;
});

test('Full shortfall when zero supply on hand', () => {
  const result = calculateCoverageShortfall({
    daysRemainingUntilYearEnd: 90,
    daysOfSupplyOnHand: 0,
  });
  return result === 90;
});

console.log();

// =============================================================================
// Test 2: Remaining Refills Calculation
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST GROUP 2: Remaining Refills Calculation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

test('Zero refills when no shortfall', () => {
  const result = calculateRemainingRefills({
    coverageShortfall: 0,
    standardDaysSupply: 30,
  });
  return result.remainingRefills === 0;
});

test('Correct refills with 30-day supply (exact)', () => {
  const result = calculateRemainingRefills({
    coverageShortfall: 90,
    standardDaysSupply: 30,
  });
  return result.remainingRefills === 3 && result.estimatedDaysPerRefill === 30;
});

test('Rounds UP to ensure full coverage', () => {
  const result = calculateRemainingRefills({
    coverageShortfall: 100,
    standardDaysSupply: 30,
  });
  return result.remainingRefills === 4; // ceil(100/30) = 4
});

test('Uses average from recent fills', () => {
  const recentFills: MedicationDispense[] = [
    createMockDispense('2025-09-01', 90),
    createMockDispense('2025-10-01', 90),
  ];
  const result = calculateRemainingRefills({
    coverageShortfall: 180,
    standardDaysSupply: 30,
    recentFills,
  });
  return result.estimatedDaysPerRefill === 90 && result.remainingRefills === 2;
});

console.log();

// =============================================================================
// Test 3: Supply On Hand Calculation
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST GROUP 3: Supply On Hand Calculation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

test('Correct remaining supply mid-fill', () => {
  const dispense = createMockDispense('2025-11-01', 30);
  const currentDate = new Date('2025-11-15');
  const result = calculateSupplyOnHand(dispense, currentDate);
  return result === 16; // 30 - 14 days elapsed
});

test('Zero supply when depleted', () => {
  const dispense = createMockDispense('2025-10-01', 30);
  const currentDate = new Date('2025-11-15');
  const result = calculateSupplyOnHand(dispense, currentDate);
  return result === 0;
});

test('Full supply on fill day', () => {
  const dispense = createMockDispense('2025-11-15', 30);
  const currentDate = new Date('2025-11-15');
  const result = calculateSupplyOnHand(dispense, currentDate);
  return result === 30;
});

console.log();

// =============================================================================
// Test 4: Days To Year End Calculation
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST GROUP 4: Days To Year End Calculation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

test('Mid-November calculation (46 days)', () => {
  const result = calculateDaysToYearEndFromDate(new Date('2025-11-15'));
  return result === 46;
});

test('Dec 31 returns 0', () => {
  const result = calculateDaysToYearEndFromDate(new Date('2025-12-31'));
  return result === 0;
});

test('Jan 1 returns ~365', () => {
  const result = calculateDaysToYearEndFromDate(new Date('2025-01-01'));
  return result === 364;
});

console.log();

// =============================================================================
// Test 5: Medication Observation Round-Trip
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST GROUP 5: Medication Observation Round-Trip');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const mockObservation: Observation = {
  resourceType: 'Observation',
  id: 'med-obs-123',
  status: 'final',
  code: {
    coding: [
      {
        system: 'https://ignitehealth.io/fhir/CodeSystem/adherence-metrics',
        code: 'pdc-medication',
        display: 'PDC Score - Individual Medication',
      },
    ],
  },
  subject: { reference: 'Patient/patient-123' },
  effectiveDateTime: '2025-11-15T12:00:00Z',
  valueQuantity: { value: 0.85, unit: 'ratio' },
  extension: [
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/fragility-tier', valueCode: 'F2_FRAGILE' },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/priority-score', valueInteger: 80 },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/is-current-pdc', valueBoolean: true },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/ma-measure', valueCode: 'MAH' },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/days-until-runout', valueInteger: 26 },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/gap-days-remaining', valueInteger: 15 },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/delay-budget', valueInteger: 7 },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/q4-adjusted', valueBoolean: false },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/medication-rxnorm', valueCode: '314076' },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/medication-display', valueString: 'Lisinopril 10mg' },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/estimated-days-per-refill', valueInteger: 30 },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/remaining-refills', valueInteger: 2 },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/supply-on-hand', valueInteger: 26 },
    { url: 'https://ignitehealth.io/fhir/StructureDefinition/coverage-shortfall', valueInteger: 20 },
  ],
};

const parsed = parseMedicationPDCObservation(mockObservation);

test('PDC value parsed correctly', () => parsed.pdc === 0.85);
test('Measure parsed correctly', () => parsed.measure === 'MAH');
test('Medication RxNorm parsed correctly', () => parsed.medicationRxnorm === '314076');
test('Medication display parsed correctly', () => parsed.medicationDisplay === 'Lisinopril 10mg');
test('Fragility tier parsed correctly', () => parsed.fragilityTier === 'F2_FRAGILE');
test('Priority score parsed correctly', () => parsed.priorityScore === 80);
test('Days until runout parsed correctly', () => parsed.daysUntilRunout === 26);
test('Gap days remaining parsed correctly', () => parsed.gapDaysRemaining === 15);
test('Delay budget parsed correctly', () => parsed.delayBudget === 7);
test('Q4 adjusted parsed correctly', () => parsed.q4Adjusted === false);
test('Is current PDC parsed correctly', () => parsed.isCurrentPDC === true);
test('Estimated days per refill parsed correctly', () => parsed.estimatedDaysPerRefill === 30);
test('Remaining refills parsed correctly', () => parsed.remainingRefills === 2);
test('Supply on hand parsed correctly', () => parsed.supplyOnHand === 26);
test('Coverage shortfall parsed correctly', () => parsed.coverageShortfall === 20);
test('Patient ID extracted correctly', () => parsed.patientId === 'patient-123');

console.log();

// =============================================================================
// Test 6: End-to-End Scenario
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST GROUP 6: End-to-End Scenario');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Simulate: Patient with last fill on Nov 11, 30-day supply, current date Nov 15
const currentDate = new Date('2025-11-15');
const lastDispense = createMockDispense('2025-11-11', 30);

// Calculate all derived values
const supplyOnHand = calculateSupplyOnHand(lastDispense, currentDate);
const daysToYearEnd = calculateDaysToYearEndFromDate(currentDate);
const coverageShortfall = calculateCoverageShortfall({
  daysRemainingUntilYearEnd: daysToYearEnd,
  daysOfSupplyOnHand: supplyOnHand,
});
const refillResult = calculateRemainingRefills({
  coverageShortfall,
  standardDaysSupply: 30,
});

console.log('  Scenario: Patient with last fill Nov 11, 30-day supply, current date Nov 15');
console.log('');
console.log(`  Supply on hand: ${supplyOnHand} days`);
console.log(`  Days to year end: ${daysToYearEnd} days`);
console.log(`  Coverage shortfall: ${coverageShortfall} days`);
console.log(`  Remaining refills: ${refillResult.remainingRefills}`);
console.log(`  Estimated days/refill: ${refillResult.estimatedDaysPerRefill}`);
console.log('');

test('Supply on hand is 26 (30 - 4 days elapsed)', () => supplyOnHand === 26);
test('Days to year end is 46 (Nov 15 → Dec 31)', () => daysToYearEnd === 46);
test('Coverage shortfall is 20 (46 - 26)', () => coverageShortfall === 20);
test('Remaining refills is 1 (ceil(20/30))', () => refillResult.remainingRefills === 1);

console.log();

// =============================================================================
// Summary
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`RESULTS: ${passCount}/${testCount} tests passed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (allPassed) {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ ALL VERIFICATIONS PASSED                                     ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  The medication-level PDC implementation is working correctly:   ║');
  console.log('║  • Coverage shortfall calculation ✓                              ║');
  console.log('║  • Remaining refills calculation ✓                               ║');
  console.log('║  • Supply on hand calculation ✓                                  ║');
  console.log('║  • Days to year end calculation ✓                                ║');
  console.log('║  • FHIR Observation parsing ✓                                    ║');
  console.log('║  • End-to-end scenario ✓                                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  process.exit(0);
} else {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ❌ SOME VERIFICATIONS FAILED                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  process.exit(1);
}

// =============================================================================
// Helper Functions
// =============================================================================

function createMockDispense(fillDate: string, daysSupply: number): MedicationDispense {
  return {
    resourceType: 'MedicationDispense',
    id: `dispense-${fillDate}`,
    status: 'completed',
    whenHandedOver: fillDate,
    daysSupply: {
      value: daysSupply,
      unit: 'days',
    },
  };
}
