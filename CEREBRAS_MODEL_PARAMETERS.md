# Cerebras Model Parameters Reference

## Overview

This document provides a comprehensive reference of all Cerebras model parameters used throughout the ai-chatbot application.

---

## Cerebras Models in Use

### 1. **GPT-OSS-120B** (Primary Model)

The main model used across the application for general AI tasks.

#### Model Identifier

```typescript
model: () => cerebrasProvider("gpt-oss-120b");
```

#### Where It's Used

- **Chat Agent** (`mastra/agents/chat-agent.ts`)

  - Main conversational agent with tiered research workflows
  - Model: `gpt-oss-120b`
  - Tool Choice: `auto` (agent decides when to use tools)

- **Provider Configuration** (`lib/ai/providers.ts`)

  - Chat Model (default)
  - Reasoning Model
  - Title Generation Model
  - Used as fallback for artifact generation

- **Search Agents** (multiple agents in `mastra/agents/`)

  - Analysis Agent
  - Extract Agent
  - Legal Agent
  - Medium Research Agent

- **Workflows**
  - Advanced Search Workflow
  - Basic Search Workflow
  - Document Creation/Update
  - Legal Document Analysis

#### Model Specifications

| Property                | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| **Model ID**            | `gpt-oss-120b`                                          |
| **Context Window**      | ~128K tokens                                            |
| **Provider**            | Cerebras AI                                             |
| **Capabilities**        | Tool calling, reasoning, code generation, text analysis |
| **Supports Multimodal** | ❌ No (images use Gemini instead)                       |

#### Usage Pattern

```typescript
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";

const cerebrasProvider = getBalancedCerebrasProvider();

// Create model instance
const model = cerebrasProvider("gpt-oss-120b");
```

#### Tool Integration

When used with the Mastra Agent framework:

```typescript
export const chatAgent = new Agent({
  name: "chat-agent",
  instructions: "...",
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

---

### 2. **Llama 3.1-8B** (Artifact Generation)

A smaller, faster model used specifically for artifact generation.

#### Model Identifier

```typescript
"artifact-model": () => cerebrasProvider("llama3.1-8b")
```

#### Where It's Used

- **Artifact Generation** (`lib/ai/providers.ts`)
  - Fast artifact/code snippet generation
  - No tools required
  - Lightweight processing

#### Model Specifications

| Property           | Value                                      |
| ------------------ | ------------------------------------------ |
| **Model ID**       | `llama3.1-8b`                              |
| **Size**           | 8 Billion Parameters                       |
| **Provider**       | Cerebras AI (optimized)                    |
| **Use Case**       | Fast, lightweight code/artifact generation |
| **Context Window** | ~8K tokens (typical for 8B models)         |

#### Usage Pattern

```typescript
"artifact-model": (() => {
  try {
    return cerebrasProvider("llama3.1-8b");
  } catch (error) {
    logger.warn(
      "[Providers] Cerebras unavailable for artifacts, using Gemini"
    );
    return googleProvider("gemini-2.5-flash");
  }
})(),
```

---

## Key Model Parameters

### Agent Streaming Parameters

When agents stream responses using Cerebras models:

```typescript
const stream = await agent.stream([{ role: "user", content: query }], {
  format: "aisdk", // AI SDK v5 format
  maxSteps: 15, // Allow multiple tool calls
} as any);
```

#### Streaming Options

| Parameter    | Value     | Purpose                                 |
| ------------ | --------- | --------------------------------------- |
| **format**   | `"aisdk"` | Ensures AI SDK v5 compatibility         |
| **maxSteps** | `5`       | Maximum number of tool invocation steps |

### Tool Invocation Parameters

#### Tool Choice Strategy

```typescript
tools: {
  // auto - agent decides when to use tools
  quickFactSearch: quickFactSearchTool,
  standardResearch: standardResearchTool,
  deepResearch: deepResearchTool,
  comprehensiveResearch: comprehensiveResearchTool,
  createDocument: createDocumentTool,
  updateDocument: updateDocumentTool,
}
```

Tool choice is set to `auto` - the Cerebras agent automatically determines which tool to invoke based on the user query and conversation context.

---

## Retry and Error Handling

### Retry Configuration (AI SDK Level)

```typescript
// Note: @ai-sdk/cerebras doesn't expose maxRetries option directly
// Retries are handled at the AI SDK level (streamText maxRetries: 5)
```

#### Default Retry Behavior

- **Max Retries**: 5 (handled by AI SDK)
- **Retry Strategy**: Exponential backoff
- **Error Handling**: Automatic key rotation via load balancer

### Load Balancing Parameters

The Cerebras key balancer provides automatic load distribution:

```typescript
// Environment Variables
CEREBRAS_API_KEY; // Primary key
CEREBRAS_API_KEY_85; // Additional keys (85-89 supported)
CEREBRAS_API_KEY_86;
CEREBRAS_API_KEY_87;
CEREBRAS_API_KEY_88;
CEREBRAS_API_KEY_89;
```

#### Load Balancer Configuration

| Parameter                   | Behavior                          |
| --------------------------- | --------------------------------- |
| **Strategy**                | Round-robin across available keys |
| **Key Rotation**            | Automatic on 429/quota errors     |
| **Queue Exceeded Cooldown** | 15 seconds                        |
| **Server Error Cooldown**   | 30 seconds                        |
| **Quota Error Cooldown**    | 60 seconds                        |

---

## Token Management

### Context Window Allocations

| Model            | Context Window | Typical Usage                       |
| ---------------- | -------------- | ----------------------------------- |
| **gpt-oss-120b** | ~128K tokens   | Research, analysis, tool invocation |
| **llama3.1-8b**  | ~8K tokens     | Artifact generation                 |

### Token Estimation for Workflows

#### Chat Agent Workflows

- **Quick Fact Search**: 1K-2.5K tokens
- **Standard Research**: 2K-4K tokens
- **Deep Research**: 4K-8K tokens
- **Comprehensive Research**: 5K-10K tokens

#### Typical Flow

```
User Query → Complexity Detection → Agent Selection → Tool Execution → Response
```

---

## API Configuration

### Cerebras Provider Factory

```typescript
import { createCerebras } from "@ai-sdk/cerebras";

