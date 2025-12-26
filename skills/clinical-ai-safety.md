# Skill: Clinical AI Safety Patterns

## When to Use

Use this skill when:
- Implementing AI recommendations for clinical decisions
- Validating AI outputs before showing to users
- Building multi-stage verification pipelines
- Handling uncertainty and abstention

## Core Principles

### 1. Deterministic Before Probabilistic

**ALWAYS run deterministic safety checks BEFORE calling AI:**

```typescript
async function processRefillRequest(patientId: string) {
  // STEP 1: Deterministic checks FIRST
  const safetyChecks = await runDeterministicSafetyChecks(patientId);
  
  if (safetyChecks.hasCriticalIssue) {
    // Don't even call AI - return safety block
    return {
      decision: 'blocked',
      reason: safetyChecks.criticalIssues,
      source: 'safety_system', // NOT AI
    };
  }
  
  // STEP 2: Only call AI if safety checks pass
  const aiRecommendation = await generateAIRecommendation(patientId);
  
  // STEP 3: Validate AI output
  const validated = validateAIOutput(aiRecommendation);
  
  return validated;
}
```

### 2. Schema Validation for All AI Outputs

**NEVER trust AI output without validation:**

```typescript
import { z } from 'zod';

// Define strict schema
const AIRecommendationSchema = z.object({
  recommendation: z.enum(['approve', 'review', 'escalate', 'deny']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(50).max(2000),
  riskFactors: z.array(z.string()).max(10),
});

// Validate before use
function validateAIOutput(raw: unknown): Result<AIRecommendation> {
  const result = AIRecommendationSchema.safeParse(raw);
  
  if (!result.success) {
    // Log for monitoring
    logger.error('AI output validation failed', {
      errors: result.error.errors,
      raw: JSON.stringify(raw).substring(0, 500), // Truncate for logging
    });
    
    return {
      success: false,
      error: new Error('AI output failed validation'),
    };
  }
  
  return { success: true, data: result.data };
}
```

### 3. Confidence-Based Routing

**Low confidence MUST escalate:**

```typescript
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.95,      // Can proceed with minimal review
  STANDARD: 0.85,  // Standard clinical review
  ENHANCED: 0.70,  // Enhanced review with senior staff
  ESCALATE: 0,     // Pharmacist/physician required
};

function routeByConfidence(
  recommendation: AIRecommendation
): RoutingDecision {
  const { confidence, recommendation: rec } = recommendation;
  
  // CRITICAL: Never auto-approve below threshold
  if (confidence < CONFIDENCE_THRESHOLDS.ENHANCED && rec === 'approve') {
    return {
      route: 'enhanced_review',
      reason: 'Low confidence approval downgraded to review',
      originalRecommendation: rec,
    };
  }
  
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return { route: 'high_confidence_queue' };
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.STANDARD) {
    return { route: 'standard_review' };
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.ENHANCED) {
    return { route: 'enhanced_review' };
  }
  
  return { route: 'pharmacist_escalation' };
}
```

### 4. Multi-Model Verification

**Use a separate model to check the primary model:**

```typescript
async function verifyWithChecker(
  primaryOutput: AIRecommendation,
  context: string
): Promise<VerificationResult> {
  // Use different prompt/temperature for checker
  const checkerResult = await invokeClaude({
    system: CHECKER_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Verify this recommendation:\n${JSON.stringify(primaryOutput)}\n\nContext:\n${context}`,
    }],
    temperature: 0.1, // Lower temperature for checking
  });
  
  // Checker looks for:
  // 1. Logical consistency
  // 2. Missing safety considerations
  // 3. Overconfidence
  // 4. Hallucinated facts
  
  if (!checkerResult.approved) {
    return {
      verified: false,
      adjustedConfidence: primaryOutput.confidence * 0.7,
      issues: checkerResult.issues,
    };
  }
  
  return { verified: true };
}
```

### 5. Self-Consistency Sampling

**Generate multiple times and check agreement:**

```typescript
async function generateWithSelfConsistency(
  prompt: string,
  n: number = 5
): Promise<SelfConsistentResult> {
  // Generate N times with some temperature variation
  const generations = await Promise.all(
    Array(n).fill(null).map(() => 
      generateRecommendation(prompt, { temperature: 0.5 })
    )
  );
  
  // Count votes for each recommendation type
  const votes = countVotes(generations);
  
  // Majority recommendation
  const majority = getMajority(votes);
  
  // Consistency score = fraction that agreed
  const consistency = votes[majority] / n;
  
  // If consistency low, flag for human review
  if (consistency < 0.6) {
    return {
      recommendation: majority,
      confidence: consistency * 0.5, // Heavily penalize inconsistency
      needsReview: true,
      reason: `Only ${(consistency * 100).toFixed(0)}% agreement across ${n} generations`,
    };
  }
  
  return {
    recommendation: majority,
    confidence: Math.min(
      ...generations.filter(g => g.recommendation === majority).map(g => g.confidence)
    ) * consistency,
    needsReview: false,
  };
}
```

### 6. Abstention Pattern

**AI should say "I don't know" when uncertain:**

```typescript
const ABSTENTION_TRIGGERS = [
  // Data quality issues
  { condition: (ctx) => ctx.medicationCount < 1, reason: 'No medications found' },
  { condition: (ctx) => ctx.pdcHistory.length < 2, reason: 'Insufficient adherence history' },
  
  // Complex cases
  { condition: (ctx) => ctx.drugInteractions.length > 3, reason: 'Complex drug interaction profile' },
  { condition: (ctx) => ctx.conditions.length > 10, reason: 'Complex comorbidity profile' },
  
  // Edge cases
  { condition: (ctx) => ctx.age < 18, reason: 'Pediatric patient - specialized review required' },
  { condition: (ctx) => ctx.isPregnant, reason: 'Pregnancy - specialized review required' },
];

