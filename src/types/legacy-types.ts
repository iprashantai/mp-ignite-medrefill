/**
 * Legacy Data Type Definitions
 *
 * These types match the Firebase/legacy app data structures
 * to ensure migrated UI components work without modification.
 *
 * Data source: Legacy app uses Firebase with denormalized patient data
 * Target: Adapter layer will transform Medplum FHIR resources into these shapes
 */

import { Patient } from '@medplum/fhirtypes';

/**
 * MA Measure Types (Medication Adherence)
 */
export type MAMeasure = 'MAC' | 'MAD' | 'MAH';

/**
 * PDC Status Categories
 */
export type PDCStatus = 'passing' | 'at-risk' | 'failing';

/**
 * Fragility Tier Classifications
 */
export type FragilityTier =
  | 'F1_IMMINENT'
  | 'F2_FRAGILE'
  | 'F3_MODERATE'
  | 'F4_COMFORTABLE'
  | 'F5_SAFE'
  | 'T5_UNSALVAGEABLE'
  | 'COMPLIANT';

/**
 * CRM Contact Status
 */
export type CRMStatus =
  | 'not_contacted'
  | 'outreach_attempted'
  | 'patient_responded'
  | 'appointment_scheduled'
  | 'intervention_complete'
  | 'lost_to_followup'
  | 'opted_out';

/**
 * Legacy Medication Object
 * Matches structure from pdcDataService.buildMedicationsFromRxClaims()
 */
export interface LegacyMedication {
  id: string;
  medicationName: string;
  drugName: string; // Alias for medicationName
  dosage: string;
  medicationClass: string;
  measure: MAMeasure | null;
  ndc: string | null;
  refillsLeft: number | null;
  daysSupply: number | null;
  isMedicationAdherence: boolean;

  // Adherence object (nested)
  adherence: {
    pdc: number | null;
    status: PDCStatus | null;
  };

  // PDC calculation results
  currentPdc: number | null;
  currentPdcExact: number | null; // Alias for currentPdc
  gapDaysRemaining: number | null;
  gapDaysUsed: number | null;
  gapDaysAllowed: number | null;

  // Refill tracking
  lastFillDate: string | null;
  nextRefillDue: string | null;
  daysToRunout: number | null;
  claimsCount: number;

  // Fragility & Priority (calculated per medication)
  fragilityTier?: FragilityTier | null;
  priorityScore?: number;

  // Optional fields from FHIR
  rxClaims?: Array<{
    fillDate: string;
    daysSupply: number;
    ndc?: string;
  }>;
}

/**
 * Per-Measure Aggregate Metrics
 */
export interface PerMeasureMetrics {
  currentPDC: number | null;
  fragilityTier: FragilityTier | null;
  priorityScore: number;
  medications: LegacyMedication[];
}

/**
 * Aggregate Metrics at Patient Level
 */
export interface AggregateMetrics {
  allMedsPDC: number | null; // MIN across all measures
  worstFragilityTier: FragilityTier | null; // WORST tier across measures
  highestPriorityScore: number; // MAX score across measures
  totalMedications: number;
  maMedications: number; // Count of MA meds
  passingCount: number;
  atRiskCount: number;
  failingCount: number;
}

/**
 * Legacy Patient Object
 * Matches structure from normalizePatientForDisplay()
 */
export interface LegacyPatient {
  // Core demographics
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  name: string; // Full name (computed from firstName + lastName)
  dateOfBirth: string; // YYYY-MM-DD
  age: number;
  gender?: string;

  // Contact information (optional)
  phone?: string;
  email?: string;
  address?: string;

  // Medications array (primary data structure)
  medications: LegacyMedication[];

  // Per-measure aggregations
  perMeasure?: {
    MAC?: PerMeasureMetrics;
    MAD?: PerMeasureMetrics;
    MAH?: PerMeasureMetrics;
  };

  // Patient-level aggregations
  aggregateMetrics: AggregateMetrics;
  currentPDC: number | null; // Shorthand for aggregateMetrics.allMedsPDC
  fragilityTier: FragilityTier | null; // Shorthand for aggregateMetrics.worstFragilityTier
  priorityScore: number; // Shorthand for aggregateMetrics.highestPriorityScore

  // Refill queue flags
  in14DayQueue: boolean; // Any medication within 14 days of runout
  daysToRunout: number | null; // Earliest runout across all meds
  nextRefillDue: string | null; // Earliest refill date

  // Risk flags
  isAtRisk: boolean; // PDC < 80%
  isFailing: boolean; // PDC < 60%

  // CRM fields
  crmStatus: CRMStatus;
  campaigns: string[]; // Campaign IDs
  lastContactDate?: string;
  notes?: string;

  // Metadata
  _version: string; // '5.0-fhir-adapter'
  _computedAt: string; // ISO timestamp
  _fhirPatient?: Patient; // Original FHIR resource (for debugging)
}

/**
 * Legacy Patient List Filters
 * Matches filter state from usePatientFilters hook
 */
export interface LegacyPatientFilters {
  search: string;
  pdcRange: [number, number] | null; // e.g., [0, 60], [60, 80], [80, 100]
  fragilityTiers: FragilityTier[];
  measures: MAMeasure[];
  crmStatus: CRMStatus[];
  daysToRunout: 'overdue' | '0-7' | '8-14' | '15-30' | '30+' | null;
  hasMedAdherence: boolean | null;
  campaigns: string[];
}

/**
 * Legacy Patient List Metrics
 * For PatientInventoryOverview component
 */
export interface LegacyPatientListMetrics {
  totalPatients: number;
  maPatients: number; // Patients with MA medications
  passingCount: number; // PDC >= 80%
  atRiskCount: number; // PDC 60-79%
  failingCount: number; // PDC < 60%
  refillCandidates: number; // Within 14 days

  // Breakdowns
  fragilityBreakdown: Record<FragilityTier | 'unknown', number>;
  pdcBreakdown: {
    pdc0to60: number;
    pdc60to80: number;
    pdc80to90: number;
    pdc90plus: number;
  };
  daysToRunoutBreakdown: {
    overdue: number;
    days0to7: number;
    days8to14: number;
    days15to30: number;
    days30plus: number;
  };
  measureBreakdown: Record<MAMeasure, number>;
}

/**
 * RX Claim Object (from Firebase)
 * Used for PDC calculations
 */
export interface RxClaim {
  id: string;
  patientId: string;
  drugName: string;
  ndc: string;
  fillDate: string; // YYYY-MM-DD
  daysSupply: number;
  quantity: number;
  reversalFlag?: 'Y' | 'N' | 'R';

  // Alternative field names (legacy compatibility)
  Rx_Date_Of_Service?: string;
  Rx_Days_Supply?: number;
  Rx_NDC_Code?: string;
  Drug_Name?: string;
  Generic_Name?: string;
  Reversal_Flag?: string;
}

/**
 * Campaign Object (for CRM)
 */
export interface LegacyCampaign {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  patientIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Batch Operation Result
 */
export interface BatchOperationResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors: Array<{
    patientId: string;
    error: string;
  }>;
}
