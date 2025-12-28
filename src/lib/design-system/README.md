# Ignite Health Design System

Single source of truth for visual standards in the Ignite Health application.

## Overview

The design system provides:

- **Tokens** - Color palette, typography, spacing, shadows
- **Helpers** - Functions that map business logic to design tokens
- **Components** - Pre-built UI components in `@/components/ui-healthcare`

## Files

| File         | Purpose                                        |
| ------------ | ---------------------------------------------- |
| `tokens.ts`  | Color palette, typography, spacing definitions |
| `helpers.ts` | Business logic → design mapping functions      |
| `index.ts`   | Clean barrel exports                           |

## Quick Start

```tsx
import {
  // Tokens
  colors,
  typography,
  spacing,

  // Helper functions
  getPDCVariant,
  getPDCClasses,
  getFragilityClasses,
  getMeasureClasses,
} from '@/lib/design-system';
```

---

## PDC Status Helpers

Map PDC percentages to visual representations.

### Thresholds

| PDC Range | Status  | Variant  | Color |
| --------- | ------- | -------- | ----- |
| ≥80%      | Passing | `pass`   | Green |
| 60-79%    | At-Risk | `atRisk` | Amber |
| <60%      | Failing | `fail`   | Red   |

### Functions

```tsx
import {
  getPDCStatus,
  getPDCVariant,
  getPDCLabel,
  getPDCClasses,
  getPDCColor,
} from '@/lib/design-system';

// Get status enum
getPDCStatus(85); // → 'passing'
getPDCStatus(72); // → 'atRisk'
getPDCStatus(45); // → 'failing'

// Get badge variant
getPDCVariant(85); // → 'pass'
getPDCVariant(72); // → 'caution'
getPDCVariant(45); // → 'fail'

// Get human-readable label
getPDCLabel(85); // → 'Pass'
getPDCLabel(72); // → 'At-Risk'
getPDCLabel(45); // → 'Fail'

// Get Tailwind classes
getPDCClasses(85); // → 'bg-green-100 text-green-700'
getPDCClasses(72); // → 'bg-amber-100 text-amber-700'
getPDCClasses(45); // → 'bg-red-100 text-red-700'

// Get hex color
getPDCColor(85); // → '#22C55E'
```

---

## Fragility Tier Helpers

Map fragility tiers to visual representations.

### Tiers

| Tier             | Label    | Variant    | Color  |
| ---------------- | -------- | ---------- | ------ |
| F1_IMMINENT      | Critical | `critical` | Red    |
| F2_FRAGILE       | Fragile  | `fragile`  | Orange |
| F3_MODERATE      | Moderate | `moderate` | Yellow |
| F4_COMFORTABLE   | Stable   | `stable`   | Blue   |
| F5_SAFE          | Safe     | `safe`     | Green  |
| T5_UNSALVAGEABLE | Lost     | `lost`     | Gray   |

### Functions

```tsx
import {
  getFragilityVariant,
  getFragilityLabel,
  getFragilityClasses,
  getFragilityColor,
} from '@/lib/design-system';

// Accepts full or short form
getFragilityVariant('F1_IMMINENT'); // → 'critical'
getFragilityVariant('F1'); // → 'critical'

// Get label
getFragilityLabel('F1'); // → 'Critical'
getFragilityLabel('F5'); // → 'Safe'

// Get Tailwind classes
getFragilityClasses('F1'); // → 'bg-red-100 text-red-700'
getFragilityClasses('F5'); // → 'bg-green-100 text-green-700'
```

---

## Measure Type Helpers

Map CMS STARS measures to visual representations.

### Measures

| Measure | Full Name             | Color  |
| ------- | --------------------- | ------ |
| MAC     | Cholesterol (Statins) | Blue   |
| MAD     | Diabetes              | Purple |
| MAH     | Hypertension          | Pink   |

### Functions

```tsx
import { getMeasureVariant, getMeasureLabel, getMeasureClasses } from '@/lib/design-system';

getMeasureVariant('MAC'); // → 'mac'
getMeasureLabel('MAC'); // → 'Cholesterol'
getMeasureClasses('MAC'); // → 'bg-blue-100 text-blue-800'

getMeasureVariant('MAD'); // → 'mad'
getMeasureLabel('MAD'); // → 'Diabetes'
getMeasureClasses('MAD'); // → 'bg-purple-100 text-purple-800'
```

