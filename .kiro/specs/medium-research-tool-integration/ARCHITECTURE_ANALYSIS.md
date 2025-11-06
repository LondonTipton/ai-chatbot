# Architecture Analysis: Research Routes vs Main Chat Integration

## Executive Summary

You created separate `/api/research` routes with dedicated agents (auto, medium, deep) that duplicate functionality already available in the main `/api/chat` route. This analysis examines what was lost, what was gained, and proposes a hybrid integration strategy.

---

## The Error: Parallel Architecture Instead of Integration

### What You Built

```
Frontend → /api/research → [autoAgent | mediumAgent | deepAgent]
                          ↓
                    Workflows as Tools
                          ↓
                    [basicSearch | advancedSearch | comprehensiveAnalysis]
```

### What Already Existed

```
Frontend → /api/chat → Complexity Detection → streamMastraAgent()
                                            ↓
                                    [chatAgent | searchAgent | etc.]
                                            ↓
                                    advancedSearchWorkflowTool
```

### The Problem

You created a **parallel system** instead of **integrating into the existing intelligent routing**.

---

## What You Lost by Creating Separate Routes

### 1. **Database Integration**

- ❌ No chat persistence (messages not saved)
- ❌ No chat history
- ❌ No user context across conversations
- ❌ No message threading

### 2. **Usage Tracking & Limits**

- ❌ Separate rate limiting system (not unified)
- ❌ Separate token tracking (not integrated with main usage)
- ❌ No transaction rollback on errors
- ❌ Inconsistent usage reporting

### 3. **Authentication & Authorization**

- ❌ Separate auth checks
- ❌ No unified user session management
- ❌ Duplicate user lookup logic

### 4. **UI Integration**

- ❌ Not used by main chat interface
- ❌ No streaming to UI (uses generate() not stream())
- ❌ No real-time updates
- ❌ No artifact rendering in chat

### 5. **Error Handling & Fallbacks**

- ❌ No fallback to AI SDK on Mastra failure
- ❌ No automatic key rotation (Cerebras)
- ❌ No resumable streams
- ❌ Less robust error recovery

### 6. **Caching & Performance**

- ✅ Has query cache (GOOD)
- ❌ But separate from main chat cache
- ❌ No cache coordination

### 7. **Telemetry & Monitoring**

- ❌ Separate logging system
- ❌ No unified metrics
- ❌ Harder to debug cross-system issues

---

## What You Gained (Advantages)

### 1. **Explicit Mode Selection**

```typescript
{
  mode: "auto" | "medium" | "deep";
}
```

- User can explicitly choose research depth
- Bypasses complexity detection
- Predictable behavior

### 2. **Dedicated Research Agents**

- **autoAgent**: Optimized for speed (3 steps, 500-2.5K tokens)
- **mediumAgent**: Balanced research (6 steps, 1K-8K tokens)
- **deepAgent**: Comprehensive analysis (3 steps, 2K-20K tokens)

Each agent has:

- Specialized instructions
- Curated tool sets
- Optimized step budgets
- Clear decision guides

### 3. **Workflow-First Architecture**

- Agents wrap workflows as tools
- Clean separation of concerns
- Workflows are reusable
- Easier to test workflows independently

### 4. **Query Caching**

```typescript
queryCache.get(query, mode, jurisdiction);
```

- Caches by query + mode + jurisdiction
- Reduces redundant research
- Faster repeat queries

### 5. **Structured Response Format**

```typescript
{
  success: boolean,
  response: string,
  metadata: {
    mode: string,
    stepsUsed: number,
    toolsCalled: string[],
    tokenEstimate: number,
    cached: boolean,
    latency: number
  },
  sources: Array<{title, url}>,
  toolCalls: Array<{toolName, args, result}>
}
```

- Consistent API contract
- Rich metadata for debugging
- Source citations included
- Tool call transparency

### 6. **Simpler Testing**

- Standalone endpoint
- No complexity detection interference
- Direct agent invocation
- Easier to unit test

---

## Hybrid Integration Strategy

### Goal

Integrate research workflows into main `/api/chat` while preserving the advantages of explicit mode selection.

### Architecture

