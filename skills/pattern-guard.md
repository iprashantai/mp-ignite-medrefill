# Pattern Guard

Validate that code follows Ignite Health architectural patterns and conventions.

## When to Use

Run this skill after writing or modifying any code in the application. This ensures consistency across the codebase and prevents common anti-patterns.

## Checks to Perform

### 1. UI Library Boundaries

The application uses **two UI libraries** with strict boundaries:

| Area          | Library              | Allowed Locations                         |
| ------------- | -------------------- | ----------------------------------------- |
| **Main App**  | shadcn/ui + Tailwind | `src/app/` (except `/dev/`)               |
| **Dev Tools** | Mantine + Medplum    | `src/app/dev/`, `src/app/[resourceType]/` |

**Detection Commands:**

```bash
# Check for Mantine in main app (violation)
grep -rn "from '@mantine" src/app/ --include="*.tsx" | grep -v "/dev/" | grep -v "/\[resourceType\]"

# Check for shadcn imports (should only be in main app)
grep -rn "from '@/components/ui/" src/app/dev/ --include="*.tsx"
```

**Violation Example:**

```tsx
// In src/app/patients/page.tsx - WRONG
import { Button } from '@mantine/core';
```

**Fix:**

```tsx
// In src/app/patients/page.tsx - CORRECT
import { Button } from '@/components/ui/button';
```

### 2. FHIR Data Patterns

All FHIR operations must use Medplum SDK, never raw fetch.

**Detection Commands:**

```bash
# Check for raw fetch to FHIR endpoints (violation)
grep -rn "fetch.*fhir\|fetch.*Patient\|fetch.*Medication" src/ --include="*.tsx" --include="*.ts"

# Check for missing useMedplum (should be present in components with FHIR data)
grep -rL "useMedplum\|useSearchResources" src/app/**/page.tsx
```

**Violation Example:**

```tsx
// WRONG - Raw fetch
const patients = await fetch('/fhir/Patient?name=Smith');
```

**Fix:**

```tsx
// CORRECT - Medplum SDK
import { useMedplum } from '@medplum/react';

const medplum = useMedplum();
const patients = await medplum.searchResources('Patient', { name: 'Smith' });
```

### 3. Design System Usage

Refer to `skills/validate-design-system.md` for detailed checks. Key points:

- No hardcoded hex colors in `src/app/`
- Use barrel imports from `@/components/ui-healthcare`
- Use helper functions from `@/lib/design-system`

**Quick Check:**

```bash
npm run lint
```

### 4. Error Handling Patterns

Operations that can fail should use the Result pattern or proper try-catch.

**Detection Commands:**

```bash
# Check for unhandled async calls (potential issue)
grep -rn "await.*\." src/app/ --include="*.tsx" | grep -v "try\|catch\|Result"
```

**Violation Example:**

```tsx
// WRONG - No error handling
const patient = await medplum.readResource('Patient', id);
setPatient(patient);
```

**Fix:**

```tsx
// CORRECT - With error handling
try {
  const patient = await medplum.readResource('Patient', id);
  setPatient(patient);
} catch (error) {
  console.error('Failed to load patient', { patientId: id, error });
  setError('Failed to load patient');
}
```

### 5. Component Import Patterns

**Detection Commands:**

```bash
# Check for direct imports instead of barrel exports
grep -rn "from '@/components/ui-healthcare/" src/ --include="*.tsx" | grep -v "from '@/components/ui-healthcare'$" | grep -v "from '@/components/ui-healthcare/table'$"
```

**Violation Example:**

```tsx
// WRONG - Direct file import
import { PDCBadge } from '@/components/ui-healthcare/pdc-badge';
```

**Fix:**

```tsx
// CORRECT - Barrel import
import { PDCBadge } from '@/components/ui-healthcare';
```

### 6. Type Safety

**Detection Commands:**

```bash
# Check for 'any' type usage
grep -rn ": any\|as any" src/ --include="*.ts" --include="*.tsx" | grep -v ".test."

# Check for missing Zod validation on external data
grep -rn "JSON.parse\|\.json()" src/app/ --include="*.tsx" --include="*.ts"
```

**Violation Example:**

```tsx
// WRONG - Using any
const data: any = await response.json();
```

**Fix:**

```tsx
// CORRECT - Typed with Zod validation
import { z } from 'zod';

const PatientSchema = z.object({
  id: z.string(),
  name: z.array(z.object({ given: z.array(z.string()), family: z.string() })),
});

const data = PatientSchema.parse(await response.json());
```

## Report Format

For each violation found, report:

```
Pattern Violation: [Category]
File: src/app/example/page.tsx
Line: 42
Issue: [Description of violation]
Fix: [Suggested fix]
Reference: [Link to documentation]
```

## Automated Checks

Many patterns are enforced automatically:

| Pattern          | Enforcement                    |
| ---------------- | ------------------------------ |
| Hardcoded colors | ESLint `color-no-hex` rule     |
| Import patterns  | ESLint `no-restricted-imports` |
| Type safety      | TypeScript `strict: true`      |
| Code style       | Prettier + ESLint              |

Run all checks:

```bash
npm run lint && npm run typecheck
```

## Reference Documentation

- Architecture: `CLAUDE.md`
- Component Registry: `docs/COMPONENT_REGISTRY.md`
- FHIR Patterns: `docs/FHIR_PATTERNS.md`
- Design System: `src/lib/design-system/README.md`
