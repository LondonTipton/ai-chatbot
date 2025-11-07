# Debug Query Enhancement - Step by Step Guide

## Problem

User query: "what is the zuva case in zimbabwean labour law?"
Result: No information found

## Tavily Test Results

✅ Tavily CAN find the case with proper queries
✅ Code is correctly using `enhancedQuery`
⚠️ Need to verify what's actually happening

## Debugging Steps

### Step 1: Check What Query Enhancement Produces

Add this temporary logging to `mastra/agents/query-enhancer-agent.ts`:

```typescript
export async function enhanceSearchQuery(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  options: {
    maxContextMessages?: number;
    useCache?: boolean;
    queryType?: "case" | "statute" | "general" | "auto";
  } = {}
): Promise<string> {
  // ADD THIS AT THE START
  console.log("=".repeat(80));
  console.log("[Query Enhancer] DEBUG START");
  console.log("[Query Enhancer] Input query:", query);
  console.log(
    "[Query Enhancer] Conversation history length:",
    conversationHistory.length
  );
  console.log("[Query Enhancer] Options:", options);

  // ... existing code ...

  // BEFORE RETURN, ADD THIS
  console.log("[Query Enhancer] Final enhanced query:", enhanced);
  console.log("[Query Enhancer] DEBUG END");
  console.log("=".repeat(80));

  return enhanced;
}
```

### Step 2: Check What Tavily Receives

Add this logging to `mastra/workflows/basic-search-workflow.ts`:

```typescript
execute: async ({ inputData, runtimeContext }) => {
  const { query, jurisdiction, conversationHistory } = inputData;

  try {
    // ADD THIS
    console.log("=".repeat(80));
    console.log("[Basic Search] DEBUG START");
    console.log("[Basic Search] Original query:", query);
    console.log("[Basic Search] Jurisdiction:", jurisdiction);
    console.log("[Basic Search] History length:", conversationHistory?.length || 0);

    // Enhance query using LLM with conversation context
    const enhancedQuery = await enhanceSearchQuery(
      query,
      conversationHistory || []
    );

    // ADD THIS
    console.log("[Basic Search] Enhanced query:", enhancedQuery);
    console.log("[Basic Search] Final Tavily query:", `${enhancedQuery} ${jurisdiction} law`);
    console.log("[Basic Search] DEBUG END");
    console.log("=".repeat(80));

    // Execute search with enhanced query
    const searchResults = await tavilySearchTool.execute({
      context: {
        query: `${enhancedQuery} ${jurisdiction} law`,
        // ... rest of config
```

### Step 3: Test Directly

Create a test file `test-query-enhancement.ts`:

```typescript
import { enhanceSearchQuery } from "./mastra/agents/query-enhancer-agent";

async function testEnhancement() {
  console.log("Testing Query Enhancement...\n");

  const testCases = [
    {
      query: "what is the zuva case in zimbabwean labour law?",
      history: [],
      expected:
        "Should include: zuva, case, Zimbabwe, Supreme Court, labour, employment",
    },
    {
      query: "what is the zuva case?",
      history: [
        { role: "user", content: "Tell me about Zimbabwe labour law" },
        { role: "assistant", content: "Zimbabwe labour law..." },
      ],
      expected: "Should include context from labour law discussion",
    },
    {
      query: "tell me about the zuva case",
      history: [],
      expected: "Should include: zuva, case, Zimbabwe, Supreme Court",
    },
  ];

  for (const test of testCases) {
    console.log("=".repeat(80));
    console.log("Test Query:", test.query);
    console.log("History:", test.history.length, "messages");
    console.log("Expected:", test.expected);
    console.log("-".repeat(80));

    try {
      const enhanced = await enhanceSearchQuery(test.query, test.history);
      console.log("Enhanced:", enhanced);
      console.log("✅ Success");
    } catch (error) {
      console.log("❌ Error:", error);
    }
    console.log("\n");
  }
}

testEnhancement();
```

Run with:

```bash
npx tsx test-query-enhancement.ts
```

### Step 4: Check Cerebras API

The query enhancer uses Cerebras. Check if:

1. **API Key is valid**

   ```bash
   echo $CEREBRAS_API_KEY
   ```

2. **API is responding**

   - Check Cerebras dashboard for API calls
   - Look for rate limiting or errors

3. **Model is available**
   - Verify `llama-3.3-70b` is accessible
   - Check for model deprecation notices

### Step 5: Test Tavily Directly

Create `test-tavily-direct.ts`:

```typescript
import { mcp_tavily_tavily_search } from "./path/to/tavily";

async function testTavily() {
  const queries = [
    "what is the zuva case in zimbabwean labour law?",
    "zuva case zimbabwe labour law",
    "Nyamande Zuva Petroleum Zimbabwe Supreme Court",
  ];

  for (const query of queries) {
    console.log("=".repeat(80));
    console.log("Testing query:", query);
    console.log("-".repeat(80));

    const results = await mcp_tavily_tavily_search({
      query,
      max_results: 5,
      search_depth: "advanced",
    });

    console.log("Results found:", results.length);
    if (results.length > 0) {
      console.log("Top result:", results[0].title);
      console.log("URL:", results[0].url);
    }
    console.log("\n");
  }
}

testTavily();
```

## Expected Outputs

### Good Enhancement

```
[Query Enhancer] Original: "what is the zuva case in zimbabwean labour law?"
[Query Enhancer] Type: case
[Query Enhancer] Enhanced: "zuva case Zimbabwe Supreme Court labour law employment judgment"
[Basic Search] Final Tavily query: "zuva case Zimbabwe Supreme Court labour law employment judgment Zimbabwe law"
```

### Bad Enhancement (Fallback)

```
[Query Enhancer] Original: "what is the zuva case in zimbabwean labour law?"
[Query Enhancer] Error: [some error]
[Query Enhancer] Enhanced: "what is the zuva case in zimbabwean labour law? Zimbabwe"
[Basic Search] Final Tavily query: "what is the zuva case in zimbabwean labour law? Zimbabwe Zimbabwe law"
```

## Common Issues & Solutions

### Issue 1: Empty Conversation History

**Symptom:**

```
[Query Enhancer] Conversation history length: 0
```

**Cause:** First message in conversation

**Solution:** Enhancement should still work, just without context

**Expected Enhancement:**

```
"zuva case Zimbabwe Supreme Court labour law judgment"
```

### Issue 2: Cerebras API Error

**Symptom:**

```
[Query Enhancer] Error: API key invalid
```

**Cause:** Cerebras API key issue

**Solution:**

1. Check API key in environment
2. Verify key is valid
3. Check Cerebras dashboard

### Issue 3: Poor Enhancement

**Symptom:**

```
[Query Enhancer] Enhanced: "what is the zuva case in zimbabwean labour law? Zimbabwe"
```

**Cause:** LLM not adding keywords

**Solution:**

1. Check query enhancer agent instructions
2. Verify model is responding correctly
3. Test with different queries

### Issue 4: Cache Returning Bad Result

**Symptom:** Same bad result every time

**Cause:** Bad enhancement cached

**Solution:**

```typescript
import { clearEnhancementCache } from "@/mastra/agents/query-enhancer-agent";
clearEnhancementCache();
```

### Issue 5: Domain Strategy Not Working

**Symptom:** Results found but not from Zimbabwe domains

**Cause:** Domain strategy configuration

**Solution:** Check `tavily-domain-strategy.ts` configuration

## Quick Test Commands

### Test 1: Direct Tavily (Should Work)

```bash
# This should find the case
curl -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "zuva case zimbabwe labour law",
    "max_results": 5
  }'
```

### Test 2: Query Enhancement

```bash
# Run the test script
npx tsx test-query-enhancement.ts
```

### Test 3: Full Workflow

```bash
# Test the complete workflow
npm run dev
# Then ask: "what is the zuva case in zimbabwean labour law?"
# Check console logs
```

## What to Look For

### In Logs

1. ✅ `[Query Enhancer] Enhanced:` - Should show enhanced query
2. ✅ `[Basic Search] Final Tavily query:` - Should show what Tavily receives
3. ✅ `[Tavily Search] Results:` - Should show number of results
4. ❌ `[Query Enhancer] Error:` - Indicates enhancement failed
5. ❌ `[Query Enhancer] Invalid output` - Indicates bad enhancement

### In Results

1. ✅ Results from zimlii.org, saflii.org
2. ✅ "Nyamande" and "Zuva Petroleum" in titles
3. ✅ "Supreme Court" mentioned
4. ❌ No results or generic results
5. ❌ Results not about the case

## Next Steps Based on Findings

### If Enhancement is Working

- Check Tavily configuration
- Verify domain strategy
- Check result filtering

### If Enhancement is Failing

- Check Cerebras API
- Verify agent instructions
- Test with simpler queries

### If Tavily is Not Finding Results

- Check domain strategy
- Verify Zimbabwe domains included
- Test with direct Tavily API

## Success Criteria

✅ Query enhancement produces: "zuva case Zimbabwe Supreme Court labour law employment judgment"
✅ Tavily receives enhanced query
✅ Tavily returns results from zimlii.org
✅ Results include Nyamande v Zuva Petroleum
✅ User sees case information

---

**Status:** Debugging Guide Complete
**Next Action:** Add debug logging and test
**Expected Outcome:** Identify why enhancement isn't working in production
