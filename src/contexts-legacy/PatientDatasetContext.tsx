'use client';

/**
 * Patient Dataset Context (Legacy)
 *
 * Manages the current patient dataset state (search/filter results).
 * This allows pages to share filtered patient data without re-querying.
 *
 * ORIGINAL: legacy/src/context/PatientDatasetContext.jsx
 * ADAPTED: TypeScript version with types from legacy-types.ts
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { LegacyPatient } from '@/types/legacy-types';

interface PatientDataset {
  datasetId: string | null;
  label: string;
  patients: LegacyPatient[];
  lastUpdated: string | null;
}

interface PatientDatasetContextType {
  patientDataset: PatientDataset;
  updatePatientDataset: (update: {
    datasetId: string;
    label: string;
    patients: LegacyPatient[];
  }) => void;
}

const PatientDatasetContext = createContext<PatientDatasetContextType | null>(null);

export const PatientDatasetProvider = ({ children }: { children: React.ReactNode }) => {
  const [patientDataset, setPatientDataset] = useState<PatientDataset>({
    datasetId: null,
    label: '',
    patients: [],
    lastUpdated: null,
  });

  const updatePatientDataset = useCallback(
    ({
      datasetId,
      label,
      patients,
    }: {
      datasetId: string;
      label: string;
      patients: LegacyPatient[];
    }) => {
      setPatientDataset({
        datasetId,
        label,
        patients: patients || [],
        lastUpdated: new Date().toISOString(),
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      patientDataset,
      updatePatientDataset,
    }),
    [patientDataset, updatePatientDataset]
  );

  return <PatientDatasetContext.Provider value={value}>{children}</PatientDatasetContext.Provider>;
};

export const usePatientDataset = () => {
  const context = useContext(PatientDatasetContext);
  if (!context) {
    throw new Error('usePatientDataset must be used within PatientDatasetProvider');
  }
  return context;
};
