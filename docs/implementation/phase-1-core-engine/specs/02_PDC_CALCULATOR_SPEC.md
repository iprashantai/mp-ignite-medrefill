# PDC Calculator Specification

## Overview

This document specifies the FHIR-native PDC (Proportion of Days Covered) calculation engine that computes medication adherence metrics using MedicationDispense resources.

**Business Logic Source**: `legacy/src/services/pdcDataService.js` (calculatePDCFromClaims)
**Test Cases Source**: `legacy/src/services/__tests__/goldenStandardTestBed.test.js`
**Infrastructure**: FHIR-native via Medplum SDK (MedicationDispense resources)

> ⚠️ **CRITICAL**: Business logic is ported EXACTLY from legacy code. Do not modify formulas or algorithms without updating both this spec and the legacy Golden Standard.

---

## Module: `src/lib/pdc/`

### Files to Create

| File            | Purpose                    | Priority |
| --------------- | -------------------------- | -------- |
| `types.ts`      | Zod schemas for PDC types  | P0       |
| `constants.ts`  | Golden Standard thresholds | P0       |
| `calculator.ts` | Core PDC calculation       | P0       |
| `index.ts`      | Barrel export              | P0       |

---

## 1. Types (`types.ts`)

### PDC Result Schema

```typescript
import { z } from 'zod';

/**
 * PDC Calculation Result
 * Contains all metrics needed for display and fragility tier calculation
 */
export const PDCResultSchema = z.object({
  // Core PDC Metrics
  pdc: z.number().min(0).max(100),
  coveredDays: z.number().min(0),
  treatmentDays: z.number().positive(),

  // Gap Days
  gapDaysUsed: z.number().min(0),
  gapDaysAllowed: z.number().min(0),
  gapDaysRemaining: z.number(), // Can be negative

  // Projections
  pdcStatusQuo: z.number().min(0).max(100),
  pdcPerfect: z.number().min(0).max(100),

  // Measurement Period
  measurementPeriod: z.object({
    start: z.string(), // ISO date
    end: z.string(), // ISO date
  }),

  // Current State
  daysToRunout: z.number(),
  currentSupply: z.number().min(0),
  refillsNeeded: z.number().min(0),

  // Metadata
  lastFillDate: z.string().nullable(),
  fillCount: z.number().min(0),
});

export type PDCResult = z.infer<typeof PDCResultSchema>;
```

### Calculation Input Schema

```typescript
/**
 * Input for PDC calculation
 * Derived from MedicationDispense resources
 */
export const PDCInputSchema = z.object({
  fills: z.array(
    z.object({
      date: z.string(), // ISO date string (whenHandedOver)
      daysSupply: z.number().positive(),
    })
  ),
  measurementPeriod: z.object({
    start: z.string(), // ISO date (first fill date or Jan 1)
    end: z.string(), // ISO date (Dec 31)
  }),
  currentDate: z.string(), // ISO date for projection calculations
});

export type PDCInput = z.infer<typeof PDCInputSchema>;
```

### Coverage Interval Schema

```typescript
/**
 * Internal type for interval merging algorithm
 */
export const CoverageIntervalSchema = z.object({
  start: z.number(), // Unix timestamp
  end: z.number(), // Unix timestamp
});

export type CoverageInterval = z.infer<typeof CoverageIntervalSchema>;
```

---

## 2. Constants (`constants.ts`)

### Golden Standard Thresholds

