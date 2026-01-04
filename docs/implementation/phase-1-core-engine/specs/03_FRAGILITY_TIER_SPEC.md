# Fragility Tier Specification

## Overview

This document specifies the Fragility Tier calculation service that determines patient urgency and priority scoring based on PDC metrics.

**Business Logic Source**: `legacy/src/services/fragilityTierService.js` (V3.0)
**Test Cases Source**: `legacy/src/services/__tests__/goldenStandardTestBed.test.js`
**Infrastructure**: FHIR-native via Medplum SDK

> ⚠️ **CRITICAL**: Business logic is ported EXACTLY from legacy code. Do not modify formulas or thresholds without updating both this spec and the legacy Golden Standard.

---

## Module: `src/lib/pdc/`

### Files to Create

| File           | Purpose                                  | Priority |
| -------------- | ---------------------------------------- | -------- |
| `types.ts`     | Fragility type schemas (add to existing) | P0       |
| `constants.ts` | Tier thresholds (add to existing)        | P0       |
| `fragility.ts` | Fragility tier calculation               | P0       |

---

## 1. Types (`types.ts`)

### Fragility Tier Enum

```typescript
/**
 * Fragility Tiers
 *
 * Order of evaluation (CRITICAL):
 * 1. COMPLIANT - Check first if PDC Status Quo >= 80%
 * 2. T5_UNSALVAGEABLE - Check if PDC Perfect < 80%
 * 3. F1-F5 - Based on delay budget per refill
 */
export const FragilityTierSchema = z.enum([
  'COMPLIANT', // Already meeting 80% threshold
  'F1_IMMINENT', // Critical - <= 2 days/refill delay budget
  'F2_FRAGILE', // Fragile - 3-5 days/refill delay budget
  'F3_MODERATE', // Moderate - 6-10 days/refill delay budget
  'F4_COMFORTABLE', // Comfortable - 11-20 days/refill delay budget
  'F5_SAFE', // Safe - > 20 days/refill delay budget
  'T5_UNSALVAGEABLE', // Cannot reach 80% even with perfect adherence
]);

export type FragilityTier = z.infer<typeof FragilityTierSchema>;
```

### Urgency Level Enum

```typescript
/**
 * Urgency Levels for display and queue prioritization
 */
export const UrgencyLevelSchema = z.enum([
  'EXTREME', // Priority >= 150
  'HIGH', // Priority >= 100
  'MODERATE', // Priority >= 50
  'LOW', // Priority < 50
]);

export type UrgencyLevel = z.infer<typeof UrgencyLevelSchema>;
```

### Fragility Result Schema

```typescript
/**
 * Complete fragility tier result
 */
export const FragilityResultSchema = z.object({
  // Core Tier Info
  tier: FragilityTierSchema,
  tierLevel: z.number().min(0).max(6), // 0=COMP, 1=F1, ..., 6=T5
  delayBudgetPerRefill: z.number(),

  // Contact Information
  contactWindow: z.string(),
  action: z.string(),

  // Priority Scoring
  priorityScore: z.number().min(0),
  urgencyLevel: UrgencyLevelSchema,

  // Status Flags
  flags: z.object({
    isCompliant: z.boolean(),
    isUnsalvageable: z.boolean(),
    isOutOfMeds: z.boolean(),
    isQ4: z.boolean(),
    isMultipleMA: z.boolean(),
    isNewPatient: z.boolean(),
  }),

  // Bonus Breakdown
  bonuses: z.object({
    base: z.number(),
    outOfMeds: z.number(),
    q4: z.number(),
    multipleMA: z.number(),
    newPatient: z.number(),
  }),
});

export type FragilityResult = z.infer<typeof FragilityResultSchema>;
```

### Fragility Input Schema

```typescript
/**
 * Input for fragility calculation
 */
export const FragilityInputSchema = z.object({
  pdcResult: PDCResultSchema,
  refillsRemaining: z.number().min(0),
  measureTypes: z.array(z.enum(['MAC', 'MAD', 'MAH'])),
  isNewPatient: z.boolean(),
  currentDate: z.date(),
});

export type FragilityInput = z.infer<typeof FragilityInputSchema>;
```

