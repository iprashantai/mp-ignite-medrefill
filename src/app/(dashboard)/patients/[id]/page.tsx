'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, max-lines-per-function, complexity, react-hooks/exhaustive-deps */

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  PlusIcon,
  TagIcon,
  MegaphoneIcon,
  HomeIcon,
  BeakerIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { addDays, isEqual, isBefore, differenceInDays as dateFnsDifferenceInDays } from 'date-fns';
import { useMedplum } from '@medplum/react';
import { PatientDatasetProvider, usePatientDataset } from '@/contexts/PatientDatasetContext';
import {
  OverviewTab,
  MedicationsTab,
  OutreachTab,
  CampaignsTab,
  RefillWorklistTab,
} from '@/components/patient-detail-tabs';

// Stub imports - these will be created as needed
const MedicationTableWithDetails = ({ medications, onMedicationClick }: any) => (
  <div>MedicationTableWithDetails</div>
);
const MedicationComparisonTable = ({ medications }: any) => <div>MedicationComparisonTable</div>;
const MultiTrackTimeline = ({ events, medications }: any) => <div>MultiTrackTimeline</div>;
const QuickActionsBar = ({ patient, onWatchListToggle }: any) => <div>QuickActionsBar</div>;
const AddNoteModal = ({ isOpen, onClose, onSave, patientName }: any) => <div>AddNoteModal</div>;
const CRMStatusDropdown = ({ currentStatus, onStatusChange }: any) => <div>CRMStatusDropdown</div>;
const CampaignAssignmentModal = ({
  isOpen,
  onClose,
  onSave,
  currentCampaigns,
  patientName,
}: any) => <div>CampaignAssignmentModal</div>;
const OutreachHistoryEnhanced = ({ history }: any) => <div>OutreachHistoryEnhanced</div>;
const LogOutreachModal = ({ isOpen, onClose, onSave, patientName }: any) => (
  <div>LogOutreachModal</div>
);
const CommunicationPreferences = ({ preferences, onUpdate }: any) => (
  <div>CommunicationPreferences</div>
);
const LogActivityModal = ({ isOpen, onClose, onSave }: any) => <div>LogActivityModal</div>;

/**
 * Calculate age from date of birth
 * @param {string|Date|Object} dob - Date of birth (can be string, Date object, or Firestore Timestamp)
 * @returns {number|null} - Age in years, or null if cannot calculate
 */
