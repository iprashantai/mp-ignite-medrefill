# Phase 1: Master Implementation Plan

## Executive Summary

**Goal**: Build FHIR-native PDC calculation and fragility tier engine with 100% Golden Standard compliance.

**Duration**: Days 1-5 (Week 1)

**Output**: Production-ready `src/lib/fhir/` and `src/lib/pdc/` modules with full test coverage.

---

## Day-by-Day Implementation Plan

### Day 1: FHIR Types & Helpers

#### Tasks

| ID   | Task                                   | File                                     | TDD Order        |
| ---- | -------------------------------------- | ---------------------------------------- | ---------------- |
| D1.1 | Define FHIR extension URLs             | `src/lib/fhir/types.ts`                  | Types first      |
| D1.2 | Create Zod schemas for FHIR extensions | `src/lib/fhir/types.ts`                  | Types first      |
| D1.3 | Create helper functions                | `src/lib/fhir/helpers.ts`                | Test → Implement |
| D1.4 | Write helper tests                     | `src/lib/fhir/__tests__/helpers.test.ts` | Test first       |

#### D1.1-D1.2: FHIR Types (`src/lib/fhir/types.ts`)

```typescript
// Extension URLs for custom Ignite Health data
export const EXTENSION_URLS = {
  PDC_SCORE: 'https://ignitehealth.com/fhir/extensions/pdc-score',
  FRAGILITY_TIER: 'https://ignitehealth.com/fhir/extensions/fragility-tier',
  PRIORITY_SCORE: 'https://ignitehealth.com/fhir/extensions/priority-score',
  DELAY_BUDGET: 'https://ignitehealth.com/fhir/extensions/delay-budget',
  GAP_DAYS_REMAINING: 'https://ignitehealth.com/fhir/extensions/gap-days-remaining',
  URGENCY_LEVEL: 'https://ignitehealth.com/fhir/extensions/urgency-level',
  MEASURE_TYPE: 'https://ignitehealth.com/fhir/extensions/measure-type',
  DAYS_TO_RUNOUT: 'https://ignitehealth.com/fhir/extensions/days-to-runout',
  AI_RECOMMENDATION: 'https://ignitehealth.com/fhir/extensions/ai-recommendation',
  AI_CONFIDENCE: 'https://ignitehealth.com/fhir/extensions/ai-confidence',
  AI_RATIONALE: 'https://ignitehealth.com/fhir/extensions/ai-rationale',
} as const;

// Observation codes for adherence metrics
export const OBSERVATION_CODES = {
  PDC_MAC: 'pdc-mac',
  PDC_MAD: 'pdc-mad',
  PDC_MAH: 'pdc-mah',
} as const;
```

#### D1.3-D1.4: Helpers (`src/lib/fhir/helpers.ts`)

Functions to create:

- `formatPatientName(patient: Patient): string`
- `getPatientAge(patient: Patient): number`
- `extractMedicationCode(dispense: MedicationDispense): string | null`
- `extractDaysSupply(dispense: MedicationDispense): number`
- `extractFillDate(dispense: MedicationDispense): Date | null`
- `createExtension(url: string, value: unknown): Extension`
- `getExtensionValue(resource: Resource, url: string): unknown`

---

### Day 2: FHIR Dispense & Observation Services

#### Tasks

| ID   | Task                            | File                                                 | TDD Order   |
| ---- | ------------------------------- | ---------------------------------------------------- | ----------- |
| D2.1 | Write dispense-service tests    | `src/lib/fhir/__tests__/dispense-service.test.ts`    | Test first  |
| D2.2 | Implement dispense-service      | `src/lib/fhir/dispense-service.ts`                   | After tests |
| D2.3 | Write observation-service tests | `src/lib/fhir/__tests__/observation-service.test.ts` | Test first  |
| D2.4 | Implement observation-service   | `src/lib/fhir/observation-service.ts`                | After tests |

#### D2.1-D2.2: Dispense Service

**Tests to Write First** (from `fhir-services-tests.json`):

```typescript
describe('DispenseService', () => {
  describe('getPatientDispenses', () => {
    it('should fetch all dispenses for a patient in measurement year');
    it('should filter to completed dispenses only');
    it('should sort by whenHandedOver date');
    it('should handle empty results');
    it('should handle Medplum API errors gracefully');
  });

  describe('getDispensesByMeasure', () => {
    it('should filter MAC medications (statins)');
    it('should filter MAD medications (diabetes)');
    it('should filter MAH medications (hypertension)');
    it('should return empty array for non-MA medications');
  });
});
```

