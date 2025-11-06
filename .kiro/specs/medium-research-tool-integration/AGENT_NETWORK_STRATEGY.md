# Agent Network Strategy: Multi-Agent Orchestration in Main Chat

## The Better Approach: Agent Networks, Not Tool Wrappers

You're correct - wrapping workflows as tools will face limitations. The superior approach is **agent networks** where agents can delegate to other specialized agents.

---

## Why Tool Wrappers Have Limitations

### Problems with Workflow-as-Tool Pattern

```typescript
// ❌ Limited: Workflow wrapped as a tool
const advancedSearchWorkflowTool = createTool({
  execute: async ({ context }) => {
    const run = await advancedSearchWorkflow.createRunAsync();
    const result = await run.start({ inputData: context });
    return result;
  },
});

// Agent uses it as a tool
agent.tools = {
  advancedSearchWorkflow: advancedSearchWorkflowTool,
};
```

**Limitations:**

1. **No dynamic decision-making** - Workflow is deterministic, can't adapt mid-execution
2. **No agent reasoning** - Can't leverage LLM intelligence within the workflow
3. **Fixed execution path** - Can't branch based on intermediate results
4. **Limited context** - Can't maintain conversation state across workflow steps
5. **No collaborative agents** - Can't have multiple agents working together
6. **Scaling issues** - Each new capability requires a new tool wrapper

---

## Agent Networks: The Scalable Solution

### Architecture

```
Main Chat Route
    ↓
Complexity Detection / User Mode Selection
    ↓
Router Agent (Orchestrator)
    ↓
    ├─→ Chat Agent (simple queries)
    │   └─→ Tools: createDocument, updateDocument
    │
    ├─→ Research Agent Network (medium/deep queries)
    │   ├─→ Search Agent (finds sources)
    │   ├─→ Analysis Agent (analyzes content)
    │   ├─→ Synthesis Agent (creates final response)
    │   └─→ Citation Agent (formats references)
    │
    ├─→ Document Agent Network (drafting tasks)
    │   ├─→ Research Agent (gathers info)
    │   ├─→ Drafting Agent (writes content)
    │   └─→ Review Agent (quality checks)
    │
    └─→ Case Law Agent Network (legal research)
        ├─→ Search Agent (finds cases)
        ├─→ Analysis Agent (extracts holdings)
        └─→ Comparison Agent (compares precedents)
```

### Key Concept: Agents Delegate to Agents

Instead of:

```typescript
// ❌ Agent calls workflow tool
agent → workflow tool → deterministic steps
```

Use:

```typescript
// ✅ Agent delegates to specialized agents
orchestrator agent → research agent → search agent
                                   → analysis agent
                                   → synthesis agent
```

---

## Implementation Strategy

### Phase 1: Create Agent Networks

#### 1.1 Research Agent Network

```typescript
// mastra/agent-networks/research-network.ts
import { Agent } from "@mastra/core/agent";
import { createAgentNetwork } from "@mastra/core/agent-network";

/**
 * Search Agent - Finds relevant sources
 */
const searchAgent = new Agent({
  name: "search-agent",
  instructions: `You are a search specialist. Your job is to find the most relevant sources for a legal query.
  
  Use Tavily search tools to find:
  - Authoritative legal sources
  - Recent case law
  - Statutory provisions
  - Academic commentary
  
  Return a list of sources with URLs and brief descriptions.`,

  model: () => cerebrasProvider("gpt-oss-120b"),

  tools: {
    tavilySearch,
    tavilyAdvancedSearch,
    tavilyQna,
  },
});

/**
 * Analysis Agent - Analyzes content from sources
 */
const analysisAgent = new Agent({
  name: "analysis-agent",
  instructions: `You are a legal analysis specialist. You receive sources and extract key information.
  
  Your tasks:
  - Extract relevant legal principles
  - Identify key holdings and ratios
  - Note important statutory provisions
  - Summarize academic arguments
  
  Use tavilyExtract to get full content from URLs.`,

  model: () => cerebrasProvider("gpt-oss-120b"),

  tools: {
    tavilyExtract,
  },
});

/**
 * Synthesis Agent - Creates final comprehensive response
 */
const synthesisAgent = new Agent({
  name: "synthesis-agent",
  instructions: `You are a legal synthesis specialist. You receive analyzed content and create a comprehensive response.
  
  Your tasks:
  - Synthesize information from multiple sources
  - Create coherent narrative
  - Include proper citations
  - Provide practical implications
  - Maintain professional legal writing standards`,

  model: () => cerebrasProvider("llama-3.3-70b"), // Use more powerful model for synthesis

  tools: {
    createDocument, // Can create document artifacts
  },
});

/**
 * Research Orchestrator - Coordinates the research network
 */
export const researchOrchestrator = new Agent({
  name: "research-orchestrator",
  instructions: `You are a research coordinator. You break down complex legal research queries into steps and delegate to specialized agents.
  
  Your workflow:
  1. Analyze the query to understand what's needed
  2. Delegate to searchAgent to find sources
  3. Delegate to analysisAgent to extract key information
  4. Delegate to synthesisAgent to create final response
  
  You can iterate if needed - for example, if initial search is insufficient, ask searchAgent to search again with refined queries.
  
  CRITICAL: You coordinate but don't do the work yourself. Always delegate to specialized agents.`,

  model: () => cerebrasProvider("llama-3.3-70b"),

  // Orchestrator can delegate to other agents
  agents: {
    search: searchAgent,
    analysis: analysisAgent,
    synthesis: synthesisAgent,
  },
});

