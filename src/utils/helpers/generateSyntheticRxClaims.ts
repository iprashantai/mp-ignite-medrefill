/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, import/no-anonymous-default-export, max-lines-per-function, complexity */

/**
 * Synthetic RX Claims Generator
 *
 * Generates clinically consistent prescription claims data for Med Adherence medications
 * aligned with existing patient EMR data.
 *
 * Features:
 * - Multiple fills throughout the year (realistic refill patterns)
 * - Clinically consistent with patient's existing medication
 * - Realistic gaps, early refills, and adherence scenarios
 * - Handles 30-day, 90-day, and 100-day supplies
 * - Simulates various adherence patterns (excellent, good, poor, failing)
 */

/**
 * Adherence pattern definitions
 * Controls how claims are generated for realistic scenarios
 */
const ADHERENCE_PATTERNS: any = {
  excellent: {
    name: 'Excellent Adherence',
    pdcTarget: 0.95, // 95% PDC
    refillTimingVariance: 3, // Refills within ±3 days of due date
    missedRefillProbability: 0.02, // 2% chance of missed refill
    earlyRefillProbability: 0.1, // 10% chance of early refill
  },
  good: {
    name: 'Good Adherence',
    pdcTarget: 0.85, // 85% PDC
    refillTimingVariance: 7, // Refills within ±7 days
    missedRefillProbability: 0.08, // 8% chance of missed refill
    earlyRefillProbability: 0.15,
  },
  moderate: {
    name: 'Moderate Adherence',
    pdcTarget: 0.75, // 75% PDC
    refillTimingVariance: 14, // Refills within ±14 days
    missedRefillProbability: 0.15, // 15% chance of missed refill
    earlyRefillProbability: 0.1,
  },
  poor: {
    name: 'Poor Adherence',
    pdcTarget: 0.65, // 65% PDC
    refillTimingVariance: 21, // Refills within ±21 days
    missedRefillProbability: 0.25, // 25% chance of missed refill
    earlyRefillProbability: 0.05,
  },
  failing: {
    name: 'Failing Adherence',
    pdcTarget: 0.5, // 50% PDC
    refillTimingVariance: 30, // Highly variable
    missedRefillProbability: 0.4, // 40% chance of missed refill
    earlyRefillProbability: 0.02,
  },
};

/**
 * NDC code mapping for Med Adherence medications
 * Maps medication names to NDC codes with multiple manufacturers/strengths
 */