```typescript
/**
 * HEDIS MY2025 PDC Thresholds
 * Source: MetricsReference.jsx (Golden Standard)
 */
export const PDC_THRESHOLDS = {
  ADHERENT: 80, // >= 80% is adherent/passing
  AT_RISK: 60, // >= 60% and < 80% is at-risk
  NON_ADHERENT: 0, // < 60% is non-adherent/failing
} as const;

/**
 * Gap Days Allowed Percentage
 * Maximum allowable gap is 20% of treatment period
 */
export const GAP_DAYS_ALLOWED_PERCENTAGE = 0.2;

/**
 * Default Days Supply
 * Used when dispense doesn't specify days supply
 */
export const DEFAULT_DAYS_SUPPLY = 30;

/**
 * Measurement Year Constants
 */
export const MEASUREMENT_YEAR = {
  START_MONTH: 0, // January (0-indexed)
  START_DAY: 1,
  END_MONTH: 11, // December (0-indexed)
  END_DAY: 31,
} as const;
```

---

## 3. Calculator (`calculator.ts`)

### Core Function: `calculatePDC`

```typescript
import { MedicationDispense } from '@medplum/fhirtypes';
import { PDCResult, PDCInput } from './types';
import { extractFillDate, extractDaysSupply } from '../fhir/helpers';

/**
 * Calculate PDC from MedicationDispense resources
 *
 * This is the main entry point for PDC calculation.
 * Accepts FHIR MedicationDispense resources and returns a complete PDCResult.
 *
 * @param dispenses - Array of MedicationDispense resources (completed status only)
 * @param measurementYear - Calendar year for measurement (e.g., 2025)
 * @param currentDate - Current date for projection calculations (default: today)
 * @returns Complete PDC result with all metrics
 *
 * @example
 * const dispenses = await getPatientDispenses(medplum, patientId, 2025);
 * const result = calculatePDC(dispenses, 2025);
 * console.log(result.pdc); // 85.2
 *
 * @see test_cases_batch_6_calculations.json for test cases
 */
export function calculatePDC(
  dispenses: MedicationDispense[],
  measurementYear: number,
  currentDate: Date = new Date()
): PDCResult;
```

### Internal Function: `transformDispensesToInput`

```typescript
/**
 * Transform MedicationDispense resources to calculator input format
 *
 * @internal
 */
function transformDispensesToInput(
  dispenses: MedicationDispense[],
  measurementYear: number,
  currentDate: Date
): PDCInput;
```

### Core Algorithm: `calculateFromInput`

```typescript
/**
 * Calculate PDC from normalized input
 * This is the pure function that performs the actual calculation.
 *
 * @internal
 */
function calculateFromInput(input: PDCInput): PDCResult;
```

---

## 4. Interval Merging Algorithm (LEGACY PORT)

### Function: `calculateCoveredDaysFromFills`

**Critical**: This implements the EXACT algorithm from `legacy/pdcDataService.js` lines 129-148.

The legacy algorithm uses a **running currentCoveredUntil** pointer rather than interval objects.

```typescript
/**
 * Calculate covered days from fills using legacy algorithm
 * FROM: legacy/pdcDataService.js lines 126-151
 *
 * HEDIS requires that each day is counted at most once, even if
 * multiple prescriptions cover the same day.
 *
 * Algorithm (EXACT from legacy):
 * 1. Sort fills by date ascending
 * 2. Track currentCoveredUntil date
 * 3. For each fill:
 *    - If fill starts after currentCoveredUntil: add full days supply
 *    - If fill extends beyond currentCoveredUntil: add only extension days
 *    - If fill is fully within currentCoveredUntil: add 0 days
 * 4. Cap total at treatment period
 *
 * @param fills - Array of {date, daysSupply} sorted by date
 * @param treatmentPeriodEnd - End of treatment period (usually Dec 31 or today)
 * @returns Total covered days
 *
 * @see F063 in test_cases_batch_6_calculations.json
 * @see MERGE-01 to MERGE-04 in golden-standard-tests.json
 */
export function calculateCoveredDaysFromFills(
  fills: Array<{ date: Date; daysSupply: number }>,
  treatmentPeriodEnd: Date
): number;
```

### Legacy Algorithm Implementation (EXACT PORT)

