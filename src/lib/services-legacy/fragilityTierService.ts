/**
 * ============================================================================
 * 🔒 SINGLE SOURCE OF TRUTH - FRAGILITY TIER CALCULATIONS 🔒
 * ============================================================================
 *
 * Fragility Tier Service - V3.0 Core System
 *
 * ⚠️  THIS IS THE ONLY FILE THAT SHOULD CONTAIN TIER CALCULATION LOGIC  ⚠️
 *
 * DO NOT create inline tier calculations in:
 * - AllPatientsCRM.jsx
 * - RefillWorklistPage.jsx
 * - Any other component or page
 *
 * ALWAYS import and use functions from this file:
 * - calculateFragilityTier()
 * - calculatePriorityScore()
 * - getFragilityColor()
 *
 * Golden Standard Reference: src/pages/MetricsReference.jsx
 * QA Checklist: docs/GOLDEN_STANDARD_IMPLEMENTATION_CHECKLIST.md
 *
 * ============================================================================
 *
 * Assigns fragility tiers based on PDC projections and delay budget.
 * This is the CORE of the V3.0 medication adherence system.
 *
 * TIER SYSTEM (7 tiers):
 * - COMPLIANT:        PDC Status Quo ≥80% (No action needed)
 * - F1 IMMINENT:      ≤2 days/refill  (Contact within 24 hours)
 * - F2 FRAGILE:       3-5 days/refill (Contact within 48 hours)
 * - F3 MODERATE:      6-10 days/refill (Contact within 1 week)
 * - F4 COMFORTABLE:   11-20 days/refill (Monitor, light touch)
 * - F5 SAFE:          >20 days/refill (Automated only)
 * - T5 UNSALVAGEABLE: PDC Perfect <80% (Cannot reach goal)
 *
 * KEY CONCEPTS:
 * - PDC Status Quo = (Days Covered + min(Supply On Hand, Days To Year-End)) / Treatment Days
 *   → What their PDC will be if they stop refilling today
 *
 * - PDC Perfect = (Days Covered + Days To Year-End) / Treatment Days
 *   → Best possible PDC with perfect adherence from today
 *
 * @module fragilityTierService
 */

/* eslint-disable @typescript-eslint/no-unused-vars, max-lines-per-function, complexity, import/no-anonymous-default-export */

import { differenceInDays, parseISO } from 'date-fns';

/**
 * Calculate fragility tier based on PDC projections
 *
 * @param {Object} params - Tier calculation parameters
 * @param {number} params.daysAlreadyCovered - Days with medication coverage from start to today
 * @param {number} params.daysOfSupplyOnHand - Days of medication patient currently has
 * @param {number} params.daysRemainingUntilYearEnd - Days from today to Dec 31
 * @param {number} params.treatmentDays - Total treatment period (enrollment days)
 * @param {number} params.gapDaysRemaining - Gap days remaining in 20% budget
 * @param {number} params.remainingRefills - Refills needed to reach year-end
 * @param {boolean} [params.isCurrentlyOutOfMeds=false] - Out of meds flag
 * @returns {Object} Fragility tier assignment
 *
 * @example
 * // Compliant patient (can coast to year-end)
 * const tier = calculateFragilityTier({
 *   daysAlreadyCovered: 310,
 *   daysOfSupplyOnHand: 60,
 *   daysRemainingUntilYearEnd: 30,
 *   treatmentDays: 365,
 *   gapDaysRemaining: 25,
 *   remainingRefills: 0
 * });
 * // Returns:
 * {
 *   tier: 'COMPLIANT',
 *   pdcStatusQuo: '101.4',
 *   pdcPerfect: '93.2',
 *   interpretation: 'COMPLIANT - Current supply ensures ≥80% PDC'
 * }
 *
 * @example
 * // Critically fragile patient
 * const tier = calculateFragilityTier({
 *   daysAlreadyCovered: 284,
 *   daysOfSupplyOnHand: 5,
 *   daysRemainingUntilYearEnd: 46,
 *   treatmentDays: 365,
 *   gapDaysRemaining: 3,
 *   remainingRefills: 3
 * });
 * // Returns:
 * {
 *   tier: 'F1_IMMINENT',
 *   delayBudgetPerRefill: '1.0',
 *   pdcStatusQuo: '79.2',
 *   pdcPerfect: '90.4',
 *   interpretation: 'CRITICAL - ≤2 days delay tolerance per refill'
 * }
 *
 * @example
 * // Unsalvageable patient
 * const tier = calculateFragilityTier({
 *   daysAlreadyCovered: 250,
 *   daysOfSupplyOnHand: 5,
 *   daysRemainingUntilYearEnd: 40,
 *   treatmentDays: 365,
 *   gapDaysRemaining: -5,
 *   remainingRefills: 2
 * });
 * // Returns:
 * {
 *   tier: 'T5_UNSALVAGEABLE',
 *   pdcStatusQuo: '69.9',
 *   pdcPerfect: '79.5',
 *   interpretation: 'UNSALVAGEABLE - Mathematically impossible to reach 80%'
 * }
 */
