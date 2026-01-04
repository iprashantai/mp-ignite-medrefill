# FHIR Services Specification

## Overview

This document specifies the FHIR data services that interface with Medplum to query and store medication adherence data.

---

## Module: `src/lib/fhir/`

### Files to Create

| File                     | Purpose                          | Priority |
| ------------------------ | -------------------------------- | -------- |
| `types.ts`               | FHIR extension URLs, Zod schemas | P0       |
| `helpers.ts`             | FHIR resource utility functions  | P0       |
| `dispense-service.ts`    | MedicationDispense queries       | P0       |
| `observation-service.ts` | PDC Observation storage          | P0       |
| `task-service.ts`        | Task CRUD for queue              | P1       |
| `index.ts`               | Barrel export                    | P0       |

---

## 1. Types (`types.ts`)

### Extension URLs

```typescript
/**
 * Custom FHIR extension URLs for Ignite Health
 * Used to store PDC metrics, fragility tiers, and AI recommendations
 */
export const EXTENSION_URLS = {
  // PDC Metrics
  PDC_SCORE: 'https://ignitehealth.com/fhir/extensions/pdc-score',
  FRAGILITY_TIER: 'https://ignitehealth.com/fhir/extensions/fragility-tier',
  PRIORITY_SCORE: 'https://ignitehealth.com/fhir/extensions/priority-score',
  DELAY_BUDGET: 'https://ignitehealth.com/fhir/extensions/delay-budget',
  GAP_DAYS_REMAINING: 'https://ignitehealth.com/fhir/extensions/gap-days-remaining',
  URGENCY_LEVEL: 'https://ignitehealth.com/fhir/extensions/urgency-level',
  MEASURE_TYPE: 'https://ignitehealth.com/fhir/extensions/measure-type',
  DAYS_TO_RUNOUT: 'https://ignitehealth.com/fhir/extensions/days-to-runout',

  // AI Extensions
  AI_RECOMMENDATION: 'https://ignitehealth.com/fhir/extensions/ai-recommendation',
  AI_CONFIDENCE: 'https://ignitehealth.com/fhir/extensions/ai-confidence',
  AI_RATIONALE: 'https://ignitehealth.com/fhir/extensions/ai-rationale',
} as const;
```

### Observation Codes

```typescript
/**
 * LOINC-style codes for PDC observations
 */
export const OBSERVATION_CODES = {
  PDC_MAC: {
    system: 'https://ignitehealth.com/metrics',
    code: 'pdc-mac',
    display: 'PDC Score - Cholesterol (MAC)',
  },
  PDC_MAD: {
    system: 'https://ignitehealth.com/metrics',
    code: 'pdc-mad',
    display: 'PDC Score - Diabetes (MAD)',
  },
  PDC_MAH: {
    system: 'https://ignitehealth.com/metrics',
    code: 'pdc-mah',
    display: 'PDC Score - Hypertension (MAH)',
  },
} as const;
```

### Component Codes

```typescript
/**
 * Codes for Observation.component[] elements
 */
export const COMPONENT_CODES = {
  FRAGILITY_TIER: 'fragility-tier',
  PRIORITY_SCORE: 'priority-score',
  GAP_DAYS_REMAINING: 'gap-days-remaining',
  DELAY_BUDGET: 'delay-budget',
  URGENCY_LEVEL: 'urgency-level',
  PDC_STATUS_QUO: 'pdc-status-quo',
  PDC_PERFECT: 'pdc-perfect',
  DAYS_TO_RUNOUT: 'days-to-runout',
  COVERED_DAYS: 'covered-days',
  TREATMENT_DAYS: 'treatment-days',
} as const;
```

---

## 2. Helpers (`helpers.ts`)

### Function Specifications

#### `formatPatientName`

```typescript
/**
 * Format patient name in "Last, First" format
 *
 * @param patient - FHIR Patient resource
 * @returns Formatted name string or "Unknown" if no name
 *
 * @example
 * formatPatientName(patient) // "Gonzalez, Maria"
 */
export function formatPatientName(patient: Patient): string;
```

**Test Cases:**
| ID | Input | Expected |
|----|-------|----------|
| H-001 | Patient with name [{given: ['Maria'], family: 'Gonzalez'}] | "Gonzalez, Maria" |
| H-002 | Patient with no name | "Unknown" |
| H-003 | Patient with multiple given names | "Gonzalez, Maria Elena" |
| H-004 | Patient with null name | "Unknown" |

#### `getPatientAge`

