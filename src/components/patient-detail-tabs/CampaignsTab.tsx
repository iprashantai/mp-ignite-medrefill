/* eslint-disable @typescript-eslint/no-explicit-any, max-lines-per-function */

/**
 * Campaigns Tab Component
 *
 * Displays patient's enrolled campaigns and campaign management
 */

'use client';

import React from 'react';
import { usePatientDataset } from '@/contexts/PatientDatasetContext';
import { MegaphoneIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export function CampaignsTab() {
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

  // Placeholder for campaigns data
  const campaigns = (patient as any).campaigns || [];

  return (
    <div className="space-y-6">
      {/* Active Campaigns */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Enrolled Campaigns ({campaigns.length})
          </h3>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            Manage Campaigns
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-8 text-center">
            <MegaphoneIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No active campaigns</p>
            <p className="mt-1 text-sm text-gray-400">
              Enroll this patient in a campaign to start outreach
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {campaigns.map((campaign: any, index: number) => (
              <div key={index} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MegaphoneIcon className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-gray-900">
                      {campaign.name || 'Unnamed Campaign'}
                    </h4>
                  </div>
                  {campaign.status === 'active' ? (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      {campaign.status || 'Inactive'}
                    </span>
                  )}
                </div>
                <p className="mb-3 text-sm text-gray-600">
                  {campaign.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>Enrolled: {campaign.enrolledDate || 'N/A'}</span>
                  </div>
                  {campaign.completedActions !== undefined && (
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>{campaign.completedActions} actions</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaign Performance */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Campaign Performance</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="mb-1 text-sm text-gray-600">Total Outreach</p>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <p className="mb-1 text-sm text-gray-600">Successful Contacts</p>
            <p className="text-2xl font-bold text-green-600">0</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="mb-1 text-sm text-gray-600">Pending Follow-ups</p>
            <p className="text-2xl font-bold text-amber-600">0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CampaignsTab;
