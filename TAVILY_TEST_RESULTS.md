# Tavily Test Results - Zuva Case

## Test Date

November 7, 2025

## Problem

User asked: "what is the zuva case in zimbabwean labour law?"
Application response: Unable to retrieve information

## Hypothesis

Either:

1. Query enhancement not working properly
2. Workflow not using enhanced query
3. Tavily search configuration issue

## Direct Tavily Tests

### Test 1: Basic Query

**Query:** `zuva case zimbabwe labour law`
**Result:** ✅ **SUCCESS** - Found multiple results

**Key Findings:**

1. **Nyamande & Another v ZUVA Petroleum (Pvt) Ltd** - SC 43/2015
2. Full judgment available on ZimLII
3. Multiple academic articles about the case
4. Case triggered Labour Act amendments in 2015

### Test 2: Specific Query

**Query:** `Nyamande Zuva Petroleum Supreme Court Zimbabwe 2015`
**Result:** ✅ **SUCCESS** - Found exact case

**Top Result:**

- **Title:** Nyamande & Another v ZUVA Petroleum (Pvt) Ltd (Civil Appeal SC 281 of 2014; SC 43 of 2015)
- **URL:** https://zimlii.org/akn/zw/judgment/zwsc/2015/43/eng@2015-07-16
- **Citation:** ZWSC 43 (16 July 2015)
- **Court:** Supreme Court of Zimbabwe
- **Judges:** CHIDYAUSIKU CJ, GWAUNZA JA, GARWE JA, HLATSHWAYO JA & GUVAVA JA

## Conclusion

**Tavily CAN find the Zuva case!** ✅

The problem is NOT with Tavily. The issue is likely:

1. **Query Enhancement Not Applied** - The enhanced query might not be reaching Tavily
2. **Workflow Configuration** - The workflow might not be using the enhanced query
3. **Domain Strategy** - Zimbabwe domains might not be prioritized correctly

## What Should Happen

### User Query

```
"what is the zuva case in zimbabwean labour law?"
```

### Expected Enhancement

```
"zuva case Zimbabwe Supreme Court labour law employment judgment"
```

### Expected Tavily Query

```
"zuva case Zimbabwe Supreme Court labour law employment judgment Zimbabwe"
```

### Expected Result

✅ Should find Nyamande v Zuva Petroleum [2015] ZWSC 43

## Debugging Steps

### 1. Check Query Enhancement Logs

Look for these log messages:

```
[Query Enhancer] Original: "what is the zuva case in zimbabwean labour law?"
[Query Enhancer] Type: case
[Query Enhancer] Enhanced: "..."
```

### 2. Check Workflow Execution

Look for these log messages:

```
[Basic Search Workflow] Using enhanced query: "..."
[Advanced Search Workflow] Using enhanced query: "..."
```

### 3. Check Tavily Search

Look for the actual query sent to Tavily:

```
[Tavily Search] Query: "..."
[Tavily Search] Results: X
```

## Possible Issues

### Issue 1: Query Enhancement Not Running

**Symptom:** No enhancement logs
**Cause:** Query enhancer not being called
**Fix:** Verify workflows are calling `enhanceSearchQuery()`

### Issue 2: Enhanced Query Not Used

**Symptom:** Enhancement logs present, but Tavily gets original query
**Cause:** Workflow using `query` instead of `enhancedQuery`
**Fix:** Check workflow code uses `enhancedQuery` variable

### Issue 3: Conversation History Empty

**Symptom:** Enhancement produces generic result
**Cause:** No conversation history passed to enhancer
**Fix:** Verify chat route extracts and passes history

### Issue 4: Cache Returning Wrong Result

**Symptom:** Same wrong result every time
**Cause:** Bad result cached
**Fix:** Clear cache with `clearEnhancementCache()`

## Recommended Actions

### Immediate

1. Check application logs for query enhancement
2. Verify enhanced query is being used
3. Test with cache disabled
4. Check domain strategy configuration

### Short-term

1. Add more detailed logging
2. Add query enhancement success tracking
3. Monitor Tavily query patterns
4. Test with various query formats

### Long-term

1. Implement query enhancement quality metrics
2. Add A/B testing for enhancement strategies
3. Create dashboard for monitoring
4. Implement user feedback loop

## Test Queries That Work

These queries successfully find the Zuva case in Tavily:

1. ✅ `zuva case zimbabwe labour law`
2. ✅ `Nyamande Zuva Petroleum Supreme Court Zimbabwe 2015`
3. ✅ `Nyamande Zuva Petroleum Zimbabwe`
4. ✅ `SC 43/15 Zimbabwe Supreme Court`
5. ✅ `zuva petroleum case zimbabwe`

## Test Queries That Might Fail

These queries might not work without enhancement:

1. ❌ `what is the zuva case?` (too vague)
2. ❌ `the zuva case` (too short)
3. ❌ `zuva` (too generic)
4. ❌ `that 2015 case` (no context)

## Expected Enhancement Examples

| Original Query                                    | Expected Enhancement                                              | Should Find Case? |
| ------------------------------------------------- | ----------------------------------------------------------------- | ----------------- |
| "what is the zuva case in zimbabwean labour law?" | "zuva case Zimbabwe Supreme Court labour law employment judgment" | ✅ Yes            |
| "tell me about the zuva case"                     | "zuva case Zimbabwe Supreme Court employment judgment"            | ✅ Yes            |
| "what about zuva?"                                | "zuva Zimbabwe Supreme Court case law judgment"                   | ✅ Yes            |
| "the 2015 case"                                   | "2015 case Zimbabwe Supreme Court judgment"                       | ⚠️ Maybe          |

## Next Steps

1. **Enable Debug Logging**

   ```typescript
   // In query-enhancer-agent.ts
   console.log("[Query Enhancer] DEBUG:", {
     original: query,
     type: detectedType,
     enhanced: enhanced,
     contextMessages: conversationHistory.length,
   });
   ```

2. **Test Enhancement Directly**

   ```typescript
   import { enhanceSearchQuery } from "@/mastra/agents/query-enhancer-agent";

   const enhanced = await enhanceSearchQuery(
     "what is the zuva case in zimbabwean labour law?",
     []
   );
   console.log("Enhanced:", enhanced);
   ```

3. **Test Workflow Directly**

   ```typescript
   const result = await basicSearchWorkflow.execute({
     inputData: {
       query: "what is the zuva case in zimbabwean labour law?",
       jurisdiction: "Zimbabwe",
       conversationHistory: [],
     },
   });
   ```

4. **Check Tavily Configuration**
   - Verify domain strategy is "prioritized"
   - Check Zimbabwe domains are included
   - Verify maxResults is sufficient (20+)

## Conclusion

**The query enhancement system is working correctly in theory**, but there may be an implementation issue preventing it from being applied in practice.

**Action Required:** Debug the actual application to see:

1. Is query enhancement being called?
2. Is the enhanced query being used?
3. What query is actually sent to Tavily?

**Expected Outcome:** Once debugging is complete, the application should successfully find the Zuva case for the query "what is the zuva case in zimbabwean labour law?"

---

**Status:** Investigation Complete
**Tavily Status:** ✅ Working
**Query Enhancement Status:** ⚠️ Needs Verification
**Next Step:** Debug application logs
