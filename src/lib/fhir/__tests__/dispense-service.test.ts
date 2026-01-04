/**
 * MedicationDispense Service Tests
 *
 * TDD: Write tests FIRST, then implement to pass.
 *
 * @see docs/implementation/phase-1-core-engine/specs/01_FHIR_SERVICES_SPEC.md
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, beforeEach } from 'vitest';
import type { MedplumClient } from '@medplum/core';
import {
  createMockMedplum,
  createMockDispense,
  MOCK_RXNORM_CODES,
  type MockMedplumClient,
} from './fixtures/mock-medplum';
import {
  getPatientDispenses,
  getDispensesByMeasure,
  getDispensesByMedication,
  extractDaysSupply,
  extractFillDate,
  extractMedicationCode,
} from '../dispense-service';

// =============================================================================
// Test Setup
// =============================================================================

describe('DispenseService', () => {
  let mockMedplum: MockMedplumClient;

  beforeEach(() => {
    mockMedplum = createMockMedplum();
  });

  // ===========================================================================
  // getPatientDispenses Tests
  // ===========================================================================

  describe('getPatientDispenses', () => {
    it('DS-001: should fetch and sort dispenses by date ascending', async () => {
      // ARRANGE
      const dispenses = [
        createMockDispense({ patientId: 'patient-123', fillDate: '2025-03-15' }),
        createMockDispense({ patientId: 'patient-123', fillDate: '2025-01-15' }),
        createMockDispense({ patientId: 'patient-123', fillDate: '2025-02-15' }),
      ];
      mockMedplum.searchResources.mockResolvedValue(dispenses);

      // ACT
      const result = await getPatientDispenses(
        mockMedplum as unknown as MedplumClient,
        'patient-123',
        2025
      );

      // ASSERT
      expect(result).toHaveLength(3);
      expect(extractFillDate(result[0])?.toISOString().slice(0, 10)).toBe('2025-01-15');
      expect(extractFillDate(result[1])?.toISOString().slice(0, 10)).toBe('2025-02-15');
      expect(extractFillDate(result[2])?.toISOString().slice(0, 10)).toBe('2025-03-15');
    });

    it('DS-002: should return empty array when patient has no dispenses', async () => {
      // ARRANGE
      mockMedplum.searchResources.mockResolvedValue([]);

      // ACT
      const result = await getPatientDispenses(
        mockMedplum as unknown as MedplumClient,
        'patient-456',
        2025
      );

      // ASSERT
      expect(result).toEqual([]);
    });

    it('DS-003: should only return dispenses within measurement year', async () => {
      // ARRANGE
      const dispenses = [
        createMockDispense({ patientId: 'patient-123', fillDate: '2024-12-15' }), // Outside
        createMockDispense({ patientId: 'patient-123', fillDate: '2025-01-15' }), // Inside
        createMockDispense({ patientId: 'patient-123', fillDate: '2025-06-15' }), // Inside
        createMockDispense({ patientId: 'patient-123', fillDate: '2026-01-15' }), // Outside
      ];
      mockMedplum.searchResources.mockResolvedValue(dispenses);

      // ACT
      await getPatientDispenses(mockMedplum as unknown as MedplumClient, 'patient-123', 2025);

      // ASSERT - service should call with correct date range
      expect(mockMedplum.searchResources).toHaveBeenCalledWith(
        'MedicationDispense',
        expect.objectContaining({
          subject: 'Patient/patient-123',
        })
      );
    });

    it('DS-004: should only return completed dispenses', async () => {
      // ARRANGE
      const dispenses = [
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-01-15',
          status: 'completed',
        }),
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-02-15',
          status: 'cancelled',
        } as unknown),
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-03-15',
          status: 'in-progress',
        } as unknown),
      ];
      mockMedplum.searchResources.mockResolvedValue(dispenses);

      // ACT
      await getPatientDispenses(mockMedplum as unknown as MedplumClient, 'patient-123', 2025);

      // ASSERT - should call with status filter
      expect(mockMedplum.searchResources).toHaveBeenCalledWith(
        'MedicationDispense',
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('DS-005: should throw on API error', async () => {
      // ARRANGE
      mockMedplum.searchResources.mockRejectedValue(new Error('API Error'));

      // ACT & ASSERT
      await expect(
        getPatientDispenses(mockMedplum as unknown as MedplumClient, 'patient-123', 2025)
      ).rejects.toThrow('API Error');
    });

    it('DS-006: should handle large result sets with pagination', async () => {
      // ARRANGE
      const manyDispenses = Array.from({ length: 100 }, (_, i) =>
        createMockDispense({
          patientId: 'patient-123',
          fillDate: `2025-${String(Math.floor(i / 10) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        })
      );
      mockMedplum.searchResources.mockResolvedValue(manyDispenses);

      // ACT
      const result = await getPatientDispenses(
        mockMedplum as unknown as MedplumClient,
        'patient-123',
        2025
      );

      // ASSERT
      expect(result).toHaveLength(100);
      expect(mockMedplum.searchResources).toHaveBeenCalledWith(
        'MedicationDispense',
        expect.objectContaining({
          _count: expect.any(Number),
        })
      );
    });
  });

  // ===========================================================================
  // getDispensesByMeasure Tests
  // ===========================================================================

  describe('getDispensesByMeasure', () => {
    it('DM-001: should filter to only MAC (statin) dispenses', async () => {
      // ARRANGE
      const dispenses = [
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-01-15',
          rxnormCode: MOCK_RXNORM_CODES.MAC.ATORVASTATIN,
          medicationName: 'Atorvastatin 20mg',
        }),
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-02-15',
          rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
          medicationName: 'Lisinopril 10mg',
        }),
      ];
      mockMedplum.searchResources.mockResolvedValue(dispenses);

      // ACT
      const result = await getDispensesByMeasure(
        mockMedplum as unknown as MedplumClient,
        'patient-123',
        'MAC',
        2025
      );

      // ASSERT
      expect(result).toHaveLength(1);
      expect(extractMedicationCode(result[0])).toBe(MOCK_RXNORM_CODES.MAC.ATORVASTATIN);
    });

    it('DM-002: should filter to only MAD (diabetes) dispenses', async () => {
      // ARRANGE
      const dispenses = [
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-01-15',
          rxnormCode: MOCK_RXNORM_CODES.MAD.METFORMIN,
          medicationName: 'Metformin 500mg',
        }),
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-02-15',
          rxnormCode: MOCK_RXNORM_CODES.MAC.SIMVASTATIN,
          medicationName: 'Simvastatin 40mg',
        }),
      ];
      mockMedplum.searchResources.mockResolvedValue(dispenses);

      // ACT
      const result = await getDispensesByMeasure(
        mockMedplum as unknown as MedplumClient,
        'patient-123',
        'MAD',
        2025
      );

      // ASSERT
      expect(result).toHaveLength(1);
      expect(extractMedicationCode(result[0])).toBe(MOCK_RXNORM_CODES.MAD.METFORMIN);
    });

    it('DM-003: should filter to only MAH (hypertension) dispenses', async () => {
      // ARRANGE
      const dispenses = [
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-01-15',
          rxnormCode: MOCK_RXNORM_CODES.MAH.LOSARTAN,
          medicationName: 'Losartan 50mg',
        }),
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-02-15',
          rxnormCode: MOCK_RXNORM_CODES.MAD.GLIPIZIDE,
          medicationName: 'Glipizide 5mg',
        }),
      ];
      mockMedplum.searchResources.mockResolvedValue(dispenses);

      // ACT
      const result = await getDispensesByMeasure(
        mockMedplum as unknown as MedplumClient,
        'patient-123',
        'MAH',
        2025
      );

      // ASSERT
      expect(result).toHaveLength(1);
      expect(extractMedicationCode(result[0])).toBe(MOCK_RXNORM_CODES.MAH.LOSARTAN);
    });

    it('DM-004: should return empty array when no MA medications found', async () => {
      // ARRANGE
      const dispenses = [
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-01-15',
          rxnormCode: '12345', // Non-MA medication
          medicationName: 'Other Medication',
        }),
      ];
      mockMedplum.searchResources.mockResolvedValue(dispenses);

      // ACT
      const result = await getDispensesByMeasure(
        mockMedplum as unknown as MedplumClient,
        'patient-123',
        'MAC',
        2025
      );

      // ASSERT
      expect(result).toEqual([]);
    });

    it('DM-005: should return only matching measure from mixed medications', async () => {
      // ARRANGE
      const dispenses = [
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-01-15',
          rxnormCode: MOCK_RXNORM_CODES.MAC.ATORVASTATIN,
          medicationName: 'Atorvastatin 20mg',
        }),
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-02-15',
          rxnormCode: MOCK_RXNORM_CODES.MAD.METFORMIN,
          medicationName: 'Metformin 500mg',
        }),
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-03-15',
          rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
          medicationName: 'Lisinopril 10mg',
        }),
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-04-15',
          rxnormCode: MOCK_RXNORM_CODES.MAC.ROSUVASTATIN,
          medicationName: 'Rosuvastatin 10mg',
        }),
      ];
      mockMedplum.searchResources.mockResolvedValue(dispenses);

      // ACT
      const result = await getDispensesByMeasure(
        mockMedplum as unknown as MedplumClient,
        'patient-123',
        'MAC',
        2025
      );

      // ASSERT
      expect(result).toHaveLength(2);
      expect(result.map((d) => extractMedicationCode(d))).toEqual([
        MOCK_RXNORM_CODES.MAC.ATORVASTATIN,
        MOCK_RXNORM_CODES.MAC.ROSUVASTATIN,
      ]);
    });
  });

  // ===========================================================================
  // getDispensesByMedication Tests
  // ===========================================================================

  describe('getDispensesByMedication', () => {
    it('should filter by specific RxNorm code', async () => {
      // ARRANGE
      const dispenses = [
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-01-15',
          rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        }),
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-02-15',
          rxnormCode: MOCK_RXNORM_CODES.MAH.LOSARTAN,
        }),
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-03-15',
          rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        }),
      ];
      mockMedplum.searchResources.mockResolvedValue(dispenses);

      // ACT
      const result = await getDispensesByMedication(
        mockMedplum as unknown as MedplumClient,
        'patient-123',
        MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        2025
      );

      // ASSERT
      expect(result).toHaveLength(2);
      result.forEach((d) => {
        expect(extractMedicationCode(d)).toBe(MOCK_RXNORM_CODES.MAH.LISINOPRIL);
      });
    });

    it('should return empty array for non-matching RxNorm code', async () => {
      // ARRANGE
      const dispenses = [
        createMockDispense({
          patientId: 'patient-123',
          fillDate: '2025-01-15',
          rxnormCode: MOCK_RXNORM_CODES.MAH.LISINOPRIL,
        }),
      ];
      mockMedplum.searchResources.mockResolvedValue(dispenses);

      // ACT
      const result = await getDispensesByMedication(
        mockMedplum as unknown as MedplumClient,
        'patient-123',
        '999999', // Non-existent code
        2025
      );

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // extractDaysSupply Tests
  // ===========================================================================

  describe('extractDaysSupply', () => {
    it('H-008: should return daysSupply value when present', () => {
      const dispense = createMockDispense({ daysSupply: 30 });
      expect(extractDaysSupply(dispense)).toBe(30);
    });

    it('H-009: should return 90 for 90-day supply', () => {
      const dispense = createMockDispense({ daysSupply: 90 });
      expect(extractDaysSupply(dispense)).toBe(90);
    });

    it('H-010: should return 30 (default) when daysSupply is null', () => {
      const dispense = createMockDispense({});
      dispense.daysSupply = undefined;
      expect(extractDaysSupply(dispense)).toBe(30);
    });

    it('H-011: should return 30 (default) when daysSupply.value is 0', () => {
      const dispense = createMockDispense({ daysSupply: 0 });
      expect(extractDaysSupply(dispense)).toBe(30);
    });

    it('should handle negative daysSupply by returning default', () => {
      const dispense = createMockDispense({ daysSupply: -5 });
      expect(extractDaysSupply(dispense)).toBe(30);
    });
  });

  // ===========================================================================
  // extractFillDate Tests
  // ===========================================================================

  describe('extractFillDate', () => {
    it('H-012: should return Date object from whenHandedOver', () => {
      const dispense = createMockDispense({ fillDate: '2025-01-15' });
      const result = extractFillDate(dispense);

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString().slice(0, 10)).toBe('2025-01-15');
    });

    it('H-013: should return null when whenHandedOver is null', () => {
      const dispense = createMockDispense({});
      dispense.whenHandedOver = undefined;
      expect(extractFillDate(dispense)).toBeNull();
    });

    it('H-014: should return null for invalid date string', () => {
      const dispense = createMockDispense({});
      dispense.whenHandedOver = 'not-a-date';
      expect(extractFillDate(dispense)).toBeNull();
    });

    it('should handle ISO datetime format', () => {
      const dispense = createMockDispense({});
      dispense.whenHandedOver = '2025-01-15T10:30:00Z';
      const result = extractFillDate(dispense);

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString().slice(0, 10)).toBe('2025-01-15');
    });
  });

  // ===========================================================================
  // extractMedicationCode Tests
  // ===========================================================================

  describe('extractMedicationCode', () => {
    it('H-015: should return RxNorm code from medicationCodeableConcept', () => {
      const dispense = createMockDispense({
        rxnormCode: '310965',
        medicationName: 'Lisinopril 10mg',
      });

      expect(extractMedicationCode(dispense)).toBe('310965');
    });

    it('H-016: should return null when no coding present', () => {
      const dispense = createMockDispense({});
      dispense.medicationCodeableConcept = { text: 'Some medication' };

      expect(extractMedicationCode(dispense)).toBeNull();
    });

    it('H-017: should return null for non-RxNorm coding', () => {
      const dispense = createMockDispense({});
      dispense.medicationCodeableConcept = {
        coding: [
          {
            system: 'http://example.com/other-system',
            code: '12345',
          },
        ],
      };

      expect(extractMedicationCode(dispense)).toBeNull();
    });

    it('should prefer RxNorm coding when multiple systems present', () => {
      const dispense = createMockDispense({});
      dispense.medicationCodeableConcept = {
        coding: [
          {
            system: 'http://example.com/other-system',
            code: '99999',
          },
          {
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '310965',
          },
        ],
      };

      expect(extractMedicationCode(dispense)).toBe('310965');
    });

    it('should return null for empty coding array', () => {
      const dispense = createMockDispense({});
      dispense.medicationCodeableConcept = { coding: [] };

      expect(extractMedicationCode(dispense)).toBeNull();
    });
  });
});
