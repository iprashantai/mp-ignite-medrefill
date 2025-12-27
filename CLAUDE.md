# Ignite Health - Claude Code Master Context

## Project Identity

**Ignite Health** is an AI-native medication adherence management platform for healthcare providers. We proactively analyze upcoming medication refills 15 days in advance, evaluate safety/eligibility across national patient data, and provide confidence-categorized recommendations for clinical staff approval.

**Mission**: Improve HEDIS Star Ratings (MAD, MAC, MAH) through proactive medication refill management, targeting near-100% precision in AI recommendations.

## Technology Stack

### Core Platform

- **Backend**: Medplum (Headless FHIR Platform) - DO NOT CLONE, use SDK
- **Frontend**: Next.js 14+ with App Router, React 18+, TypeScript 5+
- **Database**: PostgreSQL via Medplum (FHIR resources stored as JSONB)
- **AI/ML**: AWS Bedrock (Claude), custom ML models for adherence prediction
- **Auth**: Medplum OAuth2 / SMART on FHIR

### Key Libraries

```json
{
  "@medplum/core": "^3.x",
  "@medplum/react": "^3.x",
  "@medplum/fhirtypes": "^3.x",
  "next": "^15.5.9",
  "react": "^19.2.1",
  "typescript": "^5.7.2",
  "zod": "^3.23.8",
  "zustand": "^5.0.0",
  "@tanstack/react-query": "^5.59.0",
  "tailwindcss": "^3.4.14",
  "vitest": "^4.0.12"
}
```

## Architecture Principles

### 1. Deterministic vs AI Separation (CRITICAL)

```
DETERMINISTIC (100% rule-based, NO AI):
├── PDC Calculation (mathematical formula)
├── Drug-Drug Interaction Checking (database lookup)
├── Lab Value Threshold Alerts (simple comparisons)
├── Formulary Eligibility (rules engine)
├── FHIR Data Validation (schema validation)
└── Audit Logging (structured records)

AI-ENHANCED (with human oversight):
├── Risk Stratification (ML prediction)
├── Clinical Reasoning Generation (LLM)
├── Trend Analysis (pattern recognition)
├── Patient Communication Drafts (NLG)
└── Recommendation Explanation (LLM with RAG)
```

### 2. Multi-Stage Verification Pipeline

Every AI output must pass through:

1. **Schema Validation** - Zod schemas for all outputs
2. **Safety Checker** - Separate model validates clinical safety
3. **Citation Verification** - All claims traced to sources
4. **Confidence Scoring** - Multi-factor confidence calculation
5. **Human Routing** - Low confidence → escalate to pharmacist

### 3. FHIR Resource Model

Primary resources we use:

- `Patient` - Demographics, identifiers
- `MedicationRequest` - Active prescriptions
- `MedicationDispense` - Pharmacy fill records (PDC source)
- `Task` - Workflow items for staff review
- `Observation` - PDC scores, risk assessments
- `Condition` - Diagnoses for protocol validation
- `AllergyIntolerance` - Safety checking
- `Flag` - Urgency markers, alerts

## Medplum-First Development (CRITICAL)

**ALWAYS use Medplum's native components before writing custom code.**

Medplum is a production-grade, HIPAA-compliant platform. Its components handle edge cases, security, and performance that custom code often misses.

### Required: Use Native Components

| Need                    | Use This                                | NOT This                                |
| ----------------------- | --------------------------------------- | --------------------------------------- |
| Search/browse resources | `<SearchControl>`                       | Custom tables with `useSearchResources` |
| Display single resource | `<ResourceTable>`                       | Custom field rendering                  |
| Patient info display    | `<PatientHeader>`, `<PatientSummary>`   | Custom patient cards                    |
| Authentication          | `<SignInForm>`                          | Custom OAuth flows                      |
| Resource forms          | `<ResourceForm>`, `<QuestionnaireForm>` | Custom form builders                    |
| Data fetching           | `useSearch`, `useSearchResources`       | Custom fetch + useState                 |
| Real-time updates       | `useSubscription`                       | Polling or custom WebSocket             |

