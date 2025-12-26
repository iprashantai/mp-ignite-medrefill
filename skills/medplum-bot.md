# Skill: Medplum Bot Development

## When to Use
Use this skill when:
- Creating server-side automation
- Implementing scheduled jobs (cron)
- Responding to resource changes (subscriptions)
- Building integration pipelines
- Processing data in the background

## What is a Medplum Bot?

A Medplum Bot is a TypeScript/JavaScript function that runs on Medplum's server infrastructure. Think of it like AWS Lambda but for healthcare data.

```typescript
// Basic Bot structure
import { BotEvent, MedplumClient } from '@medplum/core';

export async function handler(
  medplum: MedplumClient, 
  event: BotEvent
): Promise<any> {
  // Bot logic here
  return { status: 'success' };
}
```

## Bot Trigger Types

### 1. Subscription Trigger (Resource Changes)
Runs when a FHIR resource is created/updated/deleted.

```typescript
// Trigger: When a new Task is created
// Subscription criteria: "Task?status=requested"

import { BotEvent, MedplumClient } from '@medplum/core';
import { Task } from '@medplum/fhirtypes';

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Task>
): Promise<void> {
  const task = event.input;
  
  console.log(`New task created: ${task.id}`);
  
  // Process the new task...
}
```

### 2. Cron Trigger (Scheduled)
Runs on a schedule.

```typescript
// Trigger: Daily at 6 AM UTC
// Cron: "0 6 * * *"

import { BotEvent, MedplumClient } from '@medplum/core';

export async function handler(
  medplum: MedplumClient,
  event: BotEvent
): Promise<void> {
  console.log(`Daily job running at ${new Date().toISOString()}`);
  
  // Daily processing logic...
}
```

### 3. On-Demand ($execute)
Called directly via API.

```typescript
// Trigger: POST /fhir/R4/Bot/<bot-id>/$execute

import { BotEvent, MedplumClient } from '@medplum/core';
import { Parameters } from '@medplum/fhirtypes';

interface CalculatePDCInput {
  patientId: string;
  medicationClass: 'MAD' | 'MAC' | 'MAH';
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Parameters>
): Promise<any> {
  // Extract parameters
  const params = event.input.parameter;
  const patientId = params?.find(p => p.name === 'patientId')?.valueString;
  const medicationClass = params?.find(p => p.name === 'medicationClass')?.valueCode;
  
  if (!patientId || !medicationClass) {
    throw new Error('Missing required parameters');
  }
  
  // Process and return result
  const result = await calculatePDC(medplum, patientId, medicationClass);
  return result;
}
```

## Implementation Patterns

### Pattern 1: Daily PDC Calculator Bot

