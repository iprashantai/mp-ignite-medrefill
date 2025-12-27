# UI Audit Guide

**Last Updated:** December 8, 2025
**Purpose:** Complete guide for conducting UI audits
**Design System:** See `UI_DESIGN_SYSTEM.md` (single source of truth)
**Output:** Save results to `audit-results/AUDIT_YYYY-MM-DD.md`

---

## Table of Contents

1. [Quick Audit (15 min)](#1-quick-audit-15-min)
2. [Full Audit Process](#2-full-audit-process)
3. [Heuristics Checklist](#3-heuristics-checklist)
4. [Page Checklists](#4-page-checklists)
5. [Audit Output Template](#5-audit-output-template)

---

## Auditor Principles

1. **Design System First** - Every finding must reference a DS ID
2. **No Personal Opinions** - If no DS rule exists, it's a "DS Gap" not a bug
3. **Consistency Over Preference** - Match existing patterns

---

# 1. Quick Audit (15 min)

Use for weekly spot checks and PR reviews.

## Scorecard

| Category            | Score (1-5) | Auto-Fail? |
| ------------------- | ----------- | ---------- |
| Loading States      |             |            |
| Status Colors       |             |            |
| Components          |             |            |
| Typography          |             |            |
| Spacing             |             |            |
| Hover States        |             |            |
| Accessibility       |             |            |
| Healthcare-Specific |             |            |

**Total: \_\_\_/40** (Pass: 32+)

## Quick Checklist

### Loading States `[FUNCTIONAL]`

- [ ] Async operations show spinners/skeletons
- [ ] Buttons show processing state
- **Auto-Fail:** No loading on operations >500ms

### Status Colors `[DS]` `[HEALTHCARE]`

- [ ] PDC ≥80%: green — `HEALTHCARE.PDC.PASSING`
- [ ] PDC 60-79%: amber — `HEALTHCARE.PDC.AT_RISK`
- [ ] PDC <60%: red — `HEALTHCARE.PDC.FAILING`
- [ ] Fragility tiers correct — `HEALTHCARE.TIER.*`
- **Auto-Fail:** Wrong semantic color

### Components `[DS]`

- [ ] Primary buttons: blue-600 — `COMPONENT.BUTTON.PRIMARY`
- [ ] Badges use -100/-700 pattern (no border) — `COMPONENT.BADGE.*`
- [ ] Cards: white bg, gray-200 border — `COMPONENT.CARD.DEFAULT`
- **Auto-Fail:** Inconsistent component styling

### Typography `[VISUAL]`

- [ ] Clear hierarchy (title > section > body)
- [ ] Table headers: uppercase, tracking-wider — `TYPE.COMBO.TABLE_HEADER`
- [ ] Content text uses `text-gray-700` minimum (not gray-600 or lighter)
- [ ] Labels/secondary text uses `text-gray-500` minimum (not gray-400 or lighter)
- [ ] Check for text WITHOUT explicit color class (inherits and may be too light)
- **Auto-Fail:** Mixed gray/slate on same page
- **Auto-Fail:** Content text lighter than gray-700

### Spacing `[VISUAL]`

- [ ] 4px/8px grid followed — `SPACE.*`
- [ ] Elements aligned
- **Auto-Fail:** Visible misalignment

### Hover States `[FUNCTIONAL]`

- [ ] All buttons have hover
- [ ] Clickable rows have hover
- **Auto-Fail:** Clickable element without hover

### Accessibility `[A11Y]`

- [ ] Text contrast ≥ 4.5:1
- [ ] Focus indicators visible
- **Auto-Fail:** Contrast < 4.5:1

### Healthcare-Specific `[HEALTHCARE]`

- [ ] Patient context in drawer headers — `HEALTHCARE.PATIENT.CONTEXT_HEADER`
- [ ] Days to runout color-coded — `HEALTHCARE.RUNOUT.*`
- **Auto-Fail:** Missing patient context in review

---

# 2. Full Audit Process

## Steps

1. **Define Scope** - Which pages/components?
2. **Run Heuristics** - Score Nielsen's 10 (Section 3)
3. **Check Pages** - Use page checklists (Section 4)
4. **Document Findings** - Every issue needs DS reference
5. **Generate Report** - Use template (Section 5)

## Scoring

| Category   | Max     | Source      |
| ---------- | ------- | ----------- |
| Heuristics | 50      | Section 3   |
| Pages      | 25      | Section 4   |
| Visual/DS  | 25      | Quick Audit |
| **Total**  | **100** |             |

**Thresholds:** 90+ Ship | 80-89 Minor fixes | 60-79 Fix first | <60 Block

## Severity Levels

| Level        | Definition                         | Response        |
| ------------ | ---------------------------------- | --------------- |
| **Critical** | Blocks user, wrong healthcare data | Fix now         |
| **Major**    | Significant UX/visual issue        | This sprint     |
| **Minor**    | Small deviation                    | When convenient |
| **DS Gap**   | No spec exists                     | Add to DS first |

---

# 3. Heuristics Checklist

Score each 1-5 (5=excellent, 1=critical issues). Any ≤3 needs remediation.

## 1. Visibility of System Status — Score: \_\_/5

- [ ] Loading states for async ops — `PATTERN.LOADING.*`
- [ ] Success/error feedback (toasts)
- [ ] Batch processing status visible
- [ ] AI decision states clear

## 2. Match System & Real World — Score: \_\_/5

- [ ] Healthcare terminology correct
- [ ] No unexplained jargon
- [ ] Dates formatted consistently
- [ ] CMS measures labeled (MAC, MAD, MAH)

## 3. User Control & Freedom — Score: \_\_/5

- [ ] Cancel/close on all modals
- [ ] Escape closes drawers
- [ ] Clear filters easily
- [ ] Undo or confirm destructive actions

## 4. Consistency & Standards — Score: \_\_/5

- [ ] Same action = same appearance
- [ ] Terminology consistent
- [ ] Colors mean same thing everywhere
- [ ] Components look identical across pages

## 5. Error Prevention — Score: \_\_/5

- [ ] Confirmation for destructive actions
- [ ] Input validation before submit
- [ ] Disabled states prevent invalid actions

## 6. Recognition vs Recall — Score: \_\_/5

- [ ] Patient context visible in headers — `HEALTHCARE.PATIENT.CONTEXT_HEADER`
- [ ] Filters show applied values
- [ ] Labels visible (not just icons)

## 7. Flexibility & Efficiency — Score: \_\_/5

- [ ] Keyboard shortcuts work (A/D/Esc)
- [ ] Density options available
- [ ] Quick filters for common scenarios
- [ ] Table sorting works

## 8. Aesthetic & Minimalist — Score: \_\_/5

- [ ] No clutter
- [ ] Clear hierarchy
- [ ] Critical info prominent (PDC, runout)
- [ ] AI rationale expandable, not overwhelming

## 9. Error Recovery — Score: \_\_/5

- [ ] Error messages human-readable
- [ ] Errors suggest solution
- [ ] Recovery path clear

## 10. Help & Documentation — Score: \_\_/5

- [ ] Tooltips for complex features
- [ ] Help text near confusing inputs
- [ ] PDC calculation explained somewhere

**Heuristics Total: \_\_/50**

---

# 4. Page Checklists

Score each page 1-5.

## Batch Detail Page — Score: \_\_/5

**File:** `src/pages/BatchDetailPageV2.jsx`

- [ ] Back button visible
- [ ] Quick filters as pills, active=blue
- [ ] Table: sticky header, sortable, hover states
- [ ] Status cells color-coded correctly
- [ ] Review Drawer:
  - [ ] Blue accent border
  - [ ] Patient info header (name, MRN, DOB)
  - [ ] Medication details row
  - [ ] Approve/Deny buttons
  - [ ] Keyboard shortcuts (A, D, Esc)

## Patient Lookup Page — Score: \_\_/5

**File:** `src/pages/PatientLookupSimple.jsx`

- [ ] Search input styled correctly
- [ ] Filter cards collapsible
- [ ] Filter pills with counts
- [ ] Results table matches Batch Detail styling
- [ ] Empty state handled

## Patient Detail Page — Score: \_\_/5

**File:** `src/pages/PatientDetailPage.jsx`

- [ ] Back navigation
- [ ] Patient name prominent
- [ ] Demographics cards consistent
- [ ] Multi-medication table with PDC colors
- [ ] Gap days visible
- [ ] Timeline clear with legend

## Refill Worklist — Score: \_\_/5

**File:** `src/pages/RefillWorklist.jsx`

- [ ] Tier filters with correct colors (F1=red → F5=green)
- [ ] Patient queue table consistent
- [ ] Salvageable callout styled

## All Patients CRM — Score: \_\_/5

**File:** `src/pages/AllPatientsCRM.jsx`

- [ ] Population overview bar
- [ ] Strategic filters working
- [ ] Bulk action toolbar
- [ ] Table consistent with others

**Pages Total: \_\_/25**

---

# 5. Audit Output Template

Copy to `audit-results/AUDIT_YYYY-MM-DD.md`:

```markdown
# UI Audit Results

**Date:** YYYY-MM-DD
**Auditor:** [Name]
**Scope:** [Full / Specific pages]

## Summary

| Category   | Score    |
| ---------- | -------- |
| Heuristics | /50      |
| Pages      | /25      |
| Visual/DS  | /25      |
| **Total**  | **/100** |

**Issues:** X Critical, X Major, X Minor
**Recommendation:** [Ship / Fix first / Block]

## Critical Issues

### C1: [Description]

- **Location:** `file.jsx:line`
- **Current:** [What it is]
- **Expected:** [What it should be]
- **DS Ref:** `UI_DESIGN_SYSTEM.md#[ID]`
- **Fix:** [How to fix]

## Major Issues

### M1: [Description]

- **Location:**
- **DS Ref:**
- **Fix:**

## Minor Issues

### m1: [Description]

- **Location:**
- **Fix:**

## DS Gaps Found

### DSG1: [Missing spec]

- **Context:** [Where needed]
- **Proposed:** [What to add to DS]

## Remediation Checklist

### Critical (Fix Now)

- [ ] C1: [Task] — `file.jsx`

### Major (This Sprint)

- [ ] M1: [Task] — `file.jsx`

### Minor (When Convenient)

- [ ] m1: [Task]

## Files to Change

| File              | Issues |
| ----------------- | ------ |
| `src/pages/X.jsx` | C1, M2 |

---

**Next Audit:** [Date]
```

---

## Auto-Fail Reference

These fail the audit regardless of score:

| Rule                               | DS Reference                        |
| ---------------------------------- | ----------------------------------- |
| Primary CTA not blue-600           | `COLOR.PRIMARY.DEFAULT`             |
| Wrong PDC colors                   | `HEALTHCARE.PDC.*`                  |
| Wrong tier colors                  | `HEALTHCARE.TIER.*`                 |
| Missing patient context            | `HEALTHCARE.PATIENT.CONTEXT_HEADER` |
| No button hover                    | `COMPONENT.BUTTON.*`                |
| Badges not using -100/-700 pattern | `COMPONENT.BADGE.*`                 |
| Contrast < 4.5:1                   | `BORDER.FOCUS`                      |

---

## DS Reference Cheat Sheet

```
Colors:
  COLOR.PRIMARY.DEFAULT     → blue-600
  COLOR.STATUS.SUCCESS      → green-500
  COLOR.STATUS.WARNING      → amber-500/yellow-500
  COLOR.STATUS.DANGER       → red-500

Components:
  COMPONENT.BUTTON.PRIMARY  → blue-600, rounded-lg, hover:blue-700
  COMPONENT.BADGE.*         → bg-{color}-100 text-{color}-700 (NO border)
  COMPONENT.TABLE.HEADER    → gray-50, sticky, uppercase

Badges (canonical pattern - NO borders):
  pass/success              → bg-green-100 text-green-700
  caution/warning           → bg-yellow-100 text-yellow-700
  fail/error                → bg-red-100 text-red-700
  MAC/MAD/MAH               → bg-{blue/purple/pink}-100 text-{}-800

Healthcare:
  HEALTHCARE.PDC.PASSING    → green (≥80%)
  HEALTHCARE.PDC.AT_RISK    → yellow (60-79%)
  HEALTHCARE.PDC.FAILING    → red (<60%)
  HEALTHCARE.TIER.F1-T5     → red→orange→yellow→blue→green→gray
  HEALTHCARE.PATIENT.CONTEXT_HEADER → Required in all review flows
```

---

## Typography Audit Procedure

Typography issues are easy to miss because text may look "okay" but fail contrast requirements. Use this systematic approach:

### 1. Search for Explicit Light Text (Code Search)

```bash
# Find text-gray-300 (too light for any content)
grep -rn "text-gray-300" src/ --include="*.jsx" | grep -v "Icon\|svg\|separator\||"

# Find text-gray-400 (only for placeholders, not content)
grep -rn "text-gray-400" src/ --include="*.jsx" | grep -v "Icon\|svg\|placeholder"

# Find text-gray-600 (should be gray-700 for content)
grep -rn "text-gray-600" src/ --include="*.jsx"
```

### 2. Search for Missing Color Classes (CRITICAL)

Text without explicit color class inherits from parent or browser default - often too light:

```bash
# Find text-xs without color (common pattern)
grep -rn "text-xs\">" src/ --include="*.jsx"

# Find text-sm without color
grep -rn "text-sm\">" src/ --include="*.jsx"

# Find spans with just size classes
grep -rn "className=\"text-" src/ --include="*.jsx" | grep -v "text-gray\|text-blue\|text-red\|text-green\|text-amber\|text-orange"
```

### 3. Visual Spot Check

Run the app and visually scan each page for:

- Text that looks faded or washed out
- Labels that are hard to read
- Table cell content that's too light
- Legend/key items without enough contrast

### 4. Typography Color Rules

| Text Type            | Minimum Color   | Common Mistakes   |
| -------------------- | --------------- | ----------------- | --- |
| Body text / Content  | `text-gray-700` | Using gray-600    |
| Labels / Row labels  | `text-gray-700` | Using gray-600    |
| Secondary / Muted    | `text-gray-500` | Using gray-400    |
| Placeholder only     | `text-gray-400` | Using for content |
| Titles / Headers     | `text-gray-900` | —                 |
| Em-dash placeholders | `text-gray-400` | OK                |
| Icons                | `text-gray-400` | OK                |
| Separators (         | , •)            | `text-gray-300`   | OK  |

### 5. Common Problem Areas

- **Table row labels** (left column of key-value tables)
- **Drawer/modal content** text
- **Legend items** in charts or color keys
- **Loading state** messages
- **Empty state** descriptions
- **Form field labels** and helper text
- **Card metadata** (dates, counts, etc.)

### 6. Fix Pattern

```jsx
// BAD - too light
<span className="text-xs text-gray-600">Label</span>
<span className="text-xs">No color specified</span>

// GOOD - readable
<span className="text-xs text-gray-700">Label</span>
```

---

_All findings must reference `UI_DESIGN_SYSTEM.md`_