**Function Signatures**:

```typescript
export async function getPatientDispenses(
  medplum: MedplumClient,
  patientId: string,
  measurementYear: number
): Promise<MedicationDispense[]>;

export async function getDispensesByMeasure(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH',
  measurementYear: number
): Promise<MedicationDispense[]>;

export async function getDispensesByMedication(
  medplum: MedplumClient,
  patientId: string,
  rxnormCode: string,
  measurementYear: number
): Promise<MedicationDispense[]>;
```

#### D2.3-D2.4: Observation Service

**Tests to Write First**:

```typescript
describe('ObservationService', () => {
  describe('storePDCObservation', () => {
    it('should create Observation with correct code');
    it('should include PDC value as valueQuantity');
    it('should include fragility tier as component');
    it('should include priority score as component');
    it('should include gap days remaining as component');
  });

  describe('getLatestPDCObservation', () => {
    it('should fetch most recent PDC observation');
    it('should filter by measure type');
    it('should return null if no observations');
  });
});
```

---

### Day 3: PDC Calculator (Core Algorithm)

#### Tasks

| ID   | Task                                   | File                                       | TDD Order   |
| ---- | -------------------------------------- | ------------------------------------------ | ----------- |
| D3.1 | Define PDC types and schemas           | `src/lib/pdc/types.ts`                     | Types first |
| D3.2 | Write Golden Standard calculator tests | `src/lib/pdc/__tests__/calculator.test.ts` | Test first  |
| D3.3 | Implement interval merging             | `src/lib/pdc/calculator.ts`                | After tests |
| D3.4 | Implement PDC calculation              | `src/lib/pdc/calculator.ts`                | After tests |
| D3.5 | Implement projections                  | `src/lib/pdc/calculator.ts`                | After tests |

#### D3.1: PDC Types (`src/lib/pdc/types.ts`)

```typescript
import { z } from 'zod';

export const MeasureTypeSchema = z.enum(['MAC', 'MAD', 'MAH']);
export type MeasureType = z.infer<typeof MeasureTypeSchema>;

export const PDCResultSchema = z.object({
  pdc: z.number().min(0).max(100),
  coveredDays: z.number().min(0),
  treatmentDays: z.number().positive(),
  gapDaysUsed: z.number().min(0),
  gapDaysAllowed: z.number().min(0),
  gapDaysRemaining: z.number(),
  pdcStatusQuo: z.number().min(0).max(100),
  pdcPerfect: z.number().min(0).max(100),
  measurementPeriod: z.object({
    start: z.string(),
    end: z.string(),
  }),
  daysToRunout: z.number(),
  currentSupply: z.number().min(0),
  refillsNeeded: z.number().min(0),
});

export type PDCResult = z.infer<typeof PDCResultSchema>;
```

#### D3.2: Golden Standard Tests

Tests derived from:

- `test_cases_batch_6_calculations.json` (F055-F064)
- `3_TEST_CASES_Patient_Detail_Page.json` (TC-GS-\*)

```typescript
describe('PDC Calculator - Golden Standard', () => {
  // From F055: PDC calculation engine
  describe('Basic PDC Calculation', () => {
    it('TC-GS-001: PDC = (coveredDays / treatmentDays) × 100', () => {
      // Input: covered=292, treatment=365
      // Expected: PDC = 80%
    });

    it('TC-GS-002: PDC capped at 100%', () => {
      // Input: covered=400, treatment=365
      // Expected: PDC = 100%
    });

    it('TC-GS-003: PDC 0% edge case', () => {
      // Input: covered=0, treatment=365
      // Expected: PDC = 0%
    });
  });

  // From F056: Gap days calculation
  describe('Gap Days Calculation', () => {
    it('TC-GS-005: Gap Days Used = Treatment - Covered');
    it('TC-GS-006: Gap Days Allowed = Treatment × 20%');
    it('TC-GS-007: Gap Days Remaining = Allowed - Used');
    it('TC-GS-008: Negative remaining indicates unsalvageable');
  });

  // From F063: Coverage period merging
  describe('Interval Merging (HEDIS Compliant)', () => {
    it('F063-TC01: Non-overlapping fills counted separately');
    it('F063-TC02: Overlapping fills merged correctly');
    it('F063-TC03: Fully overlapping fill handled');
    it('F063-TC04: Coverage capped at Dec 31');
    it('F063-TC05: Multiple overlaps merged correctly');
  });

  // From F061: PDC Status Quo
  describe('PDC Status Quo Projection', () => {
    it('TC-GS-017: StatusQuo = (covered + min(supply, daysToEnd)) / treatment');
    it('F061-TC03: Supply capped at days to year end');
  });

  // From F062: PDC Perfect
  describe('PDC Perfect Projection', () => {
    it('TC-GS-018: Perfect = (covered + daysToEnd) / treatment');
    it('F062-TC02: Patient is T5 if Perfect < 80%');
  });
});
```

