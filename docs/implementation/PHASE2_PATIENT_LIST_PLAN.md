# Phase 2: Patient List Page Implementation Plan

## Executive Summary

**Objective**: Implement the Patient List (All Patients) page migrating UI/UX from legacy repository while connecting to FHIR-native Medplum backend.

**Strategy**:

1. **Copy UI/UX patterns directly** from legacy `AllPatientsCRM.jsx` and related components
2. **Adapt data layer** to use Medplum FHIR services instead of Firestore
3. **Leverage existing infrastructure** - healthcare components, table system, FHIR services, PDC calculators

**Legacy Reference Files**:

- Main Page: `/Users/arpitjain/work/ignite/medrefills/ignite-medrefills/src/pages/AllPatientsCRM.jsx`
- Overview: `/Users/arpitjain/work/ignite/medrefills/ignite-medrefills/src/components/PatientInventoryOverview.jsx`
- Sidebar: `/Users/arpitjain/work/ignite/medrefills/ignite-medrefills/src/components/PatientListSidebar.jsx`
- Filters Hook: `/Users/arpitjain/work/ignite/medrefills/ignite-medrefills/src/hooks/usePatientFilters.js`

---

## Architecture: Legacy → FHIR Mapping

### Data Source Mapping

| Legacy (Firestore)                  | New (Medplum FHIR)                                               |
| ----------------------------------- | ---------------------------------------------------------------- |
| `patients` collection               | `Patient` resource with extensions                               |
| `patient.medications[]`             | `MedicationRequest` + `MedicationDispense` queries               |
| `patient.rxClaims[]`                | `MedicationDispense` resources (status: completed)               |
| `patient.medAdherence.aggregatePDC` | `Observation` resources (code: pdc-mac/mad/mah)                  |
| `patient.fragilityTier`             | Patient extension: `CURRENT_FRAGILITY_TIER`                      |
| `patient.daysToRunout`              | Patient extension: `DAYS_UNTIL_EARLIEST_RUNOUT`                  |
| `patient.crm.status`                | `Flag` resource or Patient extension                             |
| `patient.measures[]`                | Derived from PDC Observations (which measures have observations) |
| `campaigns` collection              | `CareTeam` or custom extension                                   |

### Service Layer Mapping

| Legacy Service                  | New Service                                   |
| ------------------------------- | --------------------------------------------- |
| `medAdherenceCRMService.js`     | `src/lib/fhir/patient-service.ts` (to create) |
| `pdcDataService.js`             | `src/lib/fhir/dispense-service.ts` ✅ EXISTS  |
| `fragilityTierService.js`       | `src/lib/pdc/fragility.ts` ✅ EXISTS          |
| `loadPatientsWithRxClaims()`    | `useActivePatients()` hook ✅ EXISTS          |
| `enrichPatientsWithAnalytics()` | `extractPatientPDCSummary()` ✅ EXISTS        |

---

## File Structure

```
src/
├── app/(dashboard)/patients/
│   ├── page.tsx                      # Main Patient List page
│   ├── loading.tsx                   # Skeleton loading state
│   └── error.tsx                     # Error boundary
│
├── components/patients/
│   ├── patient-inventory-overview.tsx  # ← COPY FROM legacy PatientInventoryOverview.jsx
│   ├── patient-table.tsx               # Patient data table
│   ├── patient-row.tsx                 # Individual row component
│   ├── patient-filters.tsx             # Filter controls (PDC, Tier, Measure, Status)
│   ├── patient-search-bar.tsx          # Smart search with query parsing
│   ├── patient-list-sidebar.tsx        # ← COPY FROM legacy PatientListSidebar.jsx
│   ├── quick-filters.tsx               # Quick filter chips
│   ├── density-selector.tsx            # Compact/Normal view toggle
│   └── index.ts                        # Barrel export
│
├── hooks/
│   ├── use-patient-list.ts             # Main patient list data hook
│   ├── use-patient-filters.ts          # ← ADAPT FROM legacy usePatientFilters.js
│   ├── use-patient-search.ts           # Search with debounce
│   └── use-patient-metrics.ts          # Aggregate metrics calculation
│
├── lib/fhir/
│   ├── patient-list-service.ts         # NEW: Patient list queries with PDC summary
│   └── (existing services)
│
└── types/
    └── patient-list.ts                 # Patient list specific types
```

---

## Implementation Steps

### Step 1: Create Types & Interfaces

**File**: `src/types/patient-list.ts`

