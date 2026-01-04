# Phase 1: FHIR Extensions Specification

> **Purpose**: Define all custom FHIR extensions for the Ignite Health medication adherence platform.

## Extension URL Base

All extensions use the base URL:

```
https://ignitehealth.io/fhir/StructureDefinition/
```

---

## Observation Extensions (PDC Metrics)

### 1. Fragility Tier

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/fragility-tier`

| Property    | Value       |
| ----------- | ----------- |
| Type        | `valueCode` |
| Cardinality | 0..1        |
| Binding     | Required    |

**Allowed Values**:

```typescript
type FragilityTier =
  | 'COMPLIANT' // PDC ≥ 80%, no intervention needed
  | 'F1_IMMINENT' // 0-2 days buffer, URGENT
  | 'F2_FRAGILE' // 3-5 days buffer
  | 'F3_MODERATE' // 6-10 days buffer
  | 'F4_COMFORTABLE' // 11-20 days buffer
  | 'F5_SAFE' // 21+ days buffer
  | 'T5_UNSALVAGEABLE'; // Cannot recover to 80% this year
```

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/fragility-tier",
  "valueCode": "F2_FRAGILE"
}
```

---

### 2. Priority Score

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/priority-score`

| Property    | Value          |
| ----------- | -------------- |
| Type        | `valueInteger` |
| Cardinality | 0..1           |
| Range       | 0-155          |

**Calculation** (from Golden Standard V3.0):

```typescript
// Base scores
const BASE_SCORES = {
  F1_IMMINENT: 100,
  F2_FRAGILE: 80,
  F3_MODERATE: 60,
  F4_COMFORTABLE: 40,
  F5_SAFE: 20,
  COMPLIANT: 0,
  T5_UNSALVAGEABLE: 10,
};

// Bonuses
const BONUSES = {
  OUT_OF_MEDICATION: 30, // daysUntilRunout <= 0
  Q4_PERIOD: 25, // Oct-Dec
  MULTIPLE_MA_MEASURES: 15, // 2+ measures at risk
  NEW_PATIENT: 10, // First year in program
};

// Maximum possible: 100 + 30 + 25 = 155 (F1 + OOM + Q4)
```

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/priority-score",
  "valueInteger": 125
}
```

---

### 3. Is Current PDC

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/is-current-pdc`

| Property    | Value          |
| ----------- | -------------- |
| Type        | `valueBoolean` |
| Cardinality | 0..1           |
| Default     | false          |

**Purpose**: Flag to identify the current/latest PDC observation for a patient-measure combination. Avoids expensive date sorting in queries.

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/is-current-pdc",
  "valueBoolean": true
}
```

**Invariant**: Only ONE Observation per patient-measure combination should have `is-current-pdc=true`.

---

### 4. MA Measure

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/ma-measure`

| Property    | Value       |
| ----------- | ----------- |
| Type        | `valueCode` |
| Cardinality | 0..1        |
| Binding     | Required    |

**Allowed Values**:

```typescript
type MAMeasure = 'MAC' | 'MAD' | 'MAH';
```

| Code | Full Name                             | Therapeutic Class  |
| ---- | ------------------------------------- | ------------------ |
| MAC  | Medication Adherence for Cholesterol  | Statins            |
| MAD  | Medication Adherence for Diabetes     | Oral Diabetes Meds |
| MAH  | Medication Adherence for Hypertension | RAS Antagonists    |

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/ma-measure",
  "valueCode": "MAC"
}
```

---

### 5. Days Until Runout

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/days-until-runout`

| Property    | Value          |
| ----------- | -------------- |
| Type        | `valueInteger` |
| Cardinality | 0..1           |
| Range       | -365 to 365    |

**Calculation**:

```typescript
daysUntilRunout = lastFillDate + daysSupply - today;
```

**Interpretation**:

- Positive: Days of medication remaining
- Zero: Runs out today
- Negative: Already out of medication for N days

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/days-until-runout",
  "valueInteger": 5
}
```

---

### 6. Gap Days Remaining

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/gap-days-remaining`

| Property    | Value          |
| ----------- | -------------- |
| Type        | `valueInteger` |
| Cardinality | 0..1           |
| Range       | 0-365          |

**Calculation**:

```typescript
// Days patient can miss and still reach 80% PDC by year end
gapDaysRemaining = Math.floor(daysRemainingInYear * 0.2) - gapDaysUsed;
```

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/gap-days-remaining",
  "valueInteger": 12
}
```

