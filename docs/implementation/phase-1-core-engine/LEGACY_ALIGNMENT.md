# Legacy System Alignment Document

## Overview

This document maps the legacy Firebase/Firestore architecture to the new FHIR-native Medplum architecture. The migration strategy preserves **100% of the business logic** from the legacy codebase while replacing the infrastructure with FHIR-native resources via the Medplum SDK.

**Source of Truth:**

- **Business Logic**: Legacy repo at `/Users/arpitjain/work/ignite/medrefills/ignite-medrefills/`
- **Infrastructure**: FHIR-native via Medplum SDK in `/Users/arpitjain/work/ignite/mp-ignite-medrefill/`

---

## Architecture Comparison

### Legacy Stack (Firebase/Firestore)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase/Firestore                            │
├─────────────────────────────────────────────────────────────────┤
│  Collections:                                                    │
│  - allPatients    → Patient demographics + calculated fields     │
│  - rxClaims       → Pharmacy fill records (PDC source)          │
│  - campaigns      → CRM campaign tracking                       │
│  - activityLogs   → Audit trail                                 │
├─────────────────────────────────────────────────────────────────┤
│  Services (JavaScript):                                          │
│  - fragilityTierService.js  → Tier assignment                   │
│  - pdcDataService.js        → PDC calculation                   │
│  - pathwayService.js        → Refill/Renewal routing            │
│  - medAdherenceService.js   → Drug classification               │
└─────────────────────────────────────────────────────────────────┘
```

### New Stack (FHIR-Native Medplum)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Medplum (FHIR R4)                             │
├─────────────────────────────────────────────────────────────────┤
│  Resources:                                                      │
│  - Patient               → Demographics                          │
│  - MedicationDispense    → Pharmacy fills (replaces rxClaims)   │
│  - MedicationRequest     → Active prescriptions                 │
│  - Observation           → PDC scores, risk assessments         │
│  - Task                  → Workflow items for staff review      │
│  - Flag                  → Urgency markers, alerts              │
│  - AuditEvent            → HIPAA-compliant audit trail          │
├─────────────────────────────────────────────────────────────────┤
│  Services (TypeScript):                                          │
│  - src/lib/pdc/fragility.ts     → Tier assignment               │
│  - src/lib/pdc/calculator.ts    → PDC calculation               │
│  - src/lib/pdc/pathway.ts       → Refill/Renewal routing        │
│  - src/lib/fhir/dispense-service.ts → Dispense queries          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Legacy Service to FHIR-Native Mapping

### Service Files

| Legacy Service          | Legacy File Path                          | New FHIR Service | New File Path                       |
| ----------------------- | ----------------------------------------- | ---------------- | ----------------------------------- |
| fragilityTierService    | `src/services/fragilityTierService.js`    | fragility        | `src/lib/pdc/fragility.ts`          |
| pdcDataService          | `src/services/pdcDataService.js`          | calculator       | `src/lib/pdc/calculator.ts`         |
| pathwayService          | `src/services/pathwayService.js`          | pathway          | `src/lib/pdc/pathway.ts`            |
| medAdherenceService     | `src/services/medAdherenceService.js`     | drug-classifier  | `src/lib/pdc/drug-classifier.ts`    |
| coverageCalendarService | `src/services/coverageCalendarService.js` | interval-merger  | `src/lib/pdc/interval-merger.ts`    |
| urgencyIndexService     | `src/services/urgencyIndexService.js`     | priority-score   | `src/lib/pdc/fragility.ts` (merged) |

### Data Source Mapping

| Legacy Data Source   | Legacy Location           | FHIR Resource                   | Access Method               |
| -------------------- | ------------------------- | ------------------------------- | --------------------------- |
| RX Claims Collection | `Firestore: rxClaims`     | `MedicationDispense`            | `medplum.searchResources()` |
| Patient Collection   | `Firestore: allPatients`  | `Patient`                       | `medplum.readResource()`    |
| Medication Info      | Embedded in rxClaims      | `MedicationDispense.medication` | FHIR medication references  |
| PDC Scores           | Calculated + cached       | `Observation`                   | Store as FHIR Observations  |
| Fragility Tiers      | Calculated on-the-fly     | `Extension` or `Observation`    | Custom extensions           |
| Activity Logs        | `Firestore: activityLogs` | `AuditEvent`                    | Built-in FHIR auditing      |

---

## Key Functions to Port

### 1. calculateFragilityTier()

**Legacy Location**: `src/services/fragilityTierService.js` (lines 117-279)

**Port Strategy**: **Port exactly as-is** - This is the core business logic

```typescript
// NEW: src/lib/pdc/fragility.ts

import { z } from 'zod';

// Input Schema (matches legacy parameters)
export const FragilityInputSchema = z.object({
  daysAlreadyCovered: z.number(),
  daysOfSupplyOnHand: z.number(),
  daysRemainingUntilYearEnd: z.number(),
  treatmentDays: z.number(),
  gapDaysRemaining: z.number(),
  remainingRefills: z.number(),
  isCurrentlyOutOfMeds: z.boolean().default(false),
});

