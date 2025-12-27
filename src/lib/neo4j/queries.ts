/**
 * Neo4j Graph Queries for Ignite Health
 *
 * Pre-built queries for medication adherence analysis,
 * PDC calculation support, and FHIR data exploration.
 */

import { readQuery } from './client';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PatientNode {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  race: string;
  ethnicity: string;
  age: number;
  healthcareExpenses: number;
  healthcareCoverage: number;
}

export interface MedicationNode {
  code: string;
  description: string;
  adherenceClass: 'MAD' | 'MAC' | 'MAH' | null;
}

export interface MedicationDispenseNode {
  id: string;
  startDate: string;
  stopDate: string | null;
  daysSupply: number;
  dispenses: number;
  totalCost: number;
}

export interface ConditionNode {
  code: string;
  description: string;
}

export interface PatientGraph {
  patient: PatientNode;
  medications: Array<{
    dispense: MedicationDispenseNode;
    medication: MedicationNode;
  }>;
  conditions: Array<{
    condition: ConditionNode;
    isActive: boolean;
    startDate: string;
  }>;
  allergies: Array<{
    code: string;
    description: string;
    severity: string;
  }>;
}

export interface MedicationGap {
  dispenseId: string;
  startDate: string;
  daysSupply: number;
  gapAfter: number | null;
  nextDispenseId: string | null;
}

export interface RefillNeeded {
  patientId: string;
  patientName: string;
  medication: string;
  medicationClass: string;
  coverageEndsOn: string;
  daysUntilGap: number;
}

export interface PolypharmacyPatient {
  patientId: string;
  patientName: string;
  age: number;
  medicationCount: number;
  medications: string[];
}

// ============================================
// PATIENT QUERIES
// ============================================

/**
 * Get patient with all related data for medication adherence analysis
 */
export async function getPatientGraph(patientId: string): Promise<PatientGraph | null> {
  const cypher = `
    MATCH (p:Patient {id: $patientId})
    OPTIONAL MATCH (p)-[:HAS_MEDICATION_DISPENSE]->(md:MedicationDispense)-[:OF_MEDICATION]->(m:Medication)
    OPTIONAL MATCH (p)-[hc:HAS_CONDITION]->(c:Condition)
    OPTIONAL MATCH (p)-[ha:HAS_ALLERGY]->(a:Allergy)

    WITH p,
         collect(DISTINCT {
           dispense: md { .* },
           medication: m { .* }
         }) AS medications,
         collect(DISTINCT {
           condition: c { .* },
           isActive: hc.isActive,
           startDate: hc.startDate
         }) AS conditions,
         collect(DISTINCT {
           code: a.code,
           description: a.description,
           severity: ha.severity1
         }) AS allergies

    RETURN p { .* } AS patient,
           [m IN medications WHERE m.dispense IS NOT NULL] AS medications,
           [c IN conditions WHERE c.condition IS NOT NULL] AS conditions,
           [a IN allergies WHERE a.code IS NOT NULL] AS allergies
  `;

  const result = await readQuery<PatientGraph>(cypher, { patientId });
  return result.length > 0 ? result[0] : null;
}

/**
 * Search patients by name
 */
export async function searchPatients(
  searchTerm: string,
  limit: number = 20
): Promise<PatientNode[]> {
  const cypher = `
    MATCH (p:Patient)
    WHERE toLower(p.firstName) CONTAINS toLower($searchTerm)
       OR toLower(p.lastName) CONTAINS toLower($searchTerm)
    RETURN p { .* } AS patient
    ORDER BY p.lastName, p.firstName
    LIMIT $limit
  `;

  const result = await readQuery<{ patient: PatientNode }>(cypher, { searchTerm, limit });
  return result.map(r => r.patient);
}

/**
 * Get all patients with pagination
 */
export async function getPatients(
  skip: number = 0,
  limit: number = 50
): Promise<{ patients: PatientNode[]; total: number }> {
  const [patientsResult, countResult] = await Promise.all([
    readQuery<{ patient: PatientNode }>(
      `MATCH (p:Patient)
       RETURN p { .* } AS patient
       ORDER BY p.lastName, p.firstName
       SKIP $skip LIMIT $limit`,
      { skip, limit }
    ),
    readQuery<{ count: number }>('MATCH (p:Patient) RETURN count(p) AS count'),
  ]);

  return {
    patients: patientsResult.map(r => r.patient),
    total: countResult[0]?.count || 0,
  };
}

// ============================================
// MEDICATION ADHERENCE QUERIES
// ============================================

/**
 * Get medication fill history with gaps for a patient
 */