### Component Usage Examples

```typescript
// CORRECT: Use Medplum's SearchControl
import { SearchControl } from '@medplum/react';

<SearchControl
  search={{ resourceType: 'Patient' }}
  onChange={(e) => setSearch(e.definition)}
  onClick={(e) => handlePatientSelect(e.resource)}
/>

// WRONG: Custom implementation
const [patients, loading] = useSearchResources('Patient', {...});
// Then manually building table, handling pagination, filters...
```

```typescript
// CORRECT: Use Medplum's ResourceTable for display
import { ResourceTable } from '@medplum/react';

<ResourceTable value={patient} />

// WRONG: Manually rendering each field
<div>{patient.name?.[0]?.given?.join(' ')}</div>
```

### When Custom UI is Acceptable

Only write custom components when:

1. **Brand-specific styling** - Wrap Medplum components, don't replace them
2. **Domain-specific workflows** - E.g., PDC-specific visualizations
3. **AI integration UI** - Confidence scores, recommendation cards
4. **Medplum has no equivalent** - Check docs first!

### UI Library Strategy (IMPORTANT)

We use **two UI libraries** with clear boundaries:

| Area                 | Library   | Components                            | Reason                             |
| -------------------- | --------- | ------------------------------------- | ---------------------------------- |
| **Developer Tools**  | Mantine   | `/dev/*`, `/[resourceType]/[id]`      | Medplum components require Mantine |
| **Main Application** | shadcn/ui | Dashboard, Queue, Patients, Analytics | Custom, modern UI                  |

**Rules:**

1. **Dev tools pages** (`/dev/explorer`, `/dev/search`, resource detail pages): Use Mantine + Medplum native components
2. **Application pages** (everything else): Use shadcn/ui + Tailwind CSS
3. **Never mix** shadcn/ui and Mantine components on the same page - causes CSS conflicts
4. **Medplum hooks** (`useMedplum`, `useSearchResources`) can be used anywhere - they don't have UI

```typescript
// DEV TOOLS - Use Mantine
import { Paper, Stack, Tabs, Button } from '@mantine/core';
import { SearchControl, ResourceTable } from '@medplum/react';

// MAIN APP - Use shadcn/ui
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMedplum } from '@medplum/react'; // Hooks are fine
```

### Provider Setup (Required)

```typescript
// src/lib/medplum/provider.tsx
import { MedplumProvider } from '@medplum/react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

// MantineProvider is REQUIRED for Medplum React components
export function AppProvider({ children }) {
  return (
    <MantineProvider>
      <MedplumProvider medplum={medplum}>
        {children}
      </MedplumProvider>
    </MantineProvider>
  );
}
```

### Available Medplum Components

**Authentication:**

- `SignInForm` - Full auth with email, Google, MFA
- `RegisterForm` - User registration

**Search & Display:**

- `SearchControl` - Full search UI with filters, sort, pagination
- `ResourceTable` - Display any FHIR resource as table
- `ResourceForm` - Auto-generated forms for any resource

**Patient:**

- `PatientHeader` - Patient banner
- `PatientSummary` - Patient overview card
- `PatientTimeline` - Activity timeline

**Clinical:**

- `DiagnosticReportDisplay` - Lab results
- `ObservationTable` - Observations grid
- `QuestionnaireForm` - FHIR questionnaires

**Inputs:**

- `ReferenceInput` - Select FHIR references
- `CodeableConceptInput` - Select coded values
- `DateTimeInput` - Date/time picker

**Hooks:**

- `useMedplum()` - Access MedplumClient
- `useMedplumProfile()` - Current user
- `useSearchResources()` - Search with caching
- `useResource()` - Fetch by reference
- `useSubscription()` - Real-time updates

## Coding Standards

### TypeScript Requirements

