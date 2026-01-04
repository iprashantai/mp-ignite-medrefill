::: {#title-block-header}

# Medication Adherence Technical Handoff {#medication-adherence-technical-handoff .title}

:::

# Medication Adherence Technical Handoff Document

**Date:** January 3, 2026 **Status:** VALIDATED - Ready for Engineering
**Golden Standard Reference:** `src/pages/MetricsReference.jsx`

---

## Document Hierarchy

---

Priority Document Purpose

---

1 `src/pages/MetricsReference.jsx` AUTHORITATIVE SOURCE -
All implementations
must follow this

2 `docs/PRD_ALL_PATIENTS_REFILL_WORKLIST.md` Product Requirements

3 `docs/Medication_Adherence_Metrics_Reference_Guide.md` User-facing reference

4 `docs/planning/Medication_Adherence_Prioritization_Implementation.md` FUTURE enhancements
(not current spec)

---

---

## Part 1: Core Formulas (Golden Standard)

### PDC Calculation

    PDC = (Covered Days / Treatment Days) x 100

Term Definition

---

**Covered Days** Days with medication on hand
**Treatment Days** First fill date -\> December 31

### Status Thresholds

Status Range Color

---

Pass PDC \>= 80% Green
Caution 60% \<= PDC \< 80% Yellow
Fail PDC \< 60% Red

### Gap Days Formulas

    Gap Days Used     = Treatment Days - Covered Days
    Gap Days Allowed  = Treatment Days x 20%
    Gap Days Remaining = Gap Days Allowed - Gap Days Used

### Delay Budget

    Delay Budget = Gap Days Remaining / Refills Needed

---

## Part 2: Fragility Tiers

Tier Name Delay Budget Contact Window

---

**COMPLIANT** Pass PDC Status Quo \>= 80% \-
**F5** Safe \> 20 days per refill Monthly
**F4** Stable 11-20 days per refill 2 weeks
**F3** Moderate 6-10 days per refill 1 week
**F2** Fragile 3-5 days per refill 48 hours
**F1** Critical \<= 2 days per refill 24 hours
**T5** Lost PDC Perfect \< 80% N/A

---

## Part 3: Priority Scoring

### Base Scores

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

Extreme 150+ pts
High 100-149 pts
Moderate 50-99 pts
Low \<50 pts

---

## Part 4: Two-Dimensional Prioritization

### Dimension 1: Urgency (Supply Status)

_"How soon do we need to act?"_

Supply Status Urgency

---

Out of Meds Urgent
\<= 7 Days Left Soon
\> 7 Days Left Can Wait

### Dimension 2: Fragility (Gap Day Budget)

_"How much room for error do they have?"_

Fragility Resilience

---

F1-F2 (0-5 days/refill) Very Fragile
F3-F5 (6+ days/refill) More Resilient

### Priority Matrix

              Out of Meds   \<= 7 Days   \> 7 Days

---

**F1-F2** CRITICAL HIGH WATCH
**F3-F5** MEDIUM WATCH LOW

---

## Part 5: Refill vs Renewal Decision Logic

### Decision Flowchart

                        PATIENT NEEDS MEDICATION
                                |
                                v
                       Has Refills Remaining?
                          /            \
                        YES             NO
                        /                \
                       v                  v
                Rx Expired?        Recent Visit (<=90 days)?
                 /      \              /           \
               NO       YES          YES           NO
               /          \          /              \
              v            v        v                v
           REFILL      RENEWAL   RENEWAL     APPOINTMENT_NEEDED
          (FR-3.1.1)  (FR-3.1.2) (FR-3.1.3)     (FR-3.1.4)

### Logic Table (PRD FR-3.1)

---

Condition Outcome PRD Ref

---

Refills remaining + Rx NOT REFILL FR-3.1.1
expired

Refills remaining + Rx RENEWAL FR-3.1.2
expired

No refills + Recent visit RENEWAL FR-3.1.3
(\<=90 days)

No refills + No recent APPOINTMENT_NEEDED FR-3.1.4
visit (\>90 days)

---

---

## Part 6: Critical Clarification - PDC Tracks FILLS, Not Prescriptions

### Key Insight

**PDC doesn't care about prescriptions. PDC only cares about fills.**

    What Doctor Does          What Pharmacy Records       What PDC Sees
    -----------------         --------------------        -------------

    Day 1: Writes Rx          Day 1: Fill #1              [COVERED]

                              Day 90: Fill #2             [COVERED]

    Day 150: Writes           (no fill yet)               (still covered from
      NEW Rx                                               previous fill)

                              Day 180: Fill #3            [COVERED]
                              (new dose)

    PDC only cares about Fill dates -> Continuous coverage = Good PDC

### Implication for Dose Changes

When a prescriber writes a new prescription for a different strength
(e.g., Metformin 500mg -\> 1000mg): - **PDC doesn't see this** - only
fills matter - System's job is to ensure **fills happen on time** based
on Days to Runout - Existing runout-based alerting covers this
scenario - No special handling needed for strength/formulation changes

---

## Part 7: The Three CMS Measures

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

## Part 8: Denominator Status (HEDIS Requirement)

HEDIS requires at least 2 prescription fills for a patient to be
included in the PDC denominator.

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

### Critical Transition: D1 -\> D2

Once a patient enters the denominator with their 2nd fill, their
**entire treatment period** (from first fill) is measured. Delays
between 1st and 2nd fill create early gap days that affect year-end PDC.

---

## Part 9: Operational Metrics

### Days to Runout

    Days to Runout = (Last Fill Date + Days Supply) - Today

Range Status Action

---

\<= 0 Out now Urgent
1-7 Urgent Immediate action
8-14 Due Soon Plan refill
\> 14 OK Monitoring

### PDC Projections

---

Metric Formula Purpose

---

PDC Status Quo (Covered + min(Supply, What PDC will be if
DaysLeft)) / Treatment patient stops refilling
today

PDC Perfect (Covered + Best possible PDC with
DaysToYearEnd) / perfect adherence
Treatment

---

---

## Part 10: Validation Summary

### Validated Items

---

Item Status Notes

---

PRD matches Golden VALIDATED No conflicts found
Standard

Fragility tier VALIDATED Matches
thresholds MetricsReference.jsx

Priority scoring VALIDATED Base + Bonus points
formula correct

Refill/Renewal VALIDATED 4 pathways confirmed
logic (including
APPOINTMENT_NEEDED)

Two-dimensional VALIDATED Urgency x Fragility
prioritization matrix correct

---

### Document Status

- `docs/planning/Medication_Adherence_Prioritization_Implementation.md`
  is a **FUTURE/PLANNING** document
- It contains proposed enhancements (propensity scoring, 6-dimension
  urgency)
- It is **NOT** the current authoritative spec
- Current implementation should follow `MetricsReference.jsx` only

---

## Part 11: Quick Reference Formulas

Metric Formula

---

**PDC** Covered Days / Treatment Period x 100
**Treatment Period** First Fill -\> December 31
**Gap Days Allowed** Treatment Period x 20%
**Gap Days Used** Treatment Period - Covered Days
**Gap Days Remaining** Gap Days Allowed - Gap Days Used
**Delay Budget** Gap Days Remaining / Refills Needed
**Days to Runout** (Last Fill Date + Days Supply) - Today
**PDC Status Quo** (Covered + min(Supply, DaysLeft)) / Treatment
**PDC Perfect** (Covered + DaysToYearEnd) / Treatment

---

## Part 12: Key Insights for Engineering

1.  **Out of meds != highest priority.** A patient out of meds with 30
    gap days is lower priority than one with 3 days supply and 2 gap
    days.

2.  **Fragility predicts risk.** F1-F2 patients can't afford any
    delays - one late refill tanks their PDC.

3.  **2 fills minimum.** Patients need 2+ fills to enter the HEDIS
    denominator. Secure that 2nd fill!

4.  **Q4 is critical.** Less time to recover from gaps as year-end
    approaches.

5.  **The "Runway" Mental Model:** Think of each patient as a plane that
    needs to land (reach Dec 31 with 80% PDC). Their gap budget is the
    "wiggle room" for delays.

6.  **PDC only sees fills.** Doctor writing a new Rx is invisible to
    PDC. Only pharmacy fill dates matter.

---

## Code References

Component File Path

---

Golden Standard `src/pages/MetricsReference.jsx`
Fragility Service `src/services/fragilityTierService.js`
Refill Worklist `src/pages/RefillWorklistPage.jsx`
All Patients CRM `src/pages/AllPatientsCRM.jsx`
Med Adherence Service `src/services/medAdherenceService.js`

---

_Document generated: January 3, 2026_ _Validated against:
MetricsReference.jsx (Golden Standard)_
