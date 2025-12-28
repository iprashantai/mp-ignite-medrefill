# Validate Requirement Specification

Validate that a feature requirement specification is complete and actionable before implementation.

## When to Use

Run this skill when reviewing a feature specification before starting implementation. This ensures the requirement has all necessary information for Claude Code to implement correctly.

## Validation Checklist

### 1. Context Completeness

Check that the requirement includes:

- [ ] **Feature name** - Clear, descriptive title
- [ ] **Target user** - Who will use this feature
- [ ] **Legacy reference** (if migrating) - Path to legacy file
- [ ] **FHIR resources** - Which resources are needed

**Missing Example:**

```markdown
# Feature: Patient List

Add a patient list page.
```

**Complete Example:**

```markdown
# Feature: Patient List

## Context

- Target User: Clinical Staff
- Legacy Reference: `/ignite-medrefills/src/pages/med-adherence/AllPatientsCRM.jsx`
- FHIR Resources: Patient, MedicationRequest, Observation (PDC)
```

### 2. User Story Format

Verify the user story follows the format:

```
As a [role], I want [capability], so that [benefit].
```

**Incomplete:**

```
Add filtering to patient list.
```

**Complete:**

```
As a clinical staff member, I want to filter patients by PDC status, so that I can prioritize at-risk patients.
```

### 3. Acceptance Criteria

Check for specific, testable criteria:

- [ ] Uses checkboxes `- [ ]`
- [ ] Each criterion is specific and measurable
- [ ] Covers happy path and edge cases

**Vague:**

```
- [ ] Page loads patients
- [ ] Filtering works
```

**Specific:**

```
- [ ] Page displays patient name, DOB, PDC score, fragility tier
- [ ] Clicking a patient row navigates to /patients/[id]
- [ ] PDC filter shows Pass/At-Risk/Fail options
- [ ] Empty state shows "No patients found" message
```

### 4. Component References

Verify the requirement specifies which design system components to use:

```markdown
## Design Components to Use

- [ ] PDCBadge - for PDC status display
- [ ] FragilityBadge - for fragility tier
- [ ] Table components - for patient list
```

**Missing component guidance will lead to custom implementations!**

### 5. Technical Constraints

Check for MUST/MUST NOT constraints:

```markdown
## Technical Constraints

### MUST Use

- Import badges from `@/components/ui-healthcare`
- Use `useSearchResources()` for FHIR data
- Validate input with Zod

### MUST NOT

- Hardcode colors
- Use raw fetch() for FHIR
- Create custom badge styling
```

### 6. Test Requirements

Verify test cases are specified:

```markdown
## Test Requirements

- [ ] Unit test: Filter function handles empty array
- [ ] Unit test: PDC calculation boundary (79%, 80%)
- [ ] Edge case: Very long patient name truncates
```

### 7. Sample Data

Check for example data that Claude Code can use:

```json
{
  "patients": [
    {
      "id": "patient-123",
      "name": [{ "given": ["John"], "family": "Smith" }],
      "pdc": 85,
      "tier": "F4_COMFORTABLE"
    }
  ]
}
```

### 8. Out of Scope

Verify explicit exclusions to prevent scope creep:

```markdown
## Out of Scope

- Patient creation/editing (separate feature)
- Export to CSV (future enhancement)
- Real-time updates (using polling for now)
```

## Report Format

After validation, report:

```
Requirement Validation: [Feature Name]
----------------------------------------
[ ] Context: MISSING legacy reference
[x] User Story: Complete
[ ] Acceptance Criteria: 2 criteria are vague
[x] Component References: Complete
[ ] Technical Constraints: Missing MUST NOT section
[x] Test Requirements: Complete
[x] Sample Data: Complete
[x] Out of Scope: Complete

Issues to Resolve:
1. Add legacy file path if this is a migration
2. Make criteria 3 and 5 more specific
3. Add MUST NOT section to prevent anti-patterns
```

## Quick Validation Commands

Check if template sections are present:

```bash
# Check for required sections
grep -c "## Context" feature-spec.md
grep -c "## User Story" feature-spec.md
grep -c "## Acceptance Criteria" feature-spec.md
grep -c "## Technical Constraints" feature-spec.md
grep -c "MUST NOT" feature-spec.md
```

## Reference

Template: `docs/templates/FEATURE_SPEC.md`
