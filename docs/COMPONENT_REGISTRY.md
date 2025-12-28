# Component Registry

This document lists all available UI components for Ignite Health. **Always use these components instead of creating custom implementations.**

---

## Import Paths

```tsx
// Healthcare-specific badges
import { PDCBadge, FragilityBadge, MeasureBadge, ... } from '@/components/ui-healthcare';

// Healthcare tables
import { Table, TableHead, TableBody, ... } from '@/components/ui-healthcare/table';

// General UI (shadcn)
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
```

---

## Healthcare Badge Components

### PDCBadge

Displays PDC (Proportion of Days Covered) status with automatic color coding.

| PDC Value | Status  | Color |
| --------- | ------- | ----- |
| ≥ 80%     | Pass    | Green |
| 60-79%    | At-Risk | Amber |
| < 60%     | Fail    | Red   |

```tsx
import { PDCBadge } from '@/components/ui-healthcare';

// Basic usage - shows label ("Pass", "At-Risk", "Fail")
<PDCBadge pdc={85} />

// Show actual percentage
<PDCBadge pdc={85} showValue />

// With size
<PDCBadge pdc={72} size="md" />
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pdc` | `number` | required | PDC value (0-100) |
| `showValue` | `boolean` | `false` | Show percentage instead of label |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'sm'` | Badge size |

---

### FragilityBadge

Displays patient fragility/risk tier.

| Tier             | Label    | Color  |
| ---------------- | -------- | ------ |
| F1_IMMINENT      | Critical | Red    |
| F2_FRAGILE       | Fragile  | Orange |
| F3_MODERATE      | Moderate | Yellow |
| F4_COMFORTABLE   | Stable   | Blue   |
| F5_SAFE          | Safe     | Green  |
| T5_UNSALVAGEABLE | Lost     | Gray   |

```tsx
import { FragilityBadge } from '@/components/ui-healthcare';

<FragilityBadge tier="F1_IMMINENT" />
<FragilityBadge tier="F5_SAFE" size="md" />
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tier` | `FragilityTier` | required | Fragility tier code |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'sm'` | Badge size |

---

### MeasureBadge

Displays HEDIS medication adherence measure type.

| Measure | Full Name    | Color  |
| ------- | ------------ | ------ |
| MAC     | Cholesterol  | Blue   |
| MAD     | Diabetes     | Purple |
| MAH     | Hypertension | Pink   |

```tsx
import { MeasureBadge } from '@/components/ui-healthcare';

<MeasureBadge measure="MAC" />
<MeasureBadge measure="MAD" />
<MeasureBadge measure="MAH" />
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `measure` | `'MAC' \| 'MAD' \| 'MAH'` | required | Measure type |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'sm'` | Badge size |

---

### RunoutBadge

Displays days until medication runs out.

| Days | Label   | Color  |
| ---- | ------- | ------ |
| ≤ 0  | Overdue | Red    |
| 1-3  | X days  | Red    |
| 4-7  | X days  | Orange |
| 8-14 | X days  | Yellow |
| > 14 | X days  | Blue   |

```tsx
import { RunoutBadge } from '@/components/ui-healthcare';

<RunoutBadge daysToRunout={5} />
<RunoutBadge daysToRunout={0} />  // Shows "Overdue"
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `daysToRunout` | `number` | required | Days until runout |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'sm'` | Badge size |

---

### DecisionBadge

Displays AI recommendation decision status.

| Decision | Color  |
| -------- | ------ |
| approve  | Green  |
| deny     | Red    |
| escalate | Orange |
| review   | Blue   |

```tsx
import { DecisionBadge } from '@/components/ui-healthcare';

<DecisionBadge decision="approve" />
<DecisionBadge decision="escalate" />
```

---

### UrgencyBadge

Displays urgency level for tasks.

```tsx
import { UrgencyBadge } from '@/components/ui-healthcare';

<UrgencyBadge tier="critical" />
<UrgencyBadge tier="high" />
<UrgencyBadge tier="medium" />
<UrgencyBadge tier="low" />
```

---

### BarrierBadge

Displays intervention barrier types.

```tsx
import { BarrierBadge } from '@/components/ui-healthcare';

<BarrierBadge barrier="insurance" />
<BarrierBadge barrier="cost" />
<BarrierBadge barrier="adherence" />
```

---

### MedAdherenceBadge

Combines measure and PDC status.

```tsx
import { MedAdherenceBadge } from '@/components/ui-healthcare';

<MedAdherenceBadge measure="MAC" pdc={85} />;
```

