# Ignite Health - Implementation Roadmap

## Overview

This document outlines the phased implementation plan for building the Ignite Health medication adherence platform using Medplum as the FHIR backbone.

**Timeline**: 16 weeks to MVP
**Team**: 1 Lead Data Scientist (you), 3 Non-Engineering Experts, Claude Code

---

## Phase 0: Foundation Setup (Week 1)

### Day 1-2: Environment Setup

#### 1. Create Medplum Account
```bash
# Go to https://app.medplum.com and create account
# Select "Production" tier when ready (for now, free tier is fine)
# Note your Project ID
```

#### 2. Initialize Project
```bash
# Create new Next.js 15 project with Medplum
npx create-next-app@15.5.9 ignite-health --typescript --tailwind --app --src-dir

cd ignite-health

# Install React 19 (matching enterprise versions)
npm install react@^19.2.1 react-dom@^19.2.1

# Install Medplum packages
npm install @medplum/core @medplum/react @medplum/fhirtypes

# Install dev dependencies (matching enterprise versions)
npm install -D @medplum/cli vitest@^4.0.12 @testing-library/react@^16.0.1 typescript@^5.7.2

# Install additional utilities (matching enterprise versions)
npm install zod@^3.23.8 zustand@^5.0.0 @tanstack/react-query@^5.59.0 lucide-react@^0.454.0
npm install date-fns@^4.1.0 recharts@^2.13.0 clsx@^2.1.1 tailwind-merge@^2.5.4

# Install shadcn/ui
npx shadcn@latest init
```

#### 3. Configure Medplum CLI
```bash
# Login to Medplum
npx medplum login

# Set project
npx medplum project set <your-project-id>

# Verify connection
npx medplum whoami
```

#### 4. Setup FHIR Visualization Tools
```bash
# Install FHIR tools for development
npm install -D fhir-kit-client

# Recommended VS Code extensions:
# - "FHIR Tools" by Firely
# - "JSON Schema Validator" 
# - "Thunder Client" (for API testing)
```

### Day 3-4: Project Structure

Create the following directory structure:
```
ignite-health/
├── .claude/                    # Claude Code context files
│   └── settings.json
├── CLAUDE.md                   # Master Claude Code context
├── docs/
│   ├── ARCHITECTURE.md
│   ├── FHIR_GUIDE.md
│   └── API_DESIGN.md
├── specs/
│   ├── pdc-calculation.md
│   ├── refill-workflow.md
│   └── safety-checks.md
├── skills/                     # Claude Code skills
│   ├── fhir-resource.md
│   ├── medplum-bot.md
│   └── pdc-calculation.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── callback/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── patients/
│   │   │   ├── queue/
│   │   │   └── analytics/
│   │   └── api/
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── fhir/               # FHIR-aware components
│   │   │   ├── PatientCard.tsx
│   │   │   ├── MedicationList.tsx
│   │   │   └── TaskQueue.tsx
│   │   └── command-center/
│   │       ├── RefillQueue.tsx
│   │       ├── PatientDetail.tsx
│   │       └── AIRecommendation.tsx
│   ├── lib/
│   │   ├── medplum/
│   │   │   ├── client.ts
│   │   │   ├── hooks.ts
│   │   │   └── utils.ts
│   │   ├── fhir/
│   │   │   ├── extensions.ts
│   │   │   ├── helpers.ts
│   │   │   └── transformers.ts
│   │   ├── pdc/
│   │   │   ├── calculator.ts
│   │   │   ├── calculator.test.ts
│   │   │   └── types.ts
│   │   ├── safety/
│   │   │   ├── drug-interactions.ts
│   │   │   ├── lab-checks.ts
│   │   │   └── contraindications.ts
│   │   └── ai/
│   │       ├── bedrock-client.ts
│   │       ├── prompts/
│   │       ├── chains/
│   │       └── validators/
│   ├── schemas/                # Zod schemas
│   │   ├── fhir.ts
│   │   ├── pdc.ts
│   │   └── recommendations.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── extensions.ts
│   └── bots/                   # Medplum Bots
│       ├── pdc-calculator/
│       ├── refill-analyzer/
│       └── task-creator/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│       └── synthea/            # Test data
├── scripts/
│   ├── seed-test-data.ts
│   └── deploy-bots.ts
└── medplum.config.json
```

