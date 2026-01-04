# Phase 3 Master Plan: Trigger Mechanisms & AI Integration

## Executive Summary

**Phase 1 Completed**: FHIR-native PDC Calculator and Fragility Tier Engine
**Phase 2 Completed**: Patient List Page UI
**Phase 3 Goal**: Add trigger mechanisms (Bots + CRON) and AI integration (legacy port)

**Timeline**: 5 days (same structure as Phase 1)
**Approach**: Minimum effort - port legacy AI patterns, not rebuild from scratch

---

## Phase 3 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 3: TRIGGER & AI LAYER                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      TRIGGER MECHANISMS                               │   │
│  │                                                                        │   │
│  │  ┌─────────────────────┐    ┌─────────────────────┐                   │   │
│  │  │  CRON BOT (Nightly) │    │  SUBSCRIPTION BOT   │                   │   │
│  │  │  ───────────────────│    │  ───────────────────│                   │   │
│  │  │  2 AM Daily:        │    │  On Task Creation:  │                   │   │
│  │  │  • Fetch all pts    │    │  • Generate AI rec  │                   │   │
│  │  │  • Calculate PDC    │    │  • Update Task      │                   │   │
│  │  │  • Assess fragility │    │  • Route by conf    │                   │   │
│  │  │  • Create Tasks     │    │                     │                   │   │
│  │  └─────────────────────┘    └─────────────────────┘                   │   │
│  │             │                         │                                │   │
│  │             ▼                         ▼                                │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │   │
│  │  │                    PHASE 1 CORE ENGINE                          │  │   │
│  │  │  src/lib/pdc/calculator.ts  │  src/lib/pdc/fragility.ts        │  │   │
│  │  │  src/lib/fhir/dispense-service.ts │ observation-service.ts     │  │   │
│  │  └─────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      AI LAYER (Legacy Port)                           │   │
│  │                                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │ Primary Agent│→ │  QA Agent    │→ │ Confidence   │                │   │
│  │  │ (Recommend)  │  │ (Verify)     │  │ Router       │                │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │   │
│  │         │                   │                │                        │   │
│  │         ▼                   ▼                ▼                        │   │
│  │  AWS Bedrock (Claude)    Zod Schema     Task.extension[]             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How Phase 1 Services Will Be Triggered

### Option A: Medplum Bots (RECOMMENDED)

| Trigger Type     | Bot Name                      | Schedule/Criteria                          | Purpose                                      |
| ---------------- | ----------------------------- | ------------------------------------------ | -------------------------------------------- |
| **CRON**         | `pdc-nightly-calculator`      | `0 2 * * *` (2 AM daily)                   | Calculate PDC for all patients, create Tasks |
| **Subscription** | `ai-recommendation-generator` | `Task?status=requested&code=refill-review` | Generate AI recommendations on new Tasks     |
| **On-Demand**    | `pdc-single-patient`          | `POST /$execute`                           | Recalculate single patient on demand         |

### Option B: Next.js API Routes (Alternative)

If Medplum Bots are not preferred, use API routes with external CRON (e.g., Vercel Cron):

```
src/app/api/
├── cron/
│   └── pdc-calculator/route.ts    # Called by Vercel Cron
├── ai/
│   └── generate-recommendation/route.ts
└── pdc/
    └── calculate/[patientId]/route.ts
```

### Option C: Hybrid (Recommended for Production)

- **Bots**: For nightly batch processing (more reliable, server-side)
- **API Routes**: For on-demand calculations (user-triggered, real-time)

---

## Day-by-Day Implementation Plan

### Day 1: Bot Infrastructure Setup

**Goal**: Create Medplum Bot structure and deployment configuration

**Files to Create**:

```
src/bots/
├── pdc-nightly-calculator/
│   ├── index.ts              # Main bot handler
│   ├── index.test.ts         # Bot tests
│   └── README.md             # Bot documentation
├── ai-recommendation/
│   ├── index.ts              # AI bot handler
│   ├── index.test.ts         # Bot tests
│   └── README.md
└── shared/
    ├── bot-utils.ts          # Shared utilities
    └── bot-types.ts          # Shared types
```

**Configuration**:

```
medplum.config.json           # Bot deployment config (root level)
```

**Test Cases** (TC-P2-D1-001 to TC-P2-D1-020):

- Bot handler structure validation
- Error handling patterns
- Logging and audit trail
- Rate limiting implementation

---

### Day 2: Nightly PDC Calculator Bot

**Goal**: Implement the CRON-triggered bot that calculates PDC for all patients

**Bot Flow**:

```
1. Fetch all patients with active MedicationRequests
2. For each patient:
   a. Get MedicationDispenses (via Phase 1 dispense-service)
   b. Calculate PDC (via Phase 1 calculator)
   c. Assess fragility tier (via Phase 1 fragility service)
   d. Store PDC Observation (via Phase 1 observation-service)
   e. Create/update Task if actionable
3. Log summary statistics
```

