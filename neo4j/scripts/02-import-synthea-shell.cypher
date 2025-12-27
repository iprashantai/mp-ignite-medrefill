// ============================================
// Synthea CSV Import Script (for cypher-shell)
// Simplified version without :auto transactions
// ============================================

// STEP 1: Import Organizations
LOAD CSV WITH HEADERS FROM 'file:///organizations.csv' AS row
MERGE (o:Organization {id: row.Id})
SET o.name = row.NAME,
    o.address = row.ADDRESS,
    o.city = row.CITY,
    o.state = row.STATE,
    o.zip = row.ZIP;

// STEP 2: Import Payers
LOAD CSV WITH HEADERS FROM 'file:///payers.csv' AS row
MERGE (p:Payer {id: row.Id})
SET p.name = row.NAME;

// STEP 3: Import Providers
LOAD CSV WITH HEADERS FROM 'file:///providers.csv' AS row
MERGE (p:Provider {id: row.Id})
SET p.name = row.NAME,
    p.gender = row.GENDER,
    p.speciality = row.SPECIALITY;

// Link Providers to Organizations
LOAD CSV WITH HEADERS FROM 'file:///providers.csv' AS row
MATCH (p:Provider {id: row.Id})
MATCH (o:Organization {id: row.ORGANIZATION})
MERGE (p)-[:WORKS_AT]->(o);

// STEP 4: Import Patients
LOAD CSV WITH HEADERS FROM 'file:///patients.csv' AS row
MERGE (p:Patient {id: row.Id})
SET p.birthDate = date(row.BIRTHDATE),
    p.firstName = row.FIRST,
    p.lastName = row.LAST,
    p.gender = row.GENDER,
    p.race = row.RACE,
    p.ethnicity = row.ETHNICITY,
    p.city = row.CITY,
    p.state = row.STATE,
    p.zip = row.ZIP,
    p.healthcareExpenses = toFloat(row.HEALTHCARE_EXPENSES),
    p.healthcareCoverage = toFloat(row.HEALTHCARE_COVERAGE),
    p.income = toFloat(row.INCOME);

// STEP 5: Import Conditions
LOAD CSV WITH HEADERS FROM 'file:///conditions.csv' AS row
MERGE (c:Condition {code: row.CODE})
SET c.description = row.DESCRIPTION;

// Link Conditions to Patients
LOAD CSV WITH HEADERS FROM 'file:///conditions.csv' AS row
MATCH (p:Patient {id: row.PATIENT})
MATCH (c:Condition {code: row.CODE})
MERGE (p)-[r:HAS_CONDITION]->(c)
SET r.startDate = date(substring(row.START, 0, 10)),
    r.isActive = (row.STOP IS NULL OR row.STOP = '');

// STEP 6: Import Medications (unique codes)
LOAD CSV WITH HEADERS FROM 'file:///medications.csv' AS row
WITH DISTINCT row.CODE AS code, row.DESCRIPTION AS description
MERGE (m:Medication {code: code})
SET m.description = description,
    m.adherenceClass = CASE
      WHEN description CONTAINS 'metformin' OR description CONTAINS 'Metformin' THEN 'MAD'
      WHEN description CONTAINS 'insulin' OR description CONTAINS 'Insulin' THEN 'MAD'
      WHEN description CONTAINS 'glipizide' OR description CONTAINS 'glyburide' THEN 'MAD'
      WHEN description CONTAINS 'atorvastatin' OR description CONTAINS 'Atorvastatin' THEN 'MAC'
      WHEN description CONTAINS 'simvastatin' OR description CONTAINS 'Simvastatin' THEN 'MAC'
      WHEN description CONTAINS 'rosuvastatin' OR description CONTAINS 'Rosuvastatin' THEN 'MAC'
      WHEN description CONTAINS 'lisinopril' OR description CONTAINS 'Lisinopril' THEN 'MAH'
      WHEN description CONTAINS 'losartan' OR description CONTAINS 'Losartan' THEN 'MAH'
      WHEN description CONTAINS 'amlodipine' OR description CONTAINS 'Amlodipine' THEN 'MAH'
      WHEN description CONTAINS 'hydrochlorothiazide' THEN 'MAH'
      ELSE null
    END;

// STEP 7: Import MedicationDispenses
LOAD CSV WITH HEADERS FROM 'file:///medications.csv' AS row
WITH row, row.PATIENT + '-' + row.CODE + '-' + row.START AS dispenseId
MERGE (md:MedicationDispense {id: dispenseId})
SET md.startDate = datetime(row.START),
    md.dispenses = toInteger(row.DISPENSES),
    md.daysSupply = CASE WHEN toInteger(row.DISPENSES) > 0 THEN toInteger(row.DISPENSES) * 30 ELSE 30 END,
    md.baseCost = toFloat(row.BASE_COST),
    md.totalCost = toFloat(row.TOTALCOST),
    md.patientId = row.PATIENT,
    md.medicationCode = row.CODE;

// Link MedicationDispenses to Patients
MATCH (md:MedicationDispense)
MATCH (p:Patient {id: md.patientId})
MERGE (p)-[:HAS_MEDICATION_DISPENSE]->(md);

// Link MedicationDispenses to Medications
MATCH (md:MedicationDispense)
MATCH (m:Medication {code: md.medicationCode})
MERGE (md)-[:OF_MEDICATION]->(m);

// STEP 8: Import Allergies
LOAD CSV WITH HEADERS FROM 'file:///allergies.csv' AS row
MERGE (a:Allergy {code: row.CODE})
SET a.description = row.DESCRIPTION,
    a.category = row.CATEGORY;

// Link Allergies to Patients
LOAD CSV WITH HEADERS FROM 'file:///allergies.csv' AS row
MATCH (p:Patient {id: row.PATIENT})
MATCH (a:Allergy {code: row.CODE})
MERGE (p)-[r:HAS_ALLERGY]->(a)
SET r.startDate = date(substring(row.START, 0, 10)),
    r.severity1 = row.SEVERITY1;
