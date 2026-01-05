# Phase 1.5: Medication-Level PDC Storage - Implementation Complete

> **Status:** COMPLETED
> **Completed Date:** January 5, 2026
> **Tests:** 384 passing (includes Phase 1)

## Overview

Add medication-level PDC storage to complement the existing measure-level implementation. This creates a **three-level storage hierarchy**:

```
Patient (aggregated worst-case metrics)
  └── Measure-Level Observations (MAC/MAD/MAH) [Phase 1]
        └── Medication-Level Observations (individual drugs) [Phase 1.5]
```

**Key Decisions:**
- Storage: Observation per medication (code: `pdc-medication`)
- Aggregation: Calculate both independently (medication PDC from single drug, measure PDC from all drugs merged)
- Refills: Calculate from coverage shortfall formula

---

## Implementation Status

| Component | Status | Tests |
|-----------|--------|-------|
| Medication Extension URLs | ✅ Complete | - |
| Refill Calculator | ✅ Complete | 18 tests |
| Medication Observation Service | ✅ Complete | 24 tests |
| Mock Factories | ✅ Complete | - |
| Demo Scripts | ✅ Complete | - |

---

## File Reference

### New Files Created

| File | Purpose | Key Exports |
|------|---------|-------------|
| [medication-observation-service.ts](../../../src/lib/fhir/medication-observation-service.ts) | Store/query medication-level PDC Observations | `storeMedicationPDCObservation`, `getCurrentMedicationPDCObservation`, `getAllCurrentMedicationPDCObservations`, `parseMedicationPDCObservation` |
| [refill-calculator.ts](../../../src/lib/pdc/refill-calculator.ts) | Coverage shortfall and remaining refills calculation | `calculateCoverageShortfall`, `calculateRemainingRefills`, `calculateSupplyOnHand`, `calculateDaysToYearEnd` |
| [medication-observation-service.test.ts](../../../src/lib/fhir/__tests__/medication-observation-service.test.ts) | Unit tests for medication observation service | - |
| [refill-calculator.test.ts](../../../src/lib/pdc/__tests__/refill-calculator.test.ts) | Unit tests for refill calculator | - |

### Modified Files

| File | Changes |
|------|---------|
| [types.ts](../../../src/lib/fhir/types.ts) | Added `MEDICATION_OBSERVATION_EXTENSION_URLS`, `MEDICATION_OBSERVATION_CODE`, `MedicationPDCObservationInput`, `ParsedMedicationPDCObservation` |
| [index.ts](../../../src/lib/fhir/index.ts) | Export medication observation service |
| [index.ts](../../../src/lib/pdc/index.ts) | Export refill calculator |
| [mock-medplum.ts](../../../src/lib/fhir/__tests__/fixtures/mock-medplum.ts) | Added `createMockMedicationPDCObservation` factory |

### Demo Scripts

| Script | Location | Purpose |
|--------|----------|---------|
| [verify-medication-pdc.ts](../../../scripts/pdc-demo/verify-medication-pdc.ts) | `scripts/pdc-demo/` | Unit verification tests |
| [calculate-sample-pdc.ts](../../../scripts/pdc-demo/calculate-sample-pdc.ts) | `scripts/pdc-demo/` | PDC with synthetic test data |
| [calculate-real-patient-pdc.ts](../../../scripts/pdc-demo/calculate-real-patient-pdc.ts) | `scripts/pdc-demo/` | PDC with real Medplum patient |
| [find-multi-measure-patient.ts](../../../scripts/pdc-demo/find-multi-measure-patient.ts) | `scripts/pdc-demo/` | Find patients with multiple measures |
| [export-pdc-to-excel.ts](../../../scripts/pdc-demo/export-pdc-to-excel.ts) | `scripts/pdc-demo/` | Export detailed calculations to Excel |
| [explain-overlap-calculation.ts](../../../scripts/pdc-demo/explain-overlap-calculation.ts) | `scripts/pdc-demo/` | Demonstrate HEDIS interval merging |

---

## Key Algorithms

### 1. Coverage Shortfall

```
Coverage Shortfall = max(0, Days to Year End - Supply on Hand)
```

**File:** [refill-calculator.ts](../../../src/lib/pdc/refill-calculator.ts) → `calculateCoverageShortfall()`

### 2. Remaining Refills

```
Remaining Refills = ceil(Coverage Shortfall / Estimated Days Per Refill)

Where:
- Estimated Days Per Refill = Average from dispense history, or default 30
```

**File:** [refill-calculator.ts](../../../src/lib/pdc/refill-calculator.ts) → `calculateRemainingRefills()`

### 3. Supply on Hand

```
Supply on Hand = max(0, Days Supply - Days Since Dispense)
```

**File:** [refill-calculator.ts](../../../src/lib/pdc/refill-calculator.ts) → `calculateSupplyOnHand()`

---

## FHIR Data Model

### Medication-Level Observation Structure

```typescript
{
  resourceType: 'Observation',
  code: { coding: [{ code: 'pdc-medication', display: 'PDC Score - Individual Medication' }] },
  valueQuantity: { value: 0.85, unit: 'ratio' },
  extension: [
    // Shared extensions (same as measure-level)
    { url: '.../fragility-tier', valueCode: 'F2_FRAGILE' },
    { url: '.../priority-score', valueInteger: 80 },
    { url: '.../is-current-pdc', valueBoolean: true },
    { url: '.../days-until-runout', valueInteger: 5 },
    { url: '.../gap-days-remaining', valueInteger: 15 },
    { url: '.../delay-budget', valueInteger: 3 },
    { url: '.../treatment-period', valuePeriod: {...} },
    { url: '.../q4-adjusted', valueBoolean: false },
    { url: '.../ma-measure', valueCode: 'MAH' },

    // Medication-specific extensions (NEW)
    { url: '.../medication-rxnorm', valueCode: '314076' },
    { url: '.../medication-display', valueString: 'Lisinopril 10mg' },
    { url: '.../parent-measure-observation', valueReference: { reference: 'Observation/xyz' } },
    { url: '.../estimated-days-per-refill', valueInteger: 30 },
    { url: '.../remaining-refills', valueInteger: 5 },
    { url: '.../supply-on-hand', valueInteger: 12 },
    { url: '.../coverage-shortfall', valueInteger: 150 }
  ]
}
```