/**
 * Create the research agent network
 */
export const researchNetwork = createAgentNetwork({
  name: "research-network",
  orchestrator: researchOrchestrator,
  agents: [searchAgent, analysisAgent, synthesisAgent],
});
```

#### 1.2 Document Drafting Agent Network

```typescript
// mastra/agent-networks/document-network.ts

const researchAgent = new Agent({
  name: "document-research-agent",
  instructions: `You research information needed for document drafting.
  
  Find:
  - Relevant legal provisions
  - Standard clauses and templates
  - Best practices
  - Jurisdiction-specific requirements`,

  model: () => cerebrasProvider("gpt-oss-120b"),
  tools: { tavilySearch, tavilyQna },
});

const draftingAgent = new Agent({
  name: "drafting-agent",
  instructions: `You draft legal documents based on research and user requirements.
  
  Your drafts should:
  - Follow proper legal formatting
  - Include all necessary clauses
  - Use appropriate legal language
  - Be jurisdiction-appropriate (Zimbabwe)
  - Include placeholders for specific details`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  tools: { createDocument },
});

const reviewAgent = new Agent({
  name: "review-agent",
  instructions: `You review drafted documents for quality and completeness.
  
  Check for:
  - Legal accuracy
  - Completeness of clauses
  - Proper formatting
  - Clarity and readability
  - Jurisdiction compliance
  
  Suggest improvements if needed.`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  tools: { updateDocument },
});

export const documentOrchestrator = new Agent({
  name: "document-orchestrator",
  instructions: `You coordinate document drafting.
  
  Workflow:
  1. Understand document requirements
  2. Delegate to researchAgent for background information
  3. Delegate to draftingAgent to create initial draft
  4. Delegate to reviewAgent for quality check
  5. Iterate if improvements needed`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  agents: {
    research: researchAgent,
    drafting: draftingAgent,
    review: reviewAgent,
  },
});

export const documentNetwork = createAgentNetwork({
  name: "document-network",
  orchestrator: documentOrchestrator,
  agents: [researchAgent, draftingAgent, reviewAgent],
});
```

#### 1.3 Case Law Agent Network

```typescript
// mastra/agent-networks/caselaw-network.ts

const caseFindingAgent = new Agent({
  name: "case-finding-agent",
  instructions: `You find relevant case law for legal queries.
  
  Search for:
  - Zimbabwe Supreme Court decisions
  - High Court judgments
  - Relevant precedents
  - Similar fact patterns`,

  model: () => cerebrasProvider("gpt-oss-120b"),
  tools: { tavilySearch, tavilyAdvancedSearch },
});

const caseAnalysisAgent = new Agent({
  name: "case-analysis-agent",
  instructions: `You analyze case law to extract key legal principles.
  
  Extract:
  - Ratio decidendi (binding principle)
  - Obiter dicta (persuasive statements)
  - Key facts
  - Court's reasoning
  - Dissenting opinions if relevant`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  tools: { tavilyExtract },
});

const comparisonAgent = new Agent({
  name: "comparison-agent",
  instructions: `You compare multiple cases to identify patterns and principles.
  
  Analyze:
  - Consistency across cases
  - Evolution of legal principles
  - Distinguishing factors
  - Hierarchy of authority`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  tools: { createDocument },
});

export const caselawOrchestrator = new Agent({
  name: "caselaw-orchestrator",
  instructions: `You coordinate case law research.
  
  Workflow:
  1. Understand the legal issue
  2. Delegate to caseFindingAgent to locate cases
  3. Delegate to caseAnalysisAgent to analyze each case
  4. Delegate to comparisonAgent to synthesize findings`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  agents: {
    finding: caseFindingAgent,
    analysis: caseAnalysisAgent,
    comparison: comparisonAgent,
  },
});

export const caselawNetwork = createAgentNetwork({
  name: "caselaw-network",
  orchestrator: caselawOrchestrator,
  agents: [caseFindingAgent, caseAnalysisAgent, comparisonAgent],
});
```

### Phase 2: Update Main Chat Route

#### 2.1 Update Complexity Detector

```typescript
// lib/ai/complexity-detector.ts

