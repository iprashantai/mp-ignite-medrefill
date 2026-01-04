/**
 * PDC and Fragility Tier Constants
 *
 * All values derived from Golden Standard Test Cases (V3.0).
 *
 * @see docs/implementation/phase-1-core-engine/test-cases/golden-standard-tests.json
 * @see docs/implementation/phase-1-core-engine/specs/03_FRAGILITY_TIER_SPEC.md
 */

import type { FragilityTier } from '@/lib/fhir/types';

// =============================================================================
// PDC Thresholds
// =============================================================================

/**
 * PDC compliance thresholds per HEDIS guidelines.
 */
export const PDC_THRESHOLDS = {
  /** PDC >= 80% is considered passing/compliant */
  PASSING: 80,

  /** PDC 60-79% is considered at-risk */
  AT_RISK: 60,

  /** PDC < 60% is considered failing */
  FAILING: 0,
} as const;

/**
 * Target PDC percentage for compliance.
 */
export const PDC_TARGET = 80;

/**
 * Maximum gap percentage allowed (20% of treatment period).
 */
export const MAX_GAP_PERCENTAGE = 0.2;

/**
 * Gap days allowed as percentage of treatment period.
 * Alias for MAX_GAP_PERCENTAGE for compatibility.
 */
export const GAP_DAYS_ALLOWED_PERCENTAGE = 0.2;

/**
 * Default days supply when not specified on dispense.
 */
export const DEFAULT_DAYS_SUPPLY = 30;

// =============================================================================
// Fragility Tier Thresholds
// =============================================================================

/**
 * Fragility tier thresholds based on delay budget per refill.
 *
 * Delay Budget = Gap Days Remaining / Refills Remaining
 *
 * CRITICAL: Check COMPLIANT and T5 BEFORE checking F1-F5.
 *
 * @see golden-standard-tests.json goldenStandardConstants.tiers
 */
export const FRAGILITY_THRESHOLDS = {
  /** Special tiers (check first) */
  COMPLIANT: {
    check: 'PDC Status Quo ≥ 80%',
    priority: 1,
    tierLevel: 6,
  },
  T5_UNSALVAGEABLE: {
    check: 'PDC Perfect < 80% OR gapDaysRemaining < 0',
    priority: 2,
    tierLevel: 0,
  },

  /** Delay budget tiers */
  F1_IMMINENT: {
    delayBudgetMin: 0,
    delayBudgetMax: 2,
    contactWindow: '24 hours',
    action: 'Immediate outreach required',
    tierLevel: 1,
  },
  F2_FRAGILE: {
    delayBudgetMin: 3,
    delayBudgetMax: 5,
    contactWindow: '48 hours',
    action: 'Urgent outreach recommended',
    tierLevel: 2,
  },
  F3_MODERATE: {
    delayBudgetMin: 6,
    delayBudgetMax: 10,
    contactWindow: '1 week',
    action: 'Standard outreach',
    tierLevel: 3,
  },
  F4_COMFORTABLE: {
    delayBudgetMin: 11,
    delayBudgetMax: 20,
    contactWindow: '2 weeks',
    action: 'Monitor and schedule',
    tierLevel: 4,
  },
  F5_SAFE: {
    delayBudgetMin: 21,
    delayBudgetMax: Infinity,
    contactWindow: 'Monthly',
    action: 'Routine monitoring',
    tierLevel: 5,
  },
} as const;

// =============================================================================
// Priority Scoring
// =============================================================================

/**
 * Base priority scores by tier.
 *
 * Higher score = higher priority for outreach.
 *
 * @see golden-standard-tests.json goldenStandardConstants.priorityScores
 */
export const PRIORITY_BASE_SCORES: Record<FragilityTier, number> = {
  F1_IMMINENT: 100,
  F2_FRAGILE: 80,
  F3_MODERATE: 60,
  F4_COMFORTABLE: 40,
  F5_SAFE: 20,
  COMPLIANT: 0,
  T5_UNSALVAGEABLE: 0,
} as const;

/**
 * Priority bonus scores added when conditions are met.
 *
 * Maximum possible score: 100 (F1) + 30 + 25 + 15 + 10 = 180
 *
 * @see golden-standard-tests.json goldenStandardConstants.bonuses
 */
export const PRIORITY_BONUSES = {
  /** Added when daysToRunout <= 0 */
  OUT_OF_MEDICATION: 30,

  /** Added in Q4 (October, November, December) */
  Q4: 25,

  /** Added when patient has 2+ MA measure types */
  MULTIPLE_MA_MEASURES: 15,

  /** Added for new patients (first fill in program) */
  NEW_PATIENT: 10,
} as const;

/**
 * Maximum possible priority score.
 * F1 (100) + Out of Meds (30) + Q4 (25) + Multiple MA (15) + New Patient (10) = 180
 */
export const MAX_PRIORITY_SCORE = 180;

// =============================================================================
// Urgency Levels
// =============================================================================

/**
 * Urgency level thresholds based on priority score.
 *
 * @see golden-standard-tests.json goldenStandardConstants.urgencyLevels
 */