---

## 2. Constants (`constants.ts`)

### Fragility Tier Thresholds

```typescript
/**
 * Fragility Tier Thresholds
 *
 * Based on Delay Budget = Gap Days Remaining / Refills Remaining
 *
 * CRITICAL: Check COMPLIANT and T5 BEFORE checking F1-F5
 */
export const FRAGILITY_THRESHOLDS = {
  // Special tiers (check first)
  COMPLIANT: {
    check: 'pdcStatusQuo >= 80%',
    priority: 1, // Check first
  },
  T5_UNSALVAGEABLE: {
    check: 'pdcPerfect < 80%',
    priority: 2, // Check second
  },

  // Delay budget tiers
  F1_IMMINENT: {
    delayBudgetMin: 0,
    delayBudgetMax: 2,
    contactWindow: '24 hours',
    action: 'Immediate outreach required',
  },
  F2_FRAGILE: {
    delayBudgetMin: 3,
    delayBudgetMax: 5,
    contactWindow: '48 hours',
    action: 'Urgent outreach recommended',
  },
  F3_MODERATE: {
    delayBudgetMin: 6,
    delayBudgetMax: 10,
    contactWindow: '1 week',
    action: 'Standard outreach',
  },
  F4_COMFORTABLE: {
    delayBudgetMin: 11,
    delayBudgetMax: 20,
    contactWindow: '2 weeks',
    action: 'Monitor and schedule',
  },
  F5_SAFE: {
    delayBudgetMin: 21,
    delayBudgetMax: Infinity,
    contactWindow: 'Monthly',
    action: 'Routine monitoring',
  },
} as const;
```

### Priority Base Scores

```typescript
/**
 * Base Priority Scores by Tier
 *
 * Higher score = higher priority for outreach
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
```

### Priority Bonuses

```typescript
/**
 * Priority Bonus Scores
 *
 * Added to base score when conditions are met
 */
export const PRIORITY_BONUSES = {
  OUT_OF_MEDICATION: 30, // daysToRunout <= 0
  Q4: 25, // October, November, December
  MULTIPLE_MA_MEASURES: 15, // Patient on 2+ MA measure types
  NEW_PATIENT: 10, // First fill in last 90 days
} as const;
```

### Urgency Thresholds

```typescript
/**
 * Urgency Level Thresholds
 * FROM: legacy/goldenStandardTestBed.test.js lines 89-94
 */
export const URGENCY_THRESHOLDS = {
  EXTREME: 150, // >= 150
  HIGH: 100, // >= 100 && < 150
  MODERATE: 50, // >= 50 && < 100
  LOW: 0, // < 50
} as const;
```

### Q4 Tightening Thresholds

```typescript
/**
 * Q4 Tightening Rule
 * FROM: legacy/fragilityTierService.js line 302
 *
 * When BOTH conditions are met, promote tier by 1 level:
 * - daysToYearEnd < 60 (less than 60 days to Dec 31)
 * - gapDaysRemaining <= 5 (very tight gap budget)
 */
export const Q4_TIGHTENING = {
  DAYS_TO_YEAR_END_THRESHOLD: 60, // Must be < 60 days
  GAP_DAYS_THRESHOLD: 5, // Must be <= 5 days
} as const;

/**
 * Tier Promotion Map for Q4 Tightening
 * Promotes each tier by 1 level (except COMPLIANT, T5, F1)
 */
export const Q4_TIER_PROMOTION: Partial<Record<FragilityTier, FragilityTier>> = {
  F5_SAFE: 'F4_COMFORTABLE',
  F4_COMFORTABLE: 'F3_MODERATE',
  F3_MODERATE: 'F2_FRAGILE',
  F2_FRAGILE: 'F1_IMMINENT',
  // COMPLIANT, T5_UNSALVAGEABLE, F1_IMMINENT - no promotion
} as const;
```

### Contact Window Mapping

```typescript
/**
 * Contact Window by Tier
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
```

---

