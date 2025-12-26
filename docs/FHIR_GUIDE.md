# FHIR Guide for Ignite Health

## What is FHIR?

FHIR (Fast Healthcare Interoperability Resources) is the modern standard for exchanging healthcare data. Think of it as:
- **REST API** for healthcare
- **JSON-based** (also XML, but we use JSON)
- **Resource-oriented** (like REST resources)

## Mental Model

If you know databases:
```
Traditional DB          →  FHIR
─────────────────────────────────────
Table                   →  ResourceType
Row                     →  Resource
Column                  →  Field/Element
Foreign Key             →  Reference
Custom Column           →  Extension
```

If you know REST APIs:
```
REST                    →  FHIR
─────────────────────────────────────
GET /users/123          →  GET /Patient/123
POST /users             →  POST /Patient
GET /users?name=john    →  GET /Patient?name=john
```

## Core Resources We Use

### 1. Patient
The central resource. Every other clinical resource links to a Patient.

```json
{
  "resourceType": "Patient",
  "id": "patient-123",
  "identifier": [
    {
      "system": "http://hospital.example.org/mrn",
      "value": "MRN12345"
    }
  ],
  "name": [
    {
      "use": "official",
      "family": "Smith",
      "given": ["John", "Michael"]
    }
  ],
  "birthDate": "1955-03-15",
  "gender": "male",
  "telecom": [
    {
      "system": "phone",
      "value": "555-1234",
      "use": "mobile"
    }
  ]
}
```

### 2. MedicationRequest
A prescription or medication order.

```json
{
  "resourceType": "MedicationRequest",
  "id": "medrx-456",
  "status": "active",
  "intent": "order",
  "medicationCodeableConcept": {
    "coding": [
      {
        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
        "code": "860975",
        "display": "Metformin 500 MG Oral Tablet"
      }
    ]
  },
  "subject": {
    "reference": "Patient/patient-123"
  },
  "authoredOn": "2024-01-15",
  "dosageInstruction": [
    {
      "text": "Take 1 tablet by mouth twice daily",
      "timing": {
        "repeat": {
          "frequency": 2,
          "period": 1,
          "periodUnit": "d"
        }
      },
      "doseAndRate": [
        {
          "doseQuantity": {
            "value": 1,
            "unit": "tablet"
          }
        }
      ]
    }
  ],
  "dispenseRequest": {
    "numberOfRepeatsAllowed": 3,
    "quantity": {
      "value": 60,
      "unit": "tablets"
    },
    "expectedSupplyDuration": {
      "value": 30,
      "unit": "days"
    }
  }
}
```

### 3. MedicationDispense
Record of a pharmacy fill - THIS IS CRITICAL FOR PDC.

```json
{
  "resourceType": "MedicationDispense",
  "id": "dispense-789",
  "status": "completed",
  "medicationCodeableConcept": {
    "coding": [
      {
        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
        "code": "860975",
        "display": "Metformin 500 MG Oral Tablet"
      }
    ]
  },
  "subject": {
    "reference": "Patient/patient-123"
  },
  "authorizingPrescription": [
    {
      "reference": "MedicationRequest/medrx-456"
    }
  ],
  "quantity": {
    "value": 60,
    "unit": "tablets"
  },
  "daysSupply": {
    "value": 30,
    "unit": "days"
  },
  "whenHandedOver": "2024-01-20T10:30:00Z"
}
```

### 4. Task
Workflow item - we use this for refill review queue.

```json
{
  "resourceType": "Task",
  "id": "task-abc",
  "status": "requested",
  "intent": "order",
  "priority": "urgent",
  "code": {
    "coding": [
      {
        "system": "https://ignitehealth.com/task-types",
        "code": "refill-review",
        "display": "Medication Refill Review"
      }
    ]
  },
  "description": "Review upcoming metformin refill - 5 days until gap",
  "for": {
    "reference": "Patient/patient-123"
  },
  "focus": {
    "reference": "MedicationRequest/medrx-456"
  },
  "authoredOn": "2024-02-10T08:00:00Z",
  "restriction": {
    "period": {
      "end": "2024-02-15T23:59:59Z"
    }
  }
}
```

