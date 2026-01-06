/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, import/no-anonymous-default-export, max-lines-per-function, complexity */
/**
 * Med Adherence Service
 * Handles medication adherence checking and Firebase operations for Med Adherence drugs
 */

import {
  medAdherenceDrugs,
  flattenedMedAdherenceDrugs,
  medAdherenceSearchIndex,
  MED_ADHERENCE_MEASURES,
} from '@/data/medAdherenceDrugs';
import logger from '@/lib/services-legacy/loggerService';
import { loadMemberClaims, filterPaidClaims } from '@/lib/services-legacy/rxClaimsService';

const MED_ADHERENCE_COLLECTION = 'medAdherenceDrugs';

// Firebase stub
const db: any = null;
const setDoc = (...args: any[]) => {
  console.warn('[FIREBASE STUB] setDoc called - not implemented in Medplum app');
  return Promise.resolve();
};
const getDoc = (...args: any[]) => {
  console.warn('[FIREBASE STUB] getDoc called - not implemented in Medplum app');
  return Promise.resolve({ exists: () => false, data: () => ({}) });
};
const getDocs = (...args: any[]) => {
  console.warn('[FIREBASE STUB] getDocs called - not implemented in Medplum app');
  return Promise.resolve({ docs: [] });
};
const collection = (...args: any[]) => {
  console.warn('[FIREBASE STUB] collection called - not implemented in Medplum app');
  return {};
};
const doc = (...args: any[]) => {
  console.warn('[FIREBASE STUB] doc called - not implemented in Medplum app');
  return {};
};

/**
 * Upload Med Adherence drug list to Firebase
 * This is a one-time initialization function
 * @returns {Promise<{success: boolean, count: number, error?: string}>}
 */
export const uploadMedAdherenceDrugsToFirebase = async (): Promise<any> => {
  try {
    logger.info('Starting upload of Med Adherence drugs to Firebase...');

    let uploadCount = 0;

    // Upload each drug with its unique identifier
    for (const drug of flattenedMedAdherenceDrugs) {
      const drugId = `${drug.generic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${drug.measure}`;
      const drugRef = doc(db, MED_ADHERENCE_COLLECTION, drugId);

      await setDoc(drugRef, {
        generic: drug.generic,
        brand: drug.brand,
        measure: drug.measure,
        subcategory: drug.subcategory,
        strengths: drug.strengths,
        note: drug.note,
        searchTerms: [
          drug.generic.toLowerCase(),
          drug.brand.toLowerCase(),
          drug.generic.toLowerCase().replace(/[\s-]/g, ''),
          drug.brand.toLowerCase().replace(/[\s-]/g, ''),
        ],
        updatedAt: new Date().toISOString(),
      });

      uploadCount++;
    }

    // Also store metadata document
    const metadataRef = doc(db, MED_ADHERENCE_COLLECTION, '_metadata');
    await setDoc(metadataRef, {
      totalDrugs: flattenedMedAdherenceDrugs.length,
      measures: Object.keys(MED_ADHERENCE_MEASURES),
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    });

    logger.info(`Successfully uploaded ${uploadCount} Med Adherence drugs to Firebase`);
    return { success: true, count: uploadCount };
  } catch (error: any) {
    logger.error('Error uploading Med Adherence drugs to Firebase', { error: error.message });
    return { success: false, count: 0, error: error.message };
  }
};

/**
 * Check if a medication is a Med Adherence tracked drug
 * @param {string} medicationName - Generic or brand name of medication (may include dosage like "Lisinopril 10mg")
 * @returns {{isMedAdherence: boolean, measure?: string, subcategory?: string, className?: string, drug?: object}}
 */
