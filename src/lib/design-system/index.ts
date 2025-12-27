/**
 * IgniteHealth - Design System
 *
 * Central export point for all design system tokens and helpers.
 *
 * Usage:
 * import { colors, getPDCVariant, getFragilityClasses } from '@/lib/design-system';
 */

// Tokens
export {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  components,
  animation,
  icons,
  default as designTokens,
} from './tokens';

// Type exports
export type {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Components,
  Animation,
  Icons,
  FragilityTier,
  PDCStatus,
  BadgeVariant,
} from './tokens';

// Helper functions
export {
  // Fragility
  getFragilityColor,
  getFragilityVariant,
  getFragilityLabel,
  getFragilityClasses,
  // PDC
  getPDCColor,
  getPDCStatus,
  getPDCVariant,
  getPDCLabel,
  getPDCClasses,
  // Measures
  getMeasureVariant,
  getMeasureLabel,
  getMeasureClasses,
  // Runout
  getRunoutVariant,
  getRunoutLabel,
  // Decision
  getDecisionVariant,
  // Badge
  getBadgeVariant,
} from './helpers';

// Type exports from helpers
export type { MeasureType, DecisionStatus } from './helpers';