export type QueryComplexity =
  | "simple" // Direct answer, no research
  | "light" // Single agent with tools
  | "medium" // Research agent network
  | "deep" // Deep research network
  | "workflow-drafting" // Document network
  | "workflow-caselaw" // Case law network
  | "workflow-review"; // Review network

export function detectQueryComplexity(
  query: string,
  userOverride?: "auto" | "medium" | "deep"
): ComplexityAnalysis {
  // User override
  if (userOverride) {
    return mapUserModeToComplexity(userOverride);
  }

  // Detect workflow type
  if (containsDraftingKeywords(query)) {
    return {
      complexity: "workflow-drafting",
      reasoning: "Query requires document drafting workflow",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 8,
      networkType: "document",
    };
  }

  if (containsCaselawKeywords(query)) {
    return {
      complexity: "workflow-caselaw",
      reasoning: "Query requires case law research workflow",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 10,
      networkType: "caselaw",
    };
  }

  // Detect research depth
  if (requiresDeepResearch(query)) {
    return {
      complexity: "deep",
      reasoning: "Query requires comprehensive multi-source research",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 12,
      networkType: "research",
    };
  }

  if (requiresMediumResearch(query)) {
    return {
      complexity: "medium",
      reasoning: "Query requires balanced research with multiple sources",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 6,
      networkType: "research",
    };
  }

  // Simple/light queries use single agent
  // ...existing logic
}

function containsDraftingKeywords(query: string): boolean {
  const keywords = [
    "draft",
    "create document",
    "write document",
    "prepare contract",
    "create agreement",
    "draft letter",
    "write memo",
  ];
  return keywords.some((kw) => query.toLowerCase().includes(kw));
}

function containsCaselawKeywords(query: string): boolean {
  const keywords = [
    "case law",
    "precedent",
    "court decision",
    "supreme court",
    "high court",
    "judgment",
    "find cases about",
    "relevant cases",
  ];
  return keywords.some((kw) => query.toLowerCase().includes(kw));
}
```

#### 2.2 Update Agent Selection

```typescript
// lib/ai/mastra-sdk-integration.ts

export async function streamMastraAgent(
  complexity: QueryComplexity,
  query: string,
  options?: MastraStreamOptions
) {
  logger.log("[Mastra SDK] Streaming agent", { complexity, options });

  // Select agent or agent network based on complexity
  const selection = selectAgentOrNetwork(complexity, options);

  logger.log(`[Mastra SDK] Selected: ${selection.type} - ${selection.name}`);

  let agent: any;

  if (selection.type === "network") {
    // Use agent network orchestrator
    agent = await getAgentNetwork(selection.name, options);
  } else {
    // Use single agent
    agent = await getSingleAgent(selection.name, options);
  }

  if (!agent) {
    throw new Error(`Agent/Network '${selection.name}' not found`);
  }

  // Stream with AI SDK v5 format
  const stream = await agent.stream([{ role: "user", content: query }], {
    format: "aisdk",
    maxSteps: selection.maxSteps,
  } as any);

  logger.log("[Mastra SDK] ✅ Stream created successfully");

  return stream;
}

function selectAgentOrNetwork(
  complexity: QueryComplexity,
  options?: MastraStreamOptions
): {
  type: "agent" | "network";
  name: string;
  maxSteps: number;
} {
  // User override
  if (options?.agentName) {
    return {
      type: "agent",
      name: options.agentName,
      maxSteps: 5,
    };
  }

  // Select based on complexity
  switch (complexity) {
    case "simple":
    case "light":
      return {
        type: "agent",
        name: "chatAgent",
        maxSteps: 3,
      };

    case "medium":
      return {
        type: "network",
        name: "researchNetwork",
        maxSteps: 8,
      };

    case "deep":
      return {
        type: "network",
        name: "researchNetwork",
        maxSteps: 15,
      };

    case "workflow-drafting":
      return {
        type: "network",
        name: "documentNetwork",
        maxSteps: 10,
      };

    case "workflow-caselaw":
      return {
        type: "network",
        name: "caselawNetwork",
        maxSteps: 12,
      };

    default:
      return {
        type: "agent",
        name: "chatAgent",
        maxSteps: 5,
      };
  }
}

async function getAgentNetwork(
  networkName: string,
  options?: MastraStreamOptions
): Promise<any> {
  switch (networkName) {
    case "researchNetwork": {
      const { researchOrchestrator } = await import(
        "@/mastra/agent-networks/research-network"
      );
      return researchOrchestrator;
    }

    case "documentNetwork": {
      const { documentOrchestrator } = await import(
        "@/mastra/agent-networks/document-network"
      );
      return documentOrchestrator;
    }

    case "caselawNetwork": {
      const { caselawOrchestrator } = await import(
        "@/mastra/agent-networks/caselaw-network"
      );
      return caselawOrchestrator;
    }

    default:
      throw new Error(`Unknown network: ${networkName}`);
  }
}