const MED_ADHERENCE_NDC_MAPPING: any = {
  // MAC - Cholesterol (Statins)
  Atorvastatin: [
    { ndc: '00071015523', strength: '10mg', manufacturer: 'Pfizer' },
    { ndc: '00071015540', strength: '20mg', manufacturer: 'Pfizer' },
    { ndc: '00071015568', strength: '40mg', manufacturer: 'Pfizer' },
    { ndc: '00071015594', strength: '80mg', manufacturer: 'Pfizer' },
  ],
  Rosuvastatin: [
    { ndc: '00310077590', strength: '5mg', manufacturer: 'AstraZeneca' },
    { ndc: '00310077690', strength: '10mg', manufacturer: 'AstraZeneca' },
    { ndc: '00310077790', strength: '20mg', manufacturer: 'AstraZeneca' },
    { ndc: '00310077890', strength: '40mg', manufacturer: 'AstraZeneca' },
  ],
  Simvastatin: [
    { ndc: '00006074031', strength: '10mg', manufacturer: 'Merck' },
    { ndc: '00006074054', strength: '20mg', manufacturer: 'Merck' },
    { ndc: '00006074082', strength: '40mg', manufacturer: 'Merck' },
    { ndc: '00006074028', strength: '80mg', manufacturer: 'Merck' },
  ],
  Pravastatin: [
    { ndc: '00003045014', strength: '10mg', manufacturer: 'BMS' },
    { ndc: '00003045114', strength: '20mg', manufacturer: 'BMS' },
    { ndc: '00003045214', strength: '40mg', manufacturer: 'BMS' },
    { ndc: '00003045314', strength: '80mg', manufacturer: 'BMS' },
  ],

  // MAD - Diabetes
  Metformin: [
    { ndc: '00087611701', strength: '500mg', manufacturer: 'BMS' },
    { ndc: '00087611801', strength: '850mg', manufacturer: 'BMS' },
    { ndc: '00087611901', strength: '1000mg', manufacturer: 'BMS' },
  ],
  'Metformin ER': [
    { ndc: '00087662705', strength: '500mg ER', manufacturer: 'BMS' },
    { ndc: '00087662805', strength: '750mg ER', manufacturer: 'BMS' },
  ],
  Glipizide: [
    { ndc: '00049483073', strength: '5mg', manufacturer: 'Pfizer' },
    { ndc: '00049483173', strength: '10mg', manufacturer: 'Pfizer' },
  ],
  Glyburide: [
    { ndc: '00039006010', strength: '1.25mg', manufacturer: 'Aventis' },
    { ndc: '00039006110', strength: '2.5mg', manufacturer: 'Aventis' },
    { ndc: '00039006210', strength: '5mg', manufacturer: 'Aventis' },
  ],
  Glimepiride: [
    { ndc: '00088220047', strength: '1mg', manufacturer: 'Aventis' },
    { ndc: '00088220147', strength: '2mg', manufacturer: 'Aventis' },
    { ndc: '00088220247', strength: '4mg', manufacturer: 'Aventis' },
  ],
  Sitagliptin: [
    { ndc: '00006022131', strength: '25mg', manufacturer: 'Merck' },
    { ndc: '00006022231', strength: '50mg', manufacturer: 'Merck' },
    { ndc: '00006022331', strength: '100mg', manufacturer: 'Merck' },
  ],
  Dulaglutide: [
    { ndc: '00002145901', strength: '0.75mg/0.5mL', manufacturer: 'Lilly' },
    { ndc: '00002146001', strength: '1.5mg/0.5mL', manufacturer: 'Lilly' },
  ],

  // MAH - Hypertension
  Lisinopril: [
    { ndc: '00006001931', strength: '2.5mg', manufacturer: 'Merck' },
    { ndc: '00006002131', strength: '5mg', manufacturer: 'Merck' },
    { ndc: '00006002331', strength: '10mg', manufacturer: 'Merck' },
    { ndc: '00006002531', strength: '20mg', manufacturer: 'Merck' },
    { ndc: '00006002731', strength: '40mg', manufacturer: 'Merck' },
  ],
  Losartan: [
    { ndc: '00006096031', strength: '25mg', manufacturer: 'Merck' },
    { ndc: '00006096131', strength: '50mg', manufacturer: 'Merck' },
    { ndc: '00006096231', strength: '100mg', manufacturer: 'Merck' },
  ],
  Amlodipine: [
    { ndc: '00069155041', strength: '2.5mg', manufacturer: 'Pfizer' },
    { ndc: '00069155141', strength: '5mg', manufacturer: 'Pfizer' },
    { ndc: '00069155241', strength: '10mg', manufacturer: 'Pfizer' },
  ],
  Valsartan: [
    { ndc: '00078036615', strength: '40mg', manufacturer: 'Novartis' },
    { ndc: '00078037815', strength: '80mg', manufacturer: 'Novartis' },
    { ndc: '00078038815', strength: '160mg', manufacturer: 'Novartis' },
    { ndc: '00078039815', strength: '320mg', manufacturer: 'Novartis' },
  ],
};

/**
 * Get NDC code for a medication
 */
const getNDCForMedication = (medicationName: any, strength: any = null): string => {
  // Normalize medication name (remove dosage info)
  const baseMedName = medicationName.split(/\s+\d+/)[0].trim();

  const ndcOptions = MED_ADHERENCE_NDC_MAPPING[baseMedName];
  if (!ndcOptions || ndcOptions.length === 0) {
    // Fallback generic NDC
    return '99999999999';
  }

  // If strength specified, try to match
  if (strength) {
    const match = ndcOptions.find((opt: any) => opt.strength === strength);
    if (match) return match.ndc;
  }

  // Otherwise return first option
  return ndcOptions[0].ndc;
};

