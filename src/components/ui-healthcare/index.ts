/**
 * IgniteHealth - UI Healthcare Components
 *
 * Barrel export for all healthcare-specific UI components.
 *
 * Usage:
 * import { Badge, PDCBadge, MeasureBadge } from '@/components/ui-healthcare';
 */

// Main Badge component
export { Badge, BADGE_VARIANTS, BADGE_SIZES } from './badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './badge';

// Convenience Badge Components
export { PDCBadge } from './pdc-badge';
export type { PDCBadgeProps } from './pdc-badge';

export { MeasureBadge } from './measure-badge';
export type { MeasureBadgeProps } from './measure-badge';

export { FragilityBadge } from './fragility-badge';
export type { FragilityBadgeProps } from './fragility-badge';

export { DecisionBadge, ActionStatusBadge, AgentBadge } from './decision-badge';
export type { DecisionBadgeProps, ActionStatusBadgeProps, AgentBadgeProps } from './decision-badge';

export { RunoutBadge } from './runout-badge';
export type { RunoutBadgeProps } from './runout-badge';

export { UrgencyBadge } from './urgency-badge';
export type { UrgencyBadgeProps, UrgencyTier } from './urgency-badge';

export { BarrierBadge } from './barrier-badge';
export type { BarrierBadgeProps, BarrierType } from './barrier-badge';

export { MedAdherenceBadge } from './med-adherence-badge';
export type { MedAdherenceBadgeProps } from './med-adherence-badge';