```typescript
/**
 * EXACT PORT from legacy/pdcDataService.js lines 126-151
 * DO NOT MODIFY without updating legacy Golden Standard
 */
function calculateCoveredDaysFromFills(
  fills: Array<{ date: Date; daysSupply: number }>,
  treatmentPeriodEnd: Date
): number {
  if (fills.length === 0) return 0;

  // Sort by fill date (legacy uses Rx_Date_Of_Service)
  const sortedFills = [...fills].sort((a, b) => a.date.getTime() - b.date.getTime());

  let coveredDays = 0;
  let currentCoveredUntil = sortedFills[0].date;

  for (const fill of sortedFills) {
    const fillDate = fill.date;
    const daysSupply = fill.daysSupply;

    if (daysSupply > 0) {
      // Calculate when this fill's coverage ends
      const fillEndDate = new Date(fillDate.getTime() + daysSupply * 24 * 60 * 60 * 1000);

      if (fillDate > currentCoveredUntil) {
        // No overlap - add full days supply
        // FROM: legacy line 136-139
        coveredDays += daysSupply;
        currentCoveredUntil = fillEndDate;
      } else if (fillEndDate > currentCoveredUntil) {
        // Partial overlap - only count days beyond current coverage
        // FROM: legacy lines 140-144
        const additionalDays = Math.floor(
          (fillEndDate.getTime() - currentCoveredUntil.getTime()) / (1000 * 60 * 60 * 24)
        );
        coveredDays += additionalDays;
        currentCoveredUntil = fillEndDate;
      }
      // Else: completely overlapped (fillEndDate <= currentCoveredUntil)
      // FROM: legacy line 146: don't add any days
    }
  }

  // Cap covered days at treatment period
  // FROM: legacy line 151: Math.min(coveredDays, treatmentDays)
  const treatmentDays =
    Math.floor(
      (treatmentPeriodEnd.getTime() - sortedFills[0].date.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  return Math.min(coveredDays, treatmentDays);
}
```

### Test Cases (F063: Coverage Period Merging)

| ID        | Scenario                 | Input                         | Expected              |
| --------- | ------------------------ | ----------------------------- | --------------------- |
| F063-TC01 | Non-overlapping fills    | Jan 1-30, Feb 1-28            | 58 days               |
| F063-TC02 | Overlapping fills merged | Jan 1-30, Jan 15-44           | 44 days               |
| F063-TC03 | Fully overlapping fill   | Jan 1-60, Jan 15-30           | 60 days               |
| F063-TC04 | Cap at Dec 31            | Dec 1 (90 day supply)         | 31 days               |
| F063-TC05 | Multiple overlaps        | 5 fills with various overlaps | Each day counted once |

### Additional Legacy Test Cases

From `golden-standard-tests.json` (MERGE-\* tests):

| ID       | Input                                    | Expected                 |
| -------- | ---------------------------------------- | ------------------------ |
| MERGE-01 | Jan 1-30, Feb 1-28 (non-overlapping)     | 58 days                  |
| MERGE-02 | Jan 1-30, Jan 15-Feb 13 (overlapping)    | 44 days                  |
| MERGE-03 | Jan 1-Mar 1, Jan 15-29 (fully contained) | 60 days                  |
| MERGE-04 | 5 fills with various overlaps            | 104 days (each day once) |

### Critical Implementation Notes

1. **DO NOT** use interval merging with objects - use running pointer
2. **DO NOT** count the same day twice even with same-day fills
3. **DO** handle gap between fills (fillDate > currentCoveredUntil)
4. **DO** handle partial overlap (fillEndDate > currentCoveredUntil)
5. **DO** cap at treatment period end (Math.min)

---

## 5. Core Calculations

### Function: `calculateCoveredDays`

```typescript
/**
 * Calculate total covered days from merged intervals
 *
 * @param intervals - Merged coverage intervals
 * @returns Total days with medication coverage
 */
function calculateCoveredDays(intervals: CoverageInterval[]): number {
  return intervals.reduce((total, interval) => {
    const days = Math.ceil((interval.end - interval.start) / (1000 * 60 * 60 * 24)) + 1;
    return total + days;
  }, 0);
}
```

