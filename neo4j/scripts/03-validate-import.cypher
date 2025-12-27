// ============================================
// Validation Queries for Neo4j Import
// Run after 02-import-synthea.cypher to verify data
// ============================================

// ============================================
// NODE COUNTS
// ============================================
MATCH (n)
WITH labels(n)[0] AS nodeType, count(n) AS count
RETURN nodeType, count
ORDER BY count DESC;

// ============================================
// RELATIONSHIP COUNTS
// ============================================
MATCH ()-[r]->()
WITH type(r) AS relType, count(r) AS count
RETURN relType, count
ORDER BY count DESC;

// ============================================
// PATIENT STATISTICS
// ============================================
MATCH (p:Patient)
RETURN
  count(p) AS totalPatients,
  count(CASE WHEN p.gender = 'M' THEN 1 END) AS male,
  count(CASE WHEN p.gender = 'F' THEN 1 END) AS female,
  avg(p.age) AS avgAge,
  min(p.age) AS minAge,
  max(p.age) AS maxAge;

// ============================================
// MEDICATION ADHERENCE CLASSES
// ============================================
MATCH (m:Medication)
WHERE m.adherenceClass IS NOT NULL
RETURN m.adherenceClass AS class,
       count(m) AS medications,
       collect(m.description)[0..3] AS examples
ORDER BY class;

// ============================================
// PATIENTS WITH ADHERENCE MEDICATIONS
// ============================================
MATCH (p:Patient)-[:HAS_MEDICATION_DISPENSE]->(md:MedicationDispense)-[:OF_MEDICATION]->(m:Medication)
WHERE m.adherenceClass IS NOT NULL
RETURN m.adherenceClass AS medicationClass,
       count(DISTINCT p) AS patientCount,
       count(md) AS dispenseCount
ORDER BY medicationClass;

// ============================================
// MEDICATION GAPS (PDC Analysis)
// ============================================
MATCH ()-[f:FOLLOWED_BY]->()
WHERE f.isGap = true
RETURN
  count(f) AS totalGaps,
  avg(f.gapDays) AS avgGapDays,
  min(f.gapDays) AS minGap,
  max(f.gapDays) AS maxGap;

// ============================================
// TOP CONDITIONS
// ============================================
MATCH (p:Patient)-[r:HAS_CONDITION]->(c:Condition)
RETURN c.description AS condition,
       count(DISTINCT p) AS patientCount,
       count(CASE WHEN r.isActive THEN 1 END) AS activeCount
ORDER BY patientCount DESC
LIMIT 10;

// ============================================
// PROVIDER SPECIALTIES
// ============================================
MATCH (p:Provider)
RETURN p.speciality AS specialty, count(p) AS count
ORDER BY count DESC
LIMIT 10;

// ============================================
// ENCOUNTER TYPES
// ============================================
MATCH (e:Encounter)
RETURN e.encounterClass AS type, count(e) AS count
ORDER BY count DESC;

// ============================================
// ORPHAN CHECK (should be minimal or zero)
// ============================================
MATCH (n)
WHERE NOT (n)--()
WITH labels(n)[0] AS type, count(n) AS orphans
WHERE orphans > 0
RETURN type, orphans;

// ============================================
// SAMPLE PATIENT GRAPH (for visual verification)
// ============================================
MATCH (p:Patient)
WITH p LIMIT 1
MATCH path = (p)-[*1..2]-(connected)
RETURN path;
