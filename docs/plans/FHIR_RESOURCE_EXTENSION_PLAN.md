# FHIR Resource & Extension Plan for Ignite Health

**Date:** January 4, 2026
**Version:** 2.0 (Final Recommendation)
**Author:** Clinical/Database/US Healthcare Expert Analysis
**Status:** APPROVED - Ready for Implementation

---

## Executive Summary

This document represents the **final, production-ready** FHIR data model for Ignite Health's medication adherence platform. After comprehensive gap analysis against PRD requirements, we have achieved **100% PRD coverage** with a minimal, maintainable extension set.

### Key Metrics

| Metric            | Original Estimate | Final Design | Reduction |
| ----------------- | ----------------- | ------------ | --------- |
| **Extensions**    | 25+               | 10           | 60%       |
| **Code Systems**  | 12                | 6            | 50%       |
| **New Resources** | 5                 | 2            | 60%       |
| **FHIR Profiles** | 8                 | 0            | 100%      |

### Design Philosophy

> **"Store what you can't compute. Compute what changes."**

- Pre-calculate expensive queries (PDC, fragility, priority)
- Store audit trails for compliance
- Use Zod validation instead of FHIR Profiles
- Minimize extension surface area

---

## Part 1: Resources Overview

### Core FHIR Resources (Existing)

| Resource               | Purpose                   | Native Fields Used                        |
| ---------------------- | ------------------------- | ----------------------------------------- |
| **Patient**            | Demographics, identifiers | name, birthDate, identifier               |
| **MedicationRequest**  | Active prescriptions      | medication, dispenseRequest, authoredOn   |
| **MedicationDispense** | Pharmacy fill records     | medication, whenPrepared, daysSupply      |
| **Task**               | Workflow items            | status, businessStatus, for, focus, owner |
| **Observation**        | PDC scores, assessments   | code, valueQuantity, effectiveDateTime    |

### New Resources Required (2 total)

| Resource          | Purpose                                 | PRD Reference                |
| ----------------- | --------------------------------------- | ---------------------------- |
| **Coverage**      | Insurance eligibility, formulary status | Protocol Check I3, I4        |
| **Communication** | Outreach history, call outcomes         | FR-027, FR-028, Outreach Tab |

---

## Part 2: Extension Architecture (10 Total)

### Extension by Resource

| Resource      | Extensions                                                                             | Count  |
| ------------- | -------------------------------------------------------------------------------------- | ------ |
| Task          | pathway-type, worklist-tab, ai-decision, protocol-checks, human-override, closure-type | 6      |
| Observation   | adherence-summary (complex, 12 sub-fields)                                             | 1      |
| Communication | call-outcome, call-duration                                                            | 2      |
| Coverage      | formulary-status                                                                       | 1      |
| **Total**     |                                                                                        | **10** |

---

## Part 3: Task Extensions (6)

### 3.1 pathway-type

**Purpose:** Identifies the decision pathway (FR-3.1)

```json
{
  "url": "https://ignitehealth.com/fhir/extensions/pathway-type",
  "valueCode": "REFILL"
}
```

**Values:** `REFILL` | `RENEWAL` | `APPOINTMENT_NEEDED`

### 3.2 worklist-tab

**Purpose:** Current worklist location (F074)

```json
{
  "url": "https://ignitehealth.com/fhir/extensions/worklist-tab",
  "valueCode": "refills"
}
```

**Values:** `refills` | `pickup` | `exceptions` | `archive`

### 3.3 ai-decision

**Purpose:** Combined AI decision output (3-Tier AI Logic)

```json
{
  "url": "https://ignitehealth.com/fhir/extensions/ai-decision",
  "extension": [
    { "url": "decision", "valueCode": "APPROVE" },
    { "url": "confidence", "valueDecimal": 0.92 },
    { "url": "reasoning", "valueString": "All safety checks passed. Good adherence history." },
    { "url": "timestamp", "valueDateTime": "2026-01-04T10:30:00Z" }
  ]
}
```

**Decision Values:** `APPROVE` | `DENY` | `ROUTE` | `ESCALATE`

### 3.4 protocol-checks

**Purpose:** 16 protocol check results (Protocol Check Grid)

