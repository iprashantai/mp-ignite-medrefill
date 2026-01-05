/**
 * PDC Nightly Calculator Bot
 *
 * Medplum Bot that runs nightly to calculate PDC for all patients.
 *
 * Trigger: CRON (2 AM daily)
 * Criteria: 0 2 * * *
 *
 * Flow:
 * 1. Find all patients with MedicationDispense records
 * 2. For each patient, calculate PDC using the orchestrator
 * 3. Store measure-level and medication-level Observations
 * 4. Update Patient extensions with aggregated summary
 * 5. Log results and statistics
 *
 * @module @/bots/pdc-nightly-calculator
 */

import type { BotEvent, MedplumClient } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';
import {
  calculateAndStorePatientPDC,
  type PDCOrchestratorOptions,
  type PDCOrchestratorResult,
} from '@/lib/pdc/orchestrator';
import {
  type BatchProcessingResult,
  type PatientProcessingResult,
  type PDCNightlyBotConfig,
  DEFAULT_PDC_BOT_CONFIG,
} from '../shared/bot-types';
import {
  logInfo,
  logError,
  logWarn,
  generateExecutionId,
  findPatientsForPDCCalculation,
  createPatientResult,
  createBatchResult,
  getErrorMessage,
  getCurrentMeasurementYear,
  processBatches,
} from '../shared/bot-utils';

// =============================================================================
// Bot Configuration
// =============================================================================

/**
 * Parse bot configuration from input parameters.
 */
function parseConfig(input: Record<string, unknown> | undefined): PDCNightlyBotConfig {
  if (!input) {
    return DEFAULT_PDC_BOT_CONFIG;
  }

  return {
    measurementYear:
      typeof input.measurementYear === 'number'
        ? input.measurementYear
        : DEFAULT_PDC_BOT_CONFIG.measurementYear,
    includeMedicationLevel:
      typeof input.includeMedicationLevel === 'boolean'
        ? input.includeMedicationLevel
        : DEFAULT_PDC_BOT_CONFIG.includeMedicationLevel,
    updatePatientExtensions:
      typeof input.updatePatientExtensions === 'boolean'
        ? input.updatePatientExtensions
        : DEFAULT_PDC_BOT_CONFIG.updatePatientExtensions,
    maxPatientsPerRun:
      typeof input.maxPatientsPerRun === 'number'
        ? input.maxPatientsPerRun
        : DEFAULT_PDC_BOT_CONFIG.maxPatientsPerRun,
    batchSize:
      typeof input.batchSize === 'number'
        ? input.batchSize
        : DEFAULT_PDC_BOT_CONFIG.batchSize,
    dryRun:
      typeof input.dryRun === 'boolean' ? input.dryRun : DEFAULT_PDC_BOT_CONFIG.dryRun,
  };
}

// =============================================================================
// Patient Processing
// =============================================================================

/**
 * Process a single patient for PDC calculation.
 */
