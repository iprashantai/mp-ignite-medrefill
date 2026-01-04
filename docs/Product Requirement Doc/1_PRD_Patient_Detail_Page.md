# Product Requirements Document (PRD)

# Patient Detail Page

---

| **Document Info**   |                                    |
| ------------------- | ---------------------------------- |
| **Product Name**    | Ignite MedRefills                  |
| **Version**         | 1.1                                |
| **Date**            | January 4, 2026                    |
| **Author**          | Product Head                       |
| **Status**          | APPROVED FOR DEVELOPMENT           |
| **Confidentiality** | Internal Use Only                  |
| **Component**       | PatientDetailPageTabbed.jsx        |
| **Route**           | /med-adherence/patients/:patientId |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategy](#2-product-vision--strategy)
3. [Target Users & Personas](#3-target-users--personas)
4. [Problem Statement](#4-problem-statement)
5. [Goals & Success Metrics](#5-goals--success-metrics)
6. [User Stories & Requirements](#6-user-stories--requirements)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [System Architecture](#9-system-architecture)
10. [Data Requirements](#10-data-requirements)
11. [UI/UX Requirements](#11-uiux-requirements)
12. [Golden Standard Calculations](#12-golden-standard-calculations)
13. [Risks & Mitigation](#13-risks--mitigation)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

### 1.1 Product Overview

The **Patient Detail Page** is the primary operational interface where pharmacists review individual patient medication adherence data and take action. When a user clicks on a patient row in the All Patients list, this page opens with comprehensive patient information organized into **4 tabs**.

This is the **most critical screen** for pharmacist workflow - the place where clinical decisions are made and actions are taken.

### 1.2 Business Case

| Challenge                | Current State            | With Patient Detail Page    |
| ------------------------ | ------------------------ | --------------------------- |
| **Patient Context**      | Scattered across systems | Single unified view         |
| **Adherence Visibility** | Manual PDC lookups       | Real-time PDC display       |
| **Action Time**          | 5+ minutes per patient   | < 30 seconds to action      |
| **Gap Days Tracking**    | Manual calculation       | Auto-calculated with alerts |
| **Fragility Assessment** | Non-existent             | Tier-based prioritization   |

### 1.3 Key Value Propositions

1. **Unified Patient View**: All patient data in one place - demographics, medications, adherence, outreach
2. **Actionable Intelligence**: Fragility tiers and priority scores guide pharmacist actions
3. **Golden Standard Compliance**: All calculations match CMS STARS requirements
4. **Efficient Workflow**: 4-tab organization reduces cognitive load
5. **Complete Audit Trail**: Outreach history and call logs for compliance

### 1.4 Scope

This PRD covers the Patient Detail Page with 4 tabs:

| Tab               | Description                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **Overview**      | Patient snapshot with demographics, adherence summary, fragility tier                     |
| **Medications**   | Full medication list with PDC, days remaining, MA tracking                                |
| **Outreach**      | Communication history, call logging, AI-powered prep                                      |
| **Med Adherence** | Detailed analytics with projections, gap day tracking, and **Medication Timeline Drawer** |

**Out of Scope (MVP):**

- Year-over-year comparison
- Export to PDF/CSV
- Mobile responsive design

---

## 2. Product Vision & Strategy

### 2.1 Vision Statement

> _"To provide pharmacists with the most comprehensive, actionable patient view that enables informed decisions in under 30 seconds, ensuring no patient falls through the cracks."_

### 2.2 Strategic Pillars

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           STRATEGIC PILLARS                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │   COMPLETE    │  │   ACTIONABLE  │  │   EFFICIENT   │  │   COMPLIANT   │    │
│  │    CONTEXT    │  │    INSIGHTS   │  │   WORKFLOW    │  │   TRACKING    │    │
│  │               │  │               │  │               │  │               │    │
│  │ • All data    │  │ • Fragility   │  │ • 4-tab       │  │ • Outreach    │    │
│  │   in one      │  │   tiers       │  │   design      │  │   history     │    │
│  │   place       │  │ • Priority    │  │ • Quick       │  │ • Call logs   │    │
│  │ • Real-time   │  │   scores      │  │   actions     │  │ • Audit       │    │
│  │   updates     │  │ • PDC status  │  │ • Clear UX    │  │   trail       │    │
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Product Principles

| Principle                  | Description                                                                      |
| -------------------------- | -------------------------------------------------------------------------------- |
| **Golden Standard First**  | All calculations MUST use fragilityTierService.js and match MetricsReference.jsx |
| **Delay Budget for Tiers** | Fragility tiers based on Delay Budget, NEVER raw gap days                        |
| **COMPLIANT Check First**  | Always verify PDC Status Quo ≥80% BEFORE assigning F1-F5 tiers                   |
| **Single Source of Truth** | Patient data flows from Firestore; no dual-state confusion                       |
| **Action-Oriented Design** | Every screen element should inform or enable action                              |

---

## 3. Target Users & Personas

### 3.1 Primary Users

#### Persona 1: Clinical Pharmacist (RPh)

| Attribute        | Details                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| **Role**         | Reviews patient adherence, takes refill/renewal actions, logs outreach |
| **Daily Volume** | 50-100 patient reviews                                                 |
| **Pain Points**  | Switching between systems, missing context, calculation errors         |
| **Goals**        | Quick reviews, accurate decisions, complete documentation              |
| **Tech Comfort** | Intermediate                                                           |

#### Persona 2: Care Coordinator

| Attribute        | Details                                                        |
| ---------------- | -------------------------------------------------------------- |
| **Role**         | Manages patient outreach, tracks follow-ups, coordinates care  |
| **Daily Volume** | 30-50 patient contacts                                         |
| **Pain Points**  | Unknown contact history, duplicate outreach, missed follow-ups |
| **Goals**        | Effective outreach, complete tracking, patient engagement      |
| **Tech Comfort** | Intermediate                                                   |

### 3.2 Secondary Users

| User                 | Use Case                                  |
| -------------------- | ----------------------------------------- |
| **Pharmacy Manager** | Review team performance, audit decisions  |
| **Quality Analyst**  | Verify PDC calculations, STARS compliance |
| **IT Support**       | Troubleshoot issues, verify data flow     |

---

## 4. Problem Statement

### 4.1 Current Challenges

1. **Fragmented Data**: Patient information scattered across multiple systems
2. **Manual Calculations**: Pharmacists manually calculate PDC and gap days
3. **No Prioritization**: All patients treated equally regardless of risk
4. **Missing Context**: Outreach history not readily available
5. **Calculation Errors**: Inconsistent PDC and tier calculations

### 4.2 Impact

| Problem             | Business Impact                         |
| ------------------- | --------------------------------------- |
| Fragmented data     | 5+ minutes per patient lookup           |
| Manual calculations | 10-15% error rate in PDC                |
| No prioritization   | High-risk patients missed               |
| Missing context     | Duplicate outreach, patient frustration |
| Calculation errors  | STARS rating penalties                  |

---

## 5. Goals & Success Metrics

### 5.1 Primary Goals

| Goal                          | Target                        |
| ----------------------------- | ----------------------------- |
| **Time to First Action**      | < 30 seconds                  |
| **Page Load Time**            | < 2 seconds                   |
| **PDC Calculation Accuracy**  | 100% match to Golden Standard |
| **User Task Completion Rate** | > 95%                         |

### 5.2 Success Metrics

| Metric               | Measurement                        | Target  |
| -------------------- | ---------------------------------- | ------- |
| Page Load Time       | Time from click to full render     | < 2s    |
| Tab Switch Time      | Time to switch between tabs        | < 500ms |
| Calculation Accuracy | PDC/Gap Days match Golden Standard | 100%    |
| User Satisfaction    | Post-task survey                   | > 4.5/5 |
| Error Rate           | Errors per 100 patient reviews     | < 1     |

---

## 6. User Stories & Requirements

### 6.1 Primary User Stories

| ID     | User Story                                                                                                           | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------- | -------- |
| US-001 | As a pharmacist, I want to see a patient's complete medication list so I can review their adherence status           | P0       |
| US-002 | As a pharmacist, I want to see the patient's PDC and gap days so I can assess their compliance risk                  | P0       |
| US-003 | As a pharmacist, I want to see which medications need refills so I can prioritize my workflow                        | P0       |
| US-004 | As a pharmacist, I want to log outreach calls so I can track my contact attempts                                     | P0       |
| US-005 | As a pharmacist, I want to see the fragility tier so I know how urgently to contact the patient                      | P0       |
| US-006 | As a care coordinator, I want to see outreach history so I can avoid duplicate contacts                              | P1       |
| US-007 | As a care coordinator, I want to see patient contact preferences so I can use their preferred method                 | P1       |
| US-008 | As a pharmacist, I want to see PDC projections so I can understand patient trajectory                                | P1       |
| US-009 | As a pharmacist, I want to see MA measure badges so I know which measures the patient impacts                        | P0       |
| US-010 | As a pharmacist, I want keyboard shortcuts so I can work faster                                                      | P2       |
| US-011 | As a pharmacist, I want to click on a medication to see its fill/gap timeline so I can understand adherence patterns | P0       |

---

## 7. Functional Requirements

### 7.1 Tab 1: Overview

| ID     | Requirement                                                          | Priority |
| ------ | -------------------------------------------------------------------- | -------- |
| FR-001 | Display patient demographics (name, DOB, age, phone, email, address) | P0       |
| FR-002 | Display insurance information (plan, member ID, group)               | P0       |
| FR-003 | Display primary pharmacy                                             | P1       |
| FR-004 | Display adherence summary (PDC, gap days used, gap days remaining)   | P0       |
| FR-005 | Display fragility tier with color badge (COMP/F1-F5/T5)              | P0       |
| FR-006 | Display priority score with breakdown                                | P0       |
| FR-007 | Display MA measures (MAC/MAD/MAH badges with status)                 | P0       |
| FR-008 | Display upcoming actions/alerts                                      | P1       |
| FR-009 | Support collapsible sections                                         | P2       |
| FR-010 | Support adding care team notes                                       | P2       |

### 7.2 Tab 2: Medications

| ID     | Requirement                                                             | Priority |
| ------ | ----------------------------------------------------------------------- | -------- |
| FR-011 | Display sortable medication table                                       | P0       |
| FR-012 | Show columns: Name, Class, PDC, Days Remaining, Last Fill, Refills Left | P0       |
| FR-013 | Display MA badge for tracked medications                                | P0       |
| FR-014 | Color-code PDC values (green ≥80%, amber 60-79%, red <60%)              | P0       |
| FR-015 | Color-code urgency (Critical ≤3, Urgent 4-7, Soon 8-14)                 | P0       |
| FR-016 | Support filtering by status                                             | P1       |
| FR-017 | Support sorting by any column                                           | P1       |
| FR-018 | Click row to open medication detail drawer                              | P0       |
| FR-019 | Display empty state when no medications                                 | P1       |
| FR-020 | Show medication class color coding                                      | P2       |

### 7.3 Tab 3: Outreach

| ID     | Requirement                                 | Priority |
| ------ | ------------------------------------------- | -------- |
| FR-021 | Display days since last contact             | P0       |
| FR-022 | Display outreach history timeline           | P0       |
| FR-023 | Support filtering by type (Phone/Email/SMS) | P1       |
| FR-024 | Support filtering by outcome                | P1       |
| FR-025 | Support filtering by time range             | P2       |
| FR-026 | Display communication preferences           | P1       |
| FR-027 | Provide "Log New Call" button               | P0       |
| FR-028 | Open AI Call Log Modal for documentation    | P0       |
| FR-029 | Calculate and display success rate          | P2       |
| FR-030 | Display AI Call Prep Banner                 | P1       |

### 7.4 Tab 4: Med Adherence

| ID     | Requirement                                                        | Priority |
| ------ | ------------------------------------------------------------------ | -------- |
| FR-031 | Display current PDC with status badge (PASSING/AT-RISK/FAILING)    | P0       |
| FR-032 | Display gap days breakdown (Used/Allowed/Remaining)                | P0       |
| FR-033 | Display delay budget calculation                                   | P0       |
| FR-034 | Display fragility tier with contact window                         | P0       |
| FR-035 | Display priority score with bonuses                                | P0       |
| FR-036 | Display PDC Status Quo projection                                  | P0       |
| FR-037 | Display PDC Perfect projection                                     | P0       |
| FR-038 | Display MA medications table with per-med metrics (clickable rows) | P0       |
| FR-039 | Display treatment period                                           | P0       |
| FR-040 | Display covered days                                               | P0       |
| FR-041 | Calculate refills needed to reach 80%                              | P1       |
| FR-042 | Display T5 (Lost) status when PDC Perfect < 80%                    | P0       |

### 7.5 Medication Timeline Drawer (Slide-out Panel)

The Medication Timeline Drawer opens when a user clicks on any medication row in the Med Adherence tab's "Medication-Level Details" table. It provides deep-dive analytics for a single medication.

#### 7.5.1 Drawer Header

| ID     | Requirement                                              | Priority |
| ------ | -------------------------------------------------------- | -------- |
| FR-043 | Display medication name prominently                      | P0       |
| FR-044 | Display MA measure badge (MAC/MAD/MAH) with color coding | P0       |
| FR-045 | Provide close button (X) to dismiss drawer               | P0       |
| FR-046 | Slide in from right side of screen                       | P0       |
| FR-047 | Display backdrop overlay when open                       | P0       |

#### 7.5.2 Drawer Tab Navigation (3 Tabs)

| ID     | Requirement                              | Priority |
| ------ | ---------------------------------------- | -------- |
| FR-048 | Display "Details" tab (default)          | P0       |
| FR-049 | Display "Timeline" tab                   | P0       |
| FR-050 | Display "Claims" tab with count badge    | P0       |
| FR-051 | Highlight active tab with blue underline | P0       |

#### 7.5.3 Details Tab

| ID     | Requirement                           | Priority |
| ------ | ------------------------------------- | -------- |
| FR-052 | Display Current PDC with color coding | P0       |
| FR-053 | Display PDC Worst Case projection     | P0       |
| FR-054 | Display PDC Best Case projection      | P0       |
| FR-055 | Display Gap Days Remaining            | P0       |
| FR-056 | Display Delay Budget/Refill           | P0       |
| FR-057 | Display Fragility Tier badge          | P0       |
| FR-058 | Display Days to Runout                | P0       |
| FR-059 | Display Refills Needed (to EOY)       | P0       |
| FR-060 | Display Priority Score                | P0       |
| FR-061 | Display Treatment Period days         | P1       |
| FR-062 | Display Covered Days                  | P1       |
| FR-063 | Display Gap Days Used                 | P1       |

#### 7.5.4 Timeline Tab (Visual Fill/Gap History)

| ID     | Requirement                                                           | Priority |
| ------ | --------------------------------------------------------------------- | -------- |
| FR-064 | Display legend showing Fill (green), Gap (red), Due (blue) indicators | P0       |
| FR-065 | Display chronological list of fill events                             | P0       |
| FR-066 | Show fill date, fill number, days supply for each fill                | P0       |
| FR-067 | Show coverage end date for each fill                                  | P0       |
| FR-068 | Display gap indicators between fills with gap duration in days        | P0       |
| FR-069 | Color-code gap indicators in red with date range                      | P0       |
| FR-070 | Display "Next fill due" indicator at bottom with days from today      | P0       |
| FR-071 | Show vertical connecting line between timeline events                 | P0       |
| FR-072 | Mark reversed claims with visual indicator                            | P1       |
| FR-073 | Display Coverage Summary section with Total Fills and Reversals count | P1       |
| FR-074 | Show empty state when no fill history available                       | P1       |

#### 7.5.5 Claims Tab

| ID     | Requirement                                   | Priority |
| ------ | --------------------------------------------- | -------- |
| FR-075 | Display claims table with sortable columns    | P0       |
| FR-076 | Show columns: Date, Days Supply, NDC, Status  | P0       |
| FR-077 | Color-code reversal status (Paid vs Reversed) | P0       |
| FR-078 | Support scrolling for long claims lists       | P0       |
| FR-079 | Show empty state when no claims available     | P1       |

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Requirement      | Target      |
| ---------------- | ----------- |
| Page load time   | < 2 seconds |
| Tab switch time  | < 500ms     |
| Drawer open time | < 300ms     |
| Data refresh     | < 1 second  |
| Search response  | < 300ms     |

### 8.2 Accessibility

| Requirement         | Standard      |
| ------------------- | ------------- |
| WCAG Compliance     | 2.1 AA        |
| Keyboard Navigation | Full support  |
| Screen Reader       | Compatible    |
| Color Contrast      | 4.5:1 minimum |

### 8.3 Browser Support

| Browser | Version |
| ------- | ------- |
| Chrome  | Latest  |
| Firefox | Latest  |
| Safari  | Latest  |
| Edge    | Latest  |

---

## 9. System Architecture

### 9.1 Component Structure

```
PatientDetailPageTabbed.jsx
├── Header Section
│   ├── Patient Name & ID
│   ├── Age & DOB
│   ├── PDC Badge
│   └── Action Buttons
├── Tab Navigation
│   ├── Overview Tab → OverviewTab.jsx
│   ├── Medications Tab → MedicationsTab.jsx
│   ├── Outreach Tab → OutreachTab.jsx
│   └── Med Adherence Tab → MedAdhMetricsDebug (inline)
│       └── Medication-Level Details Table (clickable rows)
└── Drawers & Modals
    ├── MedicationDetailDrawer (3-tab slide-out)
    │   ├── Details Tab
    │   ├── Timeline Tab (fill/gap visualization)
    │   └── Claims Tab
    ├── RXClaimDetailDrawer
    ├── AICallLogModal.jsx
    └── AICallPrepBanner.jsx
```

### 9.2 Service Dependencies

| Service                      | Purpose                          |
| ---------------------------- | -------------------------------- |
| `fragilityTierService.js`    | Tier calculations (REQUIRED)     |
| `medAdherenceService.js`     | PDC calculations                 |
| `pdcDataService.js`          | RX claims data                   |
| `patientAnalyticsService.js` | Patient analytics                |
| `llmService.js`              | AI-generated adherence summaries |

---

## 10. Data Requirements

### 10.1 Patient Object

```javascript
{
  id: string,
  name: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string | Date,
  phone: string,
  email: string,
  address: string,
  memberId: string,
  medications: Array,
  medAdherence: Object,
  outreachHistory: Array,
  rxClaims: Array,
  crm: Object
}
```

### 10.2 Medication Object

```javascript
{
  id: string,
  medicationName: string,
  medicationClass: string,
  measure: 'MAC' | 'MAD' | 'MAH',
  isMedicationAdherence: boolean,
  currentPdc: number,
  pdcWorstCase: number,
  pdcBestCase: number,
  daysToRunout: number,
  gapDaysRemaining: number,
  gapDaysUsed: number,
  delayBudgetPerRefill: number,
  refillsRemaining: number,
  refillsNeeded: number,
  fragilityTier: string,
  priorityScore: number,
  treatmentPeriodDays: number,
  coveredDays: number,
  lastFillDate: string | Date,
  rxClaims: Array  // Attached when drawer opens
}
```

### 10.3 RX Claim Object

```javascript
{
  Rx_Date_Of_Service: string | Date,
  Rx_Drug_Label_Name: string,
  Rx_Days_Supply: number,
  Rx_NDC_Code: string,
  Reversal_Flag: 'N' | 'R' | 'Y',
  measure: 'MAC' | 'MAD' | 'MAH'
}
```

---

## 11. UI/UX Requirements

### 11.1 Color Coding Standards

#### PDC Status Colors

| Status  | PDC Range | Color | Hex     |
| ------- | --------- | ----- | ------- |
| PASSING | ≥ 80%     | Green | #10B981 |
| AT_RISK | 60% - 79% | Amber | #F59E0B |
| FAILING | < 60%     | Red   | #EF4444 |

#### Fragility Tier Colors

| Tier      | Color  | Hex     |
| --------- | ------ | ------- |
| COMPLIANT | Green  | #10B981 |
| F1        | Red    | #EF4444 |
| F2        | Orange | #F97316 |
| F3        | Amber  | #F59E0B |
| F4        | Blue   | #3B82F6 |
| F5        | Green  | #10B981 |
| T5        | Gray   | #6B7280 |

#### Timeline Event Colors

| Event Type | Color | Hex     |
| ---------- | ----- | ------- |
| Fill       | Green | #22C55E |
| Gap        | Red   | #EF4444 |
| Due        | Blue  | #3B82F6 |

#### MA Measure Badge Colors

| Measure | Background | Border     | Text       |
| ------- | ---------- | ---------- | ---------- |
| MAC     | Blue-100   | Blue-300   | Blue-700   |
| MAD     | Purple-100 | Purple-300 | Purple-700 |
| MAH     | Pink-100   | Pink-300   | Pink-700   |

### 11.2 Badge Standards

| Badge Type    | Shape        | Size              |
| ------------- | ------------ | ----------------- |
| PDC Badge     | Rounded pill | text-xs           |
| Tier Badge    | Rounded pill | text-xs font-bold |
| MA Badge      | Square       | text-xs           |
| Urgency Badge | Rounded      | text-xs           |

### 11.3 Medication Timeline Drawer Specifications

| Property  | Value                    |
| --------- | ------------------------ |
| Width     | 480px                    |
| Position  | Fixed right, full height |
| Backdrop  | Black 50% opacity        |
| Animation | Slide from right         |
| Z-index   | 50                       |

---

## 12. Golden Standard Calculations

**Reference:** `src/pages/MetricsReference.jsx`

### 12.1 Core Formulas

| Calculation            | Formula                                 |
| ---------------------- | --------------------------------------- |
| **PDC**                | (Covered Days ÷ Treatment Period) × 100 |
| **Treatment Period**   | First Fill Date → December 31           |
| **Gap Days Allowed**   | Treatment Period × 20%                  |
| **Gap Days Used**      | Treatment Period - Covered Days         |
| **Gap Days Remaining** | Gap Days Allowed - Gap Days Used        |
| **Delay Budget**       | Gap Days Remaining ÷ Refills Remaining  |

### 12.2 Fragility Tier Thresholds

**CRITICAL RULE:** Tiers are based on **Delay Budget** (Gap Days Remaining ÷ Refills Remaining), NOT raw gap days.

| Tier      | Delay Budget         | Contact Window   | Priority Score |
| --------- | -------------------- | ---------------- | -------------- |
| COMPLIANT | PDC Status Quo ≥ 80% | Monitor only     | 0              |
| F1        | ≤ 2 days/refill      | 24 hours         | 100            |
| F2        | 3-5 days/refill      | 48 hours         | 80             |
| F3        | 6-10 days/refill     | 1 week           | 60             |
| F4        | 11-20 days/refill    | 2 weeks          | 40             |
| F5        | > 20 days/refill     | Monthly          | 20             |
| T5        | PDC Perfect < 80%    | Special handling | 0              |

**IMPORTANT:** Always check COMPLIANT status BEFORE assigning F1-F5 tiers.

### 12.3 Priority Score Bonuses

| Condition                              | Bonus Points |
| -------------------------------------- | ------------ |
| Out of Medication (Days to Runout ≤ 0) | +30          |
| Q4 (October - December)                | +25          |
| Multiple MA Measures                   | +15          |
| New Patient (< 90 days)                | +10          |

### 12.4 PDC Projections

| Projection         | Formula                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| **PDC Status Quo** | (Covered Days + min(Current Supply, Days to Year End)) ÷ Treatment Period |
| **PDC Perfect**    | (Covered Days + Days to Year End) ÷ Treatment Period                      |

### 12.5 CMS STARS Measures

| Measure      | Code | Drug Classes                                |
| ------------ | ---- | ------------------------------------------- |
| Cholesterol  | MAC  | Statins                                     |
| Diabetes     | MAD  | Biguanides, Sulfonylureas, DPP-4 Inhibitors |
| Hypertension | MAH  | ACE Inhibitors, ARBs                        |

---

## 13. Risks & Mitigation

| Risk                                      | Impact | Likelihood | Mitigation                                        |
| ----------------------------------------- | ------ | ---------- | ------------------------------------------------- |
| Calculation mismatch with Golden Standard | High   | Medium     | Unit tests against MetricsReference.jsx           |
| Page load > 2 seconds                     | Medium | Low        | Lazy loading, pagination                          |
| Incorrect tier assignment                 | High   | Medium     | Use fragilityTierService.js only                  |
| Missing outreach history                  | Medium | Low        | Data validation on save                           |
| Drawer not showing claims                 | Medium | Low        | Multiple matching strategies (NDC, name, measure) |

---

## 14. Appendices

### 14.1 Related Documents

| Document               | Location                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| Golden Standard        | `src/pages/MetricsReference.jsx`                                     |
| Fragility Tier Service | `src/services/fragilityTierService.js`                               |
| All Patients PRD       | `MedRefills_Tech_Handoff_Docs/PRD_ALL_PATIENTS_REFILL_WORKLIST.html` |
| Test Scenarios         | `MedRefills_Tech_Handoff_Docs/TEST_SCENARIOS_FRAGILITY_TIERS.html`   |

### 14.2 Component Files

| Component                | File Path                                                        |
| ------------------------ | ---------------------------------------------------------------- |
| Main Page                | `src/pages/PatientDetailPageTabbed.jsx`                          |
| Overview Tab             | `src/components/PatientDetail/OverviewTab.jsx`                   |
| Medications Tab          | `src/components/PatientDetail/MedicationsTab.jsx`                |
| Outreach Tab             | `src/components/PatientDetail/OutreachTab.jsx`                   |
| Med Adherence Tab        | `src/pages/PatientDetailPageTabbed.jsx` (MedAdhMetricsDebug)     |
| Medication Detail Drawer | `src/pages/PatientDetailPageTabbed.jsx` (MedicationDetailDrawer) |
| AI Call Log Modal        | `src/components/PatientDetail/AICallLogModal.jsx`                |

### 14.3 Changelog

| Version | Date        | Changes                                                                                            |
| ------- | ----------- | -------------------------------------------------------------------------------------------------- |
| 1.0     | Jan 4, 2026 | Initial release with 5 tabs                                                                        |
| 1.1     | Jan 4, 2026 | Removed Refill Worklist tab, removed Campaigns tab, added Medication Timeline Drawer documentation |

### 14.4 Approval

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| Product Owner |      |      |           |
| Tech Lead     |      |      |           |
| QA Lead       |      |      |           |

---

_Document End_
