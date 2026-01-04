/**
 * PDC Calculator Tests
 *
 * Tests for the PDC (Proportion of Days Covered) calculation engine.
 * Test cases derived from golden-standard-tests.json and 02_PDC_CALCULATOR_SPEC.md.
 *
 * @see docs/implementation/phase-1-core-engine/specs/02_PDC_CALCULATOR_SPEC.md
 * @see docs/implementation/phase-1-core-engine/test-cases/golden-standard-tests.json
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCoveredDaysFromFills,
  calculatePDC,
  calculateGapDays,
  calculateTreatmentPeriod,
  calculatePDCStatusQuo,
  calculatePDCPerfect,
  calculateDaysToRunout,
  calculateRefillsNeeded,
  calculateCurrentSupply,
  transformDispensesToInput,
} from '../calculator';
import type { FillRecord, PDCInput } from '../types';
import { createMockDispense } from '../../fhir/__tests__/fixtures/mock-medplum';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a fill record for testing.
 */
function createFillRecord(dateStr: string, daysSupply: number): FillRecord {
  return {
    fillDate: new Date(dateStr),
    daysSupply,
  };
}

/**
 * Create a date from string.
 */
function toDate(dateStr: string): Date {
  return new Date(dateStr);
}

// =============================================================================
// calculateCoveredDaysFromFills Tests
// =============================================================================

describe('calculateCoveredDaysFromFills', () => {
  describe('Non-overlapping fills (MERGE-01)', () => {
    it('should count all days for non-overlapping fills', () => {
      // Jan 1-30 (30 days) + Feb 1-28 (28 days) = 58 days
      const fills: FillRecord[] = [
        createFillRecord('2025-01-01', 30),
        createFillRecord('2025-02-01', 28),
      ];
      const treatmentEnd = toDate('2025-12-31');

      const result = calculateCoveredDaysFromFills(fills, treatmentEnd);

      expect(result).toBe(58);
    });
  });

  describe('Overlapping fills (MERGE-02)', () => {
    it('should merge overlapping fills correctly', () => {
      // Jan 1-30 (30 days) + Jan 15-Feb 13 (30 days) = Jan 1-Feb 13 = 44 days
      const fills: FillRecord[] = [
        createFillRecord('2025-01-01', 30),
        createFillRecord('2025-01-15', 30),
      ];
      const treatmentEnd = toDate('2025-12-31');

      const result = calculateCoveredDaysFromFills(fills, treatmentEnd);

      expect(result).toBe(44);
    });
  });

  describe('Fully contained fill (MERGE-03)', () => {
    it('should not double-count days for contained fills', () => {
      // Jan 1-Mar 1 (60 days) + Jan 15-29 (15 days inside) = 60 days
      const fills: FillRecord[] = [
        createFillRecord('2025-01-01', 60),
        createFillRecord('2025-01-15', 15),
      ];
      const treatmentEnd = toDate('2025-12-31');

      const result = calculateCoveredDaysFromFills(fills, treatmentEnd);

      expect(result).toBe(60);
    });
  });

  describe('Multiple overlapping fills (MERGE-04)', () => {
    it('should count each day exactly once with multiple overlaps', () => {
      // Complex overlapping scenario from golden standard
      // Jan 1 + 30 = Jan 1-30 (30 days)
      // Jan 15 + 30 = Jan 15-Feb 14 (extends 14 days beyond Jan 31)
      // Feb 1 + 30 = Feb 1-Mar 3 (extends 17 days beyond Feb 14)
      // Feb 20 + 30 = Feb 20-Mar 22 (extends 19 days beyond Mar 3)
      // Mar 15 + 30 = Mar 15-Apr 14 (extends 23 days beyond Mar 22)
      // Total: 30 + 14 + 17 + 19 + 23 = 103 unique days
      const fills: FillRecord[] = [
        createFillRecord('2025-01-01', 30),
        createFillRecord('2025-01-15', 30),
        createFillRecord('2025-02-01', 30),
        createFillRecord('2025-02-20', 30),
        createFillRecord('2025-03-15', 30),
      ];
      const treatmentEnd = toDate('2025-12-31');

      const result = calculateCoveredDaysFromFills(fills, treatmentEnd);

      expect(result).toBe(103);
    });
  });

  describe('Cap at treatment period end', () => {
    it('should cap covered days at Dec 31', () => {
      // Dec 1 + 90 days would go past Dec 31
      const fills: FillRecord[] = [createFillRecord('2025-12-01', 90)];
      const treatmentEnd = toDate('2025-12-31');

      const result = calculateCoveredDaysFromFills(fills, treatmentEnd);

      expect(result).toBe(31); // Dec 1-31 = 31 days
    });
  });

  describe('Empty fills', () => {
    it('should return 0 for empty fills array', () => {
      const fills: FillRecord[] = [];
      const treatmentEnd = toDate('2025-12-31');

      const result = calculateCoveredDaysFromFills(fills, treatmentEnd);

      expect(result).toBe(0);
    });
  });

  describe('Single fill', () => {
    it('should handle single fill correctly', () => {
      const fills: FillRecord[] = [createFillRecord('2025-01-15', 30)];
      const treatmentEnd = toDate('2025-12-31');

      const result = calculateCoveredDaysFromFills(fills, treatmentEnd);

      expect(result).toBe(30);
    });
  });

  describe('Same-day fills', () => {
    it('should not double-count same-day fills', () => {
      // Two 30-day fills on same day = 30 days, not 60
      const fills: FillRecord[] = [
        createFillRecord('2025-01-01', 30),
        createFillRecord('2025-01-01', 30),
      ];
      const treatmentEnd = toDate('2025-12-31');

      const result = calculateCoveredDaysFromFills(fills, treatmentEnd);

      expect(result).toBe(30);
    });
  });

  describe('Unsorted fills', () => {
    it('should handle unsorted fills correctly', () => {
      // Fills not in order - should be sorted internally
      const fills: FillRecord[] = [
        createFillRecord('2025-02-01', 28),
        createFillRecord('2025-01-01', 30),
      ];
      const treatmentEnd = toDate('2025-12-31');

      const result = calculateCoveredDaysFromFills(fills, treatmentEnd);

      expect(result).toBe(58);
    });
  });
});

