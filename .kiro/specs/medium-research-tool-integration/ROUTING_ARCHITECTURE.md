# Routing Architecture: Tavily-Based Research Modes

## Overview

A pragmatic routing architecture that uses Tavily's different search capabilities to handle queries of varying complexity, with agent networks reserved for future implementation.

---

## Research Modes Based on Tavily Features

### Mode 1: Simple QnA (Fast)

**Use Case:** Direct factual questions
**Tavily Feature:** QnA API
**Token Budget:** 200-500 tokens
**Latency:** 1-3 seconds

```typescript
Query: "What is the legal drinking age in Zimbabwe?"
Tool: tavilyQna
Response: Direct answer with single source
```

### Mode 2: Standard Search (Balanced)

**Use Case:** General research questions
**Tavily Feature:** Search API (5 results)
**Token Budget:** 1K-2K tokens
**Latency:** 3-7 seconds

```typescript
Query: "Explain employment termination procedures in Zimbabwe"
Tool: tavilySearch (max_results: 5)
Response: Synthesized answer from multiple sources
```

### Mode 3: Advanced Search (Comprehensive)

**Use Case:** Complex research requiring multiple perspectives
**Tavily Feature:** Advanced Search API (10 queries)
**Token Budget:** 4K-8K tokens
**Latency:** 10-15 seconds

```typescript
Query: "Compare foreign investment regulations across SADC countries"
Tool: tavilyAdvancedSearch (max_results: 10)
Response: Comprehensive analysis with extensive sources
```

### Mode 4: RAG Mode (Deep Content)

**Use Case:** Queries requiring full document content
**Tavily Feature:** Search API with include_raw_content
**Token Budget:** 6K-12K tokens
**Latency:** 12-20 seconds

```typescript
Query: "Analyze the full text of Zimbabwe's Labour Act amendments"
Tool: tavilySearch (include_raw_content: true, max_results: 5)
Response: Deep analysis based on full document content
```

### Mode 5: Extract Mode (Specific URLs)

**Use Case:** Analysis of specific documents/URLs
**Tavily Feature:** Extract API
**Token Budget:** 3K-8K tokens
**Latency:** 8-15 seconds

```typescript
Query: "Summarize this Supreme Court judgment: [URL]"
Tool: tavilyExtract (urls: [...])
Response: Detailed extraction and analysis
```

### Mode 6: Multi-Extract RAG (Comprehensive Deep Dive)

**Use Case:** Deep analysis across multiple specific sources
**Tavily Feature:** Search + Extract with raw content
**Token Budget:** 10K-20K tokens
**Latency:** 20-35 seconds

```typescript
Query: "Comprehensive analysis of constitutional amendments with full text"
Tools:
  1. tavilySearch (include_raw_content: true, max_results: 10)
  2. tavilyExtract (urls from search results)
Response: Publication-quality analysis with full source content
```

---

## Routing Decision Tree

```
User Query
    ↓
Complexity Detection
    ↓
    ├─→ Simple factual question?
    │   └─→ Mode 1: QnA (tavilyQna)
    │
    ├─→ General research question?
    │   └─→ Mode 2: Standard Search (tavilySearch, 5 results)
    │
    ├─→ Complex multi-perspective question?
    │   └─→ Mode 3: Advanced Search (tavilyAdvancedSearch, 10 queries)
    │
    ├─→ Requires full document content?
    │   └─→ Mode 4: RAG Mode (tavilySearch + include_raw_content)
    │
    ├─→ Specific URL(s) to analyze?
    │   └─→ Mode 5: Extract Mode (tavilyExtract)
    │
    └─→ Comprehensive deep dive with multiple sources?
        └─→ Mode 6: Multi-Extract RAG (Search + Extract + RAG)
```

---

## Implementation Architecture

### Phase 1: Update Complexity Detector

