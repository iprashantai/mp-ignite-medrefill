/**
 * IgniteHealth - Badge Component System
 *
 * Comprehensive badge component with 100+ healthcare-specific variants.
 * Pattern: bg-{color}-100 text-{color}-700 (NO borders)
 *
 * Usage:
 * import { Badge, BADGE_VARIANTS } from '@/components/ui-healthcare/badge';
 *
 * <Badge variant="pass">Pass</Badge>
 * <Badge variant="fail" size="lg">Fail</Badge>
 */

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// BADGE VARIANT DEFINITIONS - bg-{color}-100 text-{color}-700 (NO border)
// =============================================================================

export const BADGE_VARIANTS = {
  // PDC Status badges - bg-{color}-100 text-{color}-700 (no border)
  pass: 'bg-green-100 text-green-700',
  caution: 'bg-yellow-100 text-yellow-700',
  fail: 'bg-red-100 text-red-700',

  // Fragility Tier badges - bg-{color}-100 text-{color}-700 (no border)
  critical: 'bg-red-100 text-red-700',
  fragile: 'bg-orange-100 text-orange-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  stable: 'bg-blue-100 text-blue-700',
  safe: 'bg-green-100 text-green-700',
  lost: 'bg-gray-100 text-gray-600',

  // Measure Type badges - bg-{color}-100 text-{color}-800 (no border)
  mac: 'bg-blue-100 text-blue-800',
  mad: 'bg-purple-100 text-purple-800',
  mah: 'bg-pink-100 text-pink-800',

  // Runout Status badges - bg-{color}-100 text-{color}-700 (no border)
  'runout-critical': 'bg-red-100 text-red-700',
  'runout-urgent': 'bg-orange-100 text-orange-700',
  'due-soon': 'bg-yellow-100 text-yellow-700',
  ok: 'bg-green-100 text-green-700',

  // AI Decision badges - bg-{color}-100 text-{color}-700 (no border)
  approve: 'bg-green-100 text-green-700',
  deny: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',

  // Generic/Utility badges - bg-{color}-100 text-{color}-700 (no border)
  neutral: 'bg-gray-100 text-gray-600',
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',

  // Decision Status badges - bg-{color}-100 text-{color}-700 (no border)
  'no-review-needed': 'bg-green-100 text-green-700',
  'pending-review': 'bg-yellow-100 text-yellow-700',
  'pre-approved': 'bg-blue-100 text-blue-700',
  'pre-denied': 'bg-red-100 text-red-700',
  reviewed: 'bg-blue-100 text-blue-700',
  'override-approved': 'bg-green-100 text-green-700',
  'confirmed-denied': 'bg-red-100 text-red-700',

  // Action Status badges - bg-{color}-100 text-{color}-700 (no border)
  'rx-sent': 'bg-blue-100 text-blue-700',
  'filled-confirmed': 'bg-green-100 text-green-700',
  'rx-sent-not-filled': 'bg-orange-100 text-orange-700',
  'exception-appt': 'bg-purple-100 text-purple-700',
  'exception-pa': 'bg-purple-100 text-purple-700',
  'exception-expired': 'bg-orange-100 text-orange-700',
  'exception-clinical': 'bg-red-100 text-red-700',
  'exception-patient-declined': 'bg-gray-100 text-gray-600',
  'ai-outreach-sent': 'bg-blue-100 text-blue-700',
  'ai-barrier-detected': 'bg-yellow-100 text-yellow-700',
  'human-escalated': 'bg-orange-100 text-orange-700',
  'awaiting-patient-response': 'bg-gray-100 text-gray-600',
  'scheduled-followup': 'bg-green-100 text-green-700',

  // Agent badges - bg-{color}-100 text-{color}-800 (no border)
  'agent-primary': 'bg-blue-100 text-blue-800',
  'agent-manager': 'bg-purple-100 text-purple-800',

  // Urgency Tier badges - bg-{color}-100 text-{color}-700 (no border)
  'urgency-extreme': 'bg-red-100 text-red-700',
  'urgency-high': 'bg-orange-100 text-orange-700',
  'urgency-moderate': 'bg-yellow-100 text-yellow-700',
  'urgency-low': 'bg-blue-100 text-blue-700',
  'urgency-minimal': 'bg-green-100 text-green-700',

  // Barrier Type badges - bg-{color}-100 text-{color}-700 (no border)
  'barrier-cost': 'bg-red-100 text-red-700',
  'barrier-access': 'bg-orange-100 text-orange-700',
  'barrier-side-effects': 'bg-purple-100 text-purple-700',
  'barrier-education': 'bg-blue-100 text-blue-700',
  'barrier-transportation': 'bg-yellow-100 text-yellow-700',
  'barrier-forgot': 'bg-gray-100 text-gray-600',
  'barrier-other': 'bg-gray-100 text-gray-600',

  // Campaign Status badges
  'campaign-active': 'bg-green-100 text-green-700',
  'campaign-paused': 'bg-yellow-100 text-yellow-700',
  'campaign-completed': 'bg-blue-100 text-blue-700',
  'campaign-archived': 'bg-gray-100 text-gray-700',

  // Campaign Type badges
  'outreach-call': 'bg-blue-100 text-blue-700',
  'refill-reminder': 'bg-purple-100 text-purple-700',
  'patient-education': 'bg-green-100 text-green-700',
  'wellness-checkin': 'bg-orange-100 text-orange-700',
  'adherence-outreach': 'bg-indigo-100 text-indigo-700',

  // Patient Outreach Status badges
  'not-contacted': 'bg-gray-100 text-gray-700',
  'outreach-attempted': 'bg-blue-100 text-blue-700',
  'patient-responded': 'bg-purple-100 text-purple-700',
  'appointment-scheduled': 'bg-indigo-100 text-indigo-700',
  'intervention-complete': 'bg-green-100 text-green-700',
  'lost-to-followup': 'bg-red-100 text-red-700',
  'opted-out': 'bg-orange-100 text-orange-700',

  // Batch/Processing Status badges
  processing: 'bg-blue-100 text-blue-700',
  ready: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  superseded: 'bg-neutral-200 text-neutral-600',

  // Legacy variants (for backward compatibility)
  default: 'bg-gray-100 text-gray-600',
  secondary: 'bg-gray-600 text-white',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
  review: 'bg-purple-100 text-purple-700',
  'success-solid': 'bg-green-600 text-white border border-green-700',
  'error-solid': 'bg-red-600 text-white border border-red-700',
  'info-solid': 'bg-blue-600 text-white border border-blue-700',
  'warning-solid': 'bg-amber-600 text-white border border-amber-700',
} as const;

