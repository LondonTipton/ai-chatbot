# Intelligent Routing Implementation Guide

## Overview

This implementation creates a hybrid AI system that intelligently routes queries between Vercel AI SDK and Mastra based on complexity, optimizing for speed, cost, and capability.

## Architecture

```
User Query
    │
    ├─ Complexity Detection
    │
    ├─ Simple Q&A → AI SDK + Tavily QNA (fast, direct answers)
    │
    ├─ Light Research → AI SDK + Tavily Advanced Search (detailed with sources)
    │
    ├─ Medium Research → Mastra Agent (multiple searches, max 4 tool calls)
    │
    ├─ Deep Research → Mastra Workflow (search → extract → analyze)
    │
    └─ Document Review → Mastra Workflow (analyze → suggest → validate)
```

## Components Created

### 1. Complexity Detection (`lib/ai/complexity-detector.ts`)

**Purpose**: Analyzes user queries to determine appropriate routing

**Complexity Levels**:

- `simple`: Direct Q&A (e.g., "What is contract law?")
- `light`: Single detailed search (e.g., "Explain property rights in Zimbabwe")
- `medium`: Multiple searches needed (e.g., "Find cases about labor disputes")
- `deep`: Multi-step research (e.g., "Compare precedents on intellectual property")
- `workflow`: Multi-agent process (e.g., "Review this contract for compliance")

**Key Functions**:

```typescript
detectQueryComplexity(message: string): ComplexityAnalysis
shouldUseMastra(complexity: QueryComplexity): boolean
getWorkflowType(complexity: QueryComplexity): string
```

### 2. New AI SDK Tools

#### Tavily QNA (`lib/ai/tools/tavily-qna.ts`)

- **Use**: Simple, fast Q&A
- **API**: `tavily_client.search()` with `search_depth: "basic"`
- **Returns**: Direct answer + 3 sources
- **Complexity**: Simple

#### Tavily Advanced Search (`lib/ai/tools/tavily-advanced-search.ts`)

- **Use**: Detailed research with comprehensive results
- **API**: `tavily_client.search()` with `search_depth: "advanced"`, `include_answer: true`
- **Returns**: AI answer + up to 10 detailed results
- **Complexity**: Light

### 3. Mastra Agents

#### Medium Research Agent (`mastra/agents/medium-research-agent.ts`)

- **Purpose**: Handle queries requiring 2-4 searches
- **Max Tool Calls**: 4
- **Strategy**: Break query into focused searches, synthesize results
- **Tools**: `tavilySearchAdvancedTool`

#### Search Agent (`mastra/agents/search-agent.ts`)

- **Purpose**: Step 1 of deep research - find sources
- **Max Tool Calls**: 4
- **Output**: List of relevant URLs with descriptions
- **Tools**: `tavilySearchAdvancedTool`

#### Extract Agent (`mastra/agents/extract-agent.ts`)

- **Purpose**: Step 2 of deep research - extract content
- **Max Tool Calls**: 4
- **Output**: Full content from top sources
- **Tools**: `tavilyExtractTool`

#### Analysis Agent (`mastra/agents/analysis-agent.ts`)

- **Purpose**: Step 3 of deep research - analyze content
- **Max Tool Calls**: 0 (pure reasoning)
- **Output**: Comprehensive legal analysis with citations
- **Tools**: None

### 4. Mastra Workflows

#### Deep Research Workflow (`mastra/workflows/deep-research-workflow.ts`)

```
Step 1: Search Agent → Find 3-4 relevant sources
Step 2: Extract Agent → Get full content from sources
Step 3: Analysis Agent → Comprehensive analysis with citations
```

**Use Cases**:

- Case law analysis
- Comparative legal research
- Precedent comparison
- Framework analysis

#### Document Review Workflow (`mastra/workflows/document-review-workflow.ts`)

```
Step 1: Analyze Document → Identify issues and strengths
Step 2: Suggest Improvements → Generate actionable recommendations
Step 3: Validate → Prioritize and verify suggestions
```

**Use Cases**:

- Contract review
- Legal compliance checks
- Document improvement
- Quality assurance

### 5. Routing Logic (`app/(chat)/api/chat/route-with-routing.ts`)

**Decision Flow**:

1. **Detect Complexity**

   ```typescript
   const complexityAnalysis = detectQueryComplexity(userMessageText);
   ```

2. **Route to Mastra** (medium, deep, workflow)

   ```typescript
   if (shouldUseMastra(complexity)) {
     // Use Mastra agents/workflows
     // chatRoute() transforms stream to AI SDK format
   }
   ```

3. **Route to AI SDK** (simple, light)
   ```typescript
   // Select appropriate tools based on complexity
   // simple → tavilyQna
   // light → tavilyAdvancedSearch
   ```

## Implementation Steps

### Step 1: Install Dependencies

Ensure you have:

```json
{
  "@mastra/core": "^0.20.2",
  "ai": "5.0.26"
}
```

### Step 2: Replace Chat Route

**Option A: Gradual Migration**

1. Keep current route as `route-backup.ts`
2. Test new route with specific users
3. Monitor performance and accuracy
4. Full rollout when confident

**Option B: Direct Replacement**

```bash
# Backup current route
mv app/(chat)/api/chat/route.ts app/(chat)/api/chat/route-backup.ts

# Use new routing logic
mv app/(chat)/api/chat/route-with-routing.ts app/(chat)/api/chat/route.ts
```

### Step 3: Environment Variables

Ensure these are set:

```env
TAVILY_API_KEY=your_tavily_key
CEREBRAS_API_KEY=your_cerebras_key
# Or multiple keys for load balancing:
CEREBRAS_API_KEY_1=key1
CEREBRAS_API_KEY_2=key2
```

