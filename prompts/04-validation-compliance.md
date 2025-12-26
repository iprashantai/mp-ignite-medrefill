# Claude Code Prompt: Validation & Compliance Tooling

Use this prompt to set up comprehensive validation, security, and compliance tooling.

---

## Prompt

I need to set up validation, security, and compliance tooling for Ignite Health. This is a healthcare application that must meet HIPAA, SOC 2, and other compliance requirements.

**Read context first:**
- Read `CLAUDE.md` for project context

**Your task:** Set up comprehensive validation and compliance infrastructure.

---

## Part 1: Code Quality & Security

**Step 1: Configure ESLint for Healthcare**

Create `.eslintrc.json`:
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended"
  ],
  "plugins": ["@typescript-eslint", "security"],
  "rules": {
    // No any - enforce strict typing
    "@typescript-eslint/no-explicit-any": "error",
    
    // Security rules
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-possible-timing-attacks": "warn",
    
    // Healthcare-specific custom rules
    "no-console": ["error", { "allow": ["warn", "error"] }],
    
    // Strict null checks
    "@typescript-eslint/strict-boolean-expressions": "error"
  }
}
```

Install:
```bash
npm install -D eslint-plugin-security
```

**Step 2: Create PHI Protection Rules**

Create `src/lib/compliance/phi-checker.ts`:
```typescript
// Patterns that might indicate PHI
const PHI_PATTERNS = {
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/,
  phoneNumber: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  dateOfBirth: /\b(0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/,
  medicalRecordNumber: /\bMRN[:\s]?\d+\b/i,
  patientName: /patient[:\s]+[A-Z][a-z]+\s+[A-Z][a-z]+/i,
};

export function containsPotentialPHI(text: string): {
  hasPHI: boolean;
  matches: Array<{ type: string; match: string; position: number }>;
} {
  const matches: Array<{ type: string; match: string; position: number }> = [];
  
  for (const [type, pattern] of Object.entries(PHI_PATTERNS)) {
    const regex = new RegExp(pattern, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        type,
        match: match[0],
        position: match.index,
      });
    }
  }
  
  return {
    hasPHI: matches.length > 0,
    matches,
  };
}

// Use in logging to sanitize
export function sanitizeForLogging(obj: unknown): unknown {
  const str = JSON.stringify(obj);
  const check = containsPotentialPHI(str);
  
  if (check.hasPHI) {
    let sanitized = str;
    for (const match of check.matches) {
      sanitized = sanitized.replace(match.match, `[REDACTED-${match.type}]`);
    }
    return JSON.parse(sanitized);
  }
  
  return obj;
}
```

**Step 3: Create Audit Logger**

Create `src/lib/compliance/audit-logger.ts`:
```typescript
import { MedplumClient } from '@medplum/core';
import { AuditEvent } from '@medplum/fhirtypes';

interface AuditEntry {
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  resourceType: string;
  resourceId?: string;
  patientId?: string;
  userId: string;
  outcome: 'success' | 'failure';
  outcomeDescription?: string;
  details?: Record<string, unknown>;
}

export async function logAuditEvent(
  medplum: MedplumClient,
  entry: AuditEntry
): Promise<AuditEvent> {
  const auditEvent: AuditEvent = {
    resourceType: 'AuditEvent',
    type: {
      system: 'http://dicom.nema.org/resources/ontology/DCM',
      code: entry.action === 'read' ? '110110' : '110111',
      display: entry.action === 'read' ? 'Patient Record' : 'Patient Record Modification',
    },
    action: mapAction(entry.action),
    recorded: new Date().toISOString(),
    outcome: entry.outcome === 'success' ? '0' : '4',
    outcomeDesc: entry.outcomeDescription,
    agent: [
      {
        who: { reference: `Practitioner/${entry.userId}` },
        requestor: true,
      },
    ],
    source: {
      observer: { display: 'Ignite Health Application' },
    },
    entity: [
      {
        what: { reference: `${entry.resourceType}/${entry.resourceId}` },
        type: {
          system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
          code: '2',
          display: 'System Object',
        },
      },
      ...(entry.patientId ? [{
        what: { reference: `Patient/${entry.patientId}` },
        type: {
          system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
          code: '1',
          display: 'Person',
        },
        role: {
          system: 'http://terminology.hl7.org/CodeSystem/object-role',
          code: '1',
          display: 'Patient',
        },
      }] : []),
    ],
  };
  
  return medplum.createResource(auditEvent);
}

