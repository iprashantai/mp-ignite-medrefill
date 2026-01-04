# Ignite Health MedRefills - ACCELERATED Implementation Plan

## Executive Summary

**Original Estimate**: 8+ weeks from scratch
**Accelerated Estimate**: 4-5 weeks by migrating production-ready legacy code

The legacy repository at `/Users/arpitjain/work/ignite/medrefills/ignite-medrefills/` contains **production-tested business logic** (23,000+ lines) that can be directly migrated. This plan identifies exactly what to port vs rebuild.

---

## What We're Migrating vs Rebuilding

### ✅ MIGRATE AS-IS (Deterministic Business Logic)

These are pure TypeScript/JavaScript functions with no Firebase dependencies:

| Legacy File                     | Lines | What It Does                                                                       | Migration Effort |
| ------------------------------- | ----- | ---------------------------------------------------------------------------------- | ---------------- |
| `fragilityTierService.js`       | 588   | Fragility tier calculation (F1-F5, T5, COMPLIANT), priority scoring, Q4 tightening | 2 hours          |
| `coverageCalendarService.js`    | 553   | PDC calculation, HEDIS-compliant interval merging, runout dates, salvageability    | 2 hours          |
| `llmSchemas.js`                 | 117   | AI output schemas (Primary, QA, Manager, MasterQA)                                 | 30 min           |
| `goldenStandardTestBed.test.js` | 1656  | Complete test suite with 100+ test cases (tier, priority, pathway)                 | 1 hour           |
| `refillWorklistAIWorkflow.js`   | 384   | 3-tier AI pipeline orchestration                                                   | 3 hours          |
| `pathwayService.js`             | 400+  | Refill/Renewal/Appointment routing (A/B/C pathways)                                | 2 hours          |

**Total Migration: ~10-12 hours**

### 🔄 ADAPT (Needs Refactoring for Medplum)

These need FHIR data mapping but core logic stays same:

| Legacy File              | What It Does                                | Adaptation Needed                 |
| ------------------------ | ------------------------------------------- | --------------------------------- |
| `protocolService.js`     | 16 protocol checks (S1-4, C1-4, I1-4, A1-4) | Query Medplum instead of Firebase |
| `dualProtocolService.js` | Protocol + AI evaluation                    | Wire to Medplum Task resources    |
| `medAdherenceService.js` | Gap days, PDC orchestration                 | Use Medplum MedicationDispense    |

### 🆕 BUILD NEW (Medplum-specific)

These must be built fresh using Medplum patterns:

| Component          | Why New                                    |
| ------------------ | ------------------------------------------ |
| FHIR Data Services | Medplum SDK instead of Firebase            |
| Authentication     | Medplum OAuth instead of Firebase Auth     |
| AWS Bedrock Client | Replace Gemini with Claude                 |
| Prompt Templates   | Tune for Claude (different from Gemini)    |
| UI Components      | Already have shadcn/ui + healthcare badges |

---

## Legacy Code Deep Dive

### Fragility Tier Service (588 lines) - COPY DIRECTLY

**Key Functions:**

```typescript
// calculateFragilityTier() - Lines 117-279
// Returns: { tier, tierLevel, color, action, contactWindow, pdcStatusQuo, pdcPerfect, delayBudgetPerRefill, flags }

// applyQ4Tightening() - Lines 293-356
// Promotes tier if <60 days to year-end AND ≤5 gap days

// calculatePriorityScore() - Lines 415-489
// Returns: { priorityScore, baseScore, bonuses, urgencyLevel, breakdown }

// calculateFragilityMetrics() - Lines 522-579
// Comprehensive metrics combining tier + priority + metadata
```

**Golden Standard Thresholds (from test file):**

```javascript
const GOLDEN_STANDARD = {
  tiers: {
    COMPLIANT: { check: 'PDC Status Quo ≥ 80%' },
    T5_UNSALVAGEABLE: { check: 'PDC Perfect < 80%' },
    F1_IMMINENT: { delayBudget: { min: 0, max: 2 }, contactWindow: '24 hours' },
    F2_FRAGILE: { delayBudget: { min: 3, max: 5 }, contactWindow: '48 hours' },
    F3_MODERATE: { delayBudget: { min: 6, max: 10 }, contactWindow: '1 week' },
    F4_COMFORTABLE: { delayBudget: { min: 11, max: 20 }, contactWindow: '2 weeks' },
    F5_SAFE: { delayBudget: { min: 21, max: Infinity }, contactWindow: 'Monthly' },
  },
  priorityScores: {
    F1_IMMINENT: 100,
    F2_FRAGILE: 80,
    F3_MODERATE: 60,
    F4_COMFORTABLE: 40,
    F5_SAFE: 20,
    COMPLIANT: 0,
    T5_UNSALVAGEABLE: 0,
  },
  bonuses: {
    outOfMedication: 30,
    q4: 25,
    multipleMAMeasures: 15,
    newPatient: 10,
  },
};
```

