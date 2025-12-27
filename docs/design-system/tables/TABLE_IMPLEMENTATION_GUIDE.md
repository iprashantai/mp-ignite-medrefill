# Table Implementation Guide

**Last Updated:** December 3, 2025
**Purpose:** Definitive guide for building consistent, accessible tables aligned with design system

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Complete Table Example](#complete-table-example)
3. [Column Types](#column-types)
4. [Density System](#density-system)
5. [Sorting Implementation](#sorting-implementation)
6. [Accessibility Checklist](#accessibility-checklist)
7. [Common Patterns](#common-patterns)
8. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Quick Reference

### Design System IDs for Tables

```
COMPONENT.TABLE.CONTAINER
  Classes: min-w-full divide-y divide-gray-200
  Usage: <table> wrapper
  Note: Must be inside scrollable container for sticky headers

COMPONENT.TABLE.HEADER
  Classes: bg-gray-50 sticky top-0 z-10
  Cell: px-3 py-2.5 text-left text-xs font-semibold text-gray-700
         uppercase tracking-wider
  Usage: <thead> styling

COMPONENT.TABLE.ROW
  Default: bg-white border-b border-gray-200
  Hover: hover:bg-blue-50 transition-colors cursor-pointer
  Usage: Interactive rows only (remove cursor-pointer if non-interactive)

COMPONENT.TABLE.CELL
  Default: px-3 py-2 text-xs (compact)
  Comfortable: px-4 py-3 text-sm
  Dense: px-3 py-1.5 text-xs
  Usage: <td> padding and font sizes by density

COLOR.PRIMARY.DEFAULT: blue-600 (#2563EB)
COLOR.PRIMARY.TINT: blue-50 (#EFF6FF)
COLOR.NEUTRAL.50: gray-50 (#F9FAFB)
COLOR.NEUTRAL.200: gray-200 (#E5E7EB)

Badge Colors (NO border - use -100/-700 pattern):
PDC ≥80% (Passing):  bg-green-100 text-green-700
PDC 60-79% (Risk):   bg-yellow-100 text-yellow-700
PDC <60% (Failing):  bg-red-100 text-red-700
Use: <PDCBadge pdc={value} /> from Badge.jsx
```

---

## Complete Table Example

### Code Structure

```jsx
import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * PatientTable - Consistent, reusable table component
 * Implements sorting, density toggle, and accessibility
 */
const PatientTable = ({ patients }) => {
  // ========== STATE MANAGEMENT ==========

  // Density: compact | comfortable | dense
  const [density, setDensity] = useState('compact');

  // Sorting: { column: 'name', direction: 'asc' }
  const [sort, setSort] = useState({ column: 'name', direction: 'asc' });

  // ========== DENSITY CLASSES ==========

  const densityClasses = useMemo(() => {
    switch (density) {
      case 'comfortable':
        return {
          padding: 'px-4 py-3',
          fontSize: 'text-sm',
          minHeight: '44px',
        };
      case 'dense':
        return {
          padding: 'px-3 py-1.5',
          fontSize: 'text-xs',
          minHeight: '32px',
        };
      case 'compact':
      default:
        return {
          padding: 'px-3 py-2',
          fontSize: 'text-xs',
          minHeight: '36px',
        };
    }
  }, [density]);

  // ========== SORTING ==========

  const handleSort = useCallback((column) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Apply sorting to data
  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      let aVal, bVal;

      switch (sort.column) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'pdc':
          aVal = a.medAdherence?.gapDays?.PDC ?? 0;
          bVal = b.medAdherence?.gapDays?.PDC ?? 0;
          break;
        case 'status':
          aVal = a.medAdherence?.gapDays?.status || '';
          bVal = b.medAdherence?.gapDays?.status || '';
          break;
        default:
          return 0;
      }

      // String comparison
      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sort.direction === 'asc' ? comparison : -comparison;
      }

      // Number comparison
      const comparison = aVal - bVal;
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [patients, sort]);

  // ========== RENDER ==========

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Patients</h2>

        {/* Density Toggle - DS: SPACE.PATTERN.FLEX_GAP_SM */}
        <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
          <button
            onClick={() => setDensity('comfortable')}
            className={`px-2.5 py-2 transition-colors ${
              density === 'comfortable'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
            title="Comfortable density"
            aria-label="Comfortable density"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <button
            onClick={() => setDensity('compact')}
            className={`border-x border-gray-300 px-2.5 py-2 transition-colors ${
              density === 'compact'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
            title="Compact density"
            aria-label="Compact density"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </button>
          <button
            onClick={() => setDensity('dense')}
            className={`px-2.5 py-2 transition-colors ${
              density === 'dense'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
            title="Dense density"
            aria-label="Dense density"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Table Container - DS: COMPONENT.TABLE.CONTAINER */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Table Head */}
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {/* Sortable Header - Name */}
              <th
                onClick={() => handleSort('name')}
                className={`${densityClasses.padding} text-left ${densityClasses.fontSize} cursor-pointer font-semibold tracking-wider text-gray-700 uppercase transition-colors select-none hover:bg-gray-100`}
                role="columnheader"
                aria-sort={
                  sort.column === 'name'
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Patient Name
                  {sort.column === 'name' &&
                    (sort.direction === 'asc' ? (
                      <ChevronUpIcon className="h-3 w-3 text-gray-600" aria-hidden="true" />
                    ) : (
                      <ChevronDownIcon className="h-3 w-3 text-gray-600" aria-hidden="true" />
                    ))}
                </div>
              </th>

              {/* Non-sortable Header - ID */}
              <th
                className={`${densityClasses.padding} text-left ${densityClasses.fontSize} font-semibold tracking-wider text-gray-700 uppercase`}
                role="columnheader"
              >
                Patient ID
              </th>

              {/* Sortable Header - PDC (numeric) */}
              <th
                onClick={() => handleSort('pdc')}
                className={`${densityClasses.padding} text-right ${densityClasses.fontSize} cursor-pointer font-semibold tracking-wider text-gray-700 uppercase transition-colors select-none hover:bg-gray-100`}
                role="columnheader"
                aria-sort={
                  sort.column === 'pdc'
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('pdc')}
              >
                <div className="flex items-center justify-end gap-1">
                  PDC
                  {sort.column === 'pdc' &&
                    (sort.direction === 'asc' ? (
                      <ChevronUpIcon className="h-3 w-3 text-gray-600" aria-hidden="true" />
                    ) : (
                      <ChevronDownIcon className="h-3 w-3 text-gray-600" aria-hidden="true" />
                    ))}
                </div>
              </th>

              {/* Sortable Header - Status */}
              <th
                onClick={() => handleSort('status')}
                className={`${densityClasses.padding} text-left ${densityClasses.fontSize} cursor-pointer font-semibold tracking-wider text-gray-700 uppercase transition-colors select-none hover:bg-gray-100`}
                role="columnheader"
                aria-sort={
                  sort.column === 'status'
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sort.column === 'status' &&
                    (sort.direction === 'asc' ? (
                      <ChevronUpIcon className="h-3 w-3 text-gray-600" aria-hidden="true" />
                    ) : (
                      <ChevronDownIcon className="h-3 w-3 text-gray-600" aria-hidden="true" />
                    ))}
                </div>
              </th>

              {/* Action Column (not sortable) */}
              <th
                className={`${densityClasses.padding} text-right ${densityClasses.fontSize} font-semibold tracking-wider text-gray-700 uppercase`}
                role="columnheader"
              >
                Action
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedPatients.length > 0 ? (
              sortedPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="cursor-pointer transition-colors hover:bg-blue-50"
                  role="row"
                >
                  {/* Text Column */}
                  <td className={`${densityClasses.padding} text-left align-top`}>
                    <div className={`${densityClasses.fontSize} font-medium text-gray-900`}>
                      {patient.name}
                    </div>
                  </td>

                  {/* Text Column - ID */}
                  <td className={`${densityClasses.padding} text-left align-top`}>
                    <div className={`${densityClasses.fontSize} font-mono text-gray-600`}>
                      {patient.id}
                    </div>
                  </td>

                  {/* Numeric Column - PDC */}
                  <td className={`${densityClasses.padding} text-right align-top`}>
                    <div className={`${densityClasses.fontSize} font-semibold text-gray-900`}>
                      {patient.medAdherence?.gapDays?.PDC || '—'}%
                    </div>
                  </td>

                  {/* Badge Column - Status */}
                  <td className={`${densityClasses.padding} text-left align-top`}>
                    {(() => {
                      const status = patient.medAdherence?.gapDays?.status;
                      const badgeColors = {
                        passing: 'bg-green-100 text-green-700',
                        'at-risk': 'bg-yellow-100 text-yellow-700',
                        failing: 'bg-red-100 text-red-700',
                      };
                      const badgeClass = badgeColors[status] || 'bg-gray-100 text-gray-600';
                      return (
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
                        >
                          {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Action Column */}
                  <td className={`${densityClasses.padding} text-right align-top`}>
                    <button
                      onClick={() => console.log('Review', patient.id)}
                      className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                      aria-label={`Review ${patient.name}`}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className={`${densityClasses.padding} py-8 text-center ${densityClasses.fontSize} text-gray-500`}
                >
                  No patients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      {sortedPatients.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
          <p className="text-xs text-gray-600">
            Showing <span className="font-semibold text-gray-900">{sortedPatients.length}</span>{' '}
            patients
          </p>
        </div>
      )}
    </div>
  );
};

export default PatientTable;
```

---

## Column Types

### 1. Text Column (Default, Left-Aligned)

```jsx
{/* Text Column */}
<th className={`${densityClasses.padding} text-left ...`}>Patient Name</th>

<td className={`${densityClasses.padding} text-left align-top`}>
  <div className={`${densityClasses.fontSize} text-gray-900`}>
    {patient.name}
  </div>
</td>
```

**When to use:**

- Patient names, medication names
- Descriptions, notes
- String data that flows naturally

**Text color guidance:**

- Primary info: `text-gray-900`
- Secondary info: `text-gray-600`
- Tertiary/helper: `text-gray-500`

---

### 2. Numeric Column (Right-Aligned)

```jsx
{
  /* Numeric Header */
}
<th className={`${densityClasses.padding} text-right ...`}>PDC</th>;

{
  /* Numeric Cell */
}
<td className={`${densityClasses.padding} text-right align-top`}>
  <div className={`${densityClasses.fontSize} font-mono text-gray-900`}>{patient.pdc}%</div>
</td>;
```

**When to use:**

- Percentages (PDC, compliance rates)
- Days, counts, durations
- Any right-aligned number

**Styling:**

- Use `font-mono` for better numeric alignment
- Right-align to `text-right`
- Keep font weight normal or semibold for emphasis

---

### 3. Badge Column (Center-Aligned)

```jsx
{
  /* Badge Header */
}
<th className={`${densityClasses.padding} text-center ...`}>Status</th>;

{
  /* Badge Cell - Use Badge component */
}
<td className={`${densityClasses.padding} text-center align-top`}>
  <PDCBadge pdc={85} /> {/* or inline: */}
  <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
    Passing
  </span>
</td>;
```

**Badge colors (NO border - use -100/-700 pattern):**

```
PDC Passing (≥80%):
  bg-green-100 text-green-700
  Use: <PDCBadge pdc={85} />

PDC At-Risk (60-79%):
  bg-yellow-100 text-yellow-700
  Use: <PDCBadge pdc={70} />

PDC Failing (<60%):
  bg-red-100 text-red-700
  Use: <PDCBadge pdc={50} />

Measure Type (MAC/MAD/MAH):
  MAC: bg-blue-100 text-blue-800 - <MeasureBadge measure="MAC" />
  MAD: bg-purple-100 text-purple-800 - <MeasureBadge measure="MAD" />
  MAH: bg-pink-100 text-pink-800 - <MeasureBadge measure="MAH" />

Neutral/Generic:
  bg-gray-100 text-gray-600
```

**Badge structure (always):**

- NO border (use -100/-700 pattern)
- `rounded` for default style (not `rounded-full`)
- `text-xs font-semibold` for emphasis
- `inline-flex` to contain content
- Padding: `px-2 py-0.5`

---

### 4. Action Column (Right-Aligned Buttons)

```jsx
{/* Action Header */}
<th className={`${densityClasses.padding} text-right ...`}>Action</th>

{/* Action Cell - Single Button */}
<td className={`${densityClasses.padding} text-right align-top`}>
  <button
    onClick={() => handleReview(patient.id)}
    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
  >
    Review
  </button>
</td>

{/* Action Cell - Multiple Actions */}
<td className={`${densityClasses.padding} text-right align-top`}>
  <div className="flex justify-end gap-2">
    <button className="..." onClick={...}>Edit</button>
    <button className="..." onClick={...}>Delete</button>
  </div>
</td>
```

**Button sizing:**

- Small: `px-3 py-1.5 text-xs` (fits compact tables)
- Medium: `px-4 py-2 text-sm` (fits comfortable tables)
- Adjust based on density

**Multiple actions:**

- Use `gap-2` or `gap-3` between buttons
- Keep 2-3 actions max per row
- For more actions, use menu/dropdown

---

## Density System

### Definition

Density controls **spacing and font size** to optimize table readability based on available space and data volume.

### Three Density Levels

**COMFORTABLE** - For <= 20 rows, data entry focus

```
Header: px-4 py-3, text-sm, uppercase, font-semibold
Body:   px-4 py-3, text-sm
MinH:   44px (touch-friendly)
Icons:  h-5 w-5
Badges: px-3 py-1
```

**COMPACT** - Default, balances density and readability (20-200 rows)

```
Header: px-3 py-2, text-xs, uppercase, font-semibold
Body:   px-3 py-2, text-xs
MinH:   36px
Icons:  h-3 w-3
Badges: px-2 py-0.5
```

**DENSE** - For > 200 rows, maximum data density (200+ rows)

```
Header: px-3 py-1.5, text-xs, uppercase, font-semibold
Body:   px-3 py-1.5, text-xs
MinH:   32px
Icons:  h-3 w-3
Badges: px-2 py-0.5
```

### Implementation

```jsx
// 1. Define density state
const [density, setDensity] = useState('compact');

// 2. Create density classes object
const densityClasses = useMemo(() => {
  switch (density) {
    case 'comfortable':
      return {
        padding: 'px-4 py-3',
        fontSize: 'text-sm',
        minHeight: '44px'
      };
    case 'dense':
      return {
        padding: 'px-3 py-1.5',
        fontSize: 'text-xs',
        minHeight: '32px'
      };
    case 'compact':
    default:
      return {
        padding: 'px-3 py-2',
        fontSize: 'text-xs',
        minHeight: '36px'
      };
  }
}, [density]);

// 3. Apply to headers
<th className={`${densityClasses.padding} ${densityClasses.fontSize} ...`}>
  Column Header
</th>

// 4. Apply to cells
<td className={`${densityClasses.padding} align-top`}>
  <div className={`${densityClasses.fontSize} text-gray-900`}>
    Cell content
  </div>
</td>

// 5. Add toggle buttons
<div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
  <button
    onClick={() => setDensity('comfortable')}
    className={`px-2.5 py-2 ${density === 'comfortable' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}
    title="Comfortable density"
  >
    <svg className="w-4 h-4" /* comfortable icon */ />
  </button>
  <button
    onClick={() => setDensity('compact')}
    className={`px-2.5 py-2 border-x ${density === 'compact' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}
    title="Compact density"
  >
    <svg className="w-4 h-4" /* compact icon */ />
  </button>
  <button
    onClick={() => setDensity('dense')}
    className={`px-2.5 py-2 ${density === 'dense' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}
    title="Dense density"
  >
    <svg className="w-4 h-4" /* dense icon */ />
  </button>
</div>
```

### When to Show Density Toggle

- **Always show if:** Table has > 20 rows
- **Optional if:** Table has < 20 rows
- **Never show if:** Table is in a modal/sidebar (space constraint)

---

## Sorting Implementation

### Basic Pattern

```jsx
// 1. Define sort state
const [sort, setSort] = useState({ column: 'name', direction: 'asc' });

// 2. Handle sort click
const handleSort = useCallback((column) => {
  setSort((prev) => ({
    column,
    direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
  }));
}, []);

// 3. Apply sorting to data
const sortedData = useMemo(() => {
  return [...data].sort((a, b) => {
    // comparison logic
  });
}, [data, sort.column, sort.direction]);

// 4. Make header clickable
<th
  onClick={() => handleSort('columnName')}
  className="cursor-pointer hover:bg-gray-100"
  role="columnheader"
  aria-sort={
    sort.column === 'columnName' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
  }
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleSort('columnName')}
>
  <div className="flex items-center gap-1">
    Column Name
    {sort.column === 'columnName' &&
      (sort.direction === 'asc' ? (
        <ChevronUpIcon className="h-3 w-3" />
      ) : (
        <ChevronDownIcon className="h-3 w-3" />
      ))}
  </div>
</th>;

// 5. Provide visual feedback
// Active header: different font weight or background (subtle)
// Icon: Shows sort direction (up/down chevrons)
// Hover: bg-gray-100 on sortable headers
```

### Sortable vs Non-Sortable Columns

```jsx
{
  /* SORTABLE COLUMN */
}
<th
  onClick={() => handleSort('name')}
  className={`${densityClasses.padding} text-left ${densityClasses.fontSize} cursor-pointer font-semibold tracking-wider text-gray-700 uppercase transition-colors select-none hover:bg-gray-100`}
  role="columnheader"
  aria-sort={
    sort.column === 'name' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
  }
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleSort('name')}
>
  <div className="flex items-center gap-1">
    Column Name
    {sort.column === 'name' &&
      (sort.direction === 'asc' ? (
        <ChevronUpIcon className="h-3 w-3 text-gray-600" />
      ) : (
        <ChevronDownIcon className="h-3 w-3 text-gray-600" />
      ))}
  </div>
</th>;

{
  /* NON-SORTABLE COLUMN */
}
<th
  className={`${densityClasses.padding} text-left ${densityClasses.fontSize} font-semibold tracking-wider text-gray-700 uppercase`}
  role="columnheader"
>
  Non-Sortable Column
</th>;
```

### Comparison Function Template

```jsx
// String comparison
if (typeof aVal === 'string' && typeof bVal === 'string') {
  const comparison = aVal.localeCompare(bVal);
  return sort.direction === 'asc' ? comparison : -comparison;
}

// Number comparison
const comparison = aVal - bVal;
return sort.direction === 'asc' ? comparison : -comparison;

// Mixed/fallback
if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
return 0;
```

---

## Accessibility Checklist

Every table MUST meet these requirements:

### Semantic HTML

- [ ] `<table>` for table wrapper
- [ ] `<thead>` for header row
- [ ] `<tbody>` for data rows
- [ ] `<tr>` for table rows
- [ ] `<th>` for column headers (NOT `<td>`)
- [ ] `<td>` for data cells

### ARIA Attributes

- [ ] `role="table"` on `<table>` (or just use semantic `<table>`)
- [ ] `role="columnheader"` on `<th>`
- [ ] `role="row"` on `<tr>`
- [ ] `aria-sort` on sortable headers: "ascending" | "descending" | "none"
- [ ] `aria-label` on icon-only buttons
- [ ] `aria-hidden="true"` on decorative icons

### Keyboard Navigation

- [ ] Sortable headers are focusable: `tabIndex={0}`
- [ ] Sortable headers respond to Enter key: `onKeyDown`
- [ ] Row click handlers have keyboard equivalent
- [ ] Tab order makes sense
- [ ] No keyboard traps

### Visual Indicators

- [ ] Focus visible on interactive elements: `focus:ring-2 focus:ring-blue-500`
- [ ] Sort direction clear visually (up/down chevrons)
- [ ] Color not only way to indicate status (use text + color)
- [ ] Sufficient color contrast (WCAG AA: 4.5:1 for text)

### Screen Reader Support

- [ ] Table purpose is clear (caption or heading)
- [ ] Column headers identify their column
- [ ] Data cells have context (not orphaned)
- [ ] Action buttons labeled: "Review Patient", not just "Review"
- [ ] Empty state message is announced

### Example: Fully Accessible Header

```jsx
<thead className="sticky top-0 z-10 bg-gray-50">
  <tr role="row">
    <th
      onClick={() => handleSort('name')}
      className="cursor-pointer px-3 py-2 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase select-none hover:bg-gray-100"
      role="columnheader"
      aria-sort={
        sort.column === 'name' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleSort('name')}
    >
      <div className="flex items-center gap-1">
        Patient Name
        {sort.column === 'name' &&
          (sort.direction === 'asc' ? (
            <ChevronUpIcon className="h-3 w-3 text-gray-600" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="h-3 w-3 text-gray-600" aria-hidden="true" />
          ))}
      </div>
    </th>
  </tr>
</thead>
```

---

## Common Patterns

### Pattern 1: Simple Data Table

```jsx
// No sorting, no density, just display data
const SimpleTable = ({ data }) => (
  <div className="overflow-x-auto rounded-lg border border-gray-200">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
            Column 1
          </th>
          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
            Column 2
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {data.map((row) => (
          <tr key={row.id}>
            <td className="px-3 py-2 text-xs text-gray-900">{row.col1}</td>
            <td className="px-3 py-2 text-xs text-gray-600">{row.col2}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
```

### Pattern 2: Sortable, Filterable List

```jsx
// Sorting + filtering + density
const AdvancedTable = ({ data, searchQuery }) => {
  const [sort, setSort] = useState({ column: 'name', direction: 'asc' });
  const [density, setDensity] = useState('compact');

  const filtered = useMemo(() => {
    let result = [...data];
    if (searchQuery) {
      result = result.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [data, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // sorting logic
    });
  }, [filtered, sort]);

  // Render table with density classes and sort handlers
};
```

### Pattern 3: Selectable Rows

```jsx
// Checkboxes + multi-select
const SelectableTable = ({ data }) => {
  const [selected, setSelected] = useState(new Set());

  const handleSelectAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((d) => d.id)));
    }
  };

  const handleSelectRow = (id) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  return (
    <table>
      <thead>
        <tr>
          <th className="w-12">
            <input
              type="checkbox"
              checked={selected.size === data.length && data.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300"
            />
          </th>
          {/* other headers */}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr
            key={row.id}
            className={
              selected.has(row.id) ? 'border-l-4 border-blue-500 bg-blue-50' : 'hover:bg-blue-50'
            }
          >
            <td className="px-3 py-2">
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={() => handleSelectRow(row.id)}
                className="rounded border-gray-300"
              />
            </td>
            {/* other cells */}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## Anti-Patterns to Avoid

### ❌ ANTI-PATTERN 1: Inline Styles Instead of Classes

```jsx
// WRONG
<td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
  Cell content
</td>

// RIGHT
<td className="px-4 py-3 text-sm text-gray-700">
  Cell content
</td>
```

### ❌ ANTI-PATTERN 2: Magic Numbers for Density

```jsx
// WRONG
const padding = density === 'comfortable' ? '16px 20px' : '12px 16px' ? '12px 12px' : null;

// RIGHT
const densityClasses = useMemo(() => {
  switch (density) {
    case 'comfortable':
      return { padding: 'px-4 py-3', fontSize: 'text-sm' };
    case 'compact':
      return { padding: 'px-3 py-2', fontSize: 'text-xs' };
    // ...
  }
}, [density]);
```

### ❌ ANTI-PATTERN 3: Sorting Without Accessibility

```jsx
// WRONG
<th onClick={() => handleSort('name')} className="cursor-pointer">
  Name
</th>

// RIGHT
<th
  onClick={() => handleSort('name')}
  className="cursor-pointer hover:bg-gray-100 select-none"
  role="columnheader"
  aria-sort={sort.column === 'name' ? sort.direction : 'none'}
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleSort('name')}
>
  <div className="flex items-center gap-1">
    Name
    {sort.column === 'name' && <ChevronIcon direction={sort.direction} />}
  </div>
</th>
```

### ❌ ANTI-PATTERN 4: Hardcoded Colors Instead of Tokens

```jsx
// WRONG
<span className="bg-#22C55E text-#065F46">Passing</span>

// RIGHT (use -100/-700 pattern, no border)
<span className="bg-green-100 text-green-700">Passing</span>
// Or use Badge component: <PDCBadge pdc={85} />
```

### ❌ ANTI-PATTERN 5: No Sticky Headers on Scrollable Tables

```jsx
// WRONG
<thead className="bg-gray-50">
  <tr>
    <th className="px-3 py-2">Column</th>
  </tr>
</thead>

// RIGHT
<thead className="bg-gray-50 sticky top-0 z-10">
  <tr>
    <th className="px-3 py-2">Column</th>
  </tr>
</thead>
```

### ❌ ANTI-PATTERN 6: Using Old Badge Pattern With Borders

```jsx
// WRONG (old pattern with -50/-200 and border)
<span className="bg-green-50 border border-green-200 text-green-700">Passing</span>

// RIGHT (new pattern: -100/-700, NO border)
<span className="bg-green-100 text-green-700">Passing</span>
// Or use Badge component: <PDCBadge pdc={85} />
```

### ❌ ANTI-PATTERN 7: Non-Semantic HTML for Tables

```jsx
// WRONG
<div className="border">
  <div className="flex font-bold bg-gray-50">
    <div className="flex-1 px-3 py-2">Column 1</div>
  </div>
  <div className="divide-y">
    <div className="flex">
      <div className="flex-1 px-3 py-2">Data</div>
    </div>
  </div>
</div>

// RIGHT
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-3 py-2">Column 1</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-200">
    <tr>
      <td className="px-3 py-2">Data</td>
    </tr>
  </tbody>
</table>
```

---

## References

- **Design System:** `docs/UI/UI_DESIGN_SYSTEM.md`
- **Audit Guide:** `docs/UI/UI_AUDIT_GUIDE.md`
- **Pattern Analysis:** `docs/TABLE_CONSISTENCY_ANALYSIS.md`
- **Accessibility:** WCAG 2.1 Level AA, ARIA Authoring Practices Guide

---

**Last Updated:** December 3, 2025
**Version:** 1.0