## 3. Fragility Calculation (`fragility.ts`)

### Main Function: `calculateFragility`

```typescript
import { PDCResult, FragilityResult, FragilityInput } from './types';

/**
 * Calculate fragility tier and priority score
 *
 * CRITICAL: Tier evaluation order:
 * 1. Check if COMPLIANT (PDC Status Quo >= 80%)
 * 2. Check if T5_UNSALVAGEABLE (PDC Perfect < 80%)
 * 3. Calculate delay budget and assign F1-F5
 *
 * @param input - PDC result and context for calculation
 * @returns Complete fragility result with tier, priority, and flags
 *
 * @example
 * const fragility = calculateFragility({
 *   pdcResult: pdcResult,
 *   refillsRemaining: 2,
 *   measureTypes: ['MAH'],
 *   isNewPatient: false,
 *   currentDate: new Date()
 * });
 *
 * @see TC-PD-017 to TC-PD-025 for tier tests
 * @see TC-GS-009 to TC-GS-025 for calculation tests
 */
export function calculateFragility(input: FragilityInput): FragilityResult;
```

### Function: `determineTier`

```typescript
/**
 * Determine fragility tier based on PDC metrics
 *
 * CRITICAL RULE (from PRD):
 * - COMPLIANT check happens FIRST
 * - Only assign F1-F5 if PDC Status Quo < 80%
 * - Check T5 when PDC Perfect < 80%
 *
 * @param pdcResult - PDC calculation result
 * @param refillsRemaining - Remaining refills on prescription
 * @returns Fragility tier
 *
 * @see TC-PD-022: COMPLIANT check before F1-F5
 * @see TC-GS-015: COMPLIANT before F1-F5
 * @see TC-GS-016: T5 when PDC Perfect < 80%
 */
function determineTier(pdcResult: PDCResult, refillsRemaining: number): FragilityTier {
  // Step 1: Check COMPLIANT first
  if (pdcResult.pdcStatusQuo >= 80) {
    return 'COMPLIANT';
  }

  // Step 2: Check T5 (unsalvageable)
  if (pdcResult.pdcPerfect < 80) {
    return 'T5_UNSALVAGEABLE';
  }

  // Step 3: Calculate delay budget and determine F1-F5
  const delayBudget = calculateDelayBudget(pdcResult.gapDaysRemaining, refillsRemaining);

  return determineTierFromDelayBudget(delayBudget);
}
```

### Function: `calculateDelayBudget`

```typescript
/**
 * Calculate delay budget per refill
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
 * @see TC-GS-010 to TC-GS-014: Tier threshold tests
 */
function calculateDelayBudget(gapDaysRemaining: number, refillsRemaining: number): number {
  // Handle edge cases
  if (refillsRemaining <= 0) {
    return gapDaysRemaining > 0 ? Infinity : -Infinity;
  }

  return gapDaysRemaining / refillsRemaining;
}
```

### Test Cases: Delay Budget (F058)

| ID        | Input                       | Expected            |
| --------- | --------------------------- | ------------------- |
| F058-TC01 | gapRemaining=30, refills=3  | 10 days/refill      |
| F058-TC02 | gapRemaining=6, refills=3   | 2 days/refill (F1)  |
| F058-TC03 | gapRemaining=60, refills=2  | 30 days/refill (F5) |
| F058-TC04 | refills=0                   | Infinity or COMP    |
| F058-TC05 | gapRemaining=-10, refills=2 | -5 (T5)             |

### Function: `determineTierFromDelayBudget`

```typescript
/**
 * Map delay budget to F1-F5 tier
 * FROM: legacy/fragilityTierService.js lines 217-257
 *
 * Thresholds (EXACT from legacy):
 * - F1: <= 2 days/refill
 * - F2: 3-5 days/refill (>2, <=5)
 * - F3: 6-10 days/refill (>5, <=10)
 * - F4: 11-20 days/refill (>10, <=20)
 * - F5: > 20 days/refill
 *
 * @param delayBudget - Days per refill delay budget
 * @returns F1-F5 tier
 */
function determineTierFromDelayBudget(delayBudget: number): FragilityTier {
  if (delayBudget <= 2) return 'F1_IMMINENT';
  if (delayBudget <= 5) return 'F2_FRAGILE';
  if (delayBudget <= 10) return 'F3_MODERATE';
  if (delayBudget <= 20) return 'F4_COMFORTABLE';
  return 'F5_SAFE';
}
```

