# Phase 1: Core FHIR Services + PDC Engine

## Overview

Phase 1 establishes the **foundation** of the Ignite Health FHIR-Native architecture. This phase creates:

1. **FHIR Data Services** - Query and store FHIR resources via Medplum SDK
2. **PDC Calculator** - HEDIS MY2025 compliant PDC calculation engine
3. **Fragility Tier Service** - Golden Standard tier assignment
4. **Test Infrastructure** - TDD framework with regression testing

---

## Directory Structure

```
docs/implementation/phase-1-core-engine/
├── README.md                          # This file
├── PHASE_1_MASTER_PLAN.md             # Detailed implementation plan
├── TDD_STRATEGY.md                    # Test-Driven Development approach
├── specs/
│   ├── 01_FHIR_SERVICES_SPEC.md       # FHIR service specifications
│   ├── 02_PDC_CALCULATOR_SPEC.md      # PDC calculator specification
│   ├── 03_FRAGILITY_TIER_SPEC.md      # Fragility tier specification
│   └── 04_OBSERVATION_SERVICE_SPEC.md # PDC Observation storage spec
├── test-cases/
│   ├── pdc-calculator-tests.json      # PDC test cases from Golden Standard
│   ├── fragility-tier-tests.json      # Fragility tier test cases
│   ├── fhir-services-tests.json       # FHIR service test cases
│   └── integration-tests.json         # End-to-end integration tests
├── fixtures/
│   ├── mock-medication-dispenses.json # Mock FHIR MedicationDispense data
│   ├── mock-patients.json             # Mock FHIR Patient data
│   ├── test-scenarios.json            # Complete test scenarios (TS-PD-01 to TS-PD-07)
│   └── golden-standard-scenarios.json # Golden Standard validation scenarios
└── regression/
    ├── REGRESSION_TEST_STRATEGY.md    # Regression testing approach
    └── regression-suite-config.json   # Regression test configuration
```

---

## Implementation Order

### Day 1-2: FHIR Data Services Foundation

| Task | File                                         | Est. Time |
| ---- | -------------------------------------------- | --------- |
| 1.1  | Create `src/lib/fhir/types.ts`               | 1 hour    |
| 1.2  | Create `src/lib/fhir/helpers.ts`             | 1 hour    |
| 1.3  | Create `src/lib/fhir/dispense-service.ts`    | 2 hours   |
| 1.4  | Create `src/lib/fhir/observation-service.ts` | 2 hours   |
| 1.5  | Write tests for dispense-service             | 2 hours   |
| 1.6  | Write tests for observation-service          | 2 hours   |

### Day 3-4: FHIR-Native PDC Engine

| Task | File                                     | Est. Time |
| ---- | ---------------------------------------- | --------- |
| 2.1  | Create `src/lib/pdc/types.ts`            | 1 hour    |
| 2.2  | Create `src/lib/pdc/calculator.ts`       | 3 hours   |
| 2.3  | Create `src/lib/pdc/fragility.ts`        | 3 hours   |
| 2.4  | Create `src/lib/pdc/measures.ts`         | 1 hour    |
| 2.5  | Write calculator tests (Golden Standard) | 2 hours   |
| 2.6  | Write fragility tests (Golden Standard)  | 2 hours   |

### Day 5: Integration Tests

| Task | File                               | Est. Time |
| ---- | ---------------------------------- | --------- |
| 3.1  | Create integration test suite      | 2 hours   |
| 3.2  | Wire PDC to Medplum dispense data  | 2 hours   |
| 3.3  | Validate calculations match legacy | 2 hours   |
| 3.4  | Create regression test runner      | 2 hours   |

---

## Files to Create (Source Code)

