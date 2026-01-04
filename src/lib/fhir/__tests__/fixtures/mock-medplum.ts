/**
 * Mock Medplum Client for Testing
 *
 * Provides a configurable mock of MedplumClient for unit testing FHIR services.
 *
 * @see docs/implementation/phase-1-core-engine/specs/01_FHIR_SERVICES_SPEC.md
 */

import { vi, type Mock } from 'vitest';
import type {
  MedicationDispense,
  Observation,
  Patient,
  Task,
  Bundle,
  Resource,
} from '@medplum/fhirtypes';

// =============================================================================
// Mock Client Type
// =============================================================================

/**
 * Mock Medplum client interface for testing.
 * Mirrors the essential MedplumClient methods we use.
 */
export interface MockMedplumClient {
  searchResources: Mock<
    [resourceType: string, query?: Record<string, unknown>],
    Promise<Resource[]>
  >;
  searchOne: Mock<
    [resourceType: string, query?: Record<string, unknown>],
    Promise<Resource | undefined>
  >;
  createResource: Mock<[resource: Resource], Promise<Resource>>;
  updateResource: Mock<[resource: Resource], Promise<Resource>>;
  readResource: Mock<[resourceType: string, id: string], Promise<Resource>>;
  search: Mock<[resourceType: string, query?: Record<string, unknown>], Promise<Bundle>>;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a mock Medplum client with all methods stubbed.
 *
 * @returns Mock client with vitest mock functions
 *
 * @example
 * ```ts
 * const mockMedplum = createMockMedplum();
 * mockMedplum.searchResources.mockResolvedValue([dispense1, dispense2]);
 *
 * const result = await getPatientDispenses(mockMedplum as any, 'patient-123', 2025);
 * expect(result).toHaveLength(2);
 * ```
 */
export function createMockMedplum(): MockMedplumClient {
  return {
    searchResources: vi.fn().mockResolvedValue([]),
    searchOne: vi.fn().mockResolvedValue(undefined),
    createResource: vi
      .fn()
      .mockImplementation((resource) => Promise.resolve({ ...resource, id: `mock-${Date.now()}` })),
    updateResource: vi.fn().mockImplementation((resource) => Promise.resolve(resource)),
    readResource: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue({ resourceType: 'Bundle', type: 'searchset', entry: [] }),
  };
}

/**
 * Reset all mocks on a mock Medplum client.
 */
export function resetMockMedplum(mock: MockMedplumClient): void {
  mock.searchResources.mockReset();
  mock.searchOne.mockReset();
  mock.createResource.mockReset();
  mock.updateResource.mockReset();
  mock.readResource.mockReset();
  mock.search.mockReset();
}

// =============================================================================
// Mock Data Factories
// =============================================================================

/**
 * Create a mock MedicationDispense resource.
 *
 * @param overrides - Partial dispense to override defaults
 * @returns Complete mock dispense
 */
export function createMockDispense(
  overrides: Partial<MedicationDispense> & {
    patientId?: string;
    fillDate?: string;
    daysSupply?: number;
    rxnormCode?: string;
    medicationName?: string;
  } = {}
): MedicationDispense {
  const {
    patientId = 'patient-123',
    fillDate = '2025-01-15',
    daysSupply = 30,
    rxnormCode = '310965', // Lisinopril
    medicationName = 'Lisinopril 10mg',
    ...rest
  } = overrides;

  return {
    resourceType: 'MedicationDispense',
    id: `dispense-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'completed',
    subject: {
      reference: `Patient/${patientId}`,
    },
    medicationCodeableConcept: {
      coding: [
        {
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: rxnormCode,
          display: medicationName,
        },
      ],
      text: medicationName,
    },
    whenHandedOver: fillDate,
    daysSupply: {
      value: daysSupply,
      unit: 'days',
      system: 'http://unitsofmeasure.org',
      code: 'd',
    },
    quantity: {
      value: daysSupply, // Simplified: 1 per day
      unit: 'tablets',
    },
    ...rest,
  };
}

/**
 * Create multiple mock dispenses for a patient over time.
 *
 * @param config - Configuration for generating dispenses
 * @returns Array of mock dispenses
 */
export function createMockDispenseHistory(config: {
  patientId: string;
  startDate: string;
  fillCount: number;
  daysSupply?: number;
  gapDays?: number;
  rxnormCode?: string;
  medicationName?: string;
}): MedicationDispense[] {
  const {
    patientId,
    startDate,
    fillCount,
    daysSupply = 30,
    gapDays = 0,
    rxnormCode = '310965',
    medicationName = 'Lisinopril 10mg',
  } = config;

  const dispenses: MedicationDispense[] = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < fillCount; i++) {
    dispenses.push(
      createMockDispense({
        patientId,
        fillDate: currentDate.toISOString().split('T')[0],
        daysSupply,
        rxnormCode,
        medicationName,
      })
    );

    // Move to next fill date (days supply + any gap)
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + daysSupply + gapDays);
  }

  return dispenses;
}

/**
 * Create a mock Patient resource.
 */
export function createMockPatient(
  overrides: Partial<Patient> & {
    firstName?: string;
    lastName?: string;
    birthDate?: string;
  } = {}
): Patient {
  const { firstName = 'John', lastName = 'Doe', birthDate = '1955-03-15', ...rest } = overrides;

  return {
    resourceType: 'Patient',
    id: `patient-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: [
      {
        family: lastName,
        given: [firstName],
      },
    ],
    birthDate,
    gender: 'male',
    ...rest,
  };
}

/**
 * Create a mock Observation for PDC results.
 */
export function createMockPDCObservation(
  overrides: Partial<Observation> & {
    patientId?: string;
    pdcValue?: number;
    measure?: 'MAC' | 'MAD' | 'MAH';
    effectiveDate?: string;
  } = {}
): Observation {
  const {
    patientId = 'patient-123',
    pdcValue = 0.85,
    measure = 'MAC',
    effectiveDate = new Date().toISOString(),
    ...rest
  } = overrides;

  const measureCodes = {
    MAC: { code: 'pdc-mac', display: 'PDC Score - Cholesterol (MAC)' },
    MAD: { code: 'pdc-mad', display: 'PDC Score - Diabetes (MAD)' },
    MAH: { code: 'pdc-mah', display: 'PDC Score - Hypertension (MAH)' },
  };

  return {
    resourceType: 'Observation',
    id: `observation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'survey',
            display: 'Survey',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'https://ignitehealth.io/fhir/CodeSystem/adherence-metrics',
          code: measureCodes[measure].code,
          display: measureCodes[measure].display,
        },
      ],
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    effectiveDateTime: effectiveDate,
    valueQuantity: {
      value: pdcValue,
      unit: 'ratio',
      system: 'http://unitsofmeasure.org',
      code: '1',
    },
    ...rest,
  };
}

/**
 * Create a mock Task for refill queue.
 */
export function createMockTask(
  overrides: Partial<Task> & {
    patientId?: string;
    status?: Task['status'];
    priority?: Task['priority'];
  } = {}
): Task {
  const {
    patientId = 'patient-123',
    status = 'requested',
    priority = 'routine',
    ...rest
  } = overrides;

  return {
    resourceType: 'Task',
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status,
    intent: 'order',
    priority,
    code: {
      coding: [
        {
          system: 'https://ignitehealth.io/fhir/CodeSystem/task-types',
          code: 'refill-review',
          display: 'Medication Refill Review',
        },
      ],
    },
    for: {
      reference: `Patient/${patientId}`,
    },
    authoredOn: new Date().toISOString(),
    ...rest,
  };
}

// =============================================================================
// RxNorm Code Constants (for testing)
// =============================================================================

/**
 * Common RxNorm codes by MA measure category.
 * Used for testing medication classification.
 */
export const MOCK_RXNORM_CODES = {
  // MAC - Statins (Cholesterol)
  MAC: {
    ATORVASTATIN: '83367',
    SIMVASTATIN: '36567',
    ROSUVASTATIN: '301542',
    PRAVASTATIN: '42463',
    LOVASTATIN: '6472',
  },

  // MAD - Diabetes
  MAD: {
    METFORMIN: '6809',
    GLIPIZIDE: '4821',
    GLYBURIDE: '4815',
    SITAGLIPTIN: '593411',
    PIOGLITAZONE: '33738',
  },

  // MAH - Hypertension (RAS Antagonists)
  MAH: {
    LISINOPRIL: '310965',
    LOSARTAN: '52175',
    ENALAPRIL: '3827',
    VALSARTAN: '69749',
    RAMIPRIL: '35296',
  },
} as const;

/**
 * Get RxNorm codes for a specific measure.
 */
export function getRxNormCodesForMeasure(measure: 'MAC' | 'MAD' | 'MAH'): string[] {
  return Object.values(MOCK_RXNORM_CODES[measure]);
}