**Files to Modify**:

```
src/bots/pdc-nightly-calculator/index.ts
```

**Integration with Phase 1**:

```typescript
// Bot uses Phase 1 services
import { getPatientDispenses } from '@/lib/fhir/dispense-service';
import { calculatePDCFromDispenses } from '@/lib/pdc/calculator';
import { calculateFragility } from '@/lib/pdc/fragility';
import { createOrUpdatePDCObservation } from '@/lib/fhir/observation-service';
```

**Test Cases** (TC-P2-D2-001 to TC-P2-D2-030):

- Batch processing all patients
- Error isolation (one patient failure doesn't stop batch)
- Observation creation/update
- Task creation for actionable patients
- Performance (process 1000 patients in <5 min)

---

### Day 3: AI Infrastructure (Legacy Port)

**Goal**: Port the legacy AI implementation with minimum changes

**Legacy AI Pattern** (to port):

```
1. De-identify patient data
2. Call AWS Bedrock (Claude Sonnet)
3. Parse structured JSON response
4. Validate with Zod schema
5. Route by confidence level
```

**Files to Create**:

```
src/lib/ai/
├── bedrock-client.ts         # AWS Bedrock wrapper
├── de-identify.ts            # Patient data de-identification
├── types.ts                  # AI types and Zod schemas
├── prompts/
│   └── refill-recommendation.ts  # Prompt template
└── __tests__/
    ├── bedrock-client.test.ts
    └── de-identify.test.ts
```

**Simplified AI Flow** (NOT 3-tier initially):

```typescript
// Simple single-call approach (port from legacy)
export async function generateRecommendation(
  context: DeIdentifiedPatientContext,
  safetyResults: SafetyCheckResult
): Promise<AIRecommendation> {
  // 1. Build prompt
  const prompt = buildRefillPrompt(context, safetyResults);

  // 2. Call Bedrock
  const response = await invokeClaudeJSON(prompt, RecommendationSchema);

  // 3. Validate and return
  return response;
}
```

**Test Cases** (TC-P2-D3-001 to TC-P2-D3-025):

- De-identification removes all PHI
- Bedrock client error handling
- JSON response parsing
- Schema validation
- Retry logic for transient failures

---

### Day 4: AI Recommendation Bot

**Goal**: Create subscription-triggered bot that generates AI recommendations

**Bot Flow**:

```
1. Receive new Task (subscription trigger)
2. Validate task is refill-review type
3. Gather patient context (de-identified)
4. Run deterministic safety checks FIRST
5. If no blocking issues → Call AI
6. Validate AI response
7. Update Task with recommendation + confidence
8. Route based on confidence level
```

**Files to Create/Modify**:

```
src/bots/ai-recommendation/index.ts
src/lib/ai/recommendation-service.ts
src/lib/safety/                         # Placeholder for future
└── deterministic-checks.ts             # Basic safety checks
```

**Confidence Routing**:

```typescript
const ROUTING_THRESHOLDS = {
  AUTO_QUEUE: 0.95, // Very high confidence → minimal review
  STANDARD: 0.85, // High confidence → standard review
  ENHANCED: 0.7, // Medium → enhanced review
  PHARMACIST: 0, // Low → pharmacist escalation
};
```

**Test Cases** (TC-P2-D4-001 to TC-P2-D4-030):

- Subscription trigger handling
- Safety check blocking before AI
- AI recommendation stored in Task.extension
- Confidence-based routing
- Error handling (AI failure → manual review)

---

### Day 5: Integration, Deployment & Verification

**Goal**: End-to-end testing and deployment

**Integration Tests**:

```
src/bots/__tests__/
├── integration.test.ts       # Full flow tests
└── fixtures/
    └── test-patients.ts      # Test data
```

**Deployment Steps**:

```bash
# 1. Deploy bots to Medplum
npx medplum bot deploy pdc-nightly-calculator
npx medplum bot deploy ai-recommendation

# 2. Configure CRON trigger
# In Medplum Admin: Bot → Add cronTrigger extension

# 3. Create Subscription for AI bot
# Task?status=requested&code=refill-review
```

**Verification Script**:

```
scripts/verify-phase2.ts
```

**Test Cases** (TC-P2-D5-001 to TC-P2-D5-020):

- End-to-end: Patient → PDC → Task → AI → Recommendation
- Bot deployment verification
- CRON trigger test
- Subscription trigger test
- Rollback procedures

---

## File Structure (Phase 2)

```
src/
├── bots/                              # NEW: Medplum Bots
│   ├── pdc-nightly-calculator/
│   │   ├── index.ts                   # Nightly PDC calculation
│   │   └── index.test.ts
│   ├── ai-recommendation/
│   │   ├── index.ts                   # AI on Task creation
│   │   └── index.test.ts
│   └── shared/
│       ├── bot-utils.ts
│       └── bot-types.ts
│
├── lib/
│   ├── ai/                            # NEW: AI Layer
│   │   ├── bedrock-client.ts          # AWS Bedrock wrapper
│   │   ├── de-identify.ts             # PHI removal
│   │   ├── types.ts                   # Zod schemas
│   │   ├── recommendation-service.ts  # Main AI service
│   │   ├── prompts/
│   │   │   └── refill-recommendation.ts
│   │   └── __tests__/
│   │       ├── bedrock-client.test.ts
│   │       └── recommendation-service.test.ts
│   │
│   ├── safety/                        # NEW: Deterministic checks
│   │   ├── deterministic-checks.ts    # Basic safety validation
│   │   └── __tests__/
│   │       └── deterministic-checks.test.ts
│   │
│   ├── fhir/                          # FROM PHASE 1
│   │   ├── dispense-service.ts
│   │   ├── observation-service.ts
│   │   └── ...
│   │
│   └── pdc/                           # FROM PHASE 1
│       ├── calculator.ts
│       ├── fragility.ts
│       └── ...
│
├── app/api/                           # OPTIONAL: API routes
│   └── cron/
│       └── pdc-calculator/route.ts    # If using Vercel Cron
│
scripts/
├── verify-phase2.ts                   # Phase 2 verification
└── deploy-bots.ts                     # Bot deployment helper

medplum.config.json                    # Bot configuration
```

---

## Test Case Summary

| Day       | Category                 | Test Count | Test IDs                     |
| --------- | ------------------------ | ---------- | ---------------------------- |
| Day 1     | Bot Infrastructure       | 20         | TC-P2-D1-001 to TC-P2-D1-020 |
| Day 2     | Nightly PDC Bot          | 30         | TC-P2-D2-001 to TC-P2-D2-030 |
| Day 3     | AI Infrastructure        | 25         | TC-P2-D3-001 to TC-P2-D3-025 |
| Day 4     | AI Recommendation Bot    | 30         | TC-P2-D4-001 to TC-P2-D4-030 |
| Day 5     | Integration & Deployment | 20         | TC-P2-D5-001 to TC-P2-D5-020 |
| **Total** |                          | **125**    |                              |

---

## Environment Variables (Phase 2)

```env
# AWS Bedrock (required for AI)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Medplum (for bots)
MEDPLUM_BASE_URL=https://api.medplum.com/
MEDPLUM_CLIENT_ID=your-bot-client-id
MEDPLUM_CLIENT_SECRET=your-bot-client-secret

# Feature Flags
ENABLE_AI_RECOMMENDATIONS=true
ENABLE_AUTO_APPROVAL=false  # Keep false until validated
```

---

## Key Differences from Legacy AI

### What We're Keeping (Port As-Is):

1. AWS Bedrock client pattern
2. De-identification approach
3. Single-call recommendation generation
4. Zod schema validation
5. Confidence routing thresholds

### What We're Simplifying:

1. **3-tier pipeline → Single call initially**
   - Legacy: Primary → QA → Manager
   - Phase 2: Primary only (add QA/Manager in Phase 3 if needed)

2. **Self-consistency → Skip for now**
   - Legacy: 5 generations, vote on consensus
   - Phase 2: Single call with lower confidence threshold

3. **Complex confidence formula → Simple thresholds**
   - Legacy: Multi-factor weighted calculation
   - Phase 2: Direct model confidence + safety check pass/fail

---

## Rollback Plan

If Phase 2 causes issues:

1. **Disable AI Bot**: Update Subscription to inactive
2. **Disable CRON**: Remove cronTrigger extension from bot
3. **Manual Mode**: Tasks remain without AI recommendations
4. **Phase 1 Still Works**: PDC/Fragility calculations still function via UI

---

## Success Criteria

Phase 2 is complete when:

- [ ] Nightly bot runs successfully for 3 consecutive nights
- [ ] AI recommendations generated for 100+ Tasks
- [ ] Zero PHI leakage in AI calls (verified via logs)
- [ ] Confidence routing works correctly
- [ ] All 125 test cases pass
- [ ] Error rate < 1% for batch processing
- [ ] AI response time < 5 seconds per patient

---

## Next: Phase 3 Preview

After Phase 2, Phase 3 will add:

- Queue UI (Task list view)
- Patient Detail Page (4 tabs)
- Actions (Approve, Deny, Escalate)
- Audit trail visualization

---

_Created: 2026-01-05_
_Author: Claude Code_
_Status: Draft - Ready for Review_
