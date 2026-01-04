::: {#title-block-header}

# Test Scenarios - Fragility Tiers {#test-scenarios---fragility-tiers .title}

:::

# Test Scenarios: Fragility Tiers & Priority Scoring

**Purpose:** Example patients for QA testing of each fragility tier and
priority calculation.

---

## Test Scenario Overview

---

Scenario Tier PDC Gap Days Remaining Days Supply Expected Priority

---

TS-01 F1 Critical 72% 2 days 0 (out) CRITICAL (155 pts)

TS-02 F1 Critical 68% 3 days 5 days HIGH (125 pts)

TS-03 F2 Fragile 75% 8 days 0 (out) HIGH (110 pts)

TS-04 F2 Fragile 78% 10 days 14 days WATCH (80 pts)

TS-05 F3 Moderate 82% 18 days 3 days MEDIUM (60 pts)

TS-06 F4 Stable 85% 35 days 20 days LOW (40 pts)

TS-07 F5 Safe 92% 50 days 45 days LOW (20 pts)

TS-08 T5 Lost 55% -15 days 30 days N/A
(unsalvageable)

TS-09 COMPLIANT 88% 25 days 60 days N/A (already
passing)

TS-10 D1a At-Risk N/A N/A 5 days URGENT (1-fill
patient)

---

---

## Detailed Test Scenarios

### TS-01: F1 Critical + Out of Meds + Q4

**Patient:** Maria Gonzalez (DEMO_001) **Medication:** Lisinopril 10mg
(MAH)

Field Value

---

First Fill Date Jan 15, 2025
Treatment Period 351 days
Covered Days 253 days
Current PDC 72.1%
Gap Days Used 98 days
Gap Days Allowed 70 days (351 x 20%)
Gap Days Remaining -28 days (NEGATIVE)
Last Fill Date Oct 1, 2025
Days Supply 30 days
Runout Date Oct 31, 2025
Days to Runout -3 days (OUT)
Refills Remaining 2

**Calculations:** - Delay Budget = N/A (already negative gap days) -
Wait... recalculating: If Gap Days Remaining = 2 and Refills Needed =
2 - Delay Budget = 2 / 2 = 1 day per refill = **F1 Critical**

**Priority Score:** - Base (F1): 100 pts - Out of Meds: +30 pts - Q4
(October): +25 pts - **Total: 155 pts = EXTREME**

**Expected Behavior:** - Displayed in CRITICAL queue - Red urgency
badge - Contact within 24 hours - Cannot afford ANY delay

---

### TS-02: F1 Critical + Some Supply

**Patient:** Robert Chen (DEMO_002) **Medication:** Metformin 500mg
(MAD)

Field Value

---

First Fill Date Feb 1, 2025
Treatment Period 334 days
Covered Days 227 days
Current PDC 67.9%
Gap Days Used 107 days
Gap Days Allowed 67 days
Gap Days Remaining 3 days (barely any cushion)
Days to Runout 5 days
Refills Needed 3

**Calculations:** - Delay Budget = 3 / 3 = 1 day per refill = **F1
Critical**

**Priority Score:** - Base (F1): 100 pts - Q4: +25 pts - **Total: 125
pts = HIGH**

**Expected Behavior:** - HIGH priority queue - Red/orange badge -
Contact within 24 hours - Patient has 5 days supply but ZERO margin for
delay

---

### TS-03: F2 Fragile + Out of Meds

**Patient:** Sarah Williams (DEMO_003) **Medication:** Atorvastatin 20mg
(MAC)

Field Value

---

First Fill Date Mar 1, 2025
Treatment Period 306 days
Covered Days 229 days
Current PDC 74.8%
Gap Days Remaining 8 days
Days to Runout -2 days (OUT 2 days)
Refills Needed 2

**Calculations:** - Delay Budget = 8 / 2 = 4 days per refill = **F2
Fragile**

**Priority Score:** - Base (F2): 80 pts - Out of Meds: +30 pts -
**Total: 110 pts = HIGH**

**Expected Behavior:** - HIGH queue (out of meds elevates priority) -
Contact within 48 hours - Still salvageable but urgent

---

### TS-04: F2 Fragile + Adequate Supply

**Patient:** James Thompson (DEMO_004) **Medication:** Losartan 50mg
(MAH)

Field Value

---

Current PDC 78.2%
Gap Days Remaining 10 days
Days to Runout 14 days
Refills Needed 2

**Calculations:** - Delay Budget = 10 / 2 = 5 days per refill = **F2
Fragile**

**Priority Score:** - Base (F2): 80 pts - **Total: 80 pts = MODERATE**

**Expected Behavior:** - WATCH queue - Has time but fragile - Proactive
outreach 7 days before runout

---

### TS-05: F3 Moderate

**Patient:** Linda Davis (DEMO_005) **Medication:** Glipizide 5mg (MAD)

Field Value

---

Current PDC 82.4%
Gap Days Remaining 18 days
Days to Runout 3 days
Refills Needed 2

**Calculations:** - Delay Budget = 18 / 2 = 9 days per refill = **F3
Moderate**

**Priority Score:** - Base (F3): 60 pts - **Total: 60 pts = MODERATE**

**Expected Behavior:** - MEDIUM queue - Running low but has cushion -
Contact within 1 week

---

### TS-06: F4 Stable

**Patient:** Michael Brown (DEMO_006) **Medication:** Rosuvastatin 10mg
(MAC)

Field Value

---

Current PDC 85.1%
Gap Days Remaining 35 days
Days to Runout 20 days
Refills Needed 2

**Calculations:** - Delay Budget = 35 / 2 = 17.5 days per refill = **F4
Stable**

**Priority Score:** - Base (F4): 40 pts - **Total: 40 pts = LOW**

**Expected Behavior:** - LOW queue - Passing PDC, comfortable cushion -
Check in 2 weeks

---

### TS-07: F5 Safe

**Patient:** Patricia Johnson (DEMO_007) **Medication:** Valsartan 80mg
(MAH)

Field Value

---

Current PDC 92.3%
Gap Days Remaining 50 days
Days to Runout 45 days
Refills Needed 2

**Calculations:** - Delay Budget = 50 / 2 = 25 days per refill = **F5
Safe**

**Priority Score:** - Base (F5): 20 pts - **Total: 20 pts = LOW**

**Expected Behavior:** - Monitor monthly - Excellent adherence - No
intervention needed

---

### TS-08: T5 Lost (Unsalvageable)

**Patient:** David Martinez (DEMO_008) **Medication:** Amlodipine 5mg
(MAH)

Field Value

---

Current PDC 55.2%
Gap Days Used 150 days
Gap Days Allowed 73 days
Gap Days Remaining -77 days (deeply negative)
PDC Perfect 72% (even with perfect adherence)
Days to Runout 30 days

**Calculations:** - PDC Perfect \< 80% = **T5 Lost** - Cannot reach
compliance this year

**Expected Behavior:** - Removed from active prioritization - Mark for
next year planning - Consider for 2026 outreach

---

### TS-09: COMPLIANT (Already Passing)

**Patient:** Jennifer Wilson (DEMO_009) **Medication:** Sitagliptin
100mg (MAD)

Field Value

---

Current PDC 88.5%
PDC Status Quo 86.2% (will stay passing even without more fills)
Gap Days Remaining 25 days
Days to Runout 60 days

**Calculations:** - PDC Status Quo \>= 80% = **COMPLIANT** - Already
passing

**Expected Behavior:** - Not in worklist (already compliant) - Continue
normal refill flow - No priority scoring needed

---

### TS-10: D1a At-Risk (One Fill Only)

**Patient:** Thomas Anderson (DEMO_010) **Medication:** Empagliflozin
10mg (MAD)

Field Value

---

Fill Count 1
Denominator Status D1a (At-Risk)
First Fill Date Sep 15, 2025
Days Supply 30 days
Days to Runout 5 days

**Calculations:** - Only 1 fill - not yet in HEDIS denominator - Need
2nd fill to enter denominator - If 2nd fill is late, entire treatment
period has gap days

**Expected Behavior:** - URGENT outreach for 2nd fill - Special handling
in worklist - Critical to secure before runout

---

## Validation Checklist

For each test scenario, verify:

- [ ] Tier calculation matches expected tier
- [ ] Priority score calculation is correct
- [ ] Base points match tier
- [ ] Bonus points applied correctly (Out of Meds, Q4, Multiple MA, New
      Patient)
- [ ] Correct queue assignment (CRITICAL/HIGH/MEDIUM/WATCH/LOW)
- [ ] Contact window displayed correctly
- [ ] Visual badges/colors match urgency
- [ ] Runout date calculated correctly
- [ ] PDC projections (Status Quo, Perfect) accurate

---

## Edge Cases to Test

---

Case Description Expected

---

Negative Gap Patient already exceeded 20% T5 Lost or F1 Critical
Days gap budget

Zero Refills Enough supply to reach year end No priority score
Needed

Leap Year Feb 29 in treatment period Correct day count (366)

Year-End Cap 90-day fill on Dec 1 Only 31 days count
toward PDC

Multiple MA Patient on MAC + MAD + MAH +15 bonus, show all
Measures three

New Patient Recent first fill +10 bonus
(\<90 days)

---

---

_Document generated for QA testing of Refill Worklist prioritization
logic_
