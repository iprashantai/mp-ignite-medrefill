'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, max-lines-per-function, complexity, react-hooks/exhaustive-deps */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useMedplum } from '@medplum/react';
import { generateRxClaimsForPatient } from '@/utils/helpers/generateSyntheticRxClaims';
import { parsePatientName, calculateDaysToRunout } from '@/utils/helpers/helpers';
import { useAppContext } from '@/contexts-legacy/AppContext';
import { usePatientDataset } from '@/contexts-legacy/PatientDatasetContext';
import {
  bulkUpdatePatientStatus,
  assignPatientsToCampaign,
  exportPatientsToCSV,
  downloadCSV,
  bulkSavePatients,
  enrichPatientWithRefillData,
  createCampaign,
} from '@/lib/services-legacy/medAdherenceCRMService';
import { checkMedAdherence } from '@/lib/services-legacy/medAdherenceService';
import { enrichPatientsWithAnalytics } from '@/lib/services-legacy/medAdherenceAnalyticsService';
import {
  loadPatientsWithRxClaims,
  invalidateRxClaimsCache,
  getCacheStatus,
  calculatePDCFromClaims,
  buildMedicationsFromRxClaims,
  deriveAggregateAdherence,
  normalizePatientForDisplay,
} from '@/lib/services-legacy/pdcDataService';
import { loadPatientAnalytics } from '@/lib/services-legacy/patientAnalyticsService';
// ============================================================================
// 🏆 GOLDEN STANDARD - Import fragilityTierService for tier calculations
// DO NOT use inline tier calculations - always use this service!
// Reference: src/pages/MetricsReference.jsx
// ============================================================================
import {
  calculateFragilityTier,
  calculatePriorityScore,
} from '@/lib/services-legacy/fragilityTierService';
// Removed AI search - using fast pattern matching only
// Removed: PopulationOverviewBar and StrategicFilters - replaced with AI search
import { AdherenceRiskCell } from '@/components/legacy-ui/AdherenceRiskCell';
import PatientInventoryOverview from '@/components/legacy-ui/PatientInventoryOverview';
import CreateCampaignModal from '@/components/legacy-ui/CreateCampaignModal';
import {
  PATIENT_DATASETS,
  PATIENT_DATASET_SOURCES,
  PATIENT_DATASET_STORAGE_KEY,
  DEFAULT_DATASET_ID,
  loadPatientDataset,
} from '@/lib/services-legacy/patientDatasetLoader';
import {
  CheckCircleIcon as CheckCircleOutline,
  XCircleIcon as XCircleOutline,
  ChevronUpIcon,
  ChevronDownIcon,
  UserGroupIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  TagIcon,
  ClockIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  InformationCircleIcon,
  FireIcon,
  BoltIcon,
  ChartPieIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const normalizeDrugName = (name = '') => name.toLowerCase().replace(/[^a-z0-9]/g, '');

// Icon mapping for Quick Filters configuration
const ICON_MAP: Record<string, any> = {
  FireIcon: FireIcon,
  BoltIcon: BoltIcon,
  ChartPieIcon: ChartPieIcon,
  ArrowTrendingDownIcon: ArrowTrendingDownIcon,
  ExclamationTriangleIcon: ExclamationTriangleIcon,
  ClockIcon: ClockIcon,
  UserGroupIcon: UserGroupIcon,
  TagIcon: TagIcon,
  EnvelopeIcon: EnvelopeIcon,
  PhoneIcon: PhoneIcon,
  DocumentTextIcon: DocumentTextIcon,
  ChartBarIcon: ChartBarIcon,
  CheckCircleIcon: CheckCircleIcon,
  XCircleIcon: XCircleIcon,
  InformationCircleIcon: InformationCircleIcon,
};

// Stub for BatchContext
const useBatch = () => ({
  batchStatusList: [],
  selectedBatchId: null,
  selectBatch: () => {},
});

// Stub for ConfigurationContext
const useConfiguration = () => ({
  quickFiltersConfig: [] as any[],
  outreachMethodsConfig: null,
  fetchConfiguration: async () => {},
  loading: false,
  error: null,
});

/**
 * Component: MedAdherenceCRM
 *
 * A comprehensive CRM-style view for managing medication adherence patients with:
 * - AI-powered semantic search (OpenAI embeddings + cosine similarity)
 * - Multi-dimensional filtering (quick filters + field-level filters)
 * - Excel-style column management (hide/show/reorder)
 * - Bulk actions (status updates, campaign assignment)
 * - Real-time analytics integration
 * - HEDIS measure focus (MAC, MAD, MAH)
 *
 * Features demonstrated:
 * 1. Semantic Search:
 *    - Natural language queries ("show me diabetic patients with poor adherence")
 *    - Hybrid search combining semantic + keyword matching
 *    - Configurable similarity thresholds
 *
 * 2. Smart Filtering:
 *    - Quick filters for common use cases
 *    - Field-level multi-select filters
 *    - Combined filter logic (AND across dimensions)
 *
 * 3. Column Management:
 *    - Drag-and-drop column reorder
 *    - Show/hide individual columns
 *    - Persistent user preferences
 *
 * 4. Bulk Operations:
 *    - Multi-select with keyboard shortcuts
 *    - Batch status updates
 *    - Campaign assignment
 *    - CSV export
 *
 * 5. Real-time Updates:
 *    - Analytics integration for each patient
 *    - Fragility tier calculations
 *    - Priority scoring
 *
 * Data Flow:
 * 1. Load patients from Firestore
 * 2. Enrich with RxClaims data (lazy loaded, cached)
 * 3. Calculate PDC scores per medication
 * 4. Derive fragility tiers and priority scores
 * 5. Generate AI embeddings for search
 * 6. Apply filters and display results
 *
 * Performance Optimizations:
 * - Lazy loading of RxClaims (only when needed)
 * - In-memory caching of embeddings
 * - Debounced search input
 * - Virtual scrolling for large datasets
 * - Memoized computed values
 *
 * Integration Points:
 * - Firebase: Patient and RxClaims data
 * - OpenAI: Embeddings API for semantic search
 * - Context: AppContext, PatientDatasetContext, BatchContext
 * - Services: pdcDataService, fragilityTierService, medAdherenceAnalyticsService
 */
const MedAdherenceCRM = () => {
  const router = useRouter();
  const medplum = useMedplum();
  const { showTimedToast, flags } = useAppContext();
  const { selectedBatchId, selectBatch } = useBatch();
  const { selectedDataset, setSelectedDataset, lastLoadTimestamp, setLastLoadTimestamp } =
    usePatientDataset();
  const { quickFiltersConfig, outreachMethodsConfig } = useConfiguration();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [displayPatients, setDisplayPatients] = useState<any[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [fieldFilters, setFieldFilters] = useState<Record<string, Set<string>>>({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Column Management State
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [showColumnManager, setShowColumnManager] = useState(false);

  // Sort State
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: 'asc' | 'desc';
  }>({
    column: null,
    direction: 'asc',
  });

  // Campaign Modal State
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  // Data Loading State
  const [dataSource, setDataSource] = useState<'firestore' | 'synthea'>('firestore');
  const [cacheStatus, setCacheStatus] = useState<any>(null);

  // ============================================================================
  // COLUMN DEFINITIONS
  // ============================================================================

  const ALL_COLUMNS = [
    { id: 'select', label: '', locked: true, width: '40px' },
    { id: 'name', label: 'Patient Name', locked: true, width: '200px' },
    { id: 'mrn', label: 'MRN', locked: false, width: '120px' },
    { id: 'dob', label: 'DOB', locked: false, width: '100px' },
    { id: 'age', label: 'Age', locked: false, width: '60px' },
    { id: 'gender', label: 'Gender', locked: false, width: '80px' },
    { id: 'hedis_measure', label: 'HEDIS Measure', locked: false, width: '140px' },
    { id: 'medications', label: 'Medications', locked: false, width: '200px' },
    { id: 'aggregate_adherence', label: 'Aggregate Adherence', locked: false, width: '180px' },
    { id: 'fragility_tier', label: 'Fragility Tier', locked: false, width: '140px' },
    { id: 'days_to_runout', label: 'Days to Runout', locked: false, width: '140px' },
    { id: 'refill_date', label: 'Next Refill Date', locked: false, width: '140px' },
    { id: 'priority_score', label: 'Priority Score', locked: false, width: '120px' },
    { id: 'last_contact', label: 'Last Contact', locked: false, width: '120px' },
    { id: 'outreach_method', label: 'Outreach Method', locked: false, width: '140px' },
    { id: 'status', label: 'Status', locked: false, width: '120px' },
    { id: 'campaign', label: 'Campaign', locked: false, width: '140px' },
    { id: 'actions', label: 'Actions', locked: true, width: '100px' },
  ];

  // Initialize column visibility and order
  useEffect(() => {
    const savedVisibility = localStorage.getItem('columnVisibility');
    const savedOrder = localStorage.getItem('columnOrder');

    if (savedVisibility) {
      setColumnVisibility(JSON.parse(savedVisibility));
    } else {
      const defaultVisibility: Record<string, boolean> = {};
      ALL_COLUMNS.forEach((col) => {
        defaultVisibility[col.id] = true;
      });
      setColumnVisibility(defaultVisibility);
    }

    if (savedOrder) {
      setColumnOrder(JSON.parse(savedOrder));
    } else {
      setColumnOrder(ALL_COLUMNS.map((col) => col.id));
    }
  }, []);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Load patients from selected data source
   */
  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingMessage('Loading patients...');
      setError(null);

      let patients: any[] = [];

      if (dataSource === 'firestore') {
        // Load from Firestore with RxClaims
        setLoadingMessage('Loading patient data from Firestore...');
        patients = await loadPatientsWithRxClaims(medplum, {
          enrichWithAnalytics: true,
          calculateFragility: true,
          limit: 1000,
        });
        setLastLoadTimestamp(Date.now().toString());
      } else {
        // Load from Synthea dataset
        setLoadingMessage(`Loading ${selectedDataset || 'patient'} dataset...`);
        const datasetPatients = await loadPatientDataset(selectedDataset || DEFAULT_DATASET_ID);

        // Enrich with synthetic RxClaims if needed
        patients = datasetPatients.map((p: any) => {
          if (!p.rxClaims || p.rxClaims.length === 0) {
            return {
              ...p,
              rxClaims: generateRxClaimsForPatient(p),
            };
          }
          return p;
        });
      }

      // Calculate PDC scores and derive adherence
      const enrichedPatients = patients.map((patient: any) => {
        const normalized: any = normalizePatientForDisplay(patient);
        const aggregateAdherence = deriveAggregateAdherence(normalized);

        // Calculate fragility tier with fallback for missing data
        let fragilityTier = 'F3_MODERATE';
        let priorityScore = 50;

        try {
          // Try to calculate if we have the required fields
          if (normalized.daysAlreadyCovered && normalized.treatmentDays) {
            const tierResult = calculateFragilityTier({
              daysAlreadyCovered: normalized.daysAlreadyCovered || 0,
              daysOfSupplyOnHand: normalized.daysOfSupplyOnHand || 0,
              daysRemainingUntilYearEnd: normalized.daysRemainingUntilYearEnd || 0,
              treatmentDays: normalized.treatmentDays || 365,
              gapDaysRemaining: normalized.gapDaysRemaining || 0,
              remainingRefills: normalized.remainingRefills || 0,
              isCurrentlyOutOfMeds: normalized.isCurrentlyOutOfMeds || false,
            });
            fragilityTier = tierResult.tier;

            // Calculate priority score
            const priorityResult = calculatePriorityScore({
              fragilityTier: tierResult,
              daysToRunout: normalized.daysToRunout || 0,
              measureCount: normalized.measureCount || 1,
              isCurrentlyOutOfMeds: normalized.isCurrentlyOutOfMeds || false,
            });
            priorityScore = priorityResult.priorityScore;
          }
        } catch (err) {
          console.warn('Could not calculate fragility tier for patient', normalized.id, err);
        }

        return {
          ...normalized,
          aggregateAdherence,
          fragilityTier,
          priorityScore,
        };
      });

      setAllPatients(enrichedPatients);
      setDisplayPatients(enrichedPatients);
      setLoadingMessage('');

      // Update cache status
      const status = getCacheStatus();
      setCacheStatus(status);

      showTimedToast('success', `Loaded ${enrichedPatients.length} patients`);
    } catch (err: any) {
      console.error('Error loading patients:', err);
      setError(err.message || 'Failed to load patients');
      showTimedToast('error', 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [dataSource, selectedDataset, medplum, setLastLoadTimestamp, showTimedToast]);

  // Load patients on mount and when data source changes
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // ============================================================================
  // FILTERING LOGIC
  // ============================================================================

  /**
   * Apply all active filters to the patient list
   */
  const applyFilters = useCallback(() => {
    let filtered = [...allPatients];

    // 1. Apply search query (simple text search for now)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((patient: any) => {
        const searchableText = [
          patient.name,
          patient.mrn,
          patient.medications?.map((m: any) => m.name).join(' '),
          patient.hedisMeasure,
          patient.status,
          patient.campaign,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    // 2. Apply quick filter
    if (activeQuickFilter && quickFiltersConfig) {
      const filterConfig = quickFiltersConfig.find((f: any) => f.id === activeQuickFilter);
      if (filterConfig?.filter) {
        filtered = filtered.filter(filterConfig.filter);
      }
    }

    // 3. Apply field-level filters
    Object.entries(fieldFilters).forEach(([field, values]) => {
      if (values.size > 0) {
        filtered = filtered.filter((patient: any) => {
          const fieldValue = patient[field];
          if (Array.isArray(fieldValue)) {
            return fieldValue.some((v: any) => values.has(String(v)));
          }
          return values.has(String(fieldValue));
        });
      }
    });

    setDisplayPatients(filtered);
  }, [allPatients, searchQuery, activeQuickFilter, fieldFilters, quickFiltersConfig]);

  // Re-apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ============================================================================
  // SORTING LOGIC
  // ============================================================================

  const handleSort = useCallback((column: string) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { column, direction: 'asc' };
    });
  }, []);

  const sortedPatients = useMemo(() => {
    if (!sortConfig.column) return displayPatients;

    const sorted = [...displayPatients].sort((a: any, b: any) => {
      const aValue = a[sortConfig.column!];
      const bValue = b[sortConfig.column!];

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      const comparison = aStr.localeCompare(bStr);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [displayPatients, sortConfig]);

  // ============================================================================
  // SELECTION LOGIC
  // ============================================================================

  const handleSelectPatient = useCallback(
    (patientId: string, index: number, event: any) => {
      setSelectedPatients((prev) => {
        const newSet = new Set(prev);

        if (event.shiftKey && lastSelectedIndex !== null) {
          // Shift+click: select range
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);
          for (let i = start; i <= end; i++) {
            if (sortedPatients[i]) {
              newSet.add(sortedPatients[i].id);
            }
          }
        } else if (event.metaKey || event.ctrlKey) {
          // Cmd/Ctrl+click: toggle single
          if (newSet.has(patientId)) {
            newSet.delete(patientId);
          } else {
            newSet.add(patientId);
          }
        } else {
          // Regular click: select only this one
          newSet.clear();
          newSet.add(patientId);
        }

        return newSet;
      });

      setLastSelectedIndex(index);
    },
    [lastSelectedIndex, sortedPatients]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedPatients.size === sortedPatients.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(sortedPatients.map((p: any) => p.id)));
    }
  }, [selectedPatients, sortedPatients]);

  // ============================================================================
  // BULK ACTIONS
  // ============================================================================

  const handleBulkStatusUpdate = useCallback(
    async (newStatus: string) => {
      if (selectedPatients.size === 0) {
        showTimedToast('warning', 'No patients selected');
        return;
      }

      try {
        setLoading(true);
        setLoadingMessage(`Updating status for ${selectedPatients.size} patients...`);

        await bulkUpdatePatientStatus(Array.from(selectedPatients), newStatus, medplum);

        // Reload patients to reflect changes
        await loadPatients();

        setSelectedPatients(new Set());
        showTimedToast('success', `Updated ${selectedPatients.size} patients to ${newStatus}`);
      } catch (err: any) {
        console.error('Error updating patient status:', err);
        showTimedToast('error', 'Failed to update patient status');
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    },
    [selectedPatients, medplum, loadPatients, showTimedToast]
  );

  const handleAssignToCampaign = useCallback(
    async (campaignName: string) => {
      if (selectedPatients.size === 0) {
        showTimedToast('warning', 'No patients selected');
        return;
      }

      try {
        setLoading(true);
        setLoadingMessage(`Assigning ${selectedPatients.size} patients to campaign...`);

        await assignPatientsToCampaign(campaignName, Array.from(selectedPatients), medplum);

        // Reload patients to reflect changes
        await loadPatients();

        setSelectedPatients(new Set());
        showTimedToast('success', `Assigned ${selectedPatients.size} patients to ${campaignName}`);
      } catch (err: any) {
        console.error('Error assigning patients to campaign:', err);
        showTimedToast('error', 'Failed to assign patients to campaign');
      } finally {
        setLoading(false);
        setLoadingMessage('');
        setShowCampaignModal(false);
      }
    },
    [selectedPatients, medplum, loadPatients, showTimedToast]
  );

  const handleExportCSV = useCallback(async () => {
    try {
      const patientsToExport =
        selectedPatients.size > 0
          ? sortedPatients.filter((p: any) => selectedPatients.has(p.id))
          : sortedPatients;

      const csvData = exportPatientsToCSV(patientsToExport);
      downloadCSV(csvData, `patients-export-${new Date().toISOString().split('T')[0]}.csv`);

      showTimedToast('success', `Exported ${patientsToExport.length} patients to CSV`);
    } catch (err: any) {
      console.error('Error exporting to CSV:', err);
      showTimedToast('error', 'Failed to export to CSV');
    }
  }, [selectedPatients, sortedPatients, showTimedToast]);

  // ============================================================================
  // COLUMN MANAGEMENT
  // ============================================================================

  const handleToggleColumn = useCallback((columnId: string) => {
    setColumnVisibility((prev) => {
      const updated = { ...prev, [columnId]: !prev[columnId] };
      localStorage.setItem('columnVisibility', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleReorderColumns = useCallback((newOrder: string[]) => {
    setColumnOrder(newOrder);
    localStorage.setItem('columnOrder', JSON.stringify(newOrder));
  }, []);

  const visibleColumns = useMemo(() => {
    return columnOrder
      .filter((colId) => columnVisibility[colId])
      .map((colId) => ALL_COLUMNS.find((col) => col.id === colId))
      .filter(Boolean);
  }, [columnOrder, columnVisibility]);

  // ============================================================================
  // FIELD FILTER OPTIONS
  // ============================================================================

  const getFilterOptions = useCallback(
    (field: string) => {
      const uniqueValues = new Set<string>();
      allPatients.forEach((patient: any) => {
        const value = patient[field];
        if (Array.isArray(value)) {
          value.forEach((v: any) => uniqueValues.add(String(v)));
        } else if (value !== null && value !== undefined) {
          uniqueValues.add(String(value));
        }
      });
      return Array.from(uniqueValues).sort();
    },
    [allPatients]
  );

  const handleFieldFilterChange = useCallback((field: string, value: string) => {
    setFieldFilters((prev) => {
      const newFilters = { ...prev };
      if (!newFilters[field]) {
        newFilters[field] = new Set();
      }

      if (newFilters[field].has(value)) {
        newFilters[field].delete(value);
      } else {
        newFilters[field].add(value);
      }

      return newFilters;
    });
  }, []);

  const clearFieldFilter = useCallback((field: string) => {
    setFieldFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  }, []);

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const handlePatientClick = useCallback(
    (patientId: string) => {
      router.push(`/patients/${patientId}`);
    },
    [router]
  );

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderCellContent = useCallback(
    (patient: any, columnId: string) => {
      switch (columnId) {
        case 'select':
          return (
            <input
              type="checkbox"
              checked={selectedPatients.has(patient.id)}
              onChange={() => {}}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          );

        case 'name':
          return (
            <button
              onClick={() => handlePatientClick(patient.id)}
              className="text-left font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              {patient.name}
            </button>
          );

        case 'mrn':
          return <span className="font-mono text-sm">{patient.mrn}</span>;

        case 'dob':
          return <span>{patient.dob}</span>;

        case 'age':
          return <span>{patient.age}</span>;

        case 'gender':
          return <span>{patient.gender}</span>;

        case 'hedis_measure':
          return (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {patient.hedisMeasure}
            </span>
          );

        case 'medications':
          return (
            <div className="space-y-1">
              {patient.medications?.slice(0, 2).map((med: any, idx: number) => (
                <div key={idx} className="text-sm text-gray-900">
                  {med.name}
                </div>
              ))}
              {patient.medications?.length > 2 && (
                <div className="text-xs text-gray-500">+{patient.medications.length - 2} more</div>
              )}
            </div>
          );

        case 'aggregate_adherence':
          return <AdherenceRiskCell patient={patient} />;

        case 'fragility_tier':
          const tierColors: Record<string, string> = {
            'F1 - Imminent': 'bg-red-100 text-red-800',
            'F2 - Fragile': 'bg-orange-100 text-orange-800',
            'F3 - Moderate': 'bg-yellow-100 text-yellow-800',
            'F4 - Comfortable': 'bg-green-100 text-green-800',
            'F5 - Safe': 'bg-blue-100 text-blue-800',
          };
          const tierClass = tierColors[patient.fragilityTier] || 'bg-gray-100 text-gray-800';
          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tierClass}`}
            >
              {patient.fragilityTier}
            </span>
          );

        case 'days_to_runout':
          return (
            <span
              className={`font-medium ${patient.daysToRunout <= 7 ? 'text-red-600' : patient.daysToRunout <= 14 ? 'text-yellow-600' : 'text-gray-900'}`}
            >
              {patient.daysToRunout} days
            </span>
          );

        case 'refill_date':
          return <span>{patient.nextRefillDate || 'N/A'}</span>;

        case 'priority_score':
          return (
            <span className="font-medium text-gray-900">
              {patient.priorityScore?.toFixed(1) || 'N/A'}
            </span>
          );

        case 'last_contact':
          return <span>{patient.lastContact || 'Never'}</span>;

        case 'outreach_method':
          return (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
              {patient.outreachMethod || 'None'}
            </span>
          );

        case 'status':
          const statusColors: Record<string, string> = {
            Active: 'bg-green-100 text-green-800',
            Contacted: 'bg-blue-100 text-blue-800',
            Pending: 'bg-yellow-100 text-yellow-800',
            Lost: 'bg-red-100 text-red-800',
          };
          const statusClass = statusColors[patient.status] || 'bg-gray-100 text-gray-800';
          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
            >
              {patient.status}
            </span>
          );

        case 'campaign':
          return <span>{patient.campaign || 'None'}</span>;

        case 'actions':
          return (
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePatientClick(patient.id);
                }}
                className="text-blue-600 hover:text-blue-800"
                title="View Details"
              >
                <InformationCircleIcon className="h-5 w-5" />
              </button>
            </div>
          );

        default:
          return <span>{patient[columnId]}</span>;
      }
    },
    [selectedPatients, handlePatientClick]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && allPatients.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">{loadingMessage || 'Loading patients...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-600" />
          <p className="mt-4 font-medium text-red-600">{error}</p>
          <button
            onClick={loadPatients}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                {sortedPatients.length} patients
                {selectedPatients.size > 0 && ` • ${selectedPatients.size} selected`}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Column Manager */}
              <button
                onClick={() => setShowColumnManager(!showColumnManager)}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <FunnelIcon className="mr-2 h-4 w-4" />
                Columns
              </button>

              {/* Export */}
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                Export
              </button>

              {/* Bulk Actions */}
              {selectedPatients.size > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowCampaignModal(true)}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <TagIcon className="mr-2 h-4 w-4" />
                    Assign Campaign
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search and Quick Filters */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quick Filters */}
            {quickFiltersConfig && (
              <div className="flex items-center space-x-2">
                {quickFiltersConfig.slice(0, 4).map((filter: any) => {
                  const Icon = ICON_MAP[filter.icon] || FireIcon;
                  const isActive = activeQuickFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setActiveQuickFilter(isActive ? null : filter.id)}
                      className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Patient Overview */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PatientInventoryOverview patients={allPatients} />
      </div>

      {/* Table */}
      <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {visibleColumns.map((column: any) => (
                    <th
                      key={column.id}
                      scope="col"
                      style={{ width: column.width }}
                      className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                    >
                      {column.id === 'select' ? (
                        <input
                          type="checkbox"
                          checked={
                            selectedPatients.size === sortedPatients.length &&
                            sortedPatients.length > 0
                          }
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      ) : (
                        <button
                          onClick={() => handleSort(column.id)}
                          className="flex items-center space-x-1 hover:text-gray-700"
                        >
                          <span>{column.label}</span>
                          {sortConfig.column === column.id &&
                            (sortConfig.direction === 'asc' ? (
                              <ChevronUpIcon className="h-4 w-4" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4" />
                            ))}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sortedPatients.map((patient: any, index: number) => (
                  <tr
                    key={patient.id}
                    onClick={(e) => handleSelectPatient(patient.id, index, e)}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selectedPatients.has(patient.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    {visibleColumns.map((column: any) => (
                      <td
                        key={column.id}
                        className="px-6 py-4 text-sm whitespace-nowrap text-gray-900"
                      >
                        {renderCellContent(patient, column.id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedPatients.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-500">No patients found</p>
            </div>
          )}
        </div>
      </div>

      {/* Column Manager Modal */}
      {showColumnManager && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">Manage Columns</h3>
            </div>
            <div className="max-h-96 overflow-y-auto px-6 py-4">
              {ALL_COLUMNS.filter((col) => !col.locked).map((column) => (
                <div key={column.id} className="flex items-center py-2">
                  <input
                    type="checkbox"
                    checked={columnVisibility[column.id]}
                    onChange={() => handleToggleColumn(column.id)}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-sm text-gray-700">{column.label}</label>
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowColumnManager(false)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <CreateCampaignModal
          isOpen={showCampaignModal}
          onClose={() => setShowCampaignModal(false)}
          onSave={handleAssignToCampaign}
          preSelectedPatients={[]}
        />
      )}
    </div>
  );
};

export default MedAdherenceCRM;
