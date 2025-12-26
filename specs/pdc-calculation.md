# PDC Calculation Specification

## Overview

Proportion of Days Covered (PDC) is the gold standard measure for medication adherence used by CMS for HEDIS Star Ratings. This specification defines the **deterministic** calculation that MUST be implemented exactly as described.

**CRITICAL**: PDC calculation must NEVER use AI or probabilistic methods. It is a mathematical formula with strict rules.

## Formula

```
PDC = (Number of Days Covered) / (Number of Days in Measurement Period) × 100

Where:
- Days Covered = Days where patient had medication on hand
- Measurement Period = Typically 365 days, or from first fill to end of year
```

## HEDIS Medication Classes

### MAD - Medication Adherence for Diabetes Medications
RxNorm codes for:
- Biguanides (Metformin)
- Sulfonylureas
- Thiazolidinediones
- DPP-4 Inhibitors
- GLP-1 Receptor Agonists
- SGLT2 Inhibitors
- Meglitinides

**Exclusions**: Insulin (tracked separately)

### MAC - Medication Adherence for Cholesterol (Statins)
RxNorm codes for:
- All HMG-CoA Reductase Inhibitors (statins)
  - Atorvastatin
  - Fluvastatin
  - Lovastatin
  - Pitavastatin
  - Pravastatin
  - Rosuvastatin
  - Simvastatin
- Statin combinations

### MAH - Medication Adherence for Hypertension (RAS Antagonists)
RxNorm codes for:
- ACE Inhibitors
- ARBs (Angiotensin Receptor Blockers)
- Direct Renin Inhibitors

## Calculation Rules

### Rule 1: Measurement Period
```typescript
interface MeasurementPeriod {
  start: Date;  // First day of coverage OR first fill date (whichever later)
  end: Date;    // Last day of year OR current date for real-time
}

// Standard HEDIS: Calendar year (Jan 1 - Dec 31)
// For prospective: Calculate from today back 365 days
```

### Rule 2: Index Prescription Start Date (IPSD)
```typescript
// IPSD = Date of first fill during measurement period
// PDC is only calculated if patient has >= 2 fills
// (Need at least 2 fills to measure adherence)

function findIPSD(dispenses: MedicationDispense[]): Date | null {
  const sorted = dispenses.sort((a, b) => 
    new Date(a.whenHandedOver).getTime() - new Date(b.whenHandedOver).getTime()
  );
  
  if (sorted.length < 2) {
    return null; // Cannot calculate PDC with < 2 fills
  }
  
  return new Date(sorted[0].whenHandedOver);
}
```

### Rule 3: Overlap Adjustment (Shifting)
```
When a new fill occurs BEFORE the previous supply runs out:
- Shift the new fill's start date to the day AFTER previous supply ends
- This prevents double-counting days

Example:
Fill 1: Jan 1, 30 days supply → Covers Jan 1-30
Fill 2: Jan 20, 30 days supply → SHIFT to Jan 31, covers Jan 31 - Mar 1
```

```typescript
interface AdjustedFill {
  originalDate: Date;
  adjustedStartDate: Date;
  daysSupply: number;
  coverageEndDate: Date;
}

function adjustForOverlap(dispenses: MedicationDispense[]): AdjustedFill[] {
  const sorted = [...dispenses].sort((a, b) => 
    new Date(a.whenHandedOver).getTime() - new Date(b.whenHandedOver).getTime()
  );
  
  const adjusted: AdjustedFill[] = [];
  let lastCoverageEnd: Date | null = null;
  
  for (const dispense of sorted) {
    const originalDate = new Date(dispense.whenHandedOver);
    const daysSupply = dispense.daysSupply?.value ?? 30;
    
    let adjustedStart: Date;
    
    if (lastCoverageEnd && originalDate <= lastCoverageEnd) {
      // Overlap detected - shift to day after last coverage ends
      adjustedStart = addDays(lastCoverageEnd, 1);
    } else {
      adjustedStart = originalDate;
    }
    
    const coverageEnd = addDays(adjustedStart, daysSupply - 1);
    
    adjusted.push({
      originalDate,
      adjustedStartDate: adjustedStart,
      daysSupply,
      coverageEndDate: coverageEnd,
    });
    
    lastCoverageEnd = coverageEnd;
  }
  
  return adjusted;
}
```