```typescript
import { Patient, Observation } from '@medplum/fhirtypes';
import { FragilityTier, MAMeasure } from '@/lib/pdc/types';

/**
 * Patient list item - denormalized view for table display
 * Maps to legacy patient object shape for UI compatibility
 */
export interface PatientListItem {
  // Core identifiers
  id: string;
  mrn: string;
  name: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;

  // PDC Summary (from Patient extensions or calculated)
  aggregatePDC: number | null; // Worst PDC across all measures
  pdcStatus: 'passing' | 'at-risk' | 'failing' | null;

  // Per-measure PDC
  measures: {
    measure: MAMeasure;
    pdc: number;
    status: 'passing' | 'at-risk' | 'failing';
    gapDaysRemaining: number;
  }[];

  // Fragility & Priority
  fragilityTier: FragilityTier | null;
  priorityScore: number;
  urgencyLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';

  // Runout
  daysToRunout: number | null;
  nextRefillDate: string | null;

  // CRM Status
  crmStatus: CRMStatus;
  campaigns: string[];

  // Source FHIR resource
  _fhirPatient: Patient;
}

export type CRMStatus =
  | 'not_contacted'
  | 'outreach_attempted'
  | 'patient_responded'
  | 'appointment_scheduled'
  | 'intervention_complete'
  | 'lost_to_followup'
  | 'opted_out';

export interface PatientListFilters {
  search: string;
  pdcRange: [number, number] | null; // e.g., [0, 60], [60, 80], [80, 100]
  fragilityTiers: FragilityTier[];
  measures: MAMeasure[];
  crmStatus: CRMStatus[];
  daysToRunout: 'overdue' | '0-7' | '8-14' | '15-30' | '30+' | null;
  hasMedAdherence: boolean | null;
}

export interface PatientListMetrics {
  totalPatients: number;
  maPatients: number;
  passingCount: number;
  atRiskCount: number;
  failingCount: number;
  refillCandidates: number;

  fragilityBreakdown: Record<FragilityTier | 'unknown', number>;
  pdcBreakdown: {
    pdc0to60: number;
    pdc60to80: number;
    pdc80to90: number;
    pdc90plus: number;
  };
  daysToRunoutBreakdown: {
    overdue: number;
    days0to7: number;
    days8to14: number;
    days15to30: number;
    days30plus: number;
  };
  measureBreakdown: Record<MAMeasure, number>;
}

export interface PatientListState {
  patients: PatientListItem[];
  loading: boolean;
  error: Error | null;
  metrics: PatientListMetrics;
  filters: PatientListFilters;
  sortColumn: keyof PatientListItem;
  sortDirection: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
  totalCount: number;
}
```

---

### Step 2: Create Patient List Service

**File**: `src/lib/fhir/patient-list-service.ts`

