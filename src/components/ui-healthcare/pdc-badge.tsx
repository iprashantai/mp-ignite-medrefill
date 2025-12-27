/**
 * PDC Status Badge Component
 *
 * Displays PDC (Proportion of Days Covered) status with color-coded thresholds:
 * - Pass (≥80%): Green
 * - Caution (60-79%): Yellow/Amber
 * - Fail (<60%): Red
 *
 * Usage:
 * <PDCBadge pdc={85} />
 * <PDCBadge pdc={70} showValue />
 */

import React from 'react';
import { Badge, type BadgeSize } from './badge';
import { getPDCVariant, getPDCLabel } from '@/lib/design-system/helpers';

export interface PDCBadgeProps {
  pdc: number;
  showValue?: boolean;
  size?: BadgeSize;
  className?: string;
}

export const PDCBadge: React.FC<PDCBadgeProps> = ({
  pdc,
  showValue = false,
  size = 'sm',
  className,
}) => {
  const variant = getPDCVariant(pdc);
  const label = getPDCLabel(pdc);

  return (
    <Badge variant={variant} size={size} className={className}>
      {showValue ? `${pdc}%` : label}
    </Badge>
  );
};

export default PDCBadge;
