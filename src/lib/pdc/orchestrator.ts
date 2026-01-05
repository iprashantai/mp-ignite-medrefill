/**
 * PDC Orchestrator
 *
 * Orchestrates all Phase 1/1.5 services to calculate and store PDC data
 * for a single patient. This is the main entry point for the nightly bot
 * and on-demand PDC calculations.
 *
 * Flow:
 * 1. Fetch all dispenses for patient
 * 2. Group by measure (MAC/MAD/MAH)
 * 3. For each measure:
 *    a. Group by medication (RxNorm)
 *    b. Calculate medication-level PDC
 *    c. Store medication-level Observation
 *    d. Calculate measure-level PDC (HEDIS merged)
 *    e. Store measure-level Observation
 * 4. Update Patient extensions with aggregated summary
 *
 * @module @/lib/pdc/orchestrator
 */

import type { MedplumClient } from '@medplum/core';
import type { MedicationDispense, Observation, Patient } from '@medplum/fhirtypes';
import type { MAMeasure, FragilityTier } from '@/lib/fhir/types';
import type { PDCResult } from './types';
import type { FragilityResult } from './fragility-types';

// Phase 1 Services
import {
  getPatientDispenses,
  classifyDispenseByMeasure,
  extractMedicationCode,
  dispensesToFillRecords,
} from '@/lib/fhir/dispense-service';
import { storePDCObservation, type PDCObservationInput } from '@/lib/fhir/observation-service';
import { updatePatientExtensions, type PatientPDCSummary } from '@/lib/fhir/patient-extensions';

// Phase 1.5 Services
import {
  storeMedicationPDCObservation,
  type MedicationPDCObservationInput,
} from '@/lib/fhir/medication-observation-service';
import {
  calculateCoverageShortfall,
  calculateRemainingRefills,
  calculateSupplyOnHand,
  calculateDaysToYearEnd,
} from './refill-calculator';

// Core calculation
import { calculatePDC, calculatePDCFromDispenses } from './calculator';
import { calculateFragility } from './fragility';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for PDC calculation.
 */
export interface PDCOrchestratorOptions {
  /** Measurement year (default: current year) */
  measurementYear?: number;
  /** Current date for calculations (default: today) */
  currentDate?: Date;
  /** Include medication-level observations (default: true) */
  includeMedicationLevel?: boolean;
  /** Update patient extensions after calculation (default: true) */
  updatePatientExtensions?: boolean;
}

/**
 * Result of single medication PDC calculation.
 */
export interface MedicationPDCResult {
  rxnormCode: string;
  displayName: string;
  pdc: number;
  pdcStatusQuo: number;
  pdcPerfect: number;
  fragilityTier: FragilityTier;
  priorityScore: number;
  daysUntilRunout: number;
  supplyOnHand: number;
  remainingRefills: number;
  observationId?: string;
}

/**
 * Result of single measure PDC calculation.
 */
export interface MeasurePDCResult {
  measure: MAMeasure;
  pdc: number;
  pdcStatusQuo: number;
  pdcPerfect: number;
  fragilityTier: FragilityTier;
  priorityScore: number;
  daysUntilRunout: number;
  gapDaysRemaining: number;
  delayBudget: number;
  medications: MedicationPDCResult[];
  observationId?: string;
}

/**
 * Complete orchestrator result for a patient.
 */
export interface PDCOrchestratorResult {
  patientId: string;
  measurementYear: number;
  calculatedAt: string;
  measures: MeasurePDCResult[];
  summary: PatientPDCSummary | null;
  patient?: Patient;
  errors: string[];
}

// =============================================================================
// Grouping Utilities
// =============================================================================

/**
 * Group dispenses by MA measure type.
 */
export function groupDispensesByMeasure(
  dispenses: MedicationDispense[]
): Map<MAMeasure, MedicationDispense[]> {
  const grouped = new Map<MAMeasure, MedicationDispense[]>();

  for (const dispense of dispenses) {
    const measure = classifyDispenseByMeasure(dispense);
    if (!measure) continue; // Skip non-MA medications

    const existing = grouped.get(measure) || [];
    existing.push(dispense);
    grouped.set(measure, existing);
  }

  return grouped;
}

/**
 * Group dispenses by medication (RxNorm code).
 */
