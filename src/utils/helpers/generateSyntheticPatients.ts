/**
 * Generate synthetic patient data for testing AllPatientsCRM UI
 *
 * This creates realistic-looking patients with medications, PDC scores,
 * fragility tiers, and other adherence metrics.
 */

/* eslint-disable max-lines-per-function, complexity */

import type { LegacyPatient, LegacyMedication, FragilityTier } from '@/types/legacy-types';

const FIRST_NAMES = [
  'John',
  'Mary',
  'James',
  'Patricia',
  'Robert',
  'Jennifer',
  'Michael',
  'Linda',
  'William',
  'Barbara',
  'David',
  'Elizabeth',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
  'Christopher',
  'Nancy',
  'Daniel',
  'Lisa',
  'Matthew',
  'Betty',
  'Anthony',
  'Margaret',
  'Mark',
  'Sandra',
  'Donald',
  'Ashley',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
];

const MEDICATIONS = {
  MAC: [
    { name: 'Atorvastatin 20mg', ndc: '00093-0145-98' },
    { name: 'Simvastatin 40mg', ndc: '00093-7356-98' },
    { name: 'Rosuvastatin 10mg', ndc: '00310-0745-39' },
    { name: 'Pravastatin 40mg', ndc: '00093-5159-98' },
  ],
  MAD: [
    { name: 'Metformin 1000mg', ndc: '00093-7214-01' },
    { name: 'Glipizide 5mg', ndc: '00093-0874-01' },
    { name: 'Insulin Glargine', ndc: '00088-2220-33' },
    { name: 'Sitagliptin 100mg', ndc: '00006-0575-31' },
  ],
  MAH: [
    { name: 'Lisinopril 10mg', ndc: '00093-1071-01' },
    { name: 'Amlodipine 5mg', ndc: '00093-7455-98' },
    { name: 'Losartan 50mg', ndc: '00093-7365-56' },
    { name: 'Hydrochlorothiazide 25mg', ndc: '00093-1048-01' },
  ],
};

const CRM_STATUSES = [
  'not_contacted',
  'outreach_attempted',
  'patient_responded',
  'appointment_scheduled',
  'intervention_complete',
  'lost_to_followup',
  'opted_out',
] as const;

const CAMPAIGNS = [
  'Q4 2024 MAC Outreach',
  'Diabetes Management Initiative',
  'Hypertension Compliance Drive',
  'General Adherence Program',
];

function randomElement<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  return date.toISOString().split('T')[0];
}

function generateMedication(measure: 'MAC' | 'MAD' | 'MAH'): LegacyMedication {
  const medList = MEDICATIONS[measure];
  const med = randomElement(medList);

  // Generate realistic PDC (most patients are 60-95%)
  const pdc = randomInt(40, 100);
  const status = pdc >= 80 ? 'passing' : pdc >= 60 ? 'at-risk' : 'failing';

  const gapDaysAllowed = 73; // Standard gap allowance
  const gapDaysUsed = Math.floor((1 - pdc / 100) * 365);
  const gapDaysRemaining = Math.max(0, gapDaysAllowed - gapDaysUsed);

  const daysSupply = 30;
  const daysToRunout = randomInt(-5, 60);
  const lastFillDate = randomDate(daysSupply + daysToRunout);

  const nextRefillDate = new Date(lastFillDate);
  nextRefillDate.setDate(nextRefillDate.getDate() + daysSupply);

  return {
    id: `med-${Math.random().toString(36).substr(2, 9)}`,
    medicationName: med.name,
    drugName: med.name,
    dosage: '1 tablet daily',
    medicationClass: measure,
    measure,
    ndc: med.ndc,
    refillsLeft: randomInt(0, 5),
    daysSupply,
    isMedicationAdherence: true,
    adherence: {
      pdc,
      status,
    },
    currentPdc: pdc,
    currentPdcExact: pdc + Math.random() * 2 - 1,
    gapDaysRemaining,
    gapDaysUsed,
    gapDaysAllowed,
    lastFillDate,
    nextRefillDue: nextRefillDate.toISOString().split('T')[0],
    daysToRunout,
    claimsCount: randomInt(8, 12),
    fragilityTier: null,
    priorityScore: 0,
  };
}

