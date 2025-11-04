# Mastra AI SDK Integration Guide

## Overview

This project implements the **official @mastra/ai-sdk integration pattern** for AI SDK v5 compatibility, following the Mastra framework documentation.

## Packages

- `@mastra/core@0.23.3` - Core Mastra framework
- `@mastra/ai-sdk@0.2.5` - Official AI SDK v5 integration utilities
- `ai@5.0.26` - Vercel AI SDK v5
- `@ai-sdk/react@2.0.26` - React hooks for AI SDK

## Quick Start

### 1. Start Development Server

```bash
pnpm dev
```

### 2. Test the Integration

**Interactive Test Page:**

```
http://localhost:3000/api/mastra/test
```

**API Endpoint:**

```bash
curl -X POST http://localhost:3000/api/mastra/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is contract law?"}],
    "agent": "legalAgent"
  }'
```

**Existing Chat:**
Your chat at `/` automatically uses Mastra for medium/deep queries.

## Architecture

### File Structure

```
mastra/
├── index.ts                          # Mastra instance with agents
├── agents/                           # Agent definitions
│   ├── legal-agent.ts               # Simple/light queries
│   ├── medium-research-agent.ts     # Medium complexity
│   ├── search-agent.ts              # Deep research
│   ├── extract-agent.ts             # Content extraction
│   └── analysis-agent.ts            # Pure reasoning
└── tools/                            # Tool definitions
    ├── tavily-search.ts
    ├── tavily-extract.ts
    └── ...

app/api/mastra/
├── chat/route.ts                     # Official Mastra endpoint
└── test/page.tsx                     # Interactive test interface

lib/ai/
└── mastra-sdk-integration.ts         # Integration helpers

app/(chat)/api/chat/route.ts          # Main chat with Mastra routing
```

### Agent Selection

| Complexity   | Agent                 | Use Case              | Speed     |
| ------------ | --------------------- | --------------------- | --------- |
| `simple`     | `legalAgent`          | Quick Q&A             | 100-500ms |
| `light`      | `legalAgent`          | Light research        | 1-2s      |
| `medium`     | `mediumResearchAgent` | Multi-search          | 2-5s      |
| `deep`       | `searchAgent`         | Deep research         | 5-20s     |
| `workflow-*` | `searchAgent`         | Specialized workflows | 5-20s     |

## Implementation

### Official Pattern

```typescript
import { mastra } from "@/mastra";

// Get agent
const agent = mastra.getAgent("legalAgent");

// Stream with AI SDK v5 format
const stream = await agent.stream(messages, {
  format: "aisdk",
  memory: { thread: chatId, resource: userId },
});

// Return as UI message stream
return stream.toUIMessageStreamResponse();
```

### Using Helper Functions

```typescript
import { streamMastraAgent } from "@/lib/ai/mastra-sdk-integration";

const stream = await streamMastraAgent(
  "medium", // complexity
  "What are contract requirements?",
  {
    userId: "user-123",
    chatId: "chat-456",
    memory: { thread: "chat-456", resource: "user-123" },
  }
);

return stream.toUIMessageStreamResponse();
```

### Frontend with useChat()

```typescript
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/mastra/chat",
    prepareSendMessagesRequest({ messages: chatMessages }) {
      return {
        body: {
          messages: chatMessages,
          agent: "legalAgent",
          memory: {
            thread: "chat-id",
            resource: "user-id",
          },
        },
      };
    },
  }),
});
```

## API Reference

### streamMastraAgent()

Stream a Mastra agent response with automatic agent selection.

```typescript
async function streamMastraAgent(
  complexity: QueryComplexity,
  query: string,
  options?: MastraStreamOptions
): Promise<MastraModelOutput>;
```

**Parameters:**

- `complexity` - Query complexity level (`simple`, `light`, `medium`, `deep`, `workflow-*`)
- `query` - User query text
- `options` - Optional configuration:
  - `userId` - User identifier
  - `chatId` - Chat identifier
  - `sessionId` - Session identifier
  - `memory` - Memory configuration:
    - `thread` - Conversation thread ID
    - `resource` - User/resource ID

**Returns:** AI SDK v5 compatible stream with `toUIMessageStreamResponse()` method

### streamMastraAgentWithHistory()

Stream with full message history for context-aware responses.

```typescript
async function streamMastraAgentWithHistory(
  complexity: QueryComplexity,
  messages: any[],
  options?: MastraStreamOptions
): Promise<MastraModelOutput>;
```

### convertToMastraMessages()

Convert UI messages to Mastra format.

```typescript
function convertToMastraMessages(messages: any[]): MastraMessage[];
```

## Available Agents

### 1. Legal Agent (`legalAgent`)

- **Best for**: Quick legal questions, simple queries
- **Tools**: Tavily search, Tavily extract
- **Model**: Cerebras gpt-oss-120b
- **Speed**: Fast (100-500ms)

### 2. Medium Research Agent (`mediumResearchAgent`)

- **Best for**: Multi-source research, comprehensive answers
- **Tools**: Advanced Tavily search (max 4 calls)
- **Model**: Cerebras gpt-oss-120b
- **Speed**: Medium (2-5s)

### 3. Search Agent (`searchAgent`)

- **Best for**: Deep research, finding sources
- **Tools**: Advanced Tavily search (max 4 calls)
- **Model**: Cerebras gpt-oss-120b
- **Speed**: Slower (5-20s)

### 4. Extract Agent (`extractAgent`)

