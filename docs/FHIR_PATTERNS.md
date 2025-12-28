# FHIR Patterns Guide

This guide documents how to work with FHIR resources in Ignite Health using Medplum.

---

## Core Principles

1. **Always use Medplum SDK** - Never use raw `fetch()` for FHIR operations
2. **Validate with Zod** - All data entering/exiting the system must be validated
3. **Use React hooks** - `useMedplum()`, `useSearchResources()`, `useResource()`
4. **Type everything** - Import types from `@medplum/fhirtypes`

---

## Setting Up Medplum

### In Components

```tsx
import { useMedplum, useSearchResources, useResource } from '@medplum/react';
import type { Patient, MedicationRequest } from '@medplum/fhirtypes';

function PatientList() {
  const medplum = useMedplum();

  // Search for resources
  const [patients] = useSearchResources('Patient', {
    _count: 50,
    _sort: '-_lastUpdated'
  });

  // Get single resource by reference
  const [patient] = useResource<Patient>('Patient', patientId);

  return (
    // ... render patients
  );
}
```

### In Server-Side Code

```typescript
import { MedplumClient } from '@medplum/core';

const medplum = new MedplumClient({
  baseUrl: process.env.MEDPLUM_BASE_URL,
  clientId: process.env.MEDPLUM_CLIENT_ID,
});

// Search
const patients = await medplum.searchResources('Patient', {
  name: 'Smith',
});

// Create
const newPatient = await medplum.createResource({
  resourceType: 'Patient',
  name: [{ given: ['John'], family: 'Smith' }],
});

// Update
const updated = await medplum.updateResource({
  ...patient,
  active: true,
});
```

---

## Common FHIR Resources

### Patient

Core patient demographics.

```typescript
import type { Patient } from '@medplum/fhirtypes';

// Search patients
const [patients] = useSearchResources('Patient', {
  name: searchTerm,
  _count: 50,
});

// Access patient data
const name = patient.name?.[0];
const fullName = `${name?.given?.join(' ')} ${name?.family}`;
const dob = patient.birthDate;
const mrn = patient.identifier?.find((id) => id.system === 'http://example.com/mrn')?.value;
```

### MedicationRequest

Active prescriptions.

```typescript
import type { MedicationRequest } from '@medplum/fhirtypes';

// Get patient's active medications
const [medications] = useSearchResources('MedicationRequest', {
  patient: `Patient/${patientId}`,
  status: 'active',
});

// Access medication data
const medication = medications[0];
const drugName = medication.medicationCodeableConcept?.text;
const prescriber = medication.requester?.display;
const quantity = medication.dispenseRequest?.quantity?.value;
```

### MedicationDispense

Pharmacy fill records (used for PDC calculation).

```typescript
import type { MedicationDispense } from '@medplum/fhirtypes';

// Get fill history for PDC calculation
const [dispenses] = useSearchResources('MedicationDispense', {
  patient: `Patient/${patientId}`,
  status: 'completed',
  _sort: '-whenHandedOver',
});

// Access dispense data
const fillDate = dispense.whenHandedOver;
const daysSupply = dispense.daysSupply?.value;
const quantity = dispense.quantity?.value;
```

### Task

Workflow items for staff review.

```typescript
import type { Task } from '@medplum/fhirtypes';

// Get pending tasks
const [tasks] = useSearchResources('Task', {
  status: 'requested',
  'business-status': 'pending-review',
});

// Create a new task
const newTask = await medplum.createResource<Task>({
  resourceType: 'Task',
  status: 'requested',
  intent: 'order',
  code: {
    coding: [
      {
        system: 'https://ignitehealth.com/task-types',
        code: 'refill-review',
        display: 'Refill Review',
      },
    ],
  },
  for: { reference: `Patient/${patientId}` },
  focus: { reference: `MedicationRequest/${medRequestId}` },
});

// Update task status
await medplum.updateResource({
  ...task,
  status: 'completed',
  businessStatus: {
    coding: [
      {
        system: 'https://ignitehealth.com/business-status',
        code: 'approved',
      },
    ],
  },
});
```

### Observation

Store calculated values like PDC scores.

```typescript
import type { Observation } from '@medplum/fhirtypes';

// Get patient's PDC observation
const [pdcObs] = useSearchResources('Observation', {
  patient: `Patient/${patientId}`,
  code: 'pdc-score',
  _sort: '-date',
  _count: 1,
});

// Create PDC observation
const pdcObservation = await medplum.createResource<Observation>({
  resourceType: 'Observation',
  status: 'final',
  code: {
    coding: [
      {
        system: 'https://ignitehealth.com/observations',
        code: 'pdc-score',
        display: 'PDC Score',
      },
    ],
  },
  subject: { reference: `Patient/${patientId}` },
  effectiveDateTime: new Date().toISOString(),
  valueQuantity: {
    value: 85.5,
    unit: '%',
    system: 'http://unitsofmeasure.org',
    code: '%',
  },
});
```