export function groupDispensesByMedication(
  dispenses: MedicationDispense[]
): Map<string, { dispenses: MedicationDispense[]; displayName: string }> {
  const grouped = new Map<string, { dispenses: MedicationDispense[]; displayName: string }>();

  for (const dispense of dispenses) {
    const rxnormCode = extractMedicationCode(dispense);
    if (!rxnormCode) continue;

    // Get display name from medication
    const displayName =
      dispense.medicationCodeableConcept?.coding?.find(
        (c) => c.system === 'http://www.nlm.nih.gov/research/umls/rxnorm'
      )?.display ||
      dispense.medicationCodeableConcept?.text ||
      rxnormCode;

    const existing = grouped.get(rxnormCode) || { dispenses: [], displayName };
    existing.dispenses.push(dispense);
    grouped.set(rxnormCode, existing);
  }

  return grouped;
}

// =============================================================================
// Medication-Level PDC Calculation
// =============================================================================

/**
 * Calculate and store medication-level PDC for a single medication.
 */
async function calculateMedicationPDC(
  medplum: MedplumClient,
  patientId: string,
  measure: MAMeasure,
  rxnormCode: string,
  displayName: string,
  dispenses: MedicationDispense[],
  allMeasureTypes: MAMeasure[],
  options: Required<PDCOrchestratorOptions>,
  parentObservationId?: string
): Promise<MedicationPDCResult> {
  const { measurementYear, currentDate } = options;

  // Calculate PDC for this single medication
  const pdcResult = calculatePDCFromDispenses(dispenses, measurementYear, currentDate);

  // Get refills remaining based on coverage shortfall
  const fillRecords = dispensesToFillRecords(dispenses);
  const lastFill = fillRecords.length > 0 ? fillRecords[fillRecords.length - 1] : null;

  // Calculate supply on hand
  const supplyOnHand = lastFill
    ? calculateSupplyOnHand(dispenses[dispenses.length - 1], currentDate)
    : 0;

  // Calculate days to year end
  const daysToYearEnd = calculateDaysToYearEnd(currentDate);

  // Calculate coverage shortfall
  const coverageShortfall = calculateCoverageShortfall({
    daysRemainingUntilYearEnd: daysToYearEnd,
    daysOfSupplyOnHand: supplyOnHand,
  });

  // Calculate remaining refills
  const refillResult = calculateRemainingRefills({
    coverageShortfall,
    recentFills: dispenses,
  });

  // Calculate fragility tier for this medication
  const fragilityResult = calculateFragility({
    pdcResult,
    refillsRemaining: refillResult.remainingRefills,
    measureTypes: allMeasureTypes,
    isNewPatient: false, // TODO: Determine from first fill date
    currentDate,
  });

  // Store medication-level observation
  const observationInput: MedicationPDCObservationInput = {
    patientId,
    measure,
    medicationRxnorm: rxnormCode,
    medicationDisplay: displayName,
    pdc: pdcResult.pdc / 100, // Convert to ratio
    pdcStatusQuo: pdcResult.pdcStatusQuo / 100,
    pdcPerfect: pdcResult.pdcPerfect / 100,
    coveredDays: pdcResult.coveredDays,
    treatmentDays: pdcResult.treatmentDays,
    gapDaysRemaining: pdcResult.gapDaysRemaining,
    delayBudget: Math.round(fragilityResult.delayBudgetPerRefill),
    daysUntilRunout: pdcResult.daysUntilRunout,
    fragilityTier: fragilityResult.tier,
    priorityScore: fragilityResult.priorityScore,
    q4Adjusted: fragilityResult.flags.q4Tightened,
    treatmentPeriod: {
      start: pdcResult.measurementPeriod.start.toISOString().split('T')[0],
      end: pdcResult.measurementPeriod.end.toISOString().split('T')[0],
    },
    estimatedDaysPerRefill: refillResult.estimatedDaysPerRefill,
    remainingRefills: refillResult.remainingRefills,
    supplyOnHand,
    coverageShortfall,
    parentObservationId,
  };

  const observation = await storeMedicationPDCObservation(medplum, observationInput);

  return {
    rxnormCode,
    displayName,
    pdc: pdcResult.pdc,
    pdcStatusQuo: pdcResult.pdcStatusQuo,
    pdcPerfect: pdcResult.pdcPerfect,
    fragilityTier: fragilityResult.tier,
    priorityScore: fragilityResult.priorityScore,
    daysUntilRunout: pdcResult.daysUntilRunout,
    supplyOnHand,
    remainingRefills: refillResult.remainingRefills,
    observationId: observation.id,
  };
}

