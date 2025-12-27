/**
 * useTableState Hook - Unit Tests
 *
 * Tests for table state management including sorting, density modes,
 * and data sorting functionality.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableState } from './use-table-state';

describe('useTableState', () => {
  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useTableState());

      expect(result.current.sortColumn).toBeNull();
      expect(result.current.sortDirection).toBe('asc');
      expect(result.current.density).toBe('compact');
    });

    it('should accept custom initial values', () => {
      const { result } = renderHook(() =>
        useTableState({
          defaultSortColumn: 'name',
          defaultSortDirection: 'desc',
          defaultDensity: 'comfortable',
        })
      );

      expect(result.current.sortColumn).toBe('name');
      expect(result.current.sortDirection).toBe('desc');
      expect(result.current.density).toBe('comfortable');
    });
  });

  describe('handleSort', () => {
    it('should set column and ascending direction on first click', () => {
      const { result } = renderHook(() => useTableState());

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortColumn).toBe('name');
      expect(result.current.sortDirection).toBe('asc');
    });

    it('should toggle direction when clicking same column', () => {
      const { result } = renderHook(() =>
        useTableState({ defaultSortColumn: 'name', defaultSortDirection: 'asc' })
      );

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortDirection).toBe('desc');

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortDirection).toBe('asc');
    });

    it('should reset to ascending when switching columns', () => {
      const { result } = renderHook(() =>
        useTableState({ defaultSortColumn: 'name', defaultSortDirection: 'desc' })
      );

      act(() => {
        result.current.handleSort('date');
      });

      expect(result.current.sortColumn).toBe('date');
      expect(result.current.sortDirection).toBe('asc');
    });
  });

  describe('densityClasses', () => {
    it('should return compact classes for compact density', () => {
      const { result } = renderHook(() => useTableState({ defaultDensity: 'compact' }));

      expect(result.current.densityClasses).toEqual({
        tablePadding: 'px-3 py-2',
        fontSize: 'text-xs',
      });
    });

    it('should return comfortable classes for comfortable density', () => {
      const { result } = renderHook(() => useTableState({ defaultDensity: 'comfortable' }));

      expect(result.current.densityClasses).toEqual({
        tablePadding: 'px-4 py-3',
        fontSize: 'text-sm',
      });
    });

    it('should return dense classes for dense density', () => {
      const { result } = renderHook(() => useTableState({ defaultDensity: 'dense' }));

      expect(result.current.densityClasses).toEqual({
        tablePadding: 'px-3 py-1.5',
        fontSize: 'text-xs',
      });
    });

    it('should update classes when density changes', () => {
      const { result } = renderHook(() => useTableState({ defaultDensity: 'compact' }));

      act(() => {
        result.current.setDensity('comfortable');
      });

      expect(result.current.density).toBe('comfortable');
      expect(result.current.densityClasses.tablePadding).toBe('px-4 py-3');
    });
  });

  describe('getSortProps', () => {
    it('should return correct props for a column', () => {
      const { result } = renderHook(() =>
        useTableState({ defaultSortColumn: 'name', defaultSortDirection: 'asc' })
      );

      const props = result.current.getSortProps('name');

      expect(props.sortable).toBe(true);
      expect(props.sortKey).toBe('name');
      expect(props.sortColumn).toBe('name');
      expect(props.sortDirection).toBe('asc');
      expect(typeof props.onSort).toBe('function');
    });
  });

  describe('sortData', () => {
    interface TestItem {
      name: string;
      value: number;
    }

    const testData: TestItem[] = [
      { name: 'Charlie', value: 3 },
      { name: 'Alice', value: 1 },
      { name: 'Bob', value: 2 },
    ];

    it('should return unsorted data when no sort column', () => {
      const { result } = renderHook(() => useTableState<TestItem>());

      const sorted = result.current.sortData(testData, (a, b, col) => {
        if (col === 'name') return a.name.localeCompare(b.name);
        return a.value - b.value;
      });

      expect(sorted).toEqual(testData);
    });

    it('should sort data ascending by column', () => {
      const { result } = renderHook(() =>
        useTableState<TestItem>({ defaultSortColumn: 'name', defaultSortDirection: 'asc' })
      );

      const sorted = result.current.sortData(testData, (a, b, col) => {
        if (col === 'name') return a.name.localeCompare(b.name);
        return a.value - b.value;
      });

      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Charlie');
    });

    it('should sort data descending by column', () => {
      const { result } = renderHook(() =>
        useTableState<TestItem>({ defaultSortColumn: 'value', defaultSortDirection: 'desc' })
      );

      const sorted = result.current.sortData(testData, (a, b, col) => {
        if (col === 'name') return a.name.localeCompare(b.name);
        return a.value - b.value;
      });

      expect(sorted[0].value).toBe(3);
      expect(sorted[1].value).toBe(2);
      expect(sorted[2].value).toBe(1);
    });

    it('should not mutate original array', () => {
      const { result } = renderHook(() => useTableState<TestItem>({ defaultSortColumn: 'name' }));

      const original = [...testData];
      result.current.sortData(testData, (a, b) => a.name.localeCompare(b.name));

      expect(testData).toEqual(original);
    });

    it('should return unsorted data when no sort function provided', () => {
      const { result } = renderHook(() => useTableState<TestItem>({ defaultSortColumn: 'name' }));

      const sorted = result.current.sortData(testData);

      expect(sorted).toEqual(testData);
    });
  });
});