```typescript
/**
 * Bot: PDC Calculator
 * Trigger: Cron daily at 2 AM
 * Purpose: Calculate PDC for all patients with active medications
 */

import { BotEvent, MedplumClient } from '@medplum/core';
import { 
  Patient, 
  MedicationDispense, 
  MedicationRequest, 
  Observation 
} from '@medplum/fhirtypes';

// Import shared utilities (these should be in a shared package)
// For now, we'll inline the logic

const MEDICATION_CLASSES = {
  MAD: 'Medication Adherence for Diabetes',
  MAC: 'Medication Adherence for Cholesterol', 
  MAH: 'Medication Adherence for Hypertension',
} as const;

type MedicationClass = keyof typeof MEDICATION_CLASSES;

export async function handler(
  medplum: MedplumClient,
  event: BotEvent
): Promise<{ processed: number; errors: number }> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;
  
  console.log(`PDC Calculator Bot started at ${new Date().toISOString()}`);
  
  try {
    // 1. Get all patients with active medications
    const patients = await getAllPatientsWithActiveMedications(medplum);
    console.log(`Found ${patients.length} patients to process`);
    
    // 2. Process each patient
    for (const patient of patients) {
      try {
        await processPatient(medplum, patient);
        processed++;
      } catch (error) {
        console.error(`Error processing patient ${patient.id}:`, error);
        errors++;
      }
      
      // Rate limiting - don't overwhelm the system
      if (processed % 100 === 0) {
        console.log(`Processed ${processed} patients...`);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`PDC Calculator completed in ${duration}ms. Processed: ${processed}, Errors: ${errors}`);
    
    return { processed, errors };
  } catch (error) {
    console.error('Fatal error in PDC Calculator:', error);
    throw error;
  }
}

async function getAllPatientsWithActiveMedications(
  medplum: MedplumClient
): Promise<Patient[]> {
  // Get unique patient IDs from active medication requests
  const medications = await medplum.searchResources('MedicationRequest', {
    status: 'active',
    _count: '1000',
  });
  
  const patientIds = [...new Set(
    medications
      .map(m => m.subject?.reference?.replace('Patient/', ''))
      .filter(Boolean)
  )];
  
  // Fetch patient details
  const patients: Patient[] = [];
  for (const id of patientIds) {
    try {
      const patient = await medplum.readResource('Patient', id!);
      patients.push(patient);
    } catch (error) {
      console.warn(`Could not fetch patient ${id}`);
    }
  }
  
  return patients;
}

async function processPatient(
  medplum: MedplumClient,
  patient: Patient
): Promise<void> {
  const patientId = patient.id!;
  
  // Calculate measurement period (last 365 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 365);
  
  // Process each medication class
  for (const medicationClass of Object.keys(MEDICATION_CLASSES) as MedicationClass[]) {
    const dispenses = await getDispensesForClass(medplum, patientId, medicationClass, startDate);
    
    if (dispenses.length < 2) {
      // Need at least 2 fills to calculate PDC
      continue;
    }
    
    const pdcResult = calculatePDC(dispenses, startDate, endDate);
    
    // Store as Observation
    await storePDCObservation(medplum, patientId, medicationClass, pdcResult);
    
    // Check if urgent task needed
    if (pdcResult.score < 0.80 || pdcResult.daysUntilGap <= 15) {
      await createUrgentTaskIfNeeded(medplum, patientId, medicationClass, pdcResult);
    }
  }
}

async function getDispensesForClass(
  medplum: MedplumClient,
  patientId: string,
  medicationClass: MedicationClass,
  startDate: Date
): Promise<MedicationDispense[]> {
  // In production, filter by RxNorm codes for the medication class
  return medplum.searchResources('MedicationDispense', {
    patient: `Patient/${patientId}`,
    whenhandedover: `ge${startDate.toISOString().split('T')[0]}`,
    _sort: 'whenhandedover',
  });
}

interface PDCResult {
  score: number;
  daysCovered: number;
  daysInPeriod: number;
  daysUntilGap: number;
  nextRefillDate: Date | null;
}

function calculatePDC(
  dispenses: MedicationDispense[],
  startDate: Date,
  endDate: Date
): PDCResult {
  // Simplified PDC calculation - see full spec in pdc-calculation.md
  const sortedDispenses = [...dispenses].sort(
    (a, b) => new Date(a.whenHandedOver!).getTime() - new Date(b.whenHandedOver!).getTime()
  );
  
  const coveredDays = new Set<string>();
  let lastCoverageEnd: Date | null = null;
  
  for (const dispense of sortedDispenses) {
    const fillDate = new Date(dispense.whenHandedOver!);
    const daysSupply = dispense.daysSupply?.value ?? 30;
    
    // Apply overlap adjustment
    let adjustedStart = fillDate;
    if (lastCoverageEnd && fillDate <= lastCoverageEnd) {
      adjustedStart = new Date(lastCoverageEnd);
      adjustedStart.setDate(adjustedStart.getDate() + 1);
    }
    
    // Mark covered days
    for (let i = 0; i < daysSupply; i++) {
      const day = new Date(adjustedStart);
      day.setDate(day.getDate() + i);
      
      if (day >= startDate && day <= endDate) {
        coveredDays.add(day.toISOString().split('T')[0]);
      }
    }
    
    lastCoverageEnd = new Date(adjustedStart);
    lastCoverageEnd.setDate(lastCoverageEnd.getDate() + daysSupply - 1);
  }
  
  const daysInPeriod = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  // Calculate days until next gap
  const today = new Date();
  const daysUntilGap = lastCoverageEnd 
    ? Math.ceil((lastCoverageEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  return {
    score: coveredDays.size / daysInPeriod,
    daysCovered: coveredDays.size,
    daysInPeriod,
    daysUntilGap: Math.max(0, daysUntilGap),
    nextRefillDate: lastCoverageEnd,
  };
}

async function storePDCObservation(
  medplum: MedplumClient,
  patientId: string,
  medicationClass: MedicationClass,
  pdcResult: PDCResult
): Promise<Observation> {
  return medplum.createResource<Observation>({
    resourceType: 'Observation',
    status: 'final',
    code: {
      coding: [{
        system: 'https://ignitehealth.com/metrics',
        code: `pdc-${medicationClass.toLowerCase()}`,
        display: MEDICATION_CLASSES[medicationClass],
      }],
    },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: Math.round(pdcResult.score * 100),
      unit: '%',
    },
    component: [
      {
        code: { text: 'Days Covered' },
        valueInteger: pdcResult.daysCovered,
      },
      {
        code: { text: 'Days Until Gap' },
        valueInteger: pdcResult.daysUntilGap,
      },
    ],
  });
}

async function createUrgentTaskIfNeeded(
  medplum: MedplumClient,
  patientId: string,
  medicationClass: MedicationClass,
  pdcResult: PDCResult
): Promise<void> {
  // Check if task already exists
  const existingTasks = await medplum.searchResources('Task', {
    patient: `Patient/${patientId}`,
    status: 'requested,in-progress',
    code: 'refill-review',
  });
  
  if (existingTasks.length > 0) {
    return; // Task already exists
  }
  
  const priority = pdcResult.daysUntilGap <= 3 ? 'urgent' : 
                   pdcResult.daysUntilGap <= 7 ? 'asap' : 'routine';
  
  await medplum.createResource({
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    priority,
    code: {
      coding: [{
        system: 'https://ignitehealth.com/task-types',
        code: 'refill-review',
      }],
    },
    description: `Review ${medicationClass} refill - ${pdcResult.daysUntilGap} days until gap. PDC: ${Math.round(pdcResult.score * 100)}%`,
    for: { reference: `Patient/${patientId}` },
    authoredOn: new Date().toISOString(),
    extension: [
      {
        url: 'https://ignitehealth.com/fhir/extensions/medication-class',
        valueCode: medicationClass,
      },
      {
        url: 'https://ignitehealth.com/fhir/extensions/pdc-score',
        valueDecimal: pdcResult.score,
      },
      {
        url: 'https://ignitehealth.com/fhir/extensions/days-until-gap',
        valueInteger: pdcResult.daysUntilGap,
      },
    ],
  });
}
```

