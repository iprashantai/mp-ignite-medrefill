'use client';

import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useQuery } from '@tanstack/react-query';
import type {
  Patient,
  MedicationRequest,
  MedicationDispense,
  Task,
  Observation,
  Bundle,
} from '@medplum/fhirtypes';
import type { Result } from '@/types';

/**
 * Hook to fetch a patient by ID.
 */
export function usePatient(patientId: string | undefined) {
  const medplum = useMedplum();

  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async (): Promise<Patient> => {
      if (!patientId) throw new Error('Patient ID is required');
      return medplum.readResource('Patient', patientId);
    },
    enabled: !!patientId,
  });
}

/**
 * Hook to fetch active medications for a patient.
 */
export function useMedications(patientId: string | undefined) {
  const medplum = useMedplum();

  return useQuery({
    queryKey: ['medications', patientId],
    queryFn: async (): Promise<MedicationRequest[]> => {
      if (!patientId) throw new Error('Patient ID is required');
      return medplum.searchResources('MedicationRequest', {
        patient: `Patient/${patientId}`,
        status: 'active',
        _sort: '-authoredon',
      });
    },
    enabled: !!patientId,
  });
}

/**
 * Hook to fetch medication dispenses for PDC calculation.
 */
export function useDispenses(
  patientId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  const medplum = useMedplum();

  return useQuery({
    queryKey: ['dispenses', patientId, startDate, endDate],
    queryFn: async (): Promise<MedicationDispense[]> => {
      if (!patientId) throw new Error('Patient ID is required');

      const searchParams: Record<string, string> = {
        patient: `Patient/${patientId}`,
        _sort: 'whenhandedover',
      };

      if (startDate) {
        searchParams.whenhandedover = `ge${startDate}`;
      }

      return medplum.searchResources('MedicationDispense', searchParams);
    },
    enabled: !!patientId,
  });
}

/**
 * Hook to fetch tasks with optional filters.
 */
export function useTasks(filters?: {
  status?: string;
  priority?: string;
  code?: string;
}) {
  const medplum = useMedplum();

  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async (): Promise<Task[]> => {
      const searchParams: Record<string, string> = {
        _sort: '-authored-on',
        _count: '100',
      };

      if (filters?.status) {
        searchParams.status = filters.status;
      }
      if (filters?.priority) {
        searchParams.priority = filters.priority;
      }
      if (filters?.code) {
        searchParams.code = filters.code;
      }

      return medplum.searchResources('Task', searchParams);
    },
  });
}

/**
 * Hook to fetch refill review tasks (our main queue).
 */
export function useRefillQueue() {
  return useTasks({
    status: 'requested,in-progress',
    code: 'https://ignitehealth.com/task-types|refill-review',
  });
}

/**
 * Hook to fetch PDC observations for a patient.
 */
export function usePDCScores(patientId: string | undefined) {
  const medplum = useMedplum();

  return useQuery({
    queryKey: ['pdc-scores', patientId],
    queryFn: async (): Promise<Observation[]> => {
      if (!patientId) throw new Error('Patient ID is required');
      return medplum.searchResources('Observation', {
        patient: `Patient/${patientId}`,
        category: 'https://ignitehealth.com/observation-category|adherence-metric',
        _sort: '-date',
      });
    },
    enabled: !!patientId,
  });
}

/**
 * Hook to get current user profile.
 */
export function useCurrentUser() {
  const profile = useMedplumProfile();
  return profile;
}

/**
 * Safe wrapper for Medplum operations that returns Result type.
 */
export async function safeMedplumCall<T>(
  operation: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error('Medplum operation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}
