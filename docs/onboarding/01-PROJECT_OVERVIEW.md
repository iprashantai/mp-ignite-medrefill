# Project Overview - Ignite Health

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

---

## Key Concepts

### Medication Adherence Classes

| Class | Meaning | Medications |
|-------|---------|-------------|
| **MAD** | Medication Adherence for Diabetes | metformin, insulin, glipizide, glyburide |
| **MAC** | Medication Adherence for Cholesterol | atorvastatin, simvastatin, rosuvastatin |
| **MAH** | Medication Adherence for Hypertension | lisinopril, losartan, amlodipine, HCTZ |

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

---

## Technology Stack

### Core Platform

| Component | Technology | Purpose |
|-----------|------------|---------|
| **FHIR Backend** | Medplum | Healthcare data platform, HIPAA-compliant |
| **Frontend** | Next.js 15 + React 19 | Modern web application |
| **Database** | PostgreSQL (via Medplum) | FHIR resource storage |
| **Graph DB** | Neo4j | Medication pattern analysis |
| **AI** | AWS Bedrock (Claude) | Recommendation generation |
| **Auth** | Medplum OAuth2 | SMART on FHIR compatible |

### Key Libraries

```json
{
  "@medplum/core": "5.x",      // FHIR client
  "@medplum/react": "5.x",     // FHIR UI components
  "@medplum/fhirtypes": "5.x", // TypeScript types
  "@mantine/core": "8.x",      // UI library (dev tools)
  "tailwindcss": "4.x",        // Styling
  "zod": "3.x",                // Validation
  "zustand": "5.x",            // State management
  "neo4j-driver": "6.x"        // Graph queries
}
```

---

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

### 4. Medplum-Native Development

> **Use Medplum's components before writing custom code.**

Medplum provides production-grade, HIPAA-compliant components. Custom code often misses edge cases.

---

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

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Systems                             │
│  eClinicalWorks (EHR) ───FHIR Sync───> Medplum (FHIR Server)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Medplum Bots (Server-side)                   │
│  1. Calculate PDC scores                                        │
│  2. Identify upcoming gaps                                      │
│  3. Create review Tasks                                         │
│  4. Run safety checks                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Layer (AWS Bedrock)                       │
│  1. Generate recommendations                                    │
│  2. Multi-stage verification                                    │
│  3. Confidence scoring                                          │
│  4. Attach to Task resources                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Command Center (Next.js)                     │
│  1. Display review queue                                        │
│  2. Show AI recommendations with confidence                     │
│  3. Staff approves/denies/escalates                             │
│  4. Record audit trail                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

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

## Current State

### Implemented
- [x] Authentication (Medplum OAuth2)
- [x] Dashboard layout with navigation
- [x] FHIR Explorer (dev tool)
- [x] Search Playground (dev tool)
- [x] Resource detail viewer
- [x] Neo4j integration with queries
- [x] Medplum hooks and client

### In Progress
- [ ] Refill Queue page
- [ ] Patient detail view
- [ ] PDC calculation engine

### Planned
- [ ] Safety checking system
- [ ] AI recommendation integration
- [ ] Analytics dashboard
- [ ] eClinicalWorks integration

---

## Team & Roles

| Role | Responsibility |
|------|----------------|
| **Lead Data Scientist** | AI models, PDC logic, clinical validation |
| **Clinical SME** | Workflow design, safety validation |
| **Frontend Dev** | UI/UX, React components |
| **Platform Engineer** | Infrastructure, deployment, security |
| **Claude Code** | Implementation assistance, code generation |

---

## Key Documents

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Master context for AI development |
| `docs/ARCHITECTURE.md` | System architecture diagrams |
| `docs/FHIR_GUIDE.md` | FHIR concepts and examples |
| `docs/IMPLEMENTATION_ROADMAP.md` | Phased development plan |

---

## Resources

- [Medplum Documentation](https://docs.medplum.com)
- [FHIR R4 Specification](https://hl7.org/fhir/R4)
- [HEDIS Measures](https://www.ncqa.org/hedis)
- [US Core Implementation Guide](https://hl7.org/fhir/us/core)

---

*Remember: Every line of code potentially affects patient safety. When in doubt, be more cautious.*
