// ============================================
// Synthea CSV Import Script for Ignite Health
// Imports ~391K records from CSV files
// Run AFTER 01-create-constraints.cypher
// ============================================

// ============================================
// STEP 1: Import Organizations (750 rows)
// ============================================
:auto LOAD CSV WITH HEADERS FROM 'file:///organizations.csv' AS row
CALL {
  WITH row
  MERGE (o:Organization {id: row.Id})
  SET o.name = row.NAME,
      o.address = row.ADDRESS,
      o.city = row.CITY,
      o.state = row.STATE,
      o.zip = row.ZIP,
      o.phone = row.PHONE,
      o.lat = toFloat(row.LAT),
      o.lon = toFloat(row.LON),
      o.revenue = toFloat(row.REVENUE),
      o.utilization = toInteger(row.UTILIZATION)
} IN TRANSACTIONS OF 500 ROWS;

// ============================================
// STEP 2: Import Payers (11 rows)
// ============================================
LOAD CSV WITH HEADERS FROM 'file:///payers.csv' AS row
MERGE (p:Payer {id: row.Id})
SET p.name = row.NAME,
    p.ownership = row.OWNERSHIP;

// ============================================
// STEP 3: Import Providers (750 rows)
// ============================================
:auto LOAD CSV WITH HEADERS FROM 'file:///providers.csv' AS row
CALL {
  WITH row
  MERGE (p:Provider {id: row.Id})
  SET p.name = row.NAME,
      p.gender = row.GENDER,
      p.speciality = row.SPECIALITY,
      p.address = row.ADDRESS,
      p.city = row.CITY,
      p.state = row.STATE,
      p.zip = row.ZIP,
      p.encounterCount = toInteger(row.ENCOUNTERS),
      p.procedureCount = toInteger(row.PROCEDURES)
  WITH p, row
  MATCH (o:Organization {id: row.ORGANIZATION})
  MERGE (p)-[:WORKS_AT]->(o)
} IN TRANSACTIONS OF 500 ROWS;

// ============================================
// STEP 4: Import Patients (618 rows)
// ============================================
:auto LOAD CSV WITH HEADERS FROM 'file:///patients.csv' AS row
CALL {
  WITH row
  MERGE (p:Patient {id: row.Id})
  SET p.birthDate = date(row.BIRTHDATE),
      p.deathDate = CASE WHEN row.DEATHDATE IS NOT NULL AND row.DEATHDATE <> ''
                         THEN date(row.DEATHDATE) ELSE null END,
      p.ssn = row.SSN,
      p.drivers = row.DRIVERS,
      p.passport = row.PASSPORT,
      p.prefix = row.PREFIX,
      p.firstName = row.FIRST,
      p.lastName = row.LAST,
      p.suffix = row.SUFFIX,
      p.maiden = row.MAIDEN,
      p.marital = row.MARITAL,
      p.race = row.RACE,
      p.ethnicity = row.ETHNICITY,
      p.gender = row.GENDER,
      p.birthPlace = row.BIRTHPLACE,
      p.address = row.ADDRESS,
      p.city = row.CITY,
      p.state = row.STATE,
      p.county = row.COUNTY,
      p.fips = row.FIPS,
      p.zip = row.ZIP,
      p.lat = toFloat(row.LAT),
      p.lon = toFloat(row.LON),
      p.healthcareExpenses = toFloat(row.HEALTHCARE_EXPENSES),
      p.healthcareCoverage = toFloat(row.HEALTHCARE_COVERAGE),
      p.income = toFloat(row.INCOME),
      p.age = duration.between(date(row.BIRTHDATE), date()).years
} IN TRANSACTIONS OF 100 ROWS;

// ============================================
// STEP 5: Import Encounters (12,463 rows)
// ============================================
:auto LOAD CSV WITH HEADERS FROM 'file:///encounters.csv' AS row
CALL {
  WITH row
  MERGE (e:Encounter {id: row.Id})
  SET e.startDateTime = datetime(row.START),
      e.stopDateTime = CASE WHEN row.STOP IS NOT NULL AND row.STOP <> ''
                            THEN datetime(row.STOP) ELSE null END,
      e.encounterClass = row.ENCOUNTERCLASS,
      e.code = row.CODE,
      e.description = row.DESCRIPTION,
      e.baseCost = toFloat(row.BASE_ENCOUNTER_COST),
      e.totalCost = toFloat(row.TOTAL_CLAIM_COST),
      e.payerCoverage = toFloat(row.PAYER_COVERAGE),
      e.reasonCode = row.REASONCODE,
      e.reasonDescription = row.REASONDESCRIPTION,
      e.patientId = row.PATIENT
  WITH e, row
  MATCH (p:Patient {id: row.PATIENT})
  MERGE (p)-[:HAS_ENCOUNTER]->(e)
  WITH e, row
  MATCH (org:Organization {id: row.ORGANIZATION})
  MERGE (e)-[:AT_ORGANIZATION]->(org)
  WITH e, row
  MATCH (prov:Provider {id: row.PROVIDER})
  MERGE (e)-[:WITH_PROVIDER]->(prov)
  WITH e, row
  MATCH (payer:Payer {id: row.PAYER})
  MERGE (e)-[:COVERED_BY]->(payer)
} IN TRANSACTIONS OF 500 ROWS;