```typescript
import { MedplumClient } from '@medplum/core';
import { Patient, Bundle, Observation } from '@medplum/fhirtypes';
import { extractPatientPDCSummary } from './patient-extensions';
import { getAllCurrentPDCObservations, parsePDCObservation } from './observation-service';
import { PatientListItem, PatientListFilters, CRMStatus } from '@/types/patient-list';
import { FragilityTier, MAMeasure } from '@/lib/pdc/types';
import { EXTENSION_URLS } from './types';

/**
 * Fetch all active patients with PDC summary data
 * Uses denormalized extensions on Patient resource for performance
 */
export async function fetchPatientList(
  medplum: MedplumClient,
  options: {
    pageSize?: number;
    offset?: number;
    filters?: Partial<PatientListFilters>;
  } = {}
): Promise<{ patients: PatientListItem[]; total: number }> {
  const { pageSize = 100, offset = 0, filters } = options;

  // Build search parameters
  const searchParams: Record<string, string> = {
    active: 'true',
    _count: String(pageSize),
    _offset: String(offset),
    _sort: '-_lastUpdated',
  };

  // Add filter parameters
  if (filters?.search) {
    searchParams.name = filters.search;
  }

  // Fetch patients
  const bundle = await medplum.search('Patient', searchParams);
  const patients = (bundle.entry || []).map((e) => e.resource as Patient).filter(Boolean);

  // Transform to PatientListItem
  const patientItems = await Promise.all(
    patients.map((patient) => transformPatientToListItem(medplum, patient))
  );

  // Apply client-side filters that can't be done via FHIR search
  const filteredPatients = applyClientFilters(patientItems, filters);

  return {
    patients: filteredPatients,
    total: bundle.total || patients.length,
  };
}

/**
 * Transform FHIR Patient to PatientListItem
 * Uses denormalized extensions for performance
 */
export async function transformPatientToListItem(
  medplum: MedplumClient,
  patient: Patient
): Promise<PatientListItem> {
  // Extract name
  const name = patient.name?.[0];
  const firstName = name?.given?.[0] || '';
  const lastName = name?.family || '';
  const displayName = name?.text || `${lastName}, ${firstName}`.trim() || patient.id || 'Unknown';

  // Get MRN
  const mrn =
    patient.identifier?.find((id) => id.type?.coding?.[0]?.code === 'MR')?.value ||
    patient.id ||
    '';

  // Extract PDC summary from extensions (denormalized)
  const pdcSummary = extractPatientPDCSummary(patient);

  // Extract extensions
  const fragilityTier = getExtensionValue<FragilityTier>(
    patient,
    EXTENSION_URLS.CURRENT_FRAGILITY_TIER
  );
  const priorityScore =
    getExtensionValue<number>(patient, EXTENSION_URLS.CURRENT_PRIORITY_SCORE) || 0;
  const daysToRunout = getExtensionValue<number>(
    patient,
    EXTENSION_URLS.DAYS_UNTIL_EARLIEST_RUNOUT
  );
  const crmStatus =
    getExtensionValue<CRMStatus>(patient, EXTENSION_URLS.CRM_STATUS) || 'not_contacted';

  // Calculate aggregate PDC (worst across measures)
  const measures = pdcSummary?.measures || [];
  const pdcValues = measures.map((m) => m.pdc).filter((p) => p !== null) as number[];
  const aggregatePDC = pdcValues.length > 0 ? Math.min(...pdcValues) : null;

  // Determine status
  let pdcStatus: 'passing' | 'at-risk' | 'failing' | null = null;
  if (aggregatePDC !== null) {
    pdcStatus = aggregatePDC >= 80 ? 'passing' : aggregatePDC >= 60 ? 'at-risk' : 'failing';
  }

  // Determine urgency
  const urgencyLevel = calculateUrgencyLevel(priorityScore);

  return {
    id: patient.id || '',
    mrn,
    name: displayName,
    firstName,
    lastName,
    dateOfBirth: patient.birthDate || '',
    aggregatePDC,
    pdcStatus,
    measures: measures.map((m) => ({
      measure: m.measure as MAMeasure,
      pdc: m.pdc,
      status: m.pdc >= 80 ? 'passing' : m.pdc >= 60 ? 'at-risk' : 'failing',
      gapDaysRemaining: m.gapDaysRemaining || 0,
    })),
    fragilityTier,
    priorityScore,
    urgencyLevel,
    daysToRunout,
    nextRefillDate: pdcSummary?.nextRefillDate || null,
    crmStatus,
    campaigns: [], // TODO: Fetch from CareTeam or extension
    _fhirPatient: patient,
  };
}

function getExtensionValue<T>(patient: Patient, url: string): T | null {
  const ext = patient.extension?.find((e) => e.url === url);
  if (!ext) return null;

  if (ext.valueString !== undefined) return ext.valueString as T;
  if (ext.valueInteger !== undefined) return ext.valueInteger as T;
  if (ext.valueDecimal !== undefined) return ext.valueDecimal as T;
  if (ext.valueCode !== undefined) return ext.valueCode as T;
  if (ext.valueBoolean !== undefined) return ext.valueBoolean as T;

  return null;
}

function calculateUrgencyLevel(score: number): 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW' {
  if (score >= 150) return 'EXTREME';
  if (score >= 100) return 'HIGH';
  if (score >= 50) return 'MODERATE';
  return 'LOW';
}

function applyClientFilters(
  patients: PatientListItem[],
  filters?: Partial<PatientListFilters>
): PatientListItem[] {
  if (!filters) return patients;

  let result = patients;

  // PDC Range filter
  if (filters.pdcRange) {
    const [min, max] = filters.pdcRange;
    result = result.filter(
      (p) => p.aggregatePDC !== null && p.aggregatePDC >= min && p.aggregatePDC < max
    );
  }

  // Fragility tier filter
  if (filters.fragilityTiers && filters.fragilityTiers.length > 0) {
    result = result.filter(
      (p) => p.fragilityTier && filters.fragilityTiers!.includes(p.fragilityTier)
    );
  }

  // Measures filter
  if (filters.measures && filters.measures.length > 0) {
    result = result.filter((p) => p.measures.some((m) => filters.measures!.includes(m.measure)));
  }

  // CRM Status filter
  if (filters.crmStatus && filters.crmStatus.length > 0) {
    result = result.filter((p) => filters.crmStatus!.includes(p.crmStatus));
  }

  // Days to runout filter
  if (filters.daysToRunout) {
    result = result.filter((p) => {
      if (p.daysToRunout === null) return false;
      switch (filters.daysToRunout) {
        case 'overdue':
          return p.daysToRunout < 0;
        case '0-7':
          return p.daysToRunout >= 0 && p.daysToRunout <= 7;
        case '8-14':
          return p.daysToRunout >= 8 && p.daysToRunout <= 14;
        case '15-30':
          return p.daysToRunout >= 15 && p.daysToRunout <= 30;
        case '30+':
          return p.daysToRunout > 30;
        default:
          return true;
      }
    });
  }

  // MA Medications filter
  if (filters.hasMedAdherence === true) {
    result = result.filter((p) => p.measures.length > 0);
  } else if (filters.hasMedAdherence === false) {
    result = result.filter((p) => p.measures.length === 0);
  }

  return result;
}

/**
 * Calculate aggregate metrics from patient list
 * COPY LOGIC FROM legacy PatientInventoryOverview.jsx
 */
export function calculatePatientMetrics(patients: PatientListItem[]): PatientListMetrics {
  const totalPatients = patients.length;

  // MA patients (have at least one MA measure)
  const maPatients = patients.filter((p) => p.measures.length > 0);
  const maPatientsCount = maPatients.length;

  // PDC Status counts (using worst PDC)
  const passingCount = maPatients.filter((p) => p.pdcStatus === 'passing').length;
  const atRiskCount = maPatients.filter((p) => p.pdcStatus === 'at-risk').length;
  const failingCount = maPatients.filter((p) => p.pdcStatus === 'failing').length;

  // Refill candidates (≤14 days to runout)
  const refillCandidates = patients.filter(
    (p) => p.daysToRunout !== null && p.daysToRunout <= 14
  ).length;

  // Fragility breakdown
  const fragilityBreakdown: Record<FragilityTier | 'unknown', number> = {
    COMPLIANT: 0,
    F1_IMMINENT: 0,
    F2_FRAGILE: 0,
    F3_MODERATE: 0,
    F4_COMFORTABLE: 0,
    F5_SAFE: 0,
    T5_UNSALVAGEABLE: 0,
    unknown: 0,
  };
  patients.forEach((p) => {
    if (p.fragilityTier) {
      fragilityBreakdown[p.fragilityTier]++;
    } else {
      fragilityBreakdown['unknown']++;
    }
  });

  // PDC breakdown
  const pdcBreakdown = {
    pdc0to60: maPatients.filter((p) => p.aggregatePDC !== null && p.aggregatePDC < 60).length,
    pdc60to80: maPatients.filter(
      (p) => p.aggregatePDC !== null && p.aggregatePDC >= 60 && p.aggregatePDC < 80
    ).length,
    pdc80to90: maPatients.filter(
      (p) => p.aggregatePDC !== null && p.aggregatePDC >= 80 && p.aggregatePDC < 90
    ).length,
    pdc90plus: maPatients.filter((p) => p.aggregatePDC !== null && p.aggregatePDC >= 90).length,
  };

  // Days to runout breakdown
  const daysToRunoutBreakdown = {
    overdue: patients.filter((p) => p.daysToRunout !== null && p.daysToRunout < 0).length,
    days0to7: patients.filter(
      (p) => p.daysToRunout !== null && p.daysToRunout >= 0 && p.daysToRunout <= 7
    ).length,
    days8to14: patients.filter(
      (p) => p.daysToRunout !== null && p.daysToRunout >= 8 && p.daysToRunout <= 14
    ).length,
    days15to30: patients.filter(
      (p) => p.daysToRunout !== null && p.daysToRunout >= 15 && p.daysToRunout <= 30
    ).length,
    days30plus: patients.filter((p) => p.daysToRunout !== null && p.daysToRunout > 30).length,
  };

  // Measure breakdown
  const measureBreakdown: Record<MAMeasure, number> = {
    MAC: patients.filter((p) => p.measures.some((m) => m.measure === 'MAC')).length,
    MAD: patients.filter((p) => p.measures.some((m) => m.measure === 'MAD')).length,
    MAH: patients.filter((p) => p.measures.some((m) => m.measure === 'MAH')).length,
  };

  return {
    totalPatients,
    maPatients: maPatientsCount,
    passingCount,
    atRiskCount,
    failingCount,
    refillCandidates,
    fragilityBreakdown,
    pdcBreakdown,
    daysToRunoutBreakdown,
    measureBreakdown,
  };
}
```

