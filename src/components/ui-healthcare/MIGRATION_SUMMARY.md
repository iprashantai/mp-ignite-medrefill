# Badge Component Migration Summary

## Overview

Successfully migrated the healthcare Badge component system from the source repository (`ignite-medrefills`) to the target repository (`mp-ignite-medrefill`).

## Created Files

### Main Badge Component

- `/src/components/ui-healthcare/badge.tsx` - Core Badge component with 100+ variants

### Convenience Badge Components

- `/src/components/ui-healthcare/pdc-badge.tsx` - PDC status badges
- `/src/components/ui-healthcare/measure-badge.tsx` - MAC/MAD/MAH measure badges
- `/src/components/ui-healthcare/fragility-badge.tsx` - F1-F5, T5 fragility tier badges
- `/src/components/ui-healthcare/decision-badge.tsx` - AI decision badges (includes ActionStatusBadge, AgentBadge)
- `/src/components/ui-healthcare/runout-badge.tsx` - Medication runout status badges
- `/src/components/ui-healthcare/urgency-badge.tsx` - Urgency tier badges
- `/src/components/ui-healthcare/barrier-badge.tsx` - Patient barrier badges
- `/src/components/ui-healthcare/med-adherence-badge.tsx` - Combined measure + PDC badge

### Exports & Documentation

- `/src/components/ui-healthcare/index.ts` - Barrel export for all components
- `/src/components/ui-healthcare/README.md` - Comprehensive usage documentation
- `/src/components/ui-healthcare/MIGRATION_SUMMARY.md` - This file

## Key Features

### 100+ Badge Variants

- PDC Status: `pass`, `caution`, `fail`
- Fragility Tiers: `critical`, `fragile`, `moderate`, `stable`, `safe`, `lost`
- Measure Types: `mac`, `mad`, `mah`
- Runout Status: `runout-critical`, `runout-urgent`, `due-soon`, `ok`
- AI Decision: `approve`, `deny`, `pending`
- Decision Status: 7 variants (no-review-needed, pre-approved, etc.)
- Action Status: 13 variants (rx-sent, exception-_, ai-_, etc.)
- Agent: `agent-primary`, `agent-manager`
- Urgency Tiers: 5 variants (extreme to minimal)
- Barrier Types: 7 variants (cost, access, etc.)
- Campaign Status: 4 variants
- Campaign Types: 5 variants
- Patient Outreach: 7 variants
- Batch/Processing: 4 variants
- Generic: `neutral`, `info`, `warning`, `success`, `error`

### Design Pattern

**CRITICAL**: All badges use the **borderless pattern**:

```tsx
Pattern: bg-{color}-100 text-{color}-700
Example: bg-green-100 text-green-700 (NO border)
```

### PDC Thresholds

- **Pass**: PDC ≥ 80% (Green)
- **At-Risk**: 60% ≤ PDC < 80% (Yellow/Amber)
- **Fail**: PDC < 60% (Red)

## Technology Stack

### Dependencies

- **React 18+**: TypeScript components with proper type exports
- **Lucide React**: Icons (replaced Heroicons from source)
- **clsx + tailwind-merge**: Class name merging via `cn()` utility
- **Tailwind CSS**: For styling

### Design System Integration

- Uses design tokens from `/src/lib/design-system/tokens.ts`
- Uses helper functions from `/src/lib/design-system/helpers.ts`
- Integrates with existing `cn()` utility from `/src/lib/utils.ts`

## Migration Changes from Source

### 1. TypeScript Conversion

- Converted from `.jsx` to `.tsx`
- Added comprehensive type definitions
- Exported all types for consumer use

### 2. Icon Library

- **Source**: Heroicons (`@heroicons/react`)
- **Target**: Lucide React (`lucide-react`)
- Changed: `XMarkIcon` → `X`

### 3. Class Name Utility

- **Source**: `clsx` directly
- **Target**: `cn()` utility from `@/lib/utils`
- Provides better Tailwind class merging

### 4. Module Structure

- Split into multiple files for better organization
- Added barrel export (`index.ts`) for clean imports
- Created comprehensive documentation

## Usage Examples

### Basic Badge

```tsx
import { Badge } from '@/components/ui-healthcare';

<Badge variant="success">Success</Badge>
<Badge variant="fail" size="lg">Fail</Badge>
```

### PDC Badge

```tsx
import { PDCBadge } from '@/components/ui-healthcare';

<PDCBadge pdc={85} />              // "Pass" (green)
<PDCBadge pdc={70} showValue />    // "70%" (yellow)
```

### Measure Badge

```tsx
import { MeasureBadge } from '@/components/ui-healthcare';

<MeasureBadge measure="MAC" />  // Blue
<MeasureBadge measure="MAD" />  // Purple
```

### Fragility Badge

```tsx
import { FragilityBadge } from '@/components/ui-healthcare';

<FragilityBadge tier="F1_IMMINENT" />  // Red - Critical
<FragilityBadge tier="F5_SAFE" />      // Green - Safe
```

### Decision Badge

