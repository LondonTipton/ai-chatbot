# Citation Validation Solutions

## Current Problem

User reports: "it got better but there are still some incorrect references"

After implementing forced routing (40+ triggers → workflow-caselaw → searchAgent), the system routes queries correctly, but the citations themselves still have quality issues.

## Solution Options (Ranked)

---

### ⭐ **Option 1: Post-Processing Citation Validator** (RECOMMENDED)

**Status**: Implementation file created (`lib/citation-validator.ts`)

#### How It Works:

1. After agent generates response, validate BEFORE displaying to user
2. Check for violations:
   - Citations without tool usage (hallucination)
   - Too many citations (>5 = impossible)
   - Known hallucinated cases
   - Suspicious patterns (large tables, verification claims without tools)
3. Block response if violations detected
4. Return safe error message asking user to rephrase

#### Pros:

- ✅ Works with ANY agent (chatAgent, searchAgent, workflows)
- ✅ Catches hallucinations AFTER generation
- ✅ No model changes needed
- ✅ Can detect known-bad patterns
- ✅ Easy to add new rules

#### Cons:

- ❌ Blocks response after already generated (wasted tokens)
- ❌ User experience: error after waiting
- ❌ Cannot fix slightly wrong citations, only block entirely

#### Implementation:

```typescript
// In chat route onFinish callback:
import {
  validateCitations,
  getSafeCitationErrorResponse,
} from "@/lib/citation-validator";

const hasToolUsage = messages.some((msg) =>
  msg.parts?.some((part) => part.type === "tool-call")
);

const response = assistantMessages[0].content;
const validation = validateCitations(response, hasToolUsage);

if (!validation.isValid) {
  // Block the response, return safe message
  return getSafeCitationErrorResponse();
}
```

---

### 🔒 **Option 2: Force Tool Usage for ALL Queries**

**Status**: Not implemented

#### How It Works:

1. Change chatAgent from `toolChoice: "auto"` → `toolChoice: "required"`
2. Agent MUST call a tool for every query
3. If no research needed, agent calls a "generalResponse" tool
4. No direct answers = no hallucinations

#### Pros:

- ✅ 100% prevents no-tool hallucinations
- ✅ Forces verification for every claim
- ✅ Makes agent behavior predictable

#### Cons:

- ❌ MASSIVE UX degradation - every simple query requires tool call
- ❌ User asks "hello" → must call tool
- ❌ Destroys conversational flow
- ❌ Increases latency for trivial queries
- ❌ Not recommended by Mastra docs

**VERDICT**: Too extreme, kills user experience

---

### 📊 **Option 3: RAG with Verified Zimbabwe Case Database**

**Status**: Not implemented (long-term solution)

#### How It Works:

1. Scrape/index all Zimbabwe cases from ZimLII
2. Store in vector database (Pinecone, Weaviate, etc.)
3. Agent can ONLY cite from indexed database
4. Impossible to hallucinate cases not in database

#### Pros:

- ✅ 100% prevents fake cases
- ✅ Guarantees every citation is real
- ✅ Can provide full case text
- ✅ Gold standard solution

#### Cons:

- ❌ Requires scraping/indexing ZimLII (legal/ethical concerns)
- ❌ Need to maintain database (new cases added weekly)
- ❌ Infrastructure cost (vector DB hosting)
- ❌ Development time: 1-2 weeks
- ❌ May not have all cases (historical, unreported)

**VERDICT**: Best long-term solution, but significant effort

---

### 🎯 **Option 4: Citation Extraction + URL Verification**

**Status**: Not implemented

#### How It Works:

1. Extract all case citations from response
2. Check each citation format (e.g., `[2015] ZWHHC 164`)
3. Verify URL is valid ZimLII format
4. Optionally: HEAD request to check if URL exists
5. Block if any citation fails validation

#### Pros:

- ✅ Catches format errors
- ✅ Catches obviously fake URLs
- ✅ Can verify URL existence
- ✅ Easy to implement

#### Cons:

- ❌ Cannot detect wrong-but-plausible citations
- ❌ HEAD requests add latency
- ❌ ZimLII might not have all cases online
- ❌ Agent could cite real case but with wrong details

**VERDICT**: Good complement to Option 1, not standalone

---

### 🤖 **Option 5: Strengthened Tool Instructions**

**Status**: Already attempted, FAILED

#### What We Tried:

1. Added extensive anti-hallucination rules
2. Added 8 absolute prohibitions
3. Added hard 3-5 case limit
4. Added consequences section (sanctions, disbarment)
5. Added specific examples of what NOT to do

#### Why It Failed:

- ❌ LLMs can ignore instructions if they "know" plausible answers
- ❌ Training data includes real Zimbabwe cases
- ❌ Agent is incentivized to be helpful → provides "reasonable" answers
- ❌ No enforcement mechanism

**VERDICT**: Instructions alone cannot prevent hallucinations

---

## Recommended Implementation Plan

### Phase 1: Immediate Fix (Option 1)

✅ **Post-Processing Citation Validator** - Already created

1. Integrate validator into `app/(chat)/api/chat/route.ts`
2. Check after agent response in `onFinish` callback
3. Block responses with violations
4. Test with user's "additional case law" query

### Phase 2: Enhanced Detection (Option 4)

🔄 **Citation Extraction + URL Verification**

1. Add URL format validation
2. Add optional HEAD request to ZimLII
3. Extract case names and verify against known patterns
4. Add to existing validator

### Phase 3: Long-Term (Option 3)

📅 **RAG with Verified Database**

1. Research ZimLII scraping (legal/ethical)
2. Build indexing pipeline
3. Set up vector database
4. Update search tools to use RAG
5. Fallback to Tavily if case not in DB

---

## Detection Rules (Already Implemented)

### Current Validator Rules:

1. **No-Tool Hallucination**: Citations exist but no tool was called
2. **Too Many Citations**: >5 cases (search tools return max 5-10)
3. **Suspicious Tables**: Tables with >5 case rows
4. **Verification Claims**: Says "verified" but no tool used
5. **Fake URLs**: ZimLII URLs without tool usage
6. **Known Hallucinations**: List of previously-hallucinated cases

### Potential Additional Rules:

- Citation format validation (regex)
- URL format validation (ZimLII pattern)
- Case name pattern matching
- Date consistency checks
- Judge name validation (known Zimbabwe judges)

---

## Next Steps

1. **Ask User for Specifics**: "Can you show me an example of the incorrect references?"

   - Are case names wrong?
   - Are URLs incorrect?
   - Are details about real cases wrong?
   - Are there too many cases?

2. **Integrate Validator**: Add to chat route's `onFinish` callback

3. **Test**: Have user try "additional case law" query again

4. **Iterate**: Add rules based on what's still failing

---

## Risk Assessment

| Solution               | Hallucination Prevention | UX Impact  | Development Time | Cost |
| ---------------------- | ------------------------ | ---------- | ---------------- | ---- |
| Option 1: Validator    | 🟡 Good (85%)            | 🟢 Minimal | 2 hours          | Free |
| Option 2: Force Tools  | 🟢 Excellent (95%)       | 🔴 Severe  | 1 hour           | Free |
| Option 3: RAG          | 🟢 Perfect (100%)        | 🟢 Minimal | 1-2 weeks        | $$   |
| Option 4: URL Verify   | 🟡 Moderate (70%)        | 🟢 Minimal | 4 hours          | Free |
| Option 5: Instructions | 🔴 Poor (40%)            | 🟢 None    | FAILED           | Free |

**Recommended**: Start with Option 1, add Option 4, migrate to Option 3 long-term.