// =============================================================================
// Measure-Level PDC Calculation
// =============================================================================

/**
 * Calculate and store measure-level PDC for a single measure.
 */
async function calculateMeasurePDC(
  medplum: MedplumClient,
  patientId: string,
  measure: MAMeasure,
  dispenses: MedicationDispense[],
  allMeasureTypes: MAMeasure[],
  options: Required<PDCOrchestratorOptions>
): Promise<MeasurePDCResult> {
  const { measurementYear, currentDate, includeMedicationLevel } = options;

  // Calculate measure-level PDC (HEDIS interval merging across all medications)
  const pdcResult = calculatePDCFromDispenses(dispenses, measurementYear, currentDate);

  // Calculate fragility tier for measure
  const fragilityResult = calculateFragility({
    pdcResult,
    refillsRemaining: pdcResult.refillsNeeded,
    measureTypes: allMeasureTypes,
    isNewPatient: false,
    currentDate,
  });

  // Store measure-level observation first
  const measureObservationInput: PDCObservationInput = {
    patientId,
    measure,
    pdc: pdcResult.pdc / 100, // Convert to ratio
    pdcStatusQuo: pdcResult.pdcStatusQuo / 100,
    pdcPerfect: pdcResult.pdcPerfect / 100,
    coveredDays: pdcResult.coveredDays,
    treatmentDays: pdcResult.treatmentDays,
    gapDaysRemaining: pdcResult.gapDaysRemaining,
    delayBudget: Math.round(fragilityResult.delayBudgetPerRefill),
    daysUntilRunout: pdcResult.daysUntilRunout,
    fragilityTier: fragilityResult.tier,
    priorityScore: fragilityResult.priorityScore,
    q4Adjusted: fragilityResult.flags.q4Tightened,
    treatmentPeriod: {
      start: pdcResult.measurementPeriod.start.toISOString().split('T')[0],
      end: pdcResult.measurementPeriod.end.toISOString().split('T')[0],
    },
  };

  const measureObservation = await storePDCObservation(medplum, measureObservationInput);

  // Calculate medication-level PDC if enabled
  const medications: MedicationPDCResult[] = [];

  if (includeMedicationLevel) {
    const groupedByMedication = groupDispensesByMedication(dispenses);

    for (const [rxnormCode, { dispenses: medDispenses, displayName }] of groupedByMedication) {
      try {
        const medResult = await calculateMedicationPDC(
          medplum,
          patientId,
          measure,
          rxnormCode,
          displayName,
          medDispenses,
          allMeasureTypes,
          options,
          measureObservation.id
        );
        medications.push(medResult);
      } catch (error) {
        console.error(`Failed to calculate medication PDC for ${rxnormCode}:`, error);
        // Continue with other medications
      }
    }
  }

  return {
    measure,
    pdc: pdcResult.pdc,
    pdcStatusQuo: pdcResult.pdcStatusQuo,
    pdcPerfect: pdcResult.pdcPerfect,
    fragilityTier: fragilityResult.tier,
    priorityScore: fragilityResult.priorityScore,
    daysUntilRunout: pdcResult.daysUntilRunout,
    gapDaysRemaining: pdcResult.gapDaysRemaining,
    delayBudget: Math.round(fragilityResult.delayBudgetPerRefill),
    medications,
    observationId: measureObservation.id,
  };
}

// =============================================================================
// Main Orchestrator Function
// =============================================================================

/**
 * Calculate and store all PDC data for a single patient.
 *
 * This is the main entry point for:
 * - Nightly batch processing
 * - On-demand recalculation
 * - Initial data population
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param options - Calculation options
 * @returns Complete PDC result with all measures and medications
 *
 * @example
 * ```typescript
 * const result = await calculateAndStorePatientPDC(medplum, 'patient-123', {
 *   measurementYear: 2025,
 *   includeMedicationLevel: true,
 * });
 *
 * console.log(result.measures); // MAC, MAD, MAH results
 * console.log(result.summary);  // Patient-level summary
 * ```
 */
