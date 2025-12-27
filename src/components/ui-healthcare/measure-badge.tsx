/**
 * Measure Badge Component
 *
 * Displays medication adherence measure types (MAC/MAD/MAH):
 * - MAC (Cholesterol): Blue
 * - MAD (Diabetes): Purple
 * - MAH (Hypertension): Pink
 *
 * Usage:
 * <MeasureBadge measure="MAC" />
 * <MeasureBadge measure="MAD" />
 */

import React from 'react';
import { Badge, type BadgeSize } from './badge';
import { getMeasureVariant, type MeasureType } from '@/lib/design-system/helpers';

export interface MeasureBadgeProps {
  measure: MeasureType | string;
  size?: BadgeSize;
  className?: string;
}

export const MeasureBadge: React.FC<MeasureBadgeProps> = ({ measure, size = 'sm', className }) => {
  if (!measure) return null;

  const variant = getMeasureVariant(measure as MeasureType);

  return (
    <Badge variant={variant} size={size} className={className}>
      {measure.toUpperCase()}
    </Badge>
  );
};

export default MeasureBadge;
