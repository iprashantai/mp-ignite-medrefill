'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, max-lines-per-function, complexity, no-console */

import { useMemo, useState } from 'react';
import {
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';

/**
 * Patient Inventory Overview Component
 */
const PatientInventoryOverview = ({
  patients,
  onFilterApply,
  filterCRMStatus: _filterCRMStatus,
  setFilterCRMStatus,
  patientStatuses,
}: any) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate all metrics from patient data
  const metrics = useMemo(() => {
    if (!patients || !Array.isArray(patients) || patients.length === 0) {
      return {
        totalPatients: 0,
        heroMetrics: {},
        fragilityBreakdown: {},
        pdcBreakdown: {},
        daysToRunoutBreakdown: {},
        measureBreakdown: {},
        queueBreakdown: {},
      };
    }

    const totalPatients = patients.length;

    // DEBUG: Check actual patient data
    if (patients.length > 0) {
      const sample = patients[0];
      console.log('🔍 SAMPLE PATIENT:', {
        daysToRunout: sample.daysToRunout,
        daysUntilRunout: sample.daysUntilRunout,
        measures: sample.measures,
        fragilityTier: sample.fragilityTier,
        medications: sample.medications?.length || 0,
        medAdherence: sample.medAdherence?.medications?.length || 0,
      });

      // Test refill candidates calculation
      const refillTest = patients.filter((p: any) => {
        const days = p.daysToRunout ?? p.daysUntilRunout;
        const medications = p.medAdherence?.medications ?? p.medications ?? [];
        const result = medications.length > 0 && typeof days === 'number' && days <= 14;
        if (result) {
          console.log('✅ Refill candidate found:', {
            id: p.id,
            days,
            medCount: medications.length,
          });
        }
        return result;
      });
      console.log('📊 Refill candidates count:', refillTest.length);
    }

    // Calculate MA patients first
    const maPatientsArray = patients.filter((p: any) => {
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return medications.some(
        (m: any) => m.isMedicationAdherence && ['MAC', 'MAD', 'MAH'].includes(m.measure)
      );
    });
    const maPatients = maPatientsArray.length;

    // Hero Metrics - PDC status only for MA patients
    // Use WORST PDC across all MA medications for patient-level classification
    const passingCount = maPatientsArray.filter((p: any) => {
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      const pdcs = medications
        .filter((med: any) => med.isMedicationAdherence)
        .map((med: any) => {
          return (
            med.currentPdc ??
            med.adherence?.pdc ??
            med.adherence?.currentPdc ??
            p.analytics?.perMeasure?.[med.measure]?.currentPDC
          );
        })
        .filter((pdc: any) => typeof pdc === 'number');

      if (pdcs.length === 0) return false;
      const worstPDC = Math.min(...pdcs);
      return worstPDC >= 80;
    }).length;

    const failingCount = maPatientsArray.filter((p: any) => {
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      const pdcs = medications
        .filter((med: any) => med.isMedicationAdherence)
        .map((med: any) => {
          return (
            med.currentPdc ??
            med.adherence?.pdc ??
            med.adherence?.currentPdc ??
            p.analytics?.perMeasure?.[med.measure]?.currentPDC
          );
        })
        .filter((pdc: any) => typeof pdc === 'number');

      if (pdcs.length === 0) return false;
      const worstPDC = Math.min(...pdcs);
      return worstPDC < 60;
    }).length;

    const atRiskCount = maPatientsArray.filter((p: any) => {
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      const pdcs = medications
        .filter((med: any) => med.isMedicationAdherence)
        .map((med: any) => {
          return (
            med.currentPdc ??
            med.adherence?.pdc ??
            med.adherence?.currentPdc ??
            p.analytics?.perMeasure?.[med.measure]?.currentPDC
          );
        })
        .filter((pdc: any) => typeof pdc === 'number');

      if (pdcs.length === 0) return false;
      const worstPDC = Math.min(...pdcs);
      return worstPDC >= 60 && worstPDC < 80;
    }).length;

    // Refill Candidates - patients needing refills (Overdue + 0-7 days + 8-14 days)
    const refillCandidates = patients.filter((p: any) => {
      const days = p.daysToRunout ?? p.daysUntilRunout;
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      const result = medications.length > 0 && typeof days === 'number' && days <= 14;

      // DEBUG: Log why patients are NOT refill candidates
      if (medications.length > 0 && typeof days !== 'number' && patients.indexOf(p) < 3) {
        console.log(`❌ [Refill Candidate] Patient ${p.id} excluded:`, {
          hasMeds: medications.length > 0,
          medCount: medications.length,
          daysToRunout: p.daysToRunout,
          daysUntilRunout: p.daysUntilRunout,
          daysValue: days,
          daysType: typeof days,
          firstMed: medications[0],
        });
      }

      return result;
    }).length;

    // Fragility Tier Breakdown
    const t5 = patients.filter((p: any) =>
      (p.fragilityTier || '').includes('T5_UNSALVAGEABLE')
    ).length;
    const f1 = patients.filter((p: any) => (p.fragilityTier || '').includes('F1')).length;
    const f2 = patients.filter((p: any) => (p.fragilityTier || '').includes('F2')).length;
    const f3 = patients.filter((p: any) => (p.fragilityTier || '').includes('F3')).length;
    const f4 = patients.filter((p: any) => (p.fragilityTier || '').includes('F4')).length;
    const f5 = patients.filter((p: any) => (p.fragilityTier || '').includes('F5')).length;
    const compliant = patients.filter((p: any) =>
      (p.fragilityTier || '').includes('COMPLIANT')
    ).length;

    // PDC Range Breakdown
    // Use WORST PDC across all measures for patient-level classification
    const pdc0to60 = patients.filter((p: any) => {
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      if (medications.length === 0) return false;

      // Get worst (minimum) PDC across all MA medications
      const pdcs = medications
        .filter((med: any) => med.isMedicationAdherence)
        .map((med: any) => {
          // Try multiple PDC sources
          return (
            med.currentPdc ??
            med.adherence?.pdc ??
            med.adherence?.currentPdc ??
            p.analytics?.perMeasure?.[med.measure]?.currentPDC
          );
        })
        .filter((pdc: any) => typeof pdc === 'number');

      if (pdcs.length === 0) return false;
      const worstPDC = Math.min(...pdcs);
      return worstPDC < 60;
    }).length;

    const pdc60to80 = patients.filter((p: any) => {
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      if (medications.length === 0) return false;

      const pdcs = medications
        .filter((med: any) => med.isMedicationAdherence)
        .map((med: any) => {
          return (
            med.currentPdc ??
            med.adherence?.pdc ??
            med.adherence?.currentPdc ??
            p.analytics?.perMeasure?.[med.measure]?.currentPDC
          );
        })
        .filter((pdc: any) => typeof pdc === 'number');

      if (pdcs.length === 0) return false;
      const worstPDC = Math.min(...pdcs);
      return worstPDC >= 60 && worstPDC < 80;
    }).length;

    const pdc80to90 = patients.filter((p: any) => {
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      if (medications.length === 0) return false;

      const pdcs = medications
        .filter((med: any) => med.isMedicationAdherence)
        .map((med: any) => {
          return (
            med.currentPdc ??
            med.adherence?.pdc ??
            med.adherence?.currentPdc ??
            p.analytics?.perMeasure?.[med.measure]?.currentPDC
          );
        })
        .filter((pdc: any) => typeof pdc === 'number');

      if (pdcs.length === 0) return false;
      const worstPDC = Math.min(...pdcs);
      return worstPDC >= 80 && worstPDC < 90;
    }).length;

    const pdc90plus = patients.filter((p: any) => {
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      if (medications.length === 0) return false;

      const pdcs = medications
        .filter((med: any) => med.isMedicationAdherence)
        .map((med: any) => {
          return (
            med.currentPdc ??
            med.adherence?.pdc ??
            med.adherence?.currentPdc ??
            p.analytics?.perMeasure?.[med.measure]?.currentPDC
          );
        })
        .filter((pdc: any) => typeof pdc === 'number');

      if (pdcs.length === 0) return false;
      const worstPDC = Math.min(...pdcs);
      return worstPDC >= 90;
    }).length;

    // Days to Runout Breakdown
    // IMPORTANT: Must match filter logic in AllPatientsCRM.jsx (lines 1636-1660)
    // Count ALL patients with medications (not just MA medications)
    const runoutOverdue = patients.filter((p: any) => {
      const days = p.daysToRunout ?? p.daysUntilRunout;
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return medications.length > 0 && typeof days === 'number' && days < 0;
    }).length;

    const runout0to7 = patients.filter((p: any) => {
      const days = p.daysToRunout ?? p.daysUntilRunout;
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return medications.length > 0 && typeof days === 'number' && days >= 0 && days <= 7;
    }).length;

    const runout8to14 = patients.filter((p: any) => {
      const days = p.daysToRunout ?? p.daysUntilRunout;
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return medications.length > 0 && typeof days === 'number' && days >= 8 && days <= 14;
    }).length;

    const runout15to30 = patients.filter((p: any) => {
      const days = p.daysToRunout ?? p.daysUntilRunout;
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return medications.length > 0 && typeof days === 'number' && days >= 15 && days <= 30;
    }).length;

    const runout30plus = patients.filter((p: any) => {
      const days = p.daysToRunout ?? p.daysUntilRunout;
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return medications.length > 0 && typeof days === 'number' && days > 30;
    }).length;

    // Measure Type Breakdown
    // Check both patient.measures array and medications array
    const macCount = patients.filter((p: any) => {
      const measures = p.measures || [];
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return (
        measures.includes('MAC') ||
        measures.some((m: any) => m?.type === 'MAC') ||
        medications.some((med: any) => med.measure === 'MAC')
      );
    }).length;

    const madCount = patients.filter((p: any) => {
      const measures = p.measures || [];
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return (
        measures.includes('MAD') ||
        measures.some((m: any) => m?.type === 'MAD') ||
        medications.some((med: any) => med.measure === 'MAD')
      );
    }).length;

    const mahCount = patients.filter((p: any) => {
      const measures = p.measures || [];
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return (
        measures.includes('MAH') ||
        measures.some((m: any) => m?.type === 'MAH') ||
        medications.some((med: any) => med.measure === 'MAH')
      );
    }).length;

    // Queue Status Breakdown
    // IMPORTANT: Must exclude patients with no medications (matches AllPatientsCRM filter logic)
    const outreachReady = patients.filter((p: any) => {
      const days = p.daysToRunout ?? p.daysUntilRunout;
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return medications.length > 0 && typeof days === 'number' && days >= 15 && days <= 44;
    }).length;

    const earlyMonitoring = patients.filter((p: any) => {
      const days = p.daysToRunout ?? p.daysUntilRunout;
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return medications.length > 0 && typeof days === 'number' && days >= 45 && days <= 60;
    }).length;

    const longTerm = patients.filter((p: any) => {
      const days = p.daysToRunout ?? p.daysUntilRunout;
      const medications = p.medAdherence?.medications ?? p.medications ?? [];
      return medications.length > 0 && typeof days === 'number' && days > 60;
    }).length;

    // Contact Status Breakdown - only if patientStatuses prop is provided
    let contactStatusBreakdown: any = {};
    if (patientStatuses) {
      contactStatusBreakdown = Object.values(patientStatuses).reduce((acc: any, status: any) => {
        acc[status.id] = patients.filter((p: any) => p.crmStatus === status.id).length;
        return acc;
      }, {});
    }

    return {
      totalPatients,
      maPatients,
      heroMetrics: {
        refillCandidates,
        passingCount,
        failingCount,
        atRiskCount,
      },
      fragilityBreakdown: { t5, f1, f2, f3, f4, f5, compliant },
      pdcBreakdown: { pdc0to60, pdc60to80, pdc80to90, pdc90plus },
      daysToRunoutBreakdown: { runoutOverdue, runout0to7, runout8to14, runout15to30, runout30plus },
      measureBreakdown: { macCount, madCount, mahCount },
      queueBreakdown: { refillCandidates, outreachReady, earlyMonitoring, longTerm },
      contactStatusBreakdown,
    };
  }, [patients, patientStatuses]);

  const handleCardClick = (filterType: string, filterValue: any) => {
    if (onFilterApply) {
      onFilterApply(filterType, filterValue);
    }
  };

  // Map contact status IDs to colors
  const getStatusColor = (statusId: string): string => {
    const colorMap: any = {
      not_contacted: 'gray',
      outreach_attempted: 'blue',
      patient_responded: 'purple',
      appointment_scheduled: 'indigo',
      intervention_complete: 'green',
      lost_to_followup: 'red',
      opted_out: 'orange',
    };
    return colorMap[statusId] || 'gray';
  };

  if (!patients || patients.length === 0) {
    return null;
  }

  return (
    <div className="relative mb-4 overflow-hidden rounded-xl border-2 border-transparent bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 bg-clip-padding shadow-lg before:absolute before:inset-0 before:-z-10 before:rounded-xl before:bg-gradient-to-r before:from-indigo-300 before:via-purple-300 before:to-pink-300 before:opacity-20 before:blur-sm">
      {/* Header - Premium Design */}
      <div className="flex items-center justify-between border-b-2 border-indigo-200/50 bg-gradient-to-r from-white/90 to-white/70 px-5 py-3 backdrop-blur-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/30">
            <ChartBarIcon className="h-6 w-6 text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]" />
          </div>
          <div className="flex-1">
            <h2 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-sm font-black text-transparent">
              Patient Inventory Overview
            </h2>
            {!isExpanded && (
              <div className="mt-1.5 flex items-center gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 px-2 py-0.5 font-bold text-blue-700">
                    <span className="text-[10px] opacity-70">Total</span>
                    <span>{metrics.totalPatients}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 px-2 py-0.5 font-bold text-purple-700">
                    <span className="text-[10px] opacity-70">MA</span>
                    <span>{metrics.maPatients}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-gradient-to-br from-green-50 to-green-100 px-2 py-0.5 font-bold text-green-700">
                    <span className="text-[10px] opacity-70">Pass</span>
                    <span>{metrics.heroMetrics.passingCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 px-2 py-0.5 font-bold text-yellow-700">
                    <span className="text-[10px] opacity-70">Risk</span>
                    <span>{metrics.heroMetrics.atRiskCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-gradient-to-br from-red-50 to-red-100 px-2 py-0.5 font-bold text-red-700">
                    <span className="text-[10px] opacity-70">Fail</span>
                    <span>{metrics.heroMetrics.failingCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 px-2 py-0.5 font-bold text-orange-700">
                    <span className="text-[10px] opacity-70">Refill</span>
                    <span>{metrics.heroMetrics.refillCandidates}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="group rounded-xl p-2 text-indigo-400 transition-all duration-200 hover:scale-105 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-sm"
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-6 p-6">
          {/* Hero Metrics Grid - 6 cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              title="Total Patients"
              value={metrics.totalPatients}
              percentage={100}
              subtitle="All patients"
              icon={UserGroupIcon}
              colorScheme="blue"
              onClick={() => handleCardClick('all', true)}
            />

            <MetricCard
              title="MA Patients"
              value={metrics.maPatients ?? 0}
              percentage={((metrics.maPatients ?? 0) / metrics.totalPatients) * 100}
              subtitle="MAC/MAD/MAH"
              icon={HeartIcon}
              colorScheme="purple"
              onClick={() => handleCardClick('maMeds', 'with-ma')}
            />

            <MetricCard
              title="Passing"
              value={metrics.heroMetrics?.passingCount ?? 0}
              percentage={
                (metrics.maPatients ?? 0) > 0
                  ? ((metrics.heroMetrics?.passingCount ?? 0) / (metrics.maPatients ?? 0)) * 100
                  : 0
              }
              subtitle="PDC ≥80%"
              icon={CheckCircleIcon}
              colorScheme="green"
              onClick={() => handleCardClick('pdc', '80-100')}
            />

            <MetricCard
              title="At-Risk"
              value={metrics.heroMetrics?.atRiskCount ?? 0}
              percentage={
                (metrics.maPatients ?? 0) > 0
                  ? ((metrics.heroMetrics?.atRiskCount ?? 0) / (metrics.maPatients ?? 0)) * 100
                  : 0
              }
              subtitle="PDC 60-79%"
              icon={ExclamationTriangleIcon}
              colorScheme="yellow"
              onClick={() => handleCardClick('pdc', '60-80')}
            />

            <MetricCard
              title="Failing"
              value={metrics.heroMetrics?.failingCount ?? 0}
              percentage={
                (metrics.maPatients ?? 0) > 0
                  ? ((metrics.heroMetrics?.failingCount ?? 0) / (metrics.maPatients ?? 0)) * 100
                  : 0
              }
              subtitle="PDC <60%"
              icon={XCircleIcon}
              colorScheme="red"
              onClick={() => handleCardClick('pdc', '0-60')}
            />

            <MetricCard
              title="Refill Candidates"
              value={metrics.heroMetrics?.refillCandidates ?? 0}
              percentage={
                ((metrics.heroMetrics?.refillCandidates ?? 0) / metrics.totalPatients) * 100
              }
              subtitle="≤14 days to runout"
              icon={ClipboardDocumentListIcon}
              colorScheme="orange"
              onClick={() => handleCardClick('daysToRunout', '0-14')}
            />
          </div>

          {/* Detailed Breakdown Grid - Compact Badge Style */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {/* Fragility Tiers */}
            <CompactCard title="Fragility Tiers" color="blue">
              <div className="grid grid-cols-2 gap-1.5">
                <CompactItem
                  label="Can't Reach"
                  count={metrics.fragilityBreakdown.t5}
                  total={metrics.totalPatients}
                  color="gray"
                  onClick={() => handleCardClick('fragility', 'T5')}
                />
                <CompactItem
                  label="Critical"
                  count={metrics.fragilityBreakdown.f1}
                  total={metrics.totalPatients}
                  color="red"
                  onClick={() => handleCardClick('fragility', 'F1')}
                />
                <CompactItem
                  label="Fragile"
                  count={metrics.fragilityBreakdown.f2}
                  total={metrics.totalPatients}
                  color="orange"
                  onClick={() => handleCardClick('fragility', 'F2')}
                />
                <CompactItem
                  label="Moderate"
                  count={metrics.fragilityBreakdown.f3}
                  total={metrics.totalPatients}
                  color="yellow"
                  onClick={() => handleCardClick('fragility', 'F3')}
                />
                <CompactItem
                  label="Comfortable"
                  count={metrics.fragilityBreakdown.f4}
                  total={metrics.totalPatients}
                  color="blue"
                  onClick={() => handleCardClick('fragility', 'F4')}
                />
                <CompactItem
                  label="Stable"
                  count={metrics.fragilityBreakdown.f5}
                  total={metrics.totalPatients}
                  color="green"
                  onClick={() => handleCardClick('fragility', 'F5')}
                />
                <CompactItem
                  label="Compliant"
                  count={metrics.fragilityBreakdown.compliant}
                  total={metrics.totalPatients}
                  color="emerald"
                  onClick={() => handleCardClick('fragility', 'COMPLIANT')}
                />
              </div>
            </CompactCard>

            {/* PDC Distribution */}
            <CompactCard title="PDC Distribution" color="green">
              <div className="grid grid-cols-2 gap-1.5">
                <CompactItem
                  label="<60% Failing"
                  count={metrics.pdcBreakdown.pdc0to60}
                  total={metrics.totalPatients}
                  color="red"
                  onClick={() => handleCardClick('pdc', '0-60')}
                />
                <CompactItem
                  label="60-79% At Risk"
                  count={metrics.pdcBreakdown.pdc60to80}
                  total={metrics.totalPatients}
                  color="yellow"
                  onClick={() => handleCardClick('pdc', '60-80')}
                />
                <CompactItem
                  label="80-89% Passing"
                  count={metrics.pdcBreakdown.pdc80to90}
                  total={metrics.totalPatients}
                  color="blue"
                  onClick={() => handleCardClick('pdc', '80-90')}
                />
                <CompactItem
                  label="90%+ Excellent"
                  count={metrics.pdcBreakdown.pdc90plus}
                  total={metrics.totalPatients}
                  color="green"
                  onClick={() => handleCardClick('pdc', '90-100')}
                />
              </div>
            </CompactCard>

            {/* Days to Runout */}
            <CompactCard title="Days to Runout" color="orange">
              <div className="grid grid-cols-2 gap-1.5">
                <CompactItem
                  label="Overdue"
                  count={metrics.daysToRunoutBreakdown.runoutOverdue}
                  total={metrics.totalPatients}
                  color="red"
                  onClick={() => handleCardClick('daysToRunout', 'overdue')}
                />
                <CompactItem
                  label="0-7 days"
                  count={metrics.daysToRunoutBreakdown.runout0to7}
                  total={metrics.totalPatients}
                  color="red"
                  onClick={() => handleCardClick('daysToRunout', '0-7')}
                />
                <CompactItem
                  label="8-14 days"
                  count={metrics.daysToRunoutBreakdown.runout8to14}
                  total={metrics.totalPatients}
                  color="orange"
                  onClick={() => handleCardClick('daysToRunout', '8-14')}
                />
                <CompactItem
                  label="15-30 days"
                  count={metrics.daysToRunoutBreakdown.runout15to30}
                  total={metrics.totalPatients}
                  color="yellow"
                  onClick={() => handleCardClick('daysToRunout', '15-30')}
                />
                <CompactItem
                  label="30+ days"
                  count={metrics.daysToRunoutBreakdown.runout30plus}
                  total={metrics.totalPatients}
                  color="green"
                  onClick={() => handleCardClick('daysToRunout', '30-plus')}
                />
              </div>
            </CompactCard>

            {/* Measure Types */}
            <CompactCard title="Measure Types" color="purple">
              <CompactItem
                label="MAC (Cholesterol)"
                count={metrics.measureBreakdown.macCount}
                total={metrics.totalPatients}
                color="purple"
                onClick={() => handleCardClick('measure', 'MAC')}
              />
              <CompactItem
                label="MAD (Diabetes)"
                count={metrics.measureBreakdown.madCount}
                total={metrics.totalPatients}
                color="indigo"
                onClick={() => handleCardClick('measure', 'MAD')}
              />
              <CompactItem
                label="MAH (Hypertension)"
                count={metrics.measureBreakdown.mahCount}
                total={metrics.totalPatients}
                color="blue"
                onClick={() => handleCardClick('measure', 'MAH')}
              />
            </CompactCard>

            {/* Queue Status */}
            <CompactCard title="Queue Status" color="teal">
              <div className="grid grid-cols-2 gap-1.5">
                <CompactItem
                  label="Refill Candidates"
                  count={metrics.queueBreakdown.refillCandidates}
                  total={metrics.totalPatients}
                  color="red"
                  onClick={() => handleCardClick('queue', 'refill')}
                />
                <CompactItem
                  label="Outreach Ready"
                  count={metrics.queueBreakdown.outreachReady}
                  total={metrics.totalPatients}
                  color="yellow"
                  onClick={() => handleCardClick('queue', 'outreach')}
                />
                <CompactItem
                  label="Early Monitoring"
                  count={metrics.queueBreakdown.earlyMonitoring}
                  total={metrics.totalPatients}
                  color="blue"
                  onClick={() => handleCardClick('queue', 'early')}
                />
                <CompactItem
                  label="Long Term"
                  count={metrics.queueBreakdown.longTerm}
                  total={metrics.totalPatients}
                  color="green"
                  onClick={() => handleCardClick('queue', 'longterm')}
                />
              </div>
            </CompactCard>

            {/* Contact Status - Only show if patientStatuses prop is provided */}
            {patientStatuses && Object.keys(metrics.contactStatusBreakdown).length > 0 && (
              <CompactCard title="Contact Status" color="cyan">
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(patientStatuses).map((status: any) => {
                    // Shorten labels for better fit in 2-column layout
                    const shortLabel = status.label
                      .replace('Intervention Complete', 'Complete')
                      .replace('Appointment Scheduled', 'Appt Scheduled')
                      .replace('Patient Responded', 'Responded')
                      .replace('Outreach Attempted', 'Attempted')
                      .replace('Lost to Follow-up', 'Lost to F/U');

                    return (
                      <CompactItem
                        key={status.id}
                        label={shortLabel}
                        count={metrics.contactStatusBreakdown[status.id] || 0}
                        total={metrics.totalPatients}
                        color={getStatusColor(status.id)}
                        onClick={() => {
                          if (setFilterCRMStatus) {
                            setFilterCRMStatus(status.id);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </CompactCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Hero Metric Card Component
 */
const MetricCard = ({
  title,
  value,
  percentage,
  subtitle,
  icon: Icon,
  colorScheme,
  onClick,
}: any) => {
  const colorMap: any = {
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-100',
      border: 'border-green-300',
      gradient: 'from-green-500 to-emerald-600',
      text: 'text-green-700',
      badge:
        'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300',
      shadow: 'hover:shadow-green-500/20',
    },
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-50 to-amber-100',
      border: 'border-yellow-300',
      gradient: 'from-yellow-500 to-amber-600',
      text: 'text-yellow-700',
      badge:
        'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-300',
      shadow: 'hover:shadow-yellow-500/20',
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-rose-100',
      border: 'border-red-300',
      gradient: 'from-red-500 to-rose-600',
      text: 'text-red-700',
      badge: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-300',
      shadow: 'hover:shadow-red-500/20',
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-100',
      border: 'border-blue-300',
      gradient: 'from-blue-500 to-cyan-600',
      text: 'text-blue-700',
      badge: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-300',
      shadow: 'hover:shadow-blue-500/20',
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-100',
      border: 'border-orange-300',
      gradient: 'from-orange-500 to-amber-600',
      text: 'text-orange-700',
      badge:
        'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border border-orange-300',
      shadow: 'hover:shadow-orange-500/20',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-fuchsia-100',
      border: 'border-purple-300',
      gradient: 'from-purple-500 to-fuchsia-600',
      text: 'text-purple-700',
      badge:
        'bg-gradient-to-r from-purple-100 to-fuchsia-100 text-purple-800 border border-purple-300',
      shadow: 'hover:shadow-purple-500/20',
    },
  };

  const colors = colorMap[colorScheme];

  return (
    <div
      className={`${colors.bg} border-2 ${colors.border} cursor-pointer rounded-xl p-4 hover:shadow-xl ${colors.shadow} group transform transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]`}
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-1.5 text-[10px] font-black tracking-wider text-gray-600 uppercase">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p
              className={`text-3xl font-black ${colors.text} transition-all group-hover:scale-105`}
            >
              {value.toLocaleString()}
            </p>
            <span className={`text-xs font-bold ${colors.badge} rounded-lg px-2 py-1 shadow-sm`}>
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        <div
          className={`h-11 w-11 bg-gradient-to-br ${colors.gradient} flex items-center justify-center rounded-xl shadow-lg transition-all group-hover:scale-110 group-hover:rotate-3`}
        >
          <Icon className="h-6 w-6 text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]" />
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-600">{subtitle}</p>
    </div>
  );
};

/**
 * Compact Card Container - Premium Design
 */
const CompactCard = ({ title, color, children }: any) => {
  const colorMap: any = {
    blue: {
      accent: 'bg-gradient-to-b from-blue-500 to-blue-600',
      bg: 'bg-gradient-to-br from-blue-50/50 to-white',
      border: 'border-blue-200',
      text: 'text-blue-900',
    },
    green: {
      accent: 'bg-gradient-to-b from-green-500 to-emerald-600',
      bg: 'bg-gradient-to-br from-green-50/50 to-white',
      border: 'border-green-200',
      text: 'text-green-900',
    },
    orange: {
      accent: 'bg-gradient-to-b from-orange-500 to-amber-600',
      bg: 'bg-gradient-to-br from-orange-50/50 to-white',
      border: 'border-orange-200',
      text: 'text-orange-900',
    },
    purple: {
      accent: 'bg-gradient-to-b from-purple-500 to-fuchsia-600',
      bg: 'bg-gradient-to-br from-purple-50/50 to-white',
      border: 'border-purple-200',
      text: 'text-purple-900',
    },
    teal: {
      accent: 'bg-gradient-to-b from-teal-500 to-cyan-600',
      bg: 'bg-gradient-to-br from-teal-50/50 to-white',
      border: 'border-teal-200',
      text: 'text-teal-900',
    },
    cyan: {
      accent: 'bg-gradient-to-b from-cyan-500 to-blue-600',
      bg: 'bg-gradient-to-br from-cyan-50/50 to-white',
      border: 'border-cyan-200',
      text: 'text-cyan-900',
    },
  };

  const colors = colorMap[color];

  return (
    <div
      className={`${colors.bg} border-2 ${colors.border} rounded-xl p-4 shadow-sm transition-all duration-200 hover:shadow-lg`}
    >
      <h3 className={`text-sm font-black ${colors.text} mb-3 flex items-center gap-2.5`}>
        <div className={`h-5 w-1.5 ${colors.accent} rounded-full shadow-sm`}></div>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
};

/**
 * Compact Item - Premium Filter Pill Design
 */
const CompactItem = ({ label, count, total, color, onClick }: any) => {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

  const colorMap: any = {
    red: {
      dot: 'bg-gradient-to-br from-red-500 to-rose-600',
      bg: 'bg-gradient-to-br from-red-50 to-rose-50',
      hover: 'hover:from-red-100 hover:to-rose-100',
      border: 'border-red-300',
      shadow: 'hover:shadow-md hover:shadow-red-500/20',
      text: 'text-red-800',
    },
    orange: {
      dot: 'bg-gradient-to-br from-orange-500 to-amber-600',
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      hover: 'hover:from-orange-100 hover:to-amber-100',
      border: 'border-orange-300',
      shadow: 'hover:shadow-md hover:shadow-orange-500/20',
      text: 'text-orange-800',
    },
    yellow: {
      dot: 'bg-gradient-to-br from-yellow-500 to-amber-600',
      bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
      hover: 'hover:from-yellow-100 hover:to-amber-100',
      border: 'border-yellow-300',
      shadow: 'hover:shadow-md hover:shadow-yellow-500/20',
      text: 'text-yellow-800',
    },
    blue: {
      dot: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      hover: 'hover:from-blue-100 hover:to-cyan-100',
      border: 'border-blue-300',
      shadow: 'hover:shadow-md hover:shadow-blue-500/20',
      text: 'text-blue-800',
    },
    green: {
      dot: 'bg-gradient-to-br from-green-500 to-emerald-600',
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      hover: 'hover:from-green-100 hover:to-emerald-100',
      border: 'border-green-300',
      shadow: 'hover:shadow-md hover:shadow-green-500/20',
      text: 'text-green-800',
    },
    emerald: {
      dot: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      hover: 'hover:from-emerald-100 hover:to-teal-100',
      border: 'border-emerald-300',
      shadow: 'hover:shadow-md hover:shadow-emerald-500/20',
      text: 'text-emerald-800',
    },
    purple: {
      dot: 'bg-gradient-to-br from-purple-500 to-fuchsia-600',
      bg: 'bg-gradient-to-br from-purple-50 to-fuchsia-50',
      hover: 'hover:from-purple-100 hover:to-fuchsia-100',
      border: 'border-purple-300',
      shadow: 'hover:shadow-md hover:shadow-purple-500/20',
      text: 'text-purple-800',
    },
    indigo: {
      dot: 'bg-gradient-to-br from-indigo-500 to-purple-600',
      bg: 'bg-gradient-to-br from-indigo-50 to-purple-50',
      hover: 'hover:from-indigo-100 hover:to-purple-100',
      border: 'border-indigo-300',
      shadow: 'hover:shadow-md hover:shadow-indigo-500/20',
      text: 'text-indigo-800',
    },
    gray: {
      dot: 'bg-gradient-to-br from-gray-500 to-slate-600',
      bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
      hover: 'hover:from-gray-100 hover:to-slate-100',
      border: 'border-gray-300',
      shadow: 'hover:shadow-md hover:shadow-gray-500/20',
      text: 'text-gray-800',
    },
  };

  const colors = colorMap[color] || colorMap.gray;

  return (
    <div
      className={`cursor-pointer ${colors.bg} ${colors.hover} border-2 ${colors.border} group flex items-center justify-between rounded-lg p-2.5 transition-all duration-200 ${colors.shadow} hover:scale-[1.02]`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`h-2.5 w-2.5 rounded-full ${colors.dot} flex-shrink-0 shadow-sm transition-transform group-hover:scale-125`}
        ></div>
        <span className={`text-[11px] font-bold ${colors.text}`}>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-black ${colors.text}`}>{count}</span>
        <span className="text-[10px] font-semibold text-gray-600">({percentage}%)</span>
      </div>
    </div>
  );
};

export default PatientInventoryOverview;
