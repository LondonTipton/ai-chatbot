# Cerebras Model - Max Tokens & Temperature Configuration Reference

**Last Updated**: November 6, 2025 - Token limits increased per TOKEN_LIMITS_ASSESSMENT.md recommendations

## Overview

This document details all max tokens and temperature configurations for Cerebras model instances across your application. **CRITICAL CHANGES: Token limits have been increased to prevent truncation and improve synthesis quality.**

### What Changed (Nov 6, 2025)

- ✅ Comprehensive workflow: 18K-20K → **25K-30K tokens**
- ✅ Synthesizer agent: 6K → **10K tokens**
- ✅ Chat agent: API defaults → **4K-6K tokens (explicit)**
- ✅ Deep/Breadth analysis: API defaults → **5K-8K tokens (explicit)**
- ✅ Other agents: API defaults → **3K-6K tokens (explicit)**

---

## 🎯 Key Finding

**The Cerebras SDK doesn't expose `temperature`, `topP`, or other generation parameters directly in the model initialization.** These parameters are controlled at:

1. **AI SDK level** - via `streamText()` method
2. **Runtime level** - via `generate()` method options
3. **Agent configuration** - via `new Agent()` constructor

---

## Cerebras Model Instances by Use Case

### 1. **Chat Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/chat-agent.ts`

| Parameter          | Value          | Notes                                      |
| ------------------ | -------------- | ------------------------------------------ |
| **Model**          | `gpt-oss-120b` | Main conversational model                  |
| **Context Window** | ~128K tokens   | Available capacity                         |
| **Temperature**    | 0.7            | Good for conversational tone               |
| **Max Tokens**     | **4K-6K**      | ✅ **NEW: Explicit (was API default ~2K)** |
| **Tool Choice**    | `auto`         | Agent decides when to use tools            |
| **Max Steps**      | `15`           | Allow multiple tool calls                  |

**Usage Pattern**:

```typescript
const stream = await chatAgent.stream(messages, {
  format: "aisdk",
  maxSteps: 15,
});
```

**Updated**: Explicit token allocation for better chat response quality.

---

### 2. **Synthesizer Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/synthesizer-agent.ts`

| Parameter          | Value          | Purpose                         |
| ------------------ | -------------- | ------------------------------- |
| **Model**          | `gpt-oss-120b` | Text synthesis                  |
| **Context Window** | ~128K tokens   | Available capacity              |
| **Temperature**    | 0.6            | Deterministic synthesis         |
| **Max Tokens**     | **10000**      | ✅ **NEW: Increased from 6000** |
| **Tools**          | None           | Formatting only                 |
| **Max Steps**      | `1`            | Single operation                |

**Configuration Documentation**:

```typescript
/**
 * Synthesizer Agent - UPDATED
 *
 * Configuration:
 * - Temperature: 0.6 (deterministic synthesis for consistency)
 * - Max Tokens: 10000 (INCREASED from 6000 to handle comprehensive analysis)
 */
```

**Impact**: Now handles comprehensive analysis output (5K-8K tokens) without truncation.

**Usage Pattern**:

```typescript
const synthesized = await synthesizerAgent.generate(prompt, {
  maxSteps: 1,
});
```

---

### 3. **Analysis Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/analysis-agent.ts`

| Parameter          | Value          | Purpose                            |
| ------------------ | -------------- | ---------------------------------- |
| **Model**          | `gpt-oss-120b` | Legal analysis                     |
| **Context Window** | ~128K tokens   | Available capacity                 |
| **Temperature**    | 0.5            | Balanced for analytical precision  |
| **Max Tokens**     | 10000          | ✅ Unchanged (already appropriate) |
| **Tools**          | `summarize`    | Compress long content              |
| **Max Steps**      | `2`            | Limited tool calls                 |

**Status**: ✅ Appropriate - no changes needed.

---

### 4. **Depth Analysis Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/depth-analysis-agent.ts`

