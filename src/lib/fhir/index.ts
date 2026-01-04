/**
 * FHIR Module - Core types, helpers, and extension utilities
 *
 * @module @/lib/fhir
 */

// Types and schemas
export {
  // Result pattern
  type Result,
  ok,
  err,

  // Extension URLs
  EXTENSION_BASE_URL,
  EXTENSION_URLS,
  OBSERVATION_EXTENSION_URLS,
  PATIENT_EXTENSION_URLS,
  TASK_EXTENSION_URLS,

  // Code system URLs
  CODE_SYSTEM_URLS,

  // Zod schemas
  FragilityTierSchema,
  MAMeasureSchema,
  ReviewTypeSchema,
  TreatmentPeriodSchema,
  PDCObservationExtensionsSchema,
  PatientExtensionsSchema,
  FHIRExtensionSchema,

  // Types
  type FragilityTier,
  type MAMeasure,
  type ReviewType,
  type TreatmentPeriod,
  type PDCObservationExtensions,
  type PatientExtensions,
  type FHIRExtension,

  // Constants
  NON_COMPLIANT_TIERS,
  URGENT_TIERS,
  MA_MEASURE_DISPLAY,

  // Type guards
  isFragilityTier,
  isMAMeasure,
  isReviewType,
} from './types';

// Helper functions
export {
  // Core accessors
  getExtensionValue,
  hasExtension,

  // Typed getters
  getCodeExtension,
  getIntegerExtension,
  getBooleanExtension,
  getDecimalExtension,
  getPeriodExtension,
  getStringExtension,
  getDateTimeExtension,

  // Setters
  setExtensionValue,
  removeExtension,

  // Batch operations
  setMultipleExtensions,
  extractExtensionValues,

  // Types
  type ExtensionValue,
} from './helpers';

// Dispense service
export {
  // Query functions
  getPatientDispenses,
  getDispensesByMeasure,
  getDispensesByMedication,

  // Extraction helpers
  extractDaysSupply,
  extractFillDate,
  extractMedicationCode,
  classifyDispenseByMeasure,

  // Utility functions
  getLastFillDate,
  getFirstFillDate,
  dispensesToFillRecords,
  isReversedDispense,
  filterReversedDispenses,
} from './dispense-service';

// Observation service
export {
  // Store functions
  storePDCObservation,

  // Query functions
  getLatestPDCObservation,
  getCurrentPDCObservation,
  getPDCObservationHistory,
  getAllCurrentPDCObservations,

  // Parse functions
  parsePDCObservation,

  // Update functions
  markPreviousObservationsNotCurrent,

  // Types
  type PDCObservationInput,
  type ParsedPDCObservation,
} from './observation-service';

// SearchParameters
export {
  // Definitions
  SEARCH_PARAMETERS,

  // Deployment
  deploySearchParameters,
  getSearchParameterNames,
  getSearchParameterByName,

  // Query helpers
  DASHBOARD_QUERIES,
  QUEUE_QUERIES,
  PATIENT_QUERIES,
} from './search-parameters';

// Patient extensions
export {
  // Summary calculation
  calculatePatientSummary,
  buildPatientExtensions,

  // Update functions
  updatePatientExtensions,
  updatePatientExtensionsFromObservation,
  batchUpdatePatientExtensions,
  updateAllPatientExtensions,

  // Extraction
  extractPatientPDCSummary,

  // Types
  type PatientPDCSummary,
  type PatientExtensionUpdateResult,
} from './patient-extensions';
