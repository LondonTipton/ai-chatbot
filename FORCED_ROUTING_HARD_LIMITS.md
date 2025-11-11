# FORCED ROUTING + HARD LIMITS FOR CASE LAW 🚨

**Date:** November 11, 2025  
**Status:** Implemented - REQUIRES TESTING  
**Severity:** CRITICAL FIX

---

## The Problem (Still Occurring After Previous Fix)

User asked: **"what additional case law can you add to support this position"**

Despite strengthened anti-hallucination instructions, the agent:

- ❌ Still hallucinated **10 cases** (7 fake)
- ❌ Created detailed tables with ZimLII URLs
- ❌ Claimed cases were "verified"
- ❌ Did NOT use research tools

**Root Cause:** Instructions alone are insufficient. LLMs can ignore instructions when they "know" plausible answers.

---

## Two-Pronged Solution

### 1. **FORCED ROUTING** (Complexity Detector)

**File:** `lib/ai/complexity-detector.ts`

Added **40+ trigger phrases** that FORCE routing to `workflow-caselaw`:

```typescript
const caseLawIndicators = [
  // Explicit case law requests
  "case law",
  "cases about",
  "cases on",
  "find cases",
  "cite cases",
  "precedent",
  "precedents",
  "judicial decisions",
  "court decisions",

  // Additional/supporting case law (CRITICAL - catches hallucination trigger)
  "additional case law", // ← THE EXACT PHRASE USER USED
  "additional cases",
  "more cases",
  "other cases",
  "supporting case law",
  "supporting cases",
  "what cases",
  "which cases",
  "any cases",
  "relevant cases",

  // Case comparison and analysis
  "compare cases",
  "compare precedent",
  "analyze precedent",
  "case law comparison",
  "compare holdings",
  "precedent analysis",

  // Citation requests
  "cite authorities",
  "cite sources",
  "provide citations",
  "legal authorities",
  "authorities supporting",

  // Verification requests
  "verify case law",
  "verified cases",
  "check case law",
];
```

**What This Does:**

- Routes "additional case law" queries to `complexity: "workflow-caselaw"`
- `workflow-caselaw` uses `searchAgent` which has `toolChoice: "required"` (NO AUTONOMY)
- Agent MUST use tools, cannot answer from training data

### 2. **HARD LIMITS** (Chat Agent Instructions)

**File:** `mastra/agents/chat-agent.ts`

Added explicit numerical limits based on search tool capabilities:

```typescript
🚫 HARD LIMIT: MAXIMUM 3-5 CASE CITATIONS

Search tools return 5-10 results. Of those, typically only 3-5 are actual cases.
If you're citing more than 5 cases, you're hallucinating.

CORRECT: Citing 2-4 cases from tool results
WRONG: Citing 7-10 cases (impossible from search tools)

⛔ ABSOLUTE PROHIBITIONS:
7. ❌ NEVER cite more than 5 cases total (search tools return 5-10 results max)
8. ❌ NEVER create tables of 7-10 cases (physically impossible from search results)
```

---

## How Search Tools Work (Verification)

### Search Tool Limits

| Tool               | Max Results | Typical Cases | Notes                            |
| ------------------ | ----------- | ------------- | -------------------------------- |
| `quickFactSearch`  | 5           | 1-3           | Basic search, 1 API call         |
| `standardResearch` | 7           | 2-4           | 2-3 searches aggregated          |
| `deepResearch`     | 10          | 3-5           | 4-5 searches, includes full text |

**Reality Check:**

- Tavily API returns 5-20 results per call
- Not all results are cases (some are articles, blog posts, etc.)
- Typical case law query finds 2-5 actual cases
- **Citing 10 cases is PHYSICALLY IMPOSSIBLE** from a single tool call

---

## Why This Should Work

### Before (Failed Approach)

```
User Query → Complexity: "medium" → chatAgent → toolChoice: "auto"
                                      ↓
                          Agent decides: "I know cases!"
                                      ↓
                          Responds without tools → HALLUCINATION
```

### After (Forced Approach)

```
User: "additional case law" → Complexity Detector matches "additional case law"
                              ↓
                         complexity: "workflow-caselaw"
                              ↓
                         Routes to searchAgent
                              ↓
                         toolChoice: "required" (NO AUTONOMY)
                              ↓
                         MUST call Tavily search
                              ↓
                         ONLY cites from search results (max 3-5 cases)
```

---

## Testing Instructions

### 1. Restart Development Server

```bash
# Stop current server (Ctrl+C)
pnpm dev
```

### 2. Test the EXACT Query That Failed

```
User: "what additional case law can you add to support this position"
```

**Expected Behavior:**

1. ✅ System logs: `[Complexity] ✅ Detected: workflow-caselaw`
2. ✅ Uses `searchAgent` with forced tool execution
3. ✅ Calls `tavilySearchAdvancedTool`
4. ✅ Cites ONLY 2-5 cases from tool results
5. ✅ All URLs are real and reachable

