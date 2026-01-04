# FHIR Resource & Extension Plan for Ignite Health

**Date:** January 4, 2026
**Author:** Clinical/Database/US Healthcare Expert Analysis
**Status:** Proposed

---

## Executive Summary

Based on comprehensive analysis of the Product Requirements (PRD) and current implementation, this document outlines the FHIR resources, extensions, and custom profiles needed to fully support the Ignite Health medication adherence platform.

### Gap Analysis Summary

| Area                    | Current State          | Required              | Gap             |
| ----------------------- | ---------------------- | --------------------- | --------------- |
| **Core FHIR Resources** | 7 resources referenced | 12 resources needed   | 5 new resources |
| **Custom Extensions**   | 2 basic extensions     | 25+ extensions needed | 23+ extensions  |
| **Code Systems**        | 3 systems              | 12 systems needed     | 9 new systems   |
| **Value Sets**          | 0 defined              | 15+ needed            | 15+ value sets  |
| **Profiles**            | 0 defined              | 8 profiles needed     | 8 new profiles  |

---

## Part 1: Additional FHIR Resources Required

### 1.1 New Resources to Implement

| Resource                 | Purpose                                | Priority      | PRD Reference                 |
| ------------------------ | -------------------------------------- | ------------- | ----------------------------- |
| **Coverage**             | Insurance eligibility, formulary       | P0 - Critical | Protocol Check I3             |
| **CommunicationRequest** | Outreach automation (SMS, Email, Call) | P1 - High     | Outreach Automation           |
| **Communication**        | Outreach history/outcomes              | P1 - High     | Clinical Memory Timeline      |
| **Appointment**          | Scheduling for renewals                | P1 - High     | FR-3.1.4 (APPOINTMENT_NEEDED) |
| **ServiceRequest**       | Prior authorization requests           | P1 - High     | Protocol Check I4             |

### 1.2 Resource Details

#### Coverage (Insurance/Eligibility)

```json
{
  "resourceType": "Coverage",
  "id": "coverage-123",
  "status": "active",
  "beneficiary": { "reference": "Patient/patient-123" },
  "payor": [{ "display": "Medicare Part D" }],
  "class": [
    {
      "type": { "coding": [{ "code": "plan" }] },
      "value": "PDP-001",
      "name": "Standard Part D Plan"
    }
  ],
  "extension": [
    {
      "url": "https://ignitehealth.com/fhir/extensions/formulary-status",
      "valueCode": "preferred"
    }
  ]
}
```

#### CommunicationRequest (Outreach Trigger)

```json
{
  "resourceType": "CommunicationRequest",
  "id": "outreach-request-456",
  "status": "active",
  "category": [{ "coding": [{ "code": "adherence-outreach" }] }],
  "priority": "routine",
  "medium": [{ "coding": [{ "code": "sms" }] }],
  "subject": { "reference": "Patient/patient-123" },
  "about": [{ "reference": "Task/refill-task-789" }],
  "payload": [{ "contentString": "Your prescription is ready for refill..." }],
  "occurrenceDateTime": "2026-01-05T09:00:00Z",
  "extension": [
    {
      "url": "https://ignitehealth.com/fhir/extensions/outreach-day",
      "valueInteger": 1
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/outreach-sequence",
      "valueCode": "initial"
    }
  ]
}
```

#### Communication (Outreach Outcome)

```json
{
  "resourceType": "Communication",
  "id": "outreach-outcome-789",
  "status": "completed",
  "category": [{ "coding": [{ "code": "adherence-outreach" }] }],
  "medium": [{ "coding": [{ "code": "phone-call" }] }],
  "subject": { "reference": "Patient/patient-123" },
  "sent": "2026-01-07T14:30:00Z",
  "recipient": [{ "reference": "Patient/patient-123" }],
  "sender": { "reference": "Practitioner/coordinator-1" },
  "payload": [{ "contentString": "Left voicemail regarding medication refill" }],
  "extension": [
    {
      "url": "https://ignitehealth.com/fhir/extensions/call-outcome",
      "valueCode": "voicemail"
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/call-duration",
      "valueQuantity": { "value": 45, "unit": "seconds" }
    }
  ]
}
```

