# Claude Code Prompt: PDC Calculation Engine

Use this prompt after completing initial setup.

---

## Prompt

I need to implement the PDC (Proportion of Days Covered) calculation engine for Ignite Health.

**Read the specification first:**
- Read `specs/pdc-calculation.md` for the complete PDC specification
- Read `skills/fhir-resource.md` for FHIR patterns

**CRITICAL:** PDC calculation must be 100% deterministic. NO AI, NO approximations. This is a mathematical formula used for HEDIS Star Ratings.

**Your task:** Implement the PDC calculator.

**Step 1: Create the PDC types**

Create `src/lib/pdc/types.ts`:
```typescript
// Medication classes for HEDIS measures
export type MedicationClass = 'MAD' | 'MAC' | 'MAH';

// Input for PDC calculation
export interface PDCInput {
  patientId: string;
  medicationClass: MedicationClass;
  dispenses: Array<{
    id: string;
    whenHandedOver: string;  // ISO datetime
    daysSupply: number;
    rxNormCode: string;
  }>;
  measurementPeriodStart: string;  // ISO datetime
  measurementPeriodEnd: string;    // ISO datetime
  hospitalizations?: Array<{
    start: string;
    end: string;
  }>;
}

// Output from PDC calculation
export interface PDCOutput {
  pdcScore: number;           // 0.0 to 1.0
  pdcPercentage: number;      // 0 to 100
  isAdherent: boolean;        // >= 0.80
  daysInPeriod: number;
  daysCovered: number;
  daysExcluded: number;
  gaps: Array<{
    start: string;
    end: string;
    daysLength: number;
  }>;
  fillDetails: Array<{
    originalDate: string;
    adjustedDate: string;
    daysSupply: number;
    wasShifted: boolean;
  }>;
  calculatedAt: string;
  version: string;
}
```

**Step 2: Create Zod schemas**

Create `src/lib/pdc/schemas.ts`:
- PDCInputSchema with full validation
- PDCOutputSchema for output validation
- Export both schemas

**Step 3: Implement the calculator**

Create `src/lib/pdc/calculator.ts`:
- Implement `calculatePDC(input: PDCInput): PDCOutput`
- Follow the exact rules from the specification:
  1. Check minimum 2 fills requirement
  2. Determine IPSD (Index Prescription Start Date)
  3. Apply overlap adjustment (shifting)
  4. Calculate excluded days (hospitalizations)
  5. Calculate covered days using Set (no double counting)
  6. Identify gaps
  7. Calculate final PDC score
- Validate output with Zod schema before returning
- Include `version` field for tracking algorithm changes

**Step 4: Create helper functions**

Create `src/lib/pdc/helpers.ts`:
- `daysBetween(start: Date, end: Date): number`
- `addDays(date: Date, days: number): Date`
- `formatDateKey(date: Date): string` (YYYY-MM-DD format)
- `applyOverlapAdjustment(dispenses): AdjustedFill[]`
- `calculateExcludedDays(hospitalizations, period): number`

**Step 5: Create RxNorm code lookup**

Create `src/lib/pdc/rxnorm-codes.ts`:
- Export medication class code lists
- `isInMedicationClass(rxnormCode: string, class: MedicationClass): boolean`
- Include common codes for MAD, MAC, MAH

**Step 6: Write comprehensive tests**

Create `src/lib/pdc/calculator.test.ts`:
- Test perfect adherence (no gaps)
- Test overlap adjustment
- Test less than 2 fills returns 0
- Test hospitalization exclusion
- Test gap identification
- Test edge cases:
  - Fill on last day of period
  - Fill before period starts
  - Zero days supply
  - Duplicate fills on same day

**Step 7: Create Medplum integration**

Create `src/lib/pdc/medplum-integration.ts`:
- `fetchDispensesForPDC(medplum, patientId, medicationClass, startDate): Promise<PDCInput['dispenses']>`
- `storePDCAsObservation(medplum, patientId, medicationClass, pdcResult): Promise<Observation>`
- `getPDCHistory(medplum, patientId, medicationClass): Promise<Observation[]>`

**Requirements:**
- NO floating point errors - use integer arithmetic where possible
- Round final score to 3 decimal places
- Include version string in output for algorithm tracking
- All dates in ISO 8601 format
- Comprehensive error handling
- 100% test coverage for calculator

**Acceptance Criteria:**
1. All test cases pass
2. TypeScript strict mode - no errors
3. PDC calculation matches HEDIS specification exactly
4. Hospitalizations correctly excluded
5. Overlap adjustment correctly implemented
6. Gaps correctly identified

Run `npm test src/lib/pdc` to verify all tests pass.

---

## Verification Checklist

After implementation, verify:

- [ ] `npm test src/lib/pdc` - all tests pass
- [ ] PDC for perfect adherence = 1.0
- [ ] PDC for 50% adherence = 0.5
- [ ] Less than 2 fills = 0
- [ ] Overlapping fills are shifted correctly
- [ ] Hospitalization days excluded from both numerator and denominator
- [ ] Output includes all required fields
- [ ] Version field is populated