async function processPatient(
  medplum: MedplumClient,
  patientId: string,
  options: PDCOrchestratorOptions,
  dryRun: boolean
): Promise<PatientProcessingResult> {
  const startTime = Date.now();

  try {
    if (dryRun) {
      // In dry run mode, just validate we can find the patient
      logInfo(`[DRY RUN] Would process patient ${patientId}`);
      return createPatientResult(patientId, true, Date.now() - startTime, 0, 0);
    }

    const result = await calculateAndStorePatientPDC(medplum, patientId, options);

    const medicationsProcessed = result.measures.reduce(
      (sum, m) => sum + m.medications.length,
      0
    );

    if (result.errors.length > 0) {
      logWarn(`Patient ${patientId} completed with errors`, {
        errors: result.errors,
        measuresCalculated: result.measures.length,
      });
    }

    return createPatientResult(
      patientId,
      result.errors.length === 0 && result.measures.length > 0,
      Date.now() - startTime,
      result.measures.length,
      medicationsProcessed,
      result.errors.length > 0 ? result.errors.join('; ') : undefined
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logError(`Failed to process patient ${patientId}`, { error: errorMessage });

    return createPatientResult(patientId, false, Date.now() - startTime, 0, 0, errorMessage);
  }
}

// =============================================================================
// Main Bot Handler
// =============================================================================

/**
 * Main bot handler function.
 *
 * This is the entry point called by Medplum when the bot is triggered.
 *
 * @param medplum - Medplum client instance
 * @param event - Bot event with input data
 * @returns Batch processing result
 */
export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Resource>
): Promise<BatchProcessingResult> {
  const executionId = generateExecutionId();
  const startedAt = new Date();

  logInfo(`PDC Nightly Calculator started`, {
    executionId,
    startedAt: startedAt.toISOString(),
  });

  // Parse configuration from input
  const config = parseConfig(event.input as Record<string, unknown> | undefined);
  const measurementYear = config.measurementYear ?? getCurrentMeasurementYear();

  logInfo(`Configuration`, {
    measurementYear,
    includeMedicationLevel: config.includeMedicationLevel,
    updatePatientExtensions: config.updatePatientExtensions,
    batchSize: config.batchSize,
    dryRun: config.dryRun,
  });

  try {
    // Find patients to process
    let patientIds = await findPatientsForPDCCalculation(medplum);

    logInfo(`Found ${patientIds.length} patients to process`);

    // Apply max patients limit if configured
    if (config.maxPatientsPerRun && patientIds.length > config.maxPatientsPerRun) {
      logInfo(`Limiting to ${config.maxPatientsPerRun} patients per run`);
      patientIds = patientIds.slice(0, config.maxPatientsPerRun);
    }

    // Build orchestrator options
    const orchestratorOptions: PDCOrchestratorOptions = {
      measurementYear,
      currentDate: new Date(),
      includeMedicationLevel: config.includeMedicationLevel,
      updatePatientExtensions: config.updatePatientExtensions,
    };

    // Process patients in batches
    const results: PatientProcessingResult[] = [];
    let processedCount = 0;

    const processAndReport = async (patientId: string): Promise<PatientProcessingResult> => {
      const result = await processPatient(
        medplum,
        patientId,
        orchestratorOptions,
        config.dryRun
      );

      processedCount++;
      if (processedCount % 10 === 0 || processedCount === patientIds.length) {
        logInfo(`Progress: ${processedCount}/${patientIds.length} patients processed`);
      }

      return result;
    };

    // Process using batching utility
    const batchResults = await processBatches(
      patientIds,
      processAndReport,
      config.batchSize,
      100 // 100ms delay between batches
    );

    results.push(...batchResults);

    // Create batch result
    const batchResult = createBatchResult(executionId, startedAt, results);

    // Log summary
    logInfo(`PDC Nightly Calculator completed`, {
      executionId,
      totalPatients: batchResult.totalPatients,
      successCount: batchResult.successCount,
      errorCount: batchResult.errorCount,
      totalDurationMs: batchResult.totalDurationMs,
      avgDurationPerPatientMs: batchResult.avgDurationPerPatientMs,
    });

    // Log any failures
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      logWarn(`${failures.length} patients failed processing`, {
        failures: failures.map((f) => ({ patientId: f.patientId, error: f.error })),
      });
    }

    return batchResult;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logError(`PDC Nightly Calculator failed`, { error: errorMessage, executionId });

    // Return empty result with error
    return {
      executionId,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      totalPatients: 0,
      successCount: 0,
      errorCount: 1,
      results: [],
      totalDurationMs: Date.now() - startedAt.getTime(),
      avgDurationPerPatientMs: 0,
    };
  }
}

// =============================================================================
// On-Demand Processing
// =============================================================================

/**
 * Process a single patient on-demand.
 *
 * This can be called directly for testing or manual recalculation.
 *
 * @param medplum - Medplum client instance
 * @param patientId - Patient ID to process
 * @param options - Optional configuration
 * @returns Processing result
 */
export async function processSinglePatient(
  medplum: MedplumClient,
  patientId: string,
  options: Partial<PDCOrchestratorOptions> = {}
): Promise<PDCOrchestratorResult> {
  logInfo(`Processing single patient`, { patientId });

  const result = await calculateAndStorePatientPDC(medplum, patientId, {
    measurementYear: options.measurementYear ?? getCurrentMeasurementYear(),
    currentDate: options.currentDate ?? new Date(),
    includeMedicationLevel: options.includeMedicationLevel ?? true,
    updatePatientExtensions: options.updatePatientExtensions ?? true,
  });

  logInfo(`Single patient processing complete`, {
    patientId,
    measuresCalculated: result.measures.length,
    errors: result.errors,
  });

  return result;
}
