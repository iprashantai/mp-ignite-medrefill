/**
 * PDC Calculator Types
 *
 * Zod schemas and TypeScript types for PDC calculation.
 *
 * @see docs/implementation/phase-1-core-engine/specs/02_PDC_CALCULATOR_SPEC.md
 * @see docs/implementation/phase-1-core-engine/test-cases/golden-standard-tests.json
 */

import { z } from 'zod';

// =============================================================================
// Fill Record Schema
// =============================================================================

/**
 * A single fill record for PDC calculation.
 */
export const FillRecordSchema = z.object({
  /**
   * Date of the fill (whenHandedOver from MedicationDispense).
   */
  fillDate: z.date(),

  /**
   * Days supply from the dispense.
   */
  daysSupply: z.number().positive(),
});

export type FillRecord = z.infer<typeof FillRecordSchema>;

// =============================================================================
// Measurement Period Schema
// =============================================================================

/**
 * The measurement period for PDC calculation.
 */
export const MeasurementPeriodSchema = z.object({
  /**
   * Start date (usually first fill date or Jan 1).
   */
  start: z.date(),

  /**
   * End date (usually Dec 31 of measurement year).
   */
  end: z.date(),
});

export type MeasurementPeriod = z.infer<typeof MeasurementPeriodSchema>;

// =============================================================================
// PDC Input Schema
// =============================================================================

/**
 * Input for PDC calculation derived from MedicationDispense resources.
 */
export const PDCInputSchema = z.object({
  /**
   * Array of fill records sorted by date.
   */
  fills: z.array(FillRecordSchema),

  /**
   * Measurement period (IPSD to year end).
   */
  measurementPeriod: MeasurementPeriodSchema,

  /**
   * Current date for projection calculations.
   */
  currentDate: z.date(),
});

export type PDCInput = z.infer<typeof PDCInputSchema>;

// =============================================================================
// Gap Days Result Schema
// =============================================================================

/**
 * Gap days calculation result.
 */
export const GapDaysResultSchema = z.object({
  /**
   * Gap days used = treatmentDays - coveredDays
   */
  gapDaysUsed: z.number().min(0),

  /**
   * Gap days allowed = floor(treatmentDays × 0.20)
   */
  gapDaysAllowed: z.number().min(0),

  /**
   * Gap days remaining = allowed - used (can be negative)
   */
  gapDaysRemaining: z.number(),
});

export type GapDaysResult = z.infer<typeof GapDaysResultSchema>;

// =============================================================================
// PDC Result Schema
// =============================================================================

/**
 * Complete PDC calculation result.
 * Contains all metrics needed for display and fragility tier calculation.
 */
export const PDCResultSchema = z.object({
  // -------------------------------------------------------------------------
  // Core PDC Metrics
  // -------------------------------------------------------------------------

  /**
   * PDC as percentage (0-100).
   * Formula: (coveredDays / treatmentDays) × 100
   */
  pdc: z.number().min(0).max(100),

  /**
   * Total days with medication coverage.
   * Each day counted at most once (HEDIS requirement).
   */
  coveredDays: z.number().min(0),

  /**
   * Total days in treatment period (IPSD to Dec 31).
   */
  treatmentDays: z.number().positive(),

  // -------------------------------------------------------------------------
  // Gap Days
  // -------------------------------------------------------------------------

  /**
   * Gap days used = treatmentDays - coveredDays
   */
  gapDaysUsed: z.number().min(0),

  /**
   * Gap days allowed = floor(treatmentDays × 0.20)
   */
  gapDaysAllowed: z.number().min(0),

  /**
   * Gap days remaining = allowed - used (can be negative)
   */
  gapDaysRemaining: z.number(),

  // -------------------------------------------------------------------------
  // Projections
  // -------------------------------------------------------------------------

  /**
   * PDC Status Quo projection as percentage.
   * Formula: (coveredDays + min(currentSupply, daysToYearEnd)) / treatmentDays × 100
   */
  pdcStatusQuo: z.number().min(0).max(100),

  /**
   * PDC Perfect projection as percentage.
   * Formula: (coveredDays + daysToYearEnd) / treatmentDays × 100
   */
  pdcPerfect: z.number().min(0).max(100),

  // -------------------------------------------------------------------------
  // Measurement Period
  // -------------------------------------------------------------------------

  /**
   * Start and end dates of measurement period.
   */
  measurementPeriod: MeasurementPeriodSchema,

  // -------------------------------------------------------------------------
  // Current State
  // -------------------------------------------------------------------------

  /**
   * Days until patient runs out of medication.
   * Negative values indicate already out.
   */
  daysUntilRunout: z.number(),

  /**
   * Days of supply remaining (current inventory).
   */
  currentSupply: z.number().min(0),

  /**
   * Number of refills needed to reach year end.
   */
  refillsNeeded: z.number().min(0),

  // -------------------------------------------------------------------------
  // Metadata
  // -------------------------------------------------------------------------

  /**
   * Date of most recent fill.
   */
  lastFillDate: z.date().nullable(),

  /**
   * Total number of fills in measurement period.
   */
  fillCount: z.number().min(0),

  /**
   * Days remaining until year end from current date.
   */
  daysToYearEnd: z.number().min(0),
});

export type PDCResult = z.infer<typeof PDCResultSchema>;

// =============================================================================
// Coverage Interval Schema (Internal)
// =============================================================================

/**
 * Internal type for interval merging algorithm.
 */
export const CoverageIntervalSchema = z.object({
  /**
   * Start date of coverage period.
   */
  start: z.date(),

  /**
   * End date of coverage period.
   */
  end: z.date(),
});

export type CoverageInterval = z.infer<typeof CoverageIntervalSchema>;

// =============================================================================
// PDC Calculation Error Types
// =============================================================================

/**
 * Error codes for PDC calculation failures.
 */
export enum PDCErrorCode {
  NO_FILLS = 'NO_FILLS',
  INVALID_DATES = 'INVALID_DATES',
  INVALID_MEASUREMENT_PERIOD = 'INVALID_MEASUREMENT_PERIOD',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
}

/**
 * PDC calculation error with code and message.
 */
export interface PDCError {
  code: PDCErrorCode;
  message: string;
}
