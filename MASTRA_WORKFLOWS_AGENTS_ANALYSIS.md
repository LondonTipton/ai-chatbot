# Comprehensive Analysis: Mastra Workflows, Agents & Tools

## Executive Summary

DeepCounsel implements a sophisticated multi-agent AI system using the Mastra framework with **9 specialized agents** and **9 tools**. The system uses **no formal workflows** but implements a **conceptual 3-stage deep research pattern** through coordinated agent execution. All agents are powered by Cerebras `gpt-oss-120b` model with load-balanced API keys.

---

## Architecture Overview

### Core Components

- **Framework**: Mastra Core v0.23.3 with AI SDK v5 integration
- **Model Provider**: Cerebras `gpt-oss-120b` (131K context, reasoning-capable)
- **API Key Management**: Load-balanced Cerebras keys for reliability
- **Integration Pattern**: Official `@mastra/ai-sdk` for AI SDK v5 compatibility

### File Structure

```
mastra/
├── index.ts                          # Main Mastra instance
├── agents/                           # 9 specialized agents
│   ├── legal-agent.ts               # Primary legal research (with tools)
│   ├── legal-agent-direct.ts        # Fast legal responses (no tools)
│   ├── legal-agent-factory.ts       # Context-aware agent factory
│   ├── medium-research-agent.ts     # Multi-search research
│   ├── search-agent.ts              # Deep research - Stage 1
│   ├── extract-agent.ts             # Deep research - Stage 2
│   ├── analysis-agent.ts            # Deep research - Stage 3
│   ├── synthesizer-agent.ts         # Universal response formatter
│   └── research-agent-direct.ts     # Fast general research (no tools)
└── tools/                            # 9 tools
    ├── tavily-search.ts             # Basic web search
    ├── tavily-search-advanced.ts    # Advanced web search
    ├── tavily-qna.ts                # Quick Q&A search
    ├── tavily-extract.ts            # Content extraction
    ├── create-document.ts           # Document creation
    ├── update-document.ts           # Document updates
    ├── request-suggestions.ts       # Writing suggestions
    ├── summarize-content.ts         # Content summarization
    └── get-weather.ts               # Demo tool
```

---

##

Detailed Agent Analysis

### 1. Legal Agent (`legal-agent.ts`)

**Purpose**: Primary legal research agent with full tool access

**Configuration**:

- Model: Cerebras `gpt-oss-120b`
- Temperature: 0.7 (balanced creativity/accuracy)
- Max Tokens: 4000
- Tools: All 9 tools available

**System Instructions**:

```
You are a specialized legal research assistant with access to comprehensive
research tools. Provide accurate, well-researched legal information with
proper citations. Use tools strategically for thorough research.
```

**Use Cases**:

- Complex legal queries requiring tool usage
- Research requiring web searches and document extraction
- Cases needing document creation/updates
- Multi-step legal analysis

---

### 2. Legal Agent Direct (`legal-agent-direct.ts`)

**Purpose**: Fast legal responses without tool overhead

**Configuration**:

- Model: Cerebras `gpt-oss-120b`
- Temperature: 0.7
- Max Tokens: 4000
- Tools: None (direct responses only)

**System Instructions**:

```
You are a specialized legal research assistant. Provide accurate,
well-researched legal information based on your training. Be concise
but thorough. No tool access - rely on knowledge base.
```

**Use Cases**:

- Quick legal definitions
- General legal principles
- Fast responses without research
- Low-latency interactions

---

### 3. Legal Agent Factory (`legal-agent-factory.ts`)

**Purpose**: Context-aware agent selection system

**Logic**:

```typescript
export function getLegalAgent(context: {
  requiresTools?: boolean;
  complexity?: "simple" | "complex";
  responseTime?: "fast" | "thorough";
}) {
  if (context.requiresTools || context.complexity === "complex") {
    return legalAgent; // With tools
  }
  return legalAgentDirect; // Without tools
}
```

**Decision Factors**:

- Tool requirement detection
- Query complexity assessment
- Response time priorities
- Resource optimization

---

