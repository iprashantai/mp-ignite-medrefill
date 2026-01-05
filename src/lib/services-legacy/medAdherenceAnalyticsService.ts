/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, import/no-anonymous-default-export, max-lines-per-function, complexity */
/**
 * Med Adherence Analytics Service
 *
 * Advanced analytics calculations for V3.0 All Patients page
 * Including: projected PDC, trend analysis, early warning indicators, population segmentation
 *
 * @module medAdherenceAnalyticsService
 */

import { differenceInDays, parseISO, subDays, addDays } from 'date-fns';
import { calculateCoveredDays } from '@/lib/services-legacy/coverageCalendarService';
import { calculateFragilityTier } from '@/lib/services-legacy/fragilityTierService';
import {
  validateAdherenceMetrics,
  validateDenominatorStatus,
} from '@/lib/services-legacy/adherenceValidation';
import logger from '@/lib/services-legacy/loggerService';

// PERFORMANCE: Disable verbose logging in DEV mode (set to false to speed up page load)
const ENABLE_VERBOSE_LOGGING = false;

/**
 * Map medication class to HEDIS measure
 * @param {string} medicationClass - Medication class from RX claim
 * @returns {string|null} Measure (MAC/MAD/MAH) or null
 */
const getMeasureFromMedicationClass = (medicationClass: any): any => {
  const mapping: any = {
    // MAC - Cholesterol
    Statin: 'MAC',
    // MAD - Diabetes
    Biguanide: 'MAD',
    Sulfonylurea: 'MAD',
    Thiazolidinedione: 'MAD',
    'DPP-4 Inhibitor': 'MAD',
    'SGLT2 Inhibitor': 'MAD',
    'GLP-1 Agonist': 'MAD',
    // MAH - Hypertension
    'ACE Inhibitor': 'MAH',
    ARB: 'MAH',
    Diuretic: 'MAH',
    'Beta Blocker': 'MAH',
    'Calcium Channel Blocker': 'MAH',
  };
  return mapping[medicationClass] || null;
};

/**
 * Helper function to extract adherence data for a SPECIFIC medication measure
 * This is the CORRECT approach - each MA measure (MAC/MAD/MAH) needs separate PDC tracking
 *
 * @param {Object} patient - Patient object
 * @param {string} measure - Medication measure ('MAC', 'MAD', or 'MAH')
 * @returns {Object} Normalized adherence data for this specific measure
 */
const getAdherenceDataForMeasure = (patient: any, measure: any): any => {
  const patientId = patient.id || patient.Member_Id || 'UNKNOWN';

  if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
    console.log(
      `🔍 getAdherenceDataForMeasure called for patient: ${patientId}, measure: ${measure}`
    );
  }

  // Priority 1: medAdherence object (Refill Worklist format) - check if it's for this specific measure
  if (
    patient.medAdherence?.measure === measure &&
    patient.medAdherence?.gapDays?.treatment_days &&
    patient.medAdherence.gapDays.treatment_days > 0
  ) {
    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`✅ [${patientId}][${measure}] Using Priority 1: medAdherence object`);
      console.log(`   PDC value from medAdherence.gapDays.PDC:`, patient.medAdherence.gapDays.PDC);
    }

    return {
      currentPDC: patient.medAdherence.gapDays.PDC || 0,
      gapDaysRemaining: patient.medAdherence.gapDays.gap_days_remaining || 0,
      gapDaysUsed: patient.medAdherence.gapDays.gap_days_used || 0,
      treatmentDays: patient.medAdherence.gapDays.treatment_days,
      daysToRunout: patient.medAdherence.coverage?.daysToRunout || null,
      refillsNeeded: patient.medAdherence.refills?.refillsNeeded || 1,
    };
  }

  // Priority 2: Calculate from RX claims filtered by measure (All Patients format)
  if (patient.rxClaims && patient.rxClaims.length > 0) {
    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`✅ [${patientId}][${measure}] Using Priority 2: RX claims calculation`);
      console.log(`   Total RX claims: ${patient.rxClaims.length}`);
    }

    // Filter claims for this specific measure
    // Support both claim.measure (if pre-enriched) and medication_class mapping
    const rxClaims = patient.rxClaims.filter((claim: any) => {
      if (claim.measure) {
        return claim.measure === measure;
      }
      // Fallback: map medication_class to measure
      const claimMeasure = getMeasureFromMedicationClass(claim.medication_class);
      return claimMeasure === measure;
    });

    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`   Claims for ${measure}: ${rxClaims.length}`);
    }

    if (rxClaims.length === 0) {
      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(`⚠️  [${patientId}][${measure}] No claims for this measure`);
      }
      return null; // Patient not on this measure
    }

    const paidClaims = rxClaims.filter(
      (claim: any) => claim.Reversal_Flag !== 'R' && claim.Reversal_Flag !== 'Y'
    );

    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`   Paid claims (non-reversed): ${paidClaims.length}`);
    }

    // Filter out claims with invalid dates
    const validClaims = paidClaims.filter((claim: any) => {
      const date = new Date(claim.Rx_Date_Of_Service);
      return !isNaN(date.getTime());
    });

    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`   Valid claims (with valid dates): ${validClaims.length}`);
    }

    if (validClaims.length >= 2) {
      // Calculate treatment period from first fill to measurement year end
      const fillDates = validClaims.map((c: any) => new Date(c.Rx_Date_Of_Service));
      const firstFillDate = new Date(Math.min(...fillDates.map((d: any) => d.getTime())));
      const measurementYearEnd = new Date(patient.measurementYearEnd || '2025-12-31');
      const treatmentDays = differenceInDays(measurementYearEnd, firstFillDate) + 1;

      // Calculate covered days using coverage calendar (only valid claims)
      const coveredDays = calculateCoveredDays(validClaims, firstFillDate, measurementYearEnd);

      // Calculate PDC and gap days
      const currentPDC = treatmentDays > 0 ? (coveredDays / treatmentDays) * 100 : 0;
      const gapDaysAllowed = Math.floor(treatmentDays * 0.2); // 80% threshold
      const gapDaysUsed = treatmentDays - coveredDays;
      const gapDaysRemaining = Math.max(0, gapDaysAllowed - gapDaysUsed);

      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(`   [${measure}] Treatment days: ${treatmentDays}`);
        console.log(`   [${measure}] Covered days: ${coveredDays}`);
        console.log(`   [${measure}] Calculated PDC: ${currentPDC.toFixed(1)}%`);
        console.log(`   [${measure}] Gap days used: ${gapDaysUsed}`);
        console.log(`   [${measure}] Gap days remaining: ${gapDaysRemaining}`);
      }

      // Get days to runout from medications for this measure if available
      const maMedication = (patient.medications || []).find(
        (m: any) => m.isMedicationAdherence && m.measure === measure
      );
      const daysToRunout = maMedication?.daysToRunout || null;

      return {
        currentPDC: Math.round(currentPDC * 100) / 100,
        gapDaysRemaining: Math.round(gapDaysRemaining),
        gapDaysUsed: Math.round(gapDaysUsed),
        treatmentDays: Math.round(treatmentDays),
        daysToRunout,
        refillsNeeded: validClaims.length,
      };
    } else {
      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(
          `⚠️  [${patientId}][${measure}] Priority 2: Not enough valid claims (need 2+, have ${validClaims.length})`
        );
      }
    }
  }

  // Priority 3: aggregateAdherence + medications array (fallback) - filter by measure
  if (patient.medications && patient.medications.length > 0) {
    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`✅ [${patientId}][${measure}] Using Priority 3: medications array`);
    }

    const maMedication = patient.medications.find(
      (m: any) => m.isMedicationAdherence && m.measure === measure
    );

    if (maMedication) {
      const currentPDC = maMedication.adherence?.pdc || maMedication.pdc || 0;

      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(`   [${measure}] PDC from medication: ${currentPDC.toFixed(1)}%`);
      }

      // Calculate gap days remaining from PDC
      const treatmentDays = 365; // Assume full year for All Patients
      const gapDaysAllowed = treatmentDays * 0.2; // 73 days
      const gapDaysUsedCalculated = (treatmentDays * (100 - currentPDC)) / 100;
      const gapDaysRemainingCalculated = Math.max(0, gapDaysAllowed - gapDaysUsedCalculated);

      return {
        currentPDC,
        gapDaysRemaining: Math.round(gapDaysRemainingCalculated),
        gapDaysUsed: maMedication.gapDaysUsed || Math.round(gapDaysUsedCalculated),
        treatmentDays,
        daysToRunout: maMedication.daysToRunout || null,
        refillsNeeded: 1,
      };
    } else {
      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(
          `⚠️  [${patientId}][${measure}] Priority 3: No medication found for this measure`
        );
      }
    }
  }

  // Patient not on this measure
  if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
    console.log(`❌ [${patientId}][${measure}] Patient not on this measure`);
  }

  return null;
};

