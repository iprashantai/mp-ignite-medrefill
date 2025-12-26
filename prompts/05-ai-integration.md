# Claude Code Prompt: AI Integration with Multi-Stage Verification

Use this prompt after Command Center UI is implemented.

---

## Prompt

I need to implement the AI integration layer for Ignite Health. This includes:
1. AWS Bedrock client for Claude API
2. Multi-stage verification pipeline
3. Confidence scoring system
4. Human routing logic

**Read context first:**
- Read `CLAUDE.md` for project context
- Review the AI architecture from our earlier discussion

**CRITICAL REQUIREMENTS:**
- AI output must ALWAYS be validated by schema
- Low confidence (<0.70) must ALWAYS escalate to human
- Safety-critical decisions (interactions, allergies) must use deterministic checks, NOT AI
- All AI calls must be de-identified before sending

---

## Part 1: Bedrock Client Setup

**Step 1: Create AWS Bedrock client**

Create `src/lib/ai/bedrock-client.ts`:

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { z } from 'zod';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  messages: ClaudeMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

interface ClaudeResponse {
  content: string;
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export async function invokeClaudeJSON<T>(
  request: ClaudeRequest,
  outputSchema: z.ZodType<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const response = await invokeClaude(request);
    
    // Extract JSON from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'No JSON found in response' };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const validated = outputSchema.safeParse(parsed);
    
    if (!validated.success) {
      return { success: false, error: `Schema validation failed: ${validated.error.message}` };
    }
    
    return { success: true, data: validated.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function invokeClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: request.maxTokens || 4096,
    temperature: request.temperature || 0.3,
    system: request.system,
    messages: request.messages,
  });
  
  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    body,
    contentType: 'application/json',
    accept: 'application/json',
  });
  
  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return {
    content: responseBody.content[0].text,
    stopReason: responseBody.stop_reason,
    usage: {
      inputTokens: responseBody.usage.input_tokens,
      outputTokens: responseBody.usage.output_tokens,
    },
  };
}
```

---

## Part 2: De-identification Layer

**Step 2: Create de-identification utilities**

Create `src/lib/ai/de-identify.ts`:

```typescript
import { Patient, MedicationRequest, Condition } from '@medplum/fhirtypes';

// De-identified patient context for AI
export interface DeIdentifiedPatientContext {
  patientToken: string;  // Opaque identifier
  age: number;
  gender: string;
  medications: Array<{
    rxnormCode: string;
    displayName: string;
    daysSupply: number;
    frequency: string;
  }>;
  conditions: Array<{
    icdCode: string;
    displayName: string;
  }>;
  pdcScores: {
    mad?: number;
    mac?: number;
    mah?: number;
  };
  daysUntilGap: number;
  adherenceHistory: Array<{ month: string; score: number }>;
}

// Map patient ID to token (for re-identification later)
const patientTokenMap = new Map<string, string>();
const tokenPatientMap = new Map<string, string>();

function generateToken(): string {
  return `PT-${Math.random().toString(36).substring(2, 15)}`;
}

export function deIdentifyPatient(
  patient: Patient,
  medications: MedicationRequest[],
  conditions: Condition[],
  pdcScores: { mad?: number; mac?: number; mah?: number },
  daysUntilGap: number,
  adherenceHistory: Array<{ month: string; score: number }>
): DeIdentifiedPatientContext {
  const patientId = patient.id!;
  
  // Get or create token
  let token = patientTokenMap.get(patientId);
  if (!token) {
    token = generateToken();
    patientTokenMap.set(patientId, token);
    tokenPatientMap.set(token, patientId);
  }
  
  return {
    patientToken: token,
    age: calculateAge(patient.birthDate) || 0,
    gender: patient.gender || 'unknown',
    medications: medications.map(m => ({
      rxnormCode: m.medicationCodeableConcept?.coding?.[0]?.code || '',
      displayName: m.medicationCodeableConcept?.coding?.[0]?.display || '',
      daysSupply: m.dispenseRequest?.expectedSupplyDuration?.value || 30,
      frequency: m.dosageInstruction?.[0]?.timing?.repeat?.frequency?.toString() || 'daily',
    })),
    conditions: conditions.map(c => ({
      icdCode: c.code?.coding?.[0]?.code || '',
      displayName: c.code?.coding?.[0]?.display || '',
    })),
    pdcScores,
    daysUntilGap,
    adherenceHistory,
  };
}

