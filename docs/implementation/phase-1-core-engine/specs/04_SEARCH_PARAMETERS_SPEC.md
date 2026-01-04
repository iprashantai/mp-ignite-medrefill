# Phase 1: Custom SearchParameter Specification

> **Purpose**: Define FHIR SearchParameters for custom extensions to enable efficient querying and indexing for UI performance.

## Overview

Medplum supports custom SearchParameters that create database indexes on extension values. This is **critical** for UI performance when filtering/sorting by custom fields like fragility tier or priority score.

## Required SearchParameters

### 1. Fragility Tier (Observation)

```json
{
  "resourceType": "SearchParameter",
  "id": "observation-fragility-tier",
  "url": "https://ignitehealth.io/fhir/SearchParameter/observation-fragility-tier",
  "version": "1.0.0",
  "name": "fragility-tier",
  "status": "active",
  "description": "Search Observations by fragility tier classification",
  "code": "fragility-tier",
  "base": ["Observation"],
  "type": "token",
  "expression": "Observation.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/fragility-tier').valueCode"
}
```

**Use Cases**:

- Dashboard: Count patients by tier
- Queue: Filter by tier (F1, F2, etc.)
- Analytics: Tier distribution charts

**Example Query**:

```
GET /Observation?fragility-tier=F1_IMMINENT&_count=100
```

---

### 2. Priority Score (Observation)

```json
{
  "resourceType": "SearchParameter",
  "id": "observation-priority-score",
  "url": "https://ignitehealth.io/fhir/SearchParameter/observation-priority-score",
  "version": "1.0.0",
  "name": "priority-score",
  "status": "active",
  "description": "Search Observations by calculated priority score",
  "code": "priority-score",
  "base": ["Observation"],
  "type": "number",
  "expression": "Observation.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/priority-score').valueInteger"
}
```

**Use Cases**:

- Queue: Sort by priority (highest first)
- Dashboard: Identify high-priority patients

**Example Query**:

```
GET /Observation?_sort=-priority-score&_count=50
```

---

### 3. Is Current PDC (Observation)

```json
{
  "resourceType": "SearchParameter",
  "id": "observation-is-current-pdc",
  "url": "https://ignitehealth.io/fhir/SearchParameter/observation-is-current-pdc",
  "version": "1.0.0",
  "name": "is-current-pdc",
  "status": "active",
  "description": "Filter to get only the current/latest PDC observation",
  "code": "is-current-pdc",
  "base": ["Observation"],
  "type": "token",
  "expression": "Observation.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/is-current-pdc').valueBoolean"
}
```

**Use Cases**:

- Patient Detail: Get current PDC without sorting by date
- Queue: Join to current PDC only
- Performance: Avoid expensive date sorting

**Example Query**:

```
GET /Observation?is-current-pdc=true&patient=Patient/123
```

---

### 4. MA Measure Type (Observation)

```json
{
  "resourceType": "SearchParameter",
  "id": "observation-ma-measure",
  "url": "https://ignitehealth.io/fhir/SearchParameter/observation-ma-measure",
  "version": "1.0.0",
  "name": "ma-measure",
  "status": "active",
  "description": "Search Observations by HEDIS MA measure type",
  "code": "ma-measure",
  "base": ["Observation"],
  "type": "token",
  "expression": "Observation.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/ma-measure').valueCode"
}
```

**Use Cases**:

- Dashboard: Filter by measure (MAC, MAD, MAH)
- Queue: Show only specific measure types
- Analytics: Measure-specific compliance rates

**Example Query**:

```
GET /Observation?ma-measure=MAC&is-current-pdc=true
```

---

### 5. Days Until Runout (Observation)

```json
{
  "resourceType": "SearchParameter",
  "id": "observation-days-until-runout",
  "url": "https://ignitehealth.io/fhir/SearchParameter/observation-days-until-runout",
  "version": "1.0.0",
  "name": "days-until-runout",
  "status": "active",
  "description": "Search by days until medication runs out",
  "code": "days-until-runout",
  "base": ["Observation"],
  "type": "number",
  "expression": "Observation.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/days-until-runout').valueInteger"
}
```

**Use Cases**:

- Queue: Filter patients running out soon (≤7 days)
- Alerts: Identify urgent refills needed
- Dashboard: "Out of Meds" count

**Example Query**:

```
GET /Observation?days-until-runout=le7&is-current-pdc=true
```

---

### 6. Patient Fragility Tier (Denormalized on Patient)

```json
{
  "resourceType": "SearchParameter",
  "id": "patient-fragility-tier",
  "url": "https://ignitehealth.io/fhir/SearchParameter/patient-fragility-tier",
  "version": "1.0.0",
  "name": "patient-fragility-tier",
  "status": "active",
  "description": "Search Patients by their current worst fragility tier",
  "code": "patient-fragility-tier",
  "base": ["Patient"],
  "type": "token",
  "expression": "Patient.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/current-fragility-tier').valueCode"
}
```

**Use Cases**:

- Patient List: Filter by tier without joining Observations
- Fast dashboard counts
- Direct patient queries

**Example Query**:

```
GET /Patient?patient-fragility-tier=F1_IMMINENT
```

---

### 7. Patient Priority Score (Denormalized on Patient)

```json
{
  "resourceType": "SearchParameter",
  "id": "patient-priority-score",
  "url": "https://ignitehealth.io/fhir/SearchParameter/patient-priority-score",
  "version": "1.0.0",
  "name": "patient-priority-score",
  "status": "active",
  "description": "Search Patients by their current priority score",
  "code": "patient-priority-score",
  "base": ["Patient"],
  "type": "number",
  "expression": "Patient.extension.where(url='https://ignitehealth.io/fhir/StructureDefinition/current-priority-score').valueInteger"
}
```

