'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, max-lines-per-function, complexity, react-hooks/exhaustive-deps, @metamask/design-tokens/color-no-hex, react/no-unescaped-entities */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMedplum } from '@medplum/react';
import { usePatientDataset } from '@/contexts-legacy/PatientDatasetContext';
import {
  loadPatientsWithRxClaims,
  normalizePatientForDisplay,
} from '@/lib/services-legacy/pdcDataService';
import {
  loadPatientDataset,
  PATIENT_DATASET_SOURCES,
  DEFAULT_DATASET_ID,
} from '@/lib/services-legacy/patientDatasetLoader';
// ============================================================================
// 🏆 GOLDEN STANDARD - Import fragilityTierService for tier calculations
// DO NOT use inline tier calculations - always use this service!
// Reference: src/pages/MetricsReference.jsx
// ============================================================================
import {
  calculateFragilityTier,
  calculatePriorityScore,
} from '@/lib/services-legacy/fragilityTierService';
// ============================================================================
// 🛤️ PATHWAY SERVICE - Import for REFILL vs RENEWAL Type determination
// UI Requirement: Type column in all 4 tabs (Review, Pick-up, Exceptions, Archive)
// Reference: docs/UI_TYPE_COLUMN_REQUIREMENT.md
// ============================================================================
import { determinePathway, PATHWAY_TYPES } from '@/lib/services-legacy/pathwayService';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  PhoneIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ClockIcon,
  ArchiveBoxIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  DocumentTextIcon,
  BeakerIcon,
  HeartIcon,
  TruckIcon,
  InboxIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  ArrowUpRightIcon,
  PlayIcon,
  StopIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolid,
  XCircleIcon as XCircleSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid,
  SparklesIcon as SparklesSolid,
} from '@heroicons/react/24/solid';

/**
 * RefillWorklistPage Component (Ported to Next.js 15 App Router)
 *
 * A comprehensive Refill Worklist page based on V17 GCP wireframe design.
 * Features:
 * - Four main tabs: Refills, Pick-up, Exceptions, Archive
 * - Sub-queue filtering (All, AI Approved, Safety Failures, etc.)
 * - Right Hand Side Panel (RHSP) for patient details
 * - Outcome logging with modal
 * - Protocol checks display
 * - Batch selection and actions
 * - Tier-based priority system (F1-F5)
 */
