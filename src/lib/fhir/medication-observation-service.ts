/**
 * Medication PDC Observation Service
 *
 * Provides functions to store and retrieve medication-level PDC Observation resources.
 * Each individual medication gets its own Observation, separate from measure-level aggregates.
 *
 * @see docs/implementation/phase-1-core-engine/specs/01_FHIR_SERVICES_SPEC.md
 * @see docs/implementation/phase-1-core-engine/specs/05_FHIR_EXTENSIONS_SPEC.md
 */

import type { MedplumClient } from '@medplum/core';
import type { Observation, Extension } from '@medplum/fhirtypes';
import {
  OBSERVATION_EXTENSION_URLS,
  MEDICATION_OBSERVATION_EXTENSION_URLS,
  CODE_SYSTEM_URLS,
  type MAMeasure,
  type FragilityTier,
  type TreatmentPeriod,
} from './types';
import {
  setExtensionValue,
  getCodeExtension,
  getIntegerExtension,
  getBooleanExtension,
  getStringExtension,
} from './helpers';
import { PDC_THRESHOLDS } from '@/lib/pdc/constants';

// =============================================================================
// Types
// =============================================================================

/**
 * Input for creating a Medication-Level PDC Observation.
 */
export interface MedicationPDCObservationInput {
  patientId: string;
  measure: MAMeasure;
  medicationRxnorm: string;
  medicationDisplay: string;
  pdc: number; // 0-1 ratio
  pdcStatusQuo: number;
  pdcPerfect: number;
  coveredDays: number;
  treatmentDays: number;
  gapDaysRemaining: number;
  delayBudget: number;
  daysUntilRunout: number;
  fragilityTier: FragilityTier;
  priorityScore: number;
  q4Adjusted: boolean;
  treatmentPeriod: TreatmentPeriod;
  // Medication-specific fields
  estimatedDaysPerRefill: number;
  remainingRefills: number;
  supplyOnHand: number;
  coverageShortfall: number;
  parentObservationId?: string;
}

/**
 * Parsed Medication PDC Observation result.
 */
export interface ParsedMedicationPDCObservation {
  pdc: number;
  measure: MAMeasure | null;
  medicationRxnorm: string | null;
  medicationDisplay: string | null;
  fragilityTier: FragilityTier | null;
  priorityScore: number | null;
  gapDaysRemaining: number | null;
  delayBudget: number | null;
  daysUntilRunout: number | null;
  q4Adjusted: boolean | null;
  isCurrentPDC: boolean | null;
  effectiveDateTime: string | null;
  patientId: string | null;
  // Medication-specific
  estimatedDaysPerRefill: number | null;
  remainingRefills: number | null;
  supplyOnHand: number | null;
  coverageShortfall: number | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Observation code for medication-level PDC.
 */
const MEDICATION_OBSERVATION_CODE = {
  code: 'pdc-medication',
  display: 'PDC Score - Individual Medication',
};

// =============================================================================
// Store Functions
// =============================================================================

/**
 * Create a medication-level PDC Observation for a patient.
 *
 * @param medplum - Medplum client instance
 * @param input - Medication PDC observation input data
 * @returns Created Observation resource
 */
export async function storeMedicationPDCObservation(
  medplum: MedplumClient,
  input: MedicationPDCObservationInput
): Promise<Observation> {
  // Mark previous observations as not current (for this patient-medication)
  await markPreviousMedicationObservationsNotCurrent(
    medplum,
    input.patientId,
    input.medicationRxnorm
  );

  // Build observation resource
  const observation = buildMedicationPDCObservation(input);

  // Create in Medplum
  const created = await medplum.createResource(observation);

  return created as Observation;
}

/**
 * Build shared extensions from OBSERVATION_EXTENSION_URLS.
 */
function buildSharedExtensions(input: MedicationPDCObservationInput): Extension[] {
  const { measure, fragilityTier, priorityScore, gapDaysRemaining, delayBudget, daysUntilRunout, q4Adjusted, treatmentPeriod } = input;
  let extensions: Extension[] = [];

  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER, { valueCode: fragilityTier });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE, { valueInteger: priorityScore });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC, { valueBoolean: true });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.MA_MEASURE, { valueCode: measure });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.DAYS_UNTIL_RUNOUT, { valueInteger: daysUntilRunout });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.GAP_DAYS_REMAINING, { valueInteger: gapDaysRemaining });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.DELAY_BUDGET, { valueInteger: delayBudget });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.TREATMENT_PERIOD, { valuePeriod: treatmentPeriod });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.Q4_ADJUSTED, { valueBoolean: q4Adjusted });

  return extensions;
}

