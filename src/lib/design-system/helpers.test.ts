/**
 * Design System Helpers - Unit Tests
 *
 * Tests verify behavior based on:
 * - CMS PDC thresholds (80% = passing)
 * - Design token color values from tokens.ts
 * - Business logic for fragility tiers and runout status
 */

import { describe, it, expect } from 'vitest';
import {
  // PDC helpers
  getPDCColor,
  getPDCStatus,
  getPDCVariant,
  getPDCLabel,
  getPDCClasses,
  // Fragility helpers
  getFragilityColor,
  getFragilityVariant,
  getFragilityLabel,
  getFragilityClasses,
  // Measure helpers
  getMeasureVariant,
  getMeasureLabel,
  getMeasureClasses,
  // Runout helpers
  getRunoutVariant,
  getRunoutLabel,
  // Decision helpers
  getDecisionVariant,
  // Badge helpers
  getBadgeVariant,
} from './helpers';
import { colors } from './tokens';

// =============================================================================
// PDC HELPERS (Based on CMS threshold: ≥80% = passing)
// =============================================================================

describe('PDC Helpers', () => {
  describe('getPDCStatus', () => {
    it('should return "passing" for PDC >= 80', () => {
      expect(getPDCStatus(80)).toBe('passing');
      expect(getPDCStatus(100)).toBe('passing');
      expect(getPDCStatus(85)).toBe('passing');
    });

    it('should return "atRisk" for PDC 60-79', () => {
      expect(getPDCStatus(79)).toBe('atRisk');
      expect(getPDCStatus(60)).toBe('atRisk');
      expect(getPDCStatus(70)).toBe('atRisk');
    });

    it('should return "failing" for PDC < 60', () => {
      expect(getPDCStatus(59)).toBe('failing');
      expect(getPDCStatus(0)).toBe('failing');
      expect(getPDCStatus(30)).toBe('failing');
    });
  });

  describe('getPDCColor', () => {
    it('should return green for passing (>=80)', () => {
      expect(getPDCColor(80)).toBe(colors.semantic.pdc.passing);
      expect(getPDCColor(100)).toBe(colors.semantic.pdc.passing);
    });

    it('should return amber for at-risk (60-79)', () => {
      expect(getPDCColor(79)).toBe(colors.semantic.pdc.atRisk);
      expect(getPDCColor(60)).toBe(colors.semantic.pdc.atRisk);
    });

    it('should return red for failing (<60)', () => {
      expect(getPDCColor(59)).toBe(colors.semantic.pdc.failing);
      expect(getPDCColor(0)).toBe(colors.semantic.pdc.failing);
    });
  });

  describe('getPDCVariant', () => {
    it('should return correct variants for each threshold', () => {
      expect(getPDCVariant(80)).toBe('pass');
      expect(getPDCVariant(70)).toBe('caution');
      expect(getPDCVariant(50)).toBe('fail');
    });
  });

  describe('getPDCLabel', () => {
    it('should return human-readable labels', () => {
      expect(getPDCLabel(80)).toBe('Pass');
      expect(getPDCLabel(70)).toBe('At-Risk');
      expect(getPDCLabel(50)).toBe('Fail');
    });
  });

  describe('getPDCClasses', () => {
    it('should return Tailwind classes for each status', () => {
      expect(getPDCClasses(80)).toBe('bg-green-100 text-green-700');
      expect(getPDCClasses(70)).toBe('bg-amber-100 text-amber-700');
      expect(getPDCClasses(50)).toBe('bg-red-100 text-red-700');
    });
  });
});

// =============================================================================
// FRAGILITY TIER HELPERS
// =============================================================================