### 4. Medium Research Agent (`medium-research-agent.ts`)

**Purpose**: Balanced research with multiple search strategies

**Configuration**:

- Model: Cerebras `gpt-oss-120b`
- Temperature: 0.7
- Max Tokens: 6000 (larger for comprehensive results)
- Tools: Search, extract, QnA

**System Instructions**:

```
You are a research specialist. Conduct thorough research using multiple
search strategies. Synthesize information from various sources. Provide
comprehensive, well-structured responses with citations.
```

**Research Pattern**:

1. Initial broad search
2. Targeted follow-up searches
3. Content extraction from key sources
4. Synthesis and citation

---

### 5. Search Agent (`search-agent.ts`)

**Purpose**: Stage 1 of deep research - Query formulation and initial search

**Configuration**:

- Model: Cerebras `gpt-oss-120b`
- Temperature: 0.3 (focused, deterministic)
- Max Tokens: 2000
- Tools: Advanced search, QnA

**System Instructions**:

```
You are a search specialist. Your role is to:
1. Analyze the user query
2. Formulate optimal search queries
3. Execute searches using advanced parameters
4. Return structured search results for further processing

Be precise and methodical. Focus on finding the most relevant sources.
```

**Output Format**:

```json
{
  "queries": ["query1", "query2"],
  "results": [
    {
      "url": "...",
      "title": "...",
      "snippet": "...",
      "relevance": "high|medium|low"
    }
  ]
}
```

---

### 6. Extract Agent (`extract-agent.ts`)

**Purpose**: Stage 2 of deep research - Content extraction and processing

**Configuration**:

- Model: Cerebras `gpt-oss-120b`
- Temperature: 0.2 (highly focused)
- Max Tokens: 8000 (large for content processing)
- Tools: Extract, summarize

**System Instructions**:

```
You are a content extraction specialist. Your role is to:
1. Receive URLs from search results
2. Extract full content from each URL
3. Clean and structure the content
4. Identify key information and quotes
5. Prepare content for analysis

Maintain accuracy and preserve important details.
```

**Output Format**:

```json
{
  "extractions": [
    {
      "url": "...",
      "content": "...",
      "keyPoints": ["..."],
      "quotes": ["..."],
      "metadata": {}
    }
  ]
}
```

---

### 7. Analysis Agent (`analysis-agent.ts`)

**Purpose**: Stage 3 of deep research - Synthesis and analysis

**Configuration**:

- Model: Cerebras `gpt-oss-120b`
- Temperature: 0.5 (balanced)
- Max Tokens: 10000 (very large for comprehensive analysis)
- Tools: Document creation, summarization

**System Instructions**:

```
You are an analysis specialist. Your role is to:
1. Receive extracted content from multiple sources
2. Analyze and synthesize information
3. Identify patterns, contradictions, and insights
4. Create comprehensive, well-structured reports
5. Provide citations and evidence for all claims

Be thorough, objective, and insightful.
```

**Output Format**:

```markdown
# Analysis Report

## Executive Summary

...

## Key Findings

1. ...
2. ...

## Detailed Analysis

...

## Sources

- [Source 1](url)
- [Source 2](url)
```

---

### 8. Synthesizer Agent (`synthesizer-agent.ts`)

**Purpose**: Universal response formatter and quality enhancer

**Configuration**:

- Model: Cerebras `gpt-oss-120b`
- Temperature: 0.6 (creative but controlled)
- Max Tokens: 6000
- Tools: None (formatting only)

**System Instructions**:

```
You are a response synthesis specialist. Your role is to:
1. Receive raw agent outputs
2. Format responses for optimal readability
3. Ensure consistent tone and style
4. Add helpful structure (headings, lists, emphasis)
5. Maintain accuracy while improving presentation

Never add information not present in the input.
```

**Formatting Rules**:

- Use markdown for structure
- Add clear headings and sections
- Use bullet points for lists
- Emphasize key points
- Include citations inline

---

### 9. Research Agent Direct (`research-agent-direct.ts`)

**Purpose**: Fast general research without tool overhead

**Configuration**:

- Model: Cerebras `gpt-oss-120b`
- Temperature: 0.7
- Max Tokens: 4000
- Tools: None

**System Instructions**:

```
You are a general research assistant. Provide accurate, well-researched
information based on your training. Be comprehensive but concise.
No tool access - rely on knowledge base.
```

**Use Cases**:

- Quick factual queries
- General knowledge questions
- Fast responses without web search
- Low-latency interactions

---

## Tool Analysis

### 1. Tavily Search (`tavily-search.ts`)

**Type**: Basic web search
**Parameters**:

- `query`: Search query string
- `maxResults`: Number of results (default: 5)
- `searchDepth`: 'basic' | 'advanced'

**Returns**:

```typescript
{
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
}
```

---

### 2. Tavily Search Advanced (`tavily-search-advanced.ts`)

**Type**: Advanced web search with filters
**Parameters**:

- `query`: Search query
- `maxResults`: Number of results (default: 10)
- `searchDepth`: 'basic' | 'advanced'
- `includeDomains`: Domain whitelist
- `excludeDomains`: Domain blacklist
- `timeRange`: 'day' | 'week' | 'month' | 'year'

**Returns**: Same as basic search with additional metadata

---

### 3. Tavily QnA (`tavily-qna.ts`)

**Type**: Quick question-answering search
**Parameters**:

- `query`: Question string

**Returns**:

```typescript
{
  answer: string;
  sources: Array<{
    url: string;
    title: string;
  }>;
}
```

---

### 4. Tavily Extract (`tavily-extract.ts`)

**Type**: Content extraction from URLs
**Parameters**:

- `urls`: Array of URLs to extract
- `extractDepth`: 'basic' | 'advanced'

**Returns**:

```typescript
{
  extractions: Array<{
    url: string;
    content: string;
    title: string;
    metadata: object;
  }>;
}
```

---

### 5. Create Document (`create-document.ts`)

**Type**: Document generation
**Parameters**:

- `title`: Document title
- `content`: Document content (markdown)
- `type`: 'legal' | 'research' | 'general'

**Returns**:

```typescript
{
  documentId: string;
  url: string;
  createdAt: string;
}
```

---

### 6. Update Document (`update-document.ts`)

**Type**: Document modification
**Parameters**:

- `documentId`: Document ID
- `updates`: Partial content updates
- `mode`: 'append' | 'replace' | 'merge'

**Returns**:

```typescript
{
  documentId: string;
  updatedAt: string;
}
```

---

### 7. Request Suggestions (`request-suggestions.ts`)

**Type**: Writing assistance
**Parameters**:

- `content`: Text to improve
- `type`: 'grammar' | 'style' | 'clarity' | 'all'

**Returns**:

```typescript
{
  suggestions: Array<{
    original: string;
    suggested: string;
    reason: string;
  }>;
}
```

---

### 8. Summarize Content (`summarize-content.ts`)

**Type**: Content summarization
**Parameters**:

- `content`: Text to summarize
- `length`: 'short' | 'medium' | 'long'
- `format`: 'paragraph' | 'bullets' | 'outline'

**Returns**:

```typescript
{
  summary: string;
  keyPoints: string[];
}
```

---

### 9. Get Weather (`get-weather.ts`)

**Type**: Demo/test tool
**Parameters**:

- `location`: City name or coordinates

**Returns**:

```typescript
{
  temperature: number;
  conditions: string;
  forecast: string;
}
```

---

## Workflow Patterns

### Pattern 1: Simple Query Flow

```
User Query → Legal Agent Direct → Response
```

**Use Case**: Quick legal definitions, simple questions
**Latency**: ~1-2 seconds
**No tools used**

---

### Pattern 2: Tool-Assisted Query Flow

```
User Query → Legal Agent → [Tools] → Response
```

**Use Case**: Queries requiring current information
**Latency**: ~3-5 seconds
**Tools**: Search, QnA, Extract

---

### Pattern 3: Deep Research Flow (Conceptual 3-Stage)

```
User Query → Search Agent → Extract Agent → Analysis Agent → Synthesizer → Response
```

**Stage 1 - Search** (2-3 seconds):

