# Table Design Tokens - Quick Reference

**Purpose:** Single-page design token lookup for building tables
**Use:** Copy-paste values for headers, cells, badges, etc.

---

## Copy-Paste: Table Structure

```jsx
// Full wrapper with scrolling
<div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
  <div className="flex-1 overflow-auto">
    <table className="min-w-full divide-y divide-gray-200">{/* thead and tbody here */}</table>
  </div>
  {/* Footer here */}
</div>
```

---

## Density Classes

### Comfortable

```jsx
const densityClasses = {
  padding: 'px-4 py-3',
  fontSize: 'text-sm',
  minHeight: '44px',
};
```

### Compact (default)

```jsx
const densityClasses = {
  padding: 'px-3 py-2',
  fontSize: 'text-xs',
  minHeight: '36px',
};
```

### Dense

```jsx
const densityClasses = {
  padding: 'px-3 py-1.5',
  fontSize: 'text-xs',
  minHeight: '32px',
};
```

---

## Header Styling

```jsx
// Container
<thead className="bg-gray-50 sticky top-0 z-10">

// Sortable column
<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">

// Non-sortable column
<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">

// Right-aligned (numeric)
<th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
```

---

## Row Styling

```jsx
// Interactive row
<tr className="hover:bg-blue-50 transition-colors cursor-pointer">

// Non-interactive row
<tr className="border-b border-gray-200">

// Selected row
<tr className="bg-blue-50 border-l-4 border-blue-500">
```

---

## Cell Styling

```jsx
// Text cell - left aligned
<td className="px-3 py-2 align-top text-left">
  <div className="text-xs text-gray-900">
    {content}
  </div>
</td>

// Numeric cell - right aligned
<td className="px-3 py-2 align-top text-right">
  <div className="text-xs text-gray-900 font-mono">
    {number}%
  </div>
</td>

// With secondary text
<td className="px-3 py-2 align-top text-left">
  <div className="text-xs text-gray-900">{primary}</div>
  <div className="text-xs text-gray-600">{secondary}</div>
</td>
```

---

## Badge Tokens

**Pattern:** All badges use `-100/-700` (NO border). See `Badge.jsx` for canonical implementation.

### Passing (PDC ≥80%)

```
bg-green-100 text-green-700
```

```jsx
<span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
  Passing
</span>
// Or use: <PDCBadge pdc={85} />
```

### At-Risk (PDC 60-79%)

```
bg-yellow-100 text-yellow-700
```

```jsx
<span className="inline-flex items-center rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
  At-Risk
</span>
// Or use: <PDCBadge pdc={70} />
```

### Failing (PDC <60%)

```
bg-red-100 text-red-700
```

```jsx
<span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
  Failing
</span>
// Or use: <PDCBadge pdc={50} />
```

### Measure: MAC

```
bg-blue-100 text-blue-800
```

```jsx
// Use: <MeasureBadge measure="MAC" />
```

### Measure: MAD

```
bg-purple-100 text-purple-800
```

```jsx
// Use: <MeasureBadge measure="MAD" />
```

### Measure: MAH

```
bg-pink-100 text-pink-800
```

```jsx
// Use: <MeasureBadge measure="MAH" />
```

### Neutral

```
bg-gray-100 text-gray-600
```

---

## Color Reference

| Color        | Hex     | Usage                                |
| ------------ | ------- | ------------------------------------ |
| `gray-50`    | #F9FAFB | Headers, footers, subtle backgrounds |
| `gray-100`   | #F3F4F6 | Hover states, alternate rows         |
| `gray-200`   | #E5E7EB | Borders, dividers                    |
| `gray-300`   | #D1D5DB | Input borders                        |
| `gray-600`   | #4B5563 | Secondary text, muted content        |
| `gray-700`   | #374151 | Primary text, headers                |
| `gray-900`   | #111827 | Strongest text, emphasis             |
| `green-50`   | #ECFDF5 | Passing badge background             |
| `green-200`  | #BBF7D0 | Passing badge border                 |
| `green-700`  | #047857 | Passing badge text                   |
| `yellow-50`  | #FFFBEB | At-risk badge background             |
| `yellow-200` | #FDE68A | At-risk badge border                 |
| `yellow-700` | #B45309 | At-risk badge text                   |
| `red-50`     | #FEF2F2 | Failing badge background             |
| `red-200`    | #FECACA | Failing badge border                 |
| `red-700`    | #B91C1C | Failing badge text                   |
| `blue-50`    | #EFF6FF | Row hover, selection                 |
| `blue-500`   | #3B82F6 | Focus ring, selection indicator      |
| `blue-600`   | #2563EB | Buttons, primary CTA                 |
| `blue-700`   | #1D4ED8 | Button hover                         |

