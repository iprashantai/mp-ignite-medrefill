import { useState, useMemo, useCallback } from 'react';
import type { TableDensity, DensityClasses } from './table';
import type { SortDirection } from './table-header-cell';

/**
 * Options for useTableState hook
 */
export interface UseTableStateOptions {
  /** Initial sort column */
  defaultSortColumn?: string | null;
  /** Initial sort direction */
  defaultSortDirection?: SortDirection;
  /** Initial density mode */
  defaultDensity?: TableDensity;
}

/**
 * Sort function type for sortData helper
 */
export type SortFunction<T> = (a: T, b: T, column: string) => number;

/**
 * Custom hook for managing table state (sorting, density, selection)
 *
 * @example
 * ```tsx
 * const {
 *   sortColumn,
 *   sortDirection,
 *   density,
 *   densityClasses,
 *   handleSort,
 *   setDensity,
 *   getSortProps,
 * } = useTableState({ defaultDensity: 'compact' });
 * ```
 */
export function useTableState<T = unknown>({
  defaultSortColumn = null,
  defaultSortDirection = 'asc',
  defaultDensity = 'compact',
}: UseTableStateOptions = {}) {
  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(defaultSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  // Density state
  const [density, setDensity] = useState<TableDensity>(defaultDensity);

  // Density classes - DS: COMPONENT.TABLE.CELL
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

  // Sort handler
  const handleSort = useCallback(
    (column: string) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn]
  );

  // Get sort props for a header cell
  const getSortProps = useCallback(
    (column: string) => ({
      sortable: true,
      sortKey: column,
      sortColumn,
      sortDirection,
      onSort: handleSort,
    }),
    [sortColumn, sortDirection, handleSort]
  );

  // Sort data helper
  const sortData = useCallback(
    (data: T[], sortFn?: SortFunction<T>): T[] => {
      if (!sortColumn || !sortFn) return data;

      return [...data].sort((a, b) => {
        const result = sortFn(a, b, sortColumn);
        return sortDirection === 'asc' ? result : -result;
      });
    },
    [sortColumn, sortDirection]
  );

  return {
    // Sort state
    sortColumn,
    sortDirection,
    handleSort,
    getSortProps,
    sortData,

    // Density state
    density,
    setDensity,
    densityClasses,
  };
}

export default useTableState;
