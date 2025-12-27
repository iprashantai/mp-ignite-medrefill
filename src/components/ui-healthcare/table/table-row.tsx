import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Table Row Component
 *
 * DS Reference: COMPONENT.TABLE.ROW
 *
 * @example
 * ```tsx
 * <TableRow hoverable clickable onClick={() => handleSelect(item)}>
 *   <TableCell>{item.name}</TableCell>
 * </TableRow>
 * ```
 */
export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** TableCells */
  children: React.ReactNode;
  /** Enable hover state */
  hoverable?: boolean;
  /** Show selected state */
  selected?: boolean;
  /** Enable striped background */
  striped?: boolean;
  /** Show pointer cursor */
  clickable?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function TableRow({
  children,
  hoverable = true,
  selected = false,
  striped = false,
  clickable = false,
  onClick,
  className,
  ...props
}: TableRowProps) {
  return (
    <tr
      className={cn(
        'transition-colors',
        hoverable && 'hover:bg-blue-50',
        (clickable || onClick) && 'cursor-pointer',
        selected && 'border-l-4 border-l-blue-500 bg-blue-50',
        striped && 'even:bg-gray-50',
        className
      )}
      onClick={onClick}
      role="row"
      {...props}
    >
      {children}
    </tr>
  );
}

export default TableRow;