### Rule 4: Days Covered Calculation
```typescript
function calculateDaysCovered(
  adjustedFills: AdjustedFill[],
  measurementPeriod: MeasurementPeriod
): number {
  // Create a Set of covered dates (prevents double counting)
  const coveredDates = new Set<string>();
  
  for (const fill of adjustedFills) {
    let currentDate = fill.adjustedStartDate;
    
    while (currentDate <= fill.coverageEndDate) {
      // Only count if within measurement period
      if (currentDate >= measurementPeriod.start && 
          currentDate <= measurementPeriod.end) {
        coveredDates.add(formatDate(currentDate));
      }
      currentDate = addDays(currentDate, 1);
    }
  }
  
  return coveredDates.size;
}
```

### Rule 5: Excluded Periods
```
Exclude from BOTH numerator and denominator:
- Inpatient hospital stays (patient gets meds in hospital)
- Skilled Nursing Facility stays
- Days after death

These require Encounter resources with appropriate types.
```

```typescript
interface ExcludedPeriod {
  start: Date;
  end: Date;
  reason: 'hospitalization' | 'snf' | 'death';
}

function calculateAdjustedDenominator(
  measurementPeriod: MeasurementPeriod,
  excludedPeriods: ExcludedPeriod[]
): number {
  const totalDays = daysBetween(measurementPeriod.start, measurementPeriod.end) + 1;
  
  let excludedDays = 0;
  for (const period of excludedPeriods) {
    const overlapStart = maxDate(period.start, measurementPeriod.start);
    const overlapEnd = minDate(period.end, measurementPeriod.end);
    
    if (overlapStart <= overlapEnd) {
      excludedDays += daysBetween(overlapStart, overlapEnd) + 1;
    }
  }
  
  return totalDays - excludedDays;
}
```

## Complete PDC Calculator Implementation

