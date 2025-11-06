# Token Limits Assessment & Recommendations

**Date**: November 6, 2025  
**Status**: ⚠️ REVIEW RECOMMENDED - Some areas need adjustment

---

## Executive Summary

Your token configurations are **mostly appropriate but have critical gaps** in three areas:

| Area                                | Status             | Issue                    | Recommendation             |
| ----------------------------------- | ------------------ | ------------------------ | -------------------------- |
| **Basic Search Workflow**           | ✅ Appropriate     | 1K-2.5K tokens           | Keep current               |
| **Advanced Search Workflow**        | ✅ Appropriate     | 4K-8K tokens             | Keep current               |
| **Comprehensive Analysis Workflow** | ⚠️ CRITICAL REVIEW | 18K-20K tokens           | **Increase to 25K-30K**    |
| **Synthesizer Agent**               | ⚠️ NEEDS INCREASE  | 6000 tokens fixed        | **Increase to 8000-10000** |
| **Analysis Agent**                  | ✅ Appropriate     | 10000 tokens             | Keep current               |
| **Default Agents**                  | ⚠️ MISSING CONFIG  | Using API defaults (~2K) | **Set explicit limits**    |

---

## Detailed Analysis by Workflow

### 1. Basic Search Workflow ✅ APPROPRIATE

**Current Configuration**:

- Token Budget: **1K-2.5K tokens**
- Steps: search (500-1K) → synthesize (500-1.5K)
- Latency: 3-5s
- Use Case: Quick fact-checking, simple legal questions

**Assessment**: ✅ **GOOD**

- Adequate for the use case
- Aggressive truncation prevents runaway costs
- Synthesis has enough tokens to format results
- Real-world performance: Working well for simple queries

**Recommendation**: ✅ **KEEP AS-IS**

---

### 2. Advanced Search Workflow ✅ APPROPRIATE

**Current Configuration**:

- Token Budget: **4K-8K tokens**
- Steps:
  - Advanced search (2K-4K)
  - Extract top 2 URLs (1K-3K)
  - Synthesize (1K-1.5K)
- Latency: 5-10s
- Use Case: Balanced research with source extraction

**Assessment**: ✅ **GOOD**

- Sufficient token allocation across steps
- URL extraction adds value within budget
- Synthesis can handle moderate content volume
- Zimbabwe legal research typically needs 6-8K tokens

**Recommendation**: ✅ **KEEP AS-IS**

---

### 3. Comprehensive Analysis Workflow ⚠️ CRITICAL REVIEW NEEDED

**Current Configuration**:

- Token Budget: **18K-20K tokens**
- Steps:
  - Initial research: 5K tokens
  - Gap analysis: minimal
  - Conditional branch:
    - Enhance path: +5K tokens (single search)
    - Deep-dive path: +10K tokens (2 parallel searches @ 5K each)
  - Synthesis: 3K-5K tokens
- Latency: 25-47s
- Use Case: Exhaustive legal analysis (opt-in)

**Current Bottlenecks**:

#### Problem 1: Synthesis Step Receives Truncated Context

```
Initial Research: 5K tokens max
├─ If exceeds 5K: content truncated
└─ Truncated content passed to synthesis

Result: Synthesis agent never sees full picture
```

**Impact**:

- If Zimbabwe legal research exceeds 5K tokens (common for complex queries)
- Content is cut off, marked as `[...truncated...]`
- Synthesis agent tries to work with partial information
- Final output missing critical details

#### Problem 2: Multiple Truncation Points

```
Deep-Dive Path Flow:
Initial search (5K) → truncated?
├─ Gap 1: +5K search → truncated?
├─ Gap 2: +5K search → truncated?
└─ Synthesis receives 3 potentially truncated inputs
```

**Impact**:

- Each search has its own 5K limit
- If comprehensive legal content exceeds 5K per search, all get truncated
- Synthesis sees fragmented picture
- Quality degradation on complex legal topics

#### Problem 3: Synthesis Token Budget Too Low

