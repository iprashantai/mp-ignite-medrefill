/**
 * Medication PDC Observation Service Tests
 *
 * TDD: Write tests FIRST, then implement to pass.
 *
 * Tests for storing and retrieving medication-level PDC observations.
 *
 * @see docs/implementation/phase-1-core-engine/specs/01_FHIR_SERVICES_SPEC.md
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockMedplum,
  createMockPDCObservation,
  type MockMedplumClient,
} from './fixtures/mock-medplum';
import {
  storeMedicationPDCObservation,
  getCurrentMedicationPDCObservation,
  getAllCurrentMedicationPDCObservations,
  parseMedicationPDCObservation,
  markPreviousMedicationObservationsNotCurrent,
  type MedicationPDCObservationInput,
} from '../medication-observation-service';
import {
  OBSERVATION_EXTENSION_URLS,
  MEDICATION_OBSERVATION_EXTENSION_URLS,
} from '../types';
import { getCodeExtension, getIntegerExtension, getBooleanExtension, getStringExtension } from '../helpers';

// =============================================================================
// Test Data
// =============================================================================

const mockMedicationPDCInput: MedicationPDCObservationInput = {
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
};

// =============================================================================
// Test Setup
// =============================================================================

describe('MedicationObservationService', () => {
  let mockMedplum: MockMedplumClient;

  beforeEach(() => {
    mockMedplum = createMockMedplum();
  });

  // ===========================================================================
  // storeMedicationPDCObservation Tests
  // ===========================================================================

  describe('storeMedicationPDCObservation', () => {
    it('MOS-001: should create observation with medication-level code', async () => {
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-med-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      const result = await storeMedicationPDCObservation(
        mockMedplum as unknown as any,
        mockMedicationPDCInput
      );

      expect(result.code?.coding?.[0]?.code).toBe('pdc-medication');
    });

    it('MOS-002: should include medication-specific extensions', async () => {
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-med-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      const result = await storeMedicationPDCObservation(
        mockMedplum as unknown as any,
        mockMedicationPDCInput
      );

      // Check medication-specific extensions
      expect(
        getCodeExtension(result.extension, MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM)
      ).toBe('314076');
      expect(
        getStringExtension(result.extension, MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_DISPLAY)
      ).toBe('Lisinopril 10mg');
      expect(
        getIntegerExtension(result.extension, MEDICATION_OBSERVATION_EXTENSION_URLS.REMAINING_REFILLS)
      ).toBe(2);
      expect(
        getIntegerExtension(result.extension, MEDICATION_OBSERVATION_EXTENSION_URLS.SUPPLY_ON_HAND)
      ).toBe(12);
      expect(
        getIntegerExtension(result.extension, MEDICATION_OBSERVATION_EXTENSION_URLS.COVERAGE_SHORTFALL)
      ).toBe(60);
      expect(
        getIntegerExtension(
          result.extension,
          MEDICATION_OBSERVATION_EXTENSION_URLS.ESTIMATED_DAYS_PER_REFILL
        )
      ).toBe(30);
    });

    it('MOS-003: should include shared observation extensions', async () => {
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-med-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      const result = await storeMedicationPDCObservation(
        mockMedplum as unknown as any,
        mockMedicationPDCInput
      );

      // Check shared extensions (from OBSERVATION_EXTENSION_URLS)
      expect(
        getCodeExtension(result.extension, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER)
      ).toBe('F2_FRAGILE');
      expect(
        getIntegerExtension(result.extension, OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE)
      ).toBe(80);
      expect(
        getBooleanExtension(result.extension, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC)
      ).toBe(true);
      expect(
        getCodeExtension(result.extension, OBSERVATION_EXTENSION_URLS.MA_MEASURE)
      ).toBe('MAH');
      expect(
        getIntegerExtension(result.extension, OBSERVATION_EXTENSION_URLS.DAYS_UNTIL_RUNOUT)
      ).toBe(5);
      expect(
        getIntegerExtension(result.extension, OBSERVATION_EXTENSION_URLS.GAP_DAYS_REMAINING)
      ).toBe(8);
      expect(
        getIntegerExtension(result.extension, OBSERVATION_EXTENSION_URLS.DELAY_BUDGET)
      ).toBe(4);
      expect(
        getBooleanExtension(result.extension, OBSERVATION_EXTENSION_URLS.Q4_ADJUSTED)
      ).toBe(false);
    });

    it('MOS-004: should set is-current-pdc to true for new observation', async () => {
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-med-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      const result = await storeMedicationPDCObservation(
        mockMedplum as unknown as any,
        mockMedicationPDCInput
      );

      expect(
        getBooleanExtension(result.extension, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC)
      ).toBe(true);
    });

    it('MOS-005: should mark previous observations as not current (per RxNorm)', async () => {
      const previousObs = createMockPDCObservation({ patientId: 'patient-123' });
      previousObs.extension = [
        { url: MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM, valueCode: '314076' },
        { url: OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC, valueBoolean: true },
      ];

      mockMedplum.searchResources.mockResolvedValue([previousObs]);
      mockMedplum.createResource.mockImplementation((r) =>
        Promise.resolve({ ...r, id: 'new-obs' })
      );
      mockMedplum.updateResource.mockImplementation((r) => Promise.resolve(r));

      await storeMedicationPDCObservation(mockMedplum as unknown as any, mockMedicationPDCInput);

      expect(mockMedplum.updateResource).toHaveBeenCalled();
    });

    it('MOS-006: should include PDC value in valueQuantity', async () => {
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-med-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      const result = await storeMedicationPDCObservation(
        mockMedplum as unknown as any,
        mockMedicationPDCInput
      );

      expect(result.valueQuantity?.value).toBe(0.78);
      expect(result.valueQuantity?.unit).toBe('ratio');
    });

    it('MOS-007: should set correct subject reference', async () => {
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-med-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      const result = await storeMedicationPDCObservation(
        mockMedplum as unknown as any,
        mockMedicationPDCInput
      );

      expect(result.subject?.reference).toBe('Patient/patient-123');
    });

    it('MOS-008: should set interpretation based on PDC value', async () => {
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-med-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      // Test at-risk (60-79%)
      const atRiskResult = await storeMedicationPDCObservation(
        mockMedplum as unknown as any,
        { ...mockMedicationPDCInput, pdc: 0.72 }
      );
      expect(atRiskResult.interpretation?.[0]?.coding?.[0]?.code).toBe('at-risk');

      // Test adherent (>= 80%)
      const adherentResult = await storeMedicationPDCObservation(
        mockMedplum as unknown as any,
        { ...mockMedicationPDCInput, pdc: 0.85, fragilityTier: 'COMPLIANT', priorityScore: 0 }
      );
      expect(adherentResult.interpretation?.[0]?.coding?.[0]?.code).toBe('adherent');

      // Test non-adherent (< 60%)
      const nonAdherentResult = await storeMedicationPDCObservation(
        mockMedplum as unknown as any,
        { ...mockMedicationPDCInput, pdc: 0.45, fragilityTier: 'T5_UNSALVAGEABLE', priorityScore: 0 }
      );
      expect(nonAdherentResult.interpretation?.[0]?.coding?.[0]?.code).toBe('non-adherent');
    });
  });

  // ===========================================================================
  // getCurrentMedicationPDCObservation Tests
  // ===========================================================================

  describe('getCurrentMedicationPDCObservation', () => {
    it('MOG-001: should query by RxNorm code and patient', async () => {
      mockMedplum.searchResources.mockResolvedValue([]);

      await getCurrentMedicationPDCObservation(
        mockMedplum as unknown as any,
        'patient-123',
        '314076'
      );

      expect(mockMedplum.searchResources).toHaveBeenCalledWith(
        'Observation',
        expect.objectContaining({
          subject: 'Patient/patient-123',
        })
      );
    });

    it('MOG-002: should return null when no observation exists', async () => {
      mockMedplum.searchResources.mockResolvedValue([]);

      const result = await getCurrentMedicationPDCObservation(
        mockMedplum as unknown as any,
        'patient-123',
        '314076'
      );

      expect(result).toBeNull();
    });

    it('MOG-003: should return observation when found', async () => {
      const obs = createMockPDCObservation({ patientId: 'patient-123' });
      obs.extension = [
        { url: MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM, valueCode: '314076' },
        { url: OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC, valueBoolean: true },
      ];
      mockMedplum.searchResources.mockResolvedValue([obs]);

      const result = await getCurrentMedicationPDCObservation(
        mockMedplum as unknown as any,
        'patient-123',
        '314076'
      );

      expect(result).toBeDefined();
      expect(
        getCodeExtension(result?.extension, MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM)
      ).toBe('314076');
    });
  });

  // ===========================================================================
  // getAllCurrentMedicationPDCObservations Tests
  // ===========================================================================

  describe('getAllCurrentMedicationPDCObservations', () => {
    it('MOG-004: should return all current medication observations for patient', async () => {
      const obs1 = createMockPDCObservation({ patientId: 'patient-123' });
      const obs2 = createMockPDCObservation({ patientId: 'patient-123' });
      mockMedplum.searchResources.mockResolvedValue([obs1, obs2]);

      const result = await getAllCurrentMedicationPDCObservations(
        mockMedplum as unknown as any,
        'patient-123'
      );

      expect(result).toHaveLength(2);
    });

    it('MOG-005: should filter by measure when provided', async () => {
      mockMedplum.searchResources.mockResolvedValue([]);

      await getAllCurrentMedicationPDCObservations(
        mockMedplum as unknown as any,
        'patient-123',
        'MAH'
      );

      expect(mockMedplum.searchResources).toHaveBeenCalledWith(
        'Observation',
        expect.objectContaining({
          subject: 'Patient/patient-123',
        })
      );
    });

    it('MOG-006: should return empty array when no observations exist', async () => {
      mockMedplum.searchResources.mockResolvedValue([]);

      const result = await getAllCurrentMedicationPDCObservations(
        mockMedplum as unknown as any,
        'patient-123'
      );

      expect(result).toHaveLength(0);
    });
  });

  // ===========================================================================
  // parseMedicationPDCObservation Tests
  // ===========================================================================

  describe('parseMedicationPDCObservation', () => {
    it('MOP-001: should parse all medication-specific extensions', () => {
      const obs = createMockPDCObservation({ patientId: 'patient-123', pdcValue: 0.78 });
      obs.extension = [
        { url: MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM, valueCode: '314076' },
        { url: MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_DISPLAY, valueString: 'Lisinopril 10mg' },
        { url: MEDICATION_OBSERVATION_EXTENSION_URLS.REMAINING_REFILLS, valueInteger: 2 },
        { url: MEDICATION_OBSERVATION_EXTENSION_URLS.SUPPLY_ON_HAND, valueInteger: 12 },
        { url: MEDICATION_OBSERVATION_EXTENSION_URLS.COVERAGE_SHORTFALL, valueInteger: 60 },
        { url: MEDICATION_OBSERVATION_EXTENSION_URLS.ESTIMATED_DAYS_PER_REFILL, valueInteger: 30 },
        { url: OBSERVATION_EXTENSION_URLS.MA_MEASURE, valueCode: 'MAH' },
        { url: OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER, valueCode: 'F2_FRAGILE' },
        { url: OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE, valueInteger: 80 },
        { url: OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC, valueBoolean: true },
      ];

      const result = parseMedicationPDCObservation(obs);

      expect(result.pdc).toBe(0.78);
      expect(result.medicationRxnorm).toBe('314076');
      expect(result.medicationDisplay).toBe('Lisinopril 10mg');
      expect(result.remainingRefills).toBe(2);
      expect(result.supplyOnHand).toBe(12);
      expect(result.coverageShortfall).toBe(60);
      expect(result.estimatedDaysPerRefill).toBe(30);
      expect(result.measure).toBe('MAH');
      expect(result.fragilityTier).toBe('F2_FRAGILE');
      expect(result.priorityScore).toBe(80);
      expect(result.isCurrentPDC).toBe(true);
    });

    it('MOP-002: should return null for missing extensions', () => {
      const obs = createMockPDCObservation({ patientId: 'patient-123', pdcValue: 0.78 });
      obs.extension = []; // No extensions

      const result = parseMedicationPDCObservation(obs);

      expect(result.pdc).toBe(0.78);
      expect(result.medicationRxnorm).toBeNull();
      expect(result.remainingRefills).toBeNull();
    });

    it('MOP-003: should extract patient ID from subject reference', () => {
      const obs = createMockPDCObservation({ patientId: 'patient-456', pdcValue: 0.85 });
      obs.extension = [];

      const result = parseMedicationPDCObservation(obs);

      expect(result.patientId).toBe('patient-456');
    });

    it('MOP-004: should extract effectiveDateTime', () => {
      const obs = createMockPDCObservation({ patientId: 'patient-123', pdcValue: 0.78 });
      obs.effectiveDateTime = '2025-11-15T10:30:00Z';
      obs.extension = [];

      const result = parseMedicationPDCObservation(obs);

      expect(result.effectiveDateTime).toBe('2025-11-15T10:30:00Z');
    });
  });

  // ===========================================================================
  // markPreviousMedicationObservationsNotCurrent Tests
  // ===========================================================================

  describe('markPreviousMedicationObservationsNotCurrent', () => {
    it('MOM-001: should update all previous observations for patient-medication', async () => {
      const obs1 = createMockPDCObservation({ patientId: 'patient-123' });
      obs1.id = 'obs-1';
      obs1.extension = [
        { url: MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM, valueCode: '314076' },
        { url: OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC, valueBoolean: true },
      ];

      mockMedplum.searchResources.mockResolvedValue([obs1]);
      mockMedplum.updateResource.mockImplementation((resource) => Promise.resolve(resource));

      await markPreviousMedicationObservationsNotCurrent(
        mockMedplum as unknown as any,
        'patient-123',
        '314076'
      );

      expect(mockMedplum.updateResource).toHaveBeenCalledTimes(1);
    });

    it('MOM-002: should not update if no previous current observations', async () => {
      mockMedplum.searchResources.mockResolvedValue([]);

      await markPreviousMedicationObservationsNotCurrent(
        mockMedplum as unknown as any,
        'patient-123',
        '314076'
      );

      expect(mockMedplum.updateResource).not.toHaveBeenCalled();
    });
  });
});
