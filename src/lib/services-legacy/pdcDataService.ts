/**
 * PDC Data Service (Legacy Shim)
 *
 * Shim service that provides the same API as legacy pdcDataService.js
 * but delegates to the Medplum adapter layer.
 *
 * This allows legacy components to work without modification.
 *
 * ORIGINAL: legacy/src/services/pdcDataService.js
 * ADAPTED: Delegates to legacy-patient-adapter instead of Firebase
 */

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, no-console */

import type { MedplumClient } from '@medplum/core';
import type { LegacyPatient, LegacyMedication } from '@/types/legacy-types';
import {
  loadPatientsWithLegacyShape,
  loadFilteredLegacyPatients,
} from '@/lib/adapters/legacy-patient-adapter';

// =============================================================================
// Cache Management (Stub)
// =============================================================================

/**
 * Invalidate RX claims cache
 * Note: In Medplum version, caching is handled by Medplum's built-in cache
 */
export const invalidateRxClaimsCache = () => {
  console.log('🔄 RX claims cache invalidated (Medplum stub)');
};

/**
 * Get cache status
 * Note: Returns stub data in Medplum version
 */
export const getCacheStatus = () => {
  return {
    isCached: false,
    age: 0,
    expiresIn: 0,
    claimCount: 0,
    patientCount: 0,
  };
};

// =============================================================================
// Core PDC Calculation
// =============================================================================

/**
 * Calculate PDC from claims
 * Note: In Medplum version, PDC is already calculated by Phase 1 engine
 */
export const calculatePDCFromClaims = (claims: any[]) => {
  console.warn('calculatePDCFromClaims: Using pre-calculated PDC from Medplum');
  return {
    pdc: null,
    status: null,
    gapDaysRemaining: null,
  };
};

// =============================================================================
// Patient Loading (Adapted to Medplum)
// =============================================================================

/**
 * Load patients with RX claims
 *
 * LEGACY: Loaded from Firebase with RX claims collection
 * MEDPLUM: Loads from Medplum using adapter layer
 *
 * @param medplum - Medplum client instance
 * @param options - Load options
 * @returns Array of patients with medications
 */
export const loadPatientsWithRxClaims = async (
  medplum: MedplumClient,
  options?: {
    active?: boolean;
    _count?: number;
    _sort?: string;
  }
): Promise<LegacyPatient[]> => {
  console.log('📋 loadPatientsWithRxClaims: Loading from Medplum...');

  return await loadPatientsWithLegacyShape(medplum, options);
};

/**
 * Build medications array from RX claims
 *
 * LEGACY: Transformed RX claims to medication objects
 * MEDPLUM: Already transformed by adapter layer
 *
 * @param patient - Patient with medications
 * @param claims - RX claims (ignored in Medplum version)
 * @returns Medications array
 */
export const buildMedicationsFromRxClaims = (
  patient: LegacyPatient,
  claims: any[] = []
): LegacyMedication[] => {
  // In Medplum version, medications are already built by adapter
  return patient.medications || [];
};

/**
 * Derive aggregate adherence
 *
 * LEGACY: Calculated aggregate metrics from medications
 * MEDPLUM: Already calculated by adapter layer
 *
 * @param patient - Patient object
 * @returns Patient with aggregate metrics
 */
export const deriveAggregateAdherence = (patient: LegacyPatient): LegacyPatient => {
  // In Medplum version, aggregates are already calculated
  return patient;
};

/**
 * Normalize patient for display
 *
 * LEGACY: Normalized various patient formats to consistent shape
 * MEDPLUM: Already normalized by adapter layer
 *
 * @param patient - Patient object
 * @returns Normalized patient
 */
export const normalizePatientForDisplay = (patient: LegacyPatient): LegacyPatient => {
  // In Medplum version, already normalized by adapter
  return patient;
};

// =============================================================================
// Filtered Loading
// =============================================================================

/**
 * Load patients with filtering
 *
 * @param medplum - Medplum client
 * @param filter - Filter criteria
 * @returns Filtered patients
 */
export const loadFilteredPatients = async (
  medplum: MedplumClient,
  filter?: {
    pdcRange?: [number, number];
    fragilityTiers?: any[];
    measures?: any[];
    in14DayQueue?: boolean;
  }
): Promise<LegacyPatient[]> => {
  return await loadFilteredLegacyPatients(medplum, filter);
};
