# Phase 1.5: Medication-Level PDC Storage

> **Status:** ✅ COMPLETED
> **Completed:** January 5, 2026
> **Tests:** 58 new tests (384 total passing)

## Overview

Adds medication-level PDC storage to complement measure-level. Creates **three-level hierarchy**:

```
Patient (aggregated worst-case metrics)
  └── Measure-Level Observations (MAC/MAD/MAH) [Phase 1]
        └── Medication-Level Observations (individual drugs) [Phase 1.5]
```

**Key Insight**: Measure-level PDC uses HEDIS interval merging (all drugs combined), while medication-level PDC calculates each drug independently.

---

## Implementation Summary

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/pdc/refill-calculator.ts` | Coverage shortfall, remaining refills, supply-on-hand |
| `src/lib/fhir/medication-observation-service.ts` | Store/query medication-level Observations |
| `src/lib/pdc/__tests__/refill-calculator.test.ts` | 38 tests for refill calculations |
| `src/lib/fhir/__tests__/medication-observation-service.test.ts` | 20 tests for observation CRUD |
| `docs/.../search-parameters/medication-observation-search.json` | FHIR SearchParameter definitions |

### Files Modified

| File | Changes |
|------|---------|
| `src/lib/fhir/types.ts` | Added `MEDICATION_OBSERVATION_EXTENSION_URLS` (6 new URLs) |
| `src/lib/fhir/index.ts` | Export medication-observation-service |
| `src/lib/pdc/index.ts` | Export refill-calculator |
| `src/lib/fhir/__tests__/fixtures/mock-medplum.ts` | Added `createMockMedicationPDCObservation` |

---

## Key Formulas

### Coverage Shortfall (`refill-calculator.ts:50`)
```typescript
coverageShortfall = max(0, daysToYearEnd - supplyOnHand)
```

### Remaining Refills (`refill-calculator.ts:76`)
```typescript
remainingRefills = ceil(coverageShortfall / estimatedDaysPerRefill)
```

### Supply On Hand (`refill-calculator.ts:104`)
```typescript
supplyOnHand = max(0, daysSupply - daysSinceLastFill)
```

---

## Extension URLs

New medication-specific extensions in `MEDICATION_OBSERVATION_EXTENSION_URLS`:

| Extension | Type | Purpose |
|-----------|------|---------|
| `medication-rxnorm` | valueCode | RxNorm code (e.g., "314076") |
| `medication-display` | valueString | Display name (e.g., "Lisinopril 10mg") |
| `estimated-days-per-refill` | valueInteger | Avg days from fill history |
| `remaining-refills` | valueInteger | Refills needed to reach year-end |
| `supply-on-hand` | valueInteger | Days of supply remaining |
| `coverage-shortfall` | valueInteger | Days short of year-end |
| `parent-measure-observation` | valueReference | Link to measure-level Observation |

---

## Observation Structure

```typescript
{
  resourceType: 'Observation',
  code: { coding: [{ code: 'pdc-medication' }] },  // Distinct from 'pdc-mac/mad/mah'
  valueQuantity: { value: 0.78, unit: 'ratio' },
  extension: [
    // Shared with measure-level
    { url: '.../fragility-tier', valueCode: 'F2_FRAGILE' },
    { url: '.../priority-score', valueInteger: 80 },
    { url: '.../is-current-pdc', valueBoolean: true },
    // Medication-specific
    { url: '.../medication-rxnorm', valueCode: '314076' },
    { url: '.../remaining-refills', valueInteger: 2 },
    { url: '.../supply-on-hand', valueInteger: 12 },
  ]
}
```

---

## Demo Scripts

Located in `scripts/pdc-demo/`:

| Script | Purpose |
|--------|---------|
| `calculate-real-patient-pdc.ts` | PDC for real Medplum patient (multi-year, multi-measure) |
| `calculate-sample-pdc.ts` | PDC with synthetic test data |
| `find-multi-measure-patient.ts` | Find patients with MAC+MAD+MAH |
| `export-pdc-to-excel.ts` | Detailed Excel workbook with calculation steps |
| `verify-medication-pdc.ts` | Unit verification tests |
| `explain-overlap-calculation.ts` | HEDIS interval merging explainer |

---

## Usage Example

```typescript
import { calculateCoverageShortfall, calculateRemainingRefills } from '@/lib/pdc';
import { storeMedicationPDCObservation } from '@/lib/fhir';

// Calculate refills needed
const shortfall = calculateCoverageShortfall({
  daysRemainingUntilYearEnd: 90,
  daysOfSupplyOnHand: 15,
});
// → 75 days

const refills = calculateRemainingRefills({
  coverageShortfall: shortfall,
  standardDaysSupply: 30,
});
// → { remainingRefills: 3, estimatedDaysPerRefill: 30 }

// Store medication-level observation
await storeMedicationPDCObservation(medplum, {
  patientId: 'patient-123',
  measure: 'MAH',
  medicationRxnorm: '314076',
  medicationDisplay: 'Lisinopril 10mg',
  pdc: 0.78,
  remainingRefills: 3,
  supplyOnHand: 15,
  coverageShortfall: 75,
  // ... other fields
});
```

---

## Measure vs Medication PDC

| Aspect | Measure-Level | Medication-Level |
|--------|---------------|------------------|
| **PDC Calculation** | All drugs merged (HEDIS) | Single drug only |
| **Overlapping fills** | Counted once | N/A (single drug) |
| **Observation code** | `pdc-mac/mad/mah` | `pdc-medication` |
| **Refills** | Not tracked | Per-medication |
| **Use Case** | HEDIS Star Ratings | Individual drug monitoring |

---

## Pending (Optional)

- Step 8: Automated `calculate-patient-pdc.ts` with medication loop (demo scripts cover this manually)
- Deploy SearchParameters to Medplum production

---

## Related Files

- Phase 1 Plan: `docs/implementation/phase-1-core-engine/PHASE_1_MASTER_PLAN.md`
- Demo README: `scripts/pdc-demo/README.md`
- Excel Output: `scripts/pdc-demo/pdc-calculation-details.xlsx`