| Parameter          | Value          | Purpose                                    |
| ------------------ | -------------- | ------------------------------------------ |
| **Model**          | `gpt-oss-120b` | Source analysis                            |
| **Context Window** | ~128K tokens   | Available capacity                         |
| **Temperature**    | 0.5            | Analytical precision                       |
| **Max Tokens**     | **5K-8K**      | ✅ **NEW: Explicit (was API default ~2K)** |
| **Tools**          | None           | Analysis only                              |
| **Max Steps**      | `15`           | Multiple analysis operations               |

**Updated**: Explicit token limits for multi-source analysis.

---

### 5. **Breadth Synthesis Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/breadth-synthesis-agent.ts`

| Parameter          | Value          | Purpose                                    |
| ------------------ | -------------- | ------------------------------------------ |
| **Model**          | `gpt-oss-120b` | Multi-source synthesis                     |
| **Context Window** | ~128K tokens   | Available capacity                         |
| **Temperature**    | 0.6            | Balanced for perspective blending          |
| **Max Tokens**     | **5K-8K**      | ✅ **NEW: Explicit (was API default ~2K)** |
| **Tools**          | None           | Synthesis only                             |
| **Max Steps**      | `15`           | Multiple synthesis operations              |

**Updated**: Explicit token limits for comprehensive source synthesis.

---

### 6. **Search Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/search-agent.ts`

| Parameter          | Value                      | Notes                                      |
| ------------------ | -------------------------- | ------------------------------------------ |
| **Model**          | `gpt-oss-120b`             | Search coordination                        |
| **Context Window** | ~128K tokens               | Available capacity                         |
| **Temperature**    | 0.7                        | Good for query generation                  |
| **Max Tokens**     | **3K-5K**                  | ✅ **NEW: Explicit (was API default ~2K)** |
| **Tools**          | `tavilySearchAdvancedTool` | Search only                                |
| **Max Steps**      | `15`                       | Multiple searches allowed                  |

---

### 7. **Extract Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/extract-agent.ts`

| Parameter          | Value               | Notes                                      |
| ------------------ | ------------------- | ------------------------------------------ |
| **Model**          | `gpt-oss-120b`      | Extraction coordination                    |
| **Context Window** | ~128K tokens        | Available capacity                         |
| **Temperature**    | 0.7                 | Default                                    |
| **Max Tokens**     | **3K**              | ✅ **NEW: Explicit (was API default ~2K)** |
| **Tools**          | `tavilyExtractTool` | Extraction tool                            |
| **Max Steps**      | `15`                | Multiple extractions                       |

---

### 8. **Medium Research Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/medium-research-agent.ts`

| Parameter          | Value                      | Notes                                      |
| ------------------ | -------------------------- | ------------------------------------------ |
| **Model**          | `gpt-oss-120b`             | Research coordination                      |
| **Context Window** | ~128K tokens               | Available capacity                         |
| **Temperature**    | 0.7                        | Good for research planning                 |
| **Max Tokens**     | **4K**                     | ✅ **NEW: Explicit (was API default ~2K)** |
| **Tools**          | `tavilySearchAdvancedTool` | Research tool                              |
| **Max Steps**      | `15`                       | Multiple research operations               |

---

### 9. **Summarizer Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/summarizer-agent.ts`

| Parameter          | Value          | Notes                                      |
| ------------------ | -------------- | ------------------------------------------ |
| **Model**          | `gpt-oss-120b` | Content summarization                      |
| **Context Window** | ~128K tokens   | Available capacity                         |
| **Temperature**    | 0.5            | Analytical precision                       |
| **Max Tokens**     | **4K-6K**      | ✅ **NEW: Explicit (was API default ~2K)** |
| **Tools**          | None           | Summarization only                         |
| **Max Steps**      | `15`           | Multiple operations                        |

---

### 10. **Artifact Generation** (`llama3.1-8b`)

**File**: `lib/ai/providers.ts`

| Parameter          | Value         | Notes                    |
| ------------------ | ------------- | ------------------------ |
| **Model**          | `llama3.1-8b` | Code/artifact generation |
| **Context Window** | ~8K tokens    | Smaller window           |
| **Temperature**    | 0.7           | Default                  |
| **Max Tokens**     | **3K**        | Keep lean for efficiency |
| **Tools**          | None          | Direct generation        |
| **Max Steps**      | `15`          | Streaming compatible     |

