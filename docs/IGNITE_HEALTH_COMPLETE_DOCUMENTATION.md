# Ignite Health - Complete Documentation

**Version:** 1.0
**Date:** January 4, 2026
**Platform:** AI-Native Medication Adherence Management

---

# Table of Contents

1. [Documentation Index](#1-documentation-index)
2. [Quick Start Guide](#2-quick-start-guide)
3. [Project Overview](#3-project-overview)
4. [System Architecture](#4-system-architecture)
5. [FHIR Guide](#5-fhir-guide)
6. [FHIR Patterns](#6-fhir-patterns)
7. [Medplum Integration](#7-medplum-integration)
8. [Component Registry](#8-component-registry)
9. [Design System](#9-design-system)
10. [Badge Inventory](#10-badge-inventory)
11. [Table Implementation](#11-table-implementation)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Migration Guide](#13-migration-guide-cloud-to-self-hosted)
14. [AWS Self-Hosting Guide](#14-aws-self-hosting-guide)
15. [Feature Specification Template](#15-feature-specification-template)
16. [AI Feature Plans](#16-ai-feature-plans)
17. [Architectural Decisions](#17-architectural-decisions)

---

# 1. Documentation Index

Welcome to the Ignite Health documentation. This document compiles all technical documentation for the medication adherence management platform.

## Developer Onboarding

| Document            | Description                 | Time   |
| ------------------- | --------------------------- | ------ |
| Quick Start         | Get running in 15 minutes   | 15 min |
| Project Overview    | What we're building and why | 20 min |
| Development Setup   | Detailed environment setup  | 30 min |
| Codebase Guide      | Code structure and patterns | 30 min |
| Medplum Integration | Medplum-specific guidance   | 20 min |

**Recommended Reading Order:**

1. Quick Start (get running)
2. Project Overview (understand context)
3. CLAUDE.md in project root (mandatory)
4. Codebase Guide (deep dive)
5. FHIR Guide (learn healthcare data)

## External Resources

- [Medplum Documentation](https://docs.medplum.com)
- [FHIR R4 Specification](https://hl7.org/fhir/R4)
- [US Core Implementation Guide](https://hl7.org/fhir/us/core)
- [HEDIS Measures](https://www.ncqa.org/hedis)

---

# 2. Quick Start Guide

**Time to complete: 15-20 minutes**

This guide gets you running the Ignite Health medication adherence platform locally.

## Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org))
- **npm** 10+ (comes with Node.js)
- **Git** ([download](https://git-scm.com))
- **Docker Desktop** (optional, for Neo4j) ([download](https://docker.com/products/docker-desktop))
- **VS Code** (recommended) ([download](https://code.visualstudio.com))

## Step 1: Clone & Install (2 min)

```bash
# Clone the repository
git clone <repository-url>
cd mp-ignite-medrefill

# Install dependencies
npm install
```

## Step 2: Configure Environment (3 min)

Create `.env.local` in the project root:

```bash
# Medplum Configuration (shared across team)
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=06fddd7c-a3c5-415c-83d8-3f5685bfe8ca
NEXT_PUBLIC_MEDPLUM_PROJECT_ID=b62eb198-92f8-43c8-ae13-55c7e221f9ce

# Get your personal client secret from team lead
MEDPLUM_CLIENT_SECRET=<your-client-secret>

# Neo4j (local Docker)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=ignitehealth2024
```

## Step 3: Start Development Server (1 min)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 4: Create Your Medplum Account (5 min)

1. Navigate to `http://localhost:3000/login`
2. Click **"Sign in with Medplum"**
3. On Medplum's page:
   - Create new account OR sign in with Google
   - Accept invite to the Ignite Health project (if prompted)
4. You'll be redirected back to the dashboard

## Step 5: Verify Everything Works

After login, you should see:

- Welcome message with your name
- System Status: "Connected to Medplum" badge
- Stats cards (may show 0 initially)
- Sidebar navigation

## Common Commands

| Command                | Description              |
| ---------------------- | ------------------------ |
| `npm run dev`          | Start development server |
| `npm run build`        | Production build         |
| `npm test`             | Run tests                |
| `npm run typecheck`    | TypeScript validation    |
| `docker-compose up -d` | Start Neo4j              |
| `docker-compose down`  | Stop Neo4j               |

## Troubleshooting

### "Cannot find module" error

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use

```bash
npx kill-port 3000
npm run dev
```

---

# 3. Project Overview

## What We're Building

**Ignite Health** is an AI-native medication adherence management platform for healthcare providers. We help clinical staff ensure patients stay adherent to their chronic disease medications (diabetes, cholesterol, hypertension).

### The Problem

- **Medication non-adherence** affects 50% of chronic disease patients
- Poor adherence leads to hospitalizations, complications, and higher costs
- Healthcare organizations are measured on **HEDIS Star Ratings** (MAD, MAC, MAH)
- Current process: Manual, reactive, often too late

### Our Solution

- **Proactive analysis**: Identify refill gaps 15 days before they occur
- **AI-powered recommendations**: Suggest actions with confidence scoring
- **Safety-first**: Deterministic drug interaction and lab checking
- **Human-in-the-loop**: AI assists, humans decide
- **HIPAA-compliant**: Built on clinical-grade infrastructure

## Key Concepts

### Medication Adherence Classes

| Class   | Meaning                               | Medications                              |
| ------- | ------------------------------------- | ---------------------------------------- |
| **MAD** | Medication Adherence for Diabetes     | metformin, insulin, glipizide, glyburide |
| **MAC** | Medication Adherence for Cholesterol  | atorvastatin, simvastatin, rosuvastatin  |
| **MAH** | Medication Adherence for Hypertension | lisinopril, losartan, amlodipine, HCTZ   |

### PDC (Proportion of Days Covered)

The gold-standard measure for medication adherence:

```
PDC = Days with medication on hand / Days in measurement period
```

- **Goal**: PDC >= 80% (considered "adherent")
- **Measurement period**: Typically 365 days
- **Data source**: MedicationDispense records (pharmacy fills)

### The Refill Review Workflow

```
1. Patient has active medication prescription
2. System calculates days until coverage gap
3. If gap within 15 days → Create review Task
4. AI generates recommendation (with confidence score)
5. Clinical staff reviews, approves/denies/escalates
6. Action taken (e.g., contact patient, send to pharmacy)
7. Audit trail recorded
```

## Technology Stack

### Core Platform

| Component        | Technology               | Purpose                                   |
| ---------------- | ------------------------ | ----------------------------------------- |
| **FHIR Backend** | Medplum                  | Healthcare data platform, HIPAA-compliant |
| **Frontend**     | Next.js 15 + React 19    | Modern web application                    |
| **Database**     | PostgreSQL (via Medplum) | FHIR resource storage                     |
| **Graph DB**     | Neo4j                    | Medication pattern analysis               |
| **AI**           | AWS Bedrock (Claude)     | Recommendation generation                 |
| **Auth**         | Medplum OAuth2           | SMART on FHIR compatible                  |

### Key Libraries

```json
{
  "@medplum/core": "5.x",
  "@medplum/react": "5.x",
  "@medplum/fhirtypes": "5.x",
  "@mantine/core": "8.x",
  "tailwindcss": "4.x",
  "zod": "3.x",
  "zustand": "5.x",
  "neo4j-driver": "6.x"
}
```

## Architecture Principles

### 1. Deterministic vs AI Separation (CRITICAL)

**Always Deterministic (NO AI):**

- PDC Calculation - exact HEDIS formula
- Drug-Drug Interactions - database lookup
- Lab Value Alerts - threshold comparison
- Formulary Checks - rules engine
- FHIR Validation - schema enforcement

**AI-Enhanced (with human oversight):**

- Risk Stratification - pattern prediction
- Clinical Reasoning - explanation generation
- Trend Analysis - multi-factor correlation
- Patient Communication - message drafting

> **Why?** Patient safety requires 100% reliability for critical decisions. AI helps with pattern recognition but never makes final clinical calls.

### 2. Multi-Stage Verification Pipeline

Every AI output passes through:

1. **Schema Validation** - Zod validates structure
2. **Safety Checker** - Separate model validates clinical safety
3. **Citation Verification** - Claims traced to sources
4. **Confidence Scoring** - Multi-factor calculation
5. **Human Routing** - Low confidence = escalate

### 3. FHIR-First Design

All clinical data uses FHIR R4 resources:

- `Patient` - Demographics
- `MedicationRequest` - Prescriptions
- `MedicationDispense` - Pharmacy fills (PDC source)
- `Task` - Workflow items
- `Observation` - PDC scores, risk assessments
- `Condition` - Diagnoses
- `AllergyIntolerance` - Safety data

## Code Organization

```
src/
├── app/                    # Next.js pages (App Router)
│   ├── (auth)/            # Login, callback
│   ├── (dashboard)/       # Protected routes
│   │   ├── dev/           # Developer tools (Mantine)
│   │   └── [resourceType]/ # FHIR resource pages
│   └── api/               # API routes

├── components/
│   ├── ui/                # shadcn/ui components
│   ├── fhir/              # FHIR-aware components
│   └── command-center/    # Dashboard components

├── lib/
│   ├── medplum/           # Medplum client & hooks
│   ├── neo4j/             # Graph database
│   ├── pdc/               # PDC calculation (deterministic)
│   ├── safety/            # Drug interactions, labs
│   └── ai/                # AI integration

├── schemas/               # Zod validation schemas
├── types/                 # TypeScript types
└── bots/                  # Medplum server-side bots
```

## Security & Compliance

### HIPAA Requirements

- **Encryption at rest**: Medplum handles (AES-256)
- **Encryption in transit**: TLS 1.3
- **Audit logging**: All PHI access logged
- **Access controls**: Role-based, minimum necessary
- **BAA**: Business Associate Agreement with Medplum

### Our Responsibilities

- Never log PHI in plain text
- Use patient IDs, not names in logs
- All AI outputs validated before display
- Human review for all clinical decisions
- Audit trail for every action

---

# 4. System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│   Next.js Frontend  │  Command Center  │  Patient Detail         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API Layer                               │
│           Next.js API Routes  │  Middleware (Auth + Validation)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                             │
│   PDC Calculator    │    Safety Checker    │   AI Recommendation │
│   (Deterministic)   │    (Deterministic)   │      Service        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          AI Layer                                │
│     AWS Bedrock (Claude)  │  Checker Model  │  RAG System        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                               │
│            Medplum (FHIR Server)  │  Medplum Bots                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Systems                            │
│         eClinicalWorks (SMART on FHIR)  │  First Databank        │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Refill Review

```
1. Daily Sync
   eClinicalWorks ──FHIR Sync──> Medplum (Patients, Meds, Dispenses)

2. Nightly Processing (Medplum Bot)
   - Query Active Medications
   - Calculate PDC
   - Identify gaps in next 15 days
   - Create Task (refill-review)

3. AI Processing
   - Gather Patient Context
   - Run Safety Checks (Deterministic)
   - Generate AI Recommendation
   - Multi-stage Verification
   - Update Task with Recommendation

4. Human Review (Command Center)
   - Query Pending Tasks
   - Display AI recommendations
   - Staff Approves/Denies/Escalates
   - Update Task Status
   - Create AuditEvent
```

## Component Responsibilities

### Deterministic Components (NO AI)

| Component                    | Responsibility                  | Why Deterministic                       |
| ---------------------------- | ------------------------------- | --------------------------------------- |
| **PDC Calculator**           | Calculate adherence scores      | HEDIS compliance requires exact formula |
| **Drug Interaction Checker** | Identify drug-drug interactions | Patient safety - must be 100% reliable  |
| **Lab Alert System**         | Flag abnormal lab values        | Critical thresholds must be exact       |
| **Formulary Checker**        | Verify insurance coverage       | Binary yes/no decision                  |
| **Data Validation**          | Validate FHIR resources         | Schema enforcement                      |

### AI-Enhanced Components

| Component                 | Responsibility               | Why AI                                  |
| ------------------------- | ---------------------------- | --------------------------------------- |
| **Risk Stratification**   | Predict non-adherence risk   | Pattern recognition across many factors |
| **Clinical Reasoning**    | Explain recommendations      | Natural language generation             |
| **Trend Analysis**        | Identify concerning patterns | Multi-factor correlation                |
| **Patient Communication** | Draft outreach messages      | Personalized, empathetic language       |

## Confidence Routing Architecture

```
AI Generates Recommendation
         │
         ▼
Self-Consistency Check (5 samples)
         │
         ▼
Checker Model (Validates Output)
         │
         ▼
Hallucination Detection
         │
         ▼
Calculate Overall Confidence
         │
         ├── Confidence >= 95% ──> Recommend (Minimal Review)
         │
         ├── Confidence >= 85% ──> Recommend (Standard Review)
         │
         ├── Confidence >= 70% ──> Recommend (Enhanced Review)
         │
         └── Confidence < 70% ──> Escalate (Pharmacist Review)

All paths check for Safety Issues → If Yes → Escalate
```

## FHIR Resource Model

```
Patient (Central Entity)
    │
    ├── MedicationRequest (has many)
    │       └── MedicationDispense (authorizes many)
    │
    ├── Condition (has many)
    │
    ├── AllergyIntolerance (has many)
    │
    ├── Observation (has many)
    │
    └── Task (subject of many)
            └── AuditEvent (generates many)
```

## Security Architecture

```
Internet
    │
    ▼
CloudFront CDN ──> AWS WAF ──> Application Load Balancer
                                        │
                                        ▼
                              Application VPC
                    ┌─────────────────────────────────┐
                    │   Next.js on ECS (Public)       │
                    │           │                     │
                    │           ▼                     │
                    │   Private Subnet                │
                    │   ┌─────────────────────────┐   │
                    │   │  Medplum FHIR Server    │   │
                    │   │         │               │   │
                    │   │         ▼               │   │
                    │   │    PostgreSQL           │   │
                    │   └─────────────────────────┘   │
                    └─────────────────────────────────┘
                              │
                              ▼
                         AI VPC
                    ┌─────────────────┐
                    │  AWS Bedrock    │
                    └─────────────────┘
```

## Performance Targets

| Metric                 | Target    | Rationale                     |
| ---------------------- | --------- | ----------------------------- |
| Queue load time        | < 2s      | Clinician productivity        |
| AI recommendation      | < 30s     | Acceptable wait during batch  |
| PDC calculation        | < 100ms   | Must be fast for batch        |
| Daily batch processing | < 2 hours | Complete before morning shift |
| System uptime          | 99.9%     | Clinical dependency           |
| AI precision           | > 95%     | Clinical safety               |
| False positive rate    | < 5%      | Avoid alert fatigue           |

---

# 5. FHIR Guide

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
      "text": "Take 1 tablet by mouth twice daily"
    }
  ]
}
```

### 3. MedicationDispense

Record of a pharmacy fill - THIS IS CRITICAL FOR PDC.

```json
{
  "resourceType": "MedicationDispense",
  "id": "dispense-789",
  "status": "completed",
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
  "for": {
    "reference": "Patient/patient-123"
  },
  "focus": {
    "reference": "MedicationRequest/medrx-456"
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
  "valueQuantity": {
    "value": 0.85,
    "unit": "%"
  }
}
```

## Extensions (Custom Fields)

FHIR allows adding custom fields via extensions:

```json
{
  "resourceType": "Patient",
  "id": "patient-123",
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
# Date range
GET /MedicationDispense?whenhandedover=ge2024-01-01&whenhandedover=le2024-01-31

# Prefixes: eq, ne, gt, lt, ge, le, sa, eb
```

## Terminology Systems

| System    | URL                                           | Use                           |
| --------- | --------------------------------------------- | ----------------------------- |
| RxNorm    | `http://www.nlm.nih.gov/research/umls/rxnorm` | Medication codes              |
| SNOMED CT | `http://snomed.info/sct`                      | Clinical findings, procedures |
| ICD-10-CM | `http://hl7.org/fhir/sid/icd-10-cm`           | Diagnoses                     |
| LOINC     | `http://loinc.org`                            | Lab tests                     |

---

# 6. FHIR Patterns

## Core Principles

1. **Always use Medplum SDK** - Never use raw `fetch()` for FHIR operations
2. **Validate with Zod** - All data entering/exiting the system must be validated
3. **Use React hooks** - `useMedplum()`, `useSearchResources()`, `useResource()`
4. **Type everything** - Import types from `@medplum/fhirtypes`

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

## Data Validation with Zod

**Always validate before creating/updating resources.**

```typescript
import { z } from 'zod';
import type { Patient } from '@medplum/fhirtypes';

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
});

async function createPatient(data: unknown): Promise<Patient> {
  const validated = PatientCreateSchema.parse(data);
  return await medplum.createResource(validated);
}
```

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
```

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

3. **Never store PHI in logs**

```typescript
// WRONG
console.log(`Processing patient ${patient.name[0].given.join(' ')}`);

// RIGHT
console.log(`Processing patient ${patient.id}`);
```

---

# 7. Medplum Integration

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

## FHIR Resources We Use

| Resource             | Purpose        | Key Fields                       |
| -------------------- | -------------- | -------------------------------- |
| `Patient`            | Demographics   | `name`, `birthDate`, `gender`    |
| `MedicationRequest`  | Prescriptions  | `status`, `medication`, `dosage` |
| `MedicationDispense` | Pharmacy fills | `daysSupply`, `whenHandedOver`   |
| `Task`               | Workflow items | `status`, `priority`, `for`      |
| `Observation`        | PDC scores     | `code`, `valueQuantity`          |
| `Condition`          | Diagnoses      | `code`, `clinicalStatus`         |
| `AllergyIntolerance` | Allergies      | `code`, `criticality`            |

## Medplum Bots

Server-side functions that run on triggers:

```typescript
// src/bots/pdc-calculator/index.ts
import { BotEvent, MedplumClient } from '@medplum/core';
import { Task } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent<Task>): Promise<void> {
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

## Best Practices

1. **Always Use Type-Safe FHIR Types**

```typescript
// GOOD
import { Patient, MedicationRequest } from '@medplum/fhirtypes';
const patient: Patient = { ... };

// BAD
const patient: any = { ... };
```

2. **Use Hooks in Client Components**

```typescript
// GOOD - let Medplum handle caching
const [patients, loading] = useSearchResources('Patient', {...});

// BAD - manual fetching without caching
const [patients, setPatients] = useState([]);
useEffect(() => {
  medplum.searchResources('Patient', {...}).then(setPatients);
}, []);
```

3. **Prefer Native Components**

```typescript
// GOOD - use Medplum's production-grade components
<SearchControl search={search} />
<ResourceTable value={resource} />

// BAD - build custom when not needed
<CustomTable data={resources} />
```

---

# 8. Component Registry

## Healthcare-Specific Components

Import from `@/components/ui-healthcare`:

```tsx
import {
  Badge,
  PDCBadge,
  MeasureBadge,
  FragilityBadge,
  DecisionBadge,
  RunoutBadge,
  UrgencyBadge,
  BarrierBadge,
} from '@/components/ui-healthcare';

import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  DensityToggle,
  TableFooter,
  useTableState,
} from '@/components/ui-healthcare/table';
```

## General UI (shadcn/ui)

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
```

## PDC Badge Usage

```tsx
<PDCBadge pdc={85} />  // → Green "Pass"
<PDCBadge pdc={72} />  // → Amber "At-Risk"
<PDCBadge pdc={45} />  // → Red "Fail"
```

## Measure Badge Usage

```tsx
<MeasureBadge measure="MAC" />  // → Blue
<MeasureBadge measure="MAD" />  // → Purple
<MeasureBadge measure="MAH" />  // → Pink
```

## Fragility Badge Usage

```tsx
<FragilityBadge tier="F1_IMMINENT" />   // → Red "Critical"
<FragilityBadge tier="F2_FRAGILE" />    // → Orange "Fragile"
<FragilityBadge tier="F3_MODERATE" />   // → Yellow "Moderate"
<FragilityBadge tier="F4_COMFORTABLE"/> // → Blue "Stable"
<FragilityBadge tier="F5_SAFE" />       // → Green "Safe"
```

---

# 9. Design System

## Single Source of Truth

**AUTHORITATIVE:** `UI_DESIGN_SYSTEM.md`

## Primary Brand Color

Blue-600 (#2563EB)

```typescript
// Correct
(bg - blue - 600, bg - blue - 100, text - blue - 700);

// Wrong (deprecated)
(bg - teal - 600, bg - teal - 100);
```

## Status Colors

| Status  | Color     | Hex     | Usage             |
| ------- | --------- | ------- | ----------------- |
| Success | green-500 | #22C55E | Passing, approved |
| Warning | amber-500 | #F59E0B | At-risk, caution  |
| Danger  | red-500   | #EF4444 | Failing, urgent   |
| Info    | blue-500  | #3B82F6 | Informational     |

## Badge Design Rules

**Rule 1: NO BORDERS on badges**

```tsx
// CORRECT - No border
className = 'px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium';

// WRONG - Has border
className = 'px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-300 rounded-full';
```

**Rule 2: Background-Text Color Pairs**

- bg-blue-100 + text-blue-700
- bg-green-100 + text-green-700
- bg-amber-100 + text-amber-700
- bg-red-100 + text-red-700
- bg-purple-100 + text-purple-800 (MAD)
- bg-pink-100 + text-pink-800 (MAH)

## PDC Thresholds (Non-Negotiable)

| PDC Range | Status  | Color | Badge Variant |
| --------- | ------- | ----- | ------------- |
| ≥80%      | Pass    | Green | `pass`        |
| 60-79%    | At-Risk | Amber | `caution`     |
| <60%      | Fail    | Red   | `fail`        |

## Design System Helpers

```tsx
import {
  getPDCVariant,
  getPDCLabel,
  getPDCClasses,
  getFragilityVariant,
  getFragilityLabel,
  getFragilityClasses,
  getMeasureVariant,
  getMeasureClasses,
} from '@/lib/design-system';

// Examples
getPDCVariant(85); // → 'pass'
getPDCClasses(85); // → 'bg-green-100 text-green-700'
getFragilityClasses('F1'); // → 'bg-red-100 text-red-700'
getMeasureClasses('MAC'); // → 'bg-blue-100 text-blue-800'
```

---

# 10. Badge Inventory

## PDC Status Badges

| Status  | PDC Range | Classes                       |
| ------- | --------- | ----------------------------- |
| Pass    | ≥80%      | bg-green-100 text-green-700   |
| At-Risk | 60-79%    | bg-yellow-100 text-yellow-700 |
| Fail    | <60%      | bg-red-100 text-red-700       |

## Measure Badges

| Measure | Full Name    | Classes                       |
| ------- | ------------ | ----------------------------- |
| MAC     | Cholesterol  | bg-blue-100 text-blue-800     |
| MAD     | Diabetes     | bg-purple-100 text-purple-800 |
| MAH     | Hypertension | bg-pink-100 text-pink-800     |

## Fragility Tier Badges

| Tier             | Label    | Classes                       |
| ---------------- | -------- | ----------------------------- |
| F1_IMMINENT      | Critical | bg-red-100 text-red-700       |
| F2_FRAGILE       | Fragile  | bg-orange-100 text-orange-700 |
| F3_MODERATE      | Moderate | bg-yellow-100 text-yellow-700 |
| F4_COMFORTABLE   | Stable   | bg-blue-100 text-blue-700     |
| F5_SAFE          | Safe     | bg-green-100 text-green-700   |
| T5_UNSALVAGEABLE | Lost     | bg-gray-100 text-gray-600     |

## Decision Badges

| Decision | Classes                     |
| -------- | --------------------------- |
| Approve  | bg-green-100 text-green-700 |
| Deny     | bg-red-100 text-red-700     |
| Escalate | bg-amber-100 text-amber-700 |
| Pending  | bg-gray-100 text-gray-600   |

## Urgency Badges

| Urgency  | Classes                       |
| -------- | ----------------------------- |
| Critical | bg-red-100 text-red-700       |
| High     | bg-orange-100 text-orange-700 |
| Medium   | bg-yellow-100 text-yellow-700 |
| Low      | bg-green-100 text-green-700   |

---

# 11. Table Implementation

## Table Components

```tsx
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  DensityToggle,
  TableFooter,
} from '@/components/ui-healthcare/table';
import { useTableState } from '@/components/ui-healthcare/table';

function PatientTable({ patients }) {
  const { density, setDensity, getSortProps } = useTableState();

  return (
    <>
      <DensityToggle density={density} onDensityChange={setDensity} />
      <Table density={density}>
        <TableHead sticky>
          <TableRow>
            <TableHeaderCell {...getSortProps('name')}>Name</TableHeaderCell>
            <TableHeaderCell {...getSortProps('pdc')}>PDC</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id} hoverable clickable>
              <TableCell>{patient.name}</TableCell>
              <TableCell>
                <PDCBadge pdc={patient.pdc} />
              </TableCell>
              <TableCell>
                <FragilityBadge tier={patient.tier} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter totalCount={patients.length} itemLabel="patients" />
      </Table>
    </>
  );
}
```

## Density Classes

| Density     | Padding     | Font Size | Min Height |
| ----------- | ----------- | --------- | ---------- |
| Comfortable | px-4 py-3   | text-sm   | 44px       |
| Compact     | px-3 py-2   | text-xs   | 36px       |
| Dense       | px-3 py-1.5 | text-xs   | 32px       |

## Header Styling

```jsx
// Container
<thead className="bg-gray-50 sticky top-0 z-10">

// Sortable column
<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">

// Non-sortable column
<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
```

## Row Styling

```jsx
// Interactive row
<tr className="hover:bg-blue-50 transition-colors cursor-pointer">

// Non-interactive row
<tr className="border-b border-gray-200">

// Selected row
<tr className="bg-blue-50 border-l-4 border-blue-500">
```

## Column Alignment

- **Text columns**: Left-aligned (`text-left`)
- **Numeric columns**: Right-aligned (`text-right`)
- **Badge columns**: Center or left-aligned
- **Action columns**: Right-aligned

---

# 12. Implementation Roadmap

## Phase 1: Foundation (Weeks 1-4)

### Sprint 1-2: Core Infrastructure

- [x] Next.js 15 App Router setup
- [x] Medplum authentication integration
- [x] Basic dashboard layout
- [x] FHIR Explorer (dev tool)
- [x] Neo4j integration

### Sprint 3-4: Data Layer

- [ ] PDC calculation engine
- [ ] MedicationDispense ingestion
- [ ] Task resource management
- [ ] Basic search functionality

## Phase 2: Core Features (Weeks 5-8)

### Sprint 5-6: Refill Queue

- [ ] Queue page with filtering
- [ ] Task detail view
- [ ] Basic approval workflow
- [ ] Audit logging

### Sprint 7-8: Patient Detail

- [ ] Patient summary view
- [ ] Medication timeline
- [ ] PDC history chart
- [ ] Drug interaction warnings

## Phase 3: AI Integration (Weeks 9-12)

### Sprint 9-10: Recommendation Engine

- [ ] AWS Bedrock integration
- [ ] Prompt engineering
- [ ] Confidence scoring
- [ ] Multi-stage verification

### Sprint 11-12: Safety Systems

- [ ] Drug-drug interaction checking
- [ ] Lab value alerting
- [ ] Formulary validation
- [ ] Escalation routing

## Phase 4: Analytics & Polish (Weeks 13-16)

### Sprint 13-14: Analytics

- [ ] PDC trend dashboards
- [ ] Staff productivity metrics
- [ ] AI accuracy tracking
- [ ] HEDIS Star projections

### Sprint 15-16: Production Readiness

- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] User training materials

---

# 13. Migration Guide: Cloud to Self-Hosted

## Executive Summary

This guide covers migrating from Medplum Cloud to a self-hosted AWS deployment.

**Key Takeaways:**

- **Recommended Approach**: AWS CDK deployment using `@medplum/cdk` package
- **Primary Compute**: AWS Fargate on ECS (serverless containers)
- **Database**: Amazon Aurora PostgreSQL 16
- **Estimated Timeline**: 12-16 weeks
- **Operational Overhead**: ~0.5 FTE for maintenance

## Migration Phases

### Phase 1: Preparation (1-2 weeks)

1. Audit current usage
2. Document configuration
3. Plan downtime window

### Phase 2: Infrastructure Setup (1-2 weeks)

1. AWS account preparation
2. Domain and certificate setup
3. Deploy infrastructure via CDK

### Phase 3: Data Migration (2-4 hours)

1. Export from Medplum Cloud
2. Import to self-hosted instance

### Phase 4: Configuration Migration (1-2 hours)

1. Recreate projects
2. Migrate users
3. Deploy Bots
4. Configure OAuth clients

### Phase 5: DNS Cutover (15-30 minutes)

1. Update DNS records
2. Wait for propagation
3. Verify connectivity

### Phase 6: Validation (1-2 hours)

1. Functional testing
2. Integration testing
3. User acceptance testing

## Cost Estimates

| Size   | Monthly Cost | Use Case               |
| ------ | ------------ | ---------------------- |
| Small  | ~$290        | Dev/staging            |
| Medium | ~$1,170      | Multi-clinic           |
| Large  | ~$3,880      | Hospital/health system |

---

# 14. AWS Self-Hosting Guide

## Architecture Components

| Component          | AWS Service                | Purpose                        |
| ------------------ | -------------------------- | ------------------------------ |
| **Compute**        | AWS Fargate on ECS         | Runs Medplum server containers |
| **Database**       | Amazon Aurora PostgreSQL   | FHIR resource storage (JSONB)  |
| **Cache**          | Amazon ElastiCache (Redis) | Session caching, job queues    |
| **Binary Storage** | Amazon S3                  | FHIR Binary resources          |
| **CDN**            | Amazon CloudFront          | Static assets, signed URLs     |
| **Load Balancer**  | Application Load Balancer  | Traffic distribution           |
| **Serverless**     | AWS Lambda                 | Medplum Bots execution         |
| **Email**          | Amazon SES                 | Transactional emails           |
| **Security**       | AWS WAF                    | Web application firewall       |

## CDK Deployment

### Installation

```bash
mkdir medplum-infra && cd medplum-infra
npm init -y
npm install aws-cdk-lib cdk constructs @medplum/cdk @medplum/cli
```

### Configuration File

Create `medplum.config.json`:

```json
{
  "name": "prod",
  "stackName": "MedplumStack",
  "accountNumber": "123456789012",
  "region": "us-east-1",
  "domainName": "yourdomain.com",
  "apiDomainName": "api.yourdomain.com",
  "appDomainName": "app.yourdomain.com",
  "rdsInstanceType": "r6g.large",
  "desiredServerCount": 2,
  "serverMemory": 4096,
  "serverCpu": 2048
}
```

### Deployment Commands

```bash
# Initialize Medplum AWS resources
npx medplum aws init

# Bootstrap CDK (first time only)
npx cdk bootstrap

# Preview changes
npx cdk diff

# Deploy all stacks
npx cdk deploy --all
```

## Security & HIPAA Compliance

### AWS BAA Requirement

**CRITICAL:** Sign a Business Associate Agreement (BAA) with AWS before processing PHI.

### Encryption Requirements

**At Rest:**

- Aurora: AWS KMS encryption
- S3: Server-side encryption with AWS KMS
- ElastiCache: At-rest encryption enabled

**In Transit:**

- TLS 1.2+ for all connections
- SSL termination at ALB
- Internal VPC traffic via private endpoints

---

# 15. Feature Specification Template

Use this template when writing requirements for Claude Code to implement.

## Template Structure

```markdown
# Feature: [Feature Name]

## Overview

**One-sentence description**: [What this feature does]
**Target User**: [Clinical staff / Pharmacist / Admin / etc.]
**Priority**: [High / Medium / Low]

## Context

### Legacy Reference (if migrating)

- **Legacy File**: `/path/to/legacy/file.jsx`
- **What to preserve**: [List key behaviors to keep]
- **What to change**: [List improvements]

### Related FHIR Resources

- [ ] Patient
- [ ] MedicationRequest
- [ ] MedicationDispense
- [ ] Task
- [ ] Observation

### Design Components to Use

- [ ] PDCBadge
- [ ] FragilityBadge
- [ ] MeasureBadge
- [ ] Table components

## User Story

As a **[role]**,
I want **[capability]**,
so that **[benefit]**.

## Acceptance Criteria

### Must Have (P0)

- [ ] Criterion 1
- [ ] Criterion 2

### Should Have (P1)

- [ ] Criterion 3

### Nice to Have (P2)

- [ ] Criterion 4

## Technical Constraints

### MUST Use

- Import badges from `@/components/ui-healthcare`
- Import tables from `@/components/ui-healthcare/table`
- Use `useMedplum()` or `useSearchResources()` for FHIR data
- Validate input with Zod before FHIR operations

### MUST NOT

- Hardcode colors (use semantic components)
- Use raw `fetch()` for FHIR (use Medplum SDK)
- Create custom badge styling
- Log PHI (patient names, DOB, etc.)

## Out of Scope

1. [Explicit exclusion 1]
2. [Explicit exclusion 2]
```

---

# 16. AI Feature Plans

## NL2Cypher AI Feature

**Goal**: Enable natural language queries against Neo4j graph database.

### User Flow

1. User types natural language question
2. AI translates to Cypher query
3. Query executes against Neo4j
4. Results displayed in structured format

### Implementation Approach

1. AWS Bedrock (Claude) for NL translation
2. Cypher query validation
3. Result formatting and visualization
4. Error handling and retry logic

### Example Queries

- "Show me patients with PDC below 80%"
- "Find patients who haven't filled their diabetes medication in 30 days"
- "List all patients on metformin with declining adherence"

---

# 17. Architectural Decisions

## ADR-001: Use Medplum Native Components for Dev Tools

**Status:** Accepted
**Date:** 2024-12-28

### Context

Ignite Health uses Medplum as its headless FHIR backend. Medplum provides React components that require Mantine UI as a peer dependency.

### Decision

**Use a hybrid approach with clear boundaries:**

| Area                      | UI Library               | Rationale                                |
| ------------------------- | ------------------------ | ---------------------------------------- |
| **Dev Tools** (`/dev/*`)  | Mantine + Medplum        | Leverage Medplum's FHIR-aware components |
| **Resource Pages**        | Mantine + Medplum        | Use `ResourceTable`, `ResourceForm`      |
| **Main Application**      | shadcn/ui + Tailwind     | Maximum design control                   |
| **Healthcare Components** | Custom (`ui-healthcare`) | Domain-specific (PDCBadge, etc.)         |

### Consequences

**Positive:**

- Best of both worlds
- Reduced development time
- HIPAA compliance from Medplum components
- Bundle optimization

**Negative:**

- Two UI paradigms to learn
- CSS isolation required
- Documentation overhead

### Mitigations

| Risk                | Mitigation                                            |
| ------------------- | ----------------------------------------------------- |
| Mixing libraries    | ESLint rules block Mantine in `src/app/` (except dev) |
| Developer confusion | Clear documentation in `CLAUDE.md`                    |
| CSS conflicts       | Page-level separation                                 |

---

# Appendix: Quick Reference

## Common Commands

```bash
# Development
npm run dev           # Start development server
npm run build         # Production build
npm test              # Run tests
npm run typecheck     # TypeScript validation

# Neo4j
docker-compose up -d  # Start Neo4j
docker-compose down   # Stop Neo4j

# Medplum
npx medplum login     # Login to Medplum CLI
npx medplum bot deploy <bot-name>  # Deploy bot
```

## Environment Variables

```env
# Medplum Configuration
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=your-client-id
MEDPLUM_CLIENT_SECRET=your-client-secret

# AWS Bedrock (for AI)
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Feature Flags
ENABLE_AI_RECOMMENDATIONS=true
ENABLE_AUTO_APPROVAL=false
```

## Getting Help

- **Medplum Docs**: https://docs.medplum.com
- **Medplum Discord**: https://discord.gg/medplum
- **FHIR R4 Spec**: https://hl7.org/fhir/R4
- **US Core IG**: https://hl7.org/fhir/us/core

---

**Remember**: We are building clinical-grade software. Every line of code potentially affects patient safety. When in doubt, be more cautious, add more validation, and escalate to human review.

---

_Document Generated: January 4, 2026_
_Version: 1.0_
_Ignite Health Platform Documentation_
