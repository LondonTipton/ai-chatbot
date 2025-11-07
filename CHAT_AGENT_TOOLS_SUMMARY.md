# Chat Agent Tools Summary

## Primary Chat Agent

The main **chat-agent** (used in production) has **6 tools** bound to it:

### Research Tools (4)

1. **quickFactSearch** → `quickFactSearchTool`

   - Uses: `basicSearchWorkflowV2`
   - Purpose: Fast queries (10 results, no raw content)
   - Token Budget: 1K-2K
   - Latency: 2-3s

2. **standardResearch** → `standardResearchTool`

   - Uses: `advancedSearchWorkflowV2`
   - Purpose: Balanced research (10 results, WITH raw content)
   - Token Budget: 3K-5K
   - Latency: 3-5s

3. **deepResearch** → `deepResearchTool`

   - Uses: `advancedSearchWorkflowV2`
   - Purpose: Deep analysis (10 results, WITH raw content)
   - Token Budget: 3K-5K
   - Latency: 3-5s

4. **comprehensiveResearch** → `comprehensiveResearchTool`
   - Uses: `comprehensiveAnalysisWorkflowV2`
   - Purpose: Multi-search with gap analysis (10+5+5 results)
   - Token Budget: 5K-10K
   - Latency: 8-15s

### Document Tools (2)

5. **createDocument** → `createDocumentTool`

   - Purpose: Create new documents (text, code, etc.)

6. **updateDocument** → `updateDocumentTool`
   - Purpose: Update existing documents

## Tool Configuration

```typescript
// mastra/agents/chat-agent.ts
export const chatAgent = new Agent({
  name: "chat-agent",
  model: () => cerebrasProvider("gpt-oss-120b"),
  tools: {
    quickFactSearch: quickFactSearchTool,
    standardResearch: standardResearchTool,
    deepResearch: deepResearchTool,
    comprehensiveResearch: comprehensiveResearchTool,
    createDocument: createDocumentTool,
    updateDocument: updateDocumentTool,
  },
});
```

## Other Agents with Tools

### analysis-agent

- **Tools:** 1 (tavilySummarizeTool)
- **Purpose:** Analysis with summarization

### extract-agent

- **Tools:** 1 (tavilyExtractTool)
- **Purpose:** Content extraction

### legal-agent

- **Tools:** 2 (tavilySearchTool, tavilyExtractTool)
- **Purpose:** Legal research

### medium-research-agent

- **Tools:** 1-2 (tavilySearchAdvancedTool, createDocument)
- **Purpose:** Medium-depth research

### search-agent

- **Tools:** 1-2 (tavilySearchAdvancedTool, createDocument)
- **Purpose:** Search-focused research

### search-coordinator-agent

- **Tools:** 1 (tavilySearch)
- **Purpose:** Coordinate searches (used in simple-search-workflow)

## Agents WITHOUT Tools

These agents use pure LLM reasoning without tool calls:

- **breadth-synthesis-agent** - Synthesis only
- **claim-extractor-agent** - Structured output
- **depth-analysis-agent** - Analysis only
- **entity-extractor-agent** - Structured output
- **legal-agent-direct** - Pure Cerebras knowledge
- **query-enhancer-agent** - Query enhancement
- **research-agent-direct** - Pure Cerebras knowledge
- **summarizer-agent** - Summarization only
- **synthesizer-agent** - Synthesis only

## Tool Usage in Chat Agent

The chat agent decides which tool to use based on the query:

### Quick Fact Search

- **Triggers:** "What is...", "Define...", simple questions
- **Example:** "What is the Labour Act?"

### Standard Research

- **Triggers:** "Explain...", "Tell me about...", balanced queries
- **Example:** "Explain employment termination procedures"

### Deep Research

- **Triggers:** "Analyze...", "Detail...", complex queries
- **Example:** "Analyze the Zuva case in detail"

### Comprehensive Research

- **Triggers:** "What are trends...", "Compare...", broad queries
- **Example:** "What are trends in Zimbabwean labour law?"

### Create Document

- **Triggers:** "Create a document...", "Draft...", "Write..."
- **Example:** "Create a document about employment law"

### Update Document

- **Triggers:** "Update the document...", "Edit..."
- **Example:** "Update the document with new information"

## Summary

**Total Tools Bound to Chat Agent: 6**

- 4 Research Tools (all now using V2 workflows)
- 2 Document Tools

All research tools now use the simplified Tavily integration pattern that passes raw results directly to the Chat Agent for synthesis, eliminating information loss and improving reliability.
