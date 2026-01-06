# Next Steps: Switch from Synthetic Data to Real Medplum FHIR Data

**Context**: Legacy UI migration (Days 1-8) is complete. All pages working with synthetic/stub data. Now switching to real Medplum FHIR queries.

**Current Branch**: `feature/legacy-ui-migration`
**Original Plan**: `docs/plans/ui-copy-plan1-keep-next.md` (Days 9-10 remaining)

---

## ✅ What's Already Complete (Days 1-8)

### Day 1-2: Foundation ✅

- Created adapter layer (`legacy-patient-adapter.ts`) - **FULLY FUNCTIONAL**
- Created service shims (`pdcDataService.ts`, etc.) - **WORKING**
- Created contexts (`PatientDatasetContext`, `AppContext`) - **WORKING**

### Day 3-4: AllPatientsCRM ✅

- Migrated to `/src/app/(dashboard)/patients/page.tsx` - **WORKING**
- Ported components (PatientInventoryOverview, AdherenceRiskCell) - **WORKING**

### Day 5-6: PatientDetailPageTabbed ✅

- Migrated to `/src/app/(dashboard)/patients/[id]/page.tsx` - **WORKING**
- Tab navigation works - **WORKING**

### Day 7-8: RefillWorklistPage ✅

- Migrated to `/src/app/(dashboard)/queue/page.tsx` - **WORKING**
- Queue filtering works - **WORKING**

**Current Status**: All pages functional with synthetic data. Production build passes. No TypeScript errors.

---

## 🔍 Exploration Findings: What's Stub vs Real

### Already Built (Real FHIR Infrastructure) ✅

**File: `src/lib/adapters/legacy-patient-adapter.ts`**

- `constructLegacyPatientObject()` - COMPLETE
- `loadPatientsWithLegacyShape()` - COMPLETE
- Transforms FHIR → LegacyPatient - COMPLETE

**File: `src/lib/fhir/dispense-service.ts`**

- `getPatientDispenses()` - COMPLETE
- `getDispensesByMeasure()` - COMPLETE
- Full MA RxNorm code mappings - COMPLETE

**File: `src/lib/fhir/observation-service.ts`**

- `getCurrentPDCObservation()` - COMPLETE
- `getAllCurrentPDCObservations()` - COMPLETE
- `storePDCObservation()` - COMPLETE

**File: `src/lib/services-legacy/pdcDataService.ts`**

- Shim layer that delegates to adapter - COMPLETE

### Still Using Stubs (Need to Replace) ⚠️

**File: `src/lib/services-legacy/patientDatasetLoader.ts`**

- Line 36: `loadAllPatientsFromFirestore()` → Returns `generateSyntheticPatients(50)`
- **Should**: Call `loadPatientsWithLegacyShape(medplum)` instead

**File: `src/lib/services-legacy/rxClaimsService.ts`**

- Line ~50: `loadMemberClaims()` → Returns `generateMockClaims()`
- **Should**: Call `getPatientDispenses()` + transform to claims format

**File: `src/app/(dashboard)/patients/page.tsx`**

- Line 220: `dataSource` defaults to `'synthea'`
- Comment: "Defaulting to 'synthea' because Medplum is empty"
- **Should**: Default to `'firestore'` once Medplum has data

**File: `src/app/(dashboard)/queue/page.tsx`**

- Uses `loadPatientsWithRxClaims()` which delegates to adapter
- **Already works** with real data, just needs Medplum populated

---

## 🎯 Day 9-10: Real Data Integration Plan

### Prerequisites (Already Done)

✅ SearchParameters deployed to Medplum (7 parameters)
✅ FHIR services built and tested
✅ Adapter layer complete
✅ UI pages functional with synthetic data

### Remaining Tasks

#### **Step 1: Replace Stub Services (30 min)**

**File: `src/lib/services-legacy/patientDatasetLoader.ts`**

Change `loadAllPatientsFromFirestore()`:

```typescript
// BEFORE (Line 36-43):
export async function loadAllPatientsFromFirestore(): Promise<any[]> {
  console.log('📊 Loading synthetic patient dataset (Firebase not configured)');
  const syntheticPatients = generateSyntheticPatients(50);
  console.log(`✅ Generated ${syntheticPatients.length} synthetic patients`);
  return syntheticPatients;
}

// AFTER:
export async function loadAllPatientsFromFirestore(medplum: MedplumClient): Promise<any[]> {
  console.log('📊 Loading patients from Medplum...');
  const patients = await loadPatientsWithLegacyShape(medplum, {
    enrichWithAnalytics: true,
    calculateFragility: true,
    limit: 1000,
  });
  console.log(`✅ Loaded ${patients.length} patients from Medplum`);
  return patients;
}
```

**File: `src/lib/services-legacy/rxClaimsService.ts`**

Change `loadMemberClaims()`:

```typescript
// BEFORE (Line ~50):
const mockClaims = generateMockClaims(memberId, year);

// AFTER:
import { getPatientDispenses } from '@/lib/fhir/dispense-service';
import { dispensesToFillRecords } from '@/lib/fhir/transforms';

const dispenses = await getPatientDispenses(medplum, memberId, year);
const claims = dispensesToFillRecords(dispenses);
```

#### **Step 2: Switch Pages to Real Data (15 min)**

**File: `src/app/(dashboard)/patients/page.tsx`**

Line 220 - Change default dataSource:

```typescript
// BEFORE:
// NOTE: Defaulting to 'synthea' because Medplum is empty. Switch back to 'firestore' when Medplum has data.
const [dataSource, setDataSource] = useState<'firestore' | 'synthea'>('synthea');

// AFTER:
const [dataSource, setDataSource] = useState<'firestore' | 'synthea'>('firestore');
```

