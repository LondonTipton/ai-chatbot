# CRITICAL HALLUCINATION INCIDENT REPORT 🚨

**Date:** November 11, 2025  
**Severity:** CRITICAL  
**Status:** Mitigated (requires testing)

---

## Incident Summary

User asked: **"what additional case law can you add to support this position"**

The chat agent responded with **10 case citations**, of which **7 were completely fictitious**:

### Hallucinated Cases (7):

The agent provided:

- Fake ZimLII URLs (all returning 404)
- Fabricated case numbers
- Invented holdings and legal principles
- A complete "Quick Reference Table for Footnotes"
- Claims that cases were "verified against ZimLII"

**This is catastrophically dangerous behavior in a legal AI.**

---

## Root Cause Analysis

### Why Did This Happen?

1. **Agent Decision Failure**

   - User query routed to `chatAgent` (complexity: "medium" or "advanced")
   - Agent has `toolChoice: "auto"` (can choose whether to use tools)
   - Despite anti-hallucination instructions, agent chose to answer WITHOUT calling research tools

2. **Insufficient Instruction Strength**

   - Previous anti-hallucination rules were too mild
   - Agent interpreted "additional case law" as something it could answer from training
   - No explicit STEP-BY-STEP workflow for case law queries

3. **Training Data Contamination**
   - LLM training likely includes case law citation patterns
   - Model "knows" how to format legal citations realistically
   - Zimbabwe case law is poorly represented, so model fills gaps with plausible-sounding fakes

---

## Consequences of This Error

If these citations were used in actual legal filings:

### Professional Liability

- ⚖️ Lawyer could be **sanctioned** by the Law Society of Zimbabwe
- ⚖️ Potential **disbarment** for citing fake cases
- ⚖️ **Malpractice lawsuits** from clients
- ⚖️ **Contempt of court** charges

### Real-World Precedent

- **Mata v. Avianca (2023, USA)**: Lawyer fined $5,000 for citing ChatGPT hallucinations
- **Multiple bar complaints** nationwide for AI-generated fake citations
- **Courts issuing orders** requiring lawyers to verify AI-generated research

### Reputational Damage

- Loss of client trust
- Professional credibility destroyed
- Firm reputation damaged

---

## Mitigation Steps Taken

### 1. Strengthened Anti-Hallucination Rules

**File:** `mastra/agents/chat-agent.ts`

Added **MUCH MORE EXPLICIT** instructions:

```typescript
⛔ ABSOLUTE PROHIBITION - NEVER DO THESE UNDER ANY CIRCUMSTANCES:

1. ❌ NEVER cite case names from your training data
2. ❌ NEVER invent case citations, case numbers, or ZimLII URLs
3. ❌ NEVER provide specific case law without FIRST using research tools
4. ❌ NEVER make up judges' names, court dates, or holdings
5. ❌ NEVER create fake legal references or statutory citations
6. ❌ NEVER cite "verified" cases unless they came from a research tool

🔴 CRITICAL RULE FOR CASE LAW QUERIES:

STEP 1: Call deepResearch tool FIRST
STEP 2: Wait for tool results
STEP 3: ONLY cite cases that appear in the tool results
STEP 4: If tool finds no cases, say "I couldn't find specific cases on this topic"

DO NOT answer with cases from your training data.
DO NOT skip the research tool.
DO NOT assume you "already know" the cases.
```

### 2. Special Rule for "Additional Case Law" Queries

Added explicit trigger phrases:

```typescript
🔴 SPECIAL RULE FOR "ADDITIONAL CASE LAW" QUERIES:

If user says ANY of these phrases:
- "What additional case law..."
- "Find more cases..."
- "What other precedents..."
- "Cite supporting authorities..."
- "What cases support..."

→ YOU MUST call deepResearch tool IMMEDIATELY
→ DO NOT answer from your training data
→ DO NOT assume you know the cases
→ WAIT for tool results before responding
```

### 3. Added Consequence Warnings

```typescript
🚨 CONSEQUENCE OF VIOLATING THESE RULES:

Hallucinating case law is EXTREMELY DANGEROUS and can:
- Cause lawyers to be sanctioned or disbarred
- Lead to malpractice lawsuits
- Waste court time with fake citations
- Destroy professional credibility
- Result in contempt of court charges
```

---

## Testing Required

### 1. Restart Development Server

```bash
# Stop current server (Ctrl+C)
pnpm dev
```

### 2. Test the Exact Same Query

```
User: "what additional case law can you add to support this position"
```

**Expected Behavior:**