### Day 5: Load Test Data

```bash
# Download Synthea (synthetic patient generator)
# https://github.com/synthetichealth/synthea

# Generate test patients
java -jar synthea-with-dependencies.jar \
  -p 100 \
  -m diabetes \
  -m hypertension \
  --exporter.fhir.export true

# Upload to Medplum
npx medplum bulk import ./output/fhir/*.json
```

---

## Phase 1: Core FHIR Data Layer (Weeks 2-3)

### Week 2: FHIR Resource Management

#### Goals:
- [ ] Medplum client setup with authentication
- [ ] Patient resource CRUD operations
- [ ] MedicationRequest queries
- [ ] MedicationDispense handling
- [ ] Custom extensions for PDC scores

#### Key Files to Create:

**src/lib/medplum/client.ts**
```typescript
// Medplum client singleton with proper typing
```

**src/lib/fhir/extensions.ts**
```typescript
// Custom FHIR extensions for Ignite Health
// - PDC scores (MAD, MAC, MAH)
// - Risk levels
// - AI recommendations
// - Confidence scores
```

**src/schemas/fhir.ts**
```typescript
// Zod schemas for FHIR resource validation
```

### Week 3: PDC Calculation Engine

#### Goals:
- [ ] Implement PDC calculation (100% deterministic)
- [ ] Handle edge cases (overlaps, gaps, hospitalizations)
- [ ] Unit tests with known scenarios
- [ ] Store PDC as Observation resources

#### Specification:

```typescript
// PDC Formula (MUST be deterministic)
// PDC = (Days with medication on hand) / (Days in measurement period)

interface PDCCalculationInput {
  patientId: string;
  medicationClass: 'MAD' | 'MAC' | 'MAH';
  measurementPeriodStart: Date;
  measurementPeriodEnd: Date;
  dispenses: MedicationDispense[];
}

interface PDCCalculationOutput {
  pdcScore: number;           // 0.0 to 1.0
  daysWithMedication: number;
  totalDays: number;
  isAdherent: boolean;        // >= 0.80 threshold
  gaps: DateRange[];          // Identified gap periods
  calculationDetails: {
    adjustedDispenses: AdjustedDispense[];
    excludedPeriods: DateRange[];  // Hospitalizations
  };
}
```

---

## Phase 2: Workflow Engine (Weeks 4-6)

### Week 4: Task Management

#### Goals:
- [ ] Create Task resources for refill reviews
- [ ] Implement priority queue (urgency sorting)
- [ ] Staff assignment workflow
- [ ] Status transitions (requested → in-progress → completed)

#### Key Medplum Bot: Task Creator

```typescript
// Bot: Runs daily, creates tasks for upcoming refills
// Trigger: Cron schedule (daily at 6 AM)
// Logic:
// 1. Query all active MedicationRequests
// 2. Calculate days until next refill needed
// 3. For refills due in <= 15 days, create review Task
// 4. Set priority based on urgency factors
```

### Week 5: Safety Checking System

#### Goals:
- [ ] Drug-drug interaction checking (database lookup)
- [ ] Lab value validation (threshold-based)
- [ ] Allergy/contraindication checking
- [ ] Integrate with First Databank or DrugBank API

#### Architecture:

```
Safety Check Pipeline (100% Deterministic)
├── Input: Patient + Medications
├── Step 1: Drug-Drug Interactions (DB lookup)
│   └── Source: First Databank / DrugBank / OpenFDA
├── Step 2: Allergy Check (exact match)
│   └── Source: Patient.AllergyIntolerance resources
├── Step 3: Contraindication Check (condition match)
│   └── Source: Patient.Condition + Drug contraindications DB
├── Step 4: Lab Value Check (threshold comparison)
│   └── Source: Patient.Observation (labs) + Drug requirements
├── Step 5: Renal/Hepatic Dose Adjustment
│   └── Source: CrCl calculation + dosing guidelines
└── Output: SafetyCheckResult with pass/fail + reasons
```

### Week 6: Refill Gap Prediction

#### Goals:
- [ ] Calculate days until medication gap
- [ ] Factor in days supply, refills remaining
- [ ] Handle different medication frequencies
- [ ] Create urgency scoring

---

## Phase 3: AI Integration (Weeks 7-10)

### Week 7: AI Infrastructure

