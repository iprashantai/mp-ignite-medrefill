# Ignite Health MedRefills - Production Implementation Plan

## Executive Summary

A comprehensive **8+ week** implementation plan for building a production-grade medication adherence management platform. The system uses Medplum FHIR as the sole data source and AWS Bedrock (Claude) for AI-powered recommendations with a 3-tier verification pipeline.

**Goals:** Improve HEDIS Star Ratings (MAD, MAC, MAH) through proactive medication refill management, targeting 80%+ PDC rates and 70% AI automation.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MEDPLUM FHIR SERVER                               │
│                        (Single Source of Truth)                             │
│  ┌─────────┐  ┌──────────────────┐  ┌──────────┐  ┌─────────────┐          │
│  │ Patient │  │MedicationDispense│  │   Task   │  │ Observation │          │
│  └────┬────┘  └────────┬─────────┘  └────┬─────┘  └──────┬──────┘          │
└───────┼────────────────┼─────────────────┼───────────────┼──────────────────┘
        │                │                 │               │
        └────────────────┼─────────────────┼───────────────┘
                         │                 │
                         ▼                 ▼
        ┌────────────────────────────────────────────────────┐
        │            PDC CALCULATION ENGINE                  │
        │              (DETERMINISTIC)                       │
        │  • Covered Days / Treatment Days × 100             │
        │  • Gap Days: Allowed - Used                        │
        │  • Fragility Tier: F1-F5, T5                       │
        │  • Priority Score: Base + Bonuses                  │
        └───────────────────────┬────────────────────────────┘
                                │
                                ▼
        ┌────────────────────────────────────────────────────┐
        │            AI RECOMMENDATION PIPELINE              │
        │              (AWS Bedrock Claude)                  │
        │                                                    │
        │  Primary AI → QA AI → [Manager AI if needed]       │
        │       ↓          ↓            ↓                    │
        │   APPROVE    AGREE/      FINAL DECISION            │
        │    DENY     DISAGREE                               │
        └───────────────────────┬────────────────────────────┘
                                │
                                ▼
        ┌────────────────────────────────────────────────────┐
        │              NEXT.JS FRONTEND                      │
        │                                                    │
        │  /patients → /queue → Review Drawer → Actions      │
        │      ↓          ↓           ↓            ↓         │
        │   List      4-Tabs    AI Decision   Approve/Deny   │
        └────────────────────────────────────────────────────┘