```typescript
/**
 * Calculate patient age from birthDate
 *
 * @param patient - FHIR Patient resource
 * @param asOf - Date to calculate age as of (default: today)
 * @returns Age in years or null if no birthDate
 *
 * @example
 * getPatientAge(patient) // 72
 */
export function getPatientAge(patient: Patient, asOf?: Date): number | null;
```

**Test Cases:**
| ID | Input | Expected |
|----|-------|----------|
| H-005 | birthDate: '1952-01-15', asOf: '2025-10-15' | 73 |
| H-006 | birthDate: null | null |
| H-007 | Birthday today | Age increments |

#### `extractDaysSupply`

```typescript
/**
 * Extract days supply from MedicationDispense
 *
 * @param dispense - FHIR MedicationDispense resource
 * @returns Days supply value or 30 (default)
 *
 * @example
 * extractDaysSupply(dispense) // 30
 */
export function extractDaysSupply(dispense: MedicationDispense): number;
```

**Test Cases:**
| ID | Input | Expected |
|----|-------|----------|
| H-008 | daysSupply: { value: 30 } | 30 |
| H-009 | daysSupply: { value: 90 } | 90 |
| H-010 | daysSupply: null | 30 (default) |
| H-011 | daysSupply: { value: 0 } | 30 (default) |

#### `extractFillDate`

```typescript
/**
 * Extract fill date from MedicationDispense
 *
 * @param dispense - FHIR MedicationDispense resource
 * @returns Fill date or null if not available
 *
 * @example
 * extractFillDate(dispense) // Date object
 */
export function extractFillDate(dispense: MedicationDispense): Date | null;
```

**Test Cases:**
| ID | Input | Expected |
|----|-------|----------|
| H-012 | whenHandedOver: '2025-01-15' | Date('2025-01-15') |
| H-013 | whenHandedOver: null | null |
| H-014 | Invalid date string | null |

#### `extractMedicationCode`

```typescript
/**
 * Extract RxNorm code from MedicationDispense
 *
 * @param dispense - FHIR MedicationDispense resource
 * @returns RxNorm code or null
 *
 * @example
 * extractMedicationCode(dispense) // "310965" (Lisinopril)
 */
export function extractMedicationCode(dispense: MedicationDispense): string | null;
```

**Test Cases:**
| ID | Input | Expected |
|----|-------|----------|
| H-015 | Valid RxNorm coding | RxNorm code string |
| H-016 | No coding | null |
| H-017 | Non-RxNorm coding | null |

#### `createExtension`

```typescript
/**
 * Create FHIR Extension with typed value
 *
 * @param url - Extension URL
 * @param value - Extension value
 * @returns FHIR Extension object
 *
 * @example
 * createExtension(EXTENSION_URLS.PDC_SCORE, 0.85)
 * // { url: '...pdc-score', valueDecimal: 0.85 }
 */
export function createExtension(url: string, value: string | number | boolean): Extension;
```

#### `getExtensionValue`

```typescript
/**
 * Get extension value from FHIR resource
 *
 * @param resource - FHIR Resource with extensions
 * @param url - Extension URL to find
 * @returns Extension value or undefined
 *
 * @example
 * getExtensionValue(task, EXTENSION_URLS.PDC_SCORE) // 0.85
 */
export function getExtensionValue<T>(resource: Resource, url: string): T | undefined;
```

---

## 3. Dispense Service (`dispense-service.ts`)

### Function Specifications

#### `getPatientDispenses`

```typescript
/**
 * Fetch all MedicationDispense records for a patient in a measurement year
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measurementYear - Year to fetch dispenses for
 * @returns Array of MedicationDispense resources sorted by date
 *
 * @example
 * const dispenses = await getPatientDispenses(medplum, 'patient-123', 2025);
 */
export async function getPatientDispenses(
  medplum: MedplumClient,
  patientId: string,
  measurementYear: number
): Promise<MedicationDispense[]>;
```

**Implementation Notes:**

- Filter to `status: 'completed'` only
- Date range: `{year}-01-01` to `{year}-12-31`
- Sort by `whenHandedOver` ascending
- Use `_count: 1000` for pagination

**Test Cases:**
| ID | Scenario | Expected |
|----|----------|----------|
| DS-001 | Patient with 5 dispenses | Returns 5 sorted dispenses |
| DS-002 | Patient with no dispenses | Returns empty array |
| DS-003 | Patient with dispenses outside year | Returns only in-year dispenses |
| DS-004 | Mixed statuses | Returns only 'completed' |
| DS-005 | API error | Throws with error message |