### Function: `calculateTreatmentPeriod`

```typescript
/**
 * Calculate treatment period (IPSD to Dec 31)
 *
 * IPSD = Index Prescription Start Date (first fill date)
 *
 * @param firstFillDate - Date of first fill in measurement year
 * @param measurementYear - Calendar year
 * @returns Number of days in treatment period
 *
 * @example
 * // First fill: Jan 15, 2025
 * // Treatment period: Jan 15 to Dec 31 = 351 days
 */
function calculateTreatmentPeriod(firstFillDate: Date, measurementYear: number): number {
  const yearEnd = new Date(measurementYear, 11, 31); // Dec 31
  const diffMs = yearEnd.getTime() - firstFillDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
}
```

### Function: `calculateGapDays`

```typescript
/**
 * Calculate gap day metrics
 *
 * Formulas (Golden Standard):
 * - Gap Days Used = Treatment Period - Covered Days
 * - Gap Days Allowed = Treatment Period × 20%
 * - Gap Days Remaining = Allowed - Used
 *
 * @param treatmentDays - Total days in treatment period
 * @param coveredDays - Total days with coverage
 * @returns Gap day metrics
 *
 * @see TC-GS-005 to TC-GS-008
 */
function calculateGapDays(
  treatmentDays: number,
  coveredDays: number
): {
  gapDaysUsed: number;
  gapDaysAllowed: number;
  gapDaysRemaining: number;
} {
  const gapDaysUsed = treatmentDays - coveredDays;
  const gapDaysAllowed = Math.floor(treatmentDays * GAP_DAYS_ALLOWED_PERCENTAGE);
  const gapDaysRemaining = gapDaysAllowed - gapDaysUsed;

  return { gapDaysUsed, gapDaysAllowed, gapDaysRemaining };
}
```

### Test Cases (F056: Gap Days Calculation)

| ID        | Input                      | Expected                       |
| --------- | -------------------------- | ------------------------------ |
| F056-TC01 | treatment=365, covered=292 | used=73                        |
| F056-TC02 | treatment=365              | allowed=73                     |
| F056-TC03 | allowed=73, used=73        | remaining=0                    |
| F056-TC04 | allowed=73, used=100       | remaining=-27                  |
| F056-TC05 | treatment=30, covered=24   | used=6, allowed=6, remaining=0 |

---

## 6. Projection Calculations

### Function: `calculatePDCStatusQuo`

```typescript
/**
 * Calculate PDC Status Quo projection
 *
 * Formula (Golden Standard):
 * PDC_StatusQuo = (Covered Days + min(Current Supply, Days to Year End)) / Treatment Period
 *
 * This projects PDC assuming no more refills beyond current supply.
 *
 * @param coveredDays - Current covered days
 * @param currentSupply - Days of supply remaining
 * @param daysToYearEnd - Days until Dec 31
 * @param treatmentDays - Total treatment period
 * @returns Projected PDC percentage
 *
 * @see F061: PDC Status Quo calculation
 * @see TC-GS-017
 */
function calculatePDCStatusQuo(
  coveredDays: number,
  currentSupply: number,
  daysToYearEnd: number,
  treatmentDays: number
): number {
  // Supply capped at days to year end
  const additionalDays = Math.min(currentSupply, daysToYearEnd);
  const projectedCovered = coveredDays + additionalDays;
  return Math.min((projectedCovered / treatmentDays) * 100, 100);
}
```

### Test Cases (F061: PDC Status Quo)