- **Best for**: Content extraction from URLs
- **Tools**: Tavily extract
- **Model**: Cerebras gpt-oss-120b
- **Speed**: Fast (1-2s)

### 5. Analysis Agent (`analysisAgent`)

- **Best for**: Pure reasoning, no external data needed
- **Tools**: None
- **Model**: Cerebras gpt-oss-120b
- **Speed**: Fast (100-500ms)

## Memory Configuration

Memory enables persistent conversation context across messages.

```typescript
memory: {
  thread: "chat-123",    // Conversation thread (use chat ID)
  resource: "user-456",  // User context (use user ID)
}
```

**Benefits:**

- Maintains conversation context
- Improves response relevance
- Enables follow-up questions
- Reduces redundant information

## Environment Variables

Required in `.env.local`:

```bash
# Cerebras API Key (required for all agents)
CEREBRAS_API_KEY=your-cerebras-key

# Tavily API Key (required for search/extract tools)
TAVILY_API_KEY=your-tavily-key
```

## Testing

### Interactive Test Page

Visit `http://localhost:3000/api/mastra/test` for:

- Agent selection dropdown
- Real-time streaming
- Message history
- Error handling
- Memory configuration

### API Testing

```bash
# Test legal agent
curl -X POST http://localhost:3000/api/mastra/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is contract law?"}],
    "agent": "legalAgent"
  }'

# Test with memory
curl -X POST http://localhost:3000/api/mastra/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Tell me more"}],
    "agent": "legalAgent",
    "memory": {
      "thread": "test-thread",
      "resource": "test-user"
    }
  }'
```

### Integration Testing

Your existing chat at `/` automatically routes queries to Mastra based on complexity detection.

## Customization

### Adding a New Agent

1. Create agent file in `mastra/agents/`:

```typescript
import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";

const cerebrasProvider = getBalancedCerebrasProvider();

export const myAgent = new Agent({
  name: "My Custom Agent",
  instructions: "Your agent instructions here...",
  model: () => cerebrasProvider("gpt-oss-120b"),
  tools: {
    // Add tools here
  },
});
```

2. Register in `mastra/index.ts`:

```typescript
import { myAgent } from "./agents/my-agent";

export const mastra = new Mastra({
  agents: {
    // ... existing agents
    myAgent: myAgent as any,
  },
});
```

3. Update agent selection in `lib/ai/mastra-sdk-integration.ts`:

```typescript
function selectAgentForComplexity(complexity: QueryComplexity): string {
  switch (complexity) {
    case "custom":
      return "myAgent";
    // ... other cases
  }
}
```

### Adding a New Tool

1. Create tool file in `mastra/tools/`:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const myTool = createTool({
  id: "my-tool",
  description: "Tool description",
  inputSchema: z.object({
    input: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ context }) => {
    // Tool implementation
    return { result: "..." };
  },
});
```

2. Add to agent:

```typescript
export const myAgent = new Agent({
  // ... other config
  tools: {
    myTool,
  },
});
```

## Performance

### Expected Latency

- **Simple queries**: 100-500ms TTFB
- **Light queries**: 1-2s TTFB
- **Medium queries**: 2-5s TTFB
- **Deep queries**: 5-20s TTFB

### Optimization Tips

1. **Use appropriate complexity** - Let auto-detection work or specify manually
2. **Enable memory** - Improves context awareness
3. **Limit tool calls** - Max 4 per agent for predictable performance
4. **Use streaming** - Better UX with real-time responses
5. **Monitor logs** - Check routing decisions and performance

## Troubleshooting

### Agent not responding

```bash
# Check environment variables
cat .env.local | grep CEREBRAS_API_KEY
cat .env.local | grep TAVILY_API_KEY
```

Verify keys are valid at:

- Cerebras: https://inference.cerebras.ai/
- Tavily: https://tavily.com

### Tools not working

Ensure tools are:

1. Imported in agent file
2. Added to agent's `tools` object
3. Have valid API keys configured

### TypeScript errors

```bash
# Reinstall dependencies
pnpm install
```

### Memory not persisting

Ensure consistent IDs:

- Use same `thread` ID for entire conversation
- Use same `resource` ID for user across conversations

### Stream errors

Check that you're using `format: "aisdk"`:

```typescript
const stream = await agent.stream(messages, {
  format: "aisdk", // Required for AI SDK v5
});
```

## Migration from Custom Implementation

### Before (Custom)

```typescript
import { streamMastraRoute } from "@/lib/ai/mastra-router";

const stream = await streamMastraRoute(complexity, query, context);
return stream.toUIMessageStreamResponse();
```

### After (Official)

```typescript
import { streamMastraAgent } from "@/lib/ai/mastra-sdk-integration";

const stream = await streamMastraAgent(complexity, query, {
  ...context,
  memory: { thread: chatId, resource: userId },
});
return stream.toUIMessageStreamResponse();
```

## Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra AI SDK Guide](https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk)
- [AI SDK v5 Documentation](https://sdk.vercel.ai/docs)
- [Mastra Agents Guide](https://mastra.ai/docs/agents/overview)
- [Mastra Tools Guide](https://mastra.ai/docs/tools-mcp/overview)

## Support

For issues or questions:

1. Check this documentation
2. Review Mastra docs at https://mastra.ai/docs
3. Check AI SDK docs at https://sdk.vercel.ai/docs
4. Review implementation in `lib/ai/mastra-sdk-integration.ts`

---

**Status**: ✅ Production Ready

The integration follows the official Mastra pattern and is ready for use.
