# Implementation Order - FHIR Extension Plan

**Date:** January 4, 2026
**Version:** 1.0
**Status:** Ready for Engineering

---

## Executive Summary

This document defines the phased implementation order for the FHIR Extension Plan. The implementation is structured into 3 phases with clear dependencies, deliverables, and acceptance criteria.

### Phase Overview

| Phase       | Focus      | Key Deliverables                                                                |
| ----------- | ---------- | ------------------------------------------------------------------------------- |
| **Phase 1** | Foundation | Zod schemas, Code Systems, PDC Calculator Bot, Task Generator Bot               |
| **Phase 2** | Workflow   | Protocol Checker Bot, Coverage Checker Bot, AI Recommender Bot, Task Extensions |
| **Phase 3** | Outreach   | Communication resource, Outreach extensions, Fill Detector Bot                  |

---

## Phase 1: Foundation

### Objectives

1. Establish Zod schemas for all extensions
2. Create Code Systems in Medplum
3. Implement PDC Calculator Bot (deterministic calculations)
4. Implement Task Generator Bot (15-day look-ahead)

### Deliverables

#### 1.1 Zod Schemas

**File:** `src/schemas/fhir-extensions.ts`

| Schema                      | Purpose                     | Dependencies                                                     |
| --------------------------- | --------------------------- | ---------------------------------------------------------------- |
| `FragilityTierSchema`       | Validate tier codes         | None                                                             |
| `PathwayTypeSchema`         | Validate pathway types      | None                                                             |
| `AIDecisionCodeSchema`      | Validate AI decisions       | None                                                             |
| `ProtocolCheckResultSchema` | Validate check results      | None                                                             |
| `WorklistTabSchema`         | Validate worklist tabs      | None                                                             |
| `CallOutcomeSchema`         | Validate call outcomes      | None                                                             |
| `ClosureTypeSchema`         | Validate closure types      | None                                                             |
| `UrgencyIndexSchema`        | Validate urgency levels     | None                                                             |
| `DenominatorStatusSchema`   | Validate denominator status | None                                                             |
| `AdherenceSummarySchema`    | Validate PDC metrics        | FragilityTierSchema, UrgencyIndexSchema, DenominatorStatusSchema |

**Acceptance Criteria:**

- [ ] All schemas defined and exported
- [ ] Unit tests for each schema with valid/invalid inputs
- [ ] Schemas integrated with existing FHIR utilities

#### 1.2 Code Systems

**Deploy to Medplum:**

| Code System           | ID                      | Codes                                                  |
| --------------------- | ----------------------- | ------------------------------------------------------ |
| Fragility Tier        | `fragility-tier`        | COMP, F1, F2, F3, F4, F5, T5                           |
| Pathway Type          | `pathway-type`          | REFILL, RENEWAL, APPOINTMENT_NEEDED                    |
| AI Decision           | `ai-decision`           | APPROVE, DENY, ROUTE, ESCALATE                         |
| Protocol Check Result | `protocol-check-result` | pass, fail, warning, not-applicable                    |
| Worklist Tab          | `worklist-tab`          | refills, pickup, exceptions, archive                   |
| Call Outcome          | `call-outcome`          | answered, voicemail, no-answer, wrong-number, declined |

**Acceptance Criteria:**

- [ ] All 6 Code Systems created in Medplum
- [ ] Each code system has valid URL under `https://ignitehealth.com/fhir/CodeSystem/`
- [ ] Verified via Medplum API

#### 1.3 PDC Calculator Bot

**File:** `src/bots/pdc-calculator-bot.ts`

**Trigger:** MedicationDispense created/updated

**Input:**

- Patient reference
- All MedicationDispense records for patient

**Output:**

- Observation resource with `adherence-summary` extension containing:
  - fragility-tier
  - priority-score
  - urgency-index
  - days-to-runout
  - pdc-status-quo
  - pdc-perfect
  - gap-days-used
  - gap-days-remaining
  - delay-budget
  - is-salvageable
  - denominator-status
  - calculated-at

**Algorithm (from TECH_HANDOFF):**

