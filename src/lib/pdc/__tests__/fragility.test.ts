/**
 * Fragility Tier Tests
 *
 * Tests for fragility tier calculation, priority scoring, and Q4 tightening.
 * Test cases derived from golden-standard-tests.json and 03_FRAGILITY_TIER_SPEC.md.
 *
 * @see docs/implementation/phase-1-core-engine/specs/03_FRAGILITY_TIER_SPEC.md
 * @see docs/implementation/phase-1-core-engine/test-cases/golden-standard-tests.json
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, it, expect } from 'vitest';
import {
  calculateDelayBudget,
  determineTierFromDelayBudget,
  calculateFragility,
  calculatePriorityScore,
  applyQ4Tightening,
  determineUrgencyLevel,
} from '../fragility';
import type { FragilityInput } from '../fragility-types';
import type { PDCResult } from '../types';
import type { FragilityTier } from '@/lib/fhir/types';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock PDC result for testing.
 */
function createMockPDCResult(overrides: Partial<PDCResult> = {}): PDCResult {
  return {
    pdc: 72,
    coveredDays: 263,
    treatmentDays: 365,
    gapDaysUsed: 102,
    gapDaysAllowed: 73,
    gapDaysRemaining: -29,
    pdcStatusQuo: 75,
    pdcPerfect: 85,
    measurementPeriod: {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    },
    daysUntilRunout: 10,
    currentSupply: 10,
    refillsNeeded: 3,
    lastFillDate: new Date('2025-09-15'),
    fillCount: 9,
    daysToYearEnd: 90,
    ...overrides,
  };
}

/**
 * Create a mock fragility input.
 */
function createMockFragilityInput(overrides: Partial<FragilityInput> = {}): FragilityInput {
  return {
    pdcResult: createMockPDCResult(overrides.pdcResult),
    refillsRemaining: 3,
    measureTypes: ['MAC'],
    isNewPatient: false,
    currentDate: new Date('2025-06-15'),
    ...overrides,
  };
}

// =============================================================================
// calculateDelayBudget Tests
// =============================================================================

describe('calculateDelayBudget', () => {
  describe('Basic calculations (F058)', () => {
    it('should calculate delay budget correctly (F058-TC01)', () => {
      // gapRemaining=30, refills=3 → 10 days/refill
      const result = calculateDelayBudget(30, 3);
      expect(result).toBe(10);
    });

    it('should calculate low delay budget (F058-TC02)', () => {
      // gapRemaining=6, refills=3 → 2 days/refill (F1)
      const result = calculateDelayBudget(6, 3);
      expect(result).toBe(2);
    });

    it('should calculate high delay budget (F058-TC03)', () => {
      // gapRemaining=60, refills=2 → 30 days/refill (F5)
      const result = calculateDelayBudget(60, 2);
      expect(result).toBe(30);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero refills (F058-TC04)', () => {
      // refills=0 with positive gap → Infinity
      const result = calculateDelayBudget(10, 0);
      expect(result).toBe(Infinity);
    });

    it('should handle zero refills with zero gap', () => {
      // refills=0 with zero gap → Infinity (safe)
      const result = calculateDelayBudget(0, 0);
      expect(result).toBe(Infinity);
    });

    it('should handle negative gap days (F058-TC05)', () => {
      // gapRemaining=-10, refills=2 → -5 (T5)
      const result = calculateDelayBudget(-10, 2);
      expect(result).toBe(-5);
    });

    it('should handle fractional results', () => {
      // gapRemaining=10, refills=3 → 3.33...
      const result = calculateDelayBudget(10, 3);
      expect(result).toBeCloseTo(3.33, 1);
    });
  });
});

// =============================================================================
// determineTierFromDelayBudget Tests
// =============================================================================