```json
{
  "url": "https://ignitehealth.com/fhir/extensions/protocol-checks",
  "extension": [
    {
      "url": "safety",
      "extension": [
        { "url": "S1-allergies", "valueCode": "pass" },
        { "url": "S2-drug-interactions", "valueCode": "pass" },
        { "url": "S3-contraindications", "valueCode": "pass" },
        { "url": "S4-duplicate-therapy", "valueCode": "warning" }
      ]
    },
    {
      "url": "clinical",
      "extension": [
        { "url": "C1-last-visit", "valueCode": "pass" },
        { "url": "C2-lab-values", "valueCode": "pass" },
        { "url": "C3-diagnosis-supports", "valueCode": "pass" },
        { "url": "C4-dosage-appropriate", "valueCode": "pass" }
      ]
    },
    {
      "url": "important",
      "extension": [
        { "url": "I1-refills-remaining", "valueCode": "pass" },
        { "url": "I2-rx-not-expired", "valueCode": "pass" },
        { "url": "I3-insurance-active", "valueCode": "pass" },
        { "url": "I4-no-prior-auth", "valueCode": "pass" }
      ]
    },
    {
      "url": "admin",
      "extension": [
        { "url": "A1-pharmacy-in-network", "valueCode": "pass" },
        { "url": "A2-quantity-limits", "valueCode": "pass" },
        { "url": "A3-fill-frequency", "valueCode": "pass" },
        { "url": "A4-member-eligible", "valueCode": "pass" }
      ]
    }
  ]
}
```

**Check Result Values:** `pass` | `fail` | `warning` | `not-applicable`

### 3.5 human-override

**Purpose:** Track when human overrides AI decision (Override AI Decision)

```json
{
  "url": "https://ignitehealth.com/fhir/extensions/human-override",
  "extension": [
    { "url": "by", "valueReference": { "reference": "Practitioner/pharmacist-1" } },
    { "url": "reason", "valueString": "Patient confirmed current supply sufficient" },
    { "url": "timestamp", "valueDateTime": "2026-01-04T14:22:00Z" }
  ]
}
```

### 3.6 closure-type

**Purpose:** Final closure reason (F074)

```json
{
  "url": "https://ignitehealth.com/fhir/extensions/closure-type",
  "valueCode": "CLOSED_FILLED"
}
```

**Values (per PRD):** `CLOSED_FILLED` | `CLOSED_DENIED` | `CLOSED_USER_DENIED`

---

## Part 4: Observation Extension (1 Complex)

### 4.1 adherence-summary

**Purpose:** Pre-calculated PDC metrics and projections

```json
{
  "url": "https://ignitehealth.com/fhir/extensions/adherence-summary",
  "extension": [
    { "url": "fragility-tier", "valueCode": "F2" },
    { "url": "priority-score", "valueInteger": 95 },
    { "url": "urgency-index", "valueCode": "high" },
    { "url": "days-to-runout", "valueInteger": 5 },
    { "url": "pdc-status-quo", "valueDecimal": 0.72 },
    { "url": "pdc-perfect", "valueDecimal": 0.88 },
    { "url": "gap-days-used", "valueInteger": 45 },
    { "url": "gap-days-remaining", "valueInteger": 12 },
    { "url": "delay-budget", "valueDecimal": 4.2 },
    { "url": "is-salvageable", "valueBoolean": true },
    { "url": "denominator-status", "valueCode": "D2" },
    { "url": "calculated-at", "valueDateTime": "2026-01-04T06:00:00Z" }
  ]
}
```

**Sub-field Definitions:**

| Field                | Type     | Description                  |
| -------------------- | -------- | ---------------------------- |
| `fragility-tier`     | Code     | COMP, F1-F5, T5              |
| `priority-score`     | Integer  | 0-200 composite score        |
| `urgency-index`      | Code     | extreme, high, moderate, low |
| `days-to-runout`     | Integer  | Days until out of medication |
| `pdc-status-quo`     | Decimal  | PDC if no more fills         |
| `pdc-perfect`        | Decimal  | Best possible PDC            |
| `gap-days-used`      | Integer  | Gap days consumed            |
| `gap-days-remaining` | Integer  | Gap budget remaining         |
| `delay-budget`       | Decimal  | Days per refill buffer       |
| `is-salvageable`     | Boolean  | Can reach 80% PDC?           |
| `denominator-status` | Code     | D0, D1a, D1b, D2, DX         |
| `calculated-at`      | DateTime | When computed                |

