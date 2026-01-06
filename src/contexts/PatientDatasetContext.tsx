/**
 * Patient Dataset Context
 *
 * Provides patient adherence data, medication information, and pathway determinations
 * to components. Uses stub services during migration, will connect to Medplum later.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { findPatientInBatches } from '@/lib/services-legacy/patientBatchService';
import {
  getPatientAdherenceSummary,
  PatientAdherenceSummary,
} from '@/lib/services-legacy/llmService';
import { loadMemberClaims, TransformedClaim } from '@/lib/services-legacy/rxClaimsService';
import { determinePathway, PathwayDetermination } from '@/lib/services-legacy/pathwayService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PatientDataset {
  // Patient Info
  id: string;
  name: string;
  dob: string;
  age: number;
  mrn?: string;

  // Medications & Measures
  measures?: Record<string, { currentPDC: number; description: string }>;
  medications?: unknown[];

  // Adherence Data
  adherenceSummary?: PatientAdherenceSummary;

  // Claims
  claims?: TransformedClaim[];

  // Pathway
  pathway?: PathwayDetermination;

  // Metadata
  batchId?: string;
  batchName?: string;
  lastUpdated?: string;
}

interface PatientDatasetContextValue {
  // Current patient data
  patient: PatientDataset | null;

  // Loading states
  isLoading: boolean;
  error: Error | null;

  // Actions
  loadPatient: (patientId: string) => Promise<void>;
  refreshPatient: () => Promise<void>;
  clearPatient: () => void;

  // Derived data
  hasAdherenceData: boolean;
  hasClaims: boolean;
  hasPathway: boolean;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const PatientDatasetContext = createContext<PatientDatasetContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function PatientDatasetProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<PatientDataset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load patient data from stub services
   */
  const loadPatient = useCallback(async (patientId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Load patient from batches
      const patientData = await findPatientInBatches(patientId);

      if (!patientData) {
        throw new Error(`Patient ${patientId} not found`);
      }

      // Step 2: Load RX claims for adherence calculations
      const claims = await loadMemberClaims(patientId, 2025);

      // Step 3: Generate AI adherence summary
      const adherenceSummary = await getPatientAdherenceSummary(patientData);

      // Step 4: Determine pathway (REFILL vs RENEWAL)
      const pathway = determinePathway({
        refillsRemaining: patientData.refillsRemaining ?? 0,
        rxDate: patientData.rxDate ?? null,
        lastVisitDate: patientData.lastVisitDate ?? null,
      });

      // Combine all data
      const completeDataset: PatientDataset = {
        ...patientData,
        claims,
        adherenceSummary,
        pathway,
        lastUpdated: new Date().toISOString(),
      };

      setPatient(completeDataset);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load patient data');
      setError(error);
      console.error('Error loading patient:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh current patient data
   */
  const refreshPatient = useCallback(async () => {
    if (!patient?.id) {
      console.warn('No patient to refresh');
      return;
    }
    await loadPatient(patient.id);
  }, [patient?.id, loadPatient]);

  /**
   * Clear current patient data
   */
  const clearPatient = useCallback(() => {
    setPatient(null);
    setError(null);
  }, []);

  // Derived data
  const hasAdherenceData = useMemo(() => !!patient?.adherenceSummary, [patient]);
  const hasClaims = useMemo(() => !!patient?.claims && patient.claims.length > 0, [patient]);
  const hasPathway = useMemo(() => !!patient?.pathway, [patient]);

  const value: PatientDatasetContextValue = {
    patient,
    isLoading,
    error,
    loadPatient,
    refreshPatient,
    clearPatient,
    hasAdherenceData,
    hasClaims,
    hasPathway,
  };

  return <PatientDatasetContext.Provider value={value}>{children}</PatientDatasetContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access patient dataset context
 */
export function usePatientDataset() {
  const context = useContext(PatientDatasetContext);

  if (context === undefined) {
    throw new Error('usePatientDataset must be used within a PatientDatasetProvider');
  }

  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PatientDatasetContext;
