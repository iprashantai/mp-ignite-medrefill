# Ignite Health MedRefills - FHIR-Native Implementation Plan

## Executive Summary

**Architecture Decision**: Build **FHIR-native** business logic that works directly with Medplum resources. NO translation layer to legacy shapes.

**Why FHIR-Native?**

- Medplum provides industry-standard HIPAA-compliant backend
- FHIR enables healthcare interoperability (eClinicalWorks, Epic, Cerner)
- Avoid maintaining two data models (legacy + FHIR)
- Leverage Medplum's built-in audit, subscriptions, and bots

**Timeline**: 4-5 weeks by:

1. Rewriting PDC/Fragility calculators to accept FHIR resources directly
2. Using Medplum native components where possible
3. Migrating only the **algorithms** (not data shapes) from legacy

---

## Architecture: FHIR-Native Design

### Core Principle

**Instead of**: Legacy shapes → Business logic → Legacy shapes → FHIR
**We do**: FHIR resources → Business logic → FHIR resources

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FHIR-NATIVE ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      MEDPLUM FHIR SERVER                              │   │
│  │  Patient │ MedicationDispense │ MedicationRequest │ Task │ Observation│   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    FHIR-NATIVE SERVICES                               │   │
│  │                                                                        │   │
│  │  PDCService.calculate(dispenses: MedicationDispense[])                │   │
│  │  FragilityService.assess(pdcResult, dispenses)                        │   │
│  │  SafetyService.check(patient, allergies, conditions, medications)     │   │
│  │  AIService.evaluate(patientBundle, protocolResults)                   │   │
│  │                                                                        │   │
│  │  Input: FHIR Resources    →    Output: FHIR Resources                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         UI LAYER                                       │   │
│  │                                                                        │   │
│  │  Uses Medplum React hooks: useSearchResources, useMedplum             │   │
│  │  Custom healthcare badges work with FHIR-derived values               │   │
│  │  Queue displays Task resources directly                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### FHIR Resource Model

| Domain Concept   | FHIR Resource        | Key Fields                                                                      |
| ---------------- | -------------------- | ------------------------------------------------------------------------------- |
| **Patient**      | `Patient`            | id, name, birthDate, identifier (MRN)                                           |
| **Prescription** | `MedicationRequest`  | status, medication, subject, authoredOn, dispenseRequest.numberOfRepeatsAllowed |
| **Fill/Claim**   | `MedicationDispense` | status, medication, subject, whenHandedOver, daysSupply, quantity               |
| **PDC Score**    | `Observation`        | code=pdc-{mac/mad/mah}, valueQuantity, components for tier/priority             |
| **Lab Results**  | `Observation`        | code=A1C/LDL/etc, valueQuantity                                                 |
| **Allergies**    | `AllergyIntolerance` | code, clinicalStatus, criticality                                               |
| **Conditions**   | `Condition`          | code (ICD-10), clinicalStatus                                                   |
| **Refill Task**  | `Task`               | status, priority, for (Patient), focus (MedicationRequest), extensions          |
| **AI Decision**  | `Task.extension[]`   | ai-recommendation, ai-confidence, ai-rationale                                  |
| **Audit**        | `AuditEvent`         | Auto-created by Medplum                                                         |

### What Changes from Legacy

| Legacy Approach                    | FHIR-Native Approach                                        |
| ---------------------------------- | ----------------------------------------------------------- |
| `patient.medications[].currentPdc` | Compute from `MedicationDispense[]`, store in `Observation` |
| `patient.fragilityTier`            | Compute from PDC Observation, store in component            |
| `refillWorklist/{id}`              | `Task` with code='refill-review'                            |
| Embedded rxClaims array            | Query `MedicationDispense` by patient + date range          |
| Custom activity log                | `AuditEvent` (auto-created)                                 |
| Batch AI results                   | `Task.extension[]` for AI metadata                          |

---

## FHIR-Native Service Design

### 1. PDC Calculator Service (`/src/lib/pdc/calculator.ts`)

**Input**: FHIR `MedicationDispense[]`
**Output**: `PDCResult` (plain TypeScript, stored as Observation)

