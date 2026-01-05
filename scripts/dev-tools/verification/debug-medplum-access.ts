#!/usr/bin/env tsx
/**
 * Debug Medplum Access
 *
 * Detailed debugging to understand why we're not seeing data
 */

import { MedplumClient } from '@medplum/core';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugAccess() {
  console.log('🔍 Debugging Medplum Access\n');
  console.log('=' .repeat(80));

  // Create client
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

  // Authenticate
  await medplum.startClientLogin(
    process.env.MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );

  console.log('\n✅ Authenticated\n');

  // Get profile with full details
  console.log('📋 Profile Details:');
  const profile = await medplum.getProfile();
  console.log(JSON.stringify(profile, null, 2));

  // Check project
  console.log('\n📋 Project Context:');
  console.log('Project ID from env:', process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID);
  console.log('Profile ID:', profile.id);
  console.log('Profile Type:', profile.resourceType);

  // Try different search approaches
  console.log('\n🔍 Testing Different Search Methods:\n');

  // Method 1: Direct search without filters
  console.log('1️⃣ Direct Observation search (no filters):');
  try {
    const obs1 = await medplum.search('Observation');
    console.log(`   Total: ${obs1.total || 0}`);
    console.log(`   Entries: ${obs1.entry?.length || 0}`);
    if (obs1.entry && obs1.entry.length > 0) {
      console.log(`   First entry ID: ${obs1.entry[0].resource?.id}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Method 2: With count parameter
  console.log('\n2️⃣ Observation search with _count=100:');
  try {
    const obs2 = await medplum.search('Observation', { _count: '100' });
    console.log(`   Total: ${obs2.total || 0}`);
    console.log(`   Entries: ${obs2.entry?.length || 0}`);
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Method 3: Patient search
  console.log('\n3️⃣ Patient search:');
  try {
    const patients = await medplum.search('Patient', { _count: '10' });
    console.log(`   Total: ${patients.total || 0}`);
    console.log(`   Entries: ${patients.entry?.length || 0}`);
    if (patients.entry && patients.entry.length > 0) {
      const firstPatient = patients.entry[0].resource;
      console.log(`   First patient: ${firstPatient?.id}`);
      console.log(`   Name: ${JSON.stringify(firstPatient?.name)}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Method 4: MedicationDispense search
  console.log('\n4️⃣ MedicationDispense search:');
  try {
    const dispenses = await medplum.search('MedicationDispense', { _count: '10' });
    console.log(`   Total: ${dispenses.total || 0}`);
    console.log(`   Entries: ${dispenses.entry?.length || 0}`);
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Method 5: Try reading a specific resource if you know an ID
  console.log('\n5️⃣ Try direct resource read:');
  console.log('   (If you know a specific Observation ID from the UI, we can try reading it directly)');

  // Method 6: Check Project resources
  console.log('\n6️⃣ Check Project resource:');
  try {
    if (process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID) {
      const project = await medplum.readResource('Project', process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID);
      console.log(`   ✅ Project found: ${project.name}`);
      console.log(`   Project ID: ${project.id}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error reading project: ${error.message}`);
  }

  // Method 7: Try searchResources (alternative API)
  console.log('\n7️⃣ Using searchResources API:');
  try {
    const observations = await medplum.searchResources('Observation', { _count: '10' });
    console.log(`   Found: ${observations.length} observations`);
    if (observations.length > 0) {
      console.log(`   First observation code: ${observations[0].code?.coding?.[0]?.code}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n' + '=' .repeat(80));
  console.log('\n💡 Next Steps:');
  console.log('   1. Check the output above for any errors');
  console.log('   2. If total > 0 but entries = 0, there might be a pagination issue');
  console.log('   3. If you see errors, the client might not have permission');
  console.log('   4. Compare the Project ID from profile vs your UI\n');
}

debugAccess()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  });
