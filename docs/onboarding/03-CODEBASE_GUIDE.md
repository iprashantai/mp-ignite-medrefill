# Codebase Guide

A detailed walkthrough of the Ignite Health codebase structure and patterns.

---

## Directory Structure

```
mp-ignite-medrefill/
├── docs/                      # Documentation
│   ├── onboarding/           # Developer onboarding guides
│   ├── plans/                # Implementation plans
│   ├── ARCHITECTURE.md       # System architecture
│   ├── FHIR_GUIDE.md         # FHIR reference
│   └── IMPLEMENTATION_ROADMAP.md
│
├── neo4j/                     # Neo4j configuration
│   ├── import/               # CSV import directory
│   ├── scripts/              # Cypher scripts
│   └── dashboards/           # NeoDash dashboards
│
├── scripts/                   # Development scripts
│   ├── bootstrap.sh          # First-time setup
│   ├── dev.sh                # Development utilities
│   └── upload-synthea.ts     # Test data loader
│
├── src/                       # Source code
│   ├── app/                  # Next.js App Router
│   ├── components/           # React components
│   ├── lib/                  # Shared libraries
│   ├── schemas/              # Zod validation
│   ├── types/                # TypeScript types
│   ├── bots/                 # Medplum bots
│   └── test/                 # Test setup
│
├── CLAUDE.md                  # AI development context
├── docker-compose.yml         # Neo4j services
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript config
```

---

## App Router Structure (`src/app/`)

Next.js 15 App Router with route groups:

```
src/app/
├── layout.tsx                 # Root layout (MedplumProvider)
├── globals.css               # Global styles
│
├── (auth)/                   # Authentication routes (no auth required)
│   ├── login/
│   │   └── page.tsx         # Login page
│   └── callback/
│       └── page.tsx         # OAuth callback handler
│
├── (dashboard)/              # Protected routes (auth required)
│   ├── layout.tsx           # Dashboard layout (sidebar)
│   ├── page.tsx             # Dashboard home
│   │
│   ├── dev/                 # Developer tools
│   │   ├── explorer/
│   │   │   └── page.tsx    # FHIR Explorer
│   │   └── search/
│   │       └── page.tsx    # Search Playground
│   │
│   └── [resourceType]/      # Dynamic resource routes
│       └── [id]/
│           └── page.tsx    # Resource detail page
│
└── api/                      # API routes
    └── auth/
        └── callback/
            └── route.ts    # OAuth callback API
```

### Route Groups Explained

- **`(auth)`**: Parentheses create a route group without affecting URL
  - `/login` not `/auth/login`
  - No authentication required

- **`(dashboard)`**: Protected route group
  - Layout checks auth state
  - Redirects to `/login` if not authenticated

- **`[resourceType]/[id]`**: Dynamic segments
  - `/Patient/abc123` renders resource detail
  - Parameters accessed via `params` prop

---

## Components (`src/components/`)

### UI Components (`src/components/ui/`)

shadcn/ui components for the main application:

```
ui/
├── button.tsx       # Button variants
├── card.tsx         # Card container
├── badge.tsx        # Status badges
├── input.tsx        # Form inputs
├── label.tsx        # Form labels
├── alert.tsx        # Alert messages
├── dialog.tsx       # Modal dialogs
├── tabs.tsx         # Tab navigation
└── skeleton.tsx     # Loading skeletons
```

**Usage:**
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Button variant="outline" size="sm">Click me</Button>

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### FHIR Components (`src/components/fhir/`)

Custom components for FHIR data display (to be implemented):

```
fhir/
├── PatientCard.tsx      # Patient summary card
├── MedicationList.tsx   # Medication list display
├── TaskQueue.tsx        # Task queue component
└── PDCIndicator.tsx     # PDC score visualization
```

### Command Center (`src/components/command-center/`)

Dashboard-specific components (to be implemented):

```
command-center/
├── RefillQueue.tsx         # Main refill queue
├── PatientDetail.tsx       # Patient detail view
├── AIRecommendation.tsx    # AI recommendation display
└── SafetyAlerts.tsx        # Safety warning banner
```

---