export const checkMedAdherence = (medicationName: any): any => {
  if (!medicationName || typeof medicationName !== 'string') {
    return { isMedAdherence: false };
  }

  // Normalize the medication name for lookup
  const normalizedName = medicationName.toLowerCase().trim();

  // Try exact match first
  let drug =
    medAdherenceSearchIndex.get(normalizedName) ||
    medAdherenceSearchIndex.get(normalizedName.replace(/[\s-]/g, ''));

  // If no match, try stripping dosage information (e.g., "Lisinopril 10mg" -> "lisinopril")
  // Common dosage patterns: "10mg", "10 mg", "100mg", "0.5mg", "500mcg", etc.
  if (!drug) {
    // Remove dosage patterns: number + unit (mg, mcg, ml, g, etc.)
    const nameWithoutDosage = normalizedName
      .replace(/\s*\d+\.?\d*\s*(mg|mcg|ml|g|units?|iu)\b/gi, '')
      .replace(/\s*\(\d+\.?\d*\s*(mg|mcg|ml|g|units?|iu)\)\s*/gi, '')
      .trim();

    drug =
      medAdherenceSearchIndex.get(nameWithoutDosage) ||
      medAdherenceSearchIndex.get(nameWithoutDosage.replace(/[\s-]/g, ''));
  }

  // If still no match, try extracting just the first word (drug name often comes first)
  if (!drug) {
    const firstWord = normalizedName.split(/[\s\d]/)[0];
    if (firstWord && firstWord.length > 3) {
      drug =
        medAdherenceSearchIndex.get(firstWord) ||
        medAdherenceSearchIndex.get(firstWord.replace(/[\s-]/g, ''));
    }
  }

  if (drug) {
    // Determine className based on subcategory for compatibility
    const className =
      drug.subcategory ||
      (drug.measure === 'MAC'
        ? 'Statin'
        : drug.measure === 'MAD'
          ? 'Antidiabetic'
          : drug.measure === 'MAH'
            ? 'Antihypertensive'
            : '');

    return {
      isMedAdherence: true,
      measure: drug.measure,
      subcategory: drug.subcategory,
      className: className,
      generic: drug.generic,
      brand: drug.brand,
      drug: drug,
    };
  }

  return { isMedAdherence: false };
};

/**
 * Get all Med Adherence drugs for a specific measure
 * @param {string} measure - 'MAC', 'MAD', or 'MAH'
 * @returns {Array} Array of drugs for that measure
 */
export const getDrugsByMeasure = (measure: any): any => {
  if (!Object.values(MED_ADHERENCE_MEASURES).includes(measure)) {
    return [];
  }

  return flattenedMedAdherenceDrugs.filter((drug) => drug.measure === measure);
};

/**
 * Get measure display info
 * @param {string} measure - 'MAC', 'MAD', or 'MAH'
 * @returns {{name: string, color: string, icon: string, heroicon: string}}
 */
export const getMeasureDisplayInfo = (measure: any): any => {
  const measureInfo: any = {
    MAC: {
      name: 'Cholesterol (Statins)',
      shortName: 'MAC',
      color: '#9333EA', // Purple
      bgColor: '#F3E8FF',
      icon: '💊',
      heroicon: 'BeakerIcon', // Lab/chemistry for statins
    },
    MAD: {
      name: 'Diabetes',
      shortName: 'MAD',
      color: '#2563EB', // Blue
      bgColor: '#DBEAFE',
      icon: '💉',
      heroicon: 'ClipboardDocumentCheckIcon', // Monitoring/tracking
    },
    MAH: {
      name: 'Hypertension (RAS)',
      shortName: 'MAH',
      color: '#059669', // Green
      bgColor: '#D1FAE5',
      icon: '❤️',
      heroicon: 'HeartIcon', // Cardiovascular
    },
  };

  return (
    measureInfo[measure] || {
      name: 'Unknown',
      color: '#6B7280',
      icon: '❓',
      heroicon: 'QuestionMarkCircleIcon',
    }
  );
};

/**
 * Get measure badge component props
 * @param {string} measure - 'MAC', 'MAD', or 'MAH'
 * @returns {object} Props for badge rendering
 */