async function getSingleAgent(
  agentName: string,
  options?: MastraStreamOptions
): Promise<any> {
  // Existing single agent logic
  // ...
}
```

### Phase 3: Register Networks in Mastra

```typescript
// mastra/index.ts
import { Mastra } from "@mastra/core";
import { agents } from "./agents";
import { researchNetwork } from "./agent-networks/research-network";
import { documentNetwork } from "./agent-networks/document-network";
import { caselawNetwork } from "./agent-networks/caselaw-network";

export const mastra = new Mastra({
  agents,

  // Register agent networks
  networks: {
    researchNetwork,
    documentNetwork,
    caselawNetwork,
  },
});
```

---

## Advantages of Agent Networks

### 1. **Dynamic Decision-Making**

```typescript
// Orchestrator can adapt based on intermediate results
orchestrator: "Search didn't find enough sources, let me try a different search strategy";
```

### 2. **Agent Reasoning at Each Step**

```typescript
// Each agent uses LLM intelligence
searchAgent: "These sources look authoritative, I'll prioritize them";
analysisAgent: "This case has a strong ratio decidendi, I'll extract it carefully";
synthesisAgent: "I'll structure this as: principles → application → conclusion";
```

### 3. **Collaborative Intelligence**

```typescript
// Agents work together, building on each other's work
searchAgent → finds 5 sources
analysisAgent → analyzes each source
synthesisAgent → creates coherent narrative from all analyses
```

### 4. **Flexible Execution Paths**

```typescript
// Orchestrator can branch based on results
if (searchResults.length < 3) {
  // Try different search strategy
  searchAgent.search(refinedQuery);
} else {
  // Proceed to analysis
  analysisAgent.analyze(searchResults);
}
```

### 5. **Scalability**

```typescript
// Easy to add new networks
export const contractReviewNetwork = createAgentNetwork({
  orchestrator: contractReviewOrchestrator,
  agents: [clauseAnalysisAgent, riskAssessmentAgent, recommendationAgent],
});
```

### 6. **Specialization**

```typescript
// Each agent is highly specialized
caseFindingAgent: Expert at finding cases
caseAnalysisAgent: Expert at extracting legal principles
comparisonAgent: Expert at synthesizing multiple cases
```

---

## Comparison: Tool Wrappers vs Agent Networks

| Aspect            | Tool Wrappers           | Agent Networks               |
| ----------------- | ----------------------- | ---------------------------- |
| **Flexibility**   | Fixed workflow          | Dynamic adaptation           |
| **Intelligence**  | Deterministic steps     | LLM reasoning at each step   |
| **Collaboration** | Sequential execution    | Agents work together         |
| **Scalability**   | New tool per workflow   | New agent per capability     |
| **Context**       | Limited                 | Full conversation context    |
| **Iteration**     | No                      | Yes (orchestrator can retry) |
| **Complexity**    | Simple                  | Can handle complex tasks     |
| **Cost**          | Lower (fewer LLM calls) | Higher (more LLM calls)      |
| **Latency**       | Faster                  | Slower                       |
| **Quality**       | Good                    | Excellent                    |

---

## When to Use What

### Use Single Agent + Tools

- Simple queries
- Fast responses needed
- Low token budget
- Deterministic workflows

### Use Agent Networks

- Complex research
- Multi-step reasoning
- Collaborative tasks
- Quality over speed
- Adaptive workflows

### Hybrid Approach (Recommended)

```typescript
// Let complexity detection decide
if (complexity === "simple" || complexity === "light") {
  // Use single agent with tools (fast)
  return chatAgent;
} else {
  // Use agent network (quality)
  return researchNetwork;
}
```

---

## Implementation Checklist

- [ ] Create research agent network
- [ ] Create document drafting agent network
- [ ] Create case law agent network
- [ ] Update complexity detector to detect network types
- [ ] Update agent selection to support networks
- [ ] Register networks in Mastra
- [ ] Update main chat route to use networks
- [ ] Add UI for network selection (optional)
- [ ] Test network orchestration
- [ ] Monitor token usage and latency
- [ ] Optimize network performance

---

## Conclusion

**Agent networks are the scalable solution** for complex multi-step tasks. They provide:

✅ **Dynamic intelligence** - LLM reasoning at each step
✅ **Collaborative work** - Agents build on each other
✅ **Flexible execution** - Adapt based on intermediate results
✅ **Easy scaling** - Add new networks for new capabilities
✅ **Better quality** - Specialized agents for each task

The main chat route becomes a **smart router** that selects the appropriate agent or agent network based on query complexity, giving you both speed (single agents) and quality (agent networks) in one unified system.
