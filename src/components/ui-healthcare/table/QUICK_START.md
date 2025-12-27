# Table Component - Quick Start Guide

## Installation

No installation needed - components are already in your project!

## Import

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
```

## 5-Minute Tutorial

### 1. Basic Table (No Features)

```tsx
function BasicTable() {
  const data = [
    { id: 1, name: 'John Doe', age: 65 },
    { id: 2, name: 'Jane Smith', age: 72 },
  ];

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Age</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.age}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 2. Add Sorting

```tsx
function SortableTable() {
  const data = [
    { id: 1, name: 'John Doe', age: 65 },
    { id: 2, name: 'Jane Smith', age: 72 },
  ];

  // Add this hook
  const { getSortProps, sortData } = useTableState();

  // Add sort function
  const sorted = sortData(data, (a, b, column) => {
    if (column === 'name') return a.name.localeCompare(b.name);
    if (column === 'age') return a.age - b.age;
    return 0;
  });

  return (
    <Table>
      <TableHead>
        <TableRow>
          {/* Add getSortProps */}
          <TableHeaderCell {...getSortProps('name')}>Name</TableHeaderCell>
          <TableHeaderCell {...getSortProps('age')}>Age</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {/* Use sorted data */}
        {sorted.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.age}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 3. Add Density Control

```tsx
function DensityTable() {
  const data = [
    { id: 1, name: 'John Doe', age: 65 },
    { id: 2, name: 'Jane Smith', age: 72 },
  ];

  // Add density to hook
  const { density, setDensity, getSortProps, sortData } = useTableState();

  const sorted = sortData(data, (a, b, column) => {
    if (column === 'name') return a.name.localeCompare(b.name);
    if (column === 'age') return a.age - b.age;
    return 0;
  });

  return (
    <div>
      {/* Add density toggle */}
      <DensityToggle density={density} onDensityChange={setDensity} />

      {/* Pass density to table */}
      <Table density={density}>
        <TableHead>
          <TableRow>
            <TableHeaderCell {...getSortProps('name')}>Name</TableHeaderCell>
            <TableHeaderCell {...getSortProps('age')}>Age</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.age}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### 4. Add Row Selection

```tsx
function SelectableTable() {
  const data = [
    { id: 1, name: 'John Doe', age: 65 },
    { id: 2, name: 'Jane Smith', age: 72 },
  ];

  // Add selection state
  const [selectedId, setSelectedId] = useState(null);
  const { density, setDensity, getSortProps, sortData } = useTableState();

  const sorted = sortData(data, (a, b, column) => {
    if (column === 'name') return a.name.localeCompare(b.name);
    if (column === 'age') return a.age - b.age;
    return 0;
  });

  return (
    <div>
      <DensityToggle density={density} onDensityChange={setDensity} />

      <Table density={density}>
        <TableHead>
          <TableRow>
            <TableHeaderCell {...getSortProps('name')}>Name</TableHeaderCell>
            <TableHeaderCell {...getSortProps('age')}>Age</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((item) => (
            <TableRow
              key={item.id}
              selected={selectedId === item.id}
              clickable
              onClick={() => setSelectedId(item.id)}
            >
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.age}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### 5. Add Footer

```tsx
function CompleteTable() {
  const data = [
    { id: 1, name: 'John Doe', age: 65 },
    { id: 2, name: 'Jane Smith', age: 72 },
  ];

  const [selectedId, setSelectedId] = useState(null);
  const { density, setDensity, getSortProps, sortData } = useTableState();

  const sorted = sortData(data, (a, b, column) => {
    if (column === 'name') return a.name.localeCompare(b.name);
    if (column === 'age') return a.age - b.age;
    return 0;
  });

  return (
    <div>
      <DensityToggle density={density} onDensityChange={setDensity} />

      <Table density={density}>
        <TableHead>
          <TableRow>
            <TableHeaderCell {...getSortProps('name')}>Name</TableHeaderCell>
            <TableHeaderCell {...getSortProps('age')}>Age</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((item) => (
            <TableRow
              key={item.id}
              selected={selectedId === item.id}
              clickable
              onClick={() => setSelectedId(item.id)}
            >
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.age}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        {/* Add footer */}
        <TableFooter totalCount={data.length} itemLabel="patients" />
      </Table>
    </div>
  );
}
```

## Common Patterns

### Right-Align Numbers

```tsx
<TableCell align="right">{patient.age}</TableCell>
<TableCell align="right">${amount.toFixed(2)}</TableCell>
```

### Status Badges

```tsx
<TableCell>
  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
    Active
  </span>
</TableCell>
```

### Sticky Header

```tsx
<TableHead sticky>
  {' '}
  {/* sticky is default */}
  <TableRow>
    <TableHeaderCell>Name</TableHeaderCell>
  </TableRow>
</TableHead>
```

### Non-Sortable Column

```tsx
{
  /* Just don't add getSortProps */
}
<TableHeaderCell>Actions</TableHeaderCell>;
```

## Next Steps

- See `README.md` for complete documentation
- See `example.tsx` for real-world examples
- See `IMPLEMENTATION_SUMMARY.md` for architecture details

## Tips

1. **Always** provide `ariaLabel` to `<Table>` for accessibility
2. **Use** `key` prop on `<TableRow>` when mapping data
3. **Align** numbers to the right with `align="right"`
4. **Enable** sticky headers for long tables
5. **Provide** item labels in footer for context