## Library Code (`src/lib/`)

### Medplum (`src/lib/medplum/`)

Medplum client configuration and hooks:

```typescript
// client.ts - Client configuration
export const medplumClientConfig = {
  baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL,
  clientId: process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
};

export function createMedplumClient(): MedplumClient;
export function getServerMedplumClient(): MedplumClient;

// provider.tsx - App wrapper
export function MedplumProvider({ children }): JSX.Element;

// hooks.ts - Custom hooks
export { useMedplum, useMedplumProfile, useSearchResources };
export function useAuth(): AuthState;
export function useMedications(patientId: string): [MedicationRequest[], boolean];
export function useRefillQueue(): [Task[], boolean];
export function useActivePatients(): [Patient[], boolean];
```

### Neo4j (`src/lib/neo4j/`)

Graph database client and queries:

```typescript
// client.ts - Driver management
export function getNeo4jDriver(): Driver;
export function closeNeo4jDriver(): Promise<void>;
export async function readQuery<T>(cypher: string, params?): Promise<T[]>;
export async function writeQuery<T>(cypher: string, params?): Promise<T[]>;

// queries.ts - Pre-built queries
export async function getPatientGraph(patientId: string): Promise<PatientGraph>;
export async function searchPatients(term: string): Promise<PatientNode[]>;
export async function getMedicationGaps(patientId: string): Promise<MedicationGap[]>;
export async function getPatientsNeedingRefills(daysAhead: number): Promise<RefillNeeded[]>;
export async function getPatientsWithAdherenceIssues(class: string, threshold: number);
export async function getPolypharmacyPatients(minMeds: number);
```

### Utilities (`src/lib/utils.ts`)

Tailwind class name helper:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn("px-4", isActive && "bg-blue-500")} />
```

---

## Type System (`src/types/`)

### FHIR Types

Re-exported from `@medplum/fhirtypes`:

```typescript
import type {
  Patient,
  MedicationRequest,
  MedicationDispense,
  Task,
  Observation,
  Condition,
  AllergyIntolerance,
  Bundle,
  Reference,
} from '@medplum/fhirtypes';
```

### Domain Types

Custom types for Ignite Health:

```typescript
// Medication adherence classes
type MedicationClass = 'MAD' | 'MAC' | 'MAH';

// Task priorities
type Priority = 'routine' | 'urgent' | 'asap' | 'stat';

// Staff actions
type TaskAction = 'approve' | 'deny' | 'escalate' | 'review';

// AI confidence routing
type ConfidenceCategory = 'high' | 'standard' | 'enhanced' | 'escalate';

// PDC score structure
interface PDCScore {
  patientId: string;
  medicationClass: MedicationClass;
  score: number;  // 0.0 to 1.0
  daysInPeriod: number;
  daysCovered: number;
  isAdherent: boolean;  // score >= 0.8
  calculatedAt: string;
}

// Queue item for display
interface QueueItem {
  taskId: string;
  patientId: string;
  patientName: string;
  medicationClass: MedicationClass;
  medicationName: string;
  pdcScore?: PDCScore;
  daysUntilGap: number;
  priority: Priority;
  aiRecommendation?: AIRecommendation;
  safetyAlerts: SafetyAlert[];
}

// Result pattern for error handling
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

---

## Key Patterns

