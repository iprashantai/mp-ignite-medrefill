// Utility helpers for date formatting, data manipulation, and synthetic data generation

export {
  randInt,
  asDate,
  fmtDate,
  fmtDateTime,
  daysAgo,
  daysAhead,
  formatDateSafely,
  calculateDaysToRunout,
  parsePatientName,
  sortData,
} from './helpers';

export {
  generateRxClaimsForPatient,
  generateRxClaimsForBatch,
  exportClaimsToCSV,
} from './generateSyntheticRxClaims';

// Re-export constants for convenience
export { ADHERENCE_PATTERNS } from './generateSyntheticRxClaims';