// Direct creation (used by load balancer)
const base = createCerebras({ apiKey: process.env.CEREBRAS_API_KEY });

// Wrapped with logging
const provider = wrapWithLogging(base, keyPreview);

// Get model instance
const model = provider("gpt-oss-120b");
```

### Provider Configuration in Custom Provider

```typescript
customProvider({
  languageModels: {
    "chat-model": cerebrasProvider("gpt-oss-120b"),
    "chat-model-reasoning": cerebrasProvider("gpt-oss-120b"),
    "title-model": cerebrasProvider("gpt-oss-120b"),
    "artifact-model": cerebrasProvider("llama3.1-8b"),
  },
});
```

---

## Fallback Configuration

The application implements a **Cerebras-first** approach with Gemini fallback:

```
Cerebras gpt-oss-120b (primary)
    ↓ (on error)
Gemini 2.5 Flash (fallback)
    ↓ (for images only)
Gemini 2.5 Flash (multimodal)
```

### Fallback Scenarios

1. **Chat unavailable**: Falls back to Gemini 2.5 Flash
2. **Reasoning unavailable**: Falls back to Gemini 2.5 Pro
3. **Image understanding**: Uses Gemini 2.5 Flash (Cerebras doesn't support images)
4. **Artifacts unavailable**: Falls back to Gemini 2.5 Flash

---

## Model Availability

### Testing Requirements

All Cerebras model tests require:

```typescript
if (!process.env.CEREBRAS_API_KEY) {
  throw new Error("CEREBRAS_API_KEY is required for [AGENT] tests");
}
```

### Supported Tests

- AUTO agent tests
- DEEP agent tests
- MEDIUM agent tests
- Rate limiter tests with Cerebras token limits

---

## Implementation Notes

### 1. Singleton Pattern

The Cerebras provider uses a singleton pattern to ensure consistent API key balancing:

```typescript
let balancerInstance: CerebrasKeyBalancer | null = null;

export function getBalancedCerebrasProvider(): ReturnType<
  typeof createCerebras
> {
  return getCerebrasBalancer().getProvider();
}
```

### 2. Server-Side Only

Cerebras initialization is restricted to server-side to prevent API key exposure:

```typescript
if (typeof window !== "undefined") {
  logger.warn(
    "[Cerebras Balancer] Attempted to initialize on client side - skipping"
  );
  // ... fallback to empty config
}
```

### 3. Automatic Key Rotation

The load balancer automatically rotates keys on failures:

```typescript
balancer.markKeyAsFailed(key, errorMessage, retryDelaySeconds);
```

### 4. No Direct Model Parameters

The Cerebras SDK doesn't expose temperature, topP, or other generation parameters directly. These are controlled at the AI SDK level through `streamText()` or agent configuration.

---

## Quick Reference Table

| Component              | Model(s) Used  | Parameters                         | Fallback           |
| ---------------------- | -------------- | ---------------------------------- | ------------------ |
| **Chat Agent**         | `gpt-oss-120b` | `toolChoice: auto`, `maxSteps: 15` | `gemini-2.5-flash` |
| **Reasoning**          | `gpt-oss-120b` | `format: aisdk`                    | `gemini-2.5-pro`   |
| **Artifacts**          | `llama3.1-8b`  | None (no tools)                    | `gemini-2.5-flash` |
| **Title Generation**   | `gpt-oss-120b` | None                               | `gemini-2.5-flash` |
| **Research Workflows** | `gpt-oss-120b` | Query-dependent                    | `gemini-2.5-flash` |

---

## Related Files

- **Provider Configuration**: `lib/ai/providers.ts`
- **Key Balancer**: `lib/ai/cerebras-key-balancer.ts`
- **Chat Agent**: `mastra/agents/chat-agent.ts`
- **Mastra Integration**: `lib/ai/mastra-sdk-integration.ts`
- **Chat Route**: `app/(chat)/api/chat/route.ts`
- **Complexity Detection**: `lib/ai/complexity-detector.ts`