```typescript
import { MedicationDispense } from '@medplum/fhirtypes';
import { z } from 'zod';

// Output schema (not FHIR, but will be stored as Observation)
export const PDCResultSchema = z.object({
  pdc: z.number().min(0).max(100),
  coveredDays: z.number().min(0),
  treatmentDays: z.number().positive(),
  gapDaysUsed: z.number().min(0),
  gapDaysAllowed: z.number().min(0),
  gapDaysRemaining: z.number(),
  pdcStatusQuo: z.number().min(0).max(100),
  pdcPerfect: z.number().min(0).max(100),
  measurementPeriod: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

export type PDCResult = z.infer<typeof PDCResultSchema>;

/**
 * Calculate PDC from FHIR MedicationDispense resources
 * Algorithm from legacy coverageCalendarService.js - HEDIS MY2025 compliant
 */
export function calculatePDC(
  dispenses: MedicationDispense[],
  measurementStart: string,
  measurementEnd: string
): PDCResult {
  // Filter to completed dispenses within measurement period
  const validDispenses = dispenses.filter(
    (d) => d.status === 'completed' && d.whenHandedOver && d.whenHandedOver >= measurementStart
  );

  if (validDispenses.length < 2) {
    // HEDIS requires 2+ fills for denominator
    return createEmptyPDCResult(measurementStart, measurementEnd);
  }

  // Build coverage intervals from FHIR fields
  const intervals = validDispenses.map((d) => ({
    start: new Date(d.whenHandedOver!),
    end: addDays(new Date(d.whenHandedOver!), (d.daysSupply?.value || 30) - 1),
  }));

  // HEDIS-compliant interval merging (from legacy)
  const mergedIntervals = mergeOverlappingIntervals(intervals);

  // Cap at measurement end
  const cappedIntervals = capIntervalsAtDate(mergedIntervals, new Date(measurementEnd));

  // Calculate covered days
  const coveredDays = sumIntervalDays(cappedIntervals);

  // Treatment days = first fill to measurement end
  const firstFillDate = new Date(validDispenses[0].whenHandedOver!);
  const treatmentDays = daysBetween(firstFillDate, new Date(measurementEnd)) + 1;

  // PDC calculation
  const pdc = (coveredDays / treatmentDays) * 100;
  const gapDaysUsed = treatmentDays - coveredDays;
  const gapDaysAllowed = Math.floor(treatmentDays * 0.2);
  const gapDaysRemaining = Math.max(0, gapDaysAllowed - gapDaysUsed);

  // Projections
  const today = new Date();
  const daysRemaining = daysBetween(today, new Date(measurementEnd));
  const lastDispense = validDispenses[validDispenses.length - 1];
  const currentSupply = Math.max(
    0,
    (lastDispense.daysSupply?.value || 30) -
      daysBetween(new Date(lastDispense.whenHandedOver!), today)
  );

  const pdcStatusQuo =
    ((coveredDays + Math.min(currentSupply, daysRemaining)) / treatmentDays) * 100;
  const pdcPerfect = ((coveredDays + daysRemaining) / treatmentDays) * 100;

  return {
    pdc: Math.round(pdc * 100) / 100,
    coveredDays,
    treatmentDays,
    gapDaysUsed,
    gapDaysAllowed,
    gapDaysRemaining,
    pdcStatusQuo: Math.round(pdcStatusQuo * 100) / 100,
    pdcPerfect: Math.round(pdcPerfect * 100) / 100,
    measurementPeriod: { start: measurementStart, end: measurementEnd },
  };
}
```

### 2. Fragility Service (`/src/lib/pdc/fragility.ts`)

**Input**: `PDCResult` + FHIR context
**Output**: `FragilityResult` (stored in Observation.component[])