```typescript
// ALWAYS use strict types - never 'any'
// ALWAYS use Zod for runtime validation
// ALWAYS use FHIR types from @medplum/fhirtypes

import { Patient, MedicationRequest, Task } from '@medplum/fhirtypes';
import { z } from 'zod';

// Example: Typed FHIR extension for custom fields
const PDCScoreExtension = z.object({
  url: z.literal('https://ignitehealth.com/fhir/extensions/pdc-score'),
  valueDecimal: z.number().min(0).max(1),
});

// Example: Medplum client usage
import { MedplumClient } from '@medplum/core';

const medplum = new MedplumClient({
  baseUrl: process.env.MEDPLUM_BASE_URL,
  clientId: process.env.MEDPLUM_CLIENT_ID,
});
```

### Error Handling

```typescript
// ALWAYS use Result pattern for operations that can fail
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// ALWAYS wrap external calls
async function safeMedplumCall<T>(operation: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    logger.error('Medplum operation failed', { error });
    return { success: false, error: error as Error };
  }
}
```

### File Organization

```
src/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── ui/                 # Shadcn/ui components
│   ├── fhir/               # FHIR-aware components
│   └── command-center/     # Main dashboard components
├── lib/
│   ├── medplum/            # Medplum client & utilities
│   ├── fhir/               # FHIR helpers & transformers
│   ├── pdc/                # PDC calculation (deterministic)
│   ├── safety/             # Drug interaction, lab checks
│   └── ai/                 # AI integration layer
├── schemas/                # Zod schemas
├── types/                  # TypeScript types
└── bots/                   # Medplum Bots (server-side logic)
```

## Medplum-Specific Patterns

### Creating Resources

```typescript
// ALWAYS validate before creating
const patientSchema = z.object({
  resourceType: z.literal('Patient'),
  name: z
    .array(
      z.object({
        given: z.array(z.string()),
        family: z.string(),
      })
    )
    .min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function createPatient(data: unknown): Promise<Result<Patient>> {
  const validation = patientSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: new Error(validation.error.message) };
  }
  return safeMedplumCall(() => medplum.createResource(validation.data));
}
```

### Searching Resources

```typescript
// Use SearchRequest for type-safe queries
import { SearchRequest } from '@medplum/core';

const search: SearchRequest<MedicationRequest> = {
  resourceType: 'MedicationRequest',
  filters: [
    { code: 'status', value: 'active' },
    { code: 'patient', value: `Patient/${patientId}` },
  ],
  sortRules: [{ code: '-authoredon' }],
};

const medications = await medplum.searchResources(search);
```

### Medplum Bots

```typescript
// Bots run server-side on Medplum infrastructure
// Location: src/bots/

import { BotEvent, MedplumClient } from '@medplum/core';
import { Task } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent<Task>): Promise<void> {
  const task = event.input;

  // ALWAYS log bot execution for audit
  console.log(`Processing task ${task.id}`, {
    taskId: task.id,
    status: task.status,
    timestamp: new Date().toISOString(),
  });

  // Bot logic here...
}
```

## HIPAA & Compliance Requirements

### Audit Logging (MANDATORY)

```typescript
// Every PHI access MUST be logged
interface AuditEntry {
  timestamp: string;
  userId: string;
  action: 'create' | 'read' | 'update' | 'delete';
  resourceType: string;
  resourceId: string;
  patientId?: string;
  details?: Record<string, unknown>;
}

// Medplum provides AuditEvent automatically for FHIR operations
// For custom operations, create explicit AuditEvent resources
```

### PHI Handling

```typescript
// NEVER log PHI in plain text
// NEVER include PHI in error messages
// ALWAYS use patient IDs, never names in logs

// BAD:
console.log(`Processing patient John Doe, DOB 1955-03-15`);

// GOOD:
console.log(`Processing patient ${patientId}`);
```

## AI Integration Guidelines

### Prompt Engineering

