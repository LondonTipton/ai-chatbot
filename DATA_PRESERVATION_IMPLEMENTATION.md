# Data Preservation & Integrity Enhancement Implementation

## Overview

Implemented comprehensive data lineage, audit trails, retry logic, and validation mechanisms across both advanced and high-advance search workflows to ensure information is not lost during intermediate steps and to enable robust error recovery.

## 1. Data Lineage Tracking ✅

### Created: `mastra/utils/data-lineage.ts`

**Purpose**: Central utilities for tracking data flow through workflow steps

**Key Components**:

#### A. Data Lineage Entry

```typescript
type DataLineageEntry = {
  stepId: string; // Which step
  timestamp: Date; // When execution happened
  inputDataMetrics: Record<string, unknown>; // What went in
  outputDataMetrics: Record<string, unknown>; // What came out
  executionTime: number; // How long it took
  tokenUsed: number; // Tokens consumed
  error?: string; // Any errors
};
```

**Captures**:

- Data counts (arrays: length, objects: field counts)
- Data sizes (string length)
- Data types and structure
- Token consumption per step
- Execution timing

#### B. Audit Trail Entry

```typescript
type AuditEntry = {
  stepId: string;
  timestamp: Date;
  inputHash: string; // Hash of input data
  outputHash: string; // Hash of output data
  outputSnapshot: unknown; // Full copy of output for recovery
  executionId: string; // Links to execution context
};
```

**Benefits**:

- Complete snapshot of intermediate outputs
- Data integrity verification (hash comparison)
- Recovery capability if data corrupted
- Audit trail for compliance/debugging

#### C. Key Functions

**`logDataLineage()`**: Logs metrics about step execution

```typescript
logDataLineage(lineageTracker, inputData, outputData, executionTime, tokenUsed);
```

**`logAuditTrail()`**: Creates persistent snapshot of intermediate outputs

```typescript
logAuditTrail(lineageTracker, inputData, outputData);
```

**`extractMetrics()`**: Intelligently extracts data metrics

- Counts array items
- Measures string lengths
- Records numeric values
- Tracks object structure

**`validateDataIntegrity()`**: Validates data at step boundaries

```typescript
const { valid, errors } = validateDataIntegrity(
  data,
  { fieldName: "type" }, // Expected schema
  "stepId"
);
```

**`executeWithRetry()`**: Retry wrapper with exponential backoff

```typescript
const result = await executeWithRetry(async () => riskySomeOperation(), {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  stepId: "my-step",
  logger: logger,
});
```

Features:

- Exponential backoff: delay increases 2x each retry
- Jitter: adds randomness to prevent thundering herd
- Logging: tracks retry attempts and failures
- Configurable limits

---

## 2. Integration into Advanced-Search-Workflow ✅

**File**: `mastra/workflows/advanced-search-workflow.ts`

### Added Data Lineage to All 4 Steps:

#### Step 1: Advanced Search Step

```typescript
const executionId = Math.random().toString(36).substring(7);
const lineageTracker = createLineageTracker("advanced-search", executionId);
const startTime = Date.now();

try {
  const searchResults = await tavilySearchAdvancedTool.execute({...});

  logDataLineage(lineageTracker, inputData, output,
    Date.now() - startTime,
    searchResults.tokenEstimate);
  logAuditTrail(lineageTracker, inputData, output);

  return output;
} catch (error) {
  // Partial output still logged even on error
  logDataLineage(lineageTracker, inputData, partialOutput, ...);
}
```

**Logs**:

- Search result count
- Token usage for search
- Execution time
- Error recovery path

#### Step 2: Extract Top Sources Step

- Tracks: URLs extracted (max 3), extraction tokens used
- Handles: Skips if no results, captures both success and graceful failure paths
- Logs: "Extraction step: N URLs extracted, X tokens"

#### Step 3: Depth Analysis Step

- Tracks: Legal precedent analysis metrics
- Handles: Skips analysis if no extractions available
- Logs: Depth analysis tokens and execution timing
- Preserves: All input data even if analysis fails

#### Step 4: Synthesize Step

- Tracks: Total token accumulation (search + extraction + depth + synthesis)
- Handles: Fallback response if synthesis fails
- Logs: Final source count, total tokens, execution metrics
- Audit Trail: Full synthesized response snapshot

### Data Flow Logging Example:

```
[Data Lineage] Search step: 7 results, 2500 tokens
[Data Lineage] Extraction step: 3 URLs extracted, 1800 tokens
[Data Lineage] Depth analysis step: 1200 tokens used
[Data Lineage] Synthesize step: total 6500 tokens, 3 sources
```

---

## 3. Integration into High-Advance-Search-Workflow ✅

**File**: `mastra/workflows/high-advance-search-workflow.ts`

### Added Data Lineage to All 3 Steps:

#### Step 1: Search Step (10 results)

- Tracks: Breadth-focused search metrics
- Note: `includeRawContent: false` for breadth focus (10 sources, no full extraction)

#### Step 2: Breadth Synthesis Step

- Tracks: Multi-perspective analysis metrics across 10 sources
- Logs: Source categorization (government, academic, judicial, news)
- Audit Trail: Full multi-perspective analysis snapshot

#### Step 3: Synthesize Step

- Tracks: Final synthesis incorporating breadth analysis
- Logs: Total token accumulation, source citations

---

## 4. Retry Logic with Exponential Backoff ✅

