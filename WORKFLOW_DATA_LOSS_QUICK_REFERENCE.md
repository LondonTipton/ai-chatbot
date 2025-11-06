# Quick Reference: Data Loss & Hallucination Issues

## 🔴 Critical Issues Summary

### Issue #1: Synthesizer Loses Data Structure

**Location:** `advanced-search-workflow.ts` lines 262-314

**Problem:**

```typescript
let synthesisPrompt = `Create comprehensive answer for Zimbabwe legal query: "${query}"
Search Results: ${JSON.stringify(results, null, 2)}
AI Answer: ${answer || "No answer generated"}`;
```

**Impact:**

- Model treats search results as one big text blob
- Loses semantic relationships between results
- Can't trace which fact came from which source
- Hallucination: Generates facts not in sources

---

### Issue #2: Fallback Returns Incomplete Data

**Location:** `advanced-search-workflow.ts` lines 324-334

**Problem:**

```typescript
catch (error) {
    const fallbackResponse = answer || "Unable to generate response";
    // ❌ Drops extracted content completely
    // ❌ Returns only raw search answer
    // ❌ Loses detailed context
}
```

**Impact:**

- User gets less info when synthesis fails
- Extracted URLs and content are discarded
- Error handling silently loses data

---

### Issue #3: Synthesizer Has No Grounding Rules

**Location:** `synthesizer-agent.ts` lines 15-35

**Problem:**

```typescript
instructions: `You MUST ALWAYS provide a complete, comprehensive text response.`;
// ❌ NO: "only use provided sources"
// ❌ NO: "validate citations"
// ❌ NO: "don't hallucinate"
```

**Impact:**

- Agent can add general knowledge beyond sources
- No constraint to prevent fabrication
- Can invent statute references and case names

---

### Issue #4: Chat Route Doesn't Use Message History

**Location:** `mastra-sdk-integration.ts` lines 140-145

**Problem:**

```typescript
const stream = await agent.stream(
  [{ role: "user", content: query }], // ❌ ONLY latest query
  { format: "aisdk", maxSteps: 15 }
);
// ❌ Full message history is fetched but not sent
// ❌ Agent has no conversation context
```

**Impact:**

- Agent treats each message independently
- Can contradict previous messages
- Loses conversation continuity

---

## 📊 Data Loss Flow

```
Advanced Search Workflow
└─ Search Results (answer + results[])
   ├─ Extract Step ✅ Preserves data
   └─ Synthesize Step 🔴 LOSES data
      ├─ Prompt: Text blob (loses structure)
      ├─ Synthesis: No grounding (generates freely)
      └─ Fallback: ❌ Incomplete response

Enhanced Comprehensive Workflow
└─ Research Context
   ├─ Initial Research ✅ Good
   ├─ Conditional Summarization ✅ Good
   ├─ Gap Analysis ✅ Good
   ├─ Enhance/Deep Dive ✅ Good
   ├─ Final Summarization ⚠️ Loses structure
   └─ Document Step
      ├─ Prompt: Text blob (loses structure)
      ├─ Synthesis: No grounding (generates freely)
      └─ Fallback: ❌ Raw summarized text
```

---

## 🎯 Where Hallucination Happens

### Hallucination Type 1: Fabricated Citations

```
Search result: "Contract law allows for damages"
Synthesizer generates: "Section 42(b) of the Contracts Act allows damages"
❌ Section 42(b) was NEVER in search results
```

### Hallucination Type 2: Invented Facts

```
Search result: "Remedies may include damages or specific performance"
Synthesizer generates: "The typical penalty is $5,000 or imprisonment"
❌ Specific penalty NOT in source
❌ Imprisonment NOT mentioned
```

### Hallucination Type 3: Lost Qualification

```
Search result: "Some argue that Section 5 may apply"
Synthesizer generates: "Section 5 clearly requires compliance"
❌ Lost the uncertainty
❌ Changed meaning
```

---

## ✅ Quick Fix Checklist

### Immediate Actions (Do Today)

- [ ] **Fix 1:** Update synthesizer prompt to enforce grounding

  - Add: "ONLY use information from provided sources"
  - Add: "Label each claim with its source URL"
  - Add: "Do NOT add information not explicitly provided"

- [ ] **Fix 2:** Update synthesizer agent instructions

  - Add explicit grounding rules
  - Add prohibition on general knowledge
  - Add citation requirement

- [ ] **Fix 3:** Improve fallback response
  - Instead of raw answer, return structured source list
  - Include URLs and snippets
  - Note that synthesis failed

### Short-term Actions (This Week)

- [ ] Create synthesis validator

  - Check for citations in response
  - Detect hallucinated statute references
  - Verify sources exist

- [ ] Add message history to chat route

  - Send full conversation to agent
  - Let agent maintain context

- [ ] Update enhanced comprehensive workflow
  - Improve synthesis prompt
  - Add structural labeling for sources

---

## 📝 One-Paragraph Summary

Your `advancedSearchWorkflow` loses data at multiple points: (1) the synthesizer step treats search results as unstructured text, losing semantic relationships; (2) the synthesizer agent has no constraints preventing it from generating content outside the provided sources; (3) error handling fallbacks return incomplete responses; (4) the chat route doesn't send message history to the agent. These issues combine to create hallucination because the model has freedom to invent facts while believing it's grounding them in sources that provide only vague guidance. The fix is to add explicit grounding rules, structured prompts that maintain source attribution, and data validation that detects and prevents hallucinated claims.

---

## 🔧 Implementation Difficulty

| Fix                | Difficulty | Impact | Time    |
| ------------------ | ---------- | ------ | ------- |
| Synthesizer prompt | Easy       | HIGH   | 30 min  |
| Agent instructions | Easy       | HIGH   | 30 min  |
| Fallback response  | Easy       | MEDIUM | 20 min  |
| Validator          | Medium     | MEDIUM | 2 hours |
| Message history    | Medium     | MEDIUM | 1 hour  |
| Enhanced workflow  | Hard       | LOW    | 2 hours |

**Total Time:** ~6 hours for all fixes

---

## 📚 Files Created/Modified

- ✅ `WORKFLOW_DATA_LOSS_ANALYSIS.md` - Full analysis with code samples
- ✅ `WORKFLOW_DATA_LOSS_QUICK_REFERENCE.md` - This file

---

## 🚀 Next Steps

1. Read `WORKFLOW_DATA_LOSS_ANALYSIS.md` for complete details
2. Start with Priority 1 fixes (Synthesizer prompt & instructions)
3. Test citation accuracy and hallucination detection
4. Deploy fixes incrementally