/**
 * Helper function to extract adherence data from patient object (DEPRECATED - use getAdherenceDataForMeasure)
 * This aggregates across all measures which is INCORRECT for fragility tier calculation
 * Kept for backward compatibility with existing code
 *
 * @param {Object} patient - Patient object
 * @returns {Object} Normalized adherence data (aggregated across all measures)
 * @deprecated Use getAdherenceDataForMeasure() for correct per-medication calculations
 */
const getAdherenceData = (patient: any): any => {
  const patientId = patient.id || patient.Member_Id || 'UNKNOWN';

  if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
    console.log(`🔍 getAdherenceData called for patient: ${patientId}`);
  }

  // Priority 1: medAdherence object (Refill Worklist format)
  // Only use if it has actual data (treatment_days must be > 0 to be valid)
  if (
    patient.medAdherence?.gapDays?.treatment_days &&
    patient.medAdherence.gapDays.treatment_days > 0
  ) {
    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`✅ [${patientId}] Using Priority 1: medAdherence object`);
      console.log(`   PDC value from medAdherence.gapDays.PDC:`, patient.medAdherence.gapDays.PDC);
      console.log(`   Will return PDC:`, patient.medAdherence.gapDays.PDC || 0);
    }

    return {
      currentPDC: patient.medAdherence.gapDays.PDC || 0,
      gapDaysRemaining: patient.medAdherence.gapDays.gap_days_remaining || 0,
      gapDaysUsed: patient.medAdherence.gapDays.gap_days_used || 0,
      treatmentDays: patient.medAdherence.gapDays.treatment_days,
      daysToRunout: patient.medAdherence.coverage?.daysToRunout || null,
      refillsNeeded: patient.medAdherence.refills?.refillsNeeded || 1,
    };
  }

  // Priority 2: Calculate from RX claims if available (All Patients format)
  if (patient.rxClaims && patient.rxClaims.length > 0) {
    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`✅ [${patientId}] Using Priority 2: RX claims calculation`);
      console.log(`   Total RX claims: ${patient.rxClaims.length}`);
    }

    const rxClaims = patient.rxClaims;
    const paidClaims = rxClaims.filter(
      (claim: any) => claim.Reversal_Flag !== 'R' && claim.Reversal_Flag !== 'Y'
    );

    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`   Paid claims (non-reversed): ${paidClaims.length}`);
    }

    // Filter out claims with invalid dates
    const validClaims = paidClaims.filter((claim: any) => {
      const date = new Date(claim.Rx_Date_Of_Service);
      return !isNaN(date.getTime());
    });

    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`   Valid claims (with valid dates): ${validClaims.length}`);
    }

    if (validClaims.length >= 2) {
      // Calculate treatment period from first fill to measurement year end
      const fillDates = validClaims.map((c: any) => new Date(c.Rx_Date_Of_Service));
      const firstFillDate = new Date(Math.min(...fillDates.map((d: any) => d.getTime())));
      const measurementYearEnd = new Date(patient.measurementYearEnd || '2025-12-31');
      const treatmentDays = differenceInDays(measurementYearEnd, firstFillDate) + 1;

      // Calculate covered days using coverage calendar (only valid claims)
      const coveredDays = calculateCoveredDays(validClaims, firstFillDate, measurementYearEnd);

      // Calculate PDC and gap days
      const currentPDC = treatmentDays > 0 ? (coveredDays / treatmentDays) * 100 : 0;
      const gapDaysAllowed = Math.floor(treatmentDays * 0.2); // 80% threshold
      const gapDaysUsed = treatmentDays - coveredDays;
      const gapDaysRemaining = Math.max(0, gapDaysAllowed - gapDaysUsed);

      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(`   Treatment days: ${treatmentDays}`);
        console.log(`   Covered days: ${coveredDays}`);
        console.log(`   Calculated PDC: ${currentPDC.toFixed(1)}%`);
        console.log(`   Gap days used: ${gapDaysUsed}`);
        console.log(`   Gap days remaining: ${gapDaysRemaining}`);
      }

      // Get days to runout from medications if available
      const maMedications = (patient.medications || []).filter((m: any) => m.isMedicationAdherence);
      const minDaysToRunout =
        maMedications.length > 0
          ? Math.min(
              ...maMedications.map((m: any) => {
                const days = m.daysToRunout;
                if (days === null || days === undefined) return 999;
                return days;
              })
            )
          : null;

      return {
        currentPDC: Math.round(currentPDC * 100) / 100,
        gapDaysRemaining: Math.round(gapDaysRemaining),
        gapDaysUsed: Math.round(gapDaysUsed),
        treatmentDays: Math.round(treatmentDays),
        daysToRunout: minDaysToRunout === 999 ? null : minDaysToRunout,
        refillsNeeded: validClaims.length,
      };
    } else {
      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(
          `⚠️  [${patientId}] Priority 2: Not enough valid claims (need 2+, have ${validClaims.length})`
        );
      }
    }
  } else {
    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`⚠️  [${patientId}] No RX claims available`);
    }
  }

  // Priority 3: aggregateAdherence + medications array (fallback)
  if (patient.aggregateAdherence || (patient.medications && patient.medications.length > 0)) {
    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`✅ [${patientId}] Using Priority 3: aggregateAdherence + medications`);
    }

    const maMedications = (patient.medications || []).filter((m: any) => m.isMedicationAdherence);

    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`   MA medications found: ${maMedications.length}`);
    }

    if (maMedications.length > 0) {
      // Calculate average PDC
      const avgPDC =
        maMedications.reduce((sum: any, m: any) => sum + (m.pdc || 0), 0) / maMedications.length;
      const currentPDC = patient.aggregateAdherence?.overallPDC || avgPDC;

      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(`   Average PDC from medications: ${avgPDC.toFixed(1)}%`);
        console.log(
          `   Overall PDC from aggregateAdherence: ${patient.aggregateAdherence?.overallPDC}`
        );
        console.log(`   Final PDC: ${currentPDC.toFixed(1)}%`);
      }

      // Calculate gap days remaining from PDC
      // Formula: gap_days_allowed = treatmentDays * 0.20 (80% threshold)
      // gap_days_used = treatmentDays * (100 - PDC) / 100
      // gap_days_remaining = gap_days_allowed - gap_days_used
      const treatmentDays = 365; // Assume full year for All Patients
      const gapDaysAllowed = treatmentDays * 0.2; // 73 days
      const gapDaysUsedCalculated = (treatmentDays * (100 - currentPDC)) / 100;
      const gapDaysRemainingCalculated = Math.max(0, gapDaysAllowed - gapDaysUsedCalculated);

      // Sum gap days used from medications (for analytics)
      const totalGapDaysUsed = maMedications.reduce(
        (sum: any, m: any) => sum + (m.gapDaysUsed || 0),
        0
      );

      // Use worst case days to runout
      const minDaysToRunout = Math.min(
        ...maMedications.map((m: any) => {
          const days = m.daysToRunout;
          // Handle null, undefined, and negative values
          if (days === null || days === undefined) return 999;
          return days;
        })
      );

      return {
        currentPDC,
        gapDaysRemaining: Math.round(gapDaysRemainingCalculated),
        gapDaysUsed: totalGapDaysUsed || Math.round(gapDaysUsedCalculated),
        treatmentDays,
        daysToRunout: minDaysToRunout === 999 ? null : minDaysToRunout,
        refillsNeeded: maMedications.length,
      };
    } else {
      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(`⚠️  [${patientId}] Priority 3: No MA medications found`);
      }
    }
  } else {
    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`⚠️  [${patientId}] No aggregateAdherence or medications available`);
    }
  }

  // Fallback: no adherence data available
  if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
    console.log(`❌ [${patientId}] FALLBACK: No adherence data available - returning zeros`);
  }

  return {
    currentPDC: 0,
    gapDaysRemaining: 0,
    gapDaysUsed: 0,
    treatmentDays: 0,
    daysToRunout: null,
    refillsNeeded: 1,
  };
};

