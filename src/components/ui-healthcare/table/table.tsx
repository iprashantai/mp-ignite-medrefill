import React, { createContext, useContext, useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Table density modes
 */
export type TableDensity = 'comfortable' | 'compact' | 'dense';

/**
 * Density classes for table cells
 */
export interface DensityClasses {
  tablePadding: string;
  fontSize: string;
}

/**
 * Table Context for sharing density and other state
 */
interface TableContextValue {
  density: TableDensity;
  densityClasses: DensityClasses;
}

const TableContext = createContext<TableContextValue>({
  density: 'compact',
  densityClasses: {
    tablePadding: 'px-3 py-2',
    fontSize: 'text-xs',
  },
});

export const useTableContext = () => useContext(TableContext);

/**
 * Base Table Component
 *
 * DS Reference: COMPONENT.TABLE
 *
 * @example
 * ```tsx
 * <Table density="compact" ariaLabel="Patient medications list">
 *   <TableHead>...</TableHead>
 *   <TableBody>...</TableBody>
 * </Table>
 * ```
 */
export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** Table content (TableHead, TableBody) */
  children: React.ReactNode;
  /** Table density mode */
  density?: TableDensity;
  /** Accessible label for the table */
  ariaLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

export function Table({
  children,
  density = 'compact',
  className,
  ariaLabel,
  ...props
}: TableProps) {
  // Calculate density classes based on density mode
  const densityClasses = useMemo<DensityClasses>(() => {
    switch (density) {
      case 'comfortable':
        return {
          tablePadding: 'px-4 py-3',
          fontSize: 'text-sm',
        };
      case 'compact':
        return {
          tablePadding: 'px-3 py-2',
          fontSize: 'text-xs',
        };
      case 'dense':
        return {
          tablePadding: 'px-3 py-1.5',
          fontSize: 'text-xs',
        };
      default:
        return {
          tablePadding: 'px-3 py-2',
          fontSize: 'text-xs',
        };
    }
  }, [density]);

  const contextValue = useMemo<TableContextValue>(
    () => ({ density, densityClasses }),
    [density, densityClasses]
  );

  return (
    <TableContext.Provider value={contextValue}>
      <table
        className={cn('min-w-full divide-y divide-gray-200', className)}
        role="grid"
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </table>
    </TableContext.Provider>
  );
}

export default Table;