```
Frontend → /api/chat → Complexity Detection
                            ↓
                    [Auto-route OR User-selected mode]
                            ↓
                    streamMastraAgent()
                            ↓
                    Agent Selection:
                    - chatAgent (simple/light)
                    - autoAgent (user-selected "auto")
                    - mediumAgent (user-selected "medium")
                    - deepAgent (user-selected "deep")
                            ↓
                    Workflows as Tools:
                    - basicSearchWorkflowTool
                    - advancedSearchWorkflowTool
                    - comprehensiveAnalysisWorkflowTool
```

---

## Implementation Plan

### Phase 1: Wrap Workflows as Tools (DONE ✅)

You already have:

- `advancedSearchWorkflowTool` in `mastra/tools/advanced-search-workflow-tool.ts`

Need to create:

- `basicSearchWorkflowTool` (wrap basicSearchWorkflow)
- `comprehensiveAnalysisWorkflowTool` (wrap comprehensiveAnalysisWorkflow)

### Phase 2: Integrate Research Agents into Main Chat

#### 2.1 Update Request Schema

```typescript
// app/(chat)/api/chat/schema.ts
export const postRequestBodySchema = z.object({
  id: z.string(),
  message: z.object({...}),
  selectedChatModel: z.string(),
  selectedVisibilityType: z.enum([...]),
  // NEW: Optional research mode override
  researchMode: z.enum(["auto", "medium", "deep"]).optional(),
});
```

#### 2.2 Update Complexity Detector

```typescript
// lib/ai/complexity-detector.ts
export function detectQueryComplexity(
  query: string,
  userOverride?: "auto" | "medium" | "deep"
): ComplexityAnalysis {
  // If user explicitly selected a mode, use it
  if (userOverride) {
    return {
      complexity: mapModeToComplexity(userOverride),
      reasoning: `User-selected ${userOverride} mode`,
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: getModeSteps(userOverride),
    };
  }

  // Otherwise, auto-detect as before
  // ...existing logic
}

function mapModeToComplexity(mode: string): QueryComplexity {
  switch (mode) {
    case "auto":
      return "light";
    case "medium":
      return "medium";
    case "deep":
      return "deep";
    default:
      return "simple";
  }
}
```

#### 2.3 Update Agent Selection

```typescript
// lib/ai/mastra-sdk-integration.ts
function selectAgentForComplexity(
  complexity: QueryComplexity,
  userMode?: "auto" | "medium" | "deep"
): string {
  // If user explicitly selected a mode, use corresponding agent
  if (userMode) {
    switch (userMode) {
      case "auto":
        return "autoAgent";
      case "medium":
        return "mediumAgent";
      case "deep":
        return "deepAgent";
    }
  }

  // Otherwise, use complexity-based selection
  switch (complexity) {
    case "simple":
    case "light":
      return "chatAgent";

    case "medium":
      return "mediumAgent"; // Use medium agent for medium complexity

    case "deep":
    case "workflow-review":
    case "workflow-drafting":
    case "workflow-caselaw":
      return "deepAgent"; // Use deep agent for deep research

    default:
      return "chatAgent";
  }
}
```

#### 2.4 Register Research Agents in Mastra

```typescript
// mastra/agents/index.ts
import { autoAgent } from "./auto-agent";
import { mediumAgent } from "./medium-agent";
import { deepAgent } from "./deep-agent";

export const agents = {
  chatAgent,
  legalAgent,
  searchAgent,
  mediumResearchAgent,
  // NEW: Add research agents
  autoAgent,
  mediumAgent,
  deepAgent,
};
```

#### 2.5 Update Agent Factory