### Function: `applyQ4Tightening`

```typescript
/**
 * Apply Q4 tightening logic (promote tier if year-end critical)
 * FROM: legacy/fragilityTierService.js lines 293-356
 *
 * CRITICAL RULE:
 * - Only applies when daysToYearEnd < 60 AND gapDaysRemaining <= 5
 * - Promotes tier by 1 level (F5→F4, F4→F3, F3→F2, F2→F1)
 * - Does NOT affect COMPLIANT, T5_UNSALVAGEABLE, or F1_IMMINENT
 *
 * @param fragilityTier - Base tier result from calculateFragilityTier
 * @param daysToYearEnd - Days until Dec 31
 * @param gapDaysRemaining - Gap days remaining in 20% budget
 * @returns Potentially promoted tier with q4Tightened flag
 *
 * @see Q4-01 to Q4-08 in golden-standard-tests.json
 */
export function applyQ4Tightening(
  fragilityTier: FragilityTierResult,
  daysToYearEnd: number,
  gapDaysRemaining: number
): FragilityTierResult {
  // Cannot promote COMPLIANT, UNSALVAGEABLE, or already F1
  if (
    fragilityTier.tier === 'COMPLIANT' ||
    fragilityTier.tier === 'T5_UNSALVAGEABLE' ||
    fragilityTier.tier === 'F1_IMMINENT'
  ) {
    return fragilityTier;
  }

  // Q4 tightening rule: <60 days AND ≤5 gap days
  const isQ4Critical = daysToYearEnd < 60 && gapDaysRemaining <= 5;

  if (!isQ4Critical) {
    return fragilityTier;
  }

  // Get promotion target
  const promotedTier = Q4_TIER_PROMOTION[fragilityTier.tier];

  if (!promotedTier) {
    return fragilityTier;
  }

  // Return promoted tier with Q4_TIGHTENED flag
  return {
    ...fragilityTier,
    tier: promotedTier,
    q4Tightened: true,
    flags: [...(fragilityTier.flags || []), 'Q4_TIGHTENED'],
  };
}
```

### Test Cases: Q4 Tightening

| ID    | Input                                     | Expected                     |
| ----- | ----------------------------------------- | ---------------------------- |
| Q4-01 | baseTier=F3, daysToYearEnd=45, gapDays=4  | F2 (promoted)                |
| Q4-02 | baseTier=F3, daysToYearEnd=60, gapDays=4  | F3 (no change - 60 not < 60) |
| Q4-03 | baseTier=F3, daysToYearEnd=45, gapDays=15 | F3 (no change - 15 > 5)      |
| Q4-04 | baseTier=F2, daysToYearEnd=45, gapDays=4  | F1 (promoted)                |
| Q4-05 | baseTier=F4, daysToYearEnd=45, gapDays=4  | F3 (promoted)                |
| Q4-06 | baseTier=F5, daysToYearEnd=45, gapDays=4  | F4 (promoted)                |
| Q4-07 | baseTier=COMPLIANT                        | COMPLIANT (no change)        |
| Q4-08 | baseTier=T5                               | T5 (no change)               |

### Test Cases: Tier Assignment (F059)

| ID        | Input                    | Expected |
| --------- | ------------------------ | -------- |
| F059-TC01 | pdcStatusQuo >= 80%      | COMP     |
| F059-TC02 | delayBudget <= 2         | F1       |
| F059-TC03 | delayBudget = 4 (3-5)    | F2       |
| F059-TC04 | delayBudget = 8 (6-10)   | F3       |
| F059-TC05 | delayBudget = 15 (11-20) | F4       |
| F059-TC06 | delayBudget = 25 (>20)   | F5       |
| F059-TC07 | pdcPerfect < 80%         | T5       |

