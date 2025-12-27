'use client';

import { useMedplum, useMedplumProfile, useSearchResources } from '@medplum/react';
import type { Patient, MedicationRequest, Task } from '@medplum/fhirtypes';

/**
 * Re-export Medplum hooks for convenience
 * Using Medplum's built-in hooks ensures HIPAA-compliant data access with proper audit logging
 */
export { useMedplum, useMedplumProfile, useSearchResources };

/**
 * Hook to check if user is authenticated
 * Uses Medplum's built-in profile hook
 */
export function useAuth() {
  const medplum = useMedplum();
  const profile = useMedplumProfile();

  return {
    isAuthenticated: !!profile,
    isLoading: medplum.isLoading(),
    profile,
    login: () => {
      window.location.href = '/login';
    },
    logout: async () => {
      await medplum.signOut();
      window.location.href = '/login';
    },
  };
}

/**
 * Hook to fetch active medications for a patient
 * Uses Medplum's useSearchResources for automatic caching and refetching
 */
export function useMedications(patientId: string | undefined) {
  return useSearchResources('MedicationRequest', patientId ? {
    patient: `Patient/${patientId}`,
    status: 'active',
    _sort: '-authoredon',
  } : undefined);
}

/**
 * Hook to fetch pending refill review tasks
 * Tasks are the core workflow items in Ignite Health
 */
export function useRefillQueue() {
  return useSearchResources('Task', {
    status: 'requested,received,accepted,in-progress',
    code: 'refill-review',
    _sort: 'priority,-authored-on',
    _count: '100',
  });
}

/**
 * Hook to fetch patients in medication adherence programs
 */
export function useActivePatients() {
  return useSearchResources('Patient', {
    active: 'true',
    _count: '100',
  });
}

/**
 * Hook to fetch urgent tasks requiring immediate attention
 */
export function useUrgentTasks() {
  return useSearchResources('Task', {
    status: 'requested,received,accepted,in-progress',
    priority: 'urgent,stat',
    _count: '50',
  });
}