### 5. Observation
Clinical observations - we use for PDC scores and risk assessments.

```json
{
  "resourceType": "Observation",
  "id": "obs-pdc-123",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "https://ignitehealth.com/observation-category",
          "code": "adherence-metric"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "https://ignitehealth.com/metrics",
        "code": "pdc-mad",
        "display": "PDC - Medication Adherence for Diabetes"
      }
    ]
  },
  "subject": {
    "reference": "Patient/patient-123"
  },
  "effectiveDateTime": "2024-02-01",
  "valueQuantity": {
    "value": 0.85,
    "unit": "%",
    "system": "http://unitsofmeasure.org",
    "code": "%"
  },
  "interpretation": [
    {
      "coding": [
        {
          "system": "https://ignitehealth.com/adherence-status",
          "code": "adherent",
          "display": "Adherent (≥80%)"
        }
      ]
    }
  ]
}
```

## Extensions (Custom Fields)

FHIR allows adding custom fields via extensions:

```json
{
  "resourceType": "Patient",
  "id": "patient-123",
  "name": [{ "family": "Smith", "given": ["John"] }],
  
  "extension": [
    {
      "url": "https://ignitehealth.com/fhir/extensions/risk-level",
      "valueCode": "high"
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/ai-recommendation",
      "extension": [
        {
          "url": "recommendation",
          "valueCode": "approve-refill"
        },
        {
          "url": "confidence",
          "valueDecimal": 0.92
        },
        {
          "url": "reasoning",
          "valueString": "Patient shows consistent adherence..."
        }
      ]
    }
  ]
}
```

## FHIR Search Syntax

### Basic Searches
```
# Get patient by ID
GET /Patient/patient-123

# Search patients by name
GET /Patient?name=smith

# Search with multiple parameters
GET /Patient?name=smith&birthdate=1955-03-15

# Search by identifier
GET /Patient?identifier=MRN12345
```

### Reference Searches
```
# Get medications for a patient
GET /MedicationRequest?patient=Patient/patient-123

# Get dispenses for a medication
GET /MedicationDispense?prescription=MedicationRequest/medrx-456
```

### Date Searches
```
# Exact date
GET /MedicationDispense?whenhandedover=2024-01-20

# Date range
GET /MedicationDispense?whenhandedover=ge2024-01-01&whenhandedover=le2024-01-31

# Prefixes: eq (equal), ne (not equal), gt, lt, ge, le, sa (starts after), eb (ends before)
```

### Include Related Resources
```
# Get patient with their medications
GET /Patient?_id=patient-123&_revinclude=MedicationRequest:patient

# Get medication request with patient included
GET /MedicationRequest?_id=medrx-456&_include=MedicationRequest:patient
```

### Sorting and Pagination
```
# Sort by date descending
GET /MedicationDispense?_sort=-whenhandedover

# Pagination
GET /Patient?_count=20&_offset=40
```

## Medplum-Specific Features

### Using MedplumClient
```typescript
import { MedplumClient } from '@medplum/core';
import { Patient, MedicationRequest } from '@medplum/fhirtypes';

const medplum = new MedplumClient({
  baseUrl: 'https://api.medplum.com/',
});

// Authenticate
await medplum.startLogin({ email, password });

// Read a resource
const patient = await medplum.readResource('Patient', 'patient-123');

// Search resources
const medications = await medplum.searchResources('MedicationRequest', {
  patient: 'Patient/patient-123',
  status: 'active',
});

// Create a resource
const newTask = await medplum.createResource<Task>({
  resourceType: 'Task',
  status: 'requested',
  intent: 'order',
  for: { reference: 'Patient/patient-123' },
});

// Update a resource
await medplum.updateResource({
  ...task,
  status: 'in-progress',
});
```