```typescript
import { MedicationDispense, Encounter } from '@medplum/fhirtypes';
import { z } from 'zod';

// Input Schema
const PDCInputSchema = z.object({
  patientId: z.string(),
  medicationClass: z.enum(['MAD', 'MAC', 'MAH']),
  dispenses: z.array(z.object({
    id: z.string(),
    whenHandedOver: z.string().datetime(),
    daysSupply: z.number().positive(),
    rxNormCode: z.string(),
  })),
  measurementPeriodStart: z.string().datetime(),
  measurementPeriodEnd: z.string().datetime(),
  hospitalizations: z.array(z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  })).optional(),
});

// Output Schema
const PDCOutputSchema = z.object({
  pdcScore: z.number().min(0).max(1),
  pdcPercentage: z.number().min(0).max(100),
  isAdherent: z.boolean(),
  daysInPeriod: z.number(),
  daysCovered: z.number(),
  daysExcluded: z.number(),
  gaps: z.array(z.object({
    start: z.string(),
    end: z.string(),
    daysLength: z.number(),
  })),
  fillDetails: z.array(z.object({
    originalDate: z.string(),
    adjustedDate: z.string(),
    daysSupply: z.number(),
    wasShifted: z.boolean(),
  })),
  calculatedAt: z.string().datetime(),
  version: z.string(),
});

type PDCInput = z.infer<typeof PDCInputSchema>;
type PDCOutput = z.infer<typeof PDCOutputSchema>;

// Constants
const PDC_CALCULATOR_VERSION = '1.0.0';
const ADHERENCE_THRESHOLD = 0.80; // 80% is standard HEDIS threshold

export function calculatePDC(input: PDCInput): PDCOutput {
  // 1. Validate input
  const validated = PDCInputSchema.parse(input);
  
  // 2. Check minimum requirements
  if (validated.dispenses.length < 2) {
    return {
      pdcScore: 0,
      pdcPercentage: 0,
      isAdherent: false,
      daysInPeriod: 0,
      daysCovered: 0,
      daysExcluded: 0,
      gaps: [],
      fillDetails: [],
      calculatedAt: new Date().toISOString(),
      version: PDC_CALCULATOR_VERSION,
    };
  }
  
  // 3. Sort dispenses by date
  const sortedDispenses = [...validated.dispenses].sort(
    (a, b) => new Date(a.whenHandedOver).getTime() - new Date(b.whenHandedOver).getTime()
  );
  
  // 4. Determine IPSD (Index Prescription Start Date)
  const ipsd = new Date(sortedDispenses[0].whenHandedOver);
  
  // 5. Adjust measurement period start to IPSD if later
  const periodStart = new Date(
    Math.max(ipsd.getTime(), new Date(validated.measurementPeriodStart).getTime())
  );
  const periodEnd = new Date(validated.measurementPeriodEnd);
  
  // 6. Apply overlap adjustment (shifting)
  const adjustedFills = applyOverlapAdjustment(sortedDispenses);
  
  // 7. Calculate excluded days (hospitalizations)
  const excludedDays = calculateExcludedDays(
    validated.hospitalizations || [],
    periodStart,
    periodEnd
  );
  
  // 8. Calculate days in period (denominator)
  const totalDaysInPeriod = daysBetween(periodStart, periodEnd) + 1;
  const adjustedDenominator = totalDaysInPeriod - excludedDays;
  
  // 9. Calculate covered days (numerator)
  const { coveredDays, gaps } = calculateCoveredDaysAndGaps(
    adjustedFills,
    periodStart,
    periodEnd,
    validated.hospitalizations || []
  );
  
  // 10. Calculate PDC
  const pdcScore = adjustedDenominator > 0 
    ? Math.min(coveredDays / adjustedDenominator, 1) 
    : 0;
  
  // 11. Build fill details
  const fillDetails = adjustedFills.map((fill, index) => ({
    originalDate: sortedDispenses[index].whenHandedOver,
    adjustedDate: fill.adjustedStartDate.toISOString(),
    daysSupply: fill.daysSupply,
    wasShifted: fill.adjustedStartDate.getTime() !== new Date(sortedDispenses[index].whenHandedOver).getTime(),
  }));
  
  // 12. Return validated output
  return PDCOutputSchema.parse({
    pdcScore: Math.round(pdcScore * 1000) / 1000, // Round to 3 decimals
    pdcPercentage: Math.round(pdcScore * 100 * 10) / 10, // Round to 1 decimal
    isAdherent: pdcScore >= ADHERENCE_THRESHOLD,
    daysInPeriod: adjustedDenominator,
    daysCovered: coveredDays,
    daysExcluded: excludedDays,
    gaps,
    fillDetails,
    calculatedAt: new Date().toISOString(),
    version: PDC_CALCULATOR_VERSION,
  });
}

// Helper functions
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

interface AdjustedFill {
  adjustedStartDate: Date;
  coverageEndDate: Date;
  daysSupply: number;
}

function applyOverlapAdjustment(
  dispenses: Array<{ whenHandedOver: string; daysSupply: number }>
): AdjustedFill[] {
  const adjusted: AdjustedFill[] = [];
  let lastCoverageEnd: Date | null = null;
  
  for (const dispense of dispenses) {
    const originalDate = new Date(dispense.whenHandedOver);
    const daysSupply = dispense.daysSupply;
    
    let adjustedStart: Date;
    
    if (lastCoverageEnd && originalDate <= lastCoverageEnd) {
      adjustedStart = addDays(lastCoverageEnd, 1);
    } else {
      adjustedStart = originalDate;
    }
    
    const coverageEnd = addDays(adjustedStart, daysSupply - 1);
    
    adjusted.push({
      adjustedStartDate: adjustedStart,
      coverageEndDate: coverageEnd,
      daysSupply,
    });
    
    lastCoverageEnd = coverageEnd;
  }
  
  return adjusted;
}

function calculateExcludedDays(
  hospitalizations: Array<{ start: string; end: string }>,
  periodStart: Date,
  periodEnd: Date
): number {
  let excludedDays = 0;
  
  for (const hosp of hospitalizations) {
    const hospStart = new Date(hosp.start);
    const hospEnd = new Date(hosp.end);
    
    const overlapStart = new Date(Math.max(hospStart.getTime(), periodStart.getTime()));
    const overlapEnd = new Date(Math.min(hospEnd.getTime(), periodEnd.getTime()));
    
    if (overlapStart <= overlapEnd) {
      excludedDays += daysBetween(overlapStart, overlapEnd) + 1;
    }
  }
  
  return excludedDays;
}

function calculateCoveredDaysAndGaps(
  adjustedFills: AdjustedFill[],
  periodStart: Date,
  periodEnd: Date,
  hospitalizations: Array<{ start: string; end: string }>
): { coveredDays: number; gaps: Array<{ start: string; end: string; daysLength: number }> } {
  // Build set of covered dates
  const coveredDates = new Set<string>();
  const excludedDates = new Set<string>();
  
  // Mark hospitalization dates as excluded
  for (const hosp of hospitalizations) {
    let current = new Date(hosp.start);
    const end = new Date(hosp.end);
    while (current <= end) {
      if (current >= periodStart && current <= periodEnd) {
        excludedDates.add(formatDateKey(current));
      }
      current = addDays(current, 1);
    }
  }
  
  // Mark covered dates
  for (const fill of adjustedFills) {
    let current = fill.adjustedStartDate;
    while (current <= fill.coverageEndDate) {
      if (current >= periodStart && current <= periodEnd) {
        const key = formatDateKey(current);
        if (!excludedDates.has(key)) {
          coveredDates.add(key);
        }
      }
      current = addDays(current, 1);
    }
  }
  
  // Find gaps
  const gaps: Array<{ start: string; end: string; daysLength: number }> = [];
  let gapStart: Date | null = null;
  let current = new Date(periodStart);
  
  while (current <= periodEnd) {
    const key = formatDateKey(current);
    const isExcluded = excludedDates.has(key);
    const isCovered = coveredDates.has(key);
    
    if (!isExcluded && !isCovered) {
      // This is a gap day
      if (!gapStart) {
        gapStart = new Date(current);
      }
    } else {
      // Not a gap day
      if (gapStart) {
        // End the current gap
        const gapEnd = addDays(current, -1);
        gaps.push({
          start: formatDateKey(gapStart),
          end: formatDateKey(gapEnd),
          daysLength: daysBetween(gapStart, gapEnd) + 1,
        });
        gapStart = null;
      }
    }
    
    current = addDays(current, 1);
  }
  
  // Handle gap that extends to end of period
  if (gapStart) {
    gaps.push({
      start: formatDateKey(gapStart),
      end: formatDateKey(periodEnd),
      daysLength: daysBetween(gapStart, periodEnd) + 1,
    });
  }
  
  return {
    coveredDays: coveredDates.size,
    gaps,
  };
}
```