### 1. Result Pattern for Error Handling

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Usage
async function safeMedplumCall<T>(
  operation: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Consumer
const result = await safeMedplumCall(() => medplum.readResource('Patient', id));
if (!result.success) {
  console.error('Failed:', result.error.message);
  return;
}
const patient = result.data;
```

### 2. Hook Pattern for Data Fetching

```typescript
// Always use Medplum hooks in client components
function PatientList() {
  const [patients, loading] = useSearchResources('Patient', {
    active: 'true',
    _sort: '-_lastUpdated',
    _count: '50',
  });

  if (loading) return <Skeleton />;

  return (
    <ul>
      {patients?.map(patient => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </ul>
  );
}
```

### 3. Conditional Class Names

```typescript
import { cn } from '@/lib/utils';

<Button
  className={cn(
    "px-4 py-2",
    isActive && "bg-blue-500 text-white",
    isDisabled && "opacity-50 cursor-not-allowed"
  )}
/>
```

### 4. FHIR Resource Creation

```typescript
import { Task } from '@medplum/fhirtypes';

const newTask: Task = {
  resourceType: 'Task',
  status: 'requested',
  intent: 'order',
  priority: 'urgent',
  code: {
    coding: [{
      system: 'https://ignitehealth.com/task-types',
      code: 'refill-review',
    }],
  },
  for: { reference: `Patient/${patientId}` },
  authoredOn: new Date().toISOString(),
};

const created = await medplum.createResource(newTask);
```

### 5. UI Library Separation

```typescript
// DEV TOOLS - Use Mantine (required for Medplum components)
// Files: src/app/(dashboard)/dev/**
import { Paper, Stack, Title, Text } from '@mantine/core';
import { SearchControl, ResourceTable } from '@medplum/react';

// MAIN APP - Use shadcn/ui
// Files: src/app/(dashboard)/*, src/components/command-center/*
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// NEVER mix them on the same page!
```

---

## Authentication Flow

```
1. User visits /login
   │
2. User clicks "Sign in with Medplum"
   │
3. Login page calls medplum.startPkce()
   │ - Generates code_verifier
   │ - Creates code_challenge
   │
4. Redirect to Medplum OAuth:
   │ GET https://api.medplum.com/oauth2/authorize
   │   ?client_id=...
   │   &code_challenge=...
   │   &redirect_uri=/api/auth/callback
   │
5. User authenticates on Medplum
   │
6. Medplum redirects to /api/auth/callback?code=...
   │
7. API route redirects to /callback?code=...
   │
8. Callback page calls medplum.processCode(code)
   │ - Exchanges code for tokens
   │ - Validates PKCE
   │ - Stores session
   │
9. Redirect to / (dashboard)
   │
10. Dashboard layout checks useMedplumProfile()
    │ - If profile exists: render dashboard
    │ - If not: redirect to /login
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `PatientCard.tsx` |
| Pages | lowercase | `page.tsx` |
| Hooks | camelCase, use prefix | `usePatients.ts` |
| Utils | camelCase | `formatDate.ts` |
| Types | PascalCase | `QueueItem` |
| Schemas | camelCase | `patientSchema` |
| Constants | UPPER_SNAKE | `MAX_RESULTS` |

---

## Import Aliases

Configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Usage:**
```typescript
// Instead of
import { Button } from '../../../components/ui/button';

// Use
import { Button } from '@/components/ui/button';
```

---

## Testing

### Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
```

### Writing Tests

```typescript
// src/lib/pdc/calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePDC } from './calculator';

describe('PDC Calculator', () => {
  it('calculates correct PDC for continuous coverage', () => {
    const dispenses = [
      { startDate: '2024-01-01', daysSupply: 30 },
      { startDate: '2024-01-31', daysSupply: 30 },
    ];

    const result = calculatePDC(dispenses, '2024-01-01', '2024-02-29');

    expect(result.score).toBeCloseTo(1.0, 2);
    expect(result.isAdherent).toBe(true);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout, MedplumProvider |
| `src/app/(auth)/login/page.tsx` | Login UI and OAuth |
| `src/app/(dashboard)/layout.tsx` | Dashboard sidebar, auth guard |
| `src/app/(dashboard)/page.tsx` | Dashboard home |
| `src/lib/medplum/provider.tsx` | Medplum + Mantine providers |
| `src/lib/medplum/hooks.ts` | Custom Medplum hooks |
| `src/lib/neo4j/client.ts` | Neo4j driver |
| `src/lib/neo4j/queries.ts` | Cypher queries |
| `CLAUDE.md` | AI development context |
| `docker-compose.yml` | Neo4j services |

---

## Next Steps

After understanding the codebase:

1. **Read CLAUDE.md** - Critical for AI-assisted development
2. **Explore Medplum** - `docs/onboarding/04-MEDPLUM_INTEGRATION.md`
3. **Learn FHIR** - `docs/FHIR_GUIDE.md`
4. **Start building** - Pick a task from the implementation roadmap
