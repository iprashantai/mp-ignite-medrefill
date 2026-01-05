/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, import/no-anonymous-default-export */

/**
 * Adherence Validation Service (Stub)
 *
 * Stub implementation for adherence validation functionality
 */

export const validateMedicationAdherence = (patient: any, medication: any): any => {
  console.warn('[LEGACY] validateMedicationAdherence stub');
  return { isValid: true };
};

export const detectInvalidOverlaps = (rxClaims: any[]): any[] => {
  console.warn('[LEGACY] detectInvalidOverlaps stub');
  return [];
};

export const findAdherenceGaps = (rxClaims: any[]): any[] => {
  console.warn('[LEGACY] findAdherenceGaps stub');
  return [];
};

export default {
  validateMedicationAdherence,
  detectInvalidOverlaps,
  findAdherenceGaps,
};