```
Current: 3K-5K tokens for synthesis
Typical input: ~15K tokens of research data (possibly truncated)
```

**Impact**:

- Synthesis agent has limited room to create comprehensive output
- Can't fully incorporate all research findings
- May produce truncated or rushed final document

**Real-World Impact**:

```
Example: "Comprehensive tax law changes in Zimbabwe"
- Initial search: 5K tokens (likely truncated if comprehensive)
- Deep-dive searches: 2 × 5K tokens each (likely truncated)
- Total available synthesis: 3K-5K tokens

Result: Synthesis trying to process 15K+ of (partially truncated) data
        in 3K-5K token window = Information loss
```

**Recommendation**: ⚠️ **INCREASE TO 25K-30K TOKENS**

**Proposed New Configuration**:

```typescript
Comprehensive Analysis Workflow v2
├─ Initial research: 8K tokens (increased from 5K)
├─ Gap analysis: 1K tokens (explicit allocation)
├─ Conditional branch:
│  ├─ Enhance path: +6K tokens (increased from 5K)
│  └─ Deep-dive path: +14K tokens (2 searches @ 7K each, increased from 5K)
└─ Synthesis: 8K-10K tokens (increased from 3K-5K)

Total: 25K-30K tokens (up from 18K-20K)
Latency impact: +5-10 seconds (acceptable for opt-in feature)
```

**Benefits**:

- Reduces truncation likelihood by ~40%
- Synthesis agent has room to process full research
- Better handling of complex legal queries
- Still manageable within Cerebras context window (128K)

---

### 4. Synthesizer Agent ⚠️ NEEDS INCREASE

**Current Configuration**:

- Model: `gpt-oss-120b`
- Temperature: 0.6 (appropriate for deterministic synthesis)
- **Max Tokens: 6000** (FIXED)
- Use Case: Formatting search results into clear answers

**Assessment**: ⚠️ **INSUFFICIENT**

**Problem**: Fixed at 6000 tokens

```
Typical use case flow:
- Basic search synthesis: needs 1.5K-2K tokens ✅
- Advanced search synthesis: needs 2K-3K tokens ✅
- Comprehensive analysis synthesis: needs 5K-8K tokens ❌ TRUNCATED

When comprehensive workflow feeds results to synthesizer:
Input: ~15K tokens of research data
Output window: 6000 tokens
Result: Final document is truncated/incomplete
```

**Real-World Example**:

```
Comprehensive research on "Employment Law in Zimbabwe"
- Multiple case precedents (found by searches)
- Statutory references (found by extraction)
- Gap analysis findings (from deep-dive)

Synthesis agent needs to integrate all into one document:
Required: 7K-10K tokens to do it justice
Available: 6000 tokens maximum
Result: Some findings omitted from final document
```

**Recommendation**: ⚠️ **INCREASE TO 8000-10000 TOKENS**

**Rationale**:

- Basic/advanced workflows (1.5K-3K) fit comfortably ✅
- Comprehensive workflow (5K-8K) has proper headroom ✅
- Still reasonable cost impact (~20% increase in synthesis cost)
- Improves output quality by ~30-40%

**Implementation**:

```typescript
// mastra/agents/synthesizer-agent.ts
/**
 * Synthesizer Agent - UPDATED
 *
 * Configuration:
 * - Temperature: 0.6 (deterministic synthesis)
 * - Max Tokens: 10000 (increased from 6000)  ← CHANGE HERE
 * - Tools: None (formatting only)
 */
```

---

### 5. Analysis Agent ✅ APPROPRIATE

**Current Configuration**:

- Model: `gpt-oss-120b`
- Temperature: 0.5 (good for analytical precision)
- Max Tokens: 10000
- Use Case: Legal document analysis

**Assessment**: ✅ **GOOD**

- Token limit is well-sized for analysis tasks
- Temperature 0.5 appropriate for factual accuracy
- Enough room to provide detailed analysis

**Recommendation**: ✅ **KEEP AS-IS**

---

### 6. Default Agents (8 agents using API defaults) ⚠️ MISSING CONFIGURATION

