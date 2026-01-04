# Test-Driven Development (TDD) Strategy

## Overview

This document outlines the TDD approach for Phase 1 implementation. Every function is written test-first, using the Golden Standard specifications and PRD test cases as the source of truth.

---

## Core TDD Principles

### 1. Red-Green-Refactor Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD CYCLE                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. RED: Write failing test                                │
│      ↓                                                       │
│   2. GREEN: Write minimum code to pass                      │
│      ↓                                                       │
│   3. REFACTOR: Improve code, keep tests green               │
│      ↓                                                       │
│   4. REPEAT for next requirement                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Test Sources Hierarchy

| Priority | Source                                       | Test Count | Purpose                     |
| -------- | -------------------------------------------- | ---------- | --------------------------- |
| P0       | Golden Standard (TC-GS-\*)                   | 27         | Core calculation validation |
| P0       | PRD Fragility Tests (TC-PD-017 to TC-PD-025) | 9          | Tier assignment validation  |
| P0       | Calculation Batch (F055-F064)                | 50         | Formula verification        |
| P1       | Integration Scenarios (TS-PD-01 to TS-PD-07) | 7          | End-to-end flows            |
| P1       | Edge Cases                                   | 20+        | Boundary conditions         |

---

## Test File Structure

```
src/lib/
├── fhir/__tests__/
│   ├── helpers.test.ts          # Unit tests for FHIR helpers
│   ├── dispense-service.test.ts # Service tests with mocked Medplum
│   └── observation-service.test.ts
│
└── pdc/__tests__/
    ├── calculator.test.ts       # PDC calculation unit tests
    ├── fragility.test.ts        # Fragility tier unit tests
    ├── measures.test.ts         # RxNorm classification tests
    ├── golden-standard.test.ts  # Full Golden Standard suite
    └── integration.test.ts      # End-to-end integration tests
```

---

## Test Writing Guidelines

### 1. Test Naming Convention

```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    });

    // For Golden Standard tests, include test case ID
    it('TC-GS-001: PDC basic calculation', () => {
      // Test implementation
    });
  });
});
```

### 2. Test Structure (AAA Pattern)

```typescript
it('should calculate PDC correctly', () => {
  // ARRANGE - Set up test data
  const dispenses = createMockDispenses([
    { date: '2025-01-01', daysSupply: 30 },
    { date: '2025-02-01', daysSupply: 30 },
  ]);

  // ACT - Execute the function
  const result = calculatePDC(dispenses, '2025-01-01', '2025-12-31');

  // ASSERT - Verify the result
  expect(result.pdc).toBe(16.44); // 60/365 * 100
  expect(result.coveredDays).toBe(60);
  expect(result.treatmentDays).toBe(365);
});
```

### 3. Mock Data Factory Functions

Create reusable mock data factories in `fixtures/`:

```typescript
// fixtures/mock-factories.ts
export function createMockPatient(overrides?: Partial<Patient>): Patient {
  return {
    resourceType: 'Patient',
    id: 'test-patient-001',
    name: [{ given: ['Maria'], family: 'Gonzalez' }],
    birthDate: '1952-01-15',
    ...overrides,
  };
}

export function createMockDispense(overrides?: Partial<MedicationDispense>): MedicationDispense {
  return {
    resourceType: 'MedicationDispense',
    id: `dispense-${Date.now()}`,
    status: 'completed',
    whenHandedOver: new Date().toISOString(),
    daysSupply: { value: 30 },
    ...overrides,
  };
}

export function createMockDispenses(
  fills: Array<{ date: string; daysSupply: number }>
): MedicationDispense[] {
  return fills.map((fill, index) =>
    createMockDispense({
      id: `dispense-${index}`,
      whenHandedOver: fill.date,
      daysSupply: { value: fill.daysSupply },
    })
  );
}
```

---

## Golden Standard Test Suite

### Location

`src/lib/pdc/__tests__/golden-standard.test.ts`

### Structure

```typescript
import { describe, it, expect } from 'vitest';
import { calculatePDC } from '../calculator';
import { calculateFragility } from '../fragility';
import { GOLDEN_STANDARD_SCENARIOS } from '../../fixtures/golden-standard-scenarios';

describe('Golden Standard Test Suite', () => {
  // ============================================
  // TC-GS: Core Calculation Tests
  // Source: 3_TEST_CASES_Patient_Detail_Page.json
  // ============================================

  describe('PDC Calculation (TC-GS-001 to TC-GS-003)', () => {
    it('TC-GS-001: PDC = (coveredDays / treatmentDays) × 100', () => {
      const result = calculatePDC(/* mock data */);
      expect(result.pdc).toBeCloseTo(80, 1);
    });
  });

  describe('Gap Days (TC-GS-005 to TC-GS-008)', () => {
    // Tests from PRD
  });

  describe('Delay Budget (TC-GS-009 to TC-GS-014)', () => {
    // Tests from PRD
  });

  describe('Fragility Tiers (TC-GS-015 to TC-GS-016)', () => {
    // Tests from PRD
  });

  describe('Projections (TC-GS-017 to TC-GS-018)', () => {
    // Tests from PRD
  });

  describe('Priority Scores (TC-GS-019 to TC-GS-025)', () => {
    // Tests from PRD
  });

  // ============================================
  // F055-F064: Calculation Feature Tests
  // Source: test_cases_batch_6_calculations.json
  // ============================================

  describe('F055: PDC Calculation Engine', () => {
    it('F055-TC01: Basic PDC calculation');
    it('F055-TC02: Treatment period ends Dec 31');
    it('F055-TC03: Overlapping fills handled');
    it('F055-TC04: 100% PDC cap');
    it('F055-TC05: 0% PDC edge case');
  });

  describe('F056: Gap Days Calculation', () => {
    it('F056-TC01: Gap Days Used formula');
    it('F056-TC02: Gap Days Allowed (20%)');
    it('F056-TC03: Gap Days Remaining');
    it('F056-TC04: Negative = unsalvageable');
    it('F056-TC05: Short treatment period');
  });

  // ... F057-F064 tests
});
```

