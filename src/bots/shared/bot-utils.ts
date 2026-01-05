/**
 * Shared Bot Utilities
 *
 * Helper functions for Medplum Bots.
 *
 * @module @/bots/shared/bot-utils
 */

import type { MedplumClient } from '@medplum/core';
import type { Patient, MedicationRequest } from '@medplum/fhirtypes';
import type {
  BotContext,
  BotLogEntry,
  PatientProcessingResult,
  BatchProcessingResult,
  PatientQueryCriteria,
} from './bot-types';

// =============================================================================
// Logging Utilities
// =============================================================================

/**
 * Create a structured log entry.
 *
 * @param level - Log level
 * @param message - Log message
 * @param context - Additional context
 * @returns Structured log entry
 */
export function createLogEntry(
  level: BotLogEntry['level'],
  message: string,
  context?: Record<string, unknown>
): BotLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };
}

/**
 * Log a structured message to console.
 *
 * @param entry - Log entry to output
 */
export function logEntry(entry: BotLogEntry): void {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  console.log(`${prefix} ${entry.message}${contextStr}`);
}

/**
 * Log info message.
 */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  logEntry(createLogEntry('info', message, context));
}

/**
 * Log warning message.
 */
export function logWarn(message: string, context?: Record<string, unknown>): void {
  logEntry(createLogEntry('warn', message, context));
}

/**
 * Log error message.
 */
export function logError(message: string, context?: Record<string, unknown>): void {
  logEntry(createLogEntry('error', message, context));
}

/**
 * Log debug message.
 */
export function logDebug(message: string, context?: Record<string, unknown>): void {
  logEntry(createLogEntry('debug', message, context));
}

// =============================================================================
// Execution ID Generation
// =============================================================================

/**
 * Generate a unique execution ID for bot runs.
 *
 * @returns Unique execution ID
 */
export function generateExecutionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `exec-${timestamp}-${random}`;
}

// =============================================================================
// Patient Query Functions
// =============================================================================

/**
 * Find patients that need PDC calculation.
 *
 * @param medplum - Medplum client
 * @param criteria - Query criteria
 * @returns Array of patient IDs
 */
export async function findPatientsForPDCCalculation(
  medplum: MedplumClient,
  criteria: PatientQueryCriteria = {}
): Promise<string[]> {
  const { patientIds, excludePatientIds = [] } = criteria;

  // If specific patient IDs provided, use those
  if (patientIds && patientIds.length > 0) {
    return patientIds.filter((id) => !excludePatientIds.includes(id));
  }

  // Find patients with completed MedicationDispense records
  // This ensures we only process patients with actual fill data
  const dispenses = await medplum.searchResources('MedicationDispense', {
    status: 'completed',
    _elements: 'subject',
    _count: '1000',
  });

  // Extract unique patient IDs
  const patientIdSet = new Set<string>();

  for (const dispense of dispenses) {
    const patientRef = dispense.subject?.reference;
    if (patientRef) {
      const id = patientRef.replace('Patient/', '');
      if (!excludePatientIds.includes(id)) {
        patientIdSet.add(id);
      }
    }
  }

  return Array.from(patientIdSet);
}

/**
 * Find patients with active MedicationRequests.
 *
 * @param medplum - Medplum client
 * @returns Array of patient IDs
 */
export async function findPatientsWithActiveMedications(
  medplum: MedplumClient
): Promise<string[]> {
  const requests = await medplum.searchResources('MedicationRequest', {
    status: 'active',
    _elements: 'subject',
    _count: '1000',
  });

  const patientIdSet = new Set<string>();

  for (const request of requests) {
    const patientRef = request.subject?.reference;
    if (patientRef) {
      patientIdSet.add(patientRef.replace('Patient/', ''));
    }
  }

  return Array.from(patientIdSet);
}

// =============================================================================
// Result Aggregation
// =============================================================================

/**
 * Create a patient processing result.
 *
 * @param patientId - Patient ID
 * @param success - Whether processing succeeded
 * @param durationMs - Processing duration
 * @param measuresCalculated - Number of measures
 * @param medicationsProcessed - Number of medications
 * @param error - Error message if failed
 * @returns Patient processing result
 */
export function createPatientResult(
  patientId: string,
  success: boolean,
  durationMs: number,
  measuresCalculated: number = 0,
  medicationsProcessed: number = 0,
  error?: string
): PatientProcessingResult {
  return {
    patientId,
    success,
    error,
    measuresCalculated,
    medicationsProcessed,
    durationMs,
  };
}

/**
 * Create a batch processing result.
 *
 * @param executionId - Execution ID
 * @param startedAt - Start timestamp
 * @param results - Individual patient results
 * @returns Batch processing result
 */
export function createBatchResult(
  executionId: string,
  startedAt: Date,
  results: PatientProcessingResult[]
): BatchProcessingResult {
  const completedAt = new Date();
  const totalDurationMs = completedAt.getTime() - startedAt.getTime();

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  return {
    executionId,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totalPatients: results.length,
    successCount,
    errorCount,
    results,
    totalDurationMs,
    avgDurationPerPatientMs:
      results.length > 0 ? Math.round(totalDurationMs / results.length) : 0,
  };
}

// =============================================================================
// Rate Limiting & Batching
// =============================================================================

/**
 * Process items in batches with optional delay.
 *
 * @param items - Items to process
 * @param processor - Function to process each item
 * @param batchSize - Number of items per batch
 * @param delayBetweenBatches - Delay in ms between batches
 * @returns Array of results
 */
export async function processBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  delayBetweenBatches: number = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Process batch items sequentially to avoid overwhelming the server
    for (const item of batch) {
      const result = await processor(item);
      results.push(result);
    }

    // Add delay between batches (but not after the last batch)
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      await sleep(delayBetweenBatches);
    }
  }

  return results;
}

/**
 * Sleep for a specified duration.
 *
 * @param ms - Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Safely extract error message from unknown error.
 *
 * @param error - Unknown error value
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

/**
 * Wrap an async function with error handling.
 *
 * @param fn - Async function to wrap
 * @param fallbackMessage - Fallback error message
 * @returns Wrapped function that returns Result type
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  fallbackMessage: string = 'Operation failed'
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) || fallbackMessage };
  }
}

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Validate that a patient exists.
 *
 * @param medplum - Medplum client
 * @param patientId - Patient ID to validate
 * @returns True if patient exists
 */
export async function validatePatientExists(
  medplum: MedplumClient,
  patientId: string
): Promise<boolean> {
  try {
    await medplum.readResource('Patient', patientId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current measurement year.
 *
 * @returns Current year
 */
export function getCurrentMeasurementYear(): number {
  return new Date().getFullYear();
}
