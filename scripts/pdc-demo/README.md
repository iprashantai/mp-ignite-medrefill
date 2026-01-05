# PDC Demo & Verification Scripts

These scripts are for **development, testing, and demonstration purposes only**.
They are NOT part of the production codebase.

## Scripts

### PDC Calculation Demos

| Script | Purpose |
|--------|---------|
| `calculate-real-patient-pdc.ts` | Calculate PDC for a real Medplum patient at both medication-level and measure-level |
| `calculate-sample-pdc.ts` | Calculate PDC using synthetic test fixtures (no Medplum connection required) |
| `find-multi-measure-patient.ts` | Find patients with multiple MA measures (MAC/MAD/MAH) in the same year |

### Verification Scripts

| Script | Purpose |
|--------|---------|
| `verify-medication-pdc.ts` | Unit test-style verification of medication-level PDC calculations |
| `explain-pdc-calculation.ts` | Step-by-step walkthrough of PDC calculation algorithm |
| `explain-pdc-correct.ts` | Detailed explanation of HEDIS interval merging |

## Usage

```bash
# From project root:

# Calculate PDC for a real Medplum patient
npx tsx scripts/pdc-demo/calculate-real-patient-pdc.ts

# Find patients with multiple measures
npx tsx scripts/pdc-demo/find-multi-measure-patient.ts

# Run verification tests
npx tsx scripts/pdc-demo/verify-medication-pdc.ts

# Calculate sample PDC (no Medplum needed)
npx tsx scripts/pdc-demo/calculate-sample-pdc.ts
```

## Configuration

Most scripts use the patient ID at the top of the file. To test with a different patient:

```typescript
// In calculate-real-patient-pdc.ts
const PATIENT_ID = 'your-patient-id-here';
```

## Requirements

- `.env.local` with Medplum credentials (for real patient scripts)
- Node.js with tsx installed

## Related Production Code

- `src/lib/pdc/` - PDC calculation engine
- `src/lib/pdc/refill-calculator.ts` - Coverage shortfall and remaining refills
- `src/lib/fhir/medication-observation-service.ts` - Medication-level FHIR storage
- `src/lib/fhir/dispense-service.ts` - MedicationDispense querying
