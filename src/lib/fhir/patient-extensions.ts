/**
 * Patient Extension Updater
 *
 * Maintains denormalized patient extensions for fast UI queries.
 * Updates Patient resource with current fragility tier, priority score,
 * and PDC summary when PDC Observations are created/updated.
 *
 * @see docs/implementation/phase-1-core-engine/specs/05_FHIR_EXTENSIONS_SPEC.md
 */

import type { Patient, Observation, Extension } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { EXTENSION_URLS, PATIENT_EXTENSION_URLS } from './types';
import type { FragilityTier, MAMeasure } from './types';
import { getCodeExtension, getIntegerExtension, getDecimalExtension } from './helpers';
import { getCurrentPDCObservation, getAllCurrentPDCObservations } from './observation-service';

// =============================================================================
// Types
// =============================================================================

/**
 * Summarized patient state from all current PDC observations.
 */
export interface PatientPDCSummary {
  /**
   * Worst (most urgent) fragility tier across all measures.
   */
  worstTier: FragilityTier;

  /**
   * Highest priority score across all measures.
   */
  highestPriorityScore: number;

  /**
   * Minimum days until runout across all measures.
   */
  daysUntilEarliestRunout: number | null;

  /**
   * Current PDC by measure.
   */
  pdcByMeasure: {
    MAC: number | null;
    MAD: number | null;
    MAH: number | null;
  };

  /**
   * Last updated timestamp.
   */
  lastUpdated: string;
}

/**
 * Result of updating patient extensions.
 */
export interface PatientExtensionUpdateResult {
  /**
   * Updated Patient resource.
   */
  patient: Patient;

  /**
   * Summary of the update.
   */
  summary: PatientPDCSummary;

  /**
   * Number of current observations processed.
   */
  observationsProcessed: number;
}

// =============================================================================
// Tier Priority (for finding worst tier)
// =============================================================================

/**
 * Tier priority for comparison (lower = more urgent).
 */
const TIER_PRIORITY: Record<FragilityTier, number> = {
  T5_UNSALVAGEABLE: 0, // Most urgent (cannot recover)
  F1_IMMINENT: 1,
  F2_FRAGILE: 2,
  F3_MODERATE: 3,
  F4_COMFORTABLE: 4,
  F5_SAFE: 5,
  COMPLIANT: 6, // Least urgent
};

/**
 * Get the worst (most urgent) tier from a list of tiers.
 */
function getWorstTier(tiers: FragilityTier[]): FragilityTier {
  if (tiers.length === 0) return 'COMPLIANT';

  return tiers.reduce((worst, current) => {
    return TIER_PRIORITY[current] < TIER_PRIORITY[worst] ? current : worst;
  });
}

// =============================================================================
// Summary Calculation
// =============================================================================

/**
 * Calculate patient summary from current PDC observations.
 *
 * @param observations - Current PDC observations for the patient
 * @returns Patient PDC summary
 */
export function calculatePatientSummary(
  observations: Observation[]
): PatientPDCSummary {
  const tiers: FragilityTier[] = [];
  let highestPriority = 0;
  let minDaysToRunout: number | null = null;

  const pdcByMeasure: PatientPDCSummary['pdcByMeasure'] = {
    MAC: null,
    MAD: null,
    MAH: null,
  };

  for (const obs of observations) {
    // Extract fragility tier
    const tier = getCodeExtension(
      obs.extension,
      EXTENSION_URLS.FRAGILITY_TIER
    ) as FragilityTier | undefined;
    if (tier) {
      tiers.push(tier);
    }

    // Extract priority score
    const priority = getIntegerExtension(
      obs.extension,
      EXTENSION_URLS.PRIORITY_SCORE
    );
    if (priority !== undefined && priority > highestPriority) {
      highestPriority = priority;
    }

    // Extract days until runout
    const daysToRunout = getIntegerExtension(
      obs.extension,
      EXTENSION_URLS.DAYS_UNTIL_RUNOUT
    );
    if (daysToRunout !== undefined) {
      if (minDaysToRunout === null || daysToRunout < minDaysToRunout) {
        minDaysToRunout = daysToRunout;
      }
    }

    // Extract measure and PDC
    const measure = getCodeExtension(
      obs.extension,
      EXTENSION_URLS.MA_MEASURE
    ) as MAMeasure | undefined;
    const pdc = obs.valueQuantity?.value;

    if (measure && pdc !== undefined) {
      pdcByMeasure[measure] = pdc;
    }
  }

  return {
    worstTier: getWorstTier(tiers),
    highestPriorityScore: highestPriority,
    daysUntilEarliestRunout: minDaysToRunout,
    pdcByMeasure,
    lastUpdated: new Date().toISOString(),
  };
}

