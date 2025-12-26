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
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// ALWAYS wrap external calls
async function safeMedplumCall<T>(
  operation: () => Promise<T>
): Promise<Result<T>> {
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
  name: z.array(z.object({
    given: z.array(z.string()),
    family: z.string(),
  })).min(1),
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

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Task>
): Promise<void> {
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
  checkerAgreement: number;      // 0-1: Agreement between primary and checker model
  selfConsistency: number;       // 0-1: Consistency across multiple generations
  sourceQuality: number;         // 0-1: Quality of retrieved sources
  contextCompleteness: number;   // 0-1: How complete is patient context
  modelConfidence: number;       // 0-1: Model's stated confidence
}

function calculateOverallConfidence(factors: ConfidenceFactors): number {
  // Weighted average with safety bias
  return (
    factors.checkerAgreement * 0.30 +
    factors.selfConsistency * 0.25 +
    factors.sourceQuality * 0.20 +
    factors.contextCompleteness * 0.15 +
    factors.modelConfidence * 0.10
  );
}

// Routing thresholds
const CONFIDENCE_THRESHOLDS = {
  AUTO_APPROVE: 0.95,      // Very high confidence → recommend with minimal review
  STANDARD_REVIEW: 0.85,   // High confidence → recommend with standard review
  ENHANCED_REVIEW: 0.70,   // Medium confidence → recommend with enhanced review
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

1. **DO NOT** use `any` type in TypeScript
2. **DO NOT** skip Zod validation for external data
3. **DO NOT** hardcode Medplum credentials
4. **DO NOT** log PHI
5. **DO NOT** trust AI output without validation
6. **DO NOT** use AI for deterministic calculations (PDC, interactions)
7. **DO NOT** skip error handling for async operations
8. **DO NOT** create FHIR resources without required fields

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
