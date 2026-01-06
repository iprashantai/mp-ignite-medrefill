/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, max-lines-per-function, complexity */

/**
 * Outreach Tab Component
 *
 * Displays patient outreach history and communication preferences
 */

'use client';

import React from 'react';
import { usePatientDataset } from '@/contexts/PatientDatasetContext';
import { PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export function OutreachTab() {
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

  // Placeholder for outreach history
  const outreachHistory = (patient as any).outreachHistory || [];

  return (
    <div className="space-y-6">
      {/* Communication Preferences */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Communication Preferences</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3">
            <PhoneIcon className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Phone</p>
              <p className="text-xs text-gray-600">Preferred</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <EnvelopeIcon className="h-5 w-5 text-gray-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Email</p>
              <p className="text-xs text-gray-600">Backup</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">SMS</p>
              <p className="text-xs text-gray-600">Enabled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Outreach History */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Outreach History</h3>
        {outreachHistory.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No outreach history available</p>
        ) : (
          <div className="space-y-4">
            {outreachHistory.map((event: any, index: number) => (
              <div key={index} className="flex gap-4 border-b border-gray-200 pb-4 last:border-0">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <PhoneIcon className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium text-gray-900">{event.type || 'Outreach'}</p>
                    <span className="text-xs text-gray-500">{event.date || 'N/A'}</span>
                  </div>
                  <p className="text-sm text-gray-700">{event.notes || 'No notes'}</p>
                  {event.outcome && (
                    <span
                      className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${
                        event.outcome === 'success'
                          ? 'bg-green-100 text-green-700'
                          : event.outcome === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {event.outcome}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            Log Phone Call
          </button>
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
            Send Email
          </button>
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
            Send SMS
          </button>
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
            Schedule Follow-up
          </button>
        </div>
      </div>
    </div>
  );
}

export default OutreachTab;
