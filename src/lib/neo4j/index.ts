/**
 * Neo4j Module for Ignite Health
 *
 * Graph database integration for medication adherence analysis
 * and FHIR data visualization.
 */

// Client exports
export {
  getNeo4jDriver,
  closeNeo4jDriver,
  neo4jHealthCheck,
  readQuery,
  writeQuery,
  withTransaction,
  getDatabaseStats,
} from './client';

// Query exports
export {
  // Types
  type PatientNode,
  type MedicationNode,
  type MedicationDispenseNode,
  type ConditionNode,
  type PatientGraph,
  type MedicationGap,
  type RefillNeeded,
  type PolypharmacyPatient,

  // Patient queries
  getPatientGraph,
  searchPatients,
  getPatients,

  // Medication adherence queries
  getMedicationGaps,
  getPatientsNeedingRefills,
  getPatientsWithAdherenceIssues,

  // Safety queries
  getPolypharmacyPatients,
  getPatientMedicationAllergies,

  // Analytics queries
  getMedicationClassDistribution,
  getConditionPrevalence,
  getProviderActivity,

  // Graph exploration
  getPatientNeighborhood,
} from './queries';
