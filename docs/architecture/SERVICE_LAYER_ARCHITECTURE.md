# Service Layer Architecture

## Overview

The service layer connects the Next.js UI to the Medplum FHIR backend, providing a clean abstraction over FHIR resources and transforming data into shapes suitable for the legacy UI components.

**Architecture Strategy**: The codebase uses a **3-layer adapter pattern**:

1. **FHIR Services** - Direct FHIR resource operations (dispense queries, observation storage)
2. **Adapter Layer** - Transforms FHIR resources to legacy UI data shapes
3. **Service Shims** - Provides legacy API interfaces that delegate to FHIR services

This architecture allows the UI (copied from legacy) to work without modification while the backend uses modern FHIR standards.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UI LAYER (React)                           │
│  Components copied from legacy repo - expect legacy data shape      │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                      SERVICE SHIMS                                  │
│  Provide legacy API compatibility (pdcDataService, etc.)            │
│  Delegate to adapter layer                                          │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                      ADAPTER LAYER                                  │
│  Transform FHIR → Legacy format                                     │
│  constructLegacyPatientObject(), loadPatientsWithLegacyShape()      │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                      FHIR SERVICES                                  │
│  dispense-service, observation-service,                             │
│  medication-observation-service, patient-extensions                 │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                      MEDPLUM FHIR API                               │
│  Patient, MedicationDispense, Observation resources                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Adapter Layer

**Purpose**: Transform FHIR resources into the legacy data shape expected by UI components that were copied from the legacy repository.

**Main File**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/lib/adapters/legacy-patient-adapter.ts`

### Why This Exists

The UI components were copied from a legacy Firebase-based application that had a different data structure. Rather than rewriting all UI code, we use an adapter to transform FHIR data into the expected legacy shape.

### Key Functions

#### `constructLegacyPatientObject()`

**Signature**:
```typescript
async function constructLegacyPatientObject(
  patientId: string,
  medplum: MedplumClient
): Promise<LegacyPatient>
```

**Purpose**: Transforms a single FHIR Patient resource (with extensions and related Observations) into a complete legacy patient object.

**Data Flow**:

```
1. Read Patient resource from Medplum
   ↓
2. Extract denormalized summary from Patient extensions
   (populated by Phase 2A nightly bot)
   ↓
3. Query all current PDC Observations for patient
   getAllCurrentPDCObservations(medplum, patientId)
   ↓
4. Transform each Observation → LegacyMedication
   transformObservationToMedication(obs, patientId)
   ↓
5. Calculate aggregate metrics
   - allMedsPDC (worst PDC across measures)
   - worstFragilityTier
   - highestPriorityScore
   - passingCount, atRiskCount, failingCount
   ↓
6. Calculate per-measure metrics
   - MAC: currentPDC, fragilityTier, medications[]
   - MAD: currentPDC, fragilityTier, medications[]
   - MAH: currentPDC, fragilityTier, medications[]
   ↓
7. Determine flags
   - in14DayQueue (daysToRunout ≤ 14)
   - isAtRisk (PDC < 80)
   - isFailing (PDC < 60)
   ↓
8. Return complete LegacyPatient object
```

**Field-by-Field Transformation**:

| Legacy Field | FHIR Source | Extraction Method |
|--------------|-------------|-------------------|
| `id` | `Patient.id` | Direct |
| `mrn` | `Patient.identifier[0].value` | First identifier or fallback to id |
| `firstName` | `Patient.name[0].given[0]` | Parse name array |
| `lastName` | `Patient.name[0].family` | Parse name array |
| `name` | `Patient.name[0]` | Join given + family |
| `dateOfBirth` | `Patient.birthDate` | Direct |
| `age` | Calculated | `calculateAge(birthDate)` |
| `gender` | `Patient.gender` | Direct |
| `medications[]` | `Observation` resources | Query + transform per medication |
| `perMeasure` | Calculated | Group medications by measure |
| `aggregateMetrics.allMedsPDC` | Calculated | `Math.min(...medications.map(m => m.currentPdc))` |
| `aggregateMetrics.worstFragilityTier` | Calculated | Worst tier from all medications |
| `aggregateMetrics.highestPriorityScore` | Calculated | `Math.max(...medications.map(m => m.priorityScore))` |
| `currentPDC` | Same as `allMedsPDC` | Aggregate from medications |
| `fragilityTier` | Same as `worstFragilityTier` | Aggregate from medications |
| `priorityScore` | Same as `highestPriorityScore` | Aggregate from medications |
| `in14DayQueue` | Calculated | `daysToRunout <= 14` |
| `daysToRunout` | Calculated | `Math.min(...medications.map(m => m.daysToRunout))` |
| `nextRefillDue` | Calculated | Earliest date from medications |
| `isAtRisk` | Calculated | `allMedsPDC < 80` |
| `isFailing` | Calculated | `allMedsPDC < 60` |
| `crmStatus` | Stub | Currently returns 'not_contacted' |
| `campaigns` | Stub | Currently returns empty array |
| `_version` | Constant | '5.0-fhir-adapter' |
| `_computedAt` | `Patient.extension` or now | PDC summary lastUpdated timestamp |
| `_fhirPatient` | Original resource | For reference/debugging |

**Example Usage**:

```typescript
import { constructLegacyPatientObject } from '@/lib/adapters/legacy-patient-adapter';

const legacyPatient = await constructLegacyPatientObject('patient-123', medplum);

