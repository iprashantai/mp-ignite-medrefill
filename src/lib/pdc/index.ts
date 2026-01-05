/**
 * PDC Module - PDC calculation and fragility tier determination
 *
 * @module @/lib/pdc
 */

// Constants
export {
  // PDC thresholds
  PDC_THRESHOLDS,
  PDC_TARGET,
  MAX_GAP_PERCENTAGE,
  GAP_DAYS_ALLOWED_PERCENTAGE,
  DEFAULT_DAYS_SUPPLY,

  // Fragility tier thresholds
  FRAGILITY_THRESHOLDS,

  // Priority scoring
  PRIORITY_BASE_SCORES,
  PRIORITY_BONUSES,
  MAX_PRIORITY_SCORE,

  // Urgency levels
  URGENCY_THRESHOLDS,
  URGENCY_LEVELS,
  type UrgencyLevel,

  // Q4 tightening
  Q4_TIGHTENING,
  Q4_TIER_PROMOTION,

  // Contact windows and actions
  CONTACT_WINDOWS,
  TIER_ACTIONS,

  // Tier ordering
  TIER_LEVELS,
  TIERS_BY_URGENCY,
  DELAY_BUDGET_THRESHOLDS,

  // Q4 detection
  Q4_MONTHS,
  isQ4,
  daysToYearEnd,
} from './constants';

// Types
export {
  // Zod schemas
  FillRecordSchema,
  MeasurementPeriodSchema,
  PDCInputSchema,
  GapDaysResultSchema,
  PDCResultSchema,
  CoverageIntervalSchema,

  // Types
  type FillRecord,
  type MeasurementPeriod,
  type PDCInput,
  type GapDaysResult,
  type PDCResult,
  type CoverageInterval,
  type PDCError,

  // Enums
  PDCErrorCode,
} from './types';

// Calculator functions
export {
  // Core calculation
  calculatePDC,
  calculatePDCFromDispenses,

  // Interval merging (covered days)
  calculateCoveredDaysFromFills,

  // Treatment period
  calculateTreatmentPeriod,

  // Gap days
  calculateGapDays,

  // Projections
  calculatePDCStatusQuo,
  calculatePDCPerfect,

  // Runout & supply
  calculateDaysToRunout,
  calculateCurrentSupply,
  calculateRefillsNeeded,

  // Transform helpers
  transformDispensesToInput,
} from './calculator';

// Fragility types
export {
  // Zod schemas
  UrgencyLevelSchema,
  FragilityInputSchema,
  FragilityResultSchema,

  // Types
  type UrgencyLevel as FragilityUrgencyLevel,
  type FragilityInput,
  type FragilityResult,
  type PriorityBonuses,
  type FragilityFlags,
} from './fragility-types';

// Fragility functions
export {
  // Delay budget
  calculateDelayBudget,

  // Tier determination
  determineTierFromDelayBudget,

  // Priority scoring
  calculatePriorityScore,

  // Urgency level
  determineUrgencyLevel,

  // Q4 tightening
  applyQ4Tightening,

  // Main fragility calculation
  calculateFragility,
} from './fragility';

// Refill calculator
export {
  // Coverage shortfall
  calculateCoverageShortfall,

  // Remaining refills
  calculateRemainingRefills,

  // Supply helpers
  calculateSupplyOnHand,
  calculateDaysToYearEnd as calculateDaysToYearEndFromDate,

  // Types
  type RefillCalculationInput,
  type RefillCalculationResult,
  type CoverageShortfallInput,
} from './refill-calculator';

// Re-export types from fhir module for convenience
export type { FragilityTier, MAMeasure } from '@/lib/fhir/types';

// Orchestrator
export {
  // Main functions
  calculateAndStorePatientPDC,
  calculateBatchPatientPDC,

  // Grouping utilities
  groupDispensesByMeasure,
  groupDispensesByMedication,

  // Types
  type PDCOrchestratorOptions,
  type PDCOrchestratorResult,
  type MeasurePDCResult,
  type MedicationPDCResult,
  type BatchPDCResult,
} from './orchestrator';
