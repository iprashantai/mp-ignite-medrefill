# FHIR Bulk DELETE Operations - Research Report

**Date:** 2026-01-07
**Context:** Strategies for efficiently deleting 10,000+ test FHIR resources
**Primary Focus:** Medplum FHIR server implementation

---

## Executive Summary

### Key Findings

1. **Can transaction bundles contain multiple DELETEs?** **YES** - Both transaction and batch bundles support multiple DELETE requests.

2. **Maximum operations per bundle:**
   - **Medplum Transaction Bundles:** 20 resources (strict limit)
   - **Medplum Batch Bundles:** ~50 MB payload limit (no specific entry count limit documented)
   - **Other servers:** 500 entries (Azure), 15 MB (AWS HealthLake)

3. **Best approach for 10,000+ resources:**
   - **DO NOT** use transaction bundles (too small, all-or-nothing, expensive)
   - **PREFERRED:** Use **Batch Bundles** in parallel chunks (500-1000 items per bundle)
   - **ALTERNATIVE:** Medplum `$expunge` operation for hard delete (admin only)

4. **Performance:** Batch bundles are significantly faster and cheaper than individual DELETEs or transaction bundles.

---

## 1. FHIR Bundle Types for DELETE Operations

### Transaction Bundle (`type: "transaction"`)

**Characteristics:**
- **Atomicity:** All-or-nothing. If any DELETE fails, all operations are rolled back.
- **Use case:** Deleting strictly related resources where partial deletion is dangerous (e.g., Patient + all their Observations).
- **Response:** Single 200 OK (success) or 4xx/5xx (failure for entire bundle).
- **Medplum limit:** **20 resources maximum**

**FHIR R4 Spec:** [http://hl7.org/fhir/R4/http.html#transaction](http://hl7.org/fhir/R4/http.html#transaction)

### Batch Bundle (`type: "batch"`)

**Characteristics:**
- **Independence:** Each DELETE operation is processed independently. If one fails, others still succeed.
- **Use case:** Bulk cleanup, deleting unrelated test data, high-volume operations.
- **Response:** Bundle containing individual status (200, 404, etc.) for each entry.
- **Medplum limit:** ~50 MB payload (asynchronous support)

**FHIR R4 Spec:** [http://hl7.org/fhir/R4/http.html#batch](http://hl7.org/fhir/R4/http.html#batch)

### Comparison Table

| Feature | Transaction Bundle | Batch Bundle |
|---------|-------------------|--------------|
| **Atomicity** | All-or-nothing | Independent operations |
| **Medplum Limit** | 20 resources | ~50 MB payload |
| **Error Handling** | Single error fails all | Each operation returns individual status |
| **Use for 10K+ deletes** | ❌ No (too small) | ✅ Yes (chunked) |
| **Cost (AWS HealthLake)** | 2x write capacity | 1x write capacity |
| **Rollback** | Automatic | None |

---

## 2. DELETE Operation Syntax Examples

### A. Transaction Bundle with Multiple DELETEs

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "request": {
        "method": "DELETE",
        "url": "Patient/123"
      }
    },
    {
      "request": {
        "method": "DELETE",
        "url": "Observation/abc-456"
      }
    },
    {
      "request": {
        "method": "DELETE",
        "url": "RiskAssessment?subject=Patient/123"
      }
    }
  ]
}
```

**Note:** Change `"type": "transaction"` to `"type": "batch"` to make this a Batch request.

### B. Conditional DELETE (Query Parameter-based)

**Single resource match:**
```http
DELETE /Observation?subject=Patient/123&date=2023-01-01
```

**Multiple resource matches:**
```json
{
  "resourceType": "Bundle",
  "type": "batch",
  "entry": [
    {
      "request": {
        "method": "DELETE",
        "url": "Observation?subject=Patient/123"
      }
    }
  ]
}
```

**IMPORTANT:** Some servers require specific configuration to allow deleting multiple matches via conditional delete. FHIR spec allows servers to reject with `412 Precondition Failed` to prevent accidental mass deletion.

**Medplum support:** Not explicitly documented. Test carefully.

---

## 3. Medplum-Specific Implementation

### Medplum Client SDK (@medplum/core)

#### Individual Resource Deletion

```typescript
import { MedplumClient } from '@medplum/core';