console.log(legacyPatient);
// {
//   id: 'patient-123',
//   mrn: '12345678',
//   firstName: 'John',
//   lastName: 'Doe',
//   name: 'John Doe',
//   dateOfBirth: '1955-03-15',
//   age: 69,
//   gender: 'male',
//   medications: [
//     {
//       id: 'obs-123',
//       medicationName: 'Atorvastatin 20mg',
//       measure: 'MAC',
//       currentPdc: 72,
//       fragilityTier: 'F2_FRAGILE',
//       gapDaysRemaining: 15,
//       daysToRunout: 5,
//       ...
//     }
//   ],
//   perMeasure: {
//     MAC: { currentPDC: 72, fragilityTier: 'F2_FRAGILE', medications: [...] },
//     MAD: { currentPDC: 85, fragilityTier: 'F4_COMFORTABLE', medications: [...] }
//   },
//   aggregateMetrics: {
//     allMedsPDC: 72,
//     worstFragilityTier: 'F2_FRAGILE',
//     highestPriorityScore: 95,
//     totalMedications: 5,
//     maMedications: 3,
//     passingCount: 1,
//     atRiskCount: 1,
//     failingCount: 1
//   },
//   currentPDC: 72,
//   fragilityTier: 'F2_FRAGILE',
//   priorityScore: 95,
//   in14DayQueue: true,
//   daysToRunout: 5,
//   isAtRisk: true,
//   isFailing: false,
//   crmStatus: 'not_contacted',
//   campaigns: []
// }
```

#### `loadPatientsWithLegacyShape()`

**Signature**:
```typescript
async function loadPatientsWithLegacyShape(
  medplum: MedplumClient,
  options?: {
    active?: boolean;
    _count?: number;
    _sort?: string;
  }
): Promise<LegacyPatient[]>
```

**Purpose**: Query multiple patients from Medplum and transform each to legacy shape.

**Data Flow**:

```
1. Search Patient resources with filters
   medplum.searchResources('Patient', { active: 'true', _count: 100 })
   ↓
2. Transform each patient in parallel
   Promise.all(patients.map(p => constructLegacyPatientObject(p.id, medplum)))
   ↓
3. Return array of LegacyPatient objects
```

**Example**:

```typescript
import { loadPatientsWithLegacyShape } from '@/lib/adapters/legacy-patient-adapter';

const patients = await loadPatientsWithLegacyShape(medplum, {
  active: true,
  _count: 100,
  _sort: '-_lastUpdated'
});

console.log(`Loaded ${patients.length} patients`);
// Loaded 100 patients
```

#### `transformObservationToMedication()`

**Purpose**: Convert a single FHIR Observation (PDC data) into a LegacyMedication object.

**Field Extraction Logic**:

```typescript
// Extract measure
let measure = getCodeExtension(obs.extension, EXTENSION_URLS.MA_MEASURE);
if (!measure) {
  // Fallback: infer from observation code display
  const codeDisplay = obs.code?.coding?.[0]?.display || '';
  if (codeDisplay.includes('MAC')) measure = 'MAC';
  else if (codeDisplay.includes('MAD')) measure = 'MAD';
  else if (codeDisplay.includes('MAH')) measure = 'MAH';
}

// Extract medication name
const medicationDisplay =
  getStringExtension(obs.extension, EXTENSION_URLS.MEDICATION_DISPLAY) ||
  obs.code?.text ||
  obs.code?.coding?.[0]?.display ||
  'Unknown Medication';

// Extract PDC value
const pdc = obs.valueQuantity?.value || null;
const status = pdc >= 80 ? 'passing' : pdc >= 60 ? 'at-risk' : 'failing';

// Extract extensions
const gapDaysRemaining = getIntegerExtension(obs.extension, EXTENSION_URLS.GAP_DAYS_REMAINING);
const daysToRunout = getIntegerExtension(obs.extension, EXTENSION_URLS.DAYS_UNTIL_RUNOUT);
const fragilityTier = getCodeExtension(obs.extension, EXTENSION_URLS.FRAGILITY_TIER);
const priorityScore = getIntegerExtension(obs.extension, EXTENSION_URLS.PRIORITY_SCORE) || 0;

// Fallback: try to extract from observation components
if (obs.component) {
  for (const comp of obs.component) {
    const compCode = comp.code?.coding?.[0]?.code || '';
    if (compCode.includes('gap')) gapDaysRemaining = comp.valueInteger;
    if (compCode.includes('runout')) daysToRunout = comp.valueInteger;
    // ... etc
  }
}

return {
  id: obs.id || `obs-${patientId}-${measure}`,
  medicationName: medicationDisplay,
  drugName: medicationDisplay,
  measure,
  adherence: { pdc, status },
  currentPdc: pdc,
  gapDaysRemaining,
  daysToRunout,
  fragilityTier,
  priorityScore,
  // ... other fields
};
```

### Helper Functions

#### `parsePatientName()`
Extracts firstName, lastName, and fullName from FHIR Patient.name array.

#### `calculateAge()`
Calculates age from birthDate string (YYYY-MM-DD format).

#### `getPDCStatus()`
Maps PDC value to status: ≥80 → 'passing', 60-79 → 'at-risk', <60 → 'failing'.

#### `calculateAggregateMetrics()`
Aggregates metrics from medications array:
- allMedsPDC (minimum PDC)
- worstFragilityTier (most urgent tier)
- highestPriorityScore (maximum score)
- counts by status

#### `calculatePerMeasureMetrics()`
Groups medications by measure (MAC/MAD/MAH) and calculates metrics per measure.

---

## 2. Service Shims

**Purpose**: Provide legacy API interfaces that delegate to FHIR services, allowing legacy code to work without modification.

### `pdcDataService.ts`

**Location**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/lib/services-legacy/pdcDataService.ts`

**Purpose**: Mimics the legacy Firebase PDC data service API but delegates to the Medplum adapter layer.

**Original**: `legacy/src/services/pdcDataService.js` (Firebase)

**Key Functions**:

| Function | Legacy Behavior | New Implementation |
|----------|----------------|-------------------|
| `loadPatientsWithRxClaims()` | Load from Firebase with RX claims subcollection | Delegates to `loadPatientsWithLegacyShape()` |
| `buildMedicationsFromRxClaims()` | Transform RX claims to medications | Returns pre-built medications from adapter |
| `deriveAggregateAdherence()` | Calculate aggregate metrics | Returns pre-calculated aggregates from adapter |
| `normalizePatientForDisplay()` | Normalize various patient formats | Returns patient as-is (already normalized) |
| `calculatePDCFromClaims()` | PDC calculation from claims | Stub - PDC pre-calculated by Phase 1 engine |
| `invalidateRxClaimsCache()` | Clear cache | Stub - Medplum has built-in caching |
| `getCacheStatus()` | Get cache metadata | Returns stub data |

**Example Usage**:

```typescript
import { loadPatientsWithRxClaims } from '@/lib/services-legacy/pdcDataService';

// Legacy code can call this without modification
const patients = await loadPatientsWithRxClaims(medplum, {
  active: true,
  _count: 100,
  enrichWithAnalytics: true  // Ignored in Medplum version
});

// Returns LegacyPatient[] with same structure as Firebase version
```