```tsx
import { DecisionBadge } from '@/components/ui-healthcare';

<DecisionBadge decision="approve" />
<DecisionBadge decision="pre-approved" />
```

### Combined Import

```tsx
import {
  Badge,
  PDCBadge,
  MeasureBadge,
  FragilityBadge,
  DecisionBadge,
  RunoutBadge,
  UrgencyBadge,
  BarrierBadge,
  MedAdherenceBadge,
  ActionStatusBadge,
  AgentBadge,
} from '@/components/ui-healthcare';
```

## Type Exports

```tsx
import type {
  BadgeProps,
  BadgeVariant,
  BadgeSize,
  PDCBadgeProps,
  MeasureBadgeProps,
  FragilityBadgeProps,
  DecisionBadgeProps,
  RunoutBadgeProps,
  UrgencyBadgeProps,
  UrgencyTier,
  BarrierBadgeProps,
  BarrierType,
  MedAdherenceBadgeProps,
  ActionStatusBadgeProps,
  AgentBadgeProps,
} from '@/components/ui-healthcare';
```

## Next Steps

### 1. Install Dependencies (if needed)

```bash
npm install lucide-react
# or
pnpm add lucide-react
```

### 2. Verify Design Tokens

Ensure `/src/lib/design-system/tokens.ts` and `/src/lib/design-system/helpers.ts` are up to date.

### 3. Start Using Components

Import and use in your pages/components:

```tsx
import { PDCBadge, MeasureBadge } from '@/components/ui-healthcare';
```

### 4. Storybook/Testing (Optional)

Consider adding Storybook stories or unit tests for visual regression testing.

## Color Semantics

| Color            | Meaning                     | Use Cases                      |
| ---------------- | --------------------------- | ------------------------------ |
| **Green**        | Positive, Success, Passing  | Approved, Passing PDC, Safe    |
| **Red**          | Negative, Failure, Critical | Denied, Failing PDC, Critical  |
| **Yellow/Amber** | Warning, Caution, At-Risk   | At-Risk PDC, Moderate          |
| **Orange**       | Urgent, High Priority       | Urgent runout, Fragile         |
| **Blue**         | Informational               | MAC measure, Processing        |
| **Purple**       | Special, Manager            | MAD measure, Manager decisions |
| **Pink**         | Hypertension                | MAH measure only               |
| **Gray**         | Inactive, Unknown           | Unknown, Archived              |

## Reference Documentation

- **Source Badge Component**: `/Users/prashantsingh/work/ignite/ignite-medrefills/src/components/ui/Badge/Badge.jsx`
- **Badge Inventory**: `/Users/prashantsingh/work/ignite/ignite-medrefills/docs/UI/BADGE_INVENTORY.md`
- **Design Tokens**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/lib/design-system/tokens.ts`
- **Helper Functions**: `/Users/prashantsingh/work/mp-ignite-medrefill/src/lib/design-system/helpers.ts`

## Architecture Decisions

### Why TypeScript?

- Better type safety for healthcare data
- IntelliSense support for variant names
- Prevents runtime errors with invalid props

### Why Lucide React?

- Modern, tree-shakeable icon library
- Better TypeScript support than Heroicons
- Smaller bundle size

### Why Separate Files?

- Better code organization
- Easier to maintain and test
- Clearer dependencies and imports
- Follows single responsibility principle

### Why Borderless Pattern?

- Matches Med Adherence tab styling from source
- Cleaner, more modern appearance
- Better visual hierarchy
- Consistent with design system tokens

## Compatibility

- **React**: 18.0.0+
- **TypeScript**: 5.0.0+
- **Tailwind CSS**: 3.0.0+
- **Node**: 18.0.0+

## Known Limitations

1. **Icons in ActionStatusBadge**: Uses emoji icons by default (can be replaced with Lucide icons)
2. **BarrierBadge icons**: Uses emoji icons by default
3. **Legacy variants**: Some `-solid` variants still include borders for backward compatibility

## Troubleshooting

### Issue: `cn is not defined`

**Solution**: Ensure `/src/lib/utils.ts` exists with the `cn()` function.

### Issue: Type errors with FragilityTier

**Solution**: Ensure `/src/lib/design-system/tokens.ts` exports the `FragilityTier` type.

### Issue: Missing helper functions

**Solution**: Check `/src/lib/design-system/helpers.ts` has all the get*Variant/get*Label functions.

### Issue: Tailwind classes not applying

**Solution**: Ensure Tailwind config includes the component directory in `content` paths.

## Maintenance Notes

- Update `BADGE_VARIANTS` in `badge.tsx` when adding new variants
- Update helper functions in `/src/lib/design-system/helpers.ts` for new badge types
- Keep README.md and this file in sync with changes
- Follow the borderless pattern: `bg-{color}-100 text-{color}-700`

---

**Migration Date**: December 28, 2025
**Migrated By**: Claude Code
**Source Repo**: `/Users/prashantsingh/work/ignite/ignite-medrefills`
**Target Repo**: `/Users/prashantsingh/work/mp-ignite-medrefill`