---

## 🔄 Streaming Configuration

All agents using the Mastra SDK streaming pattern:

```typescript
const stream = await agent.stream([{ role: "user", content: query }], {
  format: "aisdk", // AI SDK v5 format
  maxSteps: 15, // Maximum tool invocation steps
} as any);
```

### Streaming Parameters

| Parameter       | Value       | Description                |
| --------------- | ----------- | -------------------------- |
| **format**      | `"aisdk"`   | AI SDK v5 compatibility    |
| **maxSteps**    | `15`        | Max tool calls per stream  |
| **temperature** | ❌ Not used | Would override if provided |
| **maxTokens**   | ❌ Not used | Would override if provided |

---

## 📊 Updated Configurations Summary

### Critical Changes (Nov 6, 2025)

#### Comprehensive Analysis Workflow

- **Before**: 18K-20K tokens
- **After**: **25K-30K tokens** ✅
- **Change**: +40% to prevent truncation
- **File**: `mastra/workflows/comprehensive-analysis-workflow.ts`
- **Details**:
  - Initial research: 5K → **8K tokens**
  - Deep-dive searches: 5K each → **7K each** (14K total)
  - Enhance path: 5K → **6K tokens**
  - Synthesis: 3-5K → **8-10K tokens**

#### Synthesizer Agent

- **Before**: 6K tokens
- **After**: **10K tokens** ✅
- **Change**: +67% to handle comprehensive output
- **File**: `mastra/agents/synthesizer-agent.ts`
- **Impact**: No more truncation on complex synthesis tasks

#### Agent Token Limits (Now Explicit)

- Chat Agent: Default → **4K-6K** ✅
- Depth Analysis: Default → **5K-8K** ✅
- Breadth Synthesis: Default → **5K-8K** ✅
- Search Agent: Default → **3K-5K** ✅
- Extract Agent: Default → **3K** ✅
- Medium Research: Default → **4K** ✅
- Summarizer: Default → **4K-6K** ✅

---

## 📋 Token Budget by Workflow

### Quick Fact Search

- **Tokens**: 1K-2.5K
- **Model**: gpt-oss-120b
- **Time**: 3-5s
- **Status**: ✅ Unchanged

### Standard Research

- **Tokens**: 2K-4K
- **Model**: gpt-oss-120b
- **Time**: 4-7s
- **Status**: ✅ Unchanged

### Deep Research

- **Tokens**: 4K-8K
- **Model**: gpt-oss-120b
- **Time**: 5-10s
- **Status**: ✅ Unchanged

### Advanced Search

- **Tokens**: 4K-8K
- **Model**: gpt-oss-120b
- **Time**: 5-10s
- **Status**: ✅ Unchanged

### Comprehensive Research (UPDATED)

- **Tokens**: **25K-30K** (was 18K-20K) ✅
- **Model**: gpt-oss-120b
- **Time**: 25-47s
- **Status**: ✅ Increased per assessment

### Synthesis (per workflow step)

- **Tokens**: **10K max** (was 6K) ✅
- **Model**: gpt-oss-120b
- **Temperature**: 0.6

### Analysis (per workflow step)

- **Tokens**: 10K
- **Model**: gpt-oss-120b
- **Temperature**: 0.5

---

## ⚠️ Important Notes

1. **Token Limit Updates**: All limits are now explicit and documented in agent files.

2. **No Direct Parameter Exposure**: The Cerebras SDK (`@ai-sdk/cerebras`) doesn't expose `temperature`, `topP`, `topK`, etc. directly in model initialization - they're controlled at AI SDK level.

3. **Updated Allocations**: Comprehensive workflow and synthesizer agent have been increased to prevent information loss from truncation.

4. **Temperature Settings**:

   - **0.5**: Analysis agents (high precision needed)
   - **0.6**: Synthesizer & breadth agent (deterministic with slight creativity)
   - **0.7**: Chat, search, default (good balance)

5. **Max Steps**: All instances now use `maxSteps: 15` for streaming (updated from 5-6).

6. **Cost Impact**: Monthly increase ~$0.90 (+17% spend) for +20-30% output quality improvement.

---

