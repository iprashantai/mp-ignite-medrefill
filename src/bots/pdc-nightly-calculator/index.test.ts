/**
 * PDC Nightly Calculator Bot Tests
 *
 * Tests for the nightly PDC calculation bot.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BotEvent } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';
import {
  createMockMedplum,
  createMockDispenseHistory,
  createMockPatient,
  MOCK_RXNORM_CODES,
  type MockMedplumClient,
} from '@/lib/fhir/__tests__/fixtures/mock-medplum';
import { handler, processSinglePatient } from './index';

// Mock the orchestrator to isolate bot logic
vi.mock('@/lib/pdc/orchestrator', () => ({
  calculateAndStorePatientPDC: vi.fn(),
}));

import { calculateAndStorePatientPDC } from '@/lib/pdc/orchestrator';

const mockCalculateAndStorePatientPDC = vi.mocked(calculateAndStorePatientPDC);

describe('PDC Nightly Calculator Bot', () => {
  let mockMedplum: MockMedplumClient;

  beforeEach(() => {
    mockMedplum = createMockMedplum();
    vi.clearAllMocks();

    // Default mock implementation
    mockCalculateAndStorePatientPDC.mockResolvedValue({
      patientId: 'test-patient',
      measurementYear: 2025,
      calculatedAt: new Date().toISOString(),
      measures: [
        {
          measure: 'MAH',
          pdc: 85,
          pdcStatusQuo: 85,
          pdcPerfect: 95,
          fragilityTier: 'COMPLIANT',
          priorityScore: 0,
          daysUntilRunout: 10,
          gapDaysRemaining: 20,
          delayBudget: 5,
          medications: [],
        },
      ],
      summary: {
        worstTier: 'COMPLIANT',
        highestPriorityScore: 0,
        daysUntilEarliestRunout: 10,
        pdcByMeasure: { MAC: null, MAD: null, MAH: 0.85 },
        lastUpdated: new Date().toISOString(),
      },
      errors: [],
    });
  });

  describe('handler', () => {
    it('should process patients found in the system', async () => {
      // Setup mock dispenses to find patients
      const dispenses = [
        ...createMockDispenseHistory({
          patientId: 'patient-1',
          startDate: '2025-01-15',
          fillCount: 3,
          daysSupply: 30,
          rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
          medicationName: 'Lisinopril 10mg',
        }),
        ...createMockDispenseHistory({
          patientId: 'patient-2',
          startDate: '2025-01-20',
          fillCount: 2,
          daysSupply: 30,
          rxnormCode: MOCK_RXNORM_CODES.MAC.ATORVASTATIN,
          medicationName: 'Atorvastatin 20mg',
        }),
      ];

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') {
          return dispenses;
        }
        return [];
      });

      const event: BotEvent<Resource> = {
        input: {},
        bot: { reference: 'Bot/test-bot' },
        contentType: 'application/json',
        secrets: {},
      };

      const result = await handler(mockMedplum as any, event);

      expect(result.totalPatients).toBe(2);
      expect(result.executionId).toBeDefined();
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    it('should handle empty patient list', async () => {
      mockMedplum.searchResources.mockResolvedValue([]);

      const event: BotEvent<Resource> = {
        input: {},
        bot: { reference: 'Bot/test-bot' },
        contentType: 'application/json',
        secrets: {},
      };

      const result = await handler(mockMedplum as any, event);

      expect(result.totalPatients).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
    });

    it('should track success and error counts', async () => {
      const dispenses = [
        ...createMockDispenseHistory({
          patientId: 'patient-1',
          startDate: '2025-01-15',
          fillCount: 3,
          daysSupply: 30,
          rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
          medicationName: 'Lisinopril 10mg',
        }),
        ...createMockDispenseHistory({
          patientId: 'patient-2',
          startDate: '2025-01-20',
          fillCount: 2,
          daysSupply: 30,
          rxnormCode: MOCK_RXNORM_CODES.MAC.ATORVASTATIN,
          medicationName: 'Atorvastatin 20mg',
        }),
      ];

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') {
          return dispenses;
        }
        return [];
      });

      // Make second patient fail
      let callCount = 0;
      mockCalculateAndStorePatientPDC.mockImplementation(async (medplum, patientId) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Simulated failure');
        }
        return {
          patientId,
          measurementYear: 2025,
          calculatedAt: new Date().toISOString(),
          measures: [{ measure: 'MAH', pdc: 85, pdcStatusQuo: 85, pdcPerfect: 95, fragilityTier: 'COMPLIANT', priorityScore: 0, daysUntilRunout: 10, gapDaysRemaining: 20, delayBudget: 5, medications: [] }],
          summary: null,
          errors: [],
        };
      });

      const event: BotEvent<Resource> = {
        input: {},
        bot: { reference: 'Bot/test-bot' },
        contentType: 'application/json',
        secrets: {},
      };

      const result = await handler(mockMedplum as any, event);

      expect(result.totalPatients).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
    });

    it('should respect maxPatientsPerRun configuration', async () => {
      // Create dispenses for 5 patients
      const dispenses = [];
      for (let i = 1; i <= 5; i++) {
        dispenses.push(
          ...createMockDispenseHistory({
            patientId: `patient-${i}`,
            startDate: '2025-01-15',
            fillCount: 2,
            daysSupply: 30,
            rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
            medicationName: 'Lisinopril 10mg',
          })
        );
      }

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') {
          return dispenses;
        }
        return [];
      });

      const event: BotEvent<Resource> = {
        input: { maxPatientsPerRun: 3 },
        bot: { reference: 'Bot/test-bot' },
        contentType: 'application/json',
        secrets: {},
      };

      const result = await handler(mockMedplum as any, event);

      expect(result.totalPatients).toBe(3); // Limited to 3
    });

    it('should support dry run mode', async () => {
      const dispenses = createMockDispenseHistory({
        patientId: 'patient-1',
        startDate: '2025-01-15',
        fillCount: 3,
        daysSupply: 30,
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') {
          return dispenses;
        }
        return [];
      });

      const event: BotEvent<Resource> = {
        input: { dryRun: true },
        bot: { reference: 'Bot/test-bot' },
        contentType: 'application/json',
        secrets: {},
      };

      const result = await handler(mockMedplum as any, event);

      // Should not call the orchestrator in dry run mode
      expect(mockCalculateAndStorePatientPDC).not.toHaveBeenCalled();
      expect(result.totalPatients).toBe(1);
      expect(result.successCount).toBe(1);
    });

    it('should pass configuration to orchestrator', async () => {
      const dispenses = createMockDispenseHistory({
        patientId: 'patient-1',
        startDate: '2025-01-15',
        fillCount: 3,
        daysSupply: 30,
        rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        medicationName: 'Lisinopril 10mg',
      });

      mockMedplum.searchResources.mockImplementation(async (resourceType) => {
        if (resourceType === 'MedicationDispense') {
          return dispenses;
        }
        return [];
      });

      const event: BotEvent<Resource> = {
        input: {
          measurementYear: 2024,
          includeMedicationLevel: false,
          updatePatientExtensions: false,
        },
        bot: { reference: 'Bot/test-bot' },
        contentType: 'application/json',
        secrets: {},
      };

      await handler(mockMedplum as any, event);

      expect(mockCalculateAndStorePatientPDC).toHaveBeenCalledWith(
        expect.anything(),
        'patient-1',
        expect.objectContaining({
          measurementYear: 2024,
          includeMedicationLevel: false,
          updatePatientExtensions: false,
        })
      );
    });
  });

  describe('processSinglePatient', () => {
    it('should process a single patient', async () => {
      const result = await processSinglePatient(mockMedplum as any, 'test-patient');

      expect(result.patientId).toBe('test-patient');
      expect(result.measures).toHaveLength(1);
      expect(mockCalculateAndStorePatientPDC).toHaveBeenCalledWith(
        expect.anything(),
        'test-patient',
        expect.objectContaining({
          includeMedicationLevel: true,
          updatePatientExtensions: true,
        })
      );
    });

    it('should allow custom options', async () => {
      await processSinglePatient(mockMedplum as any, 'test-patient', {
        measurementYear: 2024,
        includeMedicationLevel: false,
      });

      expect(mockCalculateAndStorePatientPDC).toHaveBeenCalledWith(
        expect.anything(),
        'test-patient',
        expect.objectContaining({
          measurementYear: 2024,
          includeMedicationLevel: false,
        })
      );
    });
  });
});
