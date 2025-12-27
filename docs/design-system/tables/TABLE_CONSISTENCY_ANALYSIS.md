# Table Consistency Analysis & Implementation Plan

**Status:** Active Analysis
**Last Updated:** December 3, 2025
**Purpose:** Ensure all tables follow the design system and maintain visual/behavioral consistency

---

## Executive Summary

Your three tables show **functional consistency** but **visual inconsistency**. The design system (`UI_DESIGN_SYSTEM.md`) provides high-level guidance but **lacks concrete implementation details** for building production tables. This analysis identifies the gaps and provides a solution framework.

**Key Finding:** Tables are built ad-hoc in each page using different class patterns. Without a reusable `<Table>` component system, consistency drifts over time.

---

## Current State Analysis

### Table 1: PatientLookupSimple (Batch Index)

**File:** `PatientLookupSimple.jsx` (lines 740-895)

**Visual Characteristics:**

- Header: `bg-gray-50`, `text-xs font-medium`, `uppercase tracking-wider`
- Row hover: `hover:bg-blue-50 cursor-pointer`
- Cells: `px-3 py-2` (compact), `px-4 py-3` (comfortable)
- Sorting: Chevron icons in headers with click handlers
- Density toggle: 3 buttons (comfortable/compact/dense)
- Badge styling: PDC badges with color-coded backgrounds
- Footer: Shows record count summary

**Implementation Pattern:**

```jsx
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
        Header Text
      </th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-200 bg-white">
    <tr className="cursor-pointer hover:bg-blue-50">
      <td className="px-3 py-2">Cell content</td>
    </tr>
  </tbody>
</table>
```

**Inconsistencies Observed:**

- ✓ Header background is correct (gray-50)
- ✓ Footer exists and shows summary
- ⚠️ No "sticky" positioning for header on scroll
- ⚠️ Focus state missing on sortable headers
- ⚠️ Density classes are inline, not centralized

---

### Table 2: MedicationsTab (Patient Detail)

**File:** Referenced as "Medications (11)" tab in PatientDetailPage

**Visual Characteristics:**

- **Column headers:** MEDICATION, MEASURE, PDC, STATUS, DAYS LEFT, NEXT REFILL, AI RESULT, ACTION
- Row styling: No visible hover state in screenshot
- Cell padding: Appears tighter than PatientLookupSimple
- Status badges: Inline with different color schemes
- PDC display: Green text, percentage format
- Action buttons: Blue "Review" buttons right-aligned

**Implementation Issues:**

- ⚠️ Different header text styling (not uppercase)
- ⚠️ Row hover behavior different/missing
- ⚠️ No visible column alignment consistency
- ⚠️ Badge styling differs from PDC badges in other tables
- ⚠️ Action button positioning inconsistent

---

### Table 3: MedAdherencePage (Med Adherence Command Center)

**File:** `MedAdherencePage.jsx` (lines 575-739)

**Visual Characteristics:**

- Header: `bg-gray-50`, `text-xs font-medium`, `uppercase tracking-wider`
- Row hover: `hover:bg-blue-50 cursor-pointer`
- Cells: Density-driven (`px-3 py-2` / `px-4 py-3` / `px-3 py-1.5`)
- Sorting: Chevron icons with click handlers
- Density toggle: 3 buttons matching PatientLookupSimple
- Status badges: Color-coded by PDC status (green/yellow/red)
- Footer: Shows filtered/total patient count

**Implementation Pattern:** Identical to PatientLookupSimple (good!)

**Consistency Notes:**

- ✓ Header styling matches PatientLookupSimple
- ✓ Density implementation matches PatientLookupSimple
- ✓ Sorting mechanism matches PatientLookupSimple
- ⚠️ Still lacks sticky headers on scroll

---

## Design System Gaps

Your `UI_DESIGN_SYSTEM.md` defines these table tokens:

| Token                       | Definition                                                                               | Usage         |
| --------------------------- | ---------------------------------------------------------------------------------------- | ------------- |
| `COMPONENT.TABLE.CONTAINER` | `min-w-full divide-y divide-gray-200`                                                    | Table wrapper |
| `COMPONENT.TABLE.HEADER`    | `bg-gray-50 sticky top-0` + `px-3 py-2.5 text-xs font-semibold uppercase tracking-wider` | Header row    |
| `COMPONENT.TABLE.ROW`       | `bg-white border-b border-gray-200` + `hover:bg-blue-50 cursor-pointer`                  | Body row      |
| `COMPONENT.TABLE.CELL`      | `px-3 py-2` (compact) or `px-4 py-3` (comfortable)                                       | Body cell     |

**What's Missing from the Design System:**

1. **Column Type Patterns** - Not covered:
   - Text columns (left-aligned)
   - Numeric columns (right-aligned)
   - Badge columns (center-aligned)
   - Action columns (right-aligned buttons)

2. **Density Implementation** - Mentioned but not detailed:
   - Where to store density state (component-level vs context?)
   - How to handle column-specific overrides
   - Interaction with sticky headers

3. **Sorting UI** - Not specified:
   - Icon placement and style
   - Hover state for sortable headers
   - Focus accessibility

4. **Special Row States** - Missing:
   - Selected/highlighted rows
   - Disabled rows
   - Error/warning rows
   - Loading states (skeletons)

5. **Responsive Behavior** - Not addressed:
   - Mobile table display
   - Column hiding strategy
   - Horizontal scrolling approach

---

## The Core Issue: Decentralized Table Building

All three tables are **custom-built in their pages** using inline Tailwind classes. There is NO reusable `<Table>` component system.

**Current Approach (Anti-pattern):**

```
PatientLookupSimple.jsx  →  Custom <table> with inline classes
MedAdherencePage.jsx      →  Custom <table> with inline classes (duplicated!)
PatientDetailPage.jsx     →  Custom medications table with different structure
```

**Result:**

- Developers must remember which classes to use
- Copy-paste errors compound
- Design changes require updating multiple files
- No single source of truth

---

## Solution Framework

### Level 1: Design System Enhancement (Immediate)

Add these specifications to `UI_DESIGN_SYSTEM.md`:

**1. Table Column Types:**

```
COMPONENT.TABLE.COL_TEXT       // Left-aligned text (default)
COMPONENT.TABLE.COL_NUMERIC    // Right-aligned numbers
COMPONENT.TABLE.COL_BADGE      // Center-aligned badges
COMPONENT.TABLE.COL_ACTION     // Right-aligned buttons
```

**2. Density Configuration:**

```
COMPONENT.TABLE.DENSITY.COMFORTABLE  // px-4 py-3, text-sm
COMPONENT.TABLE.DENSITY.COMPACT      // px-3 py-2, text-xs
COMPONENT.TABLE.DENSITY.DENSE        // px-3 py-1.5, text-xs
```

**3. Row States:**

```
COMPONENT.TABLE.ROW_HOVER       // hover:bg-blue-50
COMPONENT.TABLE.ROW_SELECTED    // bg-blue-50 border-l-4 border-blue-500
COMPONENT.TABLE.ROW_DISABLED    // opacity-50 cursor-not-allowed
COMPONENT.TABLE.ROW_LOADING     // opacity-75 animate-pulse
```

**4. Sortable Header:**

```
COMPONENT.TABLE.HEADER_SORTABLE  // cursor-pointer hover:bg-gray-100
COMPONENT.TABLE.SORT_ICON        // Chevron up/down, h-3 w-3
```

---

### Level 2: Table Component Library (Medium Priority)

Create a reusable table component system:

**File Structure:**