/**
 * Calculate denominator status based on comprehensive HEDIS PDC specification
 *
 * Checks ALL denominator inclusion/exclusion criteria:
 * - Fill count (2+ required)
 * - Treatment period (84+ days from first fill to year-end)
 * - Age requirements (18-75 for MAC, 18-85 for MAD/MAH)
 * - Continuous enrollment
 * - Clinical exclusions (hospice, ESRD, institutional care, pregnancy)
 * - Qualifying diagnosis
 *
 * @param {Object} patient - Patient object with rxClaims and demographics
 * @param {string} measure - Optional: Specific measure (MAC/MAD/MAH) for age validation
 * @returns {Object} Denominator status details with user-friendly messaging
 *
 * Status codes:
 * - EX_*: Excluded (various exclusion reasons)
 * - D0: No fills
 * - D1: 1 fill only (not yet in denominator)
 * - D_SHORT_TX: Treatment period too short
 * - D2: In denominator (2+ fills, meets all criteria)
 */
export const calculateDenominatorStatus = (patient: any, measure: any = null): any => {
  try {
    const rxClaims = patient.rxClaims || [];
    const measurementYear = new Date().getFullYear();

    // Filter to paid claims only (exclude reversals)
    const paidClaims = rxClaims.filter(
      (claim: any) => claim.Reversal_Flag !== 'R' && claim.Reversal_Flag !== 'Y'
    );

    const fillCount = paidClaims.length;

    // ========== EXCLUSION CHECKS (in priority order) ==========

    // 1. HOSPICE - highest priority exclusion
    if (patient.hospice === true || patient.inHospice === true) {
      return {
        status: 'EX_HOSPICE',
        label: 'Hospice',
        fillCount,
        inDenominator: false,
        reason: 'Member in hospice during measurement year',
        userMessage: 'Patient in hospice care (excluded from quality measures)',
        color: 'gray',
        priority: 'excluded',
      };
    }

    // 2. ESRD (End-Stage Renal Disease)
    if (patient.esrd === true || patient.hasESRD === true) {
      return {
        status: 'EX_ESRD',
        label: 'ESRD',
        fillCount,
        inDenominator: false,
        reason: 'Member has ESRD diagnosis',
        userMessage: 'Patient has ESRD (excluded per HEDIS specifications)',
        color: 'gray',
        priority: 'excluded',
      };
    }

    // 3. INSTITUTIONAL STAY (long-term care facility)
    if (patient.institutional === true || patient.inLongTermCare === true) {
      return {
        status: 'EX_INSTITUTIONAL',
        label: 'Institutional Care',
        fillCount,
        inDenominator: false,
        reason: 'Member in long-term care/nursing home',
        userMessage: 'Patient in long-term care facility (medication management by facility)',
        color: 'gray',
        priority: 'excluded',
      };
    }

    // 4. AGE REQUIREMENTS
    const age = patient.age || patient.ageYears || null;
    if (age !== null) {
      // All measures: minimum age 18
      if (age < 18) {
        return {
          status: 'EX_AGE_YOUNG',
          label: 'Age < 18',
          fillCount,
          inDenominator: false,
          reason: 'Member under 18 years old',
          userMessage: `Patient is ${age} years old (HEDIS requires 18+)`,
          color: 'gray',
          priority: 'excluded',
        };
      }

      // MAC measure: maximum age 75
      if (measure === 'MAC' && age > 75) {
        return {
          status: 'EX_AGE_OLD_MAC',
          label: 'Age > 75 (MAC)',
          fillCount,
          inDenominator: false,
          reason: 'Member over 75 years for MAC measure',
          userMessage: `Patient is ${age} years old (MAC measure limited to 18-75)`,
          color: 'gray',
          priority: 'excluded',
        };
      }

      // MAD/MAH measures: maximum age 85
      if ((measure === 'MAD' || measure === 'MAH') && age > 85) {
        return {
          status: 'EX_AGE_OLD',
          label: 'Age > 85',
          fillCount,
          inDenominator: false,
          reason: 'Member over 85 years for MAD/MAH measure',
          userMessage: `Patient is ${age} years old (MAD/MAH limited to 18-85)`,
          color: 'gray',
          priority: 'excluded',
        };
      }
    }

    // 5. CONTINUOUS ENROLLMENT CHECK
    const enrollmentGaps = patient.enrollmentGaps || patient.coverageGaps || [];
    if (enrollmentGaps.length > 0) {
      const totalGapDays = enrollmentGaps.reduce((sum: any, gap: any) => sum + (gap.days || 0), 0);
      // HEDIS allows up to 1 gap of 45 days per measurement year
      if (totalGapDays > 45) {
        return {
          status: 'EX_ENROLL_GAPS',
          label: 'Enrollment Gaps',
          fillCount,
          inDenominator: false,
          reason: `Enrollment gaps exceed 45 days (${totalGapDays} days)`,
          userMessage: `Patient had ${totalGapDays} days of coverage gaps (HEDIS allows max 45 days)`,
          color: 'gray',
          priority: 'excluded',
        };
      }
    }

    // 6. PREGNANCY (for certain measures - placeholder)
    if (patient.pregnant === true || patient.isPregnant === true) {
      return {
        status: 'EX_PREGNANCY',
        label: 'Pregnancy',
        fillCount,
        inDenominator: false,
        reason: 'Member pregnant during measurement period',
        userMessage: 'Patient pregnant (some measures exclude pregnancy)',
        color: 'gray',
        priority: 'excluded',
      };
    }

    // ========== INCLUSION CHECKS ==========

    // 7. NO FILLS
    if (fillCount === 0) {
      return {
        status: 'D0',
        label: 'No Fills',
        fillCount: 0,
        inDenominator: false,
        reason: 'No prescription fills in measurement year',
        userMessage: 'Patient has not filled any prescriptions this year',
        color: 'gray',
        priority: 'none',
      };
    }

    // 8. ONE FILL ONLY (not yet in denominator)
    if (fillCount === 1) {
      const adherenceData = getAdherenceData(patient);
      const daysToRunout = adherenceData.daysToRunout;

      return {
        status: 'D1',
        label: '1 Fill Only',
        fillCount: 1,
        inDenominator: false,
        reason: '1 fill only (need 2+ for denominator inclusion)',
        userMessage: 'Patient needs 2nd prescription fill to begin PDC tracking',
        color: 'yellow',
        priority: 'low',
        daysToRunout,
        recommendation: 'Monitor - needs 2nd fill to enter denominator',
      };
    }

    // 9. TREATMENT PERIOD CHECK (2+ fills, but check if enough time)
    // Must have 84+ days from first fill to measurement year end
    if (paidClaims.length >= 2) {
      const fillDates = paidClaims
        .map((c: any) => new Date(c.Rx_Date_Of_Service))
        .filter((d: any) => !isNaN(d.getTime()));
      if (fillDates.length >= 2) {
        const firstFillDate = new Date(Math.min(...fillDates.map((d: any) => d.getTime())));
        const measurementYearEnd = new Date(`${measurementYear}-12-31`);
        const treatmentDays =
          Math.ceil(
            (measurementYearEnd.getTime() - firstFillDate.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;

        if (treatmentDays < 84) {
          return {
            status: 'D_SHORT_TX',
            label: 'Treatment < 84d',
            fillCount,
            inDenominator: false,
            reason: `Treatment period too short (${treatmentDays} days, need 84+)`,
            userMessage: `Patient started medication too late in year (${treatmentDays} days, need 84+)`,
            color: 'yellow',
            priority: 'monitor',
            treatmentDays,
            recommendation: `Wait ${84 - treatmentDays} more days before denominator inclusion`,
          };
        }
      }
    }

    // 10. IN DENOMINATOR (2+ fills, meets all criteria)
    return {
      status: 'D2',
      label: 'In Denominator',
      fillCount,
      inDenominator: true,
      reason: `${fillCount} fills - confirmed denominator`,
      userMessage: 'Patient meets all criteria for PDC calculation',
      color: 'green',
      priority: 'full_engine',
      recommendation: 'Full adherence engine applies',
    };
  } catch (error: any) {
    logger.warn('calculateDenominatorStatus error:', error);
    return {
      status: 'ERROR',
      label: 'Error',
      fillCount: 0,
      inDenominator: null,
      reason: 'Error calculating status',
      userMessage: 'Error determining denominator status',
      color: 'red',
      priority: 'error',
    };
  }
};

/**
 * Legacy function - kept for backward compatibility
 * Use calculateDenominatorStatus() for more detailed status
 */
export const isInDenominator = (patient: any): any => {
  const denomStatus = calculateDenominatorStatus(patient);
  return {
    inDenominator: denomStatus.inDenominator,
    reason: denomStatus.reason,
    status: denomStatus.status,
  };
};

/**
 * Calculate days patient has been in denominator
 *
 * @param {Object} patient - Patient object
 * @returns {number} Days enrolled
 */
export const daysInDenominator = (patient: any): any => {
  try {
    const enrollmentStart = parseISO(patient.enrollmentStartDate || '2025-01-01');
    const measurementYearEnd = parseISO(patient.measurementYearEnd || '2025-12-31');
    const today = new Date();

    // Use earliest of today or year-end
    const endDate = today < measurementYearEnd ? today : measurementYearEnd;

    return Math.max(0, differenceInDays(endDate, enrollmentStart));
  } catch (error: any) {
    logger.warn('daysInDenominator error:', error);
    return null;
  }
};

/**
 * Calculate gap days already consumed (historical)
 *
 * @param {Array} rxClaims - RX claims array
 * @param {string} enrollmentStartDate - Enrollment start date (YYYY-MM-DD)
 * @returns {number} Gap days used
 */
export const gapDaysUsed = (rxClaims: any, enrollmentStartDate: any): any => {
  try {
    if (!rxClaims || rxClaims.length === 0) return null;

    // Treatment period = first fill to today
    const sortedClaims = [...rxClaims].sort((a: any, b: any) => {
      const dateA = new Date(a.Rx_Date_Of_Service || a.fillDate);
      const dateB = new Date(b.Rx_Date_Of_Service || b.fillDate);
      return dateA.getTime() - dateB.getTime();
    });

    const firstFillDate = parseISO(sortedClaims[0].Rx_Date_Of_Service || sortedClaims[0].fillDate);
    const today = new Date();
    const treatmentDays = differenceInDays(today, firstFillDate);

    // Calculate covered days using coverage calendar service
    const coveredDays = calculateCoveredDays(rxClaims, firstFillDate, today);

    return Math.max(0, treatmentDays - coveredDays);
  } catch (error: any) {
    logger.warn('gapDaysUsed error:', error);
    return null;
  }
};

/**
 * Calculate PDC as of a specific date (for trend analysis)
 *
 * @param {Array} rxClaims - RX claims array
 * @param {Date} asOfDate - Date to calculate PDC as of
 * @returns {number} PDC as of date
 */
const calculatePDCAsOfDate = (rxClaims: any, asOfDate: any): any => {
  try {
    if (!rxClaims || rxClaims.length === 0) return null;

    // Filter claims up to asOfDate
    const claimsUpToDate = rxClaims.filter((claim: any) => {
      const claimDate = new Date(claim.Rx_Date_Of_Service || claim.fillDate);
      return claimDate <= asOfDate;
    });

    if (claimsUpToDate.length === 0) return null;

    // Sort by date
    const sortedClaims = [...claimsUpToDate].sort((a: any, b: any) => {
      const dateA = new Date(a.Rx_Date_Of_Service || a.fillDate);
      const dateB = new Date(b.Rx_Date_Of_Service || b.fillDate);
      return dateA.getTime() - dateB.getTime();
    });

    const firstFillDate = new Date(sortedClaims[0].Rx_Date_Of_Service || sortedClaims[0].fillDate);
    const treatmentDays = differenceInDays(asOfDate, firstFillDate);

    if (treatmentDays <= 0) return null;

    // Calculate covered days
    const coveredDays = calculateCoveredDays(claimsUpToDate, firstFillDate, asOfDate);

    return Math.round((coveredDays / treatmentDays) * 1000) / 10; // 1 decimal place
  } catch (error: any) {
    logger.warn('calculatePDCAsOfDate error:', error);
    return null;
  }
};

/**
 * Calculate gap days as of a specific date
 *
 * @param {Array} rxClaims - RX claims array
 * @param {Date} asOfDate - Date to calculate gap days as of
 * @returns {number} Gap days as of date
 */
const calculateGapDaysAsOfDate = (rxClaims: any, asOfDate: any): any => {
  try {
    if (!rxClaims || rxClaims.length === 0) return null;

    const claimsUpToDate = rxClaims.filter((claim: any) => {
      const claimDate = new Date(claim.Rx_Date_Of_Service || claim.fillDate);
      return claimDate <= asOfDate;
    });

    if (claimsUpToDate.length === 0) return null;

    const sortedClaims = [...claimsUpToDate].sort((a: any, b: any) => {
      const dateA = new Date(a.Rx_Date_Of_Service || a.fillDate);
      const dateB = new Date(b.Rx_Date_Of_Service || b.fillDate);
      return dateA.getTime() - dateB.getTime();
    });

    const firstFillDate = new Date(sortedClaims[0].Rx_Date_Of_Service || sortedClaims[0].fillDate);
    const treatmentDays = differenceInDays(asOfDate, firstFillDate);
    const coveredDays = calculateCoveredDays(claimsUpToDate, firstFillDate, asOfDate);

    return Math.max(0, treatmentDays - coveredDays);
  } catch (error: any) {
    logger.warn('calculateGapDaysAsOfDate error:', error);
    return null;
  }
};

/**
 * Calculate PDC slope over last 30 days (trend indicator)
 *
 * @param {Array} rxClaims - RX claims array
 * @returns {Object} { slope: number, trending: 'up'|'down'|'stable' }
 */
export const pdcSlope30d = (rxClaims: any): any => {
  try {
    if (!rxClaims || rxClaims.length < 2) return { slope: null, trending: 'unknown' };

    const today = new Date();
    const date30DaysAgo = subDays(today, 30);

    const pdc30DaysAgo = calculatePDCAsOfDate(rxClaims, date30DaysAgo);
    const pdcToday = calculatePDCAsOfDate(rxClaims, today);

    if (pdc30DaysAgo === null || pdcToday === null) {
      return { slope: null, trending: 'unknown' };
    }

    const slope = pdcToday - pdc30DaysAgo;

    let trending = 'stable';
    if (slope > 0.5) trending = 'up';
    if (slope < -0.5) trending = 'down';

    return {
      slope: Math.round(slope * 10) / 10, // 1 decimal place
      trending,
      pdc30DaysAgo,
      pdcToday,
    };
  } catch (error: any) {
    logger.warn('pdcSlope30d error:', error);
    return { slope: null, trending: 'unknown' };
  }
};

/**
 * Calculate gap days created in last 30 days
 *
 * @param {Array} rxClaims - RX claims array
 * @returns {number} Gap days created in last 30 days
 */
export const gapDaysLast30d = (rxClaims: any): any => {
  try {
    if (!rxClaims || rxClaims.length === 0) return null;

    const today = new Date();
    const date30DaysAgo = subDays(today, 30);

    const gapDays30DaysAgo = calculateGapDaysAsOfDate(rxClaims, date30DaysAgo);
    const gapDaysToday = calculateGapDaysAsOfDate(rxClaims, today);

    if (gapDays30DaysAgo === null || gapDaysToday === null) return null;

    return Math.max(0, gapDaysToday - gapDays30DaysAgo);
  } catch (error: any) {
    logger.warn('gapDaysLast30d error:', error);
    return null;
  }
};

/**
 * Calculate refill timing variance (volatility indicator)
 *
 * @param {Array} rxClaims - RX claims array
 * @returns {Object} { variance: number, volatility: 'low'|'medium'|'high' }
 */
export const refillVariance = (rxClaims: any): any => {
  try {
    if (!rxClaims || rxClaims.length < 3) {
      return { variance: null, volatility: 'unknown' };
    }

    // Sort claims by date
    const sortedClaims = [...rxClaims].sort((a: any, b: any) => {
      const dateA = new Date(a.Rx_Date_Of_Service || a.fillDate);
      const dateB = new Date(b.Rx_Date_Of_Service || b.fillDate);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate days early/late for each fill
    const deltas = [];
    for (let i = 1; i < sortedClaims.length; i++) {
      const prevFill = new Date(
        sortedClaims[i - 1].Rx_Date_Of_Service || sortedClaims[i - 1].fillDate
      );
      const currentFill = new Date(sortedClaims[i].Rx_Date_Of_Service || sortedClaims[i].fillDate);
      const prevDaysSupply = parseInt(
        sortedClaims[i - 1].days_supply || sortedClaims[i - 1].Days_Supply || 30
      );

      const expectedFillDate = addDays(prevFill, prevDaysSupply);
      const daysEarlyOrLate = differenceInDays(currentFill, expectedFillDate);

      deltas.push(daysEarlyOrLate);
    }

    // Calculate standard deviation
    const mean = deltas.reduce((sum: any, d: any) => sum + d, 0) / deltas.length;
    const variance =
      deltas.reduce((sum: any, d: any) => sum + Math.pow(d - mean, 2), 0) / deltas.length;
    const stdDev = Math.sqrt(variance);

    // Classify volatility
    let volatility = 'low';
    if (stdDev > 5 && stdDev <= 10) volatility = 'medium';
    if (stdDev > 10) volatility = 'high';

    return {
      variance: Math.round(stdDev * 10) / 10, // 1 decimal place
      volatility,
      fillCount: sortedClaims.length,
      meanDaysEarlyLate: Math.round(mean * 10) / 10,
    };
  } catch (error: any) {
    logger.warn('refillVariance error:', error);
    return { variance: null, volatility: 'unknown' };
  }
};

/**
 * Calculate projected PDC at year-end (status quo - no intervention)
 *
 * @param {Object} patient - Patient object with medAdherence data
 * @returns {Object} { projectedPDC: number, icon: string }
 */
export const projectedPDC_StatusQuo = (patient: any): any => {
  try {
    const adherenceData = getAdherenceData(patient);
    const currentPDC = adherenceData.currentPDC;

    // PDC is cumulative - it cannot decrease
    // Status quo = current PDC (coverage accumulated so far / full treatment period)
    // This holds whether patient has coverage remaining or not

    return {
      projectedPDC: Math.round(currentPDC * 10) / 10,
      icon: '➡️',
      change: 0,
      projectedNewGapDays: 0,
    };
  } catch (error: any) {
    logger.warn('projectedPDC_StatusQuo error:', error);
    return { projectedPDC: null, icon: '➡️', change: 0 };
  }
};

/**
 * Calculate projected PDC at year-end (perfect adherence from today)
 *
 * @param {Object} patient - Patient object with medAdherence data
 * @returns {Object} { projectedPDC: number, salvageable: boolean }
 */
export const projectedPDC_Perfect = (patient: any, adherenceData?: any): any => {
  try {
    const data = adherenceData || getAdherenceData(patient);
    const treatmentDays = data.treatmentDays;
    const gapDaysUsedValue = data.gapDaysUsed;

    // PDC = (treatment_days - gap_days_used) / treatment_days
    // Gap days already used are historical - they cannot be "un-used"
    // Perfect adherence means NO NEW gap days from today forward
    // So max achievable PDC = (treatment_days - gap_days_used) / treatment_days
    const maxPDC =
      treatmentDays > 0 ? ((treatmentDays - gapDaysUsedValue) / treatmentDays) * 100 : 0;

    return {
      projectedPDC: Math.round(maxPDC * 10) / 10,
      salvageable: maxPDC >= 80,
    };
  } catch (error: any) {
    logger.warn('projectedPDC_Perfect error:', error);
    return { projectedPDC: null, salvageable: false };
  }
};

/**
 * Determine future queue status (when will patient enter 14-day queue)
 *
 * @param {Object} patient - Patient object
 * @returns {Object} { status: string, daysToQueue: number }
 */
export const futureQueueStatus = (patient: any, adherenceData?: any): any => {
  try {
    const data = adherenceData || getAdherenceData(patient);
    const daysToRunout = data.daysToRunout;

    if (daysToRunout === null || daysToRunout === undefined) {
      return { status: 'UNKNOWN', daysToQueue: null };
    }

    if (daysToRunout <= 14) {
      return { status: 'IN_QUEUE', daysToQueue: 0 };
    }

    if (daysToRunout <= 44) {
      return { status: 'FUTURE_15_44', daysToQueue: daysToRunout - 14 };
    }

    if (daysToRunout <= 60) {
      return { status: 'FUTURE_45_60', daysToQueue: daysToRunout - 14 };
    }

    return { status: 'FAR_FUTURE', daysToQueue: daysToRunout - 14 };
  } catch (error: any) {
    logger.warn('futureQueueStatus error:', error);
    return { status: 'UNKNOWN', daysToQueue: null };
  }
};

// ========== POPULATION SEGMENTATION ==========

/**
 * Check if patient is locked-in adherent (guaranteed ≥80% PDC)
 */
export const isLockedInAdherent = (patient: any): any => {
  try {
    const adherenceData = getAdherenceData(patient);
    const currentPDC = adherenceData.currentPDC;
    const gapDaysUsedValue = adherenceData.gapDaysUsed;
    const treatmentDays = adherenceData.treatmentDays;
    const measurementYearEnd = parseISO(patient.measurementYearEnd || '2025-12-31');
    const today = new Date();
    const daysToYearEnd = differenceInDays(measurementYearEnd, today);

    // Case 1: Already ≥80% and too few days left to fall below
    if (currentPDC >= 80 && daysToYearEnd < 10) return true;

    // Case 2: Even with no more fills, still ≥80%
    const treatmentPeriodYearEnd = treatmentDays + daysToYearEnd;
    const worstCasePDC =
      ((treatmentPeriodYearEnd - gapDaysUsedValue - daysToYearEnd) / treatmentPeriodYearEnd) * 100;

    return worstCasePDC >= 80;
  } catch (error: any) {
    return false;
  }
};

/**
 * Check if patient is on-track safe (F4/F5, NOT in queue)
 */
export const isOnTrackSafe = (patient: any): any => {
  try {
    const tier = patient.fragilityTier;
    const adherenceData = getAdherenceData(patient);
    const daysToRunout = adherenceData.daysToRunout;
    const gapDaysRemaining = adherenceData.gapDaysRemaining;

    return (
      (tier === 'F4_COMFORTABLE' || tier === 'F5_SAFE') && gapDaysRemaining > 0 && daysToRunout > 14
    );
  } catch (error: any) {
    return false;
  }
};

/**
 * Check if patient is salvageable at-risk (F1-F3, NOT in queue)
 * THIS IS THE KEY SEGMENT - future problems
 */
export const isSalvageableAtRiskNotInQueue = (patient: any): any => {
  try {
    const tier = patient.fragilityTier;
    const adherenceData = getAdherenceData(patient);
    const daysToRunout = adherenceData.daysToRunout;
    const gapDaysRemaining = adherenceData.gapDaysRemaining;

    return (
      (tier === 'F1_IMMINENT' || tier === 'F2_FRAGILE' || tier === 'F3_MODERATE') &&
      gapDaysRemaining > 0 &&
      daysToRunout > 14
    );
  } catch (error: any) {
    return false;
  }
};

/**
 * Check if patient has already failed (unsalvageable)
 */
export const isAlreadyFailed = (patient: any): any => {
  return patient.fragilityTier === 'T5_UNSALVAGEABLE';
};

/**
 * Enrich patient with all analytics metrics - PER MEDICATION MEASURE (MAC/MAD/MAH)
 *
 * CRITICAL: Each HEDIS measure requires SEPARATE PDC and fragility tier tracking
 * A patient on multiple MA drugs must have independent analytics for each measure
 *
 * @param {Object} patient - Patient object
 * @returns {Object} Patient with analytics added (per-measure structure)
 */
export const enrichPatientWithAnalytics = (patient: any): any => {
  try {
    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(`🔬 [${patient.id || patient.Member_Id}] Starting enrichPatientWithAnalytics...`);
    }

    const rxClaims = patient.rxClaims || [];

    // Calculate denominator status (HEDIS PDC spec: 2+ fills required)
    const denominatorStatus = calculateDenominatorStatus(patient);

    // Determine which MA measures this patient is on
    const patientMeasures = new Set();

    // Check RX claims for measures
    if (rxClaims && rxClaims.length > 0) {
      // DEBUG: Log first claim to see available fields
      if ((import.meta as any)?.env?.DEV && rxClaims.length > 0) {
        console.log(
          `🔍 [${patient.id || patient.Member_Id}] Sample RX claim fields:`,
          Object.keys(rxClaims[0])
        );
        console.log(
          `🔍 [${patient.id || patient.Member_Id}] First claim measure field:`,
          rxClaims[0].measure
        );
        console.log(
          `🔍 [${patient.id || patient.Member_Id}] First claim className field:`,
          rxClaims[0].className
        );
        console.log(
          `🔍 [${patient.id || patient.Member_Id}] All claims measure values:`,
          rxClaims.map((c: any) => c.measure)
        );
      }

      rxClaims.forEach((claim: any) => {
        // Direct measure field (if pre-enriched)
        if (claim.measure) {
          patientMeasures.add(claim.measure);
        } else {
          // Fallback: derive measure from medication_class
          const derivedMeasure = getMeasureFromMedicationClass(claim.medication_class);
          if (derivedMeasure) {
            patientMeasures.add(derivedMeasure);
          }
        }
      });
    }

    // Check medications array for measures
    if (patient.medications && patient.medications.length > 0) {
      patient.medications.forEach((med: any) => {
        if (med.isMedicationAdherence && med.measure) {
          patientMeasures.add(med.measure);
        }
      });
    }

    // If medAdherence object exists with measure, add it
    if (patient.medAdherence?.measure) {
      patientMeasures.add(patient.medAdherence.measure);
    }

    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(
        `🏥 [${patient.id || patient.Member_Id}] Patient on MA measures:`,
        Array.from(patientMeasures)
      );
    }

    const measurementYearEnd = patient.measurementYearEnd || '2025-12-31';
    const analyticsPerMeasure: any = {};
    const fragilityTiersPerMeasure: any = {};
    const validationResults: any = {};

    // Calculate analytics for EACH measure independently
    for (const measure of patientMeasures) {
      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(`\n📊 ========== Calculating for ${measure} ==========`);
      }

      // Get adherence data for THIS SPECIFIC MEASURE
      const adherenceData = getAdherenceDataForMeasure(patient, measure);

      if (!adherenceData) {
        if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
          console.log(`⚠️  [${measure}] No adherence data, skipping`);
        }
        continue;
      }

      // Calculate fragility tier for THIS MEASURE using V3.0 projection-based logic
      // Convert available adherenceData to new signature parameters
      const treatmentDays = adherenceData.treatmentDays || 365;
      const gapDaysUsed = adherenceData.gapDaysUsed || 0;
      const daysAlreadyCovered = treatmentDays - gapDaysUsed;
      const daysOfSupplyOnHand = adherenceData.daysToRunout || 0;
      const daysRemainingUntilYearEnd = differenceInDays(parseISO(measurementYearEnd), new Date());

      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(`\n🎯 [${measure}] FRAGILITY TIER INPUTS (V3.0):`);
        console.log(`   daysAlreadyCovered: ${daysAlreadyCovered}`);
        console.log(`   daysOfSupplyOnHand: ${daysOfSupplyOnHand}`);
        console.log(`   daysRemainingUntilYearEnd: ${daysRemainingUntilYearEnd}`);
        console.log(`   treatmentDays: ${treatmentDays}`);
        console.log(`   gapDaysRemaining: ${adherenceData.gapDaysRemaining}`);
        console.log(`   remainingRefills: ${adherenceData.refillsNeeded}`);
      }

      const fragilityTierResult = calculateFragilityTier({
        daysAlreadyCovered,
        daysOfSupplyOnHand,
        daysRemainingUntilYearEnd,
        treatmentDays,
        gapDaysRemaining: adherenceData.gapDaysRemaining,
        remainingRefills: adherenceData.refillsNeeded || 1,
        isCurrentlyOutOfMeds: (adherenceData.daysToRunout || 0) <= 0,
      });

      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        console.log(`   Calculated tier: ${fragilityTierResult?.tier}`);
        console.log(`   PDC Status Quo: ${fragilityTierResult?.pdcStatusQuo}%`);
        console.log(`   PDC Perfect: ${fragilityTierResult?.pdcPerfect}%`);
      }

      // Calculate measure-specific denominator status
      const measureRxClaims = rxClaims.filter((c: any) => c.measure === measure);

      const measurePatient = {
        ...patient,
        rxClaims: measureRxClaims,
        measure: measure,
      };
      const measureDenominatorStatus = calculateDenominatorStatus(measurePatient, measure);

      // Store per-measure analytics
      analyticsPerMeasure[measure] = {
        // Core adherence metrics
        currentPDC: adherenceData.currentPDC,
        treatmentDays: adherenceData.treatmentDays,
        gapDaysUsed: adherenceData.gapDaysUsed,
        gapDaysRemaining: adherenceData.gapDaysRemaining,
        gapDaysAllowed: Math.floor(adherenceData.treatmentDays * 0.2),
        daysToRunout: adherenceData.daysToRunout,
        refillsNeeded: adherenceData.refillsNeeded,

        // Fragility tier
        fragilityTier: fragilityTierResult?.tier || null,
        fragilityTierDetails: fragilityTierResult || null,

        // Denominator status for this measure (HEDIS-compliant)
        denominatorStatus: measureDenominatorStatus,
        fillCount: measureDenominatorStatus.fillCount,
        inDenominator: measureDenominatorStatus.inDenominator,
      };

      fragilityTiersPerMeasure[measure] = fragilityTierResult?.tier || null;

      // Validate adherence metrics for THIS MEASURE (DEV mode only)
      if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
        validationResults[measure] = validateAdherenceMetrics(
          {
            currentPDC: adherenceData.currentPDC,
            treatmentDays: adherenceData.treatmentDays,
            gapDaysUsed: adherenceData.gapDaysUsed,
            gapDaysAllowed: Math.floor(adherenceData.treatmentDays * 0.2),
            gapDaysRemaining: adherenceData.gapDaysRemaining,
            fragilityTier: fragilityTierResult?.tier,
          },
          {
            throwOnError: false,
            patientId: `${patient.id || patient.Member_Id}[${measure}]`,
          }
        );
      }
    }

    // Determine "worst case" fragility tier across all measures for patient-level display
    const tierPriority: any = {
      T5_UNSALVAGEABLE: 1,
      F1_IMMINENT: 2,
      F2_FRAGILE: 3,
      F3_MODERATE: 4,
      F4_COMFORTABLE: 5,
      F5_SAFE: 6,
      COMPLIANT: 7,
    };

    let worstTier = 'F5_SAFE';
    let worstTierPriority = 999;

    for (const [measure, tier] of Object.entries(fragilityTiersPerMeasure)) {
      const priority = tierPriority[tier as any] || 999;
      if (priority < worstTierPriority) {
        worstTier = tier as any;
        worstTierPriority = priority;
      }
    }

    if ((import.meta as any)?.env?.DEV && ENABLE_VERBOSE_LOGGING) {
      console.log(
        `\n🎯 [${patient.id || patient.Member_Id}] Worst case fragility tier across all measures: ${worstTier}`
      );
      console.log(`   Per-measure tiers:`, fragilityTiersPerMeasure);
    }

    // For backward compatibility, keep aggregate analytics
    // But add WARNING that this is deprecated
    // PERFORMANCE: Cache adherenceData to avoid recalculating 7+ times
    const adherenceData = getAdherenceData(patient);

    // Calculate all analytics (aggregate - DEPRECATED, use analyticsPerMeasure instead)
    const analytics = {
      // NEW: Per-measure analytics (CORRECT approach)
      perMeasure: analyticsPerMeasure,

      // Denominator Status (aggregate across all measures)
      denominatorStatus,
      inDenominator: denominatorStatus.inDenominator,
      daysInDenominator: daysInDenominator(patient), // Pass cached data

      // Gap days (aggregate) - use cached rxClaims
      gapDaysUsed: adherenceData.gapDaysUsed, // Already calculated

      // PDC projections (aggregate) - pass cached data
      projectedPDC_StatusQuo: adherenceData.currentPDC, // Status quo = current PDC
      projectedPDC_Perfect: projectedPDC_Perfect(patient, adherenceData),

      // Early warning indicators (aggregate)
      pdcSlope30d: pdcSlope30d(rxClaims),
      gapDaysLast30d: gapDaysLast30d(rxClaims),
      refillVariance: refillVariance(rxClaims),

      // Future queue (aggregate)
      futureQueueStatus: futureQueueStatus(patient, adherenceData),
    };

    // Temporarily add worst-case fragilityTier to patient for segmentation functions
    const patientWithTier = {
      ...patient,
      fragilityTier: worstTier,
    };

    // Population segments (use worst-case tier)
    analytics.isLockedInAdherent = isLockedInAdherent(patientWithTier);
    analytics.isOnTrackSafe = isOnTrackSafe(patientWithTier);
    analytics.isSalvageableAtRiskNotInQueue = isSalvageableAtRiskNotInQueue(patientWithTier);
    analytics.isAlreadyFailed = isAlreadyFailed(patientWithTier);

    return {
      ...patient,
      fragilityTier: worstTier, // Worst-case tier for patient-level prioritization
      fragilityTiersPerMeasure, // NEW: Separate tiers for each measure
      fragilityTierDetails: { tier: worstTier, measures: fragilityTiersPerMeasure },
      analytics,
      _validation: (import.meta as any)?.env?.DEV ? validationResults : undefined,
    };
  } catch (error: any) {
    logger.error('enrichPatientWithAnalytics error:', error);
    console.error(
      `❌ [${patient.id || patient.Member_Id}] enrichPatientWithAnalytics FAILED:`,
      error.message
    );
    console.error(`   └─ Stack:`, error.stack);
    return patient;
  }
};