---

### Day 4: Fragility Tier Service

#### Tasks

| ID   | Task                            | File                                      | TDD Order       |
| ---- | ------------------------------- | ----------------------------------------- | --------------- |
| D4.1 | Define fragility types          | `src/lib/pdc/types.ts`                    | Types first     |
| D4.2 | Define constants (thresholds)   | `src/lib/pdc/constants.ts`                | Constants first |
| D4.3 | Write fragility tests           | `src/lib/pdc/__tests__/fragility.test.ts` | Test first      |
| D4.4 | Implement fragility calculation | `src/lib/pdc/fragility.ts`                | After tests     |
| D4.5 | Implement priority scoring      | `src/lib/pdc/fragility.ts`                | After tests     |

#### D4.1: Fragility Types

```typescript
export const FragilityTierSchema = z.enum([
  'COMPLIANT',
  'F1_IMMINENT',
  'F2_FRAGILE',
  'F3_MODERATE',
  'F4_COMFORTABLE',
  'F5_SAFE',
  'T5_UNSALVAGEABLE',
]);

export type FragilityTier = z.infer<typeof FragilityTierSchema>;

export const UrgencyLevelSchema = z.enum(['EXTREME', 'HIGH', 'MODERATE', 'LOW']);
export type UrgencyLevel = z.infer<typeof UrgencyLevelSchema>;

export const FragilityResultSchema = z.object({
  tier: FragilityTierSchema,
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
  }),
  bonuses: z.object({
    outOfMeds: z.number(),
    q4: z.number(),
    multipleMA: z.number(),
    newPatient: z.number(),
  }),
});

export type FragilityResult = z.infer<typeof FragilityResultSchema>;
```

#### D4.2: Golden Standard Constants

```typescript
// From FHIR_NATIVE_IMPLEMENTATION_PLAN.md
export const FRAGILITY_THRESHOLDS = {
  COMPLIANT: { check: 'PDC Status Quo >= 80%' },
  T5_UNSALVAGEABLE: { check: 'PDC Perfect < 80%' },
  F1_IMMINENT: { delayBudget: { min: 0, max: 2 }, contactWindow: '24 hours' },
  F2_FRAGILE: { delayBudget: { min: 3, max: 5 }, contactWindow: '48 hours' },
  F3_MODERATE: { delayBudget: { min: 6, max: 10 }, contactWindow: '1 week' },
  F4_COMFORTABLE: { delayBudget: { min: 11, max: 20 }, contactWindow: '2 weeks' },
  F5_SAFE: { delayBudget: { min: 21, max: Infinity }, contactWindow: 'Monthly' },
} as const;

export const PRIORITY_BASE_SCORES: Record<FragilityTier, number> = {
  F1_IMMINENT: 100,
  F2_FRAGILE: 80,
  F3_MODERATE: 60,
  F4_COMFORTABLE: 40,
  F5_SAFE: 20,
  COMPLIANT: 0,
  T5_UNSALVAGEABLE: 0,
};

export const PRIORITY_BONUSES = {
  OUT_OF_MEDICATION: 30,
  Q4: 25,
  MULTIPLE_MA_MEASURES: 15,
  NEW_PATIENT: 10,
} as const;

export const URGENCY_THRESHOLDS = {
  EXTREME: 150,
  HIGH: 100,
  MODERATE: 50,
  LOW: 0,
} as const;
```

#### D4.3: Fragility Tests

