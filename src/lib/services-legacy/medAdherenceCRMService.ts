/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, import/no-anonymous-default-export, max-lines-per-function, complexity */

/**
 * All Patients CRM Service (Legacy)
 *
 * Handles all Firestore operations for the patient CRM system including:
 * - Patient data persistence (source of truth for all patient data)
 * - Campaign management
 * - Patient activities logging
 * - Saved filters/views
 * - Bulk operations
 *
 * NOTE: This is a legacy service with stubbed Firebase/Firestore calls.
 * Firebase operations are replaced with stub implementations that log warnings
 * and return empty/default values.
 *
 * Collections (legacy):
 * - allPatients: Patient records with medications and CRM data (MA + Non-MA)
 * - campaigns: Campaign definitions and metadata
 * - patientActivities: Activity log for all patient interactions
 * - savedFilters: User-saved filter configurations
 */

// ============================================================================
// All Patients Operations
// ============================================================================

/**
 * Save or update a patient in Firestore
 * @param patient - Patient object with medications and CRM data
 * @returns Document ID
 */
export const savePatient = async (patient: any): Promise<string> => {
  try {
    console.warn('[LEGACY] savePatient: Firebase stub called - not persisting data');
    const patientId = patient.firestoreId || patient.id || `patient-${Date.now()}`;
    console.log('Legacy savePatient', 'Patient would be saved', patientId);
    return patientId;
  } catch (error) {
    console.error('Legacy savePatient', 'Error saving patient', error);
    throw new Error(`Failed to save patient: ${(error as Error).message}`);
  }
};

// Helper to clean undefined values before saving to Firestore
const cleanUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanUndefinedValues(item));
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned;
  }

  return obj;
};

/**
 * Bulk save patients to Firestore in chunks to avoid Firestore limits
 * Firestore limits: 500 operations per batch, 10MB payload size
 * @param patients - Array of patient objects
 * @returns Result with success count and errors
 */
