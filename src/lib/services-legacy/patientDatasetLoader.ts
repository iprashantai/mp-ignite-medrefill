/* eslint-disable */

import type { MedplumClient } from '@medplum/core';
import { loadPatientsWithLegacyShape } from '@/lib/adapters/legacy-patient-adapter';
import { generateSyntheticPatients } from '@/utils/helpers/generateSyntheticPatients';

export const PATIENT_DATASET_SOURCES = {
  EMR_DEMO: 'emr_demo', // Default dataset
  BATCH_MANAGER: 'batch_manager',
};

export const PATIENT_DATASETS = [
  {
    id: PATIENT_DATASET_SOURCES.EMR_DEMO,
    label: 'EMR • Medicare sample (500)',
    type: 'emr',
    description: 'Realistic Medicare patient data with RX claims and adherence metrics.',
    isDefault: true,
  },
  {
    id: PATIENT_DATASET_SOURCES.BATCH_MANAGER,
    label: 'Batch Management • Select batch',
    type: 'batch',
    description: 'View patients from a specific batch upload.',
    requiresBatchSelection: true,
  },
];

export const PATIENT_DATASET_STORAGE_KEY = 'allPatientsCRM.datasetId';
export const DEFAULT_DATASET_ID = PATIENT_DATASET_SOURCES.EMR_DEMO;

/**
 * Load all patients from Medplum FHIR backend
 * This is the default EMR dataset loader
 *
 * Fetches Patient resources and transforms them to legacy shape using the adapter layer
 */
export async function loadAllPatientsFromFirestore(medplum: MedplumClient): Promise<any[]> {
  console.log('📊 Loading patients from Medplum FHIR backend...');

  const patients = await loadPatientsWithLegacyShape(medplum, {
    _count: 1000,
    _sort: '-_lastUpdated',
  });

  console.log(`✅ Loaded ${patients.length} patients from Medplum`);
  return patients;
}

export async function loadPatientDataset(
  datasetId: any,
  helpers: any = {},
  options: any = {}
): Promise<any[]> {
  // Default to EMR dataset if no ID provided
  const config = PATIENT_DATASETS.find((ds: any) => ds.id === datasetId) ?? PATIENT_DATASETS[0];

  switch (config.type) {
    case 'emr': {
      // If no helper provided, use default Medplum loader
      if (typeof helpers.loadEmrPatients !== 'function') {
        console.log(
          'No EMR loader provided, using default Medplum loader for FHIR Patient resources'
        );
        // Medplum client must be passed in options
        if (!options.medplum) {
          throw new Error('Medplum client required for EMR dataset loader');
        }
        return loadAllPatientsFromFirestore(options.medplum);
      }
      return helpers.loadEmrPatients(options);
    }

    case 'batch': {
      if (typeof helpers.loadBatchPatients !== 'function') {
        throw new Error('Batch dataset requested but no loader was provided.');
      }
      return helpers.loadBatchPatients(options);
    }

    default:
      throw new Error(`Unsupported dataset type: ${config.type}`);
  }
}