function mapAction(action: string): 'C' | 'R' | 'U' | 'D' | 'E' {
  const map: Record<string, 'C' | 'R' | 'U' | 'D' | 'E'> = {
    create: 'C',
    read: 'R',
    update: 'U',
    delete: 'D',
    execute: 'E',
  };
  return map[action] || 'E';
}
```

---

## Part 2: Input Validation

**Step 4: Create validation middleware**

Create `src/lib/validation/middleware.ts`:
```typescript
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

type ValidationSchema = z.ZodType<any, any>;

export function withValidation<T>(
  schema: ValidationSchema,
  handler: (req: NextRequest, validatedBody: T) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      return handler(req, validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors,
          },
          { status: 400 }
        );
      }
      throw error;
    }
  };
}
```

**Step 5: Create healthcare-specific validators**

Create `src/lib/validation/healthcare-schemas.ts`:
```typescript
import { z } from 'zod';

// FHIR date format
export const FHIRDateSchema = z.string().regex(
  /^\d{4}(-\d{2}(-\d{2})?)?$/,
  'Invalid FHIR date format'
);

// FHIR datetime format
export const FHIRDateTimeSchema = z.string().datetime();

// RxNorm code
export const RxNormCodeSchema = z.string().regex(
  /^\d+$/,
  'Invalid RxNorm code format'
);

// Patient ID (Medplum UUID format)
export const PatientIdSchema = z.string().uuid('Invalid patient ID format');

// Medication class
export const MedicationClassSchema = z.enum(['MAD', 'MAC', 'MAH']);

// Priority
export const PrioritySchema = z.enum(['routine', 'urgent', 'asap', 'stat']);

// Confidence score
export const ConfidenceScoreSchema = z.number().min(0).max(1);

// PDC score
export const PDCScoreSchema = z.number().min(0).max(1);

// Task action
export const TaskActionSchema = z.enum(['approve', 'deny', 'escalate', 'review']);

// Compound schemas
export const RefillReviewInputSchema = z.object({
  taskId: z.string().uuid(),
  action: TaskActionSchema,
  reason: z.string().min(1).max(1000).optional(),
  notes: z.string().max(5000).optional(),
});

export const PDCCalculationRequestSchema = z.object({
  patientId: PatientIdSchema,
  medicationClass: MedicationClassSchema,
  startDate: FHIRDateSchema,
  endDate: FHIRDateSchema,
});
```

---

## Part 3: HIPAA Compliance Checks

**Step 6: Create HIPAA compliance checker**

Create `src/lib/compliance/hipaa-checker.ts`:
```typescript
interface HIPAACheck {
  rule: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
  remediation?: string;
}

export function runHIPAAChecks(): HIPAACheck[] {
  const checks: HIPAACheck[] = [];
  
  // Check 1: Environment variables
  checks.push({
    rule: 'HIPAA-164.312(a)(1)',
    status: process.env.MEDPLUM_CLIENT_SECRET ? 'pass' : 'fail',
    description: 'Access Control - Credentials not hardcoded',
    remediation: 'Use environment variables for secrets',
  });
  
  // Check 2: HTTPS
  checks.push({
    rule: 'HIPAA-164.312(e)(1)',
    status: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL?.startsWith('https://') ? 'pass' : 'fail',
    description: 'Transmission Security - HTTPS required',
    remediation: 'Ensure all API endpoints use HTTPS',
  });
  
  // Check 3: Session timeout configured
  checks.push({
    rule: 'HIPAA-164.312(a)(2)(iii)',
    status: process.env.SESSION_TIMEOUT ? 'pass' : 'warning',
    description: 'Automatic Logoff - Session timeout configured',
    remediation: 'Set SESSION_TIMEOUT environment variable',
  });
  
  return checks;
}

// Run at build time
export function validateHIPAACompliance(): void {
  const checks = runHIPAAChecks();
  const failures = checks.filter(c => c.status === 'fail');
  
  if (failures.length > 0) {
    console.error('HIPAA Compliance Failures:');
    failures.forEach(f => {
      console.error(`  - ${f.rule}: ${f.description}`);
      console.error(`    Remediation: ${f.remediation}`);
    });
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('HIPAA compliance check failed');
    }
  }
}
```

---

## Part 4: AI Output Validation

**Step 7: Create AI output validators**

Create `src/lib/ai/validators.ts`:
```typescript
import { z } from 'zod';

