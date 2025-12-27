# Healthcare Badge Components

Comprehensive badge component system with 100+ healthcare-specific variants for the IgniteHealth platform.

## Design Pattern

All badges follow the **borderless pattern**:

- Background: `bg-{color}-100`
- Text: `text-{color}-700` (or `-800` for measure badges)
- Shape: `rounded` (not `rounded-full` by default)
- **NO borders**

## Installation

Components are ready to use. Import from the barrel export:

```tsx
import { Badge, PDCBadge, MeasureBadge } from '@/components/ui-healthcare';
```

## Core Badge Component

The `Badge` component is the foundation for all badge variants.

### Basic Usage

```tsx
import { Badge } from '@/components/ui-healthcare';

<Badge variant="success">Success</Badge>
<Badge variant="error" size="lg">Error</Badge>
<Badge variant="pass" pill>Pass</Badge>
```

### Props

| Prop        | Type                           | Default     | Description                              |
| ----------- | ------------------------------ | ----------- | ---------------------------------------- |
| `variant`   | `BadgeVariant`                 | `'default'` | Badge color variant (see BADGE_VARIANTS) |
| `size`      | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'md'`      | Badge size                               |
| `pill`      | `boolean`                      | `false`     | Use pill shape (rounded-full)            |
| `removable` | `boolean`                      | `false`     | Show remove button                       |
| `onRemove`  | `() => void`                   | -           | Remove button handler                    |
| `icon`      | `ReactNode`                    | -           | Icon to display before text              |
| `dot`       | `boolean`                      | `false`     | Show colored dot indicator               |
| `className` | `string`                       | -           | Additional CSS classes                   |

## Convenience Components

### PDCBadge

Displays PDC (Proportion of Days Covered) status with automatic color coding:

- Pass (≥80%): Green
- Caution (60-79%): Yellow
- Fail (<60%): Red

```tsx
import { PDCBadge } from '@/components/ui-healthcare';

<PDCBadge pdc={85} />              // "Pass" (green)
<PDCBadge pdc={70} />              // "At-Risk" (yellow)
<PDCBadge pdc={50} showValue />    // "50%" (red)
```

### MeasureBadge

Displays medication adherence measure types (MAC/MAD/MAH):

```tsx
import { MeasureBadge } from '@/components/ui-healthcare';

<MeasureBadge measure="MAC" />  // Blue
<MeasureBadge measure="MAD" />  // Purple
<MeasureBadge measure="MAH" />  // Pink
```

### FragilityBadge

Displays patient fragility/risk tiers (F1-F5, T5):

```tsx
import { FragilityBadge } from '@/components/ui-healthcare';

<FragilityBadge tier="F1_IMMINENT" />    // Red - Critical
<FragilityBadge tier="F2_FRAGILE" />     // Orange - Fragile
<FragilityBadge tier="F3_MODERATE" />    // Yellow - Moderate
<FragilityBadge tier="F4_COMFORTABLE" /> // Blue - Stable
<FragilityBadge tier="F5_SAFE" />        // Green - Safe
<FragilityBadge tier="T5_UNSALVAGEABLE" /> // Gray - Lost
```

### DecisionBadge

Displays AI decision status:

```tsx
import { DecisionBadge } from '@/components/ui-healthcare';

<DecisionBadge decision="approve" />
<DecisionBadge decision="deny" />
<DecisionBadge decision="pending" />

// Extended decision statuses
<DecisionBadge decision="pre-approved" />
<DecisionBadge decision="override-approved" />
<DecisionBadge decision="confirmed-denied" />
```

### ActionStatusBadge

Displays action status with optional icons:

```tsx
import { ActionStatusBadge } from '@/components/ui-healthcare';

<ActionStatusBadge status="rx-sent" />
<ActionStatusBadge status="filled-confirmed" />
<ActionStatusBadge status="exception-appt" showIcon={false} />
```

### AgentBadge

Displays AI agent type (Primary/Manager):

```tsx
import { AgentBadge } from '@/components/ui-healthcare';

<AgentBadge agent="Primary" />  // Blue
<AgentBadge agent="Manager" />  // Purple
```

### RunoutBadge

Displays medication runout status:

```tsx
import { RunoutBadge } from '@/components/ui-healthcare';

<RunoutBadge daysToRunout={0} />   // Critical (red)
<RunoutBadge daysToRunout={5} />   // Urgent (orange)
<RunoutBadge daysToRunout={10} />  // Due Soon (yellow)
<RunoutBadge daysToRunout={30} />  // OK (green)
```

### UrgencyBadge

Displays urgency tier or score:

```tsx
import { UrgencyBadge } from '@/components/ui-healthcare';

<UrgencyBadge tier="EXTREME" />
<UrgencyBadge urgencyIndex={95} tier="EXTREME" showScore />
```

### BarrierBadge

Displays patient adherence barriers:

```tsx
import { BarrierBadge } from '@/components/ui-healthcare';

