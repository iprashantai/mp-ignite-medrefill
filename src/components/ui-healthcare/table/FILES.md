# Table Component System - File Reference

## Directory Structure

```
src/components/ui-healthcare/table/
├── Core Components (TypeScript/React)
│   ├── table.tsx              - Main Table component with TableContext
│   ├── table-head.tsx         - Table header section
│   ├── table-body.tsx         - Table body section
│   ├── table-row.tsx          - Table row with interaction states
│   ├── table-cell.tsx         - Standard table cell
│   ├── table-header-cell.tsx  - Header cell with sorting
│   ├── table-footer.tsx       - Footer with item counts
│   ├── density-toggle.tsx     - Density mode selector
│   └── use-table-state.ts     - State management hook
│
├── Export & Types
│   └── index.ts               - Barrel export file
│
├── Documentation
│   ├── README.md                  - Complete documentation
│   ├── QUICK_START.md             - 5-minute tutorial
│   ├── IMPLEMENTATION_SUMMARY.md  - Architecture details
│   └── FILES.md                   - This file
│
└── Examples
    └── example.tsx            - Real-world usage examples
```

## File Descriptions

### table.tsx (2.5KB, 108 lines)

Main Table component with TableContext provider. Manages density settings and provides context to child components.

**Exports:**

- `Table` component
- `TableContext`
- `useTableContext` hook
- Types: `TableProps`, `TableDensity`, `DensityClasses`

**Key Features:**

- Three density modes (comfortable, compact, dense)
- Context-based state sharing
- Memoized density classes
- ARIA support with role="grid"

---

### table-head.tsx (876B, 37 lines)

Table header wrapper component with optional sticky positioning.

**Exports:**

- `TableHead` component
- Type: `TableHeadProps`

**Key Features:**

- Sticky header positioning (default: enabled)
- Background color from design tokens
- Z-index management for sticky state

---

### table-body.tsx (782B, 35 lines)

Table body wrapper component.

**Exports:**

- `TableBody` component
- Type: `TableBodyProps`

**Key Features:**

- White background
- Row dividers
- Semantic HTML structure

---

### table-row.tsx (1.3KB, 56 lines)

Table row component with interaction states.

**Exports:**

- `TableRow` component
- Type: `TableRowProps`

**Key Features:**

- Hoverable state (blue tint)
- Clickable state (pointer cursor)
- Selected state (blue background + border)
- Striped option (future use)
- Smooth transitions

---

### table-cell.tsx (1.2KB, 54 lines)

Standard table cell component with alignment options.

**Exports:**

- `TableCell` component
- Type: `TableCellProps`, `CellAlign`

**Key Features:**

- Three alignment modes (left, center, right)
- Density-aware padding (via context)
- Density-aware font size (via context)
- Vertical alignment: top

---

### table-header-cell.tsx (3.1KB, 117 lines)

Header cell component with sorting support.

**Exports:**

- `TableHeaderCell` component
- Type: `TableHeaderCellProps`, `SortDirection`

**Key Features:**

- Sortable columns with visual indicators
- Keyboard navigation (Enter key)
- ARIA attributes (aria-sort)
- Chevron icons (ChevronUp/ChevronDown)
- Hover state for sortable cells
- Tab focus support

---

### table-footer.tsx (1.9KB, 67 lines)

Footer component with item counts and custom content support.

**Exports:**

- `TableFooter` component
- Type: `TableFooterProps`

**Key Features:**

- Default count display (e.g., "Showing 50 of 100 patients")
- Custom footer content support
- Filtered vs. total count display
- Customizable item label

---

### density-toggle.tsx (2.9KB, 90 lines)

Toggle component for switching between density modes.

**Exports:**

- `DensityToggle` component
- Type: `DensityToggleProps`

**Key Features:**

- Three-button toggle group
- Visual active state indicator
- SVG icons for each density
- ARIA labels and pressed state
- Grouped role for accessibility

---

### use-table-state.ts (3.0KB, 109 lines)

Custom React hook for managing table state.

**Exports:**

- `useTableState` hook
- Types: `UseTableStateOptions`, `SortFunction`

**Key Features:**

- Sort column and direction state
- Density mode state
- Sort handler with toggle logic
- Helper method: `getSortProps(column)`
- Helper method: `sortData(data, sortFn)`
- Memoized density classes
- Generic type support `<T>`

**Returns:**

