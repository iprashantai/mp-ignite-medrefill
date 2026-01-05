# Phase 2A: Trigger Mechanisms (PDC Orchestrator + Nightly Bot)

## Status: ✅ COMPLETE

**Completed**: 2025-01-05

---

## Scope

**ONLY Phase 2A** - Build trigger mechanisms to populate Patient extensions with PDC data.

Phase 2B (UI) is excluded from this plan.

---

## User Decisions

| Decision          | Choice                                          |
| ----------------- | ----------------------------------------------- |
| Trigger mechanism | **Medplum Bots**                                |
| Scope             | **Both measure-level AND medication-level PDC** |

---

## Files Created/Modified

### New Files Created

| File                                            | Purpose                                                  | Status     |
| ----------------------------------------------- | -------------------------------------------------------- | ---------- |
| `src/lib/pdc/orchestrator.ts`                   | Orchestrates all Phase 1/1.5 services for single patient | ✅ Created |
| `src/lib/pdc/__tests__/orchestrator.test.ts`    | Unit tests for orchestrator (21 tests)                   | ✅ Created |
| `src/bots/pdc-nightly-calculator/index.ts`      | Medplum Bot handler                                      | ✅ Created |
| `src/bots/pdc-nightly-calculator/index.test.ts` | Bot unit tests (8 tests)                                 | ✅ Created |
| `src/bots/shared/bot-utils.ts`                  | Shared bot utilities                                     | ✅ Created |
| `src/bots/shared/bot-types.ts`                  | Shared bot types                                         | ✅ Created |
| `medplum.config.json`                           | Bot deployment configuration                             | ✅ Created |
| `scripts/verify-trigger.ts`                     | End-to-end verification script                           | ✅ Created |
| `scripts/deploy-search-params.ts`               | SearchParameter deployment script                        | ✅ Updated |
| `scripts/check-stored-data.ts`                  | Data inspection utility                                  | ✅ Created |

### Modified Files

| File                                             | Changes                                         | Status     |
| ------------------------------------------------ | ----------------------------------------------- | ---------- |
| `src/lib/pdc/index.ts`                           | Export orchestrator functions                   | ✅ Updated |
| `src/lib/fhir/observation-service.ts`            | Add fallback for custom search parameters       | ✅ Updated |
| `src/lib/fhir/medication-observation-service.ts` | Add fallback for custom search parameters       | ✅ Updated |
| `src/lib/fhir/dispense-service.ts`               | Add SCD RxNorm codes for MA medication matching | ✅ Updated |

---

## Implementation Order (Completed)

| Step | Task                                                   | Status                      |
| ---- | ------------------------------------------------------ | --------------------------- |
| 1    | Create `src/lib/pdc/orchestrator.ts`                   | ✅ Done                     |
| 2    | Create `src/lib/pdc/__tests__/orchestrator.test.ts`    | ✅ Done                     |
| 3    | Create `src/bots/shared/bot-types.ts`                  | ✅ Done                     |
| 4    | Create `src/bots/shared/bot-utils.ts`                  | ✅ Done                     |
| 5    | Create `src/bots/pdc-nightly-calculator/index.ts`      | ✅ Done                     |
| 6    | Create `src/bots/pdc-nightly-calculator/index.test.ts` | ✅ Done                     |
| 7    | Create `medplum.config.json`                           | ✅ Done                     |
| 8    | Create `scripts/verify-trigger.ts`                     | ✅ Done                     |
| 9    | Run tests and verify                                   | ✅ Done (413 tests passing) |
| 10   | Deploy SearchParameters to Medplum                     | ✅ Done (7 parameters)      |
| 11   | Test with real Medplum data                            | ✅ Done                     |

---

## Orchestrator Flow

```
calculateAndStorePatientPDC(medplum, patientId, options):
  1. getPatientDispenses(patientId, year)
  2. groupDispensesByMeasure()
  3. For each measure (MAC/MAD/MAH):
     a. groupDispensesByMedication()
     b. For each medication:
        - calculatePDC() for single drug
        - calculateFragility()
        - storeMedicationPDCObservation()
     c. calculatePDC() for merged measure (HEDIS)
     d. calculateFragility() for measure
     e. storePDCObservation()
  4. updatePatientExtensions(patientId)
  5. Return summary
```

---

## Key Functions Implemented

### Orchestrator (`src/lib/pdc/orchestrator.ts`)

```typescript
// Main entry point for single patient
export async function calculateAndStorePatientPDC(
  medplum: MedplumClient,
  patientId: string,
  options: PDCOrchestratorOptions
): Promise<PDCOrchestratorResult>;

// Batch processing for nightly bot
export async function calculateBatchPatientPDC(
  medplum: MedplumClient,
  patientIds: string[],
  options: PDCOrchestratorOptions,
  onProgress?: ProgressCallback
): Promise<BatchPDCResult>;

// Grouping helpers
export function groupDispensesByMeasure(
  dispenses: MedicationDispense[]
): Map<MAMeasure, MedicationDispense[]>;
export function groupDispensesByMedication(
  dispenses: MedicationDispense[]
): Map<string, MedicationDispense[]>;
```

### Bot Handler (`src/bots/pdc-nightly-calculator/index.ts`)