/**
 * Generate synthetic RX claims for a patient based on their current medication
 * IMPROVED: Now aligns with patient's actual lastFillDate for realistic data
 *
 * @param {Object} patient - Patient object from EMR data
 * @param {Object} options - Generation options
 * @returns {Array} Array of RX claim objects
 */
export const generateRxClaimsForPatient = (patient: any, options: any = {}): any[] => {
  const {
    measurementYear = 2025,
    adherencePattern = 'good', // excellent, good, moderate, poor, failing
    daysSupply = 90, // 30, 90, or 100
    includeReversals = true, // Include some reversed claims (not picked up)
  } = options;

  const claims: any[] = [];

  // Get patient's medication from EMR data
  // Support both FHIR format (medicationRequest) and simple format (medication string)
  let medicationName: any;

  if (patient.medication && typeof patient.medication === 'string') {
    // Simple format: patient.medication = "Atorvastatin 20mg"
    medicationName = patient.medication;
  } else if (patient.medicationRequest?.[0]) {
    // FHIR format: patient.medicationRequest[0].medicationCodeableConcept.text
    const medicationRequest = patient.medicationRequest[0];
    medicationName = medicationRequest.medicationCodeableConcept?.text || 'Unknown';
  } else {
    console.warn(`Patient ${patient.id} has no medication data`);
    return claims;
  }

  if (!medicationName || medicationName === 'Unknown') {
    console.warn(`Patient ${patient.id} has unknown medication`);
    return claims;
  }

  // Get adherence pattern config
  const pattern = ADHERENCE_PATTERNS[adherencePattern] || ADHERENCE_PATTERNS.good;

  // Get NDC code
  const strengthMatch = medicationName.match(/(\d+\s*mg)/i);
  const strength = strengthMatch ? strengthMatch[0] : null;
  const ndcCode = getNDCForMedication(medicationName, strength);

  // Calculate date boundaries
  const yearStart = new Date(measurementYear, 0, 1); // Jan 1
  // yearEnd not currently used but kept for future date boundary checks
  const today = new Date();

  // IMPROVED: Use patient's actual lastFillDate if available, otherwise use today
  let mostRecentFillDate: any;
  if (patient.lastFillDate) {
    // Parse lastFillDate (format: "MM/DD/YYYY" or "YYYY-MM-DD")
    const lastFillStr = patient.lastFillDate;
    if (lastFillStr.includes('/')) {
      const [month, day, year] = lastFillStr.split('/');
      mostRecentFillDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      mostRecentFillDate = new Date(lastFillStr);
    }
  } else {
    // Fallback: random recent date (last 30 days)
    mostRecentFillDate = new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
  }

  // Ensure most recent fill is not in the future
  if (mostRecentFillDate > today) {
    mostRecentFillDate = today;
  }

  // IMPROVED: Work backwards from most recent fill to create history
  const allFillDates: Date[] = [];
  let currentDate = new Date(mostRecentFillDate);
  let backtrackCount = 0;
  const maxFills = 12; // Maximum fills to generate (roughly 1 year of 90-day fills)

  // Generate fills working backwards
  while (currentDate >= yearStart && backtrackCount < maxFills) {
    allFillDates.unshift(new Date(currentDate)); // Add to beginning of array

    // Calculate previous fill date with adherence pattern variance
    const missedRefill = Math.random() < pattern.missedRefillProbability;

    if (missedRefill) {
      // Missed refill - longer gap
      const gapDuration = Math.floor(Math.random() * 30) + 14; // 14-44 day gap
      currentDate = new Date(
        currentDate.getTime() - (daysSupply + gapDuration) * 24 * 60 * 60 * 1000
      );
    } else {
      // Normal refill with timing variance
      const variance =
        Math.floor(Math.random() * pattern.refillTimingVariance * 2) - pattern.refillTimingVariance;
      currentDate = new Date(currentDate.getTime() - (daysSupply + variance) * 24 * 60 * 60 * 1000);
    }

    backtrackCount++;
  }

  // Now generate claims for all fill dates
  let refillNumber = 0;
  let claimCounter = 1;

  allFillDates.forEach((fillDate: any) => {
    // Generate claim
    const claim = generateClaim({
      patient,
      fillDate,
      daysSupply,
      medicationName,
      ndcCode,
      refillNumber,
      claimId: `${patient.id}-claim-${claimCounter}`,
    });

    claims.push(claim);

    // Randomly add a reversal (patient didn't pick up)
    if (includeReversals && Math.random() < 0.03) {
      // 3% reversal rate (reduced from 5%)
      const reversalClaim = {
        ...claim,
        Rx_Claim_Uniq_Id: `${patient.id}-claim-${claimCounter}-REV`,
        Rx_Total_Paid_Amt: 0, // Reversed claim
        Rx_Refill_Number: refillNumber,
        Reversal_Flag: 'R',
        meta: {
          isReversal: true,
          originalClaimId: claim.Rx_Claim_Uniq_Id,
        },
      };
      claims.push(reversalClaim);
    }

    refillNumber++;
    claimCounter++;
  });

  return claims;
};