```typescript
// lib/ai/mastra-sdk-integration.ts
export async function streamMastraAgent(
  complexity: QueryComplexity,
  query: string,
  options?: MastraStreamOptions & { researchMode?: "auto" | "medium" | "deep" }
) {
  // Select agent based on user mode or complexity
  const agentName =
    options?.agentName ||
    selectAgentForComplexity(complexity, options?.researchMode);

  logger.log(`[Mastra SDK] Selected agent: ${agentName}`);

  // Get agent (with or without context)
  let agent: any;

  if (options?.userId) {
    switch (agentName) {
      case "autoAgent":
        agent = mastra.getAgent("autoAgent");
        break;

      case "mediumAgent":
        agent = mastra.getAgent("mediumAgent");
        break;

      case "deepAgent":
        agent = mastra.getAgent("deepAgent");
        break;

      // ...existing cases
    }
  } else {
    agent = mastra.getAgent(agentName as any);
  }

  // Stream with AI SDK v5 format
  const stream = await agent.stream([{ role: "user", content: query }], {
    format: "aisdk",
    maxSteps: getMaxStepsForAgent(agentName),
  } as any);

  return stream;
}

function getMaxStepsForAgent(agentName: string): number {
  switch (agentName) {
    case "autoAgent":
      return 3;
    case "mediumAgent":
      return 6;
    case "deepAgent":
      return 3;
    default:
      return 5;
  }
}
```

### Phase 3: Update UI for Mode Selection

#### 3.1 Add Research Mode Selector

```typescript
// components/research-mode-selector.tsx
export function ResearchModeSelector({
  value,
  onChange,
}: {
  value?: "auto" | "medium" | "deep";
  onChange: (mode?: "auto" | "medium" | "deep") => void;
}) {
  return (
    <Select
      value={value || "auto-detect"}
      onValueChange={(v) =>
        onChange(v === "auto-detect" ? undefined : (v as any))
      }
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto-detect">
          🤖 Auto-detect (Smart routing)
        </SelectItem>
        <SelectItem value="auto">⚡ Auto (Fast, 1-10s)</SelectItem>
        <SelectItem value="medium">🔍 Medium (Balanced, 10-20s)</SelectItem>
        <SelectItem value="deep">📚 Deep (Comprehensive, 25-47s)</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

#### 3.2 Update Chat Component

```typescript
// components/chat.tsx
const [researchMode, setResearchMode] = useState<"auto" | "medium" | "deep">();

// In prepareSendMessagesRequest:
prepareSendMessagesRequest(request) {
  return {
    body: {
      id: request.id,
      message: request.messages.at(-1),
      selectedChatModel: currentModelIdRef.current,
      selectedVisibilityType: visibilityType,
      researchMode, // NEW: Pass research mode
      ...request.body,
    },
  };
}
```

#### 3.3 Update MultimodalInput

```typescript
// components/multimodal-input.tsx
<ResearchModeSelector value={researchMode} onChange={setResearchMode} />
```

### Phase 4: Deprecate `/api/research`

Once integrated:

1. Mark `/api/research` as deprecated
2. Add migration guide
3. Update documentation
4. Eventually remove the route

---

## Benefits of Hybrid Approach

### ✅ Preserves Main Chat Advantages

- Database integration (chat history, persistence)
- Unified usage tracking and limits
- Streaming to UI with real-time updates
- Artifact rendering
- Error handling and fallbacks
- Resumable streams

### ✅ Preserves Research Route Advantages

- Explicit mode selection (user choice)
- Dedicated research agents with specialized instructions
- Workflow-first architecture
- Predictable behavior

### ✅ Additional Benefits

- Single source of truth
- Unified caching strategy
- Consistent error handling
- Easier maintenance
- Better testing
- Unified metrics

---

## Migration Path

### For Users

```typescript
// OLD: Separate research endpoint
fetch("/api/research", {
  method: "POST",
  body: JSON.stringify({
    query: "...",
    mode: "medium",
  }),
});

// NEW: Main chat with mode override
useChat({
  api: "/api/chat",
  body: {
    researchMode: "medium", // Optional override
  },
});
```

### For Developers

1. Keep `/api/research` for backward compatibility (short term)
2. Add deprecation warning in response headers
3. Update documentation to use main chat
4. Remove after migration period

---

## Conclusion

The separate research routes were a **learning experience** that revealed the value of:

- Explicit mode selection
- Specialized agents
- Workflow-first architecture

The **hybrid approach** integrates these learnings into the main chat route, giving you:

- **Best of both worlds**: Intelligent routing + user control
- **Single system**: Unified tracking, caching, and error handling
- **Better UX**: Seamless integration with chat UI
- **Easier maintenance**: One codebase to maintain

**Recommendation**: Implement the hybrid approach in phases, starting with wrapping workflows as tools and gradually migrating functionality from `/api/research` to `/api/chat`.
