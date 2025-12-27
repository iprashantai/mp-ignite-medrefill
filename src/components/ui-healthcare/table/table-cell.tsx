import React from 'react';
import { cn } from '@/lib/utils';
import { useTableContext } from './table';

/**
 * Text alignment options for table cells
 */
export type CellAlign = 'left' | 'center' | 'right';

/**
 * Table Cell Component
 *
 * DS Reference: COMPONENT.TABLE.CELL
 *
 * @example
 * ```tsx
 * <TableCell align="right">$1,234.56</TableCell>
 * ```
 */
export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Cell content */
  children: React.ReactNode;
  /** Text alignment */
  align?: CellAlign;
  /** Additional CSS classes */
  className?: string;
}

export function TableCell({ children, align = 'left', className, ...props }: TableCellProps) {
  const { densityClasses } = useTableContext();

  const alignClasses: Record<CellAlign, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td
      className={cn(
        densityClasses.tablePadding,
        densityClasses.fontSize,
        alignClasses[align],
        'align-top',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export default TableCell;
