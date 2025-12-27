/**
 * IgniteHealth - Design System Helper Functions
 *
 * Utility functions for working with design tokens.
 * These functions provide type-safe access to semantic colors based on data values.
 */

import { colors, type FragilityTier, type PDCStatus, type BadgeVariant } from './tokens';

// Re-export types for external use
export type { FragilityTier, PDCStatus, BadgeVariant } from './tokens';

// ============================================================================
// FRAGILITY TIER HELPERS
// ============================================================================

/**
 * Get fragility tier color
 * @param tier - F1_IMMINENT, F2_FRAGILE, etc.
 * @returns Hex color
 */
export function getFragilityColor(tier: FragilityTier | string): string {
  const tierMap: Record<string, string> = {
    F1_IMMINENT: colors.semantic.fragility.F1,
    F2_FRAGILE: colors.semantic.fragility.F2,
    F3_MODERATE: colors.semantic.fragility.F3,
    F4_COMFORTABLE: colors.semantic.fragility.F4,
    F5_SAFE: colors.semantic.fragility.F5,
    T5_UNSALVAGEABLE: colors.semantic.fragility.T5,
    // Short forms
    F1: colors.semantic.fragility.F1,
    F2: colors.semantic.fragility.F2,
    F3: colors.semantic.fragility.F3,
    F4: colors.semantic.fragility.F4,
    F5: colors.semantic.fragility.F5,
    T5: colors.semantic.fragility.T5,
  };
  return tierMap[tier] || colors.neutral[500];
}

/**
 * Get fragility tier badge variant
 */
export function getFragilityVariant(tier: FragilityTier | string): string {
  const variantMap: Record<string, string> = {
    F1_IMMINENT: 'critical',
    F2_FRAGILE: 'fragile',
    F3_MODERATE: 'moderate',
    F4_COMFORTABLE: 'stable',
    F5_SAFE: 'safe',
    T5_UNSALVAGEABLE: 'lost',
    F1: 'critical',
    F2: 'fragile',
    F3: 'moderate',
    F4: 'stable',
    F5: 'safe',
    T5: 'lost',
  };
  return variantMap[tier] || 'neutral';
}

/**
 * Get fragility tier label
 */
export function getFragilityLabel(tier: FragilityTier | string): string {
  const labelMap: Record<string, string> = {
    F1_IMMINENT: 'Critical',
    F2_FRAGILE: 'Fragile',
    F3_MODERATE: 'Moderate',
    F4_COMFORTABLE: 'Stable',
    F5_SAFE: 'Safe',
    T5_UNSALVAGEABLE: 'Lost',
    F1: 'Critical',
    F2: 'Fragile',
    F3: 'Moderate',
    F4: 'Stable',
    F5: 'Safe',
    T5: 'Lost',
  };
  return labelMap[tier] || tier;
}

// ============================================================================
// PDC STATUS HELPERS
// ============================================================================

/**
 * Get PDC status color
 * @param pdc - PDC percentage (0-100)
 * @returns Hex color
 */
export function getPDCColor(pdc: number): string {
  if (pdc >= 80) return colors.semantic.pdc.passing;
  if (pdc >= 60) return colors.semantic.pdc.atRisk;
  return colors.semantic.pdc.failing;
}

/**
 * Get PDC status as enum
 */
export function getPDCStatus(pdc: number): PDCStatus {
  if (pdc >= 80) return 'passing';
  if (pdc >= 60) return 'atRisk';
  return 'failing';
}

/**
 * Get PDC badge variant
 */
export function getPDCVariant(pdc: number): 'pass' | 'caution' | 'fail' {
  if (pdc >= 80) return 'pass';
  if (pdc >= 60) return 'caution';
  return 'fail';
}

/**
 * Get PDC label
 */
export function getPDCLabel(pdc: number): string {
  if (pdc >= 80) return 'Pass';
  if (pdc >= 60) return 'At-Risk';
  return 'Fail';
}

// ============================================================================
// MEASURE TYPE HELPERS
// ============================================================================

export type MeasureType = 'MAC' | 'MAD' | 'MAH';

/**
 * Get measure badge variant
 */
export function getMeasureVariant(measure: MeasureType): string {
  const variantMap: Record<MeasureType, string> = {
    MAC: 'mac',
    MAD: 'mad',
    MAH: 'mah',
  };
  return variantMap[measure] || 'neutral';
}

/**
 * Get measure full name
 */
