# Badge Inventory

**Last Updated:** December 8, 2025
**Purpose:** Complete inventory of all badges used across the Ignite MedRefills application

---

## Design Pattern

**Canonical Pattern:** All badges use the `-100/-700` color pattern (NO border).

- Background: `bg-{color}-100`
- Text: `text-{color}-700` (or `-800` for measure badges)
- Shape: `rounded` (not `rounded-full`)
- No borders

See `src/components/ui/Badge/Badge.jsx` and `src/pages/UIReview.jsx` for the canonical implementation.

---

## Quick Stats

| Metric                      | Count                        |
| --------------------------- | ---------------------------- |
| Total Unique Badge Variants | 30+                          |
| Badge Component Variants    | See Badge.jsx BADGE_VARIANTS |
| Files with Badges           | 25+                          |

---

## 1. PDC / Adherence Status Badges

| Badge                | Classes                         | Variant Key | Component               |
| -------------------- | ------------------------------- | ----------- | ----------------------- |
| **Passing** (≥80%)   | `bg-green-100 text-green-700`   | `pass`      | `<PDCBadge pdc={85} />` |
| **At-Risk** (60-79%) | `bg-yellow-100 text-yellow-700` | `caution`   | `<PDCBadge pdc={70} />` |
| **Failing** (<60%)   | `bg-red-100 text-red-700`       | `fail`      | `<PDCBadge pdc={50} />` |

### Visual Reference

```
🟢 Passing:  bg-green-100  text-green-700
🟡 At-Risk:  bg-yellow-100 text-yellow-700
🔴 Failing:  bg-red-100    text-red-700
```

---

## 2. Measure Type Badges (MAC/MAD/MAH)

| Badge                  | Classes                         | Variant Key | Component                        |
| ---------------------- | ------------------------------- | ----------- | -------------------------------- |
| **MAC** (Cholesterol)  | `bg-blue-100 text-blue-800`     | `mac`       | `<MeasureBadge measure="MAC" />` |
| **MAD** (Diabetes)     | `bg-purple-100 text-purple-800` | `mad`       | `<MeasureBadge measure="MAD" />` |
| **MAH** (Hypertension) | `bg-pink-100 text-pink-800`     | `mah`       | `<MeasureBadge measure="MAH" />` |

### Visual Reference

```
🔵 MAC: bg-blue-100   text-blue-800
🟣 MAD: bg-purple-100 text-purple-800
🩷 MAH: bg-pink-100   text-pink-800
```

---

## 3. AI Decision / Approval Badges

| Badge        | Classes                         | Variant Key | Component                              |
| ------------ | ------------------------------- | ----------- | -------------------------------------- |
| **Approved** | `bg-green-100 text-green-700`   | `approve`   | `<DecisionBadge decision="Approve" />` |
| **Denied**   | `bg-red-100 text-red-700`       | `deny`      | `<DecisionBadge decision="Deny" />`    |
| **Pending**  | `bg-yellow-100 text-yellow-700` | `pending`   | `<DecisionBadge decision="Pending" />` |

---

## 4. Decision Agent Badges

| Badge             | Classes                         | Variant Key |
| ----------------- | ------------------------------- | ----------- |
| **Primary Agent** | `bg-blue-100 text-blue-800`     | `info`      |
| **Manager Agent** | `bg-purple-100 text-purple-800` | Custom      |

---

## 5. Protocol Status Badges

| Badge           | Classes                         | Variant Key           |
| --------------- | ------------------------------- | --------------------- |
| **Pass**        | `bg-green-100 text-green-700`   | `pass` / `success`    |
| **Fail**        | `bg-red-100 text-red-700`       | `fail` / `error`      |
| **No Protocol** | `bg-yellow-100 text-yellow-700` | `caution` / `warning` |

---

## 6. QA Status Badges

| Badge                  | Classes                         | Variant Key |
| ---------------------- | ------------------------------- | ----------- |
| **QA Agree**           | `bg-green-100 text-green-700`   | `success`   |
| **QA Disagree**        | `bg-red-100 text-red-700`       | `error`     |
| **QA Not Run**         | `bg-gray-100 text-gray-600`     | `neutral`   |
| **Master QA Running**  | `bg-purple-100 text-purple-700` | Custom      |
| **Master QA Agree**    | `bg-green-100 text-green-700`   | `success`   |
| **Master QA Disagree** | `bg-red-100 text-red-700`       | `error`     |

---

## 7. Fragility / Risk Tier Badges

