# Test Scripts Updated to V2

## Summary

Successfully updated 2 test scripts to use V2 workflows with the simplified Tavily integration architecture.

## Updated Scripts

### 1. `scripts/test-advanced-search-workflow.ts` ✅

**Changes:**

- Updated import from `advancedSearchWorkflow` to `advancedSearchWorkflowV2`
- Added conversation history parameter (empty array for standalone test)
- Updated to check `search` step instead of multiple steps (V1 had 3 steps)
- Updated token budget expectations (3K-5K instead of 4K-8K)
- Added proper type guards for step output
- Fixed template literal linting issues

**V1 Architecture (Old):**

```
advanced-search → extract-top-sources → synthesize
```

**V2 Architecture (New):**

```
search (Tavily → Chat Agent)
```

**Expected Output:**

- Token usage: 3K-5K tokens
- Single search step
- Response with sources
- Citations in markdown format

### 2. `scripts/test-comprehensive-analysis-workflow.ts` ✅

**Changes:**

- Updated import from `comprehensiveAnalysisWorkflow` to `comprehensiveAnalysisWorkflowV2`
- Added conversation history parameter (empty array for standalone test)
- Updated to check `follow-up-searches` step instead of `document` step
- Removed path tracking (V1 had "enhance" vs "deep-dive" paths)
- Updated token budget expectations (5K-10K instead of 18K-20K)
- Added proper type guards for step output
- Fixed template literal linting issues
- Updated test summary to track sources instead of paths

**V1 Architecture (Old):**

```
initial-search → gap-analysis → enhance/deep-dive → document
```

**V2 Architecture (New):**

```
initial-search → gap-analysis → follow-up-searches
```

**Expected Output:**

- Token usage: 5K-10K tokens
- Multiple searches if gaps identified
- Response with sources
- Citations in markdown format

## Key Differences: V1 vs V2

### Architecture

| Aspect               | V1 (Old)                                            | V2 (New)                  |
| -------------------- | --------------------------------------------------- | ------------------------- |
| Pipeline             | Tavily → Entity Extraction → Validation → Synthesis | Tavily → Chat Agent       |
| Steps                | 3-4 steps                                           | 1-3 steps                 |
| Token Usage          | Higher (entity processing)                          | Lower (direct processing) |
| Information Loss     | Yes (validation filtering)                          | No (all results passed)   |
| Conversation History | Not supported                                       | Supported                 |

### Token Budgets

| Workflow        | V1 Budget | V2 Budget | Improvement      |
| --------------- | --------- | --------- | ---------------- |
| Advanced Search | 4K-8K     | 3K-5K     | 25-37% reduction |
| Comprehensive   | 18K-20K   | 5K-10K    | 50-72% reduction |

### Output Structure

**V1:**

```typescript
{
  response: string;
  sources: Array<{ title; url }>;
  totalTokens: number;
  path: "enhance" | "deep-dive"; // Only in comprehensive
}
```

**V2:**

```typescript
{
  response: string;
  sources: Array<{ title; url }>;
  totalTokens: number;
  // No path tracking - simpler architecture
}
```

## Running the Scripts

### Advanced Search Workflow Test

```bash
pnpm tsx scripts/test-advanced-search-workflow.ts
```

**Expected Output:**

```
Testing Advanced Search Workflow V2...

Starting workflow with test query...

=== Workflow Results ===
Status: success
Duration: 3.45s

--- Search Step ---
Response Length: 1234 chars
Sources: 10
Total Tokens: 4200

✅ Token budget within range (3K-5K)
✅ Search step executed successfully

--- Response Preview ---
[Response text...]

--- Sources ---
1. [Source title]
   [Source URL]
...
```

### Comprehensive Analysis Workflow Test

```bash
pnpm tsx scripts/test-comprehensive-analysis-workflow.ts
```

**Expected Output:**

```
Comprehensive Analysis Workflow Test Suite
Testing both initial search and follow-up searches

✓ Environment variables verified

================================================================================
Testing: contract law basic principles
================================================================================

Executing workflow...

✓ Workflow completed successfully
Duration: 8.23s
Total Tokens: 7500
Within Budget: ✓ Yes
In Target Range (5K-10K): ✓ Yes
Response Length: 2345 characters
Sources: 15
Zimbabwe Context: ✓ Present
Citations: ✓ Present

Response Preview (first 500 chars):
[Response text...]

[... more tests ...]

================================================================================
Test Summary
================================================================================

Total Tests: 5
Successful: 5 ✓
Failed: 0
Average Tokens: 7200
Average Duration: 8.45s
Average Sources: 14.2
Within Budget (≤10K): 5/5 (100%)

✓ All tests passed successfully!
```

## Benefits of V2 Scripts

1. **Simpler Testing**: Fewer steps to verify
2. **Faster Execution**: Lower token usage = faster responses
3. **More Reliable**: No entity extraction failures
4. **Better Context**: Conversation history support
5. **Clearer Output**: Easier to understand results

## Next Steps

1. ✅ Scripts updated to V2
2. ⚠️ Integration tests still need updating (3 files)
3. Run scripts to verify V2 workflows work correctly
4. Update integration tests to match script patterns

## Integration Tests to Update

1. `tests/integration/basic-search-workflow.test.ts`
2. `tests/integration/advanced-search-workflow.test.ts`
3. `tests/integration/comprehensive-analysis-workflow.test.ts`

These should follow the same pattern as the updated scripts:

- Import V2 workflows
- Add conversation history parameter
- Update step names
- Update token budget expectations
- Add proper type guards