/**
 * Generate a single RX claim record
 */
const generateClaim = ({
  patient,
  fillDate,
  daysSupply,
  medicationName,
  ndcCode,
  refillNumber,
  claimId,
}: any): any => {
  const fillDateStr = formatDateYYYYMMDD(fillDate);

  // Extract patient info
  const patientId = patient.id || patient.patient?.id;
  const patientName = patient.patient?.name?.[0]?.text || 'Unknown';

  // Calculate pricing (realistic amounts)
  const ingredientCost = 15 + Math.random() * 85; // $15-$100
  const copay = Math.min(10 + Math.random() * 20, ingredientCost * 0.3); // $10-$30 or 30% of cost
  const planPaid = ingredientCost - copay;

  return {
    // Patient/Member Info
    Member_Id: patientId,
    Rx_Pharmacy_Id: generateRandomPharmacyId(),

    // Prescription Info
    Rx_Npi: '1234567890', // Prescriber NPI
    Rx_Card_Holder_Id: patientId,
    Rx_Patient_Gender_Code: patient.patient?.gender || 'unknown',
    Rx_Insurance_Plan_Id: 'OPTUM-MA-001',
    Rx_Insurance_Group_Nbr: 'GRP001',
    Rx_Prescriber_Id: 'PRES' + Math.floor(Math.random() * 10000),
    Rx_Drug_Label_Name: medicationName,
    Rx_NDC_Code: ndcCode,
    Rx_GPI: generateGPI(medicationName),

    // Fill Details
    Rx_Date_Of_Service: fillDateStr,
    Rx_Days_Supply: daysSupply,
    Rx_Quantity: daysSupply, // Assume 1 tablet per day
    Rx_Refill_Number: refillNumber,
    Rx_Authorized_Refills: 11, // Standard for maintenance meds

    // Financial
    Rx_Ingredient_Cost_Amt: Math.round(ingredientCost * 100) / 100,
    Rx_Patient_Pay_Amt: Math.round(copay * 100) / 100,
    Rx_CoPay_Amt: Math.round(copay * 100) / 100,
    Rx_Plan_Cost_Amt: Math.round(planPaid * 100) / 100,
    Rx_Total_Paid_Amt: Math.round(ingredientCost * 100) / 100,

    // Claim IDs
    Rx_Claim_Uniq_Id: claimId,
    Rx_Source_Record_Id: `SRC-${claimId}`,

    // Metadata
    meta: {
      generatedBy: 'synthetic-rx-claims-generator',
      patientName: patientName,
      generatedAt: new Date().toISOString(),
    },
  };
};

/**
 * Format date as YYYYMMDD
 */
