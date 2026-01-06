/**
 * FHIR Types and Extension Definitions
 *
 * This module defines all custom FHIR extension URLs and types for the
 * Ignite Health medication adherence platform.
 *
 * @see docs/implementation/phase-1-core-engine/specs/05_FHIR_EXTENSIONS_SPEC.md
 */

import { z } from 'zod';

// =============================================================================
// Result Pattern (Error Handling)
// =============================================================================

/**
 * Result type for operations that can fail.
 * Use this pattern for all functions that may return errors.
 *
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) return { success: false, error: 'Division by zero' };
 *   return { success: true, data: a / b };
 * }
 * ```
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Helper to create a success result
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Helper to create an error result
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// =============================================================================
// Extension URL Constants
// =============================================================================

/**
 * Base URL for all Ignite Health FHIR extensions.
 * CRITICAL: Use ignitehealth.io (not .com) per 05_FHIR_EXTENSIONS_SPEC.md
 */
export const EXTENSION_BASE_URL = 'https://ignitehealth.io/fhir/StructureDefinition';

/**
 * FHIR Extension URLs for Observation resources (PDC Metrics)
 */
export const OBSERVATION_EXTENSION_URLS = {
  /** Fragility tier classification (F1-F5, COMPLIANT, T5) */
  FRAGILITY_TIER: `${EXTENSION_BASE_URL}/fragility-tier`,

  /** Calculated priority score (0-155) */
  PRIORITY_SCORE: `${EXTENSION_BASE_URL}/priority-score`,

  /** Flag for current/latest PDC observation */
  IS_CURRENT_PDC: `${EXTENSION_BASE_URL}/is-current-pdc`,

  /** HEDIS MA measure type (MAC, MAD, MAH) */
  MA_MEASURE: `${EXTENSION_BASE_URL}/ma-measure`,

  /** Days until medication supply runs out */
  DAYS_UNTIL_RUNOUT: `${EXTENSION_BASE_URL}/days-until-runout`,

  /** Gap days remaining to reach 80% PDC */
  GAP_DAYS_REMAINING: `${EXTENSION_BASE_URL}/gap-days-remaining`,

  /** Days until patient must refill to maintain 80% PDC */
  DELAY_BUDGET: `${EXTENSION_BASE_URL}/delay-budget`,

  /** Measurement period for PDC calculation */
  TREATMENT_PERIOD: `${EXTENSION_BASE_URL}/treatment-period`,

  /** Whether tier was adjusted due to Q4 tightening */
  Q4_ADJUSTED: `${EXTENSION_BASE_URL}/q4-adjusted`,
} as const;

/**
 * FHIR Extension URLs for Patient resources (Denormalized State)
 */
export const PATIENT_EXTENSION_URLS = {
  /** Current worst fragility tier across all measures */
  CURRENT_FRAGILITY_TIER: `${EXTENSION_BASE_URL}/current-fragility-tier`,

  /** Current highest priority score across all measures */
  CURRENT_PRIORITY_SCORE: `${EXTENSION_BASE_URL}/current-priority-score`,

  /** Minimum days until runout across all medications */
  DAYS_UNTIL_EARLIEST_RUNOUT: `${EXTENSION_BASE_URL}/days-until-earliest-runout`,

  /** Summary of current PDC by measure */
  CURRENT_PDC_SUMMARY: `${EXTENSION_BASE_URL}/current-pdc-summary`,
} as const;

/**
 * FHIR Extension URLs for Task resources (Workflow)
 */
export const TASK_EXTENSION_URLS = {
  /** AI model confidence score (0.0-1.0) */
  AI_CONFIDENCE_SCORE: `${EXTENSION_BASE_URL}/ai-confidence-score`,

  /** Review type based on confidence */
  REVIEW_TYPE: `${EXTENSION_BASE_URL}/review-type`,
} as const;

/**
 * FHIR Extension URLs for Medication-Level Observation resources.
 * These are specific to individual medication PDC observations (not measure-level).
 *
 * NOTE: Medication observations also use OBSERVATION_EXTENSION_URLS for shared fields:
 * - FRAGILITY_TIER, PRIORITY_SCORE, IS_CURRENT_PDC, DAYS_UNTIL_RUNOUT,
 * - GAP_DAYS_REMAINING, DELAY_BUDGET, TREATMENT_PERIOD, Q4_ADJUSTED, MA_MEASURE
 */
export const MEDICATION_OBSERVATION_EXTENSION_URLS = {
  /** RxNorm code for the specific medication */
  MEDICATION_RXNORM: `${EXTENSION_BASE_URL}/medication-rxnorm`,

  /** Display name for the medication */
  MEDICATION_DISPLAY: `${EXTENSION_BASE_URL}/medication-display`,

  /** Reference to parent measure-level observation */
  PARENT_MEASURE_OBSERVATION: `${EXTENSION_BASE_URL}/parent-measure-observation`,

  /** Estimated days per refill (from dispense history average) */
  ESTIMATED_DAYS_PER_REFILL: `${EXTENSION_BASE_URL}/estimated-days-per-refill`,

  /** Calculated remaining refills needed for the year */
  REMAINING_REFILLS: `${EXTENSION_BASE_URL}/remaining-refills`,

  /** Current days of supply on hand */
  SUPPLY_ON_HAND: `${EXTENSION_BASE_URL}/supply-on-hand`,

  /** Coverage shortfall (daysToYearEnd - supplyOnHand) */
  COVERAGE_SHORTFALL: `${EXTENSION_BASE_URL}/coverage-shortfall`,
} as const;

/**
 * All extension URLs combined for convenience
 */
