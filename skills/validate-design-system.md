# Validate Design System

Validate that code follows the Ignite Health design system patterns.

## When to Use

Run this skill after implementing new features or modifying UI components to ensure design system compliance.

## Checks to Perform

### 1. Hardcoded Color Detection

Search for hardcoded hex colors that should use design tokens:

```bash
# Search for hex colors in application code (not design-system internals)
grep -rn "#[0-9a-fA-F]\{6\}" src/app/ --include="*.tsx"
grep -rn "#[0-9a-fA-F]\{3\}\b" src/app/ --include="*.tsx"
grep -rn "rgb(" src/app/ --include="*.tsx"
grep -rn "rgba(" src/app/ --include="*.tsx"
```

**Violation Example:**

```tsx
<div style={{ color: '#22C55E' }}>Pass</div>
```

**Fix:** Use `<PDCBadge pdc={85} />` instead.

### 2. Direct Tailwind Color Classes

Search for Tailwind color classes in application code (should use semantic components):

```bash
grep -rn "bg-\(red\|green\|blue\|amber\|yellow\|orange\|purple\|pink\)-[0-9]\+" src/app/ --include="*.tsx"
grep -rn "text-\(red\|green\|blue\|amber\|yellow\|orange\|purple\|pink\)-[0-9]\+" src/app/ --include="*.tsx"
```

**Violation Example:**

```tsx
<span className="bg-green-100 text-green-700">Pass</span>
```

**Fix:** Use `<PDCBadge pdc={85} />` or `<Badge variant="pass">Pass</Badge>`.

### 3. Import Pattern Violations

Check for direct file imports instead of barrel exports:

```bash
grep -rn "from '@/components/ui-healthcare/" src/ --include="*.tsx" | grep -v "from '@/components/ui-healthcare'"$
```

**Violation Example:**

```tsx
import { PDCBadge } from '@/components/ui-healthcare/pdc-badge';
```

**Fix:**

```tsx
import { PDCBadge } from '@/components/ui-healthcare';
```

### 4. Manual PDC Threshold Logic

Search for hardcoded PDC thresholds:

```bash
grep -rn "pdc.*>=.*80\|pdc.*>.*79" src/app/ --include="*.tsx"
grep -rn "pdc.*>=.*60\|pdc.*>.*59" src/app/ --include="*.tsx"
```

**Violation Example:**

```tsx
const status = pdc >= 80 ? 'pass' : pdc >= 60 ? 'at-risk' : 'fail';
```

**Fix:** Use `getPDCVariant(pdc)` from `@/lib/design-system/helpers`.

### 5. Custom Table Styling

Search for raw table elements that should use Table components:

```bash
grep -rn "<table\b" src/app/ --include="*.tsx"
grep -rn "<thead\b" src/app/ --include="*.tsx"
grep -rn "<tbody\b" src/app/ --include="*.tsx"
```

**Fix:** Use components from `@/components/ui-healthcare/table`.

### 6. Custom Badge Styling

Search for inline badge-like styling:

```bash
grep -rn "rounded-full.*font-medium" src/app/ --include="*.tsx"
grep -rn "inline-flex.*items-center.*px-" src/app/ --include="*.tsx"
```

**Fix:** Use `<Badge>` from `@/components/ui-healthcare` with appropriate variant.

## Report Format

For each violation found, report:

```
File: src/app/example/page.tsx
Line: 42
Issue: Hardcoded hex color '#22C55E' found
Fix: Replace with <PDCBadge pdc={value} /> or use getPDCClasses(value)
```

## Automated Check

Run ESLint with design system rules:

```bash
npm run lint
```

The following rules enforce design system patterns:

- `@metamask/design-tokens/color-no-hex` - Flags hex colors
- `no-restricted-imports` - Enforces barrel imports

## Reference Documentation

- Component Registry: `docs/COMPONENT_REGISTRY.md`
- Design Tokens: `src/lib/design-system/tokens.ts`
- Helper Functions: `src/lib/design-system/helpers.ts`