#### `getDispensesByMeasure`

```typescript
/**
 * Fetch MedicationDispense records filtered by MA measure type
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - MA measure type (MAC/MAD/MAH)
 * @param measurementYear - Year to fetch dispenses for
 * @returns Filtered array of MedicationDispense resources
 *
 * @example
 * const statinDispenses = await getDispensesByMeasure(medplum, 'patient-123', 'MAC', 2025);
 */
export async function getDispensesByMeasure(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH',
  measurementYear: number
): Promise<MedicationDispense[]>;
```

**Implementation Notes:**

- First fetch all dispenses with `getPatientDispenses`
- Filter by medication classification using RxNorm codes
- Uses `classifyMedicationByRxNorm` from `measures.ts`

**Test Cases:**
| ID | Scenario | Expected |
|----|----------|----------|
| DM-001 | MAC filter on statins | Returns only statin dispenses |
| DM-002 | MAD filter on diabetes meds | Returns only diabetes dispenses |
| DM-003 | MAH filter on BP meds | Returns only BP dispenses |
| DM-004 | No MA medications | Returns empty array |
| DM-005 | Mixed medications | Returns only matching measure |

#### `getDispensesByMedication`

```typescript
/**
 * Fetch MedicationDispense records for a specific medication
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param rxnormCode - RxNorm medication code
 * @param measurementYear - Year to fetch dispenses for
 * @returns Array of dispenses for specific medication
 */
export async function getDispensesByMedication(
  medplum: MedplumClient,
  patientId: string,
  rxnormCode: string,
  measurementYear: number
): Promise<MedicationDispense[]>;
```

---

## 4. Observation Service (`observation-service.ts`)

### Function Specifications

#### `storePDCObservation`

```typescript
/**
 * Create or update PDC Observation for a patient
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - MA measure type
 * @param pdcResult - PDC calculation result
 * @param fragilityResult - Fragility tier result
 * @returns Created Observation resource
 *
 * @example
 * const obs = await storePDCObservation(medplum, 'patient-123', 'MAC', pdcResult, fragilityResult);
 */
export async function storePDCObservation(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH',
  pdcResult: PDCResult,
  fragilityResult: FragilityResult
): Promise<Observation>;
```

**Observation Structure:**

```typescript
{
  resourceType: 'Observation',
  status: 'final',
  category: [{
    coding: [{
      system: 'https://ignitehealth.com/observation-category',
      code: 'adherence-metric'
    }]
  }],
  code: OBSERVATION_CODES[`PDC_${measure}`],
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: new Date().toISOString(),
  valueQuantity: {
    value: pdcResult.pdc / 100,
    unit: '%',
    system: 'http://unitsofmeasure.org',
    code: '%'
  },
  interpretation: [{
    coding: [{
      system: 'https://ignitehealth.com/adherence-status',
      code: pdcResult.pdc >= 80 ? 'adherent' :
            pdcResult.pdc >= 60 ? 'at-risk' : 'non-adherent'
    }]
  }],
  component: [
    // fragility-tier
    // priority-score
    // gap-days-remaining
    // delay-budget
    // urgency-level
    // pdc-status-quo
    // pdc-perfect
    // days-to-runout
    // covered-days
    // treatment-days
  ]
}
```

**Test Cases:**
| ID | Scenario | Expected |
|----|----------|----------|
| OS-001 | Create new observation | Observation created with all components |
| OS-002 | PDC >= 80% | interpretation = 'adherent' |
| OS-003 | PDC 60-79% | interpretation = 'at-risk' |
| OS-004 | PDC < 60% | interpretation = 'non-adherent' |
| OS-005 | All components populated | 10 components present |

#### `getLatestPDCObservation`

```typescript
/**
 * Fetch most recent PDC Observation for a patient and measure
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - MA measure type
 * @returns Latest Observation or null if none exists
 *
 * @example
 * const latest = await getLatestPDCObservation(medplum, 'patient-123', 'MAC');
 */
export async function getLatestPDCObservation(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH'
): Promise<Observation | null>;
```

**Test Cases:**
| ID | Scenario | Expected |
|----|----------|----------|
| OG-001 | Multiple observations | Returns most recent |
| OG-002 | No observations | Returns null |
| OG-003 | Filter by measure | Returns correct measure only |

#### `parsePDCObservation`

