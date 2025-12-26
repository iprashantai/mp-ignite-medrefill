# Skill: FHIR Resource Operations

## When to Use
Use this skill when:
- Creating new FHIR resources
- Querying FHIR resources
- Updating FHIR resources
- Working with FHIR extensions
- Implementing FHIR search

## Required Knowledge

### FHIR Resource Structure
Every FHIR resource has:
```typescript
{
  resourceType: string;      // e.g., "Patient", "Task"
  id?: string;               // Assigned by server on create
  meta?: {                   // Metadata
    versionId?: string;
    lastUpdated?: string;
  };
  // Resource-specific fields...
}
```

### Medplum Client Usage
```typescript
import { MedplumClient } from '@medplum/core';
import { Patient, Task, MedicationRequest } from '@medplum/fhirtypes';

// Get client (from context or create)
const medplum = useMedplum(); // In React component
// OR
const medplum = new MedplumClient({ baseUrl: process.env.MEDPLUM_BASE_URL });
```

## Implementation Patterns

### Pattern 1: Type-Safe Resource Creation

```typescript
import { z } from 'zod';
import { Task } from '@medplum/fhirtypes';

// 1. Define Zod schema for validation
const CreateTaskSchema = z.object({
  patientId: z.string().min(1),
  medicationRequestId: z.string().min(1),
  priority: z.enum(['routine', 'urgent', 'asap', 'stat']),
  description: z.string().min(1),
  dueDate: z.string().datetime().optional(),
});

type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// 2. Result type for error handling
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: Error };

// 3. Implementation
async function createRefillTask(
  medplum: MedplumClient,
  input: CreateTaskInput
): Promise<Result<Task>> {
  // Validate input
  const validation = CreateTaskSchema.safeParse(input);
  if (!validation.success) {
    return { 
      success: false, 
      error: new Error(`Validation failed: ${validation.error.message}`) 
    };
  }

  const { patientId, medicationRequestId, priority, description, dueDate } = validation.data;

  try {
    const task = await medplum.createResource<Task>({
      resourceType: 'Task',
      status: 'requested',
      intent: 'order',
      priority,
      code: {
        coding: [{
          system: 'https://ignitehealth.com/task-types',
          code: 'refill-review',
          display: 'Medication Refill Review',
        }],
      },
      description,
      for: { reference: `Patient/${patientId}` },
      focus: { reference: `MedicationRequest/${medicationRequestId}` },
      authoredOn: new Date().toISOString(),
      ...(dueDate && {
        restriction: {
          period: { end: dueDate },
        },
      }),
    });

    return { success: true, data: task };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}
```

### Pattern 2: Type-Safe Resource Queries

```typescript
import { SearchRequest, Bundle } from '@medplum/core';
import { MedicationRequest } from '@medplum/fhirtypes';

// Define search parameters schema
const SearchMedicationsSchema = z.object({
  patientId: z.string(),
  status: z.enum(['active', 'completed', 'cancelled', 'entered-in-error']).optional(),
  medicationClass: z.enum(['MAD', 'MAC', 'MAH']).optional(),
});

async function searchMedications(
  medplum: MedplumClient,
  params: z.infer<typeof SearchMedicationsSchema>
): Promise<Result<MedicationRequest[]>> {
  const validation = SearchMedicationsSchema.safeParse(params);
  if (!validation.success) {
    return { success: false, error: new Error(validation.error.message) };
  }

  try {
    const searchRequest: SearchRequest<MedicationRequest> = {
      resourceType: 'MedicationRequest',
      filters: [
        { code: 'patient', value: `Patient/${params.patientId}` },
        ...(params.status ? [{ code: 'status', value: params.status }] : []),
      ],
      sortRules: [{ code: '-authoredon' }],
    };

    const medications = await medplum.searchResources(searchRequest);
    return { success: true, data: medications };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Search failed') 
    };
  }
}
```

### Pattern 3: Working with Extensions

