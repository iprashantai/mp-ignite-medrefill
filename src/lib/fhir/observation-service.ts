/**
 * PDC Observation Service
 *
 * Provides functions to store and retrieve PDC Observation resources.
 *
 * @see docs/implementation/phase-1-core-engine/specs/01_FHIR_SERVICES_SPEC.md
 * @see docs/implementation/phase-1-core-engine/specs/05_FHIR_EXTENSIONS_SPEC.md
 */

import type { MedplumClient } from '@medplum/core';
import type { Observation, Extension } from '@medplum/fhirtypes';
import {
  OBSERVATION_EXTENSION_URLS,
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
} from './helpers';
import { PDC_THRESHOLDS } from '@/lib/pdc/constants';

/* eslint-disable no-console */

// =============================================================================
// Types
// =============================================================================

/**
 * Input for creating a PDC Observation.
 */
export interface PDCObservationInput {
  patientId: string;
  measure: MAMeasure;
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
}

/**
 * Parsed PDC Observation result.
 */
export interface ParsedPDCObservation {
  pdc: number;
  measure: MAMeasure | null;
  fragilityTier: FragilityTier | null;
  priorityScore: number | null;
  gapDaysRemaining: number | null;
  delayBudget: number | null;
  daysUntilRunout: number | null;
  q4Adjusted: boolean | null;
  isCurrentPDC: boolean | null;
  effectiveDateTime: string | null;
  patientId: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Observation codes for each MA measure.
 */
const OBSERVATION_CODES: Record<MAMeasure, { code: string; display: string }> = {
  MAC: { code: 'pdc-mac', display: 'PDC Score - Cholesterol (MAC)' },
  MAD: { code: 'pdc-mad', display: 'PDC Score - Diabetes (MAD)' },
  MAH: { code: 'pdc-mah', display: 'PDC Score - Hypertension (MAH)' },
};

/**
 * Default result limit for history queries.
 */
const DEFAULT_HISTORY_LIMIT = 10;

// =============================================================================
// Store Functions
// =============================================================================

/**
 * Create a PDC Observation for a patient.
 *
 * @param medplum - Medplum client instance
 * @param input - PDC observation input data
 * @returns Created Observation resource
 *
 * @example
 * const obs = await storePDCObservation(medplum, {
 *   patientId: 'patient-123',
 *   measure: 'MAC',
 *   pdc: 0.72,
 *   // ... other fields
 * });
 */
export async function storePDCObservation(
  medplum: MedplumClient,
  input: PDCObservationInput
): Promise<Observation> {
  // Mark previous observations as not current
  await markPreviousObservationsNotCurrent(medplum, input.patientId, input.measure);

  // Build observation resource
  const observation = buildPDCObservation(input);

  // Create in Medplum
  const created = await medplum.createResource(observation);

  return created as Observation;
}

/**
 * Build a PDC Observation resource from input data.
 */
function buildPDCObservation(input: PDCObservationInput): Observation {
  const {
    patientId,
    measure,
    pdc,
    fragilityTier,
    priorityScore,
    gapDaysRemaining,
    delayBudget,
    daysUntilRunout,
    q4Adjusted,
    treatmentPeriod,
  } = input;

  // Calculate interpretation
  const interpretation = getInterpretation(pdc);

  // Build extensions
  let extensions: Extension[] = [];
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER, {
    valueCode: fragilityTier,
  });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE, {
    valueInteger: priorityScore,
  });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC, {
    valueBoolean: true,
  });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.MA_MEASURE, {
    valueCode: measure,
  });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.DAYS_UNTIL_RUNOUT, {
    valueInteger: daysUntilRunout,
  });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.GAP_DAYS_REMAINING, {
    valueInteger: gapDaysRemaining,
  });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.DELAY_BUDGET, {
    valueInteger: delayBudget,
  });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.TREATMENT_PERIOD, {
    valuePeriod: treatmentPeriod,
  });
  extensions = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.Q4_ADJUSTED, {
    valueBoolean: q4Adjusted,
  });

  return {
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'survey',
            display: 'Survey',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: CODE_SYSTEM_URLS.ADHERENCE_METRICS,
          code: OBSERVATION_CODES[measure].code,
          display: OBSERVATION_CODES[measure].display,
        },
      ],
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: pdc,
      unit: 'ratio',
      system: 'http://unitsofmeasure.org',
      code: '1',
    },
    interpretation: [
      {
        coding: [
          {
            system: 'https://ignitehealth.io/fhir/CodeSystem/adherence-status',
            code: interpretation,
            display: getInterpretationDisplay(interpretation),
          },
        ],
      },
    ],
    extension: extensions,
  };
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
 * Fetch the most recent PDC Observation for a patient and measure.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - MA measure type
 * @returns Latest Observation or null if none exists
 */
