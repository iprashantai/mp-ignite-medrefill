# Table QA Checklist

**Purpose:** Quick verification that tables are consistent with design system
**When to Use:** Before any table PR, during UI audits, during code reviews
**Severity:** Tables not passing this checklist = Design System violation

---

## Quick 5-Minute Checklist

Use this for rapid review:

- [ ] **Header styling:** `bg-gray-50 sticky top-0 z-10`
- [ ] **Header text:** `text-xs font-semibold text-gray-700 uppercase tracking-wider`
- [ ] **Row hover:** `hover:bg-blue-50 cursor-pointer` (if interactive)
- [ ] **Cell padding:** Matches density (px-3 py-2 compact, px-4 py-3 comfortable, px-3 py-1.5 dense)
- [ ] **Table dividers:** `divide-y divide-gray-200`
- [ ] **Badges use -100/-700 pattern (NO border)**
- [ ] **PDC colors correct:**
  - ✓ Green ≥80%: `bg-green-100 text-green-700`
  - ⚠️ Yellow 60-79%: `bg-yellow-100 text-yellow-700`
  - ✗ Red <60%: `bg-red-100 text-red-700`
- [ ] **Sortable headers:** Chevron icons visible when active, keyboard accessible
- [ ] **Semantic HTML:** Uses `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`
- [ ] **Accessibility:** Sortable headers have `aria-sort`, `role="columnheader"`, `tabIndex={0}`

**Result:** ✓ PASS or ❌ FAIL with specific violations noted

---

## Detailed Checklist (by category)

### Visual Consistency

#### Header Styling

```
Requirement: DS COMPONENT.TABLE.HEADER
Location: <thead> element
```

- [ ] Background is `bg-gray-50` (not gray-100, not white)
- [ ] Header is sticky: `sticky top-0 z-10`
- [ ] Header has border-bottom: `border-b border-gray-200`
- [ ] Header text color is `text-gray-700` (not gray-600, not black)

**Check:** Screenshot - header should stay at top when scrolling

---

#### Table Container

```
Requirement: DS COMPONENT.TABLE.CONTAINER
Location: <table> element
```

- [ ] Table has `min-w-full` (prevents column width collapse)
- [ ] Table has `divide-y divide-gray-200` (row separators)
- [ ] Table is wrapped in scrollable container with `overflow-auto`

**Check:** Can see all columns without horizontal scroll (if space allows)

---

#### Row Styling

```
Requirement: DS COMPONENT.TABLE.ROW
Location: <tr> elements in tbody
```

- [ ] Default row background is `bg-white` (not gray)
- [ ] Rows have `border-b border-gray-200` (via divide-y on table)
- [ ] Interactive rows have `hover:bg-blue-50` (via `hover:bg-blue-50`)
- [ ] Interactive rows have `cursor-pointer`
- [ ] Hover transition is smooth: `transition-colors`

**Check:** Hover a row - should fade to light blue, not jarring

---

#### Cell Styling

```
Requirement: DS COMPONENT.TABLE.CELL (density-dependent)
Location: <td> elements
```

**Compact (default):**

- [ ] Padding is `px-3 py-2`
- [ ] Font size is `text-xs`

**Comfortable:**

- [ ] Padding is `px-4 py-3`
- [ ] Font size is `text-sm`

**Dense:**

- [ ] Padding is `px-3 py-1.5`
- [ ] Font size is `text-xs`

**Check:** All cells in same density level use same padding/font

---

### Column Types & Alignment

#### Text Columns

- [ ] Left-aligned: `text-left`
- [ ] Text color: Primary (`text-gray-900`) or secondary (`text-gray-600`)
- [ ] No right-padding tricks

**Examples:** Patient name, medication name, description

---

#### Numeric Columns

- [ ] Right-aligned: `text-right`
- [ ] Use monospace font: `font-mono` (optional but recommended)
- [ ] Examples: PDC %, gap days, counts

**Check:** Numbers line up vertically on right edge

---

#### Badge Columns

- [ ] Centered alignment (natural with `inline-flex`)
- [ ] **Use -100/-700 pattern (NO border)** - see Badge.jsx
- [ ] Colors match status:
  - Passing: `bg-green-100 text-green-700`
  - At-risk: `bg-yellow-100 text-yellow-700`
  - Failing: `bg-red-100 text-red-700`
- [ ] Rounded style: `rounded` (not rounded-full)
- [ ] Font: `text-xs font-semibold`
- [ ] Padding: `px-2 py-0.5`
- [ ] Prefer Badge components: `<PDCBadge>`, `<MeasureBadge>`, etc.

**Check:** Badge uses consistent -100/-700 colors, no border

---

#### Action Columns

