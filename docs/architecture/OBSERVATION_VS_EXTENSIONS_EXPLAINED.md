# Observation vs Extensions - What Actually Happens

## Your Question
> "Should you have not said it creates extension in the observation resource - because observations already exist?"

**Short Answer:** No - **Observation resources do NOT pre-exist**. The script **CREATES the entire Observation resource** (which includes extensions as part of its structure).

---

## The Confusion

You're thinking:
```
❌ WRONG MENTAL MODEL:
1. Observations already exist in Medplum
2. Script adds extensions to existing Observations
```

**What actually happens:**
```
✅ CORRECT MENTAL MODEL:
1. Observations do NOT exist yet
2. Script CREATES new Observation resources
3. Each Observation includes extensions in its structure
```

---

## What Actually Exists Before Running Scripts

### In Medplum Database (Right Now)

**Resources that EXIST:**
```json
// Patient (basic demographic info)
{
  "resourceType": "Patient",
  "id": "patient-123",
  "name": [{ "given": ["Maria"], "family": "Gonzalez" }],
  "birthDate": "1965-03-15"
  // NO extensions yet, NO PDC data
}

// MedicationDispense (pharmacy claims)
{
  "resourceType": "MedicationDispense",
  "id": "dispense-456",
  "subject": { "reference": "Patient/patient-123" },
  "whenHandedOver": "2025-11-01T10:00:00Z",
  "daysSupply": { "value": 30 },
  "status": "completed"
}
```

**Resources that DO NOT EXIST:**
```
❌ NO Observation resources for PDC
❌ NO extensions on Patient (yet)
```

---

## What Happens When You Run calculate-patient-pdc.ts

### Step-by-Step Process

```typescript
// STEP 1: Fetch existing data (READ-ONLY)
const dispenses = await getPatientDispenses(medplum, 'patient-123', 2025);
// Fetches: MedicationDispense resources (already exist)

// STEP 2: Calculate PDC (IN-MEMORY, no database writes)
const pdcResult = calculatePDCFromDispenses({
  dispenses,
  measurementYear: 2025,
  currentDate: new Date(),
});
// Returns: { pdc: 78.5, gapDaysRemaining: 12, ... }

// STEP 3: Calculate fragility tier (IN-MEMORY, no database writes)
const fragilityResult = calculateFragility({
  pdcResult,
  refillsRemaining: 3,
  measureTypes: ['MAC'],
  isNewPatient: false,
  currentDate: new Date(),
});
// Returns: { tier: 'F2_FRAGILE', priorityScore: 105, ... }

// STEP 4: Create NEW Observation resource (DATABASE WRITE)
const observation = await storePDCObservation(medplum, {
  patientId: 'patient-123',
  measure: 'MAC',
  pdc: pdcResult.pdc,
  fragility: fragilityResult,
  effectiveDate: new Date(),
});
// ☝️ THIS CREATES A NEW OBSERVATION RESOURCE THAT DIDN'T EXIST BEFORE
```

### What Gets Created

**NEW Observation resource** (did not exist before):

```json
{
  "resourceType": "Observation",
  "id": "obs-789",  // ← NEW ID, newly created
  "status": "final",
  "code": {
    "coding": [{
      "system": "http://ignitehealth.com/codes",
      "code": "pdc-mac",
      "display": "PDC Score - Cholesterol (MAC)"
    }]
  },
  "subject": {
    "reference": "Patient/patient-123"
  },
  "effectiveDateTime": "2025-11-29T10:00:00Z",
  "valueQuantity": {
    "value": 0.785,  // ← PDC as decimal (78.5%)
    "unit": "ratio"
  },
  "interpretation": [{
    "coding": [{
      "code": "at-risk",
      "display": "At-Risk (PDC 60-79%)"
    }]
  }],

  // ↓ EXTENSIONS are part of the Observation structure
  "extension": [
    {
      "url": "https://ignitehealth.com/fhir/extensions/fragility-tier",
      "valueCode": "F2_FRAGILE"
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/priority-score",
      "valueInteger": 105
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/gap-days-remaining",
      "valueInteger": 12
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/delay-budget",
      "valueInteger": 4
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/days-until-runout",
      "valueInteger": 5
    },
    {
      "url": "https://ignitehealth.com/fhir/extensions/is-current-pdc",
      "valueBoolean": true
    }
  ]
}
```

**Key Points:**
1. ✅ The **entire Observation** is newly created
2. ✅ Extensions are **part of the Observation structure**
3. ✅ Extensions contain derived values (tier, priority, gap days)
4. ✅ This creates a **versioned historical record**

---

## Two Types of Extensions (Important!)

### Type 1: Extensions on Observation (What Scripts Create)

```json
{
  "resourceType": "Observation",
  "extension": [
    { "url": "fragility-tier", "valueCode": "F2_FRAGILE" },
    { "url": "priority-score", "valueInteger": 105 }
  ]
}
```

**Purpose:** Store detailed PDC calculation results
**Created by:** `storePDCObservation()` when Observation is created
**Lifetime:** Permanent, historical record

### Type 2: Extensions on Patient (Optional, for Fast Queries)

```json
{
  "resourceType": "Patient",
  "extension": [
    { "url": "current-pdc", "valueDecimal": 78.5 },
    { "url": "fragility-tier", "valueCode": "F2_FRAGILE" },
    { "url": "priority-score", "valueInteger": 105 }
  ]
}
```

**Purpose:** Cache latest values for fast list queries
**Created by:** Separate script (not part of current verification scripts)
**Lifetime:** Updated each recalculation (not historical)

