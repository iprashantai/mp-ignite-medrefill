/**
 * Fragility Tier Badge Component
 *
 * Displays patient fragility/risk tiers (F1-F5, T5):
 * - F1 (Critical): Red
 * - F2 (Fragile): Orange
 * - F3 (Moderate): Yellow
 * - F4 (Stable): Blue
 * - F5 (Safe): Green
 * - T5 (Unsalvageable): Gray
 *
 * Usage:
 * <FragilityBadge tier="F1_IMMINENT" />
 * <FragilityBadge tier="F2_FRAGILE" />
 */

import React from 'react';
import { Badge, type BadgeSize } from './badge';
import {
  getFragilityVariant,
  getFragilityLabel,
  type FragilityTier,
} from '@/lib/design-system/helpers';

export interface FragilityBadgeProps {
  tier: FragilityTier | string;
  size?: BadgeSize;
  className?: string;
}

export const FragilityBadge: React.FC<FragilityBadgeProps> = ({ tier, size = 'sm', className }) => {
  const variant = getFragilityVariant(tier);
  const label = getFragilityLabel(tier);

  return (
    <Badge variant={variant} size={size} className={className}>
      {label}
    </Badge>
  );
};

export default FragilityBadge;
