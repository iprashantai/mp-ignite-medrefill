# Phase 1: Core PDC Engine

> **Status:** ✅ COMPLETED
> **Completed:** January 2026
> **Tests:** 326 tests passing

## Overview

FHIR-native PDC calculation and fragility tier engine with 100% Golden Standard compliance.

---

## Implementation Summary

### Files Created/Modified

| Module | File | Purpose |
|--------|------|---------|
| **FHIR Types** | `src/lib/fhir/types.ts` | Extension URLs, Zod schemas, MAMeasure/FragilityTier types |
| **FHIR Helpers** | `src/lib/fhir/helpers.ts` | Extension getters/setters, patient formatters |
| **Dispense Service** | `src/lib/fhir/dispense-service.ts` | Fetch/filter MedicationDispense by patient/measure/year |
| **Observation Service** | `src/lib/fhir/observation-service.ts` | Store/query PDC Observations with extensions |
| **PDC Types** | `src/lib/pdc/types.ts` | PDCInput, PDCResult, FillRecord interfaces |
| **PDC Constants** | `src/lib/pdc/constants.ts` | Thresholds, MA RxNorm codes, priority scores |
| **PDC Calculator** | `src/lib/pdc/calculator.ts` | HEDIS interval merging, PDC calculation, projections |
| **Fragility Service** | `src/lib/pdc/fragility.ts` | Tier assignment, priority scoring, Q4 rules |
| **Fragility Types** | `src/lib/pdc/fragility-types.ts` | FragilityInput, FragilityResult, UrgencyLevel |
| **Barrel Exports** | `src/lib/fhir/index.ts`, `src/lib/pdc/index.ts` | Public API exports |

### Test Files

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `src/lib/fhir/__tests__/helpers.test.ts` | 48 | Extension helpers, patient formatting |
| `src/lib/fhir/__tests__/dispense-service.test.ts` | 27 | Dispense fetching, MA filtering |
| `src/lib/fhir/__tests__/observation-service.test.ts` | 20 | Observation CRUD, is-current flag |
| `src/lib/pdc/__tests__/calculator.test.ts` | 54 | Interval merging, PDC formulas |
| `src/lib/pdc/__tests__/fragility.test.ts` | 83 | Tier assignment, priority bonuses |
| `src/lib/pdc/__tests__/integration.test.ts` | 25 | End-to-end patient scenarios |

### Mock Infrastructure

| File | Purpose |
|------|---------|
| `src/lib/fhir/__tests__/fixtures/mock-medplum.ts` | MockMedplumClient, createMockDispense, createMockObservation |

---

## Key Algorithms

### HEDIS Interval Merging (`calculator.ts:43-90`)

```
1. Sort fills by date ascending
2. Track currentCoveredUntil date
3. For each fill:
   - If starts after currentCoveredUntil: add full days
   - If extends beyond: add only extension days
   - If fully overlapped: add 0 days
4. Cap at treatment period end (Dec 31)
```

### Fragility Tier Assignment (`fragility.ts`)

```
Priority Order:
1. COMPLIANT: pdcStatusQuo >= 80%
2. T5_UNSALVAGEABLE: pdcPerfect < 80%
3. F1-F5: Based on delayBudgetPerRefill thresholds
   - F1: 0-2 days → "24 hours"
   - F2: 3-5 days → "48 hours"
   - F3: 6-10 days → "1 week"
   - F4: 11-20 days → "2 weeks"
   - F5: 21+ days → "Monthly"
```

### Priority Score Formula

```
Base Score (by tier) + Bonuses
- F1=100, F2=80, F3=60, F4=40, F5=20
- Out of Meds: +30
- Q4 (Oct-Dec): +25
- Multiple MA Measures: +15
- New Patient: +10
```

---

## Golden Standard Compliance

All test cases from PRD implemented:
- TC-GS-001 to TC-GS-025: PDC calculation formulas
- TC-PD-017 to TC-PD-023: Fragility tier assignment
- F055-F064: Calculation engine specs
- TS-PD-01 to TS-PD-07: Real-world scenarios

---

## Usage Example

```typescript
import { calculatePDC } from '@/lib/pdc';
import { calculateFragility } from '@/lib/pdc';

// Calculate PDC from fill records
const pdcResult = calculatePDC({
  fills: [{ fillDate: new Date('2025-01-15'), daysSupply: 30 }],
  measurementPeriod: { start: new Date('2025-01-01'), end: new Date('2025-12-31') },
  currentDate: new Date('2025-06-15'),
});

// Determine fragility tier
const fragility = calculateFragility({
  pdcResult,
  refillsRemaining: 3,
  measureTypes: ['MAH'],
  isNewPatient: false,
  currentDate: new Date('2025-06-15'),
});
```

---

## Next Phase

→ **Phase 1.5**: Medication-Level PDC Storage (COMPLETED)