- [ ] Right-aligned: `text-right`
- [ ] Buttons are secondary variant (not primary)
- [ ] Button colors: `text-blue-700 bg-white border border-blue-300 hover:bg-blue-50`
- [ ] Button padding: `px-3 py-1.5` (fits compact), adjust for comfort/dense
- [ ] Button font: `text-xs font-medium`

**Check:** Buttons align to right edge, not too dark

---

### Density Toggle

#### Presence

- [ ] Show density toggle if table has > 20 rows
- [ ] Optional if < 20 rows
- [ ] Don't show in modals/sidebars (space constraint)

#### Styling

- [ ] Three buttons: comfortable, compact, dense
- [ ] Active button: `bg-blue-600 text-white`
- [ ] Inactive buttons: `bg-white text-gray-600 hover:bg-gray-100`
- [ ] Buttons bordered: `border border-gray-300`
- [ ] Icons match density (3 horizontal lines / 2 lines / 4 lines)

#### Functionality

- [ ] Clicking toggles density
- [ ] All cells update padding/font simultaneously
- [ ] No layout shift when switching densities
- [ ] Selected density persists (optional: localStorage)

**Check:** Click each density button, observe all cells change together

---

### Sorting (if applicable)

#### Sortable Headers

- [ ] Header has `cursor-pointer`
- [ ] Header has `hover:bg-gray-100` (visual feedback)
- [ ] Header is selectable: `select-none` (prevents text selection on click)
- [ ] Icon shows sort direction (up = asc, down = desc)
- [ ] Icon only shows when ACTIVE (not for every sortable column)
- [ ] Icon size matches header: `h-3 w-3` (for text-xs)
- [ ] Icon color: `text-gray-600` (not too dark)

#### Accessibility

- [ ] Sortable headers are focusable: `tabIndex={0}`
- [ ] Headers respond to Enter key: `onKeyDown`
- [ ] ARIA attribute: `aria-sort="ascending"` | `"descending"` | `"none"`
- [ ] `role="columnheader"` on all `<th>`

**Check:**

1. Click header - data should sort, icon should appear
2. Tab to header - should be focusable
3. Press Enter - should sort without clicking
4. Screen reader should announce "sortable" or similar

---

### Badges & Status Colors

#### PDC Badges (CRITICAL - AUTO-FAIL if wrong)

```
IF PDC >= 80%:
  Classes: bg-green-100 text-green-700 (NO border)
  Use: <PDCBadge pdc={85} />

IF PDC 60-79%:
  Classes: bg-yellow-100 text-yellow-700 (NO border)
  Use: <PDCBadge pdc={70} />

IF PDC < 60%:
  Classes: bg-red-100 text-red-700 (NO border)
  Use: <PDCBadge pdc={50} />
```

- [ ] Passing badge is bg-green-100 text-green-700
- [ ] At-risk badge is bg-yellow-100 text-yellow-700
- [ ] Failing badge is bg-red-100 text-red-700
- [ ] All badges use -100/-700 pattern (NO border)

**Severity:** CRITICAL - Passing badge wrong color = major audit violation

---

#### Measure Badges (MAC/MAD/MAH)

- [ ] MAC: `bg-blue-100 text-blue-800` (use `<MeasureBadge measure="MAC" />`)
- [ ] MAD: `bg-purple-100 text-purple-800` (use `<MeasureBadge measure="MAD" />`)
- [ ] MAH: `bg-pink-100 text-pink-800` (use `<MeasureBadge measure="MAH" />`)
- [ ] All use -100/-800 pattern (NO border), rounded styling

---

### Footer (if showing counts)

- [ ] Footer exists if table has > 0 rows
- [ ] Background: `bg-gray-50`
- [ ] Border top: `border-t border-gray-200`
- [ ] Text: `text-xs text-gray-600`
- [ ] Shows record count: "Showing X of Y records"
- [ ] Padding: `px-4 py-2.5` (matches table padding)

**Check:** Scroll table - footer should be visible at bottom

---

### Accessibility

#### Semantic Structure

- [ ] Uses `<table>` element (not divs)
- [ ] Uses `<thead>` for headers
- [ ] Uses `<tbody>` for data
- [ ] Uses `<tr>` for rows
- [ ] Uses `<th>` for column headers
- [ ] Uses `<td>` for data cells

#### ARIA Attributes

- [ ] `<th>` has `role="columnheader"`
- [ ] Sortable `<th>` has `aria-sort="ascending" | "descending" | "none"`
- [ ] `<tr>` has `role="row"` (optional, semantic)
- [ ] Icon-only buttons have `aria-label`
- [ ] Decorative icons have `aria-hidden="true"`

#### Keyboard Navigation