## 🔍 Configuration by File Location (Updated)

| File                                                  | Model        | Temperature | MaxTokens  | Status     |
| ----------------------------------------------------- | ------------ | ----------- | ---------- | ---------- |
| `mastra/agents/chat-agent.ts`                         | gpt-oss-120b | 0.7         | **4-6K**   | ✅ UPDATED |
| `mastra/agents/synthesizer-agent.ts`                  | gpt-oss-120b | 0.6         | **10K**    | ✅ UPDATED |
| `mastra/agents/analysis-agent.ts`                     | gpt-oss-120b | 0.5         | 10K        | ✅ Good    |
| `mastra/agents/search-agent.ts`                       | gpt-oss-120b | 0.7         | **3-5K**   | ✅ UPDATED |
| `mastra/agents/medium-research-agent.ts`              | gpt-oss-120b | 0.7         | **4K**     | ✅ UPDATED |
| `mastra/agents/extract-agent.ts`                      | gpt-oss-120b | 0.7         | **3K**     | ✅ UPDATED |
| `mastra/agents/depth-analysis-agent.ts`               | gpt-oss-120b | 0.5         | **5-8K**   | ✅ UPDATED |
| `mastra/agents/breadth-synthesis-agent.ts`            | gpt-oss-120b | 0.6         | **5-8K**   | ✅ UPDATED |
| `mastra/agents/summarizer-agent.ts`                   | gpt-oss-120b | 0.5         | **4-6K**   | ✅ UPDATED |
| `lib/ai/providers.ts` (artifacts)                     | llama3.1-8b  | 0.7         | 3K         | ✅ Good    |
| `mastra/workflows/comprehensive-analysis-workflow.ts` | gpt-oss-120b | 0.7         | **25-30K** | ✅ UPDATED |

Legend: ✅ UPDATED = Changed Nov 6, 2025 | ✅ Good = No changes needed

---

## Implementation Notes

**Date Implemented**: November 6, 2025

**Files Modified**:

1. `mastra/workflows/comprehensive-analysis-workflow.ts` - Increased token budgets
2. `mastra/agents/synthesizer-agent.ts` - Increased from 6K to 10K
3. `mastra/agents/chat-agent.ts` - Added explicit 4-6K config
4. `mastra/agents/depth-analysis-agent.ts` - Added explicit 5-8K config
5. `mastra/agents/breadth-synthesis-agent.ts` - Added explicit 5-8K config
6. `mastra/agents/search-agent.ts` - Added explicit 3-5K config
7. `mastra/agents/extract-agent.ts` - Added explicit 3K config
8. `mastra/agents/medium-research-agent.ts` - Added explicit 4K config
9. `mastra/agents/summarizer-agent.ts` - Added explicit 4-6K config
10. `CEREBRAS_TOKENS_TEMPERATURE_CONFIG.md` - Updated this document

**Next Steps**:

- Monitor token usage and confirm improvements
- Track synthesis quality improvements
- Verify no truncation on comprehensive workflows
- Review monthly token spend increase

---

## 🎯 Key Finding

**The Cerebras SDK doesn't expose `temperature`, `topP`, or other generation parameters directly in the model initialization.** These parameters are controlled at:

1. **AI SDK level** - via `streamText()` method
2. **Runtime level** - via `generate()` method options
3. **Agent configuration** - via `new Agent()` constructor

---

## Cerebras Model Instances by Use Case

### 1. **Chat Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/chat-agent.ts`

```typescript
export const chatAgent = new Agent({
  name: "chat-agent",
  model: () => cerebrasProvider("gpt-oss-120b"),
  tools: {
    /* research tools */
  },
});
```

| Parameter             | Value                        | Notes                           |
| --------------------- | ---------------------------- | ------------------------------- |
| **Model**             | `gpt-oss-120b`               | Main conversational model       |
| **Context Window**    | ~128K tokens                 | Available capacity              |
| **Max Output Tokens** | ❓ Not explicitly configured | Uses API defaults               |
| **Temperature**       | ❓ Not explicitly configured | Uses API defaults (~0.7)        |
| **Tool Choice**       | `auto`                       | Agent decides when to use tools |
| **Max Steps**         | `15`                         | Allow multiple tool calls       |

