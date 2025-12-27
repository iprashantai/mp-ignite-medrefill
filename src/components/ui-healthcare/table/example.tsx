/**
 * Example: Healthcare Table Component Usage
 *
 * This file demonstrates how to use the Table component system
 * in a real-world healthcare application scenario.
 */

import React, { useState } from 'react';
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
} from './index';

// Example data structure
interface Patient {
  id: string;
  name: string;
  mrn: string;
  dob: string;
  lastVisit: string;
  status: 'Active' | 'Pending' | 'Inactive';
  pdcScore: number;
}

// Sample patient data
const samplePatients: Patient[] = [
  {
    id: '1',
    name: 'John Doe',
    mrn: 'MRN-001234',
    dob: '1965-03-15',
    lastVisit: '2024-12-15',
    status: 'Active',
    pdcScore: 85,
  },
  {
    id: '2',
    name: 'Jane Smith',
    mrn: 'MRN-001235',
    dob: '1972-07-22',
    lastVisit: '2024-11-28',
    status: 'Pending',
    pdcScore: 72,
  },
  {
    id: '3',
    name: 'Robert Johnson',
    mrn: 'MRN-001236',
    dob: '1958-11-08',
    lastVisit: '2024-12-20',
    status: 'Active',
    pdcScore: 91,
  },
];

/**
 * Example: Basic Patient Table with Sorting and Density
 */
// eslint-disable-next-line max-lines-per-function
export function PatientTableExample() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [patients] = useState<Patient[]>(samplePatients);

  // Use the table state hook
  const { density, setDensity, getSortProps, sortData } = useTableState({
    defaultDensity: 'compact',
    defaultSortColumn: 'name',
  });

  // Custom sort function for different column types
  const sortedPatients = sortData(patients, (a, b, column) => {
    switch (column) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'mrn':
        return a.mrn.localeCompare(b.mrn);
      case 'lastVisit':
        return new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime();
      case 'pdcScore':
        return a.pdcScore - b.pdcScore;
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  // Helper function to get PDC status color
  const getPdcColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  // Helper function to get status badge color
  const getStatusBadge = (status: Patient['status']) => {
    const colors = {
      Active: 'bg-green-100 text-green-800',
      Pending: 'bg-amber-100 text-amber-800',
      Inactive: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Density Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Patient List</h2>
        <DensityToggle density={density} onDensityChange={setDensity} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <Table density={density} ariaLabel="Patient medication adherence list">
          <TableHead sticky>
            <TableRow>
              <TableHeaderCell {...getSortProps('name')}>Patient Name</TableHeaderCell>
              <TableHeaderCell {...getSortProps('mrn')}>MRN</TableHeaderCell>
              <TableHeaderCell>Date of Birth</TableHeaderCell>
              <TableHeaderCell {...getSortProps('lastVisit')}>Last Visit</TableHeaderCell>
              <TableHeaderCell {...getSortProps('status')}>Status</TableHeaderCell>
              <TableHeaderCell {...getSortProps('pdcScore')} align="right">
                PDC Score
              </TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedPatients.map((patient) => (
              <TableRow
                key={patient.id}
                hoverable
                clickable
                selected={selectedId === patient.id}
                onClick={() => setSelectedId(patient.id)}
              >
                <TableCell>
                  <div className="font-medium text-gray-900">{patient.name}</div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-gray-600">{patient.mrn}</span>
                </TableCell>
                <TableCell>
                  <span className="text-gray-600">{patient.dob}</span>
                </TableCell>
                <TableCell>
                  <span className="text-gray-600">{patient.lastVisit}</span>
                </TableCell>
                <TableCell>{getStatusBadge(patient.status)}</TableCell>
                <TableCell align="right">
                  <span className={`font-semibold ${getPdcColor(patient.pdcScore)}`}>
                    {patient.pdcScore}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter totalCount={patients.length} itemLabel="patients" />
        </Table>
      </div>

      {/* Selected Patient Info */}
      {selectedId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            Selected Patient:{' '}
            <span className="font-semibold">{patients.find((p) => p.id === selectedId)?.name}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Minimal Table (No Sorting, No Density Toggle)
 */
export function MinimalTableExample() {
  return (
    <Table ariaLabel="Simple patient list">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>John Doe</TableCell>
          <TableCell>Active</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Jane Smith</TableCell>
          <TableCell>Pending</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

/**
 * Example: Table with Custom Footer
 */
export function CustomFooterTableExample() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 10;

  return (
    <Table ariaLabel="Paginated patient list">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>MRN</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {samplePatients.map((patient) => (
          <TableRow key={patient.id}>
            <TableCell>{patient.name}</TableCell>
            <TableCell>{patient.mrn}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </TableFooter>
    </Table>
  );
}

export default PatientTableExample;