export async function getMedicationGaps(
  patientId: string,
  medicationClass?: 'MAD' | 'MAC' | 'MAH'
): Promise<{
  patientId: string;
  medicationClass: string;
  fills: MedicationGap[];
  totalGapDays: number;
}[]> {
  const classFilter = medicationClass
    ? 'AND m.adherenceClass = $medicationClass'
    : 'AND m.adherenceClass IS NOT NULL';

  const cypher = `
    MATCH (p:Patient {id: $patientId})-[:HAS_MEDICATION_DISPENSE]->(md:MedicationDispense)
          -[:OF_MEDICATION]->(m:Medication)
    WHERE true ${classFilter}
    OPTIONAL MATCH (md)-[f:FOLLOWED_BY]->(next:MedicationDispense)

    WITH p, m, md, f, next
    ORDER BY md.startDate

    WITH p.id AS patientId,
         m.adherenceClass AS medicationClass,
         collect({
           dispenseId: md.id,
           startDate: md.startDate,
           daysSupply: md.daysSupply,
           gapAfter: f.gapDays,
           nextDispenseId: next.id
         }) AS fills,
         sum(CASE WHEN f.isGap THEN f.gapDays ELSE 0 END) AS totalGapDays

    RETURN patientId, medicationClass, fills, totalGapDays
  `;

  return readQuery(cypher, { patientId, medicationClass });
}

/**
 * Get patients needing medication refills within specified days
 */
export async function getPatientsNeedingRefills(
  daysAhead: number = 15
): Promise<RefillNeeded[]> {
  const cypher = `
    MATCH (p:Patient)-[:HAS_MEDICATION_DISPENSE]->(md:MedicationDispense)
          -[:OF_MEDICATION]->(m:Medication)
    WHERE m.adherenceClass IS NOT NULL
      AND NOT EXISTS { (md)-[:FOLLOWED_BY]->() }

    WITH p, m, md,
         coalesce(md.stopDate, md.startDate + duration({days: md.daysSupply})) AS coverageEnd,
         date() AS today

    WHERE coverageEnd >= today
      AND coverageEnd <= today + duration({days: $daysAhead})

    RETURN p.id AS patientId,
           p.firstName + ' ' + p.lastName AS patientName,
           m.description AS medication,
           m.adherenceClass AS medicationClass,
           coverageEnd AS coverageEndsOn,
           duration.inDays(today, coverageEnd).days AS daysUntilGap
    ORDER BY daysUntilGap ASC
  `;

  return readQuery(cypher, { daysAhead });
}

/**
 * Get patients with adherence issues (PDC < threshold)
 */
export async function getPatientsWithAdherenceIssues(
  medicationClass: 'MAD' | 'MAC' | 'MAH',
  pdcThreshold: number = 0.8,
  measurementDays: number = 365
): Promise<{
  patientId: string;
  patientName: string;
  medicationClass: string;
  fillCount: number;
  totalDaysSupply: number;
  estimatedPDC: number;
}[]> {
  const cypher = `
    MATCH (p:Patient)-[:HAS_MEDICATION_DISPENSE]->(md:MedicationDispense)
          -[:OF_MEDICATION]->(m:Medication {adherenceClass: $medicationClass})
    WHERE md.startDate >= date() - duration({days: $measurementDays})

    WITH p, m,
         count(md) AS fillCount,
         sum(md.daysSupply) AS totalDaysSupply

    WITH p, m.adherenceClass AS medicationClass, fillCount, totalDaysSupply,
         toFloat(totalDaysSupply) / $measurementDays AS estimatedPDC

    WHERE estimatedPDC < $pdcThreshold

    RETURN p.id AS patientId,
           p.firstName + ' ' + p.lastName AS patientName,
           medicationClass,
           fillCount,
           totalDaysSupply,
           round(estimatedPDC * 100) / 100 AS estimatedPDC
    ORDER BY estimatedPDC ASC
  `;

  return readQuery(cypher, { medicationClass, pdcThreshold, measurementDays });
}

// ============================================
// SAFETY QUERIES
// ============================================

/**
 * Get patients on multiple medications (polypharmacy risk)
 */
export async function getPolypharmacyPatients(
  minMedications: number = 5
): Promise<PolypharmacyPatient[]> {
  const cypher = `
    MATCH (p:Patient)-[:HAS_MEDICATION_DISPENSE]->(md:MedicationDispense)
          -[:OF_MEDICATION]->(m:Medication)
    // Only consider active/recent medications
    WHERE md.stopDate IS NULL OR md.stopDate >= date() - duration({days: 90})

    WITH p, collect(DISTINCT m) AS activeMedications
    WHERE size(activeMedications) >= $minMedications

    RETURN p.id AS patientId,
           p.firstName + ' ' + p.lastName AS patientName,
           p.age AS age,
           size(activeMedications) AS medicationCount,
           [m IN activeMedications | m.description] AS medications
    ORDER BY medicationCount DESC
  `;

  return readQuery(cypher, { minMedications });
}

/**
 * Get patient allergies and medications to check for conflicts
 */
