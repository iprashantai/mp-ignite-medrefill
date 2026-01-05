#!/usr/bin/env npx tsx
/**
 * Phase 2A Verification Script
 *
 * Verifies that the PDC orchestrator and trigger mechanisms work correctly.
 *
 * Usage:
 *   npx tsx scripts/verify-trigger.ts
 *   npx tsx scripts/verify-trigger.ts --patient-id=abc123
 *   npx tsx scripts/verify-trigger.ts --dry-run
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { MedplumClient, type IClientStorage } from '@medplum/core';
import {
  calculateAndStorePatientPDC,
  calculateBatchPatientPDC,
  groupDispensesByMeasure,
  groupDispensesByMedication,
} from '../src/lib/pdc/orchestrator';
import {
  findPatientsForPDCCalculation,
  generateExecutionId,
  logInfo,
  logError,
  logWarn,
} from '../src/bots/shared/bot-utils';

// Memory storage for MedplumClient (Node.js compatible)
class MemoryStorage implements IClientStorage {
  private data: Record<string, string> = {};
  clear() {
    this.data = {};
  }
  getString(key: string) {
    return this.data[key];
  }
  setString(key: string, value: string) {
    this.data[key] = value;
  }
  getObject<T>(key: string): T | undefined {
    const str = this.getString(key);
    return str ? JSON.parse(str) : undefined;
  }
  setObject<T>(key: string, value: T) {
    this.setString(key, JSON.stringify(value));
  }
  makeKey(...parts: string[]) {
    return parts.join(':');
  }
}

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  // Medplum configuration (reads from .env.local via dotenv)
  medplumBaseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/',
  medplumClientId: process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
  medplumClientSecret: process.env.MEDPLUM_CLIENT_SECRET,

  // Test configuration
  measurementYear: new Date().getFullYear(),
  maxPatientsToProcess: 5, // Limit for verification
};

// =============================================================================
// Parse Arguments
// =============================================================================

interface Args {
  patientId?: string;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(): Args {
  const args: Args = {
    dryRun: false,
    help: false,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--patient-id=')) {
      args.patientId = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Phase 2A Verification Script

Usage:
  npx tsx scripts/verify-trigger.ts [options]

Options:
  --patient-id=ID    Process a specific patient ID
  --dry-run          Run without making any changes
  --help, -h         Show this help message

Environment Variables:
  MEDPLUM_BASE_URL        Medplum API URL (default: https://api.medplum.com/)
  MEDPLUM_CLIENT_ID       Medplum client ID
  MEDPLUM_CLIENT_SECRET   Medplum client secret

Examples:
  npx tsx scripts/verify-trigger.ts
  npx tsx scripts/verify-trigger.ts --patient-id=abc123
  npx tsx scripts/verify-trigger.ts --dry-run
`);
}

// =============================================================================
// Verification Tests
// =============================================================================

async function verifyGroupingFunctions(): Promise<boolean> {
  console.log('\n📦 Verifying Grouping Functions...\n');

  try {
    // Test with mock data (no Medplum needed)
    const mockDispense = {
      resourceType: 'MedicationDispense' as const,
      id: 'test-1',
      status: 'completed' as const,
      subject: { reference: 'Patient/test' },
      medicationCodeableConcept: {
        coding: [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: '310965', // Lisinopril (MAH)
          display: 'Lisinopril 10mg',
        }],
      },
      whenHandedOver: '2025-01-15',
      daysSupply: { value: 30 },
    };

    const grouped = groupDispensesByMeasure([mockDispense as any]);
    const mahGroup = grouped.get('MAH');

    if (!mahGroup || mahGroup.length !== 1) {
      logError('groupDispensesByMeasure failed: MAH group not found');
      return false;
    }

    const byMed = groupDispensesByMedication([mockDispense as any]);
    const lisinopril = byMed.get('310965');

    if (!lisinopril || lisinopril.dispenses.length !== 1) {
      logError('groupDispensesByMedication failed: Lisinopril not found');
      return false;
    }

    logInfo('✅ Grouping functions work correctly');
    return true;
  } catch (error) {
    logError('Grouping functions failed', { error: String(error) });
    return false;
  }
}

async function verifyMedplumConnection(medplum: MedplumClient): Promise<boolean> {
  console.log('\n🔗 Verifying Medplum Connection...\n');

  try {
    // Try to search for patients (just to verify connection)
    const patients = await medplum.searchResources('Patient', { _count: '1' });
    logInfo(`✅ Connected to Medplum. Found ${patients.length > 0 ? 'at least 1' : '0'} patient(s)`);
    return true;
  } catch (error) {
    logError('Failed to connect to Medplum', { error: String(error) });
    return false;
  }
}

async function verifyPatientDiscovery(medplum: MedplumClient): Promise<string[]> {
  console.log('\n🔍 Discovering Patients with Dispenses...\n');

  try {
    const patientIds = await findPatientsForPDCCalculation(medplum);
    logInfo(`Found ${patientIds.length} patients with MedicationDispense records`);

    if (patientIds.length === 0) {
      logWarn('No patients found. Make sure there are MedicationDispense records in the system.');
    }

    return patientIds;
  } catch (error) {
    logError('Patient discovery failed', { error: String(error) });
    return [];
  }
}

async function verifySinglePatientProcessing(
  medplum: MedplumClient,
  patientId: string,
  dryRun: boolean
): Promise<boolean> {
  console.log(`\n👤 Processing Single Patient: ${patientId}...\n`);

  try {
    if (dryRun) {
      logInfo('[DRY RUN] Would process patient', { patientId });
      return true;
    }

    const result = await calculateAndStorePatientPDC(medplum, patientId, {
      measurementYear: CONFIG.measurementYear,
      currentDate: new Date(),
      includeMedicationLevel: true,
      updatePatientExtensions: true,
    });

    if (result.errors.length > 0) {
      logWarn('Patient processed with errors', {
        patientId,
        errors: result.errors,
        measuresCalculated: result.measures.length,
      });
    } else {
      logInfo('✅ Patient processed successfully', {
        patientId,
        measuresCalculated: result.measures.length,
        medications: result.measures.reduce((sum, m) => sum + m.medications.length, 0),
      });
    }

    // Display measure details
    for (const measure of result.measures) {
      console.log(`   - ${measure.measure}: PDC=${measure.pdc.toFixed(1)}%, Tier=${measure.fragilityTier}`);
      for (const med of measure.medications) {
        console.log(`     └─ ${med.displayName}: PDC=${med.pdc.toFixed(1)}%`);
      }
    }

    return result.errors.length === 0 && result.measures.length > 0;
  } catch (error) {
    logError('Single patient processing failed', { patientId, error: String(error) });
    return false;
  }
}

async function verifyBatchProcessing(
  medplum: MedplumClient,
  patientIds: string[],
  dryRun: boolean
): Promise<boolean> {
  console.log(`\n📋 Processing Batch of ${patientIds.length} Patients...\n`);

  try {
    if (dryRun) {
      logInfo('[DRY RUN] Would process batch', { patientCount: patientIds.length });
      return true;
    }

    const result = await calculateBatchPatientPDC(
      medplum,
      patientIds,
      {
        measurementYear: CONFIG.measurementYear,
        includeMedicationLevel: true,
        updatePatientExtensions: true,
      },
      (current, total, id) => {
        console.log(`   Progress: ${current}/${total} - ${id}`);
      }
    );

    logInfo('✅ Batch processing completed', {
      totalPatients: result.totalPatients,
      successCount: result.successCount,
      errorCount: result.errorCount,
      durationMs: result.duration,
    });

    // Consider success if at least one patient was processed successfully
    // (some patients may have no MA-qualifying medications)
    return result.successCount > 0;
  } catch (error) {
    logError('Batch processing failed', { error: String(error) });
    return false;
  }
}

// =============================================================================
// Main Verification Flow
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('          Phase 2A Verification: PDC Triggers');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Execution ID: ${generateExecutionId()}`);
  console.log(`Measurement Year: ${CONFIG.measurementYear}`);
  console.log(`Dry Run: ${args.dryRun}`);
  console.log('═══════════════════════════════════════════════════════════════');

  const results: Record<string, boolean> = {};

  // Test 1: Grouping functions (no Medplum needed)
  results['Grouping Functions'] = await verifyGroupingFunctions();

  // Check if Medplum credentials are available
  if (!CONFIG.medplumClientId || !CONFIG.medplumClientSecret) {
    console.log('\n⚠️  Skipping Medplum tests: MEDPLUM_CLIENT_ID and MEDPLUM_CLIENT_SECRET not set');
    console.log('   Set these environment variables to test with a real Medplum instance.\n');
  } else {
    // Initialize Medplum client with memory storage for Node.js
    const medplum = new MedplumClient({
      baseUrl: CONFIG.medplumBaseUrl,
      clientId: CONFIG.medplumClientId,
      storage: new MemoryStorage(),
    });

    try {
      await medplum.startClientLogin(CONFIG.medplumClientId, CONFIG.medplumClientSecret);

      // Test 2: Medplum connection
      results['Medplum Connection'] = await verifyMedplumConnection(medplum);

      if (results['Medplum Connection']) {
        // Test 3: Patient discovery
        const patientIds = await verifyPatientDiscovery(medplum);
        results['Patient Discovery'] = patientIds.length > 0;

        if (args.patientId) {
          // Test specific patient
          results['Single Patient Processing'] = await verifySinglePatientProcessing(
            medplum,
            args.patientId,
            args.dryRun
          );
        } else if (patientIds.length > 0) {
          // Test with first discovered patient
          const testPatientId = patientIds[0];
          results['Single Patient Processing'] = await verifySinglePatientProcessing(
            medplum,
            testPatientId,
            args.dryRun
          );

          // Test batch processing with limited patients
          if (patientIds.length > 1) {
            const batchIds = patientIds.slice(0, CONFIG.maxPatientsToProcess);
            results['Batch Processing'] = await verifyBatchProcessing(medplum, batchIds, args.dryRun);
          }
        }
      }
    } catch (error) {
      logError('Medplum authentication failed', { error: String(error) });
      results['Medplum Connection'] = false;
    }
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                     VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let allPassed = true;
  for (const [test, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${test}`);
    if (!passed) allPassed = false;
  }

  console.log('\n═══════════════════════════════════════════════════════════════');

  if (allPassed) {
    console.log('  🎉 All verifications passed!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.log('  ⚠️  Some verifications failed. See details above.');
    console.log('═══════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Verification script failed:', error);
  process.exit(1);
});