```typescript
// PDC Calculation
PDC = Covered Days / Treatment Days × 100

// Gap Days
Gap Days Used = Treatment Days - Covered Days
Gap Days Allowed = Treatment Days × 20%
Gap Days Remaining = Gap Days Allowed - Gap Days Used

// Delay Budget
Delay Budget = Gap Days Remaining / Refills Needed

// Fragility Tier Assignment
if (PDC Status Quo >= 80%) tier = 'COMP'
else if (PDC Perfect < 80%) tier = 'T5'
else if (Delay Budget > 20) tier = 'F5'
else if (Delay Budget >= 11) tier = 'F4'
else if (Delay Budget >= 6) tier = 'F3'
else if (Delay Budget >= 3) tier = 'F2'
else tier = 'F1'
```

**Acceptance Criteria:**

- [ ] Bot deployed to Medplum
- [ ] Correctly calculates PDC per TECH_HANDOFF formulas
- [ ] Correctly assigns fragility tier
- [ ] Creates/updates Observation with adherence-summary extension
- [ ] Unit tests with edge cases (T5, F1, COMP scenarios)
- [ ] Integration test with sample patient data

#### 1.4 Task Generator Bot

**File:** `src/bots/task-generator-bot.ts`

**Trigger:** Scheduled (daily at 6 AM)

**Logic:**

1. Query all active patients with MedicationRequest
2. For each patient/medication:
   - Get latest MedicationDispense
   - Calculate days-to-runout
   - If days-to-runout <= 15 AND no active Task exists:
     - Create Task with pathway-type extension
     - Set worklist-tab to 'refills'

**Pathway Type Logic (from PRD FR-3.1):**

```typescript
function determinePathway(rx: MedicationRequest, lastVisit: Date): PathwayType {
  const hasRefillsRemaining = rx.dispenseRequest?.numberOfRepeatsAllowed > 0;
  const rxExpired = isExpired(rx.dispenseRequest?.validityPeriod);
  const recentVisit = daysSince(lastVisit) <= 90;

  if (hasRefillsRemaining && !rxExpired) return 'REFILL';
  if (hasRefillsRemaining && rxExpired) return 'RENEWAL';
  if (!hasRefillsRemaining && recentVisit) return 'RENEWAL';
  return 'APPOINTMENT_NEEDED';
}
```

**Acceptance Criteria:**

- [ ] Bot deployed to Medplum
- [ ] Correctly identifies patients within 15-day window
- [ ] Creates Task with correct pathway-type
- [ ] Prevents duplicate Tasks for same medication
- [ ] Sets initial worklist-tab to 'refills'
- [ ] Unit tests for all 4 pathway scenarios
- [ ] Integration test with scheduled trigger

### Phase 1 Dependencies

```
┌────────────────────────────────────────────────────────────────┐
│                     PHASE 1 DEPENDENCY GRAPH                   │
└────────────────────────────────────────────────────────────────┘

Code Systems ───────┐
                    │
Zod Schemas ────────┼───▶ PDC Calculator Bot ───▶ Task Generator Bot
                    │
MedicationDispense ─┘
```

---

## Phase 2: Workflow

### Objectives

1. Implement Protocol Checker Bot (16 checks)
2. Implement Coverage Checker Bot (insurance/formulary)
3. Implement AI Recommender Bot (3-tier decision)
4. Complete Task extensions

### Deliverables

#### 2.1 Protocol Checker Bot

**File:** `src/bots/protocol-checker-bot.ts`

**Trigger:** Task created (worklist-tab = 'refills')

**16 Protocol Checks:**

