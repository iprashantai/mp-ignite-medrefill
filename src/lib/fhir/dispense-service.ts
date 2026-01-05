/**
 * MedicationDispense Service
 *
 * Provides functions to query and process MedicationDispense resources
 * for PDC calculation.
 *
 * @see docs/implementation/phase-1-core-engine/specs/01_FHIR_SERVICES_SPEC.md
 */

import type { MedplumClient } from '@medplum/core';
import type { MedicationDispense } from '@medplum/fhirtypes';
import type { MAMeasure } from './types';

// =============================================================================
// Constants
// =============================================================================

/**
 * RxNorm system URL for medication coding.
 */
const RXNORM_SYSTEM = 'http://www.nlm.nih.gov/research/umls/rxnorm';

/**
 * Default days supply when not specified on dispense.
 */
const DEFAULT_DAYS_SUPPLY = 30;

/**
 * Maximum results to fetch in a single query.
 */
const MAX_RESULTS = 1000;

/**
 * RxNorm codes for MA measure classification.
 *
 * Includes both ingredient codes and SCD (Semantic Clinical Drug) codes
 * with specific dose forms to match real dispense data.
 *
 * Note: Production should use a comprehensive RxClass lookup service.
 *
 * @see https://mor.nlm.nih.gov/RxClass/
 */
const MA_RXNORM_CODES: Record<MAMeasure, Set<string>> = {
  // MAC - Statins (HMG-CoA Reductase Inhibitors)
  MAC: new Set([
    // Ingredient codes
    '83367', // Atorvastatin
    '36567', // Simvastatin
    '301542', // Rosuvastatin
    '42463', // Pravastatin
    '6472', // Lovastatin
    '41127', // Fluvastatin
    '861634', // Pitavastatin
    // SCD codes (dose-specific)
    '617310', // atorvastatin 20 MG Oral Tablet
    '617312', // atorvastatin 40 MG Oral Tablet
    '617314', // atorvastatin 80 MG Oral Tablet
    '617318', // atorvastatin 10 MG Oral Tablet
    '200345', // simvastatin 20 MG Oral Tablet
    '312961', // simvastatin 40 MG Oral Tablet
    '859747', // rosuvastatin 10 MG Oral Tablet
    '859751', // rosuvastatin 20 MG Oral Tablet
  ]),

  // MAD - Biguanides, Sulfonylureas, DPP-4 inhibitors, etc.
  MAD: new Set([
    // Ingredient codes
    '6809', // Metformin
    '4821', // Glipizide
    '4815', // Glyburide
    '593411', // Sitagliptin
    '33738', // Pioglitazone
    '25789', // Glimepiride
    '614348', // Saxagliptin
    '857974', // Linagliptin
    '1368001', // Canagliflozin
    '1545653', // Empagliflozin
    // SCD codes (dose-specific)
    '860975', // 24 HR Metformin hydrochloride 500 MG Extended Release Oral Tablet
    '860981', // 24 HR Metformin hydrochloride 750 MG Extended Release Oral Tablet
    '861007', // Metformin hydrochloride 500 MG Oral Tablet
    '861010', // Metformin hydrochloride 850 MG Oral Tablet
    '861004', // Metformin hydrochloride 1000 MG Oral Tablet
    '310534', // Glipizide 5 MG Oral Tablet
    '310537', // Glipizide 10 MG Oral Tablet
  ]),

  // MAH - ACE Inhibitors, ARBs, and Thiazides
  MAH: new Set([
    // Ingredient codes
    '310965', // Lisinopril
    '52175', // Losartan
    '3827', // Enalapril
    '69749', // Valsartan
    '35296', // Ramipril
    '29046', // Benazepril
    '50166', // Fosinopril
    '83515', // Irbesartan
    '73494', // Olmesartan
    '321064', // Telmisartan
    // SCD codes (dose-specific)
    '314076', // lisinopril 10 MG Oral Tablet
    '314077', // lisinopril 20 MG Oral Tablet
    '314078', // lisinopril 40 MG Oral Tablet
    '314079', // lisinopril 5 MG Oral Tablet
    '979480', // losartan 50 MG Oral Tablet
    '979485', // losartan 100 MG Oral Tablet
    '979482', // losartan 25 MG Oral Tablet
    '198188', // ramipril 5 MG Oral Capsule
    '198190', // ramipril 10 MG Oral Capsule
    '310798', // Hydrochlorothiazide 25 MG Oral Tablet
    '310792', // Hydrochlorothiazide 12.5 MG Oral Capsule
    '310797', // Hydrochlorothiazide 50 MG Oral Tablet
  ]),
};

