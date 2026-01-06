/**
 * Patient Batch Service (STUB)
 *
 * Service for fetching patient data from the batches collection
 * where patients are stored as embedded documents within batch documents.
 *
 * NOTE: This is a STUB implementation that returns mock patient data.
 * TODO: Replace with actual Medplum FHIR Patient queries
 */

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, import/no-anonymous-default-export, no-console */

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

/**
 * Generate a single mock patient
 */
function generateMockPatient(patientId: string): any {
  return {
    id: patientId,
    name: `Patient ${patientId}`,
    dob: '1960-01-01',
    age: 65,
    mrn: `MRN-${patientId}`,
    medications: [],
    measures: {
      MAC: { currentPDC: 85, description: 'Cholesterol' },
      MAD: { currentPDC: 75, description: 'Diabetes' },
      MAH: { currentPDC: 90, description: 'Hypertension' },
    },
    refillsRemaining: 3,
    rxDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
    lastVisitDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 2 months ago
  };
}

/**
 * Generate a batch of mock patients
 */
function generateMockBatch(batchId: string, count: number = 50): any[] {
  const patients: any[] = [];
  for (let i = 0; i < count; i++) {
    const patientId = `PT-${batchId}-${String(i + 1).padStart(4, '0')}`;
    patients.push({
      ...generateMockPatient(patientId),
      batchId,
      batchName: `Batch ${batchId}`,
    });
  }
  return patients;
}

// Store mock batches in memory for consistency within a session
const mockBatches: Record<string, any[]> = {
  'BATCH-001': generateMockBatch('BATCH-001', 50),
  'BATCH-002': generateMockBatch('BATCH-002', 50),
  'BATCH-003': generateMockBatch('BATCH-003', 30),
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Find a patient by ID across all batches
 * @param patientId - The patient ID to search for
 * @returns The patient data with batchId, or null if not found
 */
export async function findPatientInBatches(patientId: string): Promise<any | null> {
  try {
    console.log(`[STUB] Searching for patient ${patientId} in batches...`);

    // TODO: Replace with actual Medplum FHIR query
    // const medplum = useMedplum();
    // const patient = await medplum.readResource('Patient', patientId);

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Search through mock batches
    for (const [batchId, patients] of Object.entries(mockBatches)) {
      const patient = patients.find((p) => p.id === patientId);
      if (patient) {
        console.log(`[STUB] Found patient ${patientId} in batch ${batchId}`);
        return {
          ...patient,
          batchId,
          batchName: `Batch ${batchId}`,
        };
      }
    }

    // If not found in batches, generate a new mock patient
    console.warn(`[STUB] Patient ${patientId} not found in batches, generating mock patient`);
    return {
      ...generateMockPatient(patientId),
      batchId: 'BATCH-DYNAMIC',
      batchName: 'Dynamic Batch',
    };
  } catch (error: any) {
    console.error('[STUB] Error finding patient in batches:', error?.message);
    throw error;
  }
}

/**
 * Fetch all patients from all batches (flattened)
 * @returns Array of all patients with batchId
 */
export async function fetchAllPatientsFromBatches(): Promise<any[]> {
  try {
    console.log('[STUB] Fetching all patients from batches...');

    // TODO: Replace with actual Medplum FHIR query
    // const medplum = useMedplum();
    // const patients = await medplum.searchResources('Patient', { _count: 1000 });

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Flatten all batches
    const allPatients = Object.values(mockBatches).flat();

    console.log(
      `[STUB] Found ${allPatients.length} patients across ${Object.keys(mockBatches).length} batches`
    );
    return allPatients;
  } catch (error: any) {
    console.error('[STUB] Error fetching patients from batches:', error?.message);
    throw error;
  }
}

/**
 * Check if allPatients collection exists and has data
 * Falls back to batches if allPatients is empty
 * @param patientId - The patient ID to search for
 * @returns The patient data or null if not found
 */
export async function findPatientAcrossCollections(patientId: string): Promise<any | null> {
  try {
    console.log(`[STUB] Searching for patient ${patientId} across collections...`);

    // TODO: Replace with actual Medplum FHIR query
    // First, try direct patient lookup
    // const medplum = useMedplum();
    // const patient = await medplum.readResource('Patient', patientId);

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // For stub, just use findPatientInBatches
    return await findPatientInBatches(patientId);
  } catch (error: any) {
    console.error('[STUB] Error finding patient across collections:', error?.message);
    throw error;
  }
}

/**
 * Get batch summary information
 * @returns Array of batch summaries with patient counts
 */
export async function getBatchSummaries(): Promise<any[]> {
  try {
    console.log('[STUB] Fetching batch summaries...');

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    return Object.entries(mockBatches).map(([batchId, patients]) => ({
      batchId,
      batchName: `Batch ${batchId}`,
      patientCount: patients.length,
      lastUpdated: new Date().toISOString(),
    }));
  } catch (error: any) {
    console.error('[STUB] Error fetching batch summaries:', error?.message);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  findPatientInBatches,
  fetchAllPatientsFromBatches,
  findPatientAcrossCollections,
  getBatchSummaries,
};
