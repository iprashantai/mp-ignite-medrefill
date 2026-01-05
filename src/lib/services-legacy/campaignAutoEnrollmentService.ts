/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, import/no-anonymous-default-export, max-lines-per-function, complexity */

/**
 * Campaign Auto Enrollment Service (Stub)
 *
 * Stub implementation for campaign auto-enrollment functionality
 */

export const getCampaignAutoEnrollmentSettings = async (campaignId: string): Promise<any> => {
  console.warn('[LEGACY] getCampaignAutoEnrollmentSettings stub');
  return null;
};

export const saveCampaignAutoEnrollmentSettings = async (
  campaignId: string,
  settings: any
): Promise<any> => {
  console.warn('[LEGACY] saveCampaignAutoEnrollmentSettings stub');
  return { success: true };
};

export default {
  getCampaignAutoEnrollmentSettings,
  saveCampaignAutoEnrollmentSettings,
};

export const ENROLLMENT_RULES = [] as any[];
