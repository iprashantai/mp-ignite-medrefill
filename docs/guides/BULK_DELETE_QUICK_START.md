# Bulk Delete Quick Start Guide

Quick reference for deleting large numbers of FHIR resources efficiently.

For detailed research and technical deep-dive, see: [FHIR_BULK_DELETE_RESEARCH.md](../research/FHIR_BULK_DELETE_RESEARCH.md)

---

## TL;DR

**Deleting 10,000+ test resources? Use this:**

```bash
# 1. Dry run first (see what will be deleted)
npx tsx scripts/bulk-delete-resources.ts Observation --dry-run

# 2. Actual deletion
npx tsx scripts/bulk-delete-resources.ts Observation
```

Expected time: ~3-5 seconds for 10,000 resources

---

## Key Facts

| Question | Answer |
|----------|--------|
| Can batch bundles contain multiple DELETEs? | **YES** |
| Max per batch in Medplum? | ~50 MB payload (~500-1000 resources) |
| Best approach for bulk delete? | **Batch bundles** (not transactions) |
| Should I use transactions? | **NO** (limited to 20 resources) |
| Can I delete in parallel? | Yes, but limit to 3-5 parallel batches |
| What about $expunge? | Admin-only hard delete (permanent) |

---

## Quick Examples

### 1. Delete All Test Patients

```bash
npx tsx scripts/bulk-delete-resources.ts Patient \
  --filter "name:contains=Test" \
  --dry-run
```

### 2. Delete Completed Tasks

```bash
npx tsx scripts/bulk-delete-resources.ts Task \
  --filter "status=completed"
```

### 3. Fast Deletion (Parallel + Large Chunks)

```bash
npx tsx scripts/bulk-delete-resources.ts Observation \
  --chunk-size 1000 \
  --parallel 5 \
  --delay 200
```

### 4. Delete with Verbose Logging

```bash
npx tsx scripts/bulk-delete-resources.ts MedicationRequest \
  --verbose
```

---

## Code Snippet (SDK)

If you need to integrate bulk delete into your code:

```typescript
import { MedplumClient } from '@medplum/core';
import { bulkDeleteResources } from '@/scripts/bulk-delete-resources';

const medplum = new MedplumClient({ /* config */ });

const report = await bulkDeleteResources(medplum, {
  resourceType: 'Observation',
  searchParams: { status: 'cancelled' },
  chunkSize: 500,
  maxParallel: 3,
  delayMs: 200,
  dryRun: false,
});

console.log(`Deleted ${report.totalDeleted} resources`);
```

---

## Common Scenarios

### Scenario 1: Delete ALL resources of a type

```bash
# WARNING: This deletes EVERYTHING
npx tsx scripts/bulk-delete-resources.ts Observation --dry-run

# If you're sure:
npx tsx scripts/bulk-delete-resources.ts Observation
```

### Scenario 2: Delete by date range

```bash
# Observations from 2023
npx tsx scripts/bulk-delete-resources.ts Observation \
  --filter "date=ge2023-01-01" \
  --filter "date=le2023-12-31"
```

### Scenario 3: Delete by patient

```bash
# All observations for a specific patient
npx tsx scripts/bulk-delete-resources.ts Observation \
  --filter "subject=Patient/test-patient-123"
```

### Scenario 4: Delete large dataset efficiently

```bash
# 50,000+ resources? Use these settings:
npx tsx scripts/bulk-delete-resources.ts MedicationDispense \
  --chunk-size 1000 \
  --parallel 5 \
  --delay 100
```

---

## Troubleshooting

### Problem: "Rate limit exceeded"

**Solution:** Reduce parallelism and add delay
```bash
--parallel 1 --delay 500
```

### Problem: "Timeout errors"

**Solution:** Reduce chunk size
```bash
--chunk-size 250
```

### Problem: "Many 404 errors"

**Explanation:** Resources already deleted. This is normal and counted as success in the script.

### Problem: "Need to delete permanently (hard delete)"

**Solution:** Use Medplum's `$expunge` operation (requires admin access):
```typescript
// Individual resource
await medplum.post(
  medplum.fhirUrl('Observation', 'obs-123', '$expunge'),
  {}
);

// Patient + all related data
await medplum.post(
  medplum.fhirUrl('Patient', 'patient-456', '$expunge'),
  { everything: true }
);
```

---

## Performance Guide

| Dataset Size | Recommended Settings | Expected Time |
|--------------|---------------------|---------------|
| < 100 | Individual deletes OK | < 10 seconds |
| 100-1000 | `--chunk-size 500` | < 5 seconds |
| 1,000-10,000 | `--chunk-size 500 --parallel 3` | 3-10 seconds |
| 10,000-50,000 | `--chunk-size 1000 --parallel 5` | 10-30 seconds |
| 50,000+ | `--chunk-size 1000 --parallel 5 --delay 50` | 30-120 seconds |

---

## What NOT to Do

❌ **Don't use transaction bundles for bulk operations**
```typescript
// BAD: Limited to 20 resources
{ resourceType: 'Bundle', type: 'transaction', ... }
```

✅ **Use batch bundles instead**
```typescript
// GOOD: Supports 500-1000 resources
{ resourceType: 'Bundle', type: 'batch', ... }
```

❌ **Don't delete one-by-one in a loop**
```typescript
// BAD: Takes forever
for (const id of ids) {
  await medplum.deleteResource('Observation', id);
}
```

✅ **Use batch bundles**
```typescript
// GOOD: 100x faster
await medplum.executeBatch(bundle);
```

❌ **Don't skip the dry-run**
```bash
# BAD: Deletes production data accidentally
npx tsx scripts/bulk-delete-resources.ts Patient
```

✅ **Always dry-run first**
```bash
# GOOD: See what will be deleted
npx tsx scripts/bulk-delete-resources.ts Patient --dry-run
```

---

## Safety Checklist

Before bulk deleting resources:

- [ ] Run with `--dry-run` first
- [ ] Verify the resource count matches expectations
- [ ] Check resource IDs in the dry-run output
- [ ] Confirm you're connected to the correct environment
- [ ] Backup critical data if needed (production only)
- [ ] Test on a small subset first (10-20 resources)
- [ ] Have a rollback plan (restore from backup or history)

---

## Advanced: Soft Delete vs Hard Delete

### Soft Delete (Default)

```bash
npx tsx scripts/bulk-delete-resources.ts Observation
```

**What happens:**
- Resource marked as deleted
- Appears as "410 Gone" on GET
- Removed from search results
- History preserved
- **Reversible** (can restore from history)

### Hard Delete ($expunge)

**Requires:** Admin/super-admin access

```typescript
// Permanent deletion
await medplum.post(
  medplum.fhirUrl('Observation', 'obs-123', '$expunge'),
  {}
);
```

**What happens:**
- Resource permanently removed from database
- All history deleted
- Returns "404 Not Found"
- **NOT reversible**

**Use cases for hard delete:**
- GDPR/privacy compliance
- Deleting test data permanently
- Freeing database space
- After soft delete, need to purge completely

---

## Need Help?

- **Full research:** [FHIR_BULK_DELETE_RESEARCH.md](../research/FHIR_BULK_DELETE_RESEARCH.md)
- **Script source:** `/scripts/bulk-delete-resources.ts`
- **Medplum docs:** [Batch Requests](https://www.medplum.com/docs/fhir-datastore/fhir-batch-requests)
- **FHIR spec:** [Transaction/Batch](http://hl7.org/fhir/R4/http.html#transaction)