---

## 4. Priority Score Calculation

### Function: `calculatePriorityScore`

```typescript
/**
 * Calculate priority score with bonuses
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
 *
 * @see TC-GS-019 to TC-GS-025 for priority tests
 */
function calculatePriorityScore(
  tier: FragilityTier,
  context: {
    daysToRunout: number;
    currentDate: Date;
    measureTypes: string[];
    isNewPatient: boolean;
  }
): {
  priorityScore: number;
  bonuses: FragilityResult['bonuses'];
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

/**
 * Check if date is in Q4 (October, November, December)
 */
function isQ4(date: Date): boolean {
  const month = date.getMonth();
  return month >= 9; // 9=Oct, 10=Nov, 11=Dec
}
```

### Test Cases: Priority Score (F060)

| ID        | Input                 | Expected           |
| --------- | --------------------- | ------------------ |
| F060-TC01 | tier = F1             | base = 100         |
| F060-TC02 | tier = F2             | base = 80          |
| F060-TC03 | daysToRunout <= 0     | +30                |
| F060-TC04 | date = November       | +25                |
| F060-TC05 | MAC and MAD           | +15                |
| F060-TC06 | first fill in 90 days | +10                |
| F060-TC07 | F1 + Out + Q4 + Multi | 100+30+25+15 = 170 |

---

## 5. Urgency Level Determination

### Function: `determineUrgencyLevel`

```typescript
/**
 * Determine urgency level from priority score
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
function determineUrgencyLevel(priorityScore: number): UrgencyLevel {
  if (priorityScore >= URGENCY_THRESHOLDS.EXTREME) return 'EXTREME';
  if (priorityScore >= URGENCY_THRESHOLDS.HIGH) return 'HIGH';
  if (priorityScore >= URGENCY_THRESHOLDS.MODERATE) return 'MODERATE';
  return 'LOW';
}
```

---

## 6. PRD Test Scenarios

### Test Scenario TS-PD-01: F1 Critical + Out of Meds + Q4

```typescript
it('TS-PD-01: F1 Critical + Out of Meds + Q4', () => {
  const input: FragilityInput = {
    pdcResult: {
      pdc: 72.1,
      gapDaysRemaining: 2,
      pdcStatusQuo: 72.1,
      pdcPerfect: 87.7,
      daysToRunout: -3,
      // ... other fields
    },
    refillsRemaining: 2,
    measureTypes: ['MAH'],
    isNewPatient: false,
    currentDate: new Date('2025-10-15'), // Q4
  };

  const result = calculateFragility(input);

  expect(result.tier).toBe('F1_IMMINENT');
  expect(result.delayBudgetPerRefill).toBe(1); // 2 / 2
  expect(result.priorityScore).toBe(155); // 100 + 30 + 25
  expect(result.urgencyLevel).toBe('EXTREME');
  expect(result.bonuses).toEqual({
    base: 100,
    outOfMeds: 30,
    q4: 25,
    multipleMA: 0,
    newPatient: 0,
  });
});
```

### Test Scenario TS-PD-06: COMPLIANT

```typescript
it('TS-PD-06: COMPLIANT - Already Passing', () => {
  const input: FragilityInput = {
    pdcResult: {
      pdc: 85,
      gapDaysRemaining: 18,
      pdcStatusQuo: 82,
      pdcPerfect: 92,
      daysToRunout: 20,
      // ... other fields
    },
    refillsRemaining: 3,
    measureTypes: ['MAC'],
    isNewPatient: false,
    currentDate: new Date('2025-10-15'),
  };

  const result = calculateFragility(input);

  // CRITICAL: Should be COMPLIANT, NOT F3 (despite delay budget = 6)
  expect(result.tier).toBe('COMPLIANT');
  expect(result.priorityScore).toBe(0);
  expect(result.contactWindow).toBe('Monitor only');
});
```

### Test Scenario TS-PD-07: T5 Unsalvageable

