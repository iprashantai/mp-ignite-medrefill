/**
 * Runout Status Badge Component
 *
 * Displays medication runout status based on days remaining:
 * - Critical (≤0 days): Red
 * - Urgent (1-7 days): Orange
 * - Due Soon (8-14 days): Yellow
 * - OK (>14 days): Green
 *
 * Usage:
 * <RunoutBadge daysToRunout={0} />
 * <RunoutBadge daysToRunout={5} />
 */

import React from 'react';
import { Badge, type BadgeSize } from './badge';
import { getRunoutVariant, getRunoutLabel } from '@/lib/design-system/helpers';

export interface RunoutBadgeProps {
  daysToRunout: number;
  size?: BadgeSize;
  className?: string;
}

export const RunoutBadge: React.FC<RunoutBadgeProps> = ({
  daysToRunout,
  size = 'sm',
  className,
}) => {
  const variant = getRunoutVariant(daysToRunout);
  const label = getRunoutLabel(daysToRunout);

  return (
    <Badge variant={variant} size={size} className={className}>
      {label}
    </Badge>
  );
};

export default RunoutBadge;
