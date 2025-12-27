import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Table Footer Component
 *
 * DS Reference: COMPONENT.TABLE.FOOTER
 *
 * @example
 * ```tsx
 * <TableFooter totalCount={1000} filteredCount={50} itemLabel="patients" />
 * ```
 */
export interface TableFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Footer content (if provided, overrides default count display) */
  children?: React.ReactNode;
  /** Total number of records */
  totalCount?: number;
  /** Number of filtered/visible records */
  filteredCount?: number;
  /** Label for items (e.g., "patients", "medications") */
  itemLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

export function TableFooter({
  children,
  totalCount,
  filteredCount,
  itemLabel = 'records',
  className,
  ...props
}: TableFooterProps) {
  // If children provided, render them
  if (children) {
    return (
      <div
        className={cn(
          'flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2.5',
          'flex items-center justify-between',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  // Default footer with counts
  return (
    <div
      className={cn(
        'flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2.5',
        'flex items-center justify-between',
        className
      )}
      {...props}
    >
      <p className="text-xs text-gray-600">
        Showing <span className="font-semibold text-gray-900">{filteredCount ?? totalCount}</span>
        {filteredCount !== undefined &&
          filteredCount !== totalCount &&
          totalCount !== undefined && (
            <>
              {' of '}
              <span className="font-semibold text-gray-900">{totalCount}</span>
            </>
          )}{' '}
        {itemLabel}
      </p>
    </div>
  );
}

export default TableFooter;