---

### Step 3: Create Patient Filters Hook

**File**: `src/hooks/use-patient-filters.ts`

```typescript
/**
 * Patient Filters Hook
 * ADAPTED FROM legacy: src/hooks/usePatientFilters.js
 *
 * Manages patient list filter state with URL sync
 */
import { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PatientListFilters, CRMStatus } from '@/types/patient-list';
import { FragilityTier, MAMeasure } from '@/lib/pdc/types';

const DEFAULT_FILTERS: PatientListFilters = {
  search: '',
  pdcRange: null,
  fragilityTiers: [],
  measures: [],
  crmStatus: [],
  daysToRunout: null,
  hasMedAdherence: null,
};

export function usePatientFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL params
  const initialFilters = useMemo(() => {
    const filters: PatientListFilters = { ...DEFAULT_FILTERS };

    const search = searchParams.get('search');
    if (search) filters.search = search;

    const pdc = searchParams.get('pdc');
    if (pdc) {
      const [min, max] = pdc.split('-').map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        filters.pdcRange = [min, max];
      }
    }

    const tiers = searchParams.get('tier');
    if (tiers) {
      filters.fragilityTiers = tiers.split(',') as FragilityTier[];
    }

    const measures = searchParams.get('measure');
    if (measures) {
      filters.measures = measures.split(',') as MAMeasure[];
    }

    const status = searchParams.get('status');
    if (status) {
      filters.crmStatus = status.split(',') as CRMStatus[];
    }

    const runout = searchParams.get('runout');
    if (runout) {
      filters.daysToRunout = runout as PatientListFilters['daysToRunout'];
    }

    const ma = searchParams.get('ma');
    if (ma === 'true') filters.hasMedAdherence = true;
    if (ma === 'false') filters.hasMedAdherence = false;

    return filters;
  }, [searchParams]);

  const [filters, setFilters] = useState<PatientListFilters>(initialFilters);

  // Sync filters to URL
  const syncToUrl = useCallback(
    (newFilters: PatientListFilters) => {
      const params = new URLSearchParams();

      if (newFilters.search) params.set('search', newFilters.search);
      if (newFilters.pdcRange)
        params.set('pdc', `${newFilters.pdcRange[0]}-${newFilters.pdcRange[1]}`);
      if (newFilters.fragilityTiers.length) params.set('tier', newFilters.fragilityTiers.join(','));
      if (newFilters.measures.length) params.set('measure', newFilters.measures.join(','));
      if (newFilters.crmStatus.length) params.set('status', newFilters.crmStatus.join(','));
      if (newFilters.daysToRunout) params.set('runout', newFilters.daysToRunout);
      if (newFilters.hasMedAdherence !== null) params.set('ma', String(newFilters.hasMedAdherence));

      const query = params.toString();
      router.push(query ? `?${query}` : '', { scroll: false });
    },
    [router]
  );

  // Filter setters
  const setSearch = useCallback(
    (search: string) => {
      const newFilters = { ...filters, search };
      setFilters(newFilters);
      syncToUrl(newFilters);
    },
    [filters, syncToUrl]
  );

  const setPDCRange = useCallback(
    (range: [number, number] | null) => {
      const newFilters = { ...filters, pdcRange: range };
      setFilters(newFilters);
      syncToUrl(newFilters);
    },
    [filters, syncToUrl]
  );

  const toggleFragilityTier = useCallback(
    (tier: FragilityTier) => {
      const current = filters.fragilityTiers;
      const newTiers = current.includes(tier)
        ? current.filter((t) => t !== tier)
        : [...current, tier];
      const newFilters = { ...filters, fragilityTiers: newTiers };
      setFilters(newFilters);
      syncToUrl(newFilters);
    },
    [filters, syncToUrl]
  );

  const toggleMeasure = useCallback(
    (measure: MAMeasure) => {
      const current = filters.measures;
      const newMeasures = current.includes(measure)
        ? current.filter((m) => m !== measure)
        : [...current, measure];
      const newFilters = { ...filters, measures: newMeasures };
      setFilters(newFilters);
      syncToUrl(newFilters);
    },
    [filters, syncToUrl]
  );

  const toggleCRMStatus = useCallback(
    (status: CRMStatus) => {
      const current = filters.crmStatus;
      const newStatus = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      const newFilters = { ...filters, crmStatus: newStatus };
      setFilters(newFilters);
      syncToUrl(newFilters);
    },
    [filters, syncToUrl]
  );

  const setDaysToRunout = useCallback(
    (range: PatientListFilters['daysToRunout']) => {
      const newFilters = { ...filters, daysToRunout: range };
      setFilters(newFilters);
      syncToUrl(newFilters);
    },
    [filters, syncToUrl]
  );

  const setHasMedAdherence = useCallback(
    (value: boolean | null) => {
      const newFilters = { ...filters, hasMedAdherence: value };
      setFilters(newFilters);
      syncToUrl(newFilters);
    },
    [filters, syncToUrl]
  );

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    router.push('', { scroll: false });
  }, [router]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.pdcRange !== null ||
      filters.fragilityTiers.length > 0 ||
      filters.measures.length > 0 ||
      filters.crmStatus.length > 0 ||
      filters.daysToRunout !== null ||
      filters.hasMedAdherence !== null
    );
  }, [filters]);

  return {
    filters,
    setSearch,
    setPDCRange,
    toggleFragilityTier,
    toggleMeasure,
    toggleCRMStatus,
    setDaysToRunout,
    setHasMedAdherence,
    clearAllFilters,
    hasActiveFilters,
  };
}
```