**Use Cases**:

- Patient List: Sort by priority
- Queue: Direct patient sorting

**Example Query**:

```
GET /Patient?_sort=-patient-priority-score&_count=100
```

---

## UI Query Optimization Matrix

| UI Component            | Query Pattern                                                                              | SearchParameters Used                          | Target Latency |
| ----------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- | -------------- |
| Dashboard Tier Cards    | `GET /Patient?patient-fragility-tier=F1_IMMINENT&_summary=count`                           | patient-fragility-tier                         | <200ms         |
| Dashboard PDC Chart     | `GET /Observation?is-current-pdc=true&_summary=true`                                       | is-current-pdc                                 | <500ms         |
| Queue Table             | `GET /Patient?patient-fragility-tier=F1_IMMINENT,F2_FRAGILE&_sort=-patient-priority-score` | patient-fragility-tier, patient-priority-score | <1s            |
| Queue Filter by Measure | `GET /Observation?ma-measure=MAC&is-current-pdc=true&_include=Observation:subject`         | ma-measure, is-current-pdc                     | <1s            |
| Patient Detail PDC      | `GET /Observation?patient=Patient/123&is-current-pdc=true`                                 | is-current-pdc                                 | <300ms         |
| PDC History             | `GET /Observation?patient=Patient/123&code=pdc-score&_sort=-date`                          | (standard date index)                          | <500ms         |
| Urgent Refills          | `GET /Observation?days-until-runout=le3&is-current-pdc=true`                               | days-until-runout, is-current-pdc              | <500ms         |

---

## Denormalization Strategy for UI Performance

### Problem

Joining Observations to Patients for every queue query is expensive.

### Solution

Denormalize current state onto Patient.extension:

```typescript
// Patient.extension structure for fast queries
interface PatientExtensions {
  'current-fragility-tier': 'F1_IMMINENT' | 'F2_FRAGILE' | ... ;
  'current-priority-score': number;
  'current-pdc-mac': number | null;
  'current-pdc-mad': number | null;
  'current-pdc-mah': number | null;
  'days-until-runout': number | null;
  'pdc-last-updated': string; // ISO date
}
```

### Update Trigger

When a new PDC Observation is created:

1. Calculate tier and priority
2. Update Patient.extension with current values
3. Mark previous Observation's `is-current-pdc` = false

This happens in a Medplum Bot triggered on Observation create.

---

## Medplum SearchParameter Registration

### Deployment Script

```typescript
// scripts/deploy-search-parameters.ts
import { MedplumClient } from '@medplum/core';

const searchParameters = [
  // All SearchParameter JSON objects from above
];

async function deploySearchParameters(medplum: MedplumClient) {
  for (const sp of searchParameters) {
    const existing = await medplum.searchOne('SearchParameter', {
      url: sp.url,
    });

    if (existing) {
      await medplum.updateResource({
        ...sp,
        id: existing.id,
      });
      console.log(`Updated: ${sp.name}`);
    } else {
      await medplum.createResource(sp);
      console.log(`Created: ${sp.name}`);
    }
  }

  // Trigger reindex after SearchParameter changes
  console.log('SearchParameters deployed. Reindex may be required.');
}
```

### Reindexing Considerations

After deploying SearchParameters:

1. New resources are automatically indexed
2. Existing resources need reindex via Medplum admin
3. Plan for ~10-30 min reindex time for large datasets

---

## Performance Targets

| Metric              | Target | Measured By            |
| ------------------- | ------ | ---------------------- |
| Dashboard Load      | <2s    | Time to interactive    |
| Queue Page Load     | <2s    | First contentful paint |
| Queue Filter Change | <500ms | Filter response time   |
| Patient Detail Load | <1s    | All tabs data ready    |
| Tab Switch          | <300ms | Tab content render     |
| Search Autocomplete | <200ms | Suggestion display     |

---

## Index Coverage Checklist

| Field             | Resource    | Index Type | SearchParameter                  |
| ----------------- | ----------- | ---------- | -------------------------------- |
| fragility-tier    | Observation | token      | ✅ observation-fragility-tier    |
| priority-score    | Observation | number     | ✅ observation-priority-score    |
| is-current-pdc    | Observation | token      | ✅ observation-is-current-pdc    |
| ma-measure        | Observation | token      | ✅ observation-ma-measure        |
| days-until-runout | Observation | number     | ✅ observation-days-until-runout |
| fragility-tier    | Patient     | token      | ✅ patient-fragility-tier        |
| priority-score    | Patient     | number     | ✅ patient-priority-score        |
| status            | Task        | token      | ✅ (built-in)                    |
| patient           | \*          | reference  | ✅ (built-in)                    |
| date              | Observation | date       | ✅ (built-in)                    |
| code              | Observation | token      | ✅ (built-in)                    |

---

## Implementation Order

1. **Phase 1A**: Create SearchParameter resources for Observation extensions
2. **Phase 1B**: Create SearchParameter resources for Patient denormalized extensions
3. **Phase 1C**: Deploy Medplum Bot to maintain denormalized state
4. **Phase 1D**: Verify indexes with sample queries
5. **Phase 1E**: Load test with synthetic data (1000+ patients)

---

## Related Documents

- [02_PDC_CALCULATOR_SPEC.md](./02_PDC_CALCULATOR_SPEC.md) - PDC calculation logic
- [03_FRAGILITY_TIER_SPEC.md](./03_FRAGILITY_TIER_SPEC.md) - Tier classification
- [05_FHIR_EXTENSIONS_SPEC.md](./05_FHIR_EXTENSIONS_SPEC.md) - Extension definitions