```typescript
it('TS-PD-07: T5 Lost - Unsalvageable', () => {
  const input: FragilityInput = {
    pdcResult: {
      pdc: 59.9,
      gapDaysRemaining: -30,
      pdcStatusQuo: 63,
      pdcPerfect: 68.9, // < 80%
      daysToRunout: 30,
      // ... other fields
    },
    refillsRemaining: 3,
    measureTypes: ['MAD'],
    isNewPatient: false,
    currentDate: new Date('2025-12-01'),
  };

  const result = calculateFragility(input);

  expect(result.tier).toBe('T5_UNSALVAGEABLE');
  expect(result.flags.isUnsalvageable).toBe(true);
  expect(result.priorityScore).toBe(0);
  expect(result.contactWindow).toBe('Special handling required');
});
```

---

## 7. Complete Test Matrix

### PRD Test Cases (TC-PD-\*)

| ID        | Description                  | Expected Tier      |
| --------- | ---------------------------- | ------------------ |
| TC-PD-017 | F1 display (delayBudget=1.5) | F1_IMMINENT        |
| TC-PD-018 | F2 display (delayBudget=4)   | F2_FRAGILE         |
| TC-PD-019 | F3 display (delayBudget=8)   | F3_MODERATE        |
| TC-PD-020 | F4 display (delayBudget=15)  | F4_COMFORTABLE     |
| TC-PD-021 | F5 display (delayBudget=25)  | F5_SAFE            |
| TC-PD-022 | COMPLIANT check first        | COMPLIANT (NOT F1) |
| TC-PD-023 | T5 display (pdcPerfect=75%)  | T5_UNSALVAGEABLE   |
| TC-PD-024 | Priority F1+bonuses          | 170                |
| TC-PD-025 | Priority F2 base             | 80                 |

### Golden Standard Tests (TC-GS-\*)

| ID        | Description            | Expected             |
| --------- | ---------------------- | -------------------- |
| TC-GS-009 | Delay budget formula   | 10/2 = 5 days/refill |
| TC-GS-010 | F1 threshold (<=2)     | F1                   |
| TC-GS-011 | F2 threshold (3-5)     | F2                   |
| TC-GS-012 | F3 threshold (6-10)    | F3                   |
| TC-GS-013 | F4 threshold (11-20)   | F4                   |
| TC-GS-014 | F5 threshold (>20)     | F5                   |
| TC-GS-015 | COMPLIANT before F1-F5 | COMP                 |
| TC-GS-016 | T5 when Perfect<80%    | T5                   |
| TC-GS-019 | F1 base score          | 100                  |
| TC-GS-020 | F2 base score          | 80                   |
| TC-GS-021 | Out of Meds bonus      | +30                  |
| TC-GS-022 | Q4 bonus               | +25                  |
| TC-GS-023 | Multiple MA bonus      | +15                  |
| TC-GS-024 | New Patient bonus      | +10                  |
| TC-GS-025 | Combined score         | 170                  |

---

## 8. Usage Example

```typescript
import { calculatePDC } from '@/lib/pdc/calculator';
import { calculateFragility } from '@/lib/pdc/fragility';
import { getPatientDispenses } from '@/lib/fhir/dispense-service';

// 1. Get dispenses
const dispenses = await getPatientDispenses(medplum, patientId, 2025);

// 2. Calculate PDC
const pdcResult = calculatePDC(dispenses, 2025);

// 3. Calculate fragility
const fragilityResult = calculateFragility({
  pdcResult,
  refillsRemaining: medication.refillsRemaining,
  measureTypes: patient.measureTypes, // ['MAC', 'MAH']
  isNewPatient: isNewPatient(patient.firstFillDate),
  currentDate: new Date(),
});

console.log({
  tier: fragilityResult.tier, // 'F1_IMMINENT'
  contactWindow: fragilityResult.contactWindow, // '24 hours'
  priorityScore: fragilityResult.priorityScore, // 155
  urgencyLevel: fragilityResult.urgencyLevel, // 'EXTREME'
  bonuses: fragilityResult.bonuses, // { base: 100, outOfMeds: 30, ... }
});
```