```typescript
import { MedicationDispense } from '@medplum/fhirtypes';
import { PDCResult } from './calculator';

export type FragilityTier =
  | 'COMPLIANT'
  | 'F1_IMMINENT'
  | 'F2_FRAGILE'
  | 'F3_MODERATE'
  | 'F4_COMFORTABLE'
  | 'F5_SAFE'
  | 'T5_UNSALVAGEABLE';

export interface FragilityResult {
  tier: FragilityTier;
  tierLevel: number; // 1-5 for F tiers, 0 for COMPLIANT, 6 for T5
  delayBudgetPerRefill: number;
  contactWindow: string;
  action: string;
  priorityScore: number;
  urgencyLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
  flags: {
    isCompliant: boolean;
    isUnsalvageable: boolean;
    isOutOfMeds: boolean;
    isQ4: boolean;
  };
}

export interface FragilityContext {
  pdcResult: PDCResult;
  dispenses: MedicationDispense[];
  today?: Date;
  measureCount?: number;
  isNewPatient?: boolean;
}

/**
 * Calculate fragility tier from PDC result
 * Algorithm from legacy fragilityTierService.js
 */
export function calculateFragility(context: FragilityContext): FragilityResult {
  const { pdcResult, dispenses, today = new Date() } = context;

  // Check COMPLIANT first
  if (pdcResult.pdcStatusQuo >= 80) {
    return createCompliantResult();
  }

  // Check T5_UNSALVAGEABLE
  if (pdcResult.pdcPerfect < 80 || pdcResult.gapDaysRemaining < 0) {
    return createUnsalvageableResult();
  }

  // Calculate remaining refills needed
  const yearEnd = new Date(pdcResult.measurementPeriod.end);
  const daysRemaining = daysBetween(today, yearEnd);
  const avgDaysSupply = calculateAverageDaysSupply(dispenses);
  const refillsNeeded = Math.ceil(daysRemaining / avgDaysSupply);

  // Delay budget per refill
  const delayBudget = refillsNeeded > 0 ? pdcResult.gapDaysRemaining / refillsNeeded : 0;

  // Assign tier based on delay budget (Golden Standard thresholds)
  const tier = assignTierByDelayBudget(delayBudget);

  // Calculate days to runout
  const lastDispense = dispenses[dispenses.length - 1];
  const daysToRunout = calculateDaysToRunout(lastDispense, today);

  // Q4 tightening (Oct-Dec with ≤5 gap days)
  const isQ4 = today.getMonth() >= 9;
  const finalTier = applyQ4Tightening(tier, isQ4, pdcResult.gapDaysRemaining, daysRemaining);

  // Priority score
  const priorityScore = calculatePriorityScore(finalTier, {
    isOutOfMeds: daysToRunout <= 0,
    isQ4,
    measureCount: context.measureCount || 1,
    isNewPatient: context.isNewPatient || false,
  });

  return {
    tier: finalTier,
    tierLevel: getTierLevel(finalTier),
    delayBudgetPerRefill: Math.round(delayBudget * 10) / 10,
    contactWindow: getContactWindow(finalTier),
    action: getRecommendedAction(finalTier),
    priorityScore,
    urgencyLevel: getUrgencyLevel(priorityScore),
    flags: {
      isCompliant: false,
      isUnsalvageable: false,
      isOutOfMeds: daysToRunout <= 0,
      isQ4,
    },
  };
}

// Golden Standard thresholds from legacy
function assignTierByDelayBudget(budget: number): FragilityTier {
  if (budget <= 2) return 'F1_IMMINENT';
  if (budget <= 5) return 'F2_FRAGILE';
  if (budget <= 10) return 'F3_MODERATE';
  if (budget <= 20) return 'F4_COMFORTABLE';
  return 'F5_SAFE';
}

// Priority scoring from legacy
function calculatePriorityScore(
  tier: FragilityTier,
  context: { isOutOfMeds: boolean; isQ4: boolean; measureCount: number; isNewPatient: boolean }
): number {
  const baseScores: Record<FragilityTier, number> = {
    F1_IMMINENT: 100,
    F2_FRAGILE: 80,
    F3_MODERATE: 60,
    F4_COMFORTABLE: 40,
    F5_SAFE: 20,
    COMPLIANT: 0,
    T5_UNSALVAGEABLE: 0,
  };

  let score = baseScores[tier];

  // Bonuses
  if (context.isOutOfMeds) score += 30;
  if (context.isQ4) score += 25;
  if (context.measureCount >= 2) score += 15;
  if (context.isNewPatient) score += 10;

  return score;
}
```

### 3. FHIR Data Services (`/src/lib/fhir/`)

```typescript
// /src/lib/fhir/dispense-service.ts
import { MedplumClient } from '@medplum/core';
import { MedicationDispense, Bundle } from '@medplum/fhirtypes';

export async function getPatientDispenses(
  medplum: MedplumClient,
  patientId: string,
  measurementYear: number
): Promise<MedicationDispense[]> {
  return medplum.searchResources('MedicationDispense', {
    subject: `Patient/${patientId}`,
    whenhandedover: `ge${measurementYear}-01-01`,
    status: 'completed',
    _sort: 'whenhandedover',
    _count: '1000',
  });
}

export async function getDispensesByMeasure(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH',
  measurementYear: number
): Promise<MedicationDispense[]> {
  const allDispenses = await getPatientDispenses(medplum, patientId, measurementYear);

  // Filter by medication classification
  return allDispenses.filter((d) => {
    const rxnorm = d.medicationCodeableConcept?.coding?.find(
      (c) => c.system === 'http://www.nlm.nih.gov/research/umls/rxnorm'
    );
    return classifyMedicationByRxNorm(rxnorm?.code) === measure;
  });
}
```