### New Extension URLs

**Base:** `https://ignitehealth.io/fhir/StructureDefinition`

| Extension | Type | Purpose |
|-----------|------|---------|
| `/medication-rxnorm` | code | RxNorm code for specific medication |
| `/medication-display` | string | Human-readable medication name |
| `/parent-measure-observation` | Reference | Link to parent measure-level observation |
| `/estimated-days-per-refill` | integer | Average days supply from history |
| `/remaining-refills` | integer | Refills needed to reach year-end |
| `/supply-on-hand` | integer | Days of supply currently remaining |
| `/coverage-shortfall` | integer | Days short of year-end coverage |

---

## Measure vs Medication PDC Comparison

| Field | Measure-Level | Medication-Level |
|-------|---------------|------------------|
| PDC | All drugs merged (HEDIS) | Single drug only |
| Fragility Tier | Aggregated worst | Per medication |
| Priority Score | Max across meds | Per medication |
| Gap Days Remaining | Measure total | Per medication |
| Delay Budget | Uses measure refills | Uses medication refills |
| Days to Runout | Earliest across meds | Per medication |
| Remaining Refills | N/A | Per medication (NEW) |
| Supply on Hand | N/A | Per medication (NEW) |
| RxNorm Code | N/A | Yes (NEW) |

---

## Usage Examples

### Calculate Refills Needed

```typescript
import { calculateRemainingRefills, calculateCoverageShortfall } from '@/lib/pdc';

const shortfall = calculateCoverageShortfall({
  daysRemainingUntilYearEnd: 100,
  daysOfSupplyOnHand: 30,
});
// Returns: 70

const refills = calculateRemainingRefills({
  coverageShortfall: 70,
  standardDaysSupply: 30,
});
// Returns: { remainingRefills: 3, estimatedDaysPerRefill: 30, reasoning: '...' }
```

### Store Medication-Level Observation

```typescript
import { storeMedicationPDCObservation } from '@/lib/fhir';

const observation = await storeMedicationPDCObservation(medplum, {
  patientId: 'patient-123',
  measure: 'MAH',
  medicationRxnorm: '314076',
  medicationDisplay: 'Lisinopril 10mg',
  pdc: 0.78,
  pdcStatusQuo: 0.78,
  pdcPerfect: 0.88,
  coveredDays: 285,
  treatmentDays: 365,
  gapDaysRemaining: 8,
  delayBudget: 4,
  daysUntilRunout: 5,
  fragilityTier: 'F2_FRAGILE',
  priorityScore: 80,
  q4Adjusted: false,
  treatmentPeriod: { start: '2025-01-15', end: '2025-12-31' },
  estimatedDaysPerRefill: 30,
  remainingRefills: 2,
  supplyOnHand: 12,
  coverageShortfall: 60,
});
```

### Query Medication Observations

```typescript
import {
  getCurrentMedicationPDCObservation,
  getAllCurrentMedicationPDCObservations
} from '@/lib/fhir';

// Get specific medication
const lisinopril = await getCurrentMedicationPDCObservation(
  medplum,
  'patient-123',
  '314076'  // RxNorm code
);

// Get all medications for patient
const allMeds = await getAllCurrentMedicationPDCObservations(
  medplum,
  'patient-123'
);

// Get medications for specific measure
const mahMeds = await getAllCurrentMedicationPDCObservations(
  medplum,
  'patient-123',
  'MAH'
);
```

### Parse Medication Observation

```typescript
import { parseMedicationPDCObservation } from '@/lib/fhir';

const parsed = parseMedicationPDCObservation(observation);
console.log(parsed.medicationRxnorm);      // '314076'
console.log(parsed.medicationDisplay);     // 'Lisinopril 10mg'
console.log(parsed.remainingRefills);      // 2
console.log(parsed.supplyOnHand);          // 12
console.log(parsed.coverageShortfall);     // 60
```

---

## Verification

Run all tests:
```bash
npm test
```

Run Phase 1.5 specific tests:
```bash
npm test -- src/lib/pdc/__tests__/refill-calculator.test.ts
npm test -- src/lib/fhir/__tests__/medication-observation-service.test.ts
```

Run demo scripts:
```bash
npx tsx scripts/pdc-demo/verify-medication-pdc.ts
npx tsx scripts/pdc-demo/explain-overlap-calculation.ts
npx tsx scripts/pdc-demo/export-pdc-to-excel.ts
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Patient Resource                          │
│  Extensions: worst-case PDC, fragility tier, priority score  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Measure-Level Observations                       │
│  Code: pdc-mac | pdc-mad | pdc-mah                           │
│  PDC: All drugs merged using HEDIS interval merging          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            Medication-Level Observations                      │
│  Code: pdc-medication                                         │
│  PDC: Single drug only                                        │
│  Extensions: rxnorm, remaining-refills, supply-on-hand        │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

- Phase 2: Integrate with UI components for patient detail view
- Display medication-level PDC alongside measure-level
- Show remaining refills and supply on hand in medication cards