### `patientDatasetLoader.ts`

**Location**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/lib/services-legacy/patientDatasetLoader.ts`

**Purpose**: Provides dataset abstraction for different patient sources (EMR demo data vs Batch Manager uploads).

**Key Constants**:

```typescript
export const PATIENT_DATASET_SOURCES = {
  EMR_DEMO: 'emr_demo',        // Default: Load from Medplum FHIR
  BATCH_MANAGER: 'batch_manager', // Load from batch upload
};

export const PATIENT_DATASETS = [
  {
    id: 'emr_demo',
    label: 'EMR • Medicare sample (500)',
    type: 'emr',
    description: 'Realistic Medicare patient data',
    isDefault: true,
  },
  {
    id: 'batch_manager',
    label: 'Batch Management • Select batch',
    type: 'batch',
    description: 'View patients from batch upload',
    requiresBatchSelection: true,
  },
];
```

**Key Functions**:

#### `loadAllPatientsFromFirestore()`
Despite the name, this actually loads from Medplum FHIR:

```typescript
export async function loadAllPatientsFromFirestore(medplum: MedplumClient): Promise<any[]> {
  console.log('Loading patients from Medplum FHIR backend...');

  const patients = await loadPatientsWithLegacyShape(medplum, {
    _count: 1000,
    _sort: '-_lastUpdated',
  });

  console.log(`✅ Loaded ${patients.length} patients from Medplum`);
  return patients;
}
```

#### `loadPatientDataset()`
Main entry point that routes to appropriate loader:

```typescript
export async function loadPatientDataset(
  datasetId: any,
  helpers: any = {},
  options: any = {}
): Promise<any[]> {
  const config = PATIENT_DATASETS.find(ds => ds.id === datasetId) ?? PATIENT_DATASETS[0];

  switch (config.type) {
    case 'emr': {
      if (!options.medplum) {
        throw new Error('Medplum client required for EMR dataset loader');
      }
      return loadAllPatientsFromFirestore(options.medplum);
    }

    case 'batch': {
      if (typeof helpers.loadBatchPatients !== 'function') {
        throw new Error('Batch dataset requested but no loader was provided.');
      }
      return helpers.loadBatchPatients(options);
    }

    default:
      throw new Error(`Unsupported dataset type: ${config.type}`);
  }
}
```

**Usage in Context Provider**:

```typescript
// In a React context
const loadPatients = async () => {
  const patients = await loadPatientDataset(
    PATIENT_DATASET_SOURCES.EMR_DEMO,
    {},
    { medplum }
  );
  setPatients(patients);
};
```

---

## 3. FHIR Services

FHIR services provide low-level access to FHIR resources with typed interfaces and helper functions.

### `dispense-service.ts`

**Location**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/lib/fhir/dispense-service.ts`

**Purpose**: Query and process MedicationDispense resources for PDC calculation.

**Key Constants**:

```typescript
const MA_RXNORM_CODES: Record<MAMeasure, Set<string>> = {
  MAC: new Set([
    '83367',  // Atorvastatin
    '36567',  // Simvastatin
    '617310', // atorvastatin 20 MG Oral Tablet
    // ... more codes
  ]),
  MAD: new Set([
    '6809',   // Metformin
    '860975', // Metformin 500mg ER
    // ... more codes
  ]),
  MAH: new Set([
    '310965', // Lisinopril
    '314076', // lisinopril 10 MG Oral Tablet
    // ... more codes
  ]),
};
```

**Key Functions**:

#### `getPatientDispenses()`

Query all dispenses for a patient in a measurement year:

```typescript
export async function getPatientDispenses(
  medplum: MedplumClient,
  patientId: string,
  measurementYear: number
): Promise<MedicationDispense[]>
```

**Implementation Details**:

```typescript
const startDate = `${measurementYear}-01-01`;
const endDate = `${measurementYear}-12-31`;

try {
  // Try Medplum-style parameter first
  dispenses = await medplum.searchResources('MedicationDispense', {
    subject: `Patient/${patientId}`,
    status: 'completed',
    whenhandedover: `ge${startDate}`,
    _count: 1000,
  });
} catch {
  // Fallback: fetch all, filter client-side
  dispenses = await medplum.searchResources('MedicationDispense', {
    subject: `Patient/${patientId}`,
    status: 'completed',
    _count: 1000,
  });

  // Filter by date range client-side
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  dispenses = dispenses.filter((d) => {
    const fillDate = extractFillDate(d);
    return fillDate >= startDateObj && fillDate <= endDateObj;
  });
}

// Sort by fill date ascending
return dispenses.sort((a, b) => {
  const dateA = extractFillDate(a);
  const dateB = extractFillDate(b);
  return dateA.getTime() - dateB.getTime();
});
```

#### `classifyDispenseByMeasure()`

Determine which MA measure a dispense belongs to:

```typescript
export function classifyDispenseByMeasure(
  dispense: MedicationDispense
): MAMeasure | null {
  const rxnormCode = extractMedicationCode(dispense);

  if (!rxnormCode) return null;

  if (MA_RXNORM_CODES.MAC.has(rxnormCode)) return 'MAC';
  if (MA_RXNORM_CODES.MAD.has(rxnormCode)) return 'MAD';
  if (MA_RXNORM_CODES.MAH.has(rxnormCode)) return 'MAH';

  return null;
}
```

#### Extraction Helpers

```typescript
// Extract days supply (defaults to 30 if missing)
extractDaysSupply(dispense: MedicationDispense): number

// Extract fill date from whenHandedOver
extractFillDate(dispense: MedicationDispense): Date | null

// Extract RxNorm code from medicationCodeableConcept
extractMedicationCode(dispense: MedicationDispense): string | null

// Check if dispense was reversed/cancelled
isReversedDispense(dispense: MedicationDispense): boolean

// Convert dispenses to fill records for PDC calculation
dispensesToFillRecords(dispenses: MedicationDispense[]): Array<{ fillDate: Date; daysSupply: number }>
```

### `observation-service.ts`