---

### 7. Delay Budget

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/delay-budget`

| Property    | Value          |
| ----------- | -------------- |
| Type        | `valueInteger` |
| Cardinality | 0..1           |
| Range       | 0-365          |

**Purpose**: Days until patient must refill to maintain 80% PDC. Used for tier classification and urgency.

**Relationship to Tier**:
| Delay Budget | Tier |
|--------------|------|
| 0-2 days | F1_IMMINENT |
| 3-5 days | F2_FRAGILE |
| 6-10 days | F3_MODERATE |
| 11-20 days | F4_COMFORTABLE |
| 21+ days | F5_SAFE |

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/delay-budget",
  "valueInteger": 4
}
```

---

### 8. Treatment Period

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/treatment-period`

| Property    | Value         |
| ----------- | ------------- |
| Type        | `valuePeriod` |
| Cardinality | 0..1          |

**Purpose**: The measurement period for PDC calculation (typically calendar year or since first fill).

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/treatment-period",
  "valuePeriod": {
    "start": "2024-01-15",
    "end": "2024-12-31"
  }
}
```

---

### 9. Q4 Adjusted

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/q4-adjusted`

| Property    | Value          |
| ----------- | -------------- |
| Type        | `valueBoolean` |
| Cardinality | 0..1           |

**Purpose**: Indicates if the fragility tier was promoted due to Q4 tightening rules.

**Q4 Tightening Criteria** (from Golden Standard):

- `daysToYearEnd < 60` AND
- `gapDaysRemaining <= 5`

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/q4-adjusted",
  "valueBoolean": true
}
```

---

## Patient Extensions (Denormalized Current State)

These extensions provide fast access to current state without joining to Observations.

### 10. Current Fragility Tier

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/current-fragility-tier`

| Property    | Value       |
| ----------- | ----------- |
| Type        | `valueCode` |
| Cardinality | 0..1        |

**Purpose**: The worst (most urgent) fragility tier across all measures for this patient.

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/current-fragility-tier",
  "valueCode": "F1_IMMINENT"
}
```

---

### 11. Current Priority Score

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/current-priority-score`

| Property    | Value          |
| ----------- | -------------- |
| Type        | `valueInteger` |
| Cardinality | 0..1           |

**Purpose**: The highest priority score across all measures for this patient.

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/current-priority-score",
  "valueInteger": 125
}
```

---

### 12. Current PDC by Measure (Complex Extension)

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/current-pdc-summary`

| Property    | Value                       |
| ----------- | --------------------------- |
| Type        | Complex (nested extensions) |
| Cardinality | 0..1                        |

**Structure**:

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
      "valueDateTime": "2024-11-15T10:30:00Z"
    }
  ]
}
```

---

### 13. Days Until Earliest Runout

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/days-until-earliest-runout`

| Property    | Value          |
| ----------- | -------------- |
| Type        | `valueInteger` |
| Cardinality | 0..1           |

**Purpose**: The minimum days until runout across all active medications.

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/days-until-earliest-runout",
  "valueInteger": 3
}
```

---

## Task Extensions (Workflow)

### 14. AI Confidence Score

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/ai-confidence-score`

| Property    | Value          |
| ----------- | -------------- |
| Type        | `valueDecimal` |
| Cardinality | 0..1           |
| Range       | 0.0-1.0        |

**Purpose**: AI model's confidence in the recommendation.

**Routing Thresholds**:
| Score | Action |
|-------|--------|
| ≥0.95 | Auto-approve candidate |
| 0.85-0.94 | Standard review |
| 0.70-0.84 | Enhanced review |
| <0.70 | Pharmacist escalation |

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/ai-confidence-score",
  "valueDecimal": 0.92
}
```

---

### 15. Review Type

**URL**: `https://ignitehealth.io/fhir/StructureDefinition/review-type`

| Property    | Value       |
| ----------- | ----------- |
| Type        | `valueCode` |
| Cardinality | 0..1        |

**Allowed Values**:

