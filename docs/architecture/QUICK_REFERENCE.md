# Quick Reference: Data Flow & Architecture

## TL;DR - What Happens When

### When You Run Verification Scripts (Now)

```
verify-medplum-connection.ts
  ├─→ Connects to Medplum ✅
  ├─→ Authenticates ✅
  ├─→ Counts resources ✅
  └─→ NO writes, NO infrastructure changes

calculate-patient-pdc.ts
  ├─→ Fetches MedicationDispense (reads existing data)
  ├─→ Calculates PDC in memory
  ├─→ Calculates fragility tier in memory
  ├─→ (Optional) Creates Observation resource
  └─→ Does NOT create search parameters or extensions

batch-calculate-all-patients.ts
  ├─→ Processes multiple patients
  ├─→ Creates Observation resources (when DRY_RUN=false)
  └─→ Does NOT touch Patient resources yet
```

### When You Deploy Infrastructure (Before Phase 2 UI)

```
deploy-search-parameters.ts
  ├─→ Creates SearchParameter resources in Medplum
  ├─→ Enables fast filtering: ?fragility-tier=F1_IMMINENT
  └─→ Run ONCE per Medplum instance

(Optional) update-patient-extensions.ts
  ├─→ Updates Patient resources with extensions
  ├─→ Caches summary (PDC, tier, priority) on Patient
  └─→ Enables fast list queries
```

---

## Data Storage: Two Strategies

### Strategy A: Observations Only (Phase 2 MVP)

```
Source Data              Calculated Data
─────────────            ───────────────
MedicationDispense  →    Observation
  - whenHandedOver         - pdc: 78.5%
  - daysSupply             - tier: F2_FRAGILE
  - medication             - priority: 105
                           - gapDaysRemaining: 12
                           - effectiveDate
```

**Pros:** Simple, versioned, FHIR standard
**Cons:** Requires JOINs for patient list

**Query:**
```typescript
// Get patient
const patient = await medplum.readResource('Patient', id);

// Get latest PDC (separate query)
const observations = await medplum.search('Observation', {
  subject: `Patient/${id}`,
  code: 'pdc-mac',
  _sort: '-effective',
  _count: '1',
});
```

### Strategy B: Patient Extensions + Observations (Recommended)

```
Source Data              Calculated Data              Cached Data
─────────────            ───────────────              ───────────
MedicationDispense  →    Observation            →     Patient.extension[]
  - whenHandedOver         - pdc: 78.5%                - current-pdc: 78.5
  - daysSupply             - tier: F2_FRAGILE          - fragility-tier: F2
  - medication             - priority: 105             - priority-score: 105
                           - effectiveDate             - days-to-runout: 5
                           (full history)               (latest only)
```

**Pros:** Fast queries, history preserved
**Cons:** Data duplication, must sync

**Query:**
```typescript
// Single query gets patient + PDC summary
const patients = await medplum.search('Patient', {
  'fragility-tier': 'F1_IMMINENT',
  'priority-score': 'gt100',
  _count: 50,
});
// Returns patients with extensions inline, no JOINs
```

---

## Migration Scenarios

### Scenario 1: Medplum Cloud → Self-Hosted AWS

**Steps:**
1. Export data: `curl $MEDPLUM_CLOUD/fhir/$export`
2. Deploy Medplum to AWS (Terraform)
3. Import data: `curl $YOUR_MEDPLUM/fhir -d @bundle.json`
4. Redeploy search parameters: `npx tsx scripts/deploy-search-parameters.ts`
5. Update env: `MEDPLUM_BASE_URL=https://medplum.yourcompany.com`

**Code Changes:** ✅ **ZERO** (just env variable)

**Data Migration:**
- ✅ All Patients migrate
- ✅ All MedicationDispenses migrate
- ✅ All Observations migrate (PDC history preserved)
- ✅ All Patient extensions migrate
- ⚠️ SearchParameters must be redeployed (one command)

**Effort:** 1-2 days

---

### Scenario 2: Recalculate All PDCs (Logic Change)

**When:** PDC threshold changes, new bonus added, bug fix

**Steps:**
1. Update code: `export const PDC_TARGET = 85;`
2. Recalculate: `npx tsx scripts/batch-calculate-all-patients.ts 2025`
3. ✅ Done

**Data:**
- ✅ Old Observations preserved (history)
- ✅ New Observations created
- ✅ Patient extensions updated with latest

**Effort:** 5 minutes + compute time

---

## When Values Get Calculated

### Initial Load (Now - Run Scripts)

```
Day 1:
  ├─→ Run batch-calculate-all-patients.ts
  ├─→ Creates Observation for each patient
  └─→ Database now has PDC data
```

### Ongoing Updates (After Phase 2 UI)

**Option 1: Nightly Batch (Recommended for MVP)**

```
Cron Job (2 AM daily):
  ├─→ scripts/batch-calculate-all-patients.ts
  ├─→ Recalculates all active patients
  ├─→ Creates new Observations
  └─→ Updates Patient extensions

User opens UI at 9 AM:
  ├─→ Sees PDC from last night's calculation
  └─→ "Last updated: 7 hours ago"
```