| Badge             | Classes                         | Variant Key | Component                                    |
| ----------------- | ------------------------------- | ----------- | -------------------------------------------- |
| **F1 Critical**   | `bg-red-100 text-red-700`       | `critical`  | `<FragilityBadge tier="F1_IMMINENT" />`      |
| **F2 Fragile**    | `bg-orange-100 text-orange-700` | `fragile`   | `<FragilityBadge tier="F2_FRAGILE" />`       |
| **F3 Moderate**   | `bg-yellow-100 text-yellow-700` | `moderate`  | `<FragilityBadge tier="F3_MODERATE" />`      |
| **F4 Stable**     | `bg-blue-100 text-blue-700`     | `stable`    | `<FragilityBadge tier="F4_COMFORTABLE" />`   |
| **F5 Safe**       | `bg-green-100 text-green-700`   | `safe`      | `<FragilityBadge tier="F5_SAFE" />`          |
| **Unsalvageable** | `bg-gray-100 text-gray-600`     | `lost`      | `<FragilityBadge tier="T5_UNSALVAGEABLE" />` |

### Visual Reference

```
🔴 F1 Critical:    bg-red-100    text-red-700
🟠 F2 Fragile:     bg-orange-100 text-orange-700
🟡 F3 Moderate:    bg-yellow-100 text-yellow-700
🔵 F4 Stable:      bg-blue-100   text-blue-700
🟢 F5 Safe:        bg-green-100  text-green-700
⚫ Unsalvageable:  bg-gray-100   text-gray-600
```

---

## 8. Medication Runout Status Badges

| Badge                    | Classes                         | Variant Key       | Component                           |
| ------------------------ | ------------------------------- | ----------------- | ----------------------------------- |
| **Critical** (≤0 days)   | `bg-red-100 text-red-700`       | `runout-critical` | `<RunoutBadge daysToRunout={0} />`  |
| **Urgent** (1-7 days)    | `bg-orange-100 text-orange-700` | `runout-urgent`   | `<RunoutBadge daysToRunout={5} />`  |
| **Due Soon** (8-14 days) | `bg-yellow-100 text-yellow-700` | `due-soon`        | `<RunoutBadge daysToRunout={10} />` |
| **OK** (>14 days)        | `bg-green-100 text-green-700`   | `ok`              | `<RunoutBadge daysToRunout={30} />` |

---

## 9. Campaign Status Badges

| Badge         | Classes                                           | Location           | Compliant |
| ------------- | ------------------------------------------------- | ------------------ | --------- |
| **Active**    | `bg-green-100 text-green-700 border-green-300`    | CampaignDetailPage | ❌        |
| **Paused**    | `bg-yellow-100 text-yellow-700 border-yellow-300` | CampaignDetailPage | ❌        |
| **Completed** | `bg-blue-100 text-blue-700 border-blue-300`       | CampaignDetailPage | ❌        |
| **Archived**  | `bg-gray-100 text-gray-700 border-gray-300`       | CampaignDetailPage | ❌        |

---

## 10. Campaign Type Badges

| Badge                  | Classes                                           | Location           | Compliant |
| ---------------------- | ------------------------------------------------- | ------------------ | --------- |
| **Outreach Call**      | `bg-blue-100 text-blue-700 border-blue-300`       | CampaignDetailPage | ❌        |
| **Refill Reminder**    | `bg-purple-100 text-purple-700 border-purple-300` | CampaignDetailPage | ❌        |
| **Patient Education**  | `bg-green-100 text-green-700 border-green-300`    | CampaignDetailPage | ❌        |
| **Wellness Check-In**  | `bg-orange-100 text-orange-700 border-orange-300` | CampaignDetailPage | ❌        |
| **Adherence Outreach** | `bg-indigo-100 text-indigo-700 border-indigo-300` | CampaignDetailPage | ❌        |

---

## 11. Patient Outreach Status Badges

| Badge                     | Classes                                           | Location           | Compliant |
| ------------------------- | ------------------------------------------------- | ------------------ | --------- |
| **Not Contacted**         | `bg-gray-100 text-gray-700 border-gray-300`       | CampaignDetailPage | ❌        |
| **Outreach Attempted**    | `bg-blue-100 text-blue-700 border-blue-300`       | CampaignDetailPage | ❌        |
| **Patient Responded**     | `bg-purple-100 text-purple-700 border-purple-300` | CampaignDetailPage | ❌        |
| **Appointment Scheduled** | `bg-indigo-100 text-indigo-700 border-indigo-300` | CampaignDetailPage | ❌        |
| **Intervention Complete** | `bg-green-100 text-green-700 border-green-300`    | CampaignDetailPage | ❌        |
| **Lost to Follow-up**     | `bg-red-100 text-red-700 border-red-300`          | CampaignDetailPage | ❌        |
| **Opted Out**             | `bg-orange-100 text-orange-700 border-orange-300` | CampaignDetailPage | ❌        |

