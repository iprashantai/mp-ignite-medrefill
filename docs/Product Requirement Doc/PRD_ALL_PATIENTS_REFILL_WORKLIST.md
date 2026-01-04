# PRD: All Patients Refill Worklist

# Product Requirements Document (PRD)

# All Patients & Refill Worklist

---

**Document Info**

---

**Product Name** Ignite MedRefills

**Version** 1.0

**Date** January 3, 2026

**Author** Product Head

**Status** APPROVED FOR DEVELOPMENT

**Confidentiality** Internal Use Only

---

## Table of Contents

1.  [Executive Summary](#X102b2e9de4183984340b81b0bb402a984d3925a)
2.  [Product Vision &
    Strategy](#Xbb9d9068bee436bf44f0b596ce3d537c75c6129)
3.  [Target Users & Personas](#Xeb07f9e1c0574e80c614659d2fec17453816296)
4.  [Problem Statement](#X9fc76f5d3eaf26b7895c92a5951e4e34d669957)
5.  [Goals & Success Metrics](#X50790997a55218608dd4893f79e57a3b07b5b5a)
6.  [User Stories &
    Requirements](#Xc9c651c138857d4f8924f63935504f4d3f41a30)
7.  [Functional Requirements](#X9121c7872f417f308bfa3ce16b351bbfdeae3aa)
8.  [Non-Functional
    Requirements](#X28edbc7fccd13f64af3229f07bd3bcecc0073fc)
9.  [System Architecture](#X50d37b585c6338653c7f2b86f9da20dc6f7a5ef)
10. [Data Requirements](#X90f4a4a965ddc2858e2d0cf85a1a7bce7fd384e)
11. [AI/ML Requirements](#X3d04ff4c8ab8d10e445152eaab1173ee177dfa0)
12. [UI/UX Requirements](#X43d4c0d7040ff364af86fcc7e517ba809a96609)
13. [Integration
    Requirements](#Xb54de1b677b029417da1018e7a812992b4f8a2c)
14. [Release Plan & Roadmap](#Xdf9299fb4836c9a285d963df5e89ee6f99e68c4)
15. [Risks & Mitigation](#X5afef3731755959cd62d46861b0ff079056766a)
16. [Appendices](#X59d1b795ae23be2efc94689a417f7821e80c112)

## 1. Executive Summary

### 1.1 Product Overview

**Ignite MedRefills** is an AI-powered medication adherence management
platform designed for Medicare Advantage (MA) health plans. The product
enables pharmacists and care coordinators to proactively manage
medication refills for patients taking chronic medications, with the
goal of improving CMS STARS quality ratings and patient health outcomes.

### 1.2 Business Case

---

Challenge Current State With Ignite MedRefills

---

**Medication 50% of patients Target: 80%+ adherence
Adherence** non-adherent

**STARS 3-star average Target: 4.5+ stars
Ratings**

**Staff 15-20 refills/hour Target: 50+ refills/hour
Productivity**

**Safety Variable (human Target: 0% AI-flagged safety
Misses** error) events

---

### 1.3 Key Value Propositions

1.  **70% Automation Rate**: AI pre-approves routine refills, freeing
    staff for complex cases
2.  **3-Tier AI Safety Net**: Primary AI → QA AI → Manager AI ensures 0%
    safety misses
3.  **Proactive Identification**: System identifies at-risk patients
    before they run out of medication
4.  **CMS STARS Alignment**: Built around MAC, MAD, MAH quality measures
5.  **Complete Audit Trail**: Clinical Memory captures every decision
    for compliance

### 1.4 Scope

This PRD covers two interconnected modules:

---

Module Description

---

**All Patients (CRM)** Central patient repository with
demographics, medications, and adherence
metrics

**Refill Worklist** Operational workflow for processing
medication refills through AI review to
fulfillment

---

## 2. Product Vision & Strategy

### 2.1 Vision Statement

> _"To be the world-class AI-first medication adherence platform that
> enables healthcare organizations to achieve 100% of their CMS STARS
> goals while ensuring every patient gets the right medication at the
> right time."_

### 2.2 Strategic Pillars

    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                           STRATEGIC PILLARS                                      │
    ├─────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                  │
    │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
    │  │    AI-FIRST   │  │   PROACTIVE   │  │  PATIENT-     │  │   STARS       │    │
    │  │   AUTOMATION  │  │    OUTREACH   │  │   CENTRIC     │  │   FOCUSED     │    │
    │  │               │  │               │  │               │  │               │    │
    │  │ • 70% auto-   │  │ • Identify    │  │ • Patient     │  │ • MAC, MAD,   │    │
    │  │   approved    │  │   before      │  │   portal      │  │   MAH aligned │    │
    │  │ • 3-tier AI   │  │   runout      │  │ • SMS/Email   │  │ • PDC ≥80%    │    │
    │  │   decision    │  │ • Risk-based  │  │   outreach    │  │   target      │    │
    │  │ • Human       │  │   priority    │  │ • Barrier     │  │ • Gap days    │    │
    │  │   verified    │  │               │  │   resolution  │  │   tracking    │    │
    │  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘    │
    │                                                                                  │
    └─────────────────────────────────────────────────────────────────────────────────┘

### 2.3 Product Principles

---

Principle Description

---

**AI-First, Human-Verified** AI makes recommendations; humans have
final authority on all clinical
decisions

**All Paths Lead to Human** Every AI decision routes to human
review before action

**Single Source of Truth** `refillWorklist` collection owns
workflow status; no dual-state
confusion

**Clinical Memory** Complete audit trail from patient
intake through archive

**Exception-Driven** Failures route to specialized queues
with SLA tracking

**Archive is Terminal** All CLOSED\_\* statuses end in
Archive; no resurrection of closed
cases

---

## 3. Target Users & Personas

### 3.1 Primary Users

#### Persona 1: Clinical Pharmacist (RPh)

---

Attribute Details

---

**Role** Reviews AI decisions,
approves/denies refills,
resolves clinical exceptions

**Daily Volume** 150-200 patient reviews

**Pain Points** Too many clicks, missing
clinical context, safety alert
fatigue

**Goals** Quick reviews, accurate
decisions, zero safety misses

**Tech Comfort** High

---

**User Quote**: _"I need to see the AI's reasoning alongside the
patient's full clinical picture in one view."_

#### Persona 2: Care Coordinator

---

Attribute Details

---

**Role** Patient outreach, scheduling,
barrier resolution

**Daily Volume** 50-75 outreach calls

**Pain Points** Can't reach patients, no
visibility into pickup status

**Goals** High patient contact rate,
barrier resolution, fill
confirmation

**Tech Comfort** Medium

---

**User Quote**: _"I want to know instantly when a patient hasn't picked
up so I can follow up."_

#### Persona 3: PA Specialist

---

Attribute Details

---

**Role** Prior authorization requests and
follow-up

**Daily 20-30 PA cases
Volume**

**Pain Tracking PA status across multiple
Points** systems

**Goals** PA approval rate, quick turnaround

**Tech Medium
Comfort**

---

### 3.2 Secondary Users

---

User Role Primary Use Case

---

**Supervisor** Team lead Dashboard, escalations, SLA
monitoring

**Quality Compliance STARS reporting, audit reviews
Analyst**

**IT Admin** Technical System configuration,
integrations

---

### 3.3 User Journey Map

    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                         PHARMACIST DAILY WORKFLOW                                │
    ├─────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                  │
    │  8:00 AM                    10:00 AM                   2:00 PM                  │
    │    │                           │                          │                     │
    │    ▼                           ▼                          ▼                     │
    │  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐            │
    │  │   Morning    │         │   Process    │         │   Resolve    │            │
    │  │   Review     │   ───▶  │   Refills    │   ───▶  │  Exceptions  │            │
    │  │              │         │              │         │              │            │
    │  │ • Dashboard  │         │ • AI-ready   │         │ • Clinical   │            │
    │  │ • Priorities │         │ • Quick      │         │ • PA cases   │            │
    │  │ • Escalations│         │   approve    │         │ • Barriers   │            │
    │  └──────────────┘         └──────────────┘         └──────────────┘            │
    │                                                                                  │
    │  4:00 PM                    5:00 PM                                             │
    │    │                           │                                                │
    │    ▼                           ▼                                                │
    │  ┌──────────────┐         ┌──────────────┐                                     │
    │  │   Outreach   │         │   End-of-    │                                     │
    │  │   Follow-up  │   ───▶  │   Day Wrap   │                                     │
    │  │              │         │              │                                     │
    │  │ • Pick-up    │         │ • Archive    │                                     │
    │  │   tracking   │         │ • Handoff    │                                     │
    │  │ • Callbacks  │         │ • Metrics    │                                     │
    │  └──────────────┘         └──────────────┘                                     │
    │                                                                                  │
    └─────────────────────────────────────────────────────────────────────────────────┘

## 4. Problem Statement

### 4.1 Core Problem

Medicare Advantage health plans face significant challenges in
medication adherence:

1.  **Scale**: Plans manage 50,000-500,000 members, each with 5-10
    chronic medications
2.  **Complexity**: Each refill requires clinical evaluation against 16+
    protocol checks
3.  **Manual Process**: Current workflows require 5+ minutes per refill
    review
4.  **Reactive**: Patients identified after they've already stopped
    taking medication
5.  **Fragmented Data**: Patient information scattered across EHR, PBM,
    pharmacy systems

### 4.2 Business Impact

---

Problem Annual Cost per 100K
Members

---

Non-adherence \$12-18M
hospitalizations

STARS rating penalties \$5-10M

Staff inefficiency \$2-4M

Pharmacy waste (unused \$1-2M
meds)

**Total Potential **\$20-34M**
Savings**

---

### 4.3 Current State Pain Points

---

Pain Point Description Frequency

---

**Alert Fatigue** Too many meaningless Daily
alerts

**Missing Context** Have to open 3+ systems Every patient
for full picture

**No Prioritization** Don't know who to call Daily
first

**Duplicate Work** Same patient reviewed Weekly
multiple times

**Lost Patients** Patients "fall through Weekly
cracks"

**Compliance Gaps** Audit trails incomplete Monthly

---

## 5. Goals & Success Metrics

### 5.1 Business Goals

---

Goal Target Timeline Measurement

---

**G1**: PDC ≥80% for 80% of 12 months CMS STARS data
Improve patients  
 medication  
 adherence

**G2**: +0.5 star 12 months CMS rating
Increase STARS improvement  
 ratings

**G3**: 50+ refills/hour 6 months System metrics
Improve staff  
 productivity

**G4**: Zero 0 AI-flagged safety Ongoing Audit reports
safety misses events

**G5**: Reduce -30% 12 months Member surveys
patient medication-related  
 complaints

---

### 5.2 Key Performance Indicators (KPIs)

#### Tier 1: North Star Metrics

---

KPI Definition Target Current

---

**PDC Rate** \% patients with PDC ≥80% ≥80% 62%

**AI \% refills auto-approved ≥70% N/A
Automation by AI  
 Rate**

**Time to Days from identification ≤5 days 12 days
Fill** to pharmacy pickup

---

#### Tier 2: Operational Metrics

---

KPI Definition Target

---

**Review Time** Avg seconds per pharmacist ≤30 sec
review

**Exception Avg hours to resolve exception ≤24 hrs
Resolution**

**Outreach \% patients contacted within ≥85%
Success** 48 hrs

**Fill Rate** \% approved refills actually ≥90%
picked up

---

#### Tier 3: Quality Metrics

---

KPI Definition Target

---

**Safety \% AI decisions overridden for ≤2%
Override safety  
 Rate**

**AI \% AI decisions confirmed by ≥95%
Accuracy** pharmacist

**Duplicate \% patients with duplicate entries ≤1%
Rate**

**SLA \% exceptions resolved within SLA ≥95%
Compliance**

---

### 5.3 OKRs (Quarterly)

#### Q1 2026: Foundation

---

Objective Key Results

---

**O1**: Launch MVP with core KR1: 100% of demo patients processable
workflow

                                   KR2: 4-tab navigation functional

                                   KR3: AI 3-tier stack integrated

---

#### Q2 2026: Scale

---

Objective Key Results

---

**O2**: Achieve production KR1: EHR integration complete
readiness

                               KR2: 10,000 patients
                               onboarded

                               KR3: 70% automation rate
                               achieved

---

## 6. User Stories & Requirements

### 6.1 Epic Structure

    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                              EPIC HIERARCHY                                      │
    ├─────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                  │
    │  EPIC 1: All Patients (CRM)                                                     │
    │  ├── US-1.1: View patient list                                                  │
    │  ├── US-1.2: Search patients                                                    │
    │  ├── US-1.3: View patient detail                                                │
    │  ├── US-1.4: View adherence metrics                                             │
    │  └── US-1.5: Filter by risk tier                                                │
    │                                                                                  │
    │  EPIC 2: Refill Worklist                                                        │
    │  ├── US-2.1: View refill queue                                                  │
    │  ├── US-2.2: Review AI decision                                                 │
    │  ├── US-2.3: Approve/Deny refill                                                │
    │  ├── US-2.4: Route to exception                                                 │
    │  └── US-2.5: View clinical memory                                               │
    │                                                                                  │
    │  EPIC 3: AI Decision Engine                                                     │
    │  ├── US-3.1: Run primary AI evaluation                                          │
    │  ├── US-3.2: Run QA AI validation                                               │
    │  ├── US-3.3: Run Manager AI arbitration                                         │
    │  └── US-3.4: Execute 16 protocol checks                                         │
    │                                                                                  │
    │  EPIC 4: Outreach & Monitoring                                                  │
    │  ├── US-4.1: Send automated outreach                                            │
    │  ├── US-4.2: Log call outcomes                                                  │
    │  ├── US-4.3: Track pickup status                                                │
    │  └── US-4.4: Detect pharmacy fills                                              │
    │                                                                                  │
    │  EPIC 5: Exception Management                                                   │
    │  ├── US-5.1: Route to exception queue                                           │
    │  ├── US-5.2: Resolve exception                                                  │
    │  ├── US-5.3: Rerun AI with new data                                             │
    │  └── US-5.4: Track SLA                                                          │
    │                                                                                  │
    └─────────────────────────────────────────────────────────────────────────────────┘

### 6.2 Detailed User Stories

#### EPIC 1: All Patients (CRM)

**US-1.1: View Patient List**

---

Field Value

---

**As a** Clinical Pharmacist

**I want to** See a list of all patients with
their adherence status

**So that** I can identify patients who need
intervention

**Acceptance Criteria** 1\. Display patient name, MRN, PDC,
Tier, Days to Runout

                                      2\. Sort by priority score by
                                      default

                                      3\. Load within 2 seconds

                                      4\. Paginate at 50 patients per
                                      page

**Priority** P0 (Must Have)

**Story Points** 5

---

**US-1.2: Search Patients**

---

Field Value

---

**As a** Care Coordinator

**I want to** Search for a patient by name or
MRN

**So that** I can quickly find a specific
patient

**Acceptance 1\. Fuzzy search matches partial
Criteria** names

                     2\. Results appear within 500ms

                     3\. Highlight matching text

                     4\. Show top 10 results

**Priority** P0

**Story Points** 3

---

**US-1.3: View Patient Detail**

---

Field Value

---

**As a** Clinical Pharmacist

**I want to** See complete patient information in
a detail panel

**So that** I can make informed clinical
decisions

**Acceptance Criteria** 1\. Show demographics, conditions,
allergies

                                      2\. Show all medications with fill
                                      history

                                      3\. Show PDC by measure (MAC, MAD,
                                      MAH)

                                      4\. Show gap days remaining

                                      5\. Show last visit date

**Priority** P0

**Story Points** 8

---

**US-1.4: View Adherence Metrics**

---

Field Value

---

**As a** Quality Analyst

**I want to** See aggregate adherence metrics

**So that** I can track STARS performance

**Acceptance 1\. Show overall PDC distribution
Criteria**

                     2\. Show PDC by measure (MAC, MAD,
                     MAH)

                     3\. Show tier distribution (F1-F5,
                     T5)

                     4\. Compare to benchmark

**Priority** P1

**Story Points** 5

---

**US-1.5: Filter by Risk Tier**

---

Field Value

---

**As a** Clinical Pharmacist

**I want to** Filter patients by fragility tier

**So that** I can focus on highest-risk
patients first

**Acceptance Criteria** 1\. Quick filter buttons for each
tier (F1-F5, T5)

                                      2\. Show count per tier

                                      3\. Allow multi-select

                                      4\. Clear all filters with one
                                      click

**Priority** P0

**Story Points** 3

---

#### EPIC 2: Refill Worklist

**US-2.1: View Refill Queue**

---

Field Value

---

**As a** Clinical Pharmacist

**I want to** See a prioritized queue of refills
ready for review

**So that** I can process refills in order of
urgency

**Acceptance Criteria** 1\. Display in 4 tabs (Refills,
Pick-up, Exceptions, Archive)

                                      2\. Refills tab shows AI
                                      pre-reviewed patients

                                      3\. Color-coded by tier (F1=red,
                                      F2=orange, etc.)

                                      4\. Show AI decision badge
                                      (Approve/Deny/Route)

                                      5\. Show days to runout

**Priority** P0

**Story Points** 8

---

**US-2.2: Review AI Decision**

---

Field Value

---

**As a** Clinical Pharmacist

**I want to** See the AI's decision with full
rationale

**So that** I can verify the recommendation is
correct

**Acceptance Criteria** 1\. Show Primary AI decision +
confidence + rationale

                                      2\. Show QA AI review
                                      (agree/override)

                                      3\. Show Manager AI if triggered

                                      4\. Show all 16 protocol check
                                      results

                                      5\. Highlight any failed checks in
                                      red

**Priority** P0

**Story Points** 8

---

**US-2.3: Approve/Deny Refill**

---

Field Value

---

**As a** Clinical Pharmacist

**I want to** Approve or deny a refill with one
click

**So that** I can process refills quickly

**Acceptance 1\. "Approve" button sends Rx to
Criteria** pharmacy

                     2\. "Deny" button requires reason
                     selection

                     3\. Can override AI denial with
                     reason

                     4\. Capture pharmacist ID and
                     timestamp

                     5\. Move to appropriate next queue

**Priority** P0

**Story Points** 5

---

**US-2.4: Route to Exception**

---

Field Value

---

**As a** Clinical Pharmacist

**I want to** Route a patient to an exception
queue

**So that** Specialized staff can resolve
barriers

**Acceptance Criteria** 1\. Select exception type
(Clinical, PA, Scheduling, Others)

                                      2\. Add notes for recipient

                                      3\. Patient moves to Exception tab

                                      4\. SLA timer starts

                                      5\. Owner notified

**Priority** P0

**Story Points** 5

---

**US-2.5: View Clinical Memory**

---

Field Value

---

**As a** Clinical Pharmacist

**I want to** See the complete history of actions on
a patient

**So that** I understand what's been done and why

**Acceptance 1\. Show timeline of all events
Criteria**

                     2\. Color-code by type (AI, Human,
                     System)

                     3\. Collapsible/expandable

                     4\. Show who, when, what for each
                     event

**Priority** P1

**Story Points** 5

---

#### EPIC 3: AI Decision Engine

**US-3.1: Run Primary AI Evaluation**

---

Field Value

---

**As a** System

**I want to** Evaluate each patient against clinical
protocols

**So that** A preliminary decision is generated

**Acceptance 1\. Accept patient data as input
Criteria**

                     2\. Return decision
                     (APPROVE/DENY/ROUTE)

                     3\. Return confidence score (0-100)

                     4\. Return detailed rationale

                     5\. Complete within 2 seconds

**Priority** P0

**Story Points** 13

---

**US-3.2: Run QA AI Validation**

---

Field Value

---

**As a** System

**I want to** Validate Primary AI's decision for
errors

**So that** Mistakes are caught before human
review

**Acceptance 1\. Review Primary AI's reasoning
Criteria**

                     2\. Check for date calculation
                     errors

                     3\. Verify protocol check logic

                     4\. Return AGREE or OVERRIDE with
                     reason

**Priority** P0

**Story Points** 8

---

**US-3.3: Run Manager AI Arbitration**

---

Field Value

---

**As a** System

**I want to** Arbitrate when Primary and QA AI
disagree

**So that** A final AI decision is reached

**Acceptance 1\. Only triggered when Primary ≠
Criteria** QA

                     2\. Review both perspectives

                     3\. Make final decision

                     4\. Provide performance analysis

**Priority** P0

**Story Points** 5

---

**US-3.4: Execute 16 Protocol Checks**

---

Field Value

---

**As a** System

**I want to** Run all 16 clinical protocol checks

**So that** Safety and clinical requirements are
validated

**Acceptance 1\. Run all SAFETY checks (S1-S4)
Criteria**

                     2\. Run all CLINICAL checks (C1-C4)

                     3\. Run all IMPORTANT checks (I1-I4)

                     4\. Run all ADMIN checks (A1-A4)

                     5\. Return PASS/FAIL with value for
                     each

**Priority** P0

**Story Points** 8

---

#### EPIC 4: Outreach & Monitoring

**US-4.1: Send Automated Outreach**

---

Field Value

---

**As a** System

**I want to** Send automated SMS/email to patients

**So that** Patients are notified to pick up their
medication

**Acceptance 1\. Day 1: Send SMS
Criteria**

                     2\. Day 2: Send email

                     3\. Day 3: Flag for manual call

                     4\. Day 4: Send IVR

                     5\. Log all attempts

**Priority** P1

**Story Points** 8

---

**US-4.2: Log Call Outcomes**

---

Field Value

---

**As a** Care Coordinator

**I want to** Log the outcome of my call with a
patient

**So that** The system knows what happened

**Acceptance Criteria** 1\. Select outcome (Confirmed, No
Answer, Barrier, Declined)

                                      2\. If barrier, select type and
                                      route to exception

                                      3\. If confirmed, set expected
                                      pickup date

                                      4\. Add notes

**Priority** P0

**Story Points** 5

---

**US-4.3: Track Pickup Status**

---

Field Value

---

**As a** Care Coordinator

**I want to** See which patients haven't picked
up their medication

**So that** I can follow up with them

**Acceptance Criteria** 1\. Show "Days Waiting" since
approval

                                      2\. Highlight overdue (\>7 days) in
                                      red

                                      3\. Show expected pickup date

                                      4\. Allow manual "Confirm Fill"

**Priority** P0

**Story Points** 5

---

**US-4.4: Detect Pharmacy Fills**

---

Field Value

---

**As a** System

**I want to** Automatically detect when a patient
picks up medication

**So that** The case can be closed without
manual intervention

**Acceptance Criteria** 1\. Poll pharmacy claims daily

                                      2\. Match claims to open worklist
                                      items

                                      3\. Auto-close with CLOSED_FILLED
                                      status

                                      4\. Log detection in clinical
                                      memory

**Priority** P1

**Story Points** 8

---

#### EPIC 5: Exception Management

**US-5.1: Route to Exception Queue**

---

Field Value

---

**As a** Clinical Pharmacist

**I want to** Route a patient to the correct
exception queue

**So that** The right specialist handles the
barrier

**Acceptance Criteria** 1\. Clinical → 4h SLA, Clinical
Pharmacist owner

                                      2\. PA → 24h SLA, PA Team owner

                                      3\. Scheduling → 24h SLA, Care
                                      Coordinator owner

                                      4\. Others → 24h SLA, various
                                      owners

**Priority** P0

**Story Points** 5

---

**US-5.2: Resolve Exception**

---

Field Value

---

**As a** Specialist

**I want to** Resolve an exception and move the patient
forward

**So that** The refill process can continue

**Acceptance 1\. Select resolution type
Criteria**

                     2\. Add resolution notes

                     3\. Route to next queue (Outreach,
                     Monitoring, Archive)

                     4\. Stop SLA timer

**Priority** P0

**Story Points** 5

---

**US-5.3: Rerun AI with New Data**

---

Field Value

---

**As a** Clinical Pharmacist

**I want to** Rerun AI after uploading new
documentation

**So that** The AI can reconsider with complete
information

**Acceptance 1\. Upload document (lab, note, etc.)
Criteria**

                     2\. Click "Rerun AI" button

                     3\. Max 3 reruns allowed

                     4\. After 3 fails, escalate to
                     supervisor

**Priority** P1

**Story Points** 5

---

**US-5.4: Track SLA**

---

Field Value

---

**As a** Supervisor

**I want to** See which exceptions are approaching SLA
breach

**So that** I can intervene before deadline

**Acceptance 1\. Show time remaining for each
Criteria** exception

                     2\. Yellow warning at 50% remaining

                     3\. Red alert at 25% remaining

                     4\. Notify owner approaching deadline

**Priority** P1

**Story Points** 5

---

## 7. Functional Requirements

### 7.1 Module 1: All Patients (CRM)

#### FR-1.1: Patient Data Display

---

ID Requirement Priority

---

FR-1.1.1 Display patient name (Last, First P0
format)

FR-1.1.2 Display MRN (Medical Record P0
Number)

FR-1.1.3 Display DOB (Date of Birth) P0

FR-1.1.4 Display phone number P0

FR-1.1.5 Display email address P1

FR-1.1.6 Display insurance Member ID P0

---

#### FR-1.2: Medication Display

---

ID Requirement Priority

---

FR-1.2.1 Display all active medications for P0
patient

FR-1.2.2 Show medication name with strength P0

FR-1.2.3 Show days supply (30, 90, etc.) P0

FR-1.2.4 Show refills remaining P0

FR-1.2.5 Show last fill date P0

FR-1.2.6 Show days to runout (calculated) P0

FR-1.2.7 Show STARS measure badge (MAC/MAD/MAH) P0

---

#### FR-1.3: Adherence Metrics

---

ID Requirement Priority

---

FR-1.3.1 Calculate PDC for each medication P0

FR-1.3.2 Calculate aggregate PDC using P0
all-or-nothing method

FR-1.3.3 Calculate gap days used P0

FR-1.3.4 Calculate gap days remaining (allowed - P0
used)

FR-1.3.5 Assign fragility tier (COMP, F1-F5, T5) P0

FR-1.3.6 Calculate priority score P0

---

#### FR-1.4: Search & Filter

---

ID Requirement Priority

---

FR-1.4.1 Fuzzy search by patient name P0

FR-1.4.2 Search by MRN (exact match) P0

FR-1.4.3 Filter by fragility tier P0

FR-1.4.4 Filter by STARS measure P0

FR-1.4.5 Filter by PDC status P0
(Passing/At-Risk/Failing)

FR-1.4.6 Quick filters (Candidates, Urgent, P0
Overdue)

---

### 7.2 Module 2: Refill Worklist

#### FR-2.1: Workflow Navigation

---

ID Requirement Priority

---

FR-2.1.1 4-tab navigation (Refills, P0
Pick-up, Exceptions, Archive)

FR-2.1.2 Show count badge on each tab P0

FR-2.1.3 Persist tab selection across page P1
refresh

FR-2.1.4 URL reflects current tab P1

---

#### FR-2.2: Refills Tab

---

ID Requirement Priority

---

FR-2.2.1 Display AI-reviewed patients awaiting P0
human action

FR-2.2.2 Sort by priority score (default) P0

FR-2.2.3 Show tier with color-coded intent line P0

FR-2.2.4 Show AI decision badge P0
(Approve/Deny/Route)

FR-2.2.5 Show confidence percentage P0

FR-2.2.6 Show pathway type (REFILL/RENEWAL) P0

FR-2.2.7 Clicking row opens review drawer P0

---

#### FR-2.3: Review Drawer

---

ID Requirement Priority

---

FR-2.3.1 3-tab layout (Overview, RX Claims, Med P0
Adherence)

FR-2.3.2 Overview: Protocol checks grid P0

FR-2.3.3 Overview: AI decision panel (Primary, QA, P0
Manager)

FR-2.3.4 Overview: Clinical memory timeline P0

FR-2.3.5 RX Claims: Fill history table P0

FR-2.3.6 Med Adherence: PDC breakdown by measure P0

FR-2.3.7 Approve/Deny/Route action buttons P0

FR-2.3.8 Keyboard shortcuts (A=Approve, D=Deny, P1
Esc=Close)

---

#### FR-2.4: Pick-up Tab

---

ID Requirement Priority

---

FR-2.4.1 Display approved patients awaiting pickup P0

FR-2.4.2 Show days since approval P0

FR-2.4.3 Show outreach status (Not Contacted, SMS P0
Sent, etc.)

FR-2.4.4 Highlight overdue (\>7 days) in red P0

FR-2.4.5 "Confirm Fill" button for manual close P0

FR-2.4.6 "Re-engage" button to restart outreach P1

---

#### FR-2.5: Exceptions Tab

---

ID Requirement Priority

---

FR-2.5.1 4 sub-queue tabs (Clinical, PA, P0
Scheduling, Others)

FR-2.5.2 Show exception type and reason P0

FR-2.5.3 Show SLA countdown P0

FR-2.5.4 Show assigned owner P0

FR-2.5.5 "Resolve" action with resolution type P0
selection

FR-2.5.6 "Rerun AI" button (max 3 times) P1

---

#### FR-2.6: Archive Tab

---

ID Requirement Priority

---

FR-2.6.1 Display all closed cases P0

FR-2.6.2 Show closed status (CLOSED_FILLED, P0
CLOSED_DECLINED, etc.)

FR-2.6.3 Show closed date and by whom P0

FR-2.6.4 Search within archive P1

FR-2.6.5 Date range filter P1

---

### 7.3 Decision Logic

#### FR-3.1: REFILL vs RENEWAL Pathway

---

ID Requirement Priority

---

FR-3.1.1 If refills remaining AND Rx not P0
expired → REFILL

FR-3.1.2 If refills remaining AND Rx P0
expired → RENEWAL

FR-3.1.3 If no refills AND recent visit P0
(≤90 days) → RENEWAL

FR-3.1.4 If no refills AND no recent visit P0
→ APPOINTMENT_NEEDED

---

#### FR-3.2: Status Transitions

---

ID Requirement Priority

---

FR-3.2.1 pending-review → reviewed (after P0
pharmacist action)

FR-3.2.2 reviewed + APPROVE → rx-sent P0

FR-3.2.3 rx-sent → filled-confirmed (after pharmacy P0
fill)

FR-3.2.4 reviewed + DENY → CLOSED_USER_DENIED P0

FR-3.2.5 reviewed + ROUTE → exception queue P0

---

### 7.4 Calculation Specifications (Gold Standard)

> **Source:** `docs/Medication_Adherence_Metrics_Reference_Guide.md` All
> calculations MUST follow these specifications exactly.

#### FR-4.1: PDC (Proportion of Days Covered) Calculation

---

ID Requirement Formula Priority

---

FR-4.1.1 Calculate PDC using `PDC = (Covered Days / Treatment Days) × 100` P0
covered days divided by  
 treatment period

FR-4.1.2 Treatment Period = First `Treatment Days = Dec 31 - First Fill Date + 1` P0
Fill Date → December 31  
 of current year

FR-4.1.3 Covered Days = Sum of `Covered Days = Σ(merged_periods)` P0
days_supply from all  
 fills (after overlap  
 merge)

FR-4.1.4 PDC is calculated per Each measure tracked separately P0
medication class (MAC,  
 MAD, MAH) independently

---

**PDC Status Thresholds:**

---

Status Range Color Meaning

---

**PASSING** PDC ≥ 80% 🟢 Green Meeting CMS compliance
goal

**AT_RISK** 60% ≤ PDC \< 🟡 Yellow Needs intervention
80%

**FAILING** PDC \< 60% 🔴 Red Urgent attention needed

---

**Example Calculation:**

    Patient: Maria Garcia
    First Fill Date: Jan 15, 2026
    Treatment Period: Jan 15 - Dec 31 = 351 days
    Covered Days (after merge): 292 days

    PDC = 292 ÷ 351 × 100 = 83.2% ✓ PASSING

#### FR-4.2: Gap Days Calculation

---

ID Requirement Formula Priority

---

FR-4.2.1 Calculate Gap Days Used `Gap Days Used = Treatment Days − Covered Days` P0

FR-4.2.2 Calculate Gap Days `Gap Days Allowed = Treatment Days × 0.20` P0
Allowed (20% of treatment  
 period)

FR-4.2.3 Calculate Gap Days `Gap Days Remaining = Gap Days Allowed − Gap Days Used` P0
Remaining

FR-4.2.4 Negative gap days If `Gap Days Remaining ≤ 0` → T5 tier P0
indicates unsalvageable  
 patient (T5)

---

**Gap Days Status:**

---

Status Condition Meaning

---

**SALVAGEABLE** Gap Days Remaining \> 0 Can still reach 80%
with timely refills

**LOST (T5)** Gap Days Remaining ≤ 0 Cannot reach 80% even
with perfect adherence

---

**Example Calculation:**

    Patient: John Smith
    Treatment Days: 365 | Covered Days: 270

    Gap Days Used = 365 − 270 = 95 days
    Gap Days Allowed = 365 × 0.20 = 73 days
    Gap Days Remaining = 73 − 95 = −22 days

    Result: LOST (T5) - Cannot reach 80% this year

#### FR-4.3: Days to Runout Calculation

---

ID Requirement Formula Priority

---

FR-4.3.1 Calculate days until `Days to Runout = (Last Fill Date + Days Supply) − Today` P0
medication runs out

FR-4.3.2 Display status based on See thresholds below P0
days remaining

---

**Days to Runout Thresholds:**

---

Range Status Color Meaning

---

≤ 0 **OUT NOW** 🔴 Red Urgent - already out

1-7 **URGENT** 🟠 Orange Needs immediate
action

8-14 **DUE SOON** 🟡 Yellow Plan refill

\> 14 **OK** 🟢 Green Monitoring only

---

#### FR-4.4: Refills Needed Calculation

---

ID Requirement Formula Priority

---

FR-4.4.1 Calculate refills needed `Refills Needed = ⌈(Days to Dec 31 − Current Supply) / Typical Days Supply⌉` P0
to reach year-end

---

#### FR-4.5: PDC Projections

---

ID Requirement Formula Priority

---

FR-4.5.1 Calculate PDC Status Quo `PDC Status Quo = (Covered + min(Supply, DaysToYearEnd)) ÷ Treatment × 100` P0
(if patient stops  
 refilling)

FR-4.5.2 Calculate PDC Perfect `PDC Perfect = (Covered + DaysToYearEnd) ÷ Treatment × 100` P0
(best possible with  
 perfect adherence)

FR-4.5.3 If PDC Perfect \< 80%, Auto-assign T5 tier P0
patient is unsalvageable  
 (T5)

---

#### FR-4.6: Delay Budget Calculation

---

ID Requirement Formula Priority

---

FR-4.6.1 Calculate average delay `Delay Budget = Gap Days Remaining ÷ Refills Needed` P0
allowance per remaining  
 refill

FR-4.6.2 Use delay budget to See tier table P0
determine fragility tier

---

### 7.5 Coverage Calculation (Overlapping Fills)

> **Critical Rule:** When patients fill prescriptions early, coverage
> periods overlap. Each day MUST only be counted once.

#### FR-5.1: Coverage Period Merging Algorithm

---

ID Requirement Priority

---

FR-5.1.1 Sort all fill periods by start P0
date ascending

FR-5.1.2 If next fill starts before current P0
period ends → extend end date

FR-5.1.3 If next fill starts after current P0
period ends → begin new period

FR-5.1.4 Sum all merged periods (capped at P0
December 31)

FR-5.1.5 NEVER double-count overlapping P0
days

---

**Example - Overlapping Fills:**

    Fill 1: Jan 1 - Mar 31 (90 days supply)
    Fill 2: Mar 15 - Jun 12 (90 days supply, filled 17 days early)
    Overlap: Mar 15-31 (17 days)

    ❌ WRONG (Naive Sum): 90 + 90 = 180 days (double-counts overlap)
    ✅ CORRECT (Merged): Jan 1 - Jun 12 = 163 days

**Merge Algorithm Pseudocode:**

    function mergeCoveragePeriods(fills) {
      // Sort by start date
      const sorted = fills.sort((a, b) => a.startDate - b.startDate);
      const merged = [];

      for (const fill of sorted) {
        const endDate = min(fill.startDate + fill.daysSupply, DEC_31);

        if (merged.length === 0 || fill.startDate > merged[merged.length - 1].end) {
          // No overlap - new period
          merged.push({ start: fill.startDate, end: endDate });
        } else {
          // Overlap - extend current period
          merged[merged.length - 1].end = max(merged[merged.length - 1].end, endDate);
        }
      }

      return sumDays(merged);
    }

#### FR-5.2: Year-End Capping Rule

---

ID Requirement Priority

---

FR-5.2.1 Medication supply CANNOT extend P0
beyond December 31 for PDC  
 calculation

FR-5.2.2 A 90-day fill on December 1 only P0
counts 31 days toward current  
 year's PDC

FR-5.2.3 Excess supply carries forward to P1
next year (separate tracking)

---

### 7.6 Denominator Status Tracking

> **HEDIS Requirement:** A patient must have ≥2 prescription fills to be
> included in the PDC denominator.

#### FR-6.1: Denominator Status Codes

---

Code Name Fill Count Description Action Required

---

**D0** No Fills 0 Not in Outreach for first
denominator - no fill
fills this year

**D1a** At-Risk 1 One fill, running Urgent outreach for
low on supply 2nd fill

**D1b** Monitoring 1 One fill, Monitor for 2nd fill
adequate supply  
 remaining

**D2** In 2+ Two or more Standard workflow
Denominator fills - full PDC  
 tracking

**DX** Excluded Any Excluded from No action needed
measure

---

#### FR-6.2: Denominator Status Requirements

---

ID Requirement Priority

---

FR-6.2.1 Track fill count per patient per P0
medication class

FR-6.2.2 Display denominator status badge P0
in UI (D0/D1a/D1b/D2/DX)

FR-6.2.3 Flag D1a patients (1 fill, running P0
low) for urgent outreach

FR-6.2.4 Upon 2nd fill (D1→D2), recalculate P0
PDC from first fill date

FR-6.2.5 Delays between 1st and 2nd fill P0
create gap days

---

#### FR-6.3: Exclusion Criteria (DX Status)

Patients are excluded from PDC denominator if:

---

ID Exclusion Reason Priority

---

FR-6.3.1 Enrolled in hospice P0

FR-6.3.2 End-stage renal disease (ESRD) P0

FR-6.3.3 Medication discontinued by P0
prescriber

FR-6.3.4 Less than 2 fills in measure P0
year

FR-6.3.5 Disenrolled from health plan P0

---

### 7.7 Priority Scoring Algorithm

#### FR-7.1: Priority Score Formula

    Priority Score = Base Score (from tier) + Bonus Points (situational)

#### FR-7.2: Base Scores by Fragility Tier

---

Tier Name Delay Budget Base Score Contact Window

---

**COMP** Compliant PDC Status Quo ≥ 0 pts --- (monitoring only)
80%

**F1** Critical ≤ 2 days per 100 pts 24 hours
refill

**F2** Fragile 3-5 days per 80 pts 48 hours
refill

**F3** Moderate 6-10 days per 60 pts 1 week
refill

**F4** Stable 11-20 days per 40 pts 2 weeks
refill

**F5** Safe \> 20 days per 20 pts Monthly
refill

**T5** Lost PDC Perfect \< 80% 10 pts N/A (unsalvageable)

---

#### FR-7.3: Bonus Points (Situational)

---

Condition Points Rationale

---

Out of Medication (Days to +30 pts Immediate action needed
Runout ≤ 0)

Q4 Period (Oct-Dec) +25 pts Less time to recover from
gaps

Multiple MA Measures (2+ +15 pts Higher impact patient
of MAC/MAD/MAH)

New Patient (first year on +10 pts Establish good habits
therapy) early

Previous Non-Fill (last +5 pts Needs extra attention
outreach unsuccessful)

---

#### FR-7.4: Urgency Index Levels

---

Level Score Range Action

---

**EXTREME** 150+ pts Contact within 1
hour

**HIGH** 100-149 pts Contact within 4
hours

**MEDIUM** 50-99 pts Contact within 24
hours

**LOW** \< 50 pts Standard processing

---

**Example Calculation:**

    Patient: John (F1 tier + Out of Meds + Q4)
    Base Score: 100 (F1)
    Bonus: +30 (out of meds) + 25 (Q4) = 55

    Priority Score = 100 + 55 = 155 pts → EXTREME urgency

### 7.8 Priority Matrix (Two-Dimensional Decision Framework)

> **Key Insight:** "Out of meds ≠ highest priority. A patient out of
> meds with 30 gap days is LOWER priority than one with 3 days supply
> and 2 gap days."

#### FR-8.1: Two Dimensions of Priority

---

Dimension Question Based On

---

**Urgency** How soon do we need to Current medication
act? supply (Days to
Runout)

**Fragility** How much room for Gap day budget (Delay
error? Budget)

---

#### FR-8.2: Priority Matrix

---

                     Out of Meds (≤0    ≤7 Days   \>7 Days
                     days)

---

**F1-F2** (Very 🔴 CRITICAL 🟠 HIGH ⚠️ WATCH
Fragile)

**F3-F5** (More 🟡 MEDIUM ⚠️ WATCH 🟢 LOW
Resilient)

---

#### FR-8.3: Priority Matrix Requirements

---

ID Requirement Priority

---

FR-8.3.1 System shall evaluate BOTH urgency P0
AND fragility dimensions

FR-8.3.2 Display priority as matrix cell P0
(e.g., "CRITICAL - F1/Out")

FR-8.3.3 Sort worklist by priority matrix P0
cell, not just single dimension

FR-8.3.4 WATCH priority = proactive P0
outreach before becoming urgent

---

**Example Scenarios:**

---

Patient Supply Gap Days Left Fragility Priority Rationale

---

Anna Out 3 5 days F1 **CRITICAL** No supply +
days no margin =
act NOW

Bob 3 days 2 days F1 **HIGH** Has buffer
left but F1 = act
today

Carol Out 5 25 days F4 **MEDIUM** Out but has
days runway

Dan 45 days 3 days F1 **WATCH** Has supply
left but when
due, NO
margin

---

### 7.9 CMS Measure Drug Classes

#### FR-9.1: MAC - Medication Adherence for Cholesterol

---

Drug Class Generic Names

---

**Statins** Atorvastatin, Rosuvastatin,
Simvastatin, Pravastatin, Lovastatin,
Pitavastatin, Fluvastatin

---

#### FR-9.2: MAD - Medication Adherence for Diabetes

---

Drug Class Generic Names

---

**Biguanides** Metformin

**Sulfonylureas** Glipizide, Glimepiride, Glyburide

**DPP-4 Inhibitors** Sitagliptin, Linagliptin, Saxagliptin,
Alogliptin

**SGLT2 Inhibitors** Empagliflozin, Dapagliflozin,
Canagliflozin

**Thiazolidinediones** Pioglitazone

---

#### FR-9.3: MAH - Medication Adherence for Hypertension

---

Drug Class Generic Names

---

**ACE Inhibitors** Lisinopril, Enalapril, Ramipril,
Benazepril, Captopril, Fosinopril

**ARBs** Losartan, Valsartan, Irbesartan,
Olmesartan, Telmisartan, Candesartan

---

#### FR-9.4: Measure Tracking Requirements

---

ID Requirement Priority

---

FR-9.4.1 Each measure (MAC/MAD/MAH) tracked P0
independently per patient

FR-9.4.2 Patient may be compliant for one P0
measure but not another

FR-9.4.3 Display per-measure PDC status in P0
patient detail view

FR-9.4.4 Aggregate PDC uses all-or-nothing P0
method (patient compliant only if  
 ALL applicable measures ≥80%)

---

## 8. Non-Functional Requirements

### 8.1 Performance

---

ID Requirement Target Priority

---

NFR-1.1 Page load time ≤2 seconds P0

NFR-1.2 Search response time ≤500ms P0

NFR-1.3 AI decision latency ≤2 seconds P0

NFR-1.4 Table scroll smoothness 60 fps P1

NFR-1.5 Concurrent users 100+ P0
supported

---

### 8.2 Scalability

---

ID Requirement Target Priority

---

NFR-2.1 Patients supported 500,000+ P0

NFR-2.2 Medications per 20+ P0
patient

NFR-2.3 RX claims per 100+ P0
patient/year

NFR-2.4 Worklist items per day 10,000+ P0

---

### 8.3 Reliability

---

ID Requirement Target Priority

---

NFR-3.1 System uptime 99.9% P0

NFR-3.2 Data durability 99.999999% P0

NFR-3.3 Mean time to ≤15 minutes P0
recovery

NFR-3.4 Real-time sync ≤1 second P0
latency

---

### 8.4 Security & Compliance

---

ID Requirement Target Priority

---

NFR-4.1 HIPAA compliance Full P0
compliance

NFR-4.2 Data encryption at AES-256 P0
rest

NFR-4.3 Data encryption in TLS 1.3 P0
transit

NFR-4.4 Audit trail retention 7 years P0

NFR-4.5 Session timeout 30 minutes P0

NFR-4.6 Role-based access Yes P0
control

---

### 8.5 Usability

---

ID Requirement Target Priority

---

NFR-5.1 Accessibility AA compliant P1
(WCAG)

NFR-5.2 Mobile Tablet support P2
responsiveness

NFR-5.3 Keyboard navigation Full support P1

NFR-5.4 Error messages Clear, P0
actionable

---

## 9. System Architecture

### 9.1 High-Level Architecture

    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                           IGNITE MEDREFILLS ARCHITECTURE                         │
    ├─────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                  │
    │  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
    │  │                  │    │                  │    │                  │          │
    │  │   HEADLESS EHR   │───▶│    FIREBASE      │◀───│   GOOGLE GEMINI  │          │
    │  │   (Data Source)  │    │   FIRESTORE      │    │   (AI Engine)    │          │
    │  │                  │    │                  │    │                  │          │
    │  └──────────────────┘    └────────┬─────────┘    └──────────────────┘          │
    │         │                         │                        │                    │
    │         │   ┌─────────────────────┼───────────────────────┐│                    │
    │         │   │                     │                       ││                    │
    │         │   │    ┌────────────────┴────────────────┐      ││                    │
    │         │   │    │                                 │      ││                    │
    │         ▼   │    ▼                                 ▼      ▼│                    │
    │  ┌──────────────────┐                     ┌──────────────────┐                  │
    │  │                  │                     │                  │                  │
    │  │   ALL PATIENTS   │────────────────────▶│  REFILL WORKLIST │                  │
    │  │      (CRM)       │                     │    (Workflow)    │                  │
    │  │                  │                     │                  │                  │
    │  │  • Demographics  │                     │  • AI Review     │                  │
    │  │  • Medications   │                     │  • Human Action  │                  │
    │  │  • PDC Metrics   │                     │  • Outreach      │                  │
    │  │  • Risk Tiers    │                     │  • Monitoring    │                  │
    │  │                  │                     │  • Exceptions    │                  │
    │  └──────────────────┘                     └──────────────────┘                  │
    │                                                                                  │
    └─────────────────────────────────────────────────────────────────────────────────┘

### 9.2 Technology Stack

---

Layer Technology Version Purpose

---

**Frontend** React 19.x UI framework

**Build Tool** Vite 7.x Development/bundling

**Styling** Tailwind CSS 3.x Design system

**State** React Context \- Global state
management

**Routing** React Router 7.x Navigation

**Database** Firebase \- Real-time NoSQL
Firestore

**Auth** Firebase Auth \- Anonymous + SSO

**AI/LLM** Google Gemini Flash Clinical decision
1.5 support

**Search** Fuse.js \- Fuzzy search

**Testing** Vitest \- Unit/integration tests

---

### 9.3 6-Engine Pipeline

    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                              6-ENGINE PIPELINE                                   │
    ├─────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                  │
    │  E0 INTAKE ──▶ E1 VALIDATION ──▶ E2 AI REVIEW ──▶ E4 HUMAN ──▶ E5 OUTREACH     │
    │  (Auto)       (Auto)            (Gemini AI)      (Required)   (If approved)     │
    │                                                                                  │
    │      │              │                   │              │             │          │
    │      │              │                   │              │             │          │
    │      ▼              ▼                   ▼              ▼             ▼          │
    │  ┌────────┐    ┌────────┐         ┌────────┐    ┌────────┐    ┌────────┐       │
    │  │Capture │    │Check   │         │Primary │    │Approve │    │SMS/    │       │
    │  │Source  │    │Dup,    │         │QA,     │    │Deny,   │    │Email/  │       │
    │  │PDC,    │    │Elig,   │         │Manager │    │Route   │    │Call    │       │
    │  │Trigger │    │Rx Valid│         │AI      │    │        │    │        │       │
    │  └────────┘    └────────┘         └────────┘    └────────┘    └────────┘       │
    │                     │                   │                           │          │
    │                     ▼                   ▼                           ▼          │
    │              E8 EXCEPTIONS ◀─────────────────────────────────────────          │
    │              (Barrier Queue)                                                    │
    │                     │                                                           │
    │                     ▼                                                           │
    │              E6 MONITORING ────────────────────────▶ ARCHIVE                   │
    │              (Await Fill)                            (Terminal)                 │
    │                                                                                  │
    └─────────────────────────────────────────────────────────────────────────────────┘

### 9.4 Firebase Collections

---

Collection Purpose Key Fields

---

`allPatients` Patient master data fullName, mrn,
(WHO) medications\[\],
measures, fragilityTier

`refillWorklist` Workflow status patientId,
(WHAT) medicationName,
decisionStatus,
actionStatus, aiStack

`rxClaims` Prescription fill Member_Id, Drug_Name,
history Rx_Date_Of_Service,
days_supply

`protocols` Clinical protocol name, conditions,
definitions checks\[\], active

`medAdherenceDrugs` MAC/MAD/MAH drug generic, brand, measure,
list strengths\[\]

---

## 10. Data Requirements

### 10.1 Patient Data Model

    interface Patient {
      // Identity
      id: string;                    // Document ID
      fullName: string;              // "Garcia, Maria"
      firstName: string;
      lastName: string;
      mrn: string;                   // Medical Record Number
      dob: string;                   // "1955-03-15"
      phone: string;
      email: string;
      Member_Id: string;             // Insurance member ID

      // Medications Array
      medications: Array<{
        id: string;
        medicationName: string;      // "Lisinopril 10mg"
        drugName: string;
        strength: string;
        daysSupply: number;
        refillsRemaining: number;
        lastFillDate: string;
        firstFillDate: string;       // NEW: Required for treatment period calc
        rxDate: string;
        measure: 'MAC' | 'MAD' | 'MAH' | null;
        daysToRunout: number;
        currentPdc: number;
        gapDaysRemaining: number;
        fillCount: number;           // NEW: Number of fills this year
        denominatorStatus: 'D0' | 'D1a' | 'D1b' | 'D2' | 'DX'; // NEW: HEDIS status
      }>;

      // Adherence Metrics
      currentPdc: number;
      fragilityTier: 'COMP' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'T5';
      priorityScore: number;
      daysToRunout: number;

      // NEW: Calculated Metrics (per Gold Standard)
      pdcStatusQuo: number;          // PDC if patient stops refilling today
      pdcPerfect: number;            // Best possible PDC with perfect adherence
      treatmentDays: number;         // First Fill → Dec 31
      coveredDays: number;           // Sum of merged coverage periods
      gapDaysUsed: number;           // Treatment Days - Covered Days
      gapDaysAllowed: number;        // Treatment Days × 20%
      delayBudget: number;           // Gap Days Remaining ÷ Refills Needed
      refillsNeeded: number;         // Refills to reach year-end
      isSalvageable: boolean;        // Can reach 80% this year?

      // STARS Measures
      measures: {
        MAC: {
          pdc: number;
          status: string;
          gapDaysRemaining: number;
          firstFillDate: string;     // NEW: Per-measure first fill
          fillCount: number;         // NEW: Fills for this measure
          denominatorStatus: 'D0' | 'D1a' | 'D1b' | 'D2' | 'DX'; // NEW
        };
        MAD: {
          pdc: number;
          status: string;
          gapDaysRemaining: number;
          firstFillDate: string;
          fillCount: number;
          denominatorStatus: 'D0' | 'D1a' | 'D1b' | 'D2' | 'DX';
        };
        MAH: {
          pdc: number;
          status: string;
          gapDaysRemaining: number;
          firstFillDate: string;
          fillCount: number;
          denominatorStatus: 'D0' | 'D1a' | 'D1b' | 'D2' | 'DX';
        };
      };

      // Clinical Context
      lastVisitDate: string;
      conditions: string[];
      allergies: string[];
    }

### 10.2 Worklist Item Data Model

    interface WorklistItem {
      // Identity
      id: string;
      patientId: string;
      patientName: string;
      patientMRN: string;

      // Medication
      medicationId: string;
      medicationName: string;
      measure: 'MAC' | 'MAD' | 'MAH' | null;
      daysToRunout: number;

      // Adherence
      pdc: number;
      gapDaysRemaining: number;
      fragilityTier: string;

      // Two-Dimensional Status
      decisionStatus: 'pending-review' | 'reviewed' | 'pre-approved' | 'pre-denied';
      actionStatus: 'rx-sent' | 'filled-confirmed' | 'exception-clinical' | null;

      // AI Stack
      aiStack: {
        primary: { decision: string; confidence: number; rationale: string; };
        qa: { decision: string; confidence: number; rationale: string; };
        manager: { decision: string; rationale: string; } | null;
      };

      // Protocol Checks
      protocolChecks: Array<{
        id: string;
        category: 'SAFETY' | 'CLINICAL' | 'IMPORTANT' | 'ADMIN';
        name: string;
        pass: boolean;
        value: string;
      }>;

      // Pathway
      pathwayType: 'REFILL' | 'RENEWAL' | 'NO_RX';

      // Clinical Memory
      history: Array<{
        time: Timestamp;
        engine: string;
        action: string;
        detail: string;
        type: 'system' | 'ai' | 'human' | 'escalation';
      }>;

      // Metadata
      priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
      source: 'PROACTIVE' | 'MEMBER' | 'PHARMACY' | 'CAREGIVER';
      createdAt: Timestamp;
      updatedAt: Timestamp;
    }

### 10.3 Data Quality Requirements

---

Field Validation Rule Required

---

`fullName` Non-empty string Yes

`mrn` Alphanumeric, 6-12 Yes
chars

`dob` Valid date, past Yes

`Member_Id` Format: XX-XXXXXXXX Yes

`medications` At least 1 for Yes
worklist entry

`pdc` 0-100, numeric Yes

`daysToRunout` Integer Yes

---

## 11. AI/ML Requirements

### 11.1 3-Tier AI Decision Stack

---

Tier Role Model Latency
Target

---

**Primary Initial Gemini 1.5 ≤1.5s
AI** evaluation Flash

**QA AI** Error Gemini 1.5 ≤0.5s
detection Flash

**Manager Arbitration Gemini 1.5 ≤0.5s
AI** Flash

---

### 11.2 AI Input Requirements

    {
      "patient": {
        "id": "DEMO_001",
        "name": "Garcia, Maria",
        "age": 71,
        "conditions": ["Hypertension", "Type 2 Diabetes"],
        "allergies": ["Penicillin"]
      },
      "medication": {
        "name": "Lisinopril 10mg",
        "class": "ACE Inhibitor",
        "measure": "MAH",
        "refillsRemaining": 2,
        "rxExpirationDate": "2026-06-15",
        "lastFillDate": "2025-12-05"
      },
      "adherence": {
        "currentPdc": 78,
        "gapDaysUsed": 45,
        "gapDaysRemaining": 15,
        "daysToRunout": 5
      },
      "clinical": {
        "lastVisitDate": "2025-10-15",
        "recentLabs": {
          "eGFR": 72,
          "A1C": 7.2,
          "BP": "128/82"
        }
      }
    }

### 11.3 AI Output Requirements

    {
      "decision": "APPROVE",
      "confidence": 94,
      "rationale": "Patient has adequate refills remaining, Rx is valid, labs are current, and no safety concerns identified.",
      "protocolChecks": [
        { "id": "S1", "name": "Drug Interactions", "pass": true, "value": "None" },
        { "id": "S2", "name": "Allergy Check", "pass": true, "value": "No match" }
      ],
      "riskFactors": [],
      "recommendedAction": "Send Rx to pharmacy"
    }

### 11.4 16 Protocol Checks

---

ID Category Check Name Fail Destination

---

S1 SAFETY Drug-Drug Clinical Queue
Interactions

S2 SAFETY Allergy Check Clinical Queue

S3 SAFETY Duplicate Therapy Clinical Queue

S4 SAFETY Contraindications Clinical Queue

C1 CLINICAL Lab Values Current Clinical Queue

C2 CLINICAL Vitals Current Scheduling Queue

C3 CLINICAL Diagnosis Match Clinical Queue

C4 CLINICAL Therapy Duration Flag Only

I1 IMPORTANT Refill Too Early Suppress

I2 IMPORTANT Quantity Limit PA Queue

I3 IMPORTANT Prior Auth Required PA Queue

I4 IMPORTANT Formulary Status PA Queue

A1 ADMIN Prescriber Active Others Queue

A2 ADMIN Pharmacy In-Network Others Queue

A3 ADMIN Member Enrollment Others Queue

A4 ADMIN Rx Not Expired Flag RENEWAL

---

## 12. UI/UX Requirements

### 12.1 Design System Tokens

---

Token Value Usage

---

**Primary Blue-600 (#2563EB) Buttons, links, focus
Color** rings

**Success** Green-500 (#22C55E) Passing, approved,
filled

**Warning** Amber-500 (#F59E0B) At-risk, pending,
caution

**Danger** Red-500 (#EF4444) Failing, urgent,
denied

**Border 4px (buttons), 8px Consistent rounding
Radius** (cards)

**Font** Inter, system-ui Primary typeface

---

### 12.2 Badge System

All badges follow the pattern: `bg-{color}-100 text-{color}-700` with NO
borders.

---

Badge Type Color Pair Example Use

---

Passing green-100/green-700 PDC ≥80%

At-Risk amber-100/amber-700 PDC 60-79%

Failing red-100/red-700 PDC \<60%

MAC purple-100/purple-700 Cholesterol measure

MAD blue-100/blue-700 Diabetes measure

MAH indigo-100/indigo-700 Hypertension
measure

---

### 12.3 Tier Color Intent Lines

---

Tier Color CSS

---

F1 Critical Red `border-left: 3px solid #dc2626`

F2 Fragile Orange `border-left: 3px solid #f97316`

F3 Moderate Yellow `border-left: 3px solid #eab308`

F4 Blue `border-left: 3px solid #3b82f6`
Comfortable

F5 Safe Green `border-left: 3px solid #22c55e`

T5 Lost Gray `border-left: 3px solid #6b7280`

---

### 12.4 Keyboard Shortcuts

---

Key Action Context

---

`A` Approve refill Review drawer
open

`D` Deny refill Review drawer
open

`Esc` Close drawer Drawer open

`↑/↓` Navigate rows Table focused

`Enter` Open selected Table focused
row

---

## 13. Integration Requirements

### 13.1 Headless EHR Integration

---

Data Type Direction Sync Frequency Method

---

Patient EHR → Firebase Real-time Webhook
Demographics

Medications EHR → Firebase Real-time Webhook

RX Claims PBM → Firebase Daily batch Cloud
Function

Lab Results EHR → Firebase On-demand API call

Rx Transmission Firebase → On action API call
Surescripts

---

### 13.2 API Contract (Expected)

    interface HeadlessEHRService {
      // Patient data
      getPatient(patientId: string): Promise<Patient>;
      searchPatients(query: string): Promise<Patient[]>;

      // Medications
      getMedications(patientId: string): Promise<Medication[]>;

      // RX Claims
      getRxClaims(memberId: string, dateRange: DateRange): Promise<RxClaim[]>;

      // Labs
      getLabResults(patientId: string): Promise<LabResult[]>;

      // Outbound
      transmitPrescription(rxData: RxTransmission): Promise<Result>;
    }

### 13.3 Outreach Integration (Future)

---

Channel Provider Status

---

SMS Twilio Planned

Email SendGrid Planned

IVR Twilio Planned

Patient Custom Planned
Portal

---

## 14. Release Plan & Roadmap

### 14.1 Release Phases

    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                              RELEASE ROADMAP                                     │
    ├─────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                  │
    │  Q1 2026                 Q2 2026                Q3 2026                Q4 2026  │
    │     │                       │                      │                      │     │
    │     ▼                       ▼                      ▼                      ▼     │
    │  ┌────────────┐         ┌────────────┐        ┌────────────┐       ┌────────────┐│
    │  │   MVP      │         │  SCALE     │        │ AUTOMATE   │       │  OPTIMIZE  ││
    │  │   v1.0     │   ───▶  │  v1.5      │  ───▶  │  v2.0      │ ───▶  │   v2.5     ││
    │  │            │         │            │        │            │       │            ││
    │  │ • CRM      │         │ • EHR      │        │ • Outreach │       │ • Analytics││
    │  │ • Worklist │         │   Sync     │        │   Automation│      │ • ML       ││
    │  │ • AI 3-tier│         │ • 10K      │        │ • Claims   │       │   Improve  ││
    │  │ • 4 tabs   │         │   patients │        │   Detection│       │ • Portal   ││
    │  └────────────┘         └────────────┘        └────────────┘       └────────────┘│
    │                                                                                  │
    └─────────────────────────────────────────────────────────────────────────────────┘

### 14.2 MVP (v1.0) Scope - Q1 2026

---

Feature Status Target
Date

---

All Patients CRM In Jan 15
Progress

Refill Worklist (4 In Jan 30
tabs) Progress

AI 3-Tier Decision In Feb 15
Stack Progress

Review Drawer (3 Complete \-
tabs)

Exception Sub-Queues Not Feb 28
Started

Clinical Memory In Mar 15
Progress

Demo Data (50 Complete \-
patients)

---

### 14.3 Scale (v1.5) Scope - Q2 2026

---

Feature Priority

---

Headless EHR P0
Integration

Real-time Patient Sync P0

RX Claims Batch Sync P0

10,000 Patient Support P0

Performance P0
Optimization

SLA Tracking P1

---

### 14.4 Automate (v2.0) Scope - Q3 2026

---

Feature Priority

---

SMS Outreach (Twilio) P0

Email Outreach P0
(SendGrid)

Automated Fill P0
Detection

Overdue Escalation P0

IVR Integration P1

---

### 14.5 Optimize (v2.5) Scope - Q4 2026

---

Feature Priority

---

Advanced Analytics P0
Dashboard

ML Model Improvements P1

Patient Portal P1

Mobile App (Tablet) P2

A/B Testing for Prompts P2

---

## 15. Risks & Mitigation

### 15.1 Risk Matrix

---

Risk Probability Impact Mitigation

---

**R1**: EHR High High Early API spec, mock
integration data fallback
delays

**R2**: AI Medium High QA AI + Manager AI
accuracy safety net, human
below target review

**R3**: User Medium Medium Training, quick wins,
adoption feedback loops
resistance

**R4**: Data Medium High Validation rules,
quality data cleanup scripts
issues

**R5**: Low High Load testing,
Performance Firebase optimization
at scale

**R6**: HIPAA Low Critical Security audit,
compliance encryption, access
gaps control

---

### 15.2 Dependencies

---

Dependency Owner Status Risk if Delayed

---

Headless EHR API Partner In Progress High - blocks real
data

Gemini API access Google Available Low

Twilio/SendGrid Internal Not Started Medium - blocks
outreach

Firebase capacity Google Available Low

---

### 15.3 Assumptions

1.  EHR partner will provide REST/FHIR API with patient data access
2.  Gemini API pricing remains within budget (\$0.001/1K tokens)
3.  Pharmacy claims data available with 24-hour lag
4.  Users have stable internet connectivity
5.  Browser support: Chrome, Edge, Safari (last 2 versions)

## 16. Appendices

### 16.1 Glossary

---

Term Definition

---

**PDC** Proportion of Days Covered - calculated as
`(Covered Days / Treatment Days) × 100`

**Treatment Period** The measurement period from First Fill Date →
December 31 of the current year

**Treatment Days** Number of days in treatment period (Dec 31 -
First Fill + 1)

**Covered Days** Days patient has medication on hand (sum of
merged coverage periods)

**Gap Days** Days patient is without medication coverage

**Gap Days Used** `Treatment Days − Covered Days`

**Gap Days Allowed** Maximum gap days to maintain 80% PDC =
`Treatment Days × 0.20`

**Gap Days Remaining** `Gap Days Allowed − Gap Days Used` (negative =
unsalvageable)

**Delay Budget** Average days patient can delay each remaining
refill = `Gap Days Remaining ÷ Refills Needed`

**PDC Status Quo** Projected PDC if patient stops refilling today

**PDC Perfect** Best possible PDC with perfect adherence from
today

**Salvageable** Patient can still reach 80% PDC (Gap Days
Remaining \> 0)

**MAC** Medication Adherence for Cholesterol (Statins)

**MAD** Medication Adherence for Diabetes (Oral
antidiabetics)

**MAH** Medication Adherence for Hypertension (ACE
inhibitors, ARBs)

**STARS** CMS quality rating system (1-5 stars)

**HEDIS** Healthcare Effectiveness Data and Information
Set - quality measures

**Fragility Tier** Risk stratification based on delay budget
(COMP, F1-F5, T5)

**F1 (Critical)** ≤2 days delay budget per refill - contact
within 24 hours

**F2 (Fragile)** 3-5 days delay budget per refill - contact
within 48 hours

**F3 (Moderate)** 6-10 days delay budget per refill - contact
within 1 week

**F4 (Stable)** 11-20 days delay budget per refill - contact
within 2 weeks

**F5 (Safe)** \>20 days delay budget per refill - monthly
monitoring

**T5 (Lost)** PDC Perfect \< 80% - cannot reach compliance
this year

**COMP (Compliant)** PDC Status Quo ≥ 80% - already meeting goal

**Denominator Status** HEDIS tracking status (D0/D1a/D1b/D2/DX)

**D0** No fills this year - not in PDC denominator

**D1a** One fill, running low - urgent outreach for 2nd
fill

**D1b** One fill, adequate supply - monitor for 2nd
fill

**D2** Two or more fills - in PDC denominator, full
tracking

**DX** Excluded from measure (hospice, ESRD, etc.)

**Days to Runout** Days until medication runs out =
`(Last Fill Date + Days Supply) − Today`

**Priority Score** Numerical ranking = Base Score (tier) + Bonus
Points (situational)

**Priority Matrix** Two-dimensional priority: Urgency (supply) ×
Fragility (gap budget)

**Year-End Capping** Rule that medication supply cannot extend past
Dec 31 for PDC calculation

**Coverage Merging** Algorithm to prevent double-counting
overlapping fill periods

**Headless EHR** API-first electronic health record system

---

### 16.2 Related Documents

---

Document Location Purpose

---

**Metrics Reference `docs/Medication_Adherence_Metrics_Reference_Guide.md` **Gold Standard for
Guide** calculations**

Product Specification `docs/PRODUCT_SPECIFICATION_ALL_PATIENTS_REFILL_WORKLIST.md` Technical spec

Golden Knowledge Base `docs/GOLDEN_KNOWLEDGE_BASE_REFILL_WORKLIST.md` System patterns

Blueprint `docs/REFILL_RENEWAL_BLUEPRINT.md` Pathway logic

UI Design System `docs/UI/UI_DESIGN_SYSTEM.md` Design tokens

CLAUDE.md `CLAUDE.md` Development guide

---

### 16.3 Approval History

---

Version Date Approver Notes

---

1.0 Jan 3, Product Head Initial
2026 PRD

---

## Screenshots:

ALL PATIENTS\
![](media/image1.png){width="6.5in" height="3.323611111111111in"}

PATIENT DETAILS

![](media/image2.png){width="6.5in" height="3.3472222222222223in"}

![](media/image3.png){width="6.5in" height="2.7131944444444445in"}

![A screenshot of a computer AI-generated content may be
incorrect.](media/image4.png){width="6.5in"
height="3.3916666666666666in"}

![A screenshot of a computer AI-generated content may be
incorrect.](media/image5.png){width="6.5in" height="2.91875in"}

![A screenshot of a computer AI-generated content may be
incorrect.](media/image6.png){width="6.5in"
height="3.317361111111111in"}

![A screenshot of a computer AI-generated content may be
incorrect.](media/image7.png){width="6.5in"
height="3.2111111111111112in"}

![](media/image8.png){width="6.5in" height="3.3680555555555554in"}

![A screenshot of a computer AI-generated content may be
incorrect.](media/image9.png){width="6.5in"
height="3.3222222222222224in"}

![](media/image10.png){width="6.5in" height="3.26875in"}

![A screenshot of a computer AI-generated content may be
incorrect.](media/image11.png){width="6.5in"
height="3.3430555555555554in"}

REFILL WORKLIST

![](media/image12.png){width="6.5in" height="3.3118055555555554in"}

![](media/image13.png){width="6.5in" height="3.3645833333333335in"}

![](media/image14.png){width="6.5in" height="3.328472222222222in"}

##

![](media/image15.png){width="6.5in" height="3.347916666666667in"}

![A screenshot of a medical application AI-generated content may be
incorrect.](media/image16.png){width="6.5in"
height="8.933333333333334in"}

![](media/image17.png){width="6.16875in" height="9.0in"}

![A screenshot of a computer AI-generated content may be
incorrect.](media/image18.png){width="6.5in"
height="2.5833333333333335in"}

![A screenshot of a computer AI-generated content may be
incorrect.](media/image19.png){width="6.5in"
height="3.348611111111111in"}

![](media/image20.png){width="6.5in" height="3.3875in"}

![](media/image21.png){width="6.5in" height="8.525694444444444in"}

![A screenshot of a computer AI-generated content may be
incorrect.](media/image22.png){width="6.5in"
height="3.3333333333333335in"}

![A screenshot of a computer AI-generated content may be
incorrect.](media/image23.png){width="6.5in"
height="2.9618055555555554in"}

## Document Control

---

Field Value

---

**Document Owner** Product Head

**Review Cycle** Quarterly

**Next Review** April 2026

**Distribution** Engineering, Product, Clinical,
Leadership

---

_This PRD is the authoritative source for product requirements. All
development and design decisions should reference this document._

_Last Updated: January 3, 2026_