// =============================================================================
// Extension Building
// =============================================================================

/**
 * Build patient extensions from summary.
 *
 * @param summary - Patient PDC summary
 * @returns Array of FHIR extensions
 */
export function buildPatientExtensions(summary: PatientPDCSummary): Extension[] {
  const extensions: Extension[] = [];

  // Current fragility tier
  extensions.push({
    url: PATIENT_EXTENSION_URLS.CURRENT_FRAGILITY_TIER,
    valueCode: summary.worstTier,
  });

  // Current priority score
  extensions.push({
    url: PATIENT_EXTENSION_URLS.CURRENT_PRIORITY_SCORE,
    valueInteger: summary.highestPriorityScore,
  });

  // Days until earliest runout
  if (summary.daysUntilEarliestRunout !== null) {
    extensions.push({
      url: PATIENT_EXTENSION_URLS.DAYS_UNTIL_EARLIEST_RUNOUT,
      valueInteger: summary.daysUntilEarliestRunout,
    });
  }

  // PDC summary (complex extension)
  const pdcSummaryExtensions: Extension[] = [];

  if (summary.pdcByMeasure.MAC !== null) {
    pdcSummaryExtensions.push({
      url: 'mac',
      valueDecimal: summary.pdcByMeasure.MAC,
    });
  }

  if (summary.pdcByMeasure.MAD !== null) {
    pdcSummaryExtensions.push({
      url: 'mad',
      valueDecimal: summary.pdcByMeasure.MAD,
    });
  }

  if (summary.pdcByMeasure.MAH !== null) {
    pdcSummaryExtensions.push({
      url: 'mah',
      valueDecimal: summary.pdcByMeasure.MAH,
    });
  }

  pdcSummaryExtensions.push({
    url: 'lastUpdated',
    valueDateTime: summary.lastUpdated,
  });

  extensions.push({
    url: PATIENT_EXTENSION_URLS.CURRENT_PDC_SUMMARY,
    extension: pdcSummaryExtensions,
  });

  return extensions;
}

// =============================================================================
// Patient Update Functions
// =============================================================================

/**
 * Update patient extensions with current PDC summary.
 *
 * This function:
 * 1. Fetches all current PDC observations for the patient
 * 2. Calculates the aggregated summary
 * 3. Updates the patient's extensions
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient ID
 * @returns Update result
 */
export async function updatePatientExtensions(
  medplum: MedplumClient,
  patientId: string
): Promise<PatientExtensionUpdateResult> {
  // Fetch all current PDC observations for this patient
  const observations = await getAllCurrentPDCObservations(medplum, patientId);

  // Calculate summary
  const summary = calculatePatientSummary(observations);

  // Build new extensions
  const newExtensions = buildPatientExtensions(summary);

  // Fetch current patient
  const patient = await medplum.readResource('Patient', patientId);

  // Remove existing PDC-related extensions
  const filteredExtensions = (patient.extension || []).filter(
    (ext) =>
      !ext.url?.startsWith(PATIENT_EXTENSION_URLS.CURRENT_FRAGILITY_TIER) &&
      !ext.url?.startsWith(PATIENT_EXTENSION_URLS.CURRENT_PRIORITY_SCORE) &&
      !ext.url?.startsWith(PATIENT_EXTENSION_URLS.DAYS_UNTIL_EARLIEST_RUNOUT) &&
      !ext.url?.startsWith(PATIENT_EXTENSION_URLS.CURRENT_PDC_SUMMARY)
  );

  // Add new extensions
  const updatedPatient = await medplum.updateResource({
    ...patient,
    extension: [...filteredExtensions, ...newExtensions],
  });

  return {
    patient: updatedPatient as Patient,
    summary,
    observationsProcessed: observations.length,
  };
}

/**
 * Update patient extensions from a single observation.
 *
 * This is a lighter-weight update when you only have one new observation.
 * It still fetches all current observations to calculate the aggregate.
 *
 * @param medplum - Medplum client instance
 * @param observation - The new/updated PDC observation
 * @returns Update result
 */