| ID        | Input                                             | Expected                     |
| --------- | ------------------------------------------------- | ---------------------------- |
| F061-TC01 | covered=290, supply=30, daysEnd=10, treatment=365 | 82.2%                        |
| F061-TC02 | statusQuo >= 80%                                  | Patient is COMP              |
| F061-TC03 | supply=90, daysEnd=15                             | Uses 15 days (not 90)        |
| F061-TC04 | statusQuo = 75%                                   | Patient needs intervention   |
| F061-TC05 | today=Dec 31, daysEnd=0                           | No additional supply counted |

### Function: `calculatePDCPerfect`

```typescript
/**
 * Calculate PDC Perfect projection
 *
 * Formula (Golden Standard):
 * PDC_Perfect = (Covered Days + Days to Year End) / Treatment Period
 *
 * This projects PDC assuming perfect adherence from now until year end.
 * If PDC_Perfect < 80%, patient is T5 (unsalvageable).
 *
 * @param coveredDays - Current covered days
 * @param daysToYearEnd - Days until Dec 31
 * @param treatmentDays - Total treatment period
 * @returns Projected PDC percentage
 *
 * @see F062: PDC Perfect calculation
 * @see TC-GS-018
 */
function calculatePDCPerfect(
  coveredDays: number,
  daysToYearEnd: number,
  treatmentDays: number
): number {
  const projectedCovered = coveredDays + daysToYearEnd;
  return Math.min((projectedCovered / treatmentDays) * 100, 100);
}
```

### Test Cases (F062: PDC Perfect)

| ID        | Input                                  | Expected                     |
| --------- | -------------------------------------- | ---------------------------- |
| F062-TC01 | covered=260, daysEnd=60, treatment=365 | 87.7%                        |
| F062-TC02 | perfect = 75%                          | Patient is T5                |
| F062-TC03 | perfect = 82%                          | Patient can reach compliance |
| F062-TC04 | covered=200, daysEnd=30, treatment=365 | 63% (unsalvageable)          |
| F062-TC05 | covered=30, daysEnd=300, treatment=365 | 90% (salvageable)            |

---

## 7. Days to Runout Calculation

### Function: `calculateDaysToRunout`

```typescript
/**
 * Calculate days until patient runs out of medication
 *
 * Formula:
 * Days to Runout = (Last Fill Date + Days Supply) - Current Date
 *
 * Negative values indicate patient is already out of medication.
 *
 * @param lastFillDate - Date of most recent fill
 * @param daysSupply - Days supply from last fill
 * @param currentDate - Current date
 * @returns Days until runout (can be negative)
 *
 * @see F057: Days to runout calculation
 */
function calculateDaysToRunout(lastFillDate: Date, daysSupply: number, currentDate: Date): number {
  const runoutDate = addDays(lastFillDate, daysSupply);
  const diffMs = runoutDate.getTime() - currentDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
```

### Test Cases (F057: Days to Runout)

| ID        | Input                                    | Expected           |
| --------- | ---------------------------------------- | ------------------ |
| F057-TC01 | lastFill=Dec 15, supply=30, today=Dec 25 | 20                 |
| F057-TC02 | lastFill=Dec 1, supply=15, today=Dec 25  | -9 (already out)   |
| F057-TC03 | lastFill=Dec 1, supply=24, today=Dec 25  | 0 (runs out today) |
| F057-TC04 | lastFill=Oct 1, supply=90, today=Dec 1   | 30                 |
| F057-TC05 | lastFill=null                            | null or N/A        |

---

## 8. Refills Needed Calculation

### Function: `calculateRefillsNeeded`

```typescript
/**
 * Calculate refills needed to reach year end
 *
 * Formula:
 * Refills Needed = ceil((Days to Year End - Current Supply) / Typical Days Supply)
 *
 * @param daysToYearEnd - Days until Dec 31
 * @param currentSupply - Days of supply remaining
 * @param typicalDaysSupply - Typical prescription days supply (usually 30)
 * @returns Number of refills needed (minimum 0)
 *
 * @see F064: Refills needed calculation
 */
function calculateRefillsNeeded(
  daysToYearEnd: number,
  currentSupply: number,
  typicalDaysSupply: number = 30
): number {
  if (currentSupply >= daysToYearEnd) return 0;
  const daysNeeded = daysToYearEnd - currentSupply;
  return Math.ceil(daysNeeded / typicalDaysSupply);
}
```