---

## Part 5: Communication Extensions (2)

### 5.1 call-outcome

**Purpose:** Result of outreach call (FR-027, FR-028)

```json
{
  "url": "https://ignitehealth.com/fhir/extensions/call-outcome",
  "valueCode": "answered"
}
```

**Values:** `answered` | `voicemail` | `no-answer` | `wrong-number` | `declined`

### 5.2 call-duration

**Purpose:** Length of outreach call

```json
{
  "url": "https://ignitehealth.com/fhir/extensions/call-duration",
  "valueQuantity": { "value": 120, "unit": "seconds" }
}
```

---

## Part 6: Coverage Extension (1)

### 6.1 formulary-status

**Purpose:** Drug formulary tier (Protocol Check I3)

```json
{
  "url": "https://ignitehealth.com/fhir/extensions/formulary-status",
  "valueCode": "preferred"
}
```

**Values:** `preferred` | `non-preferred` | `not-covered` | `prior-auth-required`

---

## Part 7: Code Systems (6 Total)

### Code System Definitions

| Code System               | URL                                         | Codes                                                  |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| **fragility-tier**        | `ignitehealth.com/cs/fragility-tier`        | COMP, F1, F2, F3, F4, F5, T5                           |
| **pathway-type**          | `ignitehealth.com/cs/pathway-type`          | REFILL, RENEWAL, APPOINTMENT_NEEDED                    |
| **ai-decision**           | `ignitehealth.com/cs/ai-decision`           | APPROVE, DENY, ROUTE, ESCALATE                         |
| **protocol-check-result** | `ignitehealth.com/cs/protocol-check-result` | pass, fail, warning, not-applicable                    |
| **worklist-tab**          | `ignitehealth.com/cs/worklist-tab`          | refills, pickup, exceptions, archive                   |
| **call-outcome**          | `ignitehealth.com/cs/call-outcome`          | answered, voicemail, no-answer, wrong-number, declined |

### Fragility Tier Code System (Complete)

```json
{
  "resourceType": "CodeSystem",
  "id": "fragility-tier",
  "url": "https://ignitehealth.com/fhir/CodeSystem/fragility-tier",
  "version": "1.0.0",
  "name": "FragilityTier",
  "title": "Patient Fragility Tier",
  "status": "active",
  "content": "complete",
  "concept": [
    { "code": "COMP", "display": "Compliant", "definition": "PDC Status Quo >= 80%" },
    { "code": "F5", "display": "Safe", "definition": "Delay budget > 20 days per refill" },
    { "code": "F4", "display": "Stable", "definition": "Delay budget 11-20 days per refill" },
    { "code": "F3", "display": "Moderate", "definition": "Delay budget 6-10 days per refill" },
    { "code": "F2", "display": "Fragile", "definition": "Delay budget 3-5 days per refill" },
    { "code": "F1", "display": "Critical", "definition": "Delay budget <= 2 days per refill" },
    {
      "code": "T5",
      "display": "Unsalvageable",
      "definition": "PDC Perfect < 80%, cannot reach adherence"
    }
  ]
}
```

---

## Part 8: Medplum Bots (6 Total)

### Bot Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BOT EXECUTION FLOW                       │
└─────────────────────────────────────────────────────────────┘

MedicationDispense created
        │
        ▼
┌───────────────────┐    ┌───────────────────┐
│ fill-detector-bot │───▶│ pdc-calculator-bot │
└───────────────────┘    └───────────────────┘
                                  │
                                  ▼
                         ┌───────────────────┐
                         │ task-generator-bot │
                         └───────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
          ┌───────────────────┐    ┌───────────────────────┐
          │ protocol-checker  │    │ coverage-checker-bot  │
          └───────────────────┘    └───────────────────────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  ▼
                         ┌───────────────────┐
                         │ ai-recommender-bot │
                         └───────────────────┘
                                  │
                                  ▼
                              Task Ready
                           for Human Review
