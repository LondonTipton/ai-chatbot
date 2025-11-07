# Case Finding Issue - Root Cause Analysis

## Problem Statement

Users are asking about specific Zimbabwe legal cases, but the application is not finding them:

1. **Zuva Case:** "what is the zuva case in zimbabwean labour law?" → ❌ No results
2. **Richard Chihoro Case:** "explain the lower court judgement/order registration process outlined in the richard chihoro case" → ❌ No results

## Tavily Test Results

### Test 1: Zuva Case

**Query:** `"zuva case zimbabwe labour law"`
**Result:** ✅ **FOUND** - Multiple results including full judgment

**Key Finding:**

- **Case:** Nyamande & Another v ZUVA Petroleum (Pvt) Ltd
- **Citation:** [2015] ZWSC 43
- **URL:** https://zimlii.org/akn/zw/judgment/zwsc/2015/43/eng@2015-07-16

### Test 2: Richard Chihoro Case

**Query:** `"Richard Chihoro HH 07-2011 Zimbabwe High Court"`
**Result:** ✅ **FOUND** - Full judgment with registration process details

**Key Finding:**

- **Case:** Richard Chihoro HH 07-2011
- **Citation:** CIV 41(A) 430/09
- **URL:** https://zimlii.org/akn/zw/judgment/zwhhc/2011/7/eng@2011-05-03/source
- **Content:** Explains Rule 10(2) of S.I.115 of 1991 regarding registration of community court judgments at Magistrates Court

## Conclusion

**Tavily CAN find both cases!** ✅

The problem is NOT with Tavily's ability to find Zimbabwe legal cases. The issue is with how our application is:

1. Enhancing the queries
2. Passing queries to Tavily
3. Processing the results

## Root Cause Analysis

### Possible Issues

#### 1. Query Enhancement Not Working

**Symptom:** Original query sent to Tavily without enhancement

**Evidence Needed:**

- Check logs for `[Query Enhancer] Enhanced:`
- Verify enhanced query includes relevant keywords

**Expected Enhancement:**

```
Original: "what is the zuva case in zimbabwean labour law?"
Enhanced: "zuva case Zimbabwe Supreme Court labour law employment judgment"

Original: "explain the lower court judgement/order registration process outlined in the richard chihoro case"
Enhanced: "richard chihoro case Zimbabwe High Court lower court judgment registration process"
```

**If Missing:** Query enhancer not being called or failing silently

#### 2. Enhanced Query Not Used

**Symptom:** Enhancement logs present, but Tavily gets original query

**Evidence Needed:**

- Check logs for `[Basic Search] Final Tavily query:`
- Compare with enhanced query

**Expected:**

```
[Query Enhancer] Enhanced: "zuva case Zimbabwe Supreme Court..."
[Basic Search] Final Tavily query: "zuva case Zimbabwe Supreme Court... Zimbabwe law"
```

**If Different:** Workflow using `query` instead of `enhancedQuery`

#### 3. Cerebras API Failure

**Symptom:** Query enhancer errors in logs

**Evidence Needed:**

- Check for `[Query Enhancer] Error:`
- Check Cerebras API dashboard

**Expected:**

```
[Query Enhancer] Error: API timeout
[Query Enhancer] Using fallback: "original query Zimbabwe"
```

**If Present:** Cerebras API key invalid or rate limited

#### 4. Domain Strategy Issue

**Symptom:** Results found but not from Zimbabwe legal domains

**Evidence Needed:**

- Check search results URLs
- Verify Zimbabwe domains prioritized

**Expected URLs:**

- zimlii.org
- saflii.org
- africanlii.org
- veritaszim.net

**If Missing:** Domain strategy not configured correctly

#### 5. Result Filtering Too Aggressive

**Symptom:** Tavily finds results but workflow filters them out

**Evidence Needed:**

- Check Tavily raw results
- Compare with final results returned to user

**Expected:**

```
[Tavily] Found 10 results
[Workflow] After filtering: 10 results
```

**If Different:** Entity extraction or validation removing valid results

#### 6. Empty Results Handling

**Symptom:** Results found but not displayed to user

**Evidence Needed:**

- Check synthesis step
- Verify document composition

**Expected:**

```
[Synthesis] Creating response from 10 results
[Document] Response length: 2000 chars
```

**If Missing:** Synthesis failing or returning empty response

## Diagnostic Tests

### Test 1: Direct Query Enhancement

```typescript
import { enhanceSearchQuery } from "@/mastra/agents/query-enhancer-agent";

// Test Zuva case
const enhanced1 = await enhanceSearchQuery(
  "what is the zuva case in zimbabwean labour law?",
  []
);
console.log("Zuva Enhanced:", enhanced1);
// Expected: "zuva case Zimbabwe Supreme Court labour law employment judgment"

// Test Richard Chihoro case
const enhanced2 = await enhanceSearchQuery(
  "explain the lower court judgement/order registration process outlined in the richard chihoro case",
  []
);
console.log("Chihoro Enhanced:", enhanced2);
// Expected: "richard chihoro case Zimbabwe High Court lower court judgment registration"
```

### Test 2: Direct Tavily Search

```typescript
import { tavilySearchTool } from "@/mastra/tools/tavily-search";

// Test with enhanced query
const results = await tavilySearchTool.execute({
  context: {
    query:
      "zuva case Zimbabwe Supreme Court labour law employment judgment Zimbabwe law",
    maxResults: 20,
    domainStrategy: "prioritized",
    researchDepth: "standard",
  },
  runtimeContext: {},
});

console.log("Results found:", results.results.length);
console.log("First result:", results.results[0]?.title);
```

### Test 3: Full Workflow