```typescript
{
  sortColumn: string | null,
  sortDirection: 'asc' | 'desc',
  handleSort: (column: string) => void,
  getSortProps: (column: string) => SortProps,
  sortData: (data: T[], sortFn?: SortFunction<T>) => T[],
  density: TableDensity,
  setDensity: (density: TableDensity) => void,
  densityClasses: DensityClasses
}
```

---

### index.ts (2.3KB, 67 lines)

Barrel export file for all components and types.

**Exports:**

- All components
- All TypeScript types and interfaces
- All hooks

**Purpose:**

- Single import point for consumers
- Better tree-shaking
- Clean import statements

**Usage:**

```typescript
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
  type TableProps,
  type TableDensity,
} from '@/components/ui-healthcare/table';
```

---

### example.tsx (7.2KB, 233 lines)

Real-world usage examples with healthcare data.

**Contains:**

- `PatientTableExample` - Full-featured table with sorting, density, selection
- `MinimalTableExample` - Basic table without extra features
- `CustomFooterTableExample` - Table with pagination footer
- Sample patient data structure
- Helper functions for styling (PDC colors, status badges)

**Purpose:**

- Reference implementation
- Copy-paste starting point
- Best practices demonstration

---

## Documentation Files

### README.md (~13KB, 450+ lines)

Complete documentation covering:

- Features overview
- Quick start guide
- Component API reference
- Hooks documentation
- Density modes explanation
- Sorting implementation
- Accessibility features
- Styling guidelines
- Advanced examples
- Best practices
- Migration guide
- Browser support

### QUICK_START.md (~5KB, 180+ lines)

5-minute tutorial with progressive examples:

1. Basic table
2. Add sorting
3. Add density control
4. Add row selection
5. Add footer
   Plus common patterns and tips

### IMPLEMENTATION_SUMMARY.md (~6KB, 200+ lines)

Architecture and design decisions:

- File structure
- Key features list
- Component architecture diagrams
- Usage patterns
- Design decisions explained
- Performance considerations
- Testing recommendations
- Next steps

### FILES.md (This File)

File reference and structure documentation

---

## Import Patterns

### Default Import (Recommended)

```typescript
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

### Type Imports

```typescript
import type {
  TableProps,
  TableDensity,
  TableRowProps,
  TableCellProps,
  CellAlign,
  SortDirection,
  UseTableStateOptions,
  SortFunction,
} from '@/components/ui-healthcare/table';
```

---

## Dependencies

### External

- `react` - React library
- `lucide-react` - Icons (ChevronUp, ChevronDown)
- `clsx` - Classname utility
- `tailwind-merge` - Tailwind CSS merging

### Internal

- `@/lib/utils` - cn() utility function
- `@/lib/design-system/tokens` - Design tokens (optional reference)

---

## File Statistics

| File                  | Lines       | Size      | Purpose                  |
| --------------------- | ----------- | --------- | ------------------------ |
| table.tsx             | 108         | 2.5KB     | Main component + context |
| table-head.tsx        | 37          | 876B      | Header wrapper           |
| table-body.tsx        | 35          | 782B      | Body wrapper             |
| table-row.tsx         | 56          | 1.3KB     | Row with interactions    |
| table-cell.tsx        | 54          | 1.2KB     | Standard cell            |
| table-header-cell.tsx | 117         | 3.1KB     | Sortable header cell     |
| table-footer.tsx      | 67          | 1.9KB     | Footer with counts       |
| density-toggle.tsx    | 90          | 2.9KB     | Density selector         |
| use-table-state.ts    | 109         | 3.0KB     | State management hook    |
| index.ts              | 67          | 2.3KB     | Barrel exports           |
| example.tsx           | 233         | 7.2KB     | Usage examples           |
| **Total (Code)**      | **973**     | **~27KB** | **11 TypeScript files**  |
| **Total (All Files)** | **~1,700+** | **~50KB** | **14 files**             |

---

## Version History

- **v1.0.0** (2025-12-28) - Initial implementation
  - All core components
  - Full TypeScript support
  - Complete documentation
  - Usage examples

---

## Maintenance

### Adding New Features

1. Add to appropriate component file
2. Update type definitions
3. Export from index.ts
4. Document in README.md
5. Add example to example.tsx

### Fixing Bugs

1. Update component file
2. Add test case (if applicable)
3. Document fix in CHANGELOG
4. Update version number

---

## Support

- Documentation: See README.md
- Quick Start: See QUICK_START.md
- Examples: See example.tsx
- Architecture: See IMPLEMENTATION_SUMMARY.md