```
src/components/ui/Table/
├── Table.jsx              // Root container
├── TableHead.jsx          // <thead> wrapper
├── TableBody.jsx          // <tbody> wrapper
├── TableRow.jsx           // <tr> with state handling
├── TableCell.jsx          // <td> with column type support
├── TableHeader.jsx        // <th> with sorting support
├── useTableState.js       // Hook for sort/density/filter state
└── tableUtils.js          // Helper functions
```

**Usage Pattern (Example):**

```jsx
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/ui/Table';

<Table density="compact" onSort={handleSort}>
  <TableHead>
    <TableRow>
      <TableHeader column="name" sortable>Patient Name</TableHeader>
      <TableHeader column="pdc" type="numeric">PDC</TableHeader>
      <TableHeader column="status" type="badge">Status</TableHeader>
      <TableHeader column="action" type="action">Action</TableHeader>
    </TableRow>
  </TableHead>
  <TableBody>
    {patients.map(patient => (
      <TableRow key={patient.id} selected={selected.includes(patient.id)}>
        <TableCell>{patient.name}</TableCell>
        <TableCell type="numeric">{patient.pdc}%</TableCell>
        <TableCell type="badge"><Badge>{patient.status}</Badge></TableCell>
        <TableCell type="action">
          <Button onClick={...}>Review</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### Level 3: QA Audit Checklist (Implement Immediately)

Add to `UI_AUDIT_GUIDE.md`:

**Table Consistency Checklist:**

```markdown
## TABLE AUDIT CHECKLIST

### Visual Consistency

- [ ] Header background is `bg-gray-50` (DS: COMPONENT.TABLE.HEADER)
- [ ] Header text is `text-xs font-medium text-gray-700 uppercase tracking-wider`
- [ ] Header is sticky (`sticky top-0`) for scrolling tables
- [ ] Row dividers are `border-b border-gray-200`
- [ ] Row hover state is `hover:bg-blue-50 cursor-pointer`
- [ ] Cell padding matches density setting (compact/comfortable/dense)
- [ ] Table is wrapped in container with `min-w-full divide-y divide-gray-200`

### Column Alignment

- [ ] Text columns are left-aligned (`text-left`)
- [ ] Numeric columns are right-aligned (`text-right`)
- [ ] Badge columns are centered with proper spacing
- [ ] Action columns are right-aligned

### Density & Responsive

- [ ] Density toggle visible if table has >20 rows
- [ ] All three density levels work (comfortable/compact/dense)
- [ ] Density classes applied consistently:
  - Comfortable: `px-4 py-3 text-sm`
  - Compact: `px-3 py-2 text-xs`
  - Dense: `px-3 py-1.5 text-xs`

### Sorting (if applicable)

- [ ] Sortable headers have `cursor-pointer` class
- [ ] Sort icons (chevrons) visible when sorting active
- [ ] Icon direction matches sort order (up=asc, down=desc)
- [ ] Hover state on sortable headers: `hover:bg-gray-100`
- [ ] Focus visible on sortable headers (keyboard accessible)

### Badges & Status

- [ ] PDC badges use correct colors:
  - ✓ Passing (≥80%): `bg-green-50 border-green-300 text-green-700`
  - ⚠ At-risk (60-79%): `bg-yellow-50 border-yellow-300 text-yellow-700`
  - ✗ Failing (<60%): `bg-red-50 border-red-300 text-red-700`
- [ ] All badges have `border` attribute (DS: COMPONENT.BADGE.\*)

### Footer

- [ ] Shows record count: "Showing X of Y records"
- [ ] Footer background: `bg-gray-50`
- [ ] Footer text: `text-xs text-gray-600`

### Accessibility

- [ ] Table has proper semantic structure (<table>, <thead>, <tbody>, <tr>, <td>)
- [ ] Headers use <th> not <td>
- [ ] Sortable headers have proper aria-sort attributes
- [ ] Row click handlers have keyboard support
- [ ] Color not used as only indicator (text + color)

### Special States

- [ ] Empty state shows appropriate message (no rows)
- [ ] Loading state shows skeletons (while fetching)
- [ ] Error state provides helpful message