---

### Step 4: Create Patient Inventory Overview Component

**File**: `src/components/patients/patient-inventory-overview.tsx`

This component will be **directly copied from legacy** with these adaptations:

```typescript
/**
 * Patient Inventory Overview
 *
 * COPIED FROM: legacy/src/components/PatientInventoryOverview.jsx
 * CHANGES:
 * - Convert to TypeScript
 * - Use shadcn/ui + Tailwind (same patterns)
 * - Replace Heroicons with lucide-react (Next.js standard)
 * - Accept PatientListMetrics instead of calculating from raw patients
 *
 * KEEP IDENTICAL:
 * - Visual design (gradients, colors, spacing)
 * - Metric calculations and display logic
 * - Expand/collapse behavior
 * - Click handlers for filtering
 */
'use client';

import { useState, useMemo } from 'react';
import {
  ClipboardList,
  BarChart3,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Users,
  Heart,
} from 'lucide-react';
import { PatientListMetrics } from '@/types/patient-list';

interface PatientInventoryOverviewProps {
  metrics: PatientListMetrics;
  onFilterApply: (filterType: string, filterValue: string) => void;
}

export function PatientInventoryOverview({
  metrics,
  onFilterApply,
}: PatientInventoryOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // ... REST OF IMPLEMENTATION COPIED FROM LEGACY
  // See legacy/src/components/PatientInventoryOverview.jsx
}
```

**Key changes from legacy:**

1. TypeScript types instead of PropTypes
2. `lucide-react` icons instead of Heroicons
3. Accept pre-calculated `metrics` prop instead of raw `patients[]`
4. Add `onFilterApply` callback for filter integration

---

### Step 5: Create Patient Table Component

**File**: `src/components/patients/patient-table.tsx`

```typescript
/**
 * Patient Table Component
 * Uses healthcare table components from @/components/ui-healthcare/table
 */
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  TableFooter,
  DensityToggle,
  useTableState,
} from '@/components/ui-healthcare/table';
import {
  PDCBadge,
  FragilityBadge,
  MeasureBadge,
  RunoutBadge,
} from '@/components/ui-healthcare';
import { PatientListItem } from '@/types/patient-list';
import { Checkbox } from '@/components/ui/checkbox';

interface PatientTableProps {
  patients: PatientListItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  loading?: boolean;
}

export function PatientTable({
  patients,
  selectedIds,
  onSelectionChange,
  loading = false,
}: PatientTableProps) {
  const router = useRouter();
  const { density, setDensity, getSortProps, sortColumn, sortDirection } = useTableState();

  // Sort patients
  const sortedPatients = useMemo(() => {
    if (!sortColumn) return patients;

    return [...patients].sort((a, b) => {
      const aVal = a[sortColumn as keyof PatientListItem];
      const bVal = b[sortColumn as keyof PatientListItem];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [patients, sortColumn, sortDirection]);

  const handleRowClick = useCallback((patientId: string) => {
    router.push(`/patients/${patientId}`);
  }, [router]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(patients.map(p => p.id)));
    } else {
      onSelectionChange(new Set());
    }
  }, [patients, onSelectionChange]);

  const handleSelectRow = useCallback((patientId: string, checked: boolean) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(patientId);
    } else {
      newSelection.delete(patientId);
    }
    onSelectionChange(newSelection);
  }, [selectedIds, onSelectionChange]);

  const allSelected = patients.length > 0 && selectedIds.size === patients.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < patients.length;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <DensityToggle density={density} onDensityChange={setDensity} />
      </div>

      <Table density={density}>
        <TableHead sticky>
          <TableRow>
            <TableHeaderCell className="w-10">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={handleSelectAll}
              />
            </TableHeaderCell>
            <TableHeaderCell {...getSortProps('name')}>Patient</TableHeaderCell>
            <TableHeaderCell {...getSortProps('aggregatePDC')}>PDC</TableHeaderCell>
            <TableHeaderCell>Measures</TableHeaderCell>
            <TableHeaderCell {...getSortProps('fragilityTier')}>Tier</TableHeaderCell>
            <TableHeaderCell {...getSortProps('daysToRunout')}>Runout</TableHeaderCell>
            <TableHeaderCell {...getSortProps('priorityScore')}>Priority</TableHeaderCell>
            <TableHeaderCell {...getSortProps('crmStatus')}>Status</TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedPatients.map((patient) => (
            <TableRow
              key={patient.id}
              hoverable
              clickable
              onClick={() => handleRowClick(patient.id)}
              selected={selectedIds.has(patient.id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(patient.id)}
                  onCheckedChange={(checked) => handleSelectRow(patient.id, !!checked)}
                />
              </TableCell>

              <TableCell>
                <div>
                  <div className="font-medium text-gray-900">{patient.name}</div>
                  <div className="text-xs text-gray-500">MRN: {patient.mrn}</div>
                </div>
              </TableCell>

              <TableCell>
                {patient.aggregatePDC !== null ? (
                  <PDCBadge pdc={patient.aggregatePDC} showValue />
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </TableCell>

              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {patient.measures.map((m) => (
                    <MeasureBadge key={m.measure} measure={m.measure} />
                  ))}
                  {patient.measures.length === 0 && (
                    <span className="text-gray-400 text-sm">None</span>
                  )}
                </div>
              </TableCell>

              <TableCell>
                {patient.fragilityTier ? (
                  <FragilityBadge tier={patient.fragilityTier} />
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </TableCell>

              <TableCell>
                {patient.daysToRunout !== null ? (
                  <RunoutBadge daysToRunout={patient.daysToRunout} />
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </TableCell>

              <TableCell>
                <span className={`font-medium ${
                  patient.priorityScore >= 100 ? 'text-red-600' :
                  patient.priorityScore >= 50 ? 'text-amber-600' :
                  'text-gray-600'
                }`}>
                  {patient.priorityScore}
                </span>
              </TableCell>

              <TableCell>
                <CRMStatusBadge status={patient.crmStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        <TableFooter totalCount={patients.length} itemLabel="patients" />
      </Table>
    </div>
  );
}

function CRMStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    'not_contacted': { label: 'Not Contacted', className: 'bg-gray-100 text-gray-700' },
    'outreach_attempted': { label: 'Attempted', className: 'bg-blue-100 text-blue-700' },
    'patient_responded': { label: 'Responded', className: 'bg-purple-100 text-purple-700' },
    'appointment_scheduled': { label: 'Scheduled', className: 'bg-indigo-100 text-indigo-700' },
    'intervention_complete': { label: 'Complete', className: 'bg-green-100 text-green-700' },
    'lost_to_followup': { label: 'Lost', className: 'bg-red-100 text-red-700' },
    'opted_out': { label: 'Opted Out', className: 'bg-orange-100 text-orange-700' },
  };

  const config = statusConfig[status] || statusConfig['not_contacted'];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
```