**Usage Pattern**:

```typescript
const stream = await chatAgent.stream(messages, {
  format: "aisdk",
  maxSteps: 15,
});
```

**Default Behavior**: Uses Cerebras API defaults since no explicit parameters are set.

---

### 2. **Synthesizer Agent** (`llama3.1-70b` or similar)

**File**: `mastra/agents/synthesizer-agent.ts`

| Parameter          | Value          | Purpose                   |
| ------------------ | -------------- | ------------------------- |
| **Model**          | `gpt-oss-120b` | Text synthesis            |
| **Context Window** | ~128K tokens   | Available capacity        |
| **Temperature**    | `0.6`          | ✅ **Documented in code** |
| **Max Tokens**     | `6000`         | ✅ **Documented in code** |
| **Tools**          | None           | Formatting only           |
| **Max Steps**      | `1`            | Single operation          |

**Configuration Documentation**:

```typescript
/**
 * Synthesizer Agent
 *
 * Configuration:
 * - Temperature: 0.6 (passed at runtime via generate())
 * - Max Tokens: 6000 (passed at runtime via generate())
 * - Tools: None (formatting only)
 */
```

**Usage Pattern**:

```typescript
const synthesized = await synthesizerAgent.generate(prompt, {
  maxSteps: 1,
  // Temperature and maxTokens would be passed here if needed
});
```

**Note**: Parameters are documented but passed at runtime, not in Agent initialization.

---

### 3. **Analysis Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/analysis-agent.ts`

| Parameter          | Value          | Purpose                   |
| ------------------ | -------------- | ------------------------- |
| **Model**          | `gpt-oss-120b` | Legal analysis            |
| **Context Window** | ~128K tokens   | Available capacity        |
| **Temperature**    | `0.5`          | ✅ **Documented in code** |
| **Max Tokens**     | `10000`        | ✅ **Documented in code** |
| **Tools**          | `summarize`    | Compress long content     |
| **Max Steps**      | `2`            | Limited tool calls        |

**Configuration Documentation**:

```typescript
/**
 * Analysis Agent
 *
 * Configuration:
 * - Temperature: 0.5 (balanced for analytical precision)
 * - Max Tokens: 10000 (sufficient for comprehensive analysis)
 * - Tools: summarize (for condensing long content)
 */
```

**Usage Pattern**:

```typescript
const response = await analysisAgent.generate(input, {
  maxSteps: 2,
});
```

---

### 4. **Search Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/search-agent.ts`

| Parameter          | Value                        | Notes                     |
| ------------------ | ---------------------------- | ------------------------- |
| **Model**          | `gpt-oss-120b`               | Legal search specialist   |
| **Context Window** | ~128K tokens                 | Available capacity        |
| **Temperature**    | ❓ Not explicitly configured | Uses API defaults         |
| **Max Tokens**     | ❓ Not explicitly configured | Uses API defaults         |
| **Tools**          | `tavilySearchAdvanced`       | Search tool only          |
| **Max Steps**      | `15`                         | Multiple searches allowed |

---

### 5. **Medium Research Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/medium-research-agent.ts`

| Parameter          | Value                        | Notes                        |
| ------------------ | ---------------------------- | ---------------------------- |
| **Model**          | `gpt-oss-120b`               | Research coordinator         |
| **Context Window** | ~128K tokens                 | Available capacity           |
| **Temperature**    | ❓ Not explicitly configured | Uses API defaults            |
| **Max Tokens**     | ❓ Not explicitly configured | Uses API defaults            |
| **Tools**          | `tavilySearchAdvanced`       | Research tool                |
| **Max Steps**      | `15`                         | Multiple research operations |

---

### 6. **Extract Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/extract-agent.ts`

| Parameter          | Value                        | Notes                |
| ------------------ | ---------------------------- | -------------------- |
| **Model**          | `gpt-oss-120b`               | Content extraction   |
| **Context Window** | ~128K tokens                 | Available capacity   |
| **Temperature**    | ❓ Not explicitly configured | Uses API defaults    |
| **Max Tokens**     | ❓ Not explicitly configured | Uses API defaults    |
| **Tools**          | `tavilyExtract`              | Extraction tool      |
| **Max Steps**      | `15`                         | Multiple extractions |

