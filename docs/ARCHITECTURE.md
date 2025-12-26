# Ignite Health - System Architecture

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js Frontend]
        CC[Command Center]
        PD[Patient Detail]
    end
    
    subgraph "API Layer"
        API[Next.js API Routes]
        MW[Middleware<br/>Auth + Validation]
    end
    
    subgraph "Service Layer"
        PDC[PDC Calculator<br/>Deterministic]
        SAFETY[Safety Checker<br/>Deterministic]
        AI[AI Recommendation<br/>Service]
    end
    
    subgraph "AI Layer"
        BEDROCK[AWS Bedrock<br/>Claude]
        CHECKER[Checker Model]
        RAG[RAG System]
    end
    
    subgraph "Data Layer"
        MP[Medplum<br/>FHIR Server]
        BOTS[Medplum Bots]
    end
    
    subgraph "External Systems"
        ECW[eClinicalWorks<br/>SMART on FHIR]
        FDB[First Databank<br/>Drug Database]
    end
    
    UI --> API
    CC --> API
    PD --> API
    
    API --> MW
    MW --> PDC
    MW --> SAFETY
    MW --> AI
    
    PDC --> MP
    SAFETY --> FDB
    AI --> BEDROCK
    AI --> CHECKER
    AI --> RAG
    
    BOTS --> MP
    MP --> ECW
```

## Data Flow: Refill Review

```mermaid
sequenceDiagram
    participant ECW as eClinicalWorks
    participant MP as Medplum
    participant BOT as PDC Bot
    participant AI as AI Service
    participant UI as Command Center
    participant STAFF as Clinical Staff
    
    Note over ECW,MP: Daily Sync
    ECW->>MP: FHIR Sync (Patients, Meds, Dispenses)
    
    Note over BOT,MP: Nightly Processing
    BOT->>MP: Query Active Medications
    MP->>BOT: MedicationRequest list
    BOT->>BOT: Calculate PDC
    BOT->>BOT: Identify gaps in next 15 days
    BOT->>MP: Create Task (refill-review)
    
    Note over AI,MP: AI Processing
    MP->>AI: Task Created Event
    AI->>AI: Gather Patient Context
    AI->>AI: Run Safety Checks (Deterministic)
    AI->>AI: Generate AI Recommendation
    AI->>AI: Multi-stage Verification
    AI->>MP: Update Task with Recommendation
    
    Note over UI,STAFF: Human Review
    UI->>MP: Query Pending Tasks
    MP->>UI: Task list with AI recommendations
    STAFF->>UI: Review Patient
    UI->>MP: Fetch Patient Details
    STAFF->>UI: Approve/Deny/Escalate
    UI->>MP: Update Task Status
    UI->>MP: Create AuditEvent
```

## Component Responsibilities

### Deterministic Components (NO AI)

| Component | Responsibility | Why Deterministic |
|-----------|---------------|-------------------|
| **PDC Calculator** | Calculate adherence scores | HEDIS compliance requires exact formula |
| **Drug Interaction Checker** | Identify drug-drug interactions | Patient safety - must be 100% reliable |
| **Lab Alert System** | Flag abnormal lab values | Critical thresholds must be exact |
| **Formulary Checker** | Verify insurance coverage | Binary yes/no decision |
| **Data Validation** | Validate FHIR resources | Schema enforcement |

### AI-Enhanced Components

| Component | Responsibility | Why AI |
|-----------|---------------|--------|
| **Risk Stratification** | Predict non-adherence risk | Pattern recognition across many factors |
| **Clinical Reasoning** | Explain recommendations | Natural language generation |
| **Trend Analysis** | Identify concerning patterns | Multi-factor correlation |
| **Patient Communication** | Draft outreach messages | Personalized, empathetic language |

## Confidence Routing Architecture

```mermaid
flowchart TD
    START[AI Generates Recommendation] --> SC[Self-Consistency Check<br/>5 samples]
    SC --> CM[Checker Model<br/>Validates Output]
    CM --> HD[Hallucination Detection]
    HD --> CONF[Calculate Overall Confidence]
    
    CONF --> HIGH{Confidence >= 95%}
    HIGH -->|Yes| REC1[✓ Recommend<br/>Minimal Review]
    HIGH -->|No| STD{Confidence >= 85%}
    
    STD -->|Yes| REC2[⚠ Recommend<br/>Standard Review]
    STD -->|No| ENH{Confidence >= 70%}
    
    ENH -->|Yes| REC3[⚠ Recommend<br/>Enhanced Review]
    ENH -->|No| ESC[🔴 Escalate<br/>Pharmacist Review]
    
    REC1 --> SAFETY{Safety Issues?}
    REC2 --> SAFETY
    REC3 --> SAFETY
    
    SAFETY -->|Yes| ESC
    SAFETY -->|No| QUEUE[Add to Review Queue]