```typescript
// /src/lib/fhir/observation-service.ts
import { MedplumClient } from '@medplum/core';
import { Observation } from '@medplum/fhirtypes';
import { PDCResult, FragilityResult } from '../pdc';

export async function storePDCObservation(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH',
  pdcResult: PDCResult,
  fragilityResult: FragilityResult
): Promise<Observation> {
  const observation: Observation = {
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'https://ignitehealth.com/observation-category',
            code: 'adherence-metric',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'https://ignitehealth.com/metrics',
          code: `pdc-${measure.toLowerCase()}`,
          display: `PDC Score - ${measure}`,
        },
      ],
    },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: pdcResult.pdc / 100,
      unit: '%',
      system: 'http://unitsofmeasure.org',
      code: '%',
    },
    interpretation: [
      {
        coding: [
          {
            system: 'https://ignitehealth.com/adherence-status',
            code:
              pdcResult.pdc >= 80 ? 'adherent' : pdcResult.pdc >= 60 ? 'at-risk' : 'non-adherent',
          },
        ],
      },
    ],
    component: [
      {
        code: { coding: [{ code: 'fragility-tier' }] },
        valueString: fragilityResult.tier,
      },
      {
        code: { coding: [{ code: 'priority-score' }] },
        valueInteger: fragilityResult.priorityScore,
      },
      {
        code: { coding: [{ code: 'gap-days-remaining' }] },
        valueInteger: pdcResult.gapDaysRemaining,
      },
      {
        code: { coding: [{ code: 'delay-budget' }] },
        valueQuantity: { value: fragilityResult.delayBudgetPerRefill, unit: 'days' },
      },
      {
        code: { coding: [{ code: 'urgency-level' }] },
        valueString: fragilityResult.urgencyLevel,
      },
    ],
  };

  return medplum.createResource(observation);
}

export async function getLatestPDCObservation(
  medplum: MedplumClient,
  patientId: string,
  measure: 'MAC' | 'MAD' | 'MAH'
): Promise<Observation | null> {
  const results = await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    code: `pdc-${measure.toLowerCase()}`,
    _sort: '-date',
    _count: '1',
  });
  return results[0] || null;
}
```

### 4. Task Service (`/src/lib/fhir/task-service.ts`)

```typescript
import { MedplumClient } from '@medplum/core';
import { Task, Patient, MedicationRequest } from '@medplum/fhirtypes';
import { FragilityResult } from '../pdc';

export interface CreateRefillTaskInput {
  patient: Patient;
  medicationRequest: MedicationRequest;
  measure: 'MAC' | 'MAD' | 'MAH';
  pdcScore: number;
  fragilityResult: FragilityResult;
  daysToRunout: number;
  aiRecommendation?: {
    decision: 'Approve' | 'Deny';
    confidence: number;
    rationale: string;
  };
}

export async function createRefillTask(
  medplum: MedplumClient,
  input: CreateRefillTaskInput
): Promise<Task> {
  const {
    patient,
    medicationRequest,
    measure,
    pdcScore,
    fragilityResult,
    daysToRunout,
    aiRecommendation,
  } = input;

  const task: Task = {
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    priority: daysToRunout <= 3 ? 'urgent' : daysToRunout <= 7 ? 'asap' : 'routine',
    code: {
      coding: [
        {
          system: 'https://ignitehealth.com/task-types',
          code: 'refill-review',
          display: 'Medication Refill Review',
        },
      ],
    },
    for: { reference: `Patient/${patient.id}`, display: formatPatientName(patient) },
    focus: { reference: `MedicationRequest/${medicationRequest.id}` },
    authoredOn: new Date().toISOString(),
    description: `Review refill for ${getMedicationName(medicationRequest)}`,
    extension: [
      {
        url: 'https://ignitehealth.com/ext/pdc-score',
        valueDecimal: pdcScore / 100,
      },
      {
        url: 'https://ignitehealth.com/ext/fragility-tier',
        valueString: fragilityResult.tier,
      },
      {
        url: 'https://ignitehealth.com/ext/priority-score',
        valueInteger: fragilityResult.priorityScore,
      },
      {
        url: 'https://ignitehealth.com/ext/days-to-runout',
        valueInteger: daysToRunout,
      },
      {
        url: 'https://ignitehealth.com/ext/measure',
        valueCode: measure,
      },
      {
        url: 'https://ignitehealth.com/ext/urgency-level',
        valueCode: fragilityResult.urgencyLevel,
      },
      ...(aiRecommendation
        ? [
            {
              url: 'https://ignitehealth.com/ext/ai-recommendation',
              valueString: aiRecommendation.decision,
            },
            {
              url: 'https://ignitehealth.com/ext/ai-confidence',
              valueDecimal: aiRecommendation.confidence,
            },
            {
              url: 'https://ignitehealth.com/ext/ai-rationale',
              valueString: aiRecommendation.rationale,
            },
          ]
        : []),
    ],
  };

  return medplum.createResource(task);
}

export async function getRefillQueue(
  medplum: MedplumClient,
  status: 'requested' | 'in-progress' | 'completed' | 'on-hold' = 'requested'
): Promise<Task[]> {
  return medplum.searchResources('Task', {
    code: 'refill-review',
    status,
    _sort: '-priority,-authored',
    _count: '100',
    _include: 'Task:patient',
  });
}
```

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

