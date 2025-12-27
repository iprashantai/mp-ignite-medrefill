# Healthcare Table Component System

A complete, accessible table component system with sorting, density modes, and responsive design for healthcare applications.

## Features

- **Three Density Modes**: Comfortable, Compact, Dense
- **Sortable Columns**: Built-in sorting with visual indicators
- **Accessibility**: Full ARIA support and keyboard navigation
- **Responsive**: Adapts to different viewport sizes
- **TypeScript**: Complete type definitions
- **Design System Integration**: Uses design tokens from `@/lib/design-system/tokens`

## Quick Start

```tsx
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  TableFooter,
  DensityToggle,
  useTableState,
} from '@/components/ui-healthcare/table';

function PatientTable({ patients }) {
  const { density, setDensity, getSortProps, sortData } = useTableState({
    defaultDensity: 'compact',
  });

  const sortedPatients = sortData(patients, (a, b, column) => {
    if (column === 'name') return a.name.localeCompare(b.name);
    if (column === 'age') return a.age - b.age;
    return 0;
  });

  return (
    <div>
      <DensityToggle density={density} onDensityChange={setDensity} />

      <Table density={density} ariaLabel="Patient list">
        <TableHead sticky>
          <TableRow>
            <TableHeaderCell {...getSortProps('name')}>Name</TableHeaderCell>
            <TableHeaderCell {...getSortProps('age')}>Age</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedPatients.map((patient) => (
            <TableRow key={patient.id} hoverable clickable>
              <TableCell>{patient.name}</TableCell>
              <TableCell align="right">{patient.age}</TableCell>
              <TableCell>{patient.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>

        <TableFooter totalCount={patients.length} itemLabel="patients" />
      </Table>
    </div>
  );
}
```

## Components

### Table

Main table wrapper with density context.

```tsx
<Table density="compact" ariaLabel="Patient medications">
  {/* TableHead and TableBody */}
</Table>
```

**Props:**

- `density`: `'comfortable' | 'compact' | 'dense'` (default: `'compact'`)
- `ariaLabel`: Accessible label for the table
- `className`: Additional CSS classes

### TableHead

Table header section with optional sticky positioning.

```tsx
<TableHead sticky>
  <TableRow>{/* TableHeaderCells */}</TableRow>
</TableHead>
```

**Props:**

- `sticky`: Enable sticky header (default: `true`)
- `className`: Additional CSS classes

### TableBody

Table body section.

```tsx
<TableBody>
  {data.map((item) => (
    <TableRow key={item.id}>{/* TableCells */}</TableRow>
  ))}
</TableBody>
```

### TableRow

Table row with hover, selection, and click states.

```tsx
<TableRow hoverable clickable selected={selectedId === item.id} onClick={() => handleSelect(item)}>
  {/* TableCells */}
</TableRow>
```

**Props:**

- `hoverable`: Enable hover effect (default: `true`)
- `clickable`: Show pointer cursor (default: `false`)
- `selected`: Show selected state (default: `false`)
- `striped`: Enable striped background (default: `false`)
- `onClick`: Click handler

### TableCell

Standard table cell with alignment options.

```tsx
<TableCell align="right">$1,234.56</TableCell>
```

**Props:**

- `align`: `'left' | 'center' | 'right'` (default: `'left'`)
- `className`: Additional CSS classes

### TableHeaderCell

Header cell with sorting support.

```tsx
<TableHeaderCell
  sortable
  sortKey="name"
  sortColumn={sortColumn}
  sortDirection={sortDirection}
  onSort={handleSort}
  align="left"
>
  Patient Name
</TableHeaderCell>
```

**Props:**

- `sortable`: Enable sorting (default: `false`)
- `sortKey`: Column identifier for sorting
- `sortColumn`: Current active sort column
- `sortDirection`: `'asc' | 'desc'`
- `onSort`: Sort handler function
- `align`: `'left' | 'center' | 'right'` (default: `'left'`)

### TableFooter

Footer with item counts.

```tsx
<TableFooter totalCount={1000} filteredCount={50} itemLabel="patients" />
```

**Props:**

- `totalCount`: Total number of items
- `filteredCount`: Number of filtered items (optional)
- `itemLabel`: Label for items (default: `'records'`)
- `children`: Custom footer content (overrides default)

### DensityToggle

Toggle for switching between density modes.

```tsx
<DensityToggle density={density} onDensityChange={setDensity} />
```

**Props:**

- `density`: Current density mode
- `onDensityChange`: Density change handler

## Hooks

### useTableState

Manages table state including sorting and density.

```tsx
const {
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
} = useTableState({
  defaultSortColumn: 'name',
  defaultSortDirection: 'asc',
  defaultDensity: 'compact',
});
```

**Options:**

- `defaultSortColumn`: Initial sort column (default: `null`)
- `defaultSortDirection`: Initial sort direction (default: `'asc'`)
- `defaultDensity`: Initial density mode (default: `'compact'`)

