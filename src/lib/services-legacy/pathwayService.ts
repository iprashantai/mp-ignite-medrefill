/* eslint-disable @typescript-eslint/no-explicit-any, import/no-anonymous-default-export, no-console */

/**
 * ============================================================================
 * 🛤️ PATHWAY SERVICE - Refill vs Renewal Decision Logic
 * ============================================================================
 *
 * This service implements the REFILL vs RENEWAL decision logic as shown in
 * the flowchart (Screenshot 2025-12-29):
 *
 *                    Refills remaining?
 *                           │
 *              ┌────────────┴────────────┐
 *             YES                        NO
 *              │                          │
 *              ▼                          │
 *        Is Rx expired?                   │
 *              │                          │
 *        ┌─────┴─────┐                    │
 *       NO          YES                   │
 *        │           │                    │
 *        ▼           └────────────────────┘
 *                              │
 *   REFILL ONLY          RENEWAL NEEDED
 *
 * GOLDEN STANDARD REFERENCE:
 * - Section 20 of GOLDEN_KNOWLEDGE_BASE_REFILL_WORKLIST.md
 * - docs/REFILL_RENEWAL_DECISION_ONEPAGER.md
 *
 * UI COLUMN REQUIREMENT:
 * - A "Type" column showing "REFILL" or "RENEWAL" must appear in all 4 tabs:
 *   Review, Pick-up, Exceptions, Archive
 *
 * ============================================================================
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PathwayDefinition {
  code: string;
  name: string;
  type: 'REFILL' | 'RENEWAL' | 'NO RX';
  status: string;
  sla: {
    days: number;
    min: number;
    max: number;
  };
  flagBefore: number;
  action: string;
  description: string;
}

export interface PathwayFactors {
  hasRefills: boolean;
  refillsRemaining: number;
  rxValid: boolean;
  rxAgeDays: number | null;
  recentVisit: boolean;
  visitAgeDays: number | null;
}

export interface PathwayDetermination {
  pathwayCode: string;
  pathwayName: string;
  status: string;
  type: 'REFILL' | 'RENEWAL' | 'NO RX';
  rxDataMissing: boolean;
  sla: PathwayDefinition['sla'];
  flagBefore: number;
  action: string;
  description: string;
  factors: PathwayFactors;
  reasoning: string[];
  determinedAt: string;
  referenceDate: string;
}

export interface DeterminePathwayParams {
  refillsRemaining: number;
  rxDate?: Date | string | null;
  lastVisitDate?: Date | string | null;
  referenceDate?: Date | string;
}

export interface ValidationResult {
  isValid: boolean;
  hasAllRecommended: boolean;
  missingRequired: string[];
  missingRecommended: string[];
  canDeterminePathway: boolean;
  warning: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Pathway definitions with status codes, SLAs, and actions
 *
 * UI "Type" Column Values (for all 4 tabs):
 * - REFILL: Pathway A (has refills + valid Rx)
 * - RENEWAL: Pathway B or C (needs new Rx from clinic)
 */
export const PATHWAYS = {
  A_REFILL: {
    code: 'A',
    name: 'REFILL',
    type: 'REFILL' as const,
    status: 'REFILL_PENDING',
    sla: { days: 7, min: 5, max: 7 },
    flagBefore: 7, // Flag 5-7 days before medication runs out
    action: 'SMS patient → Patient picks up at pharmacy',
    description: 'Patient has refills on current Rx, Rx is not expired',
  },
  B_RENEWAL: {
    code: 'B',
    name: 'RENEWAL',
    type: 'RENEWAL' as const,
    status: 'RENEWAL_PENDING',
    sla: { days: 14, min: 7, max: 14 },
    flagBefore: 30, // Flag 30 days before last refill runs out
    action: 'Call clinic → Get new Rx → Notify patient → Patient picks up',
    description: 'Refills exist but Rx expired, OR no refills but recent visit',
  },
  C_APPOINTMENT: {
    code: 'C',
    name: 'APPOINTMENT',
    type: 'RENEWAL' as const, // APPOINTMENT is also a type of RENEWAL
    status: 'APPOINTMENT_NEEDED',
    sla: { days: 30, min: 14, max: 30 },
    flagBefore: 60, // Flag 60 days before last refill runs out
    action: 'Schedule appointment → Patient sees doctor → Get new Rx → Patient picks up',
    description: 'No refills left AND no recent doctor visit (>90 days)',
  },
};

