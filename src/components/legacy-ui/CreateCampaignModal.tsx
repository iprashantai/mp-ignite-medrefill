'use client';
/* eslint-disable */

import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  UserGroupIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  BoltIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { ENROLLMENT_RULES } from '@/lib/services-legacy/campaignAutoEnrollmentService';

/**
 * CreateCampaignModal - Modal for creating campaigns from selected patients
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler
 * @param {function} onSave - Save handler (receives campaign object)
 * @param {Array} preSelectedPatients - Array of pre-selected patient objects
 */
const CreateCampaignModal = ({
  isOpen,
  onClose,
  onSave,
  preSelectedPatients = [],
}: {
  isOpen: any;
  onClose: any;
  onSave: any;
  preSelectedPatients?: any[];
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'outreach',
    channel: 'phone',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    messageTemplate: '',
    notes: '',
    autoEnrollmentEnabled: false,
    autoEnrollmentRule: 'refill_candidates',
    autoEnrollmentMaxPatients: 1000,
  });

  const [selectedPatients, setSelectedPatients] = useState(preSelectedPatients);
  const [saving, setSaving] = useState(false);

  // Update selected patients when preSelectedPatients changes (e.g., modal reopens)
  useEffect(() => {
    if (isOpen) {
      setSelectedPatients(preSelectedPatients);
    }
  }, [isOpen, preSelectedPatients]);

  const campaignTypes = [
    { value: 'outreach', label: 'Outreach Call', icon: PhoneIcon },
    { value: 'refill_reminder', label: 'Refill Reminder', icon: CalendarIcon },
    { value: 'education', label: 'Patient Education', icon: DocumentTextIcon },
    { value: 'wellness_check', label: 'Wellness Check-In', icon: ChatBubbleLeftRightIcon },
  ];

  const channels = [
    { value: 'phone', label: 'Phone Call', icon: PhoneIcon },
    { value: 'email', label: 'Email', icon: EnvelopeIcon },
    { value: 'sms', label: 'SMS/Text', icon: ChatBubbleLeftRightIcon },
    { value: 'portal', label: 'Patient Portal', icon: DocumentTextIcon },
  ];

  const messageTemplates: any = {
    outreach: [
      { value: '', label: 'Select template...' },
      { value: 'med_gap_critical', label: 'Medication Gap - Critical' },
      { value: 'med_gap_standard', label: 'Medication Gap - Standard' },
      { value: 'compliance_check', label: 'Compliance Check-In' },
    ],
    refill_reminder: [
      { value: '', label: 'Select template...' },
      { value: 'refill_due_soon', label: 'Refill Due Soon (7 days)' },
      { value: 'refill_overdue', label: 'Refill Overdue' },
      { value: 'refill_courtesy', label: 'Courtesy Reminder' },
    ],
    education: [
      { value: '', label: 'Select template...' },
      { value: 'medication_info', label: 'Medication Information' },
      { value: 'side_effects', label: 'Side Effects Education' },
      { value: 'benefits', label: 'Treatment Benefits' },
    ],
    wellness_check: [
      { value: '', label: 'Select template...' },
      { value: 'monthly_checkup', label: 'Monthly Check-Up' },
      { value: 'how_are_you', label: 'How Are You Feeling?' },
      { value: 'support_offer', label: 'Support Offer' },
    ],
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRemovePatient = (patientId: any) => {
    setSelectedPatients((prev: any) => prev.filter((p: any) => p.id !== patientId));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    // Allow campaigns with no patients if auto-enrollment is enabled
    if (selectedPatients.length === 0 && !formData.autoEnrollmentEnabled) {
      alert('Please select at least one patient or enable auto-enrollment');
      return;
    }

    setSaving(true);

    const campaign = {
      ...formData,
      patientIds: selectedPatients.map((p: any) => p.id),
      patientCount: selectedPatients.length,
      status: 'active',
      createdAt: new Date().toISOString(),
      autoEnrollment: formData.autoEnrollmentEnabled
        ? {
            enabled: true,
            criteria:
              (ENROLLMENT_RULES as any)[formData.autoEnrollmentRule.toUpperCase()]?.criteria ||
              (ENROLLMENT_RULES as any).REFILL_CANDIDATES?.criteria ||
              {},
            maxEnrollments: formData.autoEnrollmentMaxPatients,
            runFrequency: 'manual', // Can be changed to 'daily' or 'weekly' later
          }
        : {
            enabled: false,
          },
    };

    try {
      await onSave(campaign);
      onClose();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="bg-opacity-50 fixed inset-0 bg-black transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl transform rounded-xl bg-white shadow-2xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create Campaign</h2>
                <p className="text-sm text-gray-600">
                  {selectedPatients.length} patient{selectedPatients.length !== 1 ? 's' : ''}{' '}
                  selected
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Campaign Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Critical MAC Outreach - Dec 2025"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Campaign Type */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Campaign Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {campaignTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => handleInputChange('type', type.value)}
                        className={`flex items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                          formData.type === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            formData.type === type.value ? 'text-blue-600' : 'text-gray-400'
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            formData.type === type.value ? 'text-blue-900' : 'text-gray-700'
                          }`}
                        >
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Communication Channel */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Communication Channel
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {channels.map((channel) => {
                    const Icon = channel.icon;
                    return (
                      <button
                        key={channel.value}
                        onClick={() => handleInputChange('channel', channel.value)}
                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                          formData.channel === channel.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            formData.channel === channel.value ? 'text-blue-600' : 'text-gray-400'
                          }`}
                        />
                        <span
                          className={`text-xs font-medium ${
                            formData.channel === channel.value ? 'text-blue-900' : 'text-gray-700'
                          }`}
                        >
                          {channel.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Message Template */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Message Template
                </label>
                <select
                  value={formData.messageTemplate}
                  onChange={(e) => handleInputChange('messageTemplate', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {messageTemplates[formData.type]?.map((template: any) => (
                    <option key={template.value} value={template.value}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any additional notes or instructions..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Auto-Enrollment Configuration */}
              <div className="border-t border-gray-200 pt-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                    <BoltIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Auto-Enrollment</h3>
                    <p className="text-xs text-gray-600">Automatically enroll eligible patients</p>
                  </div>
                </div>

                {/* Enable Auto-Enrollment Toggle */}
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <input
                    type="checkbox"
                    id="autoEnrollmentEnabled"
                    checked={formData.autoEnrollmentEnabled}
                    onChange={(e) => handleInputChange('autoEnrollmentEnabled', e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="autoEnrollmentEnabled"
                      className="cursor-pointer text-sm font-semibold text-gray-900"
                    >
                      Enable Auto-Enrollment
                    </label>
                    <p className="mt-1 text-xs text-gray-600">
                      Automatically add patients who meet enrollment criteria to this campaign
                    </p>
                  </div>
                </div>

                {/* Auto-Enrollment Settings (shown when enabled) */}
                {formData.autoEnrollmentEnabled && (
                  <div className="space-y-4 border-l-2 border-amber-300 pl-3">
                    {/* Enrollment Rule */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Enrollment Rule
                      </label>
                      <select
                        value={formData.autoEnrollmentRule}
                        onChange={(e) => handleInputChange('autoEnrollmentRule', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        {Object.values(ENROLLMENT_RULES).map((rule: any) => (
                          <option key={rule.id} value={rule.id}>
                            {rule.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-500">
                        <InformationCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>
                          {
                            (ENROLLMENT_RULES as any)[formData.autoEnrollmentRule.toUpperCase()]
                              ?.description
                          }
                        </span>
                      </p>
                    </div>

                    {/* Max Enrollments */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Maximum Auto-Enrollments
                      </label>
                      <input
                        type="number"
                        value={formData.autoEnrollmentMaxPatients}
                        onChange={(e) =>
                          handleInputChange(
                            'autoEnrollmentMaxPatients',
                            parseInt(e.target.value) || 1000
                          )
                        }
                        min="1"
                        max="10000"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <p className="mt-1.5 text-xs text-gray-500">
                        Limit the number of patients that can be auto-enrolled at one time
                      </p>
                    </div>

                    {/* Info Box */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="flex items-start gap-2">
                        <InformationCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                        <div className="text-xs text-blue-900">
                          <p className="mb-1 font-semibold">How Auto-Enrollment Works:</p>
                          <ul className="list-inside list-disc space-y-0.5 text-blue-800">
                            <li>Run manually or schedule to run daily/weekly</li>
                            <li>Only enrolls patients who aren't already in the campaign</li>
                            <li>Patients must meet ALL criteria to be enrolled</li>
                            <li>
                              Use the script:{' '}
                              <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">
                                node scripts/runCampaignAutoEnrollment.js
                              </code>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Patients */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Selected Patients ({selectedPatients.length})
                </label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                  {selectedPatients.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">No patients selected</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {selectedPatients.slice(0, 10).map((patient: any) => (
                        <div
                          key={patient.id}
                          className="flex items-center justify-between px-4 py-2 hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {patient.name || patient.patientName || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
                              PDC: {patient.currentPDC || patient.pdc || 'N/A'}% •{' '}
                              {patient.fragilityTier || 'Unknown tier'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemovePatient(patient.id)}
                            className="p-1 text-gray-400 transition-colors hover:text-red-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {selectedPatients.length > 10 && (
                        <p className="py-2 text-center text-xs text-gray-500">
                          ... and {selectedPatients.length - 10} more patients
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between rounded-b-xl border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                saving ||
                !formData.name.trim() ||
                (selectedPatients.length === 0 && !formData.autoEnrollmentEnabled)
              }
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Creating Campaign...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaignModal;