**Returns:**

- `sortColumn`: Current sort column
- `sortDirection`: Current sort direction
- `handleSort(column)`: Sort handler
- `getSortProps(column)`: Get props for TableHeaderCell
- `sortData(data, sortFn)`: Helper to sort data array
- `density`: Current density mode
- `setDensity(density)`: Set density mode
- `densityClasses`: Computed density classes

## Density Modes

### Comfortable

- Padding: `16px 24px`
- Font size: `14px`
- Best for: Executive dashboards, low-density data

### Compact (Default)

- Padding: `12px 16px`
- Font size: `12px`
- Best for: Standard tables, balanced view

### Dense

- Padding: `12px 6px`
- Font size: `12px`
- Best for: Data-heavy tables, power users

## Sorting

The table system provides built-in sorting support through `useTableState`:

```tsx
function MyTable({ data }) {
  const { getSortProps, sortData } = useTableState();

  // Define sort logic
  const sorted = sortData(data, (a, b, column) => {
    switch (column) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'age':
        return a.age - b.age;
      case 'date':
        return new Date(a.date) - new Date(b.date);
      default:
        return 0;
    }
  });

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell {...getSortProps('name')}>Name</TableHeaderCell>
          <TableHeaderCell {...getSortProps('age')}>Age</TableHeaderCell>
          <TableHeaderCell {...getSortProps('date')}>Date</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.age}</TableCell>
            <TableCell>{item.date}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## Accessibility

The table system includes comprehensive accessibility features:

- **ARIA roles**: `grid`, `row`, `columnheader`
- **ARIA attributes**: `aria-sort`, `aria-label`, `aria-pressed`
- **Keyboard navigation**: Sortable headers support Enter key
- **Screen reader support**: Sort direction announced to screen readers
- **Focus management**: Proper tab order and focus indicators

## Styling

The components use Tailwind CSS classes and integrate with the design system tokens:

```tsx
import { components } from '@/lib/design-system/tokens';

// Colors are derived from design tokens
// components.table.header.background
// components.table.row.hover.background
// components.table.cell.padding
```

You can override styles using the `className` prop on any component:

```tsx
<Table className="border-2 border-blue-500">
  <TableRow className="bg-yellow-50">
    <TableCell className="font-bold text-red-600">Custom styled cell</TableCell>
  </TableRow>
</Table>
```

## Advanced Examples

### Selectable Rows

```tsx
function SelectableTable({ data }) {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <Table>
      <TableBody>
        {data.map((item) => (
          <TableRow
            key={item.id}
            selected={selectedId === item.id}
            clickable
            onClick={() => setSelectedId(item.id)}
          >
            <TableCell>{item.name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Multi-Column Sorting

```tsx
function MultiSortTable({ data }) {
  const { sortColumn, sortDirection, handleSort } = useTableState();

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      if (!sortColumn) return 0;

      let comparison = 0;
      if (sortColumn === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortColumn === 'priority') {
        comparison = a.priority - b.priority;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell
            sortable
            sortKey="name"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          >
            Name
          </TableHeaderCell>
          <TableHeaderCell
            sortable
            sortKey="priority"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          >
            Priority
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.priority}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Custom Footer

```tsx
<TableFooter>
  <div className="flex w-full justify-between">
    <span>Page 1 of 10</span>
    <div className="flex gap-2">
      <button>Previous</button>
      <button>Next</button>
    </div>
  </div>
</TableFooter>
```

## Best Practices

1. **Always use `ariaLabel`** on Table for screen reader users
2. **Use sticky headers** for long tables to maintain context
3. **Provide sort feedback** with visual indicators (chevrons)
4. **Use appropriate density** based on data complexity and user role
5. **Maintain consistent alignment** (numbers right-aligned, text left-aligned)
6. **Provide hover states** for clickable rows
7. **Include item counts** in footer for user orientation
8. **Use semantic markup** - let the components handle ARIA attributes

## Browser Support

- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓
- Mobile Safari/Chrome: ✓

## Migration from Old System

If migrating from raw `<table>` elements:

**Before:**

```tsx
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-3 py-2 text-left text-xs font-semibold">Name</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-200 bg-white">
    <tr className="hover:bg-blue-50">
      <td className="px-3 py-2 text-xs">John Doe</td>
    </tr>
  </tbody>
</table>
```

**After:**

```tsx
<Table>
  <TableHead>
    <TableRow>
      <TableHeaderCell>Name</TableHeaderCell>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## TypeScript Support

All components include complete TypeScript definitions:

```tsx
import type {
  TableProps,
  TableDensity,
  TableRowProps,
  TableCellProps,
  CellAlign,
  SortDirection,
  UseTableStateOptions,
} from '@/components/ui-healthcare/table';
```
