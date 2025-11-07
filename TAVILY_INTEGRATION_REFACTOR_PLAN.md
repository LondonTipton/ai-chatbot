# Tavily Integration Refactor Plan

## Executive Summary

We're NOT replacing all workflows with one. Instead, we're **fixing the Tavily integration** in each workflow while preserving their distinct purposes.

## Core Problem Identified

**The issue wasn't the workflow architecture** - it was:

1. ❌ Tavily results being filtered/validated (losing information)
2. ❌ Intermediate LLM processing (Tavily's summary instead of raw results)
3. ❌ Entity extraction/validation blocking good results

**The solution:** Pass raw Tavily results directly to the final Chat Agent.

## Workflow Strategy

### Keep These 4 Workflows (Each Has Distinct Purpose)

| Workflow          | Purpose                | Tavily Config                   | Use Case                                                |
| ----------------- | ---------------------- | ------------------------------- | ------------------------------------------------------- |
| **Basic**         | Quick queries          | 10 results, no raw content      | "What is X?", definitions                               |
| **Advanced**      | Deep content analysis  | 10 results, include_raw_content | Case analysis, detailed research                        |
| **High-Advanced** | Pattern/trend analysis | 20 results, no raw content      | "What are trends in...", comparative analysis           |
| **Comprehensive** | Multi-angle research   | Multiple searches, agentic      | Complex legal questions requiring multiple perspectives |

### Remove These Workflows (Redundant)

| Workflow                   | Why Remove                                                    |
| -------------------------- | ------------------------------------------------------------- |
| ~~Low-Advanced~~           | Redundant - Advanced workflow covers this with better quality |
| ~~Enhanced-Comprehensive~~ | Redundant - Comprehensive workflow is sufficient              |

## New Workflow Architecture

### 1. Basic Search Workflow (REFACTORED)

**Purpose:** Fast, lightweight queries (1 Tavily credit)

**Tavily Configuration:**

```typescript
{
  maxResults: 10,
  includeRawContent: false,  // Saves tokens
  searchDepth: "basic"
}
```

**Flow:**

```
Query Enhancement (LLM)
    ↓
Tavily Basic Search (10 results, no raw content)
    ↓
Format Raw Results → Pass ALL to Chat Agent
    ↓
Chat Agent Synthesis
```

**Remove:**

- ❌ Entity extraction
- ❌ Entity validation
- ❌ Claim extraction
- ❌ Document composition
- ❌ Source classification

**Keep:**

- ✅ Query enhancement
- ✅ Token budget tracking (if implemented)

**Token Budget:** 1K-2K tokens
**Latency:** 2-3s
**Tavily Credits:** 1

---

### 2. Advanced Search Workflow (REFACTORED)

**Purpose:** Deep content analysis with full source text

**Tavily Configuration:**

```typescript
{
  maxResults: 10,
  includeRawContent: true,   // Full content for deep analysis
  searchDepth: "advanced",
  includeDomains: ["zimlii.org", "saflii.org", "africanlii.org", ...]
}
```

**Flow:**

```
Query Enhancement (LLM)
    ↓
Tavily Advanced Search (10 results, WITH raw content)
    ↓
Format Raw Results → Pass ALL to Chat Agent
    ↓
Chat Agent Synthesis (has full source text)
```

**Remove:**

- ❌ Entity extraction
- ❌ Entity validation
- ❌ Tavily Extract API call (redundant with includeRawContent)
- ❌ Source classification

**Keep:**

- ✅ Query enhancement
- ✅ Domain filtering (Zimbabwe legal sites)
- ✅ Token budget tracking

**Token Budget:** 3K-5K tokens (higher due to raw content)
**Latency:** 3-5s
**Tavily Credits:** 1

---

### 3. High-Advanced Search Workflow (REFACTORED)

**Purpose:** Pattern/trend analysis across many sources

**Tavily Configuration:**

```typescript
{
  maxResults: 20,
  includeRawContent: false,  // Summaries only for breadth
  searchDepth: "advanced",
  includeDomains: ["zimlii.org", "saflii.org", "africanlii.org", ...]
}
```

**Flow:**

```
Query Enhancement (LLM)
    ↓
Tavily Advanced Search (20 results, no raw content)
    ↓
Format Raw Results → Pass ALL to Chat Agent
    ↓
Chat Agent Synthesis (identifies patterns across sources)
```

**Remove:**

- ❌ Entity extraction
- ❌ Entity validation
- ❌ Source classification

**Keep:**

- ✅ Query enhancement
- ✅ Domain filtering
- ✅ Token budget tracking

**Token Budget:** 2K-4K tokens
**Latency:** 4-6s
**Tavily Credits:** 1

---

### 4. Comprehensive Analysis Workflow (REFACTORED)

**Purpose:** Multi-angle research with iterative searches

**Tavily Configuration:**

```typescript
// Initial search
{
  maxResults: 10,
  includeRawContent: true,
  searchDepth: "advanced"
}

// Follow-up searches (if needed)
{
  maxResults: 5,
  includeRawContent: false,
  searchDepth: "advanced"
}
```

**Flow:**

```
Query Enhancement (LLM)
    ↓
Tavily Search 1 (10 results, with raw content)
    ↓
Format Results → Pass to Chat Agent
    ↓
Gap Analysis Agent (identifies missing info)
    ↓
[IF GAPS FOUND]
    ↓
Tavily Search 2 & 3 (5 results each, no raw content)
    ↓
Merge ALL Results → Pass to Chat Agent
    ↓
Chat Agent Final Synthesis
```

**Remove:**

- ❌ Entity extraction
- ❌ Entity validation
- ❌ Claim extraction
- ❌ Document composition

**Keep:**

- ✅ Query enhancement
- ✅ Gap analysis (agentic workflow)
- ✅ Multiple searches (for comprehensive coverage)
- ✅ Token budget tracking

**Token Budget:** 5K-10K tokens
**Latency:** 8-15s
**Tavily Credits:** 2-3

---

## Implementation Pattern (Template)

### Standard Tavily Integration Pattern

```typescript
// Step 1: Query Enhancement
const enhancedQuery = await enhanceSearchQuery(query, conversationHistory);

// Step 2: Tavily Search (with appropriate config)
const searchResults = await tavilySearchTool.execute({
  context: {
    query: enhancedQuery,
    maxResults: 10,  // or 20 for high-advanced
    includeRawContent: true,  // or false for basic/high-advanced
    searchDepth: "advanced",  // or "basic"
    includeDomains: [...],  // for advanced workflows
  },
});

// Step 3: Format Raw Results (NO LLM PROCESSING)
let response = "";
if (searchResults.results.length > 0) {
  response = `SEARCH RESULTS FOR: "${query}"\n\n`;
  response += `Found ${searchResults.results.length} results:\n\n`;

  searchResults.results.forEach((result, i) => {
    response += `--- RESULT ${i + 1} ---\n`;
    response += `Title: ${result.title}\n`;
    response += `URL: ${result.url}\n`;
    response += `Relevance Score: ${result.score}\n`;
    response += `Content:\n${result.content}\n`;
    if (result.rawContent) {
      response += `Full Content:\n${result.rawContent}\n`;
    }
    response += `\n`;
  });

  response += `\nINSTRUCTIONS: Analyze these search results and provide a comprehensive answer. Use ALL relevant information. Cite sources using [Title](URL) format.`;
}

// Step 4: Return to Chat Agent
return {
  response,
  sources: searchResults.results.map(r => ({ title: r.title, url: r.url })),
  totalTokens: estimateTokens(response),
};
```

## Detailed Implementation Steps

### Phase 1: Refactor Basic Search Workflow

**File:** `mastra/workflows/basic-search-workflow.ts`

**Changes:**

1. Remove all entity extraction steps
2. Remove validation steps
3. Remove claim extraction steps
4. Remove document composition steps
5. Keep only: query enhancement → Tavily search → format results
6. Update Tavily config: `maxResults: 10, includeRawContent: false`

**Expected Result:**

- 5 steps → 1 step
- 1.5K-3K tokens → 1K-2K tokens
- 4-7s → 2-3s

---

### Phase 2: Refactor Advanced Search Workflow

**File:** `mastra/workflows/advanced-search-workflow.ts`

**Changes:**

1. Remove entity extraction steps
2. Remove validation steps
3. Remove Tavily Extract API call (use `includeRawContent: true` instead)
4. Keep only: query enhancement → Tavily search → format results
5. Update Tavily config: `maxResults: 10, includeRawContent: true, searchDepth: "advanced"`

**Expected Result:**

- 3 steps → 1 step
- 4K-8K tokens → 3K-5K tokens
- 5-10s → 3-5s

---

### Phase 3: Refactor High-Advanced Search Workflow

**File:** `mastra/workflows/high-advance-search-workflow.ts`

**Changes:**

1. Remove entity extraction steps
2. Remove validation steps
3. Keep only: query enhancement → Tavily search → format results
4. Update Tavily config: `maxResults: 20, includeRawContent: false, searchDepth: "advanced"`

**Expected Result:**

- 2 steps → 1 step
- 5K-10K tokens → 2K-4K tokens
- 8-15s → 4-6s

---

### Phase 4: Refactor Comprehensive Analysis Workflow

**File:** `mastra/workflows/comprehensive-analysis-workflow.ts`

**Changes:**

1. Remove entity extraction steps
2. Remove validation steps
3. Keep gap analysis (this is valuable for multi-search)
4. Keep multiple Tavily searches
5. Format ALL results before passing to Chat Agent
6. Update Tavily configs appropriately

**Expected Result:**

- 3+ steps → 2-3 steps (keep gap analysis)
- 8K-12K tokens → 5K-10K tokens
- 15-25s → 8-15s

---

### Phase 5: Delete Redundant Workflows

**Files to Delete:**

- `mastra/workflows/low-advance-search-workflow.ts`
- `mastra/workflows/enhanced-comprehensive-workflow.ts`

**Update Tool Wrappers:**

- `low-advance-search-workflow-tool.ts` → Use `advanced-search-workflow`
- `enhanced-comprehensive-workflow-tool.ts` → Use `comprehensive-analysis-workflow`

---

## Token Budget Strategy

### Per-Workflow Token Budgets

| Workflow      | Query Enhancement | Tavily Results | Chat Agent | Total  |
| ------------- | ----------------- | -------------- | ---------- | ------ |
| Basic         | 50-100            | 500-1K         | 500-1K     | 1K-2K  |
| Advanced      | 50-100            | 2K-3K          | 1K-2K      | 3K-5K  |
| High-Advanced | 50-100            | 1K-2K          | 1K-2K      | 2K-4K  |
| Comprehensive | 50-100            | 3K-6K          | 2K-4K      | 5K-10K |

### Token Control Mechanisms

Keep these if already implemented:

- ✅ Token budget tracking
- ✅ Token estimation
- ✅ Token limits per workflow

Remove these:

- ❌ Token-based result filtering
- ❌ Token-based entity filtering

---

## Tavily Credit Usage

| Workflow      | Credits | Justification                           |
| ------------- | ------- | --------------------------------------- |
| Basic         | 1       | Single search, 10 results               |
| Advanced      | 1       | Single search, 10 results + raw content |
| High-Advanced | 1       | Single search, 20 results               |
| Comprehensive | 2-3     | Multiple searches for gaps              |

---

## Testing Strategy

### For Each Refactored Workflow

1. **Functionality Test:**

   - Query: "what is the zuva case in zimbabwean labour law?"
   - Expected: Case found with comprehensive analysis
   - Verify: All Tavily results passed through

2. **Token Budget Test:**

   - Verify token usage within expected range
   - Check no token overflow

3. **Quality Test:**

   - Compare output quality with old workflow
   - Verify no information loss
   - Check source citations

4. **Performance Test:**
   - Measure latency
   - Verify within expected range

---

## Migration Timeline

### Week 1: Basic & Advanced

- Day 1-2: Refactor Basic Search Workflow
- Day 3-4: Refactor Advanced Search Workflow
- Day 5: Test both workflows

### Week 2: High-Advanced & Comprehensive

- Day 1-2: Refactor High-Advanced Search Workflow
- Day 3-4: Refactor Comprehensive Analysis Workflow
- Day 5: Test both workflows

### Week 3: Cleanup & Optimization

- Day 1: Delete redundant workflows
- Day 2: Update tool wrappers
- Day 3-4: Integration testing
- Day 5: Production deployment

---

## Success Criteria

### Per Workflow

- ✅ Tavily results passed directly to Chat Agent (no filtering)
- ✅ No entity extraction/validation steps
- ✅ Token usage within budget
- ✅ Latency improved or maintained
- ✅ Quality maintained or improved
- ✅ Case finding works (Zuva case test)

### Overall

- ✅ 4 distinct workflows with clear purposes
- ✅ Consistent Tavily integration pattern
- ✅ No redundant workflows
- ✅ Simplified codebase
- ✅ Better maintainability

---

## Key Principles

1. **Preserve Workflow Purpose:** Each workflow serves a distinct use case
2. **Simplify Tavily Integration:** Raw results → Chat Agent (no filtering)
3. **Remove Hallucination Checks:** Unnecessary with raw results
4. **Keep Token Controls:** Budget tracking is valuable
5. **Keep Agentic Features:** Gap analysis in Comprehensive workflow

---

## Next Steps

1. Review this plan
2. Confirm workflow purposes align with your vision
3. Start with Basic Search Workflow refactor
4. Test thoroughly before moving to next workflow
5. Iterate based on feedback

Ready to proceed?