export const calculateFragilityTier = ({
  daysAlreadyCovered,
  daysOfSupplyOnHand,
  daysRemainingUntilYearEnd,
  treatmentDays,
  gapDaysRemaining,
  remainingRefills,
  isCurrentlyOutOfMeds = false,
}) => {
  // ============================================================================
  // STEP 1: CALCULATE PDC PROJECTIONS
  // ============================================================================

  // PDC Status Quo = What if they stop refilling now?
  // Can't count supply beyond year-end!
  const daysFromCurrentSupply = Math.min(daysOfSupplyOnHand, daysRemainingUntilYearEnd);
  const pdcStatusQuo = ((daysAlreadyCovered + daysFromCurrentSupply) / treatmentDays) * 100;

  // PDC Perfect = What if they refill perfectly from now?
  const pdcPerfect = ((daysAlreadyCovered + daysRemainingUntilYearEnd) / treatmentDays) * 100;

  // ============================================================================
  // STEP 2: CHECK IF COMPLIANT (No action needed)
  // ============================================================================
  if (pdcStatusQuo >= 80) {
    const flags = ['COMPLIANT', 'NO_ACTION_REQUIRED'];
    if (daysOfSupplyOnHand > daysRemainingUntilYearEnd) {
      flags.push('STOCKPILED_BEYOND_YEAR_END');
    }

    return {
      tier: 'COMPLIANT',
      tierLevel: 6,
      color: '🟢',
      action: 'No action required - already compliant',
      contactWindow: 'None',
      pdcStatusQuo: pdcStatusQuo.toFixed(1),
      pdcPerfect: pdcPerfect.toFixed(1),
      daysOfSupplyOnHand,
      daysRemainingUntilYearEnd,
      interpretation: 'COMPLIANT - Current supply ensures ≥80% PDC',
      flags,
    };
  }

  // ============================================================================
  // STEP 3: CHECK IF UNSALVAGEABLE (Cannot reach 80%)
  // ============================================================================
  if (pdcPerfect < 80 || gapDaysRemaining < 0) {
    const flags = ['UNSALVAGEABLE', 'CANNOT_REACH_80'];
    if (isCurrentlyOutOfMeds) {
      flags.push('OUT_OF_MEDS');
    }
    if (gapDaysRemaining < 0) {
      flags.push('NEGATIVE_GAP_DAYS');
    }

    return {
      tier: 'T5_UNSALVAGEABLE',
      tierLevel: 0,
      color: '⚫',
      action: 'Cannot reach 80% - even with perfect adherence',
      contactWindow: 'N/A',
      pdcStatusQuo: pdcStatusQuo.toFixed(1),
      pdcPerfect: pdcPerfect.toFixed(1),
      delayBudgetPerRefill: 0,
      interpretation: 'UNSALVAGEABLE - Mathematically impossible to reach 80%',
      flags,
    };
  }

  // ============================================================================
  // STEP 4: PATIENT IS SALVAGEABLE - ASSIGN F1-F5 TIER
  // ============================================================================
  // They're between status quo and perfect (need intervention but can reach 80%)

  // Edge case: No refills needed but not yet compliant
  if (remainingRefills === 0) {
    return {
      tier: 'F5_SAFE',
      tierLevel: 5,
      color: '🟢',
      action: 'Monitor - no refills needed',
      contactWindow: 'Monthly',
      pdcStatusQuo: pdcStatusQuo.toFixed(1),
      pdcPerfect: pdcPerfect.toFixed(1),
      delayBudgetPerRefill: Infinity,
      interpretation: 'SAFE - Adequate supply for remaining period',
      flags: ['ADEQUATE_COVERAGE', 'NO_REFILLS_NEEDED'],
    };
  }

  // Calculate delay budget
  const delayBudget = gapDaysRemaining / remainingRefills;

  // Assign tier based on delay budget thresholds
  let tier, tierLevel, color, action, contactWindow, interpretation;
  const flags = [];

  if (delayBudget <= 2) {
    tier = 'F1_IMMINENT';
    tierLevel = 1;
    color = '🔴';
    action = 'Contact within 24 hours';
    contactWindow = '24 hours';
    interpretation = 'CRITICAL - ≤2 days delay tolerance per refill';
    flags.push('CRITICAL', 'IMMINENT_RISK');
  } else if (delayBudget <= 5) {
    tier = 'F2_FRAGILE';
    tierLevel = 2;
    color = '🟠';
    action = 'Contact within 48 hours';
    contactWindow = '48 hours';
    interpretation = 'HIGH RISK - 3-5 days delay tolerance per refill';
    flags.push('HIGH_RISK', 'FRAGILE');
  } else if (delayBudget <= 10) {
    tier = 'F3_MODERATE';
    tierLevel = 3;
    color = '🟡';
    action = 'Contact within 1 week';
    contactWindow = '1 week';
    interpretation = 'MODERATE RISK - 6-10 days delay tolerance per refill';
    flags.push('MODERATE_RISK');
  } else if (delayBudget <= 20) {
    tier = 'F4_COMFORTABLE';
    tierLevel = 4;
    color = '🔵';
    action = 'Monitor, light touch';
    contactWindow = '2 weeks';
    interpretation = 'LOW RISK - 11-20 days delay tolerance per refill';
    flags.push('LOW_RISK', 'COMFORTABLE');
  } else {
    tier = 'F5_SAFE';
    tierLevel = 5;
    color = '🟢';
    action = 'Automated monitoring';
    contactWindow = 'Monthly';
    interpretation = 'MINIMAL RISK - >20 days delay tolerance per refill';
    flags.push('SAFE', 'LARGE_BUFFER');
  }

  // Add additional flags
  if (isCurrentlyOutOfMeds) {
    flags.push('OUT_OF_MEDS');
  }
  if (gapDaysRemaining <= 5) {
    flags.push('CRITICAL_GAP_DAYS');
  }

  return {
    tier,
    tierLevel,
    color,
    action,
    contactWindow,
    delayBudgetPerRefill: delayBudget.toFixed(1),
    pdcStatusQuo: pdcStatusQuo.toFixed(1),
    pdcPerfect: pdcPerfect.toFixed(1),
    interpretation,
    flags,
  };
};