// ============================================
// STEP 6: Import Conditions (11,082 rows)
// ============================================
:auto LOAD CSV WITH HEADERS FROM 'file:///conditions.csv' AS row
CALL {
  WITH row
  MERGE (c:Condition {code: row.CODE})
  SET c.description = row.DESCRIPTION,
      c.system = row.SYSTEM
  WITH c, row
  MATCH (p:Patient {id: row.PATIENT})
  MERGE (p)-[r:HAS_CONDITION]->(c)
  SET r.startDate = date(substring(row.START, 0, 10)),
      r.stopDate = CASE WHEN row.STOP IS NOT NULL AND row.STOP <> ''
                        THEN date(substring(row.STOP, 0, 10)) ELSE null END,
      r.isActive = (row.STOP IS NULL OR row.STOP = ''),
      r.encounterId = row.ENCOUNTER
} IN TRANSACTIONS OF 500 ROWS;

// ============================================
// STEP 7: Import Medications (Unique drug codes)
// ============================================
:auto LOAD CSV WITH HEADERS FROM 'file:///medications.csv' AS row
WITH DISTINCT row.CODE AS code, row.DESCRIPTION AS description
CALL {
  WITH code, description
  MERGE (m:Medication {code: code})
  SET m.description = description,
      // Classify medications for HEDIS adherence measures
      m.adherenceClass = CASE
        // MAD - Diabetes medications (Biguanides, Sulfonylureas, Thiazolidinediones, DPP-4, SGLT2, GLP-1)
        WHEN description CONTAINS 'metformin' THEN 'MAD'
        WHEN description CONTAINS 'Metformin' THEN 'MAD'
        WHEN description CONTAINS 'glipizide' THEN 'MAD'
        WHEN description CONTAINS 'glyburide' THEN 'MAD'
        WHEN description CONTAINS 'glimepiride' THEN 'MAD'
        WHEN description CONTAINS 'sitagliptin' THEN 'MAD'
        WHEN description CONTAINS 'linagliptin' THEN 'MAD'
        WHEN description CONTAINS 'empagliflozin' THEN 'MAD'
        WHEN description CONTAINS 'canagliflozin' THEN 'MAD'
        WHEN description CONTAINS 'liraglutide' THEN 'MAD'
        WHEN description CONTAINS 'semaglutide' THEN 'MAD'
        WHEN description CONTAINS 'insulin' THEN 'MAD'
        WHEN description CONTAINS 'Insulin' THEN 'MAD'
        // MAC - Statins (Cholesterol medications)
        WHEN description CONTAINS 'statin' THEN 'MAC'
        WHEN description CONTAINS 'atorvastatin' THEN 'MAC'
        WHEN description CONTAINS 'Atorvastatin' THEN 'MAC'
        WHEN description CONTAINS 'simvastatin' THEN 'MAC'
        WHEN description CONTAINS 'Simvastatin' THEN 'MAC'
        WHEN description CONTAINS 'rosuvastatin' THEN 'MAC'
        WHEN description CONTAINS 'Rosuvastatin' THEN 'MAC'
        WHEN description CONTAINS 'pravastatin' THEN 'MAC'
        WHEN description CONTAINS 'lovastatin' THEN 'MAC'
        WHEN description CONTAINS 'fluvastatin' THEN 'MAC'
        WHEN description CONTAINS 'pitavastatin' THEN 'MAC'
        // MAH - Hypertension (ACE inhibitors, ARBs, Calcium channel blockers, Thiazides)
        WHEN description CONTAINS 'lisinopril' THEN 'MAH'
        WHEN description CONTAINS 'Lisinopril' THEN 'MAH'
        WHEN description CONTAINS 'enalapril' THEN 'MAH'
        WHEN description CONTAINS 'ramipril' THEN 'MAH'
        WHEN description CONTAINS 'benazepril' THEN 'MAH'
        WHEN description CONTAINS 'losartan' THEN 'MAH'
        WHEN description CONTAINS 'Losartan' THEN 'MAH'
        WHEN description CONTAINS 'valsartan' THEN 'MAH'
        WHEN description CONTAINS 'irbesartan' THEN 'MAH'
        WHEN description CONTAINS 'olmesartan' THEN 'MAH'
        WHEN description CONTAINS 'amlodipine' THEN 'MAH'
        WHEN description CONTAINS 'Amlodipine' THEN 'MAH'
        WHEN description CONTAINS 'nifedipine' THEN 'MAH'
        WHEN description CONTAINS 'diltiazem' THEN 'MAH'
        WHEN description CONTAINS 'verapamil' THEN 'MAH'
        WHEN description CONTAINS 'hydrochlorothiazide' THEN 'MAH'
        WHEN description CONTAINS 'chlorthalidone' THEN 'MAH'
        ELSE null
      END
} IN TRANSACTIONS OF 500 ROWS;