**Location**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/lib/fhir/observation-service.ts`

**Purpose**: Store and retrieve measure-level PDC Observation resources (MAC/MAD/MAH).

**Observation Codes**:

```typescript
const OBSERVATION_CODES: Record<MAMeasure, { code: string; display: string }> = {
  MAC: { code: 'pdc-mac', display: 'PDC Score - Cholesterol (MAC)' },
  MAD: { code: 'pdc-mad', display: 'PDC Score - Diabetes (MAD)' },
  MAH: { code: 'pdc-mah', display: 'PDC Score - Hypertension (MAH)' },
};
```

**Key Functions**:

#### `storePDCObservation()`

Create a new PDC Observation:

```typescript
export async function storePDCObservation(
  medplum: MedplumClient,
  input: PDCObservationInput
): Promise<Observation>
```

**Input Interface**:

```typescript
interface PDCObservationInput {
  patientId: string;
  measure: MAMeasure;              // MAC, MAD, or MAH
  pdc: number;                     // 0-1 ratio
  pdcStatusQuo: number;
  pdcPerfect: number;
  coveredDays: number;
  treatmentDays: number;
  gapDaysRemaining: number;
  delayBudget: number;
  daysUntilRunout: number;
  fragilityTier: FragilityTier;
  priorityScore: number;
  q4Adjusted: boolean;
  treatmentPeriod: TreatmentPeriod;
}
```

**Observation Structure**:

```typescript
{
  resourceType: 'Observation',
  status: 'final',
  code: {
    coding: [{
      system: 'https://ignitehealth.io/fhir/CodeSystem/adherence-metrics',
      code: 'pdc-mac',                // or pdc-mad, pdc-mah
      display: 'PDC Score - Cholesterol (MAC)'
    }]
  },
  subject: { reference: 'Patient/123' },
  effectiveDateTime: '2025-01-07T...',
  valueQuantity: {
    value: 0.72,                     // PDC ratio
    unit: 'ratio',
    system: 'http://unitsofmeasure.org',
    code: '1'
  },
  interpretation: [{
    coding: [{
      system: 'https://ignitehealth.io/fhir/CodeSystem/adherence-status',
      code: 'at-risk',               // adherent, at-risk, non-adherent
      display: 'At-Risk (PDC 60-79%)'
    }]
  }],
  extension: [
    { url: '...fragility-tier', valueCode: 'F2_FRAGILE' },
    { url: '...priority-score', valueInteger: 95 },
    { url: '...is-current-pdc', valueBoolean: true },
    { url: '...ma-measure', valueCode: 'MAC' },
    { url: '...days-until-runout', valueInteger: 5 },
    { url: '...gap-days-remaining', valueInteger: 15 },
    { url: '...delay-budget', valueInteger: 10 },
    { url: '...treatment-period', valuePeriod: { start: '2025-01-01', end: '2025-12-31' } },
    { url: '...q4-adjusted', valueBoolean: false }
  ]
}
```

#### `getCurrentPDCObservation()`

Get the current PDC observation for a patient-measure (marked with `is-current-pdc=true`):

```typescript
export async function getCurrentPDCObservation(
  medplum: MedplumClient,
  patientId: string,
  measure: MAMeasure
): Promise<Observation | null>
```

**Implementation with Fallback**:

```typescript
console.log(`🔍 Searching for ${measure} PDC observation for patient ${patientId}`);

// Strategy 1: Try with full code system URL
let allObservations = await medplum.searchResources('Observation', {
  subject: `Patient/${patientId}`,
  code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${OBSERVATION_CODES[measure].code}`,
  _sort: '-date',
  _count: '100',
});

// Strategy 2: If nothing found, try with just the code (no system)
if (allObservations.length === 0) {
  allObservations = await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    code: OBSERVATION_CODES[measure].code,
    _sort: '-date',
    _count: '100',
  });
}

// Strategy 3: If still nothing, get ALL observations and filter client-side
if (allObservations.length === 0) {
  const allPatientObs = await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    _sort: '-date',
    _count: '1000',
  });

  // Filter for this measure by checking code.coding array
  allObservations = allPatientObs.filter((obs) => {
    const codings = obs.code?.coding || [];
    return codings.some(
      (coding) =>
        coding.code === OBSERVATION_CODES[measure].code ||
        coding.display?.includes(measure)
    );
  });
}

// Try to find one marked as current
let current = allObservations.find((obs) => {
  return getBooleanExtension(obs.extension, EXTENSION_URLS.IS_CURRENT_PDC) === true;
});

// If no observation marked as current, use the most recent one
if (!current) {
  current = allObservations[0];
}

return current;
```

#### `getAllCurrentPDCObservations()`

Get all current PDC observations for a patient across all measures:

```typescript
export async function getAllCurrentPDCObservations(
  medplum: MedplumClient,
  patientId: string
): Promise<Map<MAMeasure, Observation>> {
  const result = new Map<MAMeasure, Observation>();

  for (const measure of ['MAC', 'MAD', 'MAH'] as MAMeasure[]) {
    const obs = await getCurrentPDCObservation(medplum, patientId, measure);
    if (obs) {
      result.set(measure, obs);
    }
  }

  return result;
}
```

#### `markPreviousObservationsNotCurrent()`

When storing a new PDC observation, mark previous observations as not current:

```typescript
export async function markPreviousObservationsNotCurrent(
  medplum: MedplumClient,
  patientId: string,
  measure: MAMeasure
): Promise<void> {
  let currentObservations: Observation[];

  try {
    // Try using custom search parameter first
    currentObservations = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${OBSERVATION_CODES[measure].code}`,
      'is-current-pdc': 'true',
    });
  } catch {
    // Fallback: search all observations and filter client-side
    const allObservations = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${OBSERVATION_CODES[measure].code}`,
    });

    currentObservations = allObservations.filter((obs) => {
      return getBooleanExtension(obs.extension, EXTENSION_URLS.IS_CURRENT_PDC) === true;
    });
  }

  // Update each to set is-current-pdc to false
  for (const obs of currentObservations) {
    const updatedExtensions = setExtensionValue(
      obs.extension,
      EXTENSION_URLS.IS_CURRENT_PDC,
      { valueBoolean: false }
    );

    await medplum.updateResource({
      ...obs,
      extension: updatedExtensions,
    });
  }
}
```

### `medication-observation-service.ts`

**Location**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/lib/fhir/medication-observation-service.ts`

**Purpose**: Store and retrieve medication-level PDC Observation resources (per individual drug, not just per measure).

**Observation Code**:

```typescript
const MEDICATION_OBSERVATION_CODE = {
  code: 'pdc-medication',
  display: 'PDC Score - Individual Medication',
};
```

**Key Functions**:

#### `storeMedicationPDCObservation()`

Create a medication-level PDC Observation:

```typescript
export async function storeMedicationPDCObservation(
  medplum: MedplumClient,
  input: MedicationPDCObservationInput
): Promise<Observation>
```

**Input Interface** (extends PDCObservationInput):

```typescript
interface MedicationPDCObservationInput {
  // Base fields (same as measure-level)
  patientId: string;
  measure: MAMeasure;
  pdc: number;
  // ... all PDC fields

  // Medication-specific fields
  medicationRxnorm: string;         // '314076' (Lisinopril 10mg)
  medicationDisplay: string;        // 'Lisinopril 10 MG Oral Tablet'
  estimatedDaysPerRefill: number;   // 30
  remainingRefills: number;         // 2
  supplyOnHand: number;             // 12 days
  coverageShortfall: number;        // 60 days
  parentObservationId?: string;     // Link to measure-level observation
}
```

**Extension URLs** (medication-specific):

```typescript
const MEDICATION_OBSERVATION_EXTENSION_URLS = {
  MEDICATION_RXNORM: '...medication-rxnorm',
  MEDICATION_DISPLAY: '...medication-display',
  ESTIMATED_DAYS_PER_REFILL: '...estimated-days-per-refill',
  REMAINING_REFILLS: '...remaining-refills',
  SUPPLY_ON_HAND: '...supply-on-hand',
  COVERAGE_SHORTFALL: '...coverage-shortfall',
  PARENT_MEASURE_OBSERVATION: '...parent-measure-observation',
};
```

#### `getAllCurrentMedicationPDCObservations()`

Get all current medication-level observations for a patient:

```typescript
export async function getAllCurrentMedicationPDCObservations(
  medplum: MedplumClient,
  patientId: string,
  measure?: MAMeasure  // Optional: filter by measure
): Promise<Observation[]>
```

**Implementation**:

```typescript
let observations: Observation[];

try {
  // Try using custom search parameter first
  observations = await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${MEDICATION_OBSERVATION_CODE.code}`,
    'is-current-pdc': 'true',
  });
} catch {
  // Fallback: search all observations and filter client-side
  const allObs = await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${MEDICATION_OBSERVATION_CODE.code}`,
  });

  observations = allObs.filter((obs) => {
    return getBooleanExtension(obs.extension, EXTENSION_URLS.IS_CURRENT_PDC) === true;
  });
}