### Performance

- [ ] Table scrolls smoothly (virtualization if >1000 rows)
- [ ] Sticky header doesn't cause layout shift
- [ ] Density changes don't cause re-renders of all cells
```

---

### Level 4: Future Tables Checklist

Before building ANY new table:

1. **Check if reusable component exists:**
   - Use `<Table>` component from `src/components/ui/Table/`
   - Import pre-built column types: `<TableCell type="numeric">`, etc.

2. **Define table requirements:**
   - Sortable? Which columns?
   - Filterable? Which columns?
   - Density toggle needed?
   - Sticky headers required?
   - Selection/multi-select?
   - Custom row styling?

3. **Reference design system:**
   - All styling from `UI_DESIGN_SYSTEM.md` IDs
   - Use density tokens, not magic numbers
   - Apply color rules for PDC/status badges

4. **Run QA checklist before PR:**
   - Every table must pass the checklist above
   - Screenshot comparison against existing tables
   - Accessibility testing (keyboard nav, screen reader)

---

## Implementation Roadmap

### Phase 1: Documentation (1 hour)

- [ ] Update `UI_DESIGN_SYSTEM.md` with complete table specifications
- [ ] Create `TABLE_IMPLEMENTATION_GUIDE.md` with code examples
- [ ] Add table audit checklist to `UI_AUDIT_GUIDE.md`

### Phase 2: Audit Existing Tables (30 minutes)

- [ ] Run checklist against all three tables
- [ ] Document violations with line numbers and fixes
- [ ] Create issues for any design system gaps

### Phase 3: Build Table Component Library (2-4 hours)

- [ ] Create `src/components/ui/Table/` component system
- [ ] Implement `useTableState` hook for sort/density management
- [ ] Build story examples in Storybook (if available)
- [ ] Document all props and usage patterns

### Phase 4: Migrate Existing Tables (2-3 hours)

- [ ] Refactor PatientLookupSimple to use `<Table>` component
- [ ] Refactor MedAdherencePage to use `<Table>` component
- [ ] Update MedicationsTab to use `<Table>` component
- [ ] Verify visual consistency before/after

### Phase 5: Create Template for Future Tables (30 minutes)

- [ ] Create `src/components/templates/TableTemplate.jsx`
- [ ] Include all best practices (sorting, density, accessibility)
- [ ] Add copy-paste checklist in comments
- [ ] Document in developer wiki

---

## Design System Gaps - Details

### Gap 1: No Column Type Specifications

**Current Design System:**

```
COMPONENT.TABLE.CELL: "px-3 py-2 text-xs"  (ALL cells same)
```

**What's Needed:**

```
COMPONENT.TABLE.COL.TEXT
  Classes: text-left (default alignment)
  Usage: Patient names, medication names, descriptions

COMPONENT.TABLE.COL.NUMERIC
  Classes: text-right
  Usage: PDC percentages, gap days, counts
  Monospace fonts for numbers? Define.

COMPONENT.TABLE.COL.BADGE
  Classes: inline-flex items-center justify-center
  Usage: Status badges, measure badges, tier indicators
  Always has border? Always rounded-full? Define.

COMPONENT.TABLE.COL.ACTION
  Classes: text-right
  Usage: Buttons, menu triggers
  Button styling? Gap between multiple actions?
```

### Gap 2: Density System Incomplete

**Current Design System:**

```
Just mentions "Comfortable", "Compact", "Dense"
```

**What's Needed:**

```
Define for EACH density:
- Header padding (px, py)
- Header font-size
- Body padding (px, py)
- Body font-size
- Row min-height
- Badge size within row

Example:
COMFORTABLE:
  Header: px-4 py-3, text-sm
  Body: px-4 py-3, text-sm
  Min-height: 44px (touch-friendly)

COMPACT:
  Header: px-3 py-2, text-xs
  Body: px-3 py-2, text-xs
  Min-height: 36px