---

## Healthcare Table Components

For displaying patient lists, medication data, and other tabular healthcare data.

### Basic Usage

```tsx
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  TableFooter,
  DensityToggle,
  useTableState,
} from '@/components/ui-healthcare/table';
import { PDCBadge, FragilityBadge } from '@/components/ui-healthcare';

function PatientTable({ patients }) {
  const { density, setDensity, getSortProps, sortData } = useTableState();

  const sortedPatients = sortData(patients, (a, b, col) => {
    if (col === 'name') return a.name.localeCompare(b.name);
    if (col === 'pdc') return a.pdc - b.pdc;
    return 0;
  });

  return (
    <>
      <DensityToggle density={density} onDensityChange={setDensity} />
      <Table density={density} ariaLabel="Patient list">
        <TableHead sticky>
          <TableRow>
            <TableHeaderCell {...getSortProps('name')}>Name</TableHeaderCell>
            <TableHeaderCell {...getSortProps('pdc')}>PDC</TableHeaderCell>
            <TableHeaderCell>Fragility</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedPatients.map((patient) => (
            <TableRow key={patient.id} hoverable clickable>
              <TableCell>{patient.name}</TableCell>
              <TableCell>
                <PDCBadge pdc={patient.pdc} />
              </TableCell>
              <TableCell>
                <FragilityBadge tier={patient.tier} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter totalCount={patients.length} itemLabel="patients" />
      </Table>
    </>
  );
}
```

### Table Components

| Component         | Purpose                                             |
| ----------------- | --------------------------------------------------- |
| `Table`           | Container with density context                      |
| `TableHead`       | Header section (supports `sticky`)                  |
| `TableBody`       | Body section                                        |
| `TableRow`        | Row (supports `hoverable`, `clickable`, `selected`) |
| `TableCell`       | Data cell (supports `align`)                        |
| `TableHeaderCell` | Header cell with sort support                       |
| `TableFooter`     | Footer with row count                               |
| `DensityToggle`   | Toggle between compact/comfortable/dense            |

### useTableState Hook

Provides sorting and density state management.

```tsx
const {
  sortColumn, // Current sort column
  sortDirection, // 'asc' | 'desc'
  density, // 'compact' | 'comfortable' | 'dense'
  setDensity, // Change density
  handleSort, // Toggle sort on column
  getSortProps, // Get props for TableHeaderCell
  sortData, // Sort data array
  densityClasses, // CSS classes for current density
} = useTableState({
  defaultSortColumn: 'name',
  defaultSortDirection: 'asc',
  defaultDensity: 'compact',
});
```

---

## General UI Components (shadcn/ui)

For general UI needs, use shadcn/ui components:

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
```

---

## Medplum Components (Dev Tools Only)

For developer tools and resource explorers, use Medplum native components:

```tsx
import { SearchControl, ResourceTable, ResourceForm } from '@medplum/react';

// Search FHIR resources
<SearchControl
  search={{ resourceType: 'Patient' }}
  onChange={(e) => setSearch(e.definition)}
  onClick={(e) => handleSelect(e.resource)}
/>

// Display resource details
<ResourceTable value={patient} />

// Edit resource
<ResourceForm
  resource={patient}
  onSubmit={(resource) => updatePatient(resource)}
/>
```

**Important**: Medplum components require `MantineProvider` wrapper. Only use in `/dev/*` pages.

---

## NEVER Create

1. **Custom badge styling** - Use Badge component with variants
2. **Custom table styling** - Use Table components
3. **Hardcoded colors** - Use design tokens or semantic components
4. **Custom PDC logic** - PDCBadge handles thresholds automatically
5. **Custom fragility colors** - FragilityBadge handles tier colors
6. **Raw fetch() for FHIR** - Use Medplum hooks

---

## Quick Reference: What to Use

| Need                   | Use This                               |
| ---------------------- | -------------------------------------- |
| Show PDC status        | `<PDCBadge pdc={value} />`             |
| Show fragility         | `<FragilityBadge tier="F1" />`         |
| Show measure type      | `<MeasureBadge measure="MAC" />`       |
| Show days until runout | `<RunoutBadge daysToRunout={5} />`     |
| Show AI decision       | `<DecisionBadge decision="approve" />` |
| Data table             | Table components with useTableState    |
| Search FHIR resources  | `<SearchControl />` (dev tools)        |
| Button                 | `<Button />` from shadcn/ui            |
| Card layout            | `<Card />` from shadcn/ui              |