export async function getPatientMedicationAllergies(patientId: string): Promise<{
  allergies: Array<{ code: string; description: string; severity: string }>;
  medications: Array<{ code: string; description: string }>;
}> {
  const cypher = `
    MATCH (p:Patient {id: $patientId})
    OPTIONAL MATCH (p)-[ha:HAS_ALLERGY]->(a:Allergy)
    OPTIONAL MATCH (p)-[:HAS_MEDICATION_DISPENSE]->(md:MedicationDispense)
          -[:OF_MEDICATION]->(m:Medication)
    WHERE md.stopDate IS NULL OR md.stopDate >= date()

    WITH p,
         collect(DISTINCT {code: a.code, description: a.description, severity: ha.severity1}) AS allergies,
         collect(DISTINCT {code: m.code, description: m.description}) AS medications

    RETURN [a IN allergies WHERE a.code IS NOT NULL] AS allergies,
           [m IN medications WHERE m.code IS NOT NULL] AS medications
  `;

  const result = await readQuery<{
    allergies: Array<{ code: string; description: string; severity: string }>;
    medications: Array<{ code: string; description: string }>;
  }>(cypher, { patientId });

  return result[0] || { allergies: [], medications: [] };
}

// ============================================
// ANALYTICS QUERIES
// ============================================

/**
 * Get medication class distribution
 */
export async function getMedicationClassDistribution(): Promise<{
  medicationClass: string;
  patientCount: number;
  dispenseCount: number;
}[]> {
  const cypher = `
    MATCH (p:Patient)-[:HAS_MEDICATION_DISPENSE]->(md:MedicationDispense)
          -[:OF_MEDICATION]->(m:Medication)
    WHERE m.adherenceClass IS NOT NULL

    RETURN m.adherenceClass AS medicationClass,
           count(DISTINCT p) AS patientCount,
           count(md) AS dispenseCount
    ORDER BY medicationClass
  `;

  return readQuery(cypher);
}

/**
 * Get condition prevalence
 */
export async function getConditionPrevalence(limit: number = 10): Promise<{
  condition: string;
  patientCount: number;
  activeCount: number;
}[]> {
  const cypher = `
    MATCH (p:Patient)-[r:HAS_CONDITION]->(c:Condition)
    RETURN c.description AS condition,
           count(DISTINCT p) AS patientCount,
           count(CASE WHEN r.isActive THEN 1 END) AS activeCount
    ORDER BY patientCount DESC
    LIMIT $limit
  `;

  return readQuery(cypher, { limit });
}

/**
 * Get provider activity summary
 */
export async function getProviderActivity(limit: number = 10): Promise<{
  providerId: string;
  providerName: string;
  specialty: string;
  encounterCount: number;
  patientCount: number;
}[]> {
  const cypher = `
    MATCH (e:Encounter)-[:WITH_PROVIDER]->(prov:Provider)
    MATCH (p:Patient)-[:HAS_ENCOUNTER]->(e)

    RETURN prov.id AS providerId,
           prov.name AS providerName,
           prov.speciality AS specialty,
           count(DISTINCT e) AS encounterCount,
           count(DISTINCT p) AS patientCount
    ORDER BY encounterCount DESC
    LIMIT $limit
  `;

  return readQuery(cypher, { limit });
}

// ============================================
// GRAPH EXPLORATION (for Bloom-like views)
// ============================================

/**
 * Get patient neighborhood (1-2 hops) for visualization
 */
export async function getPatientNeighborhood(
  patientId: string,
  maxDepth: number = 2
): Promise<{
  nodes: Array<{ id: string; labels: string[]; properties: Record<string, unknown> }>;
  relationships: Array<{ source: string; target: string; type: string; properties: Record<string, unknown> }>;
}> {
  const cypher = `
    MATCH (p:Patient {id: $patientId})
    CALL apoc.path.subgraphAll(p, {
      maxLevel: $maxDepth,
      relationshipFilter: 'HAS_MEDICATION_DISPENSE|OF_MEDICATION|HAS_CONDITION|HAS_ALLERGY|HAS_ENCOUNTER>',
      limit: 100
    })
    YIELD nodes, relationships

    RETURN [n IN nodes | {
      id: id(n),
      labels: labels(n),
      properties: properties(n)
    }] AS nodes,
    [r IN relationships | {
      source: id(startNode(r)),
      target: id(endNode(r)),
      type: type(r),
      properties: properties(r)
    }] AS relationships
  `;

  try {
    const result = await readQuery<{
      nodes: Array<{ id: string; labels: string[]; properties: Record<string, unknown> }>;
      relationships: Array<{ source: string; target: string; type: string; properties: Record<string, unknown> }>;
    }>(cypher, { patientId, maxDepth });

    return result[0] || { nodes: [], relationships: [] };
  } catch {
    // Fallback if APOC is not available
    console.warn('APOC not available, using basic query');
    return { nodes: [], relationships: [] };
  }
}
