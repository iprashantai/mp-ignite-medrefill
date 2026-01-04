::: {#title-block-header}

# Medication Adherence Metrics Reference Guide {#medication-adherence-metrics-reference-guide .title}

:::

# Medication Adherence Metrics Reference Guide {#medication-adherence-metrics-reference-guide}

## Table of Contents

1.  Overview
2.  The Three CMS Measures (MAC/MAD/MAH)
3.  PDC Calculation
4.  Gap Days
5.  Treatment Period
6.  Coverage Calculation
7.  Operational Metrics
8.  Fragility Tiers
9.  Priority Scoring
10. Decision Framework
11. Denominator Status

---

## 1. Overview

Medication adherence measures how consistently patients take prescribed
medications. CMS STARS/HEDIS track adherence for chronic conditions with
an **80% compliance threshold**.

**Key Principle:** Patients must have medication on hand for at least
80% of the treatment period to be considered adherent.

---

## 2. The Three CMS Measures

---

Code Full Name Drug Classes

---

**MAC** Medication Adherence for Statins (Atorvastatin,
Cholesterol Rosuvastatin, Simvastatin,
Pravastatin, Lovastatin,
Pitavastatin)

**MAD** Medication Adherence for Oral diabetes meds (Metformin,
Diabetes Glipizide, Sitagliptin,
Empagliflozin, Pioglitazone,
Glimepiride)

**MAH** Medication Adherence for ACE inhibitors, ARBs
Hypertension (Lisinopril, Losartan,
Valsartan, Irbesartan,
Olmesartan, Benazepril)

---

**Note:** Each measure is tracked independently. A patient may be
compliant for MAC but non-compliant for MAH.

---

## 3. PDC Calculation

### Formula

    PDC = (Covered Days / Treatment Days) × 100

Term Definition

---

**Covered Days** Days with medication on hand
**Treatment Days** First fill date → December 31

### Example

- Treatment Period: Jan 15 - Dec 31 = **351 days**
- Covered Days: **292 days**
- PDC = 292 ÷ 351 × 100 = **83.2%** ✓ Compliant

### Status Colors

Status Range Meaning

---

**Pass** (Green) PDC ≥ 80% Meeting compliance goal
**Caution** (Yellow) 60% ≤ PDC \< 80% Needs intervention
**Fail** (Red) PDC \< 60% Urgent attention needed

---

## 4. Gap Days

Gap days are days when a patient has no medication on hand.

### Formulas

    Gap Days Used = Treatment Days − Covered Days
    Gap Days Allowed = Treatment Days × 20%
    Gap Days Remaining = Gap Days Allowed − Gap Days Used

### Example: John's Situation

    Treatment Days: 365 | Covered Days: 270
    Gap Days Used = 365 − 270 = 95 days
    Gap Days Allowed = 365 × 20% = 73 days
    Gap Days Remaining = 73 − 95 = −22 days

**Result:** John has exceeded his gap budget --- cannot reach 80% this
year.

### Status

---

Status Condition Meaning

---

**Salvageable** Gap Days Remaining \> 0 Can still reach 80%
with timely refills

**Lost (T5)** Gap Days Remaining ≤ 0 Cannot reach 80% even
with perfect adherence

---

---

## 5. Treatment Period

    Treatment Period = First Fill Date → December 31

### Example Timeline

- **Mar 15** (First Fill) → **Dec 31** (Year End) = **292 days**

### Key Rules

**Year-End Capping:** Medication supply cannot extend beyond December 31
for PDC calculation. A 90-day fill on December 1 only counts 31 days
toward this year's PDC.

**Q4 Is Critical (Oct-Dec):** As the year progresses, the treatment
period grows while time to improve shrinks. A patient who was "at-risk"
in June may become "unsalvageable" by November.

---

## 6. Coverage Calculation

When patients fill prescriptions early, coverage periods can overlap.
Each day should only be counted once.

### Overlapping Fills Example

- Fill 1: Jan 1 - Mar 31 (90 days)
- Fill 2: Mar 15 - Jun 12 (90 days)
- Overlap: Mar 15-31 (17 days)

  Method Calculation Result

  ***

  **Wrong (Naive Sum)** 90 + 90 180 days (double-counts overlap)
  **Correct (Merged)** Jan 1 - Jun 12 163 days

### Merging Algorithm

1.  Sort all fill periods by start date
2.  If next fill starts before current period ends → extend the end date
3.  If next fill starts after current period ends → begin a new period
4.  Sum all merged periods (capped at December 31)

---

## 7. Operational Metrics

### Days to Runout

    Days to Runout = (Last Fill Date + Days Supply) − Today

Range Status Meaning

---

≤ 0 **Out now** Urgent
1-7 **Urgent** Needs immediate action
8-14 **Due Soon** Plan refill
\> 14 **OK** Monitoring

### Refills Needed

    Refills Needed = ⌈(Days Remaining in Year − Current Supply) / Typical Days Supply⌉

### PDC Status Quo vs PDC Perfect

---

Metric Formula Purpose

---

**PDC Status Quo** (Covered + min(Supply, What PDC will be if
DaysLeft)) / Treatment patient stops refilling
today

**PDC Perfect** (Covered + Best possible PDC with
DaysToYearEnd) / perfect adherence. If
Treatment \<80%, patient is
unsalvageable

---

### Fill Count

HEDIS requires **≥2 fills** to enter the PDC denominator. Patients with
only 1 fill have no "refill behavior" to measure.

---

## 8. Fragility Tiers

Fragility tiers categorize patients by their **delay budget** (gap days
remaining ÷ refills needed).

### Formula

    Delay Budget = Gap Days Remaining ÷ Remaining Refills

### Tier Definitions

Tier Name Delay Budget Contact Window

---

**COMPLIANT** Pass PDC Status Quo ≥ 80% ---
**F5** Safe \> 20 days per refill Monthly
**F4** Stable 11-20 days per refill 2 weeks
**F3** Moderate 6-10 days per refill 1 week
**F2** Fragile 3-5 days per refill 48 hours
**F1** Critical ≤ 2 days per refill 24 hours
**T5** Lost PDC Perfect \< 80% N/A

### Example

Sarah has **15 gap days remaining** and needs **3 more refills**. -
Delay Budget = 15 ÷ 3 = **5 days per refill** → **F2 Fragile** ---
contact within 48 hours

---

## 9. Priority Scoring

### Formula

    Priority Score = Base Score (from tier) + Bonus Points (situational)

### Base Scores by Tier

Tier Points

---

Critical (F1) 100 pts
Fragile (F2) 80 pts
Moderate (F3) 60 pts
Stable (F4) 40 pts
Safe (F5) 20 pts

### Bonus Points

Condition Points

---

Out of Medication +30 pts
Q4 (Oct-Dec) +25 pts
Multiple MA Measures +15 pts
New Patient +10 pts

### Urgency Index

Level Score Range

---

**Extreme** 150+ pts
**High** 100-149 pts
**Moderate** 50-99 pts
**Low** \<50 pts

### Example

John (F1 + Out of Meds + Q4): 100 + 30 + 25 = **155 pts** → Extreme
urgency

---

## 10. Decision Framework

Prioritization involves **two independent dimensions**:

### Dimension 1: Urgency (Supply Status)

_"How soon do we need to act?"_

Based on **current medication supply**.

Supply Status Urgency

---

Out of Meds Urgent
≤7 Days Left Soon
\>7 Days Left Can Wait

### Dimension 2: Fragility (Gap Day Budget)

_"How much room for error do they have?"_

Based on **gap days remaining** divided by refills needed.

Fragility Resilience

---

F1-F2 (0-5 days/refill) Very Fragile
F3-F5 (6+ days/refill) More Resilient

### Why Both Matter

---

Scenario Implication

---

High Urgency + Low Fragility Out of meds, but has 30 gap days left.
Needs refill soon, but some flexibility
on timing.

Low Urgency + High Fragility 45 days of supply, but only 2 gap days
left. Not urgent now, but when refill
is due, _cannot be late_.

---

### Priority Matrix

              Out of Meds   ≤7 Days   \>7 Days

---

**F1-F2** CRITICAL HIGH WATCH
**F3-F5** MEDIUM WATCH LOW

### Four Example Patients

---

Patient Supply Gap Days Fragility Priority

---

**Anna** Out 3 days 5 days F1 **CRITICAL**
--- Contact
NOW

**Bob** 3 days left 2 days F1 **HIGH** ---
Contact today

**Carol** Out 5 days 25 days F4 **MEDIUM** ---
Schedule this
week

**Dan** 45 days 3 days F1 **WATCH** ---
left Proactive
outreach

---

**Key insight:** Carol (out of meds) is _lower_ priority than Bob (has 3
days supply) because Carol has more runway. Dan has lots of supply but
is flagged as WATCH because when his refill is due, he has almost no
margin for delay.

---

## 11. Denominator Status

HEDIS requires at least 2 prescription fills for a patient to be
included in the PDC denominator.

### Status Codes

---

Code Name Fills Description

---

**D0** No Fills 0 Not in denominator - no
fills this year

**D1a** At-Risk 1 One fill, running low -
urgent outreach for 2nd fill

**D1b** Monitoring 1 One fill, adequate supply -
monitor for 2nd fill

**D2** In 2+ Two or more fills - full PDC
Denominator tracking active

**DX** Excluded Any Excluded from measure
(hospice, ESRD, etc.)

---

### Why 2 Fills Are Required

A patient with only 1 fill has no "refill behavior" to measure. Once
they get a 2nd fill, we can measure adherence starting from their first
fill date.

### Critical Transition: D1 → D2

Once a patient enters the denominator with their 2nd fill, their
**entire treatment period** (from first fill) is measured. Delays
between 1st and 2nd fill create early gap days that affect year-end PDC.

---

## Quick Reference Formulas

Metric Formula

---

**PDC** Covered Days ÷ Treatment Period × 100
**Treatment Period** First Fill → December 31
**Gap Days Allowed** Treatment Period × 20%
**Gap Days Used** Treatment Period − Covered Days
**Gap Days Remaining** Gap Days Allowed − Gap Days Used
**Delay Budget** Gap Days Remaining ÷ Refills Needed
**Days to Runout** (Last Fill Date + Days Supply) − Today
**PDC Status Quo** (Covered + min(Supply, DaysLeft)) ÷ Treatment
**PDC Perfect** (Covered + DaysToYearEnd) ÷ Treatment

---

## Key Insights

1.  **Out of meds ≠ highest priority.** A patient out of meds with 30
    gap days is lower priority than one with 3 days supply and 2 gap
    days.

2.  **Fragility predicts risk.** F1-F2 patients can't afford any delays
    --- one late refill tanks their PDC.

3.  **2 fills minimum.** Patients need 2+ fills to enter the HEDIS
    denominator. Secure that 2nd fill!

4.  **Q4 is critical.** Less time to recover from gaps as year-end
    approaches.

5.  **The "Runway" Mental Model:** Think of each patient as a plane that
    needs to land (reach Dec 31 with 80% PDC). Their gap budget is the
    "wiggle room" for delays.

---

_Document generated from Ignite MedRefills Metrics Reference_