const medplum = new MedplumClient({
  baseUrl: process.env.MEDPLUM_BASE_URL,
  clientId: process.env.MEDPLUM_CLIENT_ID,
});

// Soft delete (standard FHIR delete)
await medplum.deleteResource('Patient', '123');
```

**Result:**
- Returns 200 OK
- Resource marked as deleted (new version created)
- Content remains in history
- Subsequent GET returns `410 Gone`

#### Batch Bundle Delete with executeBatch()

```typescript
import { MedplumClient } from '@medplum/core';
import { Bundle } from '@medplum/fhirtypes';

async function deleteBatch(resourceIds: string[], resourceType: string): Promise<Bundle> {
  const bundle: Bundle = {
    resourceType: 'Bundle',
    type: 'batch',
    entry: resourceIds.map((id) => ({
      request: {
        method: 'DELETE',
        url: `${resourceType}/${id}`,
      },
    })),
  };

  return await medplum.executeBatch(bundle);
}

// Usage
const observationIds = ['obs-1', 'obs-2', 'obs-3', /* ... */];
const response = await deleteBatch(observationIds, 'Observation');

// Check individual results
response.entry?.forEach((entry, index) => {
  console.log(`Resource ${index}: ${entry.response?.status}`);
});
```

**Key Points:**
- Use `type: 'batch'` for independent operations
- Each entry in the response contains individual status codes
- 200 = deleted successfully
- 404 = resource didn't exist (usually acceptable for delete)
- 4xx/5xx = error (check `OperationOutcome`)

---

## 4. Strategies for Deleting 10,000+ Resources

### ❌ AVOID: Single Transaction Bundle

```typescript
// ❌ DON'T DO THIS - Will fail due to 20 resource limit
const bundle = {
  resourceType: 'Bundle',
  type: 'transaction',
  entry: allIds.map(id => ({ request: { method: 'DELETE', url: `Observation/${id}` }}))
};
```

**Why not:**
- Medplum limit: 20 resources
- All-or-nothing: one failure kills all
- Higher cost on cloud FHIR servers

### ✅ RECOMMENDED: Chunked Batch Bundles

```typescript
import { MedplumClient } from '@medplum/core';
import { Bundle, BundleEntry } from '@medplum/fhirtypes';

// Helper: Split array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper: Create DELETE bundle
function createDeleteBundle(ids: string[], resourceType: string): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'batch',
    entry: ids.map((id) => ({
      request: {
        method: 'DELETE',
        url: `${resourceType}/${id}`,
      },
    })),
  };
}

// Main bulk delete function
async function bulkDeleteResources(
  medplum: MedplumClient,
  resourceType: string,
  resourceIds: string[],
  chunkSize: number = 500
): Promise<void> {
  const chunks = chunkArray(resourceIds, chunkSize);

  console.log(`Deleting ${resourceIds.length} ${resourceType} resources in ${chunks.length} batches...`);

  // Process batches sequentially to avoid rate limits
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const bundle = createDeleteBundle(chunk, resourceType);

    try {
      const response = await medplum.executeBatch(bundle);

      // Count successes and failures
      const successes = response.entry?.filter(e =>
        e.response?.status === '200' || e.response?.status === '204'
      ).length ?? 0;

      const notFound = response.entry?.filter(e =>
        e.response?.status === '404'
      ).length ?? 0;

      const errors = response.entry?.filter(e =>
        !['200', '204', '404'].includes(e.response?.status ?? '')
      ).length ?? 0;

      console.log(
        `Batch ${i + 1}/${chunks.length}: ` +
        `${successes} deleted, ${notFound} not found, ${errors} errors`
      );

      // Log errors
      if (errors > 0) {
        response.entry?.forEach((entry, idx) => {
          if (entry.response?.status && !['200', '204', '404'].includes(entry.response.status)) {
            console.error(
              `Error deleting ${resourceType}/${chunk[idx]}: ` +
              `${entry.response.status} - ${JSON.stringify(entry.response.outcome)}`
            );
          }
        });
      }
    } catch (error) {
      console.error(`Batch ${i + 1} failed completely:`, error);
      // Optional: Continue with next batch or abort
    }

    // Optional: Rate limiting delay
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
    }
  }

  console.log('Bulk delete completed');
}

