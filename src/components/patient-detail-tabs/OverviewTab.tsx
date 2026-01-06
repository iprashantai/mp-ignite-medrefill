/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, max-lines-per-function, complexity */

/**
 * Overview Tab Component
 *
 * Displays patient summary, adherence summary, and key metrics
 */

'use client';

import React from 'react';
import { usePatientDataset } from '@/contexts/PatientDatasetContext';
import { PDCBadge, FragilityBadge, MeasureBadge } from '@/components/ui-healthcare';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export function OverviewTab() {
  const { patient, isLoading, hasAdherenceData, hasPathway } = usePatientDataset();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-3/4 rounded bg-gray-200"></div>
          <div className="h-4 w-1/2 rounded bg-gray-200"></div>
          <div className="h-4 w-5/6 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="rounded-lg bg-white p-6">
        <p className="text-center text-gray-500">No patient data available</p>
      </div>
    );
  }

  const { adherenceSummary, pathway, measures } = patient;

  return (
    <div className="space-y-6">
      {/* Adherence Summary Section */}
      {hasAdherenceData && adherenceSummary && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">AI Adherence Summary</h3>
            <div className="flex items-center gap-2">
              {adherenceSummary.riskLevel === 'LOW' && (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              )}
              {adherenceSummary.riskLevel === 'MODERATE' && (
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              )}
              {(adherenceSummary.riskLevel === 'HIGH' ||
                adherenceSummary.riskLevel === 'CRITICAL') && (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              )}
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  adherenceSummary.riskLevel === 'LOW'
                    ? 'bg-green-100 text-green-700'
                    : adherenceSummary.riskLevel === 'MODERATE'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {adherenceSummary.riskLevel}
              </span>
            </div>
          </div>

          <p className="mb-4 text-gray-700">{adherenceSummary.summary}</p>

          {/* Key Findings */}
          {adherenceSummary.keyFindings && adherenceSummary.keyFindings.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Key Findings</h4>
              <ul className="space-y-1">
                {adherenceSummary.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1 text-blue-500">•</span>
                    <span className="text-sm text-gray-700">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {adherenceSummary.recommendations && adherenceSummary.recommendations.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Recommendations</h4>
              <ul className="space-y-1">
                {adherenceSummary.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1 text-purple-500">→</span>
                    <span className="text-sm text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {adherenceSummary.priorityMedication && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Priority Medication:</span>{' '}
                {adherenceSummary.priorityMedication}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pathway Information */}
      {hasPathway && pathway && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Refill Pathway</h3>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm text-gray-600">Pathway Type</p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                  pathway.type === 'REFILL'
                    ? 'bg-green-100 text-green-700'
                    : pathway.type === 'RENEWAL'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {pathway.type}
              </span>
            </div>

            <div>
              <p className="mb-1 text-sm text-gray-600">Pathway Code</p>
              <span className="text-sm font-medium text-gray-900">
                {pathway.pathwayCode} - {pathway.pathwayName}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-1 text-sm text-gray-600">Action Required</p>
            <p className="text-sm text-gray-900">{pathway.action}</p>
          </div>

          <div className="mb-4">
            <p className="mb-1 text-sm text-gray-600">SLA</p>
            <p className="text-sm text-gray-900">
              {pathway.sla.days} days (Range: {pathway.sla.min}-{pathway.sla.max} days)
            </p>
          </div>

          {pathway.rxDataMissing && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                ⚠️ Warning: Rx date information is missing. Cannot determine if refill or renewal is
                needed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Measures Overview */}
      {measures && Object.keys(measures).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Medication Adherence Measures
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Object.entries(measures).map(([measureCode, measureData]: [string, any]) => (
              <div key={measureCode} className="rounded-lg bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <MeasureBadge measure={measureCode as any} />
                  {measureData.currentPDC !== undefined && (
                    <PDCBadge pdc={measureData.currentPDC} />
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  {measureData.description || 'No description'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patient Demographics */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Patient Information</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="text-sm font-medium text-gray-900">{patient.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date of Birth</p>
            <p className="text-sm font-medium text-gray-900">{patient.dob || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Age</p>
            <p className="text-sm font-medium text-gray-900">{patient.age || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">MRN</p>
            <p className="text-sm font-medium text-gray-900">{patient.mrn || 'N/A'}</p>
          </div>
          {patient.batchId && (
            <div>
              <p className="text-sm text-gray-600">Batch</p>
              <p className="text-sm font-medium text-gray-900">
                {patient.batchName || patient.batchId}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