```typescript
// Main bot handler (CRON triggered at 2 AM)
export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Resource>
): Promise<BatchProcessingResult>;

// On-demand single patient processing
export async function processSinglePatient(
  medplum: MedplumClient,
  patientId: string,
  options?: Partial<PDCOrchestratorOptions>
): Promise<PDCOrchestratorResult>;
```

### Bot Utilities (`src/bots/shared/bot-utils.ts`)

```typescript
export function findPatientsForPDCCalculation(medplum, criteria): Promise<string[]>
export function processBatches<T, R>(items, processor, batchSize, delay): Promise<R[]>
export function createBatchResult(executionId, startedAt, results): BatchProcessingResult
export function generateExecutionId(): string
export function logInfo/logWarn/logError(message, context): void
```

---

## Data Storage Locations

### Measure-Level PDC → `Observation` resources

**Code**: `pdc-mac`, `pdc-mad`, or `pdc-mah`

| Field              | Extension URL                     | Value Type     |
| ------------------ | --------------------------------- | -------------- |
| PDC Value          | `Observation.valueQuantity.value` | decimal (0-1)  |
| Fragility Tier     | `.../fragility-tier`              | `valueCode`    |
| Priority Score     | `.../priority-score`              | `valueInteger` |
| Is Current         | `.../is-current-pdc`              | `valueBoolean` |
| MA Measure         | `.../ma-measure`                  | `valueCode`    |
| Days Until Runout  | `.../days-until-runout`           | `valueInteger` |
| Gap Days Remaining | `.../gap-days-remaining`          | `valueInteger` |
| Delay Budget       | `.../delay-budget`                | `valueInteger` |
| Treatment Period   | `.../treatment-period`            | `valuePeriod`  |
| Q4 Adjusted        | `.../q4-adjusted`                 | `valueBoolean` |

### Medication-Level PDC → `Observation` resources

**Code**: `pdc-medication`

Same fields as measure-level PLUS:

| Field                 | Extension URL                   | Value Type     |
| --------------------- | ------------------------------- | -------------- |
| Medication RxNorm     | `.../medication-rxnorm`         | `valueCode`    |
| Medication Display    | `.../medication-display`        | `valueString`  |
| Estimated Days/Refill | `.../estimated-days-per-refill` | `valueInteger` |
| Remaining Refills     | `.../remaining-refills`         | `valueInteger` |
| Supply On Hand        | `.../supply-on-hand`            | `valueInteger` |
| Coverage Shortfall    | `.../coverage-shortfall`        | `valueInteger` |

### Patient Summary → `Patient` resource extensions

| Field                  | Extension URL                | Value Type        |
| ---------------------- | ---------------------------- | ----------------- |
| Worst Fragility Tier   | `.../current-fragility-tier` | `valueCode`       |
| Highest Priority Score | `.../current-priority-score` | `valueInteger`    |
| PDC Summary            | `.../current-pdc-summary`    | nested extensions |

---

## Verification Results

### Test Results

- **413 tests passing** (all Phase 1, 1.5, and 2A tests)
- No regressions in existing functionality

### Real Data Verification

```
Patient: e6c411a4-403b-4914-aac3-9e0a9ff4a7fb
Measure: MAH (Hypertension)
PDC: 9.0%
Fragility Tier: F1_IMMINENT (Critical)
Medication: Hydrochlorothiazide 25 MG Oral Tablet
```

### SearchParameters Deployed

1. `fragility-tier` - Search Observations by fragility tier
2. `priority-score` - Sort by priority score
3. `is-current-pdc` - Filter to current observations only
4. `ma-measure` - Filter by MA measure type
5. `days-until-runout` - Filter by runout urgency
6. `patient-fragility-tier` - Search Patients by tier
7. `patient-priority-score` - Sort Patients by priority

---

## Verification Checklist

- [x] Orchestrator calculates PDC for single patient
- [x] Orchestrator creates measure-level Observations
- [x] Orchestrator creates medication-level Observations
- [x] Orchestrator updates Patient extensions
- [x] Bot processes all patients without crashing
- [x] Bot handles errors gracefully
- [x] All 413 tests pass
- [x] SearchParameters deployed to Medplum
- [x] Real patient data processed successfully

---

## Git Commits

| Commit    | Description                                                       |
| --------- | ----------------------------------------------------------------- |
| `5d030c3` | feat(phase2a): add PDC orchestrator for patient calculation       |
| `f2bb57c` | feat(phase2a): add Medplum bot infrastructure for PDC calculation |
| `b8575f6` | fix(fhir): add fallback for custom search parameter queries       |
| `de9b184` | feat(fhir): add SCD RxNorm codes for MA medication matching       |
| `513d50f` | feat(phase2a): add bot config and verification scripts            |
| `5323fde` | docs: mark Phase 1 and 1.5 as complete with verification          |

---

## Next Steps

**Phase 2B: UI Implementation** - See `docs/implementation/PHASE2_PATIENT_LIST_PLAN.md`

The calculated fields are now available in Medplum FHIR DB for the Patient List UI:

- Patient extensions contain denormalized summary data
- Observation resources contain detailed PDC metrics
- SearchParameters enable efficient querying