```typescript
import { Patient, Extension } from '@medplum/fhirtypes';

// Extension URLs (centralize these)
const EXTENSION_URLS = {
  pdcScore: 'https://ignitehealth.com/fhir/extensions/pdc-score',
  riskLevel: 'https://ignitehealth.com/fhir/extensions/risk-level',
  aiRecommendation: 'https://ignitehealth.com/fhir/extensions/ai-recommendation',
} as const;

// Type-safe extension getter
function getExtension<T>(
  resource: { extension?: Extension[] },
  url: string
): T | undefined {
  const ext = resource.extension?.find(e => e.url === url);
  if (!ext) return undefined;
  
  // Return the value based on type
  if ('valueDecimal' in ext) return ext.valueDecimal as T;
  if ('valueString' in ext) return ext.valueString as T;
  if ('valueCode' in ext) return ext.valueCode as T;
  if ('valueInteger' in ext) return ext.valueInteger as T;
  
  return undefined;
}

// Type-safe extension setter
function setExtension(
  resource: { extension?: Extension[] },
  url: string,
  value: string | number | boolean
): void {
  if (!resource.extension) {
    resource.extension = [];
  }
  
  const existing = resource.extension.findIndex(e => e.url === url);
  const newExt: Extension = { url };
  
  if (typeof value === 'number') {
    newExt.valueDecimal = value;
  } else if (typeof value === 'string') {
    newExt.valueString = value;
  } else if (typeof value === 'boolean') {
    newExt.valueBoolean = value;
  }
  
  if (existing >= 0) {
    resource.extension[existing] = newExt;
  } else {
    resource.extension.push(newExt);
  }
}

// Usage
const patient = await medplum.readResource('Patient', patientId);
const pdcScore = getExtension<number>(patient, EXTENSION_URLS.pdcScore);

setExtension(patient, EXTENSION_URLS.riskLevel, 'high');
await medplum.updateResource(patient);
```

### Pattern 4: Batch Operations

```typescript
import { Bundle, BundleEntry } from '@medplum/fhirtypes';

async function createMultipleTasks(
  medplum: MedplumClient,
  tasks: Array<{ patientId: string; description: string }>
): Promise<Result<Task[]>> {
  try {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: tasks.map((t, index) => ({
        fullUrl: `urn:uuid:task-${index}`,
        resource: {
          resourceType: 'Task',
          status: 'requested',
          intent: 'order',
          for: { reference: `Patient/${t.patientId}` },
          description: t.description,
        } as Task,
        request: {
          method: 'POST',
          url: 'Task',
        },
      })),
    };

    const result = await medplum.executeBatch(bundle);
    
    const createdTasks = result.entry
      ?.filter(e => e.response?.status === '201')
      .map(e => e.resource as Task) ?? [];
    
    return { success: true, data: createdTasks };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## Validation Rules

### Required Fields by Resource Type

#### Patient
```typescript
const PatientSchema = z.object({
  resourceType: z.literal('Patient'),
  name: z.array(z.object({
    family: z.string().min(1),
    given: z.array(z.string()).min(1),
  })).min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

#### MedicationRequest
```typescript
const MedicationRequestSchema = z.object({
  resourceType: z.literal('MedicationRequest'),
  status: z.enum(['active', 'on-hold', 'cancelled', 'completed', 'entered-in-error', 'stopped', 'draft', 'unknown']),
  intent: z.enum(['proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'option']),
  subject: z.object({
    reference: z.string().startsWith('Patient/'),
  }),
  medicationCodeableConcept: z.object({
    coding: z.array(z.object({
      system: z.string(),
      code: z.string(),
    })).min(1),
  }),
});
```

#### Task
```typescript
const TaskSchema = z.object({
  resourceType: z.literal('Task'),
  status: z.enum(['draft', 'requested', 'received', 'accepted', 'rejected', 'ready', 'cancelled', 'in-progress', 'on-hold', 'failed', 'completed', 'entered-in-error']),
  intent: z.enum(['unknown', 'proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'option']),
});
```

## Common Mistakes to Avoid

1. **Don't use `any` type** - Always use proper FHIR types from `@medplum/fhirtypes`
2. **Don't skip validation** - Always validate input with Zod before creating/updating
3. **Don't ignore errors** - Use Result pattern for proper error handling
4. **Don't hardcode IDs** - Use references properly: `Patient/${id}` not just `${id}`
5. **Don't forget meta fields** - They're managed by server, don't set manually

## Testing

```typescript
import { MockClient } from '@medplum/mock';

describe('FHIR Operations', () => {
  let medplum: MockClient;

  beforeEach(() => {
    medplum = new MockClient();
  });

  test('creates task with valid input', async () => {
    const result = await createRefillTask(medplum, {
      patientId: 'patient-123',
      medicationRequestId: 'medrx-456',
      priority: 'urgent',
      description: 'Review metformin refill',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.resourceType).toBe('Task');
      expect(result.data.status).toBe('requested');
    }
  });

  test('rejects invalid input', async () => {
    const result = await createRefillTask(medplum, {
      patientId: '', // Invalid
      medicationRequestId: 'medrx-456',
      priority: 'urgent',
      description: 'Test',
    });

    expect(result.success).toBe(false);
  });
});
```
