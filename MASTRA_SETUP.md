# Mastra + Cerebras Integration Setup

This project now includes a clean Mastra integration with Cerebras gpt-oss-120b model.

## What's Included

### 1. Mastra Core Setup (`mastra/`)

- **`mastra/index.ts`**: Main Mastra instance configuration
- **`mastra/agents/legal-agent.ts`**: Legal research agent powered by Cerebras
- **`mastra/tools/tavily-search.ts`**: Web search tool using Tavily API
- **`mastra/tools/tavily-extract.ts`**: Content extraction tool using Tavily API

### 2. Agent Configuration

The legal agent is configured with:

- **Model**: Cerebras `gpt-oss-120b` (fast, cost-effective)
- **Tools**: Tavily search and extract for web research
- **Specialization**: Legal research and analysis

### 3. Environment Variables

Required in `.env.local`:

```bash
# Cerebras API Key (required)
CEREBRAS_API_KEY=your-cerebras-key-here

# Tavily API Key (required for search tools)
TAVILY_API_KEY=your-tavily-key-here
```

## How to Use

### Option 1: Direct Agent Usage

```typescript
import { mastra } from "@/mastra";

// Get the legal agent
const agent = mastra.getAgent("legalAgent");

// Generate a response
const result = await agent.generate(
  "What is the legal framework for IP in Zimbabwe?"
);
console.log(result.text);

// Stream a response
const stream = await agent.stream("Explain contract law basics");
for await (const chunk of stream) {
  console.log(chunk);
}
```

### Option 2: Integration with Existing Chat API

You can integrate the Mastra agent into your existing chat route:

```typescript
// In app/(chat)/api/chat/route.ts
import { mastra } from "@/mastra";

export async function POST(request: Request) {
  const agent = mastra.getAgent("legalAgent");

  // Use agent.stream() or agent.generate()
  const result = await agent.stream(messages);

  // Return the stream
  return result.toUIMessageStreamResponse();
}
```

## Key Features

### 1. Tool Calling

The agent can automatically use tools when needed:

- **Search**: Finds current legal information from the web
- **Extract**: Gets detailed content from specific legal sources

### 2. Cerebras Integration

- Uses `gpt-oss-120b` model (131K context, reasoning capable)
- Fast inference with cost-effective pricing
- Supports tool calling and structured outputs

### 3. Type Safety

- Full TypeScript support
- Zod schemas for input/output validation
- Type-safe tool definitions

## Architecture

```
mastra/
├── index.ts                    # Main Mastra instance
├── agents/
│   └── legal-agent.ts         # Legal research agent
└── tools/
    ├── tavily-search.ts       # Web search tool
    └── tavily-extract.ts      # Content extraction tool
```

## Next Steps

1. **Test the Agent**: Try the agent in the Mastra playground or via API
2. **Customize Instructions**: Modify the agent's instructions in `legal-agent.ts`
3. **Add More Tools**: Create additional tools in `mastra/tools/`
4. **Add Memory**: Configure agent memory for conversation history
5. **Add Workflows**: Create multi-step workflows for complex tasks

## Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [Cerebras Models](https://mastra.ai/en/models/providers/cerebras)
- [Mastra Tools](https://mastra.ai/docs/tools-mcp/overview)
- [Mastra Agents](https://mastra.ai/docs/agents/overview)

## Troubleshooting

### Agent not responding

- Check that `CEREBRAS_API_KEY` is set in `.env.local`
- Verify the API key is valid at https://inference.cerebras.ai/

### Tools not working

- Check that `TAVILY_API_KEY` is set in `.env.local`
- Verify the API key is valid at https://tavily.com

### TypeScript errors

- Run `npm install` to ensure all dependencies are installed
- Check that `serverExternalPackages: ["@mastra/*"]` is in `next.config.ts`