### Coverage Calendar Service (553 lines) - COPY DIRECTLY

**Key Functions:**

```typescript
// generateCoverageCalendar() - Lines 83-198
// Returns daily coverage status from enrollment to year-end

// calculateCoveredDays() - Lines 372-498 ⭐ HEDIS-COMPLIANT
// Interval merging algorithm per HEDIS MY2025 spec:
// 1. Build coverage intervals: [fillDate, fillDate + daysSupply - 1]
// 2. Sort intervals by start date
// 3. Merge overlapping/adjacent intervals
// 4. Cap at measurement year end
// 5. Sum days from merged intervals

// calculateDaysToRunout() - Lines 210-219
// checkSalvageability() - Lines 262-286
// calculateCoverageGap() - Lines 305-333
```

### 3-Tier AI Workflow (384 lines) - ADAPT FOR CLAUDE

**Pipeline Structure:**

```javascript
// runRefillItemAIEvaluation() - Lines 68-383
//
// 1. Protocol Validation Check (lines 82-101)
//    - If no protocol, default to Deny
//
// 2. Primary AI Analysis (lines 113-219)
//    - Input: patient data + protocols + knowledge base
//    - Output: decision, rationale, nextSteps, erx
//
// 3. QA Layer (lines 222-356)
//    - Input: patient data + Primary decision
//    - Output: qaDecision (Agree/Disagree), qaRationale, suggestedDecision
//
// 4. Manager Layer (lines 264-341) - Only if QA disagrees
//    - Input: Primary + QA decisions
//    - Output: finalDecision, managerRationale, nextSteps, erx
//
// 5. Confidence Calculation (lines 366-380)
//    - 95%: Primary + QA agree, protocol passes
//    - 90%: Clear protocol violation, both agree on denial
//    - 85%: Manager resolved disagreement
//    - 75%: QA disagrees, no manager
//    - 70%: Error cases
```

### AI Schemas (117 lines) - CONVERT TO ZOD

**Legacy (Gemini JSON Schema):**

```javascript
export const primaryAISchema = {
  type: "OBJECT",
  properties: {
    "decision": { "type": "STRING", "enum": ["Approve", "Deny"] },
    "rationale": { "type": "STRING" },
    "nextSteps": { "type": "ARRAY", "items": { "type": "STRING" } },
    "erx": { "type": "OBJECT", "properties": { ... } }
  },
  "required": ["decision", "rationale", "nextSteps"]
};
```

**New (Zod):**

```typescript
export const PrimaryAIOutputSchema = z.object({
  decision: z.enum(['Approve', 'Deny']),
  rationale: z.string().min(10),
  nextSteps: z.array(z.string()),
  erx: z
    .object({
      product: z.string(),
      quantity: z.number(),
      repeats: z.number(),
      sig: z.string(),
      pharmacy: z.string(),
    })
    .optional(),
});
```

### Golden Standard Test Bed (1656 lines) - MIGRATE FOR VALIDATION

**Test Categories:**

1. Tier Threshold Tests (15 tests) - F1-F5 boundary validation
2. Priority Score Tests (19 tests) - Base scores + bonus combinations
3. PDC Calculation Tests - Status Quo and Perfect projections
4. Gap Days Formula Tests - 20% rule, delay budget
5. Real-World Scenario Tests (5 patients) - John, Mary, Sarah, Robert, Lisa
6. Edge Case Tests (5 tests) - Zero refills, negative gaps, etc.
7. Q4 Tightening Tests (8 tests) - Year-end promotion logic
8. Regression Tests - Previously fixed bugs
9. Pathway Tests (45+ tests) - Refill/Renewal/Appointment routing

---

## Accelerated Timeline

### Week 1: Core Engine Migration + FHIR Data Layer

#### Day 1-2: Migrate Deterministic Engines

**Files to create by copying and converting:**

