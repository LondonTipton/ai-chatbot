# Quick Fix Guide - Case Finding Issues

## Problem

Application not finding Zimbabwe legal cases (Zuva, Richard Chihoro, etc.)

## Confirmed

✅ Tavily CAN find these cases
✅ Code is correctly structured
⚠️ Something is preventing queries from working

## Quick Fixes to Try

### Fix 1: Add Debug Logging (5 minutes)

**File:** `mastra/agents/query-enhancer-agent.ts`

Add after line where `enhanced` is created:

```typescript
// Right after: const enhanced = result.text.trim();
console.log("🔍 [QUERY ENHANCER DEBUG]");
console.log("  Original:", query);
console.log("  Type:", detectedType);
console.log("  Enhanced:", enhanced);
console.log("  Context messages:", conversationHistory.length);
```

**File:** `mastra/workflows/basic-search-workflow.ts`

Add in the execute function:

```typescript
// Right after: const enhancedQuery = await enhanceSearchQuery(...)
console.log("🔍 [WORKFLOW DEBUG]");
console.log("  Original query:", query);
console.log("  Enhanced query:", enhancedQuery);
console.log("  Final Tavily query:", `${enhancedQuery} ${jurisdiction} law`);

// After search results
console.log("  Results found:", searchResults.results.length);
if (searchResults.results.length > 0) {
  console.log("  First result:", searchResults.results[0].title);
}
```

### Fix 2: Test Query Enhancement Directly (2 minutes)

Create file `test-query.ts` in project root:

```typescript
import { enhanceSearchQuery } from "./mastra/agents/query-enhancer-agent";

async function test() {
  console.log("Testing query enhancement...\n");

  const query = "what is the zuva case in zimbabwean labour law?";
  console.log("Original:", query);

  try {
    const enhanced = await enhanceSearchQuery(query, []);
    console.log("Enhanced:", enhanced);
    console.log("\n✅ Enhancement working!");
  } catch (error) {
    console.log("❌ Enhancement failed:", error);
  }
}

test();
```

Run:

```bash
npx tsx test-query.ts
```

**Expected output:**

```
Original: what is the zuva case in zimbabwean labour law?
Enhanced: zuva case Zimbabwe Supreme Court labour law employment judgment
✅ Enhancement working!
```

**If you see:**

```
❌ Enhancement failed: [error]
```

Then the issue is with Cerebras API or query enhancer configuration.

### Fix 3: Clear Cache (30 seconds)

The cache might have bad results. Add this to your application startup or run once:

```typescript
import { clearEnhancementCache } from "@/mastra/agents/query-enhancer-agent";
clearEnhancementCache();
console.log("✅ Cache cleared");
```

### Fix 4: Test with Direct Case Name (1 minute)

Try asking your application:

```
"Nyamande v Zuva Petroleum Supreme Court Zimbabwe"
```

This should work even without enhancement. If it doesn't work, the issue is deeper than query enhancement.

### Fix 5: Check Cerebras API Key (1 minute)

```bash
# Check if key is set
echo $CEREBRAS_API_KEY

# Should show a key starting with "csk-..."
# If empty, that's your problem!
```

If empty, add to `.env.local`:

```
CEREBRAS_API_KEY=your-key-here
```

### Fix 6: Bypass Enhancement Temporarily (2 minutes)

To test if enhancement is the issue, temporarily bypass it:

**File:** `mastra/workflows/basic-search-workflow.ts`

Change:

```typescript
const enhancedQuery = await enhanceSearchQuery(
  query,
  conversationHistory || []
);
```

To:

```typescript
// TEMPORARY: Bypass enhancement for testing
const enhancedQuery = `${query} Zimbabwe Supreme Court case law judgment`;
console.log("⚠️ USING MANUAL ENHANCEMENT:", enhancedQuery);
```

Test again. If it works now, the issue is definitely with query enhancement.

## What to Look For

### Good Signs ✅

```
🔍 [QUERY ENHANCER DEBUG]
  Original: what is the zuva case in zimbabwean labour law?
  Type: case
  Enhanced: zuva case Zimbabwe Supreme Court labour law employment judgment
  Context messages: 0

🔍 [WORKFLOW DEBUG]
  Original query: what is the zuva case in zimbabwean labour law?
  Enhanced query: zuva case Zimbabwe Supreme Court labour law employment judgment
  Final Tavily query: zuva case Zimbabwe Supreme Court labour law employment judgment Zimbabwe law
  Results found: 10
  First result: Nyamande & Another v ZUVA Petroleum (Pvt) Ltd
```