// Usage Example
async function main() {
  const medplum = new MedplumClient({ /* config */ });

  // Step 1: Search for all resources to delete
  const searchResults = await medplum.searchResources('Observation', {
    _count: 1000,
    // Add filters as needed
  });

  const ids = searchResults.map(obs => obs.id).filter((id): id is string => !!id);

  // Step 2: Delete in batches
  await bulkDeleteResources(medplum, 'Observation', ids, 500);
}
```

**Parameters:**
- **chunkSize:** 500-1000 is safe for most servers
  - Medplum: 500 recommended (well under 50MB limit)
  - Azure: 500 max
  - AWS HealthLake: Keep under 15MB

**Performance:**
- 10,000 resources ÷ 500 per batch = 20 batches
- ~100-200ms per batch = ~2-4 seconds total
- Compare to: 10,000 individual DELETEs = 10+ minutes

### ✅ ALTERNATIVE: Parallel Batch Processing

```typescript
async function bulkDeleteParallel(
  medplum: MedplumClient,
  resourceType: string,
  resourceIds: string[],
  chunkSize: number = 500,
  maxParallel: number = 5
): Promise<void> {
  const chunks = chunkArray(resourceIds, chunkSize);

  // Process in parallel batches
  for (let i = 0; i < chunks.length; i += maxParallel) {
    const batchPromises = chunks
      .slice(i, i + maxParallel)
      .map(chunk => medplum.executeBatch(createDeleteBundle(chunk, resourceType)));

    const results = await Promise.allSettled(batchPromises);

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        console.log(`Batch ${i + idx + 1} completed`);
      } else {
        console.error(`Batch ${i + idx + 1} failed:`, result.reason);
      }
    });
  }
}
```

**When to use parallel:**
- Large datasets (50K+ resources)
- Server has high rate limits
- Need maximum speed

**Caution:**
- May hit rate limits
- Harder to debug failures
- Use `Promise.allSettled()` to handle partial failures

---

## 5. Medplum $expunge Operation (Hard Delete)

### What is $expunge?

The `$expunge` operation performs a **hard delete** (physical removal) of resources from the database.

**Differences from soft delete:**

| Feature | Soft Delete (`DELETE`) | Hard Delete (`$expunge`) |
|---------|------------------------|--------------------------|
| **Data retention** | Kept in history | Permanently removed |
| **Subsequent GET** | Returns `410 Gone` | Returns `404 Not Found` |
| **Search results** | Excluded | Never existed |
| **Access required** | Standard user | Administrator |
| **Reversible** | Yes (via history) | No |

### Syntax

**Single resource:**
```http
POST [base]/[resourceType]/[id]/$expunge
```

**Everything in compartment:**
```http
POST [base]/Patient/[id]/$expunge?everything=true
```

**Supported compartments:**
- Patient
- Project

### Code Example

```typescript
// Hard delete a single resource
await medplum.post(
  medplum.fhirUrl('Observation', 'obs-123', '$expunge'),
  {}
);

