# Mastra Integration Troubleshooting Guide

## Table of Contents

1. [Common Issues](#common-issues)
2. [Diagnostic Tools](#diagnostic-tools)
3. [Error Messages](#error-messages)
4. [Performance Issues](#performance-issues)
5. [Configuration Problems](#configuration-problems)
6. [Tool Execution Issues](#tool-execution-issues)
7. [Workflow Failures](#workflow-failures)
8. [Debugging Techniques](#debugging-techniques)

---

## Common Issues

### Issue 1: Empty or Very Short Responses

**Symptoms**:

- Mastra returns responses with <10 characters
- Response validation fails
- System falls back to AI SDK

**Possible Causes**:

1. Agent hitting 3-step limit before completing
2. Tool calls failing silently
3. Response validation too strict
4. Provider API issues

**Diagnostic Steps**:

```typescript
// 1. Check validation logs
console.log("[Mastra] Response validation:", {
  length: response.length,
  content: response.substring(0, 100),
  valid: validateMastraResponse(response),
});

// 2. Check agent step count
console.log("[Mastra] Agent steps:", {
  completed: stepsCompleted,
  max: MASTRA_CONFIG.maxStepsPerAgent,
  hitLimit: stepsCompleted >= MASTRA_CONFIG.maxStepsPerAgent,
});

// 3. Check tool execution
console.log("[Mastra] Tool calls:", {
  toolName,
  params: toolParams,
  result: toolResult,
  success: !!toolResult,
});
```

**Solutions**:

1. **Increase step limit** (if appropriate):

```env
MASTRA_MAX_STEPS_PER_AGENT=5
```

2. **Review agent instructions**:

```typescript
// Make instructions more specific
instructions: `You MUST provide a comprehensive answer of at least 100 words. 
Search multiple sources and synthesize findings.`;
```

3. **Check tool availability**:

```bash
pnpm tsx scripts/verify-agent-tools.ts
```

4. **Adjust validation rules**:

```typescript
// In lib/ai/mastra-validation.ts
export function validateMastraResponse(response: string): boolean {
  // Reduce minimum length if too strict
  if (response.length < 5) {
    // Was 10
    return false;
  }
  return true;
}
```

---

### Issue 2: Workflow Timeouts

**Symptoms**:

- Workflows take >30 seconds
- Requests timeout
- No response received

**Possible Causes**:

1. Too many workflow steps
2. Slow tool execution (especially Tavily searches)
3. Network issues with external APIs
4. Provider rate limiting

**Diagnostic Steps**:

```typescript
// 1. Measure step duration
const stepStart = Date.now();
const result = await agent.execute(step);
const stepDuration = Date.now() - stepStart;
console.log("[Mastra] Step duration:", stepDuration, "ms");

// 2. Check tool execution time
const toolStart = Date.now();
const toolResult = await executeTool(toolName, params);
const toolDuration = Date.now() - toolStart;
console.log("[Mastra] Tool duration:", toolName, toolDuration, "ms");

// 3. Monitor total workflow time
const workflowStart = Date.now();
const result = await workflow.execute(messages);
const workflowDuration = Date.now() - workflowStart;
console.log("[Mastra] Workflow duration:", workflowDuration, "ms");
```

**Solutions**:

1. **Add timeout handling**:

```typescript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("Workflow timeout")), 30000)
);

try {
  const result = await Promise.race([
    executeWorkflow(messages, context),
    timeoutPromise,
  ]);
} catch (error) {
  console.error("[Mastra] Timeout, falling back to AI SDK");
  return fallbackToAISDK(messages, context);
}
```

2. **Optimize tool calls**:

```typescript
// Use faster tools when possible
const quickResult = await tavilyQna({ query }); // Faster than tavilyAdvancedSearch

// Reduce search depth
const result = await tavilyAdvancedSearch({
  query,
  searchDepth: "basic", // Instead of "advanced"
  maxResults: 3, // Instead of 10
});
```

3. **Simplify workflows**:

```typescript
// Reduce from 4 steps to 3
const workflow = new Workflow({
  steps: [
    { agent: "search-agent" },
    { agent: "analyze-agent" }, // Combine extract + analyze
  ],
});
```

4. **Check network connectivity**:

```bash
# Test Tavily API
curl -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -d '{"api_key":"YOUR_KEY","query":"test"}'

# Test Cerebras API
curl https://api.cerebras.ai/v1/models \
  -H "Authorization: Bearer YOUR_KEY"
```

---

### Issue 3: Constant Fallback to AI SDK

**Symptoms**:

- Every Mastra query falls back to AI SDK
- Logs show repeated fallback messages
- Mastra workflows never complete successfully

**Possible Causes**:

1. Mastra configuration error
2. Provider API issues
3. Missing environment variables
4. Validation too strict

**Diagnostic Steps**:

```typescript
// 1. Check Mastra configuration
console.log("[Mastra] Config:", {
  enabled: process.env.ENABLE_MASTRA,
  maxSteps: MASTRA_CONFIG.maxStepsPerAgent,
  streaming: MASTRA_CONFIG.streamingEnabled,
  fallback: MASTRA_CONFIG.fallbackEnabled,
});

// 2. Test provider connection
import { cerebras } from "@/lib/ai/providers";

try {
  const response = await cerebras.chat.completions.create({
    model: "llama-3.3-70b",
    messages: [{ role: "user", content: "test" }],
  });
  console.log("[Mastra] Provider test: SUCCESS");
} catch (error) {
  console.error("[Mastra] Provider test: FAILED", error);
}

// 3. Check environment variables
console.log("[Mastra] Environment:", {
  cerebrasKey: process.env.CEREBRAS_API_KEY ? "Set" : "Missing",
  tavilyKey: process.env.TAVILY_API_KEY ? "Set" : "Missing",
  enableMastra: process.env.ENABLE_MASTRA,
});

// 4. Test workflow execution
try {
  const result = await routeToMastra("medium", messages, context);
  console.log("[Mastra] Workflow test: SUCCESS");
} catch (error) {
  console.error("[Mastra] Workflow test: FAILED", error);
}
```

**Solutions**:

1. **Verify environment variables**:

```env
# Required variables
ENABLE_MASTRA=true
CEREBRAS_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here

# Optional configuration
MASTRA_MAX_STEPS_PER_AGENT=3
MASTRA_ENABLE_STREAMING=true
MASTRA_FALLBACK_TO_AI_SDK=true
```

2. **Check Mastra initialization**:

```typescript
// In lib/ai/mastra-config.ts
export const mastra = new Mastra({
  agents: {
    mediumResearch: mediumResearchAgent,
    // ... all agents
  },
  workflows: {
    deepResearch: deepResearchWorkflow,
    // ... all workflows
  },
});

// Verify initialization
console.log("[Mastra] Agents:", Object.keys(mastra.agents));
console.log("[Mastra] Workflows:", Object.keys(mastra.workflows));
```

3. **Test individual components**:

```bash
# Test agents
pnpm tsx scripts/verify-agent-tools.ts

# Test workflows
pnpm tsx scripts/test-real-queries.ts

# Run unit tests
pnpm test tests/unit/mastra-*.test.ts
```

4. **Review validation logic**:

```typescript
// Check if validation is too strict
export function validateMastraResponse(response: string): boolean {
  console.log("[Mastra] Validating response:", {
    length: response.length,
    trimmed: response.trim().length,
    firstChars: response.substring(0, 50),
  });

  // Adjust validation as needed
  return response.trim().length >= 10;
}
```

---

### Issue 4: Tool Execution Failures

**Symptoms**:

- Tools not being called
- Tool calls return errors
- Agents complete without using tools

**Possible Causes**:

1. Tools not registered with agent
2. Missing API keys for tools
3. Invalid tool parameters
4. Tool implementation errors

**Diagnostic Steps**:

```typescript
// 1. Verify tool registration
console.log("[Mastra] Agent tools:", {
  agentName: agent.name,
  tools: agent.tools,
  toolCount: agent.tools.length,
});

// 2. Test tool execution
import { tavilySearch } from "@/mastra/tools/tavily-search";

try {
  const result = await tavilySearch.execute({
    query: "test query",
    maxResults: 3,
  });
  console.log("[Mastra] Tool test: SUCCESS", result);
} catch (error) {
  console.error("[Mastra] Tool test: FAILED", error);
}

// 3. Check API keys
console.log("[Mastra] API Keys:", {
  tavily: process.env.TAVILY_API_KEY ? "Set" : "Missing",
  cerebras: process.env.CEREBRAS_API_KEY ? "Set" : "Missing",
});

// 4. Monitor tool calls during execution
agent.on("toolCall", (toolName, params) => {
  console.log("[Mastra] Tool called:", toolName, params);
});

agent.on("toolResult", (toolName, result) => {
  console.log("[Mastra] Tool result:", toolName, result);
});
```

**Solutions**:

1. **Verify tool registration**:

```typescript
// All agents should have all tools
const allTools = [
  "tavilySearch",
  "tavilyAdvancedSearch",
  "tavilyQna",
  "tavilyExtract",
  "createDocument",
  "updateDocument",
  "requestSuggestions",
  "summarizeContent",
  "getWeather",
];

export const agent = new Agent({
  name: "example",
  tools: allTools, // Ensure all tools are included
});
```

2. **Check API keys**:

```bash
# Verify keys are set
echo $TAVILY_API_KEY
echo $CEREBRAS_API_KEY

# Test Tavily API directly
curl -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -d '{"api_key":"'$TAVILY_API_KEY'","query":"test"}'
```

3. **Validate tool parameters**:

```typescript
// Add parameter validation
export const tavilySearch = {
  name: "tavilySearch",
  execute: async (params: { query: string; maxResults?: number }) => {
    // Validate parameters
    if (!params.query || params.query.trim().length === 0) {
      throw new Error("Query parameter is required");
    }

    if (params.maxResults && params.maxResults < 1) {
      throw new Error("maxResults must be >= 1");
    }

    // Execute tool
    return await tavily.search(params);
  },
};
```

4. **Run verification scripts**:

```bash
# Verify all agents have all tools
pnpm tsx scripts/verify-agent-tools.ts

# Test each tool individually
pnpm tsx scripts/verify-mastra-tools.ts
```

---

### Issue 5: Streaming Not Working

**Symptoms**:

- No progress indicators shown
- Response appears all at once
- UI doesn't update during workflow

**Possible Causes**:

1. Streaming disabled in configuration
2. Stream conversion issues
3. UI not handling streaming properly
4. Provider doesn't support streaming

**Diagnostic Steps**:

```typescript
// 1. Check streaming configuration
console.log("[Mastra] Streaming config:", {
  enabled: MASTRA_CONFIG.streamingEnabled,
  envVar: process.env.MASTRA_ENABLE_STREAMING,
});

// 2. Test stream conversion
const mastraStream = await agent.stream(messages);
console.log("[Mastra] Stream type:", typeof mastraStream);
console.log(
  "[Mastra] Is ReadableStream:",
  mastraStream instanceof ReadableStream
);

// 3. Monitor stream chunks
const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log("[Mastra] Stream chunk:", value);
}

// 4. Check UI stream handling
// In components/chat.tsx
useEffect(() => {
  if (isLoading) {
    console.log("[UI] Receiving stream...");
  }
}, [isLoading]);
```

**Solutions**:

1. **Enable streaming**:

```env
MASTRA_ENABLE_STREAMING=true
```

2. **Verify stream conversion**:

```typescript
// In lib/ai/mastra-stream-converter.ts
export function convertMastraStreamToUI(
  mastraStream: ReadableStream,
  context: MastraContext
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const reader = mastraStream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            controller.close();
            break;
          }

          // Convert and enqueue
          const uiChunk = convertChunk(value);
          controller.enqueue(uiChunk);

          console.log("[Mastra] Streamed chunk:", uiChunk);
        }
      } catch (error) {
        console.error("[Mastra] Stream error:", error);
        controller.error(error);
      }
    },
  });
}
```

3. **Test streaming manually**:

```typescript
// Test script
const stream = await routeToMastra("medium", messages, context);
const reader = stream.getReader();

let chunks = 0;
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks++;
  console.log(`Chunk ${chunks}:`, value);
}

console.log(`Total chunks received: ${chunks}`);
```

---

## Diagnostic Tools

### 1. Metrics Dashboard

Access at: `http://localhost:3000/api/admin/mastra-metrics`

```bash
# View current metrics
curl http://localhost:3000/api/admin/mastra-metrics

# View metrics for specific time range
curl http://localhost:3000/api/admin/mastra-metrics?timeRange=day
```

### 2. Verification Scripts

```bash
# Verify agent tool configuration
pnpm tsx scripts/verify-agent-tools.ts

# Test individual tools
pnpm tsx scripts/verify-mastra-tools.ts

# Test with real queries
pnpm tsx scripts/test-real-queries.ts
```

### 3. Unit Tests

```bash
# Test all Mastra components
pnpm test tests/unit/mastra-*.test.ts

# Test specific component
pnpm test tests/unit/mastra-router.test.ts
pnpm test tests/unit/mastra-workflows.test.ts
pnpm test tests/unit/mastra-agents.test.ts
```

### 4. Integration Tests

```bash
# Test end-to-end workflows
pnpm test tests/integration/mastra-workflows.test.ts
```

### 5. Console Logging

Enable detailed logging by looking for `[Mastra]` prefixed messages:

```typescript
// In your code
console.log("[Mastra] Debug info:", {
  // ... debug data
});
```

---

## Error Messages

### "Mastra workflow failed, falling back to AI SDK"

**Meaning**: Workflow execution failed, system using AI SDK instead

**Check**:

1. Previous error messages in logs
2. Provider API status
3. Network connectivity
4. Configuration validity

### "Response validation failed"

**Meaning**: Mastra response didn't meet quality requirements

**Check**:

1. Response length
2. Response content
3. Validation rules
4. Agent step limit

### "Tool execution failed"

**Meaning**: A tool call failed during workflow

**Check**:

1. API keys for tool
2. Tool parameters
3. Network connectivity
4. Tool implementation

### "Agent step limit reached"

**Meaning**: Agent hit maximum steps before completing

**Check**:

1. `MASTRA_MAX_STEPS_PER_AGENT` setting
2. Agent instructions
3. Query complexity
4. Tool efficiency

---

## Performance Issues

### Slow Workflow Execution

**Symptoms**: Workflows take >10 seconds

**Solutions**:

1. Reduce workflow steps
2. Use faster tools (tavilyQna vs tavilyAdvancedSearch)
3. Optimize agent instructions
4. Reduce search result counts

### High Memory Usage

**Symptoms**: Memory usage increases over time

**Solutions**:

1. Clear metrics periodically
2. Limit stored workflow history
3. Stream responses instead of buffering
4. Monitor for memory leaks

### High API Costs

**Symptoms**: Unexpected API usage charges

**Solutions**:

1. Monitor metrics for excessive calls
2. Optimize tool usage
3. Cache results when appropriate
4. Use simpler workflows for common queries

---

## Configuration Problems

### Mastra Not Initializing

**Check**:

```typescript
import { mastra } from "@/lib/ai/mastra-config";

console.log("Mastra instance:", mastra);
console.log("Agents:", Object.keys(mastra.agents));
console.log("Workflows:", Object.keys(mastra.workflows));
```

### Environment Variables Not Loading

**Check**:

```bash
# Verify .env.local exists
ls -la .env.local

# Check variable values
node -e "console.log(process.env.ENABLE_MASTRA)"
node -e "console.log(process.env.CEREBRAS_API_KEY)"
```

### Provider Configuration Issues

**Check**:

```typescript
import { cerebras } from "@/lib/ai/providers";

// Test provider
const response = await cerebras.chat.completions.create({
  model: "llama-3.3-70b",
  messages: [{ role: "user", content: "test" }],
});

console.log("Provider test:", response);
```

---

## Debugging Techniques

### 1. Enable Verbose Logging

```typescript
// Add to mastra-router.ts
const DEBUG = true;

if (DEBUG) {
  console.log("[Mastra] Routing decision:", {
    complexity,
    shouldUseMastra: shouldUseMastra(complexity),
    enabledInEnv: process.env.ENABLE_MASTRA,
  });
}
```

### 2. Trace Workflow Execution

```typescript
// Add to workflow execution
console.log("[Mastra] Workflow start:", workflowName);

for (const step of workflow.steps) {
  console.log("[Mastra] Step start:", step.name);
  const result = await step.execute();
  console.log("[Mastra] Step complete:", step.name, result);
}

console.log("[Mastra] Workflow complete:", workflowName);
```

### 3. Monitor Tool Calls

```typescript
// Wrap tool execution
const originalExecute = tool.execute;
tool.execute = async (params) => {
  console.log("[Mastra] Tool call:", tool.name, params);
  const start = Date.now();

  try {
    const result = await originalExecute(params);
    console.log("[Mastra] Tool success:", tool.name, Date.now() - start, "ms");
    return result;
  } catch (error) {
    console.error("[Mastra] Tool error:", tool.name, error);
    throw error;
  }
};
```

### 4. Test in Isolation

```typescript
// Test single agent
const agent = mediumResearchAgent;
const result = await agent.stream([{ role: "user", content: "test query" }]);

// Test single workflow
const workflow = deepResearchWorkflow;
const result = await workflow.execute([
  { role: "user", content: "test query" },
]);

// Test single tool
const tool = tavilySearch;
const result = await tool.execute({
  query: "test",
  maxResults: 3,
});
```

---

## Getting Help

If issues persist after trying these solutions:

1. **Check logs** for `[Mastra]` prefixed messages
2. **Review metrics** at `/api/admin/mastra-metrics`
3. **Run verification scripts** to test components
4. **Check environment variables** are set correctly
5. **Verify provider APIs** are accessible
6. **Test in isolation** to identify failing component
7. **Review recent changes** that might have broken functionality

### Emergency Rollback

If Mastra is causing critical issues:

```env
ENABLE_MASTRA=false
```

This immediately routes all queries to AI SDK without code changes.

### Reporting Issues

When reporting issues, include:

1. Error messages from logs
2. Mastra configuration
3. Environment variable values (redact API keys)
4. Steps to reproduce
5. Expected vs actual behavior
6. Metrics data if available
