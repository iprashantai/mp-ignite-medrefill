/**
 * Legacy Patient Adapter
 *
 * Transforms Medplum FHIR resources into legacy Firebase data structures
 * so that migrated UI components work without modification.
 *
 * ARCHITECTURE:
 * - Reads denormalized Patient extensions (populated by Phase 2A bot)
 * - Queries Observations for per-medication PDC data
 * - Queries MedicationDispense for fill history
 * - Transforms to LegacyPatient structure
 *
 * @module legacy-patient-adapter
 */

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, no-console, complexity */

import type { MedplumClient } from '@medplum/core';
import type { Patient, Observation, MedicationDispense } from '@medplum/fhirtypes';
import type {
  LegacyPatient,
  LegacyMedication,
  AggregateMetrics,
  PerMeasureMetrics,
  MAMeasure,
  FragilityTier,
  PDCStatus,
} from '@/types/legacy-types';
import { extractPatientPDCSummary } from '@/lib/fhir/patient-extensions';
import { getAllCurrentPDCObservations } from '@/lib/fhir/observation-service';
import { getPatientDispenses } from '@/lib/fhir/dispense-service';
import {
  getCodeExtension,
  getIntegerExtension,
  getDecimalExtension,
  getStringExtension,
} from '@/lib/fhir/helpers';
import { EXTENSION_URLS } from '@/lib/fhir/types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse patient name from FHIR Patient resource
 */