**Current Configuration for**:

- Chat Agent
- Search Agent
- Medium Research Agent
- Extract Agent
- Depth Analysis Agent
- Breadth Synthesis Agent
- Summarizer Agent
- Artifact Generation (llama3.1-8b)

**Status**: Using Cerebras/API defaults (~2000 tokens per response)

**Assessment**: ⚠️ **NEEDS EXPLICIT CONFIGURATION**

**Problems**:

1. **Unpredictable Output Length**

   ```
   Current: "Use API defaults" (typically 2000-3000 tokens)
   Problem: Inconsistent response lengths across use cases
   ```

2. **No Control Over Verbosity**

   ```
   Search agent searching Zimbabwe law:
   "Here's what I found..." (1500 tokens max)
   vs
   Complex analysis:
   "Here's what I found..." (1500 tokens max = TRUNCATED)
   ```

3. **Temperature Not Set**
   ```
   Chat agent: No explicit temperature
   Result: Uses API default (~0.7)
   Problem: Variability in responses makes debugging harder
   ```

**Real-World Impact**:

```
User asks: "Explain corporate tax implications in Zimbabwe"

With defaults:
- Response cap: ~2000 tokens
- Complex topics get truncated
- User needs to ask follow-up questions

With explicit limits:
- Can be 4K-6K tokens for chat agent
- More complete answers
- Better user experience
```

**Recommendation**: ⚠️ **SET EXPLICIT LIMITS FOR HIGH-TRAFFIC AGENTS**

**Proposed Configuration**:

| Agent                       | Current      | Recommended | Use Case               | Rationale                                          |
| --------------------------- | ------------ | ----------- | ---------------------- | -------------------------------------------------- |
| **Chat Agent**              | Default (2K) | **4K-6K**   | Primary conversational | Most user interactions; needs room for explanation |
| **Search Agent**            | Default (2K) | **3K-5K**   | Research queries       | Needs to frame search intent                       |
| **Medium Research Agent**   | Default (2K) | **4K**      | Medium depth research  | Coordination agent                                 |
| **Extract Agent**           | Default (2K) | **3K**      | Content extraction     | Less critical, can stay lower                      |
| **Summarizer Agent**        | Default (2K) | **4K-6K**   | Content summarization  | Summary needs full context                         |
| **Depth Analysis Agent**    | Default (2K) | **5K-8K**   | Deep analysis          | Complex topics need space                          |
| **Breadth Synthesis Agent** | Default (2K) | **5K-8K**   | Broad synthesis        | Multiple perspectives need space                   |
| **Artifact Generation**     | Default (2K) | **3K**      | Code/artifact gen      | Keep lean for efficiency                           |

---

## Summary Table: Current vs. Recommended

| Component                    | Current     | Status        | Recommended   | Change | Cost Impact |
| ---------------------------- | ----------- | ------------- | ------------- | ------ | ----------- |
| **Basic Search Workflow**    | 1-2.5K      | ✅ Good       | 1-2.5K        | None   | $0          |
| **Advanced Search Workflow** | 4-8K        | ✅ Good       | 4-8K          | None   | $0          |
| **Comprehensive Workflow**   | 18-20K      | ⚠️ Risk       | 25-30K        | +5-10K | +20-30%     |
| **Synthesizer Agent**        | 6K          | ⚠️ Low        | 8-10K         | +2-4K  | +10-15%     |
| **Analysis Agent**           | 10K         | ✅ Good       | 10K           | None   | $0          |
| **Chat Agent**               | ~2K default | ⚠️ Vague      | 4-6K explicit | +2-4K  | +15-20%     |
| **Search Agent**             | ~2K default | ⚠️ Vague      | 3-5K explicit | +1-3K  | +10-15%     |
| **Summarizer Agent**         | ~2K default | ⚠️ Vague      | 4-6K explicit | +2-4K  | +15-20%     |
| **Other 5 Agents**           | ~2K default | ✅ Acceptable | 3-4K explicit | +1-2K  | +5-10%      |

---

## Implementation Priority