```typescript
// lib/ai/complexity-detector.ts

export type ResearchMode =
  | "qna" // Simple QnA
  | "standard" // Standard search (5 results)
  | "advanced" // Advanced search (10 queries)
  | "rag" // RAG with raw content
  | "extract" // Extract specific URLs
  | "multi-extract"; // Search + Extract + RAG

export type QueryComplexity =
  | "simple" // Mode 1: QnA
  | "light" // Mode 2: Standard Search
  | "medium" // Mode 3: Advanced Search
  | "deep" // Mode 4: RAG Mode
  | "extract" // Mode 5: Extract Mode
  | "comprehensive"; // Mode 6: Multi-Extract RAG

export interface ComplexityAnalysis {
  complexity: QueryComplexity;
  researchMode: ResearchMode;
  reasoning: string;
  requiresResearch: boolean;
  requiresMultiStep: boolean;
  estimatedSteps: number;
  estimatedTokens: number;
  estimatedLatency: string;
  tavilyFeatures: string[];
}

export function detectQueryComplexity(
  query: string,
  userOverride?: ResearchMode
): ComplexityAnalysis {
  // User override
  if (userOverride) {
    return mapUserModeToComplexity(userOverride);
  }

  // Check for URL extraction requests
  if (containsUrls(query) || hasExtractKeywords(query)) {
    return {
      complexity: "extract",
      researchMode: "extract",
      reasoning: "Query contains URLs or requests specific document extraction",
      requiresResearch: true,
      requiresMultiStep: false,
      estimatedSteps: 2,
      estimatedTokens: 5000,
      estimatedLatency: "8-15s",
      tavilyFeatures: ["extract"],
    };
  }

  // Check for comprehensive deep dive
  if (requiresComprehensiveAnalysis(query)) {
    return {
      complexity: "comprehensive",
      researchMode: "multi-extract",
      reasoning:
        "Query requires comprehensive analysis with full source content",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 5,
      estimatedTokens: 15000,
      estimatedLatency: "20-35s",
      tavilyFeatures: ["search", "extract", "raw_content"],
    };
  }

  // Check for RAG mode (full content needed)
  if (requiresFullContent(query)) {
    return {
      complexity: "deep",
      researchMode: "rag",
      reasoning: "Query requires full document content for analysis",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 3,
      estimatedTokens: 9000,
      estimatedLatency: "12-20s",
      tavilyFeatures: ["search", "raw_content"],
    };
  }

  // Check for advanced search (multiple perspectives)
  if (requiresMultiplePerspectives(query)) {
    return {
      complexity: "medium",
      researchMode: "advanced",
      reasoning: "Query requires multiple sources and perspectives",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 3,
      estimatedTokens: 6000,
      estimatedLatency: "10-15s",
      tavilyFeatures: ["advanced_search"],
    };
  }

  // Check for standard search
  if (requiresResearch(query)) {
    return {
      complexity: "light",
      researchMode: "standard",
      reasoning: "Query requires research from multiple sources",
      requiresResearch: true,
      requiresMultiStep: false,
      estimatedSteps: 2,
      estimatedTokens: 1500,
      estimatedLatency: "3-7s",
      tavilyFeatures: ["search"],
    };
  }

  // Simple QnA
  return {
    complexity: "simple",
    researchMode: "qna",
    reasoning: "Simple factual question",
    requiresResearch: false,
    requiresMultiStep: false,
    estimatedSteps: 1,
    estimatedTokens: 350,
    estimatedLatency: "1-3s",
    tavilyFeatures: ["qna"],
  };
}

// Detection helpers
function containsUrls(query: string): boolean {
  const urlPattern = /https?:\/\/[^\s]+/gi;
  return urlPattern.test(query);
}

function hasExtractKeywords(query: string): boolean {
  const keywords = [
    "analyze this",
    "summarize this",
    "extract from",
    "read this",
    "review this document",
    "from this url",
  ];
  const lowerQuery = query.toLowerCase();
  return keywords.some((kw) => lowerQuery.includes(kw));
}

function requiresComprehensiveAnalysis(query: string): boolean {
  const keywords = [
    "comprehensive analysis",
    "full analysis",
    "complete review",
    "detailed examination",
    "in-depth study",
    "thorough investigation",
    "publication quality",
    "research paper",
    "full report",
  ];
  const lowerQuery = query.toLowerCase();
  return keywords.some((kw) => lowerQuery.includes(kw));
}

function requiresFullContent(query: string): boolean {
  const keywords = [
    "full text",
    "complete document",
    "entire content",
    "full content",
    "raw content",
    "unabridged",
    "analyze the full",
    "read the complete",
  ];
  const lowerQuery = query.toLowerCase();
  return keywords.some((kw) => lowerQuery.includes(kw));
}

function requiresMultiplePerspectives(query: string): boolean {
  const keywords = [
    "compare",
    "contrast",
    "different perspectives",
    "various viewpoints",
    "multiple sources",
    "comprehensive",
    "across",
    "between",
    "versus",
    "vs",
  ];
  const lowerQuery = query.toLowerCase();

  // Also check for complex legal topics
  const complexTopics = [
    "constitutional",
    "case law",
    "precedent",
    "legal framework",
    "regulatory",
    "statutory",
  ];

  return (
    keywords.some((kw) => lowerQuery.includes(kw)) ||
    (complexTopics.some((topic) => lowerQuery.includes(topic)) &&
      lowerQuery.split(" ").length > 8)
  );
}

function requiresResearch(query: string): boolean {
  const keywords = [
    "what are",
    "how does",
    "explain",
    "describe",
    "requirements for",
    "process of",
    "rules about",
    "regulations on",
    "law regarding",
  ];
  const lowerQuery = query.toLowerCase();
  return keywords.some((kw) => lowerQuery.includes(kw));
}

function mapUserModeToComplexity(mode: ResearchMode): ComplexityAnalysis {
  const modeMap: Record<ResearchMode, ComplexityAnalysis> = {
    qna: {
      complexity: "simple",
      researchMode: "qna",
      reasoning: "User selected QnA mode",
      requiresResearch: false,
      requiresMultiStep: false,
      estimatedSteps: 1,
      estimatedTokens: 350,
      estimatedLatency: "1-3s",
      tavilyFeatures: ["qna"],
    },
    standard: {
      complexity: "light",
      researchMode: "standard",
      reasoning: "User selected Standard Search mode",
      requiresResearch: true,
      requiresMultiStep: false,
      estimatedSteps: 2,
      estimatedTokens: 1500,
      estimatedLatency: "3-7s",
      tavilyFeatures: ["search"],
    },
    advanced: {
      complexity: "medium",
      researchMode: "advanced",
      reasoning: "User selected Advanced Search mode",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 3,
      estimatedTokens: 6000,
      estimatedLatency: "10-15s",
      tavilyFeatures: ["advanced_search"],
    },
    rag: {
      complexity: "deep",
      researchMode: "rag",
      reasoning: "User selected RAG mode",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 3,
      estimatedTokens: 9000,
      estimatedLatency: "12-20s",
      tavilyFeatures: ["search", "raw_content"],
    },
    extract: {
      complexity: "extract",
      researchMode: "extract",
      reasoning: "User selected Extract mode",
      requiresResearch: true,
      requiresMultiStep: false,
      estimatedSteps: 2,
      estimatedTokens: 5000,
      estimatedLatency: "8-15s",
      tavilyFeatures: ["extract"],
    },
    "multi-extract": {
      complexity: "comprehensive",
      researchMode: "multi-extract",
      reasoning: "User selected Multi-Extract RAG mode",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 5,
      estimatedTokens: 15000,
      estimatedLatency: "20-35s",
      tavilyFeatures: ["search", "extract", "raw_content"],
    },
  };

  return modeMap[mode];
}
```

