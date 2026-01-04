::: {#title-block-header}

# Data Flow Diagram {#data-flow-diagram .title}

:::

# Data Flow Diagram: Medication Adherence Refill Worklist

**Purpose:** Visual representation of data movement through the system.

---

## High-Level System Architecture

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                           EXTERNAL DATA SOURCES                              │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │                                                                              │
    │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
    │   │   PBM/Claims │    │     EMR      │    │   Pharmacy   │                  │
    │   │   (RxClaims) │    │  (Patients)  │    │   (Rx Data)  │                  │
    │   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
    │          │                   │                   │                           │
    └──────────┼───────────────────┼───────────────────┼───────────────────────────┘
               │                   │                   │
               ▼                   ▼                   ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                           FIREBASE FIRESTORE                                 │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │                                                                              │
    │   ┌──────────────────────────────────────────────────────────────────┐      │
    │   │                        COLLECTIONS                                │      │
    │   ├──────────────────────────────────────────────────────────────────┤      │
    │   │                                                                   │      │
    │   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐      │      │
    │   │   │ allPatients │  │  rxClaims   │  │ medAdherenceDrugs   │      │      │
    │   │   │             │  │             │  │   (MAC/MAD/MAH)     │      │      │
    │   │   │ - Member_Id │  │ - Member_Id │  │                     │      │      │
    │   │   │ - fullName  │  │ - Drug_Name │  │ - drugName          │      │      │
    │   │   │ - DOB       │  │ - NDC       │  │ - measureType       │      │      │
    │   │   │ - meds[]    │  │ - fill_date │  │ - NDC codes         │      │      │
    │   │   │             │  │ - days_supply│ │                     │      │      │
    │   │   └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘      │      │
    │   │          │                │                    │                  │      │
    │   └──────────┼────────────────┼────────────────────┼──────────────────┘      │
    │              │                │                    │                         │
    └──────────────┼────────────────┼────────────────────┼─────────────────────────┘
                   │                │                    │
                   ▼                ▼                    ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                         CALCULATION ENGINE                                   │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │                                                                              │
    │   ┌────────────────────────────────────────────────────────────────────┐    │
    │   │                   fragilityTierService.js                           │    │
    │   ├────────────────────────────────────────────────────────────────────┤    │
    │   │                                                                     │    │
    │   │   INPUT:                           OUTPUT:                          │    │
    │   │   - rxClaims (fill history)        - PDC (current %)                │    │
    │   │   - First fill date                - Gap Days Used                  │    │
    │   │   - Today's date                   - Gap Days Remaining             │    │
    │   │   - Dec 31 (year end)              - Delay Budget                   │    │
    │   │                                    - Fragility Tier (F1-F5/T5)      │    │
    │   │   FORMULAS:                        - Priority Score                 │    │
    │   │   Treatment Period = FirstFill → Dec 31                             │    │
    │   │   Covered Days = sum(days_supply)                                   │    │
    │   │   PDC = Covered / Treatment × 100                                   │    │
    │   │   Gap Days Allowed = Treatment × 20%                                │    │
    │   │   Gap Days Remaining = Allowed - Used                               │    │
    │   │   Delay Budget = GapRemaining / RefillsNeeded                       │    │
    │   │                                                                     │    │
    │   └────────────────────────────────────────────────────────────────────┘    │
    │                                                                              │
    └──────────────────────────────────────────┬──────────────────────────────────┘
                                               │
                                               ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                         PRIORITIZATION ENGINE                                │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │                                                                              │
    │   ┌────────────────────────────────────────────────────────────────────┐    │
    │   │                   Priority Score Calculation                        │    │
    │   ├────────────────────────────────────────────────────────────────────┤    │
    │   │                                                                     │    │
    │   │   BASE SCORE (by tier):          BONUS POINTS:                      │    │
    │   │   ├── F1 Critical: 100 pts       ├── Out of Meds: +30 pts           │    │
    │   │   ├── F2 Fragile:   80 pts       ├── Q4 (Oct-Dec): +25 pts          │    │
    │   │   ├── F3 Moderate:  60 pts       ├── Multiple MA: +15 pts           │    │
    │   │   ├── F4 Stable:    40 pts       └── New Patient: +10 pts           │    │
    │   │   └── F5 Safe:      20 pts                                          │    │
    │   │                                                                     │    │
    │   │   URGENCY INDEX:                                                    │    │
    │   │   ├── Extreme: 150+ pts                                             │    │
    │   │   ├── High: 100-149 pts                                             │    │
    │   │   ├── Moderate: 50-99 pts                                           │    │
    │   │   └── Low: <50 pts                                                  │    │
    │   │                                                                     │    │
    │   └────────────────────────────────────────────────────────────────────┘    │
    │                                                                              │
    └──────────────────────────────────────────┬──────────────────────────────────┘
                                               │
                                               ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                           UI COMPONENTS                                      │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │                                                                              │
    │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
    │   │ RefillWorklist  │    │  AllPatientsCRM │    │ MetricsReference│         │
    │   │     Page.jsx    │    │      .jsx       │    │     .jsx        │         │
    │   ├─────────────────┤    ├─────────────────┤    ├─────────────────┤         │
    │   │ - Priority queue│    │ - Full patient  │    │ - Golden        │         │
    │   │ - Tier badges   │    │   list          │    │   Standard      │         │
    │   │ - PDC status    │    │ - Search/filter │    │ - All formulas  │         │
    │   │ - Actions       │    │ - Bulk actions  │    │ - Tier defs     │         │
    │   └─────────────────┘    └─────────────────┘    └─────────────────┘         │
    │                                                                              │
    └─────────────────────────────────────────────────────────────────────────────┘

---

## Detailed Data Flow: Patient to Worklist

    Step 1: LOAD PATIENT DATA
    ━━━━━━━━━━━━━━━━━━━━━━━━━

        allPatients Collection
        ┌────────────────────────────────────────┐
        │ {                                       │
        │   id: "DEMO_001",                       │
        │   fullName: "Maria Gonzalez",           │
        │   Member_Id: "DEMO_001",                │
        │   dateOfBirth: "1955-03-15",            │
        │   medications: [                        │
        │     { name: "Lisinopril 10mg", ... }    │
        │   ]                                     │
        │ }                                       │
        └────────────────────────────────────────┘
                          │
                          ▼
    Step 2: FETCH RX CLAIMS
    ━━━━━━━━━━━━━━━━━━━━━━━

        rxClaims Collection (filtered by Member_Id)
        ┌────────────────────────────────────────┐
        │ [                                       │
        │   {                                     │
        │     Member_Id: "DEMO_001",              │
        │     Drug_Name: "LISINOPRIL 10MG",       │
        │     Rx_Date_Of_Service: "2025-01-15",   │
        │     days_supply: 30,                    │
        │     NDC: "00378-0243-01"                │
        │   },                                    │
        │   {                                     │
        │     Member_Id: "DEMO_001",              │
        │     Drug_Name: "LISINOPRIL 10MG",       │
        │     Rx_Date_Of_Service: "2025-02-14",   │
        │     days_supply: 30,                    │
        │     NDC: "00378-0243-01"                │
        │   },                                    │
        │   ... (more fills)                      │
        │ ]                                       │
        └────────────────────────────────────────┘
                          │
                          ▼
    Step 3: MATCH TO MA MEASURE
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━

        medAdherenceDrugs Collection
        ┌────────────────────────────────────────┐
        │ {                                       │
        │   drugName: "LISINOPRIL",               │
        │   measureType: "MAH",                   │
        │   drugClass: "ACE Inhibitors"           │
        │ }                                       │
        └────────────────────────────────────────┘

        Result: Lisinopril → MAH (Hypertension)
                          │
                          ▼
    Step 4: CALCULATE PDC & FRAGILITY
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        fragilityTierService.calculateMetrics()

        INPUT:
        ┌────────────────────────────────────────┐
        │ fills: [Jan 15, Feb 14, Mar 16, ...]   │
        │ today: Nov 15, 2025                    │
        │ yearEnd: Dec 31, 2025                  │
        └────────────────────────────────────────┘

        CALCULATIONS:
        ┌────────────────────────────────────────┐
        │ firstFillDate = Jan 15                  │
        │ treatmentPeriod = 351 days              │
        │ coveredDays = 253 days                  │
        │ gapDaysUsed = 98 days                   │
        │ gapDaysAllowed = 70 days                │
        │ gapDaysRemaining = -28 days             │
        │ PDC = 72.1%                             │
        └────────────────────────────────────────┘

        OUTPUT:
        ┌────────────────────────────────────────┐
        │ {                                       │
        │   pdc: 72.1,                            │
        │   pdcStatus: "CAUTION",                 │
        │   gapDaysRemaining: -28,                │
        │   fragilityTier: "T5",                  │
        │   tierLabel: "Lost",                    │
        │   isSalvageable: false                  │
        │ }                                       │
        └────────────────────────────────────────┘
                          │
                          ▼
    Step 5: CALCULATE PRIORITY SCORE
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        For salvageable patients (not T5):

        ┌────────────────────────────────────────┐
        │ baseScore = 80 (F2 Fragile)             │
        │ + outOfMeds = 30                        │
        │ + isQ4 = 25                             │
        │ ─────────────────                       │
        │ totalScore = 135 → HIGH priority        │
        └────────────────────────────────────────┘
                          │
                          ▼
    Step 6: DETERMINE PATHWAY
    ━━━━━━━━━━━━━━━━━━━━━━━━━

        ┌────────────────────────────────────────┐
        │ Has Refills? YES                        │
        │ Rx Expired? NO                          │
        │ ─────────────────                       │
        │ Pathway = REFILL                        │
        └────────────────────────────────────────┘
                          │
                          ▼
    Step 7: DISPLAY IN WORKLIST
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━

        RefillWorklistPage.jsx
        ┌────────────────────────────────────────────────────────────────┐
        │ ┌────────────────────────────────────────────────────────────┐ │
        │ │ HIGH PRIORITY QUEUE                                         │ │
        │ ├────────────────────────────────────────────────────────────┤ │
        │ │ Name           │ PDC  │ Tier │ Days Left │ Action           │ │
        │ │────────────────┼──────┼──────┼───────────┼─────────────────│ │
        │ │ Maria Gonzalez │ 72%  │ F2   │ OUT       │ [Call] [Refill]  │ │
        │ │ Robert Chen    │ 68%  │ F1   │ 5 days    │ [Call] [Refill]  │ │
        │ └────────────────────────────────────────────────────────────┘ │
        └────────────────────────────────────────────────────────────────┘

---

## Refill vs Renewal Decision Flow

                        ┌─────────────────────────────┐
                        │   PATIENT NEEDS MEDICATION  │
                        └─────────────┬───────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────────┐
                        │    Has Refills Remaining?   │
                        └─────────────┬───────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        │                           │
                       YES                         NO
                        │                           │
                        ▼                           ▼
            ┌───────────────────┐       ┌───────────────────┐
            │   Rx Expired?     │       │ Recent Visit      │
            │                   │       │ (≤90 days)?       │
            └─────────┬─────────┘       └─────────┬─────────┘
                      │                           │
            ┌─────────┴─────────┐       ┌─────────┴─────────┐
            │                   │       │                   │
           NO                  YES     YES                 NO
            │                   │       │                   │
            ▼                   ▼       ▼                   ▼
       ┌─────────┐        ┌─────────┐ ┌─────────┐     ┌─────────────┐
       │ REFILL  │        │ RENEWAL │ │ RENEWAL │     │ APPOINTMENT │
       │         │        │         │ │         │     │   NEEDED    │
       │ FR-3.1.1│        │ FR-3.1.2│ │ FR-3.1.3│     │   FR-3.1.4  │
       └─────────┘        └─────────┘ └─────────┘     └─────────────┘

---

## Data Dependencies

    ┌─────────────────────────────────────────────────────────────────┐
    │                     DATA DEPENDENCY GRAPH                        │
    ├─────────────────────────────────────────────────────────────────┤
    │                                                                  │
    │   allPatients ─────┬──────────────────────────────────────────► │
    │        │           │                                             │
    │        │           │ JOIN on Member_Id                           │
    │        │           │                                             │
    │   rxClaims ────────┼──────────────────────────────────────────► │
    │        │           │                                             │
    │        │           ▼                                             │
    │        │   ┌───────────────┐                                     │
    │        │   │ PDC Calculation│                                    │
    │        │   └───────┬───────┘                                     │
    │        │           │                                             │
    │        │           ▼                                             │
    │        │   ┌───────────────┐                                     │
    │        │   │ Fragility Tier │                                    │
    │        │   └───────┬───────┘                                     │
    │        │           │                                             │
    │        │           ▼                                             │
    │        │   ┌───────────────┐                                     │
    │        └──►│Priority Score │                                     │
    │            └───────┬───────┘                                     │
    │                    │                                             │
    │                    ▼                                             │
    │            ┌───────────────┐                                     │
    │            │   Worklist    │                                     │
    │            │   Display     │                                     │
    │            └───────────────┘                                     │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘

---

## Key Files by Data Layer

---

Layer File Responsibility

---

**Data Source** `rxClaimsService.js` Fetch claims from Firestore

**Calculation** `fragilityTierService.js` PDC, gap days, tier calculation

**Calculation** `medAdherenceService.js` PDC calculations, status

**Business `src/pages/MetricsReference.jsx` Golden Standard (authoritative)
Logic**

**UI** `RefillWorklistPage.jsx` Worklist display

**UI** `AllPatientsCRM.jsx` Patient list

---

---

_Document generated for tech handoff - January 3, 2026_
