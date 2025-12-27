/**
 * IgniteHealth - Design System Tokens (TypeScript)
 *
 * Centralized design tokens for colors, typography, spacing, shadows, and borders.
 * This file is the single source of truth for all design values across the application.
 *
 * Converted from ignite-medrefills designTokens.js
 *
 * Usage:
 * import { colors, spacing, typography } from '@/lib/design-system/tokens';
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const colors = {
  // Primary Blue (clinical action color)
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    300: '#93C5FD',
    500: '#3B82F6',
    600: '#2563EB', // Primary brand color
    700: '#1D4ED8',
  },

  // Success Green
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#22C55E',
    600: '#16A34A',
  },

  // Warning Amber
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
  },

  // Danger Red
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
  },

  // Neutral / Slate (primary neutral palette)
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    700: '#334155',
    900: '#0F172A',
  },

  // Semantic colors for specific use cases
  semantic: {
    // Fragility Tiers
    fragility: {
      F1: '#DC2626', // red-600 - Imminent
      F2: '#F59E0B', // amber-500 - Fragile
      F3: '#EAB308', // yellow-500 - Moderate
      F4: '#3B82F6', // blue-500 - Comfortable
      F5: '#22C55E', // green-500 - Safe
      T5: '#64748B', // slate-500 - Unsalvageable
    },

    // PDC Status
    pdc: {
      passing: '#22C55E', // ≥80% - green-500
      atRisk: '#F59E0B', // 60-79% - amber-500
      failing: '#EF4444', // <60% - red-500
    },

    // Background tints (for hover, active states)
    tint: {
      primary: '#EEF6FF', // Soft blue for active states
      hover: '#F9FBFF', // Ultra-soft blue for hover
      success: '#ECFDF5', // Soft green
      warning: '#FFFBEB', // Soft amber
      danger: '#FEF2F2', // Soft red
    },
  },
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Monaco", "Cascadia Code", monospace',
  },

  fontSize: {
    h1: '20px',
    h2: '18px',
    h3: '14px', // Section labels
    body: '14px',
    caption: '12px',
    tiny: '11px', // Chips, small labels
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },

  textColor: {
    primary: '#334155', // slate-700
    secondary: '#64748B', // slate-500
    tertiary: '#94A3B8', // slate-400
    inverse: '#FFFFFF',
  },
} as const;

// ============================================================================
// SPACING SCALE (8-pixel grid)
// ============================================================================

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

// ============================================================================
// BORDER RADIUS SCALE
// ============================================================================

export const borderRadius = {
  button: '8px',
  card: '12px',
  input: '6px',
  chip: '9999px', // Full pill
  table: '6px',
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  card: '0 1px 2px rgba(0, 0, 0, 0.04)',
  floating: '0 2px 6px rgba(0, 0, 0, 0.08)',
  none: 'none',
} as const;

// ============================================================================
// COMPONENT-SPECIFIC TOKENS
// ============================================================================

export const components = {
  // Sidebar
  sidebar: {
    background: colors.neutral[50],
    divider: '#E5E7EB',
    item: {
      height: '40px',
      padding: {
        vertical: '8px',
        horizontal: '12px',
      },
      default: {
        background: 'transparent',
        color: colors.neutral[700],
        iconColor: colors.neutral[500],
      },
      hover: {
        background: colors.neutral[100],
      },
      active: {
        background: '#EEF6FF',
        color: colors.primary[600],
        iconColor: colors.primary[600],
        borderLeft: `4px solid ${colors.primary[600]}`,
      },
    },
    section: {
      fontSize: '11px',
      fontWeight: '600',
      color: colors.neutral[500],
      textTransform: 'uppercase' as const,
      spacing: {
        top: '16px',
        bottom: '4px',
      },
    },
    badge: {
      background: '#FFFFFF',
      color: colors.neutral[500],
      border: colors.neutral[300],
      padding: '2px 8px',
      borderRadius: borderRadius.chip,
    },
  },

  // Buttons
  button: {
    height: '40px',
    padding: '10px 12px',
    borderRadius: borderRadius.button,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.body,
    transition: 'all 150ms ease-out',

    variants: {
      primary: {
        background: colors.primary[600],
        color: '#FFFFFF',
        hover: colors.primary[700],
      },
      secondary: {
        background: '#FFFFFF',
        color: colors.neutral[700],
        border: colors.neutral[300],
        hover: colors.neutral[50],
      },
      danger: {
        background: colors.danger[600],
        color: '#FFFFFF',
        hover: '#B91C1C',
      },
      ghost: {
        background: 'transparent',
        color: colors.neutral[700],
        hover: colors.neutral[100],
      },
    },
  },

  // Cards
  card: {
    background: '#FFFFFF',
    border: colors.neutral[200],
    borderRadius: borderRadius.card,
    shadow: shadows.card,
    padding: spacing[4],
  },

  // Filter Chips
  chip: {
    height: '30px',
    padding: '6px 12px',
    borderRadius: borderRadius.chip,
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.medium,
    transition: 'all 150ms ease-out',

    default: {
      background: '#FFFFFF',
      color: colors.neutral[700],
      border: colors.neutral[300],
    },
    hover: {
      background: '#EEF2FF',
      border: '#A5B4FC',
    },
    active: {
      background: colors.primary[600],
      color: '#FFFFFF',
      border: colors.primary[600],
    },
  },

  // Tables
  table: {
    header: {
      background: colors.neutral[50],
      color: colors.neutral[700],
      fontWeight: typography.fontWeight.semibold,
      height: '48px',
      borderBottom: colors.neutral[200],
    },
    row: {
      default: {
        background: '#FFFFFF',
        borderBottom: colors.neutral[200],
      },
      hover: {
        background: '#F9FBFF',
      },
      selected: {
        background: '#EEF6FF',
      },
    },
    cell: {
      padding: {
        vertical: '12px',
        horizontal: '16px',
      },
    },
  },

  // Inputs
  input: {
    height: '36px',
    padding: '10px',
    borderRadius: borderRadius.input,
    border: colors.neutral[200],
    background: '#FFFFFF',
    fontSize: typography.fontSize.body,

    focus: {
      outline: `2px solid ${colors.primary[300]}`,
      outlineOffset: '2px',
    },
  },

  // Badges
  badge: {
    padding: '2px 8px',
    borderRadius: borderRadius.chip,
    fontSize: typography.fontSize.tiny,
    fontWeight: typography.fontWeight.medium,

    variants: {
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
    },
  },
} as const;

// ============================================================================
// ANIMATION / TRANSITIONS
// ============================================================================

export const animation = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  timing: {
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================================================
// ICON CONFIGURATION
// ============================================================================

export const icons = {
  size: {
    small: '16px',
    default: '20px',
    large: '24px',
  },
  strokeWidth: '2px',
  color: colors.neutral[500],
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
export type Components = typeof components;
export type Animation = typeof animation;
export type Icons = typeof icons;

export type FragilityTier =
  | 'F1_IMMINENT'
  | 'F2_FRAGILE'
  | 'F3_MODERATE'
  | 'F4_COMFORTABLE'
  | 'F5_SAFE'
  | 'T5_UNSALVAGEABLE';
export type PDCStatus = 'passing' | 'atRisk' | 'failing';
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  components,
  animation,
  icons,
} as const;

export default designTokens;