/**
 * Type values for UI column (REFILL vs RENEWAL vs NO RX)
 */
export const PATHWAY_TYPES = {
  REFILL: 'REFILL',
  RENEWAL: 'RENEWAL',
  NO_RX: 'NO RX', // When rxDate is missing and we cannot determine
} as const;

/**
 * Rx validity period in days (typically 12 months)
 */
export const RX_VALIDITY_PERIOD_DAYS = 365;

/**
 * Recent visit threshold in days
 */
export const RECENT_VISIT_THRESHOLD_DAYS = 90;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate days between two dates
 * @param startDate - Start date
 * @param endDate - End date (defaults to today)
 * @returns Number of days between dates
 */
export function daysBetween(startDate: Date | string, endDate: Date | string = new Date()): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if Rx is valid (not expired)
 * Rx expires 12 months after the written date
 * @param rxDate - The date the prescription was written
 * @param referenceDate - Date to check against (defaults to today)
 * @returns True if Rx is still valid
 */
export function isRxValid(
  rxDate: Date | string | null,
  referenceDate: Date | string = new Date()
): boolean {
  if (!rxDate) {
    // If no rxDate provided, we cannot determine validity
    // Default to invalid to trigger renewal path
    return false;
  }

  const daysSinceRxWritten = daysBetween(rxDate, referenceDate);
  return daysSinceRxWritten <= RX_VALIDITY_PERIOD_DAYS;
}

/**
 * Check if patient had a recent doctor visit
 * @param lastVisitDate - Date of last doctor visit
 * @param referenceDate - Date to check against (defaults to today)
 * @returns True if visit was within last 90 days
 */
export function hasRecentVisit(
  lastVisitDate: Date | string | null,
  referenceDate: Date | string = new Date()
): boolean {
  if (!lastVisitDate) {
    // If no visit date provided, assume no recent visit
    return false;
  }

  const daysSinceVisit = daysBetween(lastVisitDate, referenceDate);
  return daysSinceVisit <= RECENT_VISIT_THRESHOLD_DAYS;
}

// ============================================================================
// MAIN PATHWAY DETERMINATION FUNCTION
// ============================================================================

/**
 * Determine the appropriate pathway for a patient based on Rx status
 *
 * @param params - Patient Rx parameters
 * @param params.refillsRemaining - Number of refills remaining on current Rx
 * @param params.rxDate - Date the prescription was written
 * @param params.lastVisitDate - Date of last doctor visit
 * @param params.referenceDate - Reference date (defaults to today)
 * @returns Pathway determination result
 */
