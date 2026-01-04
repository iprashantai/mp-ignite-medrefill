# Observation Service Specification

## Overview

This document specifies the Observation Service that stores PDC calculation results as FHIR Observation resources in Medplum.

---

## Purpose

The Observation Service:

1. **Stores** PDC calculation results as FHIR-compliant Observations
2. **Retrieves** historical PDC data for trending and analysis
3. **Enables** FHIR-native querying of adherence metrics

---

## FHIR Observation Structure

### PDC Observation Resource

```json
{
  "resourceType": "Observation",
  "id": "pdc-obs-001",
  "meta": {
    "profile": ["https://ignitehealth.com/fhir/profiles/pdc-observation"]
  },
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "exam",
          "display": "Exam"
        },
        {
          "system": "https://ignitehealth.com/fhir/observation-category",
          "code": "adherence-metric",
          "display": "Medication Adherence Metric"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "https://ignitehealth.com/metrics",
        "code": "pdc-mah",
        "display": "PDC Score - Hypertension (MAH)"
      }
    ]
  },
  "subject": {
    "reference": "Patient/patient-001"
  },
  "effectiveDateTime": "2025-10-15T10:30:00Z",
  "issued": "2025-10-15T10:30:00Z",
  "performer": [
    {
      "reference": "Organization/ignite-health"
    }
  ],
  "valueQuantity": {
    "value": 0.721,
    "unit": "%",
    "system": "http://unitsofmeasure.org",
    "code": "%"
  },
  "interpretation": [
    {
      "coding": [
        {
          "system": "https://ignitehealth.com/adherence-status",
          "code": "at-risk",
          "display": "At Risk"
        }
      ]
    }
  ],
  "component": [
    {
      "code": {
        "coding": [
          {
            "system": "https://ignitehealth.com/metrics",
            "code": "fragility-tier",
            "display": "Fragility Tier"
          }
        ]
      },
      "valueCodeableConcept": {
        "coding": [
          {
            "system": "https://ignitehealth.com/fragility-tiers",
            "code": "F1_IMMINENT",
            "display": "F1 - Imminent"
          }
        ]
      }
    },
    {
      "code": {
        "coding": [
          {
            "system": "https://ignitehealth.com/metrics",
            "code": "priority-score",
            "display": "Priority Score"
          }
        ]
      },
      "valueInteger": 155
    },
    {
      "code": {
        "coding": [
          {
            "system": "https://ignitehealth.com/metrics",
            "code": "gap-days-remaining",
            "display": "Gap Days Remaining"
          }
        ]
      },
      "valueInteger": 2
    },
    {
      "code": {
        "coding": [
          {
            "system": "https://ignitehealth.com/metrics",
            "code": "delay-budget",
            "display": "Delay Budget Per Refill"
          }
        ]
      },
      "valueQuantity": {
        "value": 1,
        "unit": "days/refill"
      }
    },
    {
      "code": {
        "coding": [
          {
            "system": "https://ignitehealth.com/metrics",
            "code": "urgency-level",
            "display": "Urgency Level"
          }
        ]
      },
      "valueCodeableConcept": {
        "coding": [
          {
            "system": "https://ignitehealth.com/urgency-levels",
            "code": "EXTREME",
            "display": "Extreme"
          }
        ]
      }
    },
    {
      "code": {
        "coding": [
          {
            "system": "https://ignitehealth.com/metrics",
            "code": "pdc-status-quo",
            "display": "PDC Status Quo Projection"
          }
        ]
      },
      "valueQuantity": {
        "value": 0.721,
        "unit": "%"
      }
    },
    {
      "code": {
        "coding": [
          {
            "system": "https://ignitehealth.com/metrics",
            "code": "pdc-perfect",
            "display": "PDC Perfect Projection"
          }
        ]
      },
      "valueQuantity": {
        "value": 0.877,
        "unit": "%"
      }
    },
    {
      "code": {
        "coding": [
          {
            "system": "https://ignitehealth.com/metrics",
            "code": "days-to-runout",
            "display": "Days to Medication Runout"
          }
        ]
      },
      "valueInteger": -3
    },
    {
      "code": {
        "coding": [
          {
            "system": "https://ignitehealth.com/metrics",
            "code": "covered-days",
            "display": "Covered Days"
          }
        ]
      },
      "valueInteger": 253
    },
    {
      "code": {
        "coding": [
          {
            "system": "https://ignitehealth.com/metrics",
            "code": "treatment-days",
            "display": "Treatment Period Days"
          }
        ]
      },
      "valueInteger": 351
    }
  ]
}
```