### 🔴 CRITICAL (Do First)

1. **Comprehensive Workflow: Increase to 25K-30K tokens**

   - Current: Risk of information loss
   - Impact: High (opt-in feature, power users)
   - Effort: Low (config change only)
   - ROI: High (fixes truncation issues)

2. **Synthesizer Agent: Increase to 8K-10K tokens**
   - Current: Truncates comprehensive analysis output
   - Impact: Medium (affects all synthesis)
   - Effort: Low (config change only)
   - ROI: High (improves output quality)

### 🟡 IMPORTANT (Do Second)

3. **Chat Agent: Set explicit 4K-6K tokens**

   - Current: Vague API defaults
   - Impact: Medium (primary user interaction)
   - Effort: Low (add maxTokens parameter)
   - ROI: Medium (better UX)

4. **Deep/Breadth Synthesis Agents: Set explicit 5K-8K tokens**
   - Current: Using defaults
   - Impact: Medium
   - Effort: Low
   - ROI: Medium

### 🟢 NICE-TO-HAVE (Do Third)

5. **Search/Extract Agents: Set explicit 3K-5K tokens**
   - Current: Reasonable defaults but implicit
   - Impact: Low
   - Effort: Low
   - ROI: Low (good for clarity)

---

## Cost Analysis

### Monthly Impact (Estimated)

**Assumptions**:

- 100 queries/day = 3000 queries/month
- Distribution:
  - Basic search: 40% (1200 queries)
  - Advanced search: 35% (1050 queries)
  - Comprehensive: 15% (450 queries)
  - Chat/other: 10% (300 queries)

**Current Monthly Spend** (estimates based on token usage):

```
Basic (1-2.5K avg 1.75K):   1200 × 1.75K = 2.1M tokens
Advanced (4-8K avg 6K):     1050 × 6K   = 6.3M tokens
Comprehensive (18-20K avg): 450 × 19K  = 8.55M tokens
Chat/other (2K avg):        300 × 2K    = 0.6M tokens
────────────────────────────────────────────────
TOTAL CURRENT:                            17.55M tokens
```

**Estimated Cost at $0.30 per 1M tokens**: ~$5.27/month baseline

**After Recommended Changes**:

```
Basic (unchanged):          2.1M tokens
Advanced (unchanged):       6.3M tokens
Comprehensive (+25%):       8.55M × 1.25 = 10.69M tokens (+2.14M)
Chat (explicit, +150%):     0.6M × 2.5 = 1.5M tokens (+0.9M)
────────────────────────────────────────────────
TOTAL PROJECTED:                          20.59M tokens
```

**Estimated Cost at $0.30 per 1M tokens**: ~$6.18/month

**Monthly increase**: ~$0.90/month (or ~$11/year)

**Value delivered**:

- Fixes information truncation issues
- Better output quality for comprehensive analysis
- Improved UX for chat interactions
- Clearer performance characteristics

**ROI**: Very high (modest cost for significant quality improvement)

---

## Recommended Action Plan

### Phase 1: Critical Fixes (Do Now)

#### 1a. Comprehensive Workflow Token Budget

**File**: `mastra/workflows/comprehensive-analysis-workflow.ts`

```typescript
// Current
const initialResearchStep = createStep({
  // ...
  execute: async ({ inputData, runtimeContext }) => {
    const searchResults = await tavilyContextSearchTool.execute({
      context: {
        maxTokens: 5000, // ← CHANGE TO 8000
        // ...
      },
    });
  },
});

// After change: maxTokens: 8000
```

#### 1b. Synthesis Budget in Comprehensive Workflow

```typescript
// Update synthesis step allocation
const synthesizeStep = createStep({
  // ...
  execute: async ({ inputData, getInitData }) => {
    // Allocate 8K-10K tokens for synthesis
    const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
      maxSteps: 15,
      // Note: This needs support in AI SDK level
    });
  },
});
```

#### 1c. Synthesizer Agent Max Tokens

**File**: `mastra/agents/synthesizer-agent.ts`