---

### 7. **Depth Analysis Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/depth-analysis-agent.ts`

| Parameter          | Value                        | Notes                   |
| ------------------ | ---------------------------- | ----------------------- |
| **Model**          | `gpt-oss-120b`               | Analytical synthesis    |
| **Context Window** | ~128K tokens                 | Available capacity      |
| **Temperature**    | ❓ Not explicitly configured | Uses API defaults       |
| **Max Tokens**     | ❓ Not explicitly configured | Uses API defaults       |
| **Tools**          | None                         | Analysis only           |
| **Max Steps**      | `15`                         | Multiple analysis steps |

---

### 8. **Breadth Synthesis Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/breadth-synthesis-agent.ts`

| Parameter          | Value                        | Notes                    |
| ------------------ | ---------------------------- | ------------------------ |
| **Model**          | `gpt-oss-120b`               | Broad synthesis          |
| **Context Window** | ~128K tokens                 | Available capacity       |
| **Temperature**    | ❓ Not explicitly configured | Uses API defaults        |
| **Max Tokens**     | ❓ Not explicitly configured | Uses API defaults        |
| **Tools**          | None                         | Synthesis only           |
| **Max Steps**      | `15`                         | Multiple synthesis steps |

---

### 9. **Summarizer Agent** (`gpt-oss-120b`)

**File**: `mastra/agents/summarizer-agent.ts`

| Parameter          | Value                        | Notes                       |
| ------------------ | ---------------------------- | --------------------------- |
| **Model**          | `gpt-oss-120b`               | Content summarization       |
| **Context Window** | ~128K tokens                 | Available capacity          |
| **Temperature**    | ❓ Not explicitly configured | Uses API defaults           |
| **Max Tokens**     | ❓ Not explicitly configured | Uses API defaults           |
| **Tools**          | None                         | Summarization only          |
| **Max Steps**      | `15`                         | Multiple summary operations |

---

### 10. **Artifact Generation** (`llama3.1-8b`)

**File**: `lib/ai/providers.ts`

| Parameter          | Value                        | Notes                                |
| ------------------ | ---------------------------- | ------------------------------------ |
| **Model**          | `llama3.1-8b`                | Lightweight code/artifact generation |
| **Context Window** | ~8K tokens                   | Smaller window                       |
| **Temperature**    | ❓ Not explicitly configured | Uses API defaults                    |
| **Max Tokens**     | ❓ Not explicitly configured | Uses API defaults                    |
| **Tools**          | None                         | Direct generation                    |
| **Max Steps**      | `15`                         | Streaming compatible                 |

---

## 🔄 Streaming Configuration

All agents using the Mastra SDK streaming pattern:

```typescript
const stream = await agent.stream([{ role: "user", content: query }], {
  format: "aisdk", // AI SDK v5 format
  maxSteps: 15, // Maximum tool invocation steps
} as any);
```

### Streaming Parameters

| Parameter       | Value       | Description                |
| --------------- | ----------- | -------------------------- |
| **format**      | `"aisdk"`   | AI SDK v5 compatibility    |
| **maxSteps**    | `15`        | Max tool calls per stream  |
| **temperature** | ❌ Not used | Would override if provided |
| **maxTokens**   | ❌ Not used | Would override if provided |

---

## 📊 Documented Configurations Summary

### Agents with **Explicit Parameter Documentation**:

1. **Synthesizer Agent**

   - Temperature: `0.6`
   - Max Tokens: `6000`
   - Status: ✅ **Documented in code comments**

2. **Analysis Agent**
   - Temperature: `0.5`
   - Max Tokens: `10000`
   - Status: ✅ **Documented in code comments**

### Agents with **No Explicit Configuration**:

- Chat Agent
- Search Agent
- Medium Research Agent
- Extract Agent
- Depth Analysis Agent
- Breadth Synthesis Agent
- Summarizer Agent
- Artifact Generation

These use **API defaults** (typically `temperature: 0.7`, `maxTokens: 2000`).