export function getMeasureLabel(measure: MeasureType): string {
  const labelMap: Record<MeasureType, string> = {
    MAC: 'Cholesterol',
    MAD: 'Diabetes',
    MAH: 'Hypertension',
  };
  return labelMap[measure] || measure;
}

// ============================================================================
// RUNOUT STATUS HELPERS
// ============================================================================

/**
 * Get runout variant based on days until medication runs out
 */
export function getRunoutVariant(daysToRunout: number): string {
  if (daysToRunout <= 0) return 'runout-critical';
  if (daysToRunout <= 7) return 'runout-urgent';
  if (daysToRunout <= 14) return 'due-soon';
  return 'ok';
}

/**
 * Get runout label
 */
export function getRunoutLabel(daysToRunout: number): string {
  if (daysToRunout <= 0) return 'Out of Meds';
  if (daysToRunout <= 7) return `${daysToRunout}d left`;
  if (daysToRunout <= 14) return `${daysToRunout}d left`;
  return `${daysToRunout}d`;
}

// ============================================================================
// DECISION STATUS HELPERS
// ============================================================================

export type DecisionStatus =
  | 'approve'
  | 'deny'
  | 'pending'
  | 'no-review-needed'
  | 'pending-review'
  | 'pre-approved'
  | 'pre-denied'
  | 'reviewed'
  | 'override-approved'
  | 'confirmed-denied';

/**
 * Get decision variant for AI decisions
 */
export function getDecisionVariant(decision: string): string {
  const normalized = decision.toLowerCase().replace(/[_\s]/g, '-');
  const variantMap: Record<string, string> = {
    approve: 'approve',
    approved: 'approve',
    deny: 'deny',
    denied: 'deny',
    pending: 'pending',
    'no-review-needed': 'no-review-needed',
    'pending-review': 'pending-review',
    'pre-approved': 'pre-approved',
    'pre-denied': 'pre-denied',
    reviewed: 'reviewed',
    'override-approved': 'override-approved',
    'confirmed-denied': 'confirmed-denied',
  };
  return variantMap[normalized] || 'neutral';
}

// ============================================================================
// BADGE VARIANT HELPERS
// ============================================================================

/**
 * Get badge variant styles
 * @param variant - success, warning, danger, neutral, primary
 * @returns Style object with background and color
 */
export function getBadgeVariant(variant: BadgeVariant): { background: string; color: string } {
  const variants = {
    success: {
      background: colors.success[100],
      color: colors.success[600],
    },
    warning: {
      background: colors.warning[100],
      color: colors.warning[500],
    },
    danger: {
      background: colors.danger[100],
      color: colors.danger[600],
    },
    neutral: {
      background: colors.neutral[100],
      color: colors.neutral[700],
    },
    primary: {
      background: colors.primary[100],
      color: colors.primary[600],
    },
  };
  return variants[variant] || variants.neutral;
}

// ============================================================================
// TAILWIND CLASS HELPERS
// ============================================================================

/**
 * Get Tailwind classes for PDC status
 */
export function getPDCClasses(pdc: number): string {
  if (pdc >= 80) return 'bg-green-100 text-green-700';
  if (pdc >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

/**
 * Get Tailwind classes for fragility tier
 */
export function getFragilityClasses(tier: FragilityTier | string): string {
  const classMap: Record<string, string> = {
    F1_IMMINENT: 'bg-red-100 text-red-700',
    F2_FRAGILE: 'bg-orange-100 text-orange-700',
    F3_MODERATE: 'bg-yellow-100 text-yellow-700',
    F4_COMFORTABLE: 'bg-blue-100 text-blue-700',
    F5_SAFE: 'bg-green-100 text-green-700',
    T5_UNSALVAGEABLE: 'bg-gray-100 text-gray-600',
    F1: 'bg-red-100 text-red-700',
    F2: 'bg-orange-100 text-orange-700',
    F3: 'bg-yellow-100 text-yellow-700',
    F4: 'bg-blue-100 text-blue-700',
    F5: 'bg-green-100 text-green-700',
    T5: 'bg-gray-100 text-gray-600',
  };
  return classMap[tier] || 'bg-gray-100 text-gray-600';
}

/**
 * Get Tailwind classes for measure type
 */
export function getMeasureClasses(measure: MeasureType): string {
  const classMap: Record<MeasureType, string> = {
    MAC: 'bg-blue-100 text-blue-800',
    MAD: 'bg-purple-100 text-purple-800',
    MAH: 'bg-pink-100 text-pink-800',
  };
  return classMap[measure] || 'bg-gray-100 text-gray-600';
}