---

## Code Systems

### Observation Codes

```typescript
export const PDC_OBSERVATION_CODES = {
  MAC: {
    system: 'https://ignitehealth.com/metrics',
    code: 'pdc-mac',
    display: 'PDC Score - Cholesterol (MAC)',
  },
  MAD: {
    system: 'https://ignitehealth.com/metrics',
    code: 'pdc-mad',
    display: 'PDC Score - Diabetes (MAD)',
  },
  MAH: {
    system: 'https://ignitehealth.com/metrics',
    code: 'pdc-mah',
    display: 'PDC Score - Hypertension (MAH)',
  },
} as const;
```

### Interpretation Codes

```typescript
export const ADHERENCE_STATUS_CODES = {
  ADHERENT: {
    code: 'adherent',
    display: 'Adherent',
    condition: 'pdc >= 80',
  },
  AT_RISK: {
    code: 'at-risk',
    display: 'At Risk',
    condition: 'pdc >= 60 && pdc < 80',
  },
  NON_ADHERENT: {
    code: 'non-adherent',
    display: 'Non-Adherent',
    condition: 'pdc < 60',
  },
} as const;
```

### Fragility Tier Codes

```typescript
export const FRAGILITY_TIER_CODES = {
  COMPLIANT: { code: 'COMPLIANT', display: 'Compliant' },
  F1_IMMINENT: { code: 'F1_IMMINENT', display: 'F1 - Imminent' },
  F2_FRAGILE: { code: 'F2_FRAGILE', display: 'F2 - Fragile' },
  F3_MODERATE: { code: 'F3_MODERATE', display: 'F3 - Moderate' },
  F4_COMFORTABLE: { code: 'F4_COMFORTABLE', display: 'F4 - Comfortable' },
  F5_SAFE: { code: 'F5_SAFE', display: 'F5 - Safe' },
  T5_UNSALVAGEABLE: { code: 'T5_UNSALVAGEABLE', display: 'T5 - Unsalvageable' },
} as const;
```

### Urgency Level Codes

```typescript
export const URGENCY_LEVEL_CODES = {
  EXTREME: { code: 'EXTREME', display: 'Extreme' },
  HIGH: { code: 'HIGH', display: 'High' },
  MODERATE: { code: 'MODERATE', display: 'Moderate' },
  LOW: { code: 'LOW', display: 'Low' },
} as const;
```

---

## Function Specifications

### `createPDCObservation`

```typescript
/**
 * Create a PDC Observation from calculation results
 *
 * @param patientId - Patient resource ID
 * @param measure - MA measure type (MAC/MAD/MAH)
 * @param pdcResult - PDC calculation result
 * @param fragilityResult - Fragility tier result
 * @returns FHIR Observation resource ready for creation
 */
export function createPDCObservation(
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH',
  pdcResult: PDCResult,
  fragilityResult: FragilityResult
): Observation;
```

### `storePDCObservation`

```typescript
/**
 * Store PDC Observation in Medplum
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - MA measure type
 * @param pdcResult - PDC calculation result
 * @param fragilityResult - Fragility tier result
 * @returns Created Observation resource with ID
 *
 * @example
 * const obs = await storePDCObservation(
 *   medplum,
 *   'patient-001',
 *   'MAH',
 *   pdcResult,
 *   fragilityResult
 * );
 * console.log(obs.id); // 'pdc-obs-001'
 */
export async function storePDCObservation(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH',
  pdcResult: PDCResult,
  fragilityResult: FragilityResult
): Promise<Observation>;
```

### `getLatestPDCObservation`

```typescript
/**
 * Get the most recent PDC Observation for a patient and measure
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - MA measure type
 * @returns Latest Observation or null
 *
 * @example
 * const latest = await getLatestPDCObservation(medplum, 'patient-001', 'MAH');
 */
export async function getLatestPDCObservation(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH'
): Promise<Observation | null>;
```

### `getPDCHistory`

```typescript
/**
 * Get PDC Observation history for trending
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - MA measure type
 * @param count - Number of observations to return (default 12)
 * @returns Array of Observations sorted by date descending
 *
 * @example
 * const history = await getPDCHistory(medplum, 'patient-001', 'MAH', 12);
 */
export async function getPDCHistory(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH',
  count?: number
): Promise<Observation[]>;
```

### `parsePDCObservation`