### Step 4: Test Each Complexity Level

#### Simple Q&A

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-1",
    "message": {
      "id": "msg-1",
      "role": "user",
      "parts": [{"text": "What is contract law?"}]
    },
    "selectedChatModel": "chat-model",
    "selectedVisibilityType": "private"
  }'
```

Expected: Fast response using `tavilyQna`

#### Light Research

```bash
# Query: "Explain property rights in Zimbabwe"
```

Expected: Detailed response using `tavilyAdvancedSearch`

#### Medium Research

```bash
# Query: "Find cases about labor disputes in Zimbabwe"
```

Expected: Mastra `mediumResearchAgent` with 2-4 searches

#### Deep Research

```bash
# Query: "Compare precedents on intellectual property rights"
```

Expected: Mastra `deepResearchWorkflow` (search → extract → analyze)

#### Document Review

```bash
# Query: "Review this contract: [contract text]"
```

Expected: Mastra `documentReviewWorkflow` (analyze → suggest → validate)

### Step 5: Monitor Logs

Look for routing indicators:

```
[Routing] Query: "..."
[Routing] Complexity: medium
[Routing] Reasoning: Requires multiple search queries...
[Routing] 🟢 Routing to Mastra (medium)
```

or

```
[Routing] 🔵 Using AI SDK (simple)
[Routing] Active tools: tavilyQna, createDocument, updateDocument
```

## Performance Optimization

### Tool Call Limits

Each Mastra agent is limited to **max 4 tool calls**:

```typescript
const result = await agent.generate(userMessage, {
  maxSteps: 4, // Enforces limit
});
```

This prevents:

- Excessive API calls
- Long response times
- High costs
- Infinite loops

### Workflow Steps

Each workflow has **explicit steps** with clear handoffs:

```typescript
workflow
  .step(searchStep) // Max 4 searches
  .then(extractStep) // Max 4 extractions
  .then(analyzeStep) // No tools, pure reasoning
  .commit();
```

### Streaming with chatRoute()

Mastra's `chatRoute()` automatically transforms agent streams to AI SDK format:

```typescript
// In Mastra agent
const stream = agent.stream(message);

// chatRoute() transforms to AI SDK format
return chatRoute(stream);
```

This ensures:

- Seamless UI integration
- Consistent streaming behavior
- No client-side changes needed

## Cost Analysis

### Simple Query (AI SDK + QNA)

- **API Calls**: 1 Tavily QNA search
- **Model**: Cerebras gpt-oss-120b (cheap)
- **Cost**: ~$0.001

### Light Research (AI SDK + Advanced Search)

- **API Calls**: 1 Tavily advanced search
- **Model**: Cerebras gpt-oss-120b
- **Cost**: ~$0.002

### Medium Research (Mastra Agent)

- **API Calls**: 2-4 Tavily advanced searches
- **Model**: Cerebras gpt-oss-120b
- **Cost**: ~$0.005-0.008

### Deep Research (Mastra Workflow)

- **API Calls**: 4 searches + 4 extractions
- **Model**: 3x Cerebras gpt-oss-120b
- **Cost**: ~$0.015-0.020

### Document Review (Mastra Workflow)

- **API Calls**: 0 (pure reasoning)
- **Model**: 3x Cerebras gpt-oss-120b
- **Cost**: ~$0.005-0.010

## Troubleshooting

### Issue: Mastra agent not found

**Solution**: Ensure Mastra index exports all agents

```typescript
// mastra/index.ts
export const mastra = new Mastra({
  agents: {
    mediumResearchAgent,
    searchAgent,
    extractAgent,
    analysisAgent,
  },
  workflows: {
    deepResearchWorkflow,
    documentReviewWorkflow,
  },
});
```

### Issue: Workflow not executing

**Solution**: Check workflow commit

```typescript
workflow.step(step1).then(step2).commit(); // Must call commit()
```

### Issue: Tool calls exceeding limit

**Solution**: Enforce maxSteps

```typescript
await agent.generate(message, {
  maxSteps: 4, // Hard limit
});
```

### Issue: Streaming not working

**Solution**: Use chatRoute() for Mastra streams

```typescript
import { chatRoute } from "@mastra/core";

const stream = await agent.stream(message);
return chatRoute(stream); // Transforms to AI SDK format
```

## Future Enhancements

### 1. Dynamic Complexity Detection

Use an LLM to classify complexity:

```typescript
const complexity = await classifyComplexity(message);
```

### 2. User Preference Learning

Track which routing works best for each user:

```typescript
const preferredRoute = await getUserPreference(userId, queryType);
```

### 3. Cost-Based Routing

Route based on user's plan:

```typescript
if (user.plan === "free" && complexity === "deep") {
  return "Upgrade to access deep research";
}
```

### 4. Parallel Workflows

Run multiple workflows concurrently:

```typescript
const [research, review] = await Promise.all([
  deepResearchWorkflow.execute({ query }),
  documentReviewWorkflow.execute({ document }),
]);
```

## Summary

This implementation provides:

✅ **Intelligent routing** based on query complexity
✅ **Cost optimization** - simple queries use cheap tools
✅ **Performance** - fast responses for simple queries
✅ **Capability** - deep research for complex queries
✅ **Tool limits** - max 4 calls per agent prevents runaway costs
✅ **Seamless streaming** - chatRoute() ensures UI compatibility
✅ **Explicit workflows** - clear multi-step processes
✅ **Hybrid approach** - best of AI SDK and Mastra

The system automatically selects the right tool for the job, optimizing for speed, cost, and accuracy.