### Medplum React Hooks
```typescript
import { useMedplum, useMedplumProfile, useSearch } from '@medplum/react';

function PatientList() {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  
  // Search with React Query integration
  const [patients] = useSearch('Patient', { name: 'smith' });
  
  return (
    <ul>
      {patients?.entry?.map(e => (
        <li key={e.resource.id}>{e.resource.name?.[0]?.family}</li>
      ))}
    </ul>
  );
}
```

### Medplum Subscriptions (Real-time)
```typescript
// Subscribe to Task changes
const subscription = await medplum.createResource<Subscription>({
  resourceType: 'Subscription',
  status: 'active',
  reason: 'Monitor task updates',
  criteria: 'Task?status=requested',
  channel: {
    type: 'websocket',
  },
});

// Listen for changes
medplum.subscribeToCriteria('Task?status=requested', (bundle) => {
  console.log('Task updated:', bundle);
});
```

## Common Patterns for Ignite Health

### Get All Active Medications for Patient
```typescript
async function getActiveMedications(patientId: string) {
  return medplum.searchResources('MedicationRequest', {
    patient: `Patient/${patientId}`,
    status: 'active',
  });
}
```

### Get Dispense History for PDC Calculation
```typescript
async function getDispenseHistory(
  patientId: string,
  startDate: string,
  endDate: string
) {
  return medplum.searchResources('MedicationDispense', {
    patient: `Patient/${patientId}`,
    whenhandedover: `ge${startDate}`,
    _sort: 'whenhandedover',
  });
}
```

### Create Refill Review Task
```typescript
async function createRefillTask(
  patientId: string,
  medicationId: string,
  urgency: 'routine' | 'urgent' | 'asap'
) {
  return medplum.createResource<Task>({
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    priority: urgency,
    code: {
      coding: [{
        system: 'https://ignitehealth.com/task-types',
        code: 'refill-review',
      }],
    },
    for: { reference: `Patient/${patientId}` },
    focus: { reference: `MedicationRequest/${medicationId}` },
    authoredOn: new Date().toISOString(),
  });
}
```

### Store PDC Score as Observation
```typescript
async function storePDCScore(
  patientId: string,
  measureType: 'pdc-mad' | 'pdc-mac' | 'pdc-mah',
  score: number,
  measurementDate: string
) {
  return medplum.createResource<Observation>({
    resourceType: 'Observation',
    status: 'final',
    code: {
      coding: [{
        system: 'https://ignitehealth.com/metrics',
        code: measureType,
      }],
    },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: measurementDate,
    valueQuantity: {
      value: score,
      unit: '%',
      system: 'http://unitsofmeasure.org',
      code: '%',
    },
  });
}
```

## Terminology Systems

| System | URL | Use |
|--------|-----|-----|
| RxNorm | `http://www.nlm.nih.gov/research/umls/rxnorm` | Medication codes |
| SNOMED CT | `http://snomed.info/sct` | Clinical findings, procedures |
| ICD-10-CM | `http://hl7.org/fhir/sid/icd-10-cm` | Diagnoses |
| LOINC | `http://loinc.org` | Lab tests |
| CPT | `http://www.ama-assn.org/go/cpt` | Procedures |

## Visualizing FHIR

### Medplum App UI
Access at https://app.medplum.com - provides:
- Resource explorer
- GraphQL playground
- Bot management
- Access policy configuration

### FHIR Path Testing
```typescript
import { evalFhirPath } from '@medplum/core';

const patient = { /* ... */ };

// Extract values using FHIRPath
const familyName = evalFhirPath('name.family', patient);
const mobilePhone = evalFhirPath("telecom.where(use='mobile').value", patient);
```

### VS Code Extensions
1. **FHIR Tools by Firely** - Syntax highlighting, validation
2. **REST Client** - Test FHIR API calls directly

## Resources

- [FHIR R4 Specification](https://hl7.org/fhir/R4)
- [US Core Implementation Guide](https://hl7.org/fhir/us/core)
- [Medplum Documentation](https://docs.medplum.com)
- [Medplum React Components](https://docs.medplum.com/docs/ui-components)
- [FHIR Search Specification](https://hl7.org/fhir/R4/search.html)