// Filter by measure if specified
if (measure) {
  return observations.filter((obs) => {
    const obsMeasure = getCodeExtension(obs.extension, EXTENSION_URLS.MA_MEASURE);
    return obsMeasure === measure;
  });
}

return observations;
```

#### `parseMedicationPDCObservation()`

Extract structured data from medication observation:

```typescript
export function parseMedicationPDCObservation(
  observation: Observation
): ParsedMedicationPDCObservation {
  const pdc = observation.valueQuantity?.value ?? 0;
  const patientId = observation.subject?.reference?.replace('Patient/', '') ?? null;

  // Shared extensions
  const measure = getCodeExtension(observation.extension, EXTENSION_URLS.MA_MEASURE);
  const fragilityTier = getCodeExtension(observation.extension, EXTENSION_URLS.FRAGILITY_TIER);
  const priorityScore = getIntegerExtension(observation.extension, EXTENSION_URLS.PRIORITY_SCORE);
  // ... other shared fields

  // Medication-specific extensions
  const medicationRxnorm = getCodeExtension(
    observation.extension,
    MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM
  );
  const medicationDisplay = getStringExtension(
    observation.extension,
    MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_DISPLAY
  );
  const remainingRefills = getIntegerExtension(
    observation.extension,
    MEDICATION_OBSERVATION_EXTENSION_URLS.REMAINING_REFILLS
  );
  // ... other medication fields

  return {
    pdc,
    patientId,
    measure,
    medicationRxnorm,
    medicationDisplay,
    fragilityTier,
    priorityScore,
    remainingRefills,
    // ... all fields
  };
}
```

### `patient-extensions.ts`

**Location**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/lib/fhir/patient-extensions.ts`

**Purpose**: Maintain denormalized patient extensions for fast UI queries. Updates Patient resource with current fragility tier, priority score, and PDC summary when PDC Observations are created/updated.

**Extension URLs**:

```typescript
const PATIENT_EXTENSION_URLS = {
  CURRENT_FRAGILITY_TIER: 'https://ignitehealth.io/fhir/extensions/current-fragility-tier',
  CURRENT_PRIORITY_SCORE: 'https://ignitehealth.io/fhir/extensions/current-priority-score',
  DAYS_UNTIL_EARLIEST_RUNOUT: 'https://ignitehealth.io/fhir/extensions/days-until-earliest-runout',
  CURRENT_PDC_SUMMARY: 'https://ignitehealth.io/fhir/extensions/current-pdc-summary',
};
```

**Key Functions**:

#### `updatePatientExtensions()`

Update patient extensions with current PDC summary:

```typescript
export async function updatePatientExtensions(
  medplum: MedplumClient,
  patientId: string
): Promise<PatientExtensionUpdateResult>
```

**Data Flow**:

```
1. Fetch all current PDC observations for patient
   getAllCurrentPDCObservations(medplum, patientId)
   ↓
2. Calculate summary from observations
   calculatePatientSummary(observations)
   ↓
3. Build extension structures
   buildPatientExtensions(summary)
   ↓
4. Update Patient resource
   medplum.updateResource({ ...patient, extension: [...] })
   ↓
5. Return result with updated patient and summary
```

#### `calculatePatientSummary()`

Aggregate data from multiple observations:

```typescript
export function calculatePatientSummary(
  observations: Observation[]
): PatientPDCSummary {
  const tiers: FragilityTier[] = [];
  let highestPriority = 0;
  let minDaysToRunout: number | null = null;

  const pdcByMeasure: PatientPDCSummary['pdcByMeasure'] = {
    MAC: null,
    MAD: null,
    MAH: null,
  };

  for (const obs of observations) {
    // Extract fragility tier
    const tier = getCodeExtension(obs.extension, EXTENSION_URLS.FRAGILITY_TIER);
    if (tier) tiers.push(tier as FragilityTier);

    // Extract priority score
    const priority = getIntegerExtension(obs.extension, EXTENSION_URLS.PRIORITY_SCORE);
    if (priority > highestPriority) highestPriority = priority;

    // Extract days until runout
    const daysToRunout = getIntegerExtension(obs.extension, EXTENSION_URLS.DAYS_UNTIL_RUNOUT);
    if (daysToRunout !== null) {
      if (minDaysToRunout === null || daysToRunout < minDaysToRunout) {
        minDaysToRunout = daysToRunout;
      }
    }

    // Extract measure and PDC
    const measure = getCodeExtension(obs.extension, EXTENSION_URLS.MA_MEASURE);
    const pdc = obs.valueQuantity?.value;

    if (measure && pdc !== undefined) {
      pdcByMeasure[measure as MAMeasure] = pdc;
    }
  }

  return {
    worstTier: getWorstTier(tiers),
    highestPriorityScore: highestPriority,
    daysUntilEarliestRunout: minDaysToRunout,
    pdcByMeasure,
    lastUpdated: new Date().toISOString(),
  };
}
```

#### `buildPatientExtensions()`

Convert summary to FHIR extensions:

```typescript
export function buildPatientExtensions(summary: PatientPDCSummary): Extension[] {
  const extensions: Extension[] = [];

  // Current fragility tier
  extensions.push({
    url: PATIENT_EXTENSION_URLS.CURRENT_FRAGILITY_TIER,
    valueCode: summary.worstTier,
  });

  // Current priority score
  extensions.push({
    url: PATIENT_EXTENSION_URLS.CURRENT_PRIORITY_SCORE,
    valueInteger: summary.highestPriorityScore,
  });

  // Days until earliest runout
  if (summary.daysUntilEarliestRunout !== null) {
    extensions.push({
      url: PATIENT_EXTENSION_URLS.DAYS_UNTIL_EARLIEST_RUNOUT,
      valueInteger: summary.daysUntilEarliestRunout,
    });
  }

  // PDC summary (complex extension with nested sub-extensions)
  const pdcSummaryExtensions: Extension[] = [];

  if (summary.pdcByMeasure.MAC !== null) {
    pdcSummaryExtensions.push({
      url: 'mac',
      valueDecimal: summary.pdcByMeasure.MAC,
    });
  }

  if (summary.pdcByMeasure.MAD !== null) {
    pdcSummaryExtensions.push({
      url: 'mad',
      valueDecimal: summary.pdcByMeasure.MAD,
    });
  }

  if (summary.pdcByMeasure.MAH !== null) {
    pdcSummaryExtensions.push({
      url: 'mah',
      valueDecimal: summary.pdcByMeasure.MAH,
    });
  }

  pdcSummaryExtensions.push({
    url: 'lastUpdated',
    valueDateTime: summary.lastUpdated,
  });

  extensions.push({
    url: PATIENT_EXTENSION_URLS.CURRENT_PDC_SUMMARY,
    extension: pdcSummaryExtensions,
  });

  return extensions;
}
```

#### `extractPatientPDCSummary()`

Read PDC summary from patient extensions:

```typescript
export function extractPatientPDCSummary(
  patient: Patient
): PatientPDCSummary | null {
  if (!patient.extension) return null;

  const tierExt = patient.extension.find(
    (e) => e.url === PATIENT_EXTENSION_URLS.CURRENT_FRAGILITY_TIER
  );
  const priorityExt = patient.extension.find(
    (e) => e.url === PATIENT_EXTENSION_URLS.CURRENT_PRIORITY_SCORE
  );
  const runoutExt = patient.extension.find(
    (e) => e.url === PATIENT_EXTENSION_URLS.DAYS_UNTIL_EARLIEST_RUNOUT
  );
  const summaryExt = patient.extension.find(
    (e) => e.url === PATIENT_EXTENSION_URLS.CURRENT_PDC_SUMMARY
  );

  if (!tierExt && !priorityExt) return null;

  // Parse PDC by measure from nested extension
  const pdcByMeasure: PatientPDCSummary['pdcByMeasure'] = {
    MAC: null,
    MAD: null,
    MAH: null,
  };

  let lastUpdated = new Date().toISOString();

  if (summaryExt?.extension) {
    for (const ext of summaryExt.extension) {
      if (ext.url === 'mac' && ext.valueDecimal !== undefined) {
        pdcByMeasure.MAC = ext.valueDecimal;
      } else if (ext.url === 'mad' && ext.valueDecimal !== undefined) {
        pdcByMeasure.MAD = ext.valueDecimal;
      } else if (ext.url === 'mah' && ext.valueDecimal !== undefined) {
        pdcByMeasure.MAH = ext.valueDecimal;
      } else if (ext.url === 'lastUpdated' && ext.valueDateTime) {
        lastUpdated = ext.valueDateTime;
      }
    }
  }

  return {
    worstTier: (tierExt?.valueCode as FragilityTier) || 'COMPLIANT',
    highestPriorityScore: priorityExt?.valueInteger || 0,
    daysUntilEarliestRunout: runoutExt?.valueInteger ?? null,
    pdcByMeasure,
    lastUpdated,
  };
}
```

---

## 4. Context Providers

**Note**: No context providers were found in the codebase yet. The UI currently uses direct Medplum hooks (`useMedplum()`, `useSearchResources()`) rather than custom context providers.

**Future Recommendation**: As the application grows, consider adding context providers for:

1. **AppContext**: Global app state, feature flags, user preferences
2. **PatientDatasetContext**: Dataset selection (EMR demo vs Batch Manager)
3. **NotificationContext**: Toast notifications, error handling

---

## 5. Integration Patterns

### How UI Components Call Services

#### Pattern 1: Direct Medplum Hook Usage

Most common pattern for simple queries:

```typescript
'use client';

import { useMedplum } from '@medplum/react';
import { useEffect, useState } from 'react';
import { Patient } from '@medplum/fhirtypes';

function PatientList() {
  const medplum = useMedplum();
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    async function loadPatients() {
      const results = await medplum.searchResources('Patient', {
        active: 'true',
        _count: 100,
      });
      setPatients(results as Patient[]);
    }
    loadPatients();
  }, [medplum]);

  return (
    <div>
      {patients.map(p => (
        <div key={p.id}>{p.name?.[0]?.text}</div>
      ))}
    </div>
  );
}
```