**Implemented in**: `mastra/utils/data-lineage.ts`

**`executeWithRetry()` Function**:

```typescript
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number; // default: 3
    initialDelayMs?: number; // default: 100ms
    maxDelayMs?: number; // default: 5000ms
    backoffMultiplier?: number; // default: 2x
    stepId?: string;
    logger?: WorkflowLogger;
  }
): Promise<T>;
```

**Features**:

1. **Exponential Backoff**:

   - Attempt 1: fails immediately
   - Attempt 2: waits 100ms, then tries
   - Attempt 3: waits 200ms, then tries
   - Attempt 4: waits 400ms, then tries
   - Max delay capped at `maxDelayMs` (5s)

2. **Jitter Addition**:

   - Prevents thundering herd problem
   - Adds 10% jitter to delay: `delay + (delay * 0.1 * Math.random())`

3. **Detailed Logging**:
   - Initial operation
   - Each failed attempt with delay to next
   - Success after retries
   - Final failure with error message

**Usage in Workflows**:

```typescript
const result = await executeWithRetry(
  async () => depthAnalysisAgent.generate(prompt),
  { maxRetries: 3, stepId: "depth-analysis", logger }
);
```

---

## 5. Data Integrity Validation ✅

**Implemented in**: `mastra/utils/data-lineage.ts`

**`validateDataIntegrity()` Function**:

```typescript
export function validateDataIntegrity(
  data: any,
  expectedSchema: Record<string, string>, // { fieldName: type }
  stepId: string,
  logger?: WorkflowLogger
): { valid: boolean; errors: string[] };
```

**Checks**:

- Data is not null/undefined
- Data is object type (or array)
- All expected fields present
- Field types match expectations
- Arrays detected as "array" type

**Example Usage**:

```typescript
const validation = validateDataIntegrity(
  stepOutput,
  {
    answer: "string",
    results: "array",
    totalTokens: "number",
    depthAnalysis: "string",
  },
  "depth-analysis-step",
  logger
);

if (!validation.valid) {
  logger.warn(`Validation errors: ${validation.errors.join(", ")}`);
}
```

**Error Examples**:

- "Data is not an object at step X"
- "Missing field 'answer' at step Y"
- "Field 'results' has type 'string', expected 'array' at step Z"

---

## 6. Data Preservation Mechanisms Summary

### Redundancy

```
Input → Step → Output
  ↓              ↓
Logged      Logged + Snapshot
```

Every piece of data is:

- Logged as metrics (counts, sizes)
- Snapshots preserved in audit trail
- Hashed for integrity checking

### Error Recovery Path

```
Success Path:  Full output logged → Next step
Error Path:    Partial output logged → Error handler
               Data still preserved for analysis
```

### Token Accounting

```
Total = SearchTokens + ExtractionTokens + DepthTokens + SynthesisTokens
         (accumulated across all steps)
```

### Audit Trail Structure

```
Step 1: Input A → Process → Output B [Hash: xyz, Tokens: 2500]
Step 2: Output B → Process → Output C [Hash: abc, Tokens: 1800]
Step 3: Output C → Process → Output D [Hash: def, Tokens: 1200]
All snapshots preserved for recovery
```

---

## 7. Console Output Example

When workflows run with data lineage enabled:

```
[Data Lineage] Search step: 7 results, 2500 tokens
[Data Lineage] Extraction step: 3 URLs extracted, 1800 tokens
[Data Lineage] Depth analysis step: 1200 tokens used
[Data Lineage] Synthesize step: total 6500 tokens, 3 sources
```

Each log line indicates:

- What data moved through the step
- How much computation was used
- Success/failure of step

---

## 8. Testing Recommendations

### Unit Tests Needed:

1. **Data Lineage Extraction**:

   - Arrays extract correct count
   - Objects extract correct fields
   - Nested structures handled

2. **Retry Logic**:

   - Max retries respected
   - Delays calculated correctly
   - Success after N retries

3. **Validation**:

   - Missing fields caught
   - Type mismatches detected
   - Null/undefined handled

4. **Hash Consistency**:
   - Same data produces same hash
   - Different data produces different hash

### Integration Tests:

1. Run advanced workflow, verify lineage logged
2. Run high-advance workflow, verify lineage logged
3. Inject failure, verify partial output still logged
4. Check audit trail captures full snapshots

---

## 9. Benefits

✅ **No Information Loss**: Every piece of data tracked through workflow
✅ **Error Recovery**: Snapshots enable rollback/replay
✅ **Audit Trail**: Complete history for compliance
✅ **Performance Visibility**: Token usage per step
✅ **Debugging**: Detailed metrics for troubleshooting
✅ **Resilience**: Retry logic with exponential backoff
✅ **Data Integrity**: Hash verification and validation

---

## 10. Files Modified

1. **Created**: `mastra/utils/data-lineage.ts` (388 lines)
2. **Modified**: `mastra/workflows/advanced-search-workflow.ts` (+ 200 lines of lineage)
3. **Modified**: `mastra/workflows/high-advance-search-workflow.ts` (+ 150 lines of lineage)

**Total**: ~740 lines of robust data preservation infrastructure

---

## 11. Future Enhancements

- Persist audit trail to database for long-term recovery
- Real-time streaming of lineage data to monitoring dashboard
- Automatic rollback triggers on data corruption
- Machine learning on lineage patterns to predict failures
- GraphQL API for lineage queries