### Pattern 2: AI Recommendation Bot

```typescript
/**
 * Bot: AI Recommendation Generator
 * Trigger: Subscription on Task creation
 * Purpose: Generate AI recommendations for refill reviews
 */

import { BotEvent, MedplumClient } from '@medplum/core';
import { Task, Patient, MedicationRequest, Condition } from '@medplum/fhirtypes';

// This would be imported from AI service
interface AIRecommendation {
  recommendation: 'approve' | 'deny' | 'review' | 'escalate';
  confidence: number;
  reasoning: string;
  riskFactors: string[];
  citations: string[];
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Task>
): Promise<void> {
  const task = event.input;
  
  // Only process refill-review tasks
  const taskCode = task.code?.coding?.[0]?.code;
  if (taskCode !== 'refill-review') {
    return;
  }
  
  console.log(`Processing AI recommendation for task ${task.id}`);
  
  try {
    // 1. Gather patient context
    const patientRef = task.for?.reference;
    if (!patientRef) {
      throw new Error('Task missing patient reference');
    }
    
    const patientId = patientRef.replace('Patient/', '');
    const context = await gatherPatientContext(medplum, patientId);
    
    // 2. Run safety checks (deterministic)
    const safetyResult = await runSafetyChecks(context);
    
    if (safetyResult.hasBlockingIssue) {
      // Don't use AI - safety check failed
      await updateTaskWithSafetyBlock(medplum, task, safetyResult);
      return;
    }
    
    // 3. Generate AI recommendation
    const aiRecommendation = await generateAIRecommendation(context, safetyResult);
    
    // 4. Validate AI output
    const validatedRecommendation = validateAIRecommendation(aiRecommendation);
    
    // 5. Update task with recommendation
    await updateTaskWithRecommendation(medplum, task, validatedRecommendation);
    
    console.log(`AI recommendation generated for task ${task.id}: ${validatedRecommendation.recommendation}`);
  } catch (error) {
    console.error(`Error generating recommendation for task ${task.id}:`, error);
    
    // Mark task as needing manual review
    await medplum.updateResource({
      ...task,
      extension: [
        ...(task.extension || []),
        {
          url: 'https://ignitehealth.com/fhir/extensions/ai-error',
          valueString: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    });
  }
}

interface PatientContext {
  patient: Patient;
  medications: MedicationRequest[];
  conditions: Condition[];
  pdcHistory: { date: string; score: number }[];
  allergies: string[];
}

async function gatherPatientContext(
  medplum: MedplumClient,
  patientId: string
): Promise<PatientContext> {
  const [patient, medications, conditions, observations, allergies] = await Promise.all([
    medplum.readResource('Patient', patientId),
    medplum.searchResources('MedicationRequest', { patient: `Patient/${patientId}`, status: 'active' }),
    medplum.searchResources('Condition', { patient: `Patient/${patientId}` }),
    medplum.searchResources('Observation', { 
      patient: `Patient/${patientId}`,
      code: 'pdc-mad,pdc-mac,pdc-mah',
      _sort: '-date',
      _count: '10',
    }),
    medplum.searchResources('AllergyIntolerance', { patient: `Patient/${patientId}` }),
  ]);
  
  return {
    patient,
    medications,
    conditions,
    pdcHistory: observations.map(o => ({
      date: o.effectiveDateTime || '',
      score: o.valueQuantity?.value || 0,
    })),
    allergies: allergies.map(a => a.code?.coding?.[0]?.display || ''),
  };
}

interface SafetyResult {
  hasBlockingIssue: boolean;
  issues: Array<{
    type: 'drug-interaction' | 'allergy' | 'contraindication' | 'lab-value';
    severity: 'high' | 'medium' | 'low';
    description: string;
  }>;
}

async function runSafetyChecks(context: PatientContext): Promise<SafetyResult> {
  // This should call deterministic safety checking systems
  // NOT AI - use database lookups
  
  const issues: SafetyResult['issues'] = [];
  
  // Drug-drug interactions (would use First Databank or DrugBank)
  // Allergy checks (exact matching)
  // Contraindication checks
  // Lab value checks
  
  return {
    hasBlockingIssue: issues.some(i => i.severity === 'high'),
    issues,
  };
}

async function generateAIRecommendation(
  context: PatientContext,
  safetyResult: SafetyResult
): Promise<AIRecommendation> {
  // This would call your AI service
  // For now, placeholder
  
  // In production:
  // 1. De-identify patient data
  // 2. Call AI service API
  // 3. Re-associate with patient
  
  return {
    recommendation: 'review',
    confidence: 0.85,
    reasoning: 'Placeholder - AI service not connected',
    riskFactors: [],
    citations: [],
  };
}

function validateAIRecommendation(rec: AIRecommendation): AIRecommendation {
  // Validate structure
  if (!['approve', 'deny', 'review', 'escalate'].includes(rec.recommendation)) {
    throw new Error('Invalid recommendation value');
  }
  
  if (rec.confidence < 0 || rec.confidence > 1) {
    throw new Error('Invalid confidence value');
  }
  
  // If confidence is low, force escalation
  if (rec.confidence < 0.70 && rec.recommendation === 'approve') {
    return {
      ...rec,
      recommendation: 'review',
      reasoning: `${rec.reasoning}\n\n[System: Downgraded to review due to low confidence]`,
    };
  }
  
  return rec;
}

async function updateTaskWithRecommendation(
  medplum: MedplumClient,
  task: Task,
  recommendation: AIRecommendation
): Promise<void> {
  await medplum.updateResource({
    ...task,
    extension: [
      ...(task.extension || []).filter(e => !e.url.includes('ai-')),
      {
        url: 'https://ignitehealth.com/fhir/extensions/ai-recommendation',
        valueCode: recommendation.recommendation,
      },
      {
        url: 'https://ignitehealth.com/fhir/extensions/ai-confidence',
        valueDecimal: recommendation.confidence,
      },
      {
        url: 'https://ignitehealth.com/fhir/extensions/ai-reasoning',
        valueString: recommendation.reasoning,
      },
    ],
  });
}

async function updateTaskWithSafetyBlock(
  medplum: MedplumClient,
  task: Task,
  safetyResult: SafetyResult
): Promise<void> {
  await medplum.updateResource({
    ...task,
    priority: 'urgent',
    extension: [
      ...(task.extension || []),
      {
        url: 'https://ignitehealth.com/fhir/extensions/safety-block',
        valueBoolean: true,
      },
      {
        url: 'https://ignitehealth.com/fhir/extensions/safety-issues',
        valueString: JSON.stringify(safetyResult.issues),
      },
    ],
  });
}
```

