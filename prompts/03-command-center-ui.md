# Claude Code Prompt: Command Center UI

Use this prompt after PDC calculation is implemented.

---

## Prompt

I need to implement the Command Center UI - the main dashboard where clinical staff review medication refills.

**Read context first:**
- Read `CLAUDE.md` for project context
- Read `docs/FHIR_GUIDE.md` for FHIR resource reference
- Read `skills/fhir-resource.md` for patterns

**Your task:** Build the Command Center with three main views:

1. **Refill Queue** - List of patients needing refill review
2. **Patient Detail** - Full patient context when selected
3. **Action Panel** - Take action on recommendations

**Step 1: Create the queue data types**

Create `src/types/queue.ts`:
```typescript
export interface QueueItem {
  taskId: string;
  patientId: string;
  patientName: string;
  medicationClass: 'MAD' | 'MAC' | 'MAH';
  medicationName: string;
  pdcScore: number;
  daysUntilGap: number;
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  aiRecommendation?: {
    recommendation: 'approve' | 'deny' | 'review' | 'escalate';
    confidence: number;
    reasoning: string;
  };
  safetyAlerts: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
  }>;
  createdAt: string;
}

export interface QueueFilters {
  priority?: string[];
  medicationClass?: string[];
  pdcRange?: { min: number; max: number };
  status?: string[];
  assignedTo?: string;
}

export type SortField = 'daysUntilGap' | 'pdcScore' | 'priority' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
```

**Step 2: Create the queue store**

Create `src/stores/queue-store.ts` using Zustand:
```typescript
// State for queue management
interface QueueState {
  items: QueueItem[];
  selectedItem: QueueItem | null;
  filters: QueueFilters;
  sort: { field: SortField; order: SortOrder };
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setItems: (items: QueueItem[]) => void;
  selectItem: (item: QueueItem | null) => void;
  setFilters: (filters: Partial<QueueFilters>) => void;
  setSort: (field: SortField, order: SortOrder) => void;
  refreshQueue: () => Promise<void>;
}
```

**Step 3: Create queue data hooks**

Create `src/hooks/use-queue.ts`:
- `useQueue()` - main hook for queue data
- `useQueueItem(taskId)` - single item details
- `useQueueActions()` - approve/deny/escalate actions
- Use React Query for data fetching and caching

Create `src/lib/queue/transformers.ts`:
- `taskToQueueItem(task: Task, patient: Patient, ...): QueueItem`
- Transform FHIR resources to UI-friendly format

**Step 4: Create the Refill Queue component**

Create `src/components/command-center/RefillQueue.tsx`:
```typescript
// Features:
// - Table view with columns: Patient, Medication, PDC, Days Until Gap, Priority, AI Rec
// - Filter bar (by priority, medication class, PDC range)
// - Sort controls
// - Click row to select patient
// - Priority badges with colors
// - PDC score with visual indicator (red < 80%, yellow 80-90%, green > 90%)
// - Real-time updates via Medplum subscription
```

Create `src/components/command-center/QueueFilters.tsx`:
- Filter dropdowns for priority, medication class
- PDC range slider
- Clear filters button

Create `src/components/command-center/QueueStats.tsx`:
- Summary cards: Total pending, Urgent count, Average PDC, etc.

**Step 5: Create the Patient Detail component**

Create `src/components/command-center/PatientDetail.tsx`:
```typescript
// Features:
// - Patient demographics header
// - Active medications list with PDC for each
// - PDC trend chart (last 6 months)
// - Relevant conditions
// - Allergies
// - Recent dispense history
// - AI recommendation panel
```

Create `src/components/command-center/MedicationTimeline.tsx`:
- Visual timeline of fills and gaps
- Show each dispense with days supply
- Highlight gaps in red
- Show projected next gap

Create `src/components/command-center/PDCTrendChart.tsx`:
- Line chart showing PDC over time
- Use recharts library
- Show 80% threshold line
- Different colors for MAD/MAC/MAH

**Step 6: Create the AI Recommendation component**

Create `src/components/command-center/AIRecommendation.tsx`:
```typescript
// Features:
// - Recommendation badge (Approve/Review/Escalate)
// - Confidence score with visual meter
// - Expandable reasoning section
// - Risk factors list
// - Citations/sources
// - Confidence category indicator:
//   - Green (>95%): "High confidence"
//   - Yellow (85-95%): "Standard review"
//   - Orange (70-85%): "Enhanced review"
//   - Red (<70%): "Pharmacist review required"
```

**Step 7: Create the Action Panel**

Create `src/components/command-center/ActionPanel.tsx`:
```typescript
// Features:
// - Approve Refill button (green)
// - Request Review button (yellow)
// - Escalate to Pharmacist button (orange)
// - Deny button (red)
// - Add Note text field
// - Confirmation dialog before action
// - Audit logging of decision
```

Create `src/components/command-center/ActionConfirmDialog.tsx`:
- Modal confirmation
- Show action summary
- Require reason for deny/escalate
- Capture digital signature (checkbox)

**Step 8: Create the main Command Center page**

Create `src/app/(dashboard)/queue/page.tsx`:
- Three-panel layout:
  - Left: Queue list (collapsible)
  - Center: Patient detail
  - Right: Action panel (or bottom on mobile)
- Keyboard shortcuts:
  - Arrow keys: navigate queue
  - Enter: open detail
  - A: approve (with confirmation)
  - E: escalate

Create `src/app/(dashboard)/queue/layout.tsx`:
- Responsive layout
- Loading states
- Error boundaries

**Step 9: Add real-time updates**

Create `src/hooks/use-queue-subscription.ts`:
- Subscribe to Task changes
- Auto-refresh queue on new tasks
- Show notification for urgent items

**Requirements:**
- Fully responsive (works on tablet)
- Accessible (ARIA labels, keyboard navigation)
- Loading skeletons for async data
- Error states with retry
- Optimistic updates for actions
- Audit trail for all actions

**UI Library:** Use shadcn/ui components:
- Table for queue
- Card for patient detail
- Badge for priority/status
- Dialog for confirmations
- Tabs for patient sections
- Chart from recharts

**After implementation, verify:**
1. Queue loads and displays correctly
2. Filters work as expected
3. Sorting works correctly
4. Selecting a patient shows details
5. Actions complete and update queue
6. Real-time updates work
7. Mobile responsive
8. Keyboard navigation works

---

## Component Structure

```
src/components/command-center/
├── index.ts                    # Exports
├── RefillQueue.tsx             # Main queue table
├── QueueFilters.tsx            # Filter controls
├── QueueStats.tsx              # Summary statistics
├── PatientDetail.tsx           # Patient information panel
├── MedicationTimeline.tsx      # Visual timeline
├── PDCTrendChart.tsx           # PDC history chart
├── AIRecommendation.tsx        # AI recommendation display
├── ActionPanel.tsx             # Action buttons
├── ActionConfirmDialog.tsx     # Confirmation modal
└── QueueSkeleton.tsx           # Loading state
```
