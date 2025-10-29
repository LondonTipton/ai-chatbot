# Quick Start: Intelligent Routing System

## What Was Implemented

A hybrid AI system that intelligently routes queries between Vercel AI SDK (fast, simple) and Mastra (complex, multi-step) based on query complexity.

## Quick Test

### 1. Test Routing Logic

```bash
pnpm test:routing
```

This will test all complexity levels and verify routing decisions.

Expected output:

```
✅ PASS
Query: "What is contract law?"
Expected: simple → AI SDK
Actual: simple → AI SDK
Reasoning: Direct question answering with quick search
Steps: 1

✅ PASS
Query: "Find cases about labor disputes in Zimbabwe"
Expected: medium → Mastra
Actual: medium → Mastra
Reasoning: Requires multiple search queries...
Steps: 3
```

### 2. Activate New Routing (Choose One)

#### Option A: Gradual Migration (Recommended)

Keep both routes and test with specific users:

```bash
# Current route stays active
# New route available at /api/chat-v2 (you'd need to create this)
```

#### Option B: Direct Replacement

```bash
# Backup current route
mv app/\(chat\)/api/chat/route.ts app/\(chat\)/api/chat/route-backup.ts

# Activate new routing
mv app/\(chat\)/api/chat/route-with-routing.ts app/\(chat\)/api/chat/route.ts

# Restart dev server
pnpm dev
```

### 3. Test in Browser

Start the dev server:

```bash
pnpm dev
```

Try these queries in the chat:

**Simple (AI SDK + QNA)**

- "What is contract law?"
- "Define intellectual property"

**Light (AI SDK + Advanced Search)**

- "Explain property rights in Zimbabwe"
- "Tell me about employment law"

**Medium (Mastra Agent - 2-4 searches)**

- "Find cases about labor disputes"
- "What are recent developments in land reform?"

**Deep (Mastra Workflow - Search → Extract → Analyze)**

- "Compare precedents on intellectual property rights"
- "Analyze case law on employment termination"

**Workflow (Mastra Multi-Agent)**

- "Review this contract: [paste contract]"
- "Analyze and suggest improvements for this document"

### 4. Monitor Logs

Watch the terminal for routing indicators:

```
[Routing] Query: "Find cases about labor disputes"
[Routing] Complexity: medium
[Routing] Reasoning: Requires multiple search queries...
[Routing] 🟢 Routing to Mastra (medium)
```

or

```
[Routing] Query: "What is contract law?"
[Routing] Complexity: simple
[Routing] Reasoning: Direct question answering...
[Routing] 🔵 Using AI SDK (simple)
[Routing] Active tools: tavilyQna, createDocument, updateDocument
```

## Routing Decision Tree

```
User Query
    │
    ├─ "What is...?" → Simple → AI SDK (tavilyQna)
    │
    ├─ "Explain..." → Light → AI SDK (tavilyAdvancedSearch)
    │
    ├─ "Find cases..." → Medium → Mastra Agent (4 searches)
    │
    ├─ "Compare precedents..." → Deep → Mastra Workflow (search→extract→analyze)
    │
    └─ "Review this..." → Workflow → Mastra Multi-Agent (analyze→suggest→validate)
```

## Key Features

### 1. Automatic Complexity Detection

```typescript
const analysis = detectQueryComplexity(userMessage);
// Returns: { complexity, reasoning, estimatedSteps }
```

### 2. Tool Call Limits

Each Mastra agent limited to **max 4 tool calls**:

```typescript
await agent.generate(message, { maxSteps: 4 });
```

### 3. Explicit Workflows

Clear multi-step processes:

```typescript
workflow
  .step(searchStep) // Find sources
  .then(extractStep) // Get content
  .then(analyzeStep) // Analyze
  .commit();
```

### 4. Seamless Streaming

Mastra streams automatically transform to AI SDK format for UI compatibility.

## Cost Comparison

| Complexity | Route  | API Calls            | Est. Cost |
| ---------- | ------ | -------------------- | --------- |
| Simple     | AI SDK | 1 QNA                | ~$0.001   |
| Light      | AI SDK | 1 Advanced           | ~$0.002   |
| Medium     | Mastra | 2-4 Searches         | ~$0.005   |
| Deep       | Mastra | 4 Search + 4 Extract | ~$0.015   |
| Workflow   | Mastra | 0 (reasoning)        | ~$0.008   |

## Troubleshooting

### Routing not working?

1. Check complexity detection:

```bash
pnpm test:routing
```

2. Verify Mastra agents are registered:

```typescript
// mastra/index.ts should export all agents
```

3. Check logs for routing decisions:

```
[Routing] 🟢 Routing to Mastra
```

### Mastra agent not found?

Ensure all agents are imported in `mastra/index.ts`:

```typescript
import { mediumResearchAgent } from "./agents/medium-research-agent";
import { searchAgent } from "./agents/search-agent";
// ... etc
```

### Tool calls exceeding limit?

Verify maxSteps is set:

```typescript
await agent.generate(message, { maxSteps: 4 });
```

## Next Steps

1. **Test routing logic**: `pnpm test:routing`
2. **Activate new route**: Choose Option A or B above
3. **Test in browser**: Try different query types
4. **Monitor performance**: Watch logs and response times
5. **Adjust complexity detection**: Fine-tune indicators if needed

## Rollback

If you need to rollback:

```bash
# Restore original route
mv app/\(chat\)/api/chat/route-backup.ts app/\(chat\)/api/chat/route.ts

# Remove new route
rm app/\(chat\)/api/chat/route-with-routing.ts

# Restart
pnpm dev
```

## Support

See `INTELLIGENT_ROUTING_IMPLEMENTATION.md` for detailed documentation.

---

**Ready to test?** Run `pnpm test:routing` to verify routing logic! 🚀