export async function getLatestPDCObservation(
  medplum: MedplumClient,
  patientId: string,
  measure: MAMeasure
): Promise<Observation | null> {
  const observations = await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${OBSERVATION_CODES[measure].code}`,
    _sort: '-date',
    _count: 1,
  });

  return (observations as Observation[])[0] ?? null;
}

/**
 * Fetch the current PDC Observation (is-current-pdc=true) for a patient and measure.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - MA measure type
 * @returns Current Observation or null if none exists
 */
export async function getCurrentPDCObservation(
  medplum: MedplumClient,
  patientId: string,
  measure: MAMeasure
): Promise<Observation | null> {
  console.log(`🔍 Searching for ${measure} PDC observation for patient ${patientId}`);

  // Strategy 1: Try with full code system URL
  let allObservations = await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${OBSERVATION_CODES[measure].code}`,
    _sort: '-date',
    _count: '100',
  });

  console.log(
    `📋 Strategy 1 (full code system): Found ${allObservations.length} ${measure} observations`
  );

  // Strategy 2: If nothing found, try with just the code (no system)
  if (allObservations.length === 0) {
    console.log(`⚠️  Trying without code system...`);
    allObservations = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      code: OBSERVATION_CODES[measure].code,
      _sort: '-date',
      _count: '100',
    });
    console.log(
      `📋 Strategy 2 (code only): Found ${allObservations.length} ${measure} observations`
    );
  }

  // Strategy 3: If still nothing, get ALL observations for this patient and filter client-side
  if (allObservations.length === 0) {
    console.log(`⚠️  Getting ALL observations for patient to search client-side...`);
    const allPatientObs = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      _sort: '-date',
      _count: '1000',
    });

    console.log(`📋 Found ${allPatientObs.length} total observations for patient`);

    // Filter for this measure by checking code.coding array
    const filtered = allPatientObs.filter((obs) => {
      const codings = obs.code?.coding || [];
      return codings.some(
        (coding) =>
          coding.code === OBSERVATION_CODES[measure].code ||
          coding.display?.includes(measure) ||
          coding.display?.includes(OBSERVATION_CODES[measure].display)
      );
    });
    // Cast to ResourceArray type
    allObservations = filtered as typeof allObservations;

    console.log(
      `📋 Strategy 3 (client-side filter): Found ${allObservations.length} ${measure} observations`
    );
  }

  if (allObservations.length === 0) {
    console.log(
      `❌ No ${measure} observations found for patient ${patientId} after all strategies`
    );
    return null;
  }

  // Try to find one marked as current
  let current = (allObservations as Observation[]).find((obs) => {
    return getBooleanExtension(obs.extension, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC) === true;
  });

  // If no observation marked as current, use the most recent one
  if (!current) {
    console.log(`⚠️  No observation marked as current, using most recent ${measure} observation`);
    current = allObservations[0] as Observation;
  }

  console.log(`✅ Selected ${measure} observation:`, {
    id: current.id,
    date: current.effectiveDateTime,
    pdc: current.valueQuantity?.value,
    code: current.code?.coding?.[0],
  });

  return current;
}

/**
 * Fetch PDC Observation history for a patient and measure.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - MA measure type
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of Observations sorted by date descending
 */
