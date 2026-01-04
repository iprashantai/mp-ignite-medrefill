::: {#title-block-header}

# 3-Tier AI Decision Logic {#tier-ai-decision-logic .title}

:::

# 3-Tier AI Decision Logic {#tier-ai-decision-logic}

## Simple Explanation

The AI system uses **3 tiers** to make decisions, similar to how a
company might review important decisions:

    Patient Data → PRIMARY AI → QA AI → (MANAGER AI if needed) → Human Review

---

## Tier 1: PRIMARY AI

**Role:** The "Worker" - Does the initial evaluation

**What it does:** 1. Receives patient data (medications, labs, visits,
etc.) 2. Checks against protocol requirements 3. Makes a recommendation:
**APPROVE** or **DENY** 4. Provides rationale explaining why 5. Suggests
next steps

**Processing Time:** \~1.2 seconds

**Example Output:**

    Decision: DENY
    Confidence: 90%
    Rationale: "Patient's last visit was 14 months ago, exceeding
               the 12-month protocol requirement."
    Next Steps:
      - Schedule appointment
      - Order updated labs

---

## Tier 2: QA AI

**Role:** The "Quality Checker" - Reviews Primary AI's work

**What it does:** 1. Receives Primary AI's decision + rationale 2.
Checks for errors in logic 3. Verifies date calculations (known issue:
Primary AI sometimes miscalculates dates) 4. Decides: **AGREE** or
**DISAGREE**

**Processing Time:** \~0.8 seconds

**Two Outcomes:**

### If QA AGREES (95% of cases):

    QA Decision: AGREE
    Rationale: "Primary AI correctly identified protocol violation.
               Date calculation verified."
    → Skip to Human Review (Confidence: 95%)

### If QA DISAGREES:

    QA Decision: DISAGREE
    Rationale: "Primary AI made a date calculation error.
               Last visit was actually 10 months ago, not 14."
    → Trigger Manager AI

---

## Tier 3: MANAGER AI

**Role:** The "Arbitrator" - Only called when Primary and QA disagree

**When it runs:** ONLY when QA disagrees with Primary AI

**What it does:** 1. Receives both Primary AI and QA AI decisions 2.
Reviews the disagreement 3. Makes final AI recommendation 4. Provides
reasoning for choosing one side

**Processing Time:** \~1.0 seconds

**Example Output:**

    Decision: DENY (agreeing with QA)
    Confidence: 85%
    Rationale: "QA correctly identified that Primary AI's A1C threshold
               assessment was too lenient. A1C of 9.8% requires clinical review."
    Next Steps:
      - Route to Clinical
      - Consider dose adjustment

---

## Confidence Levels

Confidence Scenario

---

**95%** Primary AI + QA AI agree
**90%** Clear protocol violation, both agree on denial
**85%** Manager AI resolved disagreement
**75%** Disagreement exists, no Manager AI available
**70%** Error cases or unusual scenarios

---

## Complete Flow Diagram

    ┌─────────────────────────────────────────────────────────────┐
    │                    PATIENT DATA                              │
    │  (Medications, Labs, Visits, Diagnoses, Allergies)          │
    └─────────────────────────┬───────────────────────────────────┘
                              ↓
    ┌─────────────────────────────────────────────────────────────┐
    │                 TIER 1: PRIMARY AI                           │
    │                                                              │
    │  Input:  Patient data + Protocol requirements                │
    │  Output: APPROVE/DENY + Rationale + Next Steps               │
    │  Time:   ~1.2 seconds                                        │
    └─────────────────────────┬───────────────────────────────────┘
                              ↓
    ┌─────────────────────────────────────────────────────────────┐
    │                   TIER 2: QA AI                              │
    │                                                              │
    │  Input:  Patient data + Primary AI decision                  │
    │  Output: AGREE/DISAGREE + Rationale                          │
    │  Time:   ~0.8 seconds                                        │
    └─────────────────────────┬───────────────────────────────────┘
                              ↓
                        ┌─────┴─────┐
                        │ QA Agrees? │
                        └─────┬─────┘
                  ┌───────────┴───────────┐
                  ↓                       ↓
             [YES - 95%]            [NO - Disagree]
                  ↓                       ↓
        ┌─────────────────┐    ┌─────────────────────────────────┐
        │ Skip to Human   │    │      TIER 3: MANAGER AI          │
        │ Confidence: 95% │    │                                   │
        └────────┬────────┘    │  Input:  Primary + QA decisions   │
                 │             │  Output: Final AI recommendation  │
                 │             │  Time:   ~1.0 seconds             │
                 │             └──────────────┬────────────────────┘
                 │                            │
                 └──────────────┬─────────────┘
                                ↓
    ┌─────────────────────────────────────────────────────────────┐
    │                    HUMAN REVIEW                              │
    │                                                              │
    │  • Reviews AI recommendation                                 │
    │  • Can CONFIRM or OVERRIDE                                   │
    │  • Has FINAL AUTHORITY                                       │
    └─────────────────────────────────────────────────────────────┘

---

## Key Points

1.  **Human is FINAL** - AI makes recommendations, humans make decisions
2.  **QA catches errors** - Especially date calculation mistakes
3.  **Manager is rare** - Only \~5% of cases need Manager AI
4.  **Transparency** - Every decision includes rationale
5.  **Speed** - Total AI time: 2-3 seconds

---

## Code Implementation

The logic is implemented in these files:

File Purpose

---

`src/workflows/batchWorkflow.js` Orchestrates the 3-tier workflow
`src/services/llmService.js` Calls Gemini API
`src/services/llmSchemas.js` Defines response schemas
`src/prompts.js` Contains AI prompts

### Simplified Code Logic:

```{.sourceCode .javascript}
// Step 1: Primary AI
const primaryResult = await callGeminiAPI(patientData, primaryAISchema);

// Step 2: QA AI
const qaResult = await callGeminiAPI({
  patientData,
  primaryDecision: primaryResult
}, qaAISchema);

// Step 3: Manager AI (only if QA disagrees)
let finalAIDecision;
if (qaResult.decision === 'Disagree') {
  const managerResult = await callGeminiAPI({
    patientData,
    primaryDecision: primaryResult,
    qaDecision: qaResult
  }, managerAISchema);
  finalAIDecision = managerResult;
} else {
  finalAIDecision = primaryResult;
}

// Step 4: Human Review (always required)
// → Route to appropriate queue (Staff/Clinical/Prescriber)
```

---

## Why 3 Tiers?

Problem Solution

---

AI can make mistakes QA AI checks Primary AI's work
Disagreements happen Manager AI arbitrates
Need accountability Each tier explains reasoning
Speed matters Only call Manager when needed
Human oversight Human always has final say

---

_Ignite Health \| Refill Workflow V9.0 \| December 2024_