/**
 * Apply Q4 tightening logic (promote tier if <60 days to year-end AND ≤5 gap days)
 *
 * @param {Object} fragilityTier - Tier from calculateFragilityTier
 * @param {number} daysToYearEnd - Days until measurement year end
 * @param {number} gapDaysRemaining - Gap days remaining
 * @returns {Object} Potentially promoted tier
 *
 * @example
 * const tightened = applyQ4Tightening(tier, 45, 3);
 * // Promotes F2→F1, F3→F2, etc. due to year-end urgency
 */
export const applyQ4Tightening = (fragilityTier, daysToYearEnd, gapDaysRemaining) => {
  // Can't promote COMPLIANT, UNSALVAGEABLE, or already F1
  if (
    fragilityTier.tier === 'COMPLIANT' ||
    fragilityTier.tier === 'T5_UNSALVAGEABLE' ||
    fragilityTier.tier === 'F1_IMMINENT'
  ) {
    return fragilityTier;
  }

  // Q4 tightening rule: <60 days to year-end AND ≤5 gap days
  const isQ4Critical = daysToYearEnd < 60 && gapDaysRemaining <= 5;

  if (!isQ4Critical) {
    return fragilityTier;
  }

  // Promotion map
  const tierPromotions = {
    F5_SAFE: {
      tier: 'F4_COMFORTABLE',
      tierLevel: 4,
      color: '🔵',
      action: 'Monitor, light touch',
      contactWindow: '2 weeks',
      interpretation: 'LOW RISK - 11-20 days delay tolerance per refill',
    },
    F4_COMFORTABLE: {
      tier: 'F3_MODERATE',
      tierLevel: 3,
      color: '🟡',
      action: 'Contact within 1 week',
      contactWindow: '1 week',
      interpretation: 'MODERATE RISK - 6-10 days delay tolerance per refill',
    },
    F3_MODERATE: {
      tier: 'F2_FRAGILE',
      tierLevel: 2,
      color: '🟠',
      action: 'Contact within 48 hours',
      contactWindow: '48 hours',
      interpretation: 'HIGH RISK - 3-5 days delay tolerance per refill',
    },
    F2_FRAGILE: {
      tier: 'F1_IMMINENT',
      tierLevel: 1,
      color: '🔴',
      action: 'Contact within 24 hours',
      contactWindow: '24 hours',
      interpretation: 'CRITICAL - ≤2 days delay tolerance per refill',
    },
  };

  const promotion = tierPromotions[fragilityTier.tier];

  if (!promotion) {
    return fragilityTier; // No promotion rule for this tier
  }

  return {
    ...fragilityTier,
    ...promotion,
    q4Tightened: true,
    flags: [...(fragilityTier.flags || []), 'Q4_TIGHTENED'],
  };
};

