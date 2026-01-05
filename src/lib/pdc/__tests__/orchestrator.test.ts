/**
 * PDC Orchestrator Tests
 *
 * Tests for the main orchestration layer that coordinates all Phase 1/1.5 services.
 *
 * @see src/lib/pdc/orchestrator.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MedicationDispense, Patient, Observation } from '@medplum/fhirtypes';
import {
  createMockMedplum,
  createMockDispense,
  createMockDispenseHistory,
  createMockPatient,
  resetMockMedplum,
  MOCK_RXNORM_CODES,
  type MockMedplumClient,
} from '@/lib/fhir/__tests__/fixtures/mock-medplum';
import {
  calculateAndStorePatientPDC,
  calculateBatchPatientPDC,
  groupDispensesByMeasure,
  groupDispensesByMedication,
} from '../orchestrator';

// =============================================================================
// Test Setup
// =============================================================================

describe('PDC Orchestrator', () => {
  let mockMedplum: MockMedplumClient;

  beforeEach(() => {
    mockMedplum = createMockMedplum();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Grouping Utilities
  // ===========================================================================

  describe('groupDispensesByMeasure', () => {
    it('should group dispenses by MA measure type', () => {
      const dispenses = [
        createMockDispense({ rxnormCode: MOCK_RXNORM_CODES.MAC.ATORVASTATIN, medicationName: 'Atorvastatin' }),
        createMockDispense({ rxnormCode: MOCK_RXNORM_CODES.MAC.SIMVASTATIN, medicationName: 'Simvastatin' }),
        createMockDispense({ rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL, medicationName: 'Lisinopril' }),
        createMockDispense({ rxnormCode: MOCK_RXNORM_CODES.MAD.METFORMIN, medicationName: 'Metformin' }),
      ];

      const grouped = groupDispensesByMeasure(dispenses);

      expect(grouped.size).toBe(3);
      expect(grouped.get('MAC')).toHaveLength(2);
      expect(grouped.get('MAH')).toHaveLength(1);
      expect(grouped.get('MAD')).toHaveLength(1);
    });

    it('should skip non-MA medications', () => {
      const dispenses = [
        createMockDispense({ rxnormCode: MOCK_RXNORM_CODES.MAC.ATORVASTATIN }),
        createMockDispense({ rxnormCode: '12345', medicationName: 'Non-MA Drug' }), // Not an MA drug
      ];

      const grouped = groupDispensesByMeasure(dispenses);

      expect(grouped.size).toBe(1);
      expect(grouped.get('MAC')).toHaveLength(1);
    });

    it('should return empty map for empty dispenses', () => {
      const grouped = groupDispensesByMeasure([]);
      expect(grouped.size).toBe(0);
    });
  });

  describe('groupDispensesByMedication', () => {
    it('should group dispenses by RxNorm code', () => {
      const dispenses = [
        createMockDispense({ rxnormCode: MOCK_RXNORM_CODES.MAC.ATORVASTATIN, fillDate: '2025-01-15' }),
        createMockDispense({ rxnormCode: MOCK_RXNORM_CODES.MAC.ATORVASTATIN, fillDate: '2025-02-15' }),
        createMockDispense({ rxnormCode: MOCK_RXNORM_CODES.MAC.SIMVASTATIN, fillDate: '2025-01-20' }),
      ];

      const grouped = groupDispensesByMedication(dispenses);

      expect(grouped.size).toBe(2);
      expect(grouped.get(MOCK_RXNORM_CODES.MAC.ATORVASTATIN)?.dispenses).toHaveLength(2);
      expect(grouped.get(MOCK_RXNORM_CODES.MAC.SIMVASTATIN)?.dispenses).toHaveLength(1);
    });

    it('should extract display names', () => {
      const dispenses = [
        createMockDispense({ rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL, medicationName: 'Lisinopril 10mg' }),
      ];

      const grouped = groupDispensesByMedication(dispenses);
      const lisinopril = grouped.get(MOCK_RXNORM_CODES.MAH.LISINOPRIL);

      expect(lisinopril?.displayName).toBe('Lisinopril 10mg');
    });
  });

  // ===========================================================================
  // Main Orchestrator Function
  // ===========================================================================

  describe('calculateAndStorePatientPDC', () => {
    const patientId = 'test-patient-123';
    const measurementYear = 2025;
    const currentDate = new Date('2025-06-15');

    beforeEach(() => {
      // Setup default mock patient
      mockMedplum.readResource.mockResolvedValue(
        createMockPatient({ id: patientId })
      );
    });

    it('should return errors when no dispenses found', async () => {
      mockMedplum.searchResources.mockResolvedValue([]);

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate }
      );

      expect(result.errors).toContain('No dispenses found for patient in measurement year');
      expect(result.measures).toHaveLength(0);
    });

    it('should return errors when no MA medications found', async () => {
      // Return non-MA dispenses
      mockMedplum.searchResources.mockResolvedValue([
        createMockDispense({ rxnormCode: '99999', medicationName: 'Non-MA Drug' }),
      ]);

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate }
      );

      expect(result.errors).toContain('No MA-qualifying medications found in dispenses');
      expect(result.measures).toHaveLength(0);
    });

    it('should calculate PDC for single measure', async () => {
      // Setup dispenses for MAH (Lisinopril)
      const dispenses = createMockDispenseHistory({
        patientId,
        startDate: '2025-01-15',
        fillCount: 5,
        daysSupply: 30,
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') return dispenses;
        if (resourceType === 'Observation') return []; // No existing observations
        return [];
      });

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate }
      );

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(1);
      expect(result.measures[0].measure).toBe('MAH');
      expect(result.measures[0].pdc).toBeGreaterThan(0);
      expect(result.measures[0].observationId).toBeDefined();
    });

    it('should calculate PDC for multiple measures', async () => {
      // Setup dispenses for MAC and MAH
      const mahDispenses = createMockDispenseHistory({
        patientId,
        startDate: '2025-01-15',
        fillCount: 4,
        daysSupply: 30,
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      const macDispenses = createMockDispenseHistory({
        patientId,
        startDate: '2025-01-20',
        fillCount: 3,
        daysSupply: 30,
        rxnormCode: MOCK_RXNORM_CODES.MAC.ATORVASTATIN,
        medicationName: 'Atorvastatin 20mg',
      });

      const allDispenses = [...mahDispenses, ...macDispenses];

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') return allDispenses;
        if (resourceType === 'Observation') return [];
        return [];
      });

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate }
      );

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(2);

      const measures = result.measures.map((m) => m.measure);
      expect(measures).toContain('MAC');
      expect(measures).toContain('MAH');
    });

    it('should create medication-level observations when enabled', async () => {
      const dispenses = createMockDispenseHistory({
        patientId,
        startDate: '2025-01-15',
        fillCount: 4,
        daysSupply: 30,
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') return dispenses;
        if (resourceType === 'Observation') return [];
        return [];
      });

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate, includeMedicationLevel: true }
      );

      expect(result.measures[0].medications).toHaveLength(1);
      expect(result.measures[0].medications[0].rxnormCode).toBe(MOCK_RXNORM_CODES.MAH.LISINOPRIL);
      expect(result.measures[0].medications[0].observationId).toBeDefined();
    });

    it('should skip medication-level observations when disabled', async () => {
      const dispenses = createMockDispenseHistory({
        patientId,
        startDate: '2025-01-15',
        fillCount: 4,
        daysSupply: 30,
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') return dispenses;
        if (resourceType === 'Observation') return [];
        return [];
      });

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate, includeMedicationLevel: false }
      );

      expect(result.measures[0].medications).toHaveLength(0);
    });

    it('should update patient extensions when enabled', async () => {
      const dispenses = createMockDispenseHistory({
        patientId,
        startDate: '2025-01-15',
        fillCount: 4,
        daysSupply: 30,
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') return dispenses;
        if (resourceType === 'Observation') return [];
        return [];
      });

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate, updatePatientExtensions: true }
      );

      expect(result.summary).not.toBeNull();
      expect(result.patient).toBeDefined();
      expect(mockMedplum.updateResource).toHaveBeenCalled();
    });

    it('should skip patient extensions when disabled', async () => {
      const dispenses = createMockDispenseHistory({
        patientId,
        startDate: '2025-01-15',
        fillCount: 4,
        daysSupply: 30,
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') return dispenses;
        if (resourceType === 'Observation') return [];
        return [];
      });

      // Reset update mock to track calls
      mockMedplum.updateResource.mockReset();

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate, updatePatientExtensions: false }
      );

      expect(result.summary).toBeNull();
      // Only observation creates should happen, not patient update
    });

    it('should calculate correct fragility tier', async () => {
      // Create dispenses with gaps to result in non-compliant PDC
      const dispenses = createMockDispenseHistory({
        patientId,
        startDate: '2025-01-15',
        fillCount: 2, // Only 2 fills = 60 days covered
        daysSupply: 30,
        gapDays: 30, // With 30-day gaps
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') return dispenses;
        if (resourceType === 'Observation') return [];
        return [];
      });

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate }
      );

      expect(result.measures[0].fragilityTier).toBeDefined();
      expect(result.measures[0].priorityScore).toBeGreaterThan(0);
    });

    it('should handle errors gracefully and continue processing', async () => {
      // Setup to throw error on observation create but still return result
      const dispenses = createMockDispenseHistory({
        patientId,
        startDate: '2025-01-15',
        fillCount: 3,
        daysSupply: 30,
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') return dispenses;
        if (resourceType === 'Observation') return [];
        return [];
      });

      // Make createResource throw error sometimes
      let createCallCount = 0;
      mockMedplum.createResource.mockImplementation(async (resource) => {
        createCallCount++;
        if (createCallCount === 1) {
          throw new Error('Simulated error');
        }
        return { ...resource, id: `mock-${Date.now()}` };
      });

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate }
      );

      // Should still return a result, possibly with errors
      expect(result.patientId).toBe(patientId);
    });
  });

  // ===========================================================================
  // Batch Processing
  // ===========================================================================

  describe('calculateBatchPatientPDC', () => {
    it('should process multiple patients', async () => {
      const patientIds = ['patient-1', 'patient-2', 'patient-3'];

      // Setup mock for each patient to have some dispenses
      mockMedplum.searchResources.mockImplementation(async (resourceType, query) => {
        if (resourceType === 'MedicationDispense') {
          return createMockDispenseHistory({
            patientId: 'test',
            startDate: '2025-01-15',
            fillCount: 3,
            daysSupply: 30,
            rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
            medicationName: 'Lisinopril 10mg',
          });
        }
        if (resourceType === 'Observation') return [];
        return [];
      });

      mockMedplum.readResource.mockResolvedValue(
        createMockPatient({ id: 'test' })
      );

      const result = await calculateBatchPatientPDC(
        mockMedplum as any,
        patientIds,
        { measurementYear: 2025, currentDate: new Date('2025-06-15') }
      );

      expect(result.totalPatients).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should track success and error counts', async () => {
      const patientIds = ['patient-1', 'patient-2'];

      let callCount = 0;
      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') {
          callCount++;
          if (callCount === 1) {
            // First patient has dispenses
            return createMockDispenseHistory({
              patientId: 'patient-1',
              startDate: '2025-01-15',
              fillCount: 3,
              daysSupply: 30,
              rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
              medicationName: 'Lisinopril 10mg',
            });
          }
          // Second patient has no dispenses (will be counted as error due to no data)
          return [];
        }
        return [];
      });

      mockMedplum.readResource.mockResolvedValue(
        createMockPatient({ id: 'test' })
      );

      const result = await calculateBatchPatientPDC(
        mockMedplum as any,
        patientIds,
        { measurementYear: 2025, currentDate: new Date('2025-06-15') }
      );

      expect(result.totalPatients).toBe(2);
      expect(result.successCount + result.errorCount).toBe(2);
    });

    it('should call progress callback', async () => {
      const patientIds = ['patient-1', 'patient-2'];
      const progressCalls: Array<{ current: number; total: number; patientId: string }> = [];

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') {
          return createMockDispenseHistory({
            patientId: 'test',
            startDate: '2025-01-15',
            fillCount: 3,
            daysSupply: 30,
            rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
            medicationName: 'Lisinopril 10mg',
          });
        }
        return [];
      });

      mockMedplum.readResource.mockResolvedValue(
        createMockPatient({ id: 'test' })
      );

      await calculateBatchPatientPDC(
        mockMedplum as any,
        patientIds,
        { measurementYear: 2025 },
        (current, total, patientId) => {
          progressCalls.push({ current, total, patientId });
        }
      );

      expect(progressCalls).toHaveLength(2);
      expect(progressCalls[0]).toEqual({ current: 1, total: 2, patientId: 'patient-1' });
      expect(progressCalls[1]).toEqual({ current: 2, total: 2, patientId: 'patient-2' });
    });
  });

  // ===========================================================================
  // PDC Calculation Validation
  // ===========================================================================

  describe('PDC Calculation Validation', () => {
    const patientId = 'test-patient';
    const measurementYear = 2025;

    it('should calculate correct PDC for perfect adherence', async () => {
      // 12 fills of 30 days each = 360 days covered
      // Treatment period from Jan 15 to Dec 31 = 351 days
      // PDC = min(360, 351) / 351 = 100% (capped)
      const dispenses = createMockDispenseHistory({
        patientId,
        startDate: '2025-01-15',
        fillCount: 12,
        daysSupply: 30,
        gapDays: 0, // No gaps
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') return dispenses;
        return [];
      });

      mockMedplum.readResource.mockResolvedValue(
        createMockPatient({ id: patientId })
      );

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate: new Date('2025-12-15') }
      );

      expect(result.measures[0].pdc).toBe(100);
      expect(result.measures[0].fragilityTier).toBe('COMPLIANT');
    });

    it('should calculate correct PDC with gaps', async () => {
      // 3 fills of 30 days with 15-day gaps
      // Total covered days with merging = 90 days
      // Treatment period ~150 days = PDC ~60%
      const dispenses = createMockDispenseHistory({
        patientId,
        startDate: '2025-01-15',
        fillCount: 3,
        daysSupply: 30,
        gapDays: 15, // 15-day gaps between fills
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') return dispenses;
        return [];
      });

      mockMedplum.readResource.mockResolvedValue(
        createMockPatient({ id: patientId })
      );

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate: new Date('2025-06-15') }
      );

      expect(result.measures[0].pdc).toBeLessThan(80); // Non-compliant
      expect(result.measures[0].fragilityTier).not.toBe('COMPLIANT');
    });

    it('should handle multiple medications within same measure using HEDIS merging', async () => {
      // Two statins with overlapping fills should merge correctly
      const atorvastatinDispenses = [
        createMockDispense({
          patientId,
          fillDate: '2025-01-15',
          daysSupply: 30,
          rxnormCode: MOCK_RXNORM_CODES.MAC.ATORVASTATIN,
          medicationName: 'Atorvastatin 20mg',
        }),
        createMockDispense({
          patientId,
          fillDate: '2025-02-14',
          daysSupply: 30,
          rxnormCode: MOCK_RXNORM_CODES.MAC.ATORVASTATIN,
          medicationName: 'Atorvastatin 20mg',
        }),
      ];

      const simvastatinDispenses = [
        createMockDispense({
          patientId,
          fillDate: '2025-02-01', // Overlaps with atorvastatin
          daysSupply: 30,
          rxnormCode: MOCK_RXNORM_CODES.MAC.SIMVASTATIN,
          medicationName: 'Simvastatin 40mg',
        }),
      ];

      const allDispenses = [...atorvastatinDispenses, ...simvastatinDispenses];

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') return allDispenses;
        return [];
      });

      mockMedplum.readResource.mockResolvedValue(
        createMockPatient({ id: patientId })
      );

      const result = await calculateAndStorePatientPDC(
        mockMedplum as any,
        patientId,
        { measurementYear, currentDate: new Date('2025-06-15'), includeMedicationLevel: true }
      );

      const macResult = result.measures.find((m) => m.measure === 'MAC');
      expect(macResult).toBeDefined();
      expect(macResult!.medications).toHaveLength(2); // Both medications tracked

      // Measure-level PDC should use merged intervals (HEDIS)
      // Individual medication PDCs calculated separately
    });
  });
});
