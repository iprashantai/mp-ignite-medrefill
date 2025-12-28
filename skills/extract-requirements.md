# Extract Requirements from Legacy Code

Analyze legacy code from ignite-medrefills and generate requirement specifications for migration.

## When to Use

Use this skill when migrating features from the legacy ignite-medrefills repository to the new Medplum-based system. This helps create structured requirement documents that Claude Code can use for implementation.

## Process

### Step 1: Identify Feature Scope

Locate the main component file and understand its boundaries.

**Questions to Answer:**

- What is the main entry point? (e.g., `AllPatientsCRM.jsx`)
- What child components does it use?
- What services does it depend on?
- What routes/pages does it render?

**Analysis Commands:**

```bash
# Find component imports
grep -n "^import" <legacy-file>.jsx | head -30

# Find service dependencies
grep -n "Service\|service" <legacy-file>.jsx

# Find state management
grep -n "useState\|useReducer\|useContext" <legacy-file>.jsx
```

### Step 2: Map Data Sources

Identify where data comes from and map to FHIR resources.

**Legacy Service → FHIR Resource Mapping:**

| Legacy Service           | Legacy Function    | FHIR Resource      | Medplum Method                          |
| ------------------------ | ------------------ | ------------------ | --------------------------------------- |
| `firestoreService.js`    | `getPatients()`    | Patient            | `searchResources('Patient')`            |
| `patientService.js`      | `getPatientById()` | Patient            | `readResource('Patient', id)`           |
| `rxClaimsService.js`     | `getRxClaims()`    | MedicationDispense | `searchResources('MedicationDispense')` |
| `medAdherenceService.js` | `getPDCScores()`   | Observation        | `searchResources('Observation')`        |
| Firebase Realtime DB     | Various            | Task, Flag         | `searchResources('Task')`               |

**Detection Commands:**

```bash
# Find Firestore calls
grep -n "firestore\|firebase\|db\." <legacy-file>.jsx

# Find API calls
grep -n "fetch\|axios\|api\." <legacy-file>.jsx
```

### Step 3: Extract User Stories

Identify the user roles and capabilities from the code.

**Look For:**

- Role checks (`if (user.role === 'pharmacist')`)
- Permission guards
- UI conditional rendering
- Button actions and their effects

**Template:**

```markdown
As a [role from code],
I want [capability observed in UI],
so that [benefit derived from feature context].
```

**Example Extraction:**

```javascript
// Legacy code:
{
  user.role === 'pharmacist' && <Button onClick={handleApprove}>Approve Refill</Button>;
}

// Extracted story:
// As a pharmacist, I want to approve medication refills,
// so that patients receive their medications on time.
```

### Step 4: Document Acceptance Criteria

List all visible UI elements and interactions.

**Checklist:**

- [ ] What columns/fields are displayed?
- [ ] What filters are available?
- [ ] What sorting options exist?
- [ ] What actions can users take?
- [ ] What happens on success?
- [ ] What happens on error?
- [ ] What empty states are shown?

**Example:**

```markdown
## Acceptance Criteria

- [ ] Display patient name, DOB, PDC score, fragility tier in table
- [ ] Filter by PDC status (Pass, At-Risk, Fail)
- [ ] Sort by any column (default: PDC ascending)
- [ ] Click row to navigate to patient detail
- [ ] Show "No patients found" when filter returns empty
- [ ] Show loading skeleton while fetching
- [ ] Show error toast on API failure
```

### Step 5: Map UI Components

Identify legacy UI patterns and map to new design system.

**Legacy → New Component Mapping:**

| Legacy Pattern      | New Component        | Import From                        |
| ------------------- | -------------------- | ---------------------------------- |
| Colored status pill | `PDCBadge`           | `@/components/ui-healthcare`       |
| Risk indicator      | `FragilityBadge`     | `@/components/ui-healthcare`       |
| Data grid           | `Table` components   | `@/components/ui-healthcare/table` |
| Modal dialog        | `Dialog`             | `@/components/ui/dialog`           |
| Form inputs         | shadcn/ui components | `@/components/ui/*`                |
| Medplum search      | `SearchControl`      | `@medplum/react`                   |

### Step 6: Generate Requirement Spec

Output the requirement in the standard template format.

**Template Location:** `docs/templates/FEATURE_SPEC.md`

```markdown
# Feature: [Feature Name]

## Context

- **Target User**: [Role from Step 3]
- **Legacy Reference**: [Path to legacy file]
- **FHIR Resources**: [From Step 2 mapping]

## User Story

[From Step 3]

## Acceptance Criteria

[From Step 4]

## Design Components to Use

[From Step 5 mapping]

## Technical Constraints

### MUST Use

- Import badges from `@/components/ui-healthcare`
- Use `useSearchResources()` for FHIR data
- Validate input with Zod

### MUST NOT

- Hardcode colors
- Use raw fetch() for FHIR
- Create custom badge styling

## Test Requirements

[Derive from acceptance criteria]

## Sample Data

[Extract from legacy or generate FHIR-compatible samples]

## Out of Scope

[Explicitly list what this feature does NOT include]
```

## Example: Patient List Migration

**Legacy File:** `src/pages/med-adherence/AllPatientsCRM.jsx`

**Extracted Requirement:**

```markdown
# Feature: Patient List

## Context

- **Target User**: Clinical Staff, Pharmacist
- **Legacy Reference**: `/ignite-medrefills/src/pages/med-adherence/AllPatientsCRM.jsx`
- **FHIR Resources**: Patient, Observation (PDC), MedicationRequest

## User Story

As a clinical staff member, I want to view a list of all patients with their PDC scores,
so that I can identify and prioritize patients with adherence issues.

## Acceptance Criteria

- [ ] Display columns: Name, DOB, PDC (MAC), PDC (MAD), PDC (MAH), Fragility Tier
- [ ] Show PDC with color-coded badge (green ≥80%, amber 60-79%, red <60%)
- [ ] Filter by: PDC status, Fragility tier, Measure type
- [ ] Sort by any column
- [ ] Click row navigates to /patients/[id]
- [ ] Pagination: 25 rows per page
- [ ] Empty state: "No patients match your filters"

## Design Components to Use

- PDCBadge - PDC score display
- FragilityBadge - Tier indicator
- Table components - Data grid
- SearchControl (Medplum) - Patient search

## Technical Constraints

### MUST Use

- `@/components/ui-healthcare` for badges
- `useSearchResources('Patient')` for data
- `getPDCVariant()` for status logic

### MUST NOT

- Hardcode PDC threshold colors
- Build custom table styling
- Use direct Firestore calls

## Out of Scope

- Patient creation/editing
- Medication management
- Intervention tracking (separate feature)
```

## Quick Reference Commands

```bash
# Count lines in legacy file
wc -l <legacy-file>.jsx

# Find all state variables
grep -n "useState\|useEffect\|useMemo" <legacy-file>.jsx

# Find all event handlers
grep -n "handle\|onClick\|onChange\|onSubmit" <legacy-file>.jsx

# Find all API/data calls
grep -n "await\|\.then\|fetch\|axios" <legacy-file>.jsx
```

## Reference

- Template: `docs/templates/FEATURE_SPEC.md`
- Component Registry: `docs/COMPONENT_REGISTRY.md`
- FHIR Patterns: `docs/FHIR_PATTERNS.md`
- Legacy Repo: `/ignite-medrefills/`
