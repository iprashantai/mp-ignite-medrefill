# Legacy UI to Medplum Migration Plan

**Goal**: Migrate 3-4 core pages from Firebase legacy app to Medplum Next.js app in 10 days for demo

## Executive Decision: Keep Next.js (Don't Switch to Vite/React Router)

### Why Not Switch?

1. **Medplum integration already works** - OAuth, MedplumProvider, hooks all configured
2. **Switching means rebuilding**:
   - OAuth callback needs Express/Fastify backend (Next.js API routes handle this now)
   - Lose server components capability
   - Re-implement layout system
3. **Minimal actual benefit** - Medplum SDK works with both frameworks equally

### Next.js Advantages to Keep:

- API routes for OAuth callback already working
- Better SEO (if you expand beyond internal tool)
- Server components (future optimization)
- Better production deployment (Vercel, AWS Amplify)

## TypeScript Strategy: Loose .tsx with `any` Types

### The Approach:

1. ✅ Rename `.jsx` → `.tsx` (works in Next.js)
2. ✅ Add `"use client"` directive at top
3. ✅ Use `any` type liberally for function params
4. ✅ Add `// @ts-ignore` for complex errors
5. ✅ Zod schemas work with both JS and TS

### Example Migration:

```typescript
// Before (legacy .jsx)
export default function AllPatientsCRM({ filters }) {
  const [patients, setPatients] = useState([]);
  // ...
}

// After (.tsx with loose types)
('use client');
export default function AllPatientsCRM({ filters }: any) {
  const [patients, setPatients] = useState<any[]>([]);
  // ...
}
```

## Implementation Plan - 10 Days

### Day 1: Foundation - Adapter Layer

**Goal**: Build the bridge between Medplum FHIR and legacy data structure

**Create Files**:

1. `/src/types/legacy-types.ts` - Legacy data interfaces

   ```typescript
   export interface LegacyPatient {
     id: string;
     firstName: string;
     lastName: string;
     medications: LegacyMedication[];
     aggregateMetrics: {
       allMedsPDC: number;
       fragilityTier: string;
     };
   }
   ```

2. `/src/lib/adapters/legacy-patient-adapter.ts` - Core adapter

   ```typescript
   // Reconstructs legacy patient object from FHIR resources
   export async function constructLegacyPatientObject(
     patientId: string,
     medplum: MedplumClient
   ): Promise<LegacyPatient>;

   // Bulk loader for patient lists
   export async function loadPatientsWithLegacyShape(
     medplum: MedplumClient
   ): Promise<LegacyPatient[]>;
   ```

**Test**: Verify one patient loads correctly with all medications

---

### Day 2: Service Layer Shims + Contexts

**Create Files**:

1. `/src/lib/services-legacy/pdcDataService.ts`
   - Shim that delegates to adapter
   - Legacy pages import this extensively

2. `/src/lib/services-legacy/fragilityTierService.ts`
   - Copy from legacy (pure calculation, no Firebase deps)

3. `/src/contexts-legacy/AppContext.tsx`
   - Bridge to Medplum hooks
   - Provides toast notifications, global state

4. `/src/contexts-legacy/PatientDatasetContext.tsx`
   - Manages patient search/filter state

**Update**: `/src/app/(dashboard)/layout.tsx`

- Wrap with legacy context providers

---

### Day 3-4: AllPatientsCRM Migration (Highest Value)

**Day 3 Tasks**:

1. Copy `legacy/src/pages/AllPatientsCRM.jsx` → `/src/app/(dashboard)/patients/page.tsx`
2. Add `"use client"` directive
3. Replace imports:
   ```typescript
   import { useMedplum } from '@medplum/react';
   import { useRouter } from 'next/navigation';
   import { loadPatientsWithLegacyShape } from '@/lib/adapters/legacy-patient-adapter';
   ```
4. Replace data loading:
   ```typescript
   // OLD: Firebase query
   const medplum = useMedplum();
   const patients = await loadPatientsWithLegacyShape(medplum);
   ```

**Day 4 Tasks**: 5. Port dependency components to `/src/components/legacy-ui/`:

- PatientInventoryOverview.tsx
- AdherenceRiskCell.tsx
- RefillCandidateCell.tsx

6. Fix TypeScript errors (add `any` liberally, use `@ts-ignore`)
7. Test:
   - Page loads without errors
   - Patients display in table
   - Filters work
   - Click patient navigates to detail

---

### Day 5-6: PatientDetailPageTabbed Migration

**Day 5 Tasks**:

1. Copy to `/src/app/(dashboard)/patients/[id]/page.tsx`
2. Convert to Next.js dynamic route:

   ```typescript
   'use client';
   import { useParams } from 'next/navigation';

   export default function PatientDetailPage() {
     const params = useParams();
     const patientId = params.id as string;

     const medplum = useMedplum();
     const [patient, setPatient] = useState<any>(null);

     useEffect(() => {
       constructLegacyPatientObject(patientId, medplum).then(setPatient);
     }, [patientId]);
   }
   ```

**Day 6 Tasks**: 3. Port tab components to `/src/components/legacy-patient-detail/` 4. Test tab navigation 5. Verify back navigation works

---

### Day 7-8: RefillWorklistPage Migration

**Day 7 Tasks**:

1. Copy to `/src/app/(dashboard)/refills/page.tsx`
2. Adapt data loading (same pattern as Day 3)
3. Port queue tabs

**Day 8 Tasks**: 4. Port RHSP (Review Helper Side Panel) 5. Test batch operations 6. Verify queue filtering

---

### Day 9: Testing & Bug Fixes

**Test Each Page**:

- [ ] AllPatientsCRM loads, displays data
- [ ] Filters work (PDC, fragility tier, measure)
- [ ] Click patient → navigates to detail
- [ ] Patient detail shows all tabs
- [ ] Refill queue loads, filters work
- [ ] Navigation between pages works

**Run Verification Script**:

```bash
npm run test:migration  # Script to test adapter layer
```

---

### Day 10: Polish & Demo Prep

1. Add loading spinners
2. Fix any remaining TypeScript errors
3. Test with demo data
4. Prepare demo walkthrough

---

## Critical Files to Create (Priority Order)

### 🔴 Must Create First (Day 1)

1. `/src/types/legacy-types.ts` - Type definitions
2. `/src/lib/adapters/legacy-patient-adapter.ts` - FHIR → Legacy adapter

### 🟡 Create Second (Day 2)

3. `/src/lib/services-legacy/pdcDataService.ts` - Service shim
4. `/src/contexts-legacy/AppContext.tsx` - Context bridge

### 🟢 Create As Needed (Days 3-8)

5. `/src/components/legacy-ui/` - Ported components
6. `/src/app/(dashboard)/patients/page.tsx` - AllPatientsCRM
7. `/src/app/(dashboard)/patients/[id]/page.tsx` - Patient detail
8. `/src/app/(dashboard)/refills/page.tsx` - Refill worklist

---

## Directory Structure After Migration

```
src/
├── app/(dashboard)/
│   ├── patients/
│   │   ├── page.tsx              # AllPatientsCRM (5,881 lines)
│   │   └── [id]/page.tsx         # PatientDetail (2,775 lines)
│   ├── refills/page.tsx          # RefillWorklist (5,561 lines)
│   └── layout.tsx                # Wrap with legacy contexts
│
├── components/
│   ├── legacy-ui/                # Ported shared components
│   ├── legacy-patient-detail/    # Patient detail tabs
│   └── layout/Sidebar.tsx        # Navigation
│
├── contexts-legacy/              # Context bridges
│   ├── AppContext.tsx
│   └── PatientDatasetContext.tsx
│
├── lib/
│   ├── adapters/
│   │   └── legacy-patient-adapter.ts    # 🔴 CRITICAL: FHIR → Legacy
│   ├── services-legacy/                 # Service shims
│   │   ├── pdcDataService.ts
│   │   └── fragilityTierService.ts
│   └── fhir/                     # (existing - reuse)
│
└── types/legacy-types.ts         # 🔴 CRITICAL: Legacy interfaces
```

---

## Key Patterns to Follow

### 1. Data Loading Pattern

```typescript
"use client";
import { useMedplum } from '@medplum/react';
import { loadPatientsWithLegacyShape } from '@/lib/adapters/legacy-patient-adapter';

export default function Page() {
  const medplum = useMedplum();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    loadPatientsWithLegacyShape(medplum).then(setData);
  }, [medplum]);

  return <div>{/* Use data as if from Firebase */}</div>;
}
```

### 2. Navigation Pattern

```typescript
// OLD (React Router)
const navigate = useNavigate();
navigate(`/patients/${id}`);

// NEW (Next.js)
const router = useRouter();
router.push(`/patients/${id}`);
```

### 3. Component Import Pattern

```typescript
// OLD
import { Card } from '../components/ui/Card';

// NEW
import { Card } from '@/components/ui/card'; // Use alias
```

---

## Success Metrics

**Demo Ready = All 3 Checkboxes**:

- [ ] Patient list loads from Medplum, displays in table
- [ ] Click patient → detail page shows all data
- [ ] Refill queue displays, filters work

**Stretch Goals**:

- [ ] Real-time updates (useSubscription)
- [ ] Loading states/skeletons
- [ ] Error boundaries

---

## Risks & Mitigation

| Risk                      | Likelihood | Impact | Mitigation                                     |
| ------------------------- | ---------- | ------ | ---------------------------------------------- |
| Adapter performance slow  | Medium     | High   | Paginate (50 patients), use Medplum batch APIs |
| TypeScript errors block   | High       | Medium | Use `any` liberally, `@ts-ignore` for complex  |
| Missing service functions | Medium     | Medium | Copy from legacy on-demand, stub if needed     |
| Context API conflicts     | Low        | Medium | Use separate namespaces (legacy-contexts)      |
| Styling breaks            | Low        | Low    | Both use Tailwind - copy classNames exactly    |

---

## When to Ask for Help (Claude Code)

1. **Adapter layer not working** → Share patient ID, error message
2. **TypeScript error you can't fix** → Add `@ts-ignore`, move on
3. **Component won't render** → Check browser console, share error
4. **Data structure mismatch** → Review legacy-types.ts, adjust adapter

---

## Next Steps to Start

1. **Read the fundamentals guide** (created separately)
2. **Day 1**: Start with adapter layer
3. **Use Claude Code** for each file creation
4. **Test early, test often** - Don't wait until Day 9

**Let's start with Day 1 when you're ready!**
