/**
 * FHIR SearchParameter Definitions
 *
 * Custom SearchParameters for indexing extension values to enable
 * efficient querying and UI performance.
 *
 * @see docs/implementation/phase-1-core-engine/specs/04_SEARCH_PARAMETERS_SPEC.md
 */

import type { SearchParameter } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { EXTENSION_BASE_URL } from './types';

// =============================================================================
// SearchParameter Definitions
// =============================================================================

/**
 * All custom SearchParameters for the Ignite Health platform.
 */
export const SEARCH_PARAMETERS: SearchParameter[] = [
  // ---------------------------------------------------------------------------
  // Observation SearchParameters
  // ---------------------------------------------------------------------------

  /**
   * Search Observations by fragility tier classification.
   *
   * Example: GET /Observation?fragility-tier=F1_IMMINENT
   */
  {
    resourceType: 'SearchParameter',
    id: 'observation-fragility-tier',
    url: `${EXTENSION_BASE_URL}/SearchParameter/observation-fragility-tier`,
    version: '1.0.0',
    name: 'fragility-tier',
    status: 'active',
    description: 'Search Observations by fragility tier classification',
    code: 'fragility-tier',
    base: ['Observation'],
    type: 'token',
    expression: `Observation.extension.where(url='${EXTENSION_BASE_URL}/fragility-tier').valueCode`,
  },

  /**
   * Search Observations by priority score.
   *
   * Example: GET /Observation?_sort=-priority-score
   */
  {
    resourceType: 'SearchParameter',
    id: 'observation-priority-score',
    url: `${EXTENSION_BASE_URL}/SearchParameter/observation-priority-score`,
    version: '1.0.0',
    name: 'priority-score',
    status: 'active',
    description: 'Search Observations by calculated priority score',
    code: 'priority-score',
    base: ['Observation'],
    type: 'number',
    expression: `Observation.extension.where(url='${EXTENSION_BASE_URL}/priority-score').valueInteger`,
  },

  /**
   * Filter to get only the current/latest PDC observation.
   *
   * Example: GET /Observation?is-current-pdc=true&patient=Patient/123
   */
  {
    resourceType: 'SearchParameter',
    id: 'observation-is-current-pdc',
    url: `${EXTENSION_BASE_URL}/SearchParameter/observation-is-current-pdc`,
    version: '1.0.0',
    name: 'is-current-pdc',
    status: 'active',
    description: 'Filter to get only the current/latest PDC observation',
    code: 'is-current-pdc',
    base: ['Observation'],
    type: 'token',
    expression: `Observation.extension.where(url='${EXTENSION_BASE_URL}/is-current-pdc').valueBoolean`,
  },

  /**
   * Search Observations by HEDIS MA measure type.
   *
   * Example: GET /Observation?ma-measure=MAC&is-current-pdc=true
   */
  {
    resourceType: 'SearchParameter',
    id: 'observation-ma-measure',
    url: `${EXTENSION_BASE_URL}/SearchParameter/observation-ma-measure`,
    version: '1.0.0',
    name: 'ma-measure',
    status: 'active',
    description: 'Search Observations by HEDIS MA measure type',
    code: 'ma-measure',
    base: ['Observation'],
    type: 'token',
    expression: `Observation.extension.where(url='${EXTENSION_BASE_URL}/ma-measure').valueCode`,
  },

  /**
   * Search by days until medication runs out.
   *
   * Example: GET /Observation?days-until-runout=le7&is-current-pdc=true
   */
  {
    resourceType: 'SearchParameter',
    id: 'observation-days-until-runout',
    url: `${EXTENSION_BASE_URL}/SearchParameter/observation-days-until-runout`,
    version: '1.0.0',
    name: 'days-until-runout',
    status: 'active',
    description: 'Search by days until medication runs out',
    code: 'days-until-runout',
    base: ['Observation'],
    type: 'number',
    expression: `Observation.extension.where(url='${EXTENSION_BASE_URL}/days-until-runout').valueInteger`,
  },

  // ---------------------------------------------------------------------------
  // Patient SearchParameters (Denormalized)
  // ---------------------------------------------------------------------------

  /**
   * Search Patients by their current worst fragility tier.
   *
   * Example: GET /Patient?patient-fragility-tier=F1_IMMINENT
   */
  {
    resourceType: 'SearchParameter',
    id: 'patient-fragility-tier',
    url: `${EXTENSION_BASE_URL}/SearchParameter/patient-fragility-tier`,
    version: '1.0.0',
    name: 'patient-fragility-tier',
    status: 'active',
    description: 'Search Patients by their current worst fragility tier',
    code: 'patient-fragility-tier',
    base: ['Patient'],
    type: 'token',
    expression: `Patient.extension.where(url='${EXTENSION_BASE_URL}/current-fragility-tier').valueCode`,
  },

  /**
   * Search Patients by their current priority score.
   *
   * Example: GET /Patient?_sort=-patient-priority-score
   */
  {
    resourceType: 'SearchParameter',
    id: 'patient-priority-score',
    url: `${EXTENSION_BASE_URL}/SearchParameter/patient-priority-score`,
    version: '1.0.0',
    name: 'patient-priority-score',
    status: 'active',
    description: 'Search Patients by their current priority score',
    code: 'patient-priority-score',
    base: ['Patient'],
    type: 'number',
    expression: `Patient.extension.where(url='${EXTENSION_BASE_URL}/current-priority-score').valueInteger`,
  },
];

