# Mastra Integration Quick Reference

## Quick Start

### Enable Mastra

```env
ENABLE_MASTRA=true
MASTRA_MAX_STEPS_PER_AGENT=3
MASTRA_ENABLE_STREAMING=true
MASTRA_FALLBACK_TO_AI_SDK=true
```

### Disable Mastra

```env
ENABLE_MASTRA=false
```

## Complexity Routing

| Query Type                      | Complexity          | Handler           |
| ------------------------------- | ------------------- | ----------------- |
| "What is a contract?"           | `simple`            | AI SDK            |
| "Define force majeure"          | `light`             | AI SDK            |
| "Compare laws in CA, NY, TX"    | `medium`            | Medium Agent      |
| "Analyze AI regulation trends"  | `deep`              | Deep Workflow     |
| "Review this contract"          | `workflow-review`   | Review Workflow   |
| "Compare precedents on privacy" | `workflow-caselaw`  | Case Law Workflow |
| "Draft an NDA"                  | `workflow-drafting` | Drafting Workflow |

## Agents & Workflows

### Medium Research Agent

- **Max Steps**: 3
- **Use**: Multi-search queries
- **Location**: `lib/ai/agents/medium-research.ts`

### Deep Research Workflow

- **Steps**: Search → Extract → Analyze
- **Use**: Complex analysis
- **Location**: `lib/ai/workflows/deep-research.ts`

### Document Review Workflow

- **Steps**: Structure → Issues → Recommend
- **Use**: Document analysis
- **Location**: `lib/ai/workflows/document-review.ts`

### Case Law Analysis Workflow

- **Steps**: Search Cases → Extract Holdings → Compare
- **Use**: Precedent analysis
- **Location**: `lib/ai/workflows/case-law-analysis.ts`

### Legal Drafting Workflow

- **Steps**: Research → Draft → Refine
- **Use**: Document creation
- **Location**: `lib/ai/workflows/legal-drafting.ts`

## Available Tools

All agents have access to:

- `tavilySearch` - General search
- `tavilyAdvancedSearch` - Deep search
- `tavilyQna` - Quick Q&A
- `tavilyExtract` - Extract from URLs
- `createDocument` - Create artifacts
- `updateDocument` - Update artifacts
- `requestSuggestions` - Generate suggestions
- `summarizeContent` - Summarize text
- `getWeather` - Weather info (demo)

## Common Commands

### Test Workflows

```bash
pnpm tsx scripts/test-real-queries.ts
```

### Verify Tools

```bash
pnpm tsx scripts/verify-agent-tools.ts
pnpm tsx scripts/verify-mastra-tools.ts
```

### View Metrics

```bash
curl http://localhost:3000/api/admin/mastra-metrics
```

### Run Tests

```bash
pnpm test tests/unit/mastra-*.test.ts
pnpm test tests/integration/mastra-workflows.test.ts
```

## Debugging

### Enable Detailed Logging

Look for `[Mastra]` prefixed logs in console:

```
[Mastra] 🤖 Routing to Medium Research Agent
[Mastra] 📊 Agent: medium-research, Step 1/3: Searching...
[Mastra] ✅ Workflow completed in 2.3s, 3 steps, 245 chars
```

### Check Configuration

```typescript
import { MASTRA_CONFIG } from "@/lib/ai/mastra-config";
console.log(MASTRA_CONFIG);
```

### Test Specific Workflow

```typescript
import { routeToMastra } from "@/lib/ai/mastra-router";

const result = await routeToMastra(
  "medium",
  "Compare contract law in CA vs NY",
  context
);
```

## Troubleshooting

### Empty Responses

1. Check validation logs
2. Verify tool execution
3. Increase step limit if needed

### Workflow Timeouts

1. Reduce workflow complexity
2. Optimize tool calls
3. Add timeout handling

### Constant Fallback

1. Check Mastra configuration
2. Verify provider connection
3. Review validation rules

### Tool Failures

1. Verify tool registration
2. Check API keys
3. Validate tool parameters

## Key Files

| File                                | Purpose                |
| ----------------------------------- | ---------------------- |
| `lib/ai/mastra-config.ts`           | Mastra instance        |
| `lib/ai/mastra-router.ts`           | Routing logic          |
| `lib/ai/complexity-detector.ts`     | Complexity detection   |
| `lib/ai/mastra-stream-converter.ts` | Stream conversion      |
| `lib/ai/mastra-validation.ts`       | Response validation    |
| `lib/ai/mastra-metrics.ts`          | Metrics tracking       |
| `app/(chat)/api/chat/route.ts`      | Chat route integration |

## Metrics to Monitor

- **Success Rate**: >95% target
- **Fallback Rate**: <10% target
- **Execution Time**: <10s for deep workflows
- **Response Length**: >100 chars for complex queries

## Emergency Rollback

```env
ENABLE_MASTRA=false
```

Routes all queries to AI SDK immediately.

## Additional Documentation

- [Full Documentation](./MASTRA_DOCUMENTATION.md)
- [Requirements](./requirements.md)
- [Design](./design.md)
- [Tasks](./tasks.md)