---

## Runout Helpers

Map days-to-runout to urgency levels.

### Thresholds

| Days | Variant    | Label         |
| ---- | ---------- | ------------- |
| ≤0   | `critical` | "Out of Meds" |
| 1-7  | `urgent`   | "Xd left"     |
| 8-14 | `due-soon` | "Xd left"     |
| >14  | `ok`       | "X days"      |

### Functions

```tsx
import { getRunoutVariant, getRunoutLabel } from '@/lib/design-system';

getRunoutVariant(0); // → 'critical'
getRunoutVariant(5); // → 'urgent'
getRunoutVariant(10); // → 'due-soon'
getRunoutVariant(20); // → 'ok'

getRunoutLabel(0); // → 'Out of Meds'
getRunoutLabel(5); // → '5d left'
```

---

## Decision Status Helpers

Map workflow decisions to visual representations.

### Statuses

| Status            | Variant    | Color |
| ----------------- | ---------- | ----- |
| approve, approved | `approved` | Green |
| deny, denied      | `denied`   | Red   |
| hold, on-hold     | `hold`     | Amber |
| pending, review   | `pending`  | Blue  |

### Functions

```tsx
import { getDecisionVariant } from '@/lib/design-system';

getDecisionVariant('approve'); // → 'approved'
getDecisionVariant('APPROVED'); // → 'approved' (case-insensitive)
getDecisionVariant('on-hold'); // → 'hold'
```

---

## Badge Variant Helpers

Get Tailwind classes for any badge variant.

```tsx
import { getBadgeVariant } from '@/lib/design-system';

getBadgeVariant('pass'); // → { bg: 'bg-green-100', text: 'text-green-700' }
getBadgeVariant('critical'); // → { bg: 'bg-red-100', text: 'text-red-700' }
getBadgeVariant('mac'); // → { bg: 'bg-blue-100', text: 'text-blue-800' }
```

---

## Component Integration

Use helpers with healthcare components:

```tsx
import { PDCBadge, FragilityBadge, MeasureBadge } from '@/components/ui-healthcare';

// Components use helpers internally - just pass data
<PDCBadge pdc={85} />                    // Automatically green "Pass"
<FragilityBadge tier="F1" />             // Automatically red "Critical"
<MeasureBadge measure="MAC" />           // Automatically blue "MAC"
```

---

## Do This / Don't Do This

### PDC Display

```tsx
// ✅ DO - Use the component
<PDCBadge pdc={85} />;

// ✅ DO - Use helpers for custom UI
const variant = getPDCVariant(pdc);
const classes = getPDCClasses(pdc);

// ❌ DON'T - Hardcode colors
<span className="bg-green-100 text-green-700">Pass</span>;

// ❌ DON'T - Hardcode thresholds
const status = pdc >= 80 ? 'pass' : pdc >= 60 ? 'at-risk' : 'fail';
```

### Fragility Display

```tsx
// ✅ DO
<FragilityBadge tier={patient.fragilityTier} />

// ❌ DON'T
<span className={tier === 'F1' ? 'bg-red-100' : 'bg-green-100'}>
  {tier}
</span>
```

### Badge Styling

```tsx
// ✅ DO - Use Badge with variant
import { Badge } from '@/components/ui-healthcare';
<Badge variant="pass">Approved</Badge>

// ❌ DON'T - Create custom badge styling
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-700">
  Approved
</span>
```

---

## ESLint Enforcement

Design system patterns are enforced automatically:

| Rule                                   | Effect                            |
| -------------------------------------- | --------------------------------- |
| `@metamask/design-tokens/color-no-hex` | Warns on hex colors in `src/app/` |
| `no-restricted-imports`                | Enforces barrel imports           |

Run checks:

```bash
npm run lint
```

---

## Reference

- Full Design System: `docs/design-system/UI_DESIGN_SYSTEM.md`
- Badge Inventory: `docs/design-system/BADGE_INVENTORY.md`
- Component Registry: `docs/COMPONENT_REGISTRY.md`
- Table Guide: `docs/design-system/tables/TABLE_IMPLEMENTATION_GUIDE.md`