| Category      | Check                  | Logic                                                  |
| ------------- | ---------------------- | ------------------------------------------------------ |
| **Safety**    | S1-allergies           | Query AllergyIntolerance, match against drug class     |
| **Safety**    | S2-drug-interactions   | Query all active MedicationRequest, check interactions |
| **Safety**    | S3-contraindications   | Query Condition, match against drug contraindications  |
| **Safety**    | S4-duplicate-therapy   | Check for overlapping therapeutic classes              |
| **Clinical**  | C1-last-visit          | Query Encounter, check <= 365 days                     |
| **Clinical**  | C2-lab-values          | Query Observation, check relevant labs current         |
| **Clinical**  | C3-diagnosis-supports  | Query Condition, verify diagnosis supports medication  |
| **Clinical**  | C4-dosage-appropriate  | Verify dose within approved range                      |
| **Important** | I1-refills-remaining   | Check MedicationRequest.dispenseRequest                |
| **Important** | I2-rx-not-expired      | Check validityPeriod end date                          |
| **Important** | I3-insurance-active    | Query Coverage, check status = 'active'                |
| **Important** | I4-no-prior-auth       | Check if medication requires PA                        |
| **Admin**     | A1-pharmacy-in-network | Check pharmacy against network list                    |
| **Admin**     | A2-quantity-limits     | Check quantity against plan limits                     |
| **Admin**     | A3-fill-frequency      | Check days since last fill                             |
| **Admin**     | A4-member-eligible     | Check patient coverage enrollment                      |

**Output:**

- Update Task with `protocol-checks` extension

**Acceptance Criteria:**

- [ ] Bot deployed to Medplum
- [ ] All 16 checks implemented
- [ ] Each check returns: pass, fail, warning, or not-applicable
- [ ] Updates Task with protocol-checks extension
- [ ] Safety checks marked as FAIL block approval
- [ ] Unit tests for each check
- [ ] Integration test with full Task flow

#### 2.2 Coverage Checker Bot

**File:** `src/bots/coverage-checker-bot.ts`

**Trigger:** Task created (concurrent with Protocol Checker)

**Logic:**

1. Query patient's active Coverage resources
2. Lookup medication formulary status
3. Create/update Coverage with formulary-status extension

**Formulary Status Values:**

- `preferred` - Tier 1/2, no PA
- `non-preferred` - Tier 3+, higher copay
- `not-covered` - Not on formulary
- `prior-auth-required` - Requires PA

**Acceptance Criteria:**

- [ ] Bot deployed to Medplum
- [ ] Creates Coverage resource if not exists
- [ ] Updates formulary-status extension
- [ ] Handles multiple coverage scenarios (Medicare, commercial)
- [ ] Unit tests for each formulary status

#### 2.3 AI Recommender Bot

**File:** `src/bots/ai-recommender-bot.ts`

**Trigger:** Protocol checks AND coverage check complete

**Input:**

- Task with protocol-checks extension
- Patient adherence-summary (from Observation)
- Coverage with formulary-status

**3-Tier AI Logic:**

```typescript
async function makeDecision(context: DecisionContext): Promise<AIDecision> {
  // Tier 1: Primary AI Decision
  const primary = await callPrimaryAI(context);

  // Tier 2: QA AI Validation
  const qa = await callQAAI(context, primary);

  // Check agreement
  if (primary.decision === qa.decision && qa.confidence >= 0.85) {
    return primary;
  }

  // Tier 3: Manager AI Arbitration
  const manager = await callManagerAI(context, primary, qa);
  return manager;
}
```

**Decision Matrix:**

| All Safety Pass | All Important Pass | Confidence >= 0.90 | Decision             |
| --------------- | ------------------ | ------------------ | -------------------- |
| Yes             | Yes                | Yes                | APPROVE              |
| Yes             | Yes                | No                 | ROUTE (human review) |
| Yes             | No                 | -                  | ROUTE (human review) |
| No              | -                  | -                  | DENY or ESCALATE     |

**Output:**

- Update Task with `ai-decision` extension

**Acceptance Criteria:**

- [ ] Bot deployed to Medplum
- [ ] Implements 3-tier decision logic
- [ ] Confidence scoring implemented
- [ ] Updates Task with ai-decision extension
- [ ] Safety failures always block approval
- [ ] Low confidence routes to human
- [ ] Audit trail preserved
- [ ] Unit tests for decision matrix
- [ ] Integration test with full workflow

#### 2.4 Task Extensions Complete

**Verify all Task extensions functional:**

| Extension       | Bot That Sets It                               |
| --------------- | ---------------------------------------------- |
| pathway-type    | Task Generator Bot                             |
| worklist-tab    | Task Generator Bot (initial), UI (transitions) |
| ai-decision     | AI Recommender Bot                             |
| protocol-checks | Protocol Checker Bot                           |
| human-override  | UI (when human overrides)                      |
| closure-type    | UI (when task closed)                          |