---

### Step 6: Create Main Patient List Page

**File**: `src/app/(dashboard)/patients/page.tsx`

```typescript
/**
 * Patient List Page
 *
 * ADAPTED FROM: legacy/src/pages/AllPatientsCRM.jsx
 * Route: /patients
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useMedplum } from '@medplum/react';
import { useSearchResources } from '@/lib/medplum/hooks';
import { Patient } from '@medplum/fhirtypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Download, RefreshCw } from 'lucide-react';

import { PatientInventoryOverview } from '@/components/patients/patient-inventory-overview';
import { PatientTable } from '@/components/patients/patient-table';
import { PatientFilters } from '@/components/patients/patient-filters';
import { usePatientFilters } from '@/hooks/use-patient-filters';
import {
  transformPatientToListItem,
  calculatePatientMetrics
} from '@/lib/fhir/patient-list-service';
import { PatientListItem } from '@/types/patient-list';

export default function PatientsPage() {
  const medplum = useMedplum();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Filters
  const {
    filters,
    setSearch,
    setPDCRange,
    toggleFragilityTier,
    toggleMeasure,
    toggleCRMStatus,
    setDaysToRunout,
    setHasMedAdherence,
    clearAllFilters,
    hasActiveFilters,
  } = usePatientFilters();

  // Fetch patients from Medplum
  const [patients, loading, error] = useSearchResources('Patient', {
    active: 'true',
    _count: '200',
    _sort: '-_lastUpdated',
  });

  // Transform to PatientListItem
  const patientItems = useMemo<PatientListItem[]>(() => {
    if (!patients) return [];
    return patients.map(p => transformPatientToListItemSync(p));
  }, [patients]);

  // Apply filters
  const filteredPatients = useMemo(() => {
    let result = patientItems;

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.mrn.toLowerCase().includes(query)
      );
    }

    // PDC Range
    if (filters.pdcRange) {
      const [min, max] = filters.pdcRange;
      result = result.filter(p =>
        p.aggregatePDC !== null &&
        p.aggregatePDC >= min &&
        p.aggregatePDC < max
      );
    }

    // Fragility tiers
    if (filters.fragilityTiers.length > 0) {
      result = result.filter(p =>
        p.fragilityTier && filters.fragilityTiers.includes(p.fragilityTier)
      );
    }

    // Measures
    if (filters.measures.length > 0) {
      result = result.filter(p =>
        p.measures.some(m => filters.measures.includes(m.measure))
      );
    }

    // CRM Status
    if (filters.crmStatus.length > 0) {
      result = result.filter(p => filters.crmStatus.includes(p.crmStatus));
    }

    // Days to runout
    if (filters.daysToRunout) {
      result = result.filter(p => {
        if (p.daysToRunout === null) return false;
        switch (filters.daysToRunout) {
          case 'overdue': return p.daysToRunout < 0;
          case '0-7': return p.daysToRunout >= 0 && p.daysToRunout <= 7;
          case '8-14': return p.daysToRunout >= 8 && p.daysToRunout <= 14;
          case '15-30': return p.daysToRunout >= 15 && p.daysToRunout <= 30;
          case '30+': return p.daysToRunout > 30;
          default: return true;
        }
      });
    }

    // MA Medications
    if (filters.hasMedAdherence === true) {
      result = result.filter(p => p.measures.length > 0);
    } else if (filters.hasMedAdherence === false) {
      result = result.filter(p => p.measures.length === 0);
    }

    return result;
  }, [patientItems, filters]);

  // Calculate metrics
  const metrics = useMemo(() => {
    return calculatePatientMetrics(filteredPatients);
  }, [filteredPatients]);

  // Handle filter from overview cards
  const handleOverviewFilter = useCallback((filterType: string, filterValue: string) => {
    switch (filterType) {
      case 'pdc':
        const [min, max] = filterValue.split('-').map(Number);
        setPDCRange([min, max]);
        break;
      case 'fragility':
        toggleFragilityTier(filterValue as any);
        break;
      case 'measure':
        toggleMeasure(filterValue as any);
        break;
      case 'daysToRunout':
        setDaysToRunout(filterValue as any);
        break;
      case 'maMeds':
        setHasMedAdherence(filterValue === 'with-ma');
        break;
      case 'all':
        clearAllFilters();
        break;
    }
  }, [setPDCRange, toggleFragilityTier, toggleMeasure, setDaysToRunout, setHasMedAdherence, clearAllFilters]);

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">Error loading patients: {error.message}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Patients</h1>
          <p className="text-sm text-gray-500">
            Medication adherence management for all patients
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Inventory Overview */}
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <PatientInventoryOverview
          metrics={metrics}
          onFilterApply={handleOverviewFilter}
        />
      )}

      {/* Search & Filters Bar */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search patients by name or MRN..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          variant={hasActiveFilters ? 'default' : 'outline'}
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs">
              Active
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        )}
      </div>

      {/* Filters Panel (expandable) */}
      {isFiltersOpen && (
        <PatientFilters
          filters={filters}
          onPDCRangeChange={setPDCRange}
          onFragilityTierToggle={toggleFragilityTier}
          onMeasureToggle={toggleMeasure}
          onCRMStatusToggle={toggleCRMStatus}
          onDaysToRunoutChange={setDaysToRunout}
          onHasMedAdherenceChange={setHasMedAdherence}
        />
      )}

      {/* Bulk Actions Bar (when selections exist) */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedIds.size} patient{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              Assign to Campaign
            </Button>
            <Button size="sm" variant="outline">
              Update Status
            </Button>
            <Button size="sm" variant="outline">
              Export Selected
            </Button>
          </div>
        </div>
      )}

      {/* Patient Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <PatientTable
          patients={filteredPatients}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}
    </div>
  );
}

/**
 * Synchronous transform for client-side rendering
 * Uses denormalized extensions from Patient resource
 */
function transformPatientToListItemSync(patient: Patient): PatientListItem {
  // ... implementation similar to service but synchronous
  // Extract from extensions directly
}
```

