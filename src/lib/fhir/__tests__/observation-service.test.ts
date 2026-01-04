/**
 * PDC Observation Service Tests
 *
 * TDD: Write tests FIRST, then implement to pass.
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
  storePDCObservation,
  getLatestPDCObservation,
  getCurrentPDCObservation,
  getPDCObservationHistory,
  parsePDCObservation,
  markPreviousObservationsNotCurrent,
  type PDCObservationInput,
} from '../observation-service';
import { OBSERVATION_EXTENSION_URLS, type MAMeasure } from '../types';
import { getCodeExtension, getIntegerExtension, getBooleanExtension } from '../helpers';

// =============================================================================
// Test Data
// =============================================================================

const mockPDCInput: PDCObservationInput = {
  patientId: 'patient-123',
  measure: 'MAC',
  pdc: 0.72,
  pdcStatusQuo: 0.72,
  pdcPerfect: 0.88,
  coveredDays: 263,
  treatmentDays: 365,
  gapDaysRemaining: 12,
  delayBudget: 4,
  daysUntilRunout: 5,
  fragilityTier: 'F2_FRAGILE',
  priorityScore: 80,
  q4Adjusted: false,
  treatmentPeriod: {
    start: '2025-01-15',
    end: '2025-12-31',
  },
};

// =============================================================================
// Test Setup
// =============================================================================

describe('ObservationService', () => {
  let mockMedplum: MockMedplumClient;

  beforeEach(() => {
    mockMedplum = createMockMedplum();
  });

  // ===========================================================================
  // storePDCObservation Tests
  // ===========================================================================

  describe('storePDCObservation', () => {
    it('OS-001: should create observation with all components', async () => {
      // ARRANGE
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]); // No previous observations

      // ACT
      const result = await storePDCObservation(mockMedplum as unknown, mockPDCInput);

      // ASSERT
      expect(mockMedplum.createResource).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'Observation',
          status: 'final',
          subject: { reference: 'Patient/patient-123' },
        })
      );
      expect(result.id).toBe('obs-123');
    });

    it('OS-002: should set interpretation to adherent for PDC >= 80%', async () => {
      // ARRANGE
      const adherentInput: PDCObservationInput = {
        ...mockPDCInput,
        pdc: 0.85,
        fragilityTier: 'COMPLIANT',
        priorityScore: 0,
      };
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      // ACT
      const result = await storePDCObservation(mockMedplum as unknown, adherentInput);

      // ASSERT
      const interpretation = result.interpretation?.[0]?.coding?.[0]?.code;
      expect(interpretation).toBe('adherent');
    });

    it('OS-003: should set interpretation to at-risk for PDC 60-79%', async () => {
      // ARRANGE
      const atRiskInput: PDCObservationInput = {
        ...mockPDCInput,
        pdc: 0.72,
      };
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      // ACT
      const result = await storePDCObservation(mockMedplum as unknown, atRiskInput);

      // ASSERT
      const interpretation = result.interpretation?.[0]?.coding?.[0]?.code;
      expect(interpretation).toBe('at-risk');
    });

    it('OS-004: should set interpretation to non-adherent for PDC < 60%', async () => {
      // ARRANGE
      const nonAdherentInput: PDCObservationInput = {
        ...mockPDCInput,
        pdc: 0.55,
        fragilityTier: 'T5_UNSALVAGEABLE',
        priorityScore: 0,
      };
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      // ACT
      const result = await storePDCObservation(mockMedplum as unknown, nonAdherentInput);

      // ASSERT
      const interpretation = result.interpretation?.[0]?.coding?.[0]?.code;
      expect(interpretation).toBe('non-adherent');
    });

    it('OS-005: should include all required extensions', async () => {
      // ARRANGE
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      // ACT
      const result = await storePDCObservation(mockMedplum as unknown, mockPDCInput);

      // ASSERT - Check all extensions are present
      expect(getCodeExtension(result.extension, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER)).toBe(
        'F2_FRAGILE'
      );
      expect(getIntegerExtension(result.extension, OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE)).toBe(
        80
      );
      expect(getBooleanExtension(result.extension, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC)).toBe(
        true
      );
      expect(getCodeExtension(result.extension, OBSERVATION_EXTENSION_URLS.MA_MEASURE)).toBe('MAC');
      expect(
        getIntegerExtension(result.extension, OBSERVATION_EXTENSION_URLS.DAYS_UNTIL_RUNOUT)
      ).toBe(5);
      expect(
        getIntegerExtension(result.extension, OBSERVATION_EXTENSION_URLS.GAP_DAYS_REMAINING)
      ).toBe(12);
      expect(getIntegerExtension(result.extension, OBSERVATION_EXTENSION_URLS.DELAY_BUDGET)).toBe(
        4
      );
      expect(getBooleanExtension(result.extension, OBSERVATION_EXTENSION_URLS.Q4_ADJUSTED)).toBe(
        false
      );
    });

    it('OS-006: should set is-current-pdc to true for new observation', async () => {
      // ARRANGE
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      // ACT
      const result = await storePDCObservation(mockMedplum as unknown, mockPDCInput);

      // ASSERT
      expect(getBooleanExtension(result.extension, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC)).toBe(
        true
      );
    });

    it('OS-007: should mark previous observations as not current', async () => {
      // ARRANGE
      const previousObs = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAC',
        pdcValue: 0.65,
      });
      // Add is-current-pdc extension
      previousObs.extension = [
        {
          url: OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC,
          valueBoolean: true,
        },
        {
          url: OBSERVATION_EXTENSION_URLS.MA_MEASURE,
          valueCode: 'MAC',
        },
      ];

      mockMedplum.searchResources.mockResolvedValue([previousObs]);
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-new' })
      );
      mockMedplum.updateResource.mockImplementation((resource) => Promise.resolve(resource));

      // ACT
      await storePDCObservation(mockMedplum as unknown, mockPDCInput);

      // ASSERT - Should update previous observation
      expect(mockMedplum.updateResource).toHaveBeenCalled();
    });

    it('OS-008: should include correct observation code for measure', async () => {
      // ARRANGE
      mockMedplum.createResource.mockImplementation((resource) =>
        Promise.resolve({ ...resource, id: 'obs-123' })
      );
      mockMedplum.searchResources.mockResolvedValue([]);

      // ACT - Test each measure
      for (const measure of ['MAC', 'MAD', 'MAH'] as MAMeasure[]) {
        const input = { ...mockPDCInput, measure };
        const result = await storePDCObservation(mockMedplum as unknown, input);

        // ASSERT
        const code = result.code?.coding?.[0]?.code;
        expect(code).toBe(`pdc-${measure.toLowerCase()}`);
      }
    });
  });

  // ===========================================================================
  // getLatestPDCObservation Tests
  // ===========================================================================

  describe('getLatestPDCObservation', () => {
    it('OG-001: should return most recent observation', async () => {
      // ARRANGE
      const obs1 = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAC',
        effectiveDate: '2025-01-15T10:00:00Z',
      });
      const obs2 = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAC',
        effectiveDate: '2025-02-15T10:00:00Z',
      });
      mockMedplum.searchResources.mockResolvedValue([obs2, obs1]);

      // ACT
      const result = await getLatestPDCObservation(mockMedplum as unknown, 'patient-123', 'MAC');

      // ASSERT
      expect(result).toBeDefined();
      expect(result?.effectiveDateTime).toBe('2025-02-15T10:00:00Z');
    });

    it('OG-002: should return null when no observations exist', async () => {
      // ARRANGE
      mockMedplum.searchResources.mockResolvedValue([]);

      // ACT
      const result = await getLatestPDCObservation(mockMedplum as unknown, 'patient-456', 'MAC');

      // ASSERT
      expect(result).toBeNull();
    });

    it('OG-003: should filter by measure type', async () => {
      // ARRANGE
      const macObs = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAC',
      });
      const madObs = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAD',
      });
      mockMedplum.searchResources.mockResolvedValue([macObs]);

      // ACT
      const result = await getLatestPDCObservation(mockMedplum as unknown, 'patient-123', 'MAC');

      // ASSERT
      expect(mockMedplum.searchResources).toHaveBeenCalledWith(
        'Observation',
        expect.objectContaining({
          code: expect.stringContaining('pdc-mac'),
        })
      );
    });
  });

  // ===========================================================================
  // getCurrentPDCObservation Tests
  // ===========================================================================

  describe('getCurrentPDCObservation', () => {
    it('should return observation with is-current-pdc=true', async () => {
      // ARRANGE
      const currentObs = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAC',
      });
      currentObs.extension = [
        {
          url: OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC,
          valueBoolean: true,
        },
        {
          url: OBSERVATION_EXTENSION_URLS.MA_MEASURE,
          valueCode: 'MAC',
        },
      ];
      mockMedplum.searchOne.mockResolvedValue(currentObs);

      // ACT
      const result = await getCurrentPDCObservation(mockMedplum as unknown, 'patient-123', 'MAC');

      // ASSERT
      expect(result).toBeDefined();
      expect(
        getBooleanExtension(result?.extension, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC)
      ).toBe(true);
    });

    it('should return null when no current observation exists', async () => {
      // ARRANGE
      mockMedplum.searchOne.mockResolvedValue(undefined);

      // ACT
      const result = await getCurrentPDCObservation(mockMedplum as unknown, 'patient-123', 'MAC');

      // ASSERT
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // getPDCObservationHistory Tests
  // ===========================================================================

  describe('getPDCObservationHistory', () => {
    it('should return observations sorted by date descending', async () => {
      // ARRANGE
      const obs1 = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAC',
        effectiveDate: '2025-01-15T10:00:00Z',
      });
      const obs2 = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAC',
        effectiveDate: '2025-02-15T10:00:00Z',
      });
      const obs3 = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAC',
        effectiveDate: '2025-03-15T10:00:00Z',
      });
      mockMedplum.searchResources.mockResolvedValue([obs3, obs2, obs1]);

      // ACT
      const result = await getPDCObservationHistory(mockMedplum as unknown, 'patient-123', 'MAC');

      // ASSERT
      expect(result).toHaveLength(3);
      expect(result[0].effectiveDateTime).toBe('2025-03-15T10:00:00Z');
      expect(result[2].effectiveDateTime).toBe('2025-01-15T10:00:00Z');
    });

    it('should limit results to specified count', async () => {
      // ARRANGE
      const observations = Array.from({ length: 10 }, (_, i) =>
        createMockPDCObservation({
          patientId: 'patient-123',
          measure: 'MAC',
          effectiveDate: `2025-${String(i + 1).padStart(2, '0')}-15T10:00:00Z`,
        })
      );
      mockMedplum.searchResources.mockResolvedValue(observations);

      // ACT
      const result = await getPDCObservationHistory(
        mockMedplum as unknown,
        'patient-123',
        'MAC',
        5
      );

      // ASSERT
      expect(mockMedplum.searchResources).toHaveBeenCalledWith(
        'Observation',
        expect.objectContaining({
          _count: 5,
        })
      );
    });
  });

  // ===========================================================================
  // parsePDCObservation Tests
  // ===========================================================================

  describe('parsePDCObservation', () => {
    it('should parse PDC value from valueQuantity', () => {
      // ARRANGE
      const obs = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAC',
        pdcValue: 0.72,
      });
      obs.extension = [
        { url: OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER, valueCode: 'F2_FRAGILE' },
        { url: OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE, valueInteger: 80 },
        { url: OBSERVATION_EXTENSION_URLS.MA_MEASURE, valueCode: 'MAC' },
        { url: OBSERVATION_EXTENSION_URLS.GAP_DAYS_REMAINING, valueInteger: 12 },
        { url: OBSERVATION_EXTENSION_URLS.DELAY_BUDGET, valueInteger: 4 },
        { url: OBSERVATION_EXTENSION_URLS.DAYS_UNTIL_RUNOUT, valueInteger: 5 },
        { url: OBSERVATION_EXTENSION_URLS.Q4_ADJUSTED, valueBoolean: false },
        { url: OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC, valueBoolean: true },
      ];

      // ACT
      const result = parsePDCObservation(obs);

      // ASSERT
      expect(result.pdc).toBe(0.72);
      expect(result.measure).toBe('MAC');
      expect(result.fragilityTier).toBe('F2_FRAGILE');
      expect(result.priorityScore).toBe(80);
      expect(result.gapDaysRemaining).toBe(12);
      expect(result.delayBudget).toBe(4);
      expect(result.daysUntilRunout).toBe(5);
      expect(result.q4Adjusted).toBe(false);
      expect(result.isCurrentPDC).toBe(true);
    });

    it('should return null for missing extensions', () => {
      // ARRANGE
      const obs = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAC',
        pdcValue: 0.72,
      });
      obs.extension = []; // No extensions

      // ACT
      const result = parsePDCObservation(obs);

      // ASSERT
      expect(result.pdc).toBe(0.72);
      // When extensions are missing, the parsed result will have null values
      expect(result.fragilityTier).toBeNull();
      expect(result.priorityScore).toBeNull();
    });

    it('should extract measure from observation code', () => {
      // ARRANGE
      const obs = createMockPDCObservation({
        patientId: 'patient-123',
        measure: 'MAD',
        pdcValue: 0.85,
      });

      // ACT
      const result = parsePDCObservation(obs);

      // ASSERT
      expect(result.measure).toBe('MAD');
    });
  });

  // ===========================================================================
  // markPreviousObservationsNotCurrent Tests
  // ===========================================================================

  describe('markPreviousObservationsNotCurrent', () => {
    it('should update all previous observations for patient-measure', async () => {
      // ARRANGE
      const obs1 = createMockPDCObservation({ patientId: 'patient-123', measure: 'MAC' });
      obs1.id = 'obs-1';
      obs1.extension = [
        { url: OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC, valueBoolean: true },
        { url: OBSERVATION_EXTENSION_URLS.MA_MEASURE, valueCode: 'MAC' },
      ];

      const obs2 = createMockPDCObservation({ patientId: 'patient-123', measure: 'MAC' });
      obs2.id = 'obs-2';
      obs2.extension = [
        { url: OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC, valueBoolean: true },
        { url: OBSERVATION_EXTENSION_URLS.MA_MEASURE, valueCode: 'MAC' },
      ];

      mockMedplum.searchResources.mockResolvedValue([obs1, obs2]);
      mockMedplum.updateResource.mockImplementation((resource) => Promise.resolve(resource));

      // ACT
      await markPreviousObservationsNotCurrent(mockMedplum as unknown, 'patient-123', 'MAC');

      // ASSERT
      expect(mockMedplum.updateResource).toHaveBeenCalledTimes(2);
    });

    it('should not update if no previous current observations', async () => {
      // ARRANGE
      mockMedplum.searchResources.mockResolvedValue([]);

      // ACT
      await markPreviousObservationsNotCurrent(mockMedplum as unknown, 'patient-123', 'MAC');

      // ASSERT
      expect(mockMedplum.updateResource).not.toHaveBeenCalled();
    });
  });
});
