#!/usr/bin/env npx tsx
/**
 * Phase 1 Verification Script
 *
 * This script verifies the Phase 1 Core Engine implementation by:
 * 1. Connecting to Medplum
 * 2. Checking SearchParameters are deployed
 * 3. Fetching real patient/dispense data
 * 4. Running PDC calculations
 * 5. Testing fragility tier determination
 *
 * Run with: npx tsx scripts/verify-phase1.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { MedplumClient } from '@medplum/core';
import type { Patient, MedicationDispense } from '@medplum/fhirtypes';
import type { IClientStorage } from '@medplum/core';

// Simple in-memory storage for Node.js
class MemoryStorage implements IClientStorage {
  private data: Record<string, string> = {};

  clear(): void {
    this.data = {};
  }

  getString(key: string): string | undefined {
    return this.data[key];
  }

  setString(key: string, value: string): void {
    this.data[key] = value;
  }

  getObject<T>(key: string): T | undefined {
    const str = this.getString(key);
    return str ? JSON.parse(str) : undefined;
  }

  setObject<T>(key: string, value: T): void {
    this.setString(key, JSON.stringify(value));
  }

  makeKey(...parts: string[]): string {
    return parts.join(':');
  }
}

// Import Phase 1 modules
import {
  calculatePDCFromDispenses,
  calculateFragility,
  PDC_THRESHOLDS,
  type PDCResult,
} from '../src/lib/pdc';

import {
  extractFillDate,
  SEARCH_PARAMETERS,
} from '../src/lib/fhir';

// =============================================================================
// Configuration
// =============================================================================

const MEDPLUM_BASE_URL =
  process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';
const MEDPLUM_CLIENT_ID = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
const MEDPLUM_CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET;

// =============================================================================
// Helpers
// =============================================================================

function log(section: string, message: string, data?: unknown) {
  console.log(`\n[${section}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function success(message: string) {
  console.log(`  ✅ ${message}`);
}

function warn(message: string) {
  console.log(`  ⚠️  ${message}`);
}

function error(message: string) {
  console.log(`  ❌ ${message}`);
}

// =============================================================================
// Verification Steps
// =============================================================================

async function verifyConnection(medplum: MedplumClient): Promise<boolean> {
  log('CONNECTION', 'Testing Medplum connection...');

  try {
    const profile = medplum.getProfile();
    if (profile) {
      success(`Connected as: ${profile.resourceType}/${profile.id}`);
      return true;
    } else {
      warn('No profile found - may need to authenticate');
      return false;
    }
  } catch (e) {
    error(`Connection failed: ${e}`);
    return false;
  }
}

async function verifySearchParameters(
  medplum: MedplumClient
): Promise<boolean> {
  log('SEARCH_PARAMS', 'Checking custom SearchParameters...');

  let allDeployed = true;

  for (const sp of SEARCH_PARAMETERS) {
    try {
      const existing = await medplum.searchOne('SearchParameter', {
        url: sp.url,
      });

      if (existing) {
        success(`SearchParameter deployed: ${sp.name}`);
      } else {
        warn(`SearchParameter NOT deployed: ${sp.name}`);
        allDeployed = false;
      }
    } catch (e) {
      error(`Failed to check ${sp.name}: ${e}`);
      allDeployed = false;
    }
  }

  return allDeployed;
}

async function fetchPatientData(
  medplum: MedplumClient
): Promise<{ patient: Patient; dispenses: MedicationDispense[] } | null> {
  log('PATIENTS', 'Fetching patients with dispenses...');

  try {
    // First, check if there are ANY MedicationDispenses in the system
    const anyDispenses = await medplum.searchResources('MedicationDispense', {
      status: 'completed',
      _count: '1',
    });

    if (anyDispenses.length === 0) {
      warn('No MedicationDispense records found in the system');
      warn('You may need to load Synthea or sample data first');
      return null;
    }

    // Get the patient from the dispense
    const dispense = anyDispenses[0];
    const patientRef = dispense.subject?.reference;

    if (!patientRef) {
      warn('Dispense found but no patient reference');
      return null;
    }

    // Extract patient ID
    const patientId = patientRef.replace('Patient/', '');
    const patient = await medplum.readResource('Patient', patientId);

    success(`Found patient with dispenses: ${patient.id}`);
    log(
      'PATIENTS',
      `Patient: ${patient.id}`,
      patient.name?.[0]
        ? {
            given: patient.name[0].given,
            family: patient.name[0].family,
          }
        : 'No name'
    );

    // Fetch all dispenses for this patient
    const dispenses = await medplum.searchResources('MedicationDispense', {
      subject: `Patient/${patientId}`,
      status: 'completed',
      _count: '200',
    });

    success(`Found ${dispenses.length} dispenses for this patient`);

    return { patient, dispenses };
  } catch (e) {
    error(`Failed to fetch patients: ${e}`);
    return null;
  }
}

async function testPDCCalculation(
  dispenses: MedicationDispense[]
): Promise<PDCResult | null> {
  log('PDC_CALC', 'Testing PDC calculation with real data...');

  if (dispenses.length === 0) {
    warn('No dispenses to calculate PDC');
    return null;
  }

  try {
    // Get measurement year from dispenses
    const firstFillDate = extractFillDate(dispenses[0]);
    const year = firstFillDate?.getFullYear() ?? new Date().getFullYear();

    // Use the dispense-based PDC calculator
    const result = calculatePDCFromDispenses(dispenses, year, new Date());

    success('PDC calculation successful!');
    log('PDC_CALC', 'PDC Result:', {
      pdc: result.pdc.toFixed(1) + '%',
      coveredDays: result.coveredDays,
      treatmentDays: result.treatmentDays,
      gapDaysUsed: result.gapDaysUsed,
      gapDaysRemaining: result.gapDaysRemaining,
      pdcStatusQuo: result.pdcStatusQuo.toFixed(1) + '%',
      pdcPerfect: result.pdcPerfect.toFixed(1) + '%',
      daysUntilRunout: result.daysUntilRunout,
      refillsNeeded: result.refillsNeeded,
    });

    // Determine status
    if (result.pdc >= PDC_THRESHOLDS.PASSING) {
      success(`PDC Status: PASSING (≥${PDC_THRESHOLDS.PASSING}%)`);
    } else if (result.pdc >= PDC_THRESHOLDS.AT_RISK) {
      warn(`PDC Status: AT-RISK (${PDC_THRESHOLDS.AT_RISK}-${PDC_THRESHOLDS.PASSING - 1}%)`);
    } else {
      error(`PDC Status: FAILING (<${PDC_THRESHOLDS.AT_RISK}%)`);
    }

    return result;
  } catch (e) {
    error(`PDC calculation failed: ${e}`);
    console.error(e);
    return null;
  }
}

function testFragilityCalculation(pdcResult: PDCResult): void {
  log('FRAGILITY', 'Testing fragility tier calculation...');

  try {
    const currentDate = new Date();

    const fragility = calculateFragility({
      pdcResult,
      refillsRemaining: pdcResult.refillsNeeded,
      measureTypes: ['MAC'], // Default to one measure for testing
      isNewPatient: false,
      currentDate,
    });

    success('Fragility calculation successful!');
    log('FRAGILITY', 'Fragility Result:', {
      tier: fragility.tier,
      tierLevel: fragility.tierLevel,
      delayBudgetPerRefill: fragility.delayBudgetPerRefill.toFixed(1),
      contactWindow: fragility.contactWindow,
      action: fragility.action,
      priorityScore: fragility.priorityScore,
      urgencyLevel: fragility.urgencyLevel,
      bonuses: fragility.bonuses,
    });

    // Show tier meaning
    const tierDescriptions: Record<string, string> = {
      COMPLIANT: 'Patient is already meeting 80% adherence threshold',
      F1_IMMINENT: 'CRITICAL - Immediate outreach required within 24 hours',
      F2_FRAGILE: 'HIGH RISK - Contact within 48 hours',
      F3_MODERATE: 'MODERATE - Contact within 1 week',
      F4_COMFORTABLE: 'STABLE - Contact within 2 weeks',
      F5_SAFE: 'SAFE - Monthly check-in sufficient',
      T5_UNSALVAGEABLE: 'LOST - Cannot reach 80% this year',
    };

    console.log(`\n  📋 Tier Meaning: ${tierDescriptions[fragility.tier] || 'Unknown'}`);
  } catch (e) {
    error(`Fragility calculation failed: ${e}`);
    console.error(e);
  }
}

// =============================================================================
// Summary Report
// =============================================================================

function printSummary(results: {
  connection: boolean;
  searchParams: boolean;
  hasPatients: boolean;
  hasDispenses: boolean;
  pdcWorking: boolean;
}) {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('PHASE 1 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log('');

  const checks = [
    { name: 'Medplum Connection', status: results.connection },
    { name: 'SearchParameters Deployed', status: results.searchParams },
    { name: 'Patient Data Available', status: results.hasPatients },
    { name: 'Dispense Data Available', status: results.hasDispenses },
    { name: 'PDC Calculation Working', status: results.pdcWorking },
  ];

  for (const check of checks) {
    console.log(`  ${check.status ? '✅' : '❌'} ${check.name}`);
  }

  const allPassed = Object.values(results).every((v) => v);

  console.log('');
  if (allPassed) {
    console.log('🎉 PHASE 1 VERIFICATION PASSED!');
    console.log('   All core engine components are working correctly.');
  } else {
    console.log('⚠️  PHASE 1 VERIFICATION INCOMPLETE');
    console.log('   Some components need attention (see above).');
  }
  console.log('');
  console.log('='.repeat(60));
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('PHASE 1 CORE ENGINE VERIFICATION');
  console.log('='.repeat(60));

  const results = {
    connection: false,
    searchParams: false,
    hasPatients: false,
    hasDispenses: false,
    pdcWorking: false,
  };

  // Initialize Medplum client with memory storage for Node.js
  const medplum = new MedplumClient({
    baseUrl: MEDPLUM_BASE_URL,
    clientId: MEDPLUM_CLIENT_ID,
    storage: new MemoryStorage(),
  });

  // Try to authenticate if we have credentials
  if (MEDPLUM_CLIENT_SECRET) {
    try {
      await medplum.startClientLogin(MEDPLUM_CLIENT_ID!, MEDPLUM_CLIENT_SECRET);
      success('Client credentials authentication successful');
      results.connection = true;
    } catch (e) {
      warn(`Client auth failed: ${e}`);
      console.log('\nTo authenticate, you can:');
      console.log('1. Set MEDPLUM_CLIENT_SECRET in .env.local');
      console.log('2. Or run the app and login via browser first');
    }
  } else {
    console.log('\n💡 No MEDPLUM_CLIENT_SECRET found.');
    console.log('   For full verification, add it to .env.local');
    console.log('   Or run the dev server and login via browser.\n');
  }

  // Step 1: Verify connection
  if (!results.connection) {
    results.connection = await verifyConnection(medplum);
  }

  // Step 2: Check SearchParameters
  if (results.connection) {
    results.searchParams = await verifySearchParameters(medplum);

    // Offer to deploy if not all present
    if (!results.searchParams) {
      console.log('\n💡 To deploy SearchParameters, run:');
      console.log('   npx tsx scripts/deploy-search-params.ts');
    }
  }

  // Step 3: Fetch patient with dispense data
  if (results.connection) {
    const patientData = await fetchPatientData(medplum);
    results.hasPatients = !!patientData?.patient;
    results.hasDispenses = (patientData?.dispenses?.length ?? 0) > 0;

    // Step 4: Test PDC calculation
    if (patientData && patientData.dispenses.length > 0) {
      const pdcResult = await testPDCCalculation(patientData.dispenses);
      if (pdcResult) {
        results.pdcWorking = true;
        // Step 5: Test fragility calculation
        testFragilityCalculation(pdcResult);
      }
    }
  }

  // Print summary
  printSummary(results);
}

main().catch(console.error);