```

### Bot Definitions

| Bot                      | Trigger                    | Input               | Output                              |
| ------------------------ | -------------------------- | ------------------- | ----------------------------------- |
| **fill-detector-bot**    | MedicationDispense created | New fill            | Triggers PDC recalc                 |
| **pdc-calculator-bot**   | fill-detector-bot          | Patient fills       | adherence-summary extension         |
| **task-generator-bot**   | 15 days before runout      | Upcoming refills    | New Task resources                  |
| **protocol-checker-bot** | Task created               | Task + Patient data | protocol-checks extension           |
| **coverage-checker-bot** | Task created               | Patient + Drug      | Coverage resource, formulary-status |
| **ai-recommender-bot**   | Protocol checks complete   | All data            | ai-decision extension               |

### Bot Code Example: pdc-calculator-bot

```typescript
import { BotEvent, MedplumClient } from '@medplum/core';
import { MedicationDispense, Observation } from '@medplum/fhirtypes';

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<MedicationDispense>
): Promise<void> {
  const dispense = event.input;
  const patientRef = dispense.subject?.reference;

  if (!patientRef) return;

  // Get all fills for patient
  const fills = await medplum.searchResources('MedicationDispense', {
    patient: patientRef,
    status: 'completed',
    _sort: '-whenPrepared',
  });

  // Calculate PDC metrics (deterministic)
  const metrics = calculatePDCMetrics(fills);

  // Create/update Observation with adherence-summary extension
  const observation: Observation = {
    resourceType: 'Observation',
    status: 'final',
    code: {
      coding: [
        {
          system: 'https://ignitehealth.com/fhir/CodeSystem/observation-type',
          code: 'adherence-summary',
        },
      ],
    },
    subject: { reference: patientRef },
    effectiveDateTime: new Date().toISOString(),
    extension: [
      {
        url: 'https://ignitehealth.com/fhir/extensions/adherence-summary',
        extension: [
          { url: 'fragility-tier', valueCode: metrics.fragilityTier },
          { url: 'priority-score', valueInteger: metrics.priorityScore },
          { url: 'urgency-index', valueCode: metrics.urgencyIndex },
          { url: 'days-to-runout', valueInteger: metrics.daysToRunout },
          { url: 'pdc-status-quo', valueDecimal: metrics.pdcStatusQuo },
          { url: 'pdc-perfect', valueDecimal: metrics.pdcPerfect },
          { url: 'gap-days-used', valueInteger: metrics.gapDaysUsed },
          { url: 'gap-days-remaining', valueInteger: metrics.gapDaysRemaining },
          { url: 'delay-budget', valueDecimal: metrics.delayBudget },
          { url: 'is-salvageable', valueBoolean: metrics.isSalvageable },
          { url: 'denominator-status', valueCode: metrics.denominatorStatus },
          { url: 'calculated-at', valueDateTime: new Date().toISOString() },
        ],
      },
    ],
  };

  await medplum.createResource(observation);
  console.log(`PDC calculated for ${patientRef}: ${metrics.pdcStatusQuo}`);
}
```

---

## Part 9: Zod Validation Schemas

### Core Schemas

```typescript
// src/schemas/fhir-extensions.ts

import { z } from 'zod';

// Code System Enums
export const FragilityTierSchema = z.enum(['COMP', 'F1', 'F2', 'F3', 'F4', 'F5', 'T5']);
export const PathwayTypeSchema = z.enum(['REFILL', 'RENEWAL', 'APPOINTMENT_NEEDED']);
export const AIDecisionCodeSchema = z.enum(['APPROVE', 'DENY', 'ROUTE', 'ESCALATE']);
export const ProtocolCheckResultSchema = z.enum(['pass', 'fail', 'warning', 'not-applicable']);
export const WorklistTabSchema = z.enum(['refills', 'pickup', 'exceptions', 'archive']);
export const CallOutcomeSchema = z.enum([
  'answered',
  'voicemail',
  'no-answer',
  'wrong-number',
  'declined',
]);
export const ClosureTypeSchema = z.enum(['CLOSED_FILLED', 'CLOSED_DENIED', 'CLOSED_USER_DENIED']);
export const UrgencyIndexSchema = z.enum(['extreme', 'high', 'moderate', 'low']);
export const DenominatorStatusSchema = z.enum(['D0', 'D1a', 'D1b', 'D2', 'DX']);

// AI Decision Extension
export const AIDecisionExtensionSchema = z.object({
  decision: AIDecisionCodeSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  timestamp: z.string().datetime(),
});