// Hard delete Patient and all related resources
await medplum.post(
  medplum.fhirUrl('Patient', 'patient-456', '$expunge'),
  { everything: true }
);
```

### When to use $expunge

✅ **Use for:**
- Deleting test data permanently
- GDPR/privacy compliance (complete data removal)
- Freeing database space

❌ **Do NOT use for:**
- Production patient data (unless legally required)
- Resources that may need to be restored
- Routine cleanup (soft delete is safer)

**Note:** Medplum documentation does not specify if `$expunge` supports bulk operations on multiple resources at once. It appears designed for individual resource or compartment deletion.

---

## 6. Error Handling Best Practices

### Batch Bundle Error Handling

```typescript
interface DeleteResult {
  total: number;
  deleted: number;
  notFound: number;
  errors: number;
  errorDetails: Array<{ id: string; status: string; message: string }>;
}

async function deleteBatchWithErrorHandling(
  medplum: MedplumClient,
  resourceType: string,
  ids: string[]
): Promise<DeleteResult> {
  const bundle = createDeleteBundle(ids, resourceType);
  const result: DeleteResult = {
    total: ids.length,
    deleted: 0,
    notFound: 0,
    errors: 0,
    errorDetails: [],
  };

  try {
    const response = await medplum.executeBatch(bundle);

    response.entry?.forEach((entry, index) => {
      const status = entry.response?.status ?? '500';

      if (status === '200' || status === '204') {
        result.deleted++;
      } else if (status === '404') {
        result.notFound++;
      } else {
        result.errors++;
        result.errorDetails.push({
          id: ids[index],
          status,
          message: JSON.stringify(entry.response?.outcome),
        });
      }
    });
  } catch (error) {
    // Entire batch failed
    result.errors = ids.length;
    result.errorDetails.push({
      id: 'BATCH_FAILURE',
      status: '500',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

// Usage
const result = await deleteBatchWithErrorHandling(medplum, 'Observation', ids);
console.log(`Results: ${result.deleted} deleted, ${result.notFound} not found, ${result.errors} errors`);

if (result.errors > 0) {
  console.error('Errors:', result.errorDetails);
}
```

### Common HTTP Status Codes in DELETE Operations

| Code | Meaning | Action |
|------|---------|--------|
| `200` | OK (resource deleted) | Success |
| `204` | No Content (deleted) | Success |
| `404` | Not Found | Usually OK (already deleted or never existed) |
| `409` | Conflict | Retry with exponential backoff |
| `410` | Gone (soft deleted) | Expected for already-deleted resources |
| `429` | Too Many Requests | Implement rate limiting |
| `500` | Server Error | Log and retry |

---

## 7. Performance Benchmarks & Recommendations

### Theoretical Performance (10,000 resources)

| Method | Time Estimate | Network Requests | Notes |
|--------|---------------|------------------|-------|
| Individual DELETEs | ~10-20 minutes | 10,000 | Sequential: 100-200ms per request |
| Batch (500/bundle) | ~2-5 seconds | 20 | Parallel processing possible |
| Batch (1000/bundle) | ~1-3 seconds | 10 | Higher risk of timeout |
| Transaction (20/bundle) | ~50-100 seconds | 500 | Not recommended (atomicity overhead) |

### Recommended Chunk Sizes by Server

| Server | Recommended Size | Max Documented | Reasoning |
|--------|------------------|----------------|-----------|
| **Medplum** | 500-1000 | ~50 MB payload | No entry limit, payload size matters |
| **Azure FHIR** | 500 | 500 entries | Hard limit |
| **AWS HealthLake** | 300-500 | 15 MB | Payload size limit |
| **HAPI FHIR** | 500-800 | Configurable | Default `$delete-expunge` uses 800 |

### Rate Limiting Strategy

```typescript
async function deleteWithRateLimit(
  medplum: MedplumClient,
  resourceType: string,
  ids: string[],
  requestsPerSecond: number = 10
): Promise<void> {
  const delayMs = 1000 / requestsPerSecond;
  const chunks = chunkArray(ids, 500);

  for (const chunk of chunks) {
    await deleteBatchWithErrorHandling(medplum, resourceType, chunk);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}
```

---

## 8. Real-World Implementation Checklist

### Pre-Delete

- [ ] Backup critical data if needed
- [ ] Verify resource IDs are correct (run search query first)
- [ ] Check if resources have dependencies (references from other resources)
- [ ] Confirm soft delete vs hard delete requirements
- [ ] Test on small subset first (e.g., 10 resources)

### Implementation

- [ ] Use batch bundles (not transaction)
- [ ] Chunk size: 500-1000 resources per batch
- [ ] Implement error handling and logging
- [ ] Add progress indicators for large operations
- [ ] Consider rate limiting (5-10 requests/second)
- [ ] Handle 404 as success (idempotent delete)

### Post-Delete

- [ ] Verify total count matches expected deletions
- [ ] Check for error logs
- [ ] Confirm resources no longer appear in searches
- [ ] Monitor server performance (if deleting in production)
- [ ] Document deletion for audit trail

---

## 9. Code Template for Production Use

```typescript
import { MedplumClient } from '@medplum/core';
import { Bundle } from '@medplum/fhirtypes';

interface BulkDeleteOptions {
  resourceType: string;
  searchParams?: Record<string, string>;
  chunkSize?: number;
  maxParallel?: number;
  delayMs?: number;
  dryRun?: boolean;
}

interface BulkDeleteReport {
  totalFound: number;
  totalDeleted: number;
  totalNotFound: number;
  totalErrors: number;
  duration: number;
  errors: Array<{ id: string; status: string; message: string }>;
}

export async function bulkDelete(
  medplum: MedplumClient,
  options: BulkDeleteOptions
): Promise<BulkDeleteReport> {
  const {
    resourceType,
    searchParams = {},
    chunkSize = 500,
    maxParallel = 1,
    delayMs = 100,
    dryRun = false,
  } = options;

  const startTime = Date.now();
  const report: BulkDeleteReport = {
    totalFound: 0,
    totalDeleted: 0,
    totalNotFound: 0,
    totalErrors: 0,
    duration: 0,
    errors: [],
  };

  console.log(`🔍 Searching for ${resourceType} resources...`);

  // Step 1: Find all resources matching criteria
  const resources = await medplum.searchResources(resourceType, {
    ...searchParams,
    _count: 1000,
  });

  const ids = resources.map(r => r.id).filter((id): id is string => !!id);
  report.totalFound = ids.length;

  if (ids.length === 0) {
    console.log('✅ No resources found to delete');
    return report;
  }

  console.log(`📊 Found ${ids.length} resources to delete`);

  if (dryRun) {
    console.log('🔍 DRY RUN - No resources will be deleted');
    console.log('Resource IDs:', ids.slice(0, 10), ids.length > 10 ? `... and ${ids.length - 10} more` : '');
    return report;
  }

  // Step 2: Delete in chunks
  const chunks = chunkArray(ids, chunkSize);
  console.log(`📦 Processing ${chunks.length} batches of up to ${chunkSize} resources each`);

  for (let i = 0; i < chunks.length; i += maxParallel) {
    const batchChunks = chunks.slice(i, i + maxParallel);

    const batchPromises = batchChunks.map(async (chunk, batchIdx) => {
      const bundle: Bundle = {
        resourceType: 'Bundle',
        type: 'batch',
        entry: chunk.map(id => ({
          request: {
            method: 'DELETE',
            url: `${resourceType}/${id}`,
          },
        })),
      };

      try {
        const response = await medplum.executeBatch(bundle);

        response.entry?.forEach((entry, entryIdx) => {
          const status = entry.response?.status ?? '500';
          const resourceId = chunk[entryIdx];

          if (status === '200' || status === '204') {
            report.totalDeleted++;
          } else if (status === '404' || status === '410') {
            report.totalNotFound++;
          } else {
            report.totalErrors++;
            report.errors.push({
              id: resourceId,
              status,
              message: JSON.stringify(entry.response?.outcome),
            });
          }
        });

        console.log(
          `  ✓ Batch ${i + batchIdx + 1}/${chunks.length} complete ` +
          `(${report.totalDeleted + report.totalNotFound}/${report.totalFound})`
        );
      } catch (error) {
        report.totalErrors += chunk.length;
        console.error(`  ✗ Batch ${i + batchIdx + 1}/${chunks.length} failed:`, error);
      }
    });

    await Promise.allSettled(batchPromises);

    // Rate limiting delay
    if (i + maxParallel < chunks.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  report.duration = Date.now() - startTime;

  console.log('\n📋 Bulk Delete Report:');
  console.log(`  Total found: ${report.totalFound}`);
  console.log(`  Successfully deleted: ${report.totalDeleted}`);
  console.log(`  Not found (already deleted): ${report.totalNotFound}`);
  console.log(`  Errors: ${report.totalErrors}`);
  console.log(`  Duration: ${(report.duration / 1000).toFixed(2)}s`);

  if (report.totalErrors > 0) {
    console.error('\n❌ Errors encountered:');
    report.errors.forEach(err => {
      console.error(`  ${err.id}: ${err.status} - ${err.message}`);
    });
  }

  return report;
}

// Helper function
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Usage Example
async function main() {
  const medplum = new MedplumClient({
    baseUrl: process.env.MEDPLUM_BASE_URL,
    clientId: process.env.MEDPLUM_CLIENT_ID,
  });

  // Dry run first
  await bulkDelete(medplum, {
    resourceType: 'Observation',
    searchParams: { status: 'cancelled' },
    dryRun: true,
  });

  // Actual deletion
  const report = await bulkDelete(medplum, {
    resourceType: 'Observation',
    searchParams: { status: 'cancelled' },
    chunkSize: 500,
    maxParallel: 3,
    delayMs: 200,
  });

  if (report.totalErrors > 0) {
    process.exit(1);
  }
}
```

---

## 10. Comparison: FHIR Server Implementations

| Feature | Medplum | Azure FHIR | AWS HealthLake | HAPI FHIR |
|---------|---------|------------|----------------|-----------|
| **Transaction limit** | 20 resources | Not supported (legacy) | 15 MB | Configurable |
| **Batch limit** | ~50 MB | 500 entries | 15 MB | Configurable |
| **Conditional DELETE** | Not documented | Yes | Yes | Yes |
| **Bulk DELETE** | $expunge (admin) | $bulk-delete (async) | Manual chunking | $delete-expunge |
| **Async processing** | Yes (50+ MB) | Yes | No | Configurable |
| **Hard delete** | $expunge | $bulk-delete-soft-deleted | Manual | $expunge |
| **Default batch size** | N/A | 500 | N/A | 800 |
| **Cost multiplier (transactions)** | N/A | N/A | 2x write capacity | N/A |

---

## Conclusion

### For Medplum Projects

**Deleting 10,000+ test resources:**

1. **Use Batch Bundles** (not transactions)
2. **Chunk size: 500** resources per bundle
3. **Sequential or limited parallel** (max 3-5 parallel batches)
4. **Add delay between batches** (100-200ms) to avoid rate limits
5. **Handle 404 as success** (idempotent deletes)
6. **Log all errors** for debugging

**Code pattern:**
```typescript
await bulkDelete(medplum, {
  resourceType: 'Observation',
  chunkSize: 500,
  maxParallel: 3,
  delayMs: 200,
});
```

**Time estimate:** 10,000 resources ≈ 3-5 seconds

---

## Sources

- [FHIR R4 Batch Requests](http://hl7.org/fhir/R4/http.html#batch)
- [FHIR R4 Transaction](http://hl7.org/fhir/R4/http.html#transaction)
- [Medplum: FHIR Batch Requests](https://www.medplum.com/docs/fhir-datastore/fhir-batch-requests)
- [Medplum: Deleting Data](https://www.medplum.com/docs/fhir-datastore/deleting-data)
- [Medplum SDK: executeBatch](https://www.medplum.com/docs/sdk/core.medplumclient.executebatch)
- [Medplum SDK: deleteResource](https://www.medplum.com/docs/sdk/core.medplumclient.deleteresource)
- [Medplum: $expunge Operation](https://www.medplum.com/docs/access/projects)