## Bot Deployment

### 1. Create Bot in Medplum

```bash
# Login to Medplum
npx medplum login

# Create bot
npx medplum bot create pdc-calculator

# This creates:
# - Bot resource in Medplum
# - Local src/bots/pdc-calculator/index.ts file
```

### 2. Deploy Bot

```bash
# Deploy a specific bot
npx medplum bot deploy pdc-calculator

# Deploy all bots
npx medplum bot deploy --all
```

### 3. Configure Trigger

For Cron trigger (in Medplum App):
1. Go to Bot resource
2. Add `cronTrigger` extension
3. Set cron expression: `0 2 * * *` (2 AM daily)

For Subscription trigger:
```typescript
// Create via code
await medplum.createResource({
  resourceType: 'Subscription',
  status: 'active',
  reason: 'Trigger AI recommendation on new tasks',
  criteria: 'Task?status=requested&code=refill-review',
  channel: {
    type: 'rest-hook',
    endpoint: `Bot/${botId}`,
  },
});
```

## Testing Bots

```typescript
import { MockClient } from '@medplum/mock';
import { handler } from './pdc-calculator';

describe('PDC Calculator Bot', () => {
  let medplum: MockClient;

  beforeEach(async () => {
    medplum = new MockClient();
    
    // Seed test data
    await medplum.createResource({
      resourceType: 'Patient',
      id: 'test-patient',
      name: [{ family: 'Test', given: ['Patient'] }],
    });
    
    // Add medication dispenses...
  });

  test('calculates PDC correctly', async () => {
    const result = await handler(medplum, { input: null });
    
    expect(result.processed).toBeGreaterThan(0);
    expect(result.errors).toBe(0);
  });
});
```

## Best Practices

1. **Always log** - Use `console.log` for audit trail
2. **Handle errors gracefully** - Don't let one patient failure stop entire batch
3. **Rate limit** - Don't overwhelm external services
4. **Validate inputs** - Bots receive untrusted data
5. **Keep bots focused** - One bot, one responsibility
6. **Test with MockClient** - Don't test against production
7. **Monitor execution** - Set up alerts for failures
