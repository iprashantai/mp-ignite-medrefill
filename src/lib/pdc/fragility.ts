/**
 * Fragility Tier Calculator
 *
 * Calculates patient fragility tier, priority score, and urgency level.
 * Business logic ported EXACTLY from legacy/src/services/fragilityTierService.js (V3.0).
 *
 * @see docs/implementation/phase-1-core-engine/specs/03_FRAGILITY_TIER_SPEC.md
 * @see docs/implementation/phase-1-core-engine/test-cases/golden-standard-tests.json
 */

import type { FragilityTier, MAMeasure } from '@/lib/fhir/types';
import type {
  FragilityInput,
  FragilityResult,
  UrgencyLevel,
  PriorityBonuses,
} from './fragility-types';
import {
  PRIORITY_BASE_SCORES,
  PRIORITY_BONUSES,
  URGENCY_THRESHOLDS,
  CONTACT_WINDOWS,
  TIER_ACTIONS,
  TIER_LEVELS,
  Q4_TIGHTENING,
  Q4_TIER_PROMOTION,
  isQ4,
} from './constants';

// =============================================================================
// Delay Budget Calculation
// =============================================================================

/**
 * Calculate delay budget per refill.
 *
 * Formula (Golden Standard):
 * Delay Budget = Gap Days Remaining / Refills Remaining
 *
 * This is what determines F1-F5 tier, NOT raw gap days.
 *
 * @param gapDaysRemaining - Gap days remaining (can be negative)
 * @param refillsRemaining - Refills left on prescription
 * @returns Delay budget in days per refill
 *
 * @see TC-GS-009: Delay Budget formula
 */
export function calculateDelayBudget(gapDaysRemaining: number, refillsRemaining: number): number {
  // Handle edge cases
  if (refillsRemaining <= 0) {
    // With no refills, if there's any positive gap remaining, patient is safe
    // If negative or zero gap, they're at risk but can't do anything
    return Infinity;
  }

  return gapDaysRemaining / refillsRemaining;
}

// =============================================================================
// Tier Determination from Delay Budget
// =============================================================================

/**
 * Map delay budget to F1-F5 tier.
 *
 * FROM: legacy/fragilityTierService.js lines 217-257
 *
 * Thresholds (EXACT from legacy):
 * - F1: <= 2 days/refill
 * - F2: > 2 && <= 5 days/refill
 * - F3: > 5 && <= 10 days/refill
 * - F4: > 10 && <= 20 days/refill
 * - F5: > 20 days/refill
 *
 * @param delayBudget - Days per refill delay budget
 * @returns F1-F5 tier
 */
export function determineTierFromDelayBudget(delayBudget: number): FragilityTier {
  if (delayBudget <= 2) return 'F1_IMMINENT';
  if (delayBudget <= 5) return 'F2_FRAGILE';
  if (delayBudget <= 10) return 'F3_MODERATE';
  if (delayBudget <= 20) return 'F4_COMFORTABLE';
  return 'F5_SAFE';
}

// =============================================================================
// Priority Score Calculation
// =============================================================================

/**
 * Calculate priority score with bonuses.
 *
 * Formula:
 * Priority = Base Score (from tier) + Applicable Bonuses
 *
 * Bonuses:
 * - Out of Medication: +30 (daysToRunout <= 0)
 * - Q4: +25 (Oct/Nov/Dec)
 * - Multiple MA Measures: +15 (2+ measure types)
 * - New Patient: +10 (first fill in last 90 days)
 *
 * @param tier - Fragility tier
 * @param context - Context for bonus calculation
 * @returns Priority score and bonus breakdown
 */
