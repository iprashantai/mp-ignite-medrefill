'use client';

import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useQuery } from '@tanstack/react-query';
import type { Patient, MedicationRequest, Task, Bundle } from '@medplum/fhirtypes';

/**
 * Hook to check if user is authenticated
 */
export function useAuth() {
  const medplum = useMedplum();
  const profile = useMedplumProfile();

  return {
    isAuthenticated: !!profile,
    isLoading: medplum.isLoading(),
    profile,
    login: () => {
      // Redirect to login page which handles OAuth flow
      window.location.href = '/login';
    },
    logout: async () => {
      await medplum.signOut();
      window.location.href = '/login';
    },
  };
}

/**
 * Hook to fetch a patient by ID
 */
export function usePatient(patientId: string | undefined) {
  const medplum = useMedplum();

  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      return medplum.readResource('Patient', patientId);
    },
    enabled: !!patientId,
  });
}

/**
 * Hook to fetch active medications for a patient
 */
export function useMedications(patientId: string | undefined) {
  const medplum = useMedplum();

  return useQuery({
    queryKey: ['medications', patientId],
    queryFn: async () => {
      if (!patientId) return [];
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
 * Hook to fetch tasks with optional filters
 */
export function useTasks(filters?: {
  status?: string;
  priority?: string;
  code?: string;
}) {
  const medplum = useMedplum();

  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const searchParams: Record<string, string> = {
        _sort: '-authored-on',
        _count: '50',
      };

      if (filters?.status) searchParams.status = filters.status;
      if (filters?.priority) searchParams.priority = filters.priority;
      if (filters?.code) searchParams.code = filters.code;

      return medplum.searchResources('Task', searchParams);
    },
  });
}

/**
 * Hook to fetch pending refill review tasks
 */
export function useRefillQueue() {
  const medplum = useMedplum();

  return useQuery({
    queryKey: ['refill-queue'],
    queryFn: async () => {
      return medplum.searchResources('Task', {
        status: 'requested,received,accepted,in-progress',
        code: 'refill-review',
        _sort: 'priority,-authored-on',
        _count: '100',
      });
    },
  });
}