export const bulkSavePatients = async (patients: any[]): Promise<any> => {
  try {
    const CHUNK_SIZE = 100;
    let successCount = 0;
    const errors: any[] = [];

    // Process patients in chunks
    for (let i = 0; i < patients.length; i += CHUNK_SIZE) {
      const chunk = patients.slice(i, i + CHUNK_SIZE);
      let chunkSuccessCount = 0;

      chunk.forEach((patient) => {
        try {
          cleanUndefinedValues({
            ...patient,
          });
          chunkSuccessCount++;
        } catch (error) {
          errors.push({ patientId: patient.id, error: (error as Error).message });
        }
      });

      successCount += chunkSuccessCount;
      console.warn(
        '[LEGACY] bulkSavePatients stub',
        `Would save batch ${Math.floor(i / CHUNK_SIZE) + 1}: ${chunkSuccessCount} patients (${successCount}/${patients.length} total)`
      );

      // Add delay between batches to avoid Firestore rate limiting
      if (i + CHUNK_SIZE < patients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log('Legacy bulkSavePatients', `Bulk save would save: ${successCount} patients`);

    return {
      success: true,
      successCount,
      errorCount: errors.length,
      errors,
    };
  } catch (error) {
    console.error('Legacy bulkSavePatients', 'Error bulk saving patients', error);
    throw new Error(`Failed to bulk save patients: ${(error as Error).message}`);
  }
};

/**
 * Get a single patient by ID
 * @param patientId - Patient ID
 * @returns Patient object
 */
export const getPatient = async (patientId: string): Promise<any> => {
  try {
    console.warn('[LEGACY] getPatient stub: Firebase not available');
    console.log('Legacy getPatient', 'Would retrieve patient', patientId);
    throw new Error('Patient not found');
  } catch (error) {
    console.error('Legacy getPatient', 'Error getting patient', error);
    throw new Error(`Failed to get patient: ${(error as Error).message}`);
  }
};

/**
 * Get all patients from Firestore
 * @returns Array of patient objects
 */
export const getAllPatients = async (): Promise<any[]> => {
  try {
    console.warn('[LEGACY] getAllPatients stub: Firebase not available');
    console.log('Legacy getAllPatients', 'Would retrieve all patients');
    return [];
  } catch (error) {
    console.error('Legacy getAllPatients', 'Error getting all patients', error);
    throw new Error(`Failed to get patients: ${(error as Error).message}`);
  }
};

/**
 * Update patient CRM status
 * @param patientId - Patient ID
 * @param newStatus - New CRM status
 * @returns void
 */
export const updatePatientStatus = async (patientId: string, newStatus: string): Promise<void> => {
  try {
    console.warn('[LEGACY] updatePatientStatus stub: Firebase not available');
    console.log(
      'Legacy updatePatientStatus',
      `Would update status for patient ${patientId} to ${newStatus}`
    );

    // Log activity
    await logPatientActivity({
      patientId,
      activityType: 'status_change',
      details: { newStatus },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Legacy updatePatientStatus', 'Error updating patient status', error);
    throw new Error(`Failed to update patient status: ${(error as Error).message}`);
  }
};

/**
 * Bulk update patient statuses
 * @param patientIds - Array of patient IDs
 * @param newStatus - New CRM status
 * @returns Result with success count
 */
export const bulkUpdatePatientStatus = async (
  patientIds: string[],
  newStatus: string,
  medplum?: any
): Promise<any> => {
  try {
    console.warn('[LEGACY] bulkUpdatePatientStatus stub: Firebase not available');

    // Log activities
    const activityPromises = patientIds.map((patientId) =>
      logPatientActivity({
        patientId,
        activityType: 'status_change',
        details: { newStatus },
        timestamp: new Date(),
      })
    );
    await Promise.all(activityPromises);

    console.log(
      'Legacy bulkUpdatePatientStatus',
      `Would bulk update ${patientIds.length} patient statuses`
    );
    return { success: true, count: patientIds.length };
  } catch (error) {
    console.error('Legacy bulkUpdatePatientStatus', 'Error bulk updating patient statuses', error);
    throw new Error(`Failed to bulk update patient statuses: ${(error as Error).message}`);
  }
};

// ============================================================================
// Campaign Operations
// ============================================================================

/**
 * Create a new campaign
 * @param campaign - Campaign object
 * @returns Campaign ID
 */
export const createCampaign = async (campaign: any): Promise<string> => {
  try {
    console.warn('[LEGACY] createCampaign stub: Firebase not available');
    const campaignId = `campaign-${Date.now()}`;
    console.log('Legacy createCampaign', 'Campaign would be created', campaignId);
    return campaignId;
  } catch (error) {
    console.error('Legacy createCampaign', 'Error creating campaign', error);
    throw new Error(`Failed to create campaign: ${(error as Error).message}`);
  }
};

/**
 * Get all campaigns
 * @returns Array of campaign objects
 */
export const getAllCampaigns = async (): Promise<any[]> => {
  try {
    console.warn('[LEGACY] getAllCampaigns stub: Firebase not available');
    console.log('Legacy getAllCampaigns', 'Would retrieve all campaigns');
    return [];
  } catch (error) {
    console.error('Legacy getAllCampaigns', 'Error getting campaigns', error);
    throw new Error(`Failed to get campaigns: ${(error as Error).message}`);
  }
};

/**
 * Update an existing campaign
 * @param campaignId - Campaign ID
 * @param updates - Fields to update
 * @returns void
 */
export const updateCampaign = async (campaignId: string, updates: any): Promise<void> => {
  try {
    console.warn('[LEGACY] updateCampaign stub: Firebase not available');
    console.log('Legacy updateCampaign', `Campaign ${campaignId} would be updated`);
  } catch (error) {
    console.error('Legacy updateCampaign', 'Error updating campaign', error);
    throw new Error(`Failed to update campaign: ${(error as Error).message}`);
  }
};

/**
 * Delete a campaign
 * @param campaignId - Campaign ID
 * @returns void
 */
export const deleteCampaign = async (campaignId: string): Promise<void> => {
  try {
    console.warn('[LEGACY] deleteCampaign stub: Firebase not available');
    console.log('Legacy deleteCampaign', `Campaign ${campaignId} would be deleted`);
  } catch (error) {
    console.error('Legacy deleteCampaign', 'Error deleting campaign', error);
    throw new Error(`Failed to delete campaign: ${(error as Error).message}`);
  }
};

/**
 * Assign patients to a campaign
 * @param campaignId - Campaign ID
 * @param patientIds - Array of patient IDs
 * @returns Result with success count
 */
export const assignPatientsToCampaign = async (
  campaignId: string,
  patientIds: string[],
  medplum?: any
): Promise<any> => {
  try {
    console.warn('[LEGACY] assignPatientsToCampaign stub: Firebase not available');

    // Log activities
    const activityPromises = patientIds.map((patientId) =>
      logPatientActivity({
        patientId,
        activityType: 'campaign_enrollment',
        details: { campaignId },
        timestamp: new Date(),
      })
    );
    await Promise.all(activityPromises);

    console.log(
      'Legacy assignPatientsToCampaign',
      `Would assign ${patientIds.length} patients to campaign ${campaignId}`
    );
    return { success: true, count: patientIds.length };
  } catch (error) {
    console.error('Legacy assignPatientsToCampaign', 'Error assigning patients to campaign', error);
    throw new Error(`Failed to assign patients to campaign: ${(error as Error).message}`);
  }
};

// ============================================================================
// Patient Activities Operations
// ============================================================================

/**
 * Log a patient activity
 * @param activity - Activity object
 * @returns Activity ID
 */
export const logPatientActivity = async (activity: any): Promise<string | null> => {
  try {
    console.warn('[LEGACY] logPatientActivity stub: Firebase not available');
    const activityId = `activity-${Date.now()}`;
    return activityId;
  } catch (error) {
    console.error('Legacy logPatientActivity', 'Error logging activity', error);
    // Don't throw - activity logging is non-critical
    return null;
  }
};

/**
 * Get activities for a patient
 * @param patientId - Patient ID
 * @param limit - Max number of activities to retrieve
 * @returns Array of activity objects
 */
export const getPatientActivities = async (
  patientId: string,
  limit: number = 50
): Promise<any[]> => {
  try {
    console.warn('[LEGACY] getPatientActivities stub: Firebase not available');
    console.log(
      'Legacy getPatientActivities',
      `Would retrieve activities for patient ${patientId}`
    );
    return [];
  } catch (error) {
    console.error('Legacy getPatientActivities', 'Error getting patient activities', error);
    throw new Error(`Failed to get patient activities: ${(error as Error).message}`);
  }
};

// ============================================================================
// Saved Filters Operations
// ============================================================================

/**
 * Save a filter configuration
 * @param filter - Filter object
 * @param userId - User ID
 * @returns Filter ID
 */
export const saveFilter = async (filter: any, userId: string): Promise<string> => {
  try {
    console.warn('[LEGACY] saveFilter stub: Firebase not available');
    const filterId = `filter-${Date.now()}`;
    console.log('Legacy saveFilter', 'Filter would be saved', filterId);
    return filterId;
  } catch (error) {
    console.error('Legacy saveFilter', 'Error saving filter', error);
    throw new Error(`Failed to save filter: ${(error as Error).message}`);
  }
};

/**
 * Get saved filters for a user
 * @param userId - User ID
 * @returns Array of filter objects
 */
export const getSavedFilters = async (userId: string): Promise<any[]> => {
  try {
    console.warn('[LEGACY] getSavedFilters stub: Firebase not available');
    console.log('Legacy getSavedFilters', `Would retrieve saved filters for user ${userId}`);
    return [];
  } catch (error) {
    console.error('Legacy getSavedFilters', 'Error getting saved filters', error);
    throw new Error(`Failed to get saved filters: ${(error as Error).message}`);
  }
};

/**
 * Delete a saved filter
 * @param filterId - Filter ID
 * @returns void
 */
export const deleteSavedFilter = async (filterId: string): Promise<void> => {
  try {
    console.warn('[LEGACY] deleteSavedFilter stub: Firebase not available');
    console.log('Legacy deleteSavedFilter', 'Filter would be deleted', filterId);
  } catch (error) {
    console.error('Legacy deleteSavedFilter', 'Error deleting filter', error);
    throw new Error(`Failed to delete filter: ${(error as Error).message}`);
  }
};

// ============================================================================
// Real-time Listeners
// ============================================================================

/**
 * Subscribe to patient updates
 * @param callback - Callback function to receive updates
 * @returns Unsubscribe function
 */
export const subscribeToPatients = (callback: (patients: any[]) => void): (() => void) => {
  try {
    console.warn('[LEGACY] subscribeToPatients stub: Firebase not available');
    // Return no-op unsubscribe function
    return () => {
      console.log('Legacy subscribeToPatients', 'Unsubscribe called');
    };
  } catch (error) {
    console.error('Legacy subscribeToPatients', 'Error subscribing to patients', error);
    throw new Error(`Failed to subscribe to patients: ${(error as Error).message}`);
  }
};

/**
 * Subscribe to campaign updates
 * @param callback - Callback function to receive updates
 * @returns Unsubscribe function
 */
export const subscribeToCampaigns = (callback: (campaigns: any[]) => void): (() => void) => {
  try {
    console.warn('[LEGACY] subscribeToCampaigns stub: Firebase not available');
    // Return no-op unsubscribe function
    return () => {
      console.log('Legacy subscribeToCampaigns', 'Unsubscribe called');
    };
  } catch (error) {
    console.error('Legacy subscribeToCampaigns', 'Error subscribing to campaigns', error);
    throw new Error(`Failed to subscribe to campaigns: ${(error as Error).message}`);
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Export patients to CSV format
 * @param patients - Array of patient objects
 * @returns CSV string
 */
export const exportPatientsToCSV = (patients: any[]): string => {
  try {
    // Define CSV headers
    const headers = [
      'Patient ID',
      'Patient Name',
      'Date of Birth',
      'Medications Count',
      'Overall PDC',
      'Worst PDC',
      'PDC Status',
      'CRM Status',
      'Last Contact',
      'Next Refill',
      'Campaigns',
      'Watch List',
    ];

    // Convert patients to CSV rows
    const rows = patients.map((patient) => {
      const nextRefill = patient.aggregateAdherence?.nextRefill;
      const nextRefillDate = nextRefill ? new Date(nextRefill.date).toLocaleDateString() : 'N/A';

      return [
        patient.id || '',
        patient.name || '',
        patient.dateOfBirth || '',
        patient.aggregateAdherence?.totalMedications || 1,
        `${patient.aggregateAdherence?.overallPDC || patient.medAdherence?.gapDays?.PDC || 0}%`,
        patient.aggregateAdherence?.worstMedication
          ? `${patient.aggregateAdherence.worstMedication.pdc}%`
          : 'N/A',
        patient.medAdherence?.gapDays?.status || 'unknown',
        patient.crm?.status || 'not_contacted',
        patient.crm?.lastContactDate
          ? new Date(patient.crm.lastContactDate).toLocaleDateString()
          : 'Never',
        nextRefillDate,
        patient.crm?.campaigns?.map((c: any) => c.campaignName || c.campaignId).join('; ') ||
          'None',
        patient.crm?.watchList ? 'Yes' : 'No',
      ].map((value) => {
        // Escape commas and quotes in values
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    console.log('Legacy exportPatientsToCSV', `Exported ${patients.length} patients to CSV`);
    return csvContent;
  } catch (error) {
    console.error('Legacy exportPatientsToCSV', 'Error exporting to CSV', error);
    throw new Error(`Failed to export to CSV: ${(error as Error).message}`);
  }
};

/**
 * Download CSV file
 * @param csvContent - CSV content string
 * @param filename - Filename for download
 */
export const downloadCSV = (csvContent: string, filename: string = 'patients-export.csv'): void => {
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('Legacy downloadCSV', 'CSV download initiated', filename);
  } catch (error) {
    console.error('Legacy downloadCSV', 'Error downloading CSV', error);
    throw new Error(`Failed to download CSV: ${(error as Error).message}`);
  }
};

// ============================================================================
// Data Enrichment Operations
// ============================================================================

const normalizeDrugName = (name: string = ''): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Enrich patient medications with refill tracking data from RX claims
 * Calculates days supply remaining, next refill date, refill status
 * @param patient - Patient object with medications array
 * @param rxClaims - RX claims data for this patient (sorted by date desc)
 * @returns Patient with enriched medication refill data
 */
export const enrichPatientWithRefillData = (patient: any, rxClaims: any[] = []): any => {
  try {
    if (!patient.medications || patient.medications.length === 0) {
      return patient;
    }

    const today = new Date();

    const enrichedMedications = patient.medications.map((medication: any) => {
      const normalizedMedName = normalizeDrugName(
        medication.medicationName || medication.genericName || medication.drugName || ''
      );

      const medClaims = rxClaims.filter((claim: any) => {
        const claimNdc = claim.NDC || claim.ndcCode;
        const claimName =
          claim.Drug_Name || claim.drugName || claim.Generic_Name || claim.genericName;
        const normalizedClaimName = normalizeDrugName(claimName || '');

        if (medication.ndc && claimNdc && claimNdc === medication.ndc) {
          return true;
        }

        if (normalizedMedName && normalizedClaimName && normalizedMedName === normalizedClaimName) {
          return true;
        }

        return false;
      });

      const mostRecentClaim = medClaims[0]; // Assumes claims are sorted by date desc

      if (!mostRecentClaim) {
        // No claim data available, return medication as-is
        return medication;
      }

      const lastFillDate = new Date(mostRecentClaim.Rx_Date_Of_Service);
      const daysSinceLastFill = Math.floor(
        (today.getTime() - lastFillDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysSupplyRemaining = Math.max(0, mostRecentClaim.days_supply - daysSinceLastFill);

      const nextRefillDue = new Date(lastFillDate);
      nextRefillDue.setDate(nextRefillDue.getDate() + mostRecentClaim.days_supply);

      const refillEligibleDate = new Date(nextRefillDue);
      refillEligibleDate.setDate(refillEligibleDate.getDate() - 7); // 7 days early refill

      // Determine refill status
      const daysUntilRefill = Math.floor(
        (nextRefillDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      let refillStatus: string;
      if (daysUntilRefill < 0) {
        refillStatus = 'overdue';
      } else if (daysUntilRefill <= 7) {
        refillStatus = 'due_soon';
      } else {
        refillStatus = 'upcoming';
      }

      return {
        ...medication,
        lastFillDate: lastFillDate.toISOString().split('T')[0],
        daysSupply: mostRecentClaim.days_supply,
        daysSinceLastFill,
        daysSupplyRemaining,
        nextRefillDue: nextRefillDue.toISOString().split('T')[0],
        refillEligibleDate: refillEligibleDate.toISOString().split('T')[0],
        refillStatus,
      };
    });

    // Calculate refill summary across all medications
    const dueSoonRefills = enrichedMedications.filter(
      (m: any) => m.refillStatus === 'due_soon'
    ).length;
    const overdueRefills = enrichedMedications.filter(
      (m: any) => m.refillStatus === 'overdue'
    ).length;
    const upcomingRefills = enrichedMedications.filter(
      (m: any) => m.refillStatus === 'upcoming'
    ).length;

    // Find earliest refill eligible date
    const refillDates = enrichedMedications
      .filter((m: any) => m.refillEligibleDate)
      .map((m: any) => new Date(m.refillEligibleDate))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());
    const nextRefillDate =
      refillDates.length > 0 ? refillDates[0].toISOString().split('T')[0] : null;

    return {
      ...patient,
      medications: enrichedMedications,
      refillSummary: {
        totalMedications: enrichedMedications.length,
        upcomingRefills,
        dueSoonRefills,
        overdueRefills,
        nextRefillDate,
      },
    };
  } catch (error) {
    console.error(
      'Legacy enrichPatientWithRefillData',
      'Error enriching patient with refill data',
      error
    );
    // Return patient as-is if enrichment fails
    return patient;
  }
};

/**
 * Filter patients by MA/Non-MA medication type
 * @param patients - Array of patient objects
 * @param patientType - 'all', 'ma_only', 'non_ma_only', 'mixed'
 * @returns Filtered patients
 */
export const filterPatientsByType = (patients: any[], patientType: string): any[] => {
  if (patientType === 'all') return patients;

  return patients.filter((patient) => {
    const medications = patient.medications || [];
    const maMedCount = medications.filter((m: any) => m.isMedicationAdherence).length;
    const totalMedCount = medications.length;
    const nonMaMedCount = totalMedCount - maMedCount;

    switch (patientType) {
      case 'ma_only':
        return maMedCount > 0 && nonMaMedCount === 0;
      case 'non_ma_only':
        return maMedCount === 0 && nonMaMedCount > 0;
      case 'mixed':
        return maMedCount > 0 && nonMaMedCount > 0;
      default:
        return true;
    }
  });
};

/**
 * Filter patients by refill status
 * @param patients - Array of patient objects
 * @param refillStatus - 'all', 'due_soon', 'overdue', 'upcoming'
 * @returns Filtered patients
 */
export const filterPatientsByRefillStatus = (patients: any[], refillStatus: string): any[] => {
  if (refillStatus === 'all') return patients;

  return patients.filter((patient) => {
    const medications = patient.medications || [];
    return medications.some((m: any) => m.refillStatus === refillStatus);
  });
};

// ============================================================================
// Analytics Operations
// ============================================================================

/**
 * Calculate comprehensive dashboard metrics from patient data
 * @param patients - Array of patient objects
 * @param campaigns - Array of campaign objects
 * @returns Dashboard metrics object
 */
export const calculateDashboardMetrics = (patients: any[] = [], campaigns: any[] = []): any => {
  try {
    // Key Metrics
    const totalPatients = patients.length;
    const passingCount = patients.filter((p) => {
      const pdc = p.aggregateAdherence?.overallPDC || p.medAdherence?.gapDays?.PDC || 0;
      return pdc >= 80;
    }).length;
    const atRiskCount = patients.filter((p) => {
      const pdc = p.aggregateAdherence?.overallPDC || p.medAdherence?.gapDays?.PDC || 0;
      return pdc >= 60 && pdc < 80;
    }).length;
    const failingCount = patients.filter((p) => {
      const pdc = p.aggregateAdherence?.overallPDC || p.medAdherence?.gapDays?.PDC || 0;
      return pdc < 60;
    }).length;

    // Calculate average PDC
    const avgPDC =
      totalPatients > 0
        ? patients.reduce((sum, p) => {
            const pdc = p.aggregateAdherence?.overallPDC || p.medAdherence?.gapDays?.PDC || 0;
            return sum + pdc;
          }, 0) / totalPatients
        : 0;

    // PDC trend (simplified - would need historical data for real trend)
    const pdcTrend = avgPDC > 75 ? 2.3 : avgPDC > 70 ? 1.5 : -0.5;

    // Campaign metrics
    const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
    const totalEnrolled = patients.filter((p) => p.crm?.campaigns?.length > 0).length;
    const contactedPatients = patients.filter((p) => p.crm?.status !== 'not_contacted').length;
    const contactRate = totalPatients > 0 ? (contactedPatients / totalPatients) * 100 : 0;

    // NEW: Patient type breakdown (MA vs Non-MA)
    const maPatients = patients.filter((p) => {
      const medications = p.medications || [];
      return medications.some((m: any) => m.isMedicationAdherence);
    });
    const nonMaOnlyPatients = patients.filter((p) => {
      const medications = p.medications || [];
      const maMeds = medications.filter((m: any) => m.isMedicationAdherence).length;
      const totalMeds = medications.length;
      return maMeds === 0 && totalMeds > 0;
    });
    const mixedPatients = patients.filter((p) => {
      const medications = p.medications || [];
      const maMeds = medications.filter((m: any) => m.isMedicationAdherence).length;
      const totalMeds = medications.length;
      return maMeds > 0 && maMeds < totalMeds;
    });

    // NEW: Refill workload metrics (across all medications)
    const dueSoonRefills = patients.reduce(
      (sum, p) => sum + (p.refillSummary?.dueSoonRefills || 0),
      0
    );
    const overdueRefills = patients.reduce(
      (sum, p) => sum + (p.refillSummary?.overdueRefills || 0),
      0
    );
    const upcomingRefills = patients.reduce(
      (sum, p) => sum + (p.refillSummary?.upcomingRefills || 0),
      0
    );

    // PDC by measure type (MAC, MAD, MAH)
    const pdcByMeasure = {
      MAC: calculateMeasurePDC(patients, 'MAC'),
      MAD: calculateMeasurePDC(patients, 'MAD'),
      MAH: calculateMeasurePDC(patients, 'MAH'),
    };

    // Intervention funnel
    const funnelData = [
      {
        stage: 'Not Contacted',
        count: patients.filter((p) => p.crm?.status === 'not_contacted').length,
      },
      {
        stage: 'Outreach Attempted',
        count: patients.filter((p) => p.crm?.status === 'outreach_attempted').length,
      },
      {
        stage: 'Patient Responded',
        count: patients.filter((p) => p.crm?.status === 'patient_responded').length,
      },
      {
        stage: 'Appointment Scheduled',
        count: patients.filter((p) => p.crm?.status === 'appointment_scheduled').length,
      },
      {
        stage: 'Intervention Complete',
        count: patients.filter((p) => p.crm?.status === 'intervention_complete').length,
      },
    ];

    // Add percentages
    const funnelStart =
      funnelData[0].count +
      funnelData[1].count +
      funnelData[2].count +
      funnelData[3].count +
      funnelData[4].count;
    funnelData.forEach((stage: any) => {
      stage.percentage = funnelStart > 0 ? (stage.count / funnelStart) * 100 : 0;
    });

    // Campaign effectiveness (calculate from real patient data)
    const campaignEffectiveness = campaigns
      .filter((c) => c.status === 'active' || c.status === 'completed')
      .map((campaign: any) => {
        // Get patients enrolled in this campaign
        const enrolledPatientIds = campaign.patientIds || [];
        const enrolledPatients = patients.filter((p) => enrolledPatientIds.includes(p.id));

        if (enrolledPatients.length === 0) {
          return {
            name: campaign.name,
            enrolled: 0,
            beforePDC: 0,
            afterPDC: 0,
            improvement: 0,
          };
        }

        // Calculate average PDC for enrolled patients
        const pdcValues = enrolledPatients.map((p) => {
          return (
            p.currentPDC ?? p.aggregateAdherence?.overallPDC ?? p.medAdherence?.gapDays?.PDC ?? 0
          );
        });

        const avgCurrentPDC =
          pdcValues.length > 0
            ? pdcValues.reduce((sum, pdc) => sum + pdc, 0) / pdcValues.length
            : 0;

        // Simulate "before" PDC (5-10% lower) for demo purposes
        // In production, this would come from historical data before campaign enrollment
        const avgBeforePDC = Math.max(0, avgCurrentPDC - (Math.random() * 5 + 5));

        return {
          name: campaign.name,
          enrolled: enrolledPatients.length,
          beforePDC: Math.round(avgBeforePDC * 10) / 10,
          afterPDC: Math.round(avgCurrentPDC * 10) / 10,
          improvement: Math.round((avgCurrentPDC - avgBeforePDC) * 10) / 10,
        };
      })
      .filter((c) => c.enrolled > 0)
      .sort((a, b) => b.improvement - a.improvement); // Sort by improvement DESC

    // Fragility Tier Distribution
    const fragilityDistribution = {
      f1: patients.filter((p) => (p.fragilityTier || '').includes('F1')).length,
      f2: patients.filter((p) => (p.fragilityTier || '').includes('F2')).length,
      f3: patients.filter((p) => (p.fragilityTier || '').includes('F3')).length,
      f4: patients.filter((p) => (p.fragilityTier || '').includes('F4')).length,
      f5: patients.filter((p) => (p.fragilityTier || '').includes('F5')).length,
      compliant: patients.filter((p) => (p.fragilityTier || '').includes('COMPLIANT')).length,
    };

    // PDC Range Distribution
    const pdcDistribution = {
      range0to60: patients.filter((p) => {
        const pdc =
          p.currentPDC ?? p.medAdherence?.gapDays?.PDC ?? p.aggregateAdherence?.overallPDC;
        return typeof pdc === 'number' && pdc < 60;
      }).length,
      range60to80: patients.filter((p) => {
        const pdc =
          p.currentPDC ?? p.medAdherence?.gapDays?.PDC ?? p.aggregateAdherence?.overallPDC;
        return typeof pdc === 'number' && pdc >= 60 && pdc < 80;
      }).length,
      range80to90: patients.filter((p) => {
        const pdc =
          p.currentPDC ?? p.medAdherence?.gapDays?.PDC ?? p.aggregateAdherence?.overallPDC;
        return typeof pdc === 'number' && pdc >= 80 && pdc < 90;
      }).length,
      range90plus: patients.filter((p) => {
        const pdc =
          p.currentPDC ?? p.medAdherence?.gapDays?.PDC ?? p.aggregateAdherence?.overallPDC;
        return typeof pdc === 'number' && pdc >= 90;
      }).length,
    };

    // Days to Runout Distribution
    const daysToRunoutDistribution = {
      range0to7: patients.filter((p) => {
        const days = p.daysToRunout ?? p.daysUntilRunout;
        return typeof days === 'number' && days >= 0 && days <= 7;
      }).length,
      range8to14: patients.filter((p) => {
        const days = p.daysToRunout ?? p.daysUntilRunout;
        return typeof days === 'number' && days >= 8 && days <= 14;
      }).length,
      range15to30: patients.filter((p) => {
        const days = p.daysToRunout ?? p.daysUntilRunout;
        return typeof days === 'number' && days >= 15 && days <= 30;
      }).length,
      range31plus: patients.filter((p) => {
        const days = p.daysToRunout ?? p.daysUntilRunout;
        return typeof days === 'number' && days > 30;
      }).length,
    };

    // Measure Type Distribution
    const measureDistribution = {
      mac: patients.filter((p) => {
        if (p.medications && p.medications.length > 0) {
          return p.medications.some((m: any) => m.measureType === 'MAC');
        }
        return p.medAdherence?.measure === 'MAC';
      }).length,
      mad: patients.filter((p) => {
        if (p.medications && p.medications.length > 0) {
          return p.medications.some((m: any) => m.measureType === 'MAD');
        }
        return p.medAdherence?.measure === 'MAD';
      }).length,
      mah: patients.filter((p) => {
        if (p.medications && p.medications.length > 0) {
          return p.medications.some((m: any) => m.measureType === 'MAH');
        }
        return p.medAdherence?.measure === 'MAH';
      }).length,
    };

    // Queue Status Distribution
    const queueDistribution = {
      refillCandidates: patients.filter((p) => {
        const days = p.daysToRunout ?? p.daysUntilRunout;
        return typeof days === 'number' && days <= 14;
      }).length,
      futureQueue1: patients.filter((p) => {
        const days = p.daysToRunout ?? p.daysUntilRunout;
        return typeof days === 'number' && days >= 15 && days <= 44;
      }).length,
      futureQueue2: patients.filter((p) => {
        const days = p.daysToRunout ?? p.daysUntilRunout;
        return typeof days === 'number' && days >= 45 && days <= 60;
      }).length,
      longTerm: patients.filter((p) => {
        const days = p.daysToRunout ?? p.daysUntilRunout;
        return typeof days === 'number' && days > 60;
      }).length,
    };

    console.log(
      'Legacy calculateDashboardMetrics',
      `Calculated metrics for ${totalPatients} patients`
    );

    return {
      metrics: {
        totalPatients,
        passingCount,
        atRiskCount,
        failingCount,
        avgPDC: Math.round(avgPDC * 10) / 10,
        pdcTrend,
        activeCampaigns,
        totalEnrolled,
        contactRate: Math.round(contactRate * 10) / 10,
        // NEW: Patient type breakdown
        maPatientCount: maPatients.length,
        nonMaPatientCount: nonMaOnlyPatients.length,
        mixedPatientCount: mixedPatients.length,
        maPatientPercentage:
          totalPatients > 0 ? Math.round((maPatients.length / totalPatients) * 100 * 10) / 10 : 0,
        // NEW: Refill workload
        dueSoonRefills,
        overdueRefills,
        upcomingRefills,
      },
      pdcByMeasure,
      funnelData,
      campaignEffectiveness,
      // NEW: Distribution breakdowns for Executive Dashboard
      fragilityDistribution,
      pdcDistribution,
      daysToRunoutDistribution,
      measureDistribution,
      queueDistribution,
    };
  } catch (error) {
    console.error('Legacy calculateDashboardMetrics', 'Error calculating dashboard metrics', error);
    throw new Error(`Failed to calculate metrics: ${(error as Error).message}`);
  }
};

/**
 * Helper function to calculate average PDC for a specific measure
 */
const calculateMeasurePDC = (patients: any[], measureType: string): number => {
  const relevantPatients = patients.filter((p) => {
    if (p.medications && p.medications.length > 0) {
      return p.medications.some((med: any) => med.measureType === measureType);
    }
    return p.medAdherence?.measure === measureType;
  });

  if (relevantPatients.length === 0) return 0;

  const avgPDC =
    relevantPatients.reduce((sum, p) => {
      // For multi-medication patients, find the specific medication PDC
      if (p.medications && p.medications.length > 0) {
        const med = p.medications.find((m: any) => m.measureType === measureType);
        return sum + (med?.pdc || 0);
      }
      return sum + (p.medAdherence?.gapDays?.PDC || 0);
    }, 0) / relevantPatients.length;

  return Math.round(avgPDC * 10) / 10;
};

/**
 * Generate sample campaigns for testing/demo
 * @param patients - Array of patient objects to assign to campaigns
 * @returns Array of created campaign IDs
 */
export const generateSampleCampaigns = async (patients: any[] = []): Promise<string[]> => {
  try {
    console.log('Legacy generateSampleCampaigns', 'Generating sample campaigns...');

    // Get random patients for each campaign
    const getRandomPatients = (count: number) => {
      const shuffled = [...patients].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    };

    const sampleCampaigns = [
      {
        name: 'Q4 2025 Critical MAC Outreach',
        type: 'outreach',
        channel: 'phone',
        status: 'active',
        startDate: new Date('2025-10-01').toISOString(),
        endDate: new Date('2025-12-31').toISOString(),
        messageTemplate: 'med_gap_critical',
        notes: 'Targeting patients with PDC < 60% for cholesterol medications',
        patientIds: getRandomPatients(150).map((p) => p.id),
        patientCount: 150,
      },
      {
        name: 'Diabetes Adherence Initiative',
        type: 'refill_reminder',
        channel: 'sms',
        status: 'active',
        startDate: new Date('2025-11-01').toISOString(),
        endDate: new Date('2026-01-31').toISOString(),
        messageTemplate: 'refill_due_soon',
        notes: 'Automated SMS reminders for diabetes medication refills',
        patientIds: getRandomPatients(200).map((p) => p.id),
        patientCount: 200,
      },
      {
        name: 'Hypertension Education Campaign',
        type: 'education',
        channel: 'email',
        status: 'active',
        startDate: new Date('2025-09-15').toISOString(),
        endDate: new Date('2025-12-15').toISOString(),
        messageTemplate: 'medication_info',
        notes: 'Educational emails about hypertension medication benefits',
        patientIds: getRandomPatients(180).map((p) => p.id),
        patientCount: 180,
      },
      {
        name: 'Monthly Wellness Check-In',
        type: 'wellness_check',
        channel: 'phone',
        status: 'active',
        startDate: new Date('2025-11-01').toISOString(),
        endDate: '',
        messageTemplate: 'monthly_checkup',
        notes: 'Monthly wellness calls for high-risk patients',
        patientIds: getRandomPatients(80).map((p) => p.id),
        patientCount: 80,
      },
      {
        name: 'Summer 2025 Adherence Boost',
        type: 'outreach',
        channel: 'portal',
        status: 'completed',
        startDate: new Date('2025-06-01').toISOString(),
        endDate: new Date('2025-08-31').toISOString(),
        messageTemplate: 'med_gap_standard',
        notes: 'Completed summer campaign - showed 8% PDC improvement',
        patientIds: getRandomPatients(220).map((p) => p.id),
        patientCount: 220,
      },
    ];

    const createdCampaignIds: string[] = [];
    for (const campaign of sampleCampaigns) {
      const campaignId = await createCampaign(campaign);
      createdCampaignIds.push(campaignId);
      console.log('Legacy generateSampleCampaigns', `Created campaign: ${campaign.name}`);
    }

    console.log(
      'Legacy generateSampleCampaigns',
      `Generated ${createdCampaignIds.length} sample campaigns`
    );
    return createdCampaignIds;
  } catch (error) {
    console.error('Legacy generateSampleCampaigns', 'Error generating sample campaigns', error);
    throw new Error(`Failed to generate sample campaigns: ${(error as Error).message}`);
  }
};

/**
 * Clear all patients from allPatients collection (for cleanup/reset)
 */
export async function clearAllPatients(): Promise<any> {
  try {
    console.warn('[LEGACY] clearAllPatients stub: Firebase not available');
    console.log('Legacy clearAllPatients', 'Would clear all patients');
    return { deleted: 0 };
  } catch (error) {
    console.error('Legacy clearAllPatients', 'Error clearing patients:', error);
    throw error;
  }
}

export default {
  // Patients
  savePatient,
  bulkSavePatients,
  getPatient,
  getAllPatients,
  updatePatientStatus,
  bulkUpdatePatientStatus,

  // Campaigns
  createCampaign,
  getAllCampaigns,
  updateCampaign,
  deleteCampaign,
  assignPatientsToCampaign,
  generateSampleCampaigns,

  // Activities
  logPatientActivity,
  getPatientActivities,

  // Saved Filters
  saveFilter,
  getSavedFilters,
  deleteSavedFilter,

  // Real-time
  subscribeToPatients,
  subscribeToCampaigns,

  // Data Enrichment
  enrichPatientWithRefillData,
  filterPatientsByType,
  filterPatientsByRefillStatus,

  // Analytics
  calculateDashboardMetrics,

  // Utilities
  exportPatientsToCSV,
  downloadCSV,
  clearAllPatients,
};