describe('determineTierFromDelayBudget', () => {
  describe('Tier threshold tests (TIER-F1 to TIER-F5)', () => {
    it('should return F1 at boundary (delay budget = 2) (TIER-F1-01)', () => {
      expect(determineTierFromDelayBudget(2)).toBe('F1_IMMINENT');
    });

    it('should return F1 below boundary (delay budget = 1) (TIER-F1-02)', () => {
      expect(determineTierFromDelayBudget(1)).toBe('F1_IMMINENT');
    });

    it('should return F1 at very low (delay budget = 0.33) (TIER-F1-03)', () => {
      expect(determineTierFromDelayBudget(0.33)).toBe('F1_IMMINENT');
    });

    it('should return F2 at lower boundary (delay budget = 3) (TIER-F2-01)', () => {
      expect(determineTierFromDelayBudget(3)).toBe('F2_FRAGILE');
    });

    it('should return F2 mid-range (delay budget = 4) (TIER-F2-02)', () => {
      expect(determineTierFromDelayBudget(4)).toBe('F2_FRAGILE');
    });

    it('should return F2 at upper boundary (delay budget = 5) (TIER-F2-03)', () => {
      expect(determineTierFromDelayBudget(5)).toBe('F2_FRAGILE');
    });

    it('should return F3 at lower boundary (delay budget = 6) (TIER-F3-01)', () => {
      expect(determineTierFromDelayBudget(6)).toBe('F3_MODERATE');
    });

    it('should return F3 mid-range (delay budget = 8) (TIER-F3-02)', () => {
      expect(determineTierFromDelayBudget(8)).toBe('F3_MODERATE');
    });

    it('should return F3 at upper boundary (delay budget = 10) (TIER-F3-03)', () => {
      expect(determineTierFromDelayBudget(10)).toBe('F3_MODERATE');
    });

    it('should return F4 at lower boundary (delay budget = 11) (TIER-F4-01)', () => {
      expect(determineTierFromDelayBudget(11)).toBe('F4_COMFORTABLE');
    });

    it('should return F4 mid-range (delay budget = 15) (TIER-F4-02)', () => {
      expect(determineTierFromDelayBudget(15)).toBe('F4_COMFORTABLE');
    });

    it('should return F4 at upper boundary (delay budget = 20) (TIER-F4-03)', () => {
      expect(determineTierFromDelayBudget(20)).toBe('F4_COMFORTABLE');
    });

    it('should return F5 at lower boundary (delay budget = 21) (TIER-F5-01)', () => {
      expect(determineTierFromDelayBudget(21)).toBe('F5_SAFE');
    });

    it('should return F5 high value (delay budget = 30) (TIER-F5-02)', () => {
      expect(determineTierFromDelayBudget(30)).toBe('F5_SAFE');
    });

    it('should return F5 very high (delay budget = 50) (TIER-F5-03)', () => {
      expect(determineTierFromDelayBudget(50)).toBe('F5_SAFE');
    });
  });

  describe('Edge cases', () => {
    it('should return F1 for zero delay budget', () => {
      expect(determineTierFromDelayBudget(0)).toBe('F1_IMMINENT');
    });

    it('should return F1 for negative delay budget', () => {
      expect(determineTierFromDelayBudget(-5)).toBe('F1_IMMINENT');
    });

    it('should return F5 for Infinity', () => {
      expect(determineTierFromDelayBudget(Infinity)).toBe('F5_SAFE');
    });
  });
});

// =============================================================================
// calculatePriorityScore Tests
// =============================================================================

