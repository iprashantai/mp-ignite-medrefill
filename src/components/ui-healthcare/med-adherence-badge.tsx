/**
 * Med Adherence Badge Component
 *
 * Combined badge showing measure type with PDC status coloring and gap days.
 * Displays measure (MAC/MAD/MAH) with color based on PDC threshold.
 *
 * Usage:
 * <MedAdherenceBadge measure="MAC" pdc={85} gapDaysRemaining={12} />
 * <MedAdherenceBadge measure="MAD" pdc={70} />
 */

import React from 'react';
import { Badge, type BadgeSize, type BadgeVariant } from './badge';

export interface MedAdherenceBadgeProps {
  measure: string;
  pdc?: number;
  gapDaysRemaining?: number;
  size?: BadgeSize;
  className?: string;
}

export const MedAdherenceBadge: React.FC<MedAdherenceBadgeProps> = ({
  measure,
  pdc,
  gapDaysRemaining,
  size = 'xs',
  className,
}) => {
  // Determine PDC status for color
  const getPDCStatusVariant = (): BadgeVariant => {
    if (pdc === undefined || pdc === null) return 'neutral';
    if (pdc >= 80) return 'pass';
    if (pdc >= 60) return 'caution';
    return 'fail';
  };

  const statusVariant = getPDCStatusVariant();

  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant={statusVariant} size={size} className={className}>
        {measure}
      </Badge>
      {pdc !== undefined && pdc !== null && (
        <span className="text-[10px] text-gray-600">PDC {pdc}%</span>
      )}
      {gapDaysRemaining !== undefined && gapDaysRemaining !== null && (
        <span className="text-[10px] text-gray-500">
          Gap:{' '}
          {gapDaysRemaining > 0
            ? `${gapDaysRemaining}d left`
            : `${Math.abs(gapDaysRemaining)}d over`}
        </span>
      )}
    </div>
  );
};

export default MedAdherenceBadge;