### Phase 2: Create Mode-Specific Agents

```typescript
// mastra/agents/research-agents.ts

import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";

const cerebrasProvider = getBalancedCerebrasProvider();

/**
 * QnA Agent - Fast factual answers
 */
export const qnaAgent = new Agent({
  name: "qna-agent",
  instructions: `You are a fast legal assistant for Zimbabwe. Answer questions directly and concisely.

Use the tavilyQna tool for quick factual verification when needed.

Keep responses:
- Direct and concise
- Factually accurate
- Zimbabwe-focused
- Professional but brief`,

  model: () => cerebrasProvider("gpt-oss-120b"),

  tools: {
    tavilyQna,
    createDocument,
    updateDocument,
  },
});

/**
 * Standard Search Agent - Balanced research
 */
export const standardSearchAgent = new Agent({
  name: "standard-search-agent",
  instructions: `You are a balanced legal researcher for Zimbabwe.

Use tavilySearch (max_results: 5) to find relevant sources, then synthesize a comprehensive response.

Your responses should:
- Cover key points from multiple sources
- Include citations
- Be well-structured
- Provide practical implications
- Maintain professional tone`,

  model: () => cerebrasProvider("gpt-oss-120b"),

  tools: {
    tavilySearch, // Configured for 5 results
    createDocument,
    updateDocument,
  },
});

/**
 * Advanced Search Agent - Multi-perspective research
 */
export const advancedSearchAgent = new Agent({
  name: "advanced-search-agent",
  instructions: `You are a comprehensive legal researcher for Zimbabwe.

