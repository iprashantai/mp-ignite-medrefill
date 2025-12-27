# Ignite MedRefills Design System

**Last Updated:** December 8, 2025
**Status:** Active - Single Source of Truth
**Purpose:** Authoritative specification for all UI elements. Auditors MUST reference this document.

---

## How to Use This Document

This is the **single source of truth** for UI design decisions. Every audit finding must reference a specific ID from this document.

**Format:** `UI_DESIGN_SYSTEM.md#CATEGORY.SUBCATEGORY.ITEM`

**Example:** `UI_DESIGN_SYSTEM.md#COLOR.STATUS.SUCCESS`

If you find a UI issue that doesn't map to an ID here, it's either:

1. Not a real issue (personal preference), OR
2. A gap in this document that needs to be added first

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
   - [Colors](#colors)
   - [Typography](#typography)
   - [Spacing](#spacing)
   - [Borders & Shadows](#borders--shadows)
2. [Components](#2-components)
   - [Buttons](#buttons)
   - [Badges](#badges)
   - [Cards](#cards)
   - [Tables](#tables)
   - [Forms](#forms)
   - [Modals & Drawers](#modals--drawers)
3. [Patterns](#3-patterns)
   - [Page Headers](#page-headers)
   - [Loading States](#loading-states)
   - [Empty States](#empty-states)
   - [Error States](#error-states)
4. [Healthcare-Specific](#4-healthcare-specific)
   - [PDC Status](#pdc-status)
   - [Fragility Tiers](#fragility-tiers)
   - [Days to Runout](#days-to-runout)
   - [Patient Context](#patient-context)
5. [Change Log](#5-change-log)

---

## 1. Design Tokens

### Colors

#### Primary Brand

| ID                      | Name          | Tailwind   | Hex       | Usage                       |
| ----------------------- | ------------- | ---------- | --------- | --------------------------- |
| `COLOR.PRIMARY.DEFAULT` | Primary       | `blue-600` | `#2563EB` | Primary CTAs, active states |
| `COLOR.PRIMARY.HOVER`   | Primary Hover | `blue-700` | `#1D4ED8` | Button hover                |
| `COLOR.PRIMARY.LIGHT`   | Primary Light | `blue-100` | `#DBEAFE` | Active chip bg, selection   |
| `COLOR.PRIMARY.TINT`    | Primary Tint  | `blue-50`  | `#EFF6FF` | Hover backgrounds           |

#### Status Colors

| ID                            | Name               | Tailwind    | Hex       | Usage                       |
| ----------------------------- | ------------------ | ----------- | --------- | --------------------------- |
| `COLOR.STATUS.SUCCESS`        | Success            | `green-500` | `#22C55E` | Passing, approved, positive |
| `COLOR.STATUS.SUCCESS_BG`     | Success Background | `green-50`  | `#ECFDF5` | Success badge bg            |
| `COLOR.STATUS.SUCCESS_BORDER` | Success Border     | `green-200` | `#BBF7D0` | Success badge border        |
| `COLOR.STATUS.WARNING`        | Warning            | `amber-500` | `#F59E0B` | At-risk, caution            |
| `COLOR.STATUS.WARNING_BG`     | Warning Background | `amber-50`  | `#FFFBEB` | Warning badge bg            |
| `COLOR.STATUS.WARNING_BORDER` | Warning Border     | `amber-200` | `#FDE68A` | Warning badge border        |
| `COLOR.STATUS.DANGER`         | Danger             | `red-500`   | `#EF4444` | Failing, error, urgent      |
| `COLOR.STATUS.DANGER_BG`      | Danger Background  | `red-50`    | `#FEF2F2` | Danger badge bg             |
| `COLOR.STATUS.DANGER_BORDER`  | Danger Border      | `red-200`   | `#FECACA` | Danger badge border         |
| `COLOR.STATUS.INFO`           | Info               | `blue-500`  | `#3B82F6` | Informational               |
| `COLOR.STATUS.INFO_BG`        | Info Background    | `blue-50`   | `#EFF6FF` | Info badge bg               |

#### Neutral Colors

| ID                  | Name              | Tailwind   | Hex       | Usage                       |
| ------------------- | ----------------- | ---------- | --------- | --------------------------- |
| `COLOR.NEUTRAL.900` | Text Primary      | `gray-900` | `#111827` | Headings, primary text      |
| `COLOR.NEUTRAL.700` | Text Secondary    | `gray-700` | `#374151` | Body text                   |
| `COLOR.NEUTRAL.500` | Text Muted        | `gray-500` | `#6B7280` | Secondary labels            |
| `COLOR.NEUTRAL.400` | Text Placeholder  | `gray-400` | `#9CA3AF` | Placeholders                |
| `COLOR.NEUTRAL.300` | Border Default    | `gray-300` | `#D1D5DB` | Input borders               |
| `COLOR.NEUTRAL.200` | Border Light      | `gray-200` | `#E5E7EB` | Card borders, dividers      |
| `COLOR.NEUTRAL.100` | Background Hover  | `gray-100` | `#F3F4F6` | Hover states                |
| `COLOR.NEUTRAL.50`  | Background Subtle | `gray-50`  | `#F9FAFB` | Table headers, card headers |

---

### Typography

#### Font Sizes

| ID               | Name        | Tailwind    | Size | Usage                      |
| ---------------- | ----------- | ----------- | ---- | -------------------------- |
| `TYPE.SIZE.XL`   | Extra Large | `text-xl`   | 20px | Page titles                |
| `TYPE.SIZE.LG`   | Large       | `text-lg`   | 18px | Section titles             |
| `TYPE.SIZE.BASE` | Base        | `text-base` | 16px | Large body text            |
| `TYPE.SIZE.SM`   | Small       | `text-sm`   | 14px | Body text, buttons         |
| `TYPE.SIZE.XS`   | Extra Small | `text-xs`   | 12px | Labels, badges, table text |

#### Font Weights

| ID                     | Name     | Tailwind        | Weight | Usage             |
| ---------------------- | -------- | --------------- | ------ | ----------------- |
| `TYPE.WEIGHT.BOLD`     | Bold     | `font-bold`     | 700    | Strong emphasis   |
| `TYPE.WEIGHT.SEMIBOLD` | Semibold | `font-semibold` | 600    | Headings, buttons |
| `TYPE.WEIGHT.MEDIUM`   | Medium   | `font-medium`   | 500    | Labels, emphasis  |
| `TYPE.WEIGHT.NORMAL`   | Normal   | `font-normal`   | 400    | Body text         |

#### Typography Combinations

| ID                         | Tailwind Classes                                               | Usage                |
| -------------------------- | -------------------------------------------------------------- | -------------------- |
| `TYPE.COMBO.PAGE_TITLE`    | `text-xl font-semibold text-gray-900`                          | Page titles          |
| `TYPE.COMBO.SECTION_TITLE` | `text-lg font-semibold text-gray-900`                          | Section headings     |
| `TYPE.COMBO.CARD_TITLE`    | `text-sm font-semibold text-gray-700`                          | Card headers         |
| `TYPE.COMBO.TABLE_HEADER`  | `text-xs font-semibold text-gray-700 uppercase tracking-wider` | Table column headers |
| `TYPE.COMBO.BODY`          | `text-sm text-gray-700`                                        | Body text            |
| `TYPE.COMBO.LABEL`         | `text-xs font-medium text-gray-500`                            | Field labels         |

---

### Spacing

#### Spacing Scale (8px Base)

| ID          | Name     | Tailwind | Value | Common Usage               |
| ----------- | -------- | -------- | ----- | -------------------------- |
| `SPACE.1`   | Tiny     | `1`      | 4px   | Icon gaps                  |
| `SPACE.1.5` | X-Small  | `1.5`    | 6px   | Badge padding              |
| `SPACE.2`   | Small    | `2`      | 8px   | Small gaps, tight padding  |
| `SPACE.3`   | Medium   | `3`      | 12px  | Standard gaps              |
| `SPACE.4`   | Large    | `4`      | 16px  | Card padding, section gaps |
| `SPACE.5`   | X-Large  | `5`      | 20px  | Large padding              |
| `SPACE.6`   | 2X-Large | `6`      | 24px  | Section spacing            |
| `SPACE.8`   | 3X-Large | `8`      | 32px  | Major section breaks       |

#### Common Spacing Patterns

| ID                                     | Tailwind             | Usage                  |
| -------------------------------------- | -------------------- | ---------------------- |
| `SPACE.PATTERN.CARD_PADDING`           | `p-4` or `px-4 py-3` | Card content padding   |
| `SPACE.PATTERN.BUTTON_PADDING_SM`      | `px-3 py-1.5`        | Small button           |
| `SPACE.PATTERN.BUTTON_PADDING_MD`      | `px-4 py-2`          | Medium button          |
| `SPACE.PATTERN.TABLE_CELL_COMPACT`     | `px-3 py-2`          | Compact table cell     |
| `SPACE.PATTERN.TABLE_CELL_COMFORTABLE` | `px-4 py-3`          | Comfortable table cell |
| `SPACE.PATTERN.FLEX_GAP_SM`            | `gap-2`              | Small flex gap         |
| `SPACE.PATTERN.FLEX_GAP_MD`            | `gap-3`              | Medium flex gap        |
| `SPACE.PATTERN.SECTION_MARGIN`         | `mb-4` or `mb-6`     | Between sections       |

---

### Borders & Shadows

#### Border Radius

| ID            | Name        | Tailwind       | Value  | Usage                 |
| ------------- | ----------- | -------------- | ------ | --------------------- |
| `RADIUS.NONE` | None        | `rounded-none` | 0      | -                     |
| `RADIUS.SM`   | Small       | `rounded`      | 4px    | Small elements        |
| `RADIUS.MD`   | Medium      | `rounded-md`   | 6px    | Inputs, small buttons |
| `RADIUS.LG`   | Large       | `rounded-lg`   | 8px    | Buttons, cards        |
| `RADIUS.XL`   | Extra Large | `rounded-xl`   | 12px   | Large cards           |
| `RADIUS.FULL` | Full        | `rounded-full` | 9999px | Pills, chips, avatars |

#### Shadows

| ID            | Name   | Tailwind      | Usage                         |
| ------------- | ------ | ------------- | ----------------------------- |
| `SHADOW.NONE` | None   | `shadow-none` | Flat elements                 |
| `SHADOW.SM`   | Small  | `shadow-sm`   | Cards, default elevation      |
| `SHADOW.MD`   | Medium | `shadow-md`   | Elevated cards                |
| `SHADOW.LG`   | Large  | `shadow-lg`   | Modals, drawers, hover states |

#### Borders

| ID               | Tailwind                   | Usage             |
| ---------------- | -------------------------- | ----------------- |
| `BORDER.DEFAULT` | `border border-gray-200`   | Cards, containers |
| `BORDER.INPUT`   | `border border-gray-300`   | Form inputs       |
| `BORDER.FOCUS`   | `ring-2 ring-blue-500`     | Focus state       |
| `BORDER.DIVIDER` | `border-b border-gray-200` | Section dividers  |

---

## 2. Components

### Buttons

#### COMPONENT.BUTTON.PRIMARY

**Purpose:** Primary call-to-action

```
Classes: bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm
         hover:bg-blue-700 transition-colors
Disabled: opacity-50 cursor-not-allowed
Loading: Shows spinner, disabled state
```

**Token References:** `COLOR.PRIMARY.DEFAULT`, `COLOR.PRIMARY.HOVER`, `RADIUS.LG`, `SPACE.PATTERN.BUTTON_PADDING_MD`

#### COMPONENT.BUTTON.SECONDARY

**Purpose:** Secondary actions

```
Classes: bg-white text-gray-700 px-4 py-2 rounded-lg font-medium text-sm
         border border-gray-300 hover:bg-gray-50 transition-colors
```

**Token References:** `COLOR.NEUTRAL.700`, `COLOR.NEUTRAL.300`, `RADIUS.LG`

#### COMPONENT.BUTTON.DANGER

**Purpose:** Destructive actions

```
Classes: bg-red-600 text-white px-4 py-2 rounded-lg font-medium text-sm
         hover:bg-red-700 transition-colors
```

**Token References:** `COLOR.STATUS.DANGER`, `RADIUS.LG`

#### COMPONENT.BUTTON.GHOST

**Purpose:** Subtle/tertiary actions

```
Classes: text-gray-700 px-4 py-2 rounded-lg font-medium text-sm
         hover:bg-gray-100 transition-colors
```

**Token References:** `COLOR.NEUTRAL.700`, `COLOR.NEUTRAL.100`, `RADIUS.LG`

---

### Badges

**Design Pattern:** All badges follow the `-100/-700` color pattern (NO border).
See `src/components/ui/Badge/Badge.jsx` and `src/pages/UIReview.jsx` for canonical implementation.

#### COMPONENT.BADGE.SUCCESS

**Purpose:** Positive status indicator (pass, approve, safe)

```
Classes: inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
         bg-green-100 text-green-700
```

**Token References:** `COLOR.STATUS.SUCCESS`, `RADIUS.SM`

#### COMPONENT.BADGE.WARNING

**Purpose:** Caution/at-risk indicator

```
Classes: inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
         bg-yellow-100 text-yellow-700
```

**Token References:** `COLOR.STATUS.WARNING`

#### COMPONENT.BADGE.DANGER

**Purpose:** Error/failing indicator (fail, deny, critical)

```
Classes: inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
         bg-red-100 text-red-700
```

**Token References:** `COLOR.STATUS.DANGER`

#### COMPONENT.BADGE.INFO

**Purpose:** Informational indicator

```
Classes: inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
         bg-blue-100 text-blue-700
```

#### COMPONENT.BADGE.NEUTRAL

**Purpose:** Neutral/default indicator

```
Classes: inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
         bg-gray-100 text-gray-600
```

---

### Cards

#### COMPONENT.CARD.DEFAULT

**Purpose:** Standard content container

```
Classes: bg-white border border-gray-200 rounded-lg shadow-sm
```

**Token References:** `COLOR.NEUTRAL.200`, `RADIUS.LG`, `SHADOW.SM`

#### COMPONENT.CARD.HEADER

**Purpose:** Card header section

```
Classes: px-4 py-3 border-b border-gray-200 bg-gray-50
Title:   text-sm font-semibold text-gray-700
```

**Token References:** `COLOR.NEUTRAL.50`, `BORDER.DIVIDER`, `TYPE.COMBO.CARD_TITLE`

#### COMPONENT.CARD.CONTENT

**Purpose:** Card body section

```
Classes: p-4
```

**Token References:** `SPACE.PATTERN.CARD_PADDING`

---

### Tables

#### COMPONENT.TABLE.CONTAINER

**Purpose:** Table wrapper

```
Classes: min-w-full divide-y divide-gray-200
```

#### COMPONENT.TABLE.HEADER

**Purpose:** Table header row

```
Container: bg-gray-50 sticky top-0
Cell:      px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider
```

**Token References:** `COLOR.NEUTRAL.50`, `TYPE.COMBO.TABLE_HEADER`

#### COMPONENT.TABLE.ROW

**Purpose:** Table body row

```
Default:  bg-white border-b border-gray-200
Hover:    hover:bg-blue-50 transition-colors cursor-pointer
Selected: bg-blue-50 border-l-4 border-blue-500
```

**Token References:** `COLOR.PRIMARY.TINT`

#### COMPONENT.TABLE.CELL

**Purpose:** Table body cell

```
Compact:     px-3 py-2 text-xs
Comfortable: px-4 py-3 text-sm
```

---

### Tabs

#### COMPONENT.TABS.CONTAINER

**Purpose:** Tab navigation container

```
Classes: flex gap-1 border-b border-gray-200
```

**Token References:** `BORDER.DIVIDER`, `SPACE.PATTERN.FLEX_GAP_SM`

#### COMPONENT.TABS.TAB

**Purpose:** Individual tab button

```
Base:     px-4 py-2 text-sm font-medium transition-colors border-b-2
Active:   border-blue-500 text-blue-600 bg-white
Inactive: border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300
```

**Token References:** `COLOR.PRIMARY.DEFAULT`, `COLOR.NEUTRAL.500`

#### COMPONENT.TABS.TAB_PANEL

**Purpose:** Tab content panel

```
Classes: pt-4
```

**Token References:** `SPACE.4`

---

### Forms

#### COMPONENT.INPUT.DEFAULT

**Purpose:** Text input field

```
Classes: w-full px-3 py-2 border border-gray-300 rounded-md text-sm
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
         placeholder:text-gray-400
```

**Token References:** `COLOR.NEUTRAL.300`, `RADIUS.MD`, `BORDER.FOCUS`

#### COMPONENT.INPUT.ERROR

**Purpose:** Input with error state

```
Classes: w-full px-3 py-2 border border-red-500 rounded-md text-sm
         focus:outline-none focus:ring-2 focus:ring-red-500
Error text: text-red-600 text-sm mt-1
```

#### COMPONENT.INPUT.LABEL

**Purpose:** Form field label

```
Classes: block text-sm font-medium text-gray-700 mb-1
```

**Token References:** `TYPE.COMBO.LABEL`

---

### Modals & Drawers

#### COMPONENT.MODAL.OVERLAY

**Purpose:** Background overlay

```
Classes: fixed inset-0 bg-black/50
```

#### COMPONENT.MODAL.CONTAINER

**Purpose:** Modal content container

```
Classes: bg-white rounded-lg shadow-lg max-w-md w-full mx-auto
```

**Token References:** `RADIUS.LG`, `SHADOW.LG`

#### COMPONENT.DRAWER.BOTTOM

**Purpose:** Bottom-docked panel (Review Drawer)

```
Container: bg-white rounded-lg shadow-lg border-2 border-blue-500
Drag Handle: h-2 bg-gradient-to-r from-blue-500 to-blue-600 cursor-ns-resize
```

**Token References:** `COLOR.PRIMARY.DEFAULT`, `SHADOW.LG`

---

## 3. Patterns

### Page Headers

#### PATTERN.HEADER.PAGE

**Purpose:** Standard page header layout

```jsx
<div className="mb-6 border-b border-gray-200 pb-4">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-xl font-semibold text-gray-900">[Page Title]</h1>
      <p className="mt-1 text-sm text-gray-500">[Optional description]</p>
    </div>
    <div className="flex gap-2">[Action buttons]</div>
  </div>
</div>
```

**Token References:** `TYPE.COMBO.PAGE_TITLE`, `BORDER.DIVIDER`, `SPACE.PATTERN.FLEX_GAP_SM`

---

### Loading States

#### PATTERN.LOADING.SPINNER

**Purpose:** Inline loading indicator

```jsx
<svg className="h-5 w-5 animate-spin text-blue-600" viewBox="0 0 24 24">
  <circle
    className="opacity-25"
    cx="12"
    cy="12"
    r="10"
    stroke="currentColor"
    strokeWidth="4"
    fill="none"
  />
  <path
    className="opacity-75"
    fill="currentColor"
    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
  />
</svg>
```

#### PATTERN.LOADING.SKELETON

**Purpose:** Content placeholder

```jsx
<div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
```

**Token References:** `COLOR.NEUTRAL.200`, `RADIUS.SM`

#### PATTERN.LOADING.TABLE

**Purpose:** Table loading state

```jsx
// Show skeleton rows while loading
<tr>
  <td colSpan={cols}>
    <SkeletonRows count={5} />
  </td>
</tr>
```

---

### Empty States

#### PATTERN.EMPTY.DEFAULT

**Purpose:** No data available

```jsx
<div className="py-12 text-center">
  <Icon className="mx-auto h-12 w-12 text-gray-400" />
  <h3 className="mt-2 text-sm font-semibold text-gray-900">[Title]</h3>
  <p className="mt-1 text-sm text-gray-500">[Description]</p>
  <div className="mt-6">
    <Button variant="primary">[Action]</Button>
  </div>
</div>
```

---

### Error States

#### PATTERN.ERROR.INLINE

**Purpose:** Form validation error

```jsx
<p className="mt-1 text-sm text-red-600">[Error message]</p>
```

#### PATTERN.ERROR.ALERT

**Purpose:** Page-level error

```jsx
<div className="rounded-lg border border-red-200 bg-red-50 p-4">
  <div className="flex">
    <ExclamationIcon className="h-5 w-5 text-red-400" />
    <div className="ml-3">
      <h3 className="text-sm font-medium text-red-800">[Error title]</h3>
      <p className="mt-1 text-sm text-red-700">[Error details]</p>
    </div>
  </div>
</div>
```

---

## 4. Healthcare-Specific

### PDC Status

#### HEALTHCARE.PDC.PASSING

**Purpose:** PDC >= 80% (compliant)

```
Text Color:   text-green-600
Badge:        COMPONENT.BADGE.SUCCESS
Background:   bg-green-50
```

**Rule:** PDC value >= 80

#### HEALTHCARE.PDC.AT_RISK

**Purpose:** PDC 60-79% (at risk)

```
Text Color:   text-amber-600
Badge:        COMPONENT.BADGE.WARNING
Background:   bg-amber-50
```

**Rule:** PDC value >= 60 AND < 80

#### HEALTHCARE.PDC.FAILING

**Purpose:** PDC < 60% (non-compliant)

```
Text Color:   text-red-600
Badge:        COMPONENT.BADGE.DANGER
Background:   bg-red-50
```

**Rule:** PDC value < 60

---

### Measure Badges (CMS STARS)

**Design Pattern:** Measure badges use `-100/-800` pattern (NO border) for stronger text contrast.
Use the `MeasureBadge` component from `src/components/ui/Badge/Badge.jsx`.

#### HEALTHCARE.MEASURE.BADGE.MAC

**Purpose:** Medication Adherence - Cholesterol (Statins)

```
Classes: inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
         bg-blue-100 text-blue-800
```

**Component:** `<MeasureBadge measure="MAC" />`

#### HEALTHCARE.MEASURE.BADGE.MAD

**Purpose:** Medication Adherence - Diabetes

```
Classes: inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
         bg-purple-100 text-purple-800
```

**Component:** `<MeasureBadge measure="MAD" />`

#### HEALTHCARE.MEASURE.BADGE.MAH

**Purpose:** Medication Adherence - Hypertension (RAS Antagonists)

```
Classes: inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
         bg-pink-100 text-pink-800
```

**Component:** `<MeasureBadge measure="MAH" />`

---

### Fragility Tiers

#### HEALTHCARE.TIER.F1

**Purpose:** Imminent risk

```
Color:  text-red-600 / bg-red-50
Emoji:  🔴
Hex:    #DC2626
```

#### HEALTHCARE.TIER.F2

**Purpose:** Fragile

```
Color:  text-orange-500 / bg-orange-50
Emoji:  🟠
Hex:    #F97316
```

#### HEALTHCARE.TIER.F3

**Purpose:** Moderate risk

```
Color:  text-yellow-500 / bg-yellow-50
Emoji:  🟡
Hex:    #EAB308
```

#### HEALTHCARE.TIER.F4

**Purpose:** Comfortable

```
Color:  text-blue-500 / bg-blue-50
Emoji:  🔵
Hex:    #3B82F6
```

#### HEALTHCARE.TIER.F5

**Purpose:** Safe

```
Color:  text-green-500 / bg-green-50
Emoji:  🟢
Hex:    #22C55E
```

#### HEALTHCARE.TIER.T5

**Purpose:** Unsalvageable

```
Color:  text-gray-500 / bg-gray-50
Emoji:  ⚫
Hex:    #6B7280
```

---

### Days to Runout

#### HEALTHCARE.RUNOUT.OVERDUE

**Purpose:** Already out of medication (days < 0)

```
Color: text-red-700
```

#### HEALTHCARE.RUNOUT.URGENT

**Purpose:** Running out within 7 days

```
Color: text-orange-700
```

#### HEALTHCARE.RUNOUT.SOON

**Purpose:** Running out within 14 days

```
Color: text-amber-700
```

#### HEALTHCARE.RUNOUT.SAFE

**Purpose:** More than 14 days supply

```
Color: text-gray-900
```

---

### Patient Context

#### HEALTHCARE.PATIENT.CONTEXT_HEADER

**Purpose:** Patient info in drawer/modal headers

```
Required Fields: Patient Name, MRN, DOB
Format: [Name] | MRN: [value] | DOB: [date]
Classes: flex items-center gap-3 text-sm
Name:    font-bold text-gray-900
Labels:  text-gray-700
```

**This is an AUTO-FAIL item if missing from review workflows.**

---

## 5. Change Log

| Date        | ID                           | Change                                     | Impact             |
| ----------- | ---------------------------- | ------------------------------------------ | ------------------ |
| Dec 8, 2025 | `COMPONENT.BADGE.*`          | Updated to `-100/-700` pattern (no border) | All badges         |
| Dec 8, 2025 | `HEALTHCARE.MEASURE.BADGE.*` | Updated to `-100/-800` pattern (no border) | MAC/MAD/MAH badges |
| Dec 3, 2025 | ALL                          | Initial structured version with IDs        | New baseline       |
| Nov 2025    | `COLOR.PRIMARY.*`            | Changed from teal-600 to blue-600          | All primary CTAs   |

---

## Non-Negotiable Rules (Auto-Fail)

These rules MUST be followed exactly. Violations are automatically Major or Critical severity.

| Rule                                     | DS Reference                        | Severity |
| ---------------------------------------- | ----------------------------------- | -------- |
| Primary CTA must be blue-600             | `COLOR.PRIMARY.DEFAULT`             | Major    |
| PDC ≥80% must be green                   | `HEALTHCARE.PDC.PASSING`            | Critical |
| PDC 60-79% must be amber/yellow          | `HEALTHCARE.PDC.AT_RISK`            | Critical |
| PDC <60% must be red                     | `HEALTHCARE.PDC.FAILING`            | Critical |
| Fragility tier colors must match         | `HEALTHCARE.TIER.*`                 | Critical |
| Patient context required in review       | `HEALTHCARE.PATIENT.CONTEXT_HEADER` | Critical |
| All buttons must have hover state        | `COMPONENT.BUTTON.*`                | Major    |
| Badges use -100/-700 pattern (no border) | `COMPONENT.BADGE.*`                 | Major    |
| Table headers must be sticky gray-50     | `COMPONENT.TABLE.HEADER`            | Major    |
| Focus states must show ring              | `BORDER.FOCUS`                      | Major    |

---

## File Locations

| Component     | Path                                        |
| ------------- | ------------------------------------------- |
| Button        | `src/components/ui/Button/Button.jsx`       |
| Badge         | `src/components/ui/Badge/Badge.jsx`         |
| Card          | `src/components/ui/Card/Card.jsx`           |
| DataTable     | `src/components/ui/DataTable/DataTable.jsx` |
| ReviewDrawer  | `src/components/ui/ReviewDrawerV4.jsx`      |
| Design Tokens | `src/styles/designTokens.js`                |

---

_This document is the single source of truth. All audit findings must reference IDs from this document._
