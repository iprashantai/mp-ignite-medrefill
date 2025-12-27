# Badge Component Quick Start

## 5-Minute Setup

### 1. Verify Dependencies

Ensure these are installed:

```bash
npm list lucide-react clsx tailwind-merge
```

If missing, install:

```bash
npm install lucide-react clsx tailwind-merge
# or
pnpm add lucide-react clsx tailwind-merge
```

### 2. Basic Import

```tsx
import { Badge } from '@/components/ui-healthcare';

// In your component
<Badge variant="success">Pass</Badge>;
```

### 3. Quick Examples

#### Healthcare Dashboard

```tsx
import { PDCBadge, MeasureBadge } from '@/components/ui-healthcare';

function PatientCard({ patient }) {
  return (
    <div>
      <h3>{patient.name}</h3>
      <div className="flex gap-2">
        <MeasureBadge measure="MAC" />
        <PDCBadge pdc={patient.pdc} showValue />
      </div>
    </div>
  );
}
```

#### Batch Review

```tsx
import { DecisionBadge, FragilityBadge } from '@/components/ui-healthcare';

function BatchRow({ patient }) {
  return (
    <tr>
      <td>{patient.name}</td>
      <td>
        <FragilityBadge tier={patient.tier} />
      </td>
      <td>
        <DecisionBadge decision={patient.decision} />
      </td>
    </tr>
  );
}
```

## Common Patterns

### Pattern 1: PDC Status (Most Common)

```tsx
<PDCBadge pdc={85} />  // Automatic color: green (Pass)
<PDCBadge pdc={70} />  // Automatic color: yellow (At-Risk)
<PDCBadge pdc={50} />  // Automatic color: red (Fail)
```

### Pattern 2: Measure Types

```tsx
<MeasureBadge measure="MAC" />  // Blue - Cholesterol
<MeasureBadge measure="MAD" />  // Purple - Diabetes
<MeasureBadge measure="MAH" />  // Pink - Hypertension
```

### Pattern 3: AI Decisions

```tsx
<DecisionBadge decision="approve" />  // Green
<DecisionBadge decision="deny" />     // Red
<DecisionBadge decision="pending" />  // Yellow
```

### Pattern 4: Fragility Tiers

```tsx
<FragilityBadge tier="F1_IMMINENT" />    // Red - Critical
<FragilityBadge tier="F2_FRAGILE" />     // Orange
<FragilityBadge tier="F3_MODERATE" />    // Yellow
<FragilityBadge tier="F4_COMFORTABLE" /> // Blue
<FragilityBadge tier="F5_SAFE" />        // Green
```

### Pattern 5: Runout Status

```tsx
<RunoutBadge daysToRunout={0} />   // Red - Critical
<RunoutBadge daysToRunout={5} />   // Orange - Urgent
<RunoutBadge daysToRunout={10} />  // Yellow - Due Soon
<RunoutBadge daysToRunout={30} />  // Green - OK
```

## Customization

### Sizes

```tsx
<Badge variant="success" size="xs">Extra Small</Badge>
<Badge variant="success" size="sm">Small</Badge>
<Badge variant="success" size="md">Medium</Badge>  {/* Default */}
<Badge variant="success" size="lg">Large</Badge>
```

### Pill Shape

```tsx
<Badge variant="info" pill>
  Pill Shape
</Badge>
```

### With Icon

```tsx
import { Check } from 'lucide-react';

<Badge variant="success" icon={<Check className="h-3 w-3" />}>
  Approved
</Badge>;
```

### With Dot

```tsx
<Badge variant="warning" dot>
  Active
</Badge>
```

### Removable

```tsx
<Badge variant="neutral" removable onRemove={() => console.log('Removed')}>
  Filter
</Badge>
```

## PDC Thresholds Reference

| PDC Value | Status  | Color  | Variant   |
| --------- | ------- | ------ | --------- |
| ≥ 80%     | Pass    | Green  | `pass`    |
| 60-79%    | At-Risk | Yellow | `caution` |
| < 60%     | Fail    | Red    | `fail`    |

## All Convenience Components

```tsx
import {
  PDCBadge, // PDC status (auto color based on threshold)
  MeasureBadge, // MAC/MAD/MAH
  FragilityBadge, // F1-F5, T5
  DecisionBadge, // Approve/Deny/Pending
  RunoutBadge, // Days to medication runout
  UrgencyBadge, // Urgency tiers
  BarrierBadge, // Patient barriers
  MedAdherenceBadge, // Combined measure + PDC
  ActionStatusBadge, // Rx sent, filled, etc.
  AgentBadge, // Primary/Manager AI
} from '@/components/ui-healthcare';
```

## Troubleshooting

### Badge not showing?

Check Tailwind config includes the component directory:

```js
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    // Make sure this is included:
    './src/components/**/*.{js,jsx,ts,tsx}',
  ],
};
```

### Type errors?

Ensure TypeScript can resolve the `@` alias:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Colors not matching design?

Check `/src/lib/design-system/tokens.ts` is up to date.

## Next Steps

1. Read [README.md](./README.md) for comprehensive documentation
2. Check [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) for technical details
3. Review design tokens at `/src/lib/design-system/tokens.ts`
4. Explore all 100+ variants in `/src/components/ui-healthcare/badge.tsx`

## Support

For issues or questions:

1. Check the README.md for detailed usage
2. Review MIGRATION_SUMMARY.md for architecture decisions
3. Check source implementation at `/Users/prashantsingh/work/ignite/ignite-medrefills/src/components/ui/Badge/Badge.jsx`

---

**Quick Reference Card**

| Component          | Props               | Example                                 |
| ------------------ | ------------------- | --------------------------------------- |
| `<PDCBadge>`       | `pdc`, `showValue?` | `<PDCBadge pdc={85} />`                 |
| `<MeasureBadge>`   | `measure`           | `<MeasureBadge measure="MAC" />`        |
| `<FragilityBadge>` | `tier`              | `<FragilityBadge tier="F1_IMMINENT" />` |
| `<DecisionBadge>`  | `decision`          | `<DecisionBadge decision="approve" />`  |
| `<RunoutBadge>`    | `daysToRunout`      | `<RunoutBadge daysToRunout={5} />`      |

All components accept: `size?`, `className?`
