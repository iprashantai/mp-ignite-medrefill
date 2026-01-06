/* eslint-disable */

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
 * Load all patients from the allPatients Firestore collection
 * This is the default EMR dataset loader
 *
 * NOTE: Firebase not configured, returning synthetic test data instead
 */
export async function loadAllPatientsFromFirestore(): Promise<any[]> {
  console.log('📊 Loading synthetic patient dataset (Firebase not configured)');

  // Generate 50 synthetic patients for UI testing
  const syntheticPatients = generateSyntheticPatients(50);

  console.log(`✅ Generated ${syntheticPatients.length} synthetic patients`);
  return syntheticPatients;
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
      // If no helper provided, use default Firestore loader
      if (typeof helpers.loadEmrPatients !== 'function') {
        console.log(
          'No EMR loader provided, using default Firestore loader for allPatients collection'
        );
        return loadAllPatientsFromFirestore();
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