#### Goals:
- [ ] AWS Bedrock client setup
- [ ] Prompt template system
- [ ] Response validation with Zod
- [ ] Error handling and retries

#### Architecture:

```typescript
// AI Service Layer
interface AIRecommendationService {
  // Main recommendation generation
  generateRecommendation(input: RecommendationInput): Promise<Result<Recommendation>>;
  
  // Explanation generation
  explainRecommendation(recommendation: Recommendation): Promise<Result<string>>;
  
  // Risk assessment
  assessRisk(patient: PatientContext): Promise<Result<RiskAssessment>>;
}

// Multi-stage verification
interface VerificationPipeline {
  validateOutput(output: unknown): ValidationResult;
  checkSafety(recommendation: Recommendation): SafetyCheckResult;
  calculateConfidence(factors: ConfidenceFactors): number;
  determineRouting(confidence: number): RoutingDecision;
}
```

### Week 8: RAG System for Clinical Guidelines

#### Goals:
- [ ] Embed clinical guidelines (diabetes, hypertension, cholesterol)
- [ ] Vector store setup (Pinecone or Medplum's built-in)
- [ ] Retrieval pipeline
- [ ] Citation tracking

### Week 9: Multi-Stage Verification

#### Goals:
- [ ] Implement checker model pattern
- [ ] Self-consistency sampling (N=5)
- [ ] Confidence scoring system
- [ ] Abstention mechanism

### Week 10: Human-in-the-Loop Routing

#### Goals:
- [ ] Confidence-based routing logic
- [ ] Pharmacist escalation workflow
- [ ] Feedback collection system
- [ ] Override tracking

---

## Phase 4: Command Center UI (Weeks 11-13)

### Week 11: Queue Dashboard

#### Goals:
- [ ] Refill queue with urgency sorting
- [ ] Filter by PDC score, medication class, risk level
- [ ] Bulk actions
- [ ] Real-time updates (WebSocket/Subscriptions)

### Week 12: Patient Detail View

#### Goals:
- [ ] Comprehensive patient summary
- [ ] Medication timeline visualization
- [ ] PDC trend charts
- [ ] AI recommendation display with reasoning

### Week 13: Action Center

#### Goals:
- [ ] Approve/Deny workflow
- [ ] eRx integration preparation
- [ ] Outreach scheduling
- [ ] Audit trail display

---

## Phase 5: Integration & Testing (Weeks 14-16)

### Week 14: eClinicalWorks Integration

#### Goals:
- [ ] SMART on FHIR app registration
- [ ] EHR launch flow
- [ ] Data sync from eCW to Medplum
- [ ] Bidirectional updates

### Week 15: Comprehensive Testing

#### Goals:
- [ ] Unit test coverage > 80%
- [ ] Integration tests with Medplum sandbox
- [ ] Clinical scenario validation
- [ ] Performance testing

### Week 16: Documentation & Deployment

#### Goals:
- [ ] User documentation
- [ ] API documentation
- [ ] Deployment to Medplum Production tier
- [ ] BAA signing
- [ ] Go-live checklist

---

## Success Metrics

### Phase 1-2 (Foundation)
- [ ] 100+ test patients loaded
- [ ] PDC calculation accuracy = 100% (deterministic)
- [ ] Safety checks passing known test cases

### Phase 3 (AI)
- [ ] AI recommendation precision > 90%
- [ ] Confidence calibration error < 0.1
- [ ] Abstention rate for uncertain cases > 15%

### Phase 4 (UI)
- [ ] Dashboard load time < 2s
- [ ] Queue processing time < 30s per patient
- [ ] Staff satisfaction score > 4/5

### Phase 5 (Integration)
- [ ] eCW data sync latency < 1 hour
- [ ] System uptime > 99.5%
- [ ] Audit trail completeness = 100%

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Medplum feature gap | Apache 2.0 licensed - can fork if needed |
| eCW API limitations | Graceful degradation, manual data entry fallback |
| AI accuracy issues | Human-in-loop, conservative thresholds |
| HIPAA compliance | Inherit from Medplum, add application layer controls |
| Team learning curve | Claude Code assistance, Medplum tutorials |

---

## Next Steps

1. **Today**: Set up Medplum account and initialize project
2. **This Week**: Complete Phase 0 foundation
3. **Review**: Weekly architecture reviews with team
4. **Iterate**: Adjust timeline based on learnings