```typescript
/**
 * Parse a PDC Observation back into PDCResult and FragilityResult
 *
 * @param observation - FHIR Observation resource
 * @returns Parsed results or null if invalid
 *
 * @example
 * const { pdcResult, fragilityResult } = parsePDCObservation(observation);
 */
export function parsePDCObservation(observation: Observation): {
  pdcResult: PDCResult;
  fragilityResult: FragilityResult;
} | null;
```

---

## Test Cases

### Store Observation Tests

| ID     | Scenario                | Expected                                      |
| ------ | ----------------------- | --------------------------------------------- |
| OS-001 | Create new observation  | All components populated                      |
| OS-002 | PDC >= 80%              | interpretation = 'adherent'                   |
| OS-003 | PDC 60-79%              | interpretation = 'at-risk'                    |
| OS-004 | PDC < 60%               | interpretation = 'non-adherent'               |
| OS-005 | F1 tier                 | fragility-tier component = 'F1_IMMINENT'      |
| OS-006 | COMPLIANT tier          | fragility-tier component = 'COMPLIANT'        |
| OS-007 | T5 tier                 | fragility-tier component = 'T5_UNSALVAGEABLE' |
| OS-008 | All bonuses             | priority-score includes all bonuses           |
| OS-009 | Negative days to runout | days-to-runout component is negative          |
| OS-010 | Subject reference       | subject.reference = 'Patient/{id}'            |

### Get Observation Tests

| ID     | Scenario              | Expected                     |
| ------ | --------------------- | ---------------------------- |
| OG-001 | Multiple observations | Returns most recent          |
| OG-002 | No observations       | Returns null                 |
| OG-003 | Filter by measure     | Returns correct measure only |
| OG-004 | Get history           | Returns in date order        |

### Parse Observation Tests

| ID     | Scenario            | Expected                   |
| ------ | ------------------- | -------------------------- |
| OP-001 | Valid observation   | Parses PDCResult correctly |
| OP-002 | Missing component   | Returns partial result     |
| OP-003 | Invalid observation | Returns null               |

---

## Search Queries

### Get Latest by Patient and Measure

```typescript
const search: SearchRequest<Observation> = {
  resourceType: 'Observation',
  filters: [
    { code: 'subject', value: `Patient/${patientId}` },
    { code: 'code', value: `https://ignitehealth.com/metrics|pdc-${measure.toLowerCase()}` },
  ],
  sortRules: [{ code: '-date' }],
  count: 1,
};
```

### Get History

```typescript
const search: SearchRequest<Observation> = {
  resourceType: 'Observation',
  filters: [
    { code: 'subject', value: `Patient/${patientId}` },
    { code: 'code', value: `https://ignitehealth.com/metrics|pdc-${measure.toLowerCase()}` },
    { code: 'date', operator: 'ge', value: '2025-01-01' },
  ],
  sortRules: [{ code: '-date' }],
  count: count,
};
```

### Get All PDC for Patient

```typescript
const search: SearchRequest<Observation> = {
  resourceType: 'Observation',
  filters: [
    { code: 'subject', value: `Patient/${patientId}` },
    {
      code: 'category',
      value: 'https://ignitehealth.com/fhir/observation-category|adherence-metric',
    },
  ],
  sortRules: [{ code: '-date' }],
};
```

---

## Usage Example

```typescript
import { calculatePDC } from '@/lib/pdc/calculator';
import { calculateFragility } from '@/lib/pdc/fragility';
import { storePDCObservation, getLatestPDCObservation } from '@/lib/fhir/observation-service';
import { getPatientDispenses } from '@/lib/fhir/dispense-service';

// Calculate and store PDC
async function updatePatientPDC(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH'
) {
  // 1. Get dispenses
  const dispenses = await getPatientDispenses(medplum, patientId, 2025);

  // 2. Calculate PDC
  const pdcResult = calculatePDC(dispenses, 2025);

  // 3. Calculate fragility
  const fragilityResult = calculateFragility({
    pdcResult,
    refillsRemaining: 2,
    measureTypes: [measure],
    isNewPatient: false,
    currentDate: new Date(),
  });

  // 4. Store as FHIR Observation
  const observation = await storePDCObservation(
    medplum,
    patientId,
    measure,
    pdcResult,
    fragilityResult
  );

  return observation;
}

// Retrieve latest PDC
async function getPatientAdherence(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH'
) {
  const observation = await getLatestPDCObservation(medplum, patientId, measure);

  if (!observation) {
    return null;
  }

  return parsePDCObservation(observation);
}
```