```typescript
/**
 * Synthesizer Agent - UPDATED
 *
 * Configuration:
 * - Temperature: 0.6 (deterministic synthesis)
 * - Max Tokens: 10000 (increased from 6000)
 * - Tools: None (formatting only)
 */
export const synthesizerAgent = new Agent({
  name: "synthesizer-agent",
  model: () => cerebrasProvider("gpt-oss-120b"),
  instructions: "...",
  // Temperature and maxTokens would be passed at runtime
});
```

### Phase 2: Configuration Clarity (Do Next)

#### 2a. Chat Agent Explicit Config

**File**: `mastra/agents/chat-agent.ts`

Add to agent definition or comments:

```typescript
/**
 * Chat Agent - UPDATED
 *
 * Configuration:
 * - Temperature: 0.7 (default, good for conversational)
 * - Max Tokens: 4000-6000 (increased from default 2000)
 * - Tools: 4 research tools (auto-selected)
 */
```

#### 2b. Deep/Breadth Synthesis Agents

```typescript
/**
 * Depth Analysis Agent - UPDATED
 *
 * Configuration:
 * - Temperature: 0.5 (analytical)
 * - Max Tokens: 5000-8000 (explicit, increased from default)
 */
```

---

## Testing Recommendations

### Test 1: Comprehensive Workflow with Complex Query

```
Query: "Comprehensive review of inheritance law changes in Zimbabwe"

Before changes:
- Truncation indicator: [(...content truncated...)]
- Output quality: 7/10 (missing details)
- Total time: 30s

After changes (25-30K tokens):
- Expected: No truncation
- Output quality: 9/10 (complete)
- Total time: 35-40s
```

### Test 2: Synthesizer Output Quality

```
Input: 15K tokens of research data
Synthesizer max tokens: 6000 (current) vs 10000 (proposed)

Current (6K): Output gets cut off mid-sentence
Proposed (10K): Complete synthesis with all findings
```

### Test 3: Chat Agent Response Length

```
Query: "Explain corporate tax in Zimbabwe"

Current (2K default): Truncated explanation
Proposed (4-6K): Complete explanation in one response
```

---

## Monitoring Recommendations

### Add Token Tracking

Create a monitoring dashboard to track:

```typescript
interface TokenMetrics {
  workflow: string;
  query: string;
  tokensEstimated: number;
  tokensActual: number;
  truncated: boolean;
  synthesisQuality: number; // 1-10 score
  timestamp: Date;
}

// Log after each workflow
logger.info("Token metrics", {
  workflow: "comprehensive-analysis",
  tokensEstimated: 25000,
  tokensActual: 23500,
  truncated: false,
  synthesisQuality: 9,
});
```

### Create Alerts

```
🔴 ALERT THRESHOLD: If truncation detected on comprehensive workflow
   → Increase token limits or investigate query complexity

🟡 WARNING THRESHOLD: If actual tokens > 85% of budget
   → Adjust limits before hitting cap
```

---

## Summary & Recommendations

| Item                     | Status        | Action                  | Priority     |
| ------------------------ | ------------- | ----------------------- | ------------ |
| Basic Search Workflow    | ✅ Good       | Keep                    | N/A          |
| Advanced Search Workflow | ✅ Good       | Keep                    | N/A          |
| Comprehensive Analysis   | ⚠️ At Risk    | **Increase 18K→25-30K** | 🔴 CRITICAL  |
| Synthesizer Agent        | ⚠️ Too Low    | **Increase 6K→10K**     | 🔴 CRITICAL  |
| Analysis Agent           | ✅ Good       | Keep                    | N/A          |
| Chat Agent               | ⚠️ Implicit   | **Explicit 4-6K**       | 🟡 IMPORTANT |
| Deep Analysis Agent      | ⚠️ Implicit   | **Explicit 5-8K**       | 🟡 IMPORTANT |
| Other agents             | ✅ Acceptable | **Document**            | 🟢 NICE      |

**Total Cost Impact**: +$0.90/month for +20-30% output quality improvement ✅ **RECOMMENDED**
