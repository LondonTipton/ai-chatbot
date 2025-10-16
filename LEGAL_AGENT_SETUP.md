# Legal Agent - Mastra Workflow

## Overview

The Mastra legal-agent is a **standalone workflow** for specialized legal research tasks. It operates independently from the main chat system.

## Architecture

### Main Chat System

- **Location**: `app/(chat)/api/chat/route.ts`
- **Status**: ✅ Unchanged and fully functional
- **Features**:
  - Multi-model support (Gemini, Cerebras, etc.)
  - All existing tools (Tavily, document creation, etc.)
  - Streaming responses
  - Full database integration

### Legal Agent (Mastra)

- **Location**: `mastra/agents/legal-agent.ts`
- **Status**: ✅ Available as separate workflow
- **Features**:
  - Load-balanced Cerebras gpt-oss-120b
  - Tavily search & extract tools
  - Professional legal assistant persona
  - Can be called independently

## Agent Configuration

```typescript
// mastra/agents/legal-agent.ts
export const legalAgent = new Agent({
  name: "Legal Research Assistant",

  model: () => {
    // Uses load-balanced Cerebras provider
    const provider = getBalancedCerebrasProvider();
    return provider("gpt-oss-120b");
  },

  tools: {
    tavilySearchTool, // Web search for legal info
    tavilyExtractTool, // Extract content from URLs
  },

  instructions: "You are DeepCounsel, an expert legal AI assistant...",
});
```

### Load Balancing

The agent uses the **Cerebras Key Balancer** which:

- Rotates through multiple API keys (CEREBRAS_API_KEY_85 through \_89)
- Automatically disables keys that hit rate limits
- Re-enables keys after cooldown period
- Provides high availability and better rate limit handling

## How to Use

### Option 1: Test Endpoint

Use the existing test endpoint:

```bash
# POST request
curl -X POST http://localhost:3000/api/mastra-test \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the legal framework for IP in Zimbabwe?"}'

# GET request
curl "http://localhost:3000/api/mastra-test?query=What+is+contract+law"
```

### Option 2: Direct Import

Import and use the agent directly in your code:

```typescript
import { mastra } from "@/mastra";

// Get the agent
const agent = mastra.getAgent("legalAgent");

// Generate a response
const result = await agent.generate([
  {
    role: "user",
    content: "Explain property rights in Zimbabwe",
  },
]);

console.log(result.text);
console.log(result.usage);
```

### Option 3: Create Custom Route

Create a new API route that uses the legal agent for specific use cases:

```typescript
// app/api/legal-research/route.ts
import { mastra } from "@/mastra";

export async function POST(request: Request) {
  const { query } = await request.json();

  const agent = mastra.getAgent("legalAgent");
  const result = await agent.generate(query);

  return Response.json({
    answer: result.text,
    usage: result.usage,
  });
}
```

## Environment Variables

```env
# Cerebras API Keys (load-balanced)
CEREBRAS_API_KEY_85=your_cerebras_key_1
CEREBRAS_API_KEY_86=your_cerebras_key_2
CEREBRAS_API_KEY_87=your_cerebras_key_3
CEREBRAS_API_KEY_88=your_cerebras_key_4
CEREBRAS_API_KEY_89=your_cerebras_key_5

# Tavily API Key
TAVILY_API_KEY=your_tavily_key
```

The system will use all available keys and automatically rotate between them.

## Benefits of Separate Workflow

1. **Flexibility**: Main chat can use any model, legal agent uses Cerebras
2. **Specialization**: Legal agent has focused instructions and tools
3. **Independence**: Can be called from anywhere in the codebase
4. **Testing**: Easy to test and iterate on the agent separately
5. **Scalability**: Can add more specialized agents without affecting main chat

## Future Integration Options

If you want to integrate the legal agent into the main chat flow later, you could:

1. **Add a model option**: Add "legal-agent" as a selectable model in the UI
2. **Smart routing**: Detect legal queries and route to the agent automatically
3. **Hybrid approach**: Use agent for research, main chat for general conversation
4. **Workflow orchestration**: Chain multiple agents for complex tasks

## Status

✅ **Legal agent is ready to use** as a standalone Mastra workflow
✅ **Main chat system is unchanged** and fully functional
✅ **Load-balanced Cerebras keys** configured and working
✅ **Tavily tools** integrated and available

---

**Date**: 2025-10-15