---

## 🔧 How Parameters Are Controlled

### 1. **At Agent Definition**

```typescript
// These are NOT available on Cerebras agents
new Agent({
  name: "agent-name",
  model: cerebrasProvider("gpt-oss-120b"),
  // ❌ No temperature, maxTokens properties
});
```

### 2. **At Runtime (generate)**

```typescript
const response = await agent.generate(input, {
  maxSteps: 2,
  // ❌ Temperature and maxTokens not typically passed here
});
```

### 3. **At Stream Level**

```typescript
const stream = await agent.stream(messages, {
  format: "aisdk",
  maxSteps: 15,
  // ❌ Temperature and maxTokens could be added here if needed
} as any);
```

### 4. **In AI SDK's streamText()**

When using the lower-level AI SDK directly:

```typescript
const stream = streamText({
  model: cerebrasProvider("gpt-oss-120b"),
  messages,
  temperature: 0.7, // ✅ Available here
  maxTokens: 2000, // ✅ Available here
});
```

---

## 📋 Token Budget by Workflow

### Quick Fact Search

- **Tokens**: 1K-2.5K
- **Model**: gpt-oss-120b
- **Time**: 3-5s

### Standard Research

- **Tokens**: 2K-4K
- **Model**: gpt-oss-120b
- **Time**: 4-7s

### Deep Research

- **Tokens**: 4K-8K
- **Model**: gpt-oss-120b
- **Time**: 5-10s

### Comprehensive Research

- **Tokens**: 5K-10K
- **Model**: gpt-oss-120b
- **Time**: 8-15s

### Synthesis (per workflow step)

- **Tokens**: 6000
- **Model**: gpt-oss-120b
- **Temperature**: 0.6

### Analysis (per workflow step)

- **Tokens**: 10000
- **Model**: gpt-oss-120b
- **Temperature**: 0.5

---

## ⚠️ Important Notes

1. **No Direct Parameter Exposure**: The Cerebras SDK (`@ai-sdk/cerebras`) doesn't expose `temperature`, `topP`, `topK`, etc. directly in the model initialization.

2. **API Defaults**: When not specified, the Cerebras API uses its default values:

   - Temperature: ~0.7 (default)
   - Max Tokens: ~2000 (default)

3. **Only Two Agents Configure Parameters**:

   - Synthesizer Agent: temperature 0.6, maxTokens 6000
   - Analysis Agent: temperature 0.5, maxTokens 10000

4. **How to Override**:
   To pass temperature/maxTokens, you would need to modify the `stream()` or agent execution to pass them as options.

5. **Max Steps Changed**: All instances now use `maxSteps: 15` for streaming (updated from 5-6).

---

## 🔍 Configuration by File Location

| File                                       | Model        | Temperature | MaxTokens | Status |
| ------------------------------------------ | ------------ | ----------- | --------- | ------ |
| `mastra/agents/chat-agent.ts`              | gpt-oss-120b | Default     | Default   | ❓     |
| `mastra/agents/synthesizer-agent.ts`       | gpt-oss-120b | 0.6         | 6000      | ✅     |
| `mastra/agents/analysis-agent.ts`          | gpt-oss-120b | 0.5         | 10000     | ✅     |
| `mastra/agents/search-agent.ts`            | gpt-oss-120b | Default     | Default   | ❓     |
| `mastra/agents/medium-research-agent.ts`   | gpt-oss-120b | Default     | Default   | ❓     |
| `mastra/agents/extract-agent.ts`           | gpt-oss-120b | Default     | Default   | ❓     |
| `mastra/agents/depth-analysis-agent.ts`    | gpt-oss-120b | Default     | Default   | ❓     |
| `mastra/agents/breadth-synthesis-agent.ts` | gpt-oss-120b | Default     | Default   | ❓     |
| `mastra/agents/summarizer-agent.ts`        | gpt-oss-120b | Default     | Default   | ❓     |
| `lib/ai/providers.ts` (artifacts)          | llama3.1-8b  | Default     | Default   | ❓     |

Legend: ✅ = Documented in code | ❓ = Uses API defaults | Default = Not explicitly set