---

## 12. Batch / Processing Status Badges

| Badge          | Classes                           | Location          | Compliant |
| -------------- | --------------------------------- | ----------------- | --------- |
| **Processing** | `bg-blue-100 text-blue-700`       | StatusPill        | ❌        |
| **Ready**      | `bg-yellow-100 text-yellow-800`   | BatchDetailPageV2 | ❌        |
| **Completed**  | `bg-green-100 text-green-800`     | BatchDetailPageV2 | ❌        |
| **Superseded** | `bg-neutral-200 text-neutral-600` | StatusPill        | ❌        |

---

## 13. Filter Pill Badges

| Badge             | Classes                     | Location                                               | Compliant |
| ----------------- | --------------------------- | ------------------------------------------------------ | --------- |
| **Active Filter** | `bg-blue-100 text-blue-700` | BatchDetailPageV2, PatientLookupSimple, RefillWorklist | ❌        |

---

## Color Semantics Guide

| Color            | Meaning                     | Use Cases                             |
| ---------------- | --------------------------- | ------------------------------------- |
| **Green**        | Positive, Success, Passing  | Approved, Passing PDC, Safe, Complete |
| **Red**          | Negative, Failure, Critical | Denied, Failing PDC, Critical, Lost   |
| **Yellow/Amber** | Warning, Caution, At-Risk   | At-Risk PDC, Soon, Moderate, Paused   |
| **Orange**       | Urgent, High Priority       | Urgent runout, Fragile, Wellness      |
| **Blue**         | Informational, Neutral      | MAC measure, Processing, Outreach     |
| **Purple**       | Special, Manager, Elevated  | MAD measure, Manager decisions        |
| **Pink**         | Hypertension Measure        | MAH measure only                      |
| **Indigo**       | Special Categories          | Adherence, Scheduled                  |
| **Gray**         | Inactive, Unknown, Neutral  | Unknown, Archived, Not contacted      |

---

## Canonical Badge Pattern

**All badges MUST use this pattern (NO borders):**

```jsx
// Using the Badge component (RECOMMENDED)
import { Badge, PDCBadge, MeasureBadge, FragilityBadge, RunoutBadge, DecisionBadge } from '../components/ui/Badge/Badge';

// Generic badge
<Badge variant="pass">Pass</Badge>
<Badge variant="fail">Fail</Badge>

// Convenience components
<PDCBadge pdc={85} />
<MeasureBadge measure="MAC" />
<FragilityBadge tier="F1_IMMINENT" />
<RunoutBadge daysToRunout={5} />
<DecisionBadge decision="Approve" />
```

**Base CSS Pattern:**

```jsx
<span className="bg-{color}-100 text-{color}-700 inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold">
  {label}
</span>
```

---

## Files with Most Badges

| File                      | Badge Count | Categories                        |
| ------------------------- | ----------- | --------------------------------- |
| `StatusPill.jsx`          | 15+         | AI decisions, QA status, Protocol |
| `RefillWorklist.jsx`      | 10+         | Fragility tiers, PDC, Decisions   |
| `BatchDetailPageV2.jsx`   | 10+         | PDC, Protocol, Agent, Status      |
| `CampaignDetailPage.jsx`  | 12+         | Campaign status/type, Outreach    |
| `MedicationsTab.jsx`      | 8+          | PDC, Measure, Runout, AI          |
| `MedAdherencePage.jsx`    | 6+          | PDC, Measure                      |
| `PatientLookupSimple.jsx` | 5+          | Runout status                     |

---

## Badge Component Usage

The canonical Badge component is at `src/components/ui/Badge/Badge.jsx`.

**Import statement:**

```jsx
import {
  Badge,
  PDCBadge,
  FragilityBadge,
  MeasureBadge,
  RunoutBadge,
  DecisionBadge,
  BADGE_VARIANTS,
  BADGE_SIZES,
} from '../components/ui/Badge/Badge';
```

**All variants are defined in `BADGE_VARIANTS` and rendered in `UIReview.jsx` for reference.**

---

## Changelog

| Date        | Change                                                        |
| ----------- | ------------------------------------------------------------- |
| Dec 8, 2025 | Updated all patterns to `-100/-700` (no border) per Badge.jsx |
| Dec 3, 2025 | Initial inventory created                                     |

---

_This document should be updated whenever new badges are added or existing badges are modified._
_See `src/pages/UIReview.jsx` for live badge reference._
