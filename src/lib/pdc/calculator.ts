/**
 * PDC Calculator
 *
 * Core PDC (Proportion of Days Covered) calculation engine.
 * Business logic ported EXACTLY from legacy/src/services/pdcDataService.js.
 *
 * @see docs/implementation/phase-1-core-engine/specs/02_PDC_CALCULATOR_SPEC.md
 * @see docs/implementation/phase-1-core-engine/test-cases/golden-standard-tests.json
 */

import type { MedicationDispense } from '@medplum/fhirtypes';
import type { FillRecord, PDCInput, PDCResult, GapDaysResult } from './types';
import { GAP_DAYS_ALLOWED_PERCENTAGE, DEFAULT_DAYS_SUPPLY } from './constants';
import { extractFillDate, extractDaysSupply } from '../fhir/dispense-service';

// =============================================================================
// Interval Merging Algorithm (EXACT LEGACY PORT)
// =============================================================================

/**
 * Calculate covered days from fills using legacy algorithm.
 *
 * FROM: legacy/pdcDataService.js lines 126-151
 *
 * HEDIS requires that each day is counted at most once, even if
 * multiple prescriptions cover the same day.
 *
 * Algorithm (EXACT from legacy):
 * 1. Sort fills by date ascending
 * 2. Track currentCoveredUntil date
 * 3. For each fill:
 *    - If fill starts after currentCoveredUntil: add full days supply
 *    - If fill extends beyond currentCoveredUntil: add only extension days
 *    - If fill is fully within currentCoveredUntil: add 0 days
 * 4. Cap total at treatment period
 *
 * @param fills - Array of {fillDate, daysSupply} records
 * @param treatmentPeriodEnd - End of treatment period (usually Dec 31)
 * @returns Total covered days
 *
 * @see MERGE-01 to MERGE-04 in golden-standard-tests.json
 */