**Failure Indicators:**

1. ❌ Routes to `chatAgent` instead of `workflow-caselaw`
2. ❌ Cites more than 5 cases
3. ❌ Creates tables with 7-10 cases
4. ❌ Claims cases are "verified against ZimLII" without searching

### 3. Additional Test Cases

All of these should trigger forced routing:

```bash
✅ "Find additional cases supporting this argument"
✅ "What other precedents exist?"
✅ "Cite authorities for this legal principle"
✅ "Which cases support this position?"
✅ "What case law applies to this situation?"
```

### 4. Verify Routing Logs

Check terminal for:

```
[Complexity] 🔍 Analyzing query complexity...
[Complexity] ✅ Detected: workflow-caselaw  ← MUST SEE THIS
[Complexity] Reasoning: Requires case law analysis workflow with comparison
```

If you see `chatAgent` instead of `workflow-caselaw`, the routing failed.

---

## Files Modified

### 1. `lib/ai/complexity-detector.ts`

- Added 40+ case law trigger phrases
- Catches "additional case law", "supporting cases", etc.
- Forces routing to `workflow-caselaw` (mandatory tool usage)

### 2. `mastra/agents/chat-agent.ts`

- Added "HARD LIMIT: MAXIMUM 3-5 CASE CITATIONS"
- Added prohibition against citing 7-10 cases
- Explained physical limits of search tools
- Emphasized agent hallucinated 10 cases (impossible)

---

## Monitoring and Verification

### How to Verify Fix Worked

1. **Check complexity detection:**

   ```
   Look for: [Complexity] ✅ Detected: workflow-caselaw
   ```

2. **Check agent selection:**

   ```
   Look for: [Mastra SDK] Using searchAgent (not chatAgent)
   ```

3. **Check tool usage:**

   ```
   Look for: [Tavily Advanced] Query: ...
   Look for: [Tavily Advanced] Results found: 5-10
   ```

4. **Check response:**
   - Count case citations (should be ≤5)
   - Verify all URLs are reachable
   - Check if cases exist on ZimLII

### Red Flags

If you see ANY of these, the fix didn't work:

- ❌ `[Complexity] ✅ Detected: medium` (should be workflow-caselaw)
- ❌ `Using chatAgent` instead of `searchAgent`
- ❌ NO Tavily search logs
- ❌ More than 5 cases cited
- ❌ Detailed tables with 10 cases
- ❌ Claims of "verified against ZimLII" without search

---

## Fallback Plan (If This Still Doesn't Work)

### Option 1: Post-Processing Filter

Add validation AFTER agent response:

```typescript
// In mastra-sdk-integration.ts
if (response.includes("[20") && response.match(/\[20\d{2}\]/g).length > 5) {
  throw new Error("BLOCKED: Cited more than 5 cases (hallucination detected)");
}
```

### Option 2: Disable chatAgent for Case Law Entirely

```typescript
// In selectAgentForComplexity()
case "medium":
case "advanced":
  if (query.match(/case law|precedent|additional cases/i)) {
    return "searchAgent"; // Force tool usage, no autonomy
  }
  return "chatAgent";
```

### Option 3: RAG with Verified Case Database

- Index Zimbabwe case law from ZimLII
- Agent can ONLY cite from indexed cases
- Impossible to hallucinate non-existent cases

---

## Success Criteria

✅ **Fix is successful if:**

1. "additional case law" query routes to `workflow-caselaw`
2. Agent uses `tavilySearchAdvancedTool`
3. Agent cites 2-5 cases maximum
4. All cited cases are from search results
5. All ZimLII URLs are reachable

❌ **Fix failed if:**

1. Routes to `chatAgent` instead
2. Cites more than 5 cases
3. Creates tables with 10 cases
4. Cites cases without searching

---

## Related Files

- `CRITICAL_HALLUCINATION_INCIDENT.md` - Initial incident report
- `ANTI_HALLUCINATION_FIX.md` - First fix attempt (instructions only - FAILED)
- `FORCED_ROUTING_HARD_LIMITS.md` - This document (forced routing + limits)

---

## Next Steps

1. ✅ **DONE**: Added 40+ triggers to complexity detector
2. ✅ **DONE**: Added hard limits to chat agent instructions
3. ⏳ **PENDING**: User must restart server and test
4. ⏳ **PENDING**: Verify routing to `workflow-caselaw`
5. ⏳ **PENDING**: Verify tool usage and case count ≤5
6. ⏳ **PENDING**: If still fails, implement Option 1 (post-processing filter)

---

**CRITICAL:** Instructions alone cannot prevent hallucinations. We need:

1. **Forced routing** (complexity detector)
2. **Forced tool usage** (searchAgent with toolChoice: "required")
3. **Hard limits** (max 3-5 cases)
4. **Validation** (post-processing if needed)

This is a **defense-in-depth** approach. If LLMs could be controlled with instructions alone, we wouldn't need tools.