// =============================================================================
// calculateTreatmentPeriod Tests
// =============================================================================

describe('calculateTreatmentPeriod', () => {
  it('should calculate treatment period from first fill to Dec 31 (TC-GS-004)', () => {
    // First fill Jan 15 to Dec 31 = 351 days
    const firstFillDate = toDate('2025-01-15');
    const measurementYear = 2025;

    const result = calculateTreatmentPeriod(firstFillDate, measurementYear);

    expect(result).toBe(351);
  });

  it('should calculate treatment period for Jan 1 start', () => {
    // Jan 1 to Dec 31 = 365 days
    const firstFillDate = toDate('2025-01-01');
    const measurementYear = 2025;

    const result = calculateTreatmentPeriod(firstFillDate, measurementYear);

    expect(result).toBe(365);
  });

  it('should calculate treatment period for late year start', () => {
    // Dec 1 to Dec 31 = 31 days
    const firstFillDate = toDate('2025-12-01');
    const measurementYear = 2025;

    const result = calculateTreatmentPeriod(firstFillDate, measurementYear);

    expect(result).toBe(31);
  });

  it('should handle leap year', () => {
    // Jan 1, 2024 to Dec 31, 2024 = 366 days
    const firstFillDate = toDate('2024-01-01');
    const measurementYear = 2024;

    const result = calculateTreatmentPeriod(firstFillDate, measurementYear);

    expect(result).toBe(366);
  });
});

// =============================================================================
// calculateGapDays Tests
// =============================================================================