export const getMedAdherenceBadgeProps = (measure: any): any => {
  const info = getMeasureDisplayInfo(measure);
  return {
    text: `Med Adherence - ${info.shortName}`,
    tooltip: `${info.name} - Tracked for HEDIS/STARS quality measures`,
    style: {
      backgroundColor: info.bgColor,
      color: info.color,
      border: `1px solid ${info.color}`,
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    },
    icon: info.icon,
  };
};

/**
 * Verify Firebase data is loaded (one-time check)
 * @returns {Promise<boolean>}
 */
export const verifyMedAdherenceDataInFirebase = async (): Promise<any> => {
  try {
    const metadataRef = doc(db, MED_ADHERENCE_COLLECTION, '_metadata');
    const metadataDoc = await getDoc(metadataRef);

    if (metadataDoc.exists()) {
      const data = metadataDoc.data() as any;
      logger.info(`Med Adherence data verified in Firebase: ${data.totalDrugs} drugs`);
      return true;
    }

    logger.warn('Med Adherence data not found in Firebase - needs initialization');
    return false;
  } catch (error: any) {
    logger.error('Error verifying Med Adherence data in Firebase', { error: error.message });
    return false;
  }
};

/**
 * =============================================================================
 * GAP DAYS & PDC CALCULATION FUNCTIONS
 * =============================================================================
 * CMS-compliant Med Adherence Gap Days and PDC calculations
 */

/**
 * Calculate Med Adherence Gap Days and PDC for a patient/medication
 * @param {string} memberId - Member/Patient ID
 * @param {string} medicationIdentifier - Medication name or NDC code
 * @param {number} year - Measurement year (default: current year)
 * @returns {Promise<Object>} Gap days calculation result
 */
export const calculateGapDays = async (
  memberId: any,
  medicationIdentifier: any,
  year: any = new Date().getFullYear()
): Promise<any> => {
  try {
    // 1. Load all claims for this member in measurement year
    const allClaims = await loadMemberClaims(memberId, year);

    if (!allClaims || allClaims.length === 0) {
      return {
        hasData: false,
        error: 'No claims data found for this member',
      };
    }

    // 2. Filter to Med Adherence medication claims
    const medAdherenceClaims = allClaims.filter((claim: any) => {
      // Check by drug name
      const nameCheck = checkMedAdherence(claim.drugName);
      if (nameCheck.isMedAdherence) {
        // Also check if it matches the requested medication
        const medCheck = checkMedAdherence(medicationIdentifier);
        if (medCheck.isMedAdherence && medCheck.measure === nameCheck.measure) {
          return true;
        }
      }
      return false;
    });

    // 3. Filter to paid claims only (exclude reversals)
    const paidClaims = filterPaidClaims(medAdherenceClaims);

    if (paidClaims.length === 0) {
      return {
        hasData: false,
        error: 'No Med Adherence claims found for this medication',
      };
    }

    // 4. Sort claims by fill date
    paidClaims.sort((a: any, b: any) => a.fillDate - b.fillDate);

    // 5. Determine treatment period
    const firstFillDate = paidClaims[0].fillDate;
    if (!firstFillDate) {
      return {
        hasData: false,
        error: 'Invalid first fill date',
      };
    }

    const today = new Date();
    const endOfYear = new Date(year, 11, 31); // Dec 31
    const treatmentPeriodEnd = today < endOfYear ? today : endOfYear;

    const treatmentDays =
      Math.floor((treatmentPeriodEnd.getTime() - firstFillDate.getTime()) / (1000 * 60 * 60 * 24)) +
      1; // +1 to include both start and end dates

    // 6. Calculate covered days using CMS logic
    const coveredDays = calculateCoveredDays(paidClaims, firstFillDate, treatmentPeriodEnd);

    // 7. Calculate gap days
    const gapDays = treatmentDays - coveredDays;

    // 8. Calculate PDC
    const PDC = treatmentDays > 0 ? (coveredDays / treatmentDays) * 100 : 0;

    // 9. Calculate allowable gap days (80% threshold = 20% gap allowed)
    const maxAllowableGapDays = Math.floor(treatmentDays * 0.2);
    const remainingGapDays = maxAllowableGapDays - gapDays;

    // 10. Determine status
    let status = 'passing'; // PDC >= 80%
    let color = 'green';
    if (PDC < 80) {
      status = 'failing';
      color = 'red';
    } else if (remainingGapDays < 20) {
      status = 'at-risk';
      color = 'yellow';
    }

    return {
      hasData: true,
      memberId,
      medicationIdentifier,
      measurementYear: year,
      treatmentPeriod: {
        start: firstFillDate,
        end: treatmentPeriodEnd,
        days: treatmentDays,
      },
      fillCount: paidClaims.length,
      coveredDays,
      gapDays,
      PDC: Math.round(PDC * 10) / 10, // Round to 1 decimal
      maxAllowableGapDays,
      remainingGapDays,
      status,
      color,
      isPassing: PDC >= 80,
      daysUntilFailure: remainingGapDays > 0 ? remainingGapDays : 0,
      lastFillDate: paidClaims[paidClaims.length - 1].fillDate,
      nextFillDue: calculateNextFillDue(paidClaims[paidClaims.length - 1]),
    };
  } catch (error: any) {
    logger.error('Error calculating gap days', {
      error: error.message,
      memberId,
      medicationIdentifier,
    });
    return {
      hasData: false,
      error: error.message,
    };
  }
};