```
/src/lib/pdc/
├── calculator.ts        ← FROM: coverageCalendarService.js (553 lines)
├── fragility.ts         ← FROM: fragilityTierService.js (588 lines)
├── pathway.ts           ← FROM: pathwayService.js (400+ lines)
├── types.ts             ← NEW: Zod schemas for all PDC types
└── index.ts             ← Barrel export

/src/lib/pdc/__tests__/
├── calculator.test.ts   ← FROM: calculateCoveredDays.test.js
├── fragility.test.ts    ← FROM: fragilityMetrics.test.js
└── golden-standard.test.ts ← FROM: goldenStandardTestBed.test.js (1656 lines)
```

**Migration Steps:**

1. Copy `fragilityTierService.js` → convert to TypeScript with Zod schemas
2. Copy `coverageCalendarService.js` → convert to TypeScript
3. Copy `pathwayService.js` → convert to TypeScript
4. Copy test files → adapt for Vitest (same syntax as legacy)
5. Run tests to verify parity: `npm test -- src/lib/pdc/`

**Key Conversion Pattern:**

```typescript
// Legacy JavaScript
export const calculateFragilityTier = ({
  daysAlreadyCovered,
  daysOfSupplyOnHand,
  // ...
}) => { ... }

// New TypeScript with Zod
import { z } from 'zod';

export const FragilityInputSchema = z.object({
  daysAlreadyCovered: z.number().min(0),
  daysOfSupplyOnHand: z.number().min(0),
  daysRemainingUntilYearEnd: z.number().min(0),
  treatmentDays: z.number().positive(),
  gapDaysRemaining: z.number(),
  remainingRefills: z.number().min(0),
  isCurrentlyOutOfMeds: z.boolean().default(false)
});

export type FragilityInput = z.infer<typeof FragilityInputSchema>;

export function calculateFragilityTier(input: FragilityInput): FragilityResult {
  const validated = FragilityInputSchema.parse(input);
  // ... same logic as legacy
}
```

#### Day 3-4: FHIR Data Services

**Files to create:**

```
/src/lib/fhir/
├── patient-service.ts      ← Medplum patient queries
├── dispense-service.ts     ← MedicationDispense for PDC
├── task-service.ts         ← Task CRUD for workflow
├── observation-service.ts  ← Store PDC as Observation
└── types.ts                ← FHIR resource type helpers
```

**Key Patterns:**

```typescript
// Use Medplum SDK, not custom fetch
import { useMedplum, useSearchResources } from '@medplum/react';
import { MedicationDispense, Patient, Task, Observation } from '@medplum/fhirtypes';

// Map legacy patient data to FHIR
export async function getPatientDispenses(
  medplum: MedplumClient,
  patientId: string,
  measurementYear: number
): Promise<MedicationDispense[]> {
  const yearStart = `${measurementYear}-01-01`;
  const yearEnd = `${measurementYear}-12-31`;

  return medplum.searchResources('MedicationDispense', {
    subject: `Patient/${patientId}`,
    whenhandedover: `ge${yearStart}`,
    whenhandedover: `le${yearEnd}`,
    _count: '1000',
  });
}

// Store PDC as Observation
const pdcObservation: Observation = {
  resourceType: 'Observation',
  status: 'final',
  code: { coding: [{ system: 'http://ignitehealth.com/pdc', code: 'pdc-score' }] },
  subject: { reference: `Patient/${patientId}` },
  valueQuantity: { value: pdcScore, unit: '%' },
  component: [
    { code: { text: 'fragilityTier' }, valueString: tier },
    { code: { text: 'priorityScore' }, valueInteger: priorityScore },
  ],
};
```

#### Day 5: Integration Tests

- Wire PDC calculator to Medplum dispense data
- Verify calculations match legacy test cases
- Create 10 synthetic patients in Medplum sandbox

---

### Week 2: AI Pipeline + Protocol Checks

#### Day 1-2: AWS Bedrock Integration

**Files to create:**

```
/src/lib/ai/
├── bedrock-client.ts       ← NEW: AWS Bedrock client
├── pipeline.ts             ← FROM: refillWorklistAIWorkflow.js (384 lines)
├── confidence-router.ts    ← NEW: Route by confidence level
└── types.ts                ← FROM: llmSchemas.js (convert to Zod)

/src/lib/ai/prompts/
├── primary-agent.ts        ← Tune for Claude
├── qa-agent.ts             ← Tune for Claude
└── manager-agent.ts        ← Tune for Claude
```

