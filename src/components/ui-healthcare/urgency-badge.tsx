/**
 * Urgency Badge Component
 *
 * Displays urgency tier or urgency index:
 * - EXTREME: Red
 * - HIGH: Orange
 * - MODERATE: Yellow
 * - LOW: Blue
 * - MINIMAL: Green
 *
 * Usage:
 * <UrgencyBadge tier="EXTREME" />
 * <UrgencyBadge urgencyIndex={95} tier="EXTREME" />
 */

import React from 'react';
import { Badge, type BadgeSize, type BadgeVariant } from './badge';

export type UrgencyTier = 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL';

export interface UrgencyBadgeProps {
  urgencyIndex?: number;
  tier: UrgencyTier;
  showScore?: boolean;
  size?: BadgeSize;
  className?: string;
}

const URGENCY_TIER_CONFIG: Record<UrgencyTier, { label: string; variant: BadgeVariant }> = {
  EXTREME: { label: 'Extreme', variant: 'urgency-extreme' },
  HIGH: { label: 'High', variant: 'urgency-high' },
  MODERATE: { label: 'Moderate', variant: 'urgency-moderate' },
  LOW: { label: 'Low', variant: 'urgency-low' },
  MINIMAL: { label: 'Minimal', variant: 'urgency-minimal' },
};

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({
  urgencyIndex,
  tier,
  showScore = true,
  size = 'sm',
  className,
}) => {
  const config = URGENCY_TIER_CONFIG[tier] || { label: tier, variant: 'neutral' as BadgeVariant };

  return (
    <Badge variant={config.variant} size={size} className={className}>
      {showScore && urgencyIndex !== undefined ? urgencyIndex : config.label}
    </Badge>
  );
};

export default UrgencyBadge;