**Option 2: On-Demand (Phase 3)**

```
User clicks "Refresh PDC" button:
  ├─→ POST /api/calculate-pdc?patientId=123
  ├─→ Server calculates PDC
  ├─→ Creates new Observation
  ├─→ Returns fresh data
  └─→ UI updates immediately
```

**Option 3: Event-Driven (Phase 4+)**

```
Pharmacy submits new claim:
  ├─→ Creates MedicationDispense in Medplum
  ├─→ Triggers Medplum Bot or webhook
  ├─→ Bot calculates PDC automatically
  ├─→ Creates Observation + updates Patient
  └─→ UI shows real-time update (via subscription)
```

---

## UI Filtering Flow (Phase 2)

### User Interaction

```
User opens Patient List
  ↓
Applies filters: Tier=F1, PDC<80%, Measure=MAC
  ↓
UI builds query
  ↓
Query sent to Medplum
  ↓
Results returned
  ↓
Table displays patients
```

### Behind the Scenes

**Without Patient Extensions:**
```typescript
// Query 1: Get matching observations
const obs = await medplum.search('Observation', {
  code: 'pdc-mac',
  'value-quantity': 'lt80',
});

// Extract patient IDs (in app)
const patientIds = obs.map(o => o.subject.reference);

// Query 2: Get patients (N queries)
const patients = await Promise.all(
  patientIds.map(id => medplum.readResource('Patient', id))
);

// Filter in app for tier
const filtered = patients.filter(p => getTier(p) === 'F1');
```

**Performance:** ❌ **2-5 seconds** (multiple queries + app filtering)

**With Patient Extensions + Search Parameters:**
```typescript
// Single query with all filters
const patients = await medplum.search('Patient', {
  'fragility-tier': 'F1_IMMINENT',
  'current-pdc': 'lt80',
  'active-measures': 'MAC',
  _count: 50,
  _sort: '-priority-score',
});
```

**Performance:** ✅ **< 200ms** (single indexed query)

---

## Infrastructure Setup Checklist

### One-Time Setup (Before Phase 2)

- [ ] Deploy search parameters: `npx tsx scripts/deploy-search-parameters.ts`
- [ ] Verify search works: `curl "$MEDPLUM_BASE_URL/fhir/SearchParameter?code=fragility-tier"`
- [ ] Run initial calculation: `DRY_RUN=false npx tsx scripts/batch-calculate-all-patients.ts`
- [ ] Verify observations created: `curl "$MEDPLUM_BASE_URL/fhir/Observation?code=pdc-mac&_count=10"`

### Ongoing (After Phase 2 Launch)

- [ ] Schedule nightly batch job (cron/AWS EventBridge)
- [ ] Monitor calculation errors
- [ ] Set up alerts for stale data (> 48 hours)

---

## Quick Commands

```bash
# Verify connection
npx tsx scripts/dev-tools/verification/verify-medplum-connection.ts

# Calculate one patient
npx tsx scripts/dev-tools/verification/calculate-patient-pdc.ts auto

# Batch calculate (dry run)
npx tsx scripts/dev-tools/verification/batch-calculate-all-patients.ts 2025

# Batch calculate (live)
DRY_RUN=false npx tsx scripts/dev-tools/verification/batch-calculate-all-patients.ts 2025

# Deploy search parameters
npx tsx scripts/deploy-search-parameters.ts

# Test query (after setup)
curl "$MEDPLUM_BASE_URL/fhir/Patient?fragility-tier=F1_IMMINENT&_count=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Decision Tree

**"Should I use Patient extensions?"**

```
Do you need fast list views with filters?
  ├─→ YES: Use Patient extensions + Observations
  └─→ NO: Use Observations only

Will you migrate to different FHIR server?
  ├─→ YES: Prefer Observations (portable)
  └─→ NO: Patient extensions are fine

Do you need PDC history over time?
  ├─→ YES: Must use Observations
  └─→ NO: Extensions alone might work
```

**Recommendation:** Use **both** (Observations for history, Patient extensions for speed)

---

## FAQ

**Q: Do verification scripts create extensions?**
A: No, they only calculate and optionally store Observations.

**Q: When do I run deploy-search-parameters?**
A: Once before building Phase 2 UI.

**Q: Will my app break if I migrate from Medplum cloud to self-hosted?**
A: No, just change the MEDPLUM_BASE_URL env variable.

**Q: How often should I recalculate PDC?**
A: Nightly batch is good for MVP. Real-time in Phase 3+.

**Q: Can I filter patients by PDC without extensions?**
A: Yes, but it's slower (requires joining Observations).

**Q: What if I want to change PDC logic?**
A: Update code, rerun batch script. Old data preserved as history.

---

**Read Full Details:** `docs/architecture/DATA_LIFECYCLE_AND_DEPLOYMENT.md`