```typescript
// ALWAYS use structured prompts with explicit constraints
const CLINICAL_REASONING_PROMPT = `
You are a clinical decision support system analyzing medication refill requests.

CONTEXT:
- Patient age: {age}
- Active medications: {medications}
- Relevant conditions: {conditions}
- Current PDC scores: {pdcScores}
- Days until refill gap: {daysUntilGap}

TASK: Evaluate if this refill should be proactively approved.

CONSTRAINTS:
1. NEVER recommend approval if drug interactions exist
2. NEVER recommend approval if contraindications present
3. ALWAYS cite specific clinical guidelines
4. ALWAYS express uncertainty when data is incomplete
5. Output MUST follow the exact JSON schema below

OUTPUT SCHEMA:
{outputSchema}

RESPOND ONLY WITH VALID JSON:
`;
```

### Confidence Scoring

```typescript
// Multi-factor confidence calculation
interface ConfidenceFactors {
  checkerAgreement: number; // 0-1: Agreement between primary and checker model
  selfConsistency: number; // 0-1: Consistency across multiple generations
  sourceQuality: number; // 0-1: Quality of retrieved sources
  contextCompleteness: number; // 0-1: How complete is patient context
  modelConfidence: number; // 0-1: Model's stated confidence
}

function calculateOverallConfidence(factors: ConfidenceFactors): number {
  // Weighted average with safety bias
  return (
    factors.checkerAgreement * 0.3 +
    factors.selfConsistency * 0.25 +
    factors.sourceQuality * 0.2 +
    factors.contextCompleteness * 0.15 +
    factors.modelConfidence * 0.1
  );
}

// Routing thresholds
const CONFIDENCE_THRESHOLDS = {
  AUTO_APPROVE: 0.95, // Very high confidence → recommend with minimal review
  STANDARD_REVIEW: 0.85, // High confidence → recommend with standard review
  ENHANCED_REVIEW: 0.7, // Medium confidence → recommend with enhanced review
  PHARMACIST_ESCALATION: 0, // Below 0.70 → escalate to pharmacist
};
```

## Testing Requirements

### Unit Tests

- Every function must have tests
- Use Vitest for testing
- Mock Medplum client for unit tests

### Integration Tests

- Test against Medplum sandbox
- Use Synthea-generated test data
- Verify FHIR resource creation/retrieval

### Clinical Validation

- All AI recommendations must be validated by clinical SME
- Maintain test suite of known clinical scenarios
- Track precision/recall metrics

## Common Mistakes to Avoid

1. **DO NOT** write custom UI when Medplum has a native component
2. **DO NOT** use `any` type in TypeScript
3. **DO NOT** skip Zod validation for external data
4. **DO NOT** hardcode Medplum credentials
5. **DO NOT** log PHI
6. **DO NOT** trust AI output without validation
7. **DO NOT** use AI for deterministic calculations (PDC, interactions)
8. **DO NOT** skip error handling for async operations
9. **DO NOT** create FHIR resources without required fields
10. **DO NOT** build custom tables/forms when `SearchControl`/`ResourceForm` exist

## Quick Reference Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Deploy Medplum Bot
npx medplum bot deploy <bot-name>

# Generate FHIR types
npx @medplum/cli generate

# Validate FHIR resources
npx @medplum/cli validate <resource.json>
```

## Environment Variables

```env
# Medplum Configuration
MEDPLUM_BASE_URL=https://api.medplum.com/
MEDPLUM_CLIENT_ID=your-client-id
MEDPLUM_CLIENT_SECRET=your-client-secret