**Key Migration from Legacy:**

```typescript
// Legacy (Gemini):
import { callGeminiAPI } from '../services/llmService.js';
const output = await callGeminiAPI(prompt, models.primary, primaryAISchema, signal);

// New (Bedrock Claude):
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export async function invokeClaudeWithSchema<T extends z.ZodType>(
  prompt: string,
  schema: T,
  modelId = 'anthropic.claude-3-sonnet-20240229-v1:0'
): Promise<z.infer<T>> {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

  const response = await client.send(
    new InvokeModelCommand({
      modelId,
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
      }),
    })
  );

  const result = JSON.parse(new TextDecoder().decode(response.body));
  return schema.parse(JSON.parse(result.content[0].text));
}
```

**3-Tier Pipeline Adaptation:**

```typescript
// Port directly from refillWorklistAIWorkflow.js lines 68-383
export async function runAIPipeline(
  patient: PatientContext,
  protocolChecks: ProtocolCheckResult[]
): Promise<AIRecommendation> {
  // 1. Primary AI
  const primaryResult = await invokeClaudeWithSchema(
    buildPrimaryPrompt(patient, protocolChecks),
    PrimaryAIOutputSchema
  );

  // 2. QA AI
  const qaResult = await invokeClaudeWithSchema(
    buildQAPrompt(patient, primaryResult),
    QAAIOutputSchema
  );

  // 3. Manager AI (only if QA disagrees)
  let finalDecision = primaryResult;
  if (qaResult.qaDecision === 'Disagree') {
    const managerResult = await invokeClaudeWithSchema(
      buildManagerPrompt(patient, primaryResult, qaResult),
      ManagerAIOutputSchema
    );
    finalDecision = managerResult;
  }

  // 4. Calculate confidence
  const confidence = calculateConfidence(primaryResult, qaResult, finalDecision);

  return { ...finalDecision, confidence, qaResult };
}
```

#### Day 3-4: Protocol Checks Migration

**Files to create:**

```
/src/lib/safety/
├── protocol-checks.ts      ← FROM: protocolService.js + protocolManager.js
├── drug-interactions.ts    ← Deterministic lookup
├── allergy-checker.ts      ← FHIR AllergyIntolerance queries
├── lab-validator.ts        ← FHIR Observation queries
└── types.ts
```

**16 Protocol Checks (map to FHIR):**

```typescript
// S1-S4: Safety
export async function runSafetyChecks(
  medplum: MedplumClient,
  patientId: string,
  medication: MedicationRequest
): Promise<ProtocolCheck[]> {
  const [allergies, conditions, medications] = await Promise.all([
    medplum.searchResources('AllergyIntolerance', { patient: patientId }),
    medplum.searchResources('Condition', { patient: patientId }),
    medplum.searchResources('MedicationRequest', { patient: patientId, status: 'active' }),
  ]);

  return [
    { id: 'S1', desc: 'Allergy check', meets: !hasAllergyMatch(allergies, medication) },
    { id: 'S2', desc: 'Drug interaction', meets: !hasInteraction(medications, medication) },
    { id: 'S3', desc: 'Contraindication', meets: !hasContraindication(conditions, medication) },
    { id: 'S4', desc: 'Therapeutic duplication', meets: !hasDuplication(medications, medication) },
  ];
}

// C1-C4: Clinical
// I1-I4: Insurance
// A1-A4: Admin
```

#### Day 5: End-to-End AI Test

- Process 10 synthetic patients through full pipeline
- Validate 3-tier decision flow works
- Measure latency (target: <3s total)

---

### Week 3: Patient List + Queue UI

#### Day 1-2: Patient List Page

**Files to create/modify:**

```
/src/app/(dashboard)/patients/
├── page.tsx                ← Patient list with PDC badges
├── loading.tsx             ← Skeleton state
└── error.tsx               ← Error boundary

/src/components/patients/
├── patient-table.tsx       ← Use healthcare Table components
├── patient-filters.tsx     ← Tier, Measure, Status filters
└── patient-row.tsx         ← Individual row with badges
```

**Use Existing Components:**

- `PDCBadge`, `FragilityBadge`, `MeasureBadge` from `/src/components/ui-healthcare`
- `Table`, `TableHead`, `TableRow` from `/src/components/ui-healthcare/table`
- `getPDCVariant`, `getFragilityLabel` from `/src/lib/design-system/helpers`

#### Day 3-5: Queue Page with 4 Tabs