Use tavilyAdvancedSearch (max_results: 10) to gather extensive sources from multiple perspectives.

Your responses should:
- Synthesize information from 8-10 sources
- Compare different perspectives
- Identify consensus and disagreements
- Provide detailed analysis
- Include comprehensive citations
- Offer practical recommendations`,

  model: () => cerebrasProvider("llama-3.3-70b"), // More powerful for synthesis

  tools: {
    tavilyAdvancedSearch, // Configured for 10 results
    createDocument,
    updateDocument,
  },
});

/**
 * RAG Agent - Deep content analysis
 */
export const ragAgent = new Agent({
  name: "rag-agent",
  instructions: `You are a deep content analyst for Zimbabwe legal research.

Use tavilySearch with include_raw_content: true to access full document content.

Your workflow:
1. Search for relevant sources (max_results: 5)
2. Analyze the full raw content from each source
3. Extract key information, quotes, and principles
4. Synthesize into a comprehensive response

Your responses should:
- Quote directly from source documents
- Provide detailed analysis of full content
- Identify nuances and details
- Include extensive citations with quotes
- Be publication-quality`,

  model: () => cerebrasProvider("llama-3.3-70b"),

  tools: {
    tavilySearchWithRawContent, // Configured with include_raw_content: true
    createDocument,
    updateDocument,
  },
});

/**
 * Extract Agent - URL-specific analysis
 */
export const extractAgent = new Agent({
  name: "extract-agent",
  instructions: `You are a document extraction specialist for Zimbabwe legal content.

Use tavilyExtract to retrieve and analyze content from specific URLs.

Your workflow:
1. Extract content from provided URLs
2. Analyze the extracted content thoroughly
3. Identify key points, principles, and details
4. Provide structured summary

Your responses should:
- Be thorough and detailed
- Quote key passages
- Identify important sections
- Provide clear structure
- Include source attribution`,

  model: () => cerebrasProvider("llama-3.3-70b"),

  tools: {
    tavilyExtract,
    createDocument,
    updateDocument,
  },
});

/**
 * Multi-Extract RAG Agent - Comprehensive deep dive
 */
export const multiExtractRagAgent = new Agent({
  name: "multi-extract-rag-agent",
  instructions: `You are a comprehensive legal analyst for Zimbabwe, specializing in publication-quality research.

Your workflow:
1. Use tavilySearch with include_raw_content: true (max_results: 10)
2. Use tavilyExtract on the most relevant URLs for deeper content
3. Analyze all raw content thoroughly
4. Synthesize into publication-quality document

Your responses should:
- Be comprehensive and exhaustive
- Include extensive quotes and citations
- Analyze content from multiple angles
- Identify patterns and themes
- Provide detailed recommendations
- Be suitable for professional publication
- Include executive summary`,

  model: () => cerebrasProvider("llama-3.3-70b"),

  tools: {
    tavilySearchWithRawContent, // include_raw_content: true, max_results: 10
    tavilyExtract,
    createDocument,
    updateDocument,
  },
});
```

### Phase 3: Update Main Chat Route

```typescript
// app/(chat)/api/chat/route.ts

// In the routing logic:
const complexityAnalysis = detectQueryComplexity(
  userMessageText,
  requestBody.researchMode
);

logger.log(`[Routing] 🎯 Complexity: ${complexityAnalysis.complexity}`);
logger.log(`[Routing] 🔍 Research Mode: ${complexityAnalysis.researchMode}`);
logger.log(`[Routing] 💡 Reasoning: ${complexityAnalysis.reasoning}`);
logger.log(
  `[Routing] 🔧 Tavily Features: ${complexityAnalysis.tavilyFeatures.join(
    ", "
  )}`
);
logger.log(
  `[Routing] ⏱️  Estimated Latency: ${complexityAnalysis.estimatedLatency}`
);
logger.log(
  `[Routing] 💰 Estimated Tokens: ${complexityAnalysis.estimatedTokens}`
);

// Select agent based on research mode
const agentName = selectAgentForResearchMode(complexityAnalysis.researchMode);

logger.log(`[Routing] 🤖 Selected Agent: ${agentName}`);

// Stream with Mastra
const mastraStream = await streamMastraAgent(
  complexityAnalysis.complexity,
  userMessageText,
  {
    userId: dbUser.id,
    chatId: id,
    sessionId: session.user.id,
    agentName,
    researchMode: complexityAnalysis.researchMode,
  }
);
```