export async function calculateAndStorePatientPDC(
  medplum: MedplumClient,
  patientId: string,
  options: PDCOrchestratorOptions = {}
): Promise<PDCOrchestratorResult> {
  const errors: string[] = [];

  // Set defaults
  const resolvedOptions: Required<PDCOrchestratorOptions> = {
    measurementYear: options.measurementYear ?? new Date().getFullYear(),
    currentDate: options.currentDate ?? new Date(),
    includeMedicationLevel: options.includeMedicationLevel ?? true,
    updatePatientExtensions: options.updatePatientExtensions ?? true,
  };

  const result: PDCOrchestratorResult = {
    patientId,
    measurementYear: resolvedOptions.measurementYear,
    calculatedAt: new Date().toISOString(),
    measures: [],
    summary: null,
    errors,
  };

  try {
    // Step 1: Fetch all dispenses for patient
    const dispenses = await getPatientDispenses(
      medplum,
      patientId,
      resolvedOptions.measurementYear
    );

    if (dispenses.length === 0) {
      errors.push('No dispenses found for patient in measurement year');
      return result;
    }

    // Step 2: Group by measure
    const groupedByMeasure = groupDispensesByMeasure(dispenses);

    if (groupedByMeasure.size === 0) {
      errors.push('No MA-qualifying medications found in dispenses');
      return result;
    }

    // Get all measure types for multi-MA bonus calculation
    const allMeasureTypes = Array.from(groupedByMeasure.keys());

    // Step 3: Process each measure
    for (const [measure, measureDispenses] of groupedByMeasure) {
      try {
        const measureResult = await calculateMeasurePDC(
          medplum,
          patientId,
          measure,
          measureDispenses,
          allMeasureTypes,
          resolvedOptions
        );
        result.measures.push(measureResult);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : `Unknown error processing ${measure}`;
        errors.push(`Failed to process ${measure}: ${errorMessage}`);
        console.error(`Failed to process ${measure} for patient ${patientId}:`, error);
      }
    }

    // Step 4: Update patient extensions if enabled
    if (resolvedOptions.updatePatientExtensions && result.measures.length > 0) {
      try {
        const extensionResult = await updatePatientExtensions(medplum, patientId);
        result.summary = extensionResult.summary;
        result.patient = extensionResult.patient;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error updating patient extensions';
        errors.push(`Failed to update patient extensions: ${errorMessage}`);
        console.error(`Failed to update extensions for patient ${patientId}:`, error);
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Orchestrator failed: ${errorMessage}`);
    console.error(`Orchestrator failed for patient ${patientId}:`, error);
    return result;
  }
}

// =============================================================================
// Batch Processing Helper
// =============================================================================

/**
 * Result of batch PDC calculation.
 */
export interface BatchPDCResult {
  totalPatients: number;
  successCount: number;
  errorCount: number;
  results: PDCOrchestratorResult[];
  duration: number;
}

/**
 * Calculate PDC for multiple patients.
 *
 * Used by the nightly bot for batch processing.
 *
 * @param medplum - Medplum client instance
 * @param patientIds - Array of patient IDs to process
 * @param options - Calculation options
 * @param onProgress - Optional progress callback
 * @returns Batch result with individual results
 */
export async function calculateBatchPatientPDC(
  medplum: MedplumClient,
  patientIds: string[],
  options: PDCOrchestratorOptions = {},
  onProgress?: (current: number, total: number, patientId: string) => void
): Promise<BatchPDCResult> {
  const startTime = Date.now();
  const results: PDCOrchestratorResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < patientIds.length; i++) {
    const patientId = patientIds[i];

    if (onProgress) {
      onProgress(i + 1, patientIds.length, patientId);
    }

    try {
      const result = await calculateAndStorePatientPDC(medplum, patientId, options);
      results.push(result);

      if (result.errors.length === 0 && result.measures.length > 0) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      errorCount++;
      results.push({
        patientId,
        measurementYear: options.measurementYear ?? new Date().getFullYear(),
        calculatedAt: new Date().toISOString(),
        measures: [],
        summary: null,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  }

  return {
    totalPatients: patientIds.length,
    successCount,
    errorCount,
    results,
    duration: Date.now() - startTime,
  };
}
