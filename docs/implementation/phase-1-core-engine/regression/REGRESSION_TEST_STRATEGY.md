# Regression Test Strategy

## Overview

This document defines the regression testing strategy for the Ignite Health medication adherence platform. Every new feature must pass all existing tests before merge.

---

## Regression Test Principles

### 1. Test Pyramid

```
        ┌───────────────┐
        │   E2E Tests   │  ← Cypress/Playwright (Phase 3+)
        │   (< 10%)     │
        ├───────────────┤
        │  Integration  │  ← API + FHIR integration
        │    (20%)      │
        ├───────────────┤
        │   Unit Tests  │  ← Vitest (fast, isolated)
        │    (70%+)     │
        └───────────────┘
```

### 2. Test Categories

| Category            | Scope                      | Frequency    | Tools   |
| ------------------- | -------------------------- | ------------ | ------- |
| **Unit Tests**      | Functions, Components      | Every commit | Vitest  |
| **Golden Standard** | PDC/Fragility calculations | Every commit | Vitest  |
| **Integration**     | FHIR service + PDC engine  | PR merge     | Vitest  |
| **E2E**             | Full user workflows        | Release      | Cypress |

### 3. Coverage Requirements

| Module          | Minimum Coverage | Target |
| --------------- | ---------------- | ------ |
| `src/lib/pdc/`  | 95%              | 100%   |
| `src/lib/fhir/` | 90%              | 95%    |
| Components      | 80%              | 90%    |
| Utils           | 85%              | 95%    |

---

## Test Suite Structure

### Phase 1 Test Files

```
src/lib/
├── fhir/__tests__/
│   ├── helpers.test.ts              # Unit tests
│   ├── dispense-service.test.ts     # Service tests
│   └── observation-service.test.ts  # Service tests
│
└── pdc/__tests__/
    ├── calculator.test.ts           # PDC calculation unit tests
    ├── fragility.test.ts            # Fragility tier unit tests
    ├── measures.test.ts             # RxNorm classification tests
    ├── golden-standard.test.ts      # ALL Golden Standard tests
    └── integration.test.ts          # End-to-end integration
```

### Test File Template

```typescript
// calculator.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculatePDC } from '../calculator';
import { GOLDEN_STANDARD_TESTS } from '@/docs/implementation/phase-1-core-engine/test-cases/golden-standard-tests.json';

describe('PDC Calculator', () => {
  // Unit Tests
  describe('Unit Tests', () => {
    // Function-level tests
  });

  // Golden Standard Tests
  describe('Golden Standard - PDC Calculation', () => {
    GOLDEN_STANDARD_TESTS.testSuites
      .find((s) => s.name === 'PDC Calculation')
      .testCases.forEach((testCase) => {
        it(`${testCase.id}: ${testCase.name}`, () => {
          const result = calculatePDC(/* testCase.input */);
          expect(result.pdc).toBeCloseTo(testCase.expected.pdc, 1);
        });
      });
  });

  // PRD Test Cases
  describe('PRD Test Cases', () => {
    // TC-GS-*, TC-PD-* tests
  });
});
```

---

## Regression Test Workflow

### 1. Pre-Commit Hook

```bash
# .husky/pre-commit
npm test -- --filter="$(git diff --cached --name-only | grep -E '\.test\.ts$')"
```

### 2. CI Pipeline

```yaml
# .github/workflows/test.yml
name: Regression Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run Unit Tests
        run: npm test -- --reporter=json --outputFile=test-results.json

      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results.json

  golden-standard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run Golden Standard Tests
        run: npm test -- golden-standard --reporter=json --outputFile=golden-results.json

      - name: Verify All Golden Standard Pass
        run: |
          FAILED=$(jq '.numFailedTests' golden-results.json)
          if [ "$FAILED" -gt 0 ]; then
            echo "Golden Standard tests failed!"
            exit 1
          fi

  coverage:
    runs-on: ubuntu-latest
    needs: [unit-tests, golden-standard]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run Tests with Coverage
        run: npm test -- --coverage

      - name: Check Coverage Thresholds
        run: |
          npm run coverage:check
```

### 3. PR Merge Requirements

- [ ] All unit tests pass
- [ ] All Golden Standard tests pass
- [ ] Coverage >= thresholds
- [ ] No TypeScript errors
- [ ] Linting passes

---

## Test Categories by Priority

### P0: Critical (Must Pass)

These tests MUST pass before any merge:

| Test ID                | Description      | File                      |
| ---------------------- | ---------------- | ------------------------- |
| TC-GS-001 to TC-GS-003 | PDC calculation  | `golden-standard.test.ts` |
| TC-GS-005 to TC-GS-008 | Gap days         | `golden-standard.test.ts` |
| TC-GS-015              | COMPLIANT first  | `golden-standard.test.ts` |
| TC-GS-016              | T5 check         | `golden-standard.test.ts` |
| F055-TC01 to TC05      | PDC engine       | `golden-standard.test.ts` |
| F063-TC01 to TC05      | Interval merging | `calculator.test.ts`      |

### P1: High (Should Pass)