/**
 * Build medication-specific extensions.
 */
function buildMedicationExtensions(
  extensions: Extension[],
  input: MedicationPDCObservationInput
): Extension[] {
  const { medicationRxnorm, medicationDisplay, estimatedDaysPerRefill, remainingRefills, supplyOnHand, coverageShortfall, parentObservationId } = input;
  let result = [...extensions];

  result = setExtensionValue(result, MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM, { valueCode: medicationRxnorm });
  result = setExtensionValue(result, MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_DISPLAY, { valueString: medicationDisplay });
  result = setExtensionValue(result, MEDICATION_OBSERVATION_EXTENSION_URLS.ESTIMATED_DAYS_PER_REFILL, { valueInteger: estimatedDaysPerRefill });
  result = setExtensionValue(result, MEDICATION_OBSERVATION_EXTENSION_URLS.REMAINING_REFILLS, { valueInteger: remainingRefills });
  result = setExtensionValue(result, MEDICATION_OBSERVATION_EXTENSION_URLS.SUPPLY_ON_HAND, { valueInteger: supplyOnHand });
  result = setExtensionValue(result, MEDICATION_OBSERVATION_EXTENSION_URLS.COVERAGE_SHORTFALL, { valueInteger: coverageShortfall });

  if (parentObservationId) {
    result = setExtensionValue(result, MEDICATION_OBSERVATION_EXTENSION_URLS.PARENT_MEASURE_OBSERVATION, {
      valueReference: { reference: `Observation/${parentObservationId}` },
    });
  }

  return result;
}

/**
 * Build the base Observation structure.
 */
function buildBaseObservation(patientId: string, pdc: number, extensions: Extension[]): Observation {
  const interpretation = getInterpretation(pdc);

  return {
    resourceType: 'Observation',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'survey', display: 'Survey' }] }],
    code: { coding: [{ system: CODE_SYSTEM_URLS.ADHERENCE_METRICS, code: MEDICATION_OBSERVATION_CODE.code, display: MEDICATION_OBSERVATION_CODE.display }] },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: { value: pdc, unit: 'ratio', system: 'http://unitsofmeasure.org', code: '1' },
    interpretation: [{ coding: [{ system: 'https://ignitehealth.io/fhir/CodeSystem/adherence-status', code: interpretation, display: getInterpretationDisplay(interpretation) }] }],
    extension: extensions,
  };
}

/**
 * Build a medication-level PDC Observation resource from input data.
 */
function buildMedicationPDCObservation(input: MedicationPDCObservationInput): Observation {
  const sharedExtensions = buildSharedExtensions(input);
  const allExtensions = buildMedicationExtensions(sharedExtensions, input);
  return buildBaseObservation(input.patientId, input.pdc, allExtensions);
}

/**
 * Get adherence interpretation based on PDC value.
 */
function getInterpretation(pdc: number): 'adherent' | 'at-risk' | 'non-adherent' {
  const pdcPercent = pdc * 100;
  if (pdcPercent >= PDC_THRESHOLDS.PASSING) return 'adherent';
  if (pdcPercent >= PDC_THRESHOLDS.AT_RISK) return 'at-risk';
  return 'non-adherent';
}