- [ ] Tab moves through sortable headers
- [ ] Enter/Space triggers sort on headers
- [ ] Tab moves through buttons
- [ ] No keyboard trap (can tab out)
- [ ] Focus visible: `focus:ring-2 focus:ring-blue-500`

#### Screen Reader Support

- [ ] Column headers announce clearly
- [ ] Action buttons have descriptive labels: "Review Patient" not "Review"
- [ ] Empty state message is announced
- [ ] Sort order is announced via `aria-sort`

#### Visual Accessibility

- [ ] Color not only indicator of status (text + color + icon)
- [ ] Text contrast >= 4.5:1 (WCAG AA)
- [ ] Icons are >= 3x3 (not tiny)
- [ ] Focus indicator is visible (not invisible)

**Check:**

1. Tab through table - can reach all interactive elements
2. Use screen reader - should announce column headers, row count, etc.
3. Use keyboard only - can sort and click actions

---

### Empty & Loading States

#### Empty State

- [ ] Shows when 0 results
- [ ] Message is clear: "No patients found"
- [ ] Spans all columns: `colSpan="6"` (or actual column count)
- [ ] Centered text: `text-center`
- [ ] Adequate padding: `py-8` or more

#### Loading State

- [ ] Shows while fetching
- [ ] Skeleton rows or spinner
- [ ] Doesn't break layout
- [ ] Text indicates loading: "Loading..." or similar

---

### Performance

#### Large Tables (>100 rows)

- [ ] Table scrolls smoothly (not janky)
- [ ] Sticky header doesn't cause layout shift
- [ ] Density toggle doesn't re-render all rows
- [ ] Consider virtualization (if >1000 rows)

#### Column Widths

- [ ] Columns don't collapse unexpectedly
- [ ] Content doesn't overflow
- [ ] Text wraps appropriately (no overflow hidden)

---

### Mobile Responsiveness (if applicable)

- [ ] Table horizontal scrolls on small screens
- [ ] OR columns hide intelligently (lower priority first)
- [ ] OR table switches to card view on mobile
- [ ] Density toggle still works
- [ ] Buttons are touch-sized (>44px tall)

---

## Severity Levels

### CRITICAL (Auto-Fail) - Stop & Fix Before PR

- [ ] PDC badge colors wrong (must use -100/-700 pattern)
- [ ] Header not sticky (must be sticky top-0)
- [ ] Badges using old -50/-200 pattern with borders (use -100/-700, NO border)
- [ ] Uses non-semantic HTML (must use `<table>`, `<thead>`, etc.)
- [ ] No `aria-sort` on sortable headers
- [ ] Color as only status indicator (must have text too)

### MAJOR (Flag in Review)

- [ ] Cell padding inconsistent across density levels
- [ ] Header background wrong shade of gray
- [ ] Hover state missing on interactive rows
- [ ] Keyboard navigation broken
- [ ] Contrast ratio < 4.5:1 for text

### MINOR (Nice to Have)

- [ ] Icon alignment slightly off
- [ ] Spacing could be tighter
- [ ] Alternative sorting icon style
- [ ] Extra visual polish

---

## How to Run This Checklist

### Before Submitting PR

1. Open the page with the new/modified table
2. Go through "Quick 5-Minute Checklist" first
3. If anything fails, check "Detailed Checklist" for that category
4. Note all failures with line numbers and component names
5. Fix and retest
6. All CRITICAL items must pass

### During Code Review

1. Screenshot the table
2. Compare visually against existing tables
3. Run this checklist on code review
4. Check if design system IDs are referenced in code
5. Verify accessibility attributes are present

### During UI Audit

1. Run checklist against ALL tables in app
2. Document violations by page and component
3. Create issues for any design system gaps
4. Track remediation in sprint planning

---

## Checklist Template (Copy-Paste for Issues)

```markdown
## Table QA Checklist - [TABLE_NAME]

**File:** [file path]
**Lines:** [start-end]
**Status:** [ ] PASS [ ] FAIL

### Quick Check

- [ ] Header styling correct
- [ ] Row hover correct
- [ ] Cell padding correct
- [ ] Badges use -100/-700 (no border)
- [ ] Semantic HTML
- [ ] Accessibility complete

### Results

[List any failures here with specific issues]

**Severity:** [ ] CRITICAL [ ] MAJOR [ ] MINOR
```

---

## References

- [Table Implementation Guide](./TABLE_IMPLEMENTATION_GUIDE.md)
- [UI Design System](./UI/UI_DESIGN_SYSTEM.md)
- [Consistency Analysis](./TABLE_CONSISTENCY_ANALYSIS.md)

**Version:** 1.1
**Last Updated:** December 8, 2025