```typescript
/**
 * Parse PDC Observation back into PDCResult and FragilityResult
 *
 * @param observation - FHIR Observation resource
 * @returns Parsed PDC and Fragility results
 *
 * @example
 * const { pdcResult, fragilityResult } = parsePDCObservation(observation);
 */
export function parsePDCObservation(observation: Observation): {
  pdcResult: PDCResult;
  fragilityResult: FragilityResult;
};
```

---

## 5. Task Service (`task-service.ts`)

### Function Specifications

#### `createRefillTask`

```typescript
/**
 * Create a refill review Task for a patient
 *
 * @param medplum - Medplum client instance
 * @param input - Task creation input
 * @returns Created Task resource
 */
export async function createRefillTask(
  medplum: MedplumClient,
  input: CreateRefillTaskInput
): Promise<Task>;

interface CreateRefillTaskInput {
  patient: Patient;
  medicationRequest: MedicationRequest;
  measure: 'MAC' | 'MAD' | 'MAH';
  pdcScore: number;
  fragilityResult: FragilityResult;
  daysToRunout: number;
  aiRecommendation?: {
    decision: 'Approve' | 'Deny';
    confidence: number;
    rationale: string;
  };
}
```

#### `getRefillQueue`

```typescript
/**
 * Fetch refill review tasks by status
 *
 * @param medplum - Medplum client instance
 * @param status - Task status to filter
 * @returns Array of Task resources with patient includes
 */
export async function getRefillQueue(
  medplum: MedplumClient,
  status: 'requested' | 'in-progress' | 'completed' | 'on-hold'
): Promise<Task[]>;
```

#### `updateTaskStatus`

```typescript
/**
 * Update a Task's status
 *
 * @param medplum - Medplum client instance
 * @param taskId - Task resource ID
 * @param status - New status
 * @param outcome - Outcome reason (for completed/cancelled)
 * @returns Updated Task resource
 */
export async function updateTaskStatus(
  medplum: MedplumClient,
  taskId: string,
  status: Task['status'],
  outcome?: string
): Promise<Task>;
```

---

## Error Handling

### Standard Error Pattern

```typescript
import { Result } from '@/types/result';

// All service functions should return Result type for operations that can fail
export async function safeMedplumCall<T>(operation: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error('Medplum operation failed', { error });
    return { success: false, error: error as Error };
  }
}
```

### Error Types

```typescript
export class FHIRServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'FHIRServiceError';
  }
}

export const FHIR_ERROR_CODES = {
  PATIENT_NOT_FOUND: 'PATIENT_NOT_FOUND',
  DISPENSE_QUERY_FAILED: 'DISPENSE_QUERY_FAILED',
  OBSERVATION_CREATE_FAILED: 'OBSERVATION_CREATE_FAILED',
  TASK_CREATE_FAILED: 'TASK_CREATE_FAILED',
  INVALID_RESOURCE: 'INVALID_RESOURCE',
} as const;
```

---

## Testing Approach

### Mock Medplum Client

```typescript
// __tests__/mocks/medplum-mock.ts
import { vi } from 'vitest';

export function createMockMedplum() {
  return {
    searchResources: vi.fn(),
    createResource: vi.fn(),
    updateResource: vi.fn(),
    readResource: vi.fn(),
  };
}
```

### Test Setup

```typescript
// __tests__/dispense-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockMedplum } from './mocks/medplum-mock';
import { getPatientDispenses } from '../dispense-service';

describe('DispenseService', () => {
  let mockMedplum: ReturnType<typeof createMockMedplum>;

  beforeEach(() => {
    mockMedplum = createMockMedplum();
  });

  describe('getPatientDispenses', () => {
    it('should fetch and sort dispenses', async () => {
      // ARRANGE
      const mockDispenses = [
        /* mock data */
      ];
      mockMedplum.searchResources.mockResolvedValue(mockDispenses);

      // ACT
      const result = await getPatientDispenses(mockMedplum as any, 'patient-123', 2025);

      // ASSERT
      expect(result).toEqual(
        expect.arrayContaining([
          /* expected */
        ])
      );
      expect(mockMedplum.searchResources).toHaveBeenCalledWith(
        'MedicationDispense',
        expect.objectContaining({
          subject: 'Patient/patient-123',
          status: 'completed',
        })
      );
    });
  });
});
```

---

## Dependencies

```typescript
// Required imports
import { MedplumClient } from '@medplum/core';
import {
  Patient,
  MedicationDispense,
  MedicationRequest,
  Observation,
  Task,
  Extension,
  Resource,
} from '@medplum/fhirtypes';
import { z } from 'zod';
```
