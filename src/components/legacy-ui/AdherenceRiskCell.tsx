'use client';
/* eslint-disable */

import React from 'react';

/**
 * Calculate days to runout from medication data
 */
const calculateDaysToRunout = (med: any) => {
  // Try nextRefillDue first
  if (med.nextRefillDue) {
    const runoutDate = new Date(med.nextRefillDue);
    const today = new Date();
    const daysToRunout = Math.ceil(
      (runoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysToRunout;
  }

  // Try lastFillDate + daysSupply
  if (med.lastFillDate && med.daysSupply) {
    const lastFill = new Date(med.lastFillDate);
    const runoutDate = new Date(lastFill.getTime() + med.daysSupply * 24 * 60 * 60 * 1000);
    const today = new Date();
    const daysToRunout = Math.ceil(
      (runoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysToRunout;
  }

  // Fallback to daysToRunout if provided
  return med.daysToRunout ?? null;
};

/**
 * Derive fragility tier from PDC and gap days
 */
const deriveFragilityTier = (pdc: any, gapDaysRemaining: any, daysToRunout: any) => {
  // If fragility tier is already provided, use it
  if (typeof pdc !== 'number') return null;

  const gap = gapDaysRemaining ?? 0;

  // T5: No gap days remaining
  if (gap <= 0) return 'T5_UNSALVAGEABLE';

  // F1: Low gap days (≤5) or very low PDC (<60%)
  if (gap <= 5 || pdc < 60) return 'F1_IMMINENT';

  // F2: Low gap days (≤10) or low PDC (60-70%)
  if (gap <= 10 || pdc < 70) return 'F2_FRAGILE';

  // F3: Medium gap days (≤20) or below threshold PDC (70-80%)
  if (gap <= 20 || pdc < 80) return 'F3_MODERATE';

  // F4: Good gap days (≤40) or good PDC (80-90%)
  if (gap <= 40 || pdc < 90) return 'F4_COMFORTABLE';

  // F5: Excellent
  return 'F5_SAFE';
};

/**
 * Compare two medications by risk level
 * Priority order:
 * 1. T5_UNSALVAGEABLE first (highest risk)
 * 2. Lower PDC first
 * 3. Lower gap days remaining first
 * 4. Shorter days to runout first
 */
const compareMedRisk = (a: any, b: any) => {
  // Get PDC values
  const aPdc = a.currentPdc ?? a.adherence?.pdc ?? 100;
  const bPdc = b.currentPdc ?? b.adherence?.pdc ?? 100;

  // Get gap days
  const aGap = a.gapDaysRemaining ?? 0;
  const bGap = b.gapDaysRemaining ?? 0;

  // Derive tiers if not provided
  const aTier = a.fragilityTier ?? deriveFragilityTier(aPdc, aGap, a.daysToRunout);
  const bTier = b.fragilityTier ?? deriveFragilityTier(bPdc, bGap, b.daysToRunout);

  const aUnsalv = aTier === 'T5_UNSALVAGEABLE' ? 1 : 0;
  const bUnsalv = bTier === 'T5_UNSALVAGEABLE' ? 1 : 0;
  if (aUnsalv !== bUnsalv) return bUnsalv - aUnsalv;

  // Compare PDC - support both currentPdc and adherence.pdc
  if (aPdc !== bPdc) {
    return aPdc - bPdc;
  }

  if (aGap !== bGap) return aGap - bGap;

  const aRunout = calculateDaysToRunout(a) ?? Number.POSITIVE_INFINITY;
  const bRunout = calculateDaysToRunout(b) ?? Number.POSITIVE_INFINITY;
  return aRunout - bRunout;
};

/**
 * Get Tailwind classes for fragility tier badges
 */
const getFragilityClasses = (tier: any) => {
  switch (tier) {
    case 'F1_IMMINENT':
    case 'T5_UNSALVAGEABLE':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'F2_FRAGILE':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'F3_MODERATE':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'F4_COMFORTABLE':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'F5_SAFE':
    case 'LOCKED_IN_ADHERENT':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Format fragility tier for display (remove prefix)
 */
const formatFragilityTier = (tier: any) => {
  if (!tier) return 'Unknown';
  // Remove F1_, F2_, etc. prefix for cleaner display
  return tier.replace(/^(F\d+|T\d+|LOCKED_IN)_/, '');
};

/**
 * AdherenceRiskCell - Clean, compact display of ALL MA medications
 *
 * Each medication shows as a single line with inline metrics
 */
export const AdherenceRiskCell = ({ patient }: any) => {
  // Extract MA medications from patient data
  const medications = patient.medAdherence?.medications ?? patient.medications ?? [];

  // Filter to MA drugs (MAC, MAD, MAH)
  const maMeds = medications.filter(
    (m: any) => m.isMedicationAdherence && ['MAC', 'MAD', 'MAH'].includes(m.measure)
  );

  // If no MA drugs, show placeholder
  if (!maMeds.length) {
    return <span className="text-xs text-slate-400">No MA adherence drugs</span>;
  }

  // Sort by risk (most risky first)
  const sorted = [...maMeds].sort(compareMedRisk);

  return (
    <div className="flex flex-col gap-1.5 py-0.5">
      {sorted.map((med: any, index: any) => {
        // Extract PDC value
        const pdcValue = med.currentPdc ?? med.adherence?.pdc ?? 0;

        // Get drug name (shortened)
        const drugName = med.drugName ?? med.medicationName ?? 'Unknown';
        const shortName = drugName.length > 15 ? drugName.substring(0, 15) + '...' : drugName;

        // Calculate days to runout
        const daysToRunout = calculateDaysToRunout(med);

        // Calculate fragility tier
        const gapDaysRemaining = med.gapDaysRemaining ?? 0;
        const fragilityTier =
          med.fragilityTier ?? deriveFragilityTier(pdcValue, gapDaysRemaining, daysToRunout);
        const fragilityClasses = getFragilityClasses(fragilityTier);
        const fragilityLabel = formatFragilityTier(fragilityTier);

        // Format runout display
        let runoutText = 'N/A';
        let runoutColorClass = 'text-slate-600';
        if (daysToRunout != null) {
          if (daysToRunout <= 0) {
            runoutText = 'Out';
            runoutColorClass = 'text-red-700 font-bold';
          } else if (daysToRunout <= 7) {
            runoutText = `${daysToRunout}d`;
            runoutColorClass = 'text-amber-700 font-bold';
          } else if (daysToRunout <= 14) {
            runoutText = `${daysToRunout}d`;
            runoutColorClass = 'text-orange-600 font-semibold';
          } else {
            runoutText = `${daysToRunout}d`;
            runoutColorClass = 'text-slate-600';
          }
        }

        // PDC color coding
        let pdcColorClass = 'text-emerald-700 font-bold';
        let pdcBgClass = 'bg-emerald-50';
        if (pdcValue < 60) {
          pdcColorClass = 'text-red-700 font-bold';
          pdcBgClass = 'bg-red-50';
        } else if (pdcValue < 80) {
          pdcColorClass = 'text-amber-700 font-bold';
          pdcBgClass = 'bg-amber-50';
        }

        // Measure badge colors (more subtle)
        const measureColors: any = {
          MAC: 'bg-blue-50 text-blue-700 border-blue-200',
          MAD: 'bg-purple-50 text-purple-700 border-purple-200',
          MAH: 'bg-green-50 text-green-700 border-green-200',
        };

        return (
          <div
            key={index}
            className="flex items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-slate-50"
          >
            {/* Left: Measure + Drug Name */}
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className={`inline-flex flex-shrink-0 items-center rounded px-1.5 py-0.5 text-[9px] font-bold ${measureColors[med.measure] || 'bg-gray-50 text-gray-700'}`}
              >
                {med.measure}
              </span>
              <span className="text-[11px] font-medium text-slate-900" title={drugName}>
                {shortName}
              </span>
            </div>

            {/* Right: Metrics in compact badges */}
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {/* PDC */}
              <span
                className={`${pdcColorClass} ${pdcBgClass} rounded px-1.5 py-0.5 text-[10px] font-semibold`}
              >
                {pdcValue.toFixed(0)}%
              </span>

              {/* Fragility Tier */}
              <span
                className={`${fragilityClasses} rounded border px-1.5 py-0.5 text-[9px] font-bold`}
              >
                {fragilityLabel}
              </span>

              {/* Runout with icon - most important metric */}
              <span
                className={`${runoutColorClass} rounded px-1.5 py-0.5 ${daysToRunout <= 7 ? 'bg-amber-50' : daysToRunout <= 0 ? 'bg-red-50' : 'bg-slate-50'} flex items-center gap-0.5 text-[10px] font-semibold`}
              >
                {daysToRunout <= 0 ? '🔴' : daysToRunout <= 7 ? '⚠️' : '📅'} {runoutText}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

AdherenceRiskCell.displayName = 'AdherenceRiskCell';