DENSE:
  Header: px-3 py-1.5, text-xs
  Body: px-3 py-1.5, text-xs
  Min-height: 32px
```

### Gap 3: Sorting UI Not Defined

**Current Design System:** Silent

**What's Needed:**

```
COMPONENT.TABLE.HEADER.SORTABLE
  Base: cursor-pointer
  Hover: hover:bg-gray-100
  Focus: ring-2 ring-blue-500 ring-inset (focus-visible)
  Icon position: Right-aligned after text, gap-1
  Icon size: h-3 w-3 (matches text-xs)
  Icon color: currentColor (inherits text color)
  Active state: Different font-weight? Bold text?

COMPONENT.TABLE.SORT_ICON
  Ascending: ChevronUpIcon
  Descending: ChevronDownIcon
  Display: Only when active
  Alternative: Consider caret or arrow
```

### Gap 4: Special Row States

**Current Design System:** Not mentioned

**What's Needed:**

```
COMPONENT.TABLE.ROW.DEFAULT
  Classes: bg-white border-b border-gray-200

COMPONENT.TABLE.ROW.HOVER
  Classes: hover:bg-blue-50 cursor-pointer (interactive row)

COMPONENT.TABLE.ROW.SELECTED
  Classes: bg-blue-50 border-l-4 border-blue-500
  Left border indicates selection visually

COMPONENT.TABLE.ROW.DISABLED
  Classes: opacity-50 cursor-not-allowed pointer-events-none

COMPONENT.TABLE.ROW.LOADING
  Classes: opacity-75 animate-pulse

COMPONENT.TABLE.ROW.ERROR
  Classes: bg-red-50 border-l-4 border-red-500
```

### Gap 5: Responsive Behavior

**Current Design System:** Not addressed

**What's Needed:**

```
Guidance on:
- Mobile display strategy (hide low-priority columns? Stacked view?)
- Horizontal scrolling? Sticky first column?
- Breakpoints (sm/md/lg)
- When to switch from table to card view
- Column priority order (define for each page)
```

---

## Why Consistency Matters

1. **Cognitive Load:** Users learn UI patterns once, expect them everywhere
2. **Accessibility:** Inconsistent structures break screen readers
3. **Maintenance:** Without standards, technical debt accumulates
4. **Onboarding:** New developers need clear rules, not "ask someone"
5. **Audit Confidence:** Inconsistency fails security/compliance audits

---

## Recommendation: What to Do First

**Quick Win (30 min):**

1. Add column type guidance to design system
2. Create table audit checklist
3. Run checklist against existing tables, document violations

**Medium Impact (2 hours):**

1. Enhance design system with density details
2. Create `TABLE_IMPLEMENTATION_GUIDE.md`
3. Update CLAUDE.md with table building instructions

**Long-term Solution (4-6 hours):**

1. Build reusable `<Table>` component system
2. Migrate existing tables to use it
3. Create template for future tables

---

## Files Involved

| File                                 | Purpose                  | Status                  |
| ------------------------------------ | ------------------------ | ----------------------- |
| `docs/UI/UI_DESIGN_SYSTEM.md`        | Primary design spec      | **Needs Enhancement**   |
| `docs/TABLE_IMPLEMENTATION_GUIDE.md` | **NEW** - Building guide | **Create**              |
| `docs/UI/UI_AUDIT_GUIDE.md`          | QA checklist             | **Needs Table Section** |
| `src/components/ui/Table/`           | Component library        | **Create**              |
| `src/pages/PatientLookupSimple.jsx`  | Uses table               | **Refactor**            |
| `src/pages/MedAdherencePage.jsx`     | Uses table               | **Refactor**            |
| `src/pages/PatientDetailPage.jsx`    | Uses table               | **Refactor**            |

---

**Next Step:** Would you like me to proceed with Phase 1 (enhancing the design system), or would you prefer to prioritize building the component library first?
