#!/usr/bin/env tsx
/**
 * Deploy Custom SearchParameters to Medplum
 *
 * Deploys the custom search parameters defined in src/lib/fhir/search-parameters.ts
 * to enable efficient querying of PDC observations and patient extensions.
 *
 * This must be run ONCE before:
 * - Storing PDC observations
 * - Phase 2 implementation (Patient List UI)
 */

import { MedplumClient } from '@medplum/core';
import dotenv from 'dotenv';
import { deploySearchParameters, getSearchParameterNames } from '../../../src/lib/fhir/search-parameters';

dotenv.config({ path: '.env.local' });

async function deployParameters() {
  console.log('🚀 Deploying Custom SearchParameters to Medplum\n');
  console.log('=' .repeat(80));

  // ---------------------------------------------------------------------------
  // Step 1: Connect to Medplum
  // ---------------------------------------------------------------------------

  console.log('\n🔌 Step 1: Connecting to Medplum');

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

  await medplum.startClientLogin(
    process.env.MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );

  console.log('  ✅ Connected');

  // ---------------------------------------------------------------------------
  // Step 2: Show SearchParameters to Deploy
  // ---------------------------------------------------------------------------

  console.log('\n📋 Step 2: SearchParameters to Deploy');

  const paramNames = getSearchParameterNames();
  console.log(`\n  Total: ${paramNames.length} parameters\n`);

  paramNames.forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });

  // ---------------------------------------------------------------------------
  // Step 3: Deploy SearchParameters
  // ---------------------------------------------------------------------------

  console.log('\n🚀 Step 3: Deploying SearchParameters\n');

  try {
    const deployed = await deploySearchParameters(medplum);
    console.log(`\n  ✅ Successfully deployed ${deployed.length} SearchParameters`);
  } catch (error) {
    console.error('\n  ❌ Deployment failed:', error);
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Step 4: Verify Deployment
  // ---------------------------------------------------------------------------

  console.log('\n🔍 Step 4: Verifying Deployment');

  try {
    // Try to query using the is-current-pdc parameter
    const testQuery = await medplum.searchResources('Observation', {
      'is-current-pdc': 'true',
      _count: '1',
    });

    console.log('  ✅ SearchParameters are functional');
    console.log(`  ℹ️  Test query returned ${testQuery.length} results`);
  } catch (error: any) {
    if (error.message?.includes('Unknown search parameter')) {
      console.log('  ⚠️  SearchParameters deployed but may need reindexing');
      console.log('  ℹ️  Try again in a few minutes or contact Medplum support for reindexing');
    } else {
      console.log('  ⚠️  Could not verify:', error.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log('\n' + '=' .repeat(80));
  console.log('\n✅ SearchParameter Deployment Complete!\n');
  console.log('Next steps:');
  console.log('  1. SearchParameters are now available for querying');
  console.log('  2. Run calculate-patient-pdc.ts with AUTO_STORE_OBSERVATIONS=true');
  console.log('  3. Observations will be stored with custom extensions');
  console.log('  4. Begin Phase 2 implementation (Patient List UI)\n');
  console.log('Note: If queries fail immediately after deployment, Medplum may need');
  console.log('      a few minutes to reindex existing resources.\n');
}

deployParameters()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