describe('calculateGapDays', () => {
  describe('Gap Days Used (GAP-01)', () => {
    it('should calculate gap days used correctly', () => {
      const result = calculateGapDays(300, 250);

      expect(result.gapDaysUsed).toBe(50);
    });
  });

  describe('Gap Days Allowed (GAP-02)', () => {
    it('should calculate gap days allowed as 20% of treatment period', () => {
      const result = calculateGapDays(365, 292);

      expect(result.gapDaysAllowed).toBe(73); // floor(365 × 0.20) = 73
    });

    it('should floor the result', () => {
      const result = calculateGapDays(100, 80);

      expect(result.gapDaysAllowed).toBe(20); // floor(100 × 0.20) = 20
    });
  });

  describe('Gap Days Remaining', () => {
    it('should calculate positive remaining when under budget (TC-GS-007)', () => {
      // 365 treatment, 305 covered → 60 used, 73 allowed → 13 remaining
      const result = calculateGapDays(365, 305);

      expect(result.gapDaysRemaining).toBe(13);
    });

    it('should calculate zero remaining at exactly budget', () => {
      // 365 treatment, 292 covered → 73 used, 73 allowed → 0 remaining
      const result = calculateGapDays(365, 292);

      expect(result.gapDaysRemaining).toBe(0);
    });

    it('should calculate negative remaining when over budget (TC-GS-008)', () => {
      // 365 treatment, 265 covered → 100 used, 73 allowed → -27 remaining
      const result = calculateGapDays(365, 265);

      expect(result.gapDaysRemaining).toBe(-27);
    });
  });

  describe('Edge cases', () => {
    it('should handle full coverage (0 gap days)', () => {
      const result = calculateGapDays(365, 365);

      expect(result.gapDaysUsed).toBe(0);
      expect(result.gapDaysRemaining).toBe(73);
    });

    it('should handle zero coverage', () => {
      const result = calculateGapDays(365, 0);

      expect(result.gapDaysUsed).toBe(365);
      expect(result.gapDaysRemaining).toBe(-292); // 73 - 365 = -292
    });

    it('should handle small treatment period (F056-TC05)', () => {
      // 30 treatment, 24 covered → 6 used, 6 allowed → 0 remaining
      const result = calculateGapDays(30, 24);

      expect(result.gapDaysUsed).toBe(6);
      expect(result.gapDaysAllowed).toBe(6);
      expect(result.gapDaysRemaining).toBe(0);
    });
  });
});

// =============================================================================
// calculatePDCStatusQuo Tests
// =============================================================================

describe('calculatePDCStatusQuo', () => {
  it('should calculate status quo projection (PDC-PROJ-01)', () => {
    // (292 + min(30, 30)) / 365 × 100 = 322/365 = 88.2%
    const result = calculatePDCStatusQuo(292, 30, 30, 365);

    expect(result).toBeCloseTo(88.2, 1);
  });

  it('should use min of supply and days remaining (PDC-PROJ-03)', () => {
    // (300 + min(60, 30)) / 365 × 100 = 330/365 = 90.4%
    const result = calculatePDCStatusQuo(300, 60, 30, 365);

    expect(result).toBeCloseTo(90.4, 1);
  });

  it('should cap at 100%', () => {
    const result = calculatePDCStatusQuo(350, 30, 30, 365);

    expect(result).toBe(100);
  });

  it('should handle zero days remaining', () => {
    // (290 + min(30, 0)) / 365 = 290/365 = 79.5%
    const result = calculatePDCStatusQuo(290, 30, 0, 365);

    expect(result).toBeCloseTo(79.45, 1);
  });

  it('should handle zero current supply', () => {
    // (290 + min(0, 30)) / 365 = 290/365 = 79.5%
    const result = calculatePDCStatusQuo(290, 0, 30, 365);

    expect(result).toBeCloseTo(79.45, 1);
  });
});

// =============================================================================
// calculatePDCPerfect Tests
// =============================================================================