describe('Fragility Helpers', () => {
  describe('getFragilityColor', () => {
    it('should return correct colors for full tier names', () => {
      expect(getFragilityColor('F1_IMMINENT')).toBe(colors.semantic.fragility.F1);
      expect(getFragilityColor('F2_FRAGILE')).toBe(colors.semantic.fragility.F2);
      expect(getFragilityColor('F3_MODERATE')).toBe(colors.semantic.fragility.F3);
      expect(getFragilityColor('F4_COMFORTABLE')).toBe(colors.semantic.fragility.F4);
      expect(getFragilityColor('F5_SAFE')).toBe(colors.semantic.fragility.F5);
      expect(getFragilityColor('T5_UNSALVAGEABLE')).toBe(colors.semantic.fragility.T5);
    });

    it('should return correct colors for short tier names', () => {
      expect(getFragilityColor('F1')).toBe(colors.semantic.fragility.F1);
      expect(getFragilityColor('F5')).toBe(colors.semantic.fragility.F5);
      expect(getFragilityColor('T5')).toBe(colors.semantic.fragility.T5);
    });

    it('should return neutral color for invalid tier', () => {
      expect(getFragilityColor('INVALID')).toBe(colors.neutral[500]);
      expect(getFragilityColor('')).toBe(colors.neutral[500]);
    });
  });

  describe('getFragilityVariant', () => {
    it('should return correct variants for all tiers', () => {
      expect(getFragilityVariant('F1_IMMINENT')).toBe('critical');
      expect(getFragilityVariant('F2_FRAGILE')).toBe('fragile');
      expect(getFragilityVariant('F3_MODERATE')).toBe('moderate');
      expect(getFragilityVariant('F4_COMFORTABLE')).toBe('stable');
      expect(getFragilityVariant('F5_SAFE')).toBe('safe');
      expect(getFragilityVariant('T5_UNSALVAGEABLE')).toBe('lost');
    });

    it('should return neutral for invalid input', () => {
      expect(getFragilityVariant('UNKNOWN')).toBe('neutral');
    });
  });

  describe('getFragilityLabel', () => {
    it('should return human-readable labels', () => {
      expect(getFragilityLabel('F1_IMMINENT')).toBe('Critical');
      expect(getFragilityLabel('F2_FRAGILE')).toBe('Fragile');
      expect(getFragilityLabel('F3_MODERATE')).toBe('Moderate');
      expect(getFragilityLabel('F4_COMFORTABLE')).toBe('Stable');
      expect(getFragilityLabel('F5_SAFE')).toBe('Safe');
      expect(getFragilityLabel('T5_UNSALVAGEABLE')).toBe('Lost');
    });

    it('should return input for unknown tier', () => {
      expect(getFragilityLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getFragilityClasses', () => {
    it('should return Tailwind classes for each tier', () => {
      expect(getFragilityClasses('F1_IMMINENT')).toBe('bg-red-100 text-red-700');
      expect(getFragilityClasses('F2_FRAGILE')).toBe('bg-orange-100 text-orange-700');
      expect(getFragilityClasses('F5_SAFE')).toBe('bg-green-100 text-green-700');
      expect(getFragilityClasses('T5_UNSALVAGEABLE')).toBe('bg-gray-100 text-gray-600');
    });
  });
});

// =============================================================================
// MEASURE TYPE HELPERS (MAC/MAD/MAH)
// =============================================================================

describe('Measure Helpers', () => {
  describe('getMeasureVariant', () => {
    it('should return correct variants for each measure', () => {
      expect(getMeasureVariant('MAC')).toBe('mac');
      expect(getMeasureVariant('MAD')).toBe('mad');
      expect(getMeasureVariant('MAH')).toBe('mah');
    });

    it('should return neutral for invalid measure', () => {
      expect(getMeasureVariant('INVALID' as 'MAC')).toBe('neutral');
    });
  });

  describe('getMeasureLabel', () => {
    it('should return full medication class names', () => {
      expect(getMeasureLabel('MAC')).toBe('Cholesterol');
      expect(getMeasureLabel('MAD')).toBe('Diabetes');
      expect(getMeasureLabel('MAH')).toBe('Hypertension');
    });

    it('should return input for unknown measure', () => {
      expect(getMeasureLabel('UNKNOWN' as 'MAC')).toBe('UNKNOWN');
    });
  });

  describe('getMeasureClasses', () => {
    it('should return Tailwind classes for each measure', () => {
      expect(getMeasureClasses('MAC')).toBe('bg-blue-100 text-blue-800');
      expect(getMeasureClasses('MAD')).toBe('bg-purple-100 text-purple-800');
      expect(getMeasureClasses('MAH')).toBe('bg-pink-100 text-pink-800');
    });
  });
});

// =============================================================================
// RUNOUT STATUS HELPERS
// =============================================================================

describe('Runout Helpers', () => {
  describe('getRunoutVariant', () => {
    it('should return critical for <= 0 days', () => {
      expect(getRunoutVariant(0)).toBe('runout-critical');
      expect(getRunoutVariant(-1)).toBe('runout-critical');
    });

    it('should return urgent for 1-7 days', () => {
      expect(getRunoutVariant(1)).toBe('runout-urgent');
      expect(getRunoutVariant(7)).toBe('runout-urgent');
    });

    it('should return due-soon for 8-14 days', () => {
      expect(getRunoutVariant(8)).toBe('due-soon');
      expect(getRunoutVariant(14)).toBe('due-soon');
    });

    it('should return ok for > 14 days', () => {
      expect(getRunoutVariant(15)).toBe('ok');
      expect(getRunoutVariant(30)).toBe('ok');
    });
  });

  describe('getRunoutLabel', () => {
    it('should return "Out of Meds" for <= 0 days', () => {
      expect(getRunoutLabel(0)).toBe('Out of Meds');
      expect(getRunoutLabel(-5)).toBe('Out of Meds');
    });

    it('should return days left for 1-14 days', () => {
      expect(getRunoutLabel(5)).toBe('5d left');
      expect(getRunoutLabel(10)).toBe('10d left');
    });

    it('should return just days for > 14', () => {
      expect(getRunoutLabel(20)).toBe('20d');
    });
  });
});

// =============================================================================
// DECISION STATUS HELPERS
// =============================================================================

describe('Decision Helpers', () => {
  describe('getDecisionVariant', () => {
    it('should normalize and map decision statuses', () => {
      expect(getDecisionVariant('approve')).toBe('approve');
      expect(getDecisionVariant('approved')).toBe('approve');
      expect(getDecisionVariant('deny')).toBe('deny');
      expect(getDecisionVariant('denied')).toBe('deny');
      expect(getDecisionVariant('pending')).toBe('pending');
    });

    it('should handle hyphenated statuses', () => {
      expect(getDecisionVariant('no-review-needed')).toBe('no-review-needed');
      expect(getDecisionVariant('pending-review')).toBe('pending-review');
      expect(getDecisionVariant('pre-approved')).toBe('pre-approved');
    });

    it('should normalize underscores and spaces', () => {
      expect(getDecisionVariant('no_review_needed')).toBe('no-review-needed');
      expect(getDecisionVariant('pending review')).toBe('pending-review');
    });

    it('should return neutral for unknown status', () => {
      expect(getDecisionVariant('unknown')).toBe('neutral');
    });
  });
});

// =============================================================================
// BADGE VARIANT HELPERS
// =============================================================================

describe('Badge Helpers', () => {
  describe('getBadgeVariant', () => {
    it('should return correct styles for all variants', () => {
      const success = getBadgeVariant('success');
      expect(success.background).toBe(colors.success[100]);
      expect(success.color).toBe(colors.success[600]);

      const warning = getBadgeVariant('warning');
      expect(warning.background).toBe(colors.warning[100]);
      expect(warning.color).toBe(colors.warning[500]);

      const danger = getBadgeVariant('danger');
      expect(danger.background).toBe(colors.danger[100]);
      expect(danger.color).toBe(colors.danger[600]);

      const neutral = getBadgeVariant('neutral');
      expect(neutral.background).toBe(colors.neutral[100]);
      expect(neutral.color).toBe(colors.neutral[700]);

      const primary = getBadgeVariant('primary');
      expect(primary.background).toBe(colors.primary[100]);
      expect(primary.color).toBe(colors.primary[600]);
    });

    it('should return neutral for invalid variant', () => {
      const invalid = getBadgeVariant('invalid' as 'success');
      expect(invalid.background).toBe(colors.neutral[100]);
      expect(invalid.color).toBe(colors.neutral[700]);
    });
  });
});