/**
 * Calculate priority score for 14-day refill queue
 *
 * ============================================================================
 * 🏆 GOLDEN STANDARD - Priority Scoring (MetricsReference.jsx lines 1886-1889)
 * ============================================================================
 *
 * BASE SCORES BY TIER:
 * - F1 (Critical):    100 pts
 * - F2 (Fragile):      80 pts
 * - F3 (Moderate):     60 pts
 * - F4 (Comfortable):  40 pts
 * - F5 (Safe):         20 pts
 * - COMPLIANT:          0 pts (no priority needed)
 * - T5_UNSALVAGEABLE:   0 pts (cannot be saved)
 *
 * BONUS POINTS (per Golden Standard):
 * - Out of Medication:     +30 pts
 * - Q4 (Oct-Dec):          +25 pts
 * - Multiple MA Measures:  +15 pts
 * - New Patient:           +10 pts
 *
 * URGENCY INDEX:
 * - Extreme: 150+ pts
 * - High: 100-149 pts
 * - Moderate: 50-99 pts
 * - Low: <50 pts
 *
 * @param {Object} params - Priority scoring parameters
 * @param {Object} params.fragilityTier - Tier from calculateFragilityTier
 * @param {number} params.daysToRunout - Days until patient runs out of meds
 * @param {number} params.measureCount - Number of MAC/MAD/MAH measures (1-3)
 * @param {boolean} params.isCurrentlyOutOfMeds - Out of meds flag
 * @param {boolean} [params.isQ4=false] - Is it Q4 (Oct-Dec)?
 * @param {boolean} [params.isNewPatient=false] - Is this a new patient?
 * @returns {Object} Priority score breakdown
 *
 * @example
 * const priority = calculatePriorityScore({
 *   fragilityTier: { tier: 'F1_IMMINENT', tierLevel: 1 },
 *   daysToRunout: 0,
 *   measureCount: 2,
 *   isCurrentlyOutOfMeds: true,
 *   isQ4: true
 * });
 * // Returns:
 * {
 *   priorityScore: 155,
 *   baseScore: 100,
 *   outOfMedsBonus: 30,
 *   q4Bonus: 25,
 *   multiMeasureBonus: 0,  // Only applies for 2+ measures
 *   newPatientBonus: 0,
 *   urgencyLevel: 'extreme',
 *   breakdown: '100 (F1) + 30 (Out of Meds) + 25 (Q4) = 155 → Extreme urgency'
 * }
 */
export const calculatePriorityScore = ({
  fragilityTier,
  daysToRunout,
  measureCount = 1,
  isCurrentlyOutOfMeds = false,
  isQ4 = null, // If null, auto-detect based on current date
  isNewPatient = false,
}) => {
  // Base score by tier (Golden Standard)
  const baseScores = {
    COMPLIANT: 0, // No priority - already compliant
    F1_IMMINENT: 100,
    F2_FRAGILE: 80,
    F3_MODERATE: 60,
    F4_COMFORTABLE: 40,
    F5_SAFE: 20,
    T5_UNSALVAGEABLE: 0, // No priority - cannot be saved
  };

  const baseScore = baseScores[fragilityTier.tier] || 0;

  // ============================================================================
  // GOLDEN STANDARD BONUSES (MetricsReference.jsx lines 1886-1889)
  // ============================================================================

  // 1. Out of Medication: +30 pts
  const outOfMedsBonus = isCurrentlyOutOfMeds ? 30 : 0;

  // 2. Q4 (Oct-Dec): +25 pts
  // Auto-detect Q4 if not explicitly provided
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const isInQ4 = isQ4 !== null ? isQ4 : currentMonth >= 10 && currentMonth <= 12;
  const q4Bonus = isInQ4 ? 25 : 0;

  // 3. Multiple MA Measures: +15 pts (only for 2+ measures)
  const multiMeasureBonus = measureCount >= 2 ? 15 : 0;

  // 4. New Patient: +10 pts
  const newPatientBonus = isNewPatient ? 10 : 0;

  // Calculate total score
  const priorityScore = baseScore + outOfMedsBonus + q4Bonus + multiMeasureBonus + newPatientBonus;

  // Determine urgency level (Golden Standard)
  let urgencyLevel;
  if (priorityScore >= 150) urgencyLevel = 'extreme';
  else if (priorityScore >= 100) urgencyLevel = 'high';
  else if (priorityScore >= 50) urgencyLevel = 'moderate';
  else urgencyLevel = 'low';

  // Build human-readable breakdown
  const parts = [`${baseScore} (${fragilityTier.tier?.split('_')[0] || 'tier'})`];
  if (outOfMedsBonus > 0) parts.push(`${outOfMedsBonus} (Out of Meds)`);
  if (q4Bonus > 0) parts.push(`${q4Bonus} (Q4)`);
  if (multiMeasureBonus > 0) parts.push(`${multiMeasureBonus} (Multiple MA)`);
  if (newPatientBonus > 0) parts.push(`${newPatientBonus} (New Patient)`);

  const urgencyLabels = {
    extreme: 'Extreme urgency',
    high: 'High urgency',
    moderate: 'Moderate urgency',
    low: 'Standard priority',
  };

  return {
    priorityScore,
    baseScore,
    outOfMedsBonus,
    q4Bonus,
    multiMeasureBonus,
    newPatientBonus,
    urgencyLevel,
    isQ4: isInQ4,
    breakdown: `${parts.join(' + ')} = ${priorityScore} → ${urgencyLabels[urgencyLevel]}`,
  };
};

