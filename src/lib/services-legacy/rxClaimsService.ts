/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, import/no-anonymous-default-export, no-console */

/**
 * RX Claims Service (STUB)
 *
 * Handles loading, transforming, and querying RX pharmacy claims data
 * for Med Adherence Gap Days calculations.
 *
 * Data Source: OptumRX PBM feed (assumed direct integration)
 *
 * NOTE: This is a STUB implementation that returns mock data.
 * TODO: Replace with actual Medplum FHIR MedicationDispense queries
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TransformedClaim {
  // Identifiers
  claimId: string;
  memberId: string;
  sourceRecordId: string;

  // Fill Details
  fillDate: Date | null;
  fillDateStr: string;
  daysSupply: number;
  quantity: number;
  refillNumber: number;
  authorizedRefills: number;

  // Medication Identifiers
  ndcCode: string;
  gpiCode: string;
  drugName: string;

  // Prescriber/Pharmacy
  pharmacyId: string;
  prescriberId: string;
  prescriberNPI: string;

  // Financial
  ingredientCost: number;
  patientPay: number;
  copay: number;
  planCost: number;
  totalPaid: number;

  // Claim Status
  isPaid: boolean;
  isReversal: boolean;

  // Insurance
  insurancePlanId: string;
  insuranceGroupNbr: string;

  // Metadata
  originalData: any;
  transformedAt: string;
}

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

/**
 * Generate mock RX claims for a member
 */
