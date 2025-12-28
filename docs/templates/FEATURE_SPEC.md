# Feature Specification Template

Use this template when writing requirements for Claude Code to implement.

---

# Feature: [Feature Name]

## Overview

**One-sentence description**: [What this feature does]

**Target User**: [Clinical staff / Pharmacist / Admin / etc.]

**Priority**: [High / Medium / Low]

---

## Context

### Legacy Reference (if migrating)

- **Legacy File**: `/path/to/legacy/ignite-medrefills/src/pages/FeatureName.jsx`
- **Legacy Service**: `/path/to/legacy/service.js`
- **What to preserve**: [List key behaviors to keep]
- **What to change**: [List improvements]

### Related FHIR Resources

- [ ] Patient
- [ ] MedicationRequest
- [ ] MedicationDispense
- [ ] Task
- [ ] Observation
- [ ] Other: \_\_\_

### Design Components to Use

- [ ] PDCBadge
- [ ] FragilityBadge
- [ ] MeasureBadge
- [ ] RunoutBadge
- [ ] DecisionBadge
- [ ] Table components
- [ ] Other: \_\_\_

---

## User Story

As a **[role]**,
I want **[capability]**,
so that **[benefit]**.

---

## Acceptance Criteria

### Must Have (P0)

- [ ] Criterion 1 - [specific, testable requirement]
- [ ] Criterion 2
- [ ] Criterion 3

### Should Have (P1)

- [ ] Criterion 4
- [ ] Criterion 5

### Nice to Have (P2)

- [ ] Criterion 6

---

## UI/UX Requirements

### Layout

[Describe the page layout, sections, responsive behavior]

### Key Interactions

1. [User clicks X → Y happens]
2. [User enters Z → validation occurs]
3. [User submits → FHIR resource created]

### Loading States

- [ ] Show skeleton/spinner while loading
- [ ] Handle empty state (no data)
- [ ] Handle error state

### Accessibility

- [ ] Keyboard navigation
- [ ] Screen reader labels
- [ ] Color contrast

---

## Technical Constraints

### MUST Use

- Import badges from `@/components/ui-healthcare`
- Import tables from `@/components/ui-healthcare/table`
- Import design helpers from `@/lib/design-system/helpers`
- Use `useMedplum()` or `useSearchResources()` for FHIR data
- Validate input with Zod before FHIR operations
- Use shadcn/ui for general UI components

### MUST NOT

- Hardcode colors (use semantic components)
- Use raw `fetch()` for FHIR (use Medplum SDK)
- Create custom badge styling
- Bypass Zod validation
- Log PHI (patient names, DOB, etc.)

---

## Data Requirements

### Input Data

| Field       | Source             | Type                | Required |
| ----------- | ------------------ | ------------------- | -------- |
| Patient     | URL param / search | FHIR Patient        | Yes      |
| Medications | Medplum search     | MedicationRequest[] | Yes      |
| ...         | ...                | ...                 | ...      |

### Output/Side Effects

| Action        | Result                      |
| ------------- | --------------------------- |
| User approves | Create/update Task resource |
| User submits  | Update Observation          |
| ...           | ...                         |

---

## Test Requirements

### Unit Tests

- [ ] Test 1: [describe test case]
- [ ] Test 2: [describe test case]

### Integration Tests

- [ ] Test with mock FHIR data
- [ ] Test error handling

### Edge Cases

- [ ] Empty data set
- [ ] Very long patient names
- [ ] PDC edge values (0%, 60%, 80%, 100%)

---

## Files to Reference

### Existing Patterns

- Similar component: `src/app/(dashboard)/page.tsx`
- Design tokens: `src/lib/design-system/tokens.ts`
- Design helpers: `src/lib/design-system/helpers.ts`

### Documentation

- Component registry: `docs/COMPONENT_REGISTRY.md`
- FHIR patterns: `docs/FHIR_PATTERNS.md`

---

## Out of Scope

**This feature does NOT include:**

1. [Explicit exclusion 1]
2. [Explicit exclusion 2]
3. [Future enhancement to defer]

---

## Examples / Screenshots

### Current State (Legacy)

[Insert screenshot or describe current behavior]

### Desired State

[Insert mockup or describe desired behavior]

### Sample Data

```json
{
  "patient": {
    "id": "patient-123",
    "name": [{ "given": ["John"], "family": "Smith" }]
  },
  "pdc": 85,
  "tier": "F4_COMFORTABLE",
  "medications": [{ "id": "med-1", "display": "Lisinopril 10mg" }]
}
```

---

## Checklist Before Handoff

- [ ] All acceptance criteria are specific and testable
- [ ] FHIR resources identified
- [ ] UI components selected from registry
- [ ] Legacy reference provided (if applicable)
- [ ] Out of scope is clear
- [ ] Sample data provided