export type FragilityInput = z.infer<typeof FragilityInputSchema>;

/**
 * Calculate fragility tier - PORTED EXACTLY FROM LEGACY
 *
 * CRITICAL: Do not modify this algorithm without updating:
 * 1. Legacy goldenStandardTestBed.test.js
 * 2. New fragility.test.ts
 *
 * @see Legacy: src/services/fragilityTierService.js calculateFragilityTier()
 */
export function calculateFragilityTier(input: FragilityInput): FragilityResult {
  const {
    daysAlreadyCovered,
    daysOfSupplyOnHand,
    daysRemainingUntilYearEnd,
    treatmentDays,
    gapDaysRemaining,
    remainingRefills,
    isCurrentlyOutOfMeds = false,
  } = FragilityInputSchema.parse(input);

  // ============================================================================
  // STEP 1: CALCULATE PDC PROJECTIONS (unchanged from legacy)
  // ============================================================================
  const daysFromCurrentSupply = Math.min(daysOfSupplyOnHand, daysRemainingUntilYearEnd);
  const pdcStatusQuo = ((daysAlreadyCovered + daysFromCurrentSupply) / treatmentDays) * 100;
  const pdcPerfect = ((daysAlreadyCovered + daysRemainingUntilYearEnd) / treatmentDays) * 100;

  // ============================================================================
  // STEP 2: CHECK IF COMPLIANT (No action needed) - MUST BE FIRST
  // ============================================================================
  if (pdcStatusQuo >= 80) {
    return createCompliantResult(
      pdcStatusQuo,
      pdcPerfect,
      daysOfSupplyOnHand,
      daysRemainingUntilYearEnd
    );
  }

  // ============================================================================
  // STEP 3: CHECK IF UNSALVAGEABLE (Cannot reach 80%)
  // ============================================================================
  if (pdcPerfect < 80 || gapDaysRemaining < 0) {
    return createUnsalvageableResult(
      pdcStatusQuo,
      pdcPerfect,
      isCurrentlyOutOfMeds,
      gapDaysRemaining
    );
  }

  // ============================================================================
  // STEP 4: PATIENT IS SALVAGEABLE - ASSIGN F1-F5 TIER
  // ============================================================================
  if (remainingRefills === 0) {
    return createF5SafeResult(pdcStatusQuo, pdcPerfect);
  }

  const delayBudget = gapDaysRemaining / remainingRefills;
  return assignTierByDelayBudget(
    delayBudget,
    pdcStatusQuo,
    pdcPerfect,
    isCurrentlyOutOfMeds,
    gapDaysRemaining
  );
}
```

### 2. calculatePriorityScore()

**Legacy Location**: `src/services/fragilityTierService.js` (lines 415-489)

**Port Strategy**: **Port exactly as-is** - Golden Standard bonuses must match

```typescript
// NEW: src/lib/pdc/fragility.ts (continued)

/**
 * Golden Standard Priority Scoring
 * @see Legacy: fragilityTierService.js calculatePriorityScore()
 */
export const PRIORITY_BASE_SCORES: Record<FragilityTier, number> = {
  COMPLIANT: 0,
  F1_IMMINENT: 100,
  F2_FRAGILE: 80,
  F3_MODERATE: 60,
  F4_COMFORTABLE: 40,
  F5_SAFE: 20,
  T5_UNSALVAGEABLE: 0,
};

export const PRIORITY_BONUSES = {
  OUT_OF_MEDICATION: 30,
  Q4: 25,
  MULTIPLE_MA_MEASURES: 15,
  NEW_PATIENT: 10,
} as const;

export function calculatePriorityScore(input: PriorityScoreInput): PriorityScoreResult {
  const {
    fragilityTier,
    daysToRunout,
    measureCount = 1,
    isCurrentlyOutOfMeds = false,
    isQ4 = null,
    isNewPatient = false,
  } = input;

  const baseScore = PRIORITY_BASE_SCORES[fragilityTier.tier] || 0;

  // Golden Standard Bonuses (MetricsReference.jsx lines 1886-1889)
  const outOfMedsBonus = isCurrentlyOutOfMeds ? PRIORITY_BONUSES.OUT_OF_MEDICATION : 0;

  const currentMonth = new Date().getMonth() + 1;
  const isInQ4 = isQ4 !== null ? isQ4 : currentMonth >= 10 && currentMonth <= 12;
  const q4Bonus = isInQ4 ? PRIORITY_BONUSES.Q4 : 0;

  const multiMeasureBonus = measureCount >= 2 ? PRIORITY_BONUSES.MULTIPLE_MA_MEASURES : 0;
  const newPatientBonus = isNewPatient ? PRIORITY_BONUSES.NEW_PATIENT : 0;

  const priorityScore = baseScore + outOfMedsBonus + q4Bonus + multiMeasureBonus + newPatientBonus;

  // Urgency Level Thresholds (Golden Standard)
  let urgencyLevel: UrgencyLevel;
  if (priorityScore >= 150) urgencyLevel = 'EXTREME';
  else if (priorityScore >= 100) urgencyLevel = 'HIGH';
  else if (priorityScore >= 50) urgencyLevel = 'MODERATE';
  else urgencyLevel = 'LOW';

  return {
    priorityScore,
    baseScore,
    outOfMedsBonus,
    q4Bonus,
    multiMeasureBonus,
    newPatientBonus,
    urgencyLevel,
    isQ4: isInQ4,
  };
}
```

### 3. applyQ4Tightening()

**Legacy Location**: `src/services/fragilityTierService.js` (lines 293-356)

**Port Strategy**: **Port exactly as-is** - Critical year-end logic

```typescript
// NEW: src/lib/pdc/fragility.ts (continued)

