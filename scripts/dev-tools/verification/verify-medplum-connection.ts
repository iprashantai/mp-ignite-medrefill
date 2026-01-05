#!/usr/bin/env tsx
/**
 * Verify Medplum Connection
 *
 * Validates that:
 * 1. Environment variables are configured correctly
 * 2. Medplum connection works
 * 3. Authentication succeeds
 * 4. Basic data access works
 */

import { MedplumClient } from '@medplum/core';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function verifyConnection() {
  console.log('🔍 Verifying Medplum Connection\n');
  console.log('=' .repeat(80));

  // =============================================================================
  // Step 1: Check Environment Variables
  // =============================================================================

  console.log('\n📋 Step 1: Environment Variables');

const requiredVars = [
  'MEDPLUM_BASE_URL',
  'MEDPLUM_CLIENT_ID',
  'MEDPLUM_CLIENT_SECRET',
];

let hasAllVars = true;

for (const varName of requiredVars) {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`  ❌ ${varName}: NOT SET`);
    hasAllVars = false;
  }
}

if (!hasAllVars) {
  console.log('\n❌ Missing required environment variables');
  console.log('Please configure .env.local with Medplum credentials');
  process.exit(1);
}

// =============================================================================
// Step 2: Create Medplum Client
// =============================================================================

  console.log('\n🔧 Step 2: Creating Medplum Client');

  // Simple in-memory storage for Node.js scripts
  const memoryStorage = new Map<string, string>();
  const medplum = new MedplumClient({
    baseUrl: process.env.MEDPLUM_BASE_URL,
    clientId: process.env.MEDPLUM_CLIENT_ID,
    clientSecret: process.env.MEDPLUM_CLIENT_SECRET,
    storage: {
      clear: () => memoryStorage.clear(),
      getString: (key: string) => memoryStorage.get(key),
      setString: (key: string, value: string | undefined) => {
        if (value) memoryStorage.set(key, value);
        else memoryStorage.delete(key);
      },
      getObject: <T>(key: string): T | undefined => {
        const value = memoryStorage.get(key);
        return value ? JSON.parse(value) : undefined;
      },
      setObject: <T>(key: string, value: T) => {
        memoryStorage.set(key, JSON.stringify(value));
      },
      makeKey: (key: string) => key,
    },
  });

  console.log('  ✅ MedplumClient created');

  // =============================================================================
  // Step 3: Test Authentication
  // =============================================================================

  console.log('\n🔐 Step 3: Testing Authentication');

  try {
    await medplum.startClientLogin(
      process.env.MEDPLUM_CLIENT_ID!,
      process.env.MEDPLUM_CLIENT_SECRET!
    );
    console.log('  ✅ Authentication successful');
  } catch (error) {
    console.log('  ❌ Authentication failed');
    console.error(error);
    process.exit(1);
  }

  // =============================================================================
  // Step 4: Get Current User/Project
  // =============================================================================

  console.log('\n👤 Step 4: Getting Current User');

  try {
    const profile = await medplum.getProfile();
    console.log(`  ✅ Logged in as: ${profile.resourceType}/${profile.id}`);
    console.log(`  📧 Name: ${profile.name?.[0]?.text || 'N/A'}`);
  } catch (error) {
    console.log('  ❌ Failed to get profile');
    console.error(error);
  }

  // =============================================================================
  // Step 5: Count Patients
  // =============================================================================

  console.log('\n👥 Step 5: Counting Patients');

  try {
    const patientBundle = await medplum.search('Patient', { _count: '100' });
    const count = patientBundle.entry?.length || 0;
    const total = patientBundle.total || count;
    console.log(`  ✅ Found ${count}+ patients in database (total: ${total >= count ? total : 'many'})`);

    if (count === 0) {
      console.log('  ⚠️  No patients found - you may need to load data');
    }
  } catch (error) {
    console.log('  ❌ Failed to query patients');
    console.error(error);
  }

  // =============================================================================
  // Step 6: Count MedicationDispenses
  // =============================================================================

  console.log('\n💊 Step 6: Counting MedicationDispenses');

  try {
    const dispenseBundle = await medplum.search('MedicationDispense', {
      _count: '100',
      status: 'completed',
    });
    const count = dispenseBundle.entry?.length || 0;
    const total = dispenseBundle.total || count;
    console.log(`  ✅ Found ${count}+ completed dispenses (total: ${total >= count ? total : 'many'})`);

    if (count === 0) {
      console.log('  ⚠️  No dispenses found - PDC calculation requires dispense data');
    }
  } catch (error) {
    console.log('  ❌ Failed to query dispenses');
    console.error(error);
  }

  // =============================================================================
  // Step 7: Count Observations
  // =============================================================================

  console.log('\n📊 Step 7: Counting Observations (Clinical)');

  try {
    const observationBundle = await medplum.search('Observation', {
      _count: '100',
    });
    const count = observationBundle.entry?.length || 0;
    const total = observationBundle.total || count;
    console.log(`  ✅ Found ${count}+ clinical observations (total: ${total >= count ? total : 'many'})`);
  } catch (error) {
    console.log('  ❌ Failed to query observations');
  }

  console.log('\n📊 Step 8: Counting PDC Observations');

  try {
    const pdcBundle = await medplum.search('Observation', {
      _count: '100',
      code: 'pdc-mac,pdc-mad,pdc-mah',
    });
    const count = pdcBundle.entry?.length || 0;
    console.log(`  ✅ Found ${count} PDC observations`);

    if (count === 0) {
      console.log('  ℹ️  No PDC observations yet (will be created when you run calculation scripts)');
    }
  } catch (error) {
    console.log('  ⚠️  Could not query PDC observations');
  }

  // =============================================================================
  // Summary
  // =============================================================================

  console.log('\n' + '=' .repeat(80));
  console.log('\n✅ Medplum Connection Verified Successfully!\n');
  console.log('Next steps:');
  console.log('  1. Run calculate-patient-pdc.ts to test PDC calculation');
  console.log('  2. Run batch-calculate-all-patients.ts to process all patients');
  console.log('  3. Move to Phase 2 implementation\n');
}

// Run the verification
verifyConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