**Acceptance Criteria:**

- [ ] All 6 Task extensions can be read/written
- [ ] Zod validation on all extension data
- [ ] UI can display all extension data
- [ ] State transitions logged

### Phase 2 Dependencies

```
┌────────────────────────────────────────────────────────────────┐
│                     PHASE 2 DEPENDENCY GRAPH                   │
└────────────────────────────────────────────────────────────────┘

Phase 1 Complete
        │
        ▼
Task Created ─────────┬─────────────────────────────┐
                      │                             │
                      ▼                             ▼
            Protocol Checker Bot         Coverage Checker Bot
                      │                             │
                      └─────────────┬───────────────┘
                                    │
                                    ▼
                          AI Recommender Bot
                                    │
                                    ▼
                          Task Ready for Review
```

---

## Phase 3: Outreach

### Objectives

1. Implement Communication resource handling
2. Add call-outcome and call-duration extensions
3. Implement Fill Detector Bot (close the loop)
4. Complete end-to-end workflow

### Deliverables

#### 3.1 Communication Resource

**Use Cases:**

- Log outreach calls (FR-027, FR-028)
- Record SMS/email interactions
- Track patient responses

**Resource Structure:**

```json
{
  "resourceType": "Communication",
  "status": "completed",
  "category": [{ "coding": [{ "code": "adherence-outreach" }] }],
  "medium": [{ "coding": [{ "code": "phone-call" }] }],
  "subject": { "reference": "Patient/xxx" },
  "about": [{ "reference": "Task/refill-task-xxx" }],
  "sent": "2026-01-04T14:30:00Z",
  "sender": { "reference": "Practitioner/coordinator-1" },
  "payload": [{ "contentString": "Call notes here..." }],
  "extension": [
    { "url": ".../call-outcome", "valueCode": "answered" },
    { "url": ".../call-duration", "valueQuantity": { "value": 180, "unit": "seconds" } }
  ]
}
```

**Acceptance Criteria:**

- [ ] Communication resources can be created via UI
- [ ] call-outcome and call-duration extensions functional
- [ ] Communications linked to Task via `about`
- [ ] Timeline view shows outreach history

#### 3.2 Fill Detector Bot

**File:** `src/bots/fill-detector-bot.ts`

**Trigger:** MedicationDispense created

**Logic:**

1. On new fill, find related Task (same patient/medication)
2. If Task exists in 'pickup' tab:
   - Update Task worklist-tab to 'archive'
   - Set closure-type to 'CLOSED_FILLED'
3. Trigger PDC Calculator Bot for recalculation

**Acceptance Criteria:**

- [ ] Bot deployed to Medplum
- [ ] Detects new fills
- [ ] Closes related Tasks
- [ ] Triggers PDC recalculation
- [ ] Integration test with end-to-end flow

#### 3.3 End-to-End Workflow Test

**Scenario:** Complete refill workflow

1. Patient has MedicationDispense with 5 days supply remaining
2. Task Generator Bot creates Task (worklist-tab: 'refills')
3. Protocol Checker Bot runs 16 checks
4. Coverage Checker Bot verifies formulary
5. AI Recommender Bot recommends APPROVE
6. Human approves refill
7. Task moves to 'pickup' tab
8. New MedicationDispense created (fill picked up)
9. Fill Detector Bot closes Task (CLOSED_FILLED)
10. PDC Calculator Bot recalculates adherence

**Acceptance Criteria:**

- [ ] Full workflow completes without manual intervention
- [ ] All extensions populated correctly at each step
- [ ] Audit trail complete
- [ ] PDC updated after fill

### Phase 3 Dependencies

```
┌────────────────────────────────────────────────────────────────┐
│                     PHASE 3 DEPENDENCY GRAPH                   │
└────────────────────────────────────────────────────────────────┘

Phase 2 Complete
        │
        ▼
┌───────────────────┐      ┌───────────────────┐
│ Communication UI  │      │ Fill Detector Bot │
│ (call logging)    │      │ (closes Tasks)    │
└───────────────────┘      └───────────────────┘
        │                           │
        └───────────┬───────────────┘
                    │
                    ▼
          End-to-End Workflow
             Complete
```

