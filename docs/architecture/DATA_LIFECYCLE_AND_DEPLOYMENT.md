# Data Lifecycle & Deployment Architecture

**Critical Architectural Decisions for Ignite Health**

---

## Table of Contents

1. [What Verification Scripts Actually Do](#what-verification-scripts-actually-do)
2. [Where & When Derived Values Are Calculated](#where--when-derived-values-are-calculated)
3. [Data Storage Strategy](#data-storage-strategy)
4. [Search Parameters & Extensions Setup](#search-parameters--extensions-setup)
5. [Medplum Cloud vs Self-Hosted](#medplum-cloud-vs-self-hosted)
6. [UI Filtering Architecture](#ui-filtering-architecture)
7. [Migration Strategy](#migration-strategy)

---

## What Verification Scripts Actually Do

### Current Verification Scripts (READ-ONLY)

```bash
# scripts/dev-tools/verification/verify-medplum-connection.ts
```

**What it DOES:**
- ✅ Connects to Medplum
- ✅ Authenticates
- ✅ Counts existing resources (Patient, MedicationDispense, Observation)
- ✅ Validates environment variables

**What it DOES NOT do:**
- ❌ Does NOT create search parameters
- ❌ Does NOT create extensions
- ❌ Does NOT modify any data
- ❌ Does NOT set up infrastructure

### Calculation Scripts (CAN WRITE)

```bash
# scripts/dev-tools/verification/calculate-patient-pdc.ts
# scripts/dev-tools/verification/batch-calculate-all-patients.ts
```

**What they DO (when not in dry-run mode):**
- ✅ Calculate PDC from existing MedicationDispense resources
- ✅ Calculate fragility tier from PDC
- ✅ Create FHIR Observation resources with results
- ✅ Store calculations in Medplum database

**What they DO NOT do:**
- ❌ Do NOT create custom search parameters (manual setup needed)
- ❌ Do NOT create extension definitions (manual setup needed)
- ❌ Do NOT update Patient resources with extensions (optional, requires separate script)

---

## Where & When Derived Values Are Calculated

This is the **CRITICAL** architectural decision. Here's the complete flow:

### Stage 1: Source Data (Already in Medplum)

**Resources that MUST exist:**

```
Patient
├── id, name, birthDate
└── (no derived fields yet)

MedicationDispense (pharmacy claims)
├── id
├── subject -> Patient reference
├── whenHandedOver (fill date)
├── daysSupply
├── medicationCodeableConcept (RxNorm code)
└── status: "completed"
```

**Where they come from:**
- Uploaded via scripts (`scripts/upload-patients.ts`)
- Or synced from pharmacy claims data
- Or created via Medplum API

### Stage 2: Calculation Engine (Phase 1 - Complete ✅)

**When:** On-demand or scheduled batch job

**Where:** Node.js scripts or Medplum Bots

**Process:**

```typescript
// 1. Fetch dispenses for patient
const dispenses = await getPatientDispenses(medplum, patientId, 2025);

// 2. Calculate PDC (deterministic, no AI)
const pdcResult = calculatePDCFromDispenses({
  dispenses,
  measurementYear: 2025,
  currentDate: new Date(),
});
// Returns: { pdc, coveredDays, gapDaysUsed, gapDaysRemaining, pdcStatusQuo, pdcPerfect, ... }

// 3. Calculate fragility tier (deterministic, no AI)
const fragilityResult = calculateFragility({
  pdcResult,
  refillsRemaining: 3,
  measureTypes: ['MAC'],
  isNewPatient: false,
  currentDate: new Date(),
});
// Returns: { tier, priorityScore, urgencyLevel, delayBudgetPerRefill, ... }
```

**Output:** In-memory JavaScript objects (not stored yet)

### Stage 3: Storage (Two Options)

#### Option A: FHIR Observations (Recommended for Phase 2)

**Why:** Versioned, auditable, queryable, FHIR-native

```typescript
// Store as Observation resource
await storePDCObservation(medplum, {
  patientId: 'patient-123',
  measure: 'MAC',
  pdc: 78.5,
  fragility: fragilityResult,
  effectiveDate: new Date(),
});
```

**Creates:**

```json
{
  "resourceType": "Observation",
  "id": "obs-456",
  "status": "final",
  "code": {
    "coding": [{
      "system": "http://ignitehealth.com/codes",
      "code": "pdc-mac",
      "display": "PDC - Cholesterol"
    }]
  },
  "subject": { "reference": "Patient/patient-123" },
  "effectiveDateTime": "2025-11-29T10:00:00Z",
  "valueQuantity": {
    "value": 78.5,
    "unit": "%"
  },
  "component": [
    {
      "code": { "coding": [{ "code": "fragility-tier" }] },
      "valueCodeableConcept": { "coding": [{ "code": "F2_FRAGILE" }] }
    },
    {
      "code": { "coding": [{ "code": "priority-score" }] },
      "valueInteger": 105
    },
    {
      "code": { "coding": [{ "code": "gap-days-remaining" }] },
      "valueInteger": 12
    }
    // ... more components
  ],
  "extension": [
    {
      "url": "https://ignitehealth.com/fhir/extensions/pdc-status-quo",
      "valueDecimal": 80.2
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/pdc-perfect",
      "valueDecimal": 87.5
    }
  ]
}
```

**Pros:**
- ✅ Historical data preserved (can see PDC over time)
- ✅ FHIR-compliant, works with any FHIR client
- ✅ Auditable (who calculated, when)
- ✅ Queryable via FHIR search

**Cons:**
- ❌ Requires JOIN to get patient + PDC in one query
- ❌ Slower for "list all patients with PDC" queries

#### Option B: Patient Extensions (For Fast List Views)

**Why:** Cached summary on Patient resource for instant access

```typescript
// Update Patient resource with extensions
await updatePatientExtensions(medplum, {
  patientId: 'patient-123',
  extensions: {
    currentPDC: 78.5,
    fragilityTier: 'F2_FRAGILE',
    priorityScore: 105,
    daysToRunout: 5,
    gapDaysRemaining: 12,
    lastCalculated: '2025-11-29T10:00:00Z',
  },
});
```

**Creates:**

```json
{
  "resourceType": "Patient",
  "id": "patient-123",
  "name": [{ "given": ["Maria"], "family": "Gonzalez" }],
  "birthDate": "1965-03-15",
  "extension": [
    {
      "url": "https://ignitehealth.com/fhir/extensions/current-pdc",
      "valueDecimal": 78.5
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/fragility-tier",
      "valueCode": "F2_FRAGILE"
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/priority-score",
      "valueInteger": 105
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/days-to-runout",
      "valueInteger": 5
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/gap-days-remaining",
      "valueInteger": 12
    }
  ]
}
```

**Pros:**
- ✅ FAST - no JOINs needed for list view
- ✅ Single query: `GET /fhir/Patient?_count=50` returns everything
- ✅ Easy filtering: `GET /fhir/Patient?fragility-tier=F1_IMMINENT`

**Cons:**
- ❌ Loses historical data (overwrites previous values)
- ❌ Must update Patient every time you recalculate
- ❌ Risk of stale data if calculation fails

### **RECOMMENDED STRATEGY: Use Both**

```typescript
// 1. Always store full results as Observation (canonical source)
await storePDCObservation(medplum, { patientId, pdc, fragility, ... });

// 2. Cache summary on Patient extensions (for fast queries)
await updatePatientExtensions(medplum, { patientId, extensions: { ... } });
```

**Flow:**

```
MedicationDispense (source)
    ↓
Calculate PDC + Fragility (in-memory)
    ↓
    ├─→ Store as Observation (full data, versioned)
    └─→ Update Patient extensions (summary, fast access)
```

---

## Search Parameters & Extensions Setup

### What Needs Manual Setup (ONE-TIME)

These are **infrastructure** resources that must be created ONCE per Medplum instance:

#### 1. SearchParameter Resources

**File:** `src/lib/fhir/search-parameters.ts` (already exists)

**Defines custom search parameters like:**

```json
{
  "resourceType": "SearchParameter",
  "id": "patient-fragility-tier",
  "code": "fragility-tier",
  "base": ["Patient"],
  "type": "token",
  "expression": "Patient.extension.where(url='https://ignitehealth.com/fhir/extensions/fragility-tier').value"
}
```

**Enables queries like:**
```
GET /fhir/Patient?fragility-tier=F1_IMMINENT
GET /fhir/Patient?priority-score=gt100
```

**How to deploy:**

```bash
# Option 1: Via script
npx tsx scripts/deploy-search-parameters.ts

# Option 2: Via Medplum CLI
medplum deploy search-parameters

# Option 3: Manually in Medplum UI
# Go to SearchParameter resource, create each one
```

#### 2. StructureDefinition Resources (Optional)

**Defines extension schemas:**

```json
{
  "resourceType": "StructureDefinition",
  "url": "https://ignitehealth.com/fhir/extensions/fragility-tier",
  "name": "FragilityTier",
  "status": "active",
  "kind": "complex-type",
  "abstract": false,
  "type": "Extension",
  "baseDefinition": "http://hl7.org/fhir/StructureDefinition/Extension",
  "derivation": "constraint"
}
```

**Optional but recommended for:**
- Type validation
- Documentation
- Interoperability with other FHIR systems

**How to deploy:**

```bash
npx tsx scripts/deploy-structure-definitions.ts
```

### When to Deploy These

**BEFORE running UI in Phase 2:**

```bash
# 1. Deploy search parameters (enables fast filtering)
npx tsx scripts/deploy-search-parameters.ts

# 2. Verify they're deployed
curl "$MEDPLUM_BASE_URL/fhir/SearchParameter?code=fragility-tier"
```

**If not deployed:**
- ❌ UI filters won't work (`?fragility-tier=F1` will be ignored)
- ❌ Queries will be slow (full table scan)
- ✅ Core functionality still works (can query Observations directly)

---

## Medplum Cloud vs Self-Hosted

### Current Setup (Medplum Cloud)

**What you have:**

```
Your App (Next.js)
    ↓ HTTPS
Medplum Cloud (api.medplum.com)
    ├── PostgreSQL (managed)
    ├── Redis (managed)
    └── Object Storage (managed)
```

**Pros:**
- ✅ Zero infrastructure management
- ✅ Automatic backups
- ✅ HIPAA compliant out of box
- ✅ Scales automatically

**Cons:**
- ❌ Data stored in Medplum's AWS account
- ❌ Vendor lock-in
- ❌ Ongoing subscription costs

### Migration to Self-Hosted AWS

**What you'll have:**

```
Your App (Next.js)
    ↓ VPC
Medplum Server (your ECS/EKS)
    ├── RDS PostgreSQL (your account)
    ├── ElastiCache Redis (your account)
    └── S3 (your account)
```

**Migration Steps:**

#### Step 1: Export Data from Medplum Cloud

```bash
# Export all resources as FHIR Bundle
curl "$MEDPLUM_CLOUD_URL/fhir/\$export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/fhir+ndjson"

# Downloads:
# - Patient.ndjson
# - MedicationDispense.ndjson
# - Observation.ndjson
# - etc.
```

#### Step 2: Deploy Medplum to AWS

```bash
# Clone Medplum repo
git clone https://github.com/medplum/medplum.git

# Configure infrastructure
cd medplum/infrastructure
terraform init
terraform apply \
  -var "aws_region=us-east-1" \
  -var "database_instance_class=db.r5.large" \
  -var "redis_node_type=cache.r5.large"

# Deploy application
aws ecs update-service \
  --cluster medplum \
  --service medplum-server \
  --force-new-deployment
```

#### Step 3: Import Data to Self-Hosted

```bash
# Import FHIR Bundle
curl "$YOUR_MEDPLUM_URL/fhir" \
  -X POST \
  -H "Content-Type: application/fhir+json" \
  -d @export-bundle.json
```

#### Step 4: Redeploy Search Parameters

```bash
# Re-deploy search parameters on new instance
MEDPLUM_BASE_URL=$YOUR_MEDPLUM_URL \
npx tsx scripts/deploy-search-parameters.ts
```

#### Step 5: Update Environment Variables

```diff
# .env.local
- MEDPLUM_BASE_URL=https://api.medplum.com
+ MEDPLUM_BASE_URL=https://medplum.yourcompany.com

# No code changes needed!
```

**Your Application Code:** ✅ **ZERO CHANGES**

The entire app uses `@medplum/core` SDK, which is the same for cloud or self-hosted:

```typescript
const medplum = new MedplumClient({
  baseUrl: process.env.MEDPLUM_BASE_URL, // Only this changes!
  clientId: process.env.MEDPLUM_CLIENT_ID,
  clientSecret: process.env.MEDPLUM_CLIENT_SECRET,
});
```

---

## UI Filtering Architecture

### How Filtering Works in Phase 2/3

When you build the Patient List UI:

```typescript
// src/app/(dashboard)/patients/page.tsx
export default function PatientsPage() {
  const [filters, setFilters] = useState({
    fragilityTier: ['F1_IMMINENT', 'F2_FRAGILE'],
    pdcMin: 60,
    pdcMax: 80,
    measure: 'MAC',
  });

  // This is where the magic happens
  const { data: patients } = usePatientList(filters);
}
```

#### Option 1: Filter via Patient Extensions (FAST)

**Query built:**

```
GET /fhir/Patient?
  fragility-tier=F1_IMMINENT,F2_FRAGILE&
  current-pdc=ge60&
  current-pdc=le80&
  _count=50&
  _sort=-priority-score
```

**Performance:** 🚀 **< 100ms** (indexed query)

**Requires:**
- ✅ Custom search parameters deployed
- ✅ Patient extensions updated with latest values

#### Option 2: Filter via Observations (FLEXIBLE)

**Query built:**

```typescript
// First get matching observations
const observations = await medplum.search('Observation', {
  code: 'pdc-mac',
  'value-quantity': 'ge60',
  'value-quantity': 'le80',
  _sort: '-effective',
});

// Then get unique patient IDs
const patientIds = [...new Set(observations.map(o => o.subject.reference))];

// Then fetch patients
const patients = await Promise.all(
  patientIds.map(id => medplum.readResource('Patient', id))
);
```

**Performance:** ⚠️ **500ms - 2s** (multiple queries + JOINs)

**Requires:**
- ✅ Observations exist
- ❌ No custom search parameters needed

#### Recommended Hybrid Approach

```typescript
// Use Patient extensions for list view (fast)
const patientsListView = await medplum.search('Patient', {
  'fragility-tier': 'F1_IMMINENT',
  _count: 50,
});

// Use Observations for detail view (full history)
const pdcHistory = await medplum.search('Observation', {
  subject: `Patient/${patientId}`,
  code: 'pdc-mac',
  _sort: '-effective',
});
```

---

## Migration Strategy

### Scenario 1: Medplum Cloud → Self-Hosted AWS

**Impact on Derived Data:** ✅ **NONE** (data moves with you)

**Steps:**

1. Export all resources from Medplum Cloud (includes Observations with PDC)
2. Deploy Medplum to your AWS
3. Import resources to self-hosted
4. Redeploy search parameters
5. Update env variable
6. ✅ App works identically

**What persists:**
- ✅ All Patient data
- ✅ All MedicationDispense data
- ✅ All Observation data (PDC calculations)
- ✅ All extensions on Patient resources

**What needs redeployment:**
- ⚠️ SearchParameter resources (redeploy script)
- ⚠️ StructureDefinition resources (redeploy script)

### Scenario 2: Medplum → Different FHIR Server (e.g., HAPI)

**Impact:** ⚠️ **MODERATE** (need adapter layer)

**Challenges:**
- Search syntax might differ slightly
- Extensions stored identically (FHIR standard)
- Authentication mechanism differs

**Migration:**

```typescript
// Before (Medplum)
import { MedplumClient } from '@medplum/core';
const client = new MedplumClient({ baseUrl, clientId, clientSecret });

// After (Generic FHIR)
import { Client } from 'fhir-kit-client';
const client = new Client({ baseUrl });
client.bearerToken = await getOAuthToken();
```

**Effort:** 1-2 weeks to adapt all queries

### Scenario 3: Change Calculation Logic

**Impact:** ✅ **EASY** (just recalculate)

**Example:** PDC threshold changes from 80% to 85%

```typescript
// Update constant
export const PDC_TARGET = 85; // was 80

// Recalculate all patients
npx tsx scripts/batch-calculate-all-patients.ts 2025

// Old Observations remain (historical data preserved)
// New Observations created with updated logic
```

**Historical Data:** ✅ **PRESERVED**

```
Observation (old)
  effectiveDate: 2025-11-01
  pdc: 82%
  tier: COMPLIANT (under old 80% threshold)

Observation (new)
  effectiveDate: 2025-12-01
  pdc: 82%
  tier: F4_COMFORTABLE (under new 85% threshold)
```

---

## Summary: Complete Data Flow

### On Day 1 (Now)

```
1. Run verification scripts → Read-only, no changes
2. Deploy search parameters → One-time setup
3. Run batch calculation → Creates Observations
4. (Optional) Update Patient extensions → Caches summary
```

### Ongoing (After Phase 2 UI is Live)

```
Daily/Nightly Cron Job:
  ├─→ Fetch all active patients
  ├─→ Get dispenses for each
  ├─→ Calculate PDC + fragility
  ├─→ Store as Observation (versioned)
  └─→ Update Patient extensions (cached)

User Opens UI:
  ├─→ Query: GET /fhir/Patient?fragility-tier=F1&_count=50
  ├─→ Medplum returns patients (with extensions, fast)
  ├─→ Display in table with filters
  └─→ User clicks patient → Fetch Observation history

User Triggers Recalculation (optional):
  ├─→ POST /api/calculate-pdc?patientId=123
  ├─→ Server calculates PDC
  ├─→ Creates new Observation
  ├─→ Updates Patient extensions
  └─→ Returns fresh data to UI
```

### Migration (Future)

```
Medplum Cloud → Self-Hosted:
  ├─→ Export all FHIR resources
  ├─→ Deploy Medplum to AWS
  ├─→ Import FHIR resources
  ├─→ Redeploy search parameters
  ├─→ Update MEDPLUM_BASE_URL
  └─→ ✅ Zero code changes
```

---

## Decision Matrix

| Requirement | Patient Extensions | Observations Only | Both (Recommended) |
|-------------|-------------------|-------------------|-------------------|
| Fast list views | ✅ < 100ms | ❌ 500ms+ | ✅ < 100ms |
| Historical data | ❌ No | ✅ Yes | ✅ Yes |
| FHIR compliant | ⚠️ Custom | ✅ Standard | ✅ Standard |
| Easy filtering | ✅ Native | ❌ Complex | ✅ Native |
| Migration | ⚠️ Must recalculate | ✅ Easy | ✅ Easy |
| Storage cost | ✅ Low | ⚠️ Medium | ⚠️ Medium |

**Recommendation:** Use **Both** (Observations + Patient Extensions)

---

## Next Actions

### Before Phase 2 UI Development

1. **Deploy Search Parameters** (one-time):
   ```bash
   npx tsx scripts/deploy-search-parameters.ts
   ```

2. **Run Batch Calculation** (creates Observations):
   ```bash
   DRY_RUN=false npx tsx scripts/batch-calculate-all-patients.ts 2025
   ```

3. **Verify Data Exists**:
   ```bash
   # Check observations created
   curl "$MEDPLUM_BASE_URL/fhir/Observation?code=pdc-mac&_count=10"
   ```

4. **Build UI** that queries Patient resources with extensions

---

## Questions?

- **"Do I need to recalculate every time UI loads?"** → No, use cached Patient extensions
- **"What if calculation is stale?"** → Show "last calculated" timestamp, offer refresh button
- **"How often to recalculate?"** → Nightly batch (good enough for MVP)
- **"Can I migrate to different FHIR server?"** → Yes, with 1-2 weeks adapter work
- **"What about real-time?"** → Phase 3+ (Medplum Subscriptions or CDC from PostgreSQL)

---

**You are here:** ✅ Verification scripts ready to run
**Next:** Run scripts, see results, then deploy search parameters