## Accelerated Timeline (FHIR-Native)

### Week 1: Core FHIR Services + PDC Engine

#### Day 1-2: FHIR Data Services Foundation

**Files to create:**

```
/src/lib/fhir/
├── patient-service.ts          ← Medplum Patient queries
├── dispense-service.ts         ← MedicationDispense queries (PDC source)
├── medication-service.ts       ← MedicationRequest queries
├── observation-service.ts      ← Store/retrieve PDC as Observation
├── task-service.ts             ← Task CRUD for workflow queue
├── helpers.ts                  ← FHIR resource utilities
├── types.ts                    ← FHIR type helpers & extensions
└── index.ts                    ← Barrel export

/src/lib/fhir/__tests__/
├── dispense-service.test.ts    ← Test with mock FHIR data
├── observation-service.test.ts
└── task-service.test.ts
```

**FHIR Services Steps:**

1. Implement `getPatientDispenses()` - query MedicationDispense by patient + date range
2. Implement `getDispensesByMeasure()` - filter by medication classification (MAC/MAD/MAH)
3. Implement `storePDCObservation()` - create Observation with PDC + fragility components
4. Implement `createRefillTask()` - create Task with AI extensions
5. Write unit tests with mock FHIR resources

#### Day 3-4: FHIR-Native PDC Engine

**Files to create (FHIR-native from start):**

```
/src/lib/pdc/
├── calculator.ts        ← FHIR-native: accepts MedicationDispense[]
├── fragility.ts         ← FHIR-native: accepts PDCResult + MedicationDispense[]
├── pathway.ts           ← FHIR-native: accepts MedicationRequest context
├── measures.ts          ← RxNorm classification (MAC/MAD/MAH)
├── types.ts             ← Zod schemas for all PDC types
└── index.ts             ← Barrel export

/src/lib/pdc/__tests__/
├── calculator.test.ts   ← Test with mock MedicationDispense[]
├── fragility.test.ts    ← Test fragility tiers with FHIR context
└── golden-standard.test.ts ← Migrate legacy tests to FHIR inputs
```

**FHIR-Native Migration Steps:**

1. Create `calculator.ts` that accepts `MedicationDispense[]` directly
2. Create `fragility.ts` that accepts `PDCResult + MedicationDispense[]`
3. Create `pathway.ts` that accepts `MedicationRequest` context
4. Port **algorithms only** from legacy (interval merging, tier thresholds, priority scoring)
5. Write tests using mock FHIR resources (not legacy shapes)

**FHIR-Native Function Signatures:**

