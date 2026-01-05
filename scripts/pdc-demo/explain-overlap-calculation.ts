/**
 * PDC Overlap Calculation Explainer
 *
 * Demonstrates how HEDIS interval merging handles overlapping fills
 * from different dosage forms of the same medication.
 *
 * Example scenario:
 * Day 90:   Fill Metformin 500mg (90 days) → Covers Day 90-179
 * Day 150:  Fill Metformin 1000mg (90 days) → Covers Day 150-239
 */

import { calculateCoveredDaysFromFills, calculatePDC } from '../../src/lib/pdc/calculator';
import type { FillRecord } from '../../src/lib/pdc/types';

// =============================================================================
// Scenario Setup
// =============================================================================

const YEAR = 2025;
const yearStart = new Date(YEAR, 0, 1); // Jan 1, 2025

// Helper to create a date from day of year
function dayOfYear(day: number): Date {
  const date = new Date(yearStart);
  date.setDate(date.getDate() + day - 1);
  return date;
}

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  PDC OVERLAP CALCULATION - HEDIS Interval Merging Explained');
console.log('═══════════════════════════════════════════════════════════════════');
console.log();

// =============================================================================
// The Overlapping Fills Scenario
// =============================================================================

const fills: FillRecord[] = [
  { fillDate: dayOfYear(90), daysSupply: 90, rxnormCode: '860975' },  // Metformin 500mg
  { fillDate: dayOfYear(150), daysSupply: 90, rxnormCode: '861004' }, // Metformin 1000mg
];

console.log('SCENARIO: Overlapping Fills (Different Dosages)');
console.log('─────────────────────────────────────────────────────────────────────');
console.log();
console.log('  Day 90:  Fill Metformin 500mg  (90 days) → Covers Day 90-179');
console.log('           ████████████████████████████████████');
console.log('                               ↑');
console.log('  Day 150: Fill Metformin 1000mg (90 days) → Covers Day 150-239');
console.log('                               ████████████████████████████████████');
console.log();

// =============================================================================
// Step-by-Step Interval Merging
// =============================================================================

console.log('STEP-BY-STEP HEDIS INTERVAL MERGING:');
console.log('─────────────────────────────────────────────────────────────────────');
console.log();

// Sort fills by date
const sortedFills = [...fills].sort((a, b) => a.fillDate.getTime() - b.fillDate.getTime());

