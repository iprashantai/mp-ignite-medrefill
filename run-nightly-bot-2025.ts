import { MedplumClient } from '@medplum/core';
import { config } from 'dotenv';
import { handler } from './src/bots/pdc-nightly-calculator/index';

config({ path: '.env.local' });

// Simple in-memory storage for Node.js
class MemoryStorage {
  private store: Map<string, any>;

  constructor() {
    this.store = new Map();
  }
  getItem(key: string) {
    return this.store.get(key) || null;
  }
  setItem(key: string, value: any) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  getString(key: string) {
    return this.getItem(key);
  }
  setString(key: string, value: string) {
    return this.setItem(key, value);
  }
  getObject(key: string) {
    const str = this.getItem(key);
    return str ? JSON.parse(str) : undefined;
  }
  setObject(key: string, value: any) {
    return this.setItem(key, JSON.stringify(value));
  }
}

async function main() {
  const medplum = new MedplumClient({
    baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL,
    storage: new MemoryStorage(),
    fetch: fetch,
  });

  await medplum.startClientLogin(
    process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );

  console.log('\n=== RUNNING PDC NIGHTLY BOT FOR MEASUREMENT YEAR 2025 ===\n');
  console.log('Configuration:');
  console.log('  Measurement Year: 2025');
  console.log('  Include Medication Level: true');
  console.log('  Update Patient Extensions: true');
  console.log('  Max Patients Per Run: unlimited');
  console.log('  Batch Size: 10');
  console.log('  Dry Run: false');
  console.log();

  const startTime = Date.now();

  try {
  // Create bot event with configuration
  const event = {
    input: {
      measurementYear: 2025,
      includeMedicationLevel: true,
      updatePatientExtensions: true,
      maxPatientsPerRun: undefined, // Process all patients
      batchSize: 10,
      dryRun: false
    },
    contentType: 'application/json'
  };

  console.log('Starting bot execution...\n');

  // Execute the bot
  const result = await handler(medplum, event as any);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n=== EXECUTION COMPLETE ===\n');
  console.log(`Execution ID: ${result.executionId}`);
  console.log(`Started At: ${result.startedAt}`);
  console.log(`Completed At: ${result.completedAt}`);
  console.log(`Duration: ${durationSec} seconds`);
  console.log();
  console.log('Results:');
  console.log(`  Total Patients: ${result.totalPatients}`);
  console.log(`  Successful: ${result.successCount} (${((result.successCount / result.totalPatients) * 100).toFixed(1)}%)`);
  console.log(`  Failed: ${result.errorCount} (${((result.errorCount / result.totalPatients) * 100).toFixed(1)}%)`);
  console.log(`  Avg Duration Per Patient: ${result.avgDurationPerPatientMs}ms`);
  console.log();

  // Show successful patients
  if (result.successCount > 0) {
    console.log(`✅ Successfully Processed Patients (${result.successCount}):`);
    const successful = result.results.filter(r => r.success);
    successful.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.patientId}`);
      console.log(`     Measures: ${r.measuresCalculated}, Medications: ${r.medicationsProcessed}, Duration: ${r.durationMs}ms`);
    });
    console.log();
  }

  // Show failed patients
  if (result.errorCount > 0) {
    console.log(`❌ Failed Patients (${result.errorCount}):`);
    const failed = result.results.filter(r => !r.success);
    failed.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.patientId}`);
      console.log(`     Error: ${r.error}`);
    });
    console.log();
  }

  // Show patients with no measures calculated (but didn't error)
  const noMeasures = result.results.filter(r => r.success && r.measuresCalculated === 0);
  if (noMeasures.length > 0) {
    console.log(`⚠️  Patients With No Measures Calculated (${noMeasures.length}):`);
    console.log('    (These patients likely have no dispenses in 2025 or no MA-qualifying medications)');
    noMeasures.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.patientId}`);
    });
    console.log();
  }

  console.log('✅ Bot execution completed successfully!\n');

  // Verify observations were created
  console.log('Verifying PDC observations in Medplum...');
  const allPDCObs = await medplum.searchResources('Observation', {
    code: 'https://ignitehealth.io/fhir/CodeSystem/adherence-metrics|pdc-mac,https://ignitehealth.io/fhir/CodeSystem/adherence-metrics|pdc-mad,https://ignitehealth.io/fhir/CodeSystem/adherence-metrics|pdc-mah',
    _count: '1000'
  });

  // Group by patient
  const byPatient = new Map<string, number>();
  allPDCObs.forEach(obs => {
    const patientRef = obs.subject?.reference || 'Unknown';
    byPatient.set(patientRef, (byPatient.get(patientRef) || 0) + 1);
  });

  console.log(`\nTotal PDC Observations: ${allPDCObs.length}`);
  console.log(`Patients with PDC Data: ${byPatient.size}`);
  console.log();

  if (byPatient.size > 0) {
    console.log('Breakdown by patient (top 10):');
    let i = 1;
    for (const [patientRef, count] of byPatient.entries()) {
      console.log(`  ${i}. ${patientRef}: ${count} observations`);
      i++;
      if (i > 10) {
        console.log(`  ... and ${byPatient.size - 10} more patients`);
        break;
      }
    }
  }

    process.exit(0);

  } catch (error) {
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('\n❌ EXECUTION FAILED\n');
    console.error(`Duration: ${durationSec} seconds`);
    console.error('\nError Details:');
    console.error(error);

    if (error instanceof Error && error.stack) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