describe('calculatePriorityScore', () => {
  describe('Base scores (PRIORITY-BASE)', () => {
    it('should return base 100 for F1_IMMINENT (PRIORITY-BASE-01)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 10,
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.base).toBe(100);
      expect(result.priorityScore).toBe(100);
    });

    it('should return base 80 for F2_FRAGILE (PRIORITY-BASE-02)', () => {
      const result = calculatePriorityScore('F2_FRAGILE', {
        daysToRunout: 10,
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.base).toBe(80);
      expect(result.priorityScore).toBe(80);
    });

    it('should return base 60 for F3_MODERATE (PRIORITY-BASE-03)', () => {
      const result = calculatePriorityScore('F3_MODERATE', {
        daysToRunout: 10,
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.base).toBe(60);
      expect(result.priorityScore).toBe(60);
    });

    it('should return base 40 for F4_COMFORTABLE (PRIORITY-BASE-04)', () => {
      const result = calculatePriorityScore('F4_COMFORTABLE', {
        daysToRunout: 10,
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.base).toBe(40);
      expect(result.priorityScore).toBe(40);
    });

    it('should return base 20 for F5_SAFE (PRIORITY-BASE-05)', () => {
      const result = calculatePriorityScore('F5_SAFE', {
        daysToRunout: 10,
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.base).toBe(20);
      expect(result.priorityScore).toBe(20);
    });

    it('should return base 0 for COMPLIANT (PRIORITY-BASE-06)', () => {
      const result = calculatePriorityScore('COMPLIANT', {
        daysToRunout: 10,
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.base).toBe(0);
      expect(result.priorityScore).toBe(0);
    });

    it('should return base 0 for T5_UNSALVAGEABLE (PRIORITY-BASE-07)', () => {
      const result = calculatePriorityScore('T5_UNSALVAGEABLE', {
        daysToRunout: 10,
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.base).toBe(0);
      expect(result.priorityScore).toBe(0);
    });
  });

  describe('Individual bonuses (PRIORITY-BONUS)', () => {
    it('should add +30 for out of medication (PRIORITY-BONUS-01)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 0, // Out of meds
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.outOfMeds).toBe(30);
      expect(result.priorityScore).toBe(130);
    });

    it('should add +30 for negative days to runout', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: -5, // Already out for 5 days
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.outOfMeds).toBe(30);
      expect(result.priorityScore).toBe(130);
    });

    it('should add +25 for Q4 (PRIORITY-BONUS-02)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 10,
        currentDate: new Date('2025-10-15'), // October
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.q4).toBe(25);
      expect(result.priorityScore).toBe(125);
    });

    it('should add +25 for November (Q4)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 10,
        currentDate: new Date('2025-11-15'), // November
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.q4).toBe(25);
    });

    it('should add +25 for December (Q4)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 10,
        currentDate: new Date('2025-12-15'), // December
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.q4).toBe(25);
    });

    it('should NOT add Q4 bonus in September', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 10,
        currentDate: new Date('2025-09-15'), // September
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.bonuses.q4).toBe(0);
    });

    it('should add +15 for multiple MA measures (PRIORITY-BONUS-03)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 10,
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC', 'MAH'], // 2 measures
        isNewPatient: false,
      });
      expect(result.bonuses.multipleMA).toBe(15);
      expect(result.priorityScore).toBe(115);
    });

    it('should NOT add bonus for single measure (PRIORITY-BONUS-04)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 10,
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC'], // 1 measure
        isNewPatient: false,
      });
      expect(result.bonuses.multipleMA).toBe(0);
      expect(result.priorityScore).toBe(100);
    });

    it('should add same +15 for 3 measures as 2 (PRIORITY-BONUS-05)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 10,
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC', 'MAD', 'MAH'], // 3 measures
        isNewPatient: false,
      });
      expect(result.bonuses.multipleMA).toBe(15);
      expect(result.priorityScore).toBe(115);
    });

    it('should add +10 for new patient (PRIORITY-BONUS-06)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 10,
        currentDate: new Date('2025-06-15'),
        measureTypes: ['MAC'],
        isNewPatient: true,
      });
      expect(result.bonuses.newPatient).toBe(10);
      expect(result.priorityScore).toBe(110);
    });
  });

  describe('Combined bonuses (PRIORITY-COMBINED)', () => {
    it('should combine Out of Meds + Q4 (PRIORITY-COMBINED-01)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 0,
        currentDate: new Date('2025-10-15'),
        measureTypes: ['MAC'],
        isNewPatient: false,
      });
      expect(result.priorityScore).toBe(155); // 100 + 30 + 25
    });

    it('should combine Out of Meds + Q4 + Multi MA (PRIORITY-COMBINED-02)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 0,
        currentDate: new Date('2025-10-15'),
        measureTypes: ['MAC', 'MAH'],
        isNewPatient: false,
      });
      expect(result.priorityScore).toBe(170); // 100 + 30 + 25 + 15
    });

    it('should combine ALL bonuses for maximum score (PRIORITY-COMBINED-03)', () => {
      const result = calculatePriorityScore('F1_IMMINENT', {
        daysToRunout: 0,
        currentDate: new Date('2025-10-15'),
        measureTypes: ['MAC', 'MAH'],
        isNewPatient: true,
      });
      expect(result.priorityScore).toBe(180); // 100 + 30 + 25 + 15 + 10
    });

    it('should combine ALL bonuses for F2 (PRIORITY-COMBINED-04)', () => {
      const result = calculatePriorityScore('F2_FRAGILE', {
        daysToRunout: 0,
        currentDate: new Date('2025-10-15'),
        measureTypes: ['MAC', 'MAH'],
        isNewPatient: true,
      });
      expect(result.priorityScore).toBe(160); // 80 + 30 + 25 + 15 + 10
    });
  });
});

// =============================================================================
// determineUrgencyLevel Tests
// =============================================================================

