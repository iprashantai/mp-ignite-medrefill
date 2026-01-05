#!/usr/bin/env tsx
/**
 * Check MedicationDispense Dates
 *
 * Quick check to see what years our dispense data covers
 */

import { MedplumClient } from '@medplum/core';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkDispenseDates() {
  console.log('📅 Checking MedicationDispense Dates\n');

  // Create client with storage
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

  console.log('✅ Connected\n');

  // Get first 50 dispenses
  const dispenses = await medplum.searchResources('MedicationDispense', {
    status: 'completed',
    _count: '50',
  });

  console.log(`Found ${dispenses.length} completed dispenses\n`);

  // Extract dates
  const dates = dispenses
    .map(d => d.whenHandedOver)
    .filter((date): date is string => date !== undefined)
    .sort();

  if (dates.length === 0) {
    console.log('❌ No dates found on dispenses');
    process.exit(1);
  }

  const earliestDate = dates[0];
  const latestDate = dates[dates.length - 1];

  console.log(`📅 Date Range:`);
  console.log(`   Earliest: ${earliestDate}`);
  console.log(`   Latest: ${latestDate}\n`);

  // Count by year
  const yearCounts = new Map<string, number>();
  dates.forEach(date => {
    const year = date.substring(0, 4);
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
  });

  console.log(`📊 Dispenses by Year:`);
  Array.from(yearCounts.entries())
    .sort(([yearA], [yearB]) => yearA.localeCompare(yearB))
    .forEach(([year, count]) => {
      console.log(`   ${year}: ${count} dispenses`);
    });

  console.log('\n💡 To calculate PDC, use:');
  const mostCommonYear = Array.from(yearCounts.entries())
    .sort((a, b) => b[1] - a[1])[0][0];
  console.log(`   npx tsx scripts/dev-tools/verification/calculate-patient-pdc.ts auto ${mostCommonYear}\n`);
}

checkDispenseDates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