function shouldAbstain(context: PatientContext): AbstentionResult {
  for (const trigger of ABSTENTION_TRIGGERS) {
    if (trigger.condition(context)) {
      return {
        shouldAbstain: true,
        reason: trigger.reason,
        recommendation: 'escalate',
      };
    }
  }
  
  return { shouldAbstain: false };
}
```

### 7. Hallucination Detection

**Check AI claims against known facts:**

```typescript
function detectHallucinations(
  aiOutput: AIRecommendation,
  knownFacts: PatientFacts
): HallucinationCheck {
  const issues: string[] = [];
  
  // Check mentioned medications exist
  const mentionedMeds = extractMedicationMentions(aiOutput.reasoning);
  for (const med of mentionedMeds) {
    if (!knownFacts.medications.some(m => m.name.toLowerCase().includes(med.toLowerCase()))) {
      issues.push(`Mentioned medication "${med}" not in patient record`);
    }
  }
  
  // Check mentioned conditions exist
  const mentionedConditions = extractConditionMentions(aiOutput.reasoning);
  for (const cond of mentionedConditions) {
    if (!knownFacts.conditions.some(c => c.display.toLowerCase().includes(cond.toLowerCase()))) {
      issues.push(`Mentioned condition "${cond}" not in patient record`);
    }
  }
  
  // Check for impossible claims
  if (aiOutput.reasoning.includes('100%') || aiOutput.reasoning.includes('definitely')) {
    issues.push('Contains overconfident language');
  }
  
  return {
    hasIssues: issues.length > 0,
    issues,
    adjustedConfidence: issues.length > 0 
      ? aiOutput.confidence * (1 - issues.length * 0.1) 
      : aiOutput.confidence,
  };
}
```

### 8. Audit Trail

**Log everything for compliance:**

```typescript
interface AIAuditEntry {
  timestamp: string;
  taskId: string;
  patientId: string; // Just ID, no PHI
  
  // Input (de-identified)
  inputHash: string; // Hash of input for reproducibility
  
  // Processing
  modelVersion: string;
  promptVersion: string;
  selfConsistencyN: number;
  
  // Output
  recommendation: string;
  confidence: number;
  confidenceCategory: string;
  routingDecision: string;
  
  // Verification
  checkerPassed: boolean;
  hallucinationCheckPassed: boolean;
  validationPassed: boolean;
  
  // Final
  wasModified: boolean;
  modificationReason?: string;
  humanReviewRequired: boolean;
}

async function logAIDecision(entry: AIAuditEntry): Promise<void> {
  // Store as AuditEvent in Medplum
  await medplum.createResource({
    resourceType: 'AuditEvent',
    type: {
      system: 'https://ignitehealth.com/audit-types',
      code: 'ai-recommendation',
    },
    recorded: entry.timestamp,
    outcome: entry.validationPassed ? '0' : '4',
    entity: [{
      what: { reference: `Task/${entry.taskId}` },
      detail: [
        { type: 'recommendation', valueString: entry.recommendation },
        { type: 'confidence', valueString: entry.confidence.toString() },
        { type: 'routing', valueString: entry.routingDecision },
        { type: 'modelVersion', valueString: entry.modelVersion },
      ],
    }],
  });
}
```

## Anti-Patterns to Avoid

### ❌ DON'T: Trust AI for Safety-Critical Decisions

```typescript
// BAD - Using AI for drug interactions
const interactions = await askAI("What drug interactions exist?");

// GOOD - Using validated database
const interactions = await drugDatabase.checkInteractions(medications);
```

### ❌ DON'T: Skip Validation

```typescript
// BAD - Using AI output directly
const recommendation = await getAIRecommendation();
displayToUser(recommendation.reasoning); // Could be hallucinated!

// GOOD - Validate first
const validated = validateAndVerify(await getAIRecommendation());
if (validated.success) {
  displayToUser(validated.data.reasoning);
}
```

### ❌ DON'T: Auto-Approve at Low Confidence

```typescript
// BAD - Allowing auto-approve at any confidence
if (recommendation === 'approve') {
  autoApprove(); // Dangerous!
}

// GOOD - Require high confidence for any automated action
if (recommendation === 'approve' && confidence > 0.95 && verified) {
  queueForQuickReview(); // Still human review, just prioritized
}
```

### ❌ DON'T: Ignore Abstention

```typescript
// BAD - Forcing a recommendation
const rec = await getRecommendation();
return rec.recommendation; // Always returns something

// GOOD - Allow abstention
const rec = await getRecommendation();
if (rec.shouldAbstain) {
  return { action: 'escalate', reason: rec.abstentionReason };
}
return rec.recommendation;
```

## Testing AI Safety

```typescript
describe('AI Safety', () => {
  test('blocks on drug interaction', async () => {
    const result = await processRefill({
      medications: [
        { rxnorm: '123', name: 'Warfarin' },
        { rxnorm: '456', name: 'Aspirin' },
      ],
    });
    
    expect(result.decision).toBe('blocked');
    expect(result.source).toBe('safety_system');
  });
  
  test('downgrades low confidence approve', async () => {
    const result = await processRefill({
      // Minimal data to trigger low confidence
      medications: [{ rxnorm: '123', name: 'Metformin' }],
    });
    
    if (result.aiConfidence < 0.70) {
      expect(result.finalRecommendation).not.toBe('approve');
    }
  });
  
  test('abstains on complex cases', async () => {
    const result = await processRefill({
      medications: Array(15).fill({ rxnorm: '123' }), // Many meds
      conditions: Array(12).fill({ icd: 'E11' }), // Many conditions
    });
    
    expect(result.abstained).toBe(true);
  });
});
```