export async function updatePatientExtensionsFromObservation(
  medplum: MedplumClient,
  observation: Observation
): Promise<PatientExtensionUpdateResult> {
  // Extract patient ID from observation
  const patientRef = observation.subject?.reference;
  if (!patientRef) {
    throw new Error('Observation does not have a patient reference');
  }

  const patientId = patientRef.replace('Patient/', '');

  return updatePatientExtensions(medplum, patientId);
}

// =============================================================================
// Batch Update Functions
// =============================================================================

/**
 * Update extensions for multiple patients.
 *
 * Useful for batch processing or initial data load.
 *
 * @param medplum - Medplum client instance
 * @param patientIds - Array of patient IDs
 * @param onProgress - Optional progress callback
 * @returns Array of update results
 */
export async function batchUpdatePatientExtensions(
  medplum: MedplumClient,
  patientIds: string[],
  onProgress?: (current: number, total: number) => void
): Promise<PatientExtensionUpdateResult[]> {
  const results: PatientExtensionUpdateResult[] = [];

  for (let i = 0; i < patientIds.length; i++) {
    const patientId = patientIds[i];

    try {
      const result = await updatePatientExtensions(medplum, patientId);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, patientIds.length);
      }
    } catch (error) {
      console.error(`Failed to update patient ${patientId}:`, error);
      // Continue with next patient
    }
  }

  return results;
}

/**
 * Update extensions for all patients with PDC observations.
 *
 * This is for initial setup or full refresh.
 *
 * @param medplum - Medplum client instance
 * @param onProgress - Optional progress callback
 * @returns Array of update results
 */
export async function updateAllPatientExtensions(
  medplum: MedplumClient,
  onProgress?: (current: number, total: number) => void
): Promise<PatientExtensionUpdateResult[]> {
  // Find all patients with current PDC observations
  const observations = await medplum.searchResources('Observation', {
    'is-current-pdc': 'true',
    _elements: 'subject',
  });

  // Extract unique patient IDs
  const patientIds = [
    ...new Set(
      observations
        .map((obs) => obs.subject?.reference?.replace('Patient/', ''))
        .filter((id): id is string => !!id)
    ),
  ];

  console.log(`Found ${patientIds.length} patients with PDC observations`);

  return batchUpdatePatientExtensions(medplum, patientIds, onProgress);
}

// =============================================================================
// Extraction Functions (for reading patient extensions)
// =============================================================================

/**
 * Extract PDC summary from patient extensions.
 *
 * @param patient - Patient resource
 * @returns PDC summary or null if not set
 */
export function extractPatientPDCSummary(
  patient: Patient
): PatientPDCSummary | null {
  if (!patient.extension) return null;

  const tierExt = patient.extension.find(
    (e) => e.url === PATIENT_EXTENSION_URLS.CURRENT_FRAGILITY_TIER
  );
  const priorityExt = patient.extension.find(
    (e) => e.url === PATIENT_EXTENSION_URLS.CURRENT_PRIORITY_SCORE
  );
  const runoutExt = patient.extension.find(
    (e) => e.url === PATIENT_EXTENSION_URLS.DAYS_UNTIL_EARLIEST_RUNOUT
  );
  const summaryExt = patient.extension.find(
    (e) => e.url === PATIENT_EXTENSION_URLS.CURRENT_PDC_SUMMARY
  );

  if (!tierExt && !priorityExt) return null;

  // Parse PDC by measure from nested extension
  const pdcByMeasure: PatientPDCSummary['pdcByMeasure'] = {
    MAC: null,
    MAD: null,
    MAH: null,
  };

  let lastUpdated = new Date().toISOString();

  if (summaryExt?.extension) {
    for (const ext of summaryExt.extension) {
      if (ext.url === 'mac' && ext.valueDecimal !== undefined) {
        pdcByMeasure.MAC = ext.valueDecimal;
      } else if (ext.url === 'mad' && ext.valueDecimal !== undefined) {
        pdcByMeasure.MAD = ext.valueDecimal;
      } else if (ext.url === 'mah' && ext.valueDecimal !== undefined) {
        pdcByMeasure.MAH = ext.valueDecimal;
      } else if (ext.url === 'lastUpdated' && ext.valueDateTime) {
        lastUpdated = ext.valueDateTime;
      }
    }
  }

  return {
    worstTier: (tierExt?.valueCode as FragilityTier) || 'COMPLIANT',
    highestPriorityScore: priorityExt?.valueInteger || 0,
    daysUntilEarliestRunout: runoutExt?.valueInteger ?? null,
    pdcByMeasure,
    lastUpdated,
  };
}