| Test ID                | Description    | File                  |
| ---------------------- | -------------- | --------------------- |
| TC-GS-009 to TC-GS-014 | Delay budget   | `fragility.test.ts`   |
| TC-GS-017 to TC-GS-018 | Projections    | `calculator.test.ts`  |
| TC-GS-019 to TC-GS-025 | Priority score | `fragility.test.ts`   |
| TS-PD-01 to TS-PD-07   | Full scenarios | `integration.test.ts` |

### P2: Medium

| Test ID            | Description    | File                 |
| ------------------ | -------------- | -------------------- |
| F057-TC01 to TC05  | Days to runout | `calculator.test.ts` |
| F064-TC01 to TC05  | Refills needed | `calculator.test.ts` |
| FHIR service tests | All            | `*-service.test.ts`  |

---

## Running Regression Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test calculator.test.ts

# Run Golden Standard only
npm test golden-standard

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run failed tests only
npm test -- --failed
```

### Filtering Tests

```bash
# By test name pattern
npm test -- --testNamePattern="PDC"

# By file pattern
npm test -- --filter="**/pdc/**"

# By category tag
npm test -- --grep="@golden-standard"
```

---

## Test Data Management

### Shared Fixtures

All test fixtures are in `docs/implementation/phase-1-core-engine/fixtures/`:

| File                             | Purpose                            |
| -------------------------------- | ---------------------------------- |
| `test-scenarios.json`            | Complete test scenarios (TS-PD-\*) |
| `mock-medication-dispenses.json` | FHIR MedicationDispense mocks      |
| `mock-patients.json`             | FHIR Patient mocks                 |
| `golden-standard-scenarios.json` | Golden Standard validation data    |

### Loading Fixtures in Tests

```typescript
import testScenarios from '@/docs/implementation/phase-1-core-engine/fixtures/test-scenarios.json';
import mockDispenses from '@/docs/implementation/phase-1-core-engine/fixtures/mock-medication-dispenses.json';

describe('PDC Calculator Integration', () => {
  const scenarios = testScenarios.scenarios;

  scenarios.forEach((scenario) => {
    it(`${scenario.scenarioId}: ${scenario.name}`, () => {
      const dispenses = mockDispenses.dispenses[`scenario_${scenario.scenarioId}`].resources;
      const result = calculatePDC(dispenses, scenario.input.measurementYear);

      expect(result.pdc).toBeCloseTo(scenario.expected.pdc.value, 1);
      expect(result.gapDaysRemaining).toBe(scenario.expected.gapDays.remaining);
    });
  });
});
```

---

## Failure Handling

### When Tests Fail

1. **Identify the failure**: Check test output for specific failing test
2. **Check recent changes**: Use `git diff` to see what changed
3. **Run isolated**: Run only the failing test with `--filter`
4. **Debug**: Use `--debug` flag or add `console.log`
5. **Fix**: Update code or test as appropriate
6. **Verify**: Run full regression suite before committing

### Common Failure Patterns

| Pattern               | Likely Cause       | Solution                                  |
| --------------------- | ------------------ | ----------------------------------------- |
| Golden Standard fails | Algorithm change   | Verify Golden Standard formula is correct |
| Integration fails     | Data shape change  | Update mock data or transformer           |
| Coverage drops        | New untested code  | Add missing tests                         |
| Flaky test            | Timing/async issue | Add proper async handling                 |

---

## Monitoring & Reporting

### Test Dashboard

Generate test reports after each CI run:

```bash
npm test -- --reporter=html --outputFile=test-report.html
```

### Coverage Report

```bash
npm test -- --coverage --coverageReporters=html,lcov
```

### Metrics to Track

| Metric          | Target | Alert Threshold |
| --------------- | ------ | --------------- |
| Total Tests     | 150+   | < 100           |
| Pass Rate       | 100%   | < 99%           |
| Coverage (pdc)  | 95%    | < 90%           |
| Coverage (fhir) | 90%    | < 85%           |
| Test Duration   | < 60s  | > 120s          |

---

## Adding New Tests

### Checklist for New Features

When adding a new feature:

1. [ ] Write failing test first (TDD)
2. [ ] Implement feature
3. [ ] Ensure all existing tests pass
4. [ ] Add edge case tests
5. [ ] Update fixture data if needed
6. [ ] Verify coverage meets threshold
7. [ ] Add to regression suite if P0/P1

### Test Naming Convention

```typescript
// Format: [TestCaseID]: [Description]
it('TC-GS-001: PDC basic calculation');
it('F055-TC03: Overlapping fills handled');
it('TS-PD-06: COMPLIANT - Already Passing');
```

---

## Reference

### Related Documents

- [TDD_STRATEGY.md](../TDD_STRATEGY.md) - Test-Driven Development approach
- [PHASE_1_MASTER_PLAN.md](../PHASE_1_MASTER_PLAN.md) - Implementation plan
- [Golden Standard Tests](../test-cases/golden-standard-tests.json) - Test case definitions
- [Test Scenarios](../fixtures/test-scenarios.json) - Complete scenarios

### External References

- [Vitest Documentation](https://vitest.dev/)
- [FHIR R4 MedicationDispense](https://hl7.org/fhir/R4/medicationdispense.html)
- [HEDIS PDC Specifications](https://www.ncqa.org/hedis/)