export function reIdentify(token: string): string | undefined {
  return tokenPatientMap.get(token);
}

function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || 
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
```

---

## Part 3: Prompt Templates

**Step 3: Create structured prompts**

Create `src/lib/ai/prompts/refill-recommendation.ts`:

```typescript
import { z } from 'zod';
import { DeIdentifiedPatientContext } from '../de-identify';

// Output schema for AI recommendation
export const RefillRecommendationSchema = z.object({
  recommendation: z.enum(['approve', 'review', 'escalate', 'deny']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(50).max(2000),
  riskFactors: z.array(z.string()).max(10),
  supportingEvidence: z.array(z.object({
    fact: z.string(),
    source: z.enum(['patient_data', 'clinical_guideline', 'drug_database']),
  })).max(10),
  uncertainties: z.array(z.string()).max(5),
  suggestedActions: z.array(z.object({
    action: z.string(),
    priority: z.enum(['required', 'recommended', 'optional']),
  })).max(5),
});

export type RefillRecommendation = z.infer<typeof RefillRecommendationSchema>;

export function buildRefillRecommendationPrompt(
  context: DeIdentifiedPatientContext,
  safetyCheckResults: {
    drugInteractions: Array<{ drugs: string[]; severity: string }>;
    allergies: string[];
    contraindications: string[];
    labConcerns: string[];
  }
): { system: string; user: string } {
  const system = `You are a clinical decision support system analyzing medication refill requests.

ROLE: Provide advisory recommendations to help clinical staff make refill decisions.

CONSTRAINTS:
1. You are providing ADVICE only - a human clinician will make the final decision
2. NEVER approve if safety checks show high-severity issues
3. ALWAYS express uncertainty clearly when data is incomplete
4. ALWAYS cite specific data points that support your reasoning
5. Be conservative - when in doubt, recommend "review" not "approve"

OUTPUT FORMAT:
Respond ONLY with a valid JSON object matching this exact schema:
{
  "recommendation": "approve" | "review" | "escalate" | "deny",
  "confidence": <number 0-1>,
  "reasoning": "<detailed clinical reasoning>",
  "riskFactors": ["<risk 1>", "<risk 2>", ...],
  "supportingEvidence": [{"fact": "...", "source": "patient_data|clinical_guideline|drug_database"}, ...],
  "uncertainties": ["<uncertainty 1>", ...],
  "suggestedActions": [{"action": "...", "priority": "required|recommended|optional"}, ...]
}

RECOMMENDATION CRITERIA:
- "approve": High confidence (>0.85), no safety issues, patient shows good adherence pattern
- "review": Moderate confidence (0.70-0.85), minor concerns, needs clinical judgment
- "escalate": Low confidence (<0.70), complex case, needs pharmacist/physician review
- "deny": Safety issues present, contraindications, or clinical guidelines prohibit`;

  const user = `Analyze this medication refill request:

PATIENT CONTEXT:
- Age: ${context.age}
- Gender: ${context.gender}
- Current PDC Scores: MAD=${context.pdcScores.mad ?? 'N/A'}, MAC=${context.pdcScores.mac ?? 'N/A'}, MAH=${context.pdcScores.mah ?? 'N/A'}
- Days until medication gap: ${context.daysUntilGap}
- Adherence trend (last 6 months): ${context.adherenceHistory.map(h => `${h.month}: ${h.score}%`).join(', ')}

ACTIVE MEDICATIONS:
${context.medications.map(m => `- ${m.displayName} (${m.rxnormCode}): ${m.daysSupply} day supply, ${m.frequency}`).join('\n')}

CONDITIONS:
${context.conditions.map(c => `- ${c.displayName} (${c.icdCode})`).join('\n')}

SAFETY CHECK RESULTS (from deterministic database checks):
Drug Interactions: ${safetyCheckResults.drugInteractions.length > 0 
  ? safetyCheckResults.drugInteractions.map(i => `${i.drugs.join(' + ')} (${i.severity})`).join('; ')
  : 'None detected'}
Allergies: ${safetyCheckResults.allergies.length > 0 ? safetyCheckResults.allergies.join(', ') : 'None recorded'}
Contraindications: ${safetyCheckResults.contraindications.length > 0 ? safetyCheckResults.contraindications.join(', ') : 'None detected'}
Lab Concerns: ${safetyCheckResults.labConcerns.length > 0 ? safetyCheckResults.labConcerns.join(', ') : 'None'}

Based on this information, provide your recommendation as a JSON object:`;

  return { system, user };
}
```

---

## Part 4: Multi-Stage Verification

**Step 4: Create verification pipeline**

Create `src/lib/ai/verification/pipeline.ts`:

```typescript
import { z } from 'zod';
import { invokeClaude, invokeClaudeJSON } from '../bedrock-client';
import { RefillRecommendation, RefillRecommendationSchema } from '../prompts/refill-recommendation';

interface VerificationResult {
  isValid: boolean;
  originalRecommendation: RefillRecommendation;
  verifiedRecommendation?: RefillRecommendation;
  verificationNotes: string[];
  confidenceAdjustment: number;
}

// Checker prompt - separate model/call to verify primary output
const CHECKER_SYSTEM_PROMPT = `You are a clinical safety reviewer. Your job is to verify AI recommendations for medication refills.

Check for:
1. Logical consistency - does the reasoning support the recommendation?
2. Safety completeness - were all safety factors considered?
3. Overconfidence - is confidence level appropriate given uncertainties?
4. Missing considerations - what important factors were overlooked?

Respond with JSON:
{
  "isLogicallyConsistent": boolean,
  "safetyComplete": boolean,
  "confidenceAppropriate": boolean,
  "missingConsiderations": ["..."],
  "suggestedConfidenceAdjustment": <number -0.2 to +0.1>,
  "overallAssessment": "valid" | "needs_adjustment" | "reject",
  "notes": ["..."]
}`;

const CheckerOutputSchema = z.object({
  isLogicallyConsistent: z.boolean(),
  safetyComplete: z.boolean(),
  confidenceAppropriate: z.boolean(),
  missingConsiderations: z.array(z.string()),
  suggestedConfidenceAdjustment: z.number().min(-0.2).max(0.1),
  overallAssessment: z.enum(['valid', 'needs_adjustment', 'reject']),
  notes: z.array(z.string()),
});

export async function verifyRecommendation(
  recommendation: RefillRecommendation,
  originalContext: string
): Promise<VerificationResult> {
  const checkerResult = await invokeClaudeJSON(
    {
      system: CHECKER_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Original context:\n${originalContext}\n\nAI Recommendation to verify:\n${JSON.stringify(recommendation, null, 2)}`,
      }],
      temperature: 0.1, // Low temperature for consistent checking
    },
    CheckerOutputSchema
  );
  
  if (!checkerResult.success) {
    // If checker fails, be conservative
    return {
      isValid: false,
      originalRecommendation: recommendation,
      verificationNotes: [`Checker failed: ${checkerResult.error}`],
      confidenceAdjustment: -0.2,
    };
  }
  
  const checker = checkerResult.data;
  
  // Apply confidence adjustment
  const adjustedConfidence = Math.max(0, Math.min(1, 
    recommendation.confidence + checker.suggestedConfidenceAdjustment
  ));
  
  // Determine if we need to downgrade recommendation
  let adjustedRecommendation = recommendation.recommendation;
  
  if (checker.overallAssessment === 'reject') {
    adjustedRecommendation = 'escalate';
  } else if (adjustedConfidence < 0.70 && recommendation.recommendation === 'approve') {
    adjustedRecommendation = 'review';
  }
  
  return {
    isValid: checker.overallAssessment !== 'reject',
    originalRecommendation: recommendation,
    verifiedRecommendation: {
      ...recommendation,
      confidence: adjustedConfidence,
      recommendation: adjustedRecommendation,
      reasoning: recommendation.reasoning + 
        (checker.notes.length > 0 ? `\n\n[Verification notes: ${checker.notes.join('; ')}]` : ''),
    },
    verificationNotes: checker.notes,
    confidenceAdjustment: checker.suggestedConfidenceAdjustment,
  };
}
```

**Step 5: Create self-consistency checker**

Create `src/lib/ai/verification/self-consistency.ts`:

```typescript
import { invokeClaudeJSON } from '../bedrock-client';
import { RefillRecommendation, RefillRecommendationSchema, buildRefillRecommendationPrompt } from '../prompts/refill-recommendation';
import { DeIdentifiedPatientContext } from '../de-identify';

interface SelfConsistencyResult {
  recommendation: RefillRecommendation;
  consistency: number;  // 0-1, how consistent were the N generations
  generations: RefillRecommendation[];
}

export async function generateWithSelfConsistency(
  context: DeIdentifiedPatientContext,
  safetyResults: any,
  n: number = 5
): Promise<SelfConsistencyResult> {
  const prompt = buildRefillRecommendationPrompt(context, safetyResults);
  
  // Generate N recommendations
  const generations: RefillRecommendation[] = [];
  
  for (let i = 0; i < n; i++) {
    const result = await invokeClaudeJSON(
      {
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
        temperature: 0.5, // Some variation
      },
      RefillRecommendationSchema
    );
    
    if (result.success) {
      generations.push(result.data);
    }
  }
  
  if (generations.length === 0) {
    throw new Error('All generations failed');
  }
  
  // Count recommendation votes
  const votes = {
    approve: 0,
    review: 0,
    escalate: 0,
    deny: 0,
  };
  
  for (const gen of generations) {
    votes[gen.recommendation]++;
  }
  
  // Find majority recommendation
  const majority = Object.entries(votes).reduce((a, b) => a[1] > b[1] ? a : b)[0] as RefillRecommendation['recommendation'];
  
  // Calculate consistency (what fraction agreed with majority)
  const consistency = votes[majority] / generations.length;
  
  // Average confidence of majority recommendations
  const majorityGens = generations.filter(g => g.recommendation === majority);
  const avgConfidence = majorityGens.reduce((sum, g) => sum + g.confidence, 0) / majorityGens.length;
  
  // Adjust confidence based on consistency
  const adjustedConfidence = avgConfidence * consistency;
  
  // Merge reasoning from all generations
  const allRiskFactors = [...new Set(generations.flatMap(g => g.riskFactors))];
  const allUncertainties = [...new Set(generations.flatMap(g => g.uncertainties))];
  
  return {
    recommendation: {
      recommendation: majority,
      confidence: adjustedConfidence,
      reasoning: majorityGens[0].reasoning + 
        `\n\n[Self-consistency: ${(consistency * 100).toFixed(0)}% agreement across ${n} generations]`,
      riskFactors: allRiskFactors.slice(0, 10),
      supportingEvidence: majorityGens[0].supportingEvidence,
      uncertainties: allUncertainties.slice(0, 5),
      suggestedActions: majorityGens[0].suggestedActions,
    },
    consistency,
    generations,
  };
}
```

---

## Part 5: Confidence Scoring

**Step 6: Create confidence calculator**

Create `src/lib/ai/confidence/calculator.ts`:

```typescript
interface ConfidenceFactors {
  modelConfidence: number;       // From AI output
  checkerAgreement: number;      // From verification
  selfConsistency: number;       // From N generations
  contextCompleteness: number;   // How complete is patient data
  safetyCheckClarity: number;    // Clear safety check results
}

interface ConfidenceResult {
  overall: number;
  factors: ConfidenceFactors;
  category: 'high' | 'standard' | 'enhanced' | 'escalate';
  routing: 'auto_queue' | 'standard_review' | 'enhanced_review' | 'pharmacist';
}

const WEIGHTS = {
  modelConfidence: 0.15,
  checkerAgreement: 0.30,
  selfConsistency: 0.25,
  contextCompleteness: 0.15,
  safetyCheckClarity: 0.15,
};

export function calculateConfidence(factors: ConfidenceFactors): ConfidenceResult {
  const overall = 
    factors.modelConfidence * WEIGHTS.modelConfidence +
    factors.checkerAgreement * WEIGHTS.checkerAgreement +
    factors.selfConsistency * WEIGHTS.selfConsistency +
    factors.contextCompleteness * WEIGHTS.contextCompleteness +
    factors.safetyCheckClarity * WEIGHTS.safetyCheckClarity;
  
  let category: ConfidenceResult['category'];
  let routing: ConfidenceResult['routing'];
  
  if (overall >= 0.95) {
    category = 'high';
    routing = 'auto_queue';
  } else if (overall >= 0.85) {
    category = 'standard';
    routing = 'standard_review';
  } else if (overall >= 0.70) {
    category = 'enhanced';
    routing = 'enhanced_review';
  } else {
    category = 'escalate';
    routing = 'pharmacist';
  }
  
  return {
    overall,
    factors,
    category,
    routing,
  };
}

export function calculateContextCompleteness(context: {
  hasAge: boolean;
  hasMedications: boolean;
  hasConditions: boolean;
  hasPDCHistory: boolean;
  hasAllergies: boolean;
  hasLabValues: boolean;
}): number {
  const required = [context.hasAge, context.hasMedications];
  const optional = [context.hasConditions, context.hasPDCHistory, context.hasAllergies, context.hasLabValues];
  
  const requiredScore = required.filter(Boolean).length / required.length;
  const optionalScore = optional.filter(Boolean).length / optional.length;
  
  // Required fields are 60% of score, optional are 40%
  return requiredScore * 0.6 + optionalScore * 0.4;
}

export function calculateSafetyCheckClarity(safetyResults: {
  drugInteractionsChecked: boolean;
  allergiesChecked: boolean;
  contraindicationsChecked: boolean;
  resultsUnambiguous: boolean;
}): number {
  const checks = [
    safetyResults.drugInteractionsChecked,
    safetyResults.allergiesChecked,
    safetyResults.contraindicationsChecked,
  ];
  
  const completeness = checks.filter(Boolean).length / checks.length;
  const clarity = safetyResults.resultsUnambiguous ? 1 : 0.5;
  
  return completeness * clarity;
}
```

---

## Part 6: Main Recommendation Service

**Step 7: Create the orchestrating service**

Create `src/lib/ai/services/recommendation-service.ts`:

```typescript
import { MedplumClient } from '@medplum/core';
import { Task, Patient } from '@medplum/fhirtypes';
import { deIdentifyPatient } from '../de-identify';
import { buildRefillRecommendationPrompt, RefillRecommendation } from '../prompts/refill-recommendation';
import { generateWithSelfConsistency } from '../verification/self-consistency';
import { verifyRecommendation } from '../verification/pipeline';
import { calculateConfidence, calculateContextCompleteness, calculateSafetyCheckClarity } from '../confidence/calculator';
import { runSafetyChecks } from '../../safety/checker';

interface RecommendationResult {
  recommendation: RefillRecommendation;
  confidence: {
    overall: number;
    category: 'high' | 'standard' | 'enhanced' | 'escalate';
    routing: string;
  };
  safetyChecks: {
    passed: boolean;
    issues: string[];
  };
  metadata: {
    generatedAt: string;
    modelVersion: string;
    verificationPassed: boolean;
    selfConsistencyScore: number;
  };
}

export async function generateRecommendation(
  medplum: MedplumClient,
  taskId: string
): Promise<RecommendationResult> {
  // 1. Load task and patient data
  const task = await medplum.readResource('Task', taskId);
  const patientId = task.for?.reference?.replace('Patient/', '');
  if (!patientId) throw new Error('Task missing patient reference');
  
  const [patient, medications, conditions, allergies, pdcHistory] = await Promise.all([
    medplum.readResource('Patient', patientId),
    medplum.searchResources('MedicationRequest', { patient: `Patient/${patientId}`, status: 'active' }),
    medplum.searchResources('Condition', { patient: `Patient/${patientId}` }),
    medplum.searchResources('AllergyIntolerance', { patient: `Patient/${patientId}` }),
    medplum.searchResources('Observation', { 
      patient: `Patient/${patientId}`,
      code: 'pdc-mad,pdc-mac,pdc-mah',
      _sort: '-date',
      _count: '6',
    }),
  ]);
  
  // 2. Run deterministic safety checks FIRST
  const safetyResults = await runSafetyChecks(medications, conditions, allergies);
  
  // If critical safety issue, don't even call AI
  if (safetyResults.hasCriticalIssue) {
    return {
      recommendation: {
        recommendation: 'deny',
        confidence: 1.0,
        reasoning: `Blocked by safety check: ${safetyResults.criticalIssues.join(', ')}`,
        riskFactors: safetyResults.criticalIssues,
        supportingEvidence: safetyResults.criticalIssues.map(i => ({ fact: i, source: 'drug_database' as const })),
        uncertainties: [],
        suggestedActions: [{ action: 'Review with pharmacist', priority: 'required' as const }],
      },
      confidence: { overall: 1.0, category: 'high', routing: 'blocked' },
      safetyChecks: { passed: false, issues: safetyResults.criticalIssues },
      metadata: {
        generatedAt: new Date().toISOString(),
        modelVersion: 'deterministic-safety-v1',
        verificationPassed: true,
        selfConsistencyScore: 1.0,
      },
    };
  }
  
  // 3. De-identify patient data
  const daysUntilGap = extractDaysUntilGap(task);
  const pdcScores = extractPDCScores(pdcHistory);
  const adherenceHistory = extractAdherenceHistory(pdcHistory);
  
  const deIdentifiedContext = deIdentifyPatient(
    patient,
    medications,
    conditions,
    pdcScores,
    daysUntilGap,
    adherenceHistory
  );
  
  // 4. Generate recommendation with self-consistency
  const scResult = await generateWithSelfConsistency(
    deIdentifiedContext,
    {
      drugInteractions: safetyResults.drugInteractions,
      allergies: safetyResults.allergyWarnings,
      contraindications: safetyResults.contraindications,
      labConcerns: safetyResults.labConcerns,
    },
    5 // 5 generations
  );
  
  // 5. Verify recommendation
  const prompt = buildRefillRecommendationPrompt(deIdentifiedContext, {
    drugInteractions: safetyResults.drugInteractions,
    allergies: safetyResults.allergyWarnings,
    contraindications: safetyResults.contraindications,
    labConcerns: safetyResults.labConcerns,
  });
  
  const verification = await verifyRecommendation(
    scResult.recommendation,
    prompt.user
  );
  
  // 6. Calculate final confidence
  const confidence = calculateConfidence({
    modelConfidence: scResult.recommendation.confidence,
    checkerAgreement: verification.isValid ? 1.0 : 0.5,
    selfConsistency: scResult.consistency,
    contextCompleteness: calculateContextCompleteness({
      hasAge: !!patient.birthDate,
      hasMedications: medications.length > 0,
      hasConditions: conditions.length > 0,
      hasPDCHistory: pdcHistory.length > 0,
      hasAllergies: true, // We checked
      hasLabValues: false, // TODO: Add lab checks
    }),
    safetyCheckClarity: calculateSafetyCheckClarity({
      drugInteractionsChecked: true,
      allergiesChecked: true,
      contraindicationsChecked: true,
      resultsUnambiguous: safetyResults.isUnambiguous,
    }),
  });
  
  // 7. Apply confidence to recommendation
  const finalRecommendation = verification.verifiedRecommendation || scResult.recommendation;
  
  // Force escalation if confidence too low
  if (confidence.overall < 0.70 && finalRecommendation.recommendation === 'approve') {
    finalRecommendation.recommendation = 'review';
    finalRecommendation.reasoning += '\n\n[System: Downgraded from approve to review due to low overall confidence]';
  }
  
  return {
    recommendation: finalRecommendation,
    confidence: {
      overall: confidence.overall,
      category: confidence.category,
      routing: confidence.routing,
    },
    safetyChecks: {
      passed: !safetyResults.hasAnyIssue,
      issues: [
        ...safetyResults.drugInteractions.map(i => `Drug interaction: ${i.drugs.join(' + ')}`),
        ...safetyResults.allergyWarnings,
        ...safetyResults.contraindications,
      ],
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      modelVersion: 'claude-3-sonnet-20240229',
      verificationPassed: verification.isValid,
      selfConsistencyScore: scResult.consistency,
    },
  };
}

// Helper functions
function extractDaysUntilGap(task: Task): number {
  const ext = task.extension?.find(e => e.url.includes('days-until-gap'));
  return ext?.valueInteger ?? 0;
}

function extractPDCScores(observations: any[]): { mad?: number; mac?: number; mah?: number } {
  const scores: { mad?: number; mac?: number; mah?: number } = {};
  for (const obs of observations) {
    const code = obs.code?.coding?.[0]?.code;
    const value = obs.valueQuantity?.value;
    if (code === 'pdc-mad') scores.mad = value;
    if (code === 'pdc-mac') scores.mac = value;
    if (code === 'pdc-mah') scores.mah = value;
  }
  return scores;
}

function extractAdherenceHistory(observations: any[]): Array<{ month: string; score: number }> {
  return observations.map(obs => ({
    month: obs.effectiveDateTime?.substring(0, 7) || '',
    score: obs.valueQuantity?.value || 0,
  }));
}
```

---

## Verification

After implementation:

```bash
# Run tests
npm test src/lib/ai

# Test with mock data
npm run test:ai-integration
```

Verify:
- [ ] De-identification removes all PHI
- [ ] Safety checks run before AI
- [ ] Self-consistency generates N samples
- [ ] Verification adjusts confidence
- [ ] Low confidence forces escalation
- [ ] All outputs validated by Zod
