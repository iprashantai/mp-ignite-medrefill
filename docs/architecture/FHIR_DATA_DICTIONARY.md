# FHIR Data Dictionary - Ignite Health PDC System

> **Critical Reference Document**
>
> This is the **authoritative source** for all FHIR extension definitions, resource structures, and data mappings in the Ignite Health PDC calculation system. All UI implementations, service layers, and future development MUST reference this document.

**Version**: 1.0.0
**Last Updated**: January 2026
**Status**: Production

---

## Table of Contents

1. [Extension Base URLs](#1-extension-base-urls)
2. [Patient Resource Extensions](#2-patient-resource-extensions)
3. [Observation Resource - Measure-Level PDC](#3-observation-resource---measure-level-pdc)
4. [Observation Resource - Medication-Level PDC](#4-observation-resource---medication-level-pdc)
5. [MedicationDispense Resource](#5-medicationdispense-resource)
6. [Query Examples](#6-query-examples)
7. [SearchParameters](#7-searchparameters)
8. [Helper Functions](#8-helper-functions)

---

## 1. Extension Base URLs

### Base URL

```
https://ignitehealth.io/fhir/StructureDefinition
```

**CRITICAL**: Use `ignitehealth.io` (not `.com`). This is the official namespace for all Ignite Health FHIR extensions.

### All Extension Names

All extensions are defined in `src/lib/fhir/types.ts`:

#### Observation Extensions (Measure & Medication Level)
- `fragility-tier`
- `priority-score`
- `is-current-pdc`
- `ma-measure`
- `days-until-runout`
- `gap-days-remaining`
- `delay-budget`
- `treatment-period`
- `q4-adjusted`

#### Patient Extensions (Denormalized Summaries)
- `current-fragility-tier`
- `current-priority-score`
- `days-until-earliest-runout`
- `current-pdc-summary` (complex extension with sub-extensions)

#### Medication-Specific Extensions
- `medication-rxnorm`
- `medication-display`
- `parent-measure-observation`
- `estimated-days-per-refill`
- `remaining-refills`
- `supply-on-hand`
- `coverage-shortfall`

#### Task Extensions (AI Workflow)
- `ai-confidence-score`
- `review-type`

---

## 2. Patient Resource Extensions

Patient extensions store **denormalized aggregate state** across all measures for fast query performance. Updated by the nightly bot after calculating measure-level PDC.

### Patient Extension Reference Table

| Extension Name | Full URL | Value Type | Format/Values | Purpose | UI Mapping | Example |
|----------------|----------|------------|---------------|---------|------------|---------|
| `current-fragility-tier` | `https://ignitehealth.io/fhir/StructureDefinition/current-fragility-tier` | `valueCode` | `COMPLIANT` \| `F1_IMMINENT` \| `F2_FRAGILE` \| `F3_MODERATE` \| `F4_COMFORTABLE` \| `F5_SAFE` \| `T5_UNSALVAGEABLE` | **Worst** fragility tier across all measures (MAC, MAD, MAH) | Patient list "Status" badge, Queue filtering | `F1_IMMINENT` |
| `current-priority-score` | `https://ignitehealth.io/fhir/StructureDefinition/current-priority-score` | `valueInteger` | `0-200` (integer) | **Highest** priority score across all measures | Patient list sort order, "Priority" column | `110` |
| `days-until-earliest-runout` | `https://ignitehealth.io/fhir/StructureDefinition/days-until-earliest-runout` | `valueInteger` | Days (can be negative if already out) | **Minimum** days to runout across all medications | "Days to Runout" column, Urgency indicator | `5` |
| `current-pdc-summary` | `https://ignitehealth.io/fhir/StructureDefinition/current-pdc-summary` | **Complex** (nested) | See sub-extensions below | Summary of current PDC by measure | Patient overview card, Measure badges | See below |

### Complex Extension: `current-pdc-summary`

This is a **nested extension** with sub-extensions:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/current-pdc-summary",
  "extension": [
    {
      "url": "mac",
      "valueDecimal": 0.85
    },
    {
      "url": "mad",
      "valueDecimal": 0.72
    },
    {
      "url": "mah",
      "valueDecimal": null
    },
    {
      "url": "lastUpdated",
      "valueDateTime": "2025-01-07T02:15:30.000Z"
    }
  ]
}
```

| Sub-Extension | Type | Format | Purpose | UI Mapping | Example |
|---------------|------|--------|---------|------------|---------|
| `mac` | `valueDecimal` | `0.0-1.0` or `null` | MAC measure PDC (null if not applicable) | "MAC PDC" column, PDC badge | `0.85` |
| `mad` | `valueDecimal` | `0.0-1.0` or `null` | MAD measure PDC (null if not applicable) | "MAD PDC" column, PDC badge | `0.72` |
| `mah` | `valueDecimal` | `0.0-1.0` or `null` | MAH measure PDC (null if not applicable) | "MAH PDC" column, PDC badge | `null` |
| `lastUpdated` | `valueDateTime` | ISO 8601 timestamp | Last calculation time | Data freshness indicator | `2025-01-07T02:15:30.000Z` |

### Patient Extension Example

```json
{
  "resourceType": "Patient",
  "id": "patient-123",
  "name": [{ "family": "Smith", "given": ["John"] }],
  "birthDate": "1955-03-15",
  "extension": [
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/current-fragility-tier",
      "valueCode": "F1_IMMINENT"
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/current-priority-score",
      "valueInteger": 110
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/days-until-earliest-runout",
      "valueInteger": 5
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/current-pdc-summary",
      "extension": [
        { "url": "mac", "valueDecimal": 0.85 },
        { "url": "mad", "valueDecimal": null },
        { "url": "mah", "valueDecimal": 0.72 },
        { "url": "lastUpdated", "valueDateTime": "2025-01-07T02:15:30Z" }
      ]
    }
  ]
}
```

---

## 3. Observation Resource - Measure-Level PDC

Measure-level Observations represent **aggregated PDC** for an entire HEDIS MA measure (MAC, MAD, or MAH), calculated using HEDIS interval merging across **all medications** in that measure.

### Observation Codes

| Measure | Code | Display | CodeSystem |
|---------|------|---------|------------|
| MAC | `pdc-mac` | PDC Score - Cholesterol (MAC) | `https://ignitehealth.io/fhir/CodeSystem/adherence-metrics` |
| MAD | `pdc-mad` | PDC Score - Diabetes (MAD) | `https://ignitehealth.io/fhir/CodeSystem/adherence-metrics` |
| MAH | `pdc-mah` | PDC Score - Hypertension (MAH) | `https://ignitehealth.io/fhir/CodeSystem/adherence-metrics` |

### Core FHIR Fields

| Field | Path | Type | Purpose | Example |
|-------|------|------|---------|---------|
| Resource Type | `resourceType` | string | Always `"Observation"` | `"Observation"` |
| Status | `status` | code | Always `"final"` | `"final"` |
| Category | `category[0].coding[0].code` | code | Always `"survey"` | `"survey"` |
| Code | `code.coding[0]` | Coding | Identifies measure (see table above) | `{ system: "...", code: "pdc-mac" }` |
| Subject | `subject.reference` | Reference | Patient reference | `"Patient/patient-123"` |
| PDC Value | `valueQuantity.value` | decimal | **PDC ratio** (0.0-1.0) | `0.72` |
| Unit | `valueQuantity.unit` | string | Always `"ratio"` | `"ratio"` |
| Effective Date | `effectiveDateTime` | dateTime | Calculation timestamp | `"2025-01-07T02:15:30Z"` |
| Interpretation | `interpretation[0].coding[0].code` | code | `adherent` \| `at-risk` \| `non-adherent` | `"at-risk"` |

### Measure-Level Extensions Table

| Extension Name | Full URL | Type | Format/Values | Purpose | UI Mapping | Example |
|----------------|----------|------|---------------|---------|------------|---------|
| `fragility-tier` | `.../fragility-tier` | `valueCode` | `COMPLIANT` \| `F1_IMMINENT` \| `F2_FRAGILE` \| `F3_MODERATE` \| `F4_COMFORTABLE` \| `F5_SAFE` \| `T5_UNSALVAGEABLE` | Fragility classification for this measure | Status badge, Filter | `F2_FRAGILE` |
| `priority-score` | `.../priority-score` | `valueInteger` | `0-200` | Priority score (base + bonuses) | Sort order, Priority column | `110` |
| `is-current-pdc` | `.../is-current-pdc` | `valueBoolean` | `true` \| `false` | Flag for most recent calculation | Query filter to get current only | `true` |
| `ma-measure` | `.../ma-measure` | `valueCode` | `MAC` \| `MAD` \| `MAH` | HEDIS measure type | Tab navigation, Measure filter | `MAH` |
| `days-until-runout` | `.../days-until-runout` | `valueInteger` | Days (can be negative) | **Earliest** runout across all meds in measure | Urgency indicator, "Days Left" | `5` |
| `gap-days-remaining` | `.../gap-days-remaining` | `valueInteger` | Days (`0-365`) | Allowed gap days still available | Resilience indicator, "Buffer" | `15` |
| `delay-budget` | `.../delay-budget` | `valueInteger` | Days (`0-365`) | Days patient can delay next refill | "Cushion" display, Tier classification | `4` |
| `treatment-period` | `.../treatment-period` | `valuePeriod` | `{ start: "YYYY-MM-DD", end: "YYYY-MM-DD" }` | Treatment window for PDC | Date range display | `{ start: "2025-01-15", end: "2025-12-31" }` |
| `q4-adjusted` | `.../q4-adjusted` | `valueBoolean` | `true` \| `false` | Whether Q4 bonus was applied | Calculation note, Badge modifier | `false` |

### Measure-Level Observation Example

```json
{
  "resourceType": "Observation",
  "id": "obs-mac-123",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "survey",
          "display": "Survey"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "https://ignitehealth.io/fhir/CodeSystem/adherence-metrics",
        "code": "pdc-mac",
        "display": "PDC Score - Cholesterol (MAC)"
      }
    ]
  },
  "subject": {
    "reference": "Patient/patient-123"
  },
  "effectiveDateTime": "2025-01-07T02:15:30.000Z",
  "valueQuantity": {
    "value": 0.72,
    "unit": "ratio",
    "system": "http://unitsofmeasure.org",
    "code": "1"
  },
  "interpretation": [
    {
      "coding": [
        {
          "system": "https://ignitehealth.io/fhir/CodeSystem/adherence-status",
          "code": "at-risk",
          "display": "At-Risk (PDC 60-79%)"
        }
      ]
    }
  ],
  "extension": [
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/fragility-tier",
      "valueCode": "F2_FRAGILE"
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/priority-score",
      "valueInteger": 110
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/is-current-pdc",
      "valueBoolean": true
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/ma-measure",
      "valueCode": "MAC"
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/days-until-runout",
      "valueInteger": 5
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/gap-days-remaining",
      "valueInteger": 15
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/delay-budget",
      "valueInteger": 4
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/treatment-period",
      "valuePeriod": {
        "start": "2025-01-15",
        "end": "2025-12-31"
      }
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/q4-adjusted",
      "valueBoolean": false
    }
  ]
}
```

---

## 4. Observation Resource - Medication-Level PDC

Medication-level Observations represent PDC for **individual medications** within a measure. Each medication gets its own Observation.

### Observation Code

| Code | Display | CodeSystem |
|------|---------|------------|
| `pdc-medication` | PDC Score - Individual Medication | `https://ignitehealth.io/fhir/CodeSystem/adherence-metrics` |

### Inherited Fields

Medication-level observations inherit **all fields and extensions** from measure-level observations (Section 3), plus the medication-specific extensions below.

### Medication-Specific Extensions Table

| Extension Name | Full URL | Type | Format/Values | Purpose | UI Mapping | Example |
|----------------|----------|------|---------------|---------|------------|---------|
| `medication-rxnorm` | `.../medication-rxnorm` | `valueCode` | RxNorm code (SCD level preferred) | Specific medication identifier | Medication ID, Drug lookup | `314076` |
| `medication-display` | `.../medication-display` | `valueString` | Human-readable name | Medication name | Display name in med list | `"lisinopril 10 MG Oral Tablet"` |
| `parent-measure-observation` | `.../parent-measure-observation` | `valueReference` | Reference to Observation | Link to parent measure PDC | Drill-down navigation | `{ reference: "Observation/obs-mah-123" }` |
| `estimated-days-per-refill` | `.../estimated-days-per-refill` | `valueInteger` | Days (e.g., `30`, `90`) | Average days supply from dispense history | Refill frequency estimate | `30` |
| `remaining-refills` | `.../remaining-refills` | `valueInteger` | Count (`0-12+`) | Refills needed to reach year-end | "Refills Left" column | `5` |
| `supply-on-hand` | `.../supply-on-hand` | `valueInteger` | Days (`0-365`) | Current days of supply remaining | "Supply Left" indicator | `12` |
| `coverage-shortfall` | `.../coverage-shortfall` | `valueInteger` | Days (`0-365`) | Days short of year-end coverage | Gap analysis, Urgency | `150` |

### Medication-Level Observation Example

```json
{
  "resourceType": "Observation",
  "id": "obs-med-456",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "survey",
          "display": "Survey"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "https://ignitehealth.io/fhir/CodeSystem/adherence-metrics",
        "code": "pdc-medication",
        "display": "PDC Score - Individual Medication"
      }
    ]
  },
  "subject": {
    "reference": "Patient/patient-123"
  },
  "effectiveDateTime": "2025-01-07T02:15:30.000Z",
  "valueQuantity": {
    "value": 0.78,
    "unit": "ratio",
    "system": "http://unitsofmeasure.org",
    "code": "1"
  },
  "extension": [
    // ... all measure-level extensions (Section 3) ...
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/medication-rxnorm",
      "valueCode": "314076"
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/medication-display",
      "valueString": "lisinopril 10 MG Oral Tablet"
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/parent-measure-observation",
      "valueReference": {
        "reference": "Observation/obs-mah-123"
      }
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/estimated-days-per-refill",
      "valueInteger": 30
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/remaining-refills",
      "valueInteger": 5
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/supply-on-hand",
      "valueInteger": 12
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/coverage-shortfall",
      "valueInteger": 150
    }
  ]
}
```

---

## 5. MedicationDispense Resource

MedicationDispense resources represent **pharmacy fill records** (claims data). These are the source data for PDC calculation.

### Core Fields for PDC Calculation

| Field | Path | Type | Purpose | Example |
|-------|------|------|---------|---------|
| Status | `status` | code | Only `"completed"` used for PDC | `"completed"` |
| Medication Code | `medicationCodeableConcept.coding[?(@.system=='http://www.nlm.nih.gov/research/umls/rxnorm')].code` | code | RxNorm code (SCD level) | `314076` |
| Medication Name | `medicationCodeableConcept.coding[0].display` | string | Human-readable name | `"lisinopril 10 MG Oral Tablet"` |
| Fill Date | `whenHandedOver` | dateTime | Date medication was dispensed | `"2025-01-15T10:30:00Z"` |
| Days Supply | `daysSupply.value` | decimal | Coverage duration | `30` |
| Quantity | `quantity.value` | decimal | Quantity dispensed | `30` |
| Subject | `subject.reference` | Reference | Patient reference | `"Patient/patient-123"` |

### MedicationDispense Example

```json
{
  "resourceType": "MedicationDispense",
  "id": "dispense-789",
  "status": "completed",
  "medicationCodeableConcept": {
    "coding": [
      {
        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
        "code": "314076",
        "display": "lisinopril 10 MG Oral Tablet"
      }
    ]
  },
  "subject": {
    "reference": "Patient/patient-123"
  },
  "whenHandedOver": "2025-01-15T10:30:00.000Z",
  "quantity": {
    "value": 30,
    "unit": "TAB",
    "system": "http://unitsofmeasure.org",
    "code": "TAB"
  },
  "daysSupply": {
    "value": 30,
    "unit": "days",
    "system": "http://unitsofmeasure.org",
    "code": "d"
  }
}
```

### RxNorm Code Extraction

**Critical**: Always extract RxNorm code from the coding array where `system == "http://www.nlm.nih.gov/research/umls/rxnorm"`.

```typescript
const rxnormCoding = dispense.medicationCodeableConcept?.coding?.find(
  (c) => c.system === 'http://www.nlm.nih.gov/research/umls/rxnorm'
);
const rxnormCode = rxnormCoding?.code;
const medicationName = rxnormCoding?.display;
```

---

## 6. Query Examples

Real TypeScript code examples for common queries.

### 6.1 Reading Patient with Extensions

```typescript
import { useMedplum } from '@medplum/react';
import { PATIENT_EXTENSION_URLS } from '@/lib/fhir/types';
import { getCodeExtension, getIntegerExtension } from '@/lib/fhir/helpers';

const medplum = useMedplum();

// Fetch patient
const patient = await medplum.readResource('Patient', patientId);

// Extract denormalized extensions
const fragilityTier = getCodeExtension(
  patient.extension,
  PATIENT_EXTENSION_URLS.CURRENT_FRAGILITY_TIER
);
// Returns: "F1_IMMINENT" | "F2_FRAGILE" | ... | undefined

const priorityScore = getIntegerExtension(
  patient.extension,
  PATIENT_EXTENSION_URLS.CURRENT_PRIORITY_SCORE
);
// Returns: number | undefined

const daysToRunout = getIntegerExtension(
  patient.extension,
  PATIENT_EXTENSION_URLS.DAYS_UNTIL_EARLIEST_RUNOUT
);
// Returns: number | undefined
```

### 6.2 Extracting PDC Summary (Complex Extension)

```typescript
import { getExtensionValue, getDecimalExtension, getDateTimeExtension } from '@/lib/fhir/helpers';
import { PATIENT_EXTENSION_URLS } from '@/lib/fhir/types';

const patient = await medplum.readResource('Patient', patientId);

// Get the complex extension
const pdcSummaryExt = getExtensionValue(
  patient.extension,
  PATIENT_EXTENSION_URLS.CURRENT_PDC_SUMMARY
);

if (pdcSummaryExt?.extension) {
  // Extract nested values
  const macPDC = getDecimalExtension(pdcSummaryExt.extension, 'mac');
  const madPDC = getDecimalExtension(pdcSummaryExt.extension, 'mad');
  const mahPDC = getDecimalExtension(pdcSummaryExt.extension, 'mah');
  const lastUpdated = getDateTimeExtension(pdcSummaryExt.extension, 'lastUpdated');

  console.log({ macPDC, madPDC, mahPDC, lastUpdated });
  // { macPDC: 0.85, madPDC: null, mahPDC: 0.72, lastUpdated: "2025-01-07T..." }
}
```

### 6.3 Getting Current PDC Observation by Measure

```typescript
import { getCurrentPDCObservation, parsePDCObservation } from '@/lib/fhir';

// Get current MAC observation
const macObs = await getCurrentPDCObservation(medplum, patientId, 'MAC');

if (macObs) {
  // Parse into structured format
  const parsed = parsePDCObservation(macObs);

  console.log({
    pdc: parsed.pdc,                      // 0.72
    measure: parsed.measure,              // "MAC"
    fragilityTier: parsed.fragilityTier,  // "F2_FRAGILE"
    priorityScore: parsed.priorityScore,  // 110
    daysUntilRunout: parsed.daysUntilRunout, // 5
    gapDaysRemaining: parsed.gapDaysRemaining, // 15
    delayBudget: parsed.delayBudget,      // 4
  });
}
```

### 6.4 Getting All Current PDC Observations

```typescript
import { getAllCurrentPDCObservations } from '@/lib/fhir';

// Returns a Map<MAMeasure, Observation>
const allPDC = await getAllCurrentPDCObservations(medplum, patientId);

// Check which measures exist
if (allPDC.has('MAC')) {
  const macObs = allPDC.get('MAC');
  console.log('MAC PDC:', macObs.valueQuantity?.value);
}

if (allPDC.has('MAD')) {
  const madObs = allPDC.get('MAD');
  console.log('MAD PDC:', madObs.valueQuantity?.value);
}

if (allPDC.has('MAH')) {
  const mahObs = allPDC.get('MAH');
  console.log('MAH PDC:', mahObs.valueQuantity?.value);
}
```

### 6.5 Getting All Medications for a Measure

```typescript
import { getAllCurrentMedicationPDCObservations, parseMedicationPDCObservation } from '@/lib/fhir';

// Get all current medication observations for MAH measure
const mahMeds = await getAllCurrentMedicationPDCObservations(
  medplum,
  patientId,
  'MAH' // Optional: filter by measure
);

// Parse each medication
mahMeds.forEach((medObs) => {
  const parsed = parseMedicationPDCObservation(medObs);

  console.log({
    rxnorm: parsed.medicationRxnorm,        // "314076"
    name: parsed.medicationDisplay,         // "lisinopril 10 MG Oral Tablet"
    pdc: parsed.pdc,                        // 0.78
    remainingRefills: parsed.remainingRefills, // 5
    supplyOnHand: parsed.supplyOnHand,      // 12
    daysToRunout: parsed.daysUntilRunout,   // 12
  });
});
```

### 6.6 Getting Specific Medication by RxNorm

```typescript
import { getCurrentMedicationPDCObservation, parseMedicationPDCObservation } from '@/lib/fhir';

// Get lisinopril 10mg observation
const lisinoprilObs = await getCurrentMedicationPDCObservation(
  medplum,
  patientId,
  '314076' // RxNorm code
);

if (lisinoprilObs) {
  const parsed = parseMedicationPDCObservation(lisinoprilObs);
  console.log(parsed);
}
```

### 6.7 Searching Patients by Fragility Tier

```typescript
// Get all F1 (critical) patients, sorted by priority
const criticalPatients = await medplum.searchResources('Patient', {
  'patient-fragility-tier': 'F1_IMMINENT',
  '_sort': '-patient-priority-score', // Descending
  '_count': '50'
});

console.log(`Found ${criticalPatients.length} critical patients`);
```

### 6.8 Searching Patients by Priority Score Range

```typescript
// Get patients with priority score >= 100
const highPriorityPatients = await medplum.searchResources('Patient', {
  'patient-priority-score': 'ge100', // Greater than or equal to 100
  '_sort': '-patient-priority-score',
  '_count': '100'
});
```

### 6.9 Getting Dispense History

```typescript
import { getPatientDispenses, groupDispensesByMeasure } from '@/lib/fhir';

// Get all completed dispenses for patient
const dispenses = await getPatientDispenses(medplum, patientId);

// Group by measure
const byMeasure = await groupDispensesByMeasure(medplum, patientId);

console.log('MAC dispenses:', byMeasure.get('MAC')?.length ?? 0);
console.log('MAD dispenses:', byMeasure.get('MAD')?.length ?? 0);
console.log('MAH dispenses:', byMeasure.get('MAH')?.length ?? 0);
```

### 6.10 Building Patient List with All Data

```typescript
import { loadPatientsWithLegacyShape } from '@/lib/services-legacy/legacy-patient-adapter';

// This adapter function does the heavy lifting:
// 1. Fetches patients
// 2. Reads denormalized extensions from Patient
// 3. Fetches current PDC observations for all measures
// 4. Transforms to legacy AllPatientsCRM shape for UI compatibility

const patients = await loadPatientsWithLegacyShape(medplum, {
  fragilityTiers: ['F1_IMMINENT', 'F2_FRAGILE'],
  limit: 100,
  sortBy: 'priority',
});

// Returns array of LegacyPatientCRM objects with all UI fields populated
console.log(patients[0]);
// {
//   id: "patient-123",
//   name: "John Smith",
//   dob: "1955-03-15",
//   currentFragilityTier: "F1_IMMINENT",
//   priorityScore: 110,
//   macPDC: 0.72,
//   madPDC: null,
//   mahPDC: 0.85,
//   // ... all other legacy fields
// }
```

---

## 7. SearchParameters

Custom SearchParameters enable efficient querying of extension values without client-side filtering.

### SearchParameter Reference Table

| Name | Resource | Expression (FHIRPath) | Type | Usage Example |
|------|----------|----------------------|------|---------------|
| `fragility-tier` | Observation | `Observation.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/fragility-tier').valueCode` | token | `GET /Observation?fragility-tier=F1_IMMINENT` |
| `priority-score` | Observation | `Observation.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/priority-score').valueInteger` | number | `GET /Observation?_sort=-priority-score` |
| `is-current-pdc` | Observation | `Observation.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/is-current-pdc').valueBoolean` | token | `GET /Observation?is-current-pdc=true&patient=Patient/123` |
| `ma-measure` | Observation | `Observation.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/ma-measure').valueCode` | token | `GET /Observation?ma-measure=MAC&is-current-pdc=true` |
| `days-until-runout` | Observation | `Observation.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/days-until-runout').valueInteger` | number | `GET /Observation?days-until-runout=le7&is-current-pdc=true` |
| `patient-fragility-tier` | Patient | `Patient.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/current-fragility-tier').valueCode` | token | `GET /Patient?patient-fragility-tier=F1_IMMINENT` |
| `patient-priority-score` | Patient | `Patient.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/current-priority-score').valueInteger` | number | `GET /Patient?_sort=-patient-priority-score` |

### Common Query Patterns

#### Dashboard Queries

```typescript
// Count patients by tier
const f1Count = await medplum.search('Patient', {
  'patient-fragility-tier': 'F1_IMMINENT',
  '_summary': 'count'
});

// Get all current PDC observations
const allCurrentPDC = await medplum.searchResources('Observation', {
  'is-current-pdc': 'true',
  '_count': '1000'
});

// Get urgent patients (F1, F2)
const urgentPatients = await medplum.searchResources('Patient', {
  'patient-fragility-tier': 'F1_IMMINENT,F2_FRAGILE',
  '_sort': '-patient-priority-score',
  '_count': '100'
});

// Get patients running out soon
const urgentRefills = await medplum.searchResources('Observation', {
  'days-until-runout': 'le3',
  'is-current-pdc': 'true'
});
```

#### Queue Queries

```typescript
// Queue sorted by priority (exclude compliant)
const queue = await medplum.searchResources('Patient', {
  'patient-fragility-tier:not': 'COMPLIANT',
  '_sort': '-patient-priority-score',
  '_count': '100'
});

// Queue filtered by specific tier
const f1Queue = await medplum.searchResources('Patient', {
  'patient-fragility-tier': 'F1_IMMINENT',
  '_sort': '-patient-priority-score',
  '_count': '50'
});

// Queue filtered by measure
const macQueue = await medplum.searchResources('Observation', {
  'ma-measure': 'MAC',
  'is-current-pdc': 'true',
  '_include': 'Observation:subject', // Include patient resources
  '_count': '100'
});
```

#### Patient Detail Queries

```typescript
// Get current PDC for a patient
const currentPDC = await medplum.searchResources('Observation', {
  'patient': `Patient/${patientId}`,
  'is-current-pdc': 'true'
});

// Get PDC history for a patient
const pdcHistory = await medplum.searchResources('Observation', {
  'patient': `Patient/${patientId}`,
  'code': 'pdc-mac,pdc-mad,pdc-mah',
  '_sort': '-date',
  '_count': '20'
});

// Get current MAC PDC for a patient
const macPDC = await medplum.searchResources('Observation', {
  'patient': `Patient/${patientId}`,
  'is-current-pdc': 'true',
  'ma-measure': 'MAC'
});
```

---

## 8. Helper Functions

The `src/lib/fhir/helpers.ts` module provides type-safe utilities for working with extensions.

### Extension Getters

```typescript
import {
  getCodeExtension,
  getIntegerExtension,
  getBooleanExtension,
  getDecimalExtension,
  getStringExtension,
  getPeriodExtension,
  getDateTimeExtension,
} from '@/lib/fhir/helpers';

// Get code (string) value
const tier = getCodeExtension(observation.extension, EXTENSION_URLS.FRAGILITY_TIER);
// Returns: string | undefined

// Get integer value
const priority = getIntegerExtension(observation.extension, EXTENSION_URLS.PRIORITY_SCORE);
// Returns: number | undefined

// Get boolean value
const isCurrent = getBooleanExtension(observation.extension, EXTENSION_URLS.IS_CURRENT_PDC);
// Returns: boolean | undefined

// Get decimal value
const pdc = getDecimalExtension(pdcSummaryExt.extension, 'mac');
// Returns: number | undefined

// Get string value
const medName = getStringExtension(observation.extension, EXTENSION_URLS.MEDICATION_DISPLAY);
// Returns: string | undefined

// Get Period value
const period = getPeriodExtension(observation.extension, EXTENSION_URLS.TREATMENT_PERIOD);
// Returns: Period | undefined ({ start: string, end: string })

// Get dateTime value
const lastUpdated = getDateTimeExtension(pdcSummaryExt.extension, 'lastUpdated');
// Returns: string | undefined (ISO 8601)
```

### Extension Setters

```typescript
import { setExtensionValue, setMultipleExtensions } from '@/lib/fhir/helpers';

// Set single extension
let extensions = setExtensionValue(
  observation.extension,
  EXTENSION_URLS.FRAGILITY_TIER,
  { valueCode: 'F1_IMMINENT' }
);

// Set multiple extensions at once
extensions = setMultipleExtensions(extensions, {
  [EXTENSION_URLS.PRIORITY_SCORE]: { valueInteger: 110 },
  [EXTENSION_URLS.DAYS_UNTIL_RUNOUT]: { valueInteger: 5 },
  [EXTENSION_URLS.IS_CURRENT_PDC]: { valueBoolean: true },
});
```

### Checking for Extensions

```typescript
import { hasExtension } from '@/lib/fhir/helpers';

if (hasExtension(observation.extension, EXTENSION_URLS.Q4_ADJUSTED)) {
  // Extension exists
}
```

### Removing Extensions

```typescript
import { removeExtension } from '@/lib/fhir/helpers';

const updatedExtensions = removeExtension(
  observation.extension,
  EXTENSION_URLS.IS_CURRENT_PDC
);
```

---

## Appendix A: Storage Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Patient Resource                          │
│  Extensions: worst-case PDC, fragility tier, priority score  │
│  Purpose: Fast queries without joining to Observations       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Measure-Level Observations                       │
│  Code: pdc-mac | pdc-mad | pdc-mah                           │
│  PDC: All drugs merged using HEDIS interval merging          │
│  Purpose: Aggregate metrics for HEDIS reporting              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            Medication-Level Observations                      │
│  Code: pdc-medication                                         │
│  PDC: Single drug only                                        │
│  Purpose: Granular medication tracking, refill planning      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              MedicationDispense Resources                     │
│  Source: Pharmacy claims/fills                                │
│  Purpose: Raw data for PDC calculation                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix B: Extension URL Constants

Always import from `src/lib/fhir/types.ts`:

```typescript
import {
  EXTENSION_BASE_URL,
  OBSERVATION_EXTENSION_URLS,
  PATIENT_EXTENSION_URLS,
  MEDICATION_OBSERVATION_EXTENSION_URLS,
  TASK_EXTENSION_URLS,
  CODE_SYSTEM_URLS,
} from '@/lib/fhir/types';

// Example usage
const fragilityURL = OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER;
// "https://ignitehealth.io/fhir/StructureDefinition/fragility-tier"

const patientTierURL = PATIENT_EXTENSION_URLS.CURRENT_FRAGILITY_TIER;
// "https://ignitehealth.io/fhir/StructureDefinition/current-fragility-tier"

const rxnormURL = MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM;
// "https://ignitehealth.io/fhir/StructureDefinition/medication-rxnorm"
```

---

## Appendix C: Data Flow Summary

```
MedicationDispense (raw pharmacy fills)
    ↓
Nightly Bot (CRON: 2 AM daily)
    ↓
Orchestrator (calculateAndStorePatientPDC)
    ↓
PDC Calculator (HEDIS interval merging algorithm)
    ↓
Observation Storage (measure-level + medication-level)
    ↓
Patient Extension Update (denormalized summary)
    ↓
Adapter Layer (FHIR → Legacy transform)
    ↓
UI Components (React display)
```

---

## Appendix D: Key Validation Rules

1. **Extension URLs**: Always use constants from `src/lib/fhir/types.ts` - NEVER hardcode
2. **PDC Values**: Always stored as 0.0-1.0 ratio (NOT percentage 0-100)
3. **RxNorm Codes**: Always extract from coding array with system check
4. **Current Flag**: Only ONE observation per patient-measure should have `is-current-pdc=true`
5. **Fragility Tiers**: Must be one of 7 values (see `FragilityTierSchema` in types.ts)
6. **Priority Score**: Valid range is 0-200 (see `priorityScore` schema)
7. **Complex Extensions**: `current-pdc-summary` has nested extensions, not direct values

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-07 | Claude Code | Initial comprehensive data dictionary |

**Next Review Date**: 2026-04-07 (quarterly)

---

**End of FHIR Data Dictionary**