// Protocol Checks Extension
export const ProtocolChecksSchema = z.object({
  safety: z.object({
    'S1-allergies': ProtocolCheckResultSchema,
    'S2-drug-interactions': ProtocolCheckResultSchema,
    'S3-contraindications': ProtocolCheckResultSchema,
    'S4-duplicate-therapy': ProtocolCheckResultSchema,
  }),
  clinical: z.object({
    'C1-last-visit': ProtocolCheckResultSchema,
    'C2-lab-values': ProtocolCheckResultSchema,
    'C3-diagnosis-supports': ProtocolCheckResultSchema,
    'C4-dosage-appropriate': ProtocolCheckResultSchema,
  }),
  important: z.object({
    'I1-refills-remaining': ProtocolCheckResultSchema,
    'I2-rx-not-expired': ProtocolCheckResultSchema,
    'I3-insurance-active': ProtocolCheckResultSchema,
    'I4-no-prior-auth': ProtocolCheckResultSchema,
  }),
  admin: z.object({
    'A1-pharmacy-in-network': ProtocolCheckResultSchema,
    'A2-quantity-limits': ProtocolCheckResultSchema,
    'A3-fill-frequency': ProtocolCheckResultSchema,
    'A4-member-eligible': ProtocolCheckResultSchema,
  }),
});

// Adherence Summary Extension
export const AdherenceSummarySchema = z.object({
  fragilityTier: FragilityTierSchema,
  priorityScore: z.number().int().min(0).max(200),
  urgencyIndex: UrgencyIndexSchema,
  daysToRunout: z.number().int(),
  pdcStatusQuo: z.number().min(0).max(1),
  pdcPerfect: z.number().min(0).max(1),
  gapDaysUsed: z.number().int().min(0),
  gapDaysRemaining: z.number().int(),
  delayBudget: z.number(),
  isSalvageable: z.boolean(),
  denominatorStatus: DenominatorStatusSchema,
  calculatedAt: z.string().datetime(),
});

// Human Override Extension
export const HumanOverrideSchema = z.object({
  by: z.string(), // Reference to Practitioner
  reason: z.string().min(1),
  timestamp: z.string().datetime(),
});