## Test Cases

```typescript
describe('PDC Calculator', () => {
  test('perfect adherence - no gaps', () => {
    const result = calculatePDC({
      patientId: 'patient-1',
      medicationClass: 'MAD',
      dispenses: [
        { id: '1', whenHandedOver: '2024-01-01T10:00:00Z', daysSupply: 30, rxNormCode: '860975' },
        { id: '2', whenHandedOver: '2024-01-31T10:00:00Z', daysSupply: 30, rxNormCode: '860975' },
        { id: '3', whenHandedOver: '2024-03-01T10:00:00Z', daysSupply: 30, rxNormCode: '860975' },
      ],
      measurementPeriodStart: '2024-01-01T00:00:00Z',
      measurementPeriodEnd: '2024-03-31T23:59:59Z',
    });
    
    expect(result.pdcScore).toBeGreaterThanOrEqual(0.95);
    expect(result.isAdherent).toBe(true);
  });
  
  test('overlap adjustment', () => {
    const result = calculatePDC({
      patientId: 'patient-2',
      medicationClass: 'MAD',
      dispenses: [
        { id: '1', whenHandedOver: '2024-01-01T10:00:00Z', daysSupply: 30, rxNormCode: '860975' },
        { id: '2', whenHandedOver: '2024-01-15T10:00:00Z', daysSupply: 30, rxNormCode: '860975' }, // Early refill
      ],
      measurementPeriodStart: '2024-01-01T00:00:00Z',
      measurementPeriodEnd: '2024-02-29T23:59:59Z',
    });
    
    // Second fill should be shifted to Jan 31
    expect(result.fillDetails[1].wasShifted).toBe(true);
  });
  
  test('less than 2 fills returns 0', () => {
    const result = calculatePDC({
      patientId: 'patient-3',
      medicationClass: 'MAD',
      dispenses: [
        { id: '1', whenHandedOver: '2024-01-01T10:00:00Z', daysSupply: 30, rxNormCode: '860975' },
      ],
      measurementPeriodStart: '2024-01-01T00:00:00Z',
      measurementPeriodEnd: '2024-03-31T23:59:59Z',
    });
    
    expect(result.pdcScore).toBe(0);
    expect(result.fillDetails).toHaveLength(0);
  });
  
  test('hospitalization exclusion', () => {
    const result = calculatePDC({
      patientId: 'patient-4',
      medicationClass: 'MAD',
      dispenses: [
        { id: '1', whenHandedOver: '2024-01-01T10:00:00Z', daysSupply: 30, rxNormCode: '860975' },
        { id: '2', whenHandedOver: '2024-02-15T10:00:00Z', daysSupply: 30, rxNormCode: '860975' },
      ],
      measurementPeriodStart: '2024-01-01T00:00:00Z',
      measurementPeriodEnd: '2024-02-29T23:59:59Z',
      hospitalizations: [
        { start: '2024-02-01T00:00:00Z', end: '2024-02-10T23:59:59Z' }, // 10 days in hospital
      ],
    });
    
    expect(result.daysExcluded).toBe(10);
    // Denominator should be reduced by hospitalization days
    expect(result.daysInPeriod).toBe(60 - 10); // 60 days in Jan-Feb minus 10 hospital days
  });
  
  test('identifies gaps correctly', () => {
    const result = calculatePDC({
      patientId: 'patient-5',
      medicationClass: 'MAD',
      dispenses: [
        { id: '1', whenHandedOver: '2024-01-01T10:00:00Z', daysSupply: 30, rxNormCode: '860975' },
        // Gap: Feb 1-14 (14 days)
        { id: '2', whenHandedOver: '2024-02-15T10:00:00Z', daysSupply: 30, rxNormCode: '860975' },
      ],
      measurementPeriodStart: '2024-01-01T00:00:00Z',
      measurementPeriodEnd: '2024-03-15T23:59:59Z',
    });
    
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.gaps[0].daysLength).toBe(14);
  });
});
```