---

## Component Migration Checklist

### From Legacy → New

| Legacy Component               | New Component                                            | Migration Status      |
| ------------------------------ | -------------------------------------------------------- | --------------------- |
| `AllPatientsCRM.jsx`           | `src/app/(dashboard)/patients/page.tsx`                  | Create new            |
| `PatientInventoryOverview.jsx` | `src/components/patients/patient-inventory-overview.tsx` | COPY & adapt          |
| `PatientListSidebar.jsx`       | `src/components/patients/patient-list-sidebar.tsx`       | COPY & adapt          |
| `usePatientFilters.js`         | `src/hooks/use-patient-filters.ts`                       | COPY & add TypeScript |
| `AdherenceRiskCell.jsx`        | Use `PDCBadge` from ui-healthcare                        | Already exists ✅     |
| `DataTable` components         | Use `Table` from ui-healthcare                           | Already exists ✅     |
| `fragilityTierService.js`      | `src/lib/pdc/fragility.ts`                               | Already migrated ✅   |
| `pdcDataService.js`            | `src/lib/fhir/dispense-service.ts`                       | Already migrated ✅   |

### Required New Files

| File                                                     | Purpose                        |
| -------------------------------------------------------- | ------------------------------ |
| `src/types/patient-list.ts`                              | TypeScript types               |
| `src/lib/fhir/patient-list-service.ts`                   | Data fetching & transformation |
| `src/hooks/use-patient-filters.ts`                       | Filter state management        |
| `src/hooks/use-patient-list.ts`                          | Main data hook                 |
| `src/components/patients/patient-inventory-overview.tsx` | Overview dashboard             |
| `src/components/patients/patient-table.tsx`              | Data table                     |
| `src/components/patients/patient-filters.tsx`            | Filter controls                |
| `src/components/patients/patient-search-bar.tsx`         | Smart search                   |
| `src/components/patients/quick-filters.tsx`              | Quick filter chips             |
| `src/app/(dashboard)/patients/page.tsx`                  | Main page                      |
| `src/app/(dashboard)/patients/loading.tsx`               | Loading skeleton               |
| `src/app/(dashboard)/patients/error.tsx`                 | Error boundary                 |

---

## Data Connection Strategy

### How Legacy Firestore Maps to Medplum FHIR

```
LEGACY (Firestore)                    FHIR (Medplum)
─────────────────────────────────────────────────────────────
allPatients collection                Patient resources
  └─ patient.id                       └─ Patient.id
  └─ patient.name                     └─ Patient.name[0].text
  └─ patient.mrn                      └─ Patient.identifier[type=MR]
  └─ patient.medications[]            └─ MedicationRequest (query by subject)
     └─ med.currentPdc                └─ Observation (code=pdc-{measure})
     └─ med.rxClaims[]                └─ MedicationDispense (query by subject)
  └─ patient.fragilityTier            └─ Patient.extension[CURRENT_FRAGILITY_TIER]
  └─ patient.daysToRunout             └─ Patient.extension[DAYS_UNTIL_EARLIEST_RUNOUT]
  └─ patient.aggregateAdherence       └─ Patient.extension[CURRENT_PDC_SUMMARY]
  └─ patient.crm.status               └─ Patient.extension[CRM_STATUS] or Flag
  └─ patient.crm.campaigns[]          └─ CareTeam membership or Patient.extension

campaigns collection                  CareTeam resources (or custom)
patientActivities collection          AuditEvent (auto-created by Medplum)
```