```typescript
import { basicSearchWorkflow } from "@/mastra/workflows/basic-search-workflow";

const result = await basicSearchWorkflow.execute({
  inputData: {
    query: "what is the zuva case in zimbabwean labour law?",
    jurisdiction: "Zimbabwe",
    conversationHistory: [],
  },
});

console.log("Response:", result.response);
console.log("Sources:", result.sources.length);
```

## Expected vs Actual Behavior

### Expected Behavior

**User Query:** "what is the zuva case in zimbabwean labour law?"

**Step 1: Query Enhancement**

```
[Query Enhancer] Original: "what is the zuva case in zimbabwean labour law?"
[Query Enhancer] Type: case
[Query Enhancer] Enhanced: "zuva case Zimbabwe Supreme Court labour law employment judgment"
```

**Step 2: Tavily Search**

```
[Tavily Search] Query: "zuva case Zimbabwe Supreme Court labour law employment judgment Zimbabwe law"
[Tavily Search] Results: 10 found
[Tavily Search] Top result: "Nyamande & Another v ZUVA Petroleum (Pvt) Ltd"
```

**Step 3: Entity Extraction**

```
[Entity Extraction] Extracting from 10 results
[Entity Extraction] Found: 1 court case, 2 academic sources
```

**Step 4: Synthesis**

```
[Synthesis] Creating response from validated entities
[Synthesis] Response length: 1500 chars
```

**Step 5: User Response**

```
The Zuva case refers to Nyamande & Another v Zuva Petroleum (Pvt) Ltd [2015] ZWSC 43...
[Full detailed response with citations]
```

### Actual Behavior (Suspected)

**User Query:** "what is the zuva case in zimbabwean labour law?"

**Possible Scenario 1: Enhancement Failing**

```
[Query Enhancer] Error: Cerebras API timeout
[Query Enhancer] Fallback: "what is the zuva case in zimbabwean labour law? Zimbabwe"
[Tavily Search] Query: "what is the zuva case in zimbabwean labour law? Zimbabwe Zimbabwe law"
[Tavily Search] Results: 0 found (query too vague)
[User Response] "Unable to retrieve information"
```

**Possible Scenario 2: Enhancement Not Applied**

```
[Tavily Search] Query: "what is the zuva case in zimbabwean labour law? Zimbabwe law"
[Tavily Search] Results: 0-2 found (query too vague)
[User Response] "Unable to retrieve information"
```

**Possible Scenario 3: Results Filtered Out**

```
[Tavily Search] Results: 10 found
[Entity Extraction] Error: Unable to parse results
[Validation] 0 valid entities
[Synthesis] No entities to synthesize
[User Response] "Unable to retrieve information"
```

## Immediate Actions Required

### 1. Enable Debug Logging (CRITICAL)

Add to `mastra/agents/query-enhancer-agent.ts`:

```typescript
console.log("=".repeat(80));
console.log("[Query Enhancer] DEBUG");
console.log("Original:", query);
console.log("Type:", detectedType);
console.log("Enhanced:", enhanced);
console.log("=".repeat(80));
```

Add to `mastra/workflows/basic-search-workflow.ts`:

```typescript
console.log("=".repeat(80));
console.log("[Basic Search] DEBUG");
console.log("Original query:", query);
console.log("Enhanced query:", enhancedQuery);
console.log("Final Tavily query:", `${enhancedQuery} ${jurisdiction} law`);
console.log("Results found:", searchResults.results.length);
console.log("=".repeat(80));
```

### 2. Test Query Enhancement Directly

Create `test-enhancement.ts`:

```typescript
import { enhanceSearchQuery } from "./mastra/agents/query-enhancer-agent";

async function test() {
  const queries = [
    "what is the zuva case in zimbabwean labour law?",
    "explain the lower court judgement/order registration process outlined in the richard chihoro case",
  ];

  for (const query of queries) {
    console.log("\nTesting:", query);
    const enhanced = await enhanceSearchQuery(query, []);
    console.log("Enhanced:", enhanced);
  }
}

test();
```

Run: `npx tsx test-enhancement.ts`

### 3. Check Cerebras API

```bash
# Check if API key is set
echo $CEREBRAS_API_KEY

# Test API directly
curl https://api.cerebras.ai/v1/chat/completions \
  -H "Authorization: Bearer $CEREBRAS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b",
    "messages": [{"role": "user", "content": "test"}]
  }'
```

### 4. Clear Cache

```typescript
import { clearEnhancementCache } from "@/mastra/agents/query-enhancer-agent";
clearEnhancementCache();
```

### 5. Test with Known Good Query

Try asking: "Nyamande v Zuva Petroleum Supreme Court Zimbabwe"

This should work even without enhancement.

## Success Criteria

✅ Query enhancement produces relevant keywords
✅ Enhanced query reaches Tavily
✅ Tavily returns results from zimlii.org
✅ Entity extraction succeeds
✅ Synthesis produces response
✅ User sees case information

## Next Steps

1. **Add debug logging** - See what's actually happening
2. **Test enhancement directly** - Verify it's working
3. **Check Cerebras API** - Ensure it's responding
4. **Test full workflow** - End-to-end verification
5. **Review logs** - Identify exact failure point

## Hypothesis

Based on the evidence, the most likely issue is:

**Query enhancement is either:**

1. Not being called at all
2. Failing silently and using fallback
3. Producing poor enhancements due to Cerebras API issues
4. Being called but not used by the workflow

**The fix will likely be:**

1. Ensure query enhancer is called
2. Fix Cerebras API configuration
3. Improve error handling and logging
4. Verify enhanced query is used

---

**Status:** Root cause identified - Need debugging
**Tavily Status:** ✅ Working correctly
**Query Enhancement Status:** ⚠️ Suspected issue
**Next Action:** Add debug logging and test