```

---

## Phase 1: Core Data Layer & PDC Engine (Weeks 1-2)

### Objective

Build the deterministic PDC calculation engine and Zod schemas that form the foundation for all clinical logic.

### Files to Create

#### 1.1 Zod Schemas (`/src/schemas/`)

**`/src/schemas/medication.ts`**

```typescript
// MedicationDispenseSchema - validate FHIR dispense records
// MedicationRequestSchema - validate prescription data
// DrugClassificationSchema - MAC/MAD/MAH mapping
```

**`/src/schemas/pdc.ts`**

```typescript
// PDCCalculationInputSchema - patient ID, date range, measure type
// PDCCalculationOutputSchema - PDC %, covered days, gap days, projections
// FragilityTierSchema - F1-F5, T5, COMPLIANT
// PriorityScoreSchema - base score + bonus breakdown
// DenominatorStatusSchema - D0, D1a, D1b, D2, DX
```

**`/src/schemas/task.ts`**

```typescript
// RefillTaskSchema - task creation/update validation
// AIRecommendationSchema - decision, confidence, rationale
// ProtocolCheckResultSchema - 16 protocol checks (S1-4, C1-4, I1-4, A1-4)
// AuditEntrySchema - PHI-safe audit logging
```

#### 1.2 PDC Calculation Engine (`/src/lib/pdc/`)

**`/src/lib/pdc/calculator.ts`** ⭐ CRITICAL

```typescript
// Core PDC calculation - MUST be 100% deterministic (no AI)
//
// calculatePDC(dispenses, startDate, endDate) → PDCResult
//   - Handle overlapping fills (merge coverage periods)
//   - Handle gaps between dispenses
//   - Cap at December 31 (year-end rule)
//   - Exclude hospitalization/excluded periods
//
// Formulas (from TECH_HANDOFF_MEDICATION_ADHERENCE.md):
//   PDC = (coveredDays / treatmentDays) × 100
//   gapDaysUsed = treatmentDays - coveredDays
//   gapDaysAllowed = treatmentDays × 0.20
//   gapDaysRemaining = gapDaysAllowed - gapDaysUsed
//   pdcStatusQuo = (covered + min(supply, daysLeft)) / treatmentDays
//   pdcPerfect = (covered + daysToYearEnd) / treatmentDays
```

**`/src/lib/pdc/fragility.ts`**

```typescript
// Fragility tier assignment based on delay budget
//
// calculateFragilityTier(gapDaysRemaining, refillsNeeded) → FragilityTier
//   delayBudget = gapDaysRemaining / refillsNeeded
//
// Thresholds:
//   COMPLIANT: pdcStatusQuo >= 80%
//   F1_IMMINENT: delayBudget <= 2 days (100 pts base)
//   F2_FRAGILE: 3-5 days (80 pts)
//   F3_MODERATE: 6-10 days (60 pts)
//   F4_COMFORTABLE: 11-20 days (40 pts)
//   F5_SAFE: > 20 days (20 pts)
//   T5_UNSALVAGEABLE: pdcPerfect < 80%
```

**`/src/lib/pdc/priority.ts`**

```typescript
// Priority score calculation
//
// calculatePriorityScore(tier, context) → PriorityScore
//   score = baseScore[tier] + bonuses
//
// Bonuses:
//   +30: Out of medication (daysToRunout <= 0)
//   +25: Q4 period (Oct-Dec)
//   +15: Multiple MA measures
//   +10: New patient (< 90 days)
//
// Urgency Index:
//   EXTREME: 150+ pts
//   HIGH: 100-149 pts
//   MODERATE: 50-99 pts
//   LOW: < 50 pts
```

**`/src/lib/pdc/runout.ts`**

```typescript
// Days to runout calculation
//
// calculateDaysToRunout(lastFillDate, daysSupply, today) → number
//   runoutDate = lastFillDate + daysSupply
//   daysToRunout = runoutDate - today
```

**`/src/lib/pdc/measures.ts`**

```typescript
// HEDIS measure classification
//
// classifyMedication(drugName, ndc) → MedicationClass | null
//   MAC: Statins (atorvastatin, rosuvastatin, simvastatin, etc.)
//   MAD: Diabetes oral (metformin, glipizide, sitagliptin, etc.) - NOT insulin
//   MAH: ACE/ARBs (lisinopril, losartan, valsartan, etc.) - NOT CCBs
```

**`/src/lib/pdc/denominator.ts`**

```typescript
// HEDIS denominator status
//
// getDenominatorStatus(fillCount, isExcluded) → DenominatorStatus
//   D0: No fills (not in denominator)
//   D1a: 1 fill, running low (urgent 2nd fill needed)
//   D1b: 1 fill, adequate supply (monitor)
//   D2: 2+ fills (full PDC tracking)
//   DX: Excluded (hospice, ESRD, etc.)
```

#### 1.3 Tests (`/src/lib/pdc/*.test.ts`)

**`/src/lib/pdc/calculator.test.ts`**

- Test all 10 scenarios from `TEST_SCENARIOS_FRAGILITY_TIERS.md`
- Test overlapping fills edge case
- Test year-end cap edge case
- Test leap year handling
- Target: 100% coverage

### Deliverables

- [ ] All Zod schemas with full type coverage
- [ ] PDC calculator with 100% test coverage
- [ ] Fragility tier engine with threshold validation
- [ ] Priority scoring with bonus calculations
- [ ] Unit tests for all 10 clinical scenarios

---

## Phase 2: Patient List & FHIR Integration (Weeks 2-3)

### Objective

Build the patient list page with real Medplum FHIR data, PDC badges, and search/filter capabilities.

### Files to Create/Modify

#### 2.1 FHIR Data Services (`/src/lib/fhir/`)

**`/src/lib/fhir/patient-service.ts`**

```typescript
// Patient data fetching from Medplum
//
// searchPatients(query, filters, pagination) → Patient[]
// getPatientById(id) → Patient
// getPatientWithMedications(id) → PatientWithMedications
```

**`/src/lib/fhir/dispense-service.ts`**

```typescript
// MedicationDispense operations
//
// getDispensesForPatient(patientId, dateRange) → MedicationDispense[]
// getDispensesByMeasure(patientId, measure) → MedicationDispense[]
```

**`/src/lib/fhir/task-service.ts`**

```typescript
// Task (refill workflow) operations
//
// createRefillTask(patientId, medicationId, aiRecommendation) → Task
// updateTaskStatus(taskId, status, reason?) → Task
// getTasksByStatus(status) → Task[]
// getTasksForQueue(tab) → Task[] // Refills, Pick-up, Exceptions, Archive
```

#### 2.2 Patient List Page

**`/src/app/(dashboard)/patients/page.tsx`** ⭐ CRITICAL

```typescript
// Patient list with PDC badges and fragility tiers
//
// Features:
//   - Fetch patients from Medplum using useSearchResources
//   - Calculate PDC for each patient (batch or on-demand)
//   - Display using healthcare Table components
//   - Filters: Tier (F1-F5, T5), Measure (MAC/MAD/MAH), Status (Pass/At-Risk/Fail)
//   - Search: Fuzzy name search, MRN lookup
//   - Pagination: 25/50/100 per page
//   - Sort: Priority score (default), Name, PDC, Days to Runout
```

**`/src/app/(dashboard)/patients/loading.tsx`**

- Skeleton loading state for patient list

**`/src/app/(dashboard)/patients/error.tsx`**

- Error boundary with retry button

#### 2.3 Patient Components (`/src/components/patients/`)

**`/src/components/patients/patient-table.tsx`**

```typescript
// Patient table using healthcare Table components
//
// Columns:
//   - Name (Last, First)
//   - MRN / Member ID
//   - PDC (with PDCBadge)
//   - Fragility Tier (with FragilityBadge)
//   - Days to Runout (with RunoutBadge)
//   - Measures (MAC/MAD/MAH badges)
//   - Priority Score
//   - Actions (View, Create Task)
```

**`/src/components/patients/patient-filters.tsx`**

```typescript
// Filter sidebar/header
//
// Filters:
//   - Text search (debounced, 300ms)
//   - Tier multi-select with counts
//   - Measure checkboxes
//   - Status radio buttons
//   - Quick filters (Urgent, Overdue, Candidates)
//   - Clear all button
```

**`/src/components/patients/patient-row.tsx`**

```typescript
// Individual patient row with badges
// Uses: PDCBadge, FragilityBadge, MeasureBadge, RunoutBadge
```

### Deliverables

- [ ] Patient list page with real FHIR data
- [ ] PDC calculation per patient (cached)
- [ ] Search by name and MRN
- [ ] Filter by tier, measure, status
- [ ] Responsive table with density toggle
- [ ] Performance: < 2s load for 500 patients

---

## Phase 3: Refill Queue & 4-Tab Workflow (Weeks 3-5)

### Objective

Build the core refill queue with 4-tab navigation (Refills, Pick-up, Exceptions, Archive) and the review drawer.

### Files to Create

#### 3.1 Queue Page

**`/src/app/(dashboard)/queue/page.tsx`** ⭐ CRITICAL

```typescript
// Main queue page with 4 tabs
//
// Tab 1: Refills (Active)
//   - Tasks with status: requested, in-progress
//   - Sorted by priority score (descending)
//   - Show: Patient, Medication, PDC, Tier, Runout, AI Decision
//
// Tab 2: Pick-up Tracking
//   - Tasks with status: ready (approved, awaiting pickup)
//   - Sub-statuses: Rx Sent, Filled Confirmed, Rx Sent Not Filled
//
// Tab 3: Exceptions
//   - Tasks routed for special handling
//   - Types: Clinical Review, Prior Auth, Appointment Needed, Patient Declined
//   - SLA timers: Clinical 4h, PA 24h
//
// Tab 4: Archive
//   - Completed tasks (last 30 days)
//   - Statuses: CLOSED_APPROVED, CLOSED_DENIED, CLOSED_EXCEPTION
//   - Searchable by patient, date, outcome
```

**`/src/app/(dashboard)/queue/layout.tsx`**

- Queue-specific layout with tab navigation

#### 3.2 Queue Components (`/src/components/queue/`)

**`/src/components/queue/queue-tabs.tsx`**

```typescript
// Tab navigation with counts
// Uses shadcn/ui Tabs component
```

**`/src/components/queue/queue-table.tsx`**

```typescript
// Queue table (extends healthcare Table)
//
// Columns:
//   - Patient Name
//   - Medication
//   - PDC Score (PDCBadge)
//   - Fragility (FragilityBadge)
//   - Days to Runout (RunoutBadge)
//   - AI Decision (DecisionBadge + confidence %)
//   - Time in Queue
//   - Quick Actions
```

**`/src/components/queue/queue-row.tsx`**

- Individual queue row with click to open review drawer

**`/src/components/queue/queue-filters.tsx`**

- Queue-specific filters (urgency, AI decision, assignee)

#### 3.3 Review Drawer

**`/src/components/queue/review-drawer.tsx`** ⭐ CRITICAL

```typescript
// Slide-out review panel
//
// Sections:
//   1. Patient Header (name, DOB, MRN, contact)
//   2. Medication Info (drug, dose, supply, refills remaining)
//   3. PDC Summary (current, status quo, perfect projections)
//   4. AI Recommendation Card
//      - Decision badge (Approve/Deny/Route)
//      - Confidence score (%)
//      - Rationale text
//      - 3-tier breakdown (Primary/QA/Manager)
//   5. Protocol Checks (16 checks with pass/fail indicators)
//   6. Safety Alerts (interactions, allergies, contraindications)
//   7. Clinical Memory (timeline of past decisions)
//   8. Action Buttons
//      - Approve (with confirmation)
//      - Deny (requires reason)
//      - Route to Exception (with type selection)
//      - Override AI (requires justification)
```

**`/src/components/queue/ai-recommendation-card.tsx`**

```typescript
// AI decision display
//
// Shows:
//   - Primary AI: Decision + Confidence + Rationale
//   - QA AI: Agree/Disagree + Notes
//   - Manager AI (if triggered): Final decision + Reasoning
//   - Overall confidence score with color indicator
```

**`/src/components/queue/protocol-checks-grid.tsx`**

```typescript
// 16 protocol checks in 4x4 grid
//
// Categories:
//   S1-S4: Safety (allergies, interactions, contraindications, duplicates)
//   C1-C4: Clinical (visit recency, labs, diagnosis, dosage)
//   I1-I4: Insurance (formulary, PA, coverage, quantity limits)
//   A1-A4: Admin (Rx validity, refills, days supply, prescriber auth)
```

**`/src/components/queue/action-buttons.tsx`**

```typescript
// Approve/Deny/Route action buttons
//
// Approve: Confirmation modal, sends to pharmacy
// Deny: Reason required, denial reasons dropdown
// Route: Exception type selection modal
// Override: Justification required, logged to audit
```

### Deliverables

- [ ] 4-tab queue navigation with URL sync
- [ ] Queue table with all columns and badges
- [ ] Review drawer with full patient context
- [ ] AI recommendation display (card format)
- [ ] Protocol checks grid (4x4)
- [ ] Action buttons with confirmation modals
- [ ] Keyboard shortcuts (A/D/R/Esc)

---

## Phase 4: AI Recommendation Pipeline (Weeks 5-7)

### Objective

Implement the 3-tier AI decision system using AWS Bedrock Claude, with confidence scoring and human oversight routing.

### Files to Create

#### 4.1 AWS Bedrock Integration (`/src/lib/ai/`)

**`/src/lib/ai/bedrock-client.ts`**

```typescript
// AWS Bedrock client setup
//
// initBedrock() → BedrockRuntimeClient
// invokeModel(prompt, schema) → AIResponse
// - Retry logic: 3 attempts, exponential backoff (1s, 2s, 4s)
// - Rate limiting: 10 req/s
// - Timeout: 30s per request
```

**`/src/lib/ai/pipeline.ts`** ⭐ CRITICAL

```typescript
// 3-Tier AI Decision Pipeline
//
// runAIPipeline(patientContext, protocolChecks) → AIRecommendation
//
// Flow:
//   1. Primary AI (Claude) - ~1.2s
//      - Input: patient data, medications, labs, protocol requirements
//      - Output: APPROVE/DENY + confidence + rationale + next steps
//
//   2. QA AI (Claude) - ~0.8s
//      - Input: patient data + Primary decision
//      - Output: AGREE/DISAGREE + validation notes
//      - Key: Validates date calculations (known Primary AI weakness)
//
//   3. Manager AI (Claude) - ~1.0s (only if QA disagrees)
//      - Input: Primary + QA decisions + disagreement details
//      - Output: Final recommendation + arbitration reasoning
//
// Confidence Scoring:
//   95%: Primary + QA agree
//   90%: Clear protocol violation, both agree on denial
//   85%: Manager resolved disagreement
//   75%: Disagreement exists, no Manager consensus
//   70%: Error cases or unusual scenarios
```

#### 4.2 AI Prompts (`/src/lib/ai/prompts/`)

**`/src/lib/ai/prompts/primary-agent.ts`**

```typescript
// Primary AI prompt template
//
// System prompt:
//   - Role: Clinical decision support for medication refills
//   - Constraints: Safety-first, cite specific data, express uncertainty
//   - Output schema: JSON with decision, confidence, rationale, nextSteps
//
// User prompt template:
//   - Patient demographics (age, conditions)
//   - Current medication details
//   - Fill history (last 12 months)
//   - Lab values (if relevant)
//   - Protocol requirements for this drug class
```

**`/src/lib/ai/prompts/qa-agent.ts`**

```typescript
// QA AI prompt template
//
// System prompt:
//   - Role: Quality checker for Primary AI decisions
//   - Focus: Date calculation accuracy, logic consistency
//   - Output: AGREE/DISAGREE with specific validation notes
```

**`/src/lib/ai/prompts/manager-agent.ts`**

```typescript
// Manager AI prompt template
//
// System prompt:
//   - Role: Arbitrator when Primary and QA disagree
//   - Focus: Clinical accuracy, patient safety
//   - Output: Final decision with reasoning for choosing one side
```

#### 4.3 Output Validation (`/src/lib/ai/validators/`)

**`/src/lib/ai/validators/output-validator.ts`**

```typescript
// Validate AI outputs against Zod schemas
//
// validatePrimaryOutput(output) → Result<PrimaryAIDecision>
// validateQAOutput(output) → Result<QAAIDecision>
// validateManagerOutput(output) → Result<ManagerAIDecision>
```

#### 4.4 Confidence Router

**`/src/lib/ai/confidence-router.ts`**

```typescript
// Route tasks based on AI confidence
//
// routeByConfidence(confidence) → QueueAssignment
//   >= 95%: AUTO_APPROVE queue (minimal human review)
//   85-94%: STANDARD_REVIEW queue (staff review)
//   70-84%: ENHANCED_REVIEW queue (pharmacist review)
//   < 70%: PHARMACIST_ESCALATION queue (manual review required)
```

### Deliverables

- [ ] AWS Bedrock client with retry logic
- [ ] 3-tier AI pipeline (Primary → QA → Manager)
- [ ] Prompt templates for all 3 agents
- [ ] Output validation with Zod schemas
- [ ] Confidence scoring (0-100%)
- [ ] Confidence-based routing
- [ ] < 3s total AI processing time

---

## Phase 5: Safety & Protocol Checks (Weeks 6-7)

### Objective

Implement the 16 deterministic protocol checks and safety verification system.

### Files to Create

#### 5.1 Protocol Check Engine (`/src/lib/safety/`)

**`/src/lib/safety/protocol-checks.ts`** ⭐ CRITICAL

```typescript
// 16 Protocol Checks (ALL DETERMINISTIC - NO AI)
//
// runAllProtocolChecks(patient, medication, context) → ProtocolCheckResults
//
// SAFETY CHECKS (S1-S4):
//   S1: Allergy check - query AllergyIntolerance resources
//   S2: Drug interaction - check against known interactions list
//   S3: Contraindication - check Condition resources for contraindications
//   S4: Therapeutic duplication - check for duplicate drug classes
//
// CLINICAL CHECKS (C1-C4):
//   C1: Visit recency - Encounter within 90 days
//   C2: Lab currency - relevant labs within 12 months
//   C3: Diagnosis validation - Condition supports medication
//   C4: Dosage appropriateness - within therapeutic range
//
// INSURANCE CHECKS (I1-I4):
//   I1: Formulary eligibility - drug on plan formulary
//   I2: Prior auth status - check PA requirements
//   I3: Coverage verification - active coverage
//   I4: Quantity limits - within plan limits
//
// ADMIN CHECKS (A1-A4):
//   A1: Rx validity - prescription not expired
//   A2: Refills remaining - refills > 0
//   A3: Days supply - appropriate supply duration
//   A4: Prescriber authorization - valid prescriber
//
// Each check returns: { check: string, status: 'PASS'|'FAIL'|'WARN', details: string }
```

**`/src/lib/safety/drug-interactions.ts`**

```typescript
// Drug-drug interaction checking (DETERMINISTIC)
//
// checkInteractions(medications) → Interaction[]
//   - Query from interaction database (not AI)
//   - Return: drug pairs, severity (major/moderate/minor), clinical significance
```

**`/src/lib/safety/allergy-checker.ts`**

```typescript
// Allergy verification
//
// checkAllergies(patientId, medication) → AllergyAlert[]
//   - Query FHIR AllergyIntolerance resources
//   - Cross-reference with medication ingredients
```

**`/src/lib/safety/lab-validator.ts`**

```typescript
// Lab value validation
//
// validateLabValues(patientId, medication) → LabValidationResult
//   - A1C for diabetes meds (MAD)
//   - Lipid panel for statins (MAC)
//   - Renal function for ACE/ARBs (MAH)
//   - Return currency and threshold status
```

#### 5.2 Audit Logging (`/src/lib/audit/`)

**`/src/lib/audit/logger.ts`**

```typescript
// HIPAA-compliant audit logging
//
// logAuditEvent(event) → AuditEvent (FHIR resource)
//   - NEVER log PHI (names, DOBs) in plain text
//   - USE patient IDs only
//   - Log: action, user, timestamp, outcome, resource references
//
// Event types:
//   - PHI_ACCESS: Patient record viewed
//   - DECISION_MADE: Approve/Deny/Route action
//   - AI_RECOMMENDATION: AI decision logged
//   - OVERRIDE: Human override of AI
```

**`/src/lib/audit/clinical-memory.ts`**

```typescript
// Clinical memory for decision history
//
// getPatientHistory(patientId) → ClinicalMemoryEntry[]
// addToHistory(patientId, entry) → void
//
// Entries include:
//   - Previous AI decisions
//   - Human decisions and reasons
//   - Outcomes (filled, not filled, etc.)
```

### Deliverables

- [ ] All 16 protocol checks implemented
- [ ] Drug-drug interaction database lookup
- [ ] Allergy cross-reference checking
- [ ] Lab value validation (A1C, lipids, renal)
- [ ] HIPAA-compliant audit logging
- [ ] Clinical memory timeline

---

## Phase 6: Actions & Task Management (Weeks 7-8)

### Objective

Implement approve/deny/route actions with proper FHIR Task status transitions and audit trails.

### Files to Create

#### 6.1 Task Actions (`/src/lib/fhir/`)

**`/src/lib/fhir/task-actions.ts`**

```typescript
// Task action handlers
//
// approveTask(taskId, userId) → Task
//   - Update Task.status = 'completed'
//   - Set Task.businessStatus = 'approved'
//   - Create AuditEvent
//   - Trigger pharmacy notification (future)
//
// denyTask(taskId, userId, reason) → Task
//   - Update Task.status = 'completed'
//   - Set Task.businessStatus = 'denied'
//   - Set Task.statusReason = reason
//   - Create AuditEvent
//
// routeTask(taskId, exceptionType, userId) → Task
//   - Update Task.status = 'on-hold'
//   - Set Task.businessStatus = exceptionType
//   - Create exception tracking record
//   - Start SLA timer
//
// overrideAI(taskId, userId, justification) → Task
//   - Record AI decision was overridden
//   - Require justification text
//   - Create AuditEvent with override flag
```

#### 6.2 API Routes (`/src/app/api/`)

**`/src/app/api/tasks/[id]/approve/route.ts`**

```typescript
// POST /api/tasks/:id/approve
// - Validate user permissions
// - Run final safety check
// - Execute approval
// - Return updated task
```

**`/src/app/api/tasks/[id]/deny/route.ts`**

```typescript
// POST /api/tasks/:id/deny
// Body: { reason: string }
// - Validate reason provided
// - Execute denial
// - Return updated task
```

**`/src/app/api/tasks/[id]/route/route.ts`**

```typescript
// POST /api/tasks/:id/route
// Body: { exceptionType: string, notes?: string }
// - Validate exception type
// - Execute routing
// - Start SLA timer
```

**`/src/app/api/pdc/calculate/route.ts`**

```typescript
// POST /api/pdc/calculate
// Body: { patientId: string, measure?: MeasureType }
// - Fetch dispenses from Medplum
// - Run PDC calculation
// - Store as Observation resource
// - Return detailed breakdown
```

### Deliverables

- [ ] Approve action with audit trail
- [ ] Deny action with required reason
- [ ] Route to exception with type selection
- [ ] Override AI with justification
- [ ] All actions create AuditEvent resources
- [ ] API routes with validation

---

## Phase 7: Analytics & Dashboard (Week 8)

### Objective

Build the analytics dashboard with HEDIS metrics, PDC trends, and staff productivity.

### Files to Create

**`/src/app/(dashboard)/analytics/page.tsx`**

```typescript
// Analytics dashboard
//
// Sections:
//   1. Summary Cards (Total patients, Avg PDC, Adherent %, Urgent count)
//   2. PDC Trend Chart (12-month rolling, per measure)
//   3. Measure Breakdown (MAC/MAD/MAH pie chart)
//   4. Tier Distribution (F1-F5, T5 bar chart)
//   5. Approval Rate Over Time (line chart)
//   6. Staff Productivity (patients/hour, approval rate by user)
//   7. AI Accuracy (agreement rate, override rate)
```

**`/src/components/analytics/`**

- `pdc-trend-chart.tsx` - Line chart with 80% target line
- `measure-breakdown.tsx` - Pie chart for MAC/MAD/MAH
- `tier-distribution.tsx` - Bar chart for fragility tiers
- `staff-metrics.tsx` - Table with productivity stats

### Deliverables

- [ ] Summary metric cards
- [ ] PDC trend visualization
- [ ] Measure and tier breakdowns
- [ ] Staff productivity metrics
- [ ] AI accuracy tracking

---

## Phase 8: Polish, Performance & Accessibility (Week 8+)

### Objective

Optimize performance, add keyboard shortcuts, ensure WCAG 2.1 AA compliance.

### Focus Areas

#### Performance

- Initial load: FCP < 1.5s, TTI < 3s
- Bundle size: < 500KB gzipped
- Table rendering: 500 rows < 1s
- Virtualization for large lists
- Query caching with React Query

#### Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation (j/k, a/d/r)
- Focus management in drawers
- Screen reader announcements
- Color contrast 4.5:1

#### Keyboard Shortcuts

| Key   | Action               |
| ----- | -------------------- |
| `j/k` | Navigate queue items |
| `a`   | Approve selected     |
| `d`   | Deny selected        |
| `r`   | Route to exception   |
| `?`   | Show help            |
| `Esc` | Close drawer         |

---

## Critical File Summary

| Priority | File                                      | Purpose                                               |
| -------- | ----------------------------------------- | ----------------------------------------------------- |
| 1        | `/src/lib/pdc/calculator.ts`              | Core PDC calculation (deterministic, HEDIS-compliant) |
| 2        | `/src/schemas/pdc.ts`                     | Zod schemas for all PDC/fragility/priority data       |
| 3        | `/src/app/(dashboard)/queue/page.tsx`     | 4-tab refill queue page                               |
| 4        | `/src/lib/ai/pipeline.ts`                 | 3-tier AI decision orchestration                      |
| 5        | `/src/lib/safety/protocol-checks.ts`      | 16 deterministic protocol checks                      |
| 6        | `/src/components/queue/review-drawer.tsx` | Patient review interface                              |
| 7        | `/src/lib/fhir/task-actions.ts`           | Approve/Deny/Route handlers                           |

---

## Test Coverage Requirements

| Area             | Target | Test File                                 |
| ---------------- | ------ | ----------------------------------------- |
| PDC Calculator   | 100%   | `/src/lib/pdc/calculator.test.ts`         |
| Fragility Tiers  | 100%   | `/src/lib/pdc/fragility.test.ts`          |
| Priority Scoring | 100%   | `/src/lib/pdc/priority.test.ts`           |
| Protocol Checks  | 100%   | `/src/lib/safety/protocol-checks.test.ts` |
| AI Pipeline      | 90%    | `/src/lib/ai/pipeline.test.ts`            |
| Task Actions     | 100%   | `/src/lib/fhir/task-actions.test.ts`      |

### Clinical Validation

All 10 test scenarios from `TEST_SCENARIOS_FRAGILITY_TIERS.md` must pass:

- TS-01 through TS-10 covering F1-F5, T5, COMPLIANT, and D1a

---

## Environment Variables

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

## Success Criteria

1. **Clinical Accuracy**: PDC calculations match HEDIS specifications exactly
2. **AI Performance**: < 3s total AI processing, 95% agreement rate
3. **User Efficiency**: 50+ refills/hour (< 1 min per review)
4. **Safety**: 0 AI-flagged safety events missed
5. **Compliance**: 100% audit trail coverage
6. **Performance**: < 2s page load, 60fps scroll
