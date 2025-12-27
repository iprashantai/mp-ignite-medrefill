# Medplum Integration Guide

This guide covers how Ignite Health integrates with Medplum, the FHIR platform at the heart of our application.

---

## What is Medplum?

Medplum is an open-source, HIPAA-compliant healthcare platform that provides:

- **FHIR Server**: Full R4 spec compliance
- **Authentication**: OAuth2/OIDC, SMART on FHIR
- **React Components**: Production-grade UI
- **Bots**: Server-side automation
- **Subscriptions**: Real-time updates
- **Access Policies**: Fine-grained permissions

**Why Medplum?**
- Day 1 FHIR compliance (vs. 6-12 months building from scratch)
- HIPAA-compliant out of the box
- Open source (Apache 2.0)
- Active community and support
- Built by healthcare veterans

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Ignite Health (Next.js)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  MedplumProvider│  │ Medplum Hooks   │  │ Medplum         │ │
│  │  (Context)      │  │ useSearchRes... │  │ Components      │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                 │
│                         MedplumClient                           │
│                                │                                 │
└────────────────────────────────┼─────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Medplum Cloud                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ FHIR API        │  │ PostgreSQL      │  │ Bots (Lambda)   │ │
│  │ /fhir/R4/*      │  │ (JSONB storage) │  │ Server-side     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Provider Setup

### Root Provider Configuration

**File: `src/lib/medplum/provider.tsx`**

```typescript
'use client';

import { MedplumClient } from '@medplum/core';
import { MedplumProvider as BaseMedplumProvider } from '@medplum/react';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

// IMPORTANT: Mantine is REQUIRED for Medplum React components
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@medplum/react/styles.css';

export function MedplumProvider({ children }: { children: React.ReactNode }) {
  const medplum = useMemo(() => {
    return new MedplumClient({
      baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL,
      clientId: process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
      onUnauthenticated: () => {
        window.location.href = '/login';
      },
    });
  }, []);

  return (
    <MantineProvider theme={theme}>
      <Notifications />
      <BaseMedplumProvider medplum={medplum}>
        {children}
      </BaseMedplumProvider>
    </MantineProvider>
  );
}
```

### App Layout Integration

**File: `src/app/layout.tsx`**

```typescript
import { MedplumProvider } from '@/lib/medplum/provider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <MedplumProvider>{children}</MedplumProvider>
      </body>
    </html>
  );
}
```

---

## Authentication

### OAuth2 PKCE Flow

```typescript
// 1. Start PKCE flow (login page)
const pkce = await medplum.startPkce();

// 2. Build authorization URL
const authUrl = new URL('oauth2/authorize', baseUrl);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('scope', 'openid profile');
authUrl.searchParams.set('code_challenge', pkce.codeChallenge);
authUrl.searchParams.set('code_challenge_method', pkce.codeChallengeMethod);

// 3. Redirect user
window.location.href = authUrl.toString();

// 4. Handle callback (after redirect back)
await medplum.processCode(code);  // Exchanges code for tokens
```

### Auth Hooks

```typescript
// Check authentication state
const profile = useMedplumProfile();  // Returns current user or undefined

// Custom auth hook
function useAuth() {
  const medplum = useMedplum();
  const profile = useMedplumProfile();

  return {
    isAuthenticated: !!profile,
    isLoading: medplum.isLoading(),
    profile,
    login: () => window.location.href = '/login',
    logout: async () => {
      await medplum.signOut();
      window.location.href = '/login';
    },
  };
}
```

---

## Data Fetching

### Using Hooks (Recommended)

```typescript
import { useSearchResources } from '@medplum/react';

function PatientList() {
  // Returns [resources[], loading]
  const [patients, loading] = useSearchResources('Patient', {
    active: 'true',
    _sort: '-_lastUpdated',
    _count: '50',
  });

  if (loading) return <LoadingSpinner />;

  return patients?.map(p => <PatientRow key={p.id} patient={p} />);
}
```

### Using MedplumClient Directly

```typescript
import { useMedplum } from '@medplum/react';

function PatientActions() {
  const medplum = useMedplum();

  const fetchPatient = async (id: string) => {
    const patient = await medplum.readResource('Patient', id);
    return patient;
  };

  const createTask = async (task: Task) => {
    const created = await medplum.createResource(task);
    return created;
  };

  const updateTask = async (task: Task) => {
    const updated = await medplum.updateResource(task);
    return updated;
  };
}
```

### Search Operations

```typescript
// Basic search
const patients = await medplum.searchResources('Patient', {
  name: 'smith',
});

// Search with multiple parameters
const tasks = await medplum.searchResources('Task', {
  status: 'requested,in-progress',
  'for': `Patient/${patientId}`,
  _sort: '-authored-on',
  _count: '100',
});

// Include related resources
const bundle = await medplum.search('MedicationRequest', {
  patient: `Patient/${patientId}`,
  _include: 'MedicationRequest:medication',
});

// Date range queries
const dispenses = await medplum.searchResources('MedicationDispense', {
  patient: `Patient/${patientId}`,
  whenhandedover: 'ge2024-01-01',
});
```

---

## Native Components

### SearchControl

Full-featured search UI with filtering, sorting, pagination:

```typescript
import { SearchControl } from '@medplum/react';
import { SearchRequest } from '@medplum/core';

function PatientSearch() {
  const [search, setSearch] = useState<SearchRequest>({
    resourceType: 'Patient',
    fields: ['id', 'name', 'birthDate', 'gender'],
    count: 10,
  });

  return (
    <SearchControl
      search={search}
      onChange={(e) => setSearch(e.definition)}
      onClick={(e) => handlePatientClick(e.resource)}
      hideFilters={false}
      hideToolbar={false}
    />
  );
}
```

### ResourceTable

Display any FHIR resource as a table:

```typescript
import { ResourceTable } from '@medplum/react';

<ResourceTable value={patient} />
```

### ResourceForm

Auto-generated forms for any resource type:

```typescript
import { ResourceForm } from '@medplum/react';

<ResourceForm
  defaultValue={{ resourceType: 'Task' }}
  onSubmit={(resource) => medplum.createResource(resource)}
/>
```

### SignInForm

Complete authentication form:

```typescript
import { SignInForm } from '@medplum/react';

<SignInForm
  onSuccess={() => router.push('/')}
  projectId={projectId}
/>
```

---

## Custom Hooks

### Patient-Related Hooks

```typescript
// Fetch active medications for a patient
export function useMedications(patientId?: string) {
  return useSearchResources('MedicationRequest', patientId ? {
    patient: `Patient/${patientId}`,
    status: 'active',
    _sort: '-authoredon',
  } : undefined);
}

// Fetch refill review tasks
export function useRefillQueue() {
  return useSearchResources('Task', {
    status: 'requested,received,accepted,in-progress',
    code: 'refill-review',
    _sort: 'priority,-authored-on',
    _count: '100',
  });
}
```

---

## FHIR Resources We Use

| Resource | Purpose | Key Fields |
|----------|---------|------------|
| `Patient` | Demographics | `name`, `birthDate`, `gender` |
| `MedicationRequest` | Prescriptions | `status`, `medication`, `dosage` |
| `MedicationDispense` | Pharmacy fills | `daysSupply`, `whenHandedOver` |
| `Task` | Workflow items | `status`, `priority`, `for` |
| `Observation` | PDC scores | `code`, `valueQuantity` |
| `Condition` | Diagnoses | `code`, `clinicalStatus` |
| `AllergyIntolerance` | Allergies | `code`, `criticality` |

---

## Custom Extensions

Add custom fields to FHIR resources:

```typescript
// Define extension structure
interface PDCExtension {
  url: 'https://ignitehealth.com/fhir/extensions/pdc-score';
  extension: [
    { url: 'class'; valueCode: 'MAD' | 'MAC' | 'MAH' },
    { url: 'score'; valueDecimal: number },
    { url: 'calculatedAt'; valueDateTime: string }
  ];
}

// Use in a Patient resource
const patientWithPDC: Patient = {
  resourceType: 'Patient',
  name: [{ family: 'Smith', given: ['John'] }],
  extension: [
    {
      url: 'https://ignitehealth.com/fhir/extensions/pdc-score',
      extension: [
        { url: 'class', valueCode: 'MAD' },
        { url: 'score', valueDecimal: 0.85 },
        { url: 'calculatedAt', valueDateTime: '2024-12-27T00:00:00Z' }
      ]
    }
  ]
};
```

---

## Medplum Bots

Server-side functions that run on triggers:

### Bot Structure

```typescript
// src/bots/pdc-calculator/index.ts
import { BotEvent, MedplumClient } from '@medplum/core';
import { Task } from '@medplum/fhirtypes';

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Task>
): Promise<void> {
  const task = event.input;

  console.log(`Processing task ${task.id}`);

  // Bot logic here...

  await medplum.updateResource({
    ...task,
    status: 'completed',
  });
}
```

### Deploying Bots

```bash
# Login to Medplum CLI
npx medplum login

# Deploy bot
npx medplum bot deploy pdc-calculator
```

---

## Subscriptions (Real-time Updates)

```typescript
import { useMedplum } from '@medplum/react';

function TaskWatcher() {
  const medplum = useMedplum();

  useEffect(() => {
    // Subscribe to Task changes
    const subscription = medplum.subscribeToCriteria(
      'Task?status=requested',
      (bundle) => {
        console.log('New task:', bundle);
        // Refresh your UI
      }
    );

    return () => subscription.unsubscribe();
  }, [medplum]);
}
```

---

## Best Practices

### 1. Always Use Type-Safe FHIR Types

```typescript
// GOOD
import { Patient, MedicationRequest } from '@medplum/fhirtypes';

const patient: Patient = { ... };

// BAD
const patient: any = { ... };
```

### 2. Use Hooks in Client Components

```typescript
// GOOD - let Medplum handle caching
const [patients, loading] = useSearchResources('Patient', {...});

// BAD - manual fetching without caching
const [patients, setPatients] = useState([]);
useEffect(() => {
  medplum.searchResources('Patient', {...}).then(setPatients);
}, []);
```

### 3. Prefer Native Components

```typescript
// GOOD - use Medplum's production-grade components
<SearchControl search={search} />
<ResourceTable value={resource} />

// BAD - build custom when not needed
<CustomTable data={resources} />  // Missing pagination, filtering, etc.
```

### 4. Handle Loading States

```typescript
function PatientView() {
  const [patient, loading] = useResource('Patient', patientId);

  if (loading) return <Skeleton />;
  if (!patient) return <NotFound />;

  return <PatientDisplay patient={patient} />;
}
```

---

## Resources

- **Medplum Docs**: https://docs.medplum.com
- **Medplum GitHub**: https://github.com/medplum/medplum
- **Medplum Discord**: https://discord.gg/medplum
- **React Components API**: https://docs.medplum.com/docs/ui-components
- **FHIR R4 Spec**: https://hl7.org/fhir/R4
