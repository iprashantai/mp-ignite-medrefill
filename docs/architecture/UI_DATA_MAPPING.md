# UI Data Mapping: Legacy → FHIR

**Purpose**: This document provides a field-by-field mapping between legacy UI data structures and FHIR resources, enabling future Claude Code sessions to understand exactly where to fetch each UI field from.

**Last Updated**: 2026-01-07
**Phase**: Phase 2 (Patient List UI Implementation)

---

## Table of Contents

1. [Legacy Data Structure](#1-legacy-data-structure)
2. [FHIR Data Structure](#2-fhir-data-structure)
3. [Field-by-Field Mapping Table](#3-field-by-field-mapping-table)
4. [Page-Specific Query Patterns](#4-page-specific-query-patterns)
5. [Performance Optimization Guidance](#5-performance-optimization-guidance)

---

## 1. Legacy Data Structure

### 1.1 LegacyPatient Interface

**Source**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/types/legacy-types.ts`

```typescript
interface LegacyPatient {
  // Core demographics
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  name: string; // Full name (computed from firstName + lastName)
  dateOfBirth: string; // YYYY-MM-DD
  age: number;
  gender?: string;

  // Medications array (primary data structure)
  medications: LegacyMedication[];

  // Per-measure aggregations
  perMeasure?: {
    MAC?: PerMeasureMetrics;
    MAD?: PerMeasureMetrics;
    MAH?: PerMeasureMetrics;
  };

  // Patient-level aggregations
  aggregateMetrics: AggregateMetrics;
  currentPDC: number | null; // Shorthand for aggregateMetrics.allMedsPDC
  fragilityTier: FragilityTier | null; // Shorthand for aggregateMetrics.worstFragilityTier
  priorityScore: number; // Shorthand for aggregateMetrics.highestPriorityScore

  // Refill queue flags
  in14DayQueue: boolean; // Any medication within 14 days of runout
  daysToRunout: number | null; // Earliest runout across all meds
  nextRefillDue: string | null; // Earliest refill date

  // Risk flags
  isAtRisk: boolean; // PDC < 80%
  isFailing: boolean; // PDC < 60%

  // CRM fields
  crmStatus: CRMStatus;
  campaigns: string[]; // Campaign IDs

  // Metadata
  _version: string; // '5.0-fhir-adapter'
  _computedAt: string; // ISO timestamp
  _fhirPatient?: Patient; // Original FHIR resource
}
```

### 1.2 LegacyMedication Interface

```typescript
interface LegacyMedication {
  id: string;
  medicationName: string;
  drugName: string; // Alias for medicationName
  dosage: string;
  medicationClass: string;
  measure: MAMeasure | null; // 'MAC' | 'MAD' | 'MAH'
  ndc: string | null;
  refillsLeft: number | null;
  daysSupply: number | null;
  isMedicationAdherence: boolean;

  // Adherence object (nested)
  adherence: {
    pdc: number | null;
    status: PDCStatus | null; // 'passing' | 'at-risk' | 'failing'
  };

  // PDC calculation results
  currentPdc: number | null;
  currentPdcExact: number | null; // Alias for currentPdc
  gapDaysRemaining: number | null;
  gapDaysUsed: number | null;
  gapDaysAllowed: number | null;

  // Refill tracking
  lastFillDate: string | null;
  nextRefillDue: string | null;
  daysToRunout: number | null;
  claimsCount: number;

  // Fragility & Priority (calculated per medication)
  fragilityTier?: FragilityTier | null;
  priorityScore?: number;
}
```

### 1.3 AggregateMetrics Interface

```typescript
interface AggregateMetrics {
  allMedsPDC: number | null; // MIN across all measures
  worstFragilityTier: FragilityTier | null; // WORST tier across measures
  highestPriorityScore: number; // MAX score across measures
  totalMedications: number;
  maMedications: number; // Count of MA meds
  passingCount: number;
  atRiskCount: number;
  failingCount: number;
}
```

---

## 2. FHIR Data Structure

### 2.1 Patient Resource with Extensions (Phase 2A)

**Updated by**: Nightly bot (`src/bots/pdc-nightly-calculator/index.ts`) at 2 AM
**Orchestrated by**: `src/lib/pdc/orchestrator.ts`

```typescript
// Patient resource with denormalized extensions
{
  resourceType: 'Patient',
  id: '123',
  identifier: [
    { type: { coding: [{ code: 'MR' }] }, value: 'MRN-12345' }
  ],
  name: [
    { given: ['John'], family: 'Doe', text: 'John Doe' }
  ],
  birthDate: '1955-03-15',
  gender: 'male',

  // PHASE 2A EXTENSIONS (populated by orchestrator)
  extension: [
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/current-fragility-tier',
      valueCode: 'F2_FRAGILE'
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/current-priority-score',
      valueInteger: 95
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/days-until-earliest-runout',
      valueInteger: 5
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/current-pdc-summary',
      extension: [
        { url: 'mac', valueDecimal: 0.72 },
        { url: 'mad', valueDecimal: 0.85 },
        { url: 'mah', valueDecimal: null },
        { url: 'lastUpdated', valueDateTime: '2026-01-07T02:00:00Z' }
      ]
    }
  ]
}
```

### 2.2 Observation Resources (Measure-Level, Phase 1)

**Code**: `pdc-mac`, `pdc-mad`, `pdc-mah`
**Created by**: `src/lib/fhir/observation-service.ts`

```typescript
{
  resourceType: 'Observation',
  id: 'obs-mac-123',
  status: 'final',
  code: {
    coding: [{
      system: 'https://ignitehealth.io/fhir/CodeSystem/adherence-metrics',
      code: 'pdc-mac',
      display: 'PDC Score - Cholesterol (MAC)'
    }]
  },
  subject: { reference: 'Patient/123' },
  effectiveDateTime: '2026-01-07T02:00:00Z',
  valueQuantity: { value: 0.72, unit: 'ratio' },

  extension: [
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/fragility-tier',
      valueCode: 'F2_FRAGILE'
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/priority-score',
      valueInteger: 95
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/is-current-pdc',
      valueBoolean: true
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/ma-measure',
      valueCode: 'MAC'
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/days-until-runout',
      valueInteger: 5
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/gap-days-remaining',
      valueInteger: 15
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/delay-budget',
      valueInteger: 10
    }
  ]
}
```

### 2.3 Observation Resources (Medication-Level, Phase 1.5)

**Code**: `pdc-medication`
**Created by**: `src/lib/fhir/medication-observation-service.ts`

```typescript
{
  resourceType: 'Observation',
  id: 'obs-med-atorvastatin-123',
  status: 'final',
  code: {
    coding: [{
      system: 'https://ignitehealth.io/fhir/CodeSystem/adherence-metrics',
      code: 'pdc-medication',
      display: 'Medication PDC'
    }],
    text: 'Atorvastatin 20mg'
  },
  subject: { reference: 'Patient/123' },
  effectiveDateTime: '2026-01-07T02:00:00Z',
  valueQuantity: { value: 0.72, unit: 'ratio' },

  extension: [
    // Medication-specific extensions
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/medication-rxnorm',
      valueString: '83367'
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/medication-display',
      valueString: 'Atorvastatin 20mg'
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/parent-measure-observation',
      valueReference: { reference: 'Observation/obs-mac-123' }
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/remaining-refills',
      valueInteger: 2
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/supply-on-hand',
      valueInteger: 12
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/coverage-shortfall',
      valueInteger: 60
    },
    // Shared extensions (from measure-level)
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/fragility-tier',
      valueCode: 'F2_FRAGILE'
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/priority-score',
      valueInteger: 95
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/is-current-pdc',
      valueBoolean: true
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/ma-measure',
      valueCode: 'MAC'
    },
    {
      url: 'https://ignitehealth.io/fhir/StructureDefinition/days-until-runout',
      valueInteger: 5
    }
  ]
}
```

### 2.4 MedicationDispense Resources (Phase 1)

**Source**: Claims data
**Queried by**: `src/lib/fhir/dispense-service.ts`

```typescript
{
  resourceType: 'MedicationDispense',
  id: 'dispense-789',
  status: 'completed',
  medicationCodeableConcept: {
    coding: [{
      system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
      code: '83367',
      display: 'Atorvastatin 20mg'
    }]
  },
  subject: { reference: 'Patient/123' },
  whenHandedOver: '2025-12-15',
  quantity: { value: 30, unit: 'tablet' },
  daysSupply: { value: 30 }
}
```

---

## 3. Field-by-Field Mapping Table

### 3.1 All Patients List View

| UI Page | UI Column/Field | Legacy Path | FHIR Path | Service/Function to Call | Notes |
|---------|----------------|-------------|-----------|--------------------------|-------|
| All Patients | Patient Name | `patient.name` | `Patient.name[0].text` | `medplum.readResource('Patient', id)` | OR `Patient.name[0].given.join(' ') + ' ' + Patient.name[0].family` |
| All Patients | First Name | `patient.firstName` | `Patient.name[0].given[0]` | `medplum.readResource('Patient', id)` | |
| All Patients | Last Name | `patient.lastName` | `Patient.name[0].family` | `medplum.readResource('Patient', id)` | |
| All Patients | MRN | `patient.mrn` | `Patient.identifier[type=MR].value` | `medplum.readResource('Patient', id)` | Filter by `identifier.type.coding[0].code === 'MR'` |
| All Patients | Date of Birth | `patient.dateOfBirth` | `Patient.birthDate` | `medplum.readResource('Patient', id)` | Format: YYYY-MM-DD |
| All Patients | Age | `patient.age` | Calculated from `Patient.birthDate` | Calculate client-side | `today.year - birthDate.year` |
| All Patients | Gender | `patient.gender` | `Patient.gender` | `medplum.readResource('Patient', id)` | |
| All Patients | PDC (Aggregate) | `patient.currentPDC` | `Patient.extension[current-pdc-summary].extension[{mac,mad,mah}].valueDecimal` (MIN) | `extractPatientPDCSummary(patient)` | Take minimum across all measures, multiply by 100 for % |
| All Patients | PDC (MAC) | `patient.perMeasure.MAC.currentPDC` | `Patient.extension[current-pdc-summary].extension[mac].valueDecimal` | `extractPatientPDCSummary(patient)` | Multiply by 100 for % |
| All Patients | PDC (MAD) | `patient.perMeasure.MAD.currentPDC` | `Patient.extension[current-pdc-summary].extension[mad].valueDecimal` | `extractPatientPDCSummary(patient)` | Multiply by 100 for % |
| All Patients | PDC (MAH) | `patient.perMeasure.MAH.currentPDC` | `Patient.extension[current-pdc-summary].extension[mah].valueDecimal` | `extractPatientPDCSummary(patient)` | Multiply by 100 for % |
| All Patients | Fragility Tier | `patient.fragilityTier` | `Patient.extension[current-fragility-tier].valueCode` | `extractPatientPDCSummary(patient)` | Worst tier across all measures |
| All Patients | Priority Score | `patient.priorityScore` | `Patient.extension[current-priority-score].valueInteger` | `extractPatientPDCSummary(patient)` | Highest score across all measures |
| All Patients | Days to Runout | `patient.daysToRunout` | `Patient.extension[days-until-earliest-runout].valueInteger` | `extractPatientPDCSummary(patient)` | Earliest runout across all medications |
| All Patients | Next Refill Date | `patient.nextRefillDue` | Calculated from `daysToRunout` | `new Date(Date.now() + daysToRunout * 86400000)` | Client-side calculation |
| All Patients | In 14-Day Queue | `patient.in14DayQueue` | Calculated from `daysToRunout` | `daysToRunout <= 14` | Client-side boolean |
| All Patients | Is At Risk | `patient.isAtRisk` | Calculated from aggregate PDC | `aggregatePDC < 80` | Client-side boolean |
| All Patients | Is Failing | `patient.isFailing` | Calculated from aggregate PDC | `aggregatePDC < 60` | Client-side boolean |
| All Patients | CRM Status | `patient.crmStatus` | `Patient.extension[crm-status].valueCode` OR `Flag` resource | Future (Phase 2) | Not yet implemented |
| All Patients | Campaigns | `patient.campaigns` | `CareTeam` membership OR `Patient.extension` | Future (Phase 2) | Not yet implemented |
| All Patients | Last Updated | `patient._computedAt` | `Patient.extension[current-pdc-summary].extension[lastUpdated].valueDateTime` | `extractPatientPDCSummary(patient)` | From Phase 2A nightly bot |

### 3.2 Patient Detail View (Future - Phase 3)

| UI Page | UI Column/Field | Legacy Path | FHIR Path | Service/Function to Call | Notes |
|---------|----------------|-------------|-----------|--------------------------|-------|
| Patient Detail | MAC PDC Details | `patient.perMeasure.MAC` | Observation with code `pdc-mac` | `getCurrentPDCObservation(medplum, patientId, 'MAC')` | Includes extensions (tier, priority, etc.) |
| Patient Detail | MAD PDC Details | `patient.perMeasure.MAD` | Observation with code `pdc-mad` | `getCurrentPDCObservation(medplum, patientId, 'MAD')` | Includes extensions |
| Patient Detail | MAH PDC Details | `patient.perMeasure.MAH` | Observation with code `pdc-mah` | `getCurrentPDCObservation(medplum, patientId, 'MAH')` | Includes extensions |
| Patient Detail | Medication List | `patient.medications` | Observations with code `pdc-medication` | `getAllCurrentMedicationPDCObservations(medplum, patientId)` | Phase 1.5 medication-level observations |
| Patient Detail | Medication Name | `medication.medicationName` | `Observation.code.text` OR `extension[medication-display].valueString` | Parse medication observation | |
| Patient Detail | Medication PDC | `medication.currentPdc` | `Observation.valueQuantity.value` | Parse medication observation | Multiply by 100 for % |
| Patient Detail | Refills Left | `medication.refillsLeft` | `Observation.extension[remaining-refills].valueInteger` | Parse medication observation | Phase 1.5 refill calculation |
| Patient Detail | Supply on Hand | `medication.daysSupply` | `Observation.extension[supply-on-hand].valueInteger` | Parse medication observation | Phase 1.5 supply calculation |
| Patient Detail | Coverage Shortfall | N/A (new) | `Observation.extension[coverage-shortfall].valueInteger` | Parse medication observation | Phase 1.5 feature |
| Patient Detail | Claims History | `patient.rxClaims` | `MedicationDispense` resources | `getPatientDispenses(medplum, patientId)` | Phase 1 dispense service |
| Patient Detail | Claim Fill Date | `claim.fillDate` | `MedicationDispense.whenHandedOver` | Parse dispense | |
| Patient Detail | Claim Days Supply | `claim.daysSupply` | `MedicationDispense.daysSupply.value` | Parse dispense | |
| Patient Detail | Claim NDC | `claim.ndc` | `MedicationDispense.medicationCodeableConcept.coding[system=NDC].code` | Parse dispense | |
| Patient Detail | Last Fill Date | `medication.lastFillDate` | Latest `MedicationDispense.whenHandedOver` | Sort dispenses by date, take first | Client-side calculation |

### 3.3 Analytics Dashboard (Future)

| UI Page | UI Column/Field | Legacy Path | FHIR Path | Service/Function to Call | Notes |
|---------|----------------|-------------|-----------|--------------------------|-------|
| Analytics | Total Patients | Count of `patients` | Count of `Patient` resources | `medplum.searchResources('Patient', { active: 'true' })` | `.length` |
| Analytics | MA Patients | Patients with MA meds | Patients with `extension[current-pdc-summary]` | Filter patients with PDC summary extension | Client-side filter |
| Analytics | Passing Count | `aggregateMetrics.passingCount` | Count where aggregate PDC >= 80% | Client-side calculation | |
| Analytics | At-Risk Count | `aggregateMetrics.atRiskCount` | Count where aggregate PDC 60-79% | Client-side calculation | |
| Analytics | Failing Count | `aggregateMetrics.failingCount` | Count where aggregate PDC < 60% | Client-side calculation | |
| Analytics | Refill Candidates | Patients with `daysToRunout <= 14` | Count where `extension[days-until-earliest-runout] <= 14` | Client-side filter | |
| Analytics | Fragility Breakdown | Count by tier | Group by `extension[current-fragility-tier].valueCode` | Client-side aggregation | |
| Analytics | PDC Breakdown | Count by PDC range | Group by PDC ranges (0-60, 60-80, 80-90, 90+) | Client-side aggregation | |
| Analytics | Measure Breakdown | Count by measure | Count patients with each measure in PDC summary | Client-side aggregation | |

---

## 4. Page-Specific Query Patterns

### 4.1 All Patients List Page

**Location**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/app/(dashboard)/patients/page.tsx`

**Data Needed**:
- Patient demographics
- Aggregate PDC (worst across measures)
- Fragility tier (worst across measures)
- Priority score (highest across measures)
- Days to runout (earliest)

**Query Pattern**:

```typescript
import { useMedplum } from '@medplum/react';
import { extractPatientPDCSummary } from '@/lib/fhir/patient-extensions';

// 1. Fetch patients from Medplum
const medplum = useMedplum();
const patients = await medplum.searchResources('Patient', {
  active: 'true',
  _count: 200,
  _sort: '-_lastUpdated',
  // Optional: Use custom SearchParameters (Phase 2A, with fallback)
  // 'patient-fragility-tier': 'F1_IMMINENT,F2_FRAGILE', // Filter by urgent tiers
});

// 2. Transform each patient to PatientListItem
const patientItems = patients.map((patient) => {
  const name = patient.name?.[0];
  const firstName = name?.given?.[0] || '';
  const lastName = name?.family || '';
  const displayName = name?.text || `${lastName}, ${firstName}`.trim();

  const mrn = patient.identifier?.find((id) => id.type?.coding?.[0]?.code === 'MR')?.value || patient.id;

  // Extract PDC summary from extensions (Phase 2A)
  const pdcSummary = extractPatientPDCSummary(patient);

  // Calculate aggregate PDC (worst/minimum across measures)
  const pdcValues = [
    pdcSummary?.pdcByMeasure.MAC,
    pdcSummary?.pdcByMeasure.MAD,
    pdcSummary?.pdcByMeasure.MAH,
  ].filter((pdc) => pdc !== null) as number[];

  const aggregatePDC = pdcValues.length > 0 ? Math.min(...pdcValues) : null;

  return {
    id: patient.id!,
    mrn,
    name: displayName,
    firstName,
    lastName,
    dateOfBirth: patient.birthDate || '',
    aggregatePDC: aggregatePDC !== null ? aggregatePDC * 100 : null, // Convert to %
    fragilityTier: pdcSummary?.worstTier || null,
    priorityScore: pdcSummary?.highestPriorityScore || 0,
    daysToRunout: pdcSummary?.daysUntilEarliestRunout || null,
    pdcByMeasure: {
      MAC: pdcSummary?.pdcByMeasure.MAC !== null ? pdcSummary.pdcByMeasure.MAC * 100 : null,
      MAD: pdcSummary?.pdcByMeasure.MAD !== null ? pdcSummary.pdcByMeasure.MAD * 100 : null,
      MAH: pdcSummary?.pdcByMeasure.MAH !== null ? pdcSummary.pdcByMeasure.MAH * 100 : null,
    },
  };
});
```

**Service Function** (recommended):

```typescript
// src/lib/fhir/patient-list-service.ts
import { MedplumClient } from '@medplum/core';
import { Patient } from '@medplum/fhirtypes';
import { extractPatientPDCSummary } from './patient-extensions';

export async function fetchPatientList(
  medplum: MedplumClient,
  options: {
    pageSize?: number;
    offset?: number;
    filters?: {
      fragilityTiers?: string[];
      search?: string;
    };
  } = {}
) {
  const { pageSize = 100, offset = 0, filters } = options;

  const searchParams: Record<string, string> = {
    active: 'true',
    _count: String(pageSize),
    _offset: String(offset),
    _sort: '-_lastUpdated',
  };

  // Try using custom SearchParameter (Phase 2A, with fallback)
  if (filters?.fragilityTiers && filters.fragilityTiers.length > 0) {
    try {
      searchParams['patient-fragility-tier'] = filters.fragilityTiers.join(',');
      const bundle = await medplum.search('Patient', searchParams);
      return bundle.entry?.map((e) => e.resource as Patient) || [];
    } catch {
      // Fallback: search without custom parameter, filter client-side
      delete searchParams['patient-fragility-tier'];
      const bundle = await medplum.search('Patient', searchParams);
      const patients = bundle.entry?.map((e) => e.resource as Patient) || [];

      // Filter client-side
      return patients.filter((p) => {
        const summary = extractPatientPDCSummary(p);
        return summary && filters.fragilityTiers!.includes(summary.worstTier);
      });
    }
  }

  const bundle = await medplum.search('Patient', searchParams);
  return bundle.entry?.map((e) => e.resource as Patient) || [];
}
```

### 4.2 Patient Detail Page (Future - Phase 3)

**Location**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/app/(dashboard)/patients/[id]/page.tsx`

**Data Needed**:
- Patient demographics
- Measure-level PDC observations (MAC, MAD, MAH)
- Medication-level PDC observations
- Dispense history

**Query Pattern**:

```typescript
import { getCurrentPDCObservation, getAllCurrentPDCObservations } from '@/lib/fhir/observation-service';
import { getAllCurrentMedicationPDCObservations } from '@/lib/fhir/medication-observation-service';
import { getPatientDispenses } from '@/lib/fhir/dispense-service';

const patientId = 'patient-123';

// 1. Fetch patient resource
const patient = await medplum.readResource('Patient', patientId);

// 2. Fetch measure-level PDC observations
const macObservation = await getCurrentPDCObservation(medplum, patientId, 'MAC');
const madObservation = await getCurrentPDCObservation(medplum, patientId, 'MAD');
const mahObservation = await getCurrentPDCObservation(medplum, patientId, 'MAH');

// 3. Fetch medication-level PDC observations
const medicationObservations = await getAllCurrentMedicationPDCObservations(medplum, patientId);

// 4. Fetch dispense history
const dispenses = await getPatientDispenses(medplum, patientId, {
  startDate: '2025-01-01',
  endDate: '2025-12-31',
});
```

### 4.3 Queue/Worklist Page (Future)

**Data Needed**:
- Patients with urgent tiers (F1, F2)
- Patients with `daysToRunout <= 14`
- Sorted by priority score (descending)

**Query Pattern**:

```typescript
// Try custom SearchParameter (Phase 2A, with fallback)
try {
  const urgentPatients = await medplum.searchResources('Patient', {
    active: 'true',
    'patient-fragility-tier': 'F1_IMMINENT,F2_FRAGILE',
    _sort: '-patient-priority-score', // Sort by priority (custom SearchParameter)
    _count: 50,
  });
} catch {
  // Fallback: search all patients, filter and sort client-side
  const allPatients = await medplum.searchResources('Patient', {
    active: 'true',
    _count: 500,
  });

  const urgentPatients = allPatients
    .filter((p) => {
      const summary = extractPatientPDCSummary(p);
      return summary && ['F1_IMMINENT', 'F2_FRAGILE'].includes(summary.worstTier);
    })
    .sort((a, b) => {
      const aScore = extractPatientPDCSummary(a)?.highestPriorityScore || 0;
      const bScore = extractPatientPDCSummary(b)?.highestPriorityScore || 0;
      return bScore - aScore; // Descending
    });
}
```

### 4.4 Analytics Dashboard Aggregation

**Query Pattern**:

```typescript
// Fetch all active patients
const allPatients = await medplum.searchResources('Patient', {
  active: 'true',
  _count: 1000,
});

// Calculate metrics client-side
const metrics = {
  totalPatients: allPatients.length,
  maPatients: 0,
  passingCount: 0,
  atRiskCount: 0,
  failingCount: 0,
  refillCandidates: 0,
  fragilityBreakdown: {
    F1_IMMINENT: 0,
    F2_FRAGILE: 0,
    F3_MODERATE: 0,
    F4_COMFORTABLE: 0,
    F5_SAFE: 0,
    T5_UNSALVAGEABLE: 0,
    COMPLIANT: 0,
  },
};

allPatients.forEach((patient) => {
  const summary = extractPatientPDCSummary(patient);
  if (!summary) return;

  metrics.maPatients++;

  // Calculate aggregate PDC
  const pdcValues = [
    summary.pdcByMeasure.MAC,
    summary.pdcByMeasure.MAD,
    summary.pdcByMeasure.MAH,
  ].filter((pdc) => pdc !== null) as number[];

  const aggregatePDC = pdcValues.length > 0 ? Math.min(...pdcValues) * 100 : null;

  if (aggregatePDC !== null) {
    if (aggregatePDC >= 80) metrics.passingCount++;
    else if (aggregatePDC >= 60) metrics.atRiskCount++;
    else metrics.failingCount++;
  }

  // Refill candidates
  if (summary.daysUntilEarliestRunout !== null && summary.daysUntilEarliestRunout <= 14) {
    metrics.refillCandidates++;
  }

  // Fragility breakdown
  metrics.fragilityBreakdown[summary.worstTier]++;
});
```

---

## 5. Performance Optimization Guidance

### 5.1 When to Use Denormalized Patient Extensions (FAST)

**Use Case**: List views with many patients (All Patients page, Queue page)

**Why**: Patient extensions are populated nightly by Phase 2A bot and contain pre-computed aggregates.

**Advantages**:
- Single `Patient` resource query (no joins)
- No real-time calculation needed
- Fast filtering using custom SearchParameters
- Scales to thousands of patients

**Code Example**:
```typescript
// FAST: Use denormalized extensions
const patients = await medplum.searchResources('Patient', {
  active: 'true',
  _count: 200,
});

const patientItems = patients.map((p) => {
  const summary = extractPatientPDCSummary(p); // Read from extensions
  return {
    id: p.id,
    aggregatePDC: calcMin(summary.pdcByMeasure) * 100,
    fragilityTier: summary.worstTier,
    priorityScore: summary.highestPriorityScore,
    daysToRunout: summary.daysUntilEarliestRunout,
  };
});
```

### 5.2 When to Query Observations Directly (DETAILED)

**Use Case**: Patient detail page, drill-down views, debugging

**Why**: Observations contain full details (extensions) for each measure and medication.

**Advantages**:
- Access to all PDC calculation metadata
- Medication-level breakdown (Phase 1.5)
- Historical trends (via `is-current-pdc: false`)

**Code Example**:
```typescript
// DETAILED: Query observations for full details
const macObservation = await getCurrentPDCObservation(medplum, patientId, 'MAC');

// Access full metadata
const macDetails = {
  pdc: macObservation.valueQuantity?.value,
  tier: getCodeExtension(macObservation.extension, EXTENSION_URLS.FRAGILITY_TIER),
  priority: getIntegerExtension(macObservation.extension, EXTENSION_URLS.PRIORITY_SCORE),
  gapDays: getIntegerExtension(macObservation.extension, EXTENSION_URLS.GAP_DAYS_REMAINING),
  delayBudget: getIntegerExtension(macObservation.extension, EXTENSION_URLS.DELAY_BUDGET),
  daysToRunout: getIntegerExtension(macObservation.extension, EXTENSION_URLS.DAYS_UNTIL_RUNOUT),
};

// Get medication-level breakdown
const medications = await getAllCurrentMedicationPDCObservations(medplum, patientId, 'MAC');
```

### 5.3 Batch Loading Pattern

**Use Case**: Loading multiple patients (initial page load)

**Pattern**:
```typescript
// OPTION 1: Use Medplum batch API (if available)
const patientIds = ['patient-1', 'patient-2', 'patient-3'];
const batch = await medplum.executeBatch({
  resourceType: 'Bundle',
  type: 'batch',
  entry: patientIds.map((id) => ({
    request: {
      method: 'GET',
      url: `Patient/${id}`,
    },
  })),
});

// OPTION 2: Use Promise.all for parallel fetching
const patients = await Promise.all(
  patientIds.map((id) => medplum.readResource('Patient', id))
);
```

### 5.4 Caching Strategies

**Client-Side Caching** (recommended):
```typescript
import { useQuery } from '@tanstack/react-query';

function usePatientList() {
  return useQuery({
    queryKey: ['patients', 'list'],
    queryFn: async () => {
      const patients = await medplum.searchResources('Patient', { active: 'true' });
      return patients.map(transformPatientToListItem);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
```

**Server-Side Caching** (via Medplum):
- Medplum caches search results automatically
- Custom SearchParameters may take 10-60 minutes to reindex

### 5.5 Fallback Pattern for Custom SearchParameters

**Always use fallback** when using custom SearchParameters (Phase 2A):

```typescript
async function searchByFragilityTier(
  medplum: MedplumClient,
  tiers: string[]
): Promise<Patient[]> {
  try {
    // Try custom SearchParameter
    return await medplum.searchResources('Patient', {
      'patient-fragility-tier': tiers.join(','),
    });
  } catch {
    // Fallback: client-side filter
    const allPatients = await medplum.searchResources('Patient', { active: 'true' });
    return allPatients.filter((p) => {
      const summary = extractPatientPDCSummary(p);
      return summary && tiers.includes(summary.worstTier);
    });
  }
}
```

### 5.6 When to Trigger On-Demand Recalculation

**Rarely needed** - Nightly bot handles most cases. Use for:
- Patient data just imported
- User explicitly requests refresh
- Debugging/testing

**Code**:
```typescript
import { calculateAndStorePatientPDC } from '@/lib/pdc/orchestrator';

// Recalculate PDC for a single patient
const result = await calculateAndStorePatientPDC(medplum, patientId, {
  measurementYear: 2026,
  currentDate: new Date(),
});

// Result includes updated extensions
console.log('Fragility Tier:', result.extensions?.worstTier);
console.log('Priority Score:', result.extensions?.highestPriorityScore);
```

---

## Appendix: Quick Reference

### Key Services

| Service | Location | Purpose |
|---------|----------|---------|
| `extractPatientPDCSummary()` | `src/lib/fhir/patient-extensions.ts` | Read Patient extensions (Phase 2A) |
| `getCurrentPDCObservation()` | `src/lib/fhir/observation-service.ts` | Get measure-level PDC (Phase 1) |
| `getAllCurrentMedicationPDCObservations()` | `src/lib/fhir/medication-observation-service.ts` | Get medication-level PDC (Phase 1.5) |
| `getPatientDispenses()` | `src/lib/fhir/dispense-service.ts` | Get claims/dispense history (Phase 1) |
| `calculateAndStorePatientPDC()` | `src/lib/pdc/orchestrator.ts` | On-demand recalculation (Phase 2A) |

### Extension URLs

| Extension | URL | Type | Phase |
|-----------|-----|------|-------|
| Current Fragility Tier | `https://ignitehealth.io/fhir/StructureDefinition/current-fragility-tier` | `valueCode` | Phase 2A |
| Current Priority Score | `https://ignitehealth.io/fhir/StructureDefinition/current-priority-score` | `valueInteger` | Phase 2A |
| Days Until Earliest Runout | `https://ignitehealth.io/fhir/StructureDefinition/days-until-earliest-runout` | `valueInteger` | Phase 2A |
| Current PDC Summary | `https://ignitehealth.io/fhir/StructureDefinition/current-pdc-summary` | Complex (nested extensions) | Phase 2A |

### SearchParameters (Custom)

| SearchParameter | Resource | Expression | Status |
|----------------|----------|------------|--------|
| `patient-fragility-tier` | Patient | `Patient.extension[current-fragility-tier].valueCode` | Deployed ✅ |
| `patient-priority-score` | Patient | `Patient.extension[current-priority-score].valueInteger` | Deployed ✅ |
| `fragility-tier` | Observation | `Observation.extension[fragility-tier].valueCode` | Deployed ✅ |
| `priority-score` | Observation | `Observation.extension[priority-score].valueInteger` | Deployed ✅ |
| `is-current-pdc` | Observation | `Observation.extension[is-current-pdc].valueBoolean` | Deployed ✅ |
| `ma-measure` | Observation | `Observation.extension[ma-measure].valueCode` | Deployed ✅ |
| `days-until-runout` | Observation | `Observation.extension[days-until-runout].valueInteger` | Deployed ✅ |

---

**End of Document**
