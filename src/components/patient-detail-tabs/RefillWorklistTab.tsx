/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, max-lines-per-function, complexity */

/**
 * Refill Worklist Tab Component
 *
 * Displays patient's refill worklist items and medication refill status
 */

'use client';

import React from 'react';
import { usePatientDataset } from '@/contexts/PatientDatasetContext';
import { PDCBadge, RunoutBadge, DecisionBadge } from '@/components/ui-healthcare';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from '@/components/ui-healthcare/table';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export function RefillWorklistTab() {
  const { patient, isLoading, hasPathway } = usePatientDataset();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-3/4 rounded bg-gray-200"></div>
          <div className="h-4 w-1/2 rounded bg-gray-200"></div>
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

  const medications = patient.medications || [];
  const pathway = patient.pathway;

  // Filter medications that need refills (placeholder logic)
  const refillWorklistItems = medications.filter((med: any) => {
    return med.refillsRemaining !== undefined && med.refillsRemaining >= 0;
  });

  return (
    <div className="space-y-6">
      {/* Pathway Summary */}
      {hasPathway && pathway && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Refill Pathway</h3>
              <p className="text-sm text-gray-600">{pathway.description}</p>
            </div>
            <div className="text-right">
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
              <p className="mt-2 text-xs text-gray-500">SLA: {pathway.sla.days} days</p>
            </div>
          </div>
        </div>
      )}

      {/* Refill Worklist Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Refill Worklist ({refillWorklistItems.length})
          </h3>
        </div>

        {refillWorklistItems.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardDocumentListIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No refill worklist items</p>
            <p className="mt-1 text-sm text-gray-400">All medications are up to date</p>
          </div>
        ) : (
          <Table density="comfortable">
            <TableHead sticky>
              <TableRow>
                <TableHeaderCell>Medication</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>PDC</TableHeaderCell>
                <TableHeaderCell>Refills Remaining</TableHeaderCell>
                <TableHeaderCell>Days to Runout</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refillWorklistItems.map((med: any, index: number) => {
                const daysToRunout = med.daysToRunout ?? 30; // Placeholder
                const worklistStatus = med.worklistStatus || 'pending';

                return (
                  <TableRow key={med.id || index} hoverable>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">
                          {med.drugName || med.medicationName || 'Unknown'}
                        </p>
                        {med.strength && <p className="text-xs text-gray-500">{med.strength}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          pathway?.type === 'REFILL'
                            ? 'bg-green-100 text-green-700'
                            : pathway?.type === 'RENEWAL'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {pathway?.type || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>{med.pdc !== undefined && <PDCBadge pdc={med.pdc} />}</TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-900">{med.refillsRemaining}</span>
                    </TableCell>
                    <TableCell>
                      <RunoutBadge daysToRunout={daysToRunout} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          worklistStatus === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : worklistStatus === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {worklistStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        Review
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Actions Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Required Actions</h3>
        {pathway && (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                <span className="text-xs font-bold text-blue-600">1</span>
              </div>
              <p className="text-sm text-gray-700">{pathway.action}</p>
            </div>
            {pathway.reasoning && pathway.reasoning.length > 0 && (
              <div className="mt-2 ml-9">
                <p className="mb-1 text-xs font-semibold text-gray-600">Reasoning:</p>
                <ul className="space-y-1">
                  {pathway.reasoning.map((reason: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1 text-xs text-gray-600">
                      <span className="text-gray-400">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RefillWorklistTab;
