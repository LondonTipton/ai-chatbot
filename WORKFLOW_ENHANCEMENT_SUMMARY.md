# Workflow Enhancement Summary

## Overview

Enhanced the `advanced-search-workflow` and `high-advance-search-workflow` with specialized agent integrations to differentiate between **DEPTH** (advanced) and **BREADTH** (high-advance) research patterns, while maintaining backward compatibility with tool bindings in the chat route.

## Changes Made

### 1. Advanced-Search-Workflow (Depth-Focused)

**File**: `mastra/workflows/advanced-search-workflow.ts`

**Before**: 3 steps (search → extract-top-2 → synthesize)
**After**: 4 steps (search → extract-top-3 → depth-analysis → synthesize)

**Key Changes**:

- ✅ Updated search step to use `includeRawContent: true` for fuller content extraction
- ✅ Increased extraction from 2 URLs to **3 URLs** for richer depth analysis
- ✅ **Added depth-analysis-step** (new agent integration BEFORE synthesis):
  - Uses `depthAnalysisAgent` to analyze extracted content
  - Identifies legal precedents, patterns, and Zimbabwe-specific implications
  - Token estimate: 1K-2K tokens
- ✅ Updated synthesize step to:
  - Accept `depthAnalysis` and `depthAnalysisTokens` in input schema
  - Incorporate depth analysis insights into synthesis prompt
  - Include precedents and patterns in final response
- ✅ Updated workflow chain: `.then(advancedSearchStep).then(extractTopSourcesStep).then(depthAnalysisStep).then(synthesizeStep)`
- ✅ Updated documentation comment: "Extract top 3 URLs" (was "Extract top 2")

**Token Budget Impact**: 4K-8K (slight increase due to 3 URL extraction + depth analysis)

**Output Schema**: ✅ **UNCHANGED** - Still outputs `{ response, sources, totalTokens }` (maintains tool binding compatibility)

---

### 2. High-Advance-Search-Workflow (Breadth-Focused)

**File**: `mastra/workflows/high-advance-search-workflow.ts`

**Before**: 2 steps (search-10-results → synthesize)
**After**: 3 steps (search-10-results → breadth-synthesis → synthesize)

**Key Changes**:

- ✅ Added import for `breadthSynthesisAgent`
- ✅ **Added breadth-synthesis-step** (new agent integration BEFORE final synthesis):
  - Uses `breadthSynthesisAgent` to synthesize 10 search results
  - Identifies common themes, consensus/disagreement across sources
  - Categorizes sources: government, academic, judicial, news
  - Reconciles conflicting information
  - Token estimate: 1.5K-2.5K tokens
- ✅ Updated synthesize step to:
  - Accept `breadthAnalysis` and `breadthAnalysisTokens` in input schema
  - Incorporate multi-perspective insights into synthesis prompt
  - Emphasize structured analysis across source types
- ✅ Updated workflow chain: `.then(searchStep).then(breadthSynthesisStep).then(synthesizeStep)`
- ✅ Updated documentation comment: "search → breadth-synthesis → synthesize"

**Token Budget Impact**: 5K-10K (slight increase due to breadth synthesis agent)

**Output Schema**: ✅ **UNCHANGED** - Still outputs `{ response, sources, totalTokens }` (maintains tool binding compatibility)

---

### 3. New Agents Created

#### A. Depth Analysis Agent

**File**: `mastra/agents/depth-analysis-agent.ts`

Specializes in analyzing extracted legal content:

- Identifies legal precedents and case law patterns
- Recognizes important legal principles and clauses
- Assesses Zimbabwe-specific implications
- Identifies limitations and gaps
- Provides confidence assessment

**Provider**: Cerebras AI (gpt-oss-120b via singleton `getBalancedCerebrasProvider()`)

#### B. Breadth Synthesis Agent

**File**: `mastra/agents/breadth-synthesis-agent.ts`

Specializes in multi-perspective synthesis:

- Identifies common themes across 8-10+ sources
- Analyzes consensus vs. disagreement
- Categorizes sources by type (government, academic, judicial, news)
- Reconciles conflicting information
- Highlights gaps or missing perspectives

**Provider**: Cerebras AI (gpt-oss-120b via singleton `getBalancedCerebrasProvider()`)

---

### 4. Tavily Search Advanced Tool

**File**: `mastra/tools/tavily-search-advanced.ts`

**Enhancement**: ✅ Added `includeRawContent` parameter

- Parameter: boolean (default: false)
- Allows workflows to request full page content for extraction
- Used in both low-advance and advanced workflows

---

## Workflow Differentiation Strategy

| Aspect                  | Basic         | Low-Advance    | **Advanced (NEW)**          | **High-Advance (NEW)**        |
| ----------------------- | ------------- | -------------- | --------------------------- | ----------------------------- |
| **Max Results**         | 5             | 5              | 7                           | 10                            |
| **Extract URLs**        | 0             | 0              | **3**                       | 0                             |
| **Include Raw Content** | false         | true           | true                        | false                         |
| **Agent Integrations**  | None          | None           | **Depth Analysis**          | **Breadth Synthesis**         |
| **Focus**               | Speed         | Balanced       | **Legal Depth**             | **Source Breadth**            |
| **Token Budget**        | 1-2K          | 2-4K           | **4-8K**                    | **5-10K**                     |
| **Use Case**            | Quick answers | Moderate depth | **Precedent-heavy queries** | **Consensus-seeking queries** |

---

## Backward Compatibility

✅ **Tool Bindings Preserved**: All workflows maintain the same external output schema:

```typescript
{
  response: string,
  sources: Array<{title, url}>,
  totalTokens: number
}
```

✅ **Chat Route Integration**: New agent integrations are internal steps - they don't affect:

- Tool wrapper in `mastra/agents/chat-agent.ts`
- Workflow tool export names (advancedSearchWorkflowTool, highAdvanceSearchWorkflowTool)
- External API contracts

---

## Implementation Notes

### Design Pattern

- Uses Mastra's `createStep` and `createWorkflow` orchestration
- Agent integrations follow existing pattern with Cerebras provider
- Error handling maintains fallback behavior (skips agent if unavailable)
- Token accounting includes all agent steps

### Step Ordering

**Critical**: Agent integrations occur **BEFORE** synthesis steps

- Ensures specialized analysis informs final synthesis
- Maintains logical data flow: raw data → specialized analysis → final synthesis
- Allows synthesis to incorporate specialized insights

### Error Handling

- If depth analysis fails in advanced workflow → synthesize uses raw extraction only
- If breadth synthesis fails in high-advance workflow → synthesize uses raw search only
- Graceful degradation maintains service availability

---

## Testing Recommendations

1. **Verify compilations** (all ✅ confirmed):

   - `advanced-search-workflow.ts` compiles
   - `high-advance-search-workflow.ts` compiles
   - Agents resolve correctly

2. **Test workflow execution**:

   - Advanced workflow returns depth-focused response with legal precedents
   - High-advance workflow returns breadth-focused response with multi-perspective analysis

3. **Verify tool bindings**:

   - Chat route still recognizes advancedSearchWorkflowTool
   - Chat route still recognizes highAdvanceSearchWorkflowTool
   - Output schema compatibility confirmed

4. **Performance monitoring**:
   - Advanced workflow: target 5-10s latency with 4-8K tokens
   - High-advance workflow: target 8-15s latency with 5-10K tokens

---

## Migration Path

No breaking changes:

- Existing queries using advanced or high-advance workflows continue to work
- Tool bindings in chat route remain functional
- New agent integrations enhance (don't replace) existing behavior
- Gradual adoption: new features available immediately if agents enabled