---

## Part 2: Custom Extensions Required

### 2.1 Patient Extensions

| Extension URL                                        | Value Type    | Purpose                   | PRD Reference          |
| ---------------------------------------------------- | ------------- | ------------------------- | ---------------------- |
| `ignitehealth.com/fhir/ext/fragility-tier`           | valueCode     | F1-F5, T5, COMP           | Fragility Tier System  |
| `ignitehealth.com/fhir/ext/priority-score`           | valueInteger  | 0-150+ score              | Priority Scoring       |
| `ignitehealth.com/fhir/ext/urgency-index`            | valueCode     | extreme/high/moderate/low | Urgency Classification |
| `ignitehealth.com/fhir/ext/denominator-status`       | valueCode     | D0/D1a/D1b/D2/DX          | HEDIS Denominator      |
| `ignitehealth.com/fhir/ext/q4-bonus-applied`         | valueBoolean  | Q4 priority boost         | Q4 Handling            |
| `ignitehealth.com/fhir/ext/last-outreach-date`       | valueDateTime | Last contact attempt      | Outreach Tracking      |
| `ignitehealth.com/fhir/ext/preferred-contact-method` | valueCode     | sms/email/phone           | Patient Preference     |

#### Patient Extension Example

```json
{
  "resourceType": "Patient",
  "id": "patient-123",
  "extension": [
    {
      "url": "https://ignitehealth.com/fhir/extensions/fragility-tier",
      "valueCode": "F2"
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/priority-score",
      "valueInteger": 95
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/urgency-index",
      "valueCode": "high"
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/denominator-status",
      "extension": [
        { "url": "mac", "valueCode": "D2" },
        { "url": "mad", "valueCode": "D1a" },
        { "url": "mah", "valueCode": "D0" }
      ]
    }
  ]
}
```

### 2.2 Task Extensions (Refill Review)

| Extension URL                                   | Value Type    | Purpose                           | PRD Reference        |
| ----------------------------------------------- | ------------- | --------------------------------- | -------------------- |
| `ignitehealth.com/fhir/ext/pathway-type`        | valueCode     | REFILL/RENEWAL/APPOINTMENT_NEEDED | Decision Logic       |
| `ignitehealth.com/fhir/ext/ai-primary-decision` | Complex       | Primary AI output                 | 3-Tier AI Logic      |
| `ignitehealth.com/fhir/ext/ai-qa-decision`      | Complex       | QA AI validation                  | 3-Tier AI Logic      |
| `ignitehealth.com/fhir/ext/ai-manager-decision` | Complex       | Manager arbitration               | 3-Tier AI Logic      |
| `ignitehealth.com/fhir/ext/protocol-checks`     | Complex       | 16 protocol checks                | Protocol Check Grid  |
| `ignitehealth.com/fhir/ext/worklist-tab`        | valueCode     | refills/pickup/exceptions/archive | Worklist Navigation  |
| `ignitehealth.com/fhir/ext/exception-type`      | valueCode     | clinical/pa/scheduling/other      | Exception Routing    |
| `ignitehealth.com/fhir/ext/sla-deadline`        | valueDateTime | SLA breach time                   | Exception SLAs       |
| `ignitehealth.com/fhir/ext/human-override`      | Complex       | Override details                  | Override AI Decision |
| `ignitehealth.com/fhir/ext/denial-reason`       | valueCode     | Reason for denial                 | Deny Action          |
| `ignitehealth.com/fhir/ext/days-to-runout`      | valueInteger  | Days until out of meds            | Urgency Calculation  |

#### Task AI Decision Extension Example