/**
 * Apply Q4 tightening logic (promote tier if <60 days to year-end AND <=5 gap days)
 * @see Legacy: fragilityTierService.js applyQ4Tightening()
 */
export function applyQ4Tightening(
  fragilityTier: FragilityResult,
  daysToYearEnd: number,
  gapDaysRemaining: number
): FragilityResult {
  // Can't promote COMPLIANT, UNSALVAGEABLE, or already F1
  if (
    fragilityTier.tier === 'COMPLIANT' ||
    fragilityTier.tier === 'T5_UNSALVAGEABLE' ||
    fragilityTier.tier === 'F1_IMMINENT'
  ) {
    return fragilityTier;
  }

  // Q4 tightening rule: <60 days to year-end AND <=5 gap days
  const isQ4Critical = daysToYearEnd < 60 && gapDaysRemaining <= 5;

  if (!isQ4Critical) {
    return fragilityTier;
  }

  const tierPromotions: Record<string, Partial<FragilityResult>> = {
    F5_SAFE: { tier: 'F4_COMFORTABLE', tierLevel: 4, contactWindow: '2 weeks' },
    F4_COMFORTABLE: { tier: 'F3_MODERATE', tierLevel: 3, contactWindow: '1 week' },
    F3_MODERATE: { tier: 'F2_FRAGILE', tierLevel: 2, contactWindow: '48 hours' },
    F2_FRAGILE: { tier: 'F1_IMMINENT', tierLevel: 1, contactWindow: '24 hours' },
  };

  const promotion = tierPromotions[fragilityTier.tier];

  if (!promotion) {
    return fragilityTier;
  }

  return {
    ...fragilityTier,
    ...promotion,
    flags: {
      ...fragilityTier.flags,
      q4Tightened: true,
    },
  };
}
```

### 4. calculatePDCFromClaims() - Adapted for MedicationDispense

**Legacy Location**: `src/services/pdcDataService.js` (lines 95-200)

**Port Strategy**: **Adapt for FHIR** - Same algorithm, different data source

```typescript
// NEW: src/lib/pdc/calculator.ts

import { MedicationDispense } from '@medplum/fhirtypes';

/**
 * Convert MedicationDispense array to coverage intervals
 * Replaces: legacy calculatePDCFromClaims rxClaims parsing
 */