console.log('Step 1: Sort fills by date');
sortedFills.forEach((fill, i) => {
  const endDay = Math.floor((fill.fillDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1 + fill.daysSupply - 1;
  const startDay = Math.floor((fill.fillDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  console.log(`   Fill ${i + 1}: Day ${startDay} + ${fill.daysSupply} days = Coverage [${startDay}, ${endDay}]`);
});
console.log();

console.log('Step 2: Process each fill and merge overlaps');
console.log();

let coveredDays = 0;
let currentCoveredUntil = new Date(sortedFills[0].fillDate);

for (let i = 0; i < sortedFills.length; i++) {
  const fill = sortedFills[i];
  const fillDate = fill.fillDate;
  const daysSupply = fill.daysSupply;
  const fillEndDate = new Date(fillDate.getTime() + daysSupply * 24 * 60 * 60 * 1000);

  const fillStartDay = Math.floor((fillDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const fillEndDay = Math.floor((fillEndDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
  const coveredUntilDay = Math.floor((currentCoveredUntil.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  console.log(`   Processing Fill ${i + 1}: Day ${fillStartDay}, ${daysSupply} days supply`);
  console.log(`   ├── Fill covers: [Day ${fillStartDay} → Day ${fillEndDay}]`);
  console.log(`   ├── Current covered until: Day ${coveredUntilDay}`);

  if (fillDate > currentCoveredUntil) {
    // No overlap
    console.log(`   ├── No overlap: Fill starts AFTER current coverage ends`);
    console.log(`   ├── Adding FULL ${daysSupply} days`);
    coveredDays += daysSupply;
    currentCoveredUntil = fillEndDate;
  } else if (fillEndDate > currentCoveredUntil) {
    // Partial overlap
    const additionalDays = Math.floor(
      (fillEndDate.getTime() - currentCoveredUntil.getTime()) / (1000 * 60 * 60 * 24)
    );
    const overlapDays = daysSupply - additionalDays;
    console.log(`   ├── PARTIAL OVERLAP: Fill starts BEFORE current coverage ends`);
    console.log(`   ├── Overlap: ${overlapDays} days (Day 150-179) - NOT counted again`);
    console.log(`   ├── Extension: ${additionalDays} days (Day 180-239) - ADDED`);
    coveredDays += additionalDays;
    currentCoveredUntil = fillEndDate;
  } else {
    // Complete overlap
    console.log(`   ├── COMPLETE OVERLAP: Fill ends BEFORE current coverage ends`);
    console.log(`   ├── Adding 0 days`);
  }

  console.log(`   └── Running total: ${coveredDays} covered days`);
  console.log();
}

console.log('Step 3: Final merged coverage');
console.log(`   Total Covered Days: ${coveredDays}`);
console.log();

// =============================================================================
// Visual Representation
// =============================================================================

console.log('VISUAL REPRESENTATION:');
console.log('─────────────────────────────────────────────────────────────────────');
console.log();
console.log('  Before Merge (if counted separately):');
console.log('     Metformin 500mg:  [Day 90────────Day 179]  = 90 days');
console.log('     Metformin 1000mg:      [Day 150────────Day 239]  = 90 days');
console.log('     WRONG Total:                               = 180 days ❌');
console.log();
console.log('  After HEDIS Merge (correct):');
console.log('     Merged interval:  [Day 90────────────────Day 239]  = 150 days ✓');
console.log('     Overlap (Day 150-179): 30 days counted ONCE, not twice');
console.log();

// =============================================================================
// PDC Calculation Result
// =============================================================================

const yearEnd = new Date(YEAR, 11, 31);
const actualCoveredDays = calculateCoveredDaysFromFills(fills, yearEnd);

// Treatment period starts from first fill
const treatmentPeriodStart = fills[0].fillDate;
const treatmentDays = Math.ceil((yearEnd.getTime() - treatmentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

console.log('PDC CALCULATION:');
console.log('─────────────────────────────────────────────────────────────────────');
console.log();
console.log(`  Treatment Period: Day 90 (first fill) → Day 365 (Dec 31)`);
console.log(`  Treatment Days: ${treatmentDays} days`);
console.log(`  Covered Days (merged): ${actualCoveredDays} days`);
console.log();
console.log(`  PDC = Covered Days / Treatment Days`);
console.log(`      = ${actualCoveredDays} / ${treatmentDays}`);
console.log(`      = ${((actualCoveredDays / treatmentDays) * 100).toFixed(1)}%`);
console.log();

// =============================================================================
// Full PDC Result Using Calculator
// =============================================================================

const pdcResult = calculatePDC({
  fills,
  measurementYear: YEAR,
  currentDate: new Date(YEAR, 5, 15), // Mid-year calculation
});

console.log('FULL PDC RESULT:');
console.log('─────────────────────────────────────────────────────────────────────');
console.log();
console.log(`  PDC: ${pdcResult.pdc.toFixed(1)}%`);
console.log(`  Covered Days: ${pdcResult.coveredDays}`);
console.log(`  Treatment Days: ${pdcResult.treatmentDays}`);
console.log(`  Gap Days Used: ${pdcResult.gapDaysResult.gapDaysUsed}`);
console.log(`  Gap Days Allowed: ${pdcResult.gapDaysResult.gapDaysAllowed}`);
console.log(`  Gap Days Remaining: ${pdcResult.gapDaysResult.gapDaysRemaining}`);
console.log();

// =============================================================================
// Key Takeaway
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  KEY TAKEAWAY: HEDIS Interval Merging');
console.log('═══════════════════════════════════════════════════════════════════');
console.log();
console.log('  When a patient switches from Metformin 500mg to 1000mg:');
console.log('  • Both are the same therapeutic class (MAD - Diabetes)');
console.log('  • HEDIS treats them as interchangeable for PDC calculation');
console.log('  • Overlapping days are counted ONLY ONCE');
console.log('  • This prevents double-counting when switching doses');
console.log();
console.log('  This is why MEASURE-LEVEL PDC (all drugs merged) differs from');
console.log('  MEDICATION-LEVEL PDC (each drug calculated separately).');
console.log();
