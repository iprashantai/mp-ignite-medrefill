#!/usr/bin/env npx tsx
/**
 * Deploy SearchParameters to Medplum
 *
 * This script deploys the custom SearchParameters defined in Phase 1
 * to enable efficient querying by fragility tier, priority score, etc.
 *
 * Run with: npx tsx scripts/deploy-search-params.ts
 */

import { MedplumClient } from '@medplum/core';
import { deploySearchParameters, SEARCH_PARAMETERS } from '../src/lib/fhir';

// =============================================================================
// Configuration
// =============================================================================

const MEDPLUM_BASE_URL =
  process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';
const MEDPLUM_CLIENT_ID = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
const MEDPLUM_CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET;

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('DEPLOY SEARCH PARAMETERS');
  console.log('='.repeat(60));
  console.log('');

  console.log('SearchParameters to deploy:');
  for (const sp of SEARCH_PARAMETERS) {
    console.log(`  - ${sp.name} (${sp.base?.join(', ')})`);
  }
  console.log('');

  // Check for credentials
  if (!MEDPLUM_CLIENT_SECRET) {
    console.error('❌ MEDPLUM_CLIENT_SECRET is required');
    console.log('');
    console.log('Add to .env.local:');
    console.log('  MEDPLUM_CLIENT_SECRET=your-secret-here');
    console.log('');
    process.exit(1);
  }

  // Initialize client
  const medplum = new MedplumClient({
    baseUrl: MEDPLUM_BASE_URL,
    clientId: MEDPLUM_CLIENT_ID,
  });

  // Authenticate
  console.log('Authenticating...');
  try {
    await medplum.startClientLogin(MEDPLUM_CLIENT_ID!, MEDPLUM_CLIENT_SECRET);
    console.log('✅ Authentication successful\n');
  } catch (e) {
    console.error('❌ Authentication failed:', e);
    process.exit(1);
  }

  // Deploy
  console.log('Deploying SearchParameters...\n');
  try {
    const deployed = await deploySearchParameters(medplum);
    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ Successfully deployed ${deployed.length} SearchParameters`);
    console.log('='.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log('1. Reindex resources if you have existing data:');
    console.log('   Medplum Admin > Project > Reindex');
    console.log('');
    console.log('2. Verify with:');
    console.log('   npx tsx scripts/verify-phase1.ts');
    console.log('');
  } catch (e) {
    console.error('❌ Deployment failed:', e);
    process.exit(1);
  }
}

main().catch(console.error);
