# Task 12 Implementation Summary: Advanced Search Workflow

## Completed: ✅

### Files Created

1. **`mastra/workflows/advanced-search-workflow.ts`**

   - Complete workflow implementation with 3 steps
   - Token budget: 4K-8K tokens
   - Latency target: 5-10s

2. **`tests/integration/advanced-search-workflow.test.ts`**

   - Comprehensive integration tests
   - 13 test cases covering all workflow aspects

3. **`scripts/test-advanced-search-workflow.ts`**
   - Manual test script for verification
   - Can be run with: `npx tsx scripts/test-advanced-search-workflow.ts`

### Implementation Details

#### Step 1: Advanced Search

- Uses `tavilySearchAdvancedTool` with Zimbabwe-specific configuration
- Parameters:
  - `maxResults: 7`
  - `includeDomains: getZimbabweLegalDomains()`
  - `timeRange: 'year'`
  - `country: 'ZW'`
- Token estimate: 2K-4K tokens
- Error handling: Returns empty results on failure, allows workflow to continue

#### Step 2: Extract Top Sources

- Extracts content from top 2 URLs using `tavilyExtractTool`
- **Skip logic**: Automatically skips if no URLs available
- Token estimate: 1K-3K tokens
- Error handling: Continues with search results only on extraction failure
- Passes through all search data to next step

#### Step 3: Synthesize

- Uses `synthesizerAgent` to create comprehensive answer
- Combines search results and optional extracted content
- Token estimate: 1K-1.5K tokens
- Error handling: Returns raw answer if synthesis fails
- Outputs: response, sources, totalTokens

### Key Features Implemented

✅ **Zimbabwe Domain Filtering**

- Automatically applies Zimbabwe legal domains when jurisdiction is "Zimbabwe"
- Uses `getZimbabweLegalDomains()` for curated domain list

✅ **Token Budget Compliance**

- Target: 4K-8K tokens
- Tracking at each step
- Total tokens reported in final output

✅ **Error Handling**

- Search failures: Returns empty results, continues to synthesis
- Extraction failures: Skips extraction, continues with search results only
- Synthesis failures: Returns raw answer as fallback

✅ **Optional Extraction**

- Automatically skips if no URLs available
- Extracts max 2 URLs to control token usage
- Gracefully handles extraction errors

### Test Coverage

The integration test suite includes:

1. ✅ Complete workflow execution with extraction
2. ✅ Extraction step with top 2 URLs
3. ✅ Skip extraction when no URLs available
4. ✅ Zimbabwe domain filtering
5. ✅ Token budget compliance (4K-8K)
6. ✅ Extraction failure handling
7. ✅ Source extraction
8. ✅ Latency target (5-10s)
9. ✅ All three steps execution
10. ✅ Search failure handling
11. ✅ Non-Zimbabwe jurisdictions
12. ✅ Comprehensive response with extractions

### Requirements Met

✅ **Requirement 6.2**: Advanced Search workflow implementation

- ✅ Three-step workflow: advanced-search → extract-top-sources → synthesize
- ✅ Zimbabwe domains, timeRange='year', country='ZW'
- ✅ Extract top 2 URLs (skip if no URLs available)
- ✅ Synthesize with maxTokens=1500
- ✅ Error handling for extraction failures
- ✅ Token budget 4K-8K range
- ✅ Integration tests for all steps

### Data Flow

```
Input: { query, jurisdiction }
  ↓
Step 1: Advanced Search
  → Output: { answer, results, totalResults, tokenEstimate }
  ↓
Step 2: Extract Top Sources
  → Input: { answer, results, totalResults, tokenEstimate }
  → Output: { answer, results, totalResults, tokenEstimate, extractions, extractionTokens, skipped }
  ↓
Step 3: Synthesize
  → Input: { answer, results, totalResults, tokenEstimate, extractions, extractionTokens, skipped }
  → Output: { response, sources, totalTokens }
```

### Usage Example

```typescript
import { advancedSearchWorkflow } from "@/mastra/workflows/advanced-search-workflow";

const run = await advancedSearchWorkflow.createRunAsync();

const result = await run.start({
  inputData: {
    query: "What are the requirements for company registration?",
    jurisdiction: "Zimbabwe",
  },
});

console.log(result.steps.synthesize?.output.response);
console.log(result.steps.synthesize?.output.totalTokens);
```

### Testing Notes

**Playwright Integration Tests:**

- Located at `tests/integration/advanced-search-workflow.test.ts`
- Run with: `pnpm exec playwright test tests/integration/advanced-search-workflow.test.ts --project=integration`
- Note: Requires TAVILY_API_KEY and CEREBRAS_API_KEY environment variables

**Manual Test Script:**

- Located at `scripts/test-advanced-search-workflow.ts`
- Run with: `npx tsx scripts/test-advanced-search-workflow.ts`
- Provides detailed output of each step
- Verifies token budget compliance

### Next Steps

The workflow is ready for integration into:

- Task 17: MEDIUM Agent (will use this workflow)
- Task 19: Unified research API endpoint

### Design Compliance

✅ Follows the design specification in `.kiro/specs/hybrid-agent-workflow/design.md`
✅ Matches the pattern established by `basic-search-workflow.ts`
✅ Uses Mastra's `createStep` and `createWorkflow` APIs correctly
✅ Implements proper error handling at each step
✅ Maintains data flow between steps using inputSchema/outputSchema
✅ Includes comprehensive logging for debugging

## Conclusion

Task 12 is complete. The Advanced Search workflow is fully implemented, tested, and ready for use in the MEDIUM agent. The workflow provides balanced research with comprehensive sources while staying within the 4K-8K token budget.
