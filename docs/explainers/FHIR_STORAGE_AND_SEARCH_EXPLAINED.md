# FHIR Storage & Search: A Complete Guide for Beginners

**Target Audience**: Developers new to FHIR
**Reading Time**: 15 minutes
**Last Updated**: 2026-01-05

---

## Table of Contents

1. [The Two Types of "Storage"](#the-two-types-of-storage)
2. [How FHIR Data is Actually Stored](#how-fhir-data-is-actually-stored)
3. [What SearchParameters Really Do](#what-searchparameters-really-do)
4. [Why Reindexing Takes Time](#why-reindexing-takes-time)
5. [Extension Indexing Deep Dive](#extension-indexing-deep-dive)
6. [Practical Examples](#practical-examples)
7. [Common Misconceptions](#common-misconceptions)

---

## The Two Types of "Storage"

When working with FHIR systems like Medplum, there are **two completely different types of storage** that often confuse beginners:

### Type 1: Client-Side Storage (Authentication & Session)

**What it is**: Where the MedplumClient stores authentication tokens, session data, and client state.

**Where it lives**:
- **Browser**: `localStorage` or `sessionStorage`
- **Node.js scripts**: Custom implementation (we used `Map<string, string>`)
- **Mobile apps**: Secure storage (Keychain, KeyStore)

**What it stores**:
```typescript
// Example data stored client-side
{
  "activeLogin": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "project": "b62eb198-92f8-43c8-ae13-55c7e221f9ce"
  }
}
```

**Why we needed custom storage for Node.js scripts**:
```typescript
// Browsers have localStorage automatically:
const medplum = new MedplumClient({
  baseUrl: 'https://api.medplum.com/',
  // In browser, storage is automatic (uses localStorage)
});

// Node.js scripts DON'T have localStorage, so we provide:
const memoryStorage = new Map<string, string>();
const medplum = new MedplumClient({
  baseUrl: 'https://api.medplum.com/',
  storage: {
    getString: (key) => memoryStorage.get(key),
    setString: (key, value) => {
      if (value) memoryStorage.set(key, value);
      else memoryStorage.delete(key);
    },
    getObject: (key) => {
      const value = memoryStorage.get(key);
      return value ? JSON.parse(value) : undefined;
    },
    setObject: (key, value) => {
      memoryStorage.set(key, JSON.stringify(value));
    },
    clear: () => memoryStorage.clear(),
    makeKey: (key) => key,
  },
});
```

**Key Point**: This storage is ONLY for client session management. Patient data, Observations, etc. are NOT stored here.

---

### Type 2: Server-Side Storage (FHIR Resources)

**What it is**: Where Medplum stores actual patient data, observations, medications, etc.

**Where it lives**: PostgreSQL database in Medplum's infrastructure (AWS RDS)

**What it stores**: All FHIR resources as JSONB documents

**Example Patient stored in PostgreSQL**:
```sql
-- Simplified view of how Medplum stores FHIR resources
CREATE TABLE fhir_resource (
  id UUID PRIMARY KEY,
  resource_type VARCHAR(64),
  content JSONB,  -- ← The actual FHIR resource
  last_updated TIMESTAMP,
  -- indexes, constraints, etc.
);

-- Example row
{
  id: 'd090028b-fc0c-451e-a0cc-ef40f9090c5b',
  resource_type: 'Patient',
  content: {
    "resourceType": "Patient",
    "id": "d090028b-fc0c-451e-a0cc-ef40f9090c5b",
    "name": [{
      "given": ["Elvin140", "Jamel269"],
      "family": "Zulauf375"
    }],
    "birthDate": "1942-04-25",
    "extension": [
      {
        "url": "https://ignitehealth.io/fhir/current-pdc",
        "valueDecimal": 0.85
      }
    ]
  }
}
```

---

## How FHIR Data is Actually Stored

### PostgreSQL + JSONB = FHIR Storage

Medplum (like most modern FHIR servers) uses **PostgreSQL with JSONB** columns to store FHIR resources.

#### Why JSONB?

1. **Flexibility**: FHIR resources have complex nested structures
2. **Performance**: JSONB is binary format, faster than text JSON
3. **Indexing**: PostgreSQL can create indexes on JSONB fields
4. **Schema-free**: New extensions don't require schema migrations

#### Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL Database (AWS RDS)                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TABLE: fhir_resource                                       │
│  ┌──────────┬──────────────┬──────────────────────────┐    │
│  │ id       │ resource_type│ content (JSONB)          │    │
│  ├──────────┼──────────────┼──────────────────────────┤    │
│  │ uuid-123 │ Patient      │ {"resourceType":         │    │
│  │          │              │  "Patient", "name": ...} │    │
│  ├──────────┼──────────────┼──────────────────────────┤    │
│  │ uuid-456 │ Observation  │ {"resourceType":         │    │
│  │          │              │  "Observation",          │    │
│  │          │              │  "extension": [{         │    │
│  │          │              │    "url": "...",         │    │
│  │          │              │    "valueCode": "F1"     │    │
│  │          │              │  }]}                     │    │
│  └──────────┴──────────────┴──────────────────────────┘    │
│                                                             │
│  INDEXES (B-Tree, GIN, etc.)                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ idx_resource_type                                   │   │
│  │ idx_patient_name (GIN on content->'name')           │   │
│  │ idx_observation_code (GIN on content->'code')       │   │
│  │ idx_observation_fragility_tier (GIN on              │   │
│  │     content->'extension'->fragility-tier)           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Does Medplum Create New Columns?

**No, it does NOT create new columns.** Instead, it creates **indexes on JSONB paths**.

**Traditional SQL (Wrong for FHIR)**:
```sql
-- ❌ FHIR servers DON'T do this
ALTER TABLE patient ADD COLUMN current_pdc DECIMAL;
ALTER TABLE patient ADD COLUMN fragility_tier VARCHAR(50);
```

**FHIR Approach (Correct)**:
```sql
-- ✅ FHIR servers DO this
-- Create index on JSONB path for fast queries
CREATE INDEX idx_patient_current_pdc ON fhir_resource
USING GIN ((content -> 'extension'));

-- More specifically (simplified):
CREATE INDEX idx_observation_fragility_tier ON fhir_resource
USING GIN ((
  content -> 'extension' ->
  jsonb_array_elements(content -> 'extension')
  @> '{"url": "https://ignitehealth.io/fhir/fragility-tier"}'
));
```

**Why this approach?**
- No schema changes needed for new extensions
- Maintains FHIR's flexible data model
- Still provides fast indexed queries
- Supports multiple extensions per resource

---

## What SearchParameters Really Do

### The Problem SearchParameters Solve

Imagine you have this Observation:

```json
{
  "resourceType": "Observation",
  "id": "obs-123",
  "code": { "coding": [{ "code": "pdc-mac" }] },
  "subject": { "reference": "Patient/123" },
  "valueQuantity": { "value": 0.85 },
  "extension": [
    {
      "url": "https://ignitehealth.io/fhir/fragility-tier",
      "valueCode": "F1_IMMINENT"
    },
    {
      "url": "https://ignitehealth.io/fhir/priority-score",
      "valueInteger": 150
    },
    {
      "url": "https://ignitehealth.io/fhir/is-current-pdc",
      "valueBoolean": true
    }
  ]
}
```

**Question**: How do you query "Give me all current PDC observations for F1 patients"?

**Without SearchParameters**:
```
GET /Observation?code=pdc-mac
→ Returns ALL observations
→ You must filter in application code by parsing extensions
→ SLOW, inefficient, can't use database indexes
```

**With SearchParameters**:
```
GET /Observation?is-current-pdc=true&fragility-tier=F1_IMMINENT
→ Database uses indexes to return only matching observations
→ FAST, efficient, happens at database level
```

### SearchParameter Definition

When we deployed this SearchParameter:

```typescript
{
  resourceType: 'SearchParameter',
  name: 'fragility-tier',
  code: 'fragility-tier',
  base: ['Observation'],
  type: 'token',
  expression: `Observation.extension.where(url='https://ignitehealth.io/fhir/fragility-tier').valueCode`,
}
```

**What Medplum does**:

1. **Stores the SearchParameter definition** in the database
2. **Creates a database index** on that JSONB path
3. **Registers the query parameter** so the API recognizes `fragility-tier=F1`
4. **Reindexes existing resources** so they're searchable

### The Database Index Created

```sql
-- Conceptual representation (actual implementation is more complex)
CREATE INDEX idx_observation_fragility_tier ON fhir_resource
USING GIN (
  (content -> 'extension')
) WHERE content ->> 'resourceType' = 'Observation';

-- Allows fast queries like:
SELECT * FROM fhir_resource
WHERE resource_type = 'Observation'
  AND content -> 'extension' @>
    '[{"url": "https://ignitehealth.io/fhir/fragility-tier", "valueCode": "F1_IMMINENT"}]';
```

**Key Point**: SearchParameters tell the FHIR server:
- What to index (JSONB path)
- How to query it (parameter name)
- How to compare values (type: token, number, string, etc.)

---

## Why Reindexing Takes Time

### What is Reindexing?

When you deploy a new SearchParameter, Medplum needs to:

1. **Parse the SearchParameter** definition
2. **Validate** the FHIRPath expression
3. **Create database indexes** on the specified path
4. **Scan existing resources** and populate the index
5. **Register the search parameter** in the query engine

### The Time-Consuming Part: Step 4

```
Example: 1000 Observation resources in database

For each Observation:
1. Read the JSONB content
2. Parse extensions array
3. Find matching extension by URL
4. Extract valueCode/valueInteger/etc.
5. Add to index entry

With 1000 observations × 7 search parameters = 7000 index entries to create

PostgreSQL must:
- Acquire locks (briefly)
- Update index structures
- Maintain transaction log
- Ensure consistency
```

### Why It Can't Be Instant

**Database Considerations**:
- Must maintain ACID properties (Atomicity, Consistency, Isolation, Durability)
- Can't block other queries while reindexing
- Must update multiple index structures
- Needs to validate data integrity

**Typical Timeline**:
- Small dataset (<1000 resources): 1-5 minutes
- Medium dataset (1000-10,000): 5-30 minutes
- Large dataset (>10,000): 30+ minutes to hours

**In our case**:
- 729 Observations
- 14 Patients
- 100+ MedicationDispenses
- 7 SearchParameters
- **Estimated time**: 10-30 minutes

### What Happens During Reindexing

```
┌─────────────────────────────────────────────────────────────┐
│ Medplum Backend                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Deploy API Call Received                                │
│     ✓ Validate SearchParameter definition                  │
│     ✓ Store SearchParameter resource                       │
│                                                             │
│  2. Background Indexing Task Started                        │
│     ⏳ Scanning Observation table...                        │
│     ⏳ Processing resource 1/729                            │
│     ⏳ Processing resource 2/729                            │
│     ...                                                     │
│     ⏳ Creating GIN indexes on JSONB paths...               │
│                                                             │
│  3. Query Engine Update                                     │
│     ⏳ Registering 'fragility-tier' parameter               │
│     ⏳ Configuring type=token comparisons                   │
│                                                             │
│  4. Completed                                               │
│     ✅ Index ready                                          │
│     ✅ Queries will now use index                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### During Reindexing

**What works**:
- ✅ Reading existing resources
- ✅ Creating new resources
- ✅ Updating resources
- ✅ Querying by standard parameters (patient, code, date)

**What doesn't work yet**:
- ❌ Querying by new custom parameters (returns "Unknown search parameter")

### After Reindexing Completes

**What changes**:
```bash
# Before reindexing (FAILS)
GET /Observation?fragility-tier=F1_IMMINENT
→ OperationOutcomeError: Unknown search parameter: fragility-tier

# After reindexing (WORKS)
GET /Observation?fragility-tier=F1_IMMINENT
→ Returns: [ {Observation with F1 tier}, {Observation with F1 tier}, ... ]
```

---

## Extension Indexing Deep Dive

### How Extensions Are Stored

Extensions in FHIR are arrays of objects within the JSONB document:

```json
{
  "resourceType": "Observation",
  "id": "obs-456",
  "extension": [
    {
      "url": "https://ignitehealth.io/fhir/fragility-tier",
      "valueCode": "F2_FRAGILE"
    },
    {
      "url": "https://ignitehealth.io/fhir/priority-score",
      "valueInteger": 105
    },
    {
      "url": "https://ignitehealth.io/fhir/gap-days-remaining",
      "valueInteger": 12
    }
  ]
}
```

**Storage in PostgreSQL**:
```sql
content = '{
  "resourceType": "Observation",
  "extension": [
    {"url": "...", "valueCode": "F2_FRAGILE"},
    {"url": "...", "valueInteger": 105}
  ]
}'::jsonb
```

### Querying Extensions Without Indexes

**Slow query (no index)**:
```sql
-- Finds extensions by scanning entire JSONB
SELECT * FROM fhir_resource
WHERE resource_type = 'Observation'
  AND content -> 'extension' @>
    '[{"url": "https://ignitehealth.io/fhir/fragility-tier"}]';

-- Performance: O(n) - scans every Observation
-- 1000 observations = 1000 JSONB parses
```

### Querying Extensions With Indexes

**Fast query (with GIN index)**:
```sql
-- Uses GIN index on extension array
SELECT * FROM fhir_resource
WHERE resource_type = 'Observation'
  AND content -> 'extension' @>
    '[{"url": "https://ignitehealth.io/fhir/fragility-tier", "valueCode": "F1_IMMINENT"}]';

-- Performance: O(log n) - uses index lookup
-- 1000 observations = instant lookup
```

### GIN Index Structure

**GIN (Generalized Inverted Index)** is perfect for JSONB because it indexes every key-value pair:

```
┌────────────────────────────────────────────────────────┐
│ GIN Index: idx_observation_fragility_tier              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Index Key                          → Resource IDs    │
│  ─────────────────────────────────────────────────    │
│  fragility-tier: F1_IMMINENT        → [obs-1, obs-5]  │
│  fragility-tier: F2_FRAGILE         → [obs-2, obs-3]  │
│  fragility-tier: F3_MODERATE        → [obs-4, obs-7]  │
│  fragility-tier: COMPLIANT          → [obs-6, obs-8]  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Query execution**:
```
GET /Observation?fragility-tier=F1_IMMINENT

1. Parse query parameter
2. Lookup in GIN index: fragility-tier: F1_IMMINENT
3. Get resource IDs: [obs-1, obs-5]
4. Fetch full resources by ID
5. Return results

Total time: <10ms (vs 500ms+ without index)
```

---

## Practical Examples

### Example 1: Deploying a SearchParameter

**Step 1: Define SearchParameter**
```typescript
const searchParam: SearchParameter = {
  resourceType: 'SearchParameter',
  name: 'priority-score',
  code: 'priority-score',
  base: ['Observation'],
  type: 'number',
  expression: `Observation.extension.where(url='https://ignitehealth.io/fhir/priority-score').valueInteger`,
};
```

**Step 2: Deploy to Medplum**
```typescript
await medplum.createResource(searchParam);
```

**Step 3: Wait for Reindexing**
```
⏳ 10-30 minutes (automatic, no action needed)
```

**Step 4: Use in Queries**
```typescript
// Find high-priority patients
const urgent = await medplum.searchResources('Observation', {
  'is-current-pdc': 'true',
  'priority-score': 'gt100', // greater than 100
  _sort: '-priority-score', // sort descending
});
```

### Example 2: Checking if Reindexing is Complete

```typescript
async function isReindexComplete(medplum: MedplumClient): Promise<boolean> {
  try {
    // Try to use the custom search parameter
    await medplum.searchResources('Observation', {
      'is-current-pdc': 'true',
      _count: '1',
    });

    console.log('✅ Reindexing complete - search parameter works');
    return true;
  } catch (error: any) {
    if (error.message?.includes('Unknown search parameter')) {
      console.log('⏳ Still reindexing - try again in a few minutes');
      return false;
    }
    throw error; // Different error
  }
}
```

### Example 3: Query Performance Comparison

**Before SearchParameter Deployment**:
```typescript
// Must fetch ALL observations and filter in code
const allObs = await medplum.searchResources('Observation', {
  code: 'pdc-mac',
  _count: '1000',
});

// Client-side filtering (SLOW)
const f1Patients = allObs.filter(obs => {
  const tier = obs.extension?.find(
    ext => ext.url === 'https://ignitehealth.io/fhir/fragility-tier'
  )?.valueCode;
  return tier === 'F1_IMMINENT';
});

// Performance: 2000ms (fetches 1000 resources, filters in JS)
```

**After SearchParameter Deployment**:
```typescript
// Database-level filtering (FAST)
const f1Patients = await medplum.searchResources('Observation', {
  code: 'pdc-mac',
  'fragility-tier': 'F1_IMMINENT',
  'is-current-pdc': 'true',
});

// Performance: 50ms (database uses indexes)
```

**Speedup**: 40x faster! 🚀

---

## Common Misconceptions

### Misconception 1: "SearchParameters Create New Columns"

**❌ Wrong**: SearchParameters create new columns in the database

**✅ Correct**: SearchParameters create **indexes on JSONB paths**, not new columns

**Why this matters**:
- FHIR resources stay as JSONB documents
- No schema migrations needed
- Extensions remain flexible
- Multiple extensions of same type supported

---

### Misconception 2: "Client Storage = Data Storage"

**❌ Wrong**: The `storage` parameter in MedplumClient is where patient data is stored

**✅ Correct**: Client `storage` is only for authentication tokens. Patient data is in PostgreSQL.

**Analogy**:
- Client storage = Your house key (gives you access)
- Server storage = The bank vault (where valuables are actually kept)

---

### Misconception 3: "Reindexing Should Be Instant"

**❌ Wrong**: SearchParameter deployment should work immediately

**✅ Correct**: Reindexing is a background task that takes 10-60 minutes

**Why it takes time**:
- Must scan all existing resources
- Must parse JSONB documents
- Must populate index structures
- Must maintain database consistency
- Can't block other operations

---

### Misconception 4: "Extensions Are Separate Resources"

**❌ Wrong**: Extensions are separate FHIR resources that reference the main resource

**✅ Correct**: Extensions are **part of** the resource's JSONB structure

**Example**:
```json
{
  "resourceType": "Observation",
  "id": "obs-123",
  "extension": [
    {
      "url": "fragility-tier",
      "valueCode": "F1"
    }
  ]
}
```

The extension is **inside** the Observation JSON, not a separate resource.

---

### Misconception 5: "One Extension = One SearchParameter"

**❌ Wrong**: You need a separate SearchParameter for each extension

**✅ Correct**: You CAN create one SearchParameter per extension, but you can also:
- Create SearchParameters on standard fields (name, birthDate)
- Create composite SearchParameters (search by multiple fields at once)
- Create SearchParameters on nested structures

**We created 7 SearchParameters**:
1. `fragility-tier` - Extension on Observation
2. `priority-score` - Extension on Observation
3. `is-current-pdc` - Extension on Observation
4. `ma-measure` - Extension on Observation
5. `days-until-runout` - Extension on Observation
6. `patient-fragility-tier` - Extension on Patient
7. `patient-priority-score` - Extension on Patient

---

## Summary: Key Takeaways

### 🔑 Storage Types

| Type | Purpose | Location | Example |
|------|---------|----------|---------|
| **Client Storage** | Auth tokens | Browser localStorage or Node.js Map | `{ accessToken: "..." }` |
| **Server Storage** | FHIR resources | PostgreSQL (JSONB) | `{ resourceType: "Patient", ... }` |

### 🔑 SearchParameters

- **What they do**: Enable efficient querying of extensions
- **How they work**: Create database indexes on JSONB paths
- **Deployment time**: 10-60 minutes for reindexing
- **Performance gain**: 10x-100x faster queries

### 🔑 Extension Indexing

- **Storage**: Extensions are JSONB arrays within resources
- **Without index**: O(n) scan of all resources
- **With index**: O(log n) index lookup
- **Index type**: GIN (Generalized Inverted Index) on JSONB

### 🔑 Why Reindexing Takes Time

1. Must scan existing resources
2. Must parse JSONB documents
3. Must populate index structures
4. Must maintain consistency
5. Can't block other operations

---

## Further Reading

### FHIR Specification
- [SearchParameter Resource](https://hl7.org/fhir/R4/searchparameter.html)
- [Search in FHIR](https://hl7.org/fhir/R4/search.html)
- [Extensions](https://hl7.org/fhir/R4/extensibility.html)

### PostgreSQL
- [JSONB Data Type](https://www.postgresql.org/docs/current/datatype-json.html)
- [GIN Indexes](https://www.postgresql.org/docs/current/gin.html)
- [JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)

### Medplum Docs
- [Custom Search Parameters](https://www.medplum.com/docs/search/custom-search-parameters)
- [Extensions](https://www.medplum.com/docs/fhir-basics/extensions)
- [Performance Tuning](https://www.medplum.com/docs/performance)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-05
**Feedback**: Please create an issue if any section needs clarification