**Files to create:**

```
/src/app/(dashboard)/queue/
├── page.tsx                ← 4-tab queue (Refills, Pick-up, Exceptions, Archive)
├── layout.tsx              ← Queue layout with tab navigation
└── [tab]/page.tsx          ← Dynamic tab routing

/src/components/queue/
├── queue-tabs.tsx          ← Tab navigation
├── queue-table.tsx         ← Queue-specific table
├── review-drawer.tsx       ← Patient review slide-out (CRITICAL)
├── ai-recommendation-card.tsx ← AI decision display
├── protocol-checks-grid.tsx   ← 16 checks in 4x4 grid
└── action-buttons.tsx      ← Approve/Deny/Route
```

**Review Drawer Sections (from legacy ReviewDrawer.jsx patterns):**

1. Patient Header (name, DOB, MRN)
2. Medication Info (drug, dose, supply)
3. PDC Summary (current, status quo, perfect)
4. AI Recommendation Card (decision, confidence, rationale)
5. Protocol Checks Grid (16 checks)
6. Safety Alerts
7. Action Buttons (Approve/Deny/Route/Override)

---

### Week 4: Actions + Audit + Polish

#### Day 1-2: Task Actions

**Files to create:**

```
/src/lib/fhir/task-actions.ts
/src/app/api/tasks/[id]/approve/route.ts
/src/app/api/tasks/[id]/deny/route.ts
/src/app/api/tasks/[id]/route/route.ts

/src/lib/audit/
├── logger.ts               ← HIPAA-compliant audit logging
└── clinical-memory.ts      ← Decision history per patient
```

**Task Status Transitions:**

```
requested → in-progress → completed (approved/denied)
                       → on-hold (exception)
```

#### Day 3-4: Analytics Dashboard

**Files to create:**

```
/src/app/(dashboard)/analytics/
├── page.tsx                ← Summary cards, charts

/src/components/analytics/
├── pdc-trend-chart.tsx     ← 12-month PDC trend
├── tier-distribution.tsx   ← F1-F5 bar chart
├── measure-breakdown.tsx   ← MAC/MAD/MAH pie chart
└── staff-metrics.tsx       ← Productivity table
```

#### Day 5: Performance + Accessibility

- Bundle optimization (<500KB gzipped)
- Keyboard shortcuts (j/k navigation, a/d/r actions)
- ARIA labels and focus management
- Mobile responsive tables

---

## Critical Migration Files (Copy & Convert)

### Priority 1: Deterministic Engines (No Dependencies)

```
LEGACY                                           → NEW
───────────────────────────────────────────────────────────────────────────
src/services/fragilityTierService.js (588 lines) → src/lib/pdc/fragility.ts
src/services/coverageCalendarService.js (553 lines) → src/lib/pdc/calculator.ts
src/services/pathwayService.js (400+ lines)      → src/lib/pdc/pathway.ts
src/services/llmSchemas.js (117 lines)           → src/lib/ai/types.ts (Zod)
src/services/__tests__/goldenStandardTestBed.test.js (1656 lines) → src/lib/pdc/__tests__/
```

### Priority 2: Workflow Logic (Light Adaptation)

```
src/workflows/refillWorklistAIWorkflow.js (384 lines) → src/lib/ai/pipeline.ts
src/services/protocolService.js                   → src/lib/safety/protocol-checks.ts
src/config/businessConstants.js                   → src/lib/constants.ts
```

### Priority 3: UI Patterns (Reference Only)

