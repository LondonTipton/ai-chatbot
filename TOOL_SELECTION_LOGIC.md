# Tool Selection Logic in Chat Agent

## Overview

The Chat Agent uses **LLM-based decision making** to select the appropriate research tool. There is **NO hardcoded default tool** - the agent decides based on the query characteristics and its instructions.

## Selection Method

**Type:** Intelligent, instruction-based selection
**Decision Maker:** The LLM (gpt-oss-120b) itself
**Tool Choice Mode:** `auto` (agent decides when and which tool to use)

## Decision Tree (From Agent Instructions)

The agent follows this decision tree based on query patterns:

### 1. Quick Fact Search (Default for Simple Queries)

**Triggers:**

- "What is..." questions
- "Define..." requests
- "When was..." queries
- Single-fact lookups
- Current facts or statistics

**Examples:**

- "What is the Consumer Protection Act?"
- "Define force majeure in contract law"
- "What is the current minimum wage?"
- "When was the Constitution enacted?"

**Characteristics:**

- Token Budget: 1K-2.5K
- Latency: 3-5s
- Tavily: 10 results, no raw content

---

### 2. Standard Research (Default for Explanations)

**Triggers:**

- "Explain..." requests
- "Tell me about..." queries
- "How does..." questions
- Overview or comparison queries
- Balanced depth needed

**Examples:**

- "Explain employment termination procedures"
- "Tell me about property transfer in Zimbabwe"
- "How does bail work in criminal cases?"
- "Compare formal vs informal marriages"

**Characteristics:**

- Token Budget: 2K-4K
- Latency: 4-7s
- Tavily: 10 results, WITH raw content

---

### 3. Deep Research (For Dense Content Analysis)

**Triggers:**

- "Analyze..." requests
- "Extract..." queries
- "Detail..." questions
- "Break down..." requests
- Dense statutory analysis
- Case law extraction
- Technical requirements

**Examples:**

- "Analyze the specific provisions of Section 12B Labour Act"
- "Extract requirements from the Companies Act for registration"
- "What are the exact elements of breach of contract?"
- "Detail the procedural steps in civil litigation"
- "Break down the constitutional provisions on property rights"

**Characteristics:**

- Token Budget: 4K-8K
- Latency: 5-10s
- Tavily: 10 results, WITH raw content
- Purpose: EXTRACT specific facts from detailed sources

---

### 4. Comprehensive Research (For Trend Analysis)

**Triggers:**

- "What are trends..." queries
- "Compare perspectives..." requests
- "Survey..." questions
- "What patterns..." queries
- Multiple perspectives needed
- Broad overview required

**Examples:**

- "What are the trends in labor law reforms across sources?"
- "How do different courts interpret property rights?"
- "Compare perspectives on constitutional amendments"
- "What patterns emerge in employment dispute cases?"
- "Survey the landscape of contract law developments"

**Characteristics:**

- Token Budget: 5K-10K
- Latency: 8-15s
- Tavily: 10+5+5 results (multi-search with gap analysis)
- Purpose: COMPARE across sources, identify PATTERNS

---

## When NO Tool is Used

The agent answers directly WITHOUT tools when:

- ✅ It already knows the answer from training
- ✅ Simple conceptual explanations (e.g., "What is a contract?")
- ✅ General legal principles or definitions
- ✅ Straightforward legal guidance from its knowledge
- ✅ No sources or citations needed

**Example queries that DON'T trigger tools:**

- "What is a contract?" (general concept)
- "Explain the difference between civil and criminal law" (general knowledge)
- "What are the basic principles of contract law?" (general principles)

---

## Default Behavior

**There is NO single default tool.** Instead:

1. **For simple queries:** Agent tends to use `quickFactSearch`
2. **For explanations:** Agent tends to use `standardResearch`
3. **For analysis:** Agent tends to use `deepResearch`
4. **For trends:** Agent tends to use `comprehensiveResearch`
5. **For general knowledge:** Agent answers directly (no tool)

## Selection Strategy

The agent is instructed to:

1. **Start with lower depth for efficiency**

   - Begin with quickFactSearch or standardResearch
   - Scale up if needed

2. **Escalate when user requests more detail**

   - If user says "tell me more" or "analyze in detail"
   - Move to deepResearch or comprehensiveResearch

3. **Choose based on query complexity**
   - Simple = quickFactSearch
   - Moderate = standardResearch
   - Complex = deepResearch
   - Broad = comprehensiveResearch

## Tool Selection Examples

| User Query                              | Selected Tool                       | Reasoning                      |
| --------------------------------------- | ----------------------------------- | ------------------------------ |
| "What is the Labour Act?"               | quickFactSearch                     | Simple "what is" question      |
| "Explain the Labour Act"                | standardResearch                    | Explanation request            |
| "Analyze Section 12B of the Labour Act" | deepResearch                        | Analysis of specific provision |
| "What are trends in labour law?"        | comprehensiveResearch               | Trend analysis across sources  |
| "What is a contract?"                   | NO TOOL                             | General knowledge              |
| "What is the zuva case?"                | quickFactSearch or standardResearch | Depends on context             |
| "Analyze the zuva case in detail"       | deepResearch                        | Explicit analysis request      |

## Key Instruction Excerpts

### Tool Selection Guidance

```
• Each workflow tool completes in 1 step - no multiple calls needed
• Always use Zimbabwe as the default jurisdiction
• Escalate to higher research depth when user requests more detail
• Start with lower depth for efficiency, scale up if needed
```

### When NOT to Use Tools

```
Answer directly WITHOUT tools when:
• You already know the answer from training
• Simple conceptual explanations
• General legal principles or definitions
• Straightforward legal guidance from your knowledge
• No sources or citations needed
```

## Tool Choice Configuration

The agent uses **automatic tool choice**:

```typescript
const stream = await chatAgent.stream(messages, {
  format: "aisdk",
  maxSteps: 15, // Allows multiple tool calls if needed
  // toolChoice: "auto" is implicit (default)
});
```

This means:

- The LLM decides whether to use a tool
- The LLM decides which tool to use
- The LLM can use multiple tools in sequence
- The LLM can choose not to use any tool

## Conversation History Impact

With conversation history support (now implemented in all tools), the agent can:

1. **Understand follow-up questions**

   - "What is the zuva case?" → quickFactSearch
   - "Tell me more about it" → standardResearch (with context)

2. **Escalate appropriately**

   - First query: quickFactSearch
   - Follow-up: standardResearch or deepResearch

3. **Maintain context**
   - Previous tool results inform next tool selection
   - Agent can reference earlier research

## Summary

**Default Tool:** None - the agent intelligently selects based on query
**Selection Method:** LLM-based decision making using instructions
**Fallback:** Agent can answer directly without tools
**Strategy:** Start simple, escalate as needed
**Tool Choice Mode:** Automatic (LLM decides)

The agent is designed to be **efficient** (start with lighter tools) and **adaptive** (escalate when needed), ensuring optimal balance between speed, cost, and quality.
