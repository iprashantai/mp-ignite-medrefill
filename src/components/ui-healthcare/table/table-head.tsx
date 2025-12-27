import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Table Head Component
 *
 * DS Reference: COMPONENT.TABLE.HEADER
 *
 * @example
 * ```tsx
 * <TableHead sticky>
 *   <TableRow>
 *     <TableHeaderCell>Name</TableHeaderCell>
 *   </TableRow>
 * </TableHead>
 * ```
 */
export interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  /** TableRow with TableHeaderCells */
  children: React.ReactNode;
  /** Enable sticky positioning */
  sticky?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function TableHead({ children, sticky = true, className, ...props }: TableHeadProps) {
  return (
    <thead className={cn('bg-gray-50', sticky && 'sticky top-0 z-10', className)} {...props}>
      {children}
    </thead>
  );
}

export default TableHead;