Legacy components for reference patterns (don't copy directly):

- `ReviewDrawer.jsx` - 56KB, complex review interface
- `DataTable.jsx` - Enterprise table patterns
- `QuickFilter.jsx` - Filtering patterns

---

## Key Differences: Legacy → New

| Aspect           | Legacy             | New Ignite Health             |
| ---------------- | ------------------ | ----------------------------- |
| **Database**     | Firebase Firestore | Medplum FHIR                  |
| **AI Provider**  | Google Gemini      | AWS Bedrock (Claude)          |
| **UI Framework** | React + Vite       | Next.js 15 + App Router       |
| **Components**   | Custom             | shadcn/ui + healthcare badges |
| **State**        | Zustand + Context  | Medplum hooks + React Query   |
| **Auth**         | Firebase Auth      | Medplum OAuth                 |
| **Types**        | JSDoc              | TypeScript + Zod              |
| **Testing**      | Vitest             | Vitest (same!)                |

---

## Test Coverage Targets

| Area            | Target | Source                                |
| --------------- | ------ | ------------------------------------- |
| PDC Calculator  | 100%   | Migrate goldenStandardTestBed.test.js |
| Fragility Tiers | 100%   | Migrate fragilityMetrics.test.js      |
| Pathway Routing | 100%   | Migrate pathway tests (45+ cases)     |
| Protocol Checks | 100%   | New tests based on legacy patterns    |
| AI Pipeline     | 90%    | New tests (Claude vs Gemini)          |
| Task Actions    | 100%   | New integration tests                 |

**Golden Standard Test Cases to Migrate (1656 lines):**

- 15 Tier Threshold Tests
- 19 Priority Score Tests
- 5 Real-World Scenario Tests
- 5 Edge Case Tests
- 8 Q4 Tightening Tests
- 7 Regression Tests
- 45+ Pathway Tests
- 18 Combination Matrix Tests

---

## Success Criteria

1. **Clinical Accuracy**: PDC calculations match legacy (100% test parity)
2. **AI Performance**: <3s total, 95% Primary+QA agreement rate
3. **User Efficiency**: 50+ refills/hour review rate
4. **Safety**: 0 missed safety alerts
5. **Compliance**: 100% audit trail coverage
6. **Performance**: <2s page load, 60fps scroll

---

## Environment Variables (Add to .env)

```env
# Medplum (existing)
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=xxx
NEXT_PUBLIC_MEDPLUM_PROJECT_ID=xxx

# AWS Bedrock (new)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Feature Flags
ENABLE_AI_RECOMMENDATIONS=true
ENABLE_AUTO_APPROVAL=false
```

---

## Immediate Next Steps

1. **Create `/src/lib/pdc/` directory structure**
2. **Copy `fragilityTierService.js` → `fragility.ts`** (convert to TypeScript)
3. **Copy `coverageCalendarService.js` → `calculator.ts`** (convert to TypeScript)
4. **Copy `goldenStandardTestBed.test.js`** and run to verify parity
5. **Create FHIR data services skeleton**

---

## Appendix: Key Code Blocks to Migrate

### A. Fragility Tier Calculation (Core Logic)

```javascript
// FROM: fragilityTierService.js lines 117-279
// LOGIC:
// 1. Calculate PDC Status Quo = (covered + min(supply, daysLeft)) / treatmentDays
// 2. Calculate PDC Perfect = (covered + daysLeft) / treatmentDays
// 3. If PDC Status Quo >= 80% → COMPLIANT
// 4. If PDC Perfect < 80% OR gapDaysRemaining < 0 → T5_UNSALVAGEABLE
// 5. Else calculate delayBudget = gapDaysRemaining / remainingRefills
// 6. Assign tier based on delay budget thresholds
```

### B. PDC Interval Merging (HEDIS-Compliant)

```javascript
// FROM: coverageCalendarService.js lines 372-498
// ALGORITHM:
// 1. Build coverage intervals: [fillDate, fillDate + daysSupply - 1]
// 2. Sort intervals by start date
// 3. Merge overlapping/adjacent intervals
// 4. Cap at measurement year end
// 5. Sum days from merged intervals
```

### C. Priority Scoring (Golden Standard)

```javascript
// FROM: fragilityTierService.js lines 415-489
// FORMULA:
// baseScore = { F1: 100, F2: 80, F3: 60, F4: 40, F5: 20, COMPLIANT: 0, T5: 0 }
// + 30 if out of medication
// + 25 if Q4 (Oct-Dec)
// + 15 if multiple MA measures (2+)
// + 10 if new patient
// URGENCY: extreme (150+), high (100-149), moderate (50-99), low (<50)
```

### D. Pathway Routing (A/B/C)

```javascript
// FROM: pathwayService.js
// DECISION TREE:
// Q1: Has refills?
//   YES → Q2a: Rx valid (<365 days)?
//     YES → Pathway A (REFILL_PENDING, 7-day SLA)
//     NO  → Pathway B (RENEWAL_PENDING, 14-day SLA)
//   NO  → Q2b: Recent visit (<90 days)?
//     YES → Pathway B (RENEWAL_PENDING, 14-day SLA)
//     NO  → Pathway C (APPOINTMENT_NEEDED, 30-day SLA)
```

---

This accelerated plan reduces implementation from **8+ weeks to 4-5 weeks** by leveraging 23,000+ lines of production-tested legacy code.