<BarrierBadge type="cost" />
<BarrierBadge type="side_effects" showIcon={false} />
```

### MedAdherenceBadge

Combined badge showing measure with PDC status and gap days:

```tsx
import { MedAdherenceBadge } from '@/components/ui-healthcare';

<MedAdherenceBadge measure="MAC" pdc={85} gapDaysRemaining={12} />;
```

## Badge Variants

All available badge variants (100+):

### PDC Status

- `pass`, `caution`, `fail`

### Fragility Tiers

- `critical`, `fragile`, `moderate`, `stable`, `safe`, `lost`

### Measure Types

- `mac`, `mad`, `mah`

### Runout Status

- `runout-critical`, `runout-urgent`, `due-soon`, `ok`

### AI Decision

- `approve`, `deny`, `pending`

### Generic/Utility

- `neutral`, `info`, `warning`, `success`, `error`

### Decision Status

- `no-review-needed`, `pending-review`, `pre-approved`, `pre-denied`
- `reviewed`, `override-approved`, `confirmed-denied`

### Action Status

- `rx-sent`, `filled-confirmed`, `rx-sent-not-filled`
- `exception-appt`, `exception-pa`, `exception-expired`
- `exception-clinical`, `exception-patient-declined`
- `ai-outreach-sent`, `ai-barrier-detected`, `human-escalated`
- `awaiting-patient-response`, `scheduled-followup`

### Agent

- `agent-primary`, `agent-manager`

### Urgency Tiers

- `urgency-extreme`, `urgency-high`, `urgency-moderate`
- `urgency-low`, `urgency-minimal`

### Barrier Types

- `barrier-cost`, `barrier-access`, `barrier-side-effects`
- `barrier-education`, `barrier-transportation`
- `barrier-forgot`, `barrier-other`

### Campaign Status

- `campaign-active`, `campaign-paused`, `campaign-completed`, `campaign-archived`

### Campaign Types

- `outreach-call`, `refill-reminder`, `patient-education`
- `wellness-checkin`, `adherence-outreach`

### Patient Outreach

- `not-contacted`, `outreach-attempted`, `patient-responded`
- `appointment-scheduled`, `intervention-complete`
- `lost-to-followup`, `opted-out`

### Batch/Processing

- `processing`, `ready`, `completed`, `superseded`

## Color Semantics

| Color            | Meaning                     | Use Cases                     |
| ---------------- | --------------------------- | ----------------------------- |
| **Green**        | Positive, Success, Passing  | Approved, Passing PDC, Safe   |
| **Red**          | Negative, Failure, Critical | Denied, Failing PDC, Critical |
| **Yellow/Amber** | Warning, Caution, At-Risk   | At-Risk PDC, Moderate         |
| **Orange**       | Urgent, High Priority       | Urgent runout, Fragile        |
| **Blue**         | Informational               | MAC measure, Processing       |
| **Purple**       | Special, Manager            | MAD measure, Manager          |
| **Pink**         | Hypertension                | MAH measure only              |
| **Gray**         | Inactive, Unknown           | Unknown, Archived             |

## PDC Thresholds

- **Pass**: PDC ≥ 80% (CMS STARS compliant)
- **At-Risk**: 60% ≤ PDC < 80%
- **Fail**: PDC < 60%

## Integration with Design System

All badge components use the centralized design tokens from `@/lib/design-system`:

```tsx
import { colors, spacing, typography } from '@/lib/design-system/tokens';
import { getPDCVariant, getFragilityVariant } from '@/lib/design-system/helpers';
```

## TypeScript Support

Full TypeScript support with exported types:

```tsx
import type {
  BadgeProps,
  BadgeVariant,
  BadgeSize,
  MeasureType,
  FragilityTier,
  UrgencyTier,
  BarrierType,
} from '@/components/ui-healthcare';
```

## Examples

### Healthcare Dashboard

```tsx
import { PDCBadge, MeasureBadge, FragilityBadge } from '@/components/ui-healthcare';

<div className="patient-card">
  <h3>{patient.name}</h3>
  <div className="flex gap-2">
    <MeasureBadge measure="MAC" />
    <PDCBadge pdc={patient.pdc} showValue />
    <FragilityBadge tier={patient.fragilityTier} />
  </div>
</div>;
```

### Batch Review Table

```tsx
import { DecisionBadge, AgentBadge, RunoutBadge } from '@/components/ui-healthcare';

<tr>
  <td>{patient.name}</td>
  <td>
    <RunoutBadge daysToRunout={patient.daysToRunout} />
  </td>
  <td>
    <DecisionBadge decision={patient.aiDecision} />
  </td>
  <td>
    <AgentBadge agent={patient.decidingAgent} />
  </td>
</tr>;
```

## Notes

- All badges are **accessible** with proper ARIA labels
- **Responsive** sizing with the `size` prop
- **Customizable** via `className` prop
- **Icon support** via Lucide React (not Heroicons)
- **No borders** on standard badges (matches Med Adherence tab styling)