/**
 * Get display text for interpretation.
 */
function getInterpretationDisplay(interpretation: string): string {
  switch (interpretation) {
    case 'adherent':
      return 'Adherent (PDC ≥ 80%)';
    case 'at-risk':
      return 'At-Risk (PDC 60-79%)';
    case 'non-adherent':
      return 'Non-Adherent (PDC < 60%)';
    default:
      return interpretation;
  }
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Fetch the current medication PDC Observation for a patient and RxNorm code.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param rxnormCode - RxNorm code for the medication
 * @returns Current Observation or null if none exists
 */
export async function getCurrentMedicationPDCObservation(
  medplum: MedplumClient,
  patientId: string,
  rxnormCode: string
): Promise<Observation | null> {
  let allObs: Observation[];

  try {
    // Try using custom search parameter first
    allObs = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${MEDICATION_OBSERVATION_CODE.code}`,
      'is-current-pdc': 'true',
    });
  } catch {
    // Fallback: search all observations and filter client-side
    const observations = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${MEDICATION_OBSERVATION_CODE.code}`,
    });

    allObs = (observations as Observation[]).filter((obs) => {
      return getBooleanExtension(obs.extension, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC) === true;
    });
  }

  // Find the one matching the RxNorm code
  for (const obs of allObs as Observation[]) {
    const obsRx = getCodeExtension(
      obs.extension,
      MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM
    );
    if (obsRx === rxnormCode) {
      return obs;
    }
  }

  return null;
}

/**
 * Fetch all current medication PDC observations for a patient.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - Optional MA measure to filter by
 * @returns Array of current medication Observations
 */
export async function getAllCurrentMedicationPDCObservations(
  medplum: MedplumClient,
  patientId: string,
  measure?: MAMeasure
): Promise<Observation[]> {
  let observations: Observation[];

  try {
    // Try using custom search parameter first
    observations = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${MEDICATION_OBSERVATION_CODE.code}`,
      'is-current-pdc': 'true',
    });
  } catch {
    // Fallback: search all observations and filter client-side
    const allObs = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${MEDICATION_OBSERVATION_CODE.code}`,
    });

    observations = (allObs as Observation[]).filter((obs) => {
      return getBooleanExtension(obs.extension, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC) === true;
    });
  }

  // Filter by measure if specified
  if (measure) {
    return (observations as Observation[]).filter((obs) => {
      const obsMeasure = getCodeExtension(obs.extension, OBSERVATION_EXTENSION_URLS.MA_MEASURE);
      return obsMeasure === measure;
    });
  }

  return observations as Observation[];
}

// =============================================================================
// Parse Functions
// =============================================================================

/**
 * Parse shared extensions from an Observation.
 */
function parseSharedExtensions(extensions: Extension[] | undefined): {
  measure: MAMeasure | null;
  fragilityTier: FragilityTier | null;
  priorityScore: number | null;
  gapDaysRemaining: number | null;
  delayBudget: number | null;
  daysUntilRunout: number | null;
  q4Adjusted: boolean | null;
  isCurrentPDC: boolean | null;
} {
  const measureRaw = getCodeExtension(extensions, OBSERVATION_EXTENSION_URLS.MA_MEASURE);
  const measure = (measureRaw === 'MAC' || measureRaw === 'MAD' || measureRaw === 'MAH') ? measureRaw : null;
  const fragilityTierRaw = getCodeExtension(extensions, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER);

  return {
    measure,
    fragilityTier: (fragilityTierRaw as FragilityTier | null) ?? null,
    priorityScore: getIntegerExtension(extensions, OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE) ?? null,
    gapDaysRemaining: getIntegerExtension(extensions, OBSERVATION_EXTENSION_URLS.GAP_DAYS_REMAINING) ?? null,
    delayBudget: getIntegerExtension(extensions, OBSERVATION_EXTENSION_URLS.DELAY_BUDGET) ?? null,
    daysUntilRunout: getIntegerExtension(extensions, OBSERVATION_EXTENSION_URLS.DAYS_UNTIL_RUNOUT) ?? null,
    q4Adjusted: getBooleanExtension(extensions, OBSERVATION_EXTENSION_URLS.Q4_ADJUSTED) ?? null,
    isCurrentPDC: getBooleanExtension(extensions, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC) ?? null,
  };
}