export function calculateCoveredDaysFromFills(
  fills: FillRecord[],
  treatmentPeriodEnd: Date
): number {
  if (fills.length === 0) return 0;

  // Sort by fill date (legacy uses Rx_Date_Of_Service)
  const sortedFills = [...fills].sort((a, b) => a.fillDate.getTime() - b.fillDate.getTime());

  let coveredDays = 0;
  let currentCoveredUntil = new Date(sortedFills[0].fillDate);

  for (const fill of sortedFills) {
    const fillDate = fill.fillDate;
    const daysSupply = fill.daysSupply;

    if (daysSupply > 0) {
      // Calculate when this fill's coverage ends
      const fillEndDate = new Date(fillDate.getTime() + daysSupply * 24 * 60 * 60 * 1000);

      if (fillDate > currentCoveredUntil) {
        // No overlap - add full days supply
        // FROM: legacy line 136-139
        coveredDays += daysSupply;
        currentCoveredUntil = fillEndDate;
      } else if (fillEndDate > currentCoveredUntil) {
        // Partial overlap - only count days beyond current coverage
        // FROM: legacy lines 140-144
        const additionalDays = Math.floor(
          (fillEndDate.getTime() - currentCoveredUntil.getTime()) / (1000 * 60 * 60 * 24)
        );
        coveredDays += additionalDays;
        currentCoveredUntil = fillEndDate;
      }
      // Else: completely overlapped (fillEndDate <= currentCoveredUntil)
      // FROM: legacy line 146: don't add any days
    }
  }

  // Cap covered days at treatment period
  // FROM: legacy line 151: Math.min(coveredDays, treatmentDays)
  const treatmentDays =
    Math.floor(
      (treatmentPeriodEnd.getTime() - sortedFills[0].fillDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  return Math.min(coveredDays, treatmentDays);
}

// =============================================================================
// Treatment Period Calculation
// =============================================================================

/**
 * Calculate treatment period (IPSD to Dec 31).
 *
 * IPSD = Index Prescription Start Date (first fill date)
 *
 * @param firstFillDate - Date of first fill in measurement year
 * @param measurementYear - Calendar year
 * @returns Number of days in treatment period
 *
 * @example
 * // First fill: Jan 15, 2025
 * // Treatment period: Jan 15 to Dec 31 = 351 days
 */
export function calculateTreatmentPeriod(firstFillDate: Date, measurementYear: number): number {
  const yearEnd = new Date(measurementYear, 11, 31); // Dec 31
  const diffMs = yearEnd.getTime() - firstFillDate.getTime();
  // Add 1 because both start and end days are inclusive
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

// =============================================================================
// Gap Days Calculation
// =============================================================================

/**
 * Calculate gap day metrics.
 *
 * Formulas (Golden Standard):
 * - Gap Days Used = Treatment Period - Covered Days
 * - Gap Days Allowed = floor(Treatment Period × 20%)
 * - Gap Days Remaining = Allowed - Used
 *
 * @param treatmentDays - Total days in treatment period
 * @param coveredDays - Total days with coverage
 * @returns Gap day metrics
 *
 * @see TC-GS-005 to TC-GS-008
 */
export function calculateGapDays(treatmentDays: number, coveredDays: number): GapDaysResult {
  const gapDaysUsed = treatmentDays - coveredDays;
  const gapDaysAllowed = Math.floor(treatmentDays * GAP_DAYS_ALLOWED_PERCENTAGE);
  const gapDaysRemaining = gapDaysAllowed - gapDaysUsed;

  return { gapDaysUsed, gapDaysAllowed, gapDaysRemaining };
}

// =============================================================================
// PDC Projections
// =============================================================================

/**
 * Calculate PDC Status Quo projection.
 *
 * Formula (Golden Standard):
 * PDC_StatusQuo = (Covered Days + min(Current Supply, Days to Year End)) / Treatment Period × 100
 *
 * This projects PDC assuming no more refills beyond current supply.
 *
 * @param coveredDays - Current covered days
 * @param currentSupply - Days of supply remaining
 * @param daysToYearEnd - Days until Dec 31
 * @param treatmentDays - Total treatment period
 * @returns Projected PDC percentage
 *
 * @see F061: PDC Status Quo calculation
 * @see TC-GS-017
 */
export function calculatePDCStatusQuo(
  coveredDays: number,
  currentSupply: number,
  daysToYearEnd: number,
  treatmentDays: number
): number {
  // Supply capped at days to year end
  const additionalDays = Math.min(currentSupply, daysToYearEnd);
  const projectedCovered = coveredDays + additionalDays;
  return Math.min((projectedCovered / treatmentDays) * 100, 100);
}

/**
 * Calculate PDC Perfect projection.
 *
 * Formula (Golden Standard):
 * PDC_Perfect = (Covered Days + Days to Year End) / Treatment Period × 100
 *
 * This projects PDC assuming perfect adherence from now until year end.
 * If PDC_Perfect < 80%, patient is T5 (unsalvageable).
 *
 * @param coveredDays - Current covered days
 * @param daysToYearEnd - Days until Dec 31
 * @param treatmentDays - Total treatment period
 * @returns Projected PDC percentage
 *
 * @see F062: PDC Perfect calculation
 * @see TC-GS-018
 */
export function calculatePDCPerfect(
  coveredDays: number,
  daysToYearEnd: number,
  treatmentDays: number
): number {
  const projectedCovered = coveredDays + daysToYearEnd;
  return Math.min((projectedCovered / treatmentDays) * 100, 100);
}

// =============================================================================
// Days to Runout Calculation
// =============================================================================

/**
 * Calculate days until patient runs out of medication.
 *
 * Formula:
 * Days to Runout = (Last Fill Date + Days Supply) - Current Date
 *
 * Negative values indicate patient is already out of medication.
 *
 * @param lastFillDate - Date of most recent fill
 * @param daysSupply - Days supply from last fill
 * @param currentDate - Current date
 * @returns Days until runout (can be negative)
 *
 * @see F057: Days to runout calculation
 */
export function calculateDaysToRunout(
  lastFillDate: Date,
  daysSupply: number,
  currentDate: Date
): number {
  const runoutDate = new Date(lastFillDate.getTime() + daysSupply * 24 * 60 * 60 * 1000);
  const diffMs = runoutDate.getTime() - currentDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate current supply remaining.
 *
 * @param lastFillDate - Date of most recent fill
 * @param daysSupply - Days supply from last fill
 * @param currentDate - Current date
 * @returns Days of supply remaining (minimum 0)
 */
export function calculateCurrentSupply(
  lastFillDate: Date,
  daysSupply: number,
  currentDate: Date
): number {
  const daysToRunout = calculateDaysToRunout(lastFillDate, daysSupply, currentDate);
  return Math.max(0, daysToRunout);
}

// =============================================================================
// Refills Needed Calculation
// =============================================================================

/**
 * Calculate refills needed to reach year end.
 *
 * Formula:
 * Refills Needed = ceil((Days to Year End - Current Supply) / Typical Days Supply)
 *
 * @param daysToYearEnd - Days until Dec 31
 * @param currentSupply - Days of supply remaining
 * @param typicalDaysSupply - Typical prescription days supply (default: 30)
 * @returns Number of refills needed (minimum 0)
 *
 * @see F064: Refills needed calculation
 */
export function calculateRefillsNeeded(
  daysToYearEnd: number,
  currentSupply: number,
  typicalDaysSupply: number = DEFAULT_DAYS_SUPPLY
): number {
  if (currentSupply >= daysToYearEnd) return 0;
  const daysNeeded = daysToYearEnd - currentSupply;
  return Math.ceil(daysNeeded / typicalDaysSupply);
}

// =============================================================================
// Transform MedicationDispense to PDCInput
// =============================================================================

/**
 * Transform MedicationDispense resources to calculator input format.
 *
 * @param dispenses - Array of MedicationDispense resources
 * @param measurementYear - Calendar year for measurement
 * @param currentDate - Current date for calculations
 * @returns PDCInput for calculator
 */
export function transformDispensesToInput(
  dispenses: MedicationDispense[],
  measurementYear: number,
  currentDate: Date
): PDCInput {
  // Extract fill records from dispenses
  const fills: FillRecord[] = [];

  for (const dispense of dispenses) {
    const fillDate = extractFillDate(dispense);
    if (!fillDate) continue; // Skip dispenses without valid date

    const daysSupply = extractDaysSupply(dispense);

    fills.push({
      fillDate,
      daysSupply,
    });
  }

  // Sort by date
  fills.sort((a, b) => a.fillDate.getTime() - b.fillDate.getTime());

  // Determine measurement period
  const yearEnd = new Date(measurementYear, 11, 31);
  const periodStart = fills.length > 0 ? fills[0].fillDate : new Date(measurementYear, 0, 1);

  return {
    fills,
    measurementPeriod: {
      start: periodStart,
      end: yearEnd,
    },
    currentDate,
  };
}

// =============================================================================
// Main PDC Calculation
// =============================================================================

/**
 * Calculate PDC from PDCInput.
 *
 * This is the main PDC calculation function that computes all metrics
 * needed for display and fragility tier calculation.
 *
 * @param input - PDCInput with fills, measurement period, and current date
 * @returns Complete PDCResult with all metrics
 *
 * @example
 * const result = calculatePDC({
 *   fills: [{ fillDate: new Date('2025-01-15'), daysSupply: 30 }],
 *   measurementPeriod: { start: new Date('2025-01-15'), end: new Date('2025-12-31') },
 *   currentDate: new Date('2025-06-01'),
 * });
 */
export function calculatePDC(input: PDCInput): PDCResult {
  const { fills, measurementPeriod, currentDate } = input;

  // Handle empty fills
  if (fills.length === 0) {
    const treatmentDays =
      Math.floor(
        (measurementPeriod.end.getTime() - measurementPeriod.start.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    const daysToYearEnd = Math.max(
      0,
      Math.floor(
        (measurementPeriod.end.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    );

    const gapDays = calculateGapDays(treatmentDays, 0);

    return {
      pdc: 0,
      coveredDays: 0,
      treatmentDays,
      gapDaysUsed: gapDays.gapDaysUsed,
      gapDaysAllowed: gapDays.gapDaysAllowed,
      gapDaysRemaining: gapDays.gapDaysRemaining,
      pdcStatusQuo: 0,
      pdcPerfect: calculatePDCPerfect(0, daysToYearEnd, treatmentDays),
      measurementPeriod,
      daysUntilRunout: 0,
      currentSupply: 0,
      refillsNeeded: calculateRefillsNeeded(daysToYearEnd, 0),
      lastFillDate: null,
      fillCount: 0,
      daysToYearEnd,
    };
  }

  // Sort fills by date
  const sortedFills = [...fills].sort((a, b) => a.fillDate.getTime() - b.fillDate.getTime());

  // Get last fill for runout calculation
  const lastFill = sortedFills[sortedFills.length - 1];

  // Calculate treatment period
  const treatmentDays =
    Math.floor(
      (measurementPeriod.end.getTime() - measurementPeriod.start.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  // Calculate covered days using legacy algorithm
  const coveredDays = calculateCoveredDaysFromFills(sortedFills, measurementPeriod.end);

  // Calculate PDC percentage
  const pdc = Math.min((coveredDays / treatmentDays) * 100, 100);

  // Calculate gap days
  const gapDays = calculateGapDays(treatmentDays, coveredDays);

  // Calculate days to year end
  const daysToYearEnd = Math.max(
    0,
    Math.floor((measurementPeriod.end.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) +
      1
  );

  // Calculate current supply based on last fill
  const currentSupply = calculateCurrentSupply(lastFill.fillDate, lastFill.daysSupply, currentDate);

  // Calculate projections
  const pdcStatusQuo = calculatePDCStatusQuo(
    coveredDays,
    currentSupply,
    daysToYearEnd,
    treatmentDays
  );

  const pdcPerfect = calculatePDCPerfect(coveredDays, daysToYearEnd, treatmentDays);

  // Calculate days until runout
  const daysUntilRunout = calculateDaysToRunout(
    lastFill.fillDate,
    lastFill.daysSupply,
    currentDate
  );

  // Calculate refills needed
  const refillsNeeded = calculateRefillsNeeded(daysToYearEnd, currentSupply);

  return {
    pdc,
    coveredDays,
    treatmentDays,
    gapDaysUsed: gapDays.gapDaysUsed,
    gapDaysAllowed: gapDays.gapDaysAllowed,
    gapDaysRemaining: gapDays.gapDaysRemaining,
    pdcStatusQuo,
    pdcPerfect,
    measurementPeriod,
    daysUntilRunout,
    currentSupply,
    refillsNeeded,
    lastFillDate: lastFill.fillDate,
    fillCount: fills.length,
    daysToYearEnd,
  };
}

// =============================================================================
// Convenience Function: Calculate PDC from MedicationDispense
// =============================================================================

/**
 * Calculate PDC from MedicationDispense resources.
 *
 * This is the main entry point for PDC calculation from FHIR resources.
 * Accepts MedicationDispense resources and returns a complete PDCResult.
 *
 * @param dispenses - Array of MedicationDispense resources (completed status only)
 * @param measurementYear - Calendar year for measurement (e.g., 2025)
 * @param currentDate - Current date for projection calculations (default: today)
 * @returns Complete PDC result with all metrics
 *
 * @example
 * const dispenses = await getPatientDispenses(medplum, patientId, 2025);
 * const result = calculatePDCFromDispenses(dispenses, 2025);
 * console.log(result.pdc); // 85.2
 */
export function calculatePDCFromDispenses(
  dispenses: MedicationDispense[],
  measurementYear: number,
  currentDate: Date = new Date()
): PDCResult {
  const input = transformDispensesToInput(dispenses, measurementYear, currentDate);
  return calculatePDC(input);
}