describe('calculatePDCPerfect', () => {
  it('should calculate perfect projection (PDC-PROJ-02)', () => {
    // (250 + 60) / 365 × 100 = 310/365 = 84.9%
    const result = calculatePDCPerfect(250, 60, 365);

    expect(result).toBeCloseTo(84.9, 1);
  });

  it('should cap at 100%', () => {
    const result = calculatePDCPerfect(350, 30, 365);

    expect(result).toBe(100);
  });

  it('should handle zero days remaining', () => {
    // (290 + 0) / 365 = 79.5%
    const result = calculatePDCPerfect(290, 0, 365);

    expect(result).toBeCloseTo(79.45, 1);
  });

  it('should calculate unsalvageable patient (F062-TC04)', () => {
    // (200 + 30) / 365 = 63% - cannot reach 80%
    const result = calculatePDCPerfect(200, 30, 365);

    expect(result).toBeCloseTo(63.0, 0);
  });

  it('should calculate salvageable patient (F062-TC05)', () => {
    // (30 + 300) / 365 = 90.4%
    const result = calculatePDCPerfect(30, 300, 365);

    expect(result).toBeCloseTo(90.4, 1);
  });
});

// =============================================================================
// calculateDaysToRunout Tests
// =============================================================================

describe('calculateDaysToRunout', () => {
  it('should calculate positive days until runout (F057-TC01)', () => {
    // Dec 15 + 30 days = Jan 14, current Dec 25 → 20 days
    const lastFill = toDate('2025-12-15');
    const currentDate = toDate('2025-12-25');

    const result = calculateDaysToRunout(lastFill, 30, currentDate);

    expect(result).toBe(20);
  });

  it('should calculate negative for already out (F057-TC02)', () => {
    // Dec 1 + 15 = Dec 16, current Dec 25 → -9 days
    const lastFill = toDate('2025-12-01');
    const currentDate = toDate('2025-12-25');

    const result = calculateDaysToRunout(lastFill, 15, currentDate);

    expect(result).toBe(-9);
  });

  it('should return 0 when runs out today (F057-TC03)', () => {
    // Dec 1 + 24 = Dec 25, current Dec 25 → 0 days
    const lastFill = toDate('2025-12-01');
    const currentDate = toDate('2025-12-25');

    const result = calculateDaysToRunout(lastFill, 24, currentDate);

    expect(result).toBe(0);
  });

  it('should calculate across month boundary (F057-TC04)', () => {
    // Oct 1 + 90 = Dec 30, current Dec 1 → 29 days
    const lastFill = toDate('2025-10-01');
    const currentDate = toDate('2025-12-01');

    const result = calculateDaysToRunout(lastFill, 90, currentDate);

    expect(result).toBe(29);
  });
});

// =============================================================================
// calculateCurrentSupply Tests
// =============================================================================

describe('calculateCurrentSupply', () => {
  it('should calculate remaining supply when not exhausted', () => {
    // Dec 15 + 30 = Jan 14, current Dec 25 → 20 days of supply
    const lastFill = toDate('2025-12-15');
    const currentDate = toDate('2025-12-25');

    const result = calculateCurrentSupply(lastFill, 30, currentDate);

    expect(result).toBe(20);
  });

  it('should return 0 when supply is exhausted', () => {
    // Dec 1 + 15 = Dec 16, current Dec 25 → 0 (exhausted)
    const lastFill = toDate('2025-12-01');
    const currentDate = toDate('2025-12-25');

    const result = calculateCurrentSupply(lastFill, 15, currentDate);

    expect(result).toBe(0);
  });

  it('should return full supply when just filled', () => {
    const lastFill = toDate('2025-12-25');
    const currentDate = toDate('2025-12-25');

    const result = calculateCurrentSupply(lastFill, 30, currentDate);

    expect(result).toBe(30);
  });
});

// =============================================================================
// calculateRefillsNeeded Tests
// =============================================================================