```typescript
describe('Fragility Tier Service - Golden Standard', () => {
  // From F059: Fragility tier assignment
  describe('Tier Assignment', () => {
    it('TC-PD-022: COMPLIANT check happens FIRST', () => {
      // pdcStatusQuo = 82%, delayBudget = 1
      // Expected: COMP (NOT F1 despite low budget)
    });

    it('TC-PD-017: F1 tier when delay budget <= 2', () => {
      // delayBudget = 1.5
      // Expected: F1, '24 hours' contact window
    });

    it('TC-PD-018: F2 tier when delay budget 3-5', () => {
      // delayBudget = 4
      // Expected: F2, '48 hours' contact window
    });

    it('TC-PD-023: T5 tier when PDC Perfect < 80%', () => {
      // pdcPerfect = 75%
      // Expected: T5, 'Unsalvageable' message
    });
  });

  // From F060: Priority score calculation
  describe('Priority Score', () => {
    it('TC-GS-019: F1 base score = 100');
    it('TC-GS-020: F2 base score = 80');
    it('TC-GS-021: Out of Meds bonus = +30');
    it('TC-GS-022: Q4 bonus = +25');
    it('TC-GS-023: Multiple MA bonus = +15');
    it('TC-GS-024: New Patient bonus = +10');
    it('TC-GS-025: Combined score F1 + Out + Q4 + Multi = 170');
  });

  // Detailed scenarios from PRD
  describe('PRD Test Scenarios', () => {
    it('TS-PD-01: F1 Critical + Out of Meds + Q4 = 155 pts');
    it('TS-PD-02: F2 Fragile = 110 pts');
    it('TS-PD-06: COMPLIANT - already passing');
    it('TS-PD-07: T5 Lost - unsalvageable');
  });
});
```

---

### Day 5: Integration & Regression

#### Tasks

| ID   | Task                          | File                                            | TDD Order   |
| ---- | ----------------------------- | ----------------------------------------------- | ----------- |
| D5.1 | Create integration test suite | `src/lib/pdc/__tests__/integration.test.ts`     | Test first  |
| D5.2 | Wire PDC to Medplum           | `src/lib/pdc/index.ts`                          | After tests |
| D5.3 | Create barrel exports         | `src/lib/fhir/index.ts`, `src/lib/pdc/index.ts` | Last        |
| D5.4 | Run full regression suite     | All test files                                  | Validation  |

#### D5.1: Integration Tests

```typescript
describe('PDC Engine Integration', () => {
  describe('End-to-End Flow', () => {
    it('should calculate PDC from MedicationDispense resources');
    it('should determine correct fragility tier');
    it('should calculate priority score with bonuses');
    it('should store result as FHIR Observation');
  });

  describe('Real-World Scenarios', () => {
    // From detailed_test_scenarios in test cases JSON
    it('Maria Gonzalez (F1 Critical) - complete flow');
    it('James Wilson (COMPLIANT) - complete flow');
    it('Robert Chen (T5 Lost) - complete flow');
  });
});
```

---

## Acceptance Criteria

### Code Quality

- [ ] All functions have TypeScript types
- [ ] All inputs validated with Zod schemas
- [ ] No `any` types used
- [ ] Consistent error handling with Result pattern

### Test Coverage

- [ ] > 90% line coverage
- [ ] All Golden Standard tests pass
- [ ] All PRD TC-GS-\* tests pass
- [ ] All PRD TC-PD-017 to TC-PD-023 tests pass
- [ ] All F055-F064 calculation tests pass

### Documentation

- [ ] JSDoc comments on all public functions
- [ ] README in each module directory
- [ ] Inline comments for complex algorithms

### Performance

- [ ] PDC calculation < 100ms for 1000 dispenses
- [ ] No memory leaks in interval merging

---

## Risk Mitigation

| Risk                            | Mitigation                                  |
| ------------------------------- | ------------------------------------------- |
| Algorithm deviation from legacy | Use Golden Standard test bed for validation |
| FHIR data shape variations      | Comprehensive mock data covering edge cases |
| Date calculation edge cases     | Extensive date boundary tests               |
| Medplum API changes             | Mock Medplum client in unit tests           |

---

## Next Steps (Phase 2)

After Phase 1 completion:

1. AI Pipeline Integration (Week 2)
2. Protocol Checks Migration (Week 2)
3. Patient List UI (Week 3)
4. Queue Page UI (Week 3)