# AWS Bedrock (for AI)
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Feature Flags
ENABLE_AI_RECOMMENDATIONS=true
ENABLE_AUTO_APPROVAL=false  # Keep false until validated
```

## Getting Help

- Medplum Docs: https://docs.medplum.com
- Medplum Discord: https://discord.gg/medplum
- FHIR R4 Spec: https://hl7.org/fhir/R4
- US Core IG: https://hl7.org/fhir/us/core

---

**Remember**: We are building clinical-grade software. Every line of code potentially affects patient safety. When in doubt, be more cautious, add more validation, and escalate to human review.

---

## Design System Standards & Enforcement

### Single Source of Truth

**AUTHORITATIVE:** `/docs/design-system/UI_DESIGN_SYSTEM.md`

- This document is the **only** valid reference for design decisions
- Every design decision maps to an ID in this document (e.g., `COLOR.PRIMARY.DEFAULT`)
- If you find UI issues not covered, add them to the design system first before implementing

### Design Token Sources (Priority Order)

1. `UI_DESIGN_SYSTEM.md` - AUTHORITATIVE specification
2. `src/lib/design-system/tokens.ts` - TypeScript tokens (must match #1)
3. `src/styles/design-system.css` - CSS variables (must match #1)
4. `BADGE_INVENTORY.md` - Centralized badge patterns

### Component Libraries

**Healthcare-Specific (use for clinical UI):**

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
} from '@/components/ui-healthcare';

import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  DensityToggle,
  TableFooter,
  useTableState,
} from '@/components/ui-healthcare/table';
```

**General UI (shadcn/ui):**

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
```

### Color Palette (Authoritative)

**Primary Brand Color:** Blue-600 (#2563EB)

```typescript
// Correct
(bg - blue - 600, bg - blue - 100, text - blue - 700);
// Wrong (deprecated)
(bg - teal - 600, bg - teal - 100);
```

**Status Colors:**

- Success: green-500 (#22C55E) - Passing, approved
- Warning: amber-500 (#F59E0B) - At-risk, caution
- Danger: red-500 (#EF4444) - Failing, urgent
- Info: blue-500 (#3B82F6) - Informational

### Badge Design System (CRITICAL RULES)

**Rule 1: NO BORDERS on badges** (per BADGE_INVENTORY.md)

```tsx
// CORRECT - No border
className = 'px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium';

// WRONG - Has border
className = 'px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-300 rounded-full';
```

**Rule 2: Use Healthcare Badge Components**

```tsx
// Instead of building custom badges, use provided components
<PDCBadge pdc={85} />                      // Auto-selects "Pass" (green)
<MeasureBadge measure="MAC" />             // "MAC" (blue)
<FragilityBadge tier="F1_IMMINENT" />      // "Critical" (red)
<DecisionBadge decision="approve" />       // "Approve" (green)
<RunoutBadge daysToRunout={5} />           // "5d left" (orange)
```

**Rule 3: Background-Text Color Pairs (NO exceptions)**

- bg-blue-100 + text-blue-700 (or text-blue-800 for measures)
- bg-green-100 + text-green-700
- bg-amber-100 + text-amber-700
- bg-red-100 + text-red-700
- bg-purple-100 + text-purple-800 (MAD)
- bg-pink-100 + text-pink-800 (MAH)
- bg-orange-100 + text-orange-700 (F2 Fragile)
- bg-yellow-100 + text-yellow-700 (F3 Moderate)
- bg-gray-100 + text-gray-600 (T5 Unsalvageable)

### Healthcare PDC Thresholds (Non-Negotiable)

| PDC Range | Status  | Color | Badge Variant |
| --------- | ------- | ----- | ------------- |
| ≥80%      | Pass    | Green | `pass`        |
| 60-79%    | At-Risk | Amber | `caution`     |
| <60%      | Fail    | Red   | `fail`        |

```tsx
// Automatic threshold handling
<PDCBadge pdc={85} />  // → Green "Pass"
<PDCBadge pdc={72} />  // → Amber "At-Risk"
<PDCBadge pdc={45} />  // → Red "Fail"
```

### Healthcare Measure Badges

| Measure | Full Name    | Color Classes                 |
| ------- | ------------ | ----------------------------- |
| MAC     | Cholesterol  | bg-blue-100 text-blue-800     |
| MAD     | Diabetes     | bg-purple-100 text-purple-800 |
| MAH     | Hypertension | bg-pink-100 text-pink-800     |

### Fragility Tier Badges

| Tier             | Label    | Color Classes                 |
| ---------------- | -------- | ----------------------------- |
| F1_IMMINENT      | Critical | bg-red-100 text-red-700       |
| F2_FRAGILE       | Fragile  | bg-orange-100 text-orange-700 |
| F3_MODERATE      | Moderate | bg-yellow-100 text-yellow-700 |
| F4_COMFORTABLE   | Stable   | bg-blue-100 text-blue-700     |
| F5_SAFE          | Safe     | bg-green-100 text-green-700   |
| T5_UNSALVAGEABLE | Lost     | bg-gray-100 text-gray-600     |

### Table Development (REQUIRED)

When building data tables, **ALWAYS** use the healthcare Table components:

```tsx
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  DensityToggle,
  TableFooter,
} from '@/components/ui-healthcare/table';
import { useTableState } from '@/components/ui-healthcare/table';