export async function getPDCObservationHistory(
  medplum: MedplumClient,
  patientId: string,
  measure: MAMeasure,
  limit: number = DEFAULT_HISTORY_LIMIT
): Promise<Observation[]> {
  const observations = await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${OBSERVATION_CODES[measure].code}`,
    _sort: '-date',
    _count: limit,
  });

  return observations as Observation[];
}

// =============================================================================
// Parse Functions
// =============================================================================

/**
 * Parse PDC Observation back into a structured result.
 *
 * @param observation - FHIR Observation resource
 * @returns Parsed PDC data
 */
// eslint-disable-next-line complexity
export function parsePDCObservation(observation: Observation): ParsedPDCObservation {
  const extensions = observation.extension;

  // Extract PDC value
  const pdc = observation.valueQuantity?.value ?? 0;

  // Extract measure from code
  const codeStr = observation.code?.coding?.[0]?.code ?? '';
  let measure: MAMeasure | null = null;
  if (codeStr.includes('mac')) measure = 'MAC';
  else if (codeStr.includes('mad')) measure = 'MAD';
  else if (codeStr.includes('mah')) measure = 'MAH';

  // Also check extension
  const measureFromExt = getCodeExtension(extensions, OBSERVATION_EXTENSION_URLS.MA_MEASURE);
  if (measureFromExt === 'MAC' || measureFromExt === 'MAD' || measureFromExt === 'MAH') {
    measure = measureFromExt;
  }

  // Extract patient ID
  const patientRef = observation.subject?.reference;
  const patientId = patientRef?.replace('Patient/', '') ?? null;

  // Extract extensions (convert undefined to null for consistent API)
  const fragilityTierRaw = getCodeExtension(extensions, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER);
  const fragilityTier = (fragilityTierRaw as FragilityTier | null) ?? null;

  const priorityScore =
    getIntegerExtension(extensions, OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE) ?? null;

  const gapDaysRemaining =
    getIntegerExtension(extensions, OBSERVATION_EXTENSION_URLS.GAP_DAYS_REMAINING) ?? null;

  const delayBudget =
    getIntegerExtension(extensions, OBSERVATION_EXTENSION_URLS.DELAY_BUDGET) ?? null;

  const daysUntilRunout =
    getIntegerExtension(extensions, OBSERVATION_EXTENSION_URLS.DAYS_UNTIL_RUNOUT) ?? null;

  const q4Adjusted =
    getBooleanExtension(extensions, OBSERVATION_EXTENSION_URLS.Q4_ADJUSTED) ?? null;

  const isCurrentPDC =
    getBooleanExtension(extensions, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC) ?? null;

  return {
    pdc,
    measure,
    fragilityTier,
    priorityScore,
    gapDaysRemaining,
    delayBudget,
    daysUntilRunout,
    q4Adjusted,
    isCurrentPDC,
    effectiveDateTime: observation.effectiveDateTime ?? null,
    patientId,
  };
}

// =============================================================================
// Update Functions
// =============================================================================

/**
 * Mark all previous current observations as not current for a patient-measure.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - MA measure type
 */
export async function markPreviousObservationsNotCurrent(
  medplum: MedplumClient,
  patientId: string,
  measure: MAMeasure
): Promise<void> {
  let currentObservations: Observation[];

  try {
    // Try using custom search parameter first
    currentObservations = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${OBSERVATION_CODES[measure].code}`,
      'is-current-pdc': 'true',
    });
  } catch {
    // Fallback: search all observations for this patient-measure and filter client-side
    // This is needed when the custom SearchParameter hasn't been indexed yet
    const allObservations = await medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      code: `${CODE_SYSTEM_URLS.ADHERENCE_METRICS}|${OBSERVATION_CODES[measure].code}`,
    });

    currentObservations = (allObservations as Observation[]).filter((obs) => {
      return getBooleanExtension(obs.extension, OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC) === true;
    });
  }

  // Update each to set is-current-pdc to false
  for (const obs of currentObservations as Observation[]) {
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

/**
 * Get all current PDC observations for a patient across all measures.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @returns Map of measure to current observation
 */
export async function getAllCurrentPDCObservations(
  medplum: MedplumClient,
  patientId: string
): Promise<Map<MAMeasure, Observation>> {
  const result = new Map<MAMeasure, Observation>();

  for (const measure of ['MAC', 'MAD', 'MAH'] as MAMeasure[]) {
    const obs = await getCurrentPDCObservation(medplum, patientId, measure);
    if (obs) {
      result.set(measure, obs);
    }
  }

  return result;
}