export function calculatePriorityScore(
  tier: FragilityTier,
  context: {
    daysToRunout: number;
    currentDate: Date;
    measureTypes: MAMeasure[];
    isNewPatient: boolean;
  }
): {
  priorityScore: number;
  bonuses: PriorityBonuses;
} {
  const base = PRIORITY_BASE_SCORES[tier];

  const outOfMeds = context.daysToRunout <= 0 ? PRIORITY_BONUSES.OUT_OF_MEDICATION : 0;
  const q4 = isQ4(context.currentDate) ? PRIORITY_BONUSES.Q4 : 0;
  const multipleMA = context.measureTypes.length >= 2 ? PRIORITY_BONUSES.MULTIPLE_MA_MEASURES : 0;
  const newPatient = context.isNewPatient ? PRIORITY_BONUSES.NEW_PATIENT : 0;

  return {
    priorityScore: base + outOfMeds + q4 + multipleMA + newPatient,
    bonuses: {
      base,
      outOfMeds,
      q4,
      multipleMA,
      newPatient,
    },
  };
}

// =============================================================================
// Urgency Level Determination
// =============================================================================

/**
 * Determine urgency level from priority score.
 *
 * Thresholds:
 * - EXTREME: >= 150
 * - HIGH: >= 100
 * - MODERATE: >= 50
 * - LOW: < 50
 *
 * @param priorityScore - Calculated priority score
 * @returns Urgency level
 */
export function determineUrgencyLevel(priorityScore: number): UrgencyLevel {
  if (priorityScore >= URGENCY_THRESHOLDS.EXTREME) return 'EXTREME';
  if (priorityScore >= URGENCY_THRESHOLDS.HIGH) return 'HIGH';
  if (priorityScore >= URGENCY_THRESHOLDS.MODERATE) return 'MODERATE';
  return 'LOW';
}

// =============================================================================
// Q4 Tightening
// =============================================================================

/**
 * Apply Q4 tightening logic (promote tier if year-end critical).
 *
 * FROM: legacy/fragilityTierService.js lines 293-356
 *
 * CRITICAL RULE:
 * - Only applies when daysToYearEnd < 60 AND gapDaysRemaining <= 5
 * - Promotes tier by 1 level (F5→F4, F4→F3, F3→F2, F2→F1)
 * - Does NOT affect COMPLIANT, T5_UNSALVAGEABLE, or F1_IMMINENT
 *
 * @param tier - Base tier
 * @param daysToYearEnd - Days until Dec 31
 * @param gapDaysRemaining - Gap days remaining in 20% budget
 * @returns Potentially promoted tier with q4Tightened flag
 */
export function applyQ4Tightening(
  tier: FragilityTier,
  daysToYearEnd: number,
  gapDaysRemaining: number
): { tier: FragilityTier; q4Tightened: boolean } {
  // Cannot promote COMPLIANT, UNSALVAGEABLE, or already F1
  if (tier === 'COMPLIANT' || tier === 'T5_UNSALVAGEABLE' || tier === 'F1_IMMINENT') {
    return { tier, q4Tightened: false };
  }

  // Q4 tightening rule: <60 days AND ≤5 gap days
  const isQ4Critical =
    daysToYearEnd < Q4_TIGHTENING.DAYS_TO_YEAR_END_THRESHOLD &&
    gapDaysRemaining <= Q4_TIGHTENING.GAP_DAYS_THRESHOLD;

  if (!isQ4Critical) {
    return { tier, q4Tightened: false };
  }

  // Get promotion target
  const promotedTier = Q4_TIER_PROMOTION[tier];

  if (!promotedTier) {
    return { tier, q4Tightened: false };
  }

  // Return promoted tier
  return {
    tier: promotedTier,
    q4Tightened: true,
  };
}

// =============================================================================
// Main Fragility Calculation
// =============================================================================

/**
 * Calculate fragility tier and priority score.
 *
 * CRITICAL: Tier evaluation order:
 * 1. Check if COMPLIANT (PDC Status Quo >= 80%)
 * 2. Check if T5_UNSALVAGEABLE (PDC Perfect < 80%)
 * 3. Calculate delay budget and assign F1-F5
 * 4. Apply Q4 tightening if applicable
 *
 * @param input - PDC result and context for calculation
 * @returns Complete fragility result with tier, priority, and flags
 */