function dispenseToIntervals(dispenses: MedicationDispense[]): CoverageInterval[] {
  return dispenses
    .filter((d) => d.status === 'completed') // Exclude entered-in-error (replaces Reversal_Flag check)
    .map((d) => ({
      start: new Date(d.whenHandedOver || ''),
      daysSupply: d.daysSupply?.value || 0,
    }))
    .filter((d) => !isNaN(d.start.getTime()) && d.daysSupply > 0)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Calculate PDC from FHIR MedicationDispense resources
 * @see Legacy: pdcDataService.js calculatePDCFromClaims()
 */
export function calculatePDC(dispenses: MedicationDispense[]): PDCResult {
  if (!dispenses || dispenses.length === 0) {
    return createEmptyPDCResult();
  }

  const intervals = dispenseToIntervals(dispenses);

  if (intervals.length === 0) {
    return createEmptyPDCResult();
  }

  // Treatment period calculation (unchanged from legacy)
  const firstFillDate = intervals[0].start;
  const today = new Date();
  const currentYear = today.getFullYear();
  const endOfYear = new Date(currentYear, 11, 31);
  const treatmentPeriodEnd = today < endOfYear ? today : endOfYear;
  const treatmentDays =
    Math.floor((treatmentPeriodEnd.getTime() - firstFillDate.getTime()) / (1000 * 60 * 60 * 24)) +
    1;

  // Coverage calculation with interval merging (unchanged algorithm)
  const mergedIntervals = mergeOverlappingIntervals(intervals, treatmentPeriodEnd);
  const coveredDays = calculateCoveredDays(mergedIntervals);

  // PDC formula (unchanged from legacy)
  const pdc = treatmentDays > 0 ? Math.round((coveredDays / treatmentDays) * 1000) / 10 : 0;

  // Gap days calculation (unchanged from legacy)
  const gapDaysUsed = treatmentDays - coveredDays;
  const gapDaysAllowed = Math.floor(treatmentDays * 0.2);
  const gapDaysRemaining = gapDaysAllowed - gapDaysUsed;

  // Status determination (unchanged thresholds)
  let status: PDCStatus = 'passing';
  if (pdc < 60) status = 'failing';
  else if (pdc < 80) status = 'at-risk';

  // Runout calculation from most recent dispense
  const lastDispense = dispenses[dispenses.length - 1];
  const runoutInfo = calculateRunout(lastDispense);

  return {
    pdc,
    status,
    gapDaysRemaining,
    gapDaysUsed,
    gapDaysAllowed,
    coveredDays,
    treatmentDays,
    fillCount: intervals.length,
    ...runoutInfo,
  };
}
```

---

## Data Transformation Mapping

### RX Claim to MedicationDispense

| Legacy RX Claim Field         | FHIR MedicationDispense Path                           | Transformation Notes          |
| ----------------------------- | ------------------------------------------------------ | ----------------------------- |
| `Rx_Date_Of_Service`          | `whenHandedOver`                                       | ISO 8601 format               |
| `days_supply` / `Days_Supply` | `daysSupply.value`                                     | Integer                       |
| `Reversal_Flag` ('R', 'Y')    | `status`                                               | 'entered-in-error' = reversal |
| `Drug_Name` / `Generic_Name`  | `medicationCodeableConcept.coding[].display`           | Text                          |
| `Rx_NDC_Code` / `NDC`         | `medicationCodeableConcept.coding[].code` (NDC system) | NDC-11 format                 |
| `Member_Id`                   | `subject.reference`                                    | `Patient/{id}`                |
| `Dosage_Form`                 | `dosageInstruction[].doseAndRate[].type`               | CodeableConcept               |
| `Quantity_Dispensed`          | `quantity.value`                                       | Decimal                       |
| `Pharmacy_NPI`                | `performer[].actor.reference`                          | `Organization/{id}`           |

### Code Example: Legacy RX Claim to FHIR MedicationDispense

```typescript
// Legacy RX Claim structure (from Firestore rxClaims)
interface LegacyRxClaim {
  Rx_Date_Of_Service: string; // "2024-03-15"
  days_supply: number; // 90
  Reversal_Flag: 'N' | 'R' | 'Y';
  Drug_Name: string; // "ATORVASTATIN 40MG TABLET"
  Generic_Name: string; // "ATORVASTATIN CALCIUM"
  Rx_NDC_Code: string; // "00071015623"
  Member_Id: string; // "PAT123"
  Quantity_Dispensed: number; // 90
}

// FHIR MedicationDispense equivalent
const dispense: MedicationDispense = {
  resourceType: 'MedicationDispense',
  status: claim.Reversal_Flag === 'N' ? 'completed' : 'entered-in-error',
  medicationCodeableConcept: {
    coding: [
      {
        system: 'http://hl7.org/fhir/sid/ndc',
        code: claim.Rx_NDC_Code,
        display: claim.Drug_Name,
      },
      {
        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        // RxNorm code would be looked up
        display: claim.Generic_Name,
      },
    ],
    text: claim.Drug_Name,
  },
  subject: {
    reference: `Patient/${claim.Member_Id}`,
  },
  whenHandedOver: claim.Rx_Date_Of_Service,
  quantity: {
    value: claim.Quantity_Dispensed,
    unit: 'tablets',
    system: 'http://unitsofmeasure.org',
  },
  daysSupply: {
    value: claim.days_supply,
    unit: 'days',
    system: 'http://unitsofmeasure.org',
  },
};
```

---

## Golden Standard Constants to Preserve

These constants are **immutable** and must be preserved exactly in the new implementation.

### From `goldenStandardTestBed.test.js`

```typescript
// src/lib/pdc/constants.ts

/**
 * GOLDEN STANDARD - Authoritative thresholds from legacy MetricsReference.jsx
 * DO NOT MODIFY without updating goldenStandardTestBed.test.js
 */
export const GOLDEN_STANDARD = {
  // Tier thresholds (Delay Budget = Gap Days Remaining / Remaining Refills)
  tiers: {
    COMPLIANT: { check: 'PDC Status Quo >= 80%', contactWindow: 'Monitor only' },
    T5_UNSALVAGEABLE: { check: 'PDC Perfect < 80%', contactWindow: 'None - cannot reach 80%' },
    F1_IMMINENT: { delayBudget: { min: 0, max: 2 }, contactWindow: '24 hours' },
    F2_FRAGILE: { delayBudget: { min: 3, max: 5 }, contactWindow: '48 hours' },
    F3_MODERATE: { delayBudget: { min: 6, max: 10 }, contactWindow: '1 week' },
    F4_COMFORTABLE: { delayBudget: { min: 11, max: 20 }, contactWindow: '2 weeks' },
    F5_SAFE: { delayBudget: { min: 21, max: Infinity }, contactWindow: 'Monthly' },
  },

  // Priority base scores
  priorityScores: {
    COMPLIANT: 0,
    F1_IMMINENT: 100,
    F2_FRAGILE: 80,
    F3_MODERATE: 60,
    F4_COMFORTABLE: 40,
    F5_SAFE: 20,
    T5_UNSALVAGEABLE: 0,
  },

  // Priority bonuses
  bonuses: {
    outOfMedication: 30,
    q4: 25,
    multipleMAMeasures: 15,
    newPatient: 10,
  },

  // Urgency index levels
  urgencyLevels: {
    extreme: { min: 150 },
    high: { min: 100, max: 149 },
    moderate: { min: 50, max: 99 },
    low: { min: 0, max: 49 },
  },

  // PDC thresholds
  pdcThresholds: {
    passing: 80,
    atRisk: 60,
    failing: 0,
  },
} as const;
```

### Tier Test Cases (from Golden Standard)

```typescript
// src/lib/pdc/__tests__/fixtures/tier-test-cases.ts

export const TIER_TEST_CASES = [
  // F1: Delay Budget <= 2
  {
    name: 'F1 at boundary (2)',
    gapDaysRemaining: 6,
    remainingRefills: 3,
    expectedTier: 'F1_IMMINENT',
    delayBudget: 2,
  },
  {
    name: 'F1 below boundary (1)',
    gapDaysRemaining: 3,
    remainingRefills: 3,
    expectedTier: 'F1_IMMINENT',
    delayBudget: 1,
  },
  {
    name: 'F1 at very low (0.33)',
    gapDaysRemaining: 1,
    remainingRefills: 3,
    expectedTier: 'F1_IMMINENT',
    delayBudget: 0.33,
  },

  // F2: Delay Budget 3-5
  {
    name: 'F2 at lower boundary (3)',
    gapDaysRemaining: 9,
    remainingRefills: 3,
    expectedTier: 'F2_FRAGILE',
    delayBudget: 3,
  },
  {
    name: 'F2 mid-range (4)',
    gapDaysRemaining: 12,
    remainingRefills: 3,
    expectedTier: 'F2_FRAGILE',
    delayBudget: 4,
  },
  {
    name: 'F2 at upper boundary (5)',
    gapDaysRemaining: 15,
    remainingRefills: 3,
    expectedTier: 'F2_FRAGILE',
    delayBudget: 5,
  },

  // F3: Delay Budget 6-10
  {
    name: 'F3 at lower boundary (6)',
    gapDaysRemaining: 18,
    remainingRefills: 3,
    expectedTier: 'F3_MODERATE',
    delayBudget: 6,
  },
  {
    name: 'F3 mid-range (8)',
    gapDaysRemaining: 24,
    remainingRefills: 3,
    expectedTier: 'F3_MODERATE',
    delayBudget: 8,
  },
  {
    name: 'F3 at upper boundary (10)',
    gapDaysRemaining: 30,
    remainingRefills: 3,
    expectedTier: 'F3_MODERATE',
    delayBudget: 10,
  },

  // F4: Delay Budget 11-20
  {
    name: 'F4 at lower boundary (11)',
    gapDaysRemaining: 33,
    remainingRefills: 3,
    expectedTier: 'F4_COMFORTABLE',
    delayBudget: 11,
  },
  {
    name: 'F4 mid-range (15)',
    gapDaysRemaining: 45,
    remainingRefills: 3,
    expectedTier: 'F4_COMFORTABLE',
    delayBudget: 15,
  },
  {
    name: 'F4 at upper boundary (20)',
    gapDaysRemaining: 60,
    remainingRefills: 3,
    expectedTier: 'F4_COMFORTABLE',
    delayBudget: 20,
  },

  // F5: Delay Budget > 20
  {
    name: 'F5 at lower boundary (21)',
    gapDaysRemaining: 63,
    remainingRefills: 3,
    expectedTier: 'F5_SAFE',
    delayBudget: 21,
  },
  {
    name: 'F5 high value (30)',
    gapDaysRemaining: 90,
    remainingRefills: 3,
    expectedTier: 'F5_SAFE',
    delayBudget: 30,
  },
  {
    name: 'F5 very high (50)',
    gapDaysRemaining: 150,
    remainingRefills: 3,
    expectedTier: 'F5_SAFE',
    delayBudget: 50,
  },
];
```

### Priority Score Test Cases

```typescript
// src/lib/pdc/__tests__/fixtures/priority-test-cases.ts

export const PRIORITY_SCORE_TEST_CASES = [
  // Base scores only (no bonuses)
  { tier: 'F1_IMMINENT', bonuses: {}, expectedScore: 100 },
  { tier: 'F2_FRAGILE', bonuses: {}, expectedScore: 80 },
  { tier: 'F3_MODERATE', bonuses: {}, expectedScore: 60 },
  { tier: 'F4_COMFORTABLE', bonuses: {}, expectedScore: 40 },
  { tier: 'F5_SAFE', bonuses: {}, expectedScore: 20 },
  { tier: 'COMPLIANT', bonuses: {}, expectedScore: 0 },
  { tier: 'T5_UNSALVAGEABLE', bonuses: {}, expectedScore: 0 },

  // With Out of Meds bonus (+30)
  { tier: 'F1_IMMINENT', bonuses: { outOfMeds: true }, expectedScore: 130 },
  { tier: 'F2_FRAGILE', bonuses: { outOfMeds: true }, expectedScore: 110 },

  // With Q4 bonus (+25)
  { tier: 'F1_IMMINENT', bonuses: { q4: true }, expectedScore: 125 },
  { tier: 'F2_FRAGILE', bonuses: { q4: true }, expectedScore: 105 },

  // With Multiple MA Measures bonus (+15)
  { tier: 'F1_IMMINENT', bonuses: { multiMA: true }, expectedScore: 115 },
  { tier: 'F3_MODERATE', bonuses: { multiMA: true }, expectedScore: 75 },

  // With New Patient bonus (+10)
  { tier: 'F1_IMMINENT', bonuses: { newPatient: true }, expectedScore: 110 },
  { tier: 'F4_COMFORTABLE', bonuses: { newPatient: true }, expectedScore: 50 },

  // Multiple bonuses combined
  { tier: 'F1_IMMINENT', bonuses: { outOfMeds: true, q4: true }, expectedScore: 155 },
  {
    tier: 'F1_IMMINENT',
    bonuses: { outOfMeds: true, q4: true, multiMA: true },
    expectedScore: 170,
  },
  {
    tier: 'F1_IMMINENT',
    bonuses: { outOfMeds: true, q4: true, multiMA: true, newPatient: true },
    expectedScore: 180,
  },
  {
    tier: 'F2_FRAGILE',
    bonuses: { outOfMeds: true, q4: true, multiMA: true, newPatient: true },
    expectedScore: 160,
  },
];
```

### Real-World Scenarios

```typescript
// src/lib/pdc/__tests__/fixtures/real-world-scenarios.ts

export const REAL_WORLD_SCENARIOS = [
  {
    name: 'John - Critical Q4 Patient',
    description: 'Out of meds, Q4, 3 MA measures, critical tier',
    params: {
      daysAlreadyCovered: 280,
      daysOfSupplyOnHand: 0,
      daysRemainingUntilYearEnd: 45,
      treatmentDays: 365,
      gapDaysRemaining: 4,
      remainingRefills: 2,
      isCurrentlyOutOfMeds: true,
    },
    bonuses: { outOfMeds: true, q4: true, multiMA: true },
    expectedTier: 'F1_IMMINENT',
    expectedScoreRange: { min: 150, max: 200 },
    expectedUrgency: 'EXTREME',
  },
  {
    name: 'Sarah - Compliant Patient',
    description: 'High coverage, PDC Status Quo >= 80%',
    params: {
      daysAlreadyCovered: 300,
      daysOfSupplyOnHand: 30,
      daysRemainingUntilYearEnd: 30,
      treatmentDays: 365,
      gapDaysRemaining: 40,
      remainingRefills: 1,
      isCurrentlyOutOfMeds: false,
    },
    bonuses: {},
    expectedTier: 'COMPLIANT',
    expectedScoreRange: { min: 0, max: 0 },
    expectedUrgency: 'LOW',
  },
  {
    name: 'Robert - Unsalvageable',
    description: 'Too many gap days, cannot reach 80%',
    params: {
      daysAlreadyCovered: 200,
      daysOfSupplyOnHand: 5,
      daysRemainingUntilYearEnd: 30,
      treatmentDays: 365,
      gapDaysRemaining: -10,
      remainingRefills: 1,
      isCurrentlyOutOfMeds: false,
    },
    bonuses: {},
    expectedTier: 'T5_UNSALVAGEABLE',
    expectedScoreRange: { min: 0, max: 0 },
    expectedUrgency: 'LOW',
  },
];
```

### Edge Cases

```typescript
// src/lib/pdc/__tests__/fixtures/edge-cases.ts

export const EDGE_CASES = [
  {
    name: 'Zero remaining refills',
    params: { remainingRefills: 0, gapDaysRemaining: 10 },
    description: 'Should handle division by zero gracefully',
  },
  {
    name: 'Negative gap days remaining',
    params: { gapDaysRemaining: -5 },
    expectedTier: 'T5_UNSALVAGEABLE',
    description: 'Negative gap days = already exceeded budget',
  },
  {
    name: 'Zero days to year end',
    params: { daysRemainingUntilYearEnd: 0 },
    description: 'Year end edge case',
  },
  {
    name: 'Very high gap days remaining',
    params: { gapDaysRemaining: 100, remainingRefills: 1 },
    expectedTier: 'F5_SAFE',
    description: 'Very comfortable patient',
  },
  {
    name: 'Single refill remaining',
    params: { remainingRefills: 1, gapDaysRemaining: 5 },
    expectedTier: 'F2_FRAGILE',
    description: 'Delay budget = 5',
  },
];
```

---

## Critical Rules from Legacy

### Rule 1: COMPLIANT Check Happens FIRST

```typescript
// CORRECT ORDER (from legacy fragilityTierService.js line 142)
// Step 1: Check COMPLIANT first
if (pdcStatusQuo >= 80) {
  return { tier: 'COMPLIANT', ... };
}

// Step 2: Check T5 UNSALVAGEABLE
if (pdcPerfect < 80 || gapDaysRemaining < 0) {
  return { tier: 'T5_UNSALVAGEABLE', ... };
}

// Step 3: Assign F1-F5 based on delay budget
const delayBudget = gapDaysRemaining / remainingRefills;
// ...

// WRONG: Checking delay budget before COMPLIANT
// A patient with pdcStatusQuo=82% and delayBudget=1 should be COMPLIANT, not F1
```

### Rule 2: T5 Check for Multiple Conditions

```typescript
// T5 UNSALVAGEABLE conditions (legacy line 166)
if (pdcPerfect < 80 || gapDaysRemaining < 0) {
  return { tier: 'T5_UNSALVAGEABLE', ... };
}

// Two separate conditions:
// 1. pdcPerfect < 80% - mathematically impossible to reach 80%
// 2. gapDaysRemaining < 0 - already exceeded 20% gap budget
```

### Rule 3: Delay Budget Formula

```typescript
// Delay Budget = Gap Days Remaining / Remaining Refills (legacy line 211)
const delayBudget = gapDaysRemaining / remainingRefills;

// NOT: raw gapDaysRemaining
// NOT: gapDaysRemaining / daysToYearEnd
// NOT: any other formula
```

### Rule 4: Tier Thresholds (Inclusive/Exclusive Boundaries)

```typescript
// F1: delayBudget <= 2 (legacy line 217)
if (delayBudget <= 2) return 'F1_IMMINENT';
// F2: 2 < delayBudget <= 5 (legacy line 225)
else if (delayBudget <= 5) return 'F2_FRAGILE';
// F3: 5 < delayBudget <= 10 (legacy line 233)
else if (delayBudget <= 10) return 'F3_MODERATE';
// F4: 10 < delayBudget <= 20 (legacy line 241)
else if (delayBudget <= 20) return 'F4_COMFORTABLE';
// F5: delayBudget > 20 (legacy line 249)
else return 'F5_SAFE';
```

### Rule 5: Q4 Tightening Conditions

```typescript
// Q4 tightening rule (legacy line 302)
const isQ4Critical = daysToYearEnd < 60 && gapDaysRemaining <= 5;

// Both conditions must be true:
// 1. daysToYearEnd < 60 (NOT <=)
// 2. gapDaysRemaining <= 5
```

---

## Pathway Service Alignment

### Legacy Pathway Constants

```typescript
// From pathwayService.js

export const RX_VALIDITY_PERIOD_DAYS = 365;
export const RECENT_VISIT_THRESHOLD_DAYS = 90;

export const PATHWAYS = {
  A_REFILL: {
    code: 'A',
    name: 'REFILL',
    status: 'REFILL_PENDING',
    sla: { days: 7 },
    flagBefore: 7,
    description: 'Has refills + Valid Rx',
  },
  B_RENEWAL: {
    code: 'B',
    name: 'RENEWAL',
    status: 'RENEWAL_PENDING',
    sla: { days: 14 },
    flagBefore: 30,
    description: 'Expired Rx OR No refills + Recent visit',
  },
  C_APPOINTMENT: {
    code: 'C',
    name: 'APPOINTMENT',
    status: 'APPOINTMENT_NEEDED',
    sla: { days: 30 },
    flagBefore: 60,
    description: 'No refills + No recent visit',
  },
};
```

### FHIR Native Pathway Service

```typescript
// NEW: src/lib/pdc/pathway.ts

import { MedicationRequest, Encounter } from '@medplum/fhirtypes';

export const RX_VALIDITY_PERIOD_DAYS = 365;
export const RECENT_VISIT_THRESHOLD_DAYS = 90;

export interface PathwayResult {
  pathwayCode: 'A' | 'B' | 'C';
  type: 'REFILL' | 'RENEWAL' | 'NO RX';
  status: 'REFILL_PENDING' | 'RENEWAL_PENDING' | 'APPOINTMENT_NEEDED';
  sla: { days: number };
  flagBefore: number;
  reasoning: string[];
}

/**
 * Determine pathway from FHIR resources
 * @param request - Active MedicationRequest
 * @param recentEncounters - Recent Encounter resources
 */
export function determinePathwayFromFHIR(
  request: MedicationRequest | null,
  recentEncounters: Encounter[]
): PathwayResult {
  const refillsRemaining = request?.dispenseRequest?.numberOfRepeatsAllowed ?? 0;
  const rxDate = request?.authoredOn ? new Date(request.authoredOn) : null;
  const lastVisit = getLastEncounterDate(recentEncounters);

  return determinePathway({
    refillsRemaining,
    rxDate,
    lastVisitDate: lastVisit,
  });
}

function getLastEncounterDate(encounters: Encounter[]): Date | null {
  const sorted = encounters
    .filter((e) => e.period?.start)
    .sort((a, b) => new Date(b.period!.start!).getTime() - new Date(a.period!.start!).getTime());

  return sorted.length > 0 ? new Date(sorted[0].period!.start!) : null;
}
```

---

## Test Migration Strategy

### Running Legacy Tests Against New Code

```bash
# Run legacy Golden Standard tests to validate new implementation
cd /Users/arpitjain/work/ignite/medrefills/ignite-medrefills
npm test -- --run src/services/__tests__/goldenStandardTestBed.test.js

# Run new FHIR-native tests
cd /Users/arpitjain/work/ignite/mp-ignite-medrefill
npm test -- src/lib/pdc/__tests__/
```

### Test Parity Checklist

| Test Category        | Legacy Test File              | New Test File       | Status  |
| -------------------- | ----------------------------- | ------------------- | ------- |
| Tier Thresholds      | goldenStandardTestBed.test.js | fragility.test.ts   | Pending |
| Priority Scores      | goldenStandardTestBed.test.js | fragility.test.ts   | Pending |
| PDC Calculation      | pdcDataService tests          | calculator.test.ts  | Pending |
| Gap Days             | goldenStandardTestBed.test.js | calculator.test.ts  | Pending |
| Q4 Tightening        | goldenStandardTestBed.test.js | fragility.test.ts   | Pending |
| Pathway Logic        | pathwayService tests          | pathway.test.ts     | Pending |
| Edge Cases           | goldenStandardTestBed.test.js | edge-cases.test.ts  | Pending |
| Real-World Scenarios | goldenStandardTestBed.test.js | integration.test.ts | Pending |

---

## Migration Validation Criteria

### Phase 1 Completion Criteria

1. **100% Golden Standard Test Parity**
   - All 16+ test suites from goldenStandardTestBed.test.js pass
   - All TIER_TEST_CASES produce identical results
   - All PRIORITY_SCORE_TEST_CASES produce identical results
   - All REAL_WORLD_SCENARIOS produce identical results
   - All EDGE_CASES handled identically

2. **Algorithm Fidelity**
   - COMPLIANT check order preserved
   - T5 check conditions preserved
   - Delay Budget formula preserved
   - Q4 tightening logic preserved
   - Priority bonus values preserved

3. **Data Transformation Accuracy**
   - MedicationDispense -> Coverage intervals mapping tested
   - Reversal handling (status = 'entered-in-error') tested
   - Date parsing edge cases tested
   - Days supply extraction tested

4. **FHIR Compliance**
   - All outputs conform to FHIR R4 spec
   - Extensions use proper Ignite Health URLs
   - Observations use correct LOINC/SNOMED codes
   - Resources pass FHIR validation

---

## Appendix: File Cross-Reference

| New File                                   | Legacy Source                                 | Notes               |
| ------------------------------------------ | --------------------------------------------- | ------------------- |
| `src/lib/pdc/types.ts`                     | TypeScript equivalent of legacy JS shapes     | New                 |
| `src/lib/pdc/constants.ts`                 | goldenStandardTestBed.test.js GOLDEN_STANDARD | Direct copy         |
| `src/lib/pdc/calculator.ts`                | pdcDataService.js calculatePDCFromClaims      | Adapted for FHIR    |
| `src/lib/pdc/fragility.ts`                 | fragilityTierService.js (full file)           | Direct port         |
| `src/lib/pdc/pathway.ts`                   | pathwayService.js                             | Adapted for FHIR    |
| `src/lib/fhir/dispense-service.ts`         | N/A                                           | New FHIR service    |
| `src/lib/fhir/observation-service.ts`      | N/A                                           | New FHIR service    |
| `src/lib/fhir/types.ts`                    | N/A                                           | New FHIR extensions |
| `src/lib/pdc/__tests__/fragility.test.ts`  | goldenStandardTestBed.test.js                 | Port + extend       |
| `src/lib/pdc/__tests__/calculator.test.ts` | Various PDC tests                             | Port + extend       |