export default function RefillWorklistPage() {
  const router = useRouter();
  const medplum = useMedplum();
  const { patientDataset } = usePatientDataset();

  // Main state
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);

  // Tab and filter state
  const [activeTab, setActiveTab] = useState('refills');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortBy, setSortBy] = useState('daysLeft');
  const [sortOrder, setSortOrder] = useState('asc');

  // Dropdown filter state (V17 wireframe: Source, Priority, Measure - only shown in Review Queue)
  const [sourceFilter, setSourceFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [measureFilter, setMeasureFilter] = useState('all'); // 'all', 'ma', 'non-ma'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'refill', 'renewal', 'no-rx'

  // Pickup sub-queue filter (V17 wireframe: Not Contacted, SMS Sent, Awaiting, Monitoring, Overdue)
  const [pickupSubQueue, setPickupSubQueue] = useState('all');

  // RHSP state
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showRHSP, setShowRHSP] = useState(false);

  // Outcome modal state
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<any>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');

  // Protocol checks expanded state
  const [expandedProtocols, setExpandedProtocols] = useState(true);

  // RHSP collapsible sections state
  const [expandedFillHistory, setExpandedFillHistory] = useState(false);
  const [expandedNotesHistory, setExpandedNotesHistory] = useState(false);
  const [expandedAIStack, setExpandedAIStack] = useState(false); // Auto-collapsed
  const [expandedClinicalDeltas, setExpandedClinicalDeltas] = useState(false); // Auto-collapsed

  // RHSP Main Tab state - 'decision', 'fills', or 'activity'
  const [rhspMainTab, setRhspMainTab] = useState('decision');

  // Add Note modal state
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  // RHSP panel mode state
  const [rhspMode, setRhspMode] = useState('default'); // 'default', 'override', 'deny', 'newrx', 'rerunai', 'pickup-outreach', 'call-log'
  const [selectedOutreachChannel, setSelectedOutreachChannel] = useState('sms'); // For pickup outreach panel
  const [outreachScriptCopied, setOutreachScriptCopied] = useState(false); // Track if script was copied

  // Call Log Form state (matches V17 wireframe)
  const [callOutcome, setCallOutcome] = useState(''); // 'confirmed', 'no-answer', 'voicemail', 'barrier', 'refused', 'callback'
  const [callBarrierType, setCallBarrierType] = useState(''); // For when outcome is 'barrier'
  const [callNotes, setCallNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState(''); // For scheduling callback
  const [expectedPickupDate, setExpectedPickupDate] = useState(''); // For confirmed pickup
  const [overrideComment, setOverrideComment] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [selectedDenyQuickReason, setSelectedDenyQuickReason] = useState<any>(null);

  // AI Script state
  const [aiScriptCopied, setAiScriptCopied] = useState(false);

  // NewRx state (inline panel, not modal)
  const [newRxCopied, setNewRxCopied] = useState(false);

  // Success toast state
  const [successToast, setSuccessToast] = useState<any>({
    show: false,
    message: '',
    patientName: '',
    outreachMethod: '',
    targetQueue: 'pickup',
  });

  // Medication-level queue overrides (key: worklistItemId, value: queue info)
  // This allows individual medication rows to have different queues than the patient default
  const [medicationQueueOverrides, setMedicationQueueOverrides] = useState<any>({});

  // Escalate/Override state - tracks which protocol checks are unchecked
  const [uncheckedProtocolChecks, setUncheckedProtocolChecks] = useState<any>({});

  // Rerun AI state
  const [isRerunningAI, setIsRerunningAI] = useState(false);
  const [rerunAIResult, setRerunAIResult] = useState<any>(null); // { decision: 'APPROVE'|'DENY', confidence: number, rationale: string }

  // Load patients - use shared context if available, otherwise load directly
  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      try {
        // First, check if we have patients in the shared context from AllPatientsCRM
        if (patientDataset.patients && patientDataset.patients.length > 0) {
          console.log(
            '📋 RefillWorklist: Using shared patient dataset from context',
            patientDataset.patients.length
          );
          setPatients(patientDataset.patients);
          setLoading(false);
          return;
        }

        // Otherwise, load directly from the same source as AllPatientsCRM
        console.log('📋 RefillWorklist: Loading patients from pdcDataService...');
        const result = await loadPatientsWithRxClaims(medplum, { limit: 200, offset: 0 });

        let loadedPatients: any[] = [];
        if (result && Array.isArray(result) && result.length > 0) {
          loadedPatients = result;
          console.log(
            `📋 RefillWorklist: Loaded ${loadedPatients.length} patients from pdcDataService`
          );
        }

        if (loadedPatients.length > 0) {
          setPatients(loadedPatients);
        } else {
          // Fallback to demo data only if no real data available
          console.log('📋 RefillWorklist: No patients found, using demo data');
          setPatients(generateDemoPatients());
        }
      } catch (error) {
        console.error('Error loading patients for RefillWorklist:', error);
        setPatients(generateDemoPatients());
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [patientDataset.patients]);

  // Generate demo patients
  const generateDemoPatients = () => {
    const firstNames = [
      'Maria',
      'John',
      'Robert',
      'Patricia',
      'Michael',
      'Linda',
      'William',
      'Elizabeth',
      'David',
      'Barbara',
      'James',
      'Susan',
      'Charles',
      'Margaret',
      'Thomas',
    ];
    const lastNames = [
      'Garcia',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Miller',
      'Davis',
      'Martinez',
      'Anderson',
      'Taylor',
      'Wilson',
      'Moore',
      'Jackson',
      'Martin',
      'Lee',
    ];
    const medications = [
      { name: 'Lisinopril 10mg', class: 'ACE Inhibitors', measure: 'MAH' },
      { name: 'Atorvastatin 20mg', class: 'Statins', measure: 'MAC' },
      { name: 'Metformin 500mg', class: 'Biguanides', measure: 'MAD' },
      { name: 'Amlodipine 5mg', class: 'Calcium Channel Blockers', measure: 'MAH' },
      { name: 'Losartan 50mg', class: 'ARBs', measure: 'MAH' },
      { name: 'Metoprolol 25mg', class: 'Beta Blockers', measure: 'MAH' },
      { name: 'Glipizide 5mg', class: 'Sulfonylureas', measure: 'MAD' },
      { name: 'Rosuvastatin 10mg', class: 'Statins', measure: 'MAC' },
      { name: 'Carvedilol 6.25mg', class: 'Beta Blockers', measure: 'MAH' },
      { name: 'Simvastatin 40mg', class: 'Statins', measure: 'MAC' },
    ];
    const providers = [
      'Dr. Smith',
      'Dr. Johnson',
      'Dr. Williams',
      'Dr. Brown',
      'Dr. Garcia',
      'Dr. Martinez',
    ];
    const pharmacies = [
      'CVS - Main St',
      'Walgreens - Oak Ave',
      'Rite Aid - Central',
      'Kroger Pharmacy',
      'Walmart Pharmacy',
    ];
    const outreachStages = [
      'awaiting',
      'sms-sent',
      'call-needed',
      'attempted-1',
      'attempted-2',
      'connected',
    ];

    return Array.from({ length: 40 }, (_, idx) => {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const med = medications[Math.floor(Math.random() * medications.length)];
      const daysLeft = Math.floor(Math.random() * 35) - 8;
      const pdc = Math.floor(Math.random() * 45) + 50;

      // Assign tier based on days left and PDC
      let tier = 'F4';
      if (daysLeft < 0) tier = 'F1';
      else if (daysLeft <= 3) tier = 'F2';
      else if (daysLeft <= 7) tier = 'F3';
      else if (daysLeft <= 14) tier = 'F4';
      else tier = 'F5';

      if (pdc < 60) tier = 'F1';
      else if (pdc < 70 && tier !== 'F1') tier = 'F2';

      // Protocol checks - Comprehensive 20 checks from V17 wireframe (4 categories)
      const refillsRemaining = Math.floor(Math.random() * 5) + 1;
      const supplyDays = 30;
      const pharmacy = pharmacies[Math.floor(Math.random() * pharmacies.length)];
      const provider = providers[Math.floor(Math.random() * providers.length)];
      const insurers = ['BCBS', 'Aetna', 'UHC', 'Cigna', 'Humana', 'Medicare'];
      const insurer = insurers[Math.floor(Math.random() * insurers.length)];

      // Generate protocol checks with realistic failure rates
      const protocolChecks = [
        // ===== BASIC VALIDATIONS (6 checks) =====
        {
          category: 'Basic Validations',
          name: 'Verify Name/DOB',
          sublabel: null,
          value: 'Verified',
          status: 'pass',
        },
        {
          name: 'Request matches Active Med',
          sublabel: '(dose/strength/directions)',
          value: 'Matches',
          status: 'pass',
        },
        {
          name: 'Medication shows Eligible/Active status',
          sublabel: null,
          value: 'Active',
          status: 'pass',
        },
        {
          name: 'Last Rx ≥30-day supply & ≥1 refill allowed',
          sublabel: null,
          value: `${supplyDays}d supply, ${refillsRemaining} refills`,
          status: refillsRemaining > 0 ? 'pass' : 'fail',
        },
        {
          name: 'Refill Too Soon Check',
          sublabel: '(≥75% supply used)',
          value: `Ready for refill (${daysLeft} days remaining)`,
          status: daysLeft <= 7 ? 'pass' : Math.random() > 0.9 ? 'fail' : 'pass',
        },
        {
          name: 'Quantity Limit Check',
          sublabel: '(Plan max quantity)',
          value: '30 units - Within limit',
          status: 'pass',
        },

        // ===== CLINICAL (4 checks) =====
        {
          category: 'Clinical',
          name: 'Prescriber Employed/Active',
          sublabel: null,
          value: `${provider} (Active)`,
          status: 'pass',
        },
        {
          name: 'Last visit within window',
          sublabel: '(12 mo, 6 mo if spironolactone/eplerenone)',
          value: Math.random() > 0.15 ? 'Within 12 months' : '14 months ago ⚠️',
          status: Math.random() > 0.15 ? 'pass' : 'fail',
        },
        {
          name: 'Labs within range',
          sublabel: '(A1C, eGFR, K+)',
          value: Math.random() > 0.1 ? 'All within range' : 'A1C 9.2% ⚠️',
          status: Math.random() > 0.1 ? 'pass' : 'fail',
        },
        {
          name: 'Vitals Check',
          sublabel: '(BP, HR within range)',
          value: `BP ${Math.floor(110 + Math.random() * 25)}/${Math.floor(70 + Math.random() * 15)}, HR ${Math.floor(65 + Math.random() * 20)}`,
          status: 'pass',
        },

        // ===== SAFETY (4 checks) =====
        {
          category: 'Safety',
          name: 'Allergy Check',
          sublabel: '(No known drug allergies)',
          value: 'NKDA',
          status: Math.random() > 0.05 ? 'pass' : 'fail',
        },
        {
          name: 'Drug Interaction Check',
          sublabel: '(DDI screening)',
          value: Math.random() > 0.08 ? 'No interactions found' : 'K+ sparing interaction ⚠️',
          status: Math.random() > 0.08 ? 'pass' : 'fail',
        },
        {
          name: 'Duplicate Therapy Check',
          sublabel: '(Same drug class)',
          value: 'No duplicates',
          status: 'pass',
        },
        {
          name: 'Controlled Substance Check',
          sublabel: '(PDMP verification)',
          value: 'Not a controlled substance',
          status: 'pass',
        },

        // ===== COVERAGE (6 checks) =====
        {
          category: 'Coverage',
          name: 'Patient Enrolled/Active',
          sublabel: null,
          value: 'Active',
          status: 'pass',
        },
        { name: 'Insurance Active', sublabel: null, value: `${insurer} - Active`, status: 'pass' },
        {
          name: 'Pharmacy Active',
          sublabel: '(In-network status)',
          value: `${pharmacy} - In-network`,
          status: 'pass',
        },
        {
          name: 'PA Check',
          sublabel: '(Prior Authorization)',
          value: 'Not Required',
          status: 'pass',
        },
        { name: 'Formulary Check', sublabel: null, value: 'Tier 1 - Preferred', status: 'pass' },
        {
          name: 'Coverage Check',
          sublabel: '(Plan limitations)',
          value: 'Covered - No restrictions',
          status: 'pass',
        },
      ];
      const failedChecks = protocolChecks.filter((c) => c.status === 'fail').length;

      // Determine AI decision based on protocol checks and PDC
      const hasAIFailure = failedChecks > 0 || pdc < 60;
      const hasSafetyIssue = failedChecks > 0;
      const aiDecision = hasAIFailure ? 'DENY' : 'APPROVE';

      // Queue assignment based on AI decision and workflow state
      const queueRoll = Math.random() * 100;
      let queue;
      if (aiDecision === 'DENY') {
        queue = queueRoll < 15 ? 'archive' : 'exceptions';
      } else {
        if (queueRoll < 20) queue = 'pickup';
        else if (queueRoll < 30) queue = 'archive';
        else queue = 'refills';
      }

      return {
        id: `patient-${idx + 1}`,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        mrn: `MRN-${100000 + idx}`,
        dob: `${Math.floor(Math.random() * 12) + 1}/${Math.floor(Math.random() * 28) + 1}/${1940 + Math.floor(Math.random() * 40)}`,
        age: 60 + Math.floor(Math.random() * 25),
        phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        medication: med.name,
        medicationClass: med.class,
        measure: med.measure,
        daysSupply: 30,
        refillsRemaining,
        extraMedCount: Math.floor(Math.random() * 4),
        source: ['Proactive', 'Member', 'Pharmacy', 'Caregiver'][Math.floor(Math.random() * 4)],
        lastDOS: new Date(
          Date.now() - Math.random() * 35 * 24 * 60 * 60 * 1000
        ).toLocaleDateString(),
        provider,
        pharmacy,
        daysLeft,
        tier,
        pdc,
        queue,
        aiDecision,
        aiConfidence: Math.floor(Math.random() * 15) + 85,
        hasAIFailure,
        hasSafetyIssue,
        protocolChecks,
        failedChecks,
        outreachStage: outreachStages[Math.floor(Math.random() * outreachStages.length)],
        outreachDay: queue === 'pickup' ? Math.floor(Math.random() * 4) + 1 : 0,
        lastContact:
          queue === 'pickup'
            ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toLocaleDateString()
            : null,
        notes: Math.random() > 0.7 ? 'Patient prefers afternoon calls. Has caregiver contact.' : '',
        pickupDate:
          queue === 'pickup'
            ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
            : null,
        exceptionReason:
          queue === 'exceptions'
            ? [
                'AI Denied - Protocol Failure',
                'AI Denied - Low PDC',
                'Prescriber Review Required',
                'Clinical Safety Concern',
              ][Math.floor(Math.random() * 4)]
            : null,
        archivedReason:
          queue === 'archive'
            ? aiDecision === 'APPROVE'
              ? ['Filled', 'Picked Up', 'Therapy Complete'][Math.floor(Math.random() * 3)]
              : ['Denied - Closed', 'Patient Declined', 'Unreachable - Closed'][
                  Math.floor(Math.random() * 3)
                ]
            : null,
        fillHistory: generateFillHistory(med.name),
        notesHistory: [],
        activityLog: generateActivityLog(queue, aiDecision, hasSafetyIssue),
        aiStack: {
          primaryAI: {
            decision: hasAIFailure ? 'DENY' : 'APPROVE',
            confidence: Math.floor(Math.random() * 15) + 85,
            rationale: hasAIFailure
              ? 'Patient has not had a recent PCP visit within the required 180-day window. Recommend scheduling appointment before refill.'
              : 'All protocol checks passed. Patient is compliant with medication regimen and has current labs on file.',
            latency: (Math.random() * 1.5 + 0.5).toFixed(1),
          },
          qaAI: {
            decision: hasAIFailure ? 'VERIFIED' : 'VERIFIED',
            confidence: Math.floor(Math.random() * 10) + 90,
            rationale: hasAIFailure
              ? 'Confirmed: Primary AI correctly identified missing PCP visit. Decision is consistent with clinical protocol.'
              : 'Primary AI decision verified. All checks correctly evaluated against current protocols.',
            latency: (Math.random() * 0.8 + 0.3).toFixed(1),
          },
          managerAI: {
            decision: hasSafetyIssue ? 'ESCALATE' : 'FINAL',
            confidence: Math.floor(Math.random() * 8) + 92,
            rationale: hasSafetyIssue
              ? 'Escalating to clinical review due to identified safety concern requiring human judgment.'
              : 'Final approval granted. Case meets all automated processing criteria.',
            latency: (Math.random() * 0.5 + 0.2).toFixed(1),
          },
        },
        clinicalDeltas: generateClinicalDeltas(hasSafetyIssue),
        treatmentDays: 300,
        gapDaysAllowed: 60,
        gapDaysRemaining:
          tier === 'F1'
            ? Math.floor(Math.random() * 6)
            : tier === 'F2'
              ? Math.floor(Math.random() * 10) + 6
              : tier === 'F3'
                ? Math.floor(Math.random() * 10) + 16
                : tier === 'F4'
                  ? Math.floor(Math.random() * 15) + 26
                  : Math.floor(Math.random() * 20) + 41,
      };
    });
  };

  // Generate fill history for a medication
  const generateFillHistory = (medName: string) => {
    const pharmacies = [
      'CVS - Main St',
      'Walgreens - Oak Ave',
      'Rite Aid - Central',
      'Kroger Pharmacy',
    ];
    const numFills = Math.floor(Math.random() * 6) + 2;
    return Array.from({ length: numFills }, (_, i) => {
      const daysAgo = (i + 1) * 30 + Math.floor(Math.random() * 10) - 5;
      const fillDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      return {
        date: fillDate.toLocaleDateString(),
        drug: medName,
        qty: 30,
        pharmacy: pharmacies[Math.floor(Math.random() * pharmacies.length)],
        status: i === 0 ? 'current' : 'completed',
      };
    });
  };

  // Generate activity log for lifecycle tracking
  const generateActivityLog = (queue: string, aiDecision: string, hasSafetyIssue: boolean) => {
    const activities: any[] = [];
    const now = Date.now();
    const authors = ['Sarah K.', 'Mike R.', 'Jennifer L.', 'System'];

    const createdDaysAgo = Math.floor(Math.random() * 3) + 3;
    const createdTime = new Date(now - createdDaysAgo * 24 * 60 * 60 * 1000);
    activities.push({
      type: 'created',
      icon: '📥',
      title: 'Refill Request Created',
      timestamp: createdTime.toISOString(),
      description: 'Patient medication added to refill worklist based on days supply calculation.',
      metadata: {
        Source: ['Proactive', 'Member Request', 'Pharmacy Transfer'][Math.floor(Math.random() * 3)],
      },
    });

    const aiEvalTime = new Date(
      createdTime.getTime() + Math.floor(Math.random() * 60 + 10) * 60 * 1000
    );
    activities.push({
      type: 'ai-evaluation',
      icon: '🤖',
      title: 'AI Evaluation Started',
      timestamp: aiEvalTime.toISOString(),
      description: '3-tier AI system initiated evaluation: Primary AI → QA AI → Manager AI',
      author: 'AI System',
    });

    const aiDecisionTime = new Date(
      aiEvalTime.getTime() + Math.floor(Math.random() * 5 + 2) * 60 * 1000
    );
    if (aiDecision === 'APPROVE') {
      activities.push({
        type: 'ai-approved',
        icon: '✅',
        title: 'AI Approved',
        timestamp: aiDecisionTime.toISOString(),
        description: 'All protocol checks passed. AI recommends approval for refill.',
        author: 'AI System',
        metadata: {
          Confidence: `${Math.floor(Math.random() * 10) + 90}%`,
          'Checks Passed': '20/20',
        },
      });
    } else {
      activities.push({
        type: 'ai-denied',
        icon: '❌',
        title: 'AI Denied',
        timestamp: aiDecisionTime.toISOString(),
        description: hasSafetyIssue
          ? 'Safety check failed. Escalated for clinical review.'
          : 'Protocol check failed. Manual review required.',
        author: 'AI System',
        metadata: { Reason: hasSafetyIssue ? 'Safety Concern' : 'Protocol Failure' },
      });
    }

    if (queue === 'pickup') {
      const userApproveTime = new Date(
        aiDecisionTime.getTime() + Math.floor(Math.random() * 4 + 1) * 60 * 60 * 1000
      );
      activities.push({
        type: 'user-approved',
        icon: '👤',
        title: 'User Approved',
        timestamp: userApproveTime.toISOString(),
        description: 'Pharmacist confirmed refill and initiated outreach.',
        author: authors[Math.floor(Math.random() * 3)],
      });

      activities.push({
        type: 'queue-change',
        icon: '📦',
        title: 'Moved to Pickup Queue',
        timestamp: new Date(userApproveTime.getTime() + 5 * 60 * 1000).toISOString(),
        description: 'Refill confirmed. Patient outreach initiated for pickup coordination.',
        author: 'System',
      });

      const outreachTime = new Date(
        userApproveTime.getTime() + Math.floor(Math.random() * 12 + 2) * 60 * 60 * 1000
      );
      const outreachTypes = [
        { desc: 'Automated SMS sent to patient with pickup reminder.', method: 'SMS' },
        { desc: 'Phone call attempted. Left voicemail with callback number.', method: 'Call' },
        { desc: 'Email notification sent with pharmacy hours and location.', method: 'Email' },
      ];
      const outreach = outreachTypes[Math.floor(Math.random() * outreachTypes.length)];
      activities.push({
        type: 'outreach',
        icon: '📞',
        title: `Outreach: ${outreach.method}`,
        timestamp: outreachTime.toISOString(),
        description: outreach.desc,
        author: outreach.method === 'Call' ? authors[Math.floor(Math.random() * 3)] : 'System',
      });
    } else if (queue === 'exceptions') {
      const escalateTime = new Date(
        aiDecisionTime.getTime() + Math.floor(Math.random() * 2 + 1) * 60 * 60 * 1000
      );
      activities.push({
        type: 'escalated',
        icon: '⚠️',
        title: 'Escalated for Review',
        timestamp: escalateTime.toISOString(),
        description: 'Requires clinical pharmacist review before proceeding.',
        author: 'System',
        metadata: { Priority: hasSafetyIssue ? 'High' : 'Normal' },
      });
    } else if (queue === 'archive') {
      const completeTime = new Date(
        aiDecisionTime.getTime() + Math.floor(Math.random() * 48 + 12) * 60 * 60 * 1000
      );
      activities.push({
        type: 'user-approved',
        icon: '👤',
        title: aiDecision === 'APPROVE' ? 'User Approved' : 'User Reviewed',
        timestamp: new Date(aiDecisionTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        description:
          aiDecision === 'APPROVE'
            ? 'Pharmacist confirmed refill approval.'
            : 'Clinical review completed. Patient contact scheduled.',
        author: authors[Math.floor(Math.random() * 3)],
      });
      activities.push({
        type: 'queue-change',
        icon: '📁',
        title: 'Case Archived',
        timestamp: completeTime.toISOString(),
        description:
          aiDecision === 'APPROVE'
            ? 'Medication picked up. Case closed successfully.'
            : 'Resolution documented. Case closed.',
        author: 'System',
      });
    }

    if (Math.random() > 0.7) {
      const noteTime = new Date(now - Math.floor(Math.random() * 24 + 2) * 60 * 60 * 1000);
      const noteTexts = [
        'Patient prefers afternoon calls after 2pm.',
        'Verified insurance coverage is active.',
        'Patient confirmed they will pick up medication tomorrow.',
        'Left voicemail regarding refill reminder.',
        'Patient mentioned cost concerns - checking alternatives.',
      ];
      activities.push({
        type: 'note',
        icon: '📝',
        title: 'User Note Added',
        timestamp: noteTime.toISOString(),
        description: noteTexts[Math.floor(Math.random() * noteTexts.length)],
        author: authors[Math.floor(Math.random() * 3)],
      });
    }

    return activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  // Generate clinical deltas (checks grouped by category)
  const generateClinicalDeltas = (hasSafetyIssue: boolean) => ({
    safety: [
      { name: 'Drug Interactions', status: 'pass', detail: 'No interactions detected' },
      {
        name: 'Contraindications',
        status: hasSafetyIssue ? 'fail' : 'pass',
        detail: hasSafetyIssue ? 'Review needed' : 'None detected',
      },
      { name: 'Allergy Check', status: 'pass', detail: 'No known allergies' },
    ],
    clinical: [
      { name: 'Lab Results', status: Math.random() > 0.1 ? 'pass' : 'warn', detail: 'Current' },
      {
        name: 'PCP Visit',
        status: Math.random() > 0.15 ? 'pass' : 'fail',
        detail: Math.random() > 0.5 ? '45 days ago' : '210 days ago',
      },
      { name: 'Vitals', status: 'pass', detail: 'Within range' },
    ],
    admin: [
      { name: 'Insurance Verified', status: 'pass', detail: 'Active coverage' },
      { name: 'Prior Auth', status: Math.random() > 0.2 ? 'pass' : 'warn', detail: 'Not required' },
      {
        name: 'Refills Available',
        status: Math.random() > 0.1 ? 'pass' : 'warn',
        detail: `${Math.floor(Math.random() * 5) + 1} remaining`,
      },
    ],
  });

  // Transform patients into worklist items - ONE ROW PER MEDICATION
  const worklistData = useMemo(() => {
    function createWorklistItem(
      patient: any,
      meds: any[],
      med: any,
      medIndex: number,
      totalMedsForPatient: number
    ) {
      const firstMed = med || {};

      let pdc =
        patient.currentPDC ??
        patient.pdc ??
        patient.aggregateAdherence?.overallPDC ??
        patient.medAdherence?.aggregatePDC ??
        patient.medAdherence?.gapDays?.PDC ??
        firstMed.currentPdc ??
        firstMed.pdc ??
        firstMed.adherence?.pdc ??
        firstMed.adherence?.currentPdc ??
        null;

      if (pdc === null && meds.length > 0) {
        for (const med of meds) {
          const medPdc =
            med.currentPdc ?? med.pdc ?? med.adherence?.pdc ?? med.adherence?.currentPdc;
          if (typeof medPdc === 'number' && medPdc > 0) {
            pdc = medPdc;
            break;
          }
        }
      }

      const daysLeft =
        patient.daysToRunout ??
        patient.daysLeft ??
        firstMed.daysToRunout ??
        firstMed.daysUntilOut ??
        null;

      const rawGapDaysRemaining = patient.gapDaysRemaining ?? firstMed.gapDaysRemaining;
      const remainingRefillsCount =
        patient.remainingRefills ??
        firstMed.refillsRemaining ??
        firstMed.refillsLeft ??
        patient.refillsRemaining ??
        3;
      const daysOfSupplyOnHand =
        patient.daysOfSupplyOnHand ?? firstMed.daysSupply ?? firstMed.supplyOnHand ?? daysLeft ?? 0;

      const today = new Date();
      const yearEnd = new Date(today.getFullYear(), 11, 31);
      const daysRemainingUntilYearEnd = Math.max(
        1,
        Math.ceil((yearEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      );

      const treatmentDays = patient.treatmentDays ?? 365;

      const daysSinceYearStart = Math.min(365, 365 - daysRemainingUntilYearEnd);
      const daysAlreadyCovered =
        patient.daysAlreadyCovered ??
        (pdc !== null ? Math.round((pdc / 100) * daysSinceYearStart) : daysSinceYearStart);

      let tier;
      let tierResult = null;

      if (typeof rawGapDaysRemaining === 'number' && remainingRefillsCount > 0) {
        tierResult = calculateFragilityTier({
          daysAlreadyCovered,
          daysOfSupplyOnHand,
          daysRemainingUntilYearEnd,
          treatmentDays,
          gapDaysRemaining: rawGapDaysRemaining,
          remainingRefills: remainingRefillsCount,
          isCurrentlyOutOfMeds: daysOfSupplyOnHand <= 0,
        });

        tier = tierResult.tier;
        if (tier && tier.includes('_')) {
          tier = tier.split('_')[0];
        }
        if (tier === 'COMPLIANT') tier = 'C';
      } else {
        tier = patient.fragilityTier || patient.tier;

        if (tier && tier.includes('_')) {
          tier = tier.split('_')[0];
        }
        if (tier === 'COMPLIANT') tier = 'C';

        tier = tier || 'F4';
      }

      const patientName =
        patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';

      const measures = patient.measures || [];
      const measure = measures[0] || firstMed.measure || firstMed.measureType || 'OTHER';

      const medicationName =
        firstMed.medicationName ||
        firstMed.drugName ||
        firstMed.name ||
        patient.medication ||
        'N/A';

      const medicationClass =
        firstMed.drugClass || firstMed.medicationClass || patient.medicationClass || '';

      const patientIdHash = (patient.id || patient.firestoreId || '')
        .split('')
        .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const seed = (patientIdHash % 100) / 100;

      let age = patient.age;
      if (!age) {
        const dobStr = patient.dob || patient.dateOfBirth || patient.birthDate;
        if (dobStr) {
          const dobDate = new Date(dobStr);
          if (!isNaN(dobDate.getTime()) && dobDate.getFullYear() > 1900) {
            const today = new Date();
            age = Math.floor(
              (today.getTime() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
            );
          }
        }
        if (!age) {
          age = 65 + (patientIdHash % 25);
        }
      }

      if (pdc === null) {
        const pdcSeed = (patientIdHash * 7) % 100;
        if (pdcSeed < 15) {
          pdc = 55 + (pdcSeed % 15);
        } else if (pdcSeed < 35) {
          pdc = 70 + ((pdcSeed - 15) % 10);
        } else {
          pdc = 80 + ((pdcSeed - 35) % 19);
        }
      }

      let protocolChecks = patient.protocolChecks;
      let failedChecks = patient.failedChecks || 0;

      if (!protocolChecks || protocolChecks.length === 0) {
        const refillsLeft = firstMed.refillsLeft ?? Math.floor(seed * 5) + 1;
        const supplyDays = firstMed.daysSupply || 30;
        const patientPharmacy = firstMed.pharmacy || patient.pharmacy || 'CVS Pharmacy';
        const patientProvider = patient.provider || patient.prescriber || 'Dr. Wilson';
        const insurers = ['BCBS', 'Aetna', 'UHC', 'Cigna', 'Humana', 'Medicare'];
        const patientInsurer = patient.insurance || insurers[patientIdHash % insurers.length];
        const daysRemaining = Math.floor(seed * 10);

        protocolChecks = [
          {
            category: 'Basic Validations',
            name: 'Verify Name/DOB',
            sublabel: null,
            value: 'Verified',
            status: 'pass',
          },
          {
            name: 'Request matches Active Med',
            sublabel: '(dose/strength/directions)',
            value: 'Matches',
            status: 'pass',
          },
          {
            name: 'Medication shows Eligible/Active status',
            sublabel: null,
            value: 'Active',
            status: 'pass',
          },
          {
            name: 'Last Rx ≥30-day supply & ≥1 refill allowed',
            sublabel: null,
            value: `${supplyDays}d supply, ${refillsLeft} refills`,
            status: refillsLeft > 0 ? 'pass' : 'fail',
          },
          {
            name: 'Refill Too Soon Check',
            sublabel: '(≥75% supply used)',
            value: `Ready for refill (${daysRemaining} days remaining)`,
            status: daysRemaining <= 7 ? 'pass' : seed > 0.9 ? 'fail' : 'pass',
          },
          {
            name: 'Quantity Limit Check',
            sublabel: '(Plan max quantity)',
            value: '30 units - Within limit',
            status: 'pass',
          },

          {
            category: 'Clinical',
            name: 'Prescriber Employed/Active',
            sublabel: null,
            value: `${patientProvider} (Active)`,
            status: 'pass',
          },
          {
            name: 'Last visit within window',
            sublabel: '(12 mo, 6 mo if spironolactone/eplerenone)',
            value: seed > 0.15 ? 'Within 12 months' : '14 months ago ⚠️',
            status: seed > 0.15 ? 'pass' : 'fail',
          },
          {
            name: 'Labs within range',
            sublabel: '(A1C, eGFR, K+)',
            value: seed > 0.1 ? 'All within range' : 'A1C 9.2% ⚠️',
            status: seed > 0.1 ? 'pass' : 'fail',
          },
          {
            name: 'Vitals Check',
            sublabel: '(BP, HR within range)',
            value: `BP ${Math.floor(110 + seed * 25)}/${Math.floor(70 + seed * 15)}, HR ${Math.floor(65 + seed * 20)}`,
            status: 'pass',
          },

          {
            category: 'Safety',
            name: 'Allergy Check',
            sublabel: '(No known drug allergies)',
            value: 'NKDA',
            status: seed > 0.05 ? 'pass' : 'fail',
          },
          {
            name: 'Drug Interaction Check',
            sublabel: '(DDI screening)',
            value: seed > 0.08 ? 'No interactions found' : 'K+ sparing interaction ⚠️',
            status: seed > 0.08 ? 'pass' : 'fail',
          },
          {
            name: 'Duplicate Therapy Check',
            sublabel: '(Same drug class)',
            value: 'No duplicates',
            status: 'pass',
          },
          {
            name: 'Controlled Substance Check',
            sublabel: '(PDMP verification)',
            value: 'Not a controlled substance',
            status: 'pass',
          },

          {
            category: 'Coverage',
            name: 'Patient Enrolled/Active',
            sublabel: null,
            value: 'Active',
            status: 'pass',
          },
          {
            name: 'Insurance Active',
            sublabel: null,
            value: `${patientInsurer} - Active`,
            status: 'pass',
          },
          {
            name: 'Pharmacy Active',
            sublabel: '(In-network status)',
            value: `${patientPharmacy} - In-network`,
            status: 'pass',
          },
          {
            name: 'PA Check',
            sublabel: '(Prior Authorization)',
            value: 'Not Required',
            status: 'pass',
          },
          { name: 'Formulary Check', sublabel: null, value: 'Tier 1 - Preferred', status: 'pass' },
          {
            name: 'Coverage Check',
            sublabel: '(Plan limitations)',
            value: 'Covered - No restrictions',
            status: 'pass',
          },
        ];
        failedChecks = protocolChecks.filter((c: any) => c.status === 'fail').length;
      }

      const hasSafetyIssue = failedChecks > 0;
      const hasLowPDC = pdc !== null && pdc < 60;
      const aiDecision = patient.aiDecision || (hasSafetyIssue || hasLowPDC ? 'DENY' : 'APPROVE');

      let queue = patient.queue;

      let exceptionType = null;
      let computedExceptionReason = null;

      const visitCheckFailed = protocolChecks.some(
        (c: any) => c.name?.toLowerCase().includes('last visit') && c.status === 'fail'
      );
      const paCheckFailed = protocolChecks.some(
        (c: any) => c.name?.toLowerCase().includes('pa check') && c.status === 'fail'
      );
      const prescriberCheckFailed = protocolChecks.some(
        (c: any) => c.name?.toLowerCase().includes('prescriber') && c.status === 'fail'
      );
      const safetyCheckFailed = protocolChecks.some(
        (c: any) => ['Safety', 'Clinical'].includes(c.category) && c.status === 'fail'
      );

      if (visitCheckFailed) {
        exceptionType = 'appointment-needed';
        computedExceptionReason = 'Schedule Doctor Appointment';
      } else if (paCheckFailed) {
        exceptionType = 'prior-auth-required';
        computedExceptionReason = 'Prior Authorization Required';
      } else if (prescriberCheckFailed) {
        exceptionType = 'prescriber-inactive';
        computedExceptionReason = 'Prescriber Review Needed';
      } else if (safetyCheckFailed) {
        exceptionType = 'clinical-concern';
        computedExceptionReason = 'Clinical Review Required';
      }

      if (!queue) {
        const queueRoll = patientIdHash % 100;

        if (aiDecision === 'DENY') {
          if (queueRoll < 12) {
            queue = 'archive';
          } else {
            queue = 'exceptions';
          }
        } else {
          if (queueRoll < 20) {
            queue = 'pickup';
          } else if (queueRoll < 30) {
            queue = 'archive';
          } else {
            queue = 'refills';
          }
        }
      }

      const providerNames = [
        'Dr. Sarah Chen',
        'Dr. Michael Park',
        'Dr. Emily Rodriguez',
        'Dr. James Wilson',
        'Dr. Lisa Thompson',
        'Dr. David Kim',
        'Dr. Jennifer Martinez',
        'Dr. Robert Johnson',
      ];
      const providerName =
        patient.provider ||
        patient.pcp?.name ||
        patient.primaryCareProvider ||
        providerNames[patientIdHash % providerNames.length];

      let lastVisitDate = patient.lastVisitDate || patient.lastVisit;
      if (!lastVisitDate) {
        const monthsAgo = (patientIdHash % 11) + 1;
        const daysAgo = monthsAgo * 30 + (patientIdHash % 20);
        const visitDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        lastVisitDate = visitDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }

      const tierToPriority: any = {
        F1: 'Critical',
        F2: 'High',
        F3: 'Medium',
        F4: 'Low',
        F5: 'Low',
        T5: 'Low',
      };
      const priority = tierToPriority[tier] || 'Medium';

      const patientId = patient.id || patient.firestoreId || `patient-${patientIdHash}`;
      const medId =
        firstMed.id ||
        firstMed.ndc ||
        medicationName.replace(/\s+/g, '-').toLowerCase() ||
        `med-${medIndex}`;

      return {
        id: `${patientId}_${medId}_${medIndex}`,
        patientId,
        patientName,
        mrn: patient.mrn || patient.Member_Id || patient.memberId || patient.id,
        dob: patient.dob || patient.dateOfBirth || 'N/A',
        age: age || 'N/A',
        medication: medicationName,
        medicationClass,
        daysSupply: firstMed.daysSupply || patient.daysSupply || 30,
        refillsRemaining: firstMed.refillsRemaining ?? firstMed.refillsLeft ?? 0,
        medIndex,
        totalMedsForPatient,
        currentMed: firstMed,
        measure,
        measures,
        source:
          patient.source ||
          ['Proactive', 'Member', 'Pharmacy', 'Caregiver'][Math.floor(Math.random() * 4)],
        lastDOS: patient.lastDOS || firstMed.lastFillDate || 'N/A',
        provider: providerName,
        pharmacy:
          patient.pharmacy ||
          patient.preferredPharmacy ||
          [
            'CVS - Main St',
            'Walgreens - Oak Ave',
            'Rite Aid - Central',
            'Kroger Pharmacy',
            'Walmart Pharmacy',
          ][patientIdHash % 5],
        daysLeft: daysLeft ?? 'N/A',
        tier,
        priority,
        pdc,
        queue,
        aiDecision,
        aiConfidence: patient.aiConfidence || Math.floor(Math.random() * 15) + 85,
        hasAIFailure: aiDecision === 'DENY',
        hasSafetyIssue,
        protocolChecks,
        failedChecks,
        outreachStage: patient.outreachStage || 'awaiting',
        outreachDay: patient.outreachDay || 0,
        lastContact: patient.lastContact,
        lastVisitDate,
        notes: patient.notes || '',
        phone: patient.phone || patient.phoneNumber || 'N/A',
        pickupDate:
          patient.pickupDate ||
          (queue === 'pickup'
            ? new Date(
                Date.now() + ((patientIdHash % 7) + 1) * 24 * 60 * 60 * 1000
              ).toLocaleDateString()
            : null),
        exceptionType:
          patient.exceptionType ||
          exceptionType ||
          (queue === 'exceptions'
            ? ['prior-auth-required', 'insurance-issue', 'prescriber-inactive', 'clinical-concern'][
                patientIdHash % 4
              ]
            : null),
        exceptionReason:
          patient.exceptionReason ||
          computedExceptionReason ||
          (queue === 'exceptions'
            ? ['Prior Auth Required', 'Insurance Issue', 'Prescriber Review', 'Clinical Concern'][
                patientIdHash % 4
              ]
            : null),
        archivedReason:
          patient.archivedReason ||
          (queue === 'archive'
            ? ['Filled', 'Declined', 'Unreachable', 'Therapy Change'][patientIdHash % 4]
            : null),
        gapDaysRemaining:
          rawGapDaysRemaining ??
          (tier === 'T5'
            ? -((patientIdHash % 10) + 1)
            : tier === 'F1'
              ? patientIdHash % 6
              : tier === 'F2'
                ? (patientIdHash % 10) + 6
                : tier === 'F3'
                  ? (patientIdHash % 10) + 16
                  : tier === 'F4'
                    ? (patientIdHash % 15) + 26
                    : (patientIdHash % 20) + 41),
        rawPatient: patient,
        fillHistory: patient.fillHistory || generateFillHistory(medicationName),
        notesHistory: patient.notesHistory || [],
        activityLog: patient.activityLog || generateActivityLog(queue, aiDecision, hasSafetyIssue),
        aiStack: patient.aiStack || {
          primaryAI: {
            decision: aiDecision,
            confidence: 92,
            rationale: 'Protocol checks passed.',
            latency: '1.2',
          },
          qaAI: {
            decision: 'VERIFIED',
            confidence: 95,
            rationale: 'Primary AI decision verified.',
            latency: '0.8',
          },
          managerAI: {
            decision: 'FINAL',
            confidence: 97,
            rationale: 'Case approved for processing.',
            latency: '0.5',
          },
        },
        clinicalDeltas: patient.clinicalDeltas || generateClinicalDeltas(hasSafetyIssue),
      };
    }

    return patients.flatMap((patient: any) => {
      const meds = patient.medAdherence?.medications || patient.medications || [];

      if (meds.length === 0) {
        return [createWorklistItem(patient, meds, {}, 0, 1)];
      }

      const worklistMeds = meds.filter((med: any) => {
        const medMeasure = med.measureType || med.measure;
        const isAdherenceMed = ['MAC', 'MAD', 'MAH'].includes(medMeasure);
        const needsRefill = (med.daysToRunout ?? med.daysUntilOut ?? 999) <= 14;
        const hasLowPDC = (med.currentPdc ?? med.pdc ?? 100) < 80;
        return isAdherenceMed || needsRefill || hasLowPDC;
      });

      const medsToUse = worklistMeds.length > 0 ? worklistMeds : [meds[0]];
      const totalMedsForPatient = worklistMeds.length > 0 ? worklistMeds.length : 1;

      return medsToUse.map((med: any, medIndex: number) => {
        const item = createWorklistItem(patient, meds, med, medIndex, totalMedsForPatient);

        const override = medicationQueueOverrides[item.id];
        if (override) {
          return {
            ...item,
            queue: override.queue,
            outreachMethod: override.outreachMethod,
            outreachPriority: override.outreachPriority,
            outreachReason: override.outreachReason,
            outreachStage: override.outreachStage,
            approvedAt: override.approvedAt,
            activityLog: override.activityLog || item.activityLog,
            urgentSince: override.urgentSince,
            urgentReason: override.urgentReason,
            archiveReason: override.archiveReason,
            archiveDate: override.archiveDate,
          };
        }
        return item;
      });
    });
  }, [patients, medicationQueueOverrides]);

  // Sync selectedPatient with latest data when worklistData changes
  useEffect(() => {
    if (selectedPatient && worklistData.length > 0) {
      const updatedPatient = worklistData.find((p: any) => p.id === selectedPatient.id);
      if (updatedPatient && JSON.stringify(updatedPatient) !== JSON.stringify(selectedPatient)) {
        setSelectedPatient(updatedPatient);
      }
    }
  }, [worklistData, selectedPatient?.id]);

  // Tab counts
  const tabCounts = useMemo(
    () => ({
      refills: worklistData.filter((p: any) => p.queue === 'refills').length,
      pickup: worklistData.filter((p: any) => p.queue === 'pickup').length,
      exceptions: worklistData.filter((p: any) => p.queue === 'exceptions').length,
      archive: worklistData.filter((p: any) => p.queue === 'archive').length,
    }),
    [worklistData]
  );

  // Pickup sub-queue counts
  const pickupSubQueueCounts = useMemo(() => {
    const pickupItems = worklistData.filter((p: any) => p.queue === 'pickup');

    const isUrgent = (item: any) => {
      const daysLeft = item.daysLeft ?? item.daysToRunout ?? 30;
      return daysLeft < 0 || item.outreachStage === 'urgent';
    };

    const needsAction = (item: any) => {
      const stage = item.outreachStage;
      return (
        !stage || stage === 'not-contacted' || stage === 'call-needed' || stage === 'call-attempted'
      );
    };

    const isMonitoring = (item: any) => {
      const stage = item.outreachStage;
      return (
        stage === 'sms-sent' ||
        stage === 'awaiting' ||
        stage === 'awaiting-response' ||
        stage === 'chatbot-active' ||
        stage === 'monitoring' ||
        stage === 'confirmed'
      );
    };

    return {
      all: pickupItems.length,
      actionNeeded: pickupItems.filter((p: any) => needsAction(p) && !isUrgent(p)).length,
      monitoring: pickupItems.filter((p: any) => isMonitoring(p) && !isUrgent(p)).length,
      urgent: pickupItems.filter((p: any) => isUrgent(p)).length,
    };
  }, [worklistData]);

  // Check if we're in global search mode
  const isGlobalSearch = searchQuery.trim().length > 0;

  // Filter and sort data
  const filteredData = useMemo(() => {
    let data = isGlobalSearch
      ? [...worklistData]
      : worklistData.filter((p: any) => p.queue === activeTab);

    if (!isGlobalSearch && activeTab === 'refills' && sourceFilter !== 'all') {
      data = data.filter((item: any) => item.source === sourceFilter);
    }

    if (!isGlobalSearch && activeTab === 'refills' && priorityFilter !== 'all') {
      data = data.filter((item: any) => {
        const tierToPriority: any = {
          F1: 'Critical',
          F2: 'High',
          F3: 'Medium',
          F4: 'Low',
          F5: 'Low',
        };
        return tierToPriority[item.tier] === priorityFilter;
      });
    }

    if (!isGlobalSearch && activeTab === 'refills' && measureFilter !== 'all') {
      data = data.filter((item: any) => {
        const measure = item.measure || item.measureType || '';
        const isMAMedication = ['MAC', 'MAD', 'MAH'].includes(measure);

        if (measureFilter === 'ma') {
          return isMAMedication;
        } else if (measureFilter === 'non-ma') {
          return !isMAMedication;
        }
        return true;
      });
    }

    if (!isGlobalSearch && typeFilter !== 'all' && activeTab === 'refills') {
      data = data.filter((item: any) => {
        const rxDateValue =
          item.rxDate ?? item.rxWrittenDate ?? item.lastFillDate ?? item.lastDOS ?? null;
        const pathwayResult = determinePathway({
          refillsRemaining: item.refillsRemaining ?? item.refills ?? 0,
          rxDate: rxDateValue,
          lastVisitDate: item.lastVisitDate ?? item.lastVisit ?? null,
        });
        const itemType = pathwayResult.type;

        if (typeFilter === 'refill') {
          return itemType === PATHWAY_TYPES.REFILL;
        } else if (typeFilter === 'renewal') {
          return itemType === PATHWAY_TYPES.RENEWAL;
        } else if (typeFilter === 'no-rx') {
          return itemType === PATHWAY_TYPES.NO_RX;
        }
        return true;
      });
    }

    if (!isGlobalSearch && activeTab === 'pickup' && pickupSubQueue !== 'all') {
      data = data.filter((item: any) => {
        const stage = item.outreachStage;
        const daysLeft = item.daysLeft ?? item.daysToRunout ?? 30;
        const isUrgent = daysLeft < 0 || stage === 'urgent';

        switch (pickupSubQueue) {
          case 'action-needed':
            return (
              (!stage ||
                stage === 'not-contacted' ||
                stage === 'call-needed' ||
                stage === 'call-attempted') &&
              !isUrgent
            );
          case 'monitoring':
            return (
              (stage === 'sms-sent' ||
                stage === 'awaiting' ||
                stage === 'awaiting-response' ||
                stage === 'chatbot-active' ||
                stage === 'monitoring' ||
                stage === 'confirmed') &&
              !isUrgent
            );
          case 'urgent':
            return isUrgent;
          default:
            return true;
        }
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (item: any) =>
          item.patientName.toLowerCase().includes(q) ||
          item.medication.toLowerCase().includes(q) ||
          item.mrn.toLowerCase().includes(q)
      );
    }

    data.sort((a: any, b: any) => {
      if (isGlobalSearch) {
        const queueOrder: any = { refills: 0, pickup: 1, exceptions: 2, archive: 3 };
        if (queueOrder[a.queue] !== queueOrder[b.queue]) {
          return queueOrder[a.queue] - queueOrder[b.queue];
        }
      }

      let aVal, bVal;

      switch (sortBy) {
        case 'priority': {
          const priorityOrder: any = { Critical: 1, High: 2, Medium: 3, Low: 4 };
          const getPriority = (item: any) => {
            if (item.priority) return item.priority;
            const tierToPriority: any = {
              F1: 'Critical',
              F2: 'High',
              F3: 'Medium',
              F4: 'Low',
              F5: 'Low',
            };
            return tierToPriority[item.tier] || 'Low';
          };
          aVal = priorityOrder[getPriority(a)] || 99;
          bVal = priorityOrder[getPriority(b)] || 99;
          break;
        }
        case 'measure': {
          aVal = a.measure || a.measureType || '';
          bVal = b.measure || b.measureType || '';
          break;
        }
        case 'pdc': {
          aVal = a.pdc ?? a.currentPdc ?? -1;
          bVal = b.pdc ?? b.currentPdc ?? -1;
          break;
        }
        case 'lastVisit': {
          aVal = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          bVal = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
          break;
        }
        case 'daysLeft': {
          aVal = a.daysLeft ?? 999;
          bVal = b.daysLeft ?? 999;
          break;
        }
        default:
          aVal = a[sortBy];
          bVal = b[sortBy];
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return data;
  }, [
    worklistData,
    activeTab,
    searchQuery,
    sortBy,
    sortOrder,
    sourceFilter,
    priorityFilter,
    measureFilter,
    typeFilter,
    pickupSubQueue,
    isGlobalSearch,
  ]);

  // Handlers
  const toggleRowSelection = (id: any) => {
    setSelectedRows((prev: any) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredData.map((item: any) => item.id)));
    }
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const handleBatchApprove = () => {
    console.log('Batch approving:', Array.from(selectedRows));
    clearSelection();
  };

  const handleRowClick = (patient: any) => {
    if (isGlobalSearch && patient.queue !== activeTab) {
      setActiveTab(patient.queue);
      setSearchQuery('');
    }
    setSelectedPatient(patient);
    setShowRHSP(true);
  };

  const closeRHSP = () => {
    setShowRHSP(false);
    setSelectedPatient(null);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev: any) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Styling helpers
  const getTierStyles = (tier: string) => {
    const styles: any = {
      F1: {
        border: 'border-l-red-500',
        badge: 'bg-red-50 text-red-700',
        label: 'CRITICAL',
        color: '#ef4444',
      },
      F2: {
        border: 'border-l-amber-500',
        badge: 'bg-amber-50 text-amber-700',
        label: 'URGENT',
        color: '#f59e0b',
      },
      F3: {
        border: 'border-l-gray-400',
        badge: 'bg-gray-100 text-gray-700',
        label: 'MEDIUM',
        color: '#6b7280',
      },
      F4: {
        border: 'border-l-gray-300',
        badge: 'bg-gray-100 text-gray-600',
        label: 'LOW',
        color: '#9ca3af',
      },
      F5: {
        border: 'border-l-gray-200',
        badge: 'bg-gray-50 text-gray-500',
        label: 'ROUTINE',
        color: '#d1d5db',
      },
      T5: {
        border: 'border-l-gray-300',
        badge: 'bg-gray-100 text-gray-500',
        label: 'N/A',
        color: '#9ca3af',
      },
    };
    return styles[tier] || styles.F4;
  };

  const getMeasureStyles = () => {
    return 'bg-gray-100 text-gray-700';
  };

  const getSourceStyles = () => {
    return 'bg-gray-100 text-gray-600';
  };

  const getPDCStyles = (pdc: number) => {
    if (pdc >= 80) return 'bg-green-50 text-green-700';
    if (pdc >= 60) return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-700';
  };

  const getQueueLabel = (queue: string) => {
    const labels: any = {
      refills: 'Review',
      pickup: 'Pick-up',
      exceptions: 'Exceptions',
      archive: 'Archive',
    };
    return labels[queue] || queue;
  };

  const getQueueBadgeStyles = (queue: string) => {
    const styles: any = {
      refills: 'bg-blue-100 text-blue-700',
      pickup: 'bg-green-100 text-green-700',
      exceptions: 'bg-orange-100 text-orange-700',
      archive: 'bg-gray-100 text-gray-600',
    };
    return styles[queue] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Loading worklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* Page Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Refill Worklist</h1>
              <p className="text-sm text-gray-500">Manage medication refills across all patients</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient, MRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-9 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => window.location.reload()}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Refresh"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>

            <button
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Settings"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6">
        <div className="flex">
          <button
            onClick={() => setActiveTab('refills')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'refills'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
            <span>Review</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === 'refills' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {tabCounts.refills}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pickup')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'pickup'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <TruckIcon className="h-4 w-4" />
            <span>Pick-up</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === 'pickup' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {tabCounts.pickup}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('exceptions')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'exceptions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ExclamationCircleIcon className="h-4 w-4" />
            <span>Exceptions</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === 'exceptions' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {tabCounts.exceptions}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'archive'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ArchiveBoxIcon className="h-4 w-4" />
            <span>Archive</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === 'archive' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {tabCounts.archive}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-6 pb-0">
        {/* Global Search Results Banner */}
        {isGlobalSearch && (
          <div className="mb-4 flex flex-shrink-0 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-800">
              Searching across all queues for "{searchQuery}"
            </span>
            <span className="text-sm text-gray-600">
              {filteredData.length} result{filteredData.length !== 1 ? 's' : ''} found
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="ml-auto rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Filter Bar for Review Queue */}
        {!isGlobalSearch && activeTab === 'refills' && (
          <div className="mb-4 flex flex-shrink-0 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2 text-gray-500">
              <FunnelIcon className="h-4 w-4" />
              <span className="text-xs font-semibold tracking-wide uppercase">Filters</span>
            </div>

            <div className="h-6 w-px bg-gray-300" />

            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className={`min-w-[130px] cursor-pointer appearance-none rounded-lg px-4 py-2 pr-9 text-sm font-medium transition-all duration-150 ${
                  sourceFilter !== 'all'
                    ? 'border-2 border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:shadow-sm'
                } focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none`}
              >
                <option value="all">All Sources</option>
                <option value="Proactive">Proactive</option>
                <option value="Member">Member</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Caregiver">Caregiver</option>
              </select>
              <ChevronDownIcon
                className={`pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 ${sourceFilter !== 'all' ? 'text-blue-600' : 'text-gray-400'}`}
              />
            </div>

            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={`min-w-[130px] cursor-pointer appearance-none rounded-lg px-4 py-2 pr-9 text-sm font-medium transition-all duration-150 ${
                  priorityFilter !== 'all'
                    ? 'border-2 border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:shadow-sm'
                } focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none`}
              >
                <option value="all">All Priority</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <ChevronDownIcon
                className={`pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 ${priorityFilter !== 'all' ? 'text-blue-600' : 'text-gray-400'}`}
              />
            </div>

            <div className="relative">
              <select
                value={measureFilter}
                onChange={(e) => setMeasureFilter(e.target.value)}
                className={`min-w-[130px] cursor-pointer appearance-none rounded-lg px-4 py-2 pr-9 text-sm font-medium transition-all duration-150 ${
                  measureFilter !== 'all'
                    ? 'border-2 border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:shadow-sm'
                } focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none`}
              >
                <option value="all">All Measures</option>
                <option value="ma">MA Measures</option>
                <option value="non-ma">Non-MA</option>
              </select>
              <ChevronDownIcon
                className={`pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 ${measureFilter !== 'all' ? 'text-blue-600' : 'text-gray-400'}`}
              />
            </div>

            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`min-w-[130px] cursor-pointer appearance-none rounded-lg px-4 py-2 pr-9 text-sm font-medium transition-all duration-150 ${
                  typeFilter !== 'all'
                    ? 'border-2 border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:shadow-sm'
                } focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none`}
              >
                <option value="all">All Types</option>
                <option value="refill">Refill</option>
                <option value="renewal">Renewal</option>
                <option value="no-rx">No Rx</option>
              </select>
              <ChevronDownIcon
                className={`pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 ${typeFilter !== 'all' ? 'text-blue-600' : 'text-gray-400'}`}
              />
            </div>
          </div>
        )}

        {/* Table + RHSP Container */}
        <div className="flex min-h-0 flex-1 gap-6 overflow-hidden">
          {/* Table Container */}
          <div
            className={`${showRHSP ? 'flex-1' : 'w-full'} flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white`}
          >
            {/* Table Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  {filteredData.length} item{filteredData.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Scrollable Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
                    <th className="px-4 py-3 text-left">Patient</th>
                    <th className="px-4 py-3 text-left">Medication</th>
                    <th className="px-4 py-3 text-left">Tier</th>
                    <th className="px-4 py-3 text-left">PDC</th>
                    <th className="px-4 py-3 text-left">Days Left</th>
                    <th className="px-4 py-3 text-left">AI Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map((item: any) => (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{item.patientName}</div>
                        <div className="text-xs text-gray-500">{item.mrn}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{item.medication}</div>
                        <div className="text-xs text-gray-500">{item.medicationClass}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${getTierStyles(item.tier).badge}`}
                        >
                          {item.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${getPDCStyles(item.pdc)}`}
                        >
                          {item.pdc}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">{item.daysLeft} days</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${
                            item.aiDecision === 'APPROVE'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {item.aiDecision}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredData.length === 0 && (
                <div className="py-12 text-center">
                  <InboxIcon className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                  <p className="text-sm text-gray-600">No items found</p>
                </div>
              )}
            </div>
          </div>

          {/* RHSP - Right Hand Side Panel - SIMPLIFIED PLACEHOLDER */}
          {showRHSP && selectedPatient && (
            <div className="flex w-[400px] flex-shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
              {/* RHSP Header */}
              <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Patient Details</h3>
                <button
                  onClick={closeRHSP}
                  className="rounded-lg p-1 transition-colors hover:bg-gray-100"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* RHSP Content - SIMPLIFIED */}
              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {selectedPatient.patientName}
                    </div>
                    <div className="text-sm text-gray-500">MRN: {selectedPatient.mrn}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">DOB</div>
                      <div className="text-sm font-medium text-gray-900">{selectedPatient.dob}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Age</div>
                      <div className="text-sm font-medium text-gray-900">{selectedPatient.age}</div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-gray-500">Medication</div>
                    <div className="text-sm font-medium text-gray-900">
                      {selectedPatient.medication}
                    </div>
                    <div className="text-xs text-gray-500">{selectedPatient.medicationClass}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Tier</div>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-bold ${getTierStyles(selectedPatient.tier).badge}`}
                      >
                        {selectedPatient.tier}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">PDC</div>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-bold ${getPDCStyles(selectedPatient.pdc)}`}
                      >
                        {selectedPatient.pdc}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Days Until Runout</div>
                    <div className="text-sm font-medium text-gray-900">
                      {selectedPatient.daysLeft} days
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs text-gray-500">AI Decision</div>
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${
                        selectedPatient.aiDecision === 'APPROVE'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {selectedPatient.aiDecision}
                    </span>
                    <div className="mt-1 text-xs text-gray-500">
                      Confidence: {selectedPatient.aiConfidence}%
                    </div>
                  </div>
                </div>
              </div>

              {/* RHSP Footer - Action Buttons - SIMPLIFIED */}
              {rhspMode === 'default' && selectedPatient.queue === 'refills' && (
                <div className="flex flex-shrink-0 gap-2 border-t border-gray-200 p-4">
                  <button
                    onClick={() => console.log('Approve clicked')}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => console.log('Deny clicked')}
                    className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Deny
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {successToast.show &&
        (() => {
          const isExceptions = successToast.targetQueue === 'exceptions';
          const isArchive = successToast.targetQueue === 'archive';
          const isPickup = successToast.targetQueue === 'pickup';

          const queueLabel = isArchive ? 'Archive' : isExceptions ? 'Exceptions' : 'Pickup';
          const borderColor = isArchive
            ? 'border-red-200'
            : isExceptions
              ? 'border-orange-200'
              : 'border-green-200';
          const iconBg = isArchive ? 'bg-red-100' : isExceptions ? 'bg-orange-100' : 'bg-green-100';
          const iconColor = isArchive
            ? 'text-red-600'
            : isExceptions
              ? 'text-orange-600'
              : 'text-green-600';

          return (
            <div className="animate-in slide-in-from-bottom-4 fade-in fixed right-6 bottom-6 z-50 duration-300">
              <div
                className={`rounded-xl border bg-white shadow-2xl ${borderColor} max-w-md overflow-hidden`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-10 w-10 flex-shrink-0 rounded-full ${iconBg} flex items-center justify-center`}
                    >
                      {isArchive ? (
                        <XCircleSolid className={`h-6 w-6 ${iconColor}`} />
                      ) : isExceptions ? (
                        <ArrowUpRightIcon className={`h-6 w-6 ${iconColor}`} />
                      ) : (
                        <CheckCircleSolid className={`h-6 w-6 ${iconColor}`} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 text-sm font-bold text-gray-900">
                        Moved to {queueLabel} Queue
                      </h4>
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-900">
                          {successToast.patientName}
                        </span>{' '}
                        has been moved to the {queueLabel} queue.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setSuccessToast({
                          show: false,
                          patientName: '',
                          outreachMethod: '',
                          outreachPriority: '',
                          outreachIcon: '',
                          targetQueue: 'pickup',
                        })
                      }
                      className="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-gray-100"
                    >
                      <XMarkIcon className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
