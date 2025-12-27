/**
 * Barrier Badge Component
 *
 * Displays patient adherence barriers:
 * - cost: Red
 * - access: Orange
 * - side_effects: Purple
 * - education: Blue
 * - transportation: Yellow
 * - forgot: Gray
 * - other: Gray
 *
 * Usage:
 * <BarrierBadge type="cost" />
 * <BarrierBadge type="side_effects" showIcon={false} />
 */

import React from 'react';
import { Badge, type BadgeSize, type BadgeVariant } from './badge';

export type BarrierType =
  | 'cost'
  | 'access'
  | 'side_effects'
  | 'education'
  | 'transportation'
  | 'forgot'
  | 'doesnt_need'
  | 'other';

export interface BarrierBadgeProps {
  type: BarrierType;
  showIcon?: boolean;
  size?: BadgeSize;
  className?: string;
}

const BARRIER_TYPE_CONFIG: Record<
  BarrierType,
  { label: string; variant: BadgeVariant; icon: string }
> = {
  cost: { label: 'Cost', variant: 'barrier-cost', icon: '💰' },
  access: { label: 'Access', variant: 'barrier-access', icon: '🚪' },
  side_effects: { label: 'Side Effects', variant: 'barrier-side-effects', icon: '⚠️' },
  education: { label: 'Education', variant: 'barrier-education', icon: '📚' },
  transportation: { label: 'Transport', variant: 'barrier-transportation', icon: '🚗' },
  forgot: { label: 'Forgot', variant: 'barrier-forgot', icon: '🧠' },
  doesnt_need: { label: "Doesn't Need", variant: 'barrier-other', icon: '❌' },
  other: { label: 'Other', variant: 'barrier-other', icon: '❓' },
};

export const BarrierBadge: React.FC<BarrierBadgeProps> = ({
  type,
  showIcon = true,
  size = 'xs',
  className,
}) => {
  const config = BARRIER_TYPE_CONFIG[type] || BARRIER_TYPE_CONFIG.other;

  return (
    <Badge variant={config.variant} size={size} className={className}>
      {showIcon && <span className="mr-0.5">{config.icon}</span>}
      {config.label}
    </Badge>
  );
};

export default BarrierBadge;