```json
{
  "url": "https://ignitehealth.com/fhir/extensions/ai-primary-decision",
  "extension": [
    {
      "url": "decision",
      "valueCode": "APPROVE"
    },
    {
      "url": "confidence",
      "valueDecimal": 0.92
    },
    {
      "url": "reasoning",
      "valueString": "Patient has good adherence history, no safety concerns identified..."
    },
    {
      "url": "processing-time-ms",
      "valueInteger": 1200
    },
    {
      "url": "timestamp",
      "valueDateTime": "2026-01-04T10:30:00Z"
    }
  ]
}
```

#### Protocol Checks Extension Example

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

### 2.3 MedicationRequest Extensions

| Extension URL                                   | Value Type   | Purpose                 | PRD Reference     |
| ----------------------------------------------- | ------------ | ----------------------- | ----------------- |
| `ignitehealth.com/fhir/ext/adherence-class`     | valueCode    | MAC/MAD/MAH             | HEDIS Measures    |
| `ignitehealth.com/fhir/ext/refills-remaining`   | valueInteger | Number of refills left  | Protocol Check I1 |
| `ignitehealth.com/fhir/ext/rx-expiration-date`  | valueDate    | When Rx expires         | Protocol Check I2 |
| `ignitehealth.com/fhir/ext/prior-auth-required` | valueBoolean | PA needed               | Protocol Check I4 |
| `ignitehealth.com/fhir/ext/prior-auth-status`   | valueCode    | pending/approved/denied | PA Tracking       |

### 2.4 MedicationDispense Extensions

| Extension URL                                   | Value Type   | Purpose                 | PRD Reference   |
| ----------------------------------------------- | ------------ | ----------------------- | --------------- |
| `ignitehealth.com/fhir/ext/gap-days-before`     | valueInteger | Gap since previous fill | PDC Calculation |
| `ignitehealth.com/fhir/ext/coverage-start-date` | valueDate    | When coverage begins    | PDC Calculation |
| `ignitehealth.com/fhir/ext/coverage-end-date`   | valueDate    | When coverage ends      | PDC Calculation |
| `ignitehealth.com/fhir/ext/is-overlapping`      | valueBoolean | Overlaps with previous  | PDC Calculation |
| `ignitehealth.com/fhir/ext/fill-source`         | valueCode    | pharmacy/mail-order     | Fill Tracking   |

### 2.5 Observation Extensions (PDC Scores)

| Extension URL                                    | Value Type   | Purpose                | PRD Reference  |
| ------------------------------------------------ | ------------ | ---------------------- | -------------- |
| `ignitehealth.com/fhir/ext/pdc-status-quo`       | valueDecimal | PDC if stops today     | Projections    |
| `ignitehealth.com/fhir/ext/pdc-perfect`          | valueDecimal | Best possible PDC      | Projections    |
| `ignitehealth.com/fhir/ext/gap-days-used`        | valueInteger | Gap days consumed      | Gap Tracking   |
| `ignitehealth.com/fhir/ext/gap-days-allowed`     | valueInteger | Total gap budget       | Gap Tracking   |
| `ignitehealth.com/fhir/ext/gap-days-remaining`   | valueInteger | Remaining buffer       | Gap Tracking   |
| `ignitehealth.com/fhir/ext/treatment-start-date` | valueDate    | First fill date        | PDC Period     |
| `ignitehealth.com/fhir/ext/treatment-end-date`   | valueDate    | Dec 31 or disenroll    | PDC Period     |
| `ignitehealth.com/fhir/ext/refills-needed`       | valueInteger | Fills to reach Dec 31  | Planning       |
| `ignitehealth.com/fhir/ext/delay-budget`         | valueDecimal | Days buffer per refill | Fragility Calc |
| `ignitehealth.com/fhir/ext/is-salvageable`       | valueBoolean | Can reach 80%?         | T5 Detection   |

---

## Part 3: Code Systems Required