1. ✅ Agent calls `deepResearch` tool
2. ✅ Agent waits for tool results
3. ✅ Agent ONLY cites cases from tool results
4. ✅ If no cases found, agent says "I couldn't find specific cases"

**Failure Mode:**

1. ❌ Agent responds with case names WITHOUT calling tool
2. ❌ Agent cites cases from training data
3. ❌ Agent provides ZimLII URLs without searching

### 3. Additional Test Cases

Test these queries to ensure tool usage:

```
✅ "Find cases about property rights in Zimbabwe"
✅ "What precedents exist for contract disputes?"
✅ "Cite authorities supporting this legal principle"
✅ "Are there any Supreme Court decisions on this?"
✅ "What other cases are relevant?"
```

All should trigger `deepResearch` tool call.

---

## Alternative Solutions (If This Doesn't Work)

### Option 1: Force Tool Usage for Case Law Queries

Modify complexity detector to route ALL case law queries to `searchAgent` (which forces tool execution):

```typescript
// lib/ai/complexity-detector.ts
if (query.match(/case law|precedent|cite|authorities|cases about/i)) {
  return {
    complexity: "deep", // Forces searchAgent (mandatory tools)
    reasoning: "Case law query requires mandatory research",
  };
}
```

### Option 2: Add Post-Processing Filter

Add a safety check that rejects responses containing case citations without tool usage:

```typescript
// After agent response
if (response.includes("[20") && !toolWasUsed) {
  throw new Error("BLOCKED: Attempted to cite cases without research");
}
```

### Option 3: Use Different Agent for Case Law

Create a dedicated `caseLawAgent` that:

- Has NO autonomy (toolChoice: "required")
- MUST call research tools
- Cannot answer directly

---

## Long-Term Solutions

### 1. Retrieval-Augmented Generation (RAG)

- Index verified Zimbabwe case law database
- Force agent to ONLY cite from indexed cases
- Impossible to hallucinate cases not in database

### 2. Citation Verification Layer

- After agent response, extract all citations
- Verify against ZimLII API or database
- Block response if any citation is unverified

### 3. Separate Research and Drafting

- Research agent: ONLY searches, returns raw results
- Drafting agent: ONLY formats, cannot add citations

### 4. Human-in-the-Loop

- Flag all case citations for human review
- Require lawyer approval before displaying
- Log all citations for audit trail

---

## Monitoring and Detection

### How to Detect Future Hallucinations

1. **Check for tool usage logs**

   ```
   Look for: "[chat-agent] Called deepResearch tool"
   Missing? → Agent answered without research
   ```

2. **Verify ZimLII URLs**

   ```bash
   # All ZimLII URLs should be reachable
   curl -I https://zimlii.org/akn/zw/judgment/...
   # Should return 200, not 404
   ```

3. **Pattern detection**
   ```
   Red flags:
   - "[YYYY] ZWHHC XX" format without tool usage
   - Multiple case citations in quick succession
   - "Verified against ZimLII" claims
   ```

---

## Files Modified

1. ✅ `mastra/agents/chat-agent.ts` - Strengthened anti-hallucination rules
2. ✅ `ANTI_HALLUCINATION_FIX.md` - Previous fix documentation
3. ✅ `CRITICAL_HALLUCINATION_INCIDENT.md` - This incident report

---

## Action Items

- [ ] **IMMEDIATE**: Restart dev server and test the same query
- [ ] **HIGH**: Verify agent now calls `deepResearch` for case law queries
- [ ] **HIGH**: Test multiple case law query variations
- [ ] **MEDIUM**: Consider implementing Option 1 (force searchAgent for case law)
- [ ] **MEDIUM**: Add citation verification layer
- [ ] **LOW**: Implement RAG with verified case law database
- [ ] **ONGOING**: Monitor all case citations for accuracy

---

## Status

**Current Status:** Mitigated (instructions strengthened, requires testing)

**Next Steps:**

1. User must restart server
2. Test with same query
3. Report whether agent now uses tools

**If hallucinations persist:** Implement Option 1 (force searchAgent routing)

---

## Lessons Learned

1. **Instructions alone are insufficient** - LLMs can ignore instructions, especially when they "know" plausible answers
2. **Autonomous tool choice is risky** - For critical tasks like case law, force tool usage
3. **Legal AI requires special safeguards** - Citation verification, RAG, human review
4. **Testing is crucial** - Need comprehensive test suite for hallucination detection
5. **Defense in depth** - Multiple layers: instructions + routing + verification + RAG

---

**Remember:** In legal AI, a single hallucinated citation can destroy careers, waste court resources, and undermine the entire system. This is not a "nice to have" fix - it's a **critical safety requirement**.