#### Pattern 2: Adapter Layer for Legacy Components

When using components copied from legacy:

```typescript
'use client';

import { useMedplum } from '@medplum/react';
import { useEffect, useState } from 'react';
import { loadPatientsWithLegacyShape } from '@/lib/adapters/legacy-patient-adapter';
import { LegacyPatient } from '@/types/legacy-types';
import { PatientTable } from '@/components/legacy-ui/PatientTable';

function PatientsPage() {
  const medplum = useMedplum();
  const [patients, setPatients] = useState<LegacyPatient[]>([]);

  useEffect(() => {
    async function loadPatients() {
      // Adapter transforms FHIR → Legacy shape
      const results = await loadPatientsWithLegacyShape(medplum);
      setPatients(results);
    }
    loadPatients();
  }, [medplum]);

  // Legacy component expects LegacyPatient[]
  return <PatientTable patients={patients} />;
}
```

#### Pattern 3: Service Shim for Legacy Code

When legacy service functions are used directly:

```typescript
'use client';

import { useMedplum } from '@medplum/react';
import { useEffect, useState } from 'react';
import { loadPatientsWithRxClaims } from '@/lib/services-legacy/pdcDataService';

function Dashboard() {
  const medplum = useMedplum();
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    async function load() {
      // Legacy service API - delegates to adapter layer
      const results = await loadPatientsWithRxClaims(medplum, {
        active: true,
        enrichWithAnalytics: true,
      });
      setPatients(results);
    }
    load();
  }, [medplum]);

  return <div>...</div>;
}
```

### Query Patterns for Common Operations

#### Query 1: Load Patient with PDC Data

```typescript
import { constructLegacyPatientObject } from '@/lib/adapters/legacy-patient-adapter';

const patient = await constructLegacyPatientObject('patient-123', medplum);

// Result contains:
// - Demographics from Patient resource
// - PDC data from Observation resources
// - Medications from transformed Observations
// - Aggregate metrics calculated on-the-fly
```

#### Query 2: Get Current PDC for a Measure

```typescript
import { getCurrentPDCObservation } from '@/lib/fhir/observation-service';

const macObservation = await getCurrentPDCObservation(medplum, 'patient-123', 'MAC');

if (macObservation) {
  const pdc = macObservation.valueQuantity?.value;
  const fragilityTier = getCodeExtension(
    macObservation.extension,
    EXTENSION_URLS.FRAGILITY_TIER
  );
  console.log(`MAC PDC: ${pdc}, Tier: ${fragilityTier}`);
}
```

#### Query 3: Get All Medications for Patient

```typescript
import { getAllCurrentMedicationPDCObservations } from '@/lib/fhir/medication-observation-service';
import { parseMedicationPDCObservation } from '@/lib/fhir/medication-observation-service';

const medObservations = await getAllCurrentMedicationPDCObservations(
  medplum,
  'patient-123'
);

const medications = medObservations.map(obs => {
  const parsed = parseMedicationPDCObservation(obs);
  return {
    name: parsed.medicationDisplay,
    rxnorm: parsed.medicationRxnorm,
    pdc: parsed.pdc,
    measure: parsed.measure,
    refillsRemaining: parsed.remainingRefills,
    supplyOnHand: parsed.supplyOnHand,
  };
});

console.log(`Patient has ${medications.length} medications`);
```

#### Query 4: Get Dispense History

```typescript
import { getPatientDispenses, classifyDispenseByMeasure } from '@/lib/fhir/dispense-service';

const dispenses = await getPatientDispenses(medplum, 'patient-123', 2025);

const macDispenses = dispenses.filter(d => classifyDispenseByMeasure(d) === 'MAC');

console.log(`Patient has ${macDispenses.length} statin fills in 2025`);
```

### Caching Strategies

**Medplum Built-in Caching**:

Medplum client has built-in HTTP caching for GET requests. No additional caching layer is needed for most queries.

**React Query Integration** (Future):

For advanced caching, consider integrating React Query:

```typescript
import { useQuery } from '@tanstack/react-query';
import { useMedplum } from '@medplum/react';
import { loadPatientsWithLegacyShape } from '@/lib/adapters/legacy-patient-adapter';

function usePatients() {
  const medplum = useMedplum();

  return useQuery({
    queryKey: ['patients'],
    queryFn: () => loadPatientsWithLegacyShape(medplum),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
```

### Error Handling Patterns

#### Pattern 1: Service-Level Error Handling

FHIR services use try-catch with fallbacks:

```typescript
try {
  // Try using custom SearchParameter
  const results = await medplum.searchResources('Observation', {
    'is-current-pdc': 'true',
  });
  return results;
} catch (error) {
  // Fallback: client-side filter
  console.warn('SearchParameter not indexed yet, using fallback');
  const allObs = await medplum.searchResources('Observation', {});
  return allObs.filter(obs =>
    getBooleanExtension(obs.extension, EXTENSION_URLS.IS_CURRENT_PDC) === true
  );
}
```

#### Pattern 2: Component-Level Error Handling

UI components show error states:

```typescript
function PatientList() {
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const results = await loadPatientsWithLegacyShape(medplum);
        setPatients(results);
      } catch (err) {
        console.error('Failed to load patients:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [medplum]);

  if (loading) return <Skeleton />;
  if (error) return <ErrorAlert error={error} />;

  return <Table data={patients} />;
}
```

---

## 6. Data Flow Examples

### Example 1: Loading Patient List

**Complete flow from UI to FHIR**:

```
USER ACTION: Navigate to /patients page
    ↓
COMPONENT: PatientsPage mounts
    ↓
HOOK: useMedplum() provides MedplumClient
    ↓
SERVICE SHIM: loadPatientsWithRxClaims(medplum)
    ↓
ADAPTER: loadPatientsWithLegacyShape(medplum)
    ↓
FHIR QUERY: medplum.searchResources('Patient', { active: 'true', _count: 100 })
    ↓
MEDPLUM API: Returns Patient[] resources
    ↓
ADAPTER: For each patient:
    ↓
    ├─ Read Patient extensions (denormalized summary from Phase 2A bot)
    ↓
    ├─ Query PDC Observations: getAllCurrentPDCObservations(medplum, patientId)
    ↓
    ├─ Transform Observations to LegacyMedication[]
    ↓
    ├─ Calculate aggregateMetrics
    ↓
    └─ Return LegacyPatient object
    ↓
COMPONENT: Receives LegacyPatient[]
    ↓
RENDER: PatientTable displays data
```