/**
 * Calculate comprehensive V3.0 fragility metrics for a patient
 *
 * @param {Object} params - Patient metrics
 * @param {number} params.daysAlreadyCovered - Days covered so far
 * @param {number} params.daysOfSupplyOnHand - Supply on hand
 * @param {number} params.daysRemainingUntilYearEnd - Days to Dec 31
 * @param {number} params.treatmentDays - Treatment period
 * @param {number} params.gapDaysRemaining - Gap days remaining
 * @param {number} params.remainingRefills - Refills needed
 * @param {boolean} [params.isCurrentlyOutOfMeds=false] - Out of meds flag
 * @param {number} params.daysToRunout - Days until runout
 * @param {number} [params.measureCount=1] - Number of measures (1-3)
 * @param {boolean} [params.isNewPatient=false] - Is this a new patient?
 * @returns {Object} Complete fragility tier analysis
 *
 * @example
 * const analysis = calculateFragilityMetrics({
 *   daysAlreadyCovered: 284,
 *   daysOfSupplyOnHand: 5,
 *   daysRemainingUntilYearEnd: 46,
 *   treatmentDays: 365,
 *   gapDaysRemaining: 3,
 *   remainingRefills: 3,
 *   isCurrentlyOutOfMeds: true,
 *   daysToRunout: 0,
 *   measureCount: 3,
 *   isNewPatient: false
 * });
 */
export const calculateFragilityMetrics = ({
  daysAlreadyCovered,
  daysOfSupplyOnHand,
  daysRemainingUntilYearEnd,
  treatmentDays,
  gapDaysRemaining,
  remainingRefills,
  isCurrentlyOutOfMeds = false,
  daysToRunout,
  measureCount = 1,
  isNewPatient = false,
}) => {
  // Calculate base tier
  const baseTier = calculateFragilityTier({
    daysAlreadyCovered,
    daysOfSupplyOnHand,
    daysRemainingUntilYearEnd,
    treatmentDays,
    gapDaysRemaining,
    remainingRefills,
    isCurrentlyOutOfMeds,
  });

  // Apply Q4 tightening if applicable
  const finalTier = applyQ4Tightening(baseTier, daysRemainingUntilYearEnd, gapDaysRemaining);

  // Calculate priority score with Golden Standard bonuses
  const priority = calculatePriorityScore({
    fragilityTier: finalTier,
    daysToRunout,
    measureCount,
    isCurrentlyOutOfMeds,
    isNewPatient,
    // isQ4 is auto-detected in calculatePriorityScore
  });

  return {
    // Tier assignment
    ...finalTier,

    // Priority scoring
    ...priority,

    // Core inputs
    daysAlreadyCovered,
    daysOfSupplyOnHand,
    daysRemainingUntilYearEnd,
    treatmentDays,
    gapDaysRemaining,
    remainingRefills,
    daysToRunout,
    measureCount,
    isNewPatient,

    // Metadata
    version: 'V3.0',
    calculatedAt: new Date().toISOString(),
  };
};

export default {
  calculateFragilityTier,
  applyQ4Tightening,
  calculatePriorityScore,
  calculateFragilityMetrics,
};
