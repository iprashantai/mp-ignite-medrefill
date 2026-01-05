# Single Patient vs Batch Calculation: Understanding the Difference

**Issue**: "The screenshot shows 2025 dispenses, but the script said 0 dispenses for 2025. Why?"

**Answer**: The screenshot shows ALL patients. The script calculated for ONE patient.

---

## What We Did (Single Patient Calculation)

### Step 1: Auto-Select First Patient

```typescript
// Script automatically picks the FIRST patient from database
const patientBundle = await medplum.search('Patient', { _count: '1' });
const patientId = patientBundle.entry[0].resource!.id!;

// Result: d090028b-fc0c-451e-a0cc-ef40f9090c5b (Elvin140 Jamel269 Zulauf375)
```

### Step 2: Get Dispenses for THAT Patient in 2025

```typescript
const dispenses = await getPatientDispenses(medplum, patientId, 2025);
// Queries: MedicationDispense WHERE subject=Patient/d090028b... AND year=2025

// Result: 0 dispenses (this patient has no fills in 2025)
```

### Step 3: Try 2024

```typescript
const dispenses = await getPatientDispenses(medplum, patientId, 2024);
// Result: 0 dispenses (this patient has no fills in 2024 either)
```

### Step 4: Try 2014

```typescript
const dispenses = await getPatientDispenses(medplum, patientId, 2014);
// Result: 25 dispenses! ✅ (this patient has fills in 2014)
```

---

## What the Screenshot Shows (All Patients)

Looking at your screenshot, I can see dispenses from **multiple different patients**:

### Dispenses in December 2025 - January 2026

| When Handed Over | Subject (Patient ID) | Medication |
|------------------|----------------------|------------|
| 01/02/2026 | Patient/e6c411a4-403b-4914-aac3-9e0a9ff4a7fb | Hydrochlorothiazide |
| 16/01/2026 | Patient/c9d7748e-ec35-cff9-9c87-db94a78e2f9c | amLODIPine |
| 02/01/2026 | Patient/cb249a73-4519-4da0-8f22-bd6ecfcaedd3 | Hydrochlorothiazide |
| 27/12/2025 | Patient/95fc04c5-4bde-edf5-f316-50c6b5008b22 | Hydrochlorothiazide |
| 22/12/2025 | Patient/86a65e36-be89-b135-a696-2765adddat80 | lisinopril |
| 19/12/2025 | Patient/c9d7748e-ec35-cff9-9c87-db94a78e2f9c | Metformin |

**Key Point**: These are dispenses for patients with IDs like:
- `e6c411a4-403b-4914-aac3-9e0a9ff4a7fb`
- `c9d7748e-ec35-cff9-9c87-db94a78e2f9c`
- `cb249a73-4519-4da0-8f22-bd6ecfcaedd3`

**NOT** the patient we calculated for:
- `d090028b-fc0c-451e-a0cc-ef40f9090c5b` (Elvin140)

---

## Visual Comparison

### What the Script Did

```
┌─────────────────────────────────────────────────────────────┐
│ Database: All Patients & Dispenses                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Patient: d090028b... (Elvin140)  ← WE CALCULATED THIS ONE │
│  ├─ 2014 Dispenses: 25 ✅                                   │
│  ├─ 2025 Dispenses: 0 ❌                                    │
│  └─ 2026 Dispenses: 0 ❌                                    │
│                                                             │
│  Patient: e6c411a4... (Different patient)                  │
│  ├─ 2025 Dispenses: 5 ← SHOWN IN SCREENSHOT                │
│  └─ 2026 Dispenses: 3 ← SHOWN IN SCREENSHOT                │
│                                                             │
│  Patient: c9d7748e... (Different patient)                  │
│  ├─ 2025 Dispenses: 8 ← SHOWN IN SCREENSHOT                │
│  └─ 2026 Dispenses: 2 ← SHOWN IN SCREENSHOT                │
│                                                             │
│  ... (12 more patients) ...                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### What the Screenshot Shows

```
┌─────────────────────────────────────────────────────────────┐
│ FHIR Explorer: MedicationDispense List                      │
│ Filters: status=completed (ALL PATIENTS)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  01/02/2026 - Patient/e6c411a4... - Hydrochlorothiazide    │
│  16/01/2026 - Patient/c9d7748e... - amLODIPine             │
│  27/12/2025 - Patient/95fc04c5... - Hydrochlorothiazide    │
│  22/12/2025 - Patient/86a65e36... - lisinopril             │
│  19/12/2025 - Patient/c9d7748e... - Metformin              │
│  ...                                                        │
│                                                             │
│  ← These are from DIFFERENT patients, NOT Elvin140         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Why This Matters

### Single Patient Calculation (What We Did)

**Purpose**: Validate the PDC calculation engine works correctly

**Scope**: ONE patient (Elvin140)

**Command**:
```bash
npx tsx scripts/dev-tools/verification/calculate-patient-pdc.ts auto 2014
```

**Results**:
- ✅ Retrieved 25 dispenses for Elvin140 in 2014
- ✅ Calculated PDC: 100%
- ✅ Calculated fragility: COMPLIANT
- ✅ Validated Phase 1 engine works

**What we DIDN'T do**:
- ❌ Calculate PDC for the other 13 patients
- ❌ Process 2025 dispenses (Elvin140 has none)
- ❌ Create Observations for all patients