```typescript
// PDC Calculator - accepts FHIR MedicationDispense directly
export function calculatePDC(
  dispenses: MedicationDispense[],
  measurementStart: string,
  measurementEnd: string
): PDCResult;

// Fragility - accepts PDC result + FHIR context
export function calculateFragility(context: {
  pdcResult: PDCResult;
  dispenses: MedicationDispense[];
  measureCount?: number;
  isNewPatient?: boolean;
}): FragilityResult;

// Pathway - accepts FHIR MedicationRequest
export function determinePathway(
  medicationRequest: MedicationRequest,
  lastVisitDate?: string
): PathwayResult;
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

## Immediate Next Steps (FHIR-Native)

1. **Create `/src/lib/fhir/` directory** with FHIR data services
   - `dispense-service.ts` - Query MedicationDispense by patient + measure
   - `observation-service.ts` - Store/retrieve PDC Observations
   - `task-service.ts` - Task CRUD for workflow queue

2. **Create `/src/lib/pdc/` directory** with FHIR-native calculators
   - `calculator.ts` - PDC calculation accepting `MedicationDispense[]`
   - `fragility.ts` - Fragility tier accepting FHIR context
   - `types.ts` - Zod schemas for all output types

3. **Port algorithms from legacy** (logic only, not data shapes)
   - HEDIS-compliant interval merging
   - Fragility tier thresholds (F1-F5, T5, COMPLIANT)
   - Priority scoring (base + bonuses)
   - Q4 tightening logic

4. **Write tests with mock FHIR resources**
   - Convert legacy test cases to use `MedicationDispense[]` inputs
   - Validate same outputs as Golden Standard

5. **Wire to Medplum SDK** and test end-to-end

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

## Complete File Structure (FHIR-Native)

```
/src/lib/
├── fhir/                               ← FHIR Data Services (Medplum SDK)
│   ├── patient-service.ts              ← Medplum Patient queries
│   ├── dispense-service.ts             ← MedicationDispense queries (PDC source)
│   ├── medication-service.ts           ← MedicationRequest queries
│   ├── observation-service.ts          ← Store/retrieve PDC Observations
│   ├── task-service.ts                 ← Task CRUD for workflow queue
│   ├── helpers.ts                      ← FHIR resource utilities
│   ├── types.ts                        ← FHIR type helpers & extension definitions
│   ├── index.ts                        ← Barrel export
│   └── __tests__/
│       ├── dispense-service.test.ts
│       ├── observation-service.test.ts
│       └── task-service.test.ts
│
├── pdc/                                ← FHIR-Native PDC Engine
│   ├── calculator.ts                   ← PDC calculation (accepts MedicationDispense[])
│   ├── fragility.ts                    ← Fragility tier (accepts PDCResult + FHIR context)
│   ├── pathway.ts                      ← Pathway routing (accepts MedicationRequest)
│   ├── measures.ts                     ← RxNorm → MAC/MAD/MAH classification
│   ├── types.ts                        ← Zod schemas for PDCResult, FragilityResult
│   ├── index.ts                        ← Barrel export
│   └── __tests__/
│       ├── calculator.test.ts          ← Test with mock MedicationDispense[]
│       ├── fragility.test.ts           ← Test fragility with FHIR context
│       └── golden-standard.test.ts     ← Legacy tests converted to FHIR inputs
│
├── ai/                                 ← AWS Bedrock (Claude) Integration
│   ├── bedrock-client.ts               ← Claude API client
│   ├── pipeline.ts                     ← 3-tier AI pipeline (Primary → QA → Manager)
│   ├── confidence-router.ts            ← Route by confidence level
│   ├── types.ts                        ← Zod schemas for AI outputs
│   ├── index.ts                        ← Barrel export
│   └── prompts/
│       ├── primary-agent.ts            ← Primary analysis prompt
│       ├── qa-agent.ts                 ← QA verification prompt
│       └── manager-agent.ts            ← Disagreement resolution prompt
│
├── safety/                             ← Protocol Checks (FHIR queries)
│   ├── protocol-checks.ts              ← 16 protocol checks (S1-4, C1-4, I1-4, A1-4)
│   ├── drug-interactions.ts            ← Drug interaction lookup
│   ├── allergy-checker.ts              ← AllergyIntolerance queries
│   ├── lab-validator.ts                ← Lab Observation queries
│   ├── types.ts                        ← ProtocolCheck types
│   └── index.ts                        ← Barrel export
│
├── audit/                              ← HIPAA-Compliant Logging
│   ├── logger.ts                       ← Audit event creation
│   └── clinical-memory.ts              ← Decision history per patient
│
└── constants.ts                        ← Business constants (thresholds, timeouts)
```

---

## Summary: FHIR-Native Approach

| Legacy Approach                    | FHIR-Native Approach                                 |
| ---------------------------------- | ---------------------------------------------------- |
| Denormalized Firebase documents    | Normalized FHIR resources                            |
| `patient.medications[].rxClaims[]` | Query `MedicationDispense` by patient                |
| `patient.medications[].currentPdc` | Compute from dispenses, store in `Observation`       |
| `patient.fragilityTier`            | Compute from PDC, store in `Observation.component[]` |
| `refillWorklist` collection        | `Task` resource with custom extensions               |
| Embedded activity log              | `AuditEvent` (auto-created by Medplum)               |
| Firebase Auth                      | Medplum OAuth / SMART on FHIR                        |
| Google Gemini                      | AWS Bedrock (Claude)                                 |

---

## Why FHIR-Native?

1. **No Translation Layer** - Services work directly with FHIR resources
2. **Industry Standard** - Interoperable with Epic, Cerner, eClinicalWorks
3. **Medplum Built-ins** - Leverage audit, subscriptions, bots
4. **Single Data Model** - No maintaining two schemas
5. **Faster Development** - Skip legacy shape mapping

---

## Patient Detail Page Implementation (NEW - PRD v1.1)

Based on the newly added Product Requirements Documents:

- **PRD**: `docs/Product Requirement Doc/1_PRD_Patient_Detail_Page.md` (v1.1)
- **Features**: `docs/Product Requirement Doc/2_FEATURES_Patient_Detail_Page.json` (121 features)
- **Test Cases**: `docs/Product Requirement Doc/Test cases/3_TEST_CASES_Patient_Detail_Page.json` (420 test cases)

### Patient Detail Page Overview

**Component**: `PatientDetailPageTabbed.jsx`
**Route**: `/med-adherence/patients/:patientId`
**Status**: APPROVED FOR DEVELOPMENT

### 4-Tab Structure (Updated from 5 tabs in v1.0)

| Tab               | Description                                                         | Features             |
| ----------------- | ------------------------------------------------------------------- | -------------------- |
| **Overview**      | Patient snapshot - demographics, adherence summary, fragility tier  | F-PD-001 to F-PD-015 |
| **Medications**   | Full medication list with PDC, days remaining, MA tracking          | F-PD-016 to F-PD-027 |
| **Outreach**      | Communication history, call logging, AI-powered prep                | F-PD-028 to F-PD-040 |
| **Med Adherence** | Detailed analytics, projections, gap tracking + **Timeline Drawer** | F-PD-041 to F-PD-055 |

### Medication Timeline Drawer (NEW in v1.1)

A 3-tab slide-out panel opened by clicking any medication row:

```
┌─────────────────────────────────────────────┐
│ Medication Timeline Drawer (480px wide)     │
├─────────────────────────────────────────────┤
│ Header: Medication Name + MA Badge + Close  │
├─────────────────────────────────────────────┤
│ [Details] [Timeline] [Claims]               │
├─────────────────────────────────────────────┤
│                                             │
│ Details Tab (F-PD-059 to F-PD-064):        │
│   • PDC with color badge                    │
│   • Gap Days Remaining                      │
│   • Days Supply Remaining                   │
│   • Medication info (drug, class, NDC)      │
│   • Prescriber info                         │
│   • Pharmacy info                           │
│   • Last fill information                   │
│   • Refills remaining + RENEWAL badge       │
│                                             │
│ Timeline Tab (F-PD-065 to F-PD-072):       │
│   • Visual fill/gap timeline                │
│   • Fill events (green dots)                │
│   • Gap events (red spans)                  │
│   • Due date marker (blue)                  │
│   • Reversal markers (strikethrough)        │
│   • Today marker                            │
│   • Legend + event detail cards             │
│                                             │
│ Claims Tab (F-PD-073 to F-PD-077):         │
│   • RX claims table with sorting            │
│   • PAID/REVERSED/PENDING badges            │
│   • Claim detail expansion                  │
│   • Pagination (10 per page)                │
│                                             │
└─────────────────────────────────────────────┘
```

### Patient Detail Page Files to Create

```
/src/app/(dashboard)/patients/[patientId]/
├── page.tsx                    ← Patient Detail Page (4 tabs)
├── loading.tsx                 ← Skeleton loading state
└── error.tsx                   ← Error boundary