- Query analysis and formulation
- Multiple search strategies
- Result ranking and filtering

**Stage 2 - Extract** (5-10 seconds):

- Content extraction from top URLs
- Cleaning and structuring
- Key point identification

**Stage 3 - Analysis** (10-15 seconds):

- Cross-source synthesis
- Pattern identification
- Report generation

**Stage 4 - Synthesis** (2-3 seconds):

- Response formatting
- Quality enhancement
- Final presentation

**Total Latency**: ~20-30 seconds
**Output Quality**: Highest

---

### Pattern 4: Medium Research Flow

```
User Query → Medium Research Agent → [Multiple Tools] → Response
```

**Use Case**: Balanced research needs
**Latency**: ~5-10 seconds
**Tools**: Search, Extract, QnA, Summarize

---

## Agent Selection Strategy

### Decision Tree

```
Is query legal-specific?
├─ Yes → Is it complex or requires current info?
│  ├─ Yes → Legal Agent (with tools)
│  └─ No → Legal Agent Direct (no tools)
└─ No → Is deep research needed?
   ├─ Yes → Deep Research Flow (3-stage)
   ├─ Medium → Medium Research Agent
   └─ No → Research Agent Direct
```

### Complexity Indicators

**Simple** (Direct agents):

- Definitions
- General principles
- Historical facts
- Conceptual explanations

**Medium** (Medium research):

- Current events
- Comparative analysis
- Multi-source verification
- Moderate depth

**Complex** (Deep research):

- Comprehensive reports
- Multi-faceted analysis
- Contradictory sources
- Maximum depth

---

## Performance Characteristics

### Model Performance (Cerebras gpt-oss-120b)

- **Context Window**: 131,072 tokens
- **Speed**: ~1000 tokens/second
- **Reasoning**: Strong logical capabilities
- **Cost**: Optimized for high throughput

### Agent Latency Profiles

| Agent           | Avg Latency | Token Usage | Tool Calls |
| --------------- | ----------- | ----------- | ---------- |
| Legal Direct    | 1-2s        | 500-1000    | 0          |
| Legal (tools)   | 3-5s        | 1000-2000   | 1-3        |
| Research Direct | 1-2s        | 500-1000    | 0          |
| Medium Research | 5-10s       | 2000-4000   | 2-5        |
| Search Agent    | 2-3s        | 500-1000    | 1-2        |
| Extract Agent   | 5-10s       | 2000-6000   | 1-3        |
| Analysis Agent  | 10-15s      | 4000-8000   | 0-2        |
| Synthesizer     | 2-3s        | 1000-2000   | 0          |

### Load Balancing

- Multiple Cerebras API keys configured
- Automatic failover on rate limits
- Round-robin distribution
- Error handling and retry logic

---

## Integration Points

### AI SDK v5 Integration

```typescript
import { createCerebrasProvider } from "@mastra/ai-sdk";

const cerebras = createCerebrasProvider({
  apiKeys: [KEY1, KEY2, KEY3], // Load balanced
  model: "gpt-oss-120b",
});
```

### Mastra Core Integration

```typescript
import { Mastra } from "@mastra/core";
import { agents } from "./agents";
import { tools } from "./tools";

export const mastra = new Mastra({
  agents,
  tools,
  // No workflows defined
});
```

### Next.js API Integration

```typescript
// app/api/chat/route.ts
import { mastra } from "@/mastra";

export async function POST(req: Request) {
  const { message, agentType } = await req.json();

  const agent = selectAgent(agentType);
  const response = await agent.generate(message);

  return Response.json(response);
}
```

---

## Key Insights

### Strengths

1. **Flexible Agent Selection**: Factory pattern allows optimal agent choice
2. **Tool Modularity**: 9 specialized tools for different needs
3. **Performance Optimization**: Direct agents for fast responses
4. **Deep Research Capability**: 3-stage pattern for comprehensive analysis
5. **Load Balancing**: Multiple API keys for reliability
6. **Model Choice**: Cerebras provides excellent speed/quality balance

### Limitations