describe('calculateRefillsNeeded', () => {
  it('should calculate refills needed (F064-TC01)', () => {
    // 90 days to year end, 30 supply, typical 30 → 2 refills
    const result = calculateRefillsNeeded(90, 30, 30);

    expect(result).toBe(2);
  });

  it('should return 0 when supply covers year end (F064-TC02)', () => {
    // 30 days to year end, 45 supply → 0 refills needed
    const result = calculateRefillsNeeded(30, 45, 30);

    expect(result).toBe(0);
  });

  it('should handle 90-day supply (F064-TC03)', () => {
    // 180 days, 0 supply, typical 90 → 2 refills
    const result = calculateRefillsNeeded(180, 0, 90);

    expect(result).toBe(2);
  });

  it('should round up (F064-TC04)', () => {
    // 100 days, 0 supply, typical 30 → 4 refills (ceil(100/30))
    const result = calculateRefillsNeeded(100, 0, 30);

    expect(result).toBe(4);
  });

  it('should return at least 1 when needed (F064-TC05)', () => {
    // 5 days, 0 supply → 1 refill
    const result = calculateRefillsNeeded(5, 0, 30);

    expect(result).toBe(1);
  });

  it('should use default 30-day supply', () => {
    // Without specifying typical, should use 30
    const result = calculateRefillsNeeded(90, 30);

    expect(result).toBe(2);
  });
});

// =============================================================================
// calculatePDC (Integration) Tests
// =============================================================================

