// ============================================
// Neo4j Constraints and Indexes for Ignite Health
// Run this BEFORE importing data
// ============================================

// ============================================
// CONSTRAINTS (Creates implicit indexes)
// ============================================

// Patient - unique by Synthea ID
CREATE CONSTRAINT patient_id IF NOT EXISTS
FOR (p:Patient) REQUIRE p.id IS UNIQUE;

// Medication - unique by RxNorm code
CREATE CONSTRAINT medication_code IF NOT EXISTS
FOR (m:Medication) REQUIRE m.code IS UNIQUE;

// Encounter - unique by ID
CREATE CONSTRAINT encounter_id IF NOT EXISTS
FOR (e:Encounter) REQUIRE e.id IS UNIQUE;

// Condition - unique by SNOMED code
CREATE CONSTRAINT condition_code IF NOT EXISTS
FOR (c:Condition) REQUIRE c.code IS UNIQUE;

// Provider - unique by ID
CREATE CONSTRAINT provider_id IF NOT EXISTS
FOR (p:Provider) REQUIRE p.id IS UNIQUE;

// Organization - unique by ID
CREATE CONSTRAINT organization_id IF NOT EXISTS
FOR (o:Organization) REQUIRE o.id IS UNIQUE;

// Payer - unique by ID
CREATE CONSTRAINT payer_id IF NOT EXISTS
FOR (p:Payer) REQUIRE p.id IS UNIQUE;

// Allergy - unique by code
CREATE CONSTRAINT allergy_code IF NOT EXISTS
FOR (a:Allergy) REQUIRE a.code IS UNIQUE;

// ============================================
// ADDITIONAL INDEXES (For query performance)
// ============================================

// Patient indexes
CREATE INDEX patient_name IF NOT EXISTS
FOR (p:Patient) ON (p.lastName, p.firstName);

CREATE INDEX patient_birthdate IF NOT EXISTS
FOR (p:Patient) ON (p.birthDate);

CREATE INDEX patient_gender IF NOT EXISTS
FOR (p:Patient) ON (p.gender);

// Medication indexes
CREATE INDEX medication_description IF NOT EXISTS
FOR (m:Medication) ON (m.description);

CREATE INDEX medication_adherence_class IF NOT EXISTS
FOR (m:Medication) ON (m.adherenceClass);

// MedicationDispense indexes
CREATE INDEX dispense_start IF NOT EXISTS
FOR (md:MedicationDispense) ON (md.startDate);

CREATE INDEX dispense_patient IF NOT EXISTS
FOR (md:MedicationDispense) ON (md.patientId);

// Encounter indexes
CREATE INDEX encounter_start IF NOT EXISTS
FOR (e:Encounter) ON (e.startDateTime);

CREATE INDEX encounter_class IF NOT EXISTS
FOR (e:Encounter) ON (e.encounterClass);

// Condition indexes
CREATE INDEX condition_description IF NOT EXISTS
FOR (c:Condition) ON (c.description);

// Provider indexes
CREATE INDEX provider_speciality IF NOT EXISTS
FOR (p:Provider) ON (p.speciality);

// ============================================
// FULL-TEXT SEARCH INDEXES (For Bloom)
// ============================================

CREATE FULLTEXT INDEX patient_search IF NOT EXISTS
FOR (p:Patient) ON EACH [p.firstName, p.lastName];

CREATE FULLTEXT INDEX medication_search IF NOT EXISTS
FOR (m:Medication) ON EACH [m.description];

CREATE FULLTEXT INDEX condition_search IF NOT EXISTS
FOR (c:Condition) ON EACH [c.description];