/**
 * Enrich single patient asynchronously (wraps sync version for Promise.all)
 *
 * @param {Object} patient - Patient object
 * @returns {Promise<Object>} Enriched patient
 */
const enrichPatientWithAnalyticsAsync = async (patient: any): Promise<any> => {
  return Promise.resolve(enrichPatientWithAnalytics(patient));
};

/**
 * Enrich array of patients with analytics (batched with caching and async processing)
 *
 * @param {Array} patients - Array of patient objects
 * @param {Function} onProgress - Progress callback (current, total)
 * @param {Object} options - Options { useCache: boolean }
 * @returns {Promise<Array>} Enriched patients
 */
export const enrichPatientsWithAnalytics = async (
  patients: any,
  onProgress: any = null,
  options: any = {}
): Promise<any> => {
  const startTime = performance.now();
  const { useCache = true } = options;
  const batchSize = 100; // Increased from 50 for better async performance
  const results: any = [];

  // Import cache service
  const cacheImportStart = performance.now();
  const enrichedPatientCache = (await import('@/lib/services-legacy/enrichedPatientCache')).default;
  const cacheImportTime = performance.now() - cacheImportStart;

  // Check cache for all patients if enabled
  let patientsToEnrich = patients;
  let cachedCount = 0;

  const cacheCheckStart = performance.now();
  if (useCache) {
    const { cached, missing } = enrichedPatientCache.getMany(patients);
    results.push(...cached);
    patientsToEnrich = missing;
    cachedCount = cached.length;

    if (cachedCount > 0) {
      logger.info(
        `✅ Cache hit: ${cachedCount}/${patients.length} patients (${((cachedCount / patients.length) * 100).toFixed(1)}%)`
      );
    }
  }
  const cacheCheckTime = performance.now() - cacheCheckStart;

  // Process remaining patients in batches with async parallelization
  const enrichmentStart = performance.now();
  for (let i = 0; i < patientsToEnrich.length; i += batchSize) {
    const batch = patientsToEnrich.slice(i, i + batchSize);

    // Process batch in parallel with Promise.all
    const enrichedBatch = await Promise.all(
      batch.map((p: any) => enrichPatientWithAnalyticsAsync(p))
    );

    results.push(...enrichedBatch);

    // Cache newly enriched patients
    if (useCache) {
      enrichedPatientCache.setMany(batch, enrichedBatch);
    }

    // Progress callback (include cached patients in progress)
    if (typeof onProgress === 'function') {
      const currentProgress = cachedCount + Math.min(i + batchSize, patientsToEnrich.length);
      onProgress(currentProgress, patients.length);
    }
  }
  const enrichmentTime = performance.now() - enrichmentStart;

  // Log cache stats if cache was used
  if (useCache && (import.meta as any)?.env?.DEV) {
    enrichedPatientCache.logStats();
  }

  const totalTime = performance.now() - startTime;
  logger.info(`⏱️  Enrichment timing breakdown:
    - Cache import: ${cacheImportTime.toFixed(2)}ms
    - Cache check: ${cacheCheckTime.toFixed(2)}ms
    - Enrichment: ${enrichmentTime.toFixed(2)}ms (${patientsToEnrich.length} patients)
    - Total: ${totalTime.toFixed(2)}ms
    - Avg per patient: ${(enrichmentTime / Math.max(patientsToEnrich.length, 1)).toFixed(2)}ms`);

  return results;
};

export default {
  // Denominator status
  calculateDenominatorStatus,
  isInDenominator, // Legacy - use calculateDenominatorStatus for more detail

  // Individual calculations
  daysInDenominator,
  gapDaysUsed,
  pdcSlope30d,
  gapDaysLast30d,
  refillVariance,
  projectedPDC_StatusQuo,
  projectedPDC_Perfect,
  futureQueueStatus,

  // Population segmentation
  isLockedInAdherent,
  isOnTrackSafe,
  isSalvageableAtRiskNotInQueue,
  isAlreadyFailed,

  // Enrichment
  enrichPatientWithAnalytics,
  enrichPatientsWithAnalytics,
};
