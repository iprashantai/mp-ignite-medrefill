/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, max-lines-per-function, complexity */

/**
 * Medications Tab Component
 *
 * Displays patient's medications with adherence data
 */

'use client';

import React from 'react';
import { usePatientDataset } from '@/contexts/PatientDatasetContext';
import { PDCBadge, MeasureBadge } from '@/components/ui-healthcare';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from '@/components/ui-healthcare/table';

export function MedicationsTab() {
  const { patient, isLoading } = usePatientDataset();

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

  if (medications.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6">
        <p className="text-center text-gray-500">No medications found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Active Medications ({medications.length})
        </h3>
      </div>

      <Table density="comfortable">
        <TableHead sticky>
          <TableRow>
            <TableHeaderCell>Medication</TableHeaderCell>
            <TableHeaderCell>Strength</TableHeaderCell>
            <TableHeaderCell>Measure</TableHeaderCell>
            <TableHeaderCell>PDC</TableHeaderCell>
            <TableHeaderCell>Refills Remaining</TableHeaderCell>
            <TableHeaderCell>Last Fill Date</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {medications.map((med: any, index: number) => (
            <TableRow key={med.id || index} hoverable>
              <TableCell>
                <div>
                  <p className="font-medium text-gray-900">
                    {med.drugName || med.medicationName || 'Unknown'}
                  </p>
                  {med.ndcCode && <p className="text-xs text-gray-500">NDC: {med.ndcCode}</p>}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-700">{med.strength || 'N/A'}</span>
              </TableCell>
              <TableCell>{med.measure && <MeasureBadge measure={med.measure} />}</TableCell>
              <TableCell>{med.pdc !== undefined && <PDCBadge pdc={med.pdc} />}</TableCell>
              <TableCell>
                <span className="text-sm text-gray-900">{med.refillsRemaining ?? 'N/A'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-700">{med.lastFillDate || 'N/A'}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default MedicationsTab;