export function calculateFragility(input: FragilityInput): FragilityResult {
  const { pdcResult, refillsRemaining, measureTypes, isNewPatient, currentDate } = input;

  // -------------------------------------------------------------------------
  // Step 1: Check COMPLIANT first (PDC Status Quo >= 80%)
  // -------------------------------------------------------------------------
  if (pdcResult.pdcStatusQuo >= 80) {
    const { priorityScore, bonuses } = calculatePriorityScore('COMPLIANT', {
      daysToRunout: pdcResult.daysUntilRunout,
      currentDate,
      measureTypes,
      isNewPatient,
    });

    return {
      tier: 'COMPLIANT',
      tierLevel: TIER_LEVELS.COMPLIANT,
      delayBudgetPerRefill: calculateDelayBudget(pdcResult.gapDaysRemaining, refillsRemaining),
      contactWindow: CONTACT_WINDOWS.COMPLIANT,
      action: TIER_ACTIONS.COMPLIANT,
      priorityScore,
      urgencyLevel: determineUrgencyLevel(priorityScore),
      flags: {
        isCompliant: true,
        isUnsalvageable: false,
        isOutOfMeds: pdcResult.daysUntilRunout <= 0,
        isQ4: isQ4(currentDate),
        isMultipleMA: measureTypes.length >= 2,
        isNewPatient,
        q4Tightened: false,
      },
      bonuses,
    };
  }

  // -------------------------------------------------------------------------
  // Step 2: Check T5_UNSALVAGEABLE (PDC Perfect < 80%)
  // -------------------------------------------------------------------------
  if (pdcResult.pdcPerfect < 80) {
    const { priorityScore, bonuses } = calculatePriorityScore('T5_UNSALVAGEABLE', {
      daysToRunout: pdcResult.daysUntilRunout,
      currentDate,
      measureTypes,
      isNewPatient,
    });

    return {
      tier: 'T5_UNSALVAGEABLE',
      tierLevel: TIER_LEVELS.T5_UNSALVAGEABLE,
      delayBudgetPerRefill: calculateDelayBudget(pdcResult.gapDaysRemaining, refillsRemaining),
      contactWindow: CONTACT_WINDOWS.T5_UNSALVAGEABLE,
      action: TIER_ACTIONS.T5_UNSALVAGEABLE,
      priorityScore,
      urgencyLevel: determineUrgencyLevel(priorityScore),
      flags: {
        isCompliant: false,
        isUnsalvageable: true,
        isOutOfMeds: pdcResult.daysUntilRunout <= 0,
        isQ4: isQ4(currentDate),
        isMultipleMA: measureTypes.length >= 2,
        isNewPatient,
        q4Tightened: false,
      },
      bonuses,
    };
  }

  // -------------------------------------------------------------------------
  // Step 3: Calculate delay budget and determine F1-F5
  // -------------------------------------------------------------------------
  const delayBudget = calculateDelayBudget(pdcResult.gapDaysRemaining, refillsRemaining);
  const baseTier = determineTierFromDelayBudget(delayBudget);

  // -------------------------------------------------------------------------
  // Step 4: Apply Q4 tightening if applicable
  // -------------------------------------------------------------------------
  const { tier: finalTier, q4Tightened } = applyQ4Tightening(
    baseTier,
    pdcResult.daysToYearEnd,
    pdcResult.gapDaysRemaining
  );

  // -------------------------------------------------------------------------
  // Step 5: Calculate priority score for final tier
  // -------------------------------------------------------------------------
  const { priorityScore, bonuses } = calculatePriorityScore(finalTier, {
    daysToRunout: pdcResult.daysUntilRunout,
    currentDate,
    measureTypes,
    isNewPatient,
  });

  return {
    tier: finalTier,
    tierLevel: TIER_LEVELS[finalTier],
    delayBudgetPerRefill: delayBudget,
    contactWindow: CONTACT_WINDOWS[finalTier],
    action: TIER_ACTIONS[finalTier],
    priorityScore,
    urgencyLevel: determineUrgencyLevel(priorityScore),
    flags: {
      isCompliant: false,
      isUnsalvageable: false,
      isOutOfMeds: pdcResult.daysUntilRunout <= 0,
      isQ4: isQ4(currentDate),
      isMultipleMA: measureTypes.length >= 2,
      isNewPatient,
      q4Tightened,
    },
    bonuses,
  };
}