// =============================================================================
// Deployment Functions
// =============================================================================

/**
 * Deploy all SearchParameters to Medplum.
 *
 * This function creates or updates SearchParameters in Medplum.
 * After deployment, a reindex may be required for existing resources.
 *
 * @param medplum - Medplum client instance
 * @returns Array of deployed SearchParameter resources
 *
 * @example
 * const deployed = await deploySearchParameters(medplum);
 * console.log(`Deployed ${deployed.length} SearchParameters`);
 */
export async function deploySearchParameters(
  medplum: MedplumClient
): Promise<SearchParameter[]> {
  const deployed: SearchParameter[] = [];

  for (const sp of SEARCH_PARAMETERS) {
    try {
      // Check if SearchParameter already exists
      const existing = await medplum.searchOne('SearchParameter', {
        url: sp.url,
      });

      if (existing) {
        // Update existing SearchParameter
        const updated = await medplum.updateResource({
          ...sp,
          id: existing.id,
        });
        deployed.push(updated as SearchParameter);
        console.log(`Updated SearchParameter: ${sp.name}`);
      } else {
        // Create new SearchParameter
        const created = await medplum.createResource(sp);
        deployed.push(created as SearchParameter);
        console.log(`Created SearchParameter: ${sp.name}`);
      }
    } catch (error) {
      console.error(`Failed to deploy SearchParameter: ${sp.name}`, error);
      throw error;
    }
  }

  console.log(`\nDeployed ${deployed.length} SearchParameters.`);
  console.log('Note: Reindex may be required for existing resources.');

  return deployed;
}

/**
 * Get all custom SearchParameter names.
 *
 * Useful for documentation and validation.
 */
export function getSearchParameterNames(): string[] {
  return SEARCH_PARAMETERS.map((sp) => sp.name!);
}

/**
 * Get SearchParameter by name.
 *
 * @param name - SearchParameter name (e.g., 'fragility-tier')
 * @returns SearchParameter definition or undefined
 */
export function getSearchParameterByName(
  name: string
): SearchParameter | undefined {
  return SEARCH_PARAMETERS.find((sp) => sp.name === name);
}

// =============================================================================
// Query Helpers
// =============================================================================

/**
 * Common query patterns for the dashboard.
 */
export const DASHBOARD_QUERIES = {
  /**
   * Count patients by fragility tier.
   */
  tierCounts: (tier: string) =>
    `Patient?patient-fragility-tier=${tier}&_summary=count`,

  /**
   * Get all current PDC observations.
   */
  allCurrentPDC: 'Observation?is-current-pdc=true&_summary=true',

  /**
   * Get urgent patients (F1, F2).
   */
  urgentPatients:
    'Patient?patient-fragility-tier=F1_IMMINENT,F2_FRAGILE&_sort=-patient-priority-score',

  /**
   * Get patients running out of medication soon.
   */
  urgentRefills: 'Observation?days-until-runout=le3&is-current-pdc=true',
};

/**
 * Common query patterns for the queue.
 */
export const QUEUE_QUERIES = {
  /**
   * Queue sorted by priority.
   */
  byPriority: (limit = 100) =>
    `Patient?patient-fragility-tier:not=COMPLIANT&_sort=-patient-priority-score&_count=${limit}`,

  /**
   * Queue filtered by tier.
   */
  byTier: (tier: string, limit = 100) =>
    `Patient?patient-fragility-tier=${tier}&_sort=-patient-priority-score&_count=${limit}`,

  /**
   * Queue filtered by measure.
   */
  byMeasure: (measure: string, limit = 100) =>
    `Observation?ma-measure=${measure}&is-current-pdc=true&_include=Observation:subject&_count=${limit}`,
};

/**
 * Common query patterns for patient detail.
 */
export const PATIENT_QUERIES = {
  /**
   * Get current PDC for a patient.
   */
  currentPDC: (patientId: string) =>
    `Observation?patient=Patient/${patientId}&is-current-pdc=true`,

  /**
   * Get PDC history for a patient.
   */
  pdcHistory: (patientId: string) =>
    `Observation?patient=Patient/${patientId}&code=pdc-score&_sort=-date`,

  /**
   * Get current PDC for a specific measure.
   */
  currentPDCByMeasure: (patientId: string, measure: string) =>
    `Observation?patient=Patient/${patientId}&is-current-pdc=true&ma-measure=${measure}`,
};