### AllergyIntolerance

For safety checking.

```typescript
import type { AllergyIntolerance } from '@medplum/fhirtypes';

// Get patient allergies
const [allergies] = useSearchResources('AllergyIntolerance', {
  patient: `Patient/${patientId}`,
  'clinical-status': 'active',
});

// Check for drug allergy
const hasDrugAllergy = allergies.some((allergy) =>
  allergy.code?.coding?.some((c) => c.code === drugCode)
);
```

---

## Data Validation with Zod

**Always validate before creating/updating resources.**

```typescript
import { z } from 'zod';
import type { Patient } from '@medplum/fhirtypes';

// Define schema
const PatientCreateSchema = z.object({
  resourceType: z.literal('Patient'),
  name: z
    .array(
      z.object({
        given: z.array(z.string()).min(1),
        family: z.string(),
      })
    )
    .min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
});

// Validate and create
async function createPatient(data: unknown): Promise<Patient> {
  const validated = PatientCreateSchema.parse(data);
  return await medplum.createResource(validated);
}
```

---

## Error Handling

Use Result pattern for operations that can fail.

```typescript
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

async function safeFhirOperation<T>(operation: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error('FHIR operation failed', error);
    return { success: false, error: error as Error };
  }
}

// Usage
const result = await safeFhirOperation(() => medplum.createResource(patient));

if (result.success) {
  console.log('Created:', result.data.id);
} else {
  console.error('Failed:', result.error.message);
}
```

---

## Audit Logging

Medplum automatically creates `AuditEvent` resources for all FHIR operations. No manual logging needed for standard operations.

For custom operations (AI recommendations, batch jobs):

```typescript
import type { AuditEvent } from '@medplum/fhirtypes';

// Create explicit audit event
await medplum.createResource<AuditEvent>({
  resourceType: 'AuditEvent',
  type: {
    system: 'http://dicom.nema.org/resources/ontology/DCM',
    code: '110106',
    display: 'Export',
  },
  action: 'C',
  recorded: new Date().toISOString(),
  outcome: '0',
  agent: [
    {
      who: { reference: `Practitioner/${userId}` },
      requestor: true,
    },
  ],
  source: {
    observer: { display: 'Ignite Health AI Engine' },
  },
  entity: [
    {
      what: { reference: `Patient/${patientId}` },
      type: {
        system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
        code: '1',
        display: 'Person',
      },
    },
  ],
});
```

---

## NEVER Do

1. **Never use raw fetch()**

   ```typescript
   // WRONG
   const response = await fetch('/fhir/Patient/123');

   // RIGHT
   const patient = await medplum.readResource('Patient', '123');
   ```

2. **Never skip validation**

   ```typescript
   // WRONG
   await medplum.createResource(userInput);

   // RIGHT
   const validated = PatientSchema.parse(userInput);
   await medplum.createResource(validated);
   ```

3. **Never hardcode FHIR URLs**

   ```typescript
   // WRONG
   const url = 'https://api.medplum.com/fhir/R4/Patient';

   // RIGHT - use the configured client
   const patients = await medplum.searchResources('Patient', {});
   ```

4. **Never store PHI in logs**

   ```typescript
   // WRONG
   console.log(`Processing patient ${patient.name[0].given.join(' ')}`);

   // RIGHT
   console.log(`Processing patient ${patient.id}`);
   ```

---

## Legacy Service Mapping

| Legacy (Firebase)               | New (Medplum FHIR)                              |
| ------------------------------- | ----------------------------------------------- |
| `firestoreService.getPatient()` | `medplum.readResource('Patient', id)`           |
| `patientService.search()`       | `useSearchResources('Patient', filters)`        |
| `rxClaimsService.getFills()`    | `useSearchResources('MedicationDispense', ...)` |
| `batchWorkflow.createTask()`    | `medplum.createResource<Task>(...)`             |
| Custom auth                     | Medplum OAuth2 / SMART on FHIR                  |

---

## Real-Time Updates

Use subscriptions for real-time data:

```typescript
import { useSubscription } from '@medplum/react';

function TaskQueue() {
  // Subscribe to task updates
  const [tasks] = useSubscription<Task>('Task', {
    status: 'requested'
  });

  return (
    // Automatically updates when tasks change
    <TaskList tasks={tasks} />
  );
}
```

---

## References

- [Medplum SDK Docs](https://docs.medplum.com/sdk)
- [FHIR R4 Spec](https://hl7.org/fhir/R4)
- [Medplum React Components](https://docs.medplum.com/react)
- [SMART on FHIR](https://docs.smarthealthit.org/)