function parsePatientName(patient: Patient): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const name = patient.name?.[0];
  const firstName = name?.given?.[0] || '';
  const lastName = name?.family || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown Patient';

  return { firstName, lastName, fullName };
}

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate: string | undefined): number {
  if (!birthDate) return 0;

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Get PDC status from PDC value
 */
function getPDCStatus(pdc: number | null): PDCStatus | null {
  if (pdc === null) return null;
  if (pdc >= 80) return 'passing';
  if (pdc >= 60) return 'at-risk';
  return 'failing';
}

/**
 * Transform Observation to LegacyMedication
 */
function transformObservationToMedication(obs: Observation, patientId: string): LegacyMedication {
  console.log(`🔄 Transforming observation ${obs.id}:`, {
    extensions: obs.extension?.length || 0,
    components: obs.component?.length || 0,
    code: obs.code?.coding?.[0],
    value: obs.valueQuantity?.value,
  });

  // Extract measure from extension OR infer from observation code
  let measure = getCodeExtension(obs.extension, EXTENSION_URLS.MA_MEASURE) as MAMeasure | null;
  if (!measure) {
    // Try to infer from code
    const codeDisplay = obs.code?.coding?.[0]?.display || obs.code?.text || '';
    if (codeDisplay.includes('MAC') || codeDisplay.includes('Cholesterol')) {
      measure = 'MAC';
    } else if (codeDisplay.includes('MAD') || codeDisplay.includes('Diabetes')) {
      measure = 'MAD';
    } else if (codeDisplay.includes('MAH') || codeDisplay.includes('Hypertension')) {
      measure = 'MAH';
    }
    console.log(`  - Inferred measure from code display "${codeDisplay}": ${measure}`);
  }

  // Extract medication name from extension OR from observation text
  const medicationDisplay =
    getStringExtension(obs.extension, EXTENSION_URLS.MEDICATION_DISPLAY) ||
    obs.code?.text ||
    obs.code?.coding?.[0]?.display ||
    'Unknown Medication';

  const pdc = obs.valueQuantity?.value || null;
  const status = getPDCStatus(pdc);

  console.log(`  - Extracted: measure=${measure}, medication=${medicationDisplay}, pdc=${pdc}`);

  // Extract PDC-related extensions OR from components
  let gapDaysRemaining = getIntegerExtension(obs.extension, EXTENSION_URLS.GAP_DAYS_REMAINING);
  let daysToRunout = getIntegerExtension(obs.extension, EXTENSION_URLS.DAYS_UNTIL_RUNOUT);
  let fragilityTier = getCodeExtension(
    obs.extension,
    EXTENSION_URLS.FRAGILITY_TIER
  ) as FragilityTier | null;
  let priorityScore = getIntegerExtension(obs.extension, EXTENSION_URLS.PRIORITY_SCORE) || 0;

  // Fallback: try to extract from observation components
  if (obs.component) {
    for (const comp of obs.component) {
      const compCode = comp.code?.coding?.[0]?.code || comp.code?.text || '';
      const compValue = comp.valueQuantity?.value || comp.valueInteger;

      if (compCode.includes('gap') || compCode.includes('Gap')) {
        if (gapDaysRemaining === null || gapDaysRemaining === undefined) {
          gapDaysRemaining = compValue !== undefined ? Number(compValue) : undefined;
        }
      } else if (compCode.includes('runout') || compCode.includes('Runout')) {
        if (daysToRunout === null || daysToRunout === undefined) {
          daysToRunout = compValue !== undefined ? Number(compValue) : undefined;
        }
      } else if (compCode.includes('priority') || compCode.includes('Priority')) {
        if (!priorityScore && compValue !== undefined) {
          priorityScore = Number(compValue);
        }
      } else if (compCode.includes('fragility') || compCode.includes('Fragility')) {
        if (!fragilityTier) {
          fragilityTier = comp.valueCodeableConcept?.coding?.[0]?.code as FragilityTier | null;
        }
      }
    }
  }

  console.log(
    `  - Metrics: gap=${gapDaysRemaining}, runout=${daysToRunout}, tier=${fragilityTier}, priority=${priorityScore}`
  );

  // Calculate next refill due (approximation)
  let nextRefillDue: string | null = null;
  if (daysToRunout !== null && daysToRunout !== undefined) {
    const runoutDate = new Date();
    runoutDate.setDate(runoutDate.getDate() + daysToRunout);
    nextRefillDue = runoutDate.toISOString().split('T')[0];
  }

  return {
    id: obs.id || `obs-${patientId}-${measure}`,
    medicationName: medicationDisplay,
    drugName: medicationDisplay,
    dosage: '', // Not available in Observation
    medicationClass: measure || '',
    measure,
    ndc: null,
    refillsLeft: null,
    daysSupply: null,
    isMedicationAdherence: measure !== null,
    adherence: {
      pdc,
      status,
    },
    currentPdc: pdc,
    currentPdcExact: pdc,
    gapDaysRemaining: gapDaysRemaining ?? null,
    gapDaysUsed: null, // Not stored in FHIR extensions
    gapDaysAllowed: null, // Not stored in FHIR extensions
    lastFillDate: null, // Would need to query dispenses
    nextRefillDue,
    daysToRunout: daysToRunout ?? null,
    claimsCount: 0,
    fragilityTier,
    priorityScore,
  };
}

/**
 * Calculate aggregate metrics from medications
 */
function calculateAggregateMetrics(medications: LegacyMedication[]): AggregateMetrics {
  const maMeds = medications.filter((m) => m.isMedicationAdherence);

  let allMedsPDC: number | null = null;
  const pdcValues = maMeds.map((m) => m.currentPdc).filter((pdc): pdc is number => pdc !== null);

  if (pdcValues.length > 0) {
    allMedsPDC = Math.min(...pdcValues); // Worst PDC
  }

  // Get worst fragility tier
  const tiers = maMeds.map((m) => m.fragilityTier).filter((t): t is FragilityTier => t !== null);
  const worstFragilityTier = getWorstTier(tiers);

  // Get highest priority score
  const priorityScores = maMeds.map((m) => m.priorityScore || 0);
  const highestPriorityScore = Math.max(...priorityScores, 0);

  // Count by status
  const passingCount = maMeds.filter((m) => m.adherence.status === 'passing').length;
  const atRiskCount = maMeds.filter((m) => m.adherence.status === 'at-risk').length;
  const failingCount = maMeds.filter((m) => m.adherence.status === 'failing').length;

  return {
    allMedsPDC,
    worstFragilityTier,
    highestPriorityScore,
    totalMedications: medications.length,
    maMedications: maMeds.length,
    passingCount,
    atRiskCount,
    failingCount,
  };
}

/**
 * Get worst tier from list (lower priority number = worse)
 */
const TIER_PRIORITY: Record<FragilityTier, number> = {
  T5_UNSALVAGEABLE: 0,
  F1_IMMINENT: 1,
  F2_FRAGILE: 2,
  F3_MODERATE: 3,
  F4_COMFORTABLE: 4,
  F5_SAFE: 5,
  COMPLIANT: 6,
};

function getWorstTier(tiers: FragilityTier[]): FragilityTier | null {
  if (tiers.length === 0) return null;

  return tiers.reduce((worst, current) => {
    return TIER_PRIORITY[current] < TIER_PRIORITY[worst] ? current : worst;
  });
}

/**
 * Calculate per-measure metrics
 */
function calculatePerMeasureMetrics(
  medications: LegacyMedication[]
): Record<MAMeasure, PerMeasureMetrics> {
  const perMeasure: Record<string, PerMeasureMetrics> = {};

  ['MAC', 'MAD', 'MAH'].forEach((measure) => {
    const meds = medications.filter((m) => m.measure === measure);

    if (meds.length === 0) {
      return;
    }

    const pdcValues = meds.map((m) => m.currentPdc).filter((pdc): pdc is number => pdc !== null);
    const currentPDC = pdcValues.length > 0 ? Math.min(...pdcValues) : null;

    const tiers = meds.map((m) => m.fragilityTier).filter((t): t is FragilityTier => t !== null);
    const fragilityTier = getWorstTier(tiers);

    const priorityScores = meds.map((m) => m.priorityScore || 0);
    const priorityScore = Math.max(...priorityScores, 0);

    perMeasure[measure] = {
      currentPDC,
      fragilityTier,
      priorityScore,
      medications: meds,
    };
  });

  return perMeasure as Record<MAMeasure, PerMeasureMetrics>;
}

// =============================================================================
// Main Adapter Functions
// =============================================================================

/**
 * Construct legacy patient object from Medplum FHIR resources
 *
 * @param patientId - FHIR Patient ID
 * @param medplum - Medplum client instance
 * @returns Legacy patient object
 */
export async function constructLegacyPatientObject(
  patientId: string,
  medplum: MedplumClient
): Promise<LegacyPatient> {
  // 1. Fetch Patient resource
  const patient = await medplum.readResource('Patient', patientId);

  // 2. Parse patient demographics
  const { firstName, lastName, fullName } = parsePatientName(patient);
  const age = calculateAge(patient.birthDate);

  // 3. Extract denormalized summary from Patient extensions
  const pdcSummary = extractPatientPDCSummary(patient);

  // 4. Fetch all current PDC observations for detailed medication data
  const observationsMap = await getAllCurrentPDCObservations(medplum, patientId);
  console.log(`📊 Patient ${patientId}: Found ${observationsMap.size} PDC observations`);

  // 5. Transform observations to medications
  const medications: LegacyMedication[] = Array.from(observationsMap.values()).map((obs) =>
    transformObservationToMedication(obs, patientId)
  );
  console.log(`💊 Patient ${patientId}: Transformed ${medications.length} medications`);

  // 6. Calculate aggregates
  const aggregateMetrics = calculateAggregateMetrics(medications);
  const perMeasure = calculatePerMeasureMetrics(medications);

  // 7. Calculate earliest runout
  const runoutValues = medications
    .map((m) => m.daysToRunout)
    .filter((d): d is number => d !== null);
  const daysToRunout = runoutValues.length > 0 ? Math.min(...runoutValues) : null;

  // 8. Calculate next refill date
  const refillDates = medications
    .map((m) => m.nextRefillDue)
    .filter((d): d is string => d !== null);
  const nextRefillDue = refillDates.length > 0 ? refillDates.sort()[0] : null;

  // 9. Determine flags
  const in14DayQueue = daysToRunout !== null && daysToRunout <= 14;
  const isAtRisk = aggregateMetrics.allMedsPDC !== null && aggregateMetrics.allMedsPDC < 80;
  const isFailing = aggregateMetrics.allMedsPDC !== null && aggregateMetrics.allMedsPDC < 60;

  // 10. Construct legacy patient object
  const legacyPatient: LegacyPatient = {
    // Demographics
    id: patient.id!,
    mrn: patient.identifier?.[0]?.value || patient.id!,
    firstName,
    lastName,
    name: fullName,
    dateOfBirth: patient.birthDate || '',
    age,
    gender: patient.gender,

    // Medications
    medications,
    perMeasure,

    // Aggregates
    aggregateMetrics,
    currentPDC: aggregateMetrics.allMedsPDC,
    fragilityTier: aggregateMetrics.worstFragilityTier,
    priorityScore: aggregateMetrics.highestPriorityScore,

    // Refill tracking
    in14DayQueue,
    daysToRunout,
    nextRefillDue,

    // Risk flags
    isAtRisk,
    isFailing,

    // CRM (stub data for now)
    crmStatus: 'not_contacted',
    campaigns: [],

    // Metadata
    _version: '5.0-fhir-adapter',
    _computedAt: pdcSummary?.lastUpdated || new Date().toISOString(),
    _fhirPatient: patient,
  };

  return legacyPatient;
}

/**
 * Load multiple patients with legacy data structure
 *
 * @param medplum - Medplum client instance
 * @param options - Search options
 * @returns Array of legacy patient objects
 */
export async function loadPatientsWithLegacyShape(
  medplum: MedplumClient,
  options?: {
    active?: boolean;
    _count?: number;
    _sort?: string;
  }
): Promise<LegacyPatient[]> {
  // Fetch patients from Medplum
  const searchParams: any = {
    // Don't filter by active status - get all patients
    // active: options?.active !== false ? 'true' : undefined,
    _count: options?._count || 100,
    _sort: options?._sort || '-_lastUpdated',
  };

  const patients = await medplum.searchResources('Patient', searchParams);

  // Transform each patient to legacy shape
  const legacyPatients = await Promise.all(
    patients.map((p) => constructLegacyPatientObject(p.id!, medplum))
  );

  return legacyPatients;
}

/**
 * Load legacy patients with filtering (client-side)
 *
 * @param medplum - Medplum client instance
 * @param filter - Filter criteria
 * @returns Filtered array of legacy patients
 */
export async function loadFilteredLegacyPatients(
  medplum: MedplumClient,
  filter?: {
    pdcRange?: [number, number];
    fragilityTiers?: FragilityTier[];
    measures?: MAMeasure[];
    in14DayQueue?: boolean;
  }
): Promise<LegacyPatient[]> {
  // Load all patients
  const allPatients = await loadPatientsWithLegacyShape(medplum);

  // Apply filters
  return allPatients.filter((patient) => {
    // PDC range filter
    if (filter?.pdcRange) {
      const [min, max] = filter.pdcRange;
      if (patient.currentPDC === null || patient.currentPDC < min || patient.currentPDC >= max) {
        return false;
      }
    }

    // Fragility tier filter
    if (filter?.fragilityTiers && filter.fragilityTiers.length > 0) {
      if (!patient.fragilityTier || !filter.fragilityTiers.includes(patient.fragilityTier)) {
        return false;
      }
    }

    // Measure filter
    if (filter?.measures && filter.measures.length > 0) {
      const patientMeasures = patient.medications
        .map((m) => m.measure)
        .filter((m): m is MAMeasure => m !== null);
      const hasAnyMeasure = filter.measures.some((m) => patientMeasures.includes(m));
      if (!hasAnyMeasure) {
        return false;
      }
    }

    // 14-day queue filter
    if (filter?.in14DayQueue !== undefined) {
      if (patient.in14DayQueue !== filter.in14DayQueue) {
        return false;
      }
    }

    return true;
  });
}