export function determinePathway({
  refillsRemaining,
  rxDate = null,
  lastVisitDate = null,
  referenceDate = new Date(),
}: DeterminePathwayParams): PathwayDetermination {
  // Normalize refills to number
  const refills = parseInt(String(refillsRemaining), 10) || 0;

  // Question 1: Does patient have refills remaining?
  const hasRefills = refills > 0;

  // Question 2a: Is the Rx still valid (not expired)?
  const rxValid = isRxValid(rxDate, referenceDate);

  // Question 2b: Did patient see doctor in last 90 days?
  const recentVisit = hasRecentVisit(lastVisitDate, referenceDate);

  // Decision logic based on the two questions
  let pathway: PathwayDefinition;
  const reasoning: string[] = [];

  // Check if rxDate is missing - this is a data issue
  const rxDateMissing = !rxDate;

  if (hasRefills) {
    // Branch: Has refills remaining
    reasoning.push(`Has ${refills} refill(s) remaining`);

    if (rxDateMissing) {
      // NO RX DATE - Cannot determine if REFILL or RENEWAL
      // Return pathway A structure but with "NO RX" type to flag missing data
      pathway = PATHWAYS.A_REFILL;
      reasoning.push('⚠️ Rx date NOT AVAILABLE in database');
      reasoning.push('→ Cannot determine if Rx is expired');
      // Will override type below
    } else if (rxValid) {
      // Pathway A: REFILL (rxDate exists and is valid)
      pathway = PATHWAYS.A_REFILL;
      reasoning.push('Rx is valid (not expired)');
      reasoning.push('→ Simple refill path');
    } else {
      // Pathway B: RENEWAL (refills exist but Rx is KNOWN to be expired)
      pathway = PATHWAYS.B_RENEWAL;
      reasoning.push('Rx is EXPIRED (>12 months since written)');
      reasoning.push('→ Need new Rx from clinic');
    }
  } else {
    // Branch: No refills remaining
    reasoning.push('No refills remaining');

    if (recentVisit) {
      // Pathway B: RENEWAL (no refills but recent visit)
      pathway = PATHWAYS.B_RENEWAL;
      reasoning.push('Patient saw doctor within last 90 days');
      reasoning.push('→ Doctor can write new Rx without visit');
    } else {
      // Pathway C: APPOINTMENT
      pathway = PATHWAYS.C_APPOINTMENT;
      reasoning.push('No doctor visit in last 90 days');
      reasoning.push('→ Appointment required before new Rx');
    }
  }

  // Calculate days for validity/visit info
  const rxAgeDays = rxDate ? daysBetween(rxDate, referenceDate) : null;
  const visitAgeDays = lastVisitDate ? daysBetween(lastVisitDate, referenceDate) : null;

  // Determine the UI type - show "NO RX" when rxDate is missing and patient has refills
  // This flags a DATA ISSUE that needs to be fixed (DB should have rxDate)
  const uiType = rxDateMissing && hasRefills ? PATHWAY_TYPES.NO_RX : pathway.type;

  return {
    // Pathway identification
    pathwayCode: pathway.code,
    pathwayName: pathway.name,
    status: pathway.status,

    // ** UI Column Value ** (REFILL, RENEWAL, or "NO RX" for display in all 4 tabs)
    // "NO RX" indicates missing rxDate data - cannot determine REFILL vs RENEWAL
    type: uiType as 'REFILL' | 'RENEWAL' | 'NO RX',
    rxDataMissing: rxDateMissing && hasRefills, // Flag for UI to show warning

    // SLA information
    sla: pathway.sla,
    flagBefore: pathway.flagBefore,
    action: pathway.action,
    description: pathway.description,

    // Decision factors
    factors: {
      hasRefills,
      refillsRemaining: refills,
      rxValid,
      rxAgeDays,
      recentVisit,
      visitAgeDays,
    },

    // Reasoning chain
    reasoning,

    // Metadata
    determinedAt: new Date().toISOString(),
    referenceDate: new Date(referenceDate).toISOString(),
  };
}

// ============================================================================
// BATCH PROCESSING FUNCTIONS
// ============================================================================

/**
 * Determine pathways for a batch of patients
 * @param patients - Array of patient objects
 * @param referenceDate - Reference date for calculations
 * @returns Patients with pathway information added
 */