export const EXTENSION_URLS = {
  ...OBSERVATION_EXTENSION_URLS,
  ...PATIENT_EXTENSION_URLS,
  ...TASK_EXTENSION_URLS,
  ...MEDICATION_OBSERVATION_EXTENSION_URLS,
} as const;

// =============================================================================
// Code System URLs
// =============================================================================

export const CODE_SYSTEM_URLS = {
  /** Custom code system for adherence metrics */
  ADHERENCE_METRICS: 'https://ignitehealth.io/fhir/CodeSystem/adherence-metrics',

  /** Standard observation category */
  OBSERVATION_CATEGORY: 'http://terminology.hl7.org/CodeSystem/observation-category',
} as const;

// =============================================================================
// Zod Schemas (Runtime Validation)
// =============================================================================

/**
 * Fragility tier classification.
 * Order matters for tier comparison (lower index = more urgent).
 */
export const FragilityTierSchema = z.enum([
  'COMPLIANT', // PDC >= 80%, no intervention needed
  'F1_IMMINENT', // 0-2 days buffer, URGENT
  'F2_FRAGILE', // 3-5 days buffer
  'F3_MODERATE', // 6-10 days buffer
  'F4_COMFORTABLE', // 11-20 days buffer
  'F5_SAFE', // 21+ days buffer
  'T5_UNSALVAGEABLE', // Cannot recover to 80% this year
]);

export type FragilityTier = z.infer<typeof FragilityTierSchema>;

/**
 * All valid tiers (excluding COMPLIANT for non-compliant patients)
 */
export const NON_COMPLIANT_TIERS = [
  'F1_IMMINENT',
  'F2_FRAGILE',
  'F3_MODERATE',
  'F4_COMFORTABLE',
  'F5_SAFE',
  'T5_UNSALVAGEABLE',
] as const;

/**
 * Urgent tiers that need immediate attention
 */
export const URGENT_TIERS = ['F1_IMMINENT', 'F2_FRAGILE'] as const;

/**
 * HEDIS MA measure types
 */
export const MAMeasureSchema = z.enum(['MAC', 'MAD', 'MAH']);

export type MAMeasure = z.infer<typeof MAMeasureSchema>;

/**
 * MA Measure display names
 */
export const MA_MEASURE_DISPLAY: Record<MAMeasure, string> = {
  MAC: 'Medication Adherence for Cholesterol',
  MAD: 'Medication Adherence for Diabetes',
  MAH: 'Medication Adherence for Hypertension',
};

/**
 * AI review type based on confidence score
 */
export const ReviewTypeSchema = z.enum([
  'auto-approved',
  'standard-review',
  'enhanced-review',
  'pharmacist-escalation',
]);

export type ReviewType = z.infer<typeof ReviewTypeSchema>;

/**
 * Treatment period (date range)
 */
export const TreatmentPeriodSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

export type TreatmentPeriod = z.infer<typeof TreatmentPeriodSchema>;

/**
 * PDC Observation extension values (what we store in FHIR)
 */
export const PDCObservationExtensionsSchema = z.object({
  fragilityTier: FragilityTierSchema,
  priorityScore: z.number().int().min(0).max(155),
  isCurrentPDC: z.boolean(),
  maMeasure: MAMeasureSchema,
  daysUntilRunout: z.number().int().min(-365).max(365),
  gapDaysRemaining: z.number().int().min(0).max(365),
  delayBudget: z.number().int().min(0).max(365),
  treatmentPeriod: TreatmentPeriodSchema,
  q4Adjusted: z.boolean(),
});

export type PDCObservationExtensions = z.infer<typeof PDCObservationExtensionsSchema>;

/**
 * Patient extension values (denormalized current state)
 */
export const PatientExtensionsSchema = z.object({
  currentFragilityTier: FragilityTierSchema,
  currentPriorityScore: z.number().int().min(0).max(155),
  daysUntilEarliestRunout: z.number().int().min(-365).max(365),
  currentPDCSummary: z.object({
    mac: z.number().min(0).max(1).nullable(),
    mad: z.number().min(0).max(1).nullable(),
    mah: z.number().min(0).max(1).nullable(),
    lastUpdated: z.string().datetime(),
  }),
});

export type PatientExtensions = z.infer<typeof PatientExtensionsSchema>;

/**
 * FHIR Extension structure (generic)
 */
export const FHIRExtensionSchema: z.ZodType<{
  url: string;
  valueCode?: string;
  valueInteger?: number;
  valueDecimal?: number;
  valueBoolean?: boolean;
  valueString?: string;
  valueDateTime?: string;
  valuePeriod?: TreatmentPeriod;
  extension?: FHIRExtension[];
}> = z.object({
  url: z.string().url(),
  valueCode: z.string().optional(),
  valueInteger: z.number().int().optional(),
  valueDecimal: z.number().optional(),
  valueBoolean: z.boolean().optional(),
  valueString: z.string().optional(),
  valueDateTime: z.string().optional(),
  valuePeriod: TreatmentPeriodSchema.optional(),
  extension: z.array(z.lazy(() => FHIRExtensionSchema)).optional(),
});

export type FHIRExtension = z.infer<typeof FHIRExtensionSchema>;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a value is a valid FragilityTier
 */
export function isFragilityTier(value: unknown): value is FragilityTier {
  return FragilityTierSchema.safeParse(value).success;
}

/**
 * Check if a value is a valid MAMeasure
 */
export function isMAMeasure(value: unknown): value is MAMeasure {
  return MAMeasureSchema.safeParse(value).success;
}

/**
 * Check if a value is a valid ReviewType
 */
export function isReviewType(value: unknown): value is ReviewType {
  return ReviewTypeSchema.safeParse(value).success;
}
