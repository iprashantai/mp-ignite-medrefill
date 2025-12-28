# Pull Request Workflow

This document explains the complete PR workflow for Ignite Health, including automated checks and AI-assisted reviews.

---

## Overview

Every pull request goes through multiple layers of validation:

```
PR Created
    ↓
┌───────────────────────────────────────┐
│  Layer 1: Automated CI Checks         │
│  - Linting (ESLint)                   │
│  - Type checking (TypeScript)         │
│  - Unit tests (Vitest)                │
│  - Build verification                 │
│  - Design system validation           │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│  Layer 2: AI Code Review (Claude)     │
│  - Design system compliance           │
│  - FHIR/Medplum patterns              │
│  - Healthcare domain rules            │
│  - Security & PHI detection           │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│  Layer 3: Human Review                │
│  - Architecture decisions             │
│  - Business logic verification        │
│  - Clinical safety (for healthcare)   │
└───────────────────────────────────────┘
    ↓
Merge to Main
```

---

## CI Checks (Automated)

### 1. Lint and Type Check

```yaml
Jobs: lint-and-type
```

- **ESLint**: Code style, import patterns, design token enforcement
- **TypeScript**: Type safety, no `any` types

**Common failures:**

- Hardcoded hex colors in `src/app/` (use design system components)
- Direct imports from `@/components/ui-healthcare/*` (use barrel exports)

### 2. Unit Tests

```yaml
Jobs: test
```

- Runs all Vitest tests
- Uploads coverage to Codecov
- **Minimum coverage**: Currently tracking, not blocking

### 3. Build

```yaml
Jobs: build
```

- Next.js production build
- Catches SSR/hydration issues

### 4. Design System Check (PR only)

```yaml
Jobs: design-system-check
```

**Warnings (non-blocking):**

- Hardcoded hex colors in application code
- Direct file imports instead of barrel exports

**Errors (blocking):**

- Raw `fetch()` for FHIR operations (must use Medplum SDK)

---

## AI Code Review (Claude Code)

Claude Code automatically reviews every PR using the `claude-review` GitHub Action job.

### What It Checks

| Category              | Checks                                                  |
| --------------------- | ------------------------------------------------------- |
| **Design System**     | No hardcoded colors, barrel imports, UI component usage |
| **Code Quality**      | TypeScript best practices, error handling, no `any`     |
| **Healthcare Domain** | PDC thresholds, FHIR types, Zod validation              |
| **Security**          | No PHI in logs/comments, proper data handling           |

### How It Works

```yaml
Jobs: claude-review
```

- Runs on every PR automatically
- Uses `CLAUDE.md` project guidelines for context
- Posts review comments directly on the PR
- Provides actionable fixes, not just problem descriptions

### Setup Required

Add the Anthropic API key to your repository secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add secret: `ANTHROPIC_API_KEY`

### Local Review (Before PR)

You can also run Claude Code review locally:

```bash
# In Claude Code CLI
/review

# Or for security-focused review
/security-review

# Or use the pr-review-toolkit plugin
/pr-review-toolkit:review-pr
```

---

## Pre-Commit Checks (Local)

Before pushing, these hooks run automatically:

### 1. lint-staged

```bash
# Runs on staged files only
prettier --write
eslint --fix
```

### 2. gitleaks

```bash
# Scans for secrets/PHI
gitleaks detect --staged
```

**Blocked patterns:**

- API keys, tokens
- Patient names in comments
- SSN-like patterns

### 3. commitlint

```bash
# Validates commit message format
type(scope): subject
```

**Valid types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

**Valid scopes:** `ui`, `fhir`, `design`, `pdc`, `ai`, `auth`, `config`, `test`, `deps`

---

## Creating a Good PR

### Title Format

```
feat(ui): add patient risk stratification dashboard

fix(pdc): correct boundary condition for 80% threshold

docs(fhir): add MedicationRequest search examples
```

### Description Template

```markdown
## Summary

Brief description of what this PR does.

## Changes

- Added X component
- Modified Y function
- Fixed Z bug

## Design System Compliance

- [ ] Used components from @/components/ui-healthcare
- [ ] No hardcoded colors
- [ ] Used Medplum SDK for FHIR operations

## Testing

- [ ] Added/updated unit tests
- [ ] Tested edge cases (PDC 79%, 80%, etc.)
- [ ] Verified in browser

## Screenshots (if UI change)

[Add screenshots]
```

---

## Common Issues and Fixes

### Issue: ESLint color-no-hex warning

```
Warning: Hardcoded hex color found
```

**Fix:** Use design system components:

```tsx
// Before (warning)
<span className="text-green-500">Pass</span>;

// After (correct)
import { PDCBadge } from '@/components/ui-healthcare';
<PDCBadge pdc={85} />;
```

### Issue: Import pattern violation

```
Error: Import from @/components/ui-healthcare instead
```

**Fix:** Use barrel exports:

```tsx
// Before (error)
import { PDCBadge } from '@/components/ui-healthcare/pdc-badge';

// After (correct)
import { PDCBadge } from '@/components/ui-healthcare';
```

### Issue: Raw fetch for FHIR

```
Error: Must use Medplum SDK for FHIR operations
```

**Fix:** Use Medplum hooks:

```tsx
// Before (error)
const res = await fetch('/fhir/Patient/123');

// After (correct)
import { useMedplum } from '@medplum/react';
const medplum = useMedplum();
const patient = await medplum.readResource('Patient', '123');
```

---

## Review Checklist

### For Reviewers

- [ ] Does the code follow design system patterns?
- [ ] Are FHIR operations using Medplum SDK?
- [ ] Is there any PHI in logs or test data?
- [ ] Are edge cases handled (empty states, errors)?
- [ ] Is the code deterministic where required (PDC, interactions)?

### For Authors

- [ ] All CI checks passing?
- [ ] Addressed Claude review feedback?
- [ ] Updated tests for new functionality?
- [ ] Documented any new patterns?

---

## Getting Help

- **CI failures**: Check the Actions tab for detailed logs
- **Claude review issues**: Check the `claude-review` job logs
- **Design system**: See `docs/COMPONENT_REGISTRY.md`
- **FHIR patterns**: See `docs/FHIR_PATTERNS.md`
- **Local review**: Run `/review` or `/pr-review-toolkit:review-pr` in Claude Code