---

## Button Styling

### Primary Button

```jsx
<button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
  Save
</button>
```

### Secondary Button (for tables)

```jsx
<button className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
  Review
</button>
```

### Density-Aware Button

```jsx
// Comfortable
<button className="px-4 py-2 text-sm font-medium ...">

// Compact
<button className="px-3 py-1.5 text-xs font-medium ...">

// Dense
<button className="px-3 py-1.5 text-xs font-medium ...">
```

---

## Footer

```jsx
<div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
  <p className="text-xs text-gray-600">
    Showing <span className="font-semibold text-gray-900">{count}</span> records
  </p>
</div>
```

---

## Sort Icons

```jsx
// Ascending
<ChevronUpIcon className="h-3 w-3 text-gray-600" aria-hidden="true" />

// Descending
<ChevronDownIcon className="h-3 w-3 text-gray-600" aria-hidden="true" />
```

---

## Density Toggle

```jsx
<div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
  <button className="bg-blue-600 px-2.5 py-2 text-white" title="Comfortable">
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  </button>
  <button className="border-x border-gray-300 bg-white px-2.5 py-2" title="Compact">
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
    </svg>
  </button>
  <button className="bg-white px-2.5 py-2" title="Dense">
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 16h16"
      />
    </svg>
  </button>
</div>
```

---

## Empty State

```jsx
<tr>
  <td colSpan={columnCount} className="px-3 py-2 py-8 text-center text-xs text-gray-500">
    No records found
  </td>
</tr>
```

---

## Quick Snippets

### Text Column

```jsx
<td className="px-3 py-2 text-left align-top">
  <div className="text-xs text-gray-900">{patient.name}</div>
</td>
```

### Numeric Column

```jsx
<td className="px-3 py-2 text-right align-top">
  <div className="font-mono text-xs text-gray-900">{patient.pdc}%</div>
</td>
```

### Badge Column (with status)

```jsx
<td className="px-3 py-2 align-top">
  {/* Use Badge component for consistency */}
  <PDCBadge pdc={patient.pdc} />
  {/* Or inline: */}
  <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
    Passing
  </span>
</td>
```

### Action Column

```jsx
<td className="px-3 py-2 text-right align-top">
  <button className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50">
    Review
  </button>
</td>
```

---

## DO's ✓

- ✓ Use gray-50 for headers
- ✓ Use gray-200 for borders
- ✓ Use blue-50 for row hover
- ✓ Use `-100/-700` pattern for badges (NO border)
- ✓ Use Badge components (PDCBadge, MeasureBadge, etc.)
- ✓ Use `sticky top-0` for headers
- ✓ Apply density classes consistently
- ✓ Use `text-left` for text columns
- ✓ Use `text-right` for numeric columns
- ✓ Add `aria-sort` to sortable headers

---

## DON'Ts ✗

- ✗ Don't use gray-100 for headers (too dark)
- ✗ Don't use inline styles instead of classes
- ✗ Don't mix density levels in same table
- ✗ Don't add borders to badges (no longer required)
- ✗ Don't use `-50/-200` pattern for badges (outdated)
- ✗ Don't skip sticky positioning on headers
- ✗ Don't center-align text columns
- ✗ Don't left-align numeric columns
- ✗ Don't forget `z-10` on sticky headers
- ✗ Don't make sortable headers non-focusable

---

## Print This!

Save as PDF or print for quick reference while coding:

```
File: TABLE_DESIGN_TOKENS_REFERENCE.md
Read Time: 2 minutes
Sections: Copy-paste snippets, color reference, DO's/DON'Ts
```

---

**Version:** 1.1
**Last Updated:** December 8, 2025
**Created for:** Fast lookup during table implementation
