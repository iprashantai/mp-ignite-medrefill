import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTableContext } from './table';
import type { CellAlign } from './table-cell';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Table Header Cell Component
 *
 * DS Reference: COMPONENT.TABLE.HEADER
 *
 * @example
 * ```tsx
 * <TableHeaderCell
 *   sortable
 *   sortKey="name"
 *   sortColumn={sortColumn}
 *   sortDirection={sortDirection}
 *   onSort={handleSort}
 * >
 *   Name
 * </TableHeaderCell>
 * ```
 */
export interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Header content */
  children: React.ReactNode;
  /** Enable sorting */
  sortable?: boolean;
  /** Sort column key */
  sortKey?: string;
  /** Current sort column */
  sortColumn?: string | null;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Sort handler */
  onSort?: (column: string) => void;
  /** Text alignment */
  align?: CellAlign;
  /** Additional CSS classes */
  className?: string;
}

export function TableHeaderCell({
  children,
  sortable = false,
  sortKey,
  sortColumn,
  sortDirection,
  onSort,
  align = 'left',
  className,
  ...props
}: TableHeaderCellProps) {
  const { densityClasses } = useTableContext();

  const alignClasses: Record<CellAlign, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const justifyClasses: Record<CellAlign, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const isCurrentSort = sortColumn === sortKey;

  const handleClick = () => {
    if (sortable && onSort && sortKey) {
      onSort(sortKey);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && sortable && onSort && sortKey) {
      onSort(sortKey);
    }
  };

  const ariaSort = sortable
    ? isCurrentSort
      ? sortDirection === 'asc'
        ? ('ascending' as const)
        : ('descending' as const)
      : ('none' as const)
    : undefined;

  return (
    <th
      className={cn(
        densityClasses.tablePadding,
        alignClasses[align],
        densityClasses.fontSize,
        'font-semibold tracking-wider text-gray-700 uppercase',
        sortable && 'cursor-pointer transition-colors select-none hover:bg-gray-100',
        className
      )}
      role="columnheader"
      aria-sort={ariaSort}
      tabIndex={sortable ? 0 : undefined}
      onClick={sortable ? handleClick : undefined}
      onKeyDown={sortable ? handleKeyDown : undefined}
      {...props}
    >
      {sortable ? (
        <div className={cn('flex items-center gap-1', justifyClasses[align])}>
          {children}
          {isCurrentSort &&
            (sortDirection === 'asc' ? (
              <ChevronUp className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            ))}
        </div>
      ) : (
        children
      )}
    </th>
  );
}

export default TableHeaderCell;