- `auto-approved` - High confidence, minimal review
- `standard-review` - Normal workflow
- `enhanced-review` - Additional safety checks
- `pharmacist-escalation` - Low confidence, needs expert

**Example**:

```json
{
  "url": "https://ignitehealth.io/fhir/StructureDefinition/review-type",
  "valueCode": "standard-review"
}
```

---

## Full Observation Example

```json
{
  "resourceType": "Observation",
  "id": "pdc-obs-12345",
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
        "code": "pdc-score",
        "display": "Proportion of Days Covered"
      }
    ]
  },
  "subject": {
    "reference": "Patient/patient-789"
  },
  "effectiveDateTime": "2024-11-15T10:00:00Z",
  "valueQuantity": {
    "value": 0.72,
    "unit": "ratio",
    "system": "http://unitsofmeasure.org",
    "code": "1"
  },
  "extension": [
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/fragility-tier",
      "valueCode": "F2_FRAGILE"
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/priority-score",
      "valueInteger": 105
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
      "valueInteger": 4
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/gap-days-remaining",
      "valueInteger": 8
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/delay-budget",
      "valueInteger": 4
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/treatment-period",
      "valuePeriod": {
        "start": "2024-03-15",
        "end": "2024-12-31"
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

## Full Patient Example (with Denormalized Extensions)

```json
{
  "resourceType": "Patient",
  "id": "patient-789",
  "identifier": [
    {
      "system": "https://ignitehealth.io/fhir/identifier/mrn",
      "value": "MRN-12345"
    }
  ],
  "name": [
    {
      "family": "Smith",
      "given": ["John"]
    }
  ],
  "birthDate": "1955-03-15",
  "extension": [
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/current-fragility-tier",
      "valueCode": "F2_FRAGILE"
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/current-priority-score",
      "valueInteger": 105
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/days-until-earliest-runout",
      "valueInteger": 4
    },
    {
      "url": "https://ignitehealth.io/fhir/StructureDefinition/current-pdc-summary",
      "extension": [
        {
          "url": "mac",
          "valueDecimal": 0.72
        },
        {
          "url": "mad",
          "valueDecimal": 0.88
        },
        {
          "url": "mah",
          "valueDecimal": null
        },
        {
          "url": "lastUpdated",
          "valueDateTime": "2024-11-15T10:00:00Z"
        }
      ]
    }
  ]
}
```

---

## Extension Validation (Zod Schemas)

```typescript
// src/schemas/fhir-extensions.ts
import { z } from 'zod';

export const FragilityTierSchema = z.enum([
  'COMPLIANT',
  'F1_IMMINENT',
  'F2_FRAGILE',
  'F3_MODERATE',
  'F4_COMFORTABLE',
  'F5_SAFE',
  'T5_UNSALVAGEABLE',
]);

export const MAMeasureSchema = z.enum(['MAC', 'MAD', 'MAH']);

export const PDCObservationExtensionsSchema = z.object({
  fragilityTier: FragilityTierSchema,
  priorityScore: z.number().int().min(0).max(155),
  isCurrentPDC: z.boolean(),
  maMeasure: MAMeasureSchema,
  daysUntilRunout: z.number().int().min(-365).max(365),
  gapDaysRemaining: z.number().int().min(0).max(365),
  delayBudget: z.number().int().min(0).max(365),
  treatmentPeriod: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  q4Adjusted: z.boolean(),
});

export const PatientExtensionsSchema = z.object({
  currentFragilityTier: FragilityTierSchema,
  currentPriorityScore: z.number().int().min(0).max(155),
  daysUntilEarliestRunout: z.number().int().min(-365).max(365),
  currentPDCSummary: z.object({
    mac: z.number().min(0).max(1).nullable(),
    mad: z.number().min(0).max(1).nullable(),
    mah: z.number().min(0).max(1).nullable(),
    lastUpdated: z.string().datetime(),
  }),
});
```

---

## Related Documents

- [04_SEARCH_PARAMETERS_SPEC.md](./04_SEARCH_PARAMETERS_SPEC.md) - Indexing for extensions
- [02_PDC_CALCULATOR_SPEC.md](./02_PDC_CALCULATOR_SPEC.md) - PDC calculation
- [03_FRAGILITY_TIER_SPEC.md](./03_FRAGILITY_TIER_SPEC.md) - Tier classification