---

## Testing Strategy

### Unit Tests

| Component        | Test File                                         | Coverage |
| ---------------- | ------------------------------------------------- | -------- |
| Zod Schemas      | `src/schemas/__tests__/fhir-extensions.test.ts`   | 100%     |
| PDC Calculator   | `src/bots/__tests__/pdc-calculator-bot.test.ts`   | 95%      |
| Task Generator   | `src/bots/__tests__/task-generator-bot.test.ts`   | 95%      |
| Protocol Checker | `src/bots/__tests__/protocol-checker-bot.test.ts` | 100%     |
| Coverage Checker | `src/bots/__tests__/coverage-checker-bot.test.ts` | 95%      |
| AI Recommender   | `src/bots/__tests__/ai-recommender-bot.test.ts`   | 90%      |
| Fill Detector    | `src/bots/__tests__/fill-detector-bot.test.ts`    | 95%      |

### Integration Tests

| Test                  | Description                         | Phase |
| --------------------- | ----------------------------------- | ----- |
| `pdc-calculation-e2e` | PDC calculation with sample fills   | 1     |
| `task-generation-e2e` | Task creation 15 days before runout | 1     |
| `protocol-check-e2e`  | All 16 checks with various inputs   | 2     |
| `ai-decision-e2e`     | 3-tier decision with edge cases     | 2     |
| `full-workflow-e2e`   | Complete refill → fill → close      | 3     |

### Test Data

Use Synthea-generated patient data with:

- Various PDC levels (compliant, at-risk, failing)
- Different fragility tiers (F1-F5, T5, COMP)
- Multiple adherence measures (MAC, MAD, MAH)
- Edge cases (new patients, plan transitions, T5 detection)

---

## Rollout Plan

### Phase 1 Rollout

1. Deploy Code Systems to Medplum staging
2. Deploy Zod schemas to application
3. Deploy PDC Calculator Bot (shadow mode - logs only)
4. Verify calculations against known test cases
5. Enable PDC Calculator Bot (production)
6. Deploy Task Generator Bot (shadow mode)
7. Verify task creation logic
8. Enable Task Generator Bot (production)

### Phase 2 Rollout

1. Deploy Protocol Checker Bot (shadow mode)
2. Deploy Coverage Checker Bot (shadow mode)
3. Verify checks against clinical team review
4. Deploy AI Recommender Bot (shadow mode)
5. Clinical team reviews AI decisions for 1 week
6. Enable all Phase 2 bots (production)
7. Monitor for 2 weeks before Phase 3

### Phase 3 Rollout

1. Deploy Communication UI
2. Train staff on call logging
3. Deploy Fill Detector Bot (shadow mode)
4. Verify task closure logic
5. Enable Fill Detector Bot (production)
6. End-to-end testing with pilot patients
7. Full rollout

---

## Success Metrics

| Metric                   | Target | Measurement                                |
| ------------------------ | ------ | ------------------------------------------ |
| PDC Calculation Accuracy | 100%   | Compare to manual calculation              |
| Task Generation Accuracy | 100%   | All patients within 15-day window get Task |
| Protocol Check Coverage  | 100%   | All 16 checks execute                      |
| AI Decision Accuracy     | > 95%  | Human agreement with AI recommendations    |
| Workflow Completion Rate | > 90%  | Tasks that complete refill → fill          |
| HIPAA Compliance         | 100%   | No PHI in logs, full audit trail           |

---

## Reference Documents

1. [FHIR_RESOURCE_EXTENSION_PLAN.md](./FHIR_RESOURCE_EXTENSION_PLAN.md) - Extension specifications
2. [GAP_ANALYSIS.md](./GAP_ANALYSIS.md) - PRD coverage verification
3. [TECH_HANDOFF_MEDICATION_ADHERENCE.md](../Product%20Requirement%20Doc/TECH_HANDOFF_MEDICATION_ADHERENCE.md) - Calculation formulas
4. [3-Tier_AI_Decision_Logic.md](../Product%20Requirement%20Doc/3-Tier_AI_Decision_Logic.md) - AI decision workflow

---

_Document Version: 1.0_
_Created: January 4, 2026_
_Status: Ready for Engineering_