## RxNorm Code Lists

The medication class code lists are maintained in a separate configuration file. See `/config/rxnorm-codes.json` for the complete lists.

### Sample Structure
```json
{
  "MAD": {
    "biguanides": ["860975", "860981", "861004", "..."],
    "sulfonylureas": ["197737", "197738", "..."],
    "dpp4_inhibitors": ["593411", "857974", "..."],
    "sglt2_inhibitors": ["1545653", "1545684", "..."],
    "glp1_agonists": ["897122", "1598268", "..."]
  },
  "MAC": {
    "statins": ["262095", "310404", "310405", "..."]
  },
  "MAH": {
    "ace_inhibitors": ["314077", "317173", "..."],
    "arbs": ["349199", "349201", "..."]
  }
}
```

## Integration with Medplum

```typescript
// Store PDC result as FHIR Observation
async function storePDCObservation(
  medplum: MedplumClient,
  patientId: string,
  pdcResult: PDCOutput,
  medicationClass: 'MAD' | 'MAC' | 'MAH'
): Promise<Observation> {
  return medplum.createResource<Observation>({
    resourceType: 'Observation',
    status: 'final',
    category: [{
      coding: [{
        system: 'https://ignitehealth.com/observation-category',
        code: 'adherence-metric',
      }],
    }],
    code: {
      coding: [{
        system: 'https://ignitehealth.com/metrics',
        code: `pdc-${medicationClass.toLowerCase()}`,
        display: `PDC - ${getMedicationClassDisplay(medicationClass)}`,
      }],
    },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: pdcResult.calculatedAt,
    valueQuantity: {
      value: pdcResult.pdcPercentage,
      unit: '%',
      system: 'http://unitsofmeasure.org',
      code: '%',
    },
    interpretation: [{
      coding: [{
        system: 'https://ignitehealth.com/adherence-status',
        code: pdcResult.isAdherent ? 'adherent' : 'non-adherent',
        display: pdcResult.isAdherent ? 'Adherent (≥80%)' : 'Non-Adherent (<80%)',
      }],
    }],
    component: [
      {
        code: { text: 'Days Covered' },
        valueInteger: pdcResult.daysCovered,
      },
      {
        code: { text: 'Days in Period' },
        valueInteger: pdcResult.daysInPeriod,
      },
      {
        code: { text: 'Days Excluded' },
        valueInteger: pdcResult.daysExcluded,
      },
      {
        code: { text: 'Gap Count' },
        valueInteger: pdcResult.gaps.length,
      },
    ],
  });
}
```