export function determinePathwaysForBatch(
  patients: any[],
  referenceDate: Date | string = new Date()
): any[] {
  return patients.map((patient) => {
    // Note: rxDate = when Rx was written (valid for 12 months)
    // Fallback to lastFillDate/lastDOS if rxDate not available
    // If patient filled recently, assume Rx is still valid
    const rxDateValue =
      patient.rxDate ?? patient.rxWrittenDate ?? patient.lastFillDate ?? patient.lastDOS ?? null;
    const pathwayResult = determinePathway({
      refillsRemaining: patient.refillsRemaining ?? patient.refills ?? 0,
      rxDate: rxDateValue,
      lastVisitDate: patient.lastVisitDate ?? patient.lastVisit ?? null,
      referenceDate,
    });

    return {
      ...patient,
      // Type field for UI column (REFILL or RENEWAL)
      type: pathwayResult.type,
      // Full pathway details
      pathway: pathwayResult.pathwayCode,
      pathwayName: pathwayResult.pathwayName,
      pathwayStatus: pathwayResult.status,
      pathwaySla: pathwayResult.sla,
      pathwayAction: pathwayResult.action,
      pathwayFactors: pathwayResult.factors,
      pathwayReasoning: pathwayResult.reasoning,
    };
  });
}

/**
 * Group patients by pathway
 * @param patients - Array of patients with pathway information
 * @returns Patients grouped by pathway code
 */
export function groupByPathway(patients: any[]): Record<string, any[]> {
  return {
    A_REFILL: patients.filter((p) => p.pathway === 'A' || p.pathwayCode === 'A'),
    B_RENEWAL: patients.filter((p) => p.pathway === 'B' || p.pathwayCode === 'B'),
    C_APPOINTMENT: patients.filter((p) => p.pathway === 'C' || p.pathwayCode === 'C'),
  };
}

/**
 * Get pathway statistics for a batch
 * @param patients - Array of patients with pathway information
 * @returns Statistics about pathway distribution
 */
export function getPathwayStats(patients: any[]): any {
  const grouped = groupByPathway(patients);
  const total = patients.length;

  return {
    total,
    byPathway: {
      A_REFILL: {
        count: grouped.A_REFILL.length,
        percentage: total > 0 ? Math.round((grouped.A_REFILL.length / total) * 100) : 0,
        expectedPercentage: 60, // From spec: ~60%
      },
      B_RENEWAL: {
        count: grouped.B_RENEWAL.length,
        percentage: total > 0 ? Math.round((grouped.B_RENEWAL.length / total) * 100) : 0,
        expectedPercentage: 30, // From spec: ~30%
      },
      C_APPOINTMENT: {
        count: grouped.C_APPOINTMENT.length,
        percentage: total > 0 ? Math.round((grouped.C_APPOINTMENT.length / total) * 100) : 0,
        expectedPercentage: 10, // From spec: ~10%
      },
    },
    avgSla: {
      A_REFILL: 7,
      B_RENEWAL: 14,
      C_APPOINTMENT: 30,
    },
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that all required fields exist for pathway determination
 * @param patient - Patient object
 * @returns Validation result with missing fields
 */
export function validatePathwayFields(patient: any): ValidationResult {
  const required = ['refillsRemaining'];
  const recommended = ['rxDate', 'lastVisitDate'];

  const missing = {
    required: required.filter(
      (field) =>
        patient[field] === undefined && patient[field.replace('Remaining', '')] === undefined
    ),
    recommended: recommended.filter(
      (field) => patient[field] === undefined && patient[field.replace('Date', '')] === undefined
    ),
  };

  const isValid = missing.required.length === 0;
  const hasAllRecommended = missing.recommended.length === 0;

  return {
    isValid,
    hasAllRecommended,
    missingRequired: missing.required,
    missingRecommended: missing.recommended,
    canDeterminePathway: isValid,
    warning: !hasAllRecommended
      ? `Missing recommended fields: ${missing.recommended.join(', ')}. Pathway may default to RENEWAL or APPOINTMENT.`
      : null,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Constants
  PATHWAYS,
  PATHWAY_TYPES,
  RX_VALIDITY_PERIOD_DAYS,
  RECENT_VISIT_THRESHOLD_DAYS,

  // Core functions
  determinePathway,
  daysBetween,
  isRxValid,
  hasRecentVisit,

  // Batch functions
  determinePathwaysForBatch,
  groupByPathway,
  getPathwayStats,

  // Validation
  validatePathwayFields,
};