### Example 2: Loading Patient Detail

**Flow for individual patient detail page**:

```
USER ACTION: Click patient row in table
    ↓
NAVIGATION: router.push('/patients/patient-123')
    ↓
COMPONENT: PatientDetailPage mounts with patientId param
    ↓
ADAPTER: constructLegacyPatientObject('patient-123', medplum)
    ↓
    ├─ Read Patient resource
    │   medplum.readResource('Patient', 'patient-123')
    ↓
    ├─ Extract Patient extensions (Phase 2A denormalization)
    │   extractPatientPDCSummary(patient)
    ↓
    ├─ Query measure-level PDC Observations
    │   getAllCurrentPDCObservations(medplum, 'patient-123')
    │   Returns: Map { 'MAC' => Observation, 'MAD' => Observation }
    ↓
    ├─ Query medication-level PDC Observations (Phase 1.5)
    │   getAllCurrentMedicationPDCObservations(medplum, 'patient-123')
    │   Returns: Observation[] (one per medication)
    ↓
    ├─ Transform each Observation to LegacyMedication
    │   transformObservationToMedication(obs, patientId)
    ↓
    ├─ Calculate aggregates
    │   - allMedsPDC = Math.min(...medications.map(m => m.currentPdc))
    │   - worstFragilityTier = getWorstTier(medications.map(m => m.fragilityTier))
    │   - highestPriorityScore = Math.max(...medications.map(m => m.priorityScore))
    ↓
    └─ Return complete LegacyPatient object
    ↓
COMPONENT: Receives LegacyPatient
    ↓
RENDER: Display patient detail with all data
```

### Example 3: Refreshing PDC Data

**Manual PDC recalculation flow**:

```
USER ACTION: Click "Refresh PDC" button
    ↓
EVENT HANDLER: handleRefreshPDC()
    ↓
ORCHESTRATOR: calculateAndStorePatientPDC(medplum, patientId, options)
    (See: src/lib/pdc/orchestrator.ts)
    ↓
    ├─ Query dispenses for patient
    │   getPatientDispenses(medplum, patientId, 2025)
    ↓
    ├─ Group dispenses by measure (MAC/MAD/MAH)
    │   classifyDispenseByMeasure(dispense)
    ↓
    ├─ Calculate PDC for each measure (Phase 1)
    │   calculatePDCFromDispenses(dispenses, measurementYear)
    ↓
    ├─ Calculate fragility tier (Phase 1)
    │   calculateFragilityTier(pdc, gapDaysRemaining, daysUntilRunout)
    ↓
    ├─ Calculate priority score (Phase 1)
    │   calculatePriorityScore(fragilityTier, daysUntilRunout, ...)
    ↓
    ├─ Store measure-level PDC Observations (Phase 1)
    │   storePDCObservation(medplum, { patientId, measure: 'MAC', pdc: 0.72, ... })
    ↓
    ├─ Calculate medication-level PDC (Phase 1.5)
    │   For each medication in measure:
    │     calculateMedicationPDC(...)
    │     storeMedicationPDCObservation(medplum, { medicationRxnorm, pdc, ... })
    ↓
    ├─ Update Patient extensions (Phase 2A)
    │   updatePatientExtensions(medplum, patientId)
    │   └─ Denormalizes worst tier, highest priority, PDC summary to Patient resource
    ↓
    └─ Return result
    ↓
COMPONENT: Re-fetch patient data
    ↓
    constructLegacyPatientObject(patientId, medplum)
    ↓
RENDER: Display updated PDC data
```

### Example 4: Querying Dispense History

**Flow for medication history view**:

```
USER ACTION: Navigate to patient's medication history tab
    ↓
COMPONENT: MedicationHistoryTab({ patientId })
    ↓
SERVICE: getPatientDispenses(medplum, patientId, 2025)
    ↓
FHIR QUERY: Build search parameters
    {
      subject: 'Patient/patient-123',
      status: 'completed',
      whenhandedover: 'ge2025-01-01',
      _count: 1000
    }
    ↓
TRY: Query with 'whenhandedover' parameter
    medplum.searchResources('MedicationDispense', params)
    ↓
CATCH: If parameter not supported
    ↓
    ├─ Query all dispenses for patient
    │   medplum.searchResources('MedicationDispense', { subject: '...', status: 'completed' })
    ↓
    └─ Filter by date range client-side
        dispenses.filter(d => extractFillDate(d) >= startDate && extractFillDate(d) <= endDate)
    ↓
SORT: Sort by fill date ascending
    dispenses.sort((a, b) => extractFillDate(a) - extractFillDate(b))
    ↓
TRANSFORM: Extract display data
    dispenses.map(d => ({
      fillDate: extractFillDate(d),
      daysSupply: extractDaysSupply(d),
      medicationCode: extractMedicationCode(d),
      measure: classifyDispenseByMeasure(d)
    }))
    ↓
COMPONENT: Receives dispense array
    ↓
RENDER: Timeline visualization of fills
```

---

## Summary

The service layer provides a clean separation between the UI and FHIR backend:

1. **FHIR Services** - Low-level FHIR operations (queries, resource creation)
2. **Adapter Layer** - Transforms FHIR → Legacy data shape for UI compatibility
3. **Service Shims** - Provides legacy API interfaces for copied components
4. **Extension Helpers** - Type-safe utilities for working with FHIR extensions

**Key Design Principles**:

- **Fallback patterns** for SearchParameters that need time to reindex
- **Denormalization** via Patient extensions for fast queries (Phase 2A)
- **Multi-tier PDC storage** (measure-level and medication-level)
- **Legacy compatibility** via adapter pattern
- **Type safety** with TypeScript and FHIR types

**Data Sources by Phase**:

- **Phase 1**: Measure-level PDC Observations, MedicationDispense queries
- **Phase 1.5**: Medication-level PDC Observations
- **Phase 2A**: Patient extensions (denormalized summaries), nightly bot
- **Phase 2**: UI components reading from all above sources

The architecture enables incremental migration from legacy Firebase patterns to modern FHIR standards while maintaining UI compatibility.