---

## Regression Test Strategy

### Purpose

Ensure new features don't break existing functionality.

### Implementation

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'docs/'],
    },
    reporters: ['default', 'json'],
    outputFile: 'test-results.json',
  },
});
```

### Regression Test Run Order

1. **Pre-commit**: Run unit tests for changed files
2. **CI Pipeline**: Run full test suite
3. **Before merge**: Run Golden Standard + Integration tests

```bash
# Run all tests
npm test

# Run Golden Standard only
npm test -- golden-standard

# Run with coverage
npm test -- --coverage

# Watch mode during development
npm test -- --watch
```

### Regression Test Configuration

```json
// regression/regression-suite-config.json
{
  "suites": [
    {
      "name": "Golden Standard Core",
      "pattern": "**/golden-standard.test.ts",
      "required": true,
      "minCoverage": 100
    },
    {
      "name": "PDC Calculator",
      "pattern": "**/calculator.test.ts",
      "required": true,
      "minCoverage": 95
    },
    {
      "name": "Fragility Tier",
      "pattern": "**/fragility.test.ts",
      "required": true,
      "minCoverage": 95
    },
    {
      "name": "FHIR Services",
      "pattern": "**/fhir/**/*.test.ts",
      "required": true,
      "minCoverage": 90
    },
    {
      "name": "Integration",
      "pattern": "**/integration.test.ts",
      "required": true,
      "minCoverage": 80
    }
  ],
  "failFast": true,
  "exitOnFirstFailure": false
}
```

---

## Test Data Management

### Mock Data Files

| File                                      | Purpose                                        |
| ----------------------------------------- | ---------------------------------------------- |
| `fixtures/mock-medication-dispenses.json` | Sample MedicationDispense resources            |
| `fixtures/mock-patients.json`             | Sample Patient resources                       |
| `fixtures/test-scenarios.json`            | Complete test scenarios (TS-PD-01 to TS-PD-07) |
| `fixtures/golden-standard-scenarios.json` | Golden Standard validation data                |

### Test Scenario Template

```json
{
  "scenarioId": "TS-PD-01",
  "name": "F1 Critical + Out of Meds + Q4",
  "patient": {
    "id": "DEMO_001",
    "name": "Maria Gonzalez"
  },
  "medication": {
    "name": "Lisinopril 10mg",
    "measure": "MAH"
  },
  "input": {
    "firstFillDate": "2025-01-15",
    "treatmentPeriod": 351,
    "coveredDays": 253,
    "lastFillDate": "2025-11-15",
    "daysSupply": 30,
    "daysToRunout": -3,
    "refillsRemaining": 2
  },
  "expected": {
    "pdc": 72.1,
    "gapDaysRemaining": 2,
    "delayBudget": 1,
    "tier": "F1_IMMINENT",
    "priorityScore": 155,
    "bonuses": {
      "base": 100,
      "outOfMeds": 30,
      "q4": 25
    }
  }
}
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run Golden Standard Tests
        run: npm test -- golden-standard --reporter=json --outputFile=golden-standard-results.json

      - name: Run Full Test Suite
        run: npm test -- --coverage

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Check Coverage Thresholds
        run: |
          npx vitest run --coverage.thresholds.lines=90 \
                         --coverage.thresholds.functions=90 \
                         --coverage.thresholds.branches=85
```

---

## Test Utilities

### Custom Matchers

```typescript
// test-utils/custom-matchers.ts
import { expect } from 'vitest';

expect.extend({
  toBeValidPDCResult(received: PDCResult) {
    const isValid = PDCResultSchema.safeParse(received).success;
    return {
      pass: isValid,
      message: () => `Expected valid PDCResult, got ${JSON.stringify(received)}`,
    };
  },

  toBeValidFragilityResult(received: FragilityResult) {
    const isValid = FragilityResultSchema.safeParse(received).success;
    return {
      pass: isValid,
      message: () => `Expected valid FragilityResult, got ${JSON.stringify(received)}`,
    };
  },
});
```

### Test Setup

```typescript
// test-utils/setup.ts
import { beforeAll, afterAll, vi } from 'vitest';

// Mock current date for consistent tests
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-10-15')); // Q4 date for bonus tests
});

afterAll(() => {
  vi.useRealTimers();
});
```

---

## Quality Gates

### Before Commit

- [ ] All unit tests pass
- [ ] No TypeScript errors
- [ ] Linting passes

### Before PR Merge

- [ ] All Golden Standard tests pass
- [ ] Coverage >= 90%
- [ ] No regressions in existing tests
- [ ] Integration tests pass

### Before Release

- [ ] Full regression suite passes
- [ ] Performance benchmarks met
- [ ] Documentation updated