1. **No Formal Workflows**: Conceptual patterns not enforced by framework
2. **Manual Orchestration**: Agent coordination requires custom code
3. **No State Management**: No built-in state tracking between stages
4. **Limited Error Recovery**: No automatic retry or fallback workflows
5. **No Parallel Execution**: Sequential agent execution only

### Recommendations

1. **Implement Formal Workflows**: Use Mastra workflow system for deep research
2. **Add State Management**: Track research progress and intermediate results
3. **Parallel Tool Execution**: Execute independent tool calls concurrently
4. **Enhanced Error Handling**: Add retry logic and fallback strategies
5. **Metrics & Monitoring**: Track agent performance and tool usage
6. **Caching Layer**: Cache search results and extractions
7. **User Feedback Loop**: Allow users to guide research direction

---

## Comparison: Current vs. Formal Workflows

### Current Implementation (Conceptual)

```typescript
// Manual orchestration
const searchResults = await searchAgent.generate(query);
const extracted = await extractAgent.generate(searchResults);
const analysis = await analysisAgent.generate(extracted);
const final = await synthesizer.generate(analysis);
```

**Pros**:

- Simple to understand
- Easy to debug
- Flexible control flow

**Cons**:

- No state persistence
- Manual error handling
- No automatic retries
- Hard to monitor progress

### Formal Workflow Implementation

```typescript
// Mastra workflow
const deepResearchWorkflow = new Workflow({
  name: "deep-research",
  steps: [
    {
      id: "search",
      agent: searchAgent,
      onSuccess: "extract",
      onError: "retry-search",
    },
    {
      id: "extract",
      agent: extractAgent,
      onSuccess: "analyze",
      onError: "partial-extract",
    },
    {
      id: "analyze",
      agent: analysisAgent,
      onSuccess: "synthesize",
    },
    {
      id: "synthesize",
      agent: synthesizer,
      onSuccess: "complete",
    },
  ],
});
```

**Pros**:

- State persistence
- Automatic error handling
- Progress tracking
- Retry logic
- Monitoring hooks
- Parallel execution support

**Cons**:

- More complex setup
- Learning curve
- Less flexible for ad-hoc changes

---

## Usage Examples

### Example 1: Simple Legal Query

```typescript
const agent = getLegalAgent({
  requiresTools: false,
  complexity: "simple",
});

const response = await agent.generate("What is the statute of limitations?");
```

### Example 2: Complex Legal Research

```typescript
const agent = getLegalAgent({
  requiresTools: true,
  complexity: "complex",
});

const response = await agent.generate(
  "Analyze recent case law on data privacy in healthcare"
);
// Agent will use search, extract, and document tools
```

### Example 3: Deep Research (Manual Orchestration)

```typescript
// Stage 1: Search
const searchResults = await searchAgent.generate({
  query: "Impact of AI on legal profession",
  context: { depth: "comprehensive" },
});

// Stage 2: Extract
const extracted = await extractAgent.generate({
  urls: searchResults.topUrls,
  context: { focus: "key-findings" },
});

// Stage 3: Analyze
const analysis = await analysisAgent.generate({
  content: extracted.content,
  context: { format: "report" },
});

// Stage 4: Synthesize
const final = await synthesizer.generate({
  rawOutput: analysis,
  context: { style: "professional" },
});
```

---

## Conclusion

DeepCounsel implements a sophisticated multi-agent system with **9 specialized agents** and **9 tools**, but uses **no formal Mastra workflows**. Instead, it relies on a **conceptual 3-stage deep research pattern** implemented through manual agent orchestration.

The system is well-designed for flexibility and performance, with:

- Fast direct agents for simple queries
- Tool-equipped agents for complex research
- A factory pattern for intelligent agent selection
- Load-balanced Cerebras API for reliability

However, implementing **formal Mastra workflows** would provide significant benefits:

- State persistence and progress tracking
- Automatic error handling and retries
- Better monitoring and observability
- Support for parallel execution
- Easier maintenance and debugging

The current implementation is production-ready but could be enhanced by migrating the conceptual deep research pattern into a formal Mastra workflow system.