/**
 * Parse medication-specific extensions from an Observation.
 */
function parseMedicationExtensions(extensions: Extension[] | undefined): {
  medicationRxnorm: string | null;
  medicationDisplay: string | null;
  estimatedDaysPerRefill: number | null;
  remainingRefills: number | null;
  supplyOnHand: number | null;
  coverageShortfall: number | null;
} {
  return {
    medicationRxnorm: getCodeExtension(extensions, MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM) ?? null,
    medicationDisplay: getStringExtension(extensions, MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_DISPLAY) ?? null,
    estimatedDaysPerRefill: getIntegerExtension(extensions, MEDICATION_OBSERVATION_EXTENSION_URLS.ESTIMATED_DAYS_PER_REFILL) ?? null,
    remainingRefills: getIntegerExtension(extensions, MEDICATION_OBSERVATION_EXTENSION_URLS.REMAINING_REFILLS) ?? null,
    supplyOnHand: getIntegerExtension(extensions, MEDICATION_OBSERVATION_EXTENSION_URLS.SUPPLY_ON_HAND) ?? null,
    coverageShortfall: getIntegerExtension(extensions, MEDICATION_OBSERVATION_EXTENSION_URLS.COVERAGE_SHORTFALL) ?? null,
  };
}

/**
 * Parse medication PDC Observation back into a structured result.
 *
 * @param observation - FHIR Observation resource
 * @returns Parsed medication PDC data
 */
export function parseMedicationPDCObservation(observation: Observation): ParsedMedicationPDCObservation {
  const pdc = observation.valueQuantity?.value ?? 0;
  const patientRef = observation.subject?.reference;
  const patientId = patientRef?.replace('Patient/', '') ?? null;
  const sharedData = parseSharedExtensions(observation.extension);
  const medicationData = parseMedicationExtensions(observation.extension);

  return {
    pdc,
    patientId,
    effectiveDateTime: observation.effectiveDateTime ?? null,
    ...sharedData,
    ...medicationData,
  };
}

// =============================================================================
// Update Functions
// =============================================================================

/**
 * Mark all previous current observations as not current for a patient-medication.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param rxnormCode - RxNorm code for the medication
 */
export async function markPreviousMedicationObservationsNotCurrent(
  medplum: MedplumClient,
  patientId: string,
  rxnormCode: string
): Promise<void> {
  let currentObservations: Observation[];

  try {
    // Try using custom search parameter first
    currentObservations = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${MEDICATION_OBSERVATION_CODE.code}`,
      'is-current-pdc': 'true',
    });
  } catch {
    // Fallback: search all observations and filter client-side
    const allObs = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${MEDICATION_OBSERVATION_CODE.code}`,
    });

    currentObservations = (allObs as Observation[]).filter((obs) => {
      return getBooleanExtension(obs.extension, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC) === true;
    });
  }

  // Filter to only those matching the RxNorm code
  const matchingObs = (currentObservations as Observation[]).filter((obs) => {
    const obsRxnorm = getCodeExtension(
      obs.extension,
      MEDICATION_OBSERVATION_EXTENSION_URLS.MEDICATION_RXNORM
    );
    return obsRxnorm === rxnormCode;
  });

  // Update each to set is-current-pdc to false
  for (const obs of matchingObs) {
    const updatedExtensions = setExtensionValue(
      obs.extension,
      OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC,
      { valueBoolean: false }
    );

    await medplum.updateResource({
      ...obs,
      extension: updatedExtensions,
    });
  }
}
