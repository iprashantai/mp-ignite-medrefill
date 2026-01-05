/**
 * Shared Bot Types
 *
 * Type definitions for Medplum Bots used in the PDC calculation system.
 *
 * @module @/bots/shared/bot-types
 */

import type { Patient, Resource } from '@medplum/fhirtypes';

// =============================================================================
// Bot Event Types
// =============================================================================

/**
 * Input for CRON-triggered bots (no specific resource).
 */
export interface CronBotInput {
  /** Type discriminator for CRON triggers */
  type: 'cron';
  /** ISO timestamp when CRON was triggered */
  triggeredAt: string;
  /** Optional parameters passed to the bot */
  parameters?: Record<string, unknown>;
}

/**
 * Input for Subscription-triggered bots (resource-based).
 */
export interface SubscriptionBotInput<T extends Resource = Resource> {
  /** Type discriminator for subscription triggers */
  type: 'subscription';
  /** The resource that triggered the subscription */
  resource: T;
  /** The subscription criteria that matched */
  subscriptionCriteria: string;
}

/**
 * Input for on-demand bot execution.
 */
export interface OnDemandBotInput {
  /** Type discriminator for on-demand triggers */
  type: 'on-demand';
  /** Patient ID to process */
  patientId?: string;
  /** Array of patient IDs for batch processing */
  patientIds?: string[];
  /** Optional parameters */
  parameters?: Record<string, unknown>;
}

/**
 * Union type for all bot input types.
 */
export type BotInput<T extends Resource = Resource> =
  | CronBotInput
  | SubscriptionBotInput<T>
  | OnDemandBotInput;

// =============================================================================
// Bot Result Types
// =============================================================================

/**
 * Result of a single patient PDC calculation.
 */
export interface PatientProcessingResult {
  /** Patient ID processed */
  patientId: string;
  /** Whether processing succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Number of measures calculated */
  measuresCalculated: number;
  /** Number of medications processed */
  medicationsProcessed: number;
  /** Processing duration in ms */
  durationMs: number;
}

/**
 * Result of batch PDC calculation.
 */
export interface BatchProcessingResult {
  /** Bot execution ID */
  executionId: string;
  /** Start timestamp */
  startedAt: string;
  /** End timestamp */
  completedAt: string;
  /** Total patients processed */
  totalPatients: number;
  /** Successful patient count */
  successCount: number;
  /** Failed patient count */
  errorCount: number;
  /** Individual patient results */
  results: PatientProcessingResult[];
  /** Total duration in ms */
  totalDurationMs: number;
  /** Average duration per patient in ms */
  avgDurationPerPatientMs: number;
}

/**
 * Log entry for bot execution.
 */
export interface BotLogEntry {
  /** Log timestamp */
  timestamp: string;
  /** Log level */
  level: 'info' | 'warn' | 'error' | 'debug';
  /** Log message */
  message: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

// =============================================================================
// Bot Configuration Types
// =============================================================================

/**
 * Configuration for the nightly PDC calculator bot.
 */
export interface PDCNightlyBotConfig {
  /** Measurement year (default: current year) */
  measurementYear?: number;
  /** Include medication-level observations */
  includeMedicationLevel: boolean;
  /** Update patient extensions */
  updatePatientExtensions: boolean;
  /** Maximum patients to process per run (for rate limiting) */
  maxPatientsPerRun?: number;
  /** Batch size for concurrent processing */
  batchSize: number;
  /** Enable dry run mode (no writes) */
  dryRun: boolean;
}

/**
 * Default configuration for nightly PDC bot.
 */
export const DEFAULT_PDC_BOT_CONFIG: PDCNightlyBotConfig = {
  measurementYear: undefined, // Will use current year
  includeMedicationLevel: true,
  updatePatientExtensions: true,
  maxPatientsPerRun: undefined, // No limit
  batchSize: 10,
  dryRun: false,
};

// =============================================================================
// Bot Context Types
// =============================================================================

/**
 * Context passed to bot handlers.
 */
export interface BotContext {
  /** Bot ID */
  botId: string;
  /** Bot name */
  botName: string;
  /** Project ID */
  projectId: string;
  /** Execution ID (unique per run) */
  executionId: string;
  /** Start timestamp */
  startedAt: Date;
}

/**
 * Secrets available to bots.
 */
export interface BotSecrets {
  /** AWS Bedrock region (for AI integration) */
  AWS_REGION?: string;
  /** Any other secrets needed */
  [key: string]: string | undefined;
}

// =============================================================================
// Patient Query Types
// =============================================================================

/**
 * Criteria for finding patients to process.
 */
export interface PatientQueryCriteria {
  /** Include only patients with active MedicationRequests */
  hasActiveMedicationRequests?: boolean;
  /** Include only patients with MA-qualifying medications */
  hasMAMedications?: boolean;
  /** Last calculation date threshold (recalculate if older) */
  lastCalculatedBefore?: Date;
  /** Specific patient IDs to include */
  patientIds?: string[];
  /** Exclude specific patient IDs */
  excludePatientIds?: string[];
}
