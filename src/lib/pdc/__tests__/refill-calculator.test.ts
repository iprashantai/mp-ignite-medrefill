/**
 * Refill Calculator Tests
 *
 * TDD: Write tests FIRST, then implement to pass.
 *
 * Tests for coverage shortfall calculation, remaining refills,
 * supply on hand, and days to year end.
 *
 * FROM LEGACY: Exact port of calculateRemainingRefills() and calculateCoverageShortfall()
 *
 * @see docs/implementation/phase-1-core-engine/specs/02_PDC_CALCULATOR_SPEC.md
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCoverageShortfall,
  calculateRemainingRefills,
  calculateSupplyOnHand,
  calculateDaysToYearEnd,
} from '../refill-calculator';
import { createMockDispense } from '@/lib/fhir/__tests__/fixtures/mock-medplum';

// =============================================================================
// calculateCoverageShortfall Tests
// =============================================================================

describe('calculateCoverageShortfall', () => {
  describe('Basic calculations (RC-CS)', () => {
    it('RC-CS-01: should calculate shortfall when supply < days to year end', () => {
      const result = calculateCoverageShortfall({
        daysRemainingUntilYearEnd: 100,
        daysOfSupplyOnHand: 30,
      });
      expect(result).toBe(70);
    });

    it('RC-CS-02: should return 0 when supply >= days to year end', () => {
      const result = calculateCoverageShortfall({
        daysRemainingUntilYearEnd: 30,
        daysOfSupplyOnHand: 60,
      });
      expect(result).toBe(0);
    });

    it('RC-CS-03: should return 0 when supply equals days to year end', () => {
      const result = calculateCoverageShortfall({
        daysRemainingUntilYearEnd: 50,
        daysOfSupplyOnHand: 50,
      });
      expect(result).toBe(0);
    });

    it('RC-CS-04: should handle zero supply on hand', () => {
      const result = calculateCoverageShortfall({
        daysRemainingUntilYearEnd: 90,
        daysOfSupplyOnHand: 0,
      });
      expect(result).toBe(90);
    });

    it('RC-CS-05: should handle zero days to year end', () => {
      const result = calculateCoverageShortfall({
        daysRemainingUntilYearEnd: 0,
        daysOfSupplyOnHand: 30,
      });
      expect(result).toBe(0);
    });
  });

  describe('Edge cases (RC-CS-EDGE)', () => {
    it('RC-CS-EDGE-01: should handle both values as zero', () => {
      const result = calculateCoverageShortfall({
        daysRemainingUntilYearEnd: 0,
        daysOfSupplyOnHand: 0,
      });
      expect(result).toBe(0);
    });

    it('RC-CS-EDGE-02: should handle very large values', () => {
      const result = calculateCoverageShortfall({
        daysRemainingUntilYearEnd: 365,
        daysOfSupplyOnHand: 0,
      });
      expect(result).toBe(365);
    });
  });
});

// =============================================================================
// calculateRemainingRefills Tests
// =============================================================================

describe('calculateRemainingRefills', () => {
  describe('Basic calculations (RC-RR)', () => {
    it('RC-RR-01: should return 0 refills when no shortfall', () => {
      const result = calculateRemainingRefills({
        coverageShortfall: 0,
        standardDaysSupply: 30,
      });
      expect(result.remainingRefills).toBe(0);
      expect(result.reasoning).toContain('No refills needed');
    });

    it('RC-RR-02: should calculate refills with standard 30-day supply', () => {
      const result = calculateRemainingRefills({
        coverageShortfall: 90,
        standardDaysSupply: 30,
      });
      expect(result.remainingRefills).toBe(3); // 90 / 30 = 3
      expect(result.estimatedDaysPerRefill).toBe(30);
    });

    it('RC-RR-03: should round UP to ensure full coverage', () => {
      const result = calculateRemainingRefills({
        coverageShortfall: 100,
        standardDaysSupply: 30,
      });
      expect(result.remainingRefills).toBe(4); // ceil(100/30) = 4
    });

    it('RC-RR-04: should use average from recent fills when available', () => {
      const recentFills = [
        createMockDispense({ daysSupply: 90 }),
        createMockDispense({ daysSupply: 90 }),
      ];
      const result = calculateRemainingRefills({
        coverageShortfall: 180,
        standardDaysSupply: 30,
        recentFills,
      });
      expect(result.estimatedDaysPerRefill).toBe(90);
      expect(result.remainingRefills).toBe(2); // 180 / 90 = 2
    });

    it('RC-RR-05: should fall back to standard when fills have no daysSupply', () => {
      const recentFills = [
        createMockDispense({ daysSupply: 0 }),
      ];
      const result = calculateRemainingRefills({
        coverageShortfall: 60,
        standardDaysSupply: 30,
        recentFills,
      });
      expect(result.estimatedDaysPerRefill).toBe(30);
    });

    it('RC-RR-06: should calculate average from mixed supply values', () => {
      const recentFills = [
        createMockDispense({ daysSupply: 30 }),
        createMockDispense({ daysSupply: 60 }),
        createMockDispense({ daysSupply: 90 }),
      ];
      const result = calculateRemainingRefills({
        coverageShortfall: 180,
        standardDaysSupply: 30,
        recentFills,
      });
      // Average: (30 + 60 + 90) / 3 = 60
      expect(result.estimatedDaysPerRefill).toBe(60);
      expect(result.remainingRefills).toBe(3); // ceil(180/60) = 3
    });

    it('RC-RR-07: should use default 30-day supply when not specified', () => {
      const result = calculateRemainingRefills({
        coverageShortfall: 90,
      });
      expect(result.estimatedDaysPerRefill).toBe(30);
      expect(result.remainingRefills).toBe(3);
    });

    it('RC-RR-08: should handle 60-day supply', () => {
      const result = calculateRemainingRefills({
        coverageShortfall: 120,
        standardDaysSupply: 60,
      });
      expect(result.remainingRefills).toBe(2); // 120 / 60 = 2
      expect(result.estimatedDaysPerRefill).toBe(60);
    });

    it('RC-RR-09: should handle 90-day supply', () => {
      const result = calculateRemainingRefills({
        coverageShortfall: 180,
        standardDaysSupply: 90,
      });
      expect(result.remainingRefills).toBe(2); // 180 / 90 = 2
      expect(result.estimatedDaysPerRefill).toBe(90);
    });

    it('RC-RR-10: should include reasoning string with details', () => {
      const result = calculateRemainingRefills({
        coverageShortfall: 90,
        standardDaysSupply: 30,
      });
      expect(result.reasoning).toBe('Need 3 refill(s) of 30-day supply');
    });
  });

  describe('Edge cases (RC-RR-EDGE)', () => {
    it('RC-RR-EDGE-01: should handle negative shortfall', () => {
      const result = calculateRemainingRefills({
        coverageShortfall: -10,
        standardDaysSupply: 30,
      });
      expect(result.remainingRefills).toBe(0);
      expect(result.reasoning).toContain('No refills needed');
    });

    it('RC-RR-EDGE-02: should handle very large shortfall', () => {
      const result = calculateRemainingRefills({
        coverageShortfall: 365,
        standardDaysSupply: 30,
      });
      expect(result.remainingRefills).toBe(13); // ceil(365/30) = 13
    });

    it('RC-RR-EDGE-03: should handle single refill needed', () => {
      const result = calculateRemainingRefills({
        coverageShortfall: 15,
        standardDaysSupply: 30,
      });
      expect(result.remainingRefills).toBe(1); // ceil(15/30) = 1
    });

    it('RC-RR-EDGE-04: should handle empty recent fills array', () => {
      const result = calculateRemainingRefills({
        coverageShortfall: 60,
        standardDaysSupply: 30,
        recentFills: [],
      });
      expect(result.estimatedDaysPerRefill).toBe(30);
      expect(result.remainingRefills).toBe(2);
    });
  });
});

// =============================================================================
// calculateSupplyOnHand Tests
// =============================================================================

describe('calculateSupplyOnHand', () => {
  describe('Basic calculations (RC-SOH)', () => {
    it('RC-SOH-01: should calculate remaining supply correctly', () => {
      const dispense = createMockDispense({
        fillDate: '2025-11-01',
        daysSupply: 30,
      });
      const currentDate = new Date('2025-11-15');
      const result = calculateSupplyOnHand(dispense, currentDate);
      expect(result).toBe(16); // 30 - 14 days elapsed
    });

    it('RC-SOH-02: should return 0 when supply depleted', () => {
      const dispense = createMockDispense({
        fillDate: '2025-10-01',
        daysSupply: 30,
      });
      const currentDate = new Date('2025-11-15');
      const result = calculateSupplyOnHand(dispense, currentDate);
      expect(result).toBe(0);
    });

    it('RC-SOH-03: should return full supply on fill day', () => {
      const dispense = createMockDispense({
        fillDate: '2025-11-15',
        daysSupply: 30,
      });
      const currentDate = new Date('2025-11-15');
      const result = calculateSupplyOnHand(dispense, currentDate);
      expect(result).toBe(30);
    });

    it('RC-SOH-04: should handle 90-day supply', () => {
      const dispense = createMockDispense({
        fillDate: '2025-10-01',
        daysSupply: 90,
      });
      const currentDate = new Date('2025-11-15');
      const result = calculateSupplyOnHand(dispense, currentDate);
      expect(result).toBe(45); // 90 - 45 days elapsed
    });

    it('RC-SOH-05: should handle one day of supply remaining', () => {
      const dispense = createMockDispense({
        fillDate: '2025-11-01',
        daysSupply: 30,
      });
      const currentDate = new Date('2025-11-30');
      const result = calculateSupplyOnHand(dispense, currentDate);
      expect(result).toBe(1); // 30 - 29 days elapsed
    });
  });

  describe('Edge cases (RC-SOH-EDGE)', () => {
    it('RC-SOH-EDGE-01: should return 0 when dispense has no whenHandedOver', () => {
      const dispense = createMockDispense({
        fillDate: '2025-11-01',
        daysSupply: 30,
      });
      // Remove whenHandedOver
      delete (dispense as Record<string, unknown>).whenHandedOver;

      const currentDate = new Date('2025-11-15');
      const result = calculateSupplyOnHand(dispense, currentDate);
      expect(result).toBe(0);
    });

    it('RC-SOH-EDGE-02: should use default days supply when not specified', () => {
      const dispense = createMockDispense({
        fillDate: '2025-11-01',
      });
      // Remove daysSupply
      delete (dispense as Record<string, unknown>).daysSupply;

      const currentDate = new Date('2025-11-15');
      const result = calculateSupplyOnHand(dispense, currentDate);
      // Default is 30, elapsed is 14, remaining is 16
      expect(result).toBe(16);
    });

    it('RC-SOH-EDGE-03: should never return negative values', () => {
      const dispense = createMockDispense({
        fillDate: '2025-01-01',
        daysSupply: 30,
      });
      const currentDate = new Date('2025-12-31');
      const result = calculateSupplyOnHand(dispense, currentDate);
      expect(result).toBe(0);
    });
  });
});

// =============================================================================
// calculateDaysToYearEnd Tests
// =============================================================================

describe('calculateDaysToYearEnd', () => {
  it('RC-DYE-01: should calculate days from mid-year', () => {
    const result = calculateDaysToYearEnd(new Date('2025-07-01'));
    expect(result).toBe(183); // July 1 to Dec 31
  });

  it('RC-DYE-02: should return 0 on Dec 31', () => {
    const result = calculateDaysToYearEnd(new Date('2025-12-31'));
    expect(result).toBe(0);
  });

  it('RC-DYE-03: should return 364 on Jan 1 (non-leap year)', () => {
    const result = calculateDaysToYearEnd(new Date('2025-01-01'));
    expect(result).toBe(364); // Jan 1 to Dec 31
  });

  it('RC-DYE-04: should handle November date (Q4)', () => {
    const result = calculateDaysToYearEnd(new Date('2025-11-15'));
    expect(result).toBe(46); // Nov 15 to Dec 31
  });

  it('RC-DYE-05: should handle December 1st', () => {
    const result = calculateDaysToYearEnd(new Date('2025-12-01'));
    expect(result).toBe(30); // Dec 1 to Dec 31
  });

  it('RC-DYE-06: should handle leap year', () => {
    const result = calculateDaysToYearEnd(new Date('2024-01-01'));
    expect(result).toBe(365); // Jan 1 to Dec 31 (leap year has 366 days)
  });

  it('RC-DYE-07: should handle October 1st (start of Q4)', () => {
    const result = calculateDaysToYearEnd(new Date('2025-10-01'));
    expect(result).toBe(91); // Oct 1 to Dec 31
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Refill Calculator Integration', () => {
  it('RC-INT-01: should calculate complete refill scenario', () => {
    // Scenario: Patient filled 30-day supply on Nov 1, today is Nov 15
    // 46 days to year end, 16 days supply remaining
    // Shortfall = 46 - 16 = 30
    // Refills needed = ceil(30/30) = 1

    const dispense = createMockDispense({
      fillDate: '2025-11-01',
      daysSupply: 30,
    });
    const currentDate = new Date('2025-11-15');

    const supplyOnHand = calculateSupplyOnHand(dispense, currentDate);
    expect(supplyOnHand).toBe(16);

    const daysToYearEnd = calculateDaysToYearEnd(currentDate);
    expect(daysToYearEnd).toBe(46);

    const shortfall = calculateCoverageShortfall({
      daysRemainingUntilYearEnd: daysToYearEnd,
      daysOfSupplyOnHand: supplyOnHand,
    });
    expect(shortfall).toBe(30);

    const refillResult = calculateRemainingRefills({
      coverageShortfall: shortfall,
      standardDaysSupply: 30,
      recentFills: [dispense],
    });
    expect(refillResult.remainingRefills).toBe(1);
    expect(refillResult.estimatedDaysPerRefill).toBe(30);
  });

  it('RC-INT-02: should calculate complex 90-day supply scenario', () => {
    // Scenario: Patient on 90-day supply, filled Sep 1, today is Nov 1
    // 61 days elapsed, 29 days remaining supply
    // 60 days to year end
    // Shortfall = 60 - 29 = 31
    // With 90-day supply average: ceil(31/90) = 1 refill

    const recentFills = [
      createMockDispense({ fillDate: '2025-06-01', daysSupply: 90 }),
      createMockDispense({ fillDate: '2025-09-01', daysSupply: 90 }),
    ];
    const currentDate = new Date('2025-11-01');

    const supplyOnHand = calculateSupplyOnHand(recentFills[1], currentDate);
    expect(supplyOnHand).toBe(29); // 90 - 61 = 29

    const daysToYearEnd = calculateDaysToYearEnd(currentDate);
    expect(daysToYearEnd).toBe(60);

    const shortfall = calculateCoverageShortfall({
      daysRemainingUntilYearEnd: daysToYearEnd,
      daysOfSupplyOnHand: supplyOnHand,
    });
    expect(shortfall).toBe(31);

    const refillResult = calculateRemainingRefills({
      coverageShortfall: shortfall,
      recentFills,
    });
    expect(refillResult.estimatedDaysPerRefill).toBe(90);
    expect(refillResult.remainingRefills).toBe(1); // ceil(31/90) = 1
  });
});