---

## Clarified Script Behavior

### calculate-patient-pdc.ts Actually Does:

```
✅ Reads MedicationDispense (existing data)
✅ Calculates PDC (in memory)
✅ Calculates fragility tier (in memory)
✅ CREATES NEW Observation resource
    ↳ Includes extensions as part of structure
✅ Does NOT modify Patient resource
❌ Does NOT create SearchParameter resources
```

### What "Optional" Means

```typescript
// Environment variable controls whether to store
const shouldStore = process.env.AUTO_STORE_OBSERVATIONS === 'true';

if (shouldStore) {
  // Creates Observation (with extensions)
  await storePDCObservation(medplum, { ... });
} else {
  // Just calculates and displays, doesn't store
  console.log('Calculated PDC:', pdcResult);
}
```

**By default:** Dry run mode (calculates but doesn't store)
**With flag:** Creates Observation resources

---

## Complete Data Flow Timeline

### Before Running Any Scripts

```
Medplum Database:
├── Patient/patient-123 (basic info)
├── MedicationDispense/... (many)
└── (NO Observations for PDC yet)
```

### After Running: calculate-patient-pdc.ts (with AUTO_STORE=true)

```
Medplum Database:
├── Patient/patient-123 (unchanged)
├── MedicationDispense/... (unchanged)
└── Observation/obs-789 (NEW! created with extensions)
    └── extension[]
        ├── fragility-tier: F2_FRAGILE
        ├── priority-score: 105
        ├── gap-days-remaining: 12
        └── ... more extensions
```

### After Running: batch-calculate-all-patients.ts

```
Medplum Database:
├── Patient/patient-123 (unchanged)
├── Patient/patient-456 (unchanged)
├── Patient/patient-789 (unchanged)
├── MedicationDispense/... (unchanged)
├── Observation/obs-001 (NEW! for patient-123)
├── Observation/obs-002 (NEW! for patient-456)
└── Observation/obs-003 (NEW! for patient-789)
```

### After Running: update-patient-extensions.ts (optional, Phase 2+)

```
Medplum Database:
├── Patient/patient-123
│   └── extension[] (NEW! cached summary)
│       ├── current-pdc: 78.5
│       ├── fragility-tier: F2_FRAGILE
│       └── priority-score: 105
├── MedicationDispense/... (unchanged)
└── Observation/obs-001 (unchanged, source of truth)
```

---

## Why This Architecture?

### Observations as Source of Truth

```
Observations (permanent, versioned):
  Nov 1: PDC 75%, Tier F2
  Nov 15: PDC 78%, Tier F2
  Dec 1: PDC 82%, Tier COMPLIANT

→ Historical trend preserved
→ Can audit who calculated when
→ Can see PDC improvement over time
```

### Patient Extensions as Cache (Optional)

```
Patient.extension (latest only):
  current-pdc: 82%
  fragility-tier: COMPLIANT
  last-calculated: 2025-12-01

→ Fast list queries (no JOINs)
→ Single query returns all patients with PDC
→ Trade-off: loses history
```

---

## Common Queries

### Query 1: Get Patient's PDC History

```typescript
// Get all Observations for patient
const observations = await medplum.search('Observation', {
  subject: 'Patient/patient-123',
  code: 'pdc-mac',
  _sort: '-effective',
});

// Returns all historical PDC calculations
// Nov 1, Nov 15, Dec 1, etc.
```

### Query 2: Get Patients by Tier (Requires Patient Extensions)

```typescript
// If Patient extensions exist
const patients = await medplum.search('Patient', {
  'fragility-tier': 'F1_IMMINENT',
  _count: 50,
});

// Fast, single query
```

### Query 3: Get Patients by Tier (Using Observations Only)

```typescript
// Find observations with tier F1
const observations = await medplum.search('Observation', {
  code: 'pdc-mac',
  'extension:fragility-tier': 'F1_IMMINENT',
});

// Extract patient IDs
const patientIds = observations.entry.map(e => e.resource.subject.reference);

// Fetch patients
const patients = await Promise.all(
  patientIds.map(id => medplum.readResource('Patient', id))
);

// Slower, multiple queries
```

---

## Summary: What Creates What

| Script | Creates Observation? | Adds Extensions to Observation? | Modifies Patient? |
|--------|---------------------|--------------------------------|-------------------|
| `verify-medplum-connection.ts` | ❌ No | ❌ No | ❌ No |
| `calculate-patient-pdc.ts` | ✅ Yes (if not dry-run) | ✅ Yes (part of Observation) | ❌ No |
| `batch-calculate-all-patients.ts` | ✅ Yes (if not dry-run) | ✅ Yes (part of Observation) | ❌ No |
| `update-patient-extensions.ts` (future) | ❌ No | N/A | ✅ Yes (caches summary) |

---

## Key Takeaways

1. **Observations don't pre-exist** - we create them from scratch
2. **Extensions are part of Observation structure** when created
3. **Patient extensions are separate** (optional caching layer)
4. **Two-tier storage strategy**:
   - Observations = source of truth (historical)
   - Patient extensions = cache (fast queries)

---

## Your Updated Mental Model

**BEFORE (incorrect):**
```
Observations exist → Script adds extensions to them
```

**AFTER (correct):**
```
No Observations → Script calculates PDC → Script creates NEW Observation (with extensions already inside)
```

---

**Does this clarify the confusion?** The key insight is: **Observation resources are created by our scripts, not modified.**
