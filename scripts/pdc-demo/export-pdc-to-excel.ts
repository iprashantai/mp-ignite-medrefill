#!/usr/bin/env npx tsx
/**
 * Export PDC Calculations to Excel
 *
 * Generates a detailed Excel workbook explaining all PDC calculation steps
 * with inputs, intermediate values, and final outputs.
 *
 * Run: npx tsx scripts/pdc-demo/export-pdc-to-excel.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import ExcelJS from 'exceljs';
import { MedplumClient } from '@medplum/core';
import type { MedicationDispense } from '@medplum/fhirtypes';
import type { IClientStorage } from '@medplum/core';

// Import our PDC calculation functions
import {
  calculatePDC,
  calculateCoverageShortfall,
  calculateRemainingRefills,
  calculateSupplyOnHand,
  calculateDaysToYearEndFromDate,
  calculateFragility,
  calculateCoveredDaysFromFills,
} from '../../src/lib/pdc';

import {
  extractFillDate,
  extractDaysSupply,
  extractMedicationCode,
} from '../../src/lib/fhir/dispense-service';

import type { MAMeasure } from '../../src/lib/fhir/types';

// =============================================================================
// Configuration
// =============================================================================

const PATIENT_ID = 'c9d7748e-ec35-cff9-9c87-db94a78e2f9c';
const OUTPUT_FILE = 'pdc-calculation-details.xlsx';

// Extended RxNorm codes for MA classification
const EXTENDED_MA_RXNORM_CODES: Record<MAMeasure, Set<string>> = {
  MAC: new Set([
    '83367', '617310', '617312', '617314', '617318', '36567', '301542',
    '42463', '6472', '41127', '861634', '859747',
  ]),
  MAD: new Set([
    '6809', '860975', '860981', '861007', '861010', '861004', '4821',
    '4815', '593411', '33738', '25789', '614348', '857974', '1368001', '1545653',
  ]),
  MAH: new Set([
    '310965', '314076', '314077', '314073', '314074', '52175', '3827',
    '69749', '35296', '198188', '198189', '198190', '29046', '50166',
    '83515', '73494', '321064', '310798', '310792', '310797',
  ]),
};

function classifyByMeasure(rxnormCode: string): MAMeasure | null {
  if (EXTENDED_MA_RXNORM_CODES.MAC.has(rxnormCode)) return 'MAC';
  if (EXTENDED_MA_RXNORM_CODES.MAD.has(rxnormCode)) return 'MAD';
  if (EXTENDED_MA_RXNORM_CODES.MAH.has(rxnormCode)) return 'MAH';
  return null;
}

// Memory storage for MedplumClient
class MemoryStorage implements IClientStorage {
  private data: Record<string, string> = {};
  clear() { this.data = {}; }
  getString(key: string) { return this.data[key]; }
  setString(key: string, value: string) { this.data[key] = value; }
  getObject<T>(key: string): T | undefined {
    const str = this.getString(key);
    return str ? JSON.parse(str) : undefined;
  }
  setObject<T>(key: string, value: T) { this.setString(key, JSON.stringify(value)); }
  makeKey(...parts: string[]) { return parts.join(':'); }
}

// =============================================================================
// Excel Styling Helpers
// =============================================================================

const COLORS = {
  headerBg: 'FF1E3A5F',      // Dark blue
  headerText: 'FFFFFFFF',    // White
  sectionBg: 'FF4A90D9',     // Light blue
  passBg: 'FFD4EDDA',        // Light green
  failBg: 'FFF8D7DA',        // Light red
  warnBg: 'FFFFF3CD',        // Light yellow
  formulaBg: 'FFEEF2F7',     // Light gray-blue
  inputBg: 'FFFDF6E3',       // Light cream
};

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

function styleSection(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
  });
}

function getMedicationDisplay(dispense: MedicationDispense): string {
  return (
    dispense.medicationCodeableConcept?.text ||
    dispense.medicationCodeableConcept?.coding?.[0]?.display ||
    'Unknown'
  );
}

// =============================================================================
// Main Script
// =============================================================================

async function main() {
  console.log('🔗 Connecting to Medplum...');

  const medplum = new MedplumClient({
    baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/',
    clientId: process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
    storage: new MemoryStorage(),
  });

  await medplum.startClientLogin(
    process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );

  console.log('📊 Fetching dispenses...');

  const allDispenses = await medplum.searchResources('MedicationDispense', {
    subject: `Patient/${PATIENT_ID}`,
    status: 'completed',
    _count: '200',
  });

  console.log(`✓ Found ${allDispenses.length} dispenses`);

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Ignite Health PDC Calculator';
  workbook.created = new Date();

  // ==========================================================================
  // Sheet 1: Summary
  // ==========================================================================
  const summarySheet = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: 'FF1E3A5F' } },
  });

  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 30 },
    { header: 'Value', key: 'value', width: 50 },
  ];

  summarySheet.addRow({ field: 'Report Generated', value: new Date().toISOString() });
  summarySheet.addRow({ field: 'Patient ID', value: PATIENT_ID });
  summarySheet.addRow({ field: 'Total Dispenses', value: allDispenses.length });

  // Get years with data
  const yearsWithData = new Set<number>();
  for (const d of allDispenses) {
    const fillDate = extractFillDate(d);
    if (fillDate) yearsWithData.add(fillDate.getFullYear());
  }
  summarySheet.addRow({ field: 'Years with Data', value: Array.from(yearsWithData).sort().join(', ') });

  // Get unique medications
  const uniqueMeds = new Map<string, string>();
  for (const d of allDispenses) {
    const code = extractMedicationCode(d);
    if (code) uniqueMeds.set(code, getMedicationDisplay(d));
  }
  summarySheet.addRow({ field: 'Unique Medications', value: uniqueMeds.size.toString() });

  summarySheet.addRow({ field: '', value: '' });
  summarySheet.addRow({ field: 'MEDICATIONS', value: '' });
  for (const [code, name] of uniqueMeds) {
    const measure = classifyByMeasure(code);
    summarySheet.addRow({ field: `  ${name}`, value: `RxNorm: ${code} | Measure: ${measure || 'N/A'}` });
  }

  styleHeader(summarySheet.getRow(1));

  // ==========================================================================
  // Sheet 2: Raw Input Data (All Dispenses)
  // ==========================================================================
  const inputSheet = workbook.addWorksheet('Input - All Dispenses', {
    properties: { tabColor: { argb: 'FF28A745' } },
  });

  inputSheet.columns = [
    { header: '#', key: 'index', width: 5 },
    { header: 'Dispense ID', key: 'id', width: 40 },
    { header: 'Fill Date', key: 'fillDate', width: 12 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Medication', key: 'medication', width: 45 },
    { header: 'RxNorm Code', key: 'rxnorm', width: 12 },
    { header: 'MA Measure', key: 'measure', width: 12 },
    { header: 'Days Supply', key: 'daysSupply', width: 12 },
    { header: 'Coverage End Date', key: 'coverageEnd', width: 15 },
  ];

  styleHeader(inputSheet.getRow(1));

  // Sort dispenses by date
  const sortedDispenses = [...allDispenses].sort((a, b) => {
    const dateA = extractFillDate(a);
    const dateB = extractFillDate(b);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  sortedDispenses.forEach((d, i) => {
    const fillDate = extractFillDate(d);
    const daysSupply = extractDaysSupply(d);
    const rxnorm = extractMedicationCode(d) || 'N/A';
    const measure = rxnorm !== 'N/A' ? classifyByMeasure(rxnorm) : null;

    let coverageEnd = '';
    if (fillDate) {
      const endDate = new Date(fillDate);
      endDate.setDate(endDate.getDate() + daysSupply - 1);
      coverageEnd = endDate.toISOString().split('T')[0];
    }

    const row = inputSheet.addRow({
      index: i + 1,
      id: d.id,
      fillDate: fillDate?.toISOString().split('T')[0] || 'N/A',
      year: fillDate?.getFullYear() || 'N/A',
      medication: getMedicationDisplay(d),
      rxnorm,
      measure: measure || 'N/A',
      daysSupply,
      coverageEnd,
    });

    // Color by measure
    if (measure === 'MAC') {
      row.getCell('measure').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
    } else if (measure === 'MAD') {
      row.getCell('measure').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E5F5' } };
    } else if (measure === 'MAH') {
      row.getCell('measure').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
    }
  });

  // ==========================================================================
  // Sheet 3+: Detailed Calculations Per Year
  // ==========================================================================

  const sortedYears = Array.from(yearsWithData).sort();

  for (const year of sortedYears) {
    const yearDispenses = allDispenses.filter((d) => {
      const fillDate = extractFillDate(d);
      return fillDate && fillDate.getFullYear() === year;
    });

    if (yearDispenses.length === 0) continue;

    const today = new Date();
    const isCurrentYear = year === today.getFullYear();
    const currentDate = isCurrentYear ? today : new Date(year, 11, 31);
    const measurementEnd = currentDate;

    // Create year sheet
    const yearSheet = workbook.addWorksheet(`${year} Calculations`, {
      properties: { tabColor: { argb: 'FF007BFF' } },
    });

    let rowNum = 1;

    // Title
    yearSheet.mergeCells(`A${rowNum}:H${rowNum}`);
    yearSheet.getCell(`A${rowNum}`).value = `PDC CALCULATION DETAILS - YEAR ${year}`;
    yearSheet.getCell(`A${rowNum}`).font = { bold: true, size: 16 };
    yearSheet.getCell(`A${rowNum}`).alignment = { horizontal: 'center' };
    rowNum += 2;

    // Measurement Period Info
    yearSheet.getCell(`A${rowNum}`).value = 'MEASUREMENT PERIOD';
    yearSheet.getCell(`A${rowNum}`).font = { bold: true, size: 12 };
    rowNum++;

    yearSheet.getCell(`A${rowNum}`).value = 'Current/Reference Date:';
    yearSheet.getCell(`B${rowNum}`).value = currentDate.toISOString().split('T')[0];
    rowNum++;

    yearSheet.getCell(`A${rowNum}`).value = 'Year End:';
    yearSheet.getCell(`B${rowNum}`).value = `${year}-12-31`;
    rowNum++;

    yearSheet.getCell(`A${rowNum}`).value = 'Days to Year End:';
    yearSheet.getCell(`B${rowNum}`).value = calculateDaysToYearEndFromDate(currentDate);
    rowNum += 2;

    // Group by medication
    const byMedication = new Map<string, { dispenses: MedicationDispense[]; display: string; measure: MAMeasure | null }>();

    for (const d of yearDispenses) {
      const rxnorm = extractMedicationCode(d) || 'unknown';
      const display = getMedicationDisplay(d);
      const measure = classifyByMeasure(rxnorm);

      if (!byMedication.has(rxnorm)) {
        byMedication.set(rxnorm, { dispenses: [], display, measure });
      }
      byMedication.get(rxnorm)!.dispenses.push(d);
    }

    // =======================================================================
    // MEDICATION-LEVEL CALCULATIONS
    // =======================================================================

    yearSheet.mergeCells(`A${rowNum}:H${rowNum}`);
    yearSheet.getCell(`A${rowNum}`).value = '═══════════════════════════════════════════════════════════════';
    rowNum++;

    yearSheet.mergeCells(`A${rowNum}:H${rowNum}`);
    yearSheet.getCell(`A${rowNum}`).value = 'SECTION 1: MEDICATION-LEVEL PDC CALCULATIONS';
    yearSheet.getCell(`A${rowNum}`).font = { bold: true, size: 14 };
    yearSheet.getCell(`A${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
    yearSheet.getCell(`A${rowNum}`).font = { bold: true, color: { argb: COLORS.headerText } };
    rowNum += 2;

    for (const [rxnorm, { dispenses, display, measure }] of byMedication) {
      // Sort dispenses by date
      const sortedMedDispenses = [...dispenses].sort((a, b) => {
        const dateA = extractFillDate(a);
        const dateB = extractFillDate(b);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });

      // Medication header
      yearSheet.mergeCells(`A${rowNum}:H${rowNum}`);
      yearSheet.getCell(`A${rowNum}`).value = `▸ ${display} (RxNorm: ${rxnorm}) - Measure: ${measure || 'N/A'}`;
      yearSheet.getCell(`A${rowNum}`).font = { bold: true, size: 11 };
      yearSheet.getCell(`A${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } };
      rowNum += 2;

      // Step 1: Input fills
      yearSheet.getCell(`A${rowNum}`).value = 'STEP 1: INPUT FILL RECORDS';
      yearSheet.getCell(`A${rowNum}`).font = { bold: true };
      rowNum++;

      // Fill records table header
      yearSheet.getCell(`A${rowNum}`).value = '#';
      yearSheet.getCell(`B${rowNum}`).value = 'Fill Date';
      yearSheet.getCell(`C${rowNum}`).value = 'Days Supply';
      yearSheet.getCell(`D${rowNum}`).value = 'Coverage Start';
      yearSheet.getCell(`E${rowNum}`).value = 'Coverage End';
      yearSheet.getCell(`F${rowNum}`).value = 'Day # (from IPSD)';
      styleHeader(yearSheet.getRow(rowNum));
      rowNum++;

      const fillRecords: Array<{ fillDate: Date; daysSupply: number }> = [];
      let firstFillDate: Date | null = null;

      sortedMedDispenses.forEach((d, i) => {
        const fillDate = extractFillDate(d);
        const daysSupply = extractDaysSupply(d);

        if (!fillDate) return;

        if (!firstFillDate || fillDate < firstFillDate) {
          firstFillDate = fillDate;
        }

        fillRecords.push({ fillDate, daysSupply });

        const coverageEnd = new Date(fillDate);
        coverageEnd.setDate(coverageEnd.getDate() + daysSupply - 1);

        const dayNum = firstFillDate
          ? Math.floor((fillDate.getTime() - firstFillDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        yearSheet.getCell(`A${rowNum}`).value = i + 1;
        yearSheet.getCell(`B${rowNum}`).value = fillDate.toISOString().split('T')[0];
        yearSheet.getCell(`C${rowNum}`).value = daysSupply;
        yearSheet.getCell(`D${rowNum}`).value = fillDate.toISOString().split('T')[0];
        yearSheet.getCell(`E${rowNum}`).value = coverageEnd.toISOString().split('T')[0];
        yearSheet.getCell(`F${rowNum}`).value = dayNum;

        // Highlight row
        for (let col = 1; col <= 6; col++) {
          yearSheet.getCell(rowNum, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.inputBg } };
        }
        rowNum++;
      });

      if (fillRecords.length === 0 || !firstFillDate) {
        yearSheet.getCell(`A${rowNum}`).value = '⚠️ No valid fill records';
        rowNum += 2;
        continue;
      }

      // Check if first fill is in future
      if (firstFillDate > currentDate) {
        yearSheet.getCell(`A${rowNum}`).value = '⏳ First fill is in the future - PDC not applicable';
        rowNum += 2;
        continue;
      }

      rowNum++;

      // Step 2: Measurement Period
      yearSheet.getCell(`A${rowNum}`).value = 'STEP 2: DEFINE MEASUREMENT PERIOD';
      yearSheet.getCell(`A${rowNum}`).font = { bold: true };
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'IPSD (Index Prescription Start Date):';
      yearSheet.getCell(`C${rowNum}`).value = firstFillDate.toISOString().split('T')[0];
      yearSheet.getCell(`C${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.formulaBg } };
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Measurement End Date:';
      yearSheet.getCell(`C${rowNum}`).value = measurementEnd.toISOString().split('T')[0];
      yearSheet.getCell(`C${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.formulaBg } };
      rowNum++;

      const measurementPeriod = { start: firstFillDate, end: measurementEnd };
      const treatmentDays = Math.floor(
        (measurementEnd.getTime() - firstFillDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      yearSheet.getCell(`A${rowNum}`).value = 'Treatment Days:';
      yearSheet.getCell(`C${rowNum}`).value = treatmentDays;
      yearSheet.getCell(`D${rowNum}`).value = '= (End Date - IPSD) + 1';
      yearSheet.getCell(`D${rowNum}`).font = { italic: true, color: { argb: 'FF666666' } };
      rowNum += 2;

      // Step 3: Calculate coverage intervals
      yearSheet.getCell(`A${rowNum}`).value = 'STEP 3: CALCULATE COVERAGE INTERVALS (HEDIS Merging)';
      yearSheet.getCell(`A${rowNum}`).font = { bold: true };
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Formula: Overlapping fill coverage is merged (counted once)';
      yearSheet.getCell(`A${rowNum}`).font = { italic: true };
      rowNum++;

      // Show interval merging
      yearSheet.getCell(`A${rowNum}`).value = 'Fill #';
      yearSheet.getCell(`B${rowNum}`).value = 'Start Day';
      yearSheet.getCell(`C${rowNum}`).value = 'End Day';
      yearSheet.getCell(`D${rowNum}`).value = 'Merged?';
      yearSheet.getCell(`E${rowNum}`).value = 'Result';
      styleHeader(yearSheet.getRow(rowNum));
      rowNum++;

      // Calculate intervals
      const intervals: Array<{ start: number; end: number }> = [];
      fillRecords.forEach((fill, i) => {
        const startDay = Math.floor(
          (fill.fillDate.getTime() - firstFillDate!.getTime()) / (1000 * 60 * 60 * 24)
        );
        const endDay = Math.min(startDay + fill.daysSupply - 1, treatmentDays - 1);

        const interval = { start: Math.max(0, startDay), end: endDay };

        let merged = false;
        let mergeResult = '';

        if (intervals.length === 0) {
          intervals.push(interval);
          mergeResult = `New interval [${interval.start}-${interval.end}]`;
        } else {
          const last = intervals[intervals.length - 1];
          if (interval.start <= last.end + 1) {
            merged = true;
            const oldEnd = last.end;
            last.end = Math.max(last.end, interval.end);
            mergeResult = `Merged: [${last.start}-${oldEnd}] → [${last.start}-${last.end}]`;
          } else {
            intervals.push(interval);
            mergeResult = `Gap detected, new interval [${interval.start}-${interval.end}]`;
          }
        }

        yearSheet.getCell(`A${rowNum}`).value = i + 1;
        yearSheet.getCell(`B${rowNum}`).value = startDay;
        yearSheet.getCell(`C${rowNum}`).value = endDay;
        yearSheet.getCell(`D${rowNum}`).value = merged ? 'Yes' : 'No';
        yearSheet.getCell(`E${rowNum}`).value = mergeResult;

        if (merged) {
          yearSheet.getCell(`D${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warnBg } };
        }
        rowNum++;
      });

      rowNum++;

      // Final merged intervals
      yearSheet.getCell(`A${rowNum}`).value = 'Final Merged Intervals:';
      yearSheet.getCell(`A${rowNum}`).font = { bold: true };
      rowNum++;

      let coveredDays = 0;
      intervals.forEach((interval, i) => {
        const days = interval.end - interval.start + 1;
        coveredDays += days;
        yearSheet.getCell(`A${rowNum}`).value = `  Interval ${i + 1}:`;
        yearSheet.getCell(`B${rowNum}`).value = `Day ${interval.start} to Day ${interval.end}`;
        yearSheet.getCell(`C${rowNum}`).value = `= ${days} days`;
        rowNum++;
      });

      coveredDays = Math.min(coveredDays, treatmentDays);

      yearSheet.getCell(`A${rowNum}`).value = 'Total Covered Days:';
      yearSheet.getCell(`B${rowNum}`).value = coveredDays;
      yearSheet.getCell(`B${rowNum}`).font = { bold: true };
      yearSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.formulaBg } };
      rowNum += 2;

      // Step 4: Calculate PDC
      yearSheet.getCell(`A${rowNum}`).value = 'STEP 4: CALCULATE PDC';
      yearSheet.getCell(`A${rowNum}`).font = { bold: true };
      rowNum++;

      // Calculate PDC using our function
      const pdcResult = calculatePDC({
        fills: fillRecords,
        measurementPeriod,
        currentDate,
      });

      yearSheet.getCell(`A${rowNum}`).value = 'Formula:';
      yearSheet.getCell(`B${rowNum}`).value = 'PDC = (Covered Days / Treatment Days) × 100';
      yearSheet.getCell(`B${rowNum}`).font = { italic: true };
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Calculation:';
      yearSheet.getCell(`B${rowNum}`).value = `PDC = (${pdcResult.coveredDays} / ${pdcResult.treatmentDays}) × 100`;
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'PDC:';
      yearSheet.getCell(`B${rowNum}`).value = `${pdcResult.pdc.toFixed(2)}%`;
      yearSheet.getCell(`B${rowNum}`).font = { bold: true, size: 12 };

      // Color based on status
      if (pdcResult.pdc >= 80) {
        yearSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.passBg } };
        yearSheet.getCell(`C${rowNum}`).value = '✓ PASSING (≥80%)';
      } else if (pdcResult.pdc >= 60) {
        yearSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warnBg } };
        yearSheet.getCell(`C${rowNum}`).value = '⚠ AT-RISK (60-79%)';
      } else {
        yearSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.failBg } };
        yearSheet.getCell(`C${rowNum}`).value = '✗ FAILING (<60%)';
      }
      rowNum += 2;

      // Step 5: Gap Days
      yearSheet.getCell(`A${rowNum}`).value = 'STEP 5: CALCULATE GAP DAYS';
      yearSheet.getCell(`A${rowNum}`).font = { bold: true };
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Gap Days Used:';
      yearSheet.getCell(`B${rowNum}`).value = pdcResult.gapDaysUsed;
      yearSheet.getCell(`C${rowNum}`).value = `= Treatment Days - Covered Days = ${pdcResult.treatmentDays} - ${pdcResult.coveredDays}`;
      yearSheet.getCell(`C${rowNum}`).font = { italic: true, color: { argb: 'FF666666' } };
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Gap Days Allowed (20%):';
      yearSheet.getCell(`B${rowNum}`).value = pdcResult.gapDaysAllowed;
      yearSheet.getCell(`C${rowNum}`).value = `= floor(${pdcResult.treatmentDays} × 0.20)`;
      yearSheet.getCell(`C${rowNum}`).font = { italic: true, color: { argb: 'FF666666' } };
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Gap Days Remaining:';
      yearSheet.getCell(`B${rowNum}`).value = pdcResult.gapDaysRemaining;
      yearSheet.getCell(`C${rowNum}`).value = `= ${pdcResult.gapDaysAllowed} - ${pdcResult.gapDaysUsed}`;
      yearSheet.getCell(`C${rowNum}`).font = { italic: true, color: { argb: 'FF666666' } };

      if (pdcResult.gapDaysRemaining < 0) {
        yearSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.failBg } };
      } else {
        yearSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.passBg } };
      }
      rowNum += 2;

      // Step 6: Refill Calculations
      yearSheet.getCell(`A${rowNum}`).value = 'STEP 6: REFILL & SUPPLY CALCULATIONS';
      yearSheet.getCell(`A${rowNum}`).font = { bold: true };
      rowNum++;

      const lastDispense = sortedMedDispenses[sortedMedDispenses.length - 1];
      const supplyOnHand = calculateSupplyOnHand(lastDispense, currentDate);
      const daysToYearEnd = calculateDaysToYearEndFromDate(currentDate);
      const coverageShortfall = calculateCoverageShortfall({
        daysRemainingUntilYearEnd: daysToYearEnd,
        daysOfSupplyOnHand: supplyOnHand,
      });
      const refillResult = calculateRemainingRefills({
        coverageShortfall,
        standardDaysSupply: 30,
        recentFills: sortedMedDispenses,
      });

      yearSheet.getCell(`A${rowNum}`).value = 'Supply On Hand:';
      yearSheet.getCell(`B${rowNum}`).value = `${supplyOnHand} days`;
      yearSheet.getCell(`C${rowNum}`).value = `= Last fill days supply - days since fill`;
      yearSheet.getCell(`C${rowNum}`).font = { italic: true, color: { argb: 'FF666666' } };
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Days to Year End:';
      yearSheet.getCell(`B${rowNum}`).value = `${daysToYearEnd} days`;
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Coverage Shortfall:';
      yearSheet.getCell(`B${rowNum}`).value = `${coverageShortfall} days`;
      yearSheet.getCell(`C${rowNum}`).value = `= max(0, ${daysToYearEnd} - ${supplyOnHand})`;
      yearSheet.getCell(`C${rowNum}`).font = { italic: true, color: { argb: 'FF666666' } };
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Remaining Refills Needed:';
      yearSheet.getCell(`B${rowNum}`).value = refillResult.remainingRefills;
      yearSheet.getCell(`C${rowNum}`).value = `= ceil(${coverageShortfall} / ${refillResult.estimatedDaysPerRefill})`;
      yearSheet.getCell(`C${rowNum}`).font = { italic: true, color: { argb: 'FF666666' } };
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Est. Days per Refill:';
      yearSheet.getCell(`B${rowNum}`).value = `${refillResult.estimatedDaysPerRefill} days`;
      yearSheet.getCell(`C${rowNum}`).value = `(average from fill history)`;
      yearSheet.getCell(`C${rowNum}`).font = { italic: true, color: { argb: 'FF666666' } };
      rowNum += 2;

      // Step 7: Fragility (if MA measure)
      if (measure) {
        yearSheet.getCell(`A${rowNum}`).value = 'STEP 7: FRAGILITY TIER CALCULATION';
        yearSheet.getCell(`A${rowNum}`).font = { bold: true };
        rowNum++;

        const fragility = calculateFragility({
          pdcResult,
          refillsRemaining: refillResult.remainingRefills,
          measureTypes: [measure],
          isNewPatient: false,
          currentDate,
        });

        yearSheet.getCell(`A${rowNum}`).value = 'Fragility Tier:';
        yearSheet.getCell(`B${rowNum}`).value = fragility.tier;
        yearSheet.getCell(`B${rowNum}`).font = { bold: true };
        rowNum++;

        yearSheet.getCell(`A${rowNum}`).value = 'Priority Score:';
        yearSheet.getCell(`B${rowNum}`).value = fragility.priorityScore;
        rowNum++;

        yearSheet.getCell(`A${rowNum}`).value = 'Urgency Level:';
        yearSheet.getCell(`B${rowNum}`).value = fragility.urgencyLevel;
        rowNum++;

        yearSheet.getCell(`A${rowNum}`).value = 'Delay Budget per Refill:';
        yearSheet.getCell(`B${rowNum}`).value = `${fragility.delayBudgetPerRefill.toFixed(1)} days`;
        rowNum++;

        yearSheet.getCell(`A${rowNum}`).value = 'Contact Window:';
        yearSheet.getCell(`B${rowNum}`).value = fragility.contactWindow;
        rowNum++;
      }

      rowNum += 2;

      // Separator
      yearSheet.mergeCells(`A${rowNum}:H${rowNum}`);
      yearSheet.getCell(`A${rowNum}`).value = '─'.repeat(80);
      rowNum += 2;
    }

    // =======================================================================
    // MEASURE-LEVEL CALCULATIONS
    // =======================================================================

    yearSheet.mergeCells(`A${rowNum}:H${rowNum}`);
    yearSheet.getCell(`A${rowNum}`).value = '═══════════════════════════════════════════════════════════════';
    rowNum++;

    yearSheet.mergeCells(`A${rowNum}:H${rowNum}`);
    yearSheet.getCell(`A${rowNum}`).value = 'SECTION 2: MEASURE-LEVEL PDC (HEDIS - ALL MEDS MERGED)';
    yearSheet.getCell(`A${rowNum}`).font = { bold: true, size: 14 };
    yearSheet.getCell(`A${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } };
    yearSheet.getCell(`A${rowNum}`).font = { bold: true, color: { argb: COLORS.headerText } };
    rowNum += 2;

    // Group by measure
    const byMeasure = new Map<MAMeasure, MedicationDispense[]>();
    for (const d of yearDispenses) {
      const rxnorm = extractMedicationCode(d);
      const measure = rxnorm ? classifyByMeasure(rxnorm) : null;
      if (measure) {
        if (!byMeasure.has(measure)) byMeasure.set(measure, []);
        byMeasure.get(measure)!.push(d);
      }
    }

    for (const [measure, measureDispenses] of byMeasure) {
      const measureName = measure === 'MAC' ? 'Cholesterol (Statins)' :
                          measure === 'MAD' ? 'Diabetes' : 'Hypertension (RAS Antagonists)';

      yearSheet.mergeCells(`A${rowNum}:H${rowNum}`);
      yearSheet.getCell(`A${rowNum}`).value = `▸ ${measure} - ${measureName}`;
      yearSheet.getCell(`A${rowNum}`).font = { bold: true, size: 11 };
      yearSheet.getCell(`A${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } };
      rowNum += 2;

      // Get unique medications in this measure
      const medsInMeasure = new Set<string>();
      for (const d of measureDispenses) {
        medsInMeasure.add(getMedicationDisplay(d));
      }

      yearSheet.getCell(`A${rowNum}`).value = 'Medications Included:';
      yearSheet.getCell(`B${rowNum}`).value = Array.from(medsInMeasure).join(', ');
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Total Fills (all meds):';
      yearSheet.getCell(`B${rowNum}`).value = measureDispenses.length;
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'HEDIS Rule:';
      yearSheet.getCell(`B${rowNum}`).value = 'All medications merged - overlapping coverage counts once';
      yearSheet.getCell(`B${rowNum}`).font = { italic: true };
      rowNum += 2;

      // Convert to fill records
      const fillRecords = measureDispenses
        .map((d) => {
          const fillDate = extractFillDate(d);
          if (!fillDate) return null;
          return { fillDate, daysSupply: extractDaysSupply(d) };
        })
        .filter((r): r is { fillDate: Date; daysSupply: number } => r !== null)
        .sort((a, b) => a.fillDate.getTime() - b.fillDate.getTime());

      if (fillRecords.length === 0) continue;

      const firstFillDate = fillRecords[0].fillDate;
      if (firstFillDate > currentDate) {
        yearSheet.getCell(`A${rowNum}`).value = '⏳ First fill is in the future';
        rowNum += 2;
        continue;
      }

      const measurementPeriod = { start: firstFillDate, end: measurementEnd };

      // Calculate PDC
      const pdcResult = calculatePDC({
        fills: fillRecords,
        measurementPeriod,
        currentDate,
      });

      yearSheet.getCell(`A${rowNum}`).value = 'PDC:';
      yearSheet.getCell(`B${rowNum}`).value = `${pdcResult.pdc.toFixed(2)}%`;
      yearSheet.getCell(`B${rowNum}`).font = { bold: true, size: 12 };

      if (pdcResult.pdc >= 80) {
        yearSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.passBg } };
        yearSheet.getCell(`C${rowNum}`).value = '✓ PASSING';
      } else if (pdcResult.pdc >= 60) {
        yearSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warnBg } };
        yearSheet.getCell(`C${rowNum}`).value = '⚠ AT-RISK';
      } else {
        yearSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.failBg } };
        yearSheet.getCell(`C${rowNum}`).value = '✗ FAILING';
      }
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Covered Days:';
      yearSheet.getCell(`B${rowNum}`).value = `${pdcResult.coveredDays} / ${pdcResult.treatmentDays}`;
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Gap Days Remaining:';
      yearSheet.getCell(`B${rowNum}`).value = pdcResult.gapDaysRemaining;
      rowNum++;

      // Fragility
      const fragility = calculateFragility({
        pdcResult,
        refillsRemaining: 3,
        measureTypes: [measure],
        isNewPatient: false,
        currentDate,
      });

      yearSheet.getCell(`A${rowNum}`).value = 'Fragility Tier:';
      yearSheet.getCell(`B${rowNum}`).value = fragility.tier;
      rowNum++;

      yearSheet.getCell(`A${rowNum}`).value = 'Priority Score:';
      yearSheet.getCell(`B${rowNum}`).value = fragility.priorityScore;
      rowNum += 3;
    }

    // Set column widths
    yearSheet.columns = [
      { width: 30 },
      { width: 25 },
      { width: 40 },
      { width: 15 },
      { width: 20 },
      { width: 20 },
      { width: 15 },
      { width: 15 },
    ];
  }

  // ==========================================================================
  // Save workbook
  // ==========================================================================

  const outputPath = `scripts/pdc-demo/${OUTPUT_FILE}`;
  await workbook.xlsx.writeFile(outputPath);

  console.log(`\n✅ Excel file generated: ${outputPath}`);
  console.log('\nSheets included:');
  workbook.worksheets.forEach((sheet) => {
    console.log(`  - ${sheet.name}`);
  });
}

main().catch(console.error);