const calculateAge = (dob: any): number | null => {
  if (!dob) return null;

  let birthDate: Date;
  // Handle different date formats
  if (typeof dob === 'string') {
    birthDate = new Date(dob);
  } else if (dob instanceof Date) {
    birthDate = dob;
  } else if (dob?.toDate && typeof dob.toDate === 'function') {
    // Firestore Timestamp
    birthDate = dob.toDate();
  } else if (dob?.seconds) {
    // Firestore Timestamp object
    birthDate = new Date(dob.seconds * 1000);
  } else {
    return null;
  }

  if (isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * PatientDetailPageTabbed - Display actual patient data from All Patients CRM
 *
 * This component receives patient data through Next.js navigation state when navigating from AllPatientsCRM.
 * If no state is available, it fetches from Medplum.
 */

// Fallback patient data structure (used only if no state is passed)
const getEmptyPatientData = (patientId: string) => {
  return {
    id: patientId,
    name: 'No Patient Data Available',
    firstName: '',
    lastName: '',
    mrn: patientId,
    dateOfBirth: '',
    age: 0,
    phone: '',
    email: '',
    address: '',
    medications: [],
    aggregateAdherence: {
      overallPDC: 0,
      totalMedications: 0,
      worstMedication: {},
      bestMedication: {},
    },
    insurance: {
      plan: 'N/A',
      memberId: '',
      group: '',
    },
    pcp: {
      name: 'N/A',
      phone: '',
      npi: '',
    },
    crm: {
      status: 'not_contacted',
      campaigns: [],
      watchList: false,
    },
    timeline: [],
    notes: [],
  };
};

/**
 * Inner component that uses the patient context
 */
const PatientDetailContent = () => {
  const router = useRouter();
  const { patient, isLoading: loading, loadPatient } = usePatientDataset();
  const params = useParams();
  const patientId = params.id as string;

  // Load patient data on mount
  useEffect(() => {
    if (patientId) {
      loadPatient(patientId);
    }
  }, [patientId, loadPatient]);

  console.log('📊 Patient State Debug:', {
    patientId,
    hasPatient: !!patient,
    medicationsCount: patient?.medications?.length || 0,
  });

  const [activeContentTab, setActiveContentTab] = useState('overview');
  const [selectedMedicationId, setSelectedMedicationId] = useState<string | null>(null);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isLogOutreachModalOpen, setIsLogOutreachModalOpen] = useState(false);
  const [campaignDetails, setCampaignDetails] = useState<any[]>([]);

  // Fetch campaign details based on patient's enrolled campaigns
  useEffect(() => {
    const fetchCampaignDetails = async () => {
      // TODO: Implement Medplum campaign fetch
      // For now, campaigns are handled in CampaignsTab component
      setCampaignDetails([]);
    };

    fetchCampaignDetails();
  }, [patient]);

  // Handle adding a new note
  const handleSaveNote = async (newNote: any) => {
    // TODO: Save to Medplum
    console.log('Save note:', newNote);
  };

  // Handle watch list toggle
  const handleWatchListToggle = () => {
    // TODO: Save to Medplum
    console.log('Toggle watch list for patient:', patientId);
  };

  // Handle CRM status change
  const handleStatusChange = (newStatus: string) => {
    // TODO: Save to Medplum
    console.log('Update CRM status:', newStatus);
  };

  // Handle campaign assignments
  const handleSaveCampaigns = async (campaigns: any[]) => {
    // TODO: Save to Medplum
    console.log('Save campaigns:', campaigns);
  };

  // Handle logging outreach
  const handleSaveOutreach = async (newOutreach: any) => {
    // TODO: Save to Medplum
    console.log('Save outreach:', newOutreach);
  };

  // Handle communication preferences update
  const handleUpdateCommPrefs = (newPrefs: any) => {
    // TODO: Save to Medplum
    console.log('Update comm prefs:', newPrefs);
  };

  // Selected medication for sidebar display
  const selectedMedication = useMemo(() => {
    if (!selectedMedicationId) return null;
    return (patient?.medications || []).find((med: any) => med.id === selectedMedicationId);
  }, [selectedMedicationId, patient?.medications]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header - Sleek World Class Design */}
      <div className="flex-shrink-0 border-b border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 shadow-sm">
        <div className="mx-auto max-w-[1600px] px-6 py-2.5">
          {/* Row 1: Patient Identity & Quick Actions */}
          <div className="flex items-center justify-between">
            {/* Left: Back Button + Patient Info */}
            <div className="flex items-center gap-3">
              {/* Back Button - Sleek Version */}
              <button
                onClick={() => router.push('/patients')}
                className="group rounded-lg border border-gray-200 bg-white/80 p-1.5 shadow-sm transition-all duration-200 hover:border-transparent hover:bg-gradient-to-br hover:from-indigo-500 hover:to-purple-500 hover:shadow-md"
              >
                <ArrowLeftIcon className="h-4 w-4 text-gray-600 transition-colors group-hover:text-white" />
              </button>

              {/* Patient Avatar + Info Card - Sleek Version */}
              <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/60 px-4 py-2 shadow-sm backdrop-blur-sm">
                {/* Avatar with Initials - Smaller */}
                <div className="flex-shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-md">
                    <span className="text-xs font-bold text-white">
                      {(patient?.name || 'NN')
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Patient Details - Compact */}
                <div>
                  <div className="mb-0.5 flex items-center gap-2">
                    <h1 className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 bg-clip-text text-sm font-bold text-transparent">
                      {patient?.name || 'No Patient Data'}
                    </h1>
                    {/* TODO: Implement watch list functionality */}
                    {false && (
                      <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        WATCH LIST
                      </span>
                    )}
                  </div>

                  {/* Patient Metadata - Sleek Inline */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <div className="flex items-center gap-1 rounded border border-indigo-200 bg-indigo-100 px-1.5 py-0.5">
                      <svg
                        className="h-2.5 w-2.5 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                      <span className="font-semibold text-indigo-900">MRN:</span>
                      <span className="font-medium text-indigo-700">{patient?.mrn || 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-1 rounded border border-purple-200 bg-purple-100 px-1.5 py-0.5">
                      <svg
                        className="h-2.5 w-2.5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="font-semibold text-purple-900">DOB:</span>
                      <span className="font-medium text-purple-700">{patient?.dob || 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-1 rounded border border-pink-200 bg-pink-100 px-1.5 py-0.5">
                      <svg
                        className="h-2.5 w-2.5 text-pink-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="font-semibold text-pink-900">Age:</span>
                      <span className="font-medium text-pink-700">{patient?.age || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quick Actions */}
            <QuickActionsBar patient={patient} onWatchListToggle={handleWatchListToggle} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-[1600px] flex-col px-6 py-3">
          {/* Content Tabs - World Class Design */}
          <div className="relative mb-4">
            {/* Tab Background with Gradient */}
            <div className="absolute inset-0 rounded-t-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 opacity-50"></div>

            {/* Tabs Container */}
            <div className="relative flex gap-1 overflow-x-auto px-2 pt-2">
              {/* Overview Tab */}
              <button
                onClick={() => setActiveContentTab('overview')}
                className={`group relative rounded-t-xl px-5 py-3 text-sm font-bold transition-all duration-200 ${
                  activeContentTab === 'overview'
                    ? 'bg-white text-indigo-700 shadow-lg'
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <HomeIcon
                    className={`h-4 w-4 ${activeContentTab === 'overview' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                  />
                  <span>Overview</span>
                </div>
                {activeContentTab === 'overview' && (
                  <div className="absolute right-0 bottom-0 left-0 h-1 rounded-t-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
                )}
              </button>

              {/* Medications Tab */}
              <button
                onClick={() => setActiveContentTab('medications')}
                className={`group relative rounded-t-xl px-5 py-3 text-sm font-bold transition-all duration-200 ${
                  activeContentTab === 'medications'
                    ? 'bg-white text-purple-700 shadow-lg'
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BeakerIcon
                    className={`h-4 w-4 ${activeContentTab === 'medications' ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                  />
                  <span>Medications</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      activeContentTab === 'medications'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }`}
                  >
                    {patient?.medications?.length || 0}
                  </span>
                </div>
                {activeContentTab === 'medications' && (
                  <div className="absolute right-0 bottom-0 left-0 h-1 rounded-t-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600"></div>
                )}
              </button>

              {/* Outreach Tab */}
              <button
                onClick={() => setActiveContentTab('outreach')}
                className={`group relative rounded-t-xl px-5 py-3 text-sm font-bold transition-all duration-200 ${
                  activeContentTab === 'outreach'
                    ? 'bg-white text-blue-700 shadow-lg'
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PhoneIcon
                    className={`h-4 w-4 ${activeContentTab === 'outreach' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                  />
                  <span>Outreach</span>
                  {/* TODO: Show outreach count when integrated with Medplum */}
                </div>
                {activeContentTab === 'outreach' && (
                  <div className="absolute right-0 bottom-0 left-0 h-1 rounded-t-full bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600"></div>
                )}
              </button>

              {/* Campaigns Tab */}
              <button
                onClick={() => setActiveContentTab('campaigns')}
                className={`group relative rounded-t-xl px-5 py-3 text-sm font-bold transition-all duration-200 ${
                  activeContentTab === 'campaigns'
                    ? 'bg-white text-pink-700 shadow-lg'
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MegaphoneIcon
                    className={`h-4 w-4 ${activeContentTab === 'campaigns' ? 'text-pink-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                  />
                  <span>Campaigns</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      activeContentTab === 'campaigns'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }`}
                  >
                    {campaignDetails.length}
                  </span>
                </div>
                {activeContentTab === 'campaigns' && (
                  <div className="absolute right-0 bottom-0 left-0 h-1 rounded-t-full bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600"></div>
                )}
              </button>

              {/* Med Adherence Tab */}
              <button
                onClick={() => setActiveContentTab('metrics')}
                className={`group relative rounded-t-xl px-5 py-3 text-sm font-bold transition-all duration-200 ${
                  activeContentTab === 'metrics'
                    ? 'bg-white text-emerald-700 shadow-lg'
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ClipboardDocumentListIcon
                    className={`h-4 w-4 ${activeContentTab === 'metrics' ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                  />
                  <span>Med Adherence</span>
                </div>
                {activeContentTab === 'metrics' && (
                  <div className="absolute right-0 bottom-0 left-0 h-1 rounded-t-full bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600"></div>
                )}
              </button>

              {/* Refill Worklist Tab */}
              <button
                onClick={() => setActiveContentTab('refillWorklist')}
                className={`group relative rounded-t-xl px-5 py-3 text-sm font-bold transition-all duration-200 ${
                  activeContentTab === 'refillWorklist'
                    ? 'bg-white text-orange-700 shadow-lg'
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ClipboardDocumentListIcon
                    className={`h-4 w-4 ${activeContentTab === 'refillWorklist' ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                  />
                  <span>Refill Worklist</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      activeContentTab === 'refillWorklist'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }`}
                  >
                    {patient?.medications?.length || 0}
                  </span>
                </div>
                {activeContentTab === 'refillWorklist' && (
                  <div className="absolute right-0 bottom-0 left-0 h-1 rounded-t-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600"></div>
                )}
              </button>
            </div>

            {/* Bottom Border */}
            <div className="relative h-0.5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
          </div>

          {/* Tab Content - Full Width */}
          <div className="flex-1 overflow-y-auto">
            {activeContentTab === 'overview' && <OverviewTab />}

            {activeContentTab === 'medications' && <MedicationsTab />}

            {activeContentTab === 'timeline' && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                {/* TODO: Load timeline events from Medplum */}
                <MultiTrackTimeline events={[]} medications={patient?.medications || []} />
              </div>
            )}

            {activeContentTab === 'outreach' && <OutreachTab />}

            {activeContentTab === 'metrics' && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <MedAdhMetricsDebug patient={patient} />
              </div>
            )}

            {activeContentTab === 'campaigns' && <CampaignsTab />}

            {activeContentTab === 'refillWorklist' && <RefillWorklistTab />}
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={isAddNoteModalOpen}
        onClose={() => setIsAddNoteModalOpen(false)}
        onSave={handleSaveNote}
        patientName={patient?.name || 'Patient'}
      />

      {/* Campaign Assignment Modal */}
      <CampaignAssignmentModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        onSave={handleSaveCampaigns}
        currentCampaigns={[]}
        patientName={patient?.name || 'Patient'}
      />

      {/* Log Outreach Modal */}
      <LogOutreachModal
        isOpen={isLogOutreachModalOpen}
        onClose={() => setIsLogOutreachModalOpen(false)}
        onSave={handleSaveOutreach}
        patientName={patient?.name || 'Patient'}
      />
    </div>
  );
};

// MedAdhMetricsDebug Component
function MedAdhMetricsDebug({ patient }: any) {
  const [v4Analytics, setV4Analytics] = React.useState<any>(null);
  const [loadingV4, setLoadingV4] = React.useState(true);
  const [aiSummary, setAiSummary] = React.useState<any>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = React.useState(false);
  const [aiSummaryError, setAiSummaryError] = React.useState<string | null>(null);
  const [showDebugData, setShowDebugData] = React.useState(false);
  const [selectedClaim, setSelectedClaim] = React.useState<any>(null);
  const [isClaimDrawerOpen, setIsClaimDrawerOpen] = React.useState(false);
  const [selectedMedForDrawer, setSelectedMedForDrawer] = React.useState<any>(null);
  const [isMedDrawerOpen, setIsMedDrawerOpen] = React.useState(false);
  const [medDrawerTab, setMedDrawerTab] = React.useState('details');
  const [viewMode, setViewMode] = React.useState('dashboard');

  const handleClaimClick = (claim: any) => {
    console.log('Fill history row clicked:', claim);
    setSelectedClaim(claim);
    setIsClaimDrawerOpen(true);
  };

  const handleCloseClaimDrawer = () => {
    setIsClaimDrawerOpen(false);
    setSelectedClaim(null);
  };

  const handleMedicationClick = (medication: any) => {
    console.log('Medication clicked:', medication.medicationName || medication.drugName);
    setSelectedMedForDrawer(medication);
    setMedDrawerTab('details');
    setIsMedDrawerOpen(true);
  };

  const handleCloseMedDrawer = () => {
    setIsMedDrawerOpen(false);
    setSelectedMedForDrawer(null);
  };

  React.useEffect(() => {
    const loadV4Analytics = async () => {
      try {
        setLoadingV4(true);
        // TODO: Implement Medplum analytics fetch
        console.log('Loading V4 analytics for patient:', patient.id);
        setV4Analytics(null);
      } catch (error) {
        console.error('Error loading V4 analytics:', error);
        setV4Analytics(null);
      } finally {
        setLoadingV4(false);
      }
    };

    if (patient && patient.id) {
      loadV4Analytics();
    }
  }, [patient.id]);

  const handleGenerateAiSummary = async () => {
    setAiSummaryLoading(true);
    setAiSummaryError(null);

    try {
      // TODO: Implement AI summary generation
      console.log('Generating AI summary');
      setAiSummary({
        overallStatus: 'AT_RISK',
        statusSummary: 'Patient requires monitoring',
        immediateActions: ['Review medication adherence'],
        measuresAtRisk: [],
        clinicalImpact: ['Potential gaps in therapy'],
        recommendedApproach: ['Schedule follow-up'],
        dataQualityAlerts: [],
      });
    } catch (error: any) {
      console.error('AI Summary Error:', error);
      setAiSummaryError(error.message || 'Failed to generate AI summary');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Medication Adherence Overview</h3>
        <div className="flex items-center gap-3">
          {/* AI Summary Button */}
          <button
            onClick={handleGenerateAiSummary}
            disabled={aiSummaryLoading || loadingV4}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              aiSummaryLoading || loadingV4
                ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
            }`}
          >
            {aiSummaryLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                AI Summary
              </>
            )}
          </button>

          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'dashboard'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Card View
            </button>
          </div>
        </div>
      </div>

      {/* AI Summary Display */}
      {aiSummaryError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{aiSummaryError}</p>
            <button
              onClick={handleGenerateAiSummary}
              className="ml-auto text-xs text-red-600 underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {aiSummary && (
        <div
          className={`overflow-hidden rounded-lg border ${
            aiSummary.overallStatus === 'CRITICAL'
              ? 'border-red-300 bg-red-50'
              : aiSummary.overallStatus === 'AT_RISK'
                ? 'border-amber-300 bg-amber-50'
                : 'border-green-300 bg-green-50'
          }`}
        >
          <div
            className={`px-4 py-3 ${
              aiSummary.overallStatus === 'CRITICAL'
                ? 'bg-red-100'
                : aiSummary.overallStatus === 'AT_RISK'
                  ? 'bg-amber-100'
                  : 'bg-green-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {aiSummary.overallStatus === 'CRITICAL' ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                ) : aiSummary.overallStatus === 'AT_RISK' ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                ) : (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    aiSummary.overallStatus === 'CRITICAL'
                      ? 'text-red-800'
                      : aiSummary.overallStatus === 'AT_RISK'
                        ? 'text-amber-800'
                        : 'text-green-800'
                  }`}
                >
                  {aiSummary.overallStatus}
                </span>
              </div>
              <span className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</span>
            </div>
            <p
              className={`mt-1 text-sm ${
                aiSummary.overallStatus === 'CRITICAL'
                  ? 'text-red-700'
                  : aiSummary.overallStatus === 'AT_RISK'
                    ? 'text-amber-700'
                    : 'text-green-700'
              }`}
            >
              {aiSummary.statusSummary}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loadingV4 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">Loading medication-level analytics...</p>
        </div>
      )}

      {/* Placeholder for V4 Analytics Tables */}
      {!loadingV4 && !v4Analytics && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No analytics data available</p>
          <p className="mt-2 text-sm text-gray-500">
            Analytics will be displayed here once loaded from Medplum
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Wrapper component that provides patient context
 */
const PatientDetailPageTabbed = () => {
  return (
    <PatientDatasetProvider>
      <PatientDetailContent />
    </PatientDatasetProvider>
  );
};

export default PatientDetailPageTabbed;