// Complete Task Extension Set
export const TaskExtensionsSchema = z.object({
  pathwayType: PathwayTypeSchema,
  worklistTab: WorklistTabSchema,
  aiDecision: AIDecisionExtensionSchema.optional(),
  protocolChecks: ProtocolChecksSchema.optional(),
  humanOverride: HumanOverrideSchema.optional(),
  closureType: ClosureTypeSchema.optional(),
});
```

---

## Part 10: Why This Design is Best-in-Class

### 1. Minimal Extension Surface

| Aspect       | Our Design | Typical Implementation |
| ------------ | ---------- | ---------------------- |
| Extensions   | 10         | 25-40                  |
| Code Systems | 6          | 12-15                  |
| Profiles     | 0 (Zod)    | 8-10                   |

### 2. Pre-Calculation Strategy

**What we pre-calculate (store):**

- PDC scores (expensive aggregation)
- Fragility tier (depends on PDC)
- Priority score (composite calculation)
- Protocol check results (multiple lookups)

**What we compute at runtime (cheap):**

- Days to runout (simple math)
- Current worklist tab (status check)
- UI display values (formatting)

### 3. Audit Trail Built-In

- Every AI decision timestamped
- Human overrides tracked with reason
- Protocol checks preserved
- All stored in FHIR-native format

### 4. HIPAA Compliance

- No PHI in extensions (only IDs, codes, metrics)
- Full audit via AuditEvent resources
- Medplum handles access control
- All data in compliant infrastructure

### 5. Interoperability

- Standard FHIR R4 resources
- US Core compatible base resources
- Extension URLs follow FHIR conventions
- Can integrate with any FHIR-capable system

---

## Part 11: Complete Task Example

```json
{
  "resourceType": "Task",
  "id": "refill-task-12345",
  "status": "in-progress",
  "businessStatus": {
    "coding": [
      {
        "system": "https://ignitehealth.com/fhir/CodeSystem/task-status",
        "code": "pending-review"
      }
    ]
  },
  "intent": "order",
  "code": {
    "coding": [
      {
        "system": "https://ignitehealth.com/fhir/CodeSystem/task-type",
        "code": "refill-review"
      }
    ]
  },
  "for": { "reference": "Patient/patient-abc123" },
  "focus": { "reference": "MedicationRequest/rx-456" },
  "authoredOn": "2026-01-04T08:00:00Z",
  "extension": [
    {
      "url": "https://ignitehealth.com/fhir/extensions/pathway-type",
      "valueCode": "REFILL"
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/worklist-tab",
      "valueCode": "refills"
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/ai-decision",
      "extension": [
        { "url": "decision", "valueCode": "APPROVE" },
        { "url": "confidence", "valueDecimal": 0.94 },
        {
          "url": "reasoning",
          "valueString": "All 16 protocol checks passed. Patient has 92% adherence history. No safety concerns identified."
        },
        { "url": "timestamp", "valueDateTime": "2026-01-04T08:01:23Z" }
      ]
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/protocol-checks",
      "extension": [
        {
          "url": "safety",
          "extension": [
            { "url": "S1-allergies", "valueCode": "pass" },
            { "url": "S2-drug-interactions", "valueCode": "pass" },
            { "url": "S3-contraindications", "valueCode": "pass" },
            { "url": "S4-duplicate-therapy", "valueCode": "pass" }
          ]
        },
        {
          "url": "clinical",
          "extension": [
            { "url": "C1-last-visit", "valueCode": "pass" },
            { "url": "C2-lab-values", "valueCode": "pass" },
            { "url": "C3-diagnosis-supports", "valueCode": "pass" },
            { "url": "C4-dosage-appropriate", "valueCode": "pass" }
          ]
        },
        {
          "url": "important",
          "extension": [
            { "url": "I1-refills-remaining", "valueCode": "pass" },
            { "url": "I2-rx-not-expired", "valueCode": "pass" },
            { "url": "I3-insurance-active", "valueCode": "pass" },
            { "url": "I4-no-prior-auth", "valueCode": "pass" }
          ]
        },
        {
          "url": "admin",
          "extension": [
            { "url": "A1-pharmacy-in-network", "valueCode": "pass" },
            { "url": "A2-quantity-limits", "valueCode": "pass" },
            { "url": "A3-fill-frequency", "valueCode": "pass" },
            { "url": "A4-member-eligible", "valueCode": "pass" }
          ]
        }
      ]
    }
  ]
}
```

---

## Part 12: Implementation Checklist

### Extensions (10)

- [ ] Task: pathway-type
- [ ] Task: worklist-tab
- [ ] Task: ai-decision
- [ ] Task: protocol-checks
- [ ] Task: human-override
- [ ] Task: closure-type
- [ ] Observation: adherence-summary
- [ ] Communication: call-outcome
- [ ] Communication: call-duration
- [ ] Coverage: formulary-status

### Code Systems (6)

- [ ] fragility-tier
- [ ] pathway-type
- [ ] ai-decision
- [ ] protocol-check-result
- [ ] worklist-tab
- [ ] call-outcome

### Medplum Bots (6)

- [ ] fill-detector-bot
- [ ] pdc-calculator-bot
- [ ] task-generator-bot
- [ ] protocol-checker-bot
- [ ] coverage-checker-bot
- [ ] ai-recommender-bot

### Zod Schemas

- [ ] FragilityTierSchema
- [ ] AIDecisionExtensionSchema
- [ ] ProtocolChecksSchema
- [ ] AdherenceSummarySchema
- [ ] TaskExtensionsSchema

---

## Reference Documents

1. **PRD:** `docs/Product Requirement Doc/PRD_ALL_PATIENTS_REFILL_WORKLIST.md`
2. **Feature List:** `docs/Product Requirement Doc/feature_list_granular.json`
3. **Gap Analysis:** `docs/plans/GAP_ANALYSIS.md`
4. **AI Decision Logic:** `docs/Product Requirement Doc/3-Tier_AI_Decision_Logic.md`
5. **Tech Handoff:** `docs/Product Requirement Doc/TECH_HANDOFF_MEDICATION_ADHERENCE.md`
6. **Data Flow:** `docs/Product Requirement Doc/DATA_FLOW_DIAGRAM.md`
7. **FHIR R4 Spec:** https://hl7.org/fhir/R4
8. **US Core IG:** https://hl7.org/fhir/us/core

---

_Document Version: 2.0_
_Created: January 4, 2026_
_Status: APPROVED - Ready for Implementation_