```

## FHIR Resource Model

```mermaid
erDiagram
    Patient ||--o{ MedicationRequest : has
    Patient ||--o{ MedicationDispense : has
    Patient ||--o{ Condition : has
    Patient ||--o{ AllergyIntolerance : has
    Patient ||--o{ Observation : has
    Patient ||--o{ Task : subject
    
    MedicationRequest ||--o{ MedicationDispense : authorizes
    MedicationRequest ||--o{ Task : focus
    
    Task ||--o{ AuditEvent : generates
    
    Patient {
        string id PK
        HumanName name
        date birthDate
        code gender
        Extension pdc_scores
        Extension risk_level
    }
    
    MedicationRequest {
        string id PK
        code status
        code intent
        Reference subject FK
        CodeableConcept medication
        Dosage dosageInstruction
    }
    
    MedicationDispense {
        string id PK
        code status
        Reference subject FK
        Reference authorizingPrescription FK
        Quantity quantity
        Quantity daysSupply
        dateTime whenHandedOver
    }
    
    Task {
        string id PK
        code status
        code priority
        Reference for FK
        Reference focus FK
        Extension ai_recommendation
        Extension ai_confidence
    }
    
    Observation {
        string id PK
        code code
        Reference subject FK
        Quantity value
        dateTime effectiveDateTime
    }
```

## Security Architecture

```mermaid
flowchart LR
    subgraph "Internet"
        USER[User Browser]
    end
    
    subgraph "Edge"
        CDN[CloudFront CDN]
        WAF[AWS WAF]
    end
    
    subgraph "Application VPC"
        ALB[Application<br/>Load Balancer]
        ECS[Next.js<br/>on ECS]
        
        subgraph "Private Subnet"
            MEDPLUM[Medplum<br/>FHIR Server]
            RDS[(PostgreSQL)]
        end
    end
    
    subgraph "AI VPC"
        BEDROCK[AWS Bedrock]
    end
    
    USER -->|HTTPS| CDN
    CDN -->|HTTPS| WAF
    WAF -->|HTTPS| ALB
    ALB -->|HTTP| ECS
    ECS -->|HTTPS| MEDPLUM
    MEDPLUM --> RDS
    ECS -->|HTTPS| BEDROCK
    
    classDef secure fill:#d4edda,stroke:#28a745
    classDef private fill:#fff3cd,stroke:#ffc107
    
    class WAF,MEDPLUM,RDS secure
    class BEDROCK private
```

## Deployment Architecture

```mermaid
flowchart TB
    subgraph "Development"
        DEV[Local Dev<br/>localhost:3000]
        SANDBOX[Medplum Sandbox]
    end
    
    subgraph "CI/CD"
        GH[GitHub Actions]
        TESTS[Test Suite]
        LINT[ESLint + TypeScript]
        SEC[Security Scan]
    end
    
    subgraph "Staging"
        STG_APP[Staging App]
        STG_MP[Medplum Staging]
    end
    
    subgraph "Production"
        PROD_APP[Production App]
        PROD_MP[Medplum Production]
        MONITOR[Monitoring<br/>DataDog/CloudWatch]
    end
    
    DEV --> GH
    GH --> TESTS
    GH --> LINT
    GH --> SEC
    TESTS --> STG_APP
    STG_APP --> STG_MP
    
    STG_APP -->|Manual Approval| PROD_APP
    PROD_APP --> PROD_MP
    PROD_APP --> MONITOR
```

## Key Design Decisions

### 1. Why Medplum?

| Alternative | Why Not | Medplum Advantage |
|-------------|---------|-------------------|
| Build from scratch | 6-12 months, $300K+ | Day 1 FHIR compliance |
| Firestore + custom | No FHIR, no HIPAA | Native FHIR, BAA available |
| AWS HealthLake | Expensive, limited features | Open source, flexible |
| Epic/Cerner | Vendor lock-in, high cost | Control, cost-effective |

### 2. Why Hybrid AI Architecture?

- **Safety-critical = Deterministic**: Drug interactions, lab alerts, PDC
- **Pattern recognition = AI**: Risk stratification, recommendations
- **Never trust AI alone**: Multi-stage verification mandatory

### 3. Why Multi-Stage Verification?

Research shows single-model systems have 3x higher error rates for clinical decisions. Our approach:
1. **Self-consistency**: 5 samples, majority vote
2. **Checker model**: Separate model validates
3. **Hallucination detection**: Pattern matching
4. **Confidence scoring**: Multi-factor calculation
5. **Human routing**: Low confidence = escalate

### 4. Why Not Fine-tuning Initially?

- Insufficient proprietary data (need 6-12 months of outcomes)
- Prompt engineering + RAG achieves 85%+ accuracy
- Fine-tuning adds complexity and training overhead
- Plan to fine-tune after collecting outcome data

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Queue load time | < 2s | Clinician productivity |
| AI recommendation | < 30s | Acceptable wait during batch |
| PDC calculation | < 100ms | Must be fast for batch |
| Daily batch processing | < 2 hours | Complete before morning shift |
| System uptime | 99.9% | Clinical dependency |
| AI precision | > 95% | Clinical safety |
| False positive rate | < 5% | Avoid alert fatigue |