export const URGENCY_THRESHOLDS = {
  /** Priority >= 150 */
  EXTREME: 150,

  /** Priority >= 100 && < 150 */
  HIGH: 100,

  /** Priority >= 50 && < 100 */
  MODERATE: 50,

  /** Priority < 50 */
  LOW: 0,
} as const;

/**
 * Urgency levels ordered by severity.
 */
export const URGENCY_LEVELS = ['EXTREME', 'HIGH', 'MODERATE', 'LOW'] as const;

export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

// =============================================================================
// Q4 Tightening
// =============================================================================

/**
 * Q4 tightening rule thresholds.
 *
 * When BOTH conditions are met, promote tier by 1 level.
 *
 * @see golden-standard-tests.json Q4 Tightening Tests (Q4-01 to Q4-08)
 */
export const Q4_TIGHTENING = {
  /** Days to year end must be LESS THAN 60 (strict <, not <=) */
  DAYS_TO_YEAR_END_THRESHOLD: 60,

  /** Gap days remaining must be LESS THAN OR EQUAL to 5 */
  GAP_DAYS_THRESHOLD: 5,
} as const;

/**
 * Tier promotion map for Q4 tightening.
 *
 * Promotes each tier by 1 level (F5→F4, F4→F3, F3→F2, F2→F1).
 * COMPLIANT, T5_UNSALVAGEABLE, and F1_IMMINENT are NOT promoted.
 */
export const Q4_TIER_PROMOTION: Partial<Record<FragilityTier, FragilityTier>> = {
  F5_SAFE: 'F4_COMFORTABLE',
  F4_COMFORTABLE: 'F3_MODERATE',
  F3_MODERATE: 'F2_FRAGILE',
  F2_FRAGILE: 'F1_IMMINENT',
  // COMPLIANT - no promotion (already passing)
  // T5_UNSALVAGEABLE - no promotion (cannot recover)
  // F1_IMMINENT - no promotion (already most urgent)
} as const;

// =============================================================================
// Contact Windows
// =============================================================================

/**
 * Recommended contact window by tier.
 */
export const CONTACT_WINDOWS: Record<FragilityTier, string> = {
  F1_IMMINENT: '24 hours',
  F2_FRAGILE: '48 hours',
  F3_MODERATE: '1 week',
  F4_COMFORTABLE: '2 weeks',
  F5_SAFE: 'Monthly',
  COMPLIANT: 'Monitor only',
  T5_UNSALVAGEABLE: 'Special handling required',
} as const;

/**
 * Recommended action by tier.
 */
export const TIER_ACTIONS: Record<FragilityTier, string> = {
  F1_IMMINENT: 'Immediate outreach required',
  F2_FRAGILE: 'Urgent outreach recommended',
  F3_MODERATE: 'Standard outreach',
  F4_COMFORTABLE: 'Monitor and schedule',
  F5_SAFE: 'Routine monitoring',
  COMPLIANT: 'No action needed - monitor only',
  T5_UNSALVAGEABLE: 'Special handling - cannot reach 80%',
} as const;

// =============================================================================
// Tier Ordering
// =============================================================================

/**
 * Tier levels for comparison (lower = more urgent).
 * T5 is level 0 because it's a special "lost" state.
 */
export const TIER_LEVELS: Record<FragilityTier, number> = {
  T5_UNSALVAGEABLE: 0,
  F1_IMMINENT: 1,
  F2_FRAGILE: 2,
  F3_MODERATE: 3,
  F4_COMFORTABLE: 4,
  F5_SAFE: 5,
  COMPLIANT: 6,
} as const;

/**
 * Tiers ordered by urgency (most urgent first).
 */
export const TIERS_BY_URGENCY: FragilityTier[] = [
  'F1_IMMINENT',
  'F2_FRAGILE',
  'F3_MODERATE',
  'F4_COMFORTABLE',
  'F5_SAFE',
  'T5_UNSALVAGEABLE',
  'COMPLIANT',
];

/**
 * Delay budget thresholds for tier determination.
 * Used in determineTierFromDelayBudget().
 */
export const DELAY_BUDGET_THRESHOLDS = {
  F1_MAX: 2, // <= 2 → F1
  F2_MAX: 5, // > 2 && <= 5 → F2
  F3_MAX: 10, // > 5 && <= 10 → F3
  F4_MAX: 20, // > 10 && <= 20 → F4
  // > 20 → F5
} as const;

// =============================================================================
// Q4 Detection
// =============================================================================

/**
 * Q4 months (October = 9, November = 10, December = 11).
 * JavaScript Date.getMonth() is 0-indexed.
 */
export const Q4_MONTHS = [9, 10, 11] as const;

/**
 * Check if a date is in Q4 (October, November, December).
 */
export function isQ4(date: Date): boolean {
  const month = date.getMonth();
  return month >= 9; // 9 = October, 10 = November, 11 = December
}

/**
 * Calculate days remaining until year end from a given date.
 */
export function daysToYearEnd(date: Date): number {
  const yearEnd = new Date(date.getFullYear(), 11, 31); // Dec 31
  const diff = yearEnd.getTime() - date.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