### Test Cases (F064: Refills Needed)

| ID        | Input                             | Expected       |
| --------- | --------------------------------- | -------------- |
| F064-TC01 | daysEnd=90, supply=30, typical=30 | 2              |
| F064-TC02 | daysEnd=30, supply=45             | 0              |
| F064-TC03 | daysEnd=180, supply=0, typical=90 | 2              |
| F064-TC04 | daysEnd=100, supply=0, typical=30 | 4 (rounded up) |
| F064-TC05 | daysEnd=5, supply=0               | 1 (at least 1) |

---

## 9. Complete PDC Calculation Test Cases

### Golden Standard (TC-GS-\*)

| ID        | Description        | Input                      | Expected      |
| --------- | ------------------ | -------------------------- | ------------- |
| TC-GS-001 | Basic PDC          | covered=292, treatment=365 | PDC=80%       |
| TC-GS-002 | 100% cap           | covered=400, treatment=365 | PDC=100%      |
| TC-GS-003 | 0% edge            | covered=0, treatment=365   | PDC=0%        |
| TC-GS-004 | Treatment period   | First fill Jan 15          | 351 days      |
| TC-GS-005 | Gap used           | treatment=365, covered=290 | used=75       |
| TC-GS-006 | Gap allowed        | treatment=365              | allowed=73    |
| TC-GS-007 | Gap remaining      | allowed=73, used=60        | remaining=13  |
| TC-GS-008 | Negative remaining | allowed=73, used=100       | remaining=-27 |

### Feature Test Cases (F055)

| ID        | Description       | Input                           | Expected |
| --------- | ----------------- | ------------------------------- | -------- |
| F055-TC01 | Basic PDC         | covered=292, treatment=365      | 80%      |
| F055-TC02 | Treatment period  | First fill Jan 15               | 351 days |
| F055-TC03 | Overlapping fills | Fill1 Jan 1-30, Fill2 Jan 15-44 | 44 days  |
| F055-TC04 | 100% cap          | covered=400                     | 100%     |
| F055-TC05 | 0% edge           | covered=0                       | 0%       |

---

## 10. Usage Example

```typescript
import { calculatePDC } from '@/lib/pdc';
import { getPatientDispenses } from '@/lib/fhir/dispense-service';

// Fetch dispenses from Medplum
const dispenses = await getPatientDispenses(medplum, patientId, 2025);

// Calculate PDC
const result = calculatePDC(dispenses, 2025);

console.log({
  pdc: result.pdc, // 72.1%
  gapDaysRemaining: result.gapDaysRemaining, // 2 days
  pdcStatusQuo: result.pdcStatusQuo, // 83.6%
  pdcPerfect: result.pdcPerfect, // 87.7%
  daysToRunout: result.daysToRunout, // -3 (out of meds)
});

// Result can be used for fragility tier calculation
import { calculateFragility } from '@/lib/pdc/fragility';
const fragility = calculateFragility(result, {
  refillsRemaining: 2,
  measureTypes: ['MAH'],
  isNewPatient: false,
  currentDate: new Date(),
});
```

---

## 11. Edge Cases to Handle

| Scenario               | Handling                                   |
| ---------------------- | ------------------------------------------ |
| No dispenses           | Return null or throw                       |
| Single dispense        | Treatment period = dispense date to Dec 31 |
| All reversed dispenses | Treat as no dispenses                      |
| Future fill dates      | Filter out or throw                        |
| Dispenses before Jan 1 | Filter out                                 |
| 0 days supply          | Use DEFAULT_DAYS_SUPPLY (30)               |
| Missing dates          | Skip dispense, log warning                 |
