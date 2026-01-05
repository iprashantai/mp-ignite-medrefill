#!/usr/bin/env npx tsx
/**
 * Find patients with multiple MA measures in the same measurement year
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { MedplumClient } from '@medplum/core';
import type { MedicationDispense } from '@medplum/fhirtypes';
import type { IClientStorage } from '@medplum/core';

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

// Extended RxNorm codes for MA classification (including dose-specific codes)
const MA_RXNORM: Record<string, Set<string>> = {
  MAC: new Set([
    '83367',
    '617310',
    '617312',
    '617314',
    '617318',
    '36567',
    '301542',
    '42463',
    '6472',
    '41127',
    '861634',
    '310404',
    '310405',
    '859747',
    '859751',
    '859419',
    '904458',
    '904467',
    '757702',
    '757703',
  ]),
  MAD: new Set([
    '6809',
    '4821',
    '4815',
    '593411',
    '33738',
    '25789',
    '614348',
    '857974',
    '1368001',
    '1545653',
    '860975',
    '860981',
    '861007',
    '861010',
    '861004',
    '861021',
    '861025',
    '861731',
    '861736',
    '316255',
    '316256',
    '314000',
    '314006',
  ]),
  MAH: new Set([
    '310965',
    '52175',
    '3827',
    '69749',
    '35296',
    '198188',
    '198189',
    '198190',
    '29046',
    '50166',
    '83515',
    '73494',
    '321064',
    '310798',
    '314076',
    '314077',
    '197884',
    '197885',
    '979480',
    '979485',
    '311354',
    '308962',
    '308964',
    '314073',
    '314074',
    '197884',
    '197885',
    '199903',
    '200094',
    '200095',
    '310792',
    '310793',
    '310796',
    '310797',
    '310798',
    '310809',
    '310810',
  ]),
};

function classifyRxNorm(code: string): string | null {
  if (MA_RXNORM.MAC.has(code)) return 'MAC';
  if (MA_RXNORM.MAD.has(code)) return 'MAD';
  if (MA_RXNORM.MAH.has(code)) return 'MAH';
  return null;
}

interface PatientData {
  yearData: Map<
    number,
    {
      measures: Set<string>;
      medications: Map<string, { name: string; measure: string; count: number }>;
      dispenseCount: number;
    }
  >;
}

async function main() {
  const medplum = new MedplumClient({
    baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/',
    clientId: process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
    storage: new MemoryStorage(),
  });

  const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;

  if (clientId && clientSecret) {
    await medplum.startClientLogin(clientId, clientSecret);
  }

  console.log('Searching for patients with multi-measure medications in same year...\n');

  // Get all completed dispenses
  const dispenses = await medplum.searchResources('MedicationDispense', {
    status: 'completed',
    _count: '1000',
  });

  console.log(`Total dispenses found: ${dispenses.length}`);

  // Group by patient and year
  const byPatient = new Map<string, PatientData>();

  for (const d of dispenses) {
    const patientRef = d.subject?.reference;
    if (!patientRef) continue;

    const patientId = patientRef.replace('Patient/', '');
    const fillDate = d.whenHandedOver;
    if (!fillDate) continue;

    const year = new Date(fillDate).getFullYear();

    const rxnormCode = d.medicationCodeableConcept?.coding?.find(
      (c) => c.system === 'http://www.nlm.nih.gov/research/umls/rxnorm'
    )?.code;

    if (!rxnormCode) continue;

    const measure = classifyRxNorm(rxnormCode);
    if (!measure) continue;

    if (!byPatient.has(patientId)) {
      byPatient.set(patientId, { yearData: new Map() });
    }

    const patient = byPatient.get(patientId)!;

    if (!patient.yearData.has(year)) {
      patient.yearData.set(year, {
        measures: new Set(),
        medications: new Map(),
        dispenseCount: 0,
      });
    }

    const yearData = patient.yearData.get(year)!;
    yearData.measures.add(measure);
    yearData.dispenseCount++;

    const medName =
      d.medicationCodeableConcept?.text ||
      d.medicationCodeableConcept?.coding?.[0]?.display ||
      rxnormCode;

    if (!yearData.medications.has(rxnormCode)) {
      yearData.medications.set(rxnormCode, { name: medName, measure, count: 0 });
    }
    yearData.medications.get(rxnormCode)!.count++;
  }

  // Find patients with multiple measures in same year
  console.log('\n' + '='.repeat(80));
  console.log('  PATIENTS WITH MULTIPLE MA MEASURES IN SAME YEAR');
  console.log('='.repeat(80) + '\n');

  const multiMeasurePatients: Array<{
    patientId: string;
    year: number;
    measures: string[];
    medications: Array<{ name: string; rxnorm: string; measure: string; count: number }>;
    dispenseCount: number;
  }> = [];

  for (const [patientId, data] of byPatient) {
    for (const [year, yearData] of data.yearData) {
      if (yearData.measures.size >= 2) {
        const meds: Array<{ name: string; rxnorm: string; measure: string; count: number }> = [];
        for (const [rxnorm, med] of yearData.medications) {
          meds.push({ name: med.name, rxnorm, measure: med.measure, count: med.count });
        }

        multiMeasurePatients.push({
          patientId,
          year,
          measures: Array.from(yearData.measures),
          medications: meds,
          dispenseCount: yearData.dispenseCount,
        });
      }
    }
  }

  if (multiMeasurePatients.length === 0) {
    console.log('❌ No patients found with multiple MA measures in the same year.\n');

    // Show patients with most medications as alternative
    console.log('='.repeat(80));
    console.log('  ALTERNATIVE: Patients with Most MA Medications');
    console.log('='.repeat(80) + '\n');

    const allPatientYears: Array<{
      patientId: string;
      year: number;
      measures: string[];
      medications: Array<{ name: string; rxnorm: string; measure: string; count: number }>;
      dispenseCount: number;
    }> = [];

    for (const [patientId, data] of byPatient) {
      for (const [year, yearData] of data.yearData) {
        const meds: Array<{ name: string; rxnorm: string; measure: string; count: number }> = [];
        for (const [rxnorm, med] of yearData.medications) {
          meds.push({ name: med.name, rxnorm, measure: med.measure, count: med.count });
        }

        allPatientYears.push({
          patientId,
          year,
          measures: Array.from(yearData.measures),
          medications: meds,
          dispenseCount: yearData.dispenseCount,
        });
      }
    }

    // Sort by dispense count
    allPatientYears.sort((a, b) => b.dispenseCount - a.dispenseCount);

    // Show top 5
    for (const patient of allPatientYears.slice(0, 5)) {
      console.log(`Patient ID: ${patient.patientId}`);
      console.log(`  Year: ${patient.year}`);
      console.log(`  Measures: ${patient.measures.join(', ')}`);
      console.log(`  Total Fills: ${patient.dispenseCount}`);
      console.log('  Medications:');
      for (const med of patient.medications) {
        console.log(`    - ${med.name} (${med.rxnorm}) - ${med.measure} - ${med.count} fills`);
      }
      console.log('');
    }
  } else {
    // Sort by number of measures and dispense count
    multiMeasurePatients.sort((a, b) => {
      if (b.measures.length !== a.measures.length) {
        return b.measures.length - a.measures.length;
      }
      return b.dispenseCount - a.dispenseCount;
    });

    console.log(`Found ${multiMeasurePatients.length} patient-years with multiple MA measures!\n`);

    for (const patient of multiMeasurePatients) {
      console.log('─'.repeat(70));
      console.log(`Patient ID: ${patient.patientId}`);
      console.log(`  Year: ${patient.year}`);
      console.log(`  Measures: ${patient.measures.join(', ')} (${patient.measures.length} measures)`);
      console.log(`  Total Fills: ${patient.dispenseCount}`);
      console.log('  Medications:');
      for (const med of patient.medications) {
        console.log(`    - ${med.name} (${med.rxnorm}) - ${med.measure} - ${med.count} fills`);
      }
      console.log('');
    }

    // Recommend the best candidate
    const best = multiMeasurePatients[0];
    console.log('═'.repeat(80));
    console.log('  RECOMMENDED PATIENT FOR TESTING');
    console.log('═'.repeat(80));
    console.log(`\n  Patient ID: ${best.patientId}`);
    console.log(`  Year: ${best.year}`);
    console.log(`  Measures: ${best.measures.join(', ')}`);
    console.log(`  Run: npx tsx scripts/calculate-real-patient-pdc.ts`);
    console.log(`  (Update PATIENT_ID constant in script to: '${best.patientId}')\n`);
  }
}

main().catch(console.error);