### Phase 4: Agent Selection Logic

```typescript
// lib/ai/mastra-sdk-integration.ts

function selectAgentForResearchMode(mode: ResearchMode): string {
  switch (mode) {
    case "qna":
      return "qnaAgent";

    case "standard":
      return "standardSearchAgent";

    case "advanced":
      return "advancedSearchAgent";

    case "rag":
      return "ragAgent";

    case "extract":
      return "extractAgent";

    case "multi-extract":
      return "multiExtractRagAgent";

    default:
      return "qnaAgent";
  }
}
```

### Phase 5: Configure Tavily Tools

```typescript
// lib/ai/tools/tavily-tools.ts

/**
 * Standard Tavily Search (5 results)
 */
export const tavilySearch = createTool({
  id: "tavily-search",
  description: "Search for legal information with 5 results",
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ context }) => {
    const response = await tavily.search(context.query, {
      max_results: 5,
      search_depth: "basic",
      include_domains: [],
      exclude_domains: [],
    });
    return response;
  },
});

/**
 * Advanced Tavily Search (10 results)
 */
export const tavilyAdvancedSearch = createTool({
  id: "tavily-advanced-search",
  description: "Advanced search with 10 comprehensive results",
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ context }) => {
    const response = await tavily.search(context.query, {
      max_results: 10,
      search_depth: "advanced",
      include_domains: [],
      exclude_domains: [],
    });
    return response;
  },
});

/**
 * Tavily Search with Raw Content (RAG mode)
 */
export const tavilySearchWithRawContent = createTool({
  id: "tavily-search-raw-content",
  description: "Search with full raw content for deep analysis",
  inputSchema: z.object({
    query: z.string(),
    max_results: z.number().default(5),
  }),
  execute: async ({ context }) => {
    const response = await tavily.search(context.query, {
      max_results: context.max_results || 5,
      search_depth: "advanced",
      include_raw_content: true, // KEY: Include full content
      include_domains: [],
      exclude_domains: [],
    });
    return response;
  },
});

/**
 * Tavily Extract (URL-specific)
 */
export const tavilyExtract = createTool({
  id: "tavily-extract",
  description: "Extract content from specific URLs",
  inputSchema: z.object({
    urls: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const response = await tavily.extract({
      urls: context.urls,
    });
    return response;
  },
});

/**
 * Tavily QnA (Fast factual)
 */
export const tavilyQna = createTool({
  id: "tavily-qna",
  description: "Quick factual answer",
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ context }) => {
    const response = await tavily.qna(context.query);
    return response;
  },
});
```

---

## UI: Research Mode Selector

```typescript
// components/research-mode-selector.tsx

export function ResearchModeSelector({
  value,
  onChange,
}: {
  value?: ResearchMode;
  onChange: (mode?: ResearchMode) => void;
}) {
  return (
    <Select
      value={value || "auto"}
      onValueChange={(v) =>
        onChange(v === "auto" ? undefined : (v as ResearchMode))
      }
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">🤖 Auto-detect</SelectItem>
        <SelectItem value="qna">⚡ QnA (1-3s)</SelectItem>
        <SelectItem value="standard">🔍 Standard (3-7s)</SelectItem>
        <SelectItem value="advanced">📊 Advanced (10-15s)</SelectItem>
        <SelectItem value="rag">📚 RAG (12-20s)</SelectItem>
        <SelectItem value="extract">🔗 Extract (8-15s)</SelectItem>
        <SelectItem value="multi-extract">🎓 Comprehensive (20-35s)</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

---

## Summary

This architecture provides:

✅ **6 distinct research modes** based on Tavily features
✅ **Automatic routing** via complexity detection
✅ **Manual override** via UI selector
✅ **Specialized agents** for each mode
✅ **Clear token/latency budgets** for each mode
✅ **Scalable foundation** for future agent networks

The routing logic intelligently selects the appropriate Tavily feature and agent based on query characteristics, giving you both speed and quality in a unified system.