describe('determineUrgencyLevel', () => {
  it('should return EXTREME for score 150 (URGENCY-01)', () => {
    expect(determineUrgencyLevel(150)).toBe('EXTREME');
  });

  it('should return EXTREME for score 175 (URGENCY-02)', () => {
    expect(determineUrgencyLevel(175)).toBe('EXTREME');
  });

  it('should return HIGH for score 100 (URGENCY-03)', () => {
    expect(determineUrgencyLevel(100)).toBe('HIGH');
  });

  it('should return HIGH for score 149 (URGENCY-04)', () => {
    expect(determineUrgencyLevel(149)).toBe('HIGH');
  });

  it('should return MODERATE for score 50 (URGENCY-05)', () => {
    expect(determineUrgencyLevel(50)).toBe('MODERATE');
  });

  it('should return MODERATE for score 99 (URGENCY-06)', () => {
    expect(determineUrgencyLevel(99)).toBe('MODERATE');
  });

  it('should return LOW for score 0 (URGENCY-07)', () => {
    expect(determineUrgencyLevel(0)).toBe('LOW');
  });

  it('should return LOW for score 49 (URGENCY-08)', () => {
    expect(determineUrgencyLevel(49)).toBe('LOW');
  });
});

// =============================================================================
// applyQ4Tightening Tests
// =============================================================================

describe('applyQ4Tightening', () => {
  it('should promote F3 to F2 when <60 days AND ≤5 gap days (Q4-01)', () => {
    const result = applyQ4Tightening('F3_MODERATE', 45, 4);
    expect(result.tier).toBe('F2_FRAGILE');
    expect(result.q4Tightened).toBe(true);
  });

  it('should NOT promote when daysToYearEnd = 60 (boundary) (Q4-02)', () => {
    const result = applyQ4Tightening('F3_MODERATE', 60, 4);
    expect(result.tier).toBe('F3_MODERATE');
    expect(result.q4Tightened).toBe(false);
  });

  it('should NOT promote when gapDaysRemaining > 5 (Q4-03)', () => {
    const result = applyQ4Tightening('F3_MODERATE', 45, 15);
    expect(result.tier).toBe('F3_MODERATE');
    expect(result.q4Tightened).toBe(false);
  });

  it('should promote F2 to F1 (Q4-04)', () => {
    const result = applyQ4Tightening('F2_FRAGILE', 45, 4);
    expect(result.tier).toBe('F1_IMMINENT');
    expect(result.q4Tightened).toBe(true);
  });

  it('should promote F4 to F3 (Q4-05)', () => {
    const result = applyQ4Tightening('F4_COMFORTABLE', 45, 4);
    expect(result.tier).toBe('F3_MODERATE');
    expect(result.q4Tightened).toBe(true);
  });

  it('should promote F5 to F4 (Q4-06)', () => {
    const result = applyQ4Tightening('F5_SAFE', 45, 4);
    expect(result.tier).toBe('F4_COMFORTABLE');
    expect(result.q4Tightened).toBe(true);
  });

  it('should NOT affect COMPLIANT (Q4-07)', () => {
    const result = applyQ4Tightening('COMPLIANT', 45, 4);
    expect(result.tier).toBe('COMPLIANT');
    expect(result.q4Tightened).toBe(false);
  });

  it('should NOT affect T5_UNSALVAGEABLE (Q4-08)', () => {
    const result = applyQ4Tightening('T5_UNSALVAGEABLE', 45, 4);
    expect(result.tier).toBe('T5_UNSALVAGEABLE');
    expect(result.q4Tightened).toBe(false);
  });

  it('should NOT affect F1_IMMINENT (already most urgent)', () => {
    const result = applyQ4Tightening('F1_IMMINENT', 45, 4);
    expect(result.tier).toBe('F1_IMMINENT');
    expect(result.q4Tightened).toBe(false);
  });

  it('should handle gapDaysRemaining = 5 (boundary)', () => {
    const result = applyQ4Tightening('F3_MODERATE', 45, 5);
    expect(result.tier).toBe('F2_FRAGILE');
    expect(result.q4Tightened).toBe(true);
  });

  it('should handle gapDaysRemaining = 6 (just above threshold)', () => {
    const result = applyQ4Tightening('F3_MODERATE', 45, 6);
    expect(result.tier).toBe('F3_MODERATE');
    expect(result.q4Tightened).toBe(false);
  });
});

// =============================================================================
// calculateFragility (Integration) Tests
// =============================================================================