### Bad Signs ❌

**Sign 1: No enhancement logs**

```
🔍 [WORKFLOW DEBUG]
  Original query: what is the zuva case in zimbabwean labour law?
  Enhanced query: what is the zuva case in zimbabwean labour law? Zimbabwe
  Final Tavily query: what is the zuva case in zimbabwean labour law? Zimbabwe Zimbabwe law
  Results found: 0
```

**Problem:** Enhancement not working, using fallback

**Sign 2: Enhancement error**

```
❌ [Query Enhancer] Error: API timeout
```

**Problem:** Cerebras API issue

**Sign 3: No results**

```
  Results found: 0
```

**Problem:** Query not good enough or domain strategy issue

## Quick Diagnosis

Run this command and check output:

```bash
npm run dev
```

Then ask: "what is the zuva case in zimbabwean labour law?"

Look for these patterns in console:

| Pattern                          | Meaning                | Action                  |
| -------------------------------- | ---------------------- | ----------------------- |
| No enhancement logs              | Enhancement not called | Check workflow code     |
| Enhancement error                | Cerebras API issue     | Check API key           |
| Enhanced = Original + "Zimbabwe" | Enhancement failed     | Check Cerebras API      |
| Results found: 0                 | Query not working      | Check domain strategy   |
| Results found: 10+               | Query working!         | Check entity extraction |

## Most Likely Issues (Ranked)

### 1. Cerebras API Key Missing/Invalid (80% probability)

**Symptom:** Enhancement falls back to `query + "Zimbabwe"`
**Fix:** Set CEREBRAS_API_KEY in .env.local
**Test:** Run `echo $CEREBRAS_API_KEY`

### 2. Query Enhancement Not Being Called (10% probability)

**Symptom:** No enhancement logs at all
**Fix:** Verify workflows are calling enhanceSearchQuery()
**Test:** Add debug logging

### 3. Cache Has Bad Results (5% probability)

**Symptom:** Same bad result every time
**Fix:** Clear cache with clearEnhancementCache()
**Test:** Clear cache and try again

### 4. Domain Strategy Issue (3% probability)

**Symptom:** Results found but not from Zimbabwe domains
**Fix:** Check tavily-domain-strategy.ts
**Test:** Check result URLs

### 5. Entity Extraction Failing (2% probability)

**Symptom:** Results found but no response generated
**Fix:** Check entity extraction logs
**Test:** Look for extraction errors

## Emergency Workaround

If you need it working NOW, add this manual enhancement:

**File:** `mastra/workflows/basic-search-workflow.ts`

```typescript
// EMERGENCY WORKAROUND - Replace enhanceSearchQuery call with:
const enhancedQuery = query.toLowerCase().includes("zuva")
  ? "Nyamande Zuva Petroleum Supreme Court Zimbabwe labour law"
  : query.toLowerCase().includes("chihoro")
  ? "Richard Chihoro High Court Zimbabwe lower court judgment registration"
  : `${query} Zimbabwe Supreme Court case law`;

console.log("⚠️ USING MANUAL ENHANCEMENT:", enhancedQuery);
```

This will work for these specific cases while you debug the real issue.

## Next Steps

1. ✅ Add debug logging (Fix 1)
2. ✅ Test enhancement directly (Fix 2)
3. ✅ Check Cerebras API key (Fix 5)
4. ✅ Run application and check logs
5. ✅ Identify exact failure point
6. ✅ Apply appropriate fix

## Success Criteria

After fixes, you should see:

```
User: "what is the zuva case in zimbabwean labour law?"

Console:
🔍 [QUERY ENHANCER DEBUG]
  Enhanced: zuva case Zimbabwe Supreme Court labour law employment judgment
🔍 [WORKFLOW DEBUG]
  Results found: 10
  First result: Nyamande & Another v ZUVA Petroleum (Pvt) Ltd

User sees:
"The Zuva case refers to Nyamande & Another v Zuva Petroleum (Pvt) Ltd [2015] ZWSC 43..."
[Full detailed response]
```

---

**Time to fix:** 10-15 minutes
**Most likely issue:** Cerebras API key
**Quick test:** Run `npx tsx test-query.ts`
