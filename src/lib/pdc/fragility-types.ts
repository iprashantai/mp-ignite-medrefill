/**
 * Fragility Tier Types
 *
 * Types and schemas for fragility tier calculation.
 *
 * @see docs/implementation/phase-1-core-engine/specs/03_FRAGILITY_TIER_SPEC.md
 * @see docs/implementation/phase-1-core-engine/test-cases/golden-standard-tests.json
 */

import { z } from 'zod';
import type { PDCResult } from './types';
import type { FragilityTier, MAMeasure } from '@/lib/fhir/types';

// =============================================================================
// Urgency Level
// =============================================================================

/**
 * Urgency levels for display and queue prioritization.
 */
export const UrgencyLevelSchema = z.enum(['EXTREME', 'HIGH', 'MODERATE', 'LOW']);

export type UrgencyLevel = z.infer<typeof UrgencyLevelSchema>;

// =============================================================================
// Fragility Input
// =============================================================================

/**
 * Input for fragility calculation.
 */
export interface FragilityInput {
  /**
   * PDC calculation result.
   */
  pdcResult: PDCResult;

  /**
   * Number of refills remaining on prescription.
   */
  refillsRemaining: number;

  /**
   * MA measure types this patient is enrolled in.
   */
  measureTypes: MAMeasure[];

  /**
   * Whether patient is new (first fill in last 90 days).
   */
  isNewPatient: boolean;

  /**
   * Current date for Q4 detection and other calculations.
   */
  currentDate: Date;
}

// =============================================================================
// Priority Bonus Breakdown
// =============================================================================

/**
 * Priority bonus breakdown.
 */
export interface PriorityBonuses {
  /**
   * Base score from tier.
   */
  base: number;

  /**
   * Bonus for being out of medication (+30).
   */
  outOfMeds: number;

  /**
   * Bonus for Q4 (October, November, December) (+25).
   */
  q4: number;

  /**
   * Bonus for multiple MA measures (+15).
   */
  multipleMA: number;

  /**
   * Bonus for being a new patient (+10).
   */
  newPatient: number;
}

// =============================================================================
// Status Flags
// =============================================================================

/**
 * Status flags for fragility result.
 */
export interface FragilityFlags {
  /**
   * Patient is already meeting 80% threshold.
   */
  isCompliant: boolean;

  /**
   * Patient cannot reach 80% even with perfect adherence.
   */
  isUnsalvageable: boolean;

  /**
   * Patient has run out of medication (daysToRunout <= 0).
   */
  isOutOfMeds: boolean;

  /**
   * Current date is in Q4 (October, November, December).
   */
  isQ4: boolean;

  /**
   * Patient has 2+ MA measure types.
   */
  isMultipleMA: boolean;

  /**
   * Patient is new (first fill in last 90 days).
   */
  isNewPatient: boolean;

  /**
   * Tier was promoted due to Q4 tightening rule.
   */
  q4Tightened: boolean;
}

// =============================================================================
// Fragility Result
// =============================================================================

/**
 * Complete fragility tier calculation result.
 */
export interface FragilityResult {
  // -------------------------------------------------------------------------
  // Core Tier Info
  // -------------------------------------------------------------------------

  /**
   * Assigned fragility tier.
   */
  tier: FragilityTier;

  /**
   * Tier level for sorting (0=T5, 1=F1, ..., 5=F5, 6=COMPLIANT).
   */
  tierLevel: number;

  /**
   * Delay budget per refill (gapDaysRemaining / refillsRemaining).
   */
  delayBudgetPerRefill: number;

  // -------------------------------------------------------------------------
  // Contact Information
  // -------------------------------------------------------------------------

  /**
   * Recommended contact window (e.g., "24 hours", "1 week").
   */
  contactWindow: string;

  /**
   * Recommended action for this tier.
   */
  action: string;

  // -------------------------------------------------------------------------
  // Priority Scoring
  // -------------------------------------------------------------------------

  /**
   * Total priority score (base + bonuses).
   */
  priorityScore: number;

  /**
   * Urgency level based on priority score.
   */
  urgencyLevel: UrgencyLevel;

  // -------------------------------------------------------------------------
  // Status Flags
  // -------------------------------------------------------------------------

  /**
   * Status flags for UI and filtering.
   */
  flags: FragilityFlags;

  // -------------------------------------------------------------------------
  // Bonus Breakdown
  // -------------------------------------------------------------------------

  /**
   * Breakdown of priority score bonuses.
   */
  bonuses: PriorityBonuses;
}

// =============================================================================
// Zod Schemas (for validation)
// =============================================================================

/**
 * Zod schema for FragilityInput validation.
 */
export const FragilityInputSchema = z.object({
  pdcResult: z.object({
    pdc: z.number(),
    coveredDays: z.number(),
    treatmentDays: z.number(),
    gapDaysUsed: z.number(),
    gapDaysAllowed: z.number(),
    gapDaysRemaining: z.number(),
    pdcStatusQuo: z.number(),
    pdcPerfect: z.number(),
    measurementPeriod: z.object({
      start: z.date(),
      end: z.date(),
    }),
    daysUntilRunout: z.number(),
    currentSupply: z.number(),
    refillsNeeded: z.number(),
    lastFillDate: z.date().nullable(),
    fillCount: z.number(),
    daysToYearEnd: z.number(),
  }),
  refillsRemaining: z.number().min(0),
  measureTypes: z.array(z.enum(['MAC', 'MAD', 'MAH'])),
  isNewPatient: z.boolean(),
  currentDate: z.date(),
});

/**
 * Zod schema for FragilityResult validation.
 */
export const FragilityResultSchema = z.object({
  tier: z.enum([
    'COMPLIANT',
    'F1_IMMINENT',
    'F2_FRAGILE',
    'F3_MODERATE',
    'F4_COMFORTABLE',
    'F5_SAFE',
    'T5_UNSALVAGEABLE',
  ]),
  tierLevel: z.number().min(0).max(6),
  delayBudgetPerRefill: z.number(),
  contactWindow: z.string(),
  action: z.string(),
  priorityScore: z.number().min(0),
  urgencyLevel: UrgencyLevelSchema,
  flags: z.object({
    isCompliant: z.boolean(),
    isUnsalvageable: z.boolean(),
    isOutOfMeds: z.boolean(),
    isQ4: z.boolean(),
    isMultipleMA: z.boolean(),
    isNewPatient: z.boolean(),
    q4Tightened: z.boolean(),
  }),
  bonuses: z.object({
    base: z.number(),
    outOfMeds: z.number(),
    q4: z.number(),
    multipleMA: z.number(),
    newPatient: z.number(),
  }),
});