### 3.1 New Code Systems

| Code System URL                             | Purpose                  | Codes                                                                                          |
| ------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| `ignitehealth.com/cs/fragility-tier`        | Fragility classification | COMP, F1, F2, F3, F4, F5, T5                                                                   |
| `ignitehealth.com/cs/urgency-index`         | Urgency levels           | extreme, high, moderate, low                                                                   |
| `ignitehealth.com/cs/denominator-status`    | HEDIS denominator        | D0, D1a, D1b, D2, DX                                                                           |
| `ignitehealth.com/cs/adherence-class`       | HEDIS measures           | MAC, MAD, MAH                                                                                  |
| `ignitehealth.com/cs/pathway-type`          | Decision pathway         | REFILL, RENEWAL, APPOINTMENT_NEEDED                                                            |
| `ignitehealth.com/cs/ai-decision`           | AI outcomes              | APPROVE, DENY, ROUTE, ESCALATE                                                                 |
| `ignitehealth.com/cs/protocol-check-result` | Check outcomes           | pass, fail, warning, not-applicable                                                            |
| `ignitehealth.com/cs/exception-type`        | Exception categories     | clinical, pa, scheduling, other                                                                |
| `ignitehealth.com/cs/worklist-tab`          | Worklist tabs            | refills, pickup, exceptions, archive                                                           |
| `ignitehealth.com/cs/outreach-channel`      | Contact methods          | sms, email, phone, mail                                                                        |
| `ignitehealth.com/cs/call-outcome`          | Call results             | answered, voicemail, no-answer, wrong-number, declined                                         |
| `ignitehealth.com/cs/denial-reason`         | Denial reasons           | safety-concern, clinical-contraindication, insurance-issue, patient-request, duplicate-therapy |

### 3.2 Code System Example

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

## Part 4: Value Sets Required

| Value Set URL                               | Binding Strength | Codes From                       |
| ------------------------------------------- | ---------------- | -------------------------------- |
| `ignitehealth.com/vs/fragility-tier`        | Required         | fragility-tier CodeSystem        |
| `ignitehealth.com/vs/urgency-index`         | Required         | urgency-index CodeSystem         |
| `ignitehealth.com/vs/denominator-status`    | Required         | denominator-status CodeSystem    |
| `ignitehealth.com/vs/adherence-class`       | Required         | adherence-class CodeSystem       |
| `ignitehealth.com/vs/pathway-type`          | Required         | pathway-type CodeSystem          |
| `ignitehealth.com/vs/ai-decision`           | Required         | ai-decision CodeSystem           |
| `ignitehealth.com/vs/protocol-check-result` | Required         | protocol-check-result CodeSystem |
| `ignitehealth.com/vs/mac-medications`       | Extensible       | RxNorm statins                   |
| `ignitehealth.com/vs/mad-medications`       | Extensible       | RxNorm diabetes meds             |
| `ignitehealth.com/vs/mah-medications`       | Extensible       | RxNorm hypertension meds         |

---

## Part 5: FHIR Profiles Required

### 5.1 Profile Definitions

| Profile Name               | Base Resource        | Purpose                           |
| -------------------------- | -------------------- | --------------------------------- |
| `IgnitePatient`            | Patient              | Patient with adherence extensions |
| `IgniteRefillTask`         | Task                 | Refill review workflow item       |
| `IgnitePDCObservation`     | Observation          | PDC score with projections        |
| `IgniteMedicationRequest`  | MedicationRequest    | Rx with adherence class           |
| `IgniteMedicationDispense` | MedicationDispense   | Fill with coverage dates          |
| `IgniteOutreachRequest`    | CommunicationRequest | Outreach automation               |
| `IgniteOutreachOutcome`    | Communication        | Outreach results                  |
| `IgniteCoverage`           | Coverage             | Insurance with formulary          |

### 5.2 Profile Example: IgniteRefillTask