// =============================================================================
// Extraction Helpers
// =============================================================================

/**
 * Extract days supply from MedicationDispense.
 *
 * @param dispense - FHIR MedicationDispense resource
 * @returns Days supply value or 30 (default)
 *
 * @example
 * extractDaysSupply(dispense) // 30
 */
export function extractDaysSupply(dispense: MedicationDispense): number {
  const value = dispense.daysSupply?.value;

  // Return default if null, undefined, zero, or negative
  if (value === undefined || value === null || value <= 0) {
    return DEFAULT_DAYS_SUPPLY;
  }

  return value;
}

/**
 * Extract fill date from MedicationDispense.
 *
 * @param dispense - FHIR MedicationDispense resource
 * @returns Fill date or null if not available
 *
 * @example
 * extractFillDate(dispense) // Date object
 */
export function extractFillDate(dispense: MedicationDispense): Date | null {
  const whenHandedOver = dispense.whenHandedOver;

  if (!whenHandedOver) {
    return null;
  }

  const date = new Date(whenHandedOver);

  // Check if valid date
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Extract RxNorm code from MedicationDispense.
 *
 * @param dispense - FHIR MedicationDispense resource
 * @returns RxNorm code or null
 *
 * @example
 * extractMedicationCode(dispense) // "310965" (Lisinopril)
 */
export function extractMedicationCode(dispense: MedicationDispense): string | null {
  const coding = dispense.medicationCodeableConcept?.coding;

  if (!coding || coding.length === 0) {
    return null;
  }

  // Find RxNorm coding
  const rxnormCoding = coding.find((c) => c.system === RXNORM_SYSTEM);

  return rxnormCoding?.code ?? null;
}

/**
 * Classify a dispense by MA measure based on RxNorm code.
 *
 * @param dispense - FHIR MedicationDispense resource
 * @returns MA measure type or null if not an MA medication
 */
export function classifyDispenseByMeasure(dispense: MedicationDispense): MAMeasure | null {
  const rxnormCode = extractMedicationCode(dispense);

  if (!rxnormCode) {
    return null;
  }

  if (MA_RXNORM_CODES.MAC.has(rxnormCode)) return 'MAC';
  if (MA_RXNORM_CODES.MAD.has(rxnormCode)) return 'MAD';
  if (MA_RXNORM_CODES.MAH.has(rxnormCode)) return 'MAH';

  return null;
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Fetch all MedicationDispense records for a patient in a measurement year.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measurementYear - Year to fetch dispenses for
 * @returns Array of MedicationDispense resources sorted by date ascending
 *
 * @example
 * const dispenses = await getPatientDispenses(medplum, 'patient-123', 2025);
 */
export async function getPatientDispenses(
  medplum: MedplumClient,
  patientId: string,
  measurementYear: number
): Promise<MedicationDispense[]> {
  const startDate = `${measurementYear}-01-01`;
  const endDate = `${measurementYear}-12-31`;

  // Note: 'whenhandedover' is the Medplum search parameter (no hyphens)
  // Some FHIR servers use 'when-handed-over' - we try both approaches
  let dispenses: MedicationDispense[];

  try {
    // Try Medplum-style parameter first
    dispenses = await medplum.searchResources('MedicationDispense', {
      subject: `Patient/${patientId}`,
      status: 'completed',
      whenhandedover: `ge${startDate}`,
      _count: MAX_RESULTS,
    });
  } catch {
    // Fallback: fetch all completed dispenses for patient, filter by date client-side
    dispenses = await medplum.searchResources('MedicationDispense', {
      subject: `Patient/${patientId}`,
      status: 'completed',
      _count: MAX_RESULTS,
    });

    // Filter by date range client-side
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999);

    dispenses = dispenses.filter((d) => {
      const fillDate = extractFillDate(d);
      if (!fillDate) return false;
      return fillDate >= startDateObj && fillDate <= endDateObj;
    });
  }

  // Sort by fill date ascending (in case server doesn't sort)
  return (dispenses as MedicationDispense[]).sort((a, b) => {
    const dateA = extractFillDate(a);
    const dateB = extractFillDate(b);

    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Fetch MedicationDispense records filtered by MA measure type.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param measure - MA measure type (MAC/MAD/MAH)
 * @param measurementYear - Year to fetch dispenses for
 * @returns Filtered array of MedicationDispense resources
 *
 * @example
 * const statinDispenses = await getDispensesByMeasure(medplum, 'patient-123', 'MAC', 2025);
 */
export async function getDispensesByMeasure(
  medplum: MedplumClient,
  patientId: string,
  measure: MAMeasure,
  measurementYear: number
): Promise<MedicationDispense[]> {
  // First fetch all dispenses
  const allDispenses = await getPatientDispenses(medplum, patientId, measurementYear);

  // Filter by measure classification
  return allDispenses.filter((dispense) => {
    const dispenseMeasure = classifyDispenseByMeasure(dispense);
    return dispenseMeasure === measure;
  });
}

/**
 * Fetch MedicationDispense records for a specific medication.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient resource ID
 * @param rxnormCode - RxNorm medication code
 * @param measurementYear - Year to fetch dispenses for
 * @returns Array of dispenses for specific medication
 */
export async function getDispensesByMedication(
  medplum: MedplumClient,
  patientId: string,
  rxnormCode: string,
  measurementYear: number
): Promise<MedicationDispense[]> {
  // First fetch all dispenses
  const allDispenses = await getPatientDispenses(medplum, patientId, measurementYear);

  // Filter by specific medication code
  return allDispenses.filter((dispense) => {
    const code = extractMedicationCode(dispense);
    return code === rxnormCode;
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate the last fill date from a list of dispenses.
 *
 * @param dispenses - Array of MedicationDispense resources
 * @returns Last fill date or null if no dispenses
 */
export function getLastFillDate(dispenses: MedicationDispense[]): Date | null {
  if (dispenses.length === 0) return null;

  let lastDate: Date | null = null;

  for (const dispense of dispenses) {
    const fillDate = extractFillDate(dispense);
    if (fillDate && (!lastDate || fillDate > lastDate)) {
      lastDate = fillDate;
    }
  }

  return lastDate;
}

/**
 * Calculate the first fill date from a list of dispenses.
 *
 * @param dispenses - Array of MedicationDispense resources
 * @returns First fill date or null if no dispenses
 */
export function getFirstFillDate(dispenses: MedicationDispense[]): Date | null {
  if (dispenses.length === 0) return null;

  let firstDate: Date | null = null;

  for (const dispense of dispenses) {
    const fillDate = extractFillDate(dispense);
    if (fillDate && (!firstDate || fillDate < firstDate)) {
      firstDate = fillDate;
    }
  }

  return firstDate;
}

/**
 * Convert dispenses to fill records for PDC calculation.
 *
 * @param dispenses - Array of MedicationDispense resources
 * @returns Array of fill records with date and days supply
 */
export function dispensesToFillRecords(
  dispenses: MedicationDispense[]
): Array<{ fillDate: Date; daysSupply: number }> {
  return dispenses
    .map((dispense) => {
      const fillDate = extractFillDate(dispense);
      if (!fillDate) return null;

      return {
        fillDate,
        daysSupply: extractDaysSupply(dispense),
      };
    })
    .filter((record): record is { fillDate: Date; daysSupply: number } => record !== null);
}

/**
 * Check if a dispense is a reversal (cancelled/returned).
 *
 * @param dispense - FHIR MedicationDispense resource
 * @returns True if dispense is a reversal
 */
export function isReversedDispense(dispense: MedicationDispense): boolean {
  // Check status
  if (dispense.status === 'cancelled' || dispense.status === 'entered-in-error') {
    return true;
  }

  // Check for reversal extension/flag if present
  // (This would be pharmacy-specific)
  return false;
}

/**
 * Filter out reversed dispenses.
 *
 * @param dispenses - Array of MedicationDispense resources
 * @returns Array with reversals removed
 */
export function filterReversedDispenses(dispenses: MedicationDispense[]): MedicationDispense[] {
  return dispenses.filter((d) => !isReversedDispense(d));
}