### Pre-requisite: Patient Extension Denormalization

For performance, the nightly PDC calculation bot must update Patient extensions:

```typescript
// Run by pdc-nightly-calculator bot
await updatePatientExtensions(medplum, patientId, {
  fragilityTier: 'F2_FRAGILE',
  priorityScore: 95,
  daysUntilEarliestRunout: 5,
  pdcSummary: {
    measures: [
      { measure: 'MAC', pdc: 72, gapDaysRemaining: 15 },
      { measure: 'MAD', pdc: 85, gapDaysRemaining: 42 },
    ],
    aggregatePDC: 72,
    nextRefillDate: '2025-01-15',
  },
});
```

This allows the Patient List page to:

1. Query `Patient` resources only (no joins needed)
2. Extract all display data from extensions
3. Filter using FHIR search parameters
4. Scale to thousands of patients efficiently

---

## UI/UX Preservation

### What Stays IDENTICAL from Legacy

1. **PatientInventoryOverview**
   - Gradient backgrounds and premium styling
   - 6-card hero metrics grid
   - Expand/collapse behavior
   - Metric card click → filter

2. **Patient Table**
   - Column order: Patient | PDC | Measures | Tier | Runout | Priority | Status
   - Row click → navigate to detail
   - Checkbox selection for bulk actions
   - Density toggle (compact/normal)

3. **Filters**
   - PDC range filters (0-60, 60-80, 80-90, 90+)
   - Fragility tier chips
   - Measure badges (MAC/MAD/MAH)
   - CRM status dropdown
   - Days to runout ranges

4. **Color Coding**
   - PDC: Green (≥80), Amber (60-79), Red (<60)
   - Fragility: Red (F1), Orange (F2), Yellow (F3), Blue (F4), Green (F5), Gray (T5), Purple (COMPLIANT)
   - Measures: Blue (MAC), Purple (MAD), Pink (MAH)

### What Changes

1. **Icons**: Heroicons → Lucide React (similar designs)
2. **State Management**: useState → React Query (via Medplum hooks)
3. **Data Source**: Firestore → Medplum FHIR API
4. **Routing**: React Router → Next.js App Router

---

## Testing Strategy

### Unit Tests

```typescript
// src/lib/fhir/__tests__/patient-list-service.test.ts
describe('transformPatientToListItem', () => {
  it('extracts PDC summary from extensions', () => { ... });
  it('calculates aggregate PDC as minimum', () => { ... });
  it('handles patients without PDC data', () => { ... });
});

describe('calculatePatientMetrics', () => {
  it('calculates correct passing/at-risk/failing counts', () => { ... });
  it('calculates fragility breakdown', () => { ... });
  it('calculates refill candidates (≤14 days)', () => { ... });
});
```

### Integration Tests

```typescript
// src/app/(dashboard)/patients/__tests__/page.test.tsx
describe('PatientsPage', () => {
  it('renders patient table with data', () => { ... });
  it('filters by PDC range', () => { ... });
  it('filters by fragility tier', () => { ... });
  it('navigates to patient detail on row click', () => { ... });
  it('shows bulk actions when patients selected', () => { ... });
});
```

### Visual Regression Tests

- Compare PatientInventoryOverview with legacy screenshots
- Verify PDC badge colors match design system
- Verify table density modes work correctly

---

## Implementation Timeline

### Day 1: Foundation

- [ ] Create `src/types/patient-list.ts`
- [ ] Create `src/lib/fhir/patient-list-service.ts`
- [ ] Create `src/hooks/use-patient-filters.ts`
- [ ] Create `src/hooks/use-patient-list.ts`

### Day 2: Components

- [ ] Copy & adapt `PatientInventoryOverview`
- [ ] Create `PatientTable` using healthcare table components
- [ ] Create `PatientFilters` panel
- [ ] Create `QuickFilters` chips

### Day 3: Page Assembly

- [ ] Create `/patients/page.tsx`
- [ ] Create `/patients/loading.tsx`
- [ ] Create `/patients/error.tsx`
- [ ] Wire up filters to table
- [ ] Add bulk selection

### Day 4: Polish & Test

- [ ] Add search bar with debounce
- [ ] Add export functionality
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Visual QA against legacy

### Day 5: Integration

- [ ] Verify Patient extensions are populated
- [ ] Test with real Medplum data
- [ ] Performance testing (100+ patients)
- [ ] Accessibility audit

---

## Dependencies

### Existing (No Changes Needed)

- `@/components/ui-healthcare/table/*` - Table components ✅
- `@/components/ui-healthcare/pdc-badge.tsx` ✅
- `@/components/ui-healthcare/fragility-badge.tsx` ✅
- `@/components/ui-healthcare/measure-badge.tsx` ✅
- `@/components/ui-healthcare/runout-badge.tsx` ✅
- `@/lib/pdc/fragility.ts` ✅
- `@/lib/fhir/patient-extensions.ts` ✅
- `@/lib/medplum/hooks.ts` ✅

### Need to Create

- `@/lib/fhir/patient-list-service.ts`
- `@/hooks/use-patient-filters.ts`
- `@/types/patient-list.ts`

---

## Success Criteria

1. **Visual Parity**: Patient list page looks identical to legacy
2. **Functional Parity**: All filters work as in legacy
3. **Performance**: <2s initial load, <500ms filter updates
4. **Data Integrity**: PDC values match FHIR Observations
5. **Accessibility**: WCAG 2.1 AA compliant
6. **Type Safety**: Full TypeScript coverage