```json
{
  "resourceType": "StructureDefinition",
  "id": "ignite-refill-task",
  "url": "https://ignitehealth.com/fhir/StructureDefinition/IgniteRefillTask",
  "name": "IgniteRefillTask",
  "title": "Ignite Health Refill Review Task",
  "status": "active",
  "kind": "resource",
  "abstract": false,
  "type": "Task",
  "baseDefinition": "http://hl7.org/fhir/StructureDefinition/Task",
  "derivation": "constraint",
  "differential": {
    "element": [
      {
        "id": "Task.code",
        "path": "Task.code",
        "min": 1,
        "patternCodeableConcept": {
          "coding": [
            {
              "system": "https://ignitehealth.com/fhir/CodeSystem/task-type",
              "code": "refill-review"
            }
          ]
        }
      },
      {
        "id": "Task.for",
        "path": "Task.for",
        "min": 1,
        "type": [
          {
            "code": "Reference",
            "targetProfile": ["http://hl7.org/fhir/StructureDefinition/Patient"]
          }
        ]
      },
      {
        "id": "Task.focus",
        "path": "Task.focus",
        "min": 1,
        "type": [
          {
            "code": "Reference",
            "targetProfile": ["http://hl7.org/fhir/StructureDefinition/MedicationRequest"]
          }
        ]
      },
      {
        "id": "Task.extension:pathwayType",
        "path": "Task.extension",
        "sliceName": "pathwayType",
        "min": 1,
        "max": "1",
        "type": [
          {
            "code": "Extension",
            "profile": ["https://ignitehealth.com/fhir/StructureDefinition/pathway-type"]
          }
        ]
      },
      {
        "id": "Task.extension:aiPrimaryDecision",
        "path": "Task.extension",
        "sliceName": "aiPrimaryDecision",
        "min": 0,
        "max": "1",
        "type": [
          {
            "code": "Extension",
            "profile": ["https://ignitehealth.com/fhir/StructureDefinition/ai-primary-decision"]
          }
        ]
      },
      {
        "id": "Task.extension:protocolChecks",
        "path": "Task.extension",
        "sliceName": "protocolChecks",
        "min": 0,
        "max": "1",
        "type": [
          {
            "code": "Extension",
            "profile": ["https://ignitehealth.com/fhir/StructureDefinition/protocol-checks"]
          }
        ]
      }
    ]
  }
}
```

---

## Part 6: Implementation Priorities

### Phase 1: Core Data Model (Week 1-2)

**Priority: P0 - Critical**

1. Create Code Systems:
   - fragility-tier
   - adherence-class
   - denominator-status
   - pathway-type
   - ai-decision

2. Create Patient Extensions:
   - fragility-tier
   - priority-score
   - denominator-status

3. Create PDC Observation Extensions:
   - pdc-status-quo
   - pdc-perfect
   - gap-days-used/allowed/remaining
   - is-salvageable

### Phase 2: Task & Workflow (Week 3-4)

**Priority: P0 - Critical**

1. Create Task Extensions:
   - pathway-type
   - ai-primary-decision
   - ai-qa-decision
   - ai-manager-decision
   - protocol-checks
   - worklist-tab

2. Create MedicationRequest Extensions:
   - adherence-class
   - refills-remaining
   - rx-expiration-date

3. Create MedicationDispense Extensions:
   - coverage-start-date
   - coverage-end-date
   - gap-days-before

### Phase 3: Protocol Checks (Week 5-6)

**Priority: P1 - High**

1. Implement Coverage resource for:
   - Insurance eligibility (I3)
   - Formulary status
   - Prior auth requirements (I4)

2. Add protocol check extensions for all 16 checks

### Phase 4: Outreach Automation (Week 7-8)

**Priority: P1 - High**

1. Implement CommunicationRequest for outreach triggers
2. Implement Communication for outreach outcomes
3. Create outreach-related extensions and code systems