function PatientTable({ patients }: { patients: Patient[] }) {
  const { density, setDensity, getSortProps } = useTableState();

  return (
    <>
      <DensityToggle density={density} onDensityChange={setDensity} />
      <Table density={density}>
        <TableHead sticky>
          <TableRow>
            <TableHeaderCell {...getSortProps('name')}>Name</TableHeaderCell>
            <TableHeaderCell {...getSortProps('pdc')}>PDC</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {patients.map((patient) => (
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

**DO NOT** build tables with raw `<table>` elements and inline Tailwind classes.

### Design System Violations to Prevent

**Auto-Fail Violations (code review rejection):**

1. ❌ Borders on badges
2. ❌ Primary color not blue-600
3. ❌ Custom badge components instead of ui-healthcare
4. ❌ Hardcoded colors not in UI_DESIGN_SYSTEM.md
5. ❌ Tables without reusable Table components
6. ❌ PDC colors not matching thresholds (>=80% must be green)
7. ❌ Missing patient context in clinical UI

**High-Priority Violations:**

- Ad-hoc button styling instead of shadcn Button
- Input elements without proper focus states
- Card-like layouts without Card component
- Mixed border-radius values
- Arbitrary font sizes

### Design System Helper Functions

```tsx
import {
  getPDCVariant,
  getPDCLabel,
  getPDCClasses,
  getFragilityVariant,
  getFragilityLabel,
  getFragilityClasses,
  getMeasureVariant,
  getMeasureClasses,
  getRunoutVariant,
  getRunoutLabel,
  getDecisionVariant,
} from '@/lib/design-system';

// Examples
getPDCVariant(85); // → 'pass'
getPDCClasses(85); // → 'bg-green-100 text-green-700'
getFragilityClasses('F1'); // → 'bg-red-100 text-red-700'
getMeasureClasses('MAC'); // → 'bg-blue-100 text-blue-800'
```

### Documentation References

- **Full Design System:** `docs/design-system/UI_DESIGN_SYSTEM.md`
- **Badge Inventory:** `docs/design-system/BADGE_INVENTORY.md`
- **Table Guide:** `docs/design-system/tables/TABLE_IMPLEMENTATION_GUIDE.md`
- **Table QA Checklist:** `docs/design-system/tables/TABLE_QA_CHECKLIST.md`
- **Workspace (Dark Mode):** `docs/design-system/workspace/DESIGN_SYSTEM.md`

### Design System Checklist

Before submitting code:

- [ ] All colors from UI_DESIGN_SYSTEM.md palette?
- [ ] Using Button/Badge/Card/Table from component library?
- [ ] No borders on any badge elements?
- [ ] Primary color only `blue-600`, never `teal-*`?
- [ ] PDC thresholds correct (>=80% green, 60-79% amber, <60% red)?
- [ ] Tables using `@/components/ui-healthcare/table`?
- [ ] Imports using barrel exports?
