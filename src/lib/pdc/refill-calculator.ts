/**
 * Refill Calculator
 *
 * Calculates coverage shortfall, remaining refills needed to reach year-end,
 * supply on hand from last dispense, and days to year end.
 *
 * FROM LEGACY: Exact port of calculateRemainingRefills() and calculateCoverageShortfall()
 *
 * @see docs/implementation/phase-1-core-engine/specs/02_PDC_CALCULATOR_SPEC.md
 */

import type { MedicationDispense } from '@medplum/fhirtypes';
import { DEFAULT_DAYS_SUPPLY } from './constants';

// =============================================================================
// Types
// =============================================================================

/**
 * Input for coverage shortfall calculation.
 */
export interface CoverageShortfallInput {
  daysRemainingUntilYearEnd: number;
  daysOfSupplyOnHand: number;
}

/**
 * Input for remaining refills calculation.
 */
export interface RefillCalculationInput {
  /** Days short of year-end (pre-calculated) */
  coverageShortfall: number;
  /** Typical fill (30, 60, or 90), default 30 */
  standardDaysSupply?: number;
  /** RX history to determine pattern */
  recentFills?: MedicationDispense[];
}

/**
 * Result of remaining refills calculation.
 */
export interface RefillCalculationResult {
  remainingRefills: number;
  estimatedDaysPerRefill: number;
  reasoning: string;
}

// =============================================================================
// Coverage Shortfall Calculation
// =============================================================================

/**
 * Calculate coverage shortfall (how many days short of year-end).
 *
 * FROM LEGACY: Exact port of calculateCoverageShortfall()
 *
 * @param input - Days remaining and supply on hand
 * @returns Coverage shortfall in days (0 if no shortfall)
 */
export function calculateCoverageShortfall(input: CoverageShortfallInput): number {
  return Math.max(0, input.daysRemainingUntilYearEnd - input.daysOfSupplyOnHand);
}

// =============================================================================
// Remaining Refills Calculation
// =============================================================================

/**
 * Calculate remaining refills needed to reach year-end.
 * THIS IS NOT THE SAME AS "REFILLS ON PRESCRIPTION"
 *
 * FROM LEGACY: Exact port of calculateRemainingRefills()
 *
 * @param input - Coverage shortfall and fill history
 * @returns Remaining refills, estimated days per refill, and reasoning
 */
export function calculateRemainingRefills(
  input: RefillCalculationInput
): RefillCalculationResult {
  const { coverageShortfall, standardDaysSupply = DEFAULT_DAYS_SUPPLY, recentFills = [] } = input;

  // If no shortfall, no refills needed
  if (coverageShortfall <= 0) {
    return {
      remainingRefills: 0,
      estimatedDaysPerRefill: standardDaysSupply,
      reasoning: 'No refills needed - adequate coverage to reach year-end',
    };
  }

  // Determine typical days per fill from recent fill history
  let estimatedDaysPerRefill = standardDaysSupply;

  if (recentFills.length > 0) {
    const totalDaysSupply = recentFills.reduce(
      (sum, fill) => sum + (fill.daysSupply?.value ?? 0),
      0
    );
    const avgDaysSupply = Math.round(totalDaysSupply / recentFills.length);

    // Use average if valid
    if (avgDaysSupply > 0) {
      estimatedDaysPerRefill = avgDaysSupply;
    }
  }

  // Calculate refills needed (ROUND UP to ensure full coverage)
  const remainingRefills = Math.ceil(coverageShortfall / estimatedDaysPerRefill);

  return {
    remainingRefills,
    estimatedDaysPerRefill,
    reasoning: `Need ${remainingRefills} refill(s) of ${estimatedDaysPerRefill}-day supply`,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate days of supply on hand from last dispense.
 *
 * @param lastDispense - Most recent MedicationDispense
 * @param currentDate - Current date for calculation
 * @returns Days of supply remaining (0 if depleted)
 */
export function calculateSupplyOnHand(
  lastDispense: MedicationDispense,
  currentDate: Date
): number {
  const whenHandedOver = lastDispense.whenHandedOver;
  if (!whenHandedOver) return 0;

  const dispenseDate = new Date(whenHandedOver);
  const daysSinceDispense = Math.floor(
    (currentDate.getTime() - dispenseDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysSupply = lastDispense.daysSupply?.value ?? DEFAULT_DAYS_SUPPLY;
  const remaining = daysSupply - daysSinceDispense;

  return Math.max(0, remaining);
}

/**
 * Calculate days remaining until year end.
 *
 * @param currentDate - Current date
 * @returns Days until December 31st (0 minimum)
 */
export function calculateDaysToYearEnd(currentDate: Date): number {
  const yearEnd = new Date(currentDate.getFullYear(), 11, 31);
  const diff = yearEnd.getTime() - currentDate.getTime();
  // Use Math.max to ensure we never return -0
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