### Phase 5: Exception Handling (Week 9-10)

**Priority: P2 - Medium**

1. Add exception-type extension
2. Add sla-deadline extension
3. Implement ServiceRequest for prior auth workflows

---

## Part 7: Zod Schemas Required

Create validation schemas for all new structures:

```typescript
// src/schemas/fhir-extensions.ts

import { z } from 'zod';

// Fragility Tier
export const FragilityTierSchema = z.enum(['COMP', 'F1', 'F2', 'F3', 'F4', 'F5', 'T5']);

// Urgency Index
export const UrgencyIndexSchema = z.enum(['extreme', 'high', 'moderate', 'low']);

// Denominator Status
export const DenominatorStatusSchema = z.enum(['D0', 'D1a', 'D1b', 'D2', 'DX']);

// Adherence Class
export const AdherenceClassSchema = z.enum(['MAC', 'MAD', 'MAH']);

// Pathway Type
export const PathwayTypeSchema = z.enum(['REFILL', 'RENEWAL', 'APPOINTMENT_NEEDED']);

// AI Decision
export const AIDecisionSchema = z.enum(['APPROVE', 'DENY', 'ROUTE', 'ESCALATE']);

// Protocol Check Result
export const ProtocolCheckResultSchema = z.enum(['pass', 'fail', 'warning', 'not-applicable']);

// AI Decision Extension
export const AIDecisionExtensionSchema = z.object({
  decision: AIDecisionSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  processingTimeMs: z.number().positive(),
  timestamp: z.string().datetime(),
});

// Protocol Checks
export const ProtocolChecksSchema = z.object({
  safety: z.object({
    S1_allergies: ProtocolCheckResultSchema,
    S2_drugInteractions: ProtocolCheckResultSchema,
    S3_contraindications: ProtocolCheckResultSchema,
    S4_duplicateTherapy: ProtocolCheckResultSchema,
  }),
  clinical: z.object({
    C1_lastVisit: ProtocolCheckResultSchema,
    C2_labValues: ProtocolCheckResultSchema,
    C3_diagnosisSupports: ProtocolCheckResultSchema,
    C4_dosageAppropriate: ProtocolCheckResultSchema,
  }),
  important: z.object({
    I1_refillsRemaining: ProtocolCheckResultSchema,
    I2_rxNotExpired: ProtocolCheckResultSchema,
    I3_insuranceActive: ProtocolCheckResultSchema,
    I4_noPriorAuth: ProtocolCheckResultSchema,
  }),
  admin: z.object({
    A1_pharmacyInNetwork: ProtocolCheckResultSchema,
    A2_quantityLimits: ProtocolCheckResultSchema,
    A3_fillFrequency: ProtocolCheckResultSchema,
    A4_memberEligible: ProtocolCheckResultSchema,
  }),
});

// PDC Observation
export const PDCObservationSchema = z.object({
  patientId: z.string(),
  measureType: AdherenceClassSchema,
  pdcValue: z.number().min(0).max(100),
  pdcStatusQuo: z.number().min(0).max(100),
  pdcPerfect: z.number().min(0).max(100),
  gapDaysUsed: z.number().min(0),
  gapDaysAllowed: z.number().min(0),
  gapDaysRemaining: z.number(),
  treatmentStartDate: z.string().date(),
  treatmentEndDate: z.string().date(),
  isSalvageable: z.boolean(),
  calculatedAt: z.string().datetime(),
});

// Refill Task
export const RefillTaskSchema = z.object({
  patientId: z.string(),
  medicationRequestId: z.string(),
  pathwayType: PathwayTypeSchema,
  fragilityTier: FragilityTierSchema,
  priorityScore: z.number().min(0).max(200),
  urgencyIndex: UrgencyIndexSchema,
  daysToRunout: z.number(),
  worklistTab: z.enum(['refills', 'pickup', 'exceptions', 'archive']),
  aiPrimaryDecision: AIDecisionExtensionSchema.optional(),
  aiQaDecision: AIDecisionExtensionSchema.optional(),
  aiManagerDecision: AIDecisionExtensionSchema.optional(),
  protocolChecks: ProtocolChecksSchema.optional(),
  exceptionType: z.enum(['clinical', 'pa', 'scheduling', 'other']).optional(),
  slaDeadline: z.string().datetime().optional(),
});
```