describe('calculatePDC', () => {
  describe('Basic PDC calculation (TC-GS-001)', () => {
    it('should calculate 80% PDC for 292 covered days', () => {
      // 292 / 365 × 100 = 80%
      const fills: FillRecord[] = [];
      // Create fills that result in 292 covered days
      // 10 fills of 30 days = 300 days, but we need 292
      // Let's use specific dates to get exactly 292 days
      let currentDate = toDate('2025-01-01');
      for (let i = 0; i < 9; i++) {
        fills.push({
          fillDate: new Date(currentDate),
          daysSupply: 30,
        });
        currentDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
      fills.push({
        fillDate: new Date(currentDate),
        daysSupply: 22, // 270 + 22 = 292
      });

      const input: PDCInput = {
        fills,
        measurementPeriod: {
          start: toDate('2025-01-01'),
          end: toDate('2025-12-31'),
        },
        currentDate: toDate('2025-12-31'),
      };

      const result = calculatePDC(input);

      expect(result.coveredDays).toBe(292);
      expect(result.pdc).toBeCloseTo(80, 0);
    });
  });

  describe('100% cap (TC-GS-002)', () => {
    it('should cap PDC at 100%', () => {
      // 400 covered days in 365 day period = 100% (capped)
      const fills: FillRecord[] = [];
      // Create overlapping fills that give more than 365 days
      for (let i = 0; i < 15; i++) {
        fills.push({
          fillDate: toDate('2025-01-01'),
          daysSupply: 30,
        });
      }

      const input: PDCInput = {
        fills,
        measurementPeriod: {
          start: toDate('2025-01-01'),
          end: toDate('2025-12-31'),
        },
        currentDate: toDate('2025-12-31'),
      };

      const result = calculatePDC(input);

      expect(result.pdc).toBeLessThanOrEqual(100);
    });
  });

  describe('0% edge (TC-GS-003)', () => {
    it('should handle empty fills gracefully', () => {
      const input: PDCInput = {
        fills: [],
        measurementPeriod: {
          start: toDate('2025-01-01'),
          end: toDate('2025-12-31'),
        },
        currentDate: toDate('2025-12-31'),
      };

      const result = calculatePDC(input);

      expect(result.pdc).toBe(0);
      expect(result.coveredDays).toBe(0);
    });
  });

  describe('Complete result validation', () => {
    it('should return all required fields', () => {
      const fills: FillRecord[] = [
        createFillRecord('2025-01-15', 30),
        createFillRecord('2025-02-15', 30),
      ];

      const input: PDCInput = {
        fills,
        measurementPeriod: {
          start: toDate('2025-01-15'),
          end: toDate('2025-12-31'),
        },
        currentDate: toDate('2025-06-01'),
      };

      const result = calculatePDC(input);

      // Check all required fields exist
      expect(result).toHaveProperty('pdc');
      expect(result).toHaveProperty('coveredDays');
      expect(result).toHaveProperty('treatmentDays');
      expect(result).toHaveProperty('gapDaysUsed');
      expect(result).toHaveProperty('gapDaysAllowed');
      expect(result).toHaveProperty('gapDaysRemaining');
      expect(result).toHaveProperty('pdcStatusQuo');
      expect(result).toHaveProperty('pdcPerfect');
      expect(result).toHaveProperty('measurementPeriod');
      expect(result).toHaveProperty('daysUntilRunout');
      expect(result).toHaveProperty('currentSupply');
      expect(result).toHaveProperty('refillsNeeded');
      expect(result).toHaveProperty('lastFillDate');
      expect(result).toHaveProperty('fillCount');
      expect(result).toHaveProperty('daysToYearEnd');

      // Validate treatment period is 351 days (Jan 15 to Dec 31)
      expect(result.treatmentDays).toBe(351);

      // Validate fill count
      expect(result.fillCount).toBe(2);
    });
  });

  describe('Overlapping fills scenario (F055-TC03)', () => {
    it('should handle overlapping fills in full calculation', () => {
      // Fill1 Jan 1-30, Fill2 Jan 15-44 = 44 covered days
      const fills: FillRecord[] = [
        createFillRecord('2025-01-01', 30),
        createFillRecord('2025-01-15', 30),
      ];

      const input: PDCInput = {
        fills,
        measurementPeriod: {
          start: toDate('2025-01-01'),
          end: toDate('2025-12-31'),
        },
        currentDate: toDate('2025-12-31'),
      };

      const result = calculatePDC(input);

      expect(result.coveredDays).toBe(44);
      expect(result.treatmentDays).toBe(365);
      expect(result.pdc).toBeCloseTo(12.05, 1);
    });
  });
});

// =============================================================================
// transformDispensesToInput Tests
// =============================================================================

describe('transformDispensesToInput', () => {
  it('should transform MedicationDispense array to PDCInput', () => {
    const dispenses = [
      createMockDispense({
        whenHandedOver: '2025-01-15',
        daysSupply: 30,
      }),
      createMockDispense({
        whenHandedOver: '2025-02-15',
        daysSupply: 30,
      }),
    ];

    const result = transformDispensesToInput(dispenses, 2025, toDate('2025-06-01'));

    expect(result.fills).toHaveLength(2);
    expect(result.fills[0].daysSupply).toBe(30);
    expect(result.measurementPeriod.start.getFullYear()).toBe(2025);
    expect(result.measurementPeriod.end.getMonth()).toBe(11); // December
    expect(result.measurementPeriod.end.getDate()).toBe(31);
  });

  it('should use first fill date as period start', () => {
    const dispenses = [
      createMockDispense({
        whenHandedOver: '2025-03-15',
        daysSupply: 30,
      }),
    ];

    const result = transformDispensesToInput(dispenses, 2025, toDate('2025-06-01'));

    expect(result.measurementPeriod.start.getMonth()).toBe(2); // March
    expect(result.measurementPeriod.start.getDate()).toBe(15);
  });

  it('should filter out dispenses without valid dates', () => {
    const dispenses = [
      createMockDispense({
        whenHandedOver: '2025-01-15',
        daysSupply: 30,
      }),
      createMockDispense({
        whenHandedOver: undefined,
        daysSupply: 30,
      }),
    ];

    const result = transformDispensesToInput(dispenses, 2025, toDate('2025-06-01'));

    expect(result.fills).toHaveLength(1);
  });

  it('should use default days supply when not specified', () => {
    const dispenses = [
      createMockDispense({
        whenHandedOver: '2025-01-15',
        daysSupply: undefined,
      }),
    ];

    const result = transformDispensesToInput(dispenses, 2025, toDate('2025-06-01'));

    expect(result.fills[0].daysSupply).toBe(30); // Default
  });
});