/**
 * Calculate covered days using CMS logic
 * Handles overlapping fills correctly per CMS requirements
 * @param {Array} claims - Array of claim objects (sorted by fill date)
 * @param {Date} treatmentStart - Treatment period start date
 * @param {Date} treatmentEnd - Treatment period end date
 * @returns {number} Total covered days
 */
const calculateCoveredDays = (claims: any, treatmentStart: any, treatmentEnd: any): any => {
  if (!claims || claims.length === 0) return 0;

  // Create coverage periods for each fill
  const coveragePeriods = claims.map((claim: any) => {
    const start = claim.fillDate;
    const end = new Date(start.getTime() + claim.daysSupply * 24 * 60 * 60 * 1000);
    return { start, end, daysSupply: claim.daysSupply };
  });

  // Merge overlapping periods per CMS logic
  const mergedPeriods = mergeOverlappingPeriods(coveragePeriods);

  // Calculate total covered days within treatment period
  let totalCoveredDays = 0;
  for (const period of mergedPeriods) {
    const periodStart = period.start < treatmentStart ? treatmentStart : period.start;
    const periodEnd = period.end > treatmentEnd ? treatmentEnd : period.end;

    if (periodStart < periodEnd) {
      const days = Math.floor(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      totalCoveredDays += days;
    }
  }

  return totalCoveredDays;
};

/**
 * Merge overlapping coverage periods per CMS requirements
 * When fills overlap, extend the end date but don't double-count days
 * @param {Array} periods - Array of {start, end} objects
 * @returns {Array} Merged periods
 */
const mergeOverlappingPeriods = (periods: any): any => {
  if (periods.length === 0) return [];

  // Sort by start date
  periods.sort((a: any, b: any) => a.start - b.start);

  const merged = [{ ...periods[0] }];

  for (let i = 1; i < periods.length; i++) {
    const current = periods[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      // Overlapping - extend the end date if current ends later
      last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
    } else {
      // Non-overlapping - add new period
      merged.push({ ...current });
    }
  }

  return merged;
};

/**
 * Calculate when next fill is due based on last fill
 * @param {Object} lastClaim - Last claim object
 * @returns {Date} Next fill due date
 */
const calculateNextFillDue = (lastClaim: any): any => {
  if (!lastClaim || !lastClaim.fillDate || !lastClaim.daysSupply) {
    return null;
  }

  return new Date(lastClaim.fillDate.getTime() + lastClaim.daysSupply * 24 * 60 * 60 * 1000);
};

export default {
  uploadMedAdherenceDrugsToFirebase,
  checkMedAdherence,
  getDrugsByMeasure,
  getMeasureDisplayInfo,
  getMedAdherenceBadgeProps,
  verifyMedAdherenceDataInFirebase,
  calculateGapDays,
};