---

## Part 8: Database Considerations

### 8.1 Neo4j Graph Extensions

Add new node properties and relationships:

```cypher
// Patient Node Extensions
(:Patient {
  fragilityTier: 'F2',
  priorityScore: 95,
  urgencyIndex: 'high',
  macDenominatorStatus: 'D2',
  madDenominatorStatus: 'D1a',
  mahDenominatorStatus: 'D0',
  q4BonusApplied: true,
  lastOutreachDate: datetime()
})

// New Relationships
(p:Patient)-[:HAS_COVERAGE]->(c:Coverage)
(p:Patient)-[:HAS_OUTREACH]->(o:Outreach)
(t:Task)-[:HAS_AI_DECISION]->(d:AIDecision)
(t:Task)-[:HAS_PROTOCOL_CHECK]->(pc:ProtocolCheck)

// Outreach Node
(:Outreach {
  type: 'sms',
  day: 1,
  status: 'sent',
  outcome: 'delivered',
  timestamp: datetime()
})

// AI Decision Node
(:AIDecision {
  tier: 'primary',
  decision: 'APPROVE',
  confidence: 0.92,
  reasoning: '...',
  processingTimeMs: 1200
})
```

### 8.2 Medplum Subscriptions

Set up real-time subscriptions for:

```typescript
// Task status changes
'Task?status=completed';

// New MedicationDispense (fill detected)
'MedicationDispense?status=completed';

// Coverage changes
'Coverage?status=active';
```

---

## Part 9: Summary Checklist

### New Resources

- [ ] Coverage
- [ ] CommunicationRequest
- [ ] Communication
- [ ] Appointment
- [ ] ServiceRequest

### Code Systems (12 total)

- [ ] fragility-tier
- [ ] urgency-index
- [ ] denominator-status
- [ ] adherence-class
- [ ] pathway-type
- [ ] ai-decision
- [ ] protocol-check-result
- [ ] exception-type
- [ ] worklist-tab
- [ ] outreach-channel
- [ ] call-outcome
- [ ] denial-reason

### Extensions (25+ total)

- [ ] Patient extensions (7)
- [ ] Task extensions (11)
- [ ] MedicationRequest extensions (5)
- [ ] MedicationDispense extensions (5)
- [ ] Observation extensions (10)

### Profiles (8 total)

- [ ] IgnitePatient
- [ ] IgniteRefillTask
- [ ] IgnitePDCObservation
- [ ] IgniteMedicationRequest
- [ ] IgniteMedicationDispense
- [ ] IgniteOutreachRequest
- [ ] IgniteOutreachOutcome
- [ ] IgniteCoverage

### Zod Schemas

- [ ] FragilityTierSchema
- [ ] AIDecisionExtensionSchema
- [ ] ProtocolChecksSchema
- [ ] PDCObservationSchema
- [ ] RefillTaskSchema

---

## Appendix: Reference Documents

1. PRD_ALL_PATIENTS_REFILL_WORKLIST.docx
2. 3-Tier_AI_Decision_Logic.md
3. Medication_Adherence_Metrics_Reference_Guide.md
4. TECH_HANDOFF_MEDICATION_ADHERENCE.md
5. DATA_FLOW_DIAGRAM.md
6. FHIR R4 Specification: https://hl7.org/fhir/R4
7. US Core Implementation Guide: https://hl7.org/fhir/us/core

---

_Document Version: 1.0_
_Created: January 4, 2026_
_Next Review: After Phase 1 Implementation_
