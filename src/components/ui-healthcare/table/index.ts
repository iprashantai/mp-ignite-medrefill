/**
 * Healthcare Table Component System
 *
 * Complete table component system with sorting, density modes, and accessibility.
 *
 * @example
 * ```tsx
 * import {
 *   Table,
 *   TableHead,
 *   TableBody,
 *   TableRow,
 *   TableCell,
 *   TableHeaderCell,
 *   TableFooter,
 *   DensityToggle,
 *   useTableState
 * } from '@/components/ui-healthcare/table';
 *
 * function MyTable({ data }) {
 *   const { density, setDensity, getSortProps, sortData } = useTableState();
 *
 *   return (
 *     <>
 *       <DensityToggle density={density} onDensityChange={setDensity} />
 *       <Table density={density} ariaLabel="Patient list">
 *         <TableHead sticky>
 *           <TableRow>
 *             <TableHeaderCell {...getSortProps('name')}>Name</TableHeaderCell>
 *             <TableHeaderCell>Status</TableHeaderCell>
 *           </TableRow>
 *         </TableHead>
 *         <TableBody>
 *           {data.map(item => (
 *             <TableRow key={item.id} hoverable clickable>
 *               <TableCell>{item.name}</TableCell>
 *               <TableCell>{item.status}</TableCell>
 *             </TableRow>
 *           ))}
 *         </TableBody>
 *         <TableFooter totalCount={data.length} itemLabel="patients" />
 *       </Table>
 *     </>
 *   );
 * }
 * ```
 */

// Core components
export { Table, useTableContext } from './table';
export type { TableProps, TableDensity, DensityClasses } from './table';

export { TableHead } from './table-head';
export type { TableHeadProps } from './table-head';

export { TableBody } from './table-body';
export type { TableBodyProps } from './table-body';

export { TableRow } from './table-row';
export type { TableRowProps } from './table-row';

export { TableCell } from './table-cell';
export type { TableCellProps, CellAlign } from './table-cell';

export { TableHeaderCell } from './table-header-cell';
export type { TableHeaderCellProps, SortDirection } from './table-header-cell';

export { TableFooter } from './table-footer';
export type { TableFooterProps } from './table-footer';

export { DensityToggle } from './density-toggle';
export type { DensityToggleProps } from './density-toggle';

// Hooks
export { useTableState } from './use-table-state';
export type { UseTableStateOptions, SortFunction } from './use-table-state';