/src/components/patient-detail/
├── patient-header.tsx          ← Name, DOB, MRN, PDC badge, Fragility badge
├── tab-navigation.tsx          ← 4-tab navigation component
├── overview-tab.tsx            ← Tab 1: Patient overview
├── medications-tab.tsx         ← Tab 2: Medications table
├── outreach-tab.tsx            ← Tab 3: Communication history
├── med-adherence-tab.tsx       ← Tab 4: Med Adherence analytics
├── medication-timeline-drawer/ ← NEW: 3-tab slide-out drawer
│   ├── index.tsx               ← Drawer container + header
│   ├── details-tab.tsx         ← PDC, gap days, medication info
│   ├── timeline-tab.tsx        ← Visual fill/gap timeline
│   ├── claims-tab.tsx          ← RX claims table
│   └── timeline-visualization.tsx ← Fill/gap dots visualization
└── ai-call-prep-banner.tsx     ← AI-generated talking points
```

### Key Feature Breakdown (121 total)

| Category             | Features             | Priority               |
| -------------------- | -------------------- | ---------------------- |
| Tab 1: Overview      | F-PD-001 to F-PD-015 | P0: 12, P1: 3          |
| Tab 2: Medications   | F-PD-016 to F-PD-027 | P0: 9, P1: 3           |
| Tab 3: Outreach      | F-PD-028 to F-PD-040 | P0: 8, P1: 4, P2: 1    |
| Tab 4: Med Adherence | F-PD-041 to F-PD-055 | P0: 13, P1: 2          |
| Timeline Drawer      | F-PD-056 to F-PD-121 | P0: 26, P1: 23, P2: 17 |

### Golden Standard Calculations (CRITICAL)

Reference: `src/pages/MetricsReference.jsx` (legacy) → migrate to `/src/lib/pdc/`

| Calculation            | Formula                                         | Features |
| ---------------------- | ----------------------------------------------- | -------- |
| **PDC**                | `(Covered Days / Treatment Period) × 100`       | F-PD-094 |
| **Gap Days Used**      | `Treatment Period - Covered Days`               | F-PD-095 |
| **Gap Days Allowed**   | `Treatment Period × 20%`                        | F-PD-095 |
| **Gap Days Remaining** | `Allowed - Used`                                | F-PD-095 |
| **Delay Budget**       | `Gap Days Remaining / Refills Remaining`        | F-PD-096 |
| **PDC Status Quo**     | `(Covered + min(Supply, DaysLeft)) / Treatment` | F-PD-092 |
| **PDC Perfect**        | `(Covered + DaysToYearEnd) / Treatment`         | F-PD-094 |

### Fragility Tier Assignment (F-PD-097)

**MUST use fragilityTierService.js algorithms - NO inline calculations**

| Tier             | Delay Budget         | Priority Score | Contact Window   |
| ---------------- | -------------------- | -------------- | ---------------- |
| COMPLIANT        | PDC Status Quo ≥ 80% | 0              | Monitor only     |
| F1_IMMINENT      | 0-2 days             | 100            | 24 hours         |
| F2_FRAGILE       | 3-5 days             | 80             | 48 hours         |
| F3_MODERATE      | 6-10 days            | 60             | 1 week           |
| F4_COMFORTABLE   | 11-20 days           | 40             | 2 weeks          |
| F5_SAFE          | > 20 days            | 20             | Monthly          |
| T5_UNSALVAGEABLE | PDC Perfect < 80%    | 0              | Special handling |

**Priority Bonuses (F-PD-098):**

- +30: Out of medication (daysToRunout ≤ 0)
- +25: Q4 (Oct-Dec)
- +15: Multiple MA measures (2+)
- +10: New patient

### Test Cases Overview (420 total)

| Category                     | Test Count | Test IDs               |
| ---------------------------- | ---------- | ---------------------- |
| Tab 1: Overview              | 60         | TC-PD-001 to TC-PD-034 |
| Tab 2: Medications           | 48         | TC-PD-035 to TC-PD-054 |
| Tab 3: Outreach              | 52         | TC-PD-055 to TC-PD-074 |
| Tab 4: Med Adherence         | 56         | TC-PD-075 to TC-PD-102 |
| Timeline Drawer - General    | 18         | TC-TD-001 to TC-TD-018 |
| Timeline Drawer - Details    | 22         | TC-TD-019 to TC-TD-040 |
| Timeline Drawer - Timeline   | 26         | TC-TD-041 to TC-TD-066 |
| Timeline Drawer - Claims     | 18         | TC-TD-067 to TC-TD-084 |
| Golden Standard Calculations | 35         | TC-GS-001 to TC-GS-027 |
| Tab Navigation               | 7          | TC-TN-001 to TC-TN-007 |
| Performance & Accessibility  | 25         | TC-PF-001 to TC-PF-010 |
| Error Handling               | 20         | TC-EH-001 to TC-EH-012 |

### UI/UX Requirements

**Color Coding Standards:**

| Element              | Color                 | Hex     |
| -------------------- | --------------------- | ------- |
| PDC ≥80% (Pass)      | Green                 | #22C55E |
| PDC 60-79% (At-Risk) | Amber                 | #F59E0B |
| PDC <60% (Fail)      | Red                   | #EF4444 |
| MAC Badge            | Blue-100/Blue-700     | -       |
| MAD Badge            | Purple-100/Purple-700 | -       |
| MAH Badge            | Pink-100/Pink-700     | -       |
| Timeline Fill        | Green                 | #22C55E |
| Timeline Gap         | Red                   | #EF4444 |
| Timeline Due         | Blue                  | #3B82F6 |

**Performance Requirements:**

| Metric       | Target      |
| ------------ | ----------- |
| Page load    | < 2 seconds |
| Tab switch   | < 500ms     |
| Drawer open  | < 300ms     |
| Data refresh | < 1 second  |

### Implementation Timeline for Patient Detail Page

**Week 3 (Updated):**

- Day 1-2: Patient Detail Page skeleton + 4-tab navigation
- Day 3: Overview Tab + Medications Tab
- Day 4: Outreach Tab + Med Adherence Tab
- Day 5: Medication Timeline Drawer (3 tabs)

**Week 4 (Updated):**

- Day 1-2: Timeline visualization + Claims table
- Day 3: Golden Standard calculations integration
- Day 4: Test cases validation (420 tests)
- Day 5: Performance optimization + accessibility

---

This accelerated plan reduces implementation from **8+ weeks to 4-5 weeks** by:

1. Leveraging production-tested **algorithms** from legacy code
2. Working **directly with FHIR resources** (no translation overhead)
3. Using **Medplum SDK + native components** where possible
4. Migrating only the **business logic** (PDC calculation, fragility tiers, pathway routing)
5. Following the detailed **Patient Detail Page PRD v1.1** specifications with 121 features and 420 test cases