export const BADGE_SIZES = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type BadgeVariant = keyof typeof BADGE_VARIANTS;
export type BadgeSize = keyof typeof BADGE_SIZES;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  pill?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
  dot?: boolean;
  children: React.ReactNode;
}

// =============================================================================
// BADGE COMPONENT
// =============================================================================

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      className,
      variant = 'default',
      size = 'md',
      pill = false,
      removable = false,
      onRemove,
      icon,
      dot = false,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center font-semibold transition-colors duration-200';
    const variantClasses = BADGE_VARIANTS[variant] || BADGE_VARIANTS.default;
    const sizeClasses = BADGE_SIZES[size] || BADGE_SIZES.md;
    const shapeClass = pill ? 'rounded-full' : 'rounded';

    const badgeClasses = cn(baseStyles, variantClasses, sizeClasses, shapeClass, className);

    // Determine dot color based on variant
    const getDotColor = () => {
      if (
        variant.includes('success') ||
        variant === 'pass' ||
        variant === 'safe' ||
        variant === 'approve'
      )
        return 'bg-green-500';
      if (
        variant.includes('error') ||
        variant === 'fail' ||
        variant === 'deny' ||
        variant === 'critical'
      )
        return 'bg-red-500';
      if (variant.includes('warning') || variant === 'caution' || variant === 'moderate')
        return 'bg-amber-500';
      if (variant.includes('info') || variant === 'stable') return 'bg-blue-500';
      if (variant === 'fragile') return 'bg-orange-500';
      return 'bg-gray-500';
    };

    return (
      <span ref={ref} className={badgeClasses} {...props}>
        {dot && <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', getDotColor())} />}
        {icon && <span className="mr-1">{icon}</span>}
        {children}
        {removable && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="-mr-0.5 ml-1 inline-flex items-center justify-center hover:opacity-75"
            aria-label="Remove badge"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