export function generateSyntheticPatient(index: number): LegacyPatient {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  const name = `${firstName} ${lastName}`;

  const age = randomInt(55, 85);
  const birthYear = new Date().getFullYear() - age;
  const birthDate = `${birthYear}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`;

  const gender = randomInt(0, 1) === 0 ? 'male' : 'female';

  // Generate 1-3 medications across different measures
  const measures: ('MAC' | 'MAD' | 'MAH')[] = [];
  const numMeasures = randomInt(1, 3);
  const availableMeasures: ('MAC' | 'MAD' | 'MAH')[] = ['MAC', 'MAD', 'MAH'];

  for (let i = 0; i < numMeasures; i++) {
    const measure = availableMeasures.splice(randomInt(0, availableMeasures.length - 1), 1)[0];
    measures.push(measure);
  }

  const medications: LegacyMedication[] = measures.map((m) => generateMedication(m));

  // Calculate aggregate PDC (worst across all meds)
  const pdcValues = medications.map((m) => m.currentPdc!).filter((p) => p !== null);
  const currentPDC = pdcValues.length > 0 ? Math.min(...pdcValues) : null;

  // Calculate fragility tier based on PDC and days to runout
  const daysToRunoutValues = medications.map((m) => m.daysToRunout!).filter((d) => d !== null);
  const daysToRunout = daysToRunoutValues.length > 0 ? Math.min(...daysToRunoutValues) : null;

  let fragilityTier: FragilityTier | null = null;
  if (currentPDC !== null && daysToRunout !== null) {
    if (daysToRunout < 0) {
      fragilityTier = 'T5_UNSALVAGEABLE';
    } else if (daysToRunout <= 7 && currentPDC < 60) {
      fragilityTier = 'F1_IMMINENT';
    } else if (daysToRunout <= 14 && currentPDC < 70) {
      fragilityTier = 'F2_FRAGILE';
    } else if (currentPDC < 80) {
      fragilityTier = 'F3_MODERATE';
    } else if (currentPDC < 90) {
      fragilityTier = 'F4_COMFORTABLE';
    } else {
      fragilityTier = 'F5_SAFE';
    }
  }

  const priorityScore =
    fragilityTier === 'F1_IMMINENT'
      ? randomInt(90, 100)
      : fragilityTier === 'F2_FRAGILE'
        ? randomInt(70, 89)
        : fragilityTier === 'F3_MODERATE'
          ? randomInt(50, 69)
          : fragilityTier === 'F4_COMFORTABLE'
            ? randomInt(30, 49)
            : randomInt(0, 29);

  const in14DayQueue = daysToRunout !== null && daysToRunout <= 14 && daysToRunout >= 0;

  const nextRefillDates = medications
    .map((m) => m.nextRefillDue)
    .filter((d) => d !== null)
    .sort();
  const nextRefillDue = nextRefillDates.length > 0 ? nextRefillDates[0] : null;

  const isAtRisk = currentPDC !== null && currentPDC < 80 && currentPDC >= 60;
  const isFailing = currentPDC !== null && currentPDC < 60;

  const crmStatus = randomElement(CRM_STATUSES);
  const hasCampaign = randomInt(0, 2) === 0; // 33% have campaigns

  return {
    id: `patient-${String(index + 1).padStart(4, '0')}`,
    mrn: `MRN${String(randomInt(100000, 999999))}`,
    firstName,
    lastName,
    name,
    dateOfBirth: birthDate,
    age,
    gender,

    medications,
    perMeasure: measures.reduce(
      (acc, measure) => {
        const meds = medications.filter((m) => m.measure === measure);
        const pdcs = meds.map((m) => m.currentPdc!).filter((p) => p !== null);
        const currentPDC = pdcs.length > 0 ? Math.min(...pdcs) : null;

        acc[measure] = {
          currentPDC,
          fragilityTier: fragilityTier,
          priorityScore: priorityScore,
          medications: meds,
        };

        return acc;
      },
      {} as Record<
        string,
        {
          currentPDC: number | null;
          fragilityTier: FragilityTier | null;
          priorityScore: number;
          medications: LegacyMedication[];
        }
      >
    ),

    aggregateMetrics: {
      allMedsPDC: currentPDC,
      worstFragilityTier: fragilityTier,
      highestPriorityScore: priorityScore,
      totalMedications: medications.length,
      maMedications: medications.length,
      passingCount: medications.filter((m) => m.adherence.status === 'passing').length,
      atRiskCount: medications.filter((m) => m.adherence.status === 'at-risk').length,
      failingCount: medications.filter((m) => m.adherence.status === 'failing').length,
    },

    currentPDC,
    fragilityTier,
    priorityScore,

    in14DayQueue,
    daysToRunout,
    nextRefillDue,

    isAtRisk,
    isFailing,

    crmStatus,
    campaigns: hasCampaign ? [randomElement(CAMPAIGNS)] : [],

    _version: '5.0-synthetic',
    _computedAt: new Date().toISOString(),
  };
}

export function generateSyntheticPatients(count: number): LegacyPatient[] {
  return Array.from({ length: count }, (_, i) => generateSyntheticPatient(i));
}