// ============================================
// STEP 8: Import MedicationDispenses (9,331 rows)
// ============================================
:auto LOAD CSV WITH HEADERS FROM 'file:///medications.csv' AS row
CALL {
  WITH row
  // Create unique dispense ID from patient + code + start date
  WITH row, row.PATIENT + '-' + row.CODE + '-' + row.START AS dispenseId
  MERGE (md:MedicationDispense {id: dispenseId})
  SET md.startDate = datetime(row.START),
      md.stopDate = CASE WHEN row.STOP IS NOT NULL AND row.STOP <> ''
                         THEN datetime(row.STOP) ELSE null END,
      md.dispenses = toInteger(row.DISPENSES),
      md.daysSupply = CASE
        WHEN toInteger(row.DISPENSES) > 0 THEN toInteger(row.DISPENSES) * 30
        ELSE 30 END,
      md.baseCost = toFloat(row.BASE_COST),
      md.payerCoverage = toFloat(row.PAYER_COVERAGE),
      md.totalCost = toFloat(row.TOTALCOST),
      md.reasonCode = row.REASONCODE,
      md.reasonDescription = row.REASONDESCRIPTION,
      md.patientId = row.PATIENT,
      md.medicationCode = row.CODE
  WITH md, row
  MATCH (p:Patient {id: row.PATIENT})
  MERGE (p)-[:HAS_MEDICATION_DISPENSE]->(md)
  WITH md, row
  MATCH (m:Medication {code: row.CODE})
  MERGE (md)-[:OF_MEDICATION]->(m)
  WITH md, row
  WHERE row.ENCOUNTER IS NOT NULL AND row.ENCOUNTER <> ''
  MATCH (e:Encounter {id: row.ENCOUNTER})
  MERGE (md)-[:DURING_ENCOUNTER]->(e)
  WITH md, row
  WHERE row.PAYER IS NOT NULL AND row.PAYER <> ''
  MATCH (payer:Payer {id: row.PAYER})
  MERGE (md)-[:PAID_BY]->(payer)
} IN TRANSACTIONS OF 500 ROWS;

// ============================================
// STEP 9: Import Allergies (476 rows)
// ============================================
:auto LOAD CSV WITH HEADERS FROM 'file:///allergies.csv' AS row
CALL {
  WITH row
  MERGE (a:Allergy {code: row.CODE})
  SET a.description = row.DESCRIPTION,
      a.system = row.SYSTEM,
      a.type = row.TYPE,
      a.category = row.CATEGORY
  WITH a, row
  MATCH (p:Patient {id: row.PATIENT})
  MERGE (p)-[r:HAS_ALLERGY]->(a)
  SET r.startDate = date(substring(row.START, 0, 10)),
      r.stopDate = CASE WHEN row.STOP IS NOT NULL AND row.STOP <> ''
                        THEN date(substring(row.STOP, 0, 10)) ELSE null END,
      r.severity1 = row.SEVERITY1,
      r.reaction1 = row.REACTION1,
      r.severity2 = row.SEVERITY2,
      r.reaction2 = row.REACTION2
} IN TRANSACTIONS OF 500 ROWS;

// ============================================
// STEP 10: Create Medication Fill Chains (for PDC gap analysis)
// This creates FOLLOWED_BY relationships between consecutive dispenses
// ============================================
:auto MATCH (p:Patient)-[:HAS_MEDICATION_DISPENSE]->(md:MedicationDispense)-[:OF_MEDICATION]->(m:Medication)
WHERE m.adherenceClass IS NOT NULL
WITH p, m, md ORDER BY md.startDate
WITH p, m, collect(md) AS dispenses
WHERE size(dispenses) > 1
CALL {
  WITH dispenses
  UNWIND range(0, size(dispenses) - 2) AS i
  WITH dispenses[i] AS current, dispenses[i+1] AS next
  WITH current, next,
       duration.inDays(
         coalesce(current.stopDate, current.startDate + duration({days: current.daysSupply})),
         next.startDate
       ).days AS gapDays
  MERGE (current)-[r:FOLLOWED_BY]->(next)
  SET r.gapDays = gapDays,
      r.isGap = (gapDays > 0)
} IN TRANSACTIONS OF 100 ROWS;