// AI Recommendation Schema
export const AIRecommendationSchema = z.object({
  recommendation: z.enum(['approve', 'deny', 'review', 'escalate']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(10).max(5000),
  riskFactors: z.array(z.string()).max(20),
  citations: z.array(z.object({
    source: z.string(),
    quote: z.string().optional(),
    relevance: z.number().min(0).max(1).optional(),
  })).max(10),
});

export type AIRecommendation = z.infer<typeof AIRecommendationSchema>;

// Validate AI output with safety checks
export function validateAIRecommendation(
  raw: unknown
): { valid: boolean; recommendation?: AIRecommendation; errors?: string[] } {
  // Step 1: Schema validation
  const parseResult = AIRecommendationSchema.safeParse(raw);
  
  if (!parseResult.success) {
    return {
      valid: false,
      errors: parseResult.error.errors.map(e => e.message),
    };
  }
  
  const rec = parseResult.data;
  const errors: string[] = [];
  
  // Step 2: Safety checks
  
  // Check: Low confidence should not have "approve"
  if (rec.confidence < 0.70 && rec.recommendation === 'approve') {
    errors.push('Low confidence recommendations cannot be "approve"');
  }
  
  // Check: Reasoning must mention key clinical factors
  const requiredTerms = ['medication', 'patient', 'adherence'];
  const hasRequiredTerms = requiredTerms.some(term => 
    rec.reasoning.toLowerCase().includes(term)
  );
  if (!hasRequiredTerms) {
    errors.push('Reasoning does not contain expected clinical terminology');
  }
  
  // Check: Must have citations for approve/deny
  if (['approve', 'deny'].includes(rec.recommendation) && rec.citations.length === 0) {
    errors.push('Approve/deny recommendations must have citations');
  }
  
  // Check: Risk factors should exist for non-approve
  if (rec.recommendation !== 'approve' && rec.riskFactors.length === 0) {
    errors.push('Non-approve recommendations should list risk factors');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true, recommendation: rec };
}

// Hallucination detector (basic)
export function detectPotentialHallucination(
  recommendation: AIRecommendation,
  patientContext: { conditions: string[]; medications: string[] }
): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  // Check if reasoning mentions medications not in patient's list
  const reasoningLower = recommendation.reasoning.toLowerCase();
  
  // Look for specific drug names that might be hallucinated
  const commonDrugs = ['metformin', 'lisinopril', 'atorvastatin', 'amlodipine'];
  for (const drug of commonDrugs) {
    if (reasoningLower.includes(drug)) {
      const inPatientMeds = patientContext.medications.some(
        m => m.toLowerCase().includes(drug)
      );
      if (!inPatientMeds) {
        reasons.push(`Mentions ${drug} but not in patient medications`);
      }
    }
  }
  
  // Check for overly confident language
  const overconfidentPhrases = [
    'absolutely certain',
    'definitely',
    '100% sure',
    'without any doubt',
  ];
  for (const phrase of overconfidentPhrases) {
    if (reasoningLower.includes(phrase)) {
      reasons.push(`Contains overconfident phrase: "${phrase}"`);
    }
  }
  
  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}
```

---

## Part 5: Testing Infrastructure

**Step 8: Create test utilities**

Create `src/test/setup.ts`:
```typescript
import { MockClient } from '@medplum/mock';
import { vi } from 'vitest';

// Global test setup
export function setupTestEnvironment() {
  // Mock environment variables
  process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL = 'https://api.medplum.com/';
  process.env.NODE_ENV = 'test';
}

// Create mock Medplum client with test data
export async function createTestMedplumClient(): Promise<MockClient> {
  const medplum = new MockClient();
  
  // Seed with test patient
  await medplum.createResource({
    resourceType: 'Patient',
    id: 'test-patient-1',
    name: [{ family: 'Test', given: ['Patient'] }],
    birthDate: '1955-03-15',
  });
  
  // Seed with test medications
  await medplum.createResource({
    resourceType: 'MedicationRequest',
    id: 'test-medrx-1',
    status: 'active',
    intent: 'order',
    subject: { reference: 'Patient/test-patient-1' },
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '860975' }],
    },
  });
  
  return medplum;
}
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## Part 6: Pre-commit Hooks

**Step 9: Set up pre-commit hooks**

```bash
npm install -D husky lint-staged
npx husky install
```

Create `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

Create `.lintstagedrc.json`:
```json
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

---

## Verification

After setup, run:

```bash
# Run ESLint
npm run lint

# Run tests with coverage
npm test -- --coverage

# Run HIPAA check
npx ts-node -e "import { validateHIPAACompliance } from './src/lib/compliance/hipaa-checker'; validateHIPAACompliance();"
```

Expected results:
- [ ] ESLint passes with no errors
- [ ] Tests pass with >80% coverage
- [ ] HIPAA checks pass (or only warnings in dev)
- [ ] Pre-commit hooks work