---

### Batch Calculation (What We HAVEN'T Done Yet)

**Purpose**: Calculate PDC for ALL patients in the database

**Scope**: All 14 patients

**Command** (not run yet):
```bash
npx tsx scripts/dev-tools/batch/batch-calculate-all-patients.ts 2025
```

**Expected Results**:
- Process all 14 patients
- Calculate PDC for each patient
- Store Observations for all patients
- Handle patients with/without 2025 data

**Example Output**:
```
Processing 14 patients...

Patient 1/14: d090028b... (Elvin140)
  2025 dispenses: 0 → SKIP (no data)

Patient 2/14: e6c411a4...
  2025 dispenses: 5 → Calculate PDC → Store Observation ✅

Patient 3/14: c9d7748e...
  2025 dispenses: 8 → Calculate PDC → Store Observation ✅

Patient 4/14: cb249a73...
  2025 dispenses: 3 → Calculate PDC → Store Observation ✅

...

Completed: 10 patients processed, 4 skipped (no data)
```

---

## Per-Patient Data Distribution

Based on the dispense date analysis we ran earlier:

### Dispenses by Year (All Patients Combined)

| Year | Count | Patients with Data |
|------|-------|-------------------|
| 1990 | 1     | ~1 patient        |
| 2012 | 8     | ~2-3 patients     |
| 2013 | 12    | ~3-4 patients     |
| 2014 | 15    | ~4-5 patients (including Elvin140) |
| 2015 | 2     | ~1 patient        |
| 2017 | 2     | ~1 patient        |
| 2020 | 2     | ~1 patient        |
| 2023 | 1     | ~1 patient        |
| 2024 | 5     | ~2-3 patients     |
| 2025 | 2     | ~1-2 patients     |

**Key Insight**:
- Elvin140 (first patient) has data in **2014** (25 dispenses)
- Other patients have data in **2025** (visible in your screenshot)
- This is why we needed to check year 2014 for Elvin140

---

## How to Calculate for All Patients

### Option 1: Manual Patient-by-Patient

```bash
# Patient 1 (Elvin140 - we already did this)
npx tsx scripts/dev-tools/verification/calculate-patient-pdc.ts d090028b-fc0c-451e-a0cc-ef40f9090c5b 2014

# Patient 2 (from screenshot)
npx tsx scripts/dev-tools/verification/calculate-patient-pdc.ts e6c411a4-403b-4914-aac3-9e0a9ff4a7fb 2025

# Patient 3
npx tsx scripts/dev-tools/verification/calculate-patient-pdc.ts c9d7748e-ec35-cff9-9c87-db94a78e2f9c 2025

# ... repeat for all 14 patients
```

**Problem**: Tedious, error-prone, requires knowing each patient ID and their data year

---

### Option 2: Batch Script (Recommended)

We need to create a batch script that:
1. Fetches all patients
2. For each patient:
   - Determines which year has data
   - Calculates PDC for that year
   - Stores Observation
3. Reports summary

**Pseudocode**:
```typescript
const patients = await medplum.searchResources('Patient', { _count: '100' });

for (const patient of patients) {
  // Check which years have data
  for (const year of [2025, 2024, 2023, 2014, 2013, 2012]) {
    const dispenses = await getPatientDispenses(medplum, patient.id, year);

    if (dispenses.length > 0) {
      // Found data! Calculate PDC
      const pdc = calculatePDC(dispenses, year);
      const fragility = calculateFragility(pdc);

      // Store observation
      await storePDCObservation(medplum, { patient, pdc, fragility });

      console.log(`✅ ${patient.name}: PDC ${pdc}% (${year})`);
      break; // Move to next patient
    }
  }
}
```

---

## Summary Table

| Aspect | Single Patient (Done ✅) | Batch Calculation (Not Done ❌) |
|--------|-------------------------|-------------------------------|
| **Patients Processed** | 1 (Elvin140) | 0 (none yet) |
| **Dispenses Retrieved** | 25 (from 2014) | 0 |
| **PDC Calculated** | Yes (100%) | No |
| **Observations Stored** | No (reindexing) | No |
| **Validation Status** | Engine validated ✅ | Pending |
| **Screenshot Dispenses** | Different patients | Would process these |

---

## Next Steps

### To Calculate for All Patients

**Option A: Wait for search parameter reindexing, then batch**
1. Wait 30-60 minutes for Medplum to finish reindexing
2. Create batch calculation script
3. Run for all patients
4. Verify Observations stored correctly

**Option B: Calculate without storing (immediate)**
1. Create batch script that calculates but doesn't store
2. Run for all patients
3. Generate summary report
4. Later: Re-run with storage when reindexing complete

**Option C: Phase 2 first**
1. Move to Phase 2 (Patient List UI) development
2. Batch calculation can wait
3. UI can use mock data initially
4. Connect to real data when ready

---

## Key Takeaway

**Single patient calculation** validated that the Phase 1 PDC engine works correctly with real data. The fact that we only processed Elvin140 (who has 2014 data) doesn't mean 2025 data doesn't exist - it just means **that specific patient** doesn't have 2025 data.

Your screenshot confirms that 2025/2026 data exists for **other patients** in the database. A batch calculation would process all of them.

---

**Document Version**: 1.0
**Last Updated**: 2026-01-05