```
src/lib/
├── fhir/                               # FHIR Data Services
│   ├── types.ts                        # FHIR type helpers & extension definitions
│   ├── helpers.ts                      # FHIR resource utilities
│   ├── dispense-service.ts             # MedicationDispense queries (PDC source)
│   ├── observation-service.ts          # Store/retrieve PDC Observations
│   ├── task-service.ts                 # Task CRUD for workflow queue
│   ├── index.ts                        # Barrel export
│   └── __tests__/
│       ├── dispense-service.test.ts
│       ├── observation-service.test.ts
│       └── helpers.test.ts
│
├── pdc/                                # FHIR-Native PDC Engine
│   ├── types.ts                        # Zod schemas for PDCResult, FragilityResult
│   ├── calculator.ts                   # PDC calculation (accepts MedicationDispense[])
│   ├── fragility.ts                    # Fragility tier (accepts PDCResult + FHIR context)
│   ├── measures.ts                     # RxNorm → MAC/MAD/MAH classification
│   ├── constants.ts                    # Golden Standard thresholds
│   ├── index.ts                        # Barrel export
│   └── __tests__/
│       ├── calculator.test.ts          # PDC tests with mock MedicationDispense[]
│       ├── fragility.test.ts           # Fragility tests with FHIR context
│       ├── golden-standard.test.ts     # Legacy Golden Standard validation
│       └── measures.test.ts            # RxNorm classification tests
```

---

## TDD Approach

### 1. Test-First Development

For each function:

1. **Write failing test** based on Golden Standard specification
2. **Implement minimum code** to pass the test
3. **Refactor** while keeping tests green
4. **Add edge case tests** from test-cases JSON files

### 2. Test Categories

| Category          | Source                                   | Priority |
| ----------------- | ---------------------------------------- | -------- |
| Golden Standard   | `goldenStandardTestBed.test.js` (legacy) | P0       |
| PRD Test Cases    | `3_TEST_CASES_Patient_Detail_Page.json`  | P0       |
| Calculation Tests | `test_cases_batch_6_calculations.json`   | P0       |
| Edge Cases        | Manual scenarios                         | P1       |
| Integration       | End-to-end flows                         | P1       |

### 3. Regression Protection

Every new feature must:

- Pass all existing Golden Standard tests
- Pass all PRD test cases for related features
- Not break any integration tests

---

## Success Criteria

| Metric                                            | Target                        |
| ------------------------------------------------- | ----------------------------- |
| PDC calculation accuracy                          | 100% match to Golden Standard |
| Test coverage                                     | > 90%                         |
| All Golden Standard tests                         | PASS                          |
| All PRD calculation tests (TC-GS-\*)              | PASS                          |
| All fragility tier tests (TC-PD-017 to TC-PD-023) | PASS                          |
| Integration tests                                 | PASS                          |

---

## Dependencies

### Required Packages (already installed)

- `@medplum/core` - Medplum SDK
- `@medplum/fhirtypes` - FHIR type definitions
- `zod` - Runtime validation
- `vitest` - Test framework
- `date-fns` - Date utilities

### Environment Variables

```env
MEDPLUM_BASE_URL=<medplum-api-url>
MEDPLUM_CLIENT_ID=<client-id>
MEDPLUM_CLIENT_SECRET=<client-secret>
```

---

## Quick Start

```bash
# Run Phase 1 tests
npm test -- --filter="src/lib/pdc" --filter="src/lib/fhir"

# Run Golden Standard tests only
npm test -- src/lib/pdc/__tests__/golden-standard.test.ts

# Run with coverage
npm test -- --coverage --filter="src/lib/pdc"
```

---

## Related Documents

- [FHIR_NATIVE_IMPLEMENTATION_PLAN.md](../../Plan/FHIR_NATIVE_IMPLEMENTATION_PLAN.md)
- [PRD: Patient Detail Page](../../Product%20Requirement%20Doc/1_PRD_Patient_Detail_Page.md)
- [Test Cases: Calculations](../../Product%20Requirement%20Doc/Test%20cases/test_cases_batch_6_calculations.json)
- [Golden Standard Reference](../../Product%20Requirement%20Doc/Medication_Adherence_Metrics_Reference_Guide.md)
