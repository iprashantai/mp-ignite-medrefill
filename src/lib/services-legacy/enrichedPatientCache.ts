/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, import/no-anonymous-default-export, max-lines-per-function, complexity */

/**
 * Enriched Patient Cache Service (Stub)
 *
 * Stub implementation for patient caching functionality
 */

export const getCachedPatient = async (patientId: string): Promise<any> => {
  console.warn('[LEGACY] getCachedPatient stub');
  return null;
};

export const setCachedPatient = async (patientId: string, data: any): Promise<void> => {
  console.warn('[LEGACY] setCachedPatient stub');
};

export const invalidateCachedPatient = async (patientId: string): Promise<void> => {
  console.warn('[LEGACY] invalidateCachedPatient stub');
};

export const clearAllCache = async (): Promise<void> => {
  console.warn('[LEGACY] clearAllCache stub');
};

export const getMany = (patients: any[]): { cached: any[]; missing: any[] } => {
  console.warn('[LEGACY] getMany stub');
  return { cached: [], missing: patients };
};

export const setMany = async (patients: any[], enrichedData?: any): Promise<void> => {
  console.warn('[LEGACY] setMany stub');
};

export const logStats = (): void => {
  console.warn('[LEGACY] logStats stub');
};

export default {
  getCachedPatient,
  setCachedPatient,
  invalidateCachedPatient,
  clearAllCache,
  getMany,
  setMany,
  logStats,
};