describe('calculateFragility', () => {
  describe('COMPLIANT tier (REGRESSION-01)', () => {
    it('should return COMPLIANT when pdcStatusQuo >= 80%', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 82, // >= 80%
          pdcPerfect: 90,
          gapDaysRemaining: 2, // Would be F1 if not COMPLIANT
        }),
        refillsRemaining: 1,
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('COMPLIANT');
      expect(result.priorityScore).toBe(0);
      expect(result.flags.isCompliant).toBe(true);
    });

    it('should check COMPLIANT BEFORE F1-F5 assignment (REGRESSION-01)', () => {
      // This is the critical regression test from golden standard
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 80, // Exactly 80% - should be COMPLIANT
          pdcPerfect: 92,
          gapDaysRemaining: 2, // Would be F1 if we checked delay budget first
        }),
        refillsRemaining: 1,
      });

      const result = calculateFragility(input);

      // CRITICAL: Should be COMPLIANT, NOT F1
      expect(result.tier).toBe('COMPLIANT');
    });
  });

  describe('T5_UNSALVAGEABLE tier', () => {
    it('should return T5 when pdcPerfect < 80%', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 65, // Not compliant
          pdcPerfect: 75, // Cannot reach 80%
          gapDaysRemaining: 10,
        }),
        refillsRemaining: 3,
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('T5_UNSALVAGEABLE');
      expect(result.flags.isUnsalvageable).toBe(true);
    });

    it('should return T5 when gapDaysRemaining < 0 (EDGE-02)', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 65,
          pdcPerfect: 75,
          gapDaysRemaining: -5, // Negative gap days
        }),
        refillsRemaining: 3,
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('T5_UNSALVAGEABLE');
    });
  });

  describe('F1-F5 tiers', () => {
    it('should return F1 when delay budget <= 2', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 75,
          pdcPerfect: 85,
          gapDaysRemaining: 6, // 6 / 3 = 2
        }),
        refillsRemaining: 3,
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('F1_IMMINENT');
      expect(result.delayBudgetPerRefill).toBe(2);
    });

    it('should return F2 when delay budget = 3-5', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 75,
          pdcPerfect: 85,
          gapDaysRemaining: 12, // 12 / 3 = 4
        }),
        refillsRemaining: 3,
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('F2_FRAGILE');
      expect(result.delayBudgetPerRefill).toBe(4);
    });

    it('should return F3 when delay budget = 6-10', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 75,
          pdcPerfect: 85,
          gapDaysRemaining: 24, // 24 / 3 = 8
        }),
        refillsRemaining: 3,
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('F3_MODERATE');
      expect(result.delayBudgetPerRefill).toBe(8);
    });

    it('should return F4 when delay budget = 11-20', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 75,
          pdcPerfect: 85,
          gapDaysRemaining: 45, // 45 / 3 = 15
        }),
        refillsRemaining: 3,
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('F4_COMFORTABLE');
      expect(result.delayBudgetPerRefill).toBe(15);
    });

    it('should return F5 when delay budget > 20', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 75,
          pdcPerfect: 85,
          gapDaysRemaining: 90, // 90 / 3 = 30
        }),
        refillsRemaining: 3,
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('F5_SAFE');
      expect(result.delayBudgetPerRefill).toBe(30);
    });
  });

  describe('Delay Budget formula (REGRESSION-02)', () => {
    it('should use remaining refills division, NOT raw gap days', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 75,
          pdcPerfect: 85,
          gapDaysRemaining: 15, // Raw 15 would be F4
        }),
        refillsRemaining: 3, // 15 / 3 = 5 → F2
      });

      const result = calculateFragility(input);

      // CRITICAL: Should be F2 (delay budget = 5), NOT F4 (raw 15)
      expect(result.tier).toBe('F2_FRAGILE');
      expect(result.delayBudgetPerRefill).toBe(5);
    });
  });

  describe('Priority score with bonuses (REGRESSION-03)', () => {
    it('should use +30 for Out of Meds bonus, NOT +5', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 75,
          pdcPerfect: 85,
          gapDaysRemaining: 6,
          daysUntilRunout: -5, // Out of meds
        }),
        refillsRemaining: 3,
        currentDate: new Date('2025-06-15'), // Not Q4
      });

      const result = calculateFragility(input);

      // CRITICAL: 100 (F1) + 30 (out of meds) = 130, NOT 105
      expect(result.priorityScore).toBe(130);
      expect(result.bonuses.outOfMeds).toBe(30);
    });
  });

  describe('Real-world scenarios', () => {
    it('SCENARIO-01: John - Critical Q4 Patient', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 76.7,
          pdcPerfect: 89.0,
          gapDaysRemaining: 4,
          daysUntilRunout: 0, // Out of meds
          daysToYearEnd: 45,
        }),
        refillsRemaining: 2, // delay budget = 4/2 = 2 → F1
        measureTypes: ['MAC', 'MAD', 'MAH'], // Multi-MA
        isNewPatient: false,
        currentDate: new Date('2025-11-15'), // Q4
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('F1_IMMINENT');
      expect(result.urgencyLevel).toBe('EXTREME');
      expect(result.priorityScore).toBeGreaterThanOrEqual(150);
    });

    it('SCENARIO-03: Sarah - Compliant Patient', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 90.4, // >= 80%
          pdcPerfect: 95,
          gapDaysRemaining: 40,
          daysUntilRunout: 20,
        }),
        refillsRemaining: 1,
        measureTypes: ['MAC'],
        isNewPatient: false,
        currentDate: new Date('2025-12-01'),
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('COMPLIANT');
      expect(result.urgencyLevel).toBe('LOW');
      // Base score 0 + Q4 bonus 25 (December is Q4)
      expect(result.priorityScore).toBe(25);
      expect(result.bonuses.base).toBe(0);
      expect(result.bonuses.q4).toBe(25);
    });

    it('SCENARIO-04: Robert - Unsalvageable', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 64.4,
          pdcPerfect: 72.6, // < 80% - cannot reach
          gapDaysRemaining: -10,
          daysUntilRunout: 30,
        }),
        refillsRemaining: 1,
        measureTypes: ['MAD'],
        isNewPatient: false,
        currentDate: new Date('2025-12-01'),
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('T5_UNSALVAGEABLE');
      expect(result.urgencyLevel).toBe('LOW');
      // Base score 0 + Q4 bonus 25 (December is Q4)
      expect(result.priorityScore).toBe(25);
      expect(result.bonuses.base).toBe(0);
      expect(result.bonuses.q4).toBe(25);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero remaining refills (EDGE-01)', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 75,
          pdcPerfect: 85,
          gapDaysRemaining: 10,
        }),
        refillsRemaining: 0, // Zero refills
      });

      const result = calculateFragility(input);

      // With zero refills but positive gap, should be F5 (Infinity delay budget)
      expect(result.tier).toBe('F5_SAFE');
    });

    it('should handle very large gap days remaining (EDGE-06)', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 75,
          pdcPerfect: 85,
          gapDaysRemaining: 1000, // Very large
        }),
        refillsRemaining: 1,
      });

      const result = calculateFragility(input);

      expect(result.tier).toBe('F5_SAFE');
    });
  });

  describe('Q4 tightening integration', () => {
    it('should apply Q4 tightening in full calculation', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 75,
          pdcPerfect: 85,
          gapDaysRemaining: 24, // 24/3 = 8 → F3
          daysToYearEnd: 45, // < 60 days
        }),
        refillsRemaining: 3,
        currentDate: new Date('2025-11-15'),
      });

      // gap days = 24, which with 3 refills = 8 → F3
      // But daysToYearEnd=45 < 60 AND gapDaysRemaining=24 > 5
      // So NO promotion because gap > 5
      const result = calculateFragility(input);

      expect(result.tier).toBe('F3_MODERATE');
      expect(result.flags.q4Tightened).toBe(false);
    });

    it('should promote tier with Q4 tightening when conditions met', () => {
      const input = createMockFragilityInput({
        pdcResult: createMockPDCResult({
          pdcStatusQuo: 75,
          pdcPerfect: 85,
          gapDaysRemaining: 4, // Small gap
          daysToYearEnd: 45, // < 60 days
        }),
        refillsRemaining: 1, // 4/1 = 4 → F2
        currentDate: new Date('2025-11-15'),
      });

      const result = calculateFragility(input);

      // Base: F2 (delay budget = 4)
      // Q4 tightening: daysToYearEnd=45 < 60 AND gapDaysRemaining=4 <= 5
      // → F2 promoted to F1
      expect(result.tier).toBe('F1_IMMINENT');
      expect(result.flags.q4Tightened).toBe(true);
    });
  });
});