Line 290 - Update `loadAllPatientsFromFirestore()` call to pass `medplum`:

```typescript
// BEFORE:
return loadAllPatientsFromFirestore();

// AFTER:
return loadAllPatientsFromFirestore(medplum);
```

#### **Step 3: Deploy Infrastructure (If Not Done)**

1. ✅ Deploy SearchParameters - **ALREADY DONE**
2. Deploy PDC nightly calculator bot (optional for initial testing)
3. Verify Medplum connection

#### **Step 4: Load Test Data (Options)**

**Option A: Use Existing Data**

- If Medplum already has patient data, skip this step
- Test with whatever is in Medplum

**Option B: Generate & Upload Test Patients**

- Use existing scripts in `scripts/dev-tools/upload/`
- `upload-one.ts` - Upload single test patient
- `upload-slow-batch.ts` - Upload batch of patients
- Generate 12-15 comprehensive test patients covering:
  - All PDC ranges (<60%, 60-79%, ≥80%)
  - All fragility tiers (F1-F5, T5)
  - All measures (MAC, MAD, MAH)

**Option C: Quick Test with Minimal Data**

- Create 1-2 test patients manually
- Verify data flow works
- Expand dataset later

#### **Step 5: Test End-to-End (1-2 hours)**

**Test Checklist** (from original Day 9 plan):

- [ ] AllPatientsCRM loads patients from Medplum
- [ ] Patient list displays with real data
- [ ] Filters work (PDC, fragility tier, measure)
- [ ] Click patient → navigates to detail page
- [ ] Patient detail shows all tabs with real data
- [ ] Refill queue loads from Medplum
- [ ] Queue filtering works with real data
- [ ] Navigation between pages works

**Verification Points**:

- Console logs show "Loading patients from Medplum" (not synthetic)
- Patient count matches Medplum patient count
- PDC scores match calculated values
- Fragility tiers display correctly
- Medications show with real drug names

#### **Step 6: Bug Fixes & Polish (Day 10)**

1. **Add Loading States**
   - Spinner while loading patients
   - Skeleton screens for patient cards
   - "No patients found" empty state

2. **Error Handling**
   - Handle Medplum connection errors
   - Handle missing patient data gracefully
   - Show user-friendly error messages

3. **Performance**
   - Verify pagination works (50 patients per page)
   - Test with larger datasets (100+ patients)
   - Optimize FHIR queries if needed

4. **Clean Up**
   - Remove or comment out synthetic data generators
   - Remove debug console.log statements
   - Update comments to reflect real data usage

---

## 📝 Files to Modify

### Critical (Must Change)

1. `src/lib/services-legacy/patientDatasetLoader.ts` - Switch to real loader
2. `src/lib/services-legacy/rxClaimsService.ts` - Switch to real dispense queries
3. `src/app/(dashboard)/patients/page.tsx` - Change dataSource default

### Optional (Polish)

4. `src/app/(dashboard)/patients/page.tsx` - Add loading states
5. `src/app/(dashboard)/queue/page.tsx` - Add error handling
6. `src/app/(dashboard)/patients/[id]/page.tsx` - Add empty states

---

## 🚀 Execution Order

### Minimal Path (Quick Test)

1. Modify `patientDatasetLoader.ts` → real loader
2. Modify `patients/page.tsx` → dataSource default
3. Test with existing Medplum data
4. Fix any errors that appear

### Full Path (Production Ready)

1. Replace stub services (Step 1)
2. Switch pages to real data (Step 2)
3. Load test data if needed (Step 4)
4. Run full test checklist (Step 5)
5. Add polish & error handling (Step 6)

---

## ⚠️ Potential Issues & Mitigations

| Issue                           | Likelihood | Mitigation                           |
| ------------------------------- | ---------- | ------------------------------------ |
| Medplum has no data             | High       | Use Option B or C to load test data  |
| Data structure mismatch         | Medium     | Adapter layer already handles this   |
| Performance with large datasets | Medium     | Use pagination (already implemented) |
| Missing PDC observations        | Medium     | Run PDC calculation script first     |
| FHIR query errors               | Low        | Error handling in adapter layer      |

---

## 🎯 Success Criteria

**Minimal Success**:

- [ ] Patients load from Medplum (not synthetic)
- [ ] Patient list displays without errors
- [ ] Can click through to patient detail

**Full Success** (Demo Ready):

- [ ] All 3 pages load with real Medplum data
- [ ] Filters work correctly
- [ ] PDC scores accurate
- [ ] Fragility tiers display correctly
- [ ] Navigation flows work
- [ ] No console errors
- [ ] Production build passes

---

## 📊 Estimated Time

| Task                       | Time          |
| -------------------------- | ------------- |
| Replace stub services      | 30 min        |
| Switch page defaults       | 15 min        |
| Load test data (if needed) | 1-2 hours     |
| Testing & verification     | 1-2 hours     |
| Bug fixes & polish         | 1-2 hours     |
| **Total**                  | **4-7 hours** |

---

## 🔄 Rollback Plan

If real data integration fails:

1. Revert `dataSource` default back to `'synthea'`
2. Revert `loadAllPatientsFromFirestore()` to generate synthetic
3. App continues working with synthetic data
4. Investigate and fix FHIR integration issues
5. Retry when ready

---

## 📋 Next Immediate Action

**Recommended**: Start with **Minimal Path** (Quick Test)

1. Check if Medplum has any patient data already
2. If yes → proceed with Step 1-2 (replace stubs, switch defaults)
3. If no → decide between:
   - **Option B**: Generate comprehensive test dataset (1-2 hours)
   - **Option C**: Quick test with 1-2 manual patients (15 min)

**Question for User**: Do you have existing patient data in Medplum, or should we generate test data first?
