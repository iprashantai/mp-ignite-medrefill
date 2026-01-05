#!/usr/bin/env npx tsx
/**
 * PDC Calculation Script - Sample Patient Data
 *
 * Calculates PDC at both medication-level and measure-level for the
 * sample patients from golden-standard-tests.json
 *
 * Run: npx tsx scripts/calculate-sample-pdc.ts
 */

import {
  calculatePDC,
  calculateCoverageShortfall,
  calculateRemainingRefills,
  calculateSupplyOnHand,
  calculateDaysToYearEndFromDate,
  type FillRecord,
} from '../src/lib/pdc';

// =============================================================================
// Sample Patient Data (from mock-medication-dispenses.json)
// =============================================================================

interface DispenseRecord {
  fillDate: string;
  daysSupply: number;
  rxnormCode: string;
  medicationName: string;
}

interface PatientScenario {
  patientId: string;
  name: string;
  measure: 'MAC' | 'MAD' | 'MAH';
  measurementYear: number;
  dispenses: DispenseRecord[];
  expectedTier: string;
}

const SAMPLE_PATIENTS: PatientScenario[] = [
  {
    patientId: 'DEMO_001',
    name: 'Maria Gonzalez',
    measure: 'MAH',
    measurementYear: 2025,
    expectedTier: 'F1_IMMINENT',
    dispenses: [
      { fillDate: '2025-01-15', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-02-20', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-04-01', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-05-05', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-06-10', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-08-01', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-09-05', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-10-12', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
    ],
  },
  {
    patientId: 'DEMO_006',
    name: 'James Wilson',
    measure: 'MAC',
    measurementYear: 2025,
    expectedTier: 'COMPLIANT',
    dispenses: [
      { fillDate: '2025-01-01', daysSupply: 30, rxnormCode: '617312', medicationName: 'Atorvastatin 40mg' },
      { fillDate: '2025-02-01', daysSupply: 30, rxnormCode: '617312', medicationName: 'Atorvastatin 40mg' },
      { fillDate: '2025-03-01', daysSupply: 30, rxnormCode: '617312', medicationName: 'Atorvastatin 40mg' },
      { fillDate: '2025-04-01', daysSupply: 30, rxnormCode: '617312', medicationName: 'Atorvastatin 40mg' },
      { fillDate: '2025-05-01', daysSupply: 30, rxnormCode: '617312', medicationName: 'Atorvastatin 40mg' },
      { fillDate: '2025-06-01', daysSupply: 30, rxnormCode: '617312', medicationName: 'Atorvastatin 40mg' },
      { fillDate: '2025-07-01', daysSupply: 30, rxnormCode: '617312', medicationName: 'Atorvastatin 40mg' },
      { fillDate: '2025-08-01', daysSupply: 30, rxnormCode: '617312', medicationName: 'Atorvastatin 40mg' },
      { fillDate: '2025-09-01', daysSupply: 30, rxnormCode: '617312', medicationName: 'Atorvastatin 40mg' },
      { fillDate: '2025-10-01', daysSupply: 30, rxnormCode: '617312', medicationName: 'Atorvastatin 40mg' },
    ],
  },
  // Multi-medication patient (synthetic)
  {
    patientId: 'DEMO_MULTI',
    name: 'Multi-Med Patient',
    measure: 'MAH',
    measurementYear: 2025,
    expectedTier: 'F2_FRAGILE',
    dispenses: [
      // Lisinopril (good adherence)
      { fillDate: '2025-01-15', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-02-14', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-03-16', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-04-15', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-05-15', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-06-14', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-07-14', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-08-13', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-09-12', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      { fillDate: '2025-10-12', daysSupply: 30, rxnormCode: '310965', medicationName: 'Lisinopril 10mg' },
      // Losartan (poor adherence - gaps)
      { fillDate: '2025-01-15', daysSupply: 30, rxnormCode: '979480', medicationName: 'Losartan 50mg' },
      { fillDate: '2025-03-01', daysSupply: 30, rxnormCode: '979480', medicationName: 'Losartan 50mg' },
      { fillDate: '2025-05-15', daysSupply: 30, rxnormCode: '979480', medicationName: 'Losartan 50mg' },
      { fillDate: '2025-08-01', daysSupply: 30, rxnormCode: '979480', medicationName: 'Losartan 50mg' },
      { fillDate: '2025-10-01', daysSupply: 30, rxnormCode: '979480', medicationName: 'Losartan 50mg' },
    ],
  },
];

// =============================================================================
// Calculation Functions
// =============================================================================

interface MedicationPDCResult {
  rxnormCode: string;
  medicationName: string;
  pdc: number;
  pdcPercent: string;
  coveredDays: number;
  treatmentDays: number;
  gapDaysUsed: number;
  gapDaysAllowed: number;
  gapDaysRemaining: number;
  supplyOnHand: number;
  daysToYearEnd: number;
  coverageShortfall: number;
  remainingRefills: number;
  estimatedDaysPerRefill: number;
  fillCount: number;
}

interface MeasurePDCResult {
  measure: string;
  pdc: number;
  pdcPercent: string;
  coveredDays: number;
  treatmentDays: number;
  gapDaysUsed: number;
  gapDaysAllowed: number;
  gapDaysRemaining: number;
  medicationCount: number;
}

function calculateForPatient(
  patient: PatientScenario,
  currentDate: Date
): {
  medications: MedicationPDCResult[];
  measure: MeasurePDCResult;
} {
  const year = patient.measurementYear;

  // Group dispenses by medication (RxNorm code)
  const byMedication = new Map<string, DispenseRecord[]>();
  for (const d of patient.dispenses) {
    if (!byMedication.has(d.rxnormCode)) {
      byMedication.set(d.rxnormCode, []);
    }
    byMedication.get(d.rxnormCode)!.push(d);
  }

  const medicationResults: MedicationPDCResult[] = [];

  // Calculate PDC for each medication
  for (const [rxnormCode, meds] of byMedication) {
    const firstFillDate = meds.sort((a, b) => new Date(a.fillDate).getTime() - new Date(b.fillDate).getTime())[0].fillDate;
    const lastFill = meds[meds.length - 1];

    const fillRecords: FillRecord[] = meds.map((d) => ({
      fillDate: new Date(d.fillDate),
      daysSupply: d.daysSupply,
    }));

    const measurementPeriod = {
      start: new Date(firstFillDate),
      end: new Date(`${year}-12-31`),
    };

    const pdcResult = calculatePDC({
      fills: fillRecords,
      measurementPeriod,
      currentDate,
    });

    const supplyOnHand = calculateSupplyOnHand(
      { resourceType: 'MedicationDispense', status: 'completed', whenHandedOver: lastFill.fillDate, daysSupply: { value: lastFill.daysSupply } },
      currentDate
    );

    const daysToYearEnd = calculateDaysToYearEndFromDate(currentDate);

    const coverageShortfall = calculateCoverageShortfall({
      daysRemainingUntilYearEnd: daysToYearEnd,
      daysOfSupplyOnHand: supplyOnHand,
    });

    const refillResult = calculateRemainingRefills({
      coverageShortfall,
      standardDaysSupply: 30,
      recentFills: meds.slice(-3).map((d) => ({
        resourceType: 'MedicationDispense' as const,
        status: 'completed' as const,
        whenHandedOver: d.fillDate,
        daysSupply: { value: d.daysSupply },
      })),
    });

    const gapDaysUsed = pdcResult.treatmentDays - pdcResult.coveredDays;
    const gapDaysAllowed = Math.floor(pdcResult.treatmentDays * 0.2);

    // PDC is returned as percentage (0-100), not ratio (0-1)
    const pdcRatio = pdcResult.pdc / 100;

    medicationResults.push({
      rxnormCode,
      medicationName: meds[0].medicationName,
      pdc: pdcRatio,
      pdcPercent: pdcResult.pdc.toFixed(1) + '%',
      coveredDays: pdcResult.coveredDays,
      treatmentDays: pdcResult.treatmentDays,
      gapDaysUsed,
      gapDaysAllowed,
      gapDaysRemaining: Math.max(0, gapDaysAllowed - gapDaysUsed),
      supplyOnHand,
      daysToYearEnd,
      coverageShortfall,
      remainingRefills: refillResult.remainingRefills,
      estimatedDaysPerRefill: refillResult.estimatedDaysPerRefill,
      fillCount: meds.length,
    });
  }

  // Calculate measure-level PDC (all medications merged)
  const firstFillDate = patient.dispenses.sort((a, b) => new Date(a.fillDate).getTime() - new Date(b.fillDate).getTime())[0].fillDate;

  const allFillRecords: FillRecord[] = patient.dispenses.map((d) => ({
    fillDate: new Date(d.fillDate),
    daysSupply: d.daysSupply,
  }));

  const measurePdcResult = calculatePDC({
    fills: allFillRecords,
    measurementPeriod: {
      start: new Date(firstFillDate),
      end: new Date(`${year}-12-31`),
    },
    currentDate,
  });

  const measureGapDaysUsed = measurePdcResult.treatmentDays - measurePdcResult.coveredDays;
  const measureGapDaysAllowed = Math.floor(measurePdcResult.treatmentDays * 0.2);

  // PDC is returned as percentage (0-100), not ratio (0-1)
  const measurePdcRatio = measurePdcResult.pdc / 100;

  return {
    medications: medicationResults,
    measure: {
      measure: patient.measure,
      pdc: measurePdcRatio,
      pdcPercent: measurePdcResult.pdc.toFixed(1) + '%',
      coveredDays: measurePdcResult.coveredDays,
      treatmentDays: measurePdcResult.treatmentDays,
      gapDaysUsed: measureGapDaysUsed,
      gapDaysAllowed: measureGapDaysAllowed,
      gapDaysRemaining: Math.max(0, measureGapDaysAllowed - measureGapDaysUsed),
      medicationCount: byMedication.size,
    },
  };
}

// =============================================================================
// Main Execution
// =============================================================================

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║  PDC CALCULATION REPORT - SAMPLE PATIENT DATA                                ║');
console.log('║  Measurement Year: 2025                                                      ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

const currentDate = new Date('2025-11-15'); // Mid-November evaluation date
console.log(`Calculation Date: ${currentDate.toISOString().split('T')[0]}\n`);

for (const patient of SAMPLE_PATIENTS) {
  console.log('━'.repeat(80));
  console.log(`PATIENT: ${patient.name} (${patient.patientId})`);
  console.log(`Measure: ${patient.measure} | Expected Tier: ${patient.expectedTier}`);
  console.log('━'.repeat(80));

  const results = calculateForPatient(patient, currentDate);

  // Medication-Level Results
  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│  MEDICATION-LEVEL PDC                                                        │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  for (const med of results.medications) {
    console.log(`\n  📦 ${med.medicationName} (RxNorm: ${med.rxnormCode})`);
    console.log('  ' + '─'.repeat(70));
    console.log(`  │ PDC:              ${med.pdcPercent.padStart(8)} │ Status: ${med.pdc >= 0.8 ? '✅ PASSING' : med.pdc >= 0.6 ? '⚠️  AT-RISK' : '❌ FAILING'}`);
    console.log(`  │ Covered Days:     ${String(med.coveredDays).padStart(8)} │ Treatment Days: ${med.treatmentDays}`);
    console.log(`  │ Gap Days Used:    ${String(med.gapDaysUsed).padStart(8)} │ Gap Days Allowed: ${med.gapDaysAllowed} (20%)`);
    console.log(`  │ Gap Days Left:    ${String(med.gapDaysRemaining).padStart(8)} │ Fill Count: ${med.fillCount}`);
    console.log('  ' + '─'.repeat(70));
    console.log(`  │ Supply On Hand:   ${String(med.supplyOnHand).padStart(8)} days`);
    console.log(`  │ Days to Year End: ${String(med.daysToYearEnd).padStart(8)} days`);
    console.log(`  │ Coverage Shortfall:${String(med.coverageShortfall).padStart(7)} days`);
    console.log(`  │ Remaining Refills: ${String(med.remainingRefills).padStart(7)} (${med.estimatedDaysPerRefill}-day supply)`);
  }

  // Measure-Level Results
  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│  MEASURE-LEVEL PDC (All Medications Merged)                                  │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  const m = results.measure;
  console.log(`\n  📊 ${m.measure} (${m.medicationCount} medication${m.medicationCount > 1 ? 's' : ''})`);
  console.log('  ' + '─'.repeat(70));
  console.log(`  │ PDC:              ${m.pdcPercent.padStart(8)} │ Status: ${m.pdc >= 0.8 ? '✅ PASSING' : m.pdc >= 0.6 ? '⚠️  AT-RISK' : '❌ FAILING'}`);
  console.log(`  │ Covered Days:     ${String(m.coveredDays).padStart(8)} │ Treatment Days: ${m.treatmentDays}`);
  console.log(`  │ Gap Days Used:    ${String(m.gapDaysUsed).padStart(8)} │ Gap Days Allowed: ${m.gapDaysAllowed} (20%)`);
  console.log(`  │ Gap Days Left:    ${String(m.gapDaysRemaining).padStart(8)} │`);

  console.log('\n');
}

// =============================================================================
// Summary Table
// =============================================================================

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║  SUMMARY TABLE                                                               ║');
console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
console.log('║  Patient         │ Measure │ Measure PDC │ Med Count │ Med PDCs              ║');
console.log('╠══════════════════════════════════════════════════════════════════════════════╣');

for (const patient of SAMPLE_PATIENTS) {
  const results = calculateForPatient(patient, currentDate);
  const medPdcs = results.medications.map((m) => `${m.medicationName.split(' ')[0]}: ${m.pdcPercent}`).join(', ');
  const patientName = patient.name.padEnd(16).substring(0, 16);
  const measure = results.measure.measure.padEnd(7);
  const measurePdc = results.measure.pdcPercent.padStart(11);
  const medCount = String(results.medications.length).padStart(9);

  console.log(`║  ${patientName} │ ${measure} │ ${measurePdc} │ ${medCount} │ ${medPdcs.substring(0, 20).padEnd(20)} ║`);
}

console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

// =============================================================================
// Key Insights
// =============================================================================

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║  KEY INSIGHTS                                                                ║');
console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
console.log('║                                                                              ║');
console.log('║  1. Medication-Level PDC: Each drug calculated independently                 ║');
console.log('║     - Individual adherence tracking per RxNorm code                          ║');
console.log('║     - Refill calculations specific to each medication                        ║');
console.log('║                                                                              ║');
console.log('║  2. Measure-Level PDC: All drugs in measure merged (HEDIS standard)          ║');
console.log('║     - Overlapping coverage periods merged (not double-counted)               ║');
console.log('║     - This is what CMS uses for Star Ratings                                 ║');
console.log('║                                                                              ║');
console.log('║  3. Multi-Med Patient shows the difference:                                  ║');
console.log('║     - Individual meds may have different PDCs                                ║');
console.log('║     - Measure PDC reflects combined coverage                                 ║');
console.log('║     - Helps identify which specific drug needs intervention                  ║');
console.log('║                                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