function generateMockClaims(memberId: string, year: number): any[] {
  const claims: any[] = [];
  const startDate = new Date(year, 0, 1);
  const drugNames = [
    'Atorvastatin 40mg',
    'Lisinopril 10mg',
    'Metformin 500mg',
    'Rosuvastatin 20mg',
    'Amlodipine 5mg',
  ];

  // Generate 12 monthly fills (typical refill pattern)
  for (let i = 0; i < 12; i++) {
    const fillDate = new Date(startDate);
    fillDate.setMonth(fillDate.getMonth() + i);

    const drugName = drugNames[i % drugNames.length];
    const dateStr = formatDateYYYYMMDD(fillDate);

    claims.push({
      Rx_Claim_Uniq_Id: `CLM-${memberId}-${dateStr}-${i}`,
      Member_Id: memberId,
      Rx_Source_Record_Id: `SRC-${dateStr}-${i}`,
      Rx_Date_Of_Service: dateStr,
      Rx_Days_Supply: '30',
      Rx_Quantity: '30',
      Rx_Refill_Number: String(i),
      Rx_Authorized_Refills: '11',
      Rx_NDC_Code: `00000-0000-${String(i).padStart(2, '0')}`,
      Rx_GPI: `99${String(i).padStart(2, '0')}`,
      Rx_Drug_Label_Name: drugName,
      Rx_Pharmacy_Id: 'PHARM-001',
      Rx_Prescriber_Id: 'DOC-001',
      Rx_Npi: '1234567890',
      Rx_Ingredient_Cost_Amt: '25.00',
      Rx_Patient_Pay_Amt: '10.00',
      Rx_CoPay_Amt: '10.00',
      Rx_Plan_Cost_Amt: '15.00',
      Rx_Total_Paid_Amt: '25.00',
      Rx_Insurance_Plan_Id: 'PLAN-001',
      Rx_Insurance_Group_Nbr: 'GRP-001',
      meta: { isReversal: false },
    });
  }

  return claims;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Load RX Claims for a specific member and year
 * @param memberId - Member/Patient ID
 * @param year - Measurement year (e.g., 2025)
 * @returns Array of transformed claim objects
 */
export const loadMemberClaims = async (
  memberId: string,
  year: number = 2025
): Promise<TransformedClaim[]> => {
  try {
    console.log(`[STUB] Loading RX claims for member ${memberId}, year ${year}`);

    // TODO: Replace with actual Medplum FHIR query
    // const medplum = useMedplum();
    // const claims = await medplum.searchResources('MedicationDispense', {
    //   subject: `Patient/${memberId}`,
    //   whenHandedOver: `ge${year}-01-01`,
    // });

    // Generate mock claims for stub
    const rawClaims = generateMockClaims(memberId, year);
    const claims = rawClaims.map((claim) => transformClaim(claim));

    console.log(`[STUB] Loaded ${claims.length} claims for member ${memberId} in year ${year}`);
    return claims;
  } catch (error: any) {
    console.error(`[STUB] Error loading claims for member ${memberId}`, error?.message);
    return [];
  }
};

/**
 * Transform raw claim from PBM format to standardized format
 * @param rawClaim - Raw claim object from OptumRX
 * @returns Standardized claim object
 */
export const transformClaim = (rawClaim: any): TransformedClaim => {
  return {
    // Identifiers
    claimId: rawClaim.Rx_Claim_Uniq_Id,
    memberId: rawClaim.Member_Id,
    sourceRecordId: rawClaim.Rx_Source_Record_Id,

    // Fill Details
    fillDate: parseClaimDate(rawClaim.Rx_Date_Of_Service),
    fillDateStr: rawClaim.Rx_Date_Of_Service,
    daysSupply: parseInt(rawClaim.Rx_Days_Supply) || 0,
    quantity: parseFloat(rawClaim.Rx_Quantity) || 0,
    refillNumber: parseInt(rawClaim.Rx_Refill_Number) || 0,
    authorizedRefills: parseInt(rawClaim.Rx_Authorized_Refills) || 0,

    // Medication Identifiers
    ndcCode: rawClaim.Rx_NDC_Code,
    gpiCode: rawClaim.Rx_GPI,
    drugName: rawClaim.Rx_Drug_Label_Name,

    // Prescriber/Pharmacy
    pharmacyId: rawClaim.Rx_Pharmacy_Id,
    prescriberId: rawClaim.Rx_Prescriber_Id,
    prescriberNPI: rawClaim.Rx_Npi,

    // Financial
    ingredientCost: parseFloat(rawClaim.Rx_Ingredient_Cost_Amt) || 0,
    patientPay: parseFloat(rawClaim.Rx_Patient_Pay_Amt) || 0,
    copay: parseFloat(rawClaim.Rx_CoPay_Amt) || 0,
    planCost: parseFloat(rawClaim.Rx_Plan_Cost_Amt) || 0,
    totalPaid: parseFloat(rawClaim.Rx_Total_Paid_Amt) || 0,

    // Claim Status
    isPaid: parseFloat(rawClaim.Rx_Total_Paid_Amt) > 0,
    isReversal: rawClaim.meta?.isReversal || false,

    // Insurance
    insurancePlanId: rawClaim.Rx_Insurance_Plan_Id,
    insuranceGroupNbr: rawClaim.Rx_Insurance_Group_Nbr,

    // Metadata
    originalData: rawClaim,
    transformedAt: new Date().toISOString(),
  };
};

/**
 * Parse claim date from YYYYMMDD format to JavaScript Date
 * @param dateStr - Date string in YYYYMMDD format
 * @returns Parsed date or null if invalid
 */
export const parseClaimDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.length !== 8) {
    return null;
  }

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  try {
    const date = new Date(`${year}-${month}-${day}`);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
};

/**
 * Format Date object to YYYYMMDD string
 * @param date - JavaScript Date object
 * @returns Date in YYYYMMDD format
 */
export const formatDateYYYYMMDD = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * Filter claims to Med Adherence medications only
 * @param claims - Array of claim objects
 * @param medAdherenceChecker - Function to check if drug is Med Adherence
 * @returns Filtered claims
 */
export const filterMedAdherenceClaims = (
  claims: TransformedClaim[],
  medAdherenceChecker?: (claim: TransformedClaim) => boolean
): TransformedClaim[] => {
  if (!claims || claims.length === 0) return [];

  if (!medAdherenceChecker) {
    // Default: return all claims (stub behavior)
    return claims;
  }

  return claims.filter(medAdherenceChecker);
};

/**
 * Filter to paid claims only
 * @param claims - Array of claim objects
 * @returns Filtered claims
 */
export const filterPaidClaims = (claims: TransformedClaim[]): TransformedClaim[] => {
  return claims.filter((claim) => claim.isPaid && !claim.isReversal);
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  loadMemberClaims,
  transformClaim,
  parseClaimDate,
  formatDateYYYYMMDD,
  filterMedAdherenceClaims,
  filterPaidClaims,
};
