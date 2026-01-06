/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, import/no-anonymous-default-export, max-lines-per-function, complexity */

/**
 * Coverage Calendar Service (Stub)
 *
 * Stub implementation for coverage calendar functionality
 */

export const buildCoverageCalendar = (patient: any, rxClaims: any[]): any => {
  console.warn('[LEGACY] buildCoverageCalendar stub');
  return {};
};

export const calculateCoveredDays = (claims: any[], startDate: any, endDate: any): number => {
  console.warn('[LEGACY] calculateCoveredDays stub');
  return 0;
};

export default {
  buildCoverageCalendar,
  calculateCoveredDays,
};
