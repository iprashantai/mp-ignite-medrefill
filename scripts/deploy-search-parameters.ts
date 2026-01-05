#!/usr/bin/env tsx
/**
 * Deploy Custom Search Parameters to Medplum
 *
 * This script creates SearchParameter resources in Medplum that enable
 * fast filtering on Patient extensions (fragility tier, PDC, priority, etc.)
 *
 * Run this ONCE per Medplum instance before using UI filters.
 */

import { MedplumClient } from '@medplum/core';
import dotenv from 'dotenv';
import { SEARCH_PARAMETERS } from '../src/lib/fhir/search-parameters';
import type { SearchParameter } from '@medplum/fhirtypes';

// Load environment
dotenv.config({ path: '.env.local' });

console.log('🔧 Deploying Custom Search Parameters to Medplum\n');
console.log('=' .repeat(80));

async function deploySearchParameters() {
  // ---------------------------------------------------------------------------
  // Connect to Medplum
  // ---------------------------------------------------------------------------

  console.log('\n🔌 Connecting to Medplum...');

  const medplum = new MedplumClient({
    baseUrl: process.env.MEDPLUM_BASE_URL,
    clientId: process.env.MEDPLUM_CLIENT_ID,
    clientSecret: process.env.MEDPLUM_CLIENT_SECRET,
  });

  await medplum.startClientLogin(
    process.env.MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );

  console.log('✅ Connected\n');

  // ---------------------------------------------------------------------------
  // Deploy Each Search Parameter
  // ---------------------------------------------------------------------------

  console.log(`📋 Deploying ${SEARCH_PARAMETERS.length} search parameters...\n`);

  const results = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [] as Array<{ name: string; error: string }>,
  };

  for (const searchParam of SEARCH_PARAMETERS) {
    const name = searchParam.code;
    console.log(`  Processing: ${name}`);

    try {
      // Check if search parameter already exists
      const existing = await medplum.search('SearchParameter', {
        code: name,
        _count: '1',
      });

      if (existing.entry && existing.entry.length > 0) {
        // Update existing
        const existingResource = existing.entry[0].resource as SearchParameter;
        const updated = await medplum.updateResource({
          ...searchParam,
          id: existingResource.id,
        });

        console.log(`    ✅ Updated: SearchParameter/${updated.id}`);
        results.updated++;
      } else {
        // Create new
        const created = await medplum.createResource(searchParam);
        console.log(`    ✅ Created: SearchParameter/${created.id}`);
        results.created++;
      }
    } catch (error) {
      console.log(`    ❌ Failed: ${error}`);
      results.failed++;
      results.errors.push({ name, error: String(error) });
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 Deployment Summary\n');
  console.log(`Total: ${SEARCH_PARAMETERS.length}`);
  console.log(`✅ Created: ${results.created}`);
  console.log(`🔄 Updated: ${results.updated}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(({ name, error }) => {
      console.log(`  - ${name}: ${error}`);
    });
  }

  // ---------------------------------------------------------------------------
  // Verify Deployment
  // ---------------------------------------------------------------------------

  console.log('\n🔍 Verifying deployment...\n');

  const verification = await medplum.search('SearchParameter', {
    _count: '100',
  });

  const deployedCount = verification.entry?.length || 0;
  console.log(`✅ Found ${deployedCount} total search parameters in Medplum`);

  // Check specific ones
  const criticalParams = ['fragility-tier', 'priority-score', 'current-pdc'];
  for (const code of criticalParams) {
    const result = await medplum.search('SearchParameter', { code });
    if (result.entry && result.entry.length > 0) {
      console.log(`  ✅ ${code}: Deployed`);
    } else {
      console.log(`  ❌ ${code}: NOT FOUND`);
    }
  }

  // ---------------------------------------------------------------------------
  // Usage Instructions
  // ---------------------------------------------------------------------------

  console.log('\n' + '=' .repeat(80));
  console.log('\n✅ Deployment Complete!\n');

  console.log('You can now use these search parameters in queries:\n');
  console.log('Examples:');
  console.log(`  GET /fhir/Patient?fragility-tier=F1_IMMINENT`);
  console.log(`  GET /fhir/Patient?priority-score=gt100`);
  console.log(`  GET /fhir/Patient?current-pdc=ge80`);
  console.log(`  GET /fhir/Patient?days-to-runout=lt7`);
  console.log('\n');

  console.log('Next steps:');
  console.log('  1. Run batch calculation to populate Patient extensions');
  console.log('  2. Test queries in Medplum UI or via curl');
  console.log('  3. Build Patient List UI in Phase 2\n');
}

// =============================================================================
// Run
// =============================================================================

deploySearchParameters()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