const formatDateYYYYMMDD = (date: any): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * Generate random pharmacy ID
 */
const generateRandomPharmacyId = (): string => {
  const pharmacies = ['CVS1234', 'WALG5678', 'WMART999', 'RITE777', 'KROGER456'];
  return pharmacies[Math.floor(Math.random() * pharmacies.length)];
};

/**
 * Generate GPI code based on medication
 */
const generateGPI = (medicationName: any): string => {
  // GPI format: TTCCSSFFPP (Therapeutic Class, Chemical Subclass, etc.)
  const gpiMap: any = {
    Atorvastatin: '3916200010',
    Rosuvastatin: '3916400010',
    Simvastatin: '3916300010',
    Metformin: '2710001010',
    Glipizide: '2720001010',
    Lisinopril: '3610001010',
    Losartan: '3620001010',
  };

  const baseMedName = medicationName.split(/\s+\d+/)[0].trim();
  return gpiMap[baseMedName] || '9999999999';
};

/**
 * Generate RX claims for an entire batch of patients
 * @param {Array} patients - Array of patient objects
 * @param {Object} options - Generation options
 * @returns {Object} Claims grouped by patient ID
 */
export const generateRxClaimsForBatch = (patients: any[], options: any = {}): any => {
  const allClaims: any = {};
  const metadata: any = {
    totalClaims: 0,
    patientsWithClaims: 0,
    adherenceDistribution: {
      excellent: 0,
      good: 0,
      moderate: 0,
      poor: 0,
      failing: 0,
    },
    measureDistribution: { MAC: 0, MAD: 0, MAH: 0 },
  };

  patients.forEach((patient: any) => {
    // IMPROVED: More realistic adherence distribution (bell curve centered on "good")
    const rand = Math.random();
    let adherencePattern;
    if (rand < 0.1)
      adherencePattern = 'excellent'; // 10%
    else if (rand < 0.5)
      adherencePattern = 'good'; // 40% (largest group)
    else if (rand < 0.8)
      adherencePattern = 'moderate'; // 30%
    else if (rand < 0.95)
      adherencePattern = 'poor'; // 15%
    else adherencePattern = 'failing'; // 5% (reduced from 10%)

    // IMPROVED: Use patient's actual daysSupply if available
    let daysSupply;
    if (patient.daysSupply && typeof patient.daysSupply === 'number') {
      daysSupply = patient.daysSupply;
    } else {
      // Fallback: weighted random distribution favoring 90-day
      const supplyRand = Math.random();
      if (supplyRand < 0.1)
        daysSupply = 30; // 10% on 30-day
      else if (supplyRand < 0.85)
        daysSupply = 90; // 75% on 90-day (most common)
      else daysSupply = 100; // 15% on 100-day
    }

    const claims = generateRxClaimsForPatient(patient, {
      ...options,
      adherencePattern,
      daysSupply,
    });

    if (claims.length > 0) {
      allClaims[patient.id] = claims;
      metadata.totalClaims += claims.length;
      metadata.patientsWithClaims++;
      metadata.adherenceDistribution[adherencePattern]++;
    }
  });

  return {
    claimsByPatient: allClaims,
    totalClaims: metadata.totalClaims,
    patientsWithClaims: metadata.patientsWithClaims,
    adherenceDistribution: metadata.adherenceDistribution,
    measureDistribution: metadata.measureDistribution,
  };
};

/**
 * Export claims to CSV format
 */
export const exportClaimsToCSV = (claims: any[]): string => {
  if (!claims || claims.length === 0) return '';

  const headers = Object.keys(claims[0]).filter((key: string) => key !== 'meta');
  const rows = claims.map((claim: any) =>
    headers
      .map((header: string) => {
        const value = claim[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      })
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
};

export default {
  generateRxClaimsForPatient,
  generateRxClaimsForBatch,
  exportClaimsToCSV,
  ADHERENCE_PATTERNS,
  MED_ADHERENCE_NDC_MAPPING,
};
