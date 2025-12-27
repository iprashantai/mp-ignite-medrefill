import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Table Body Component
 *
 * DS Reference: COMPONENT.TABLE.ROW
 *
 * @example
 * ```tsx
 * <TableBody>
 *   {data.map(item => (
 *     <TableRow key={item.id}>
 *       <TableCell>{item.name}</TableCell>
 *     </TableRow>
 *   ))}
 * </TableBody>
 * ```
 */
export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  /** TableRows */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function TableBody({ children, className, ...props }: TableBodyProps) {
  return (
    <tbody className={cn('divide-y divide-gray-200 bg-white', className)} {...props}>
      {children}
    </tbody>
  );
}

export default TableBody;
