# AI SDK Tools & Features Guide

## Current Tools in This Project

### 1. **createDocument** (`lib/ai/tools/create-document.ts`)

- **Purpose**: Creates artifacts (code, text, images, spreadsheets)
- **Input**: `title` (string), `kind` (enum: 'text', 'code', 'image', 'sheet')
- **Use Case**: When user asks to create a document, write code, generate an image, or create a spreadsheet
- **Example**: "Create a React component for a login form"

### 2. **updateDocument** (`lib/ai/tools/update-document.ts`)

- **Purpose**: Updates existing artifacts based on user description
- **Input**: `id` (document ID), `description` (change description)
- **Use Case**: Iterative editing of previously created artifacts
- **Example**: "Add error handling to the login component"

### 3. **requestSuggestions** (`lib/ai/tools/request-suggestions.ts`)

- **Purpose**: Generates AI-powered suggestions to improve text documents
- **Input**: `documentId` (string)
- **Use Case**: Writing assistance, content improvement
- **Features**: Uses `streamObject()` to generate structured suggestions
- **Example**: "Suggest improvements for this essay"

### 4. **getWeather** (`lib/ai/tools/get-weather.ts`)

- **Purpose**: Fetches real-time weather data
- **Input**: `latitude` (number), `longitude` (number)
- **API**: Open-Meteo API
- **Use Case**: Weather-related queries
- **Example**: "What's the weather like in New York?"

## How Tools Are Used

In `app/(chat)/api/chat/route.ts`:

```typescript
tools: {
  getWeather,
  createDocument: createDocument({ session, dataStream }),
  updateDocument: updateDocument({ session, dataStream }),
  requestSuggestions: requestSuggestions({ session, dataStream }),
}
```

Tools are conditionally enabled based on the model:

- **Reasoning model** (`chat-model-reasoning`): No tools (pure reasoning)
- **Chat model** (`chat-model`): All 4 tools enabled

## Additional AI SDK Features You Can Use

### 1. **Multi-Step Tool Calling**

Already implemented via `stopWhen: stepCountIs(5)` - allows AI to chain multiple tool calls.

### 2. **Structured Output with `generateObject()`**

Generate structured data without streaming:

```typescript
import { generateObject } from "ai";

const result = await generateObject({
  model: myProvider.languageModel("chat-model"),
  schema: z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  }),
  prompt:
    "Extract user information from: John Doe, 30 years old, john@example.com",
});
```

**Use Cases**:

- Form extraction
- Data parsing
- Classification tasks
- Structured data generation

### 3. **Streaming Objects with `streamObject()`**

Already used in `requestSuggestions` - stream structured data as it's generated.

**Additional Use Cases**:

- Real-time data extraction
- Progressive form filling
- Live data parsing

### 4. **Text Generation with `generateText()`**

Non-streaming text generation:

```typescript
import { generateText } from "ai";

const { text } = await generateText({
  model: myProvider.languageModel("chat-model"),
  prompt: "Write a haiku about coding",
});
```

**Use Cases**:

- Title generation (already used in `generateTitleFromUserMessage`)
- Batch processing
- Background tasks

### 5. **Image Generation**

Already configured with `imagen-3.0-generate-001`:

```typescript
import { experimental_generateImage as generateImage } from "ai";

const { image } = await generateImage({
  model: myProvider.imageModel("small-model"),
  prompt: "A serene mountain landscape at sunset",
  size: "1024x1024",
});
```

**Use Cases**:

- Avatar generation
- Illustration creation
- Visual content generation

### 6. **Embeddings with `embed()` and `embedMany()`**

Generate vector embeddings for semantic search:

```typescript
import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";

// Single embedding
const { embedding } = await embed({
  model: google.textEmbeddingModel("text-embedding-004"),
  value: "Search query text",
});

// Multiple embeddings
const { embeddings } = await embedMany({
  model: google.textEmbeddingModel("text-embedding-004"),
  values: ["Text 1", "Text 2", "Text 3"],
});
```

**Use Cases**:

- Semantic search
- Document similarity
- RAG (Retrieval Augmented Generation)
- Clustering and classification

### 7. **Tool Choice Control**

Force or prevent tool usage:

```typescript
streamText({
  model: myProvider.languageModel("chat-model"),
  messages,
  tools: { getWeather, createDocument },
  toolChoice: "required", // Force tool use
  // or
  toolChoice: "none", // Prevent tool use
  // or
  toolChoice: { type: "tool", toolName: "getWeather" }, // Force specific tool
});
```

### 8. **Parallel Tool Calling**

AI SDK automatically handles parallel tool execution when the model supports it.

### 9. **Custom Middleware**

Already used for reasoning extraction:

```typescript
import { wrapLanguageModel, extractReasoningMiddleware } from "ai";

const modelWithReasoning = wrapLanguageModel({
  model: google("gemini-2.0-flash-thinking-exp-1219"),
  middleware: extractReasoningMiddleware({ tagName: "think" }),
});
```

**Custom Middleware Use Cases**:

- Logging and monitoring
- Content filtering
- Rate limiting
- Custom transformations

### 10. **Prompt Caching** (Provider-specific)

Reduce costs by caching system prompts:

```typescript
streamText({
  model: myProvider.languageModel("chat-model"),
  system: {
    content: "Long system prompt...",
    experimental_providerMetadata: {
      google: {
        cacheControl: { type: "ephemeral" },
      },
    },
  },
  messages,
});
```

## Potential New Tools to Add

### 1. **Web Search Tool**

```typescript
import { tool } from "ai";
import { z } from "zod";

export const webSearch = tool({
  description: "Search the web for current information",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
  }),
  execute: async ({ query }) => {
    // Integrate with Brave Search, Serper, or Tavily API
    const response = await fetch(`https://api.search.com?q=${query}`);
    return await response.json();
  },
});
```

### 2. **Code Execution Tool**

```typescript
export const executeCode = tool({
  description: "Execute Python or JavaScript code safely",
  inputSchema: z.object({
    language: z.enum(["python", "javascript"]),
    code: z.string(),
  }),
  execute: async ({ language, code }) => {
    // Use E2B, Replit, or similar sandboxed execution
    // Return execution results
  },
});
```

### 3. **Database Query Tool**

```typescript
export const queryDatabase = tool({
  description: "Query the database for user data",
  inputSchema: z.object({
    query: z.string().describe("Natural language query"),
  }),
  execute: async ({ query }) => {
    // Convert natural language to SQL
    // Execute safely with proper permissions
    // Return results
  },
});
```

### 4. **File System Tool**

```typescript
export const readFile = tool({
  description: "Read contents of a file",
  inputSchema: z.object({
    path: z.string(),
  }),
  execute: async ({ path }) => {
    // Read file with proper security checks
    // Return file contents
  },
});
```

### 5. **API Integration Tool**

```typescript
export const callAPI = tool({
  description: "Make API calls to external services",
  inputSchema: z.object({
    endpoint: z.string(),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]),
    body: z.any().optional(),
  }),
  execute: async ({ endpoint, method, body }) => {
    // Make API call with proper authentication
    // Return response
  },
});
```

### 6. **Calendar/Scheduling Tool**

```typescript
export const scheduleEvent = tool({
  description: "Schedule events in calendar",
  inputSchema: z.object({
    title: z.string(),
    date: z.string(),
    duration: z.number(),
  }),
  execute: async ({ title, date, duration }) => {
    // Integrate with Google Calendar, Outlook, etc.
  },
});
```

### 7. **Email Tool**

```typescript
export const sendEmail = tool({
  description: "Send emails",
  inputSchema: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  execute: async ({ to, subject, body }) => {
    // Send email via SendGrid, Resend, etc.
  },
});
```

### 8. **Image Analysis Tool**

```typescript
export const analyzeImage = tool({
  description: "Analyze images and extract information",
  inputSchema: z.object({
    imageUrl: z.string().url(),
    question: z.string().optional(),
  }),
  execute: async ({ imageUrl, question }) => {
    // Use Gemini Vision or similar
    // Return analysis results
  },
});
```

### 9. **Translation Tool**

```typescript
export const translate = tool({
  description: "Translate text between languages",
  inputSchema: z.object({
    text: z.string(),
    targetLanguage: z.string(),
  }),
  execute: async ({ text, targetLanguage }) => {
    // Use Google Translate API or similar
  },
});
```

### 10. **Memory/Context Tool**

```typescript
export const rememberContext = tool({
  description: "Store information for later recall",
  inputSchema: z.object({
    key: z.string(),
    value: z.string(),
  }),
  execute: async ({ key, value }) => {
    // Store in database or vector store
    // Enable long-term memory
  },
});
```

## Advanced Features

### RAG (Retrieval Augmented Generation)

Combine embeddings with vector databases:

```typescript
import { embed } from "ai";
import { google } from "@ai-sdk/google";

// 1. Generate embedding for query
const { embedding } = await embed({
  model: google.textEmbeddingModel("text-embedding-004"),
  value: userQuery,
});

// 2. Search vector database (Pinecone, Weaviate, etc.)
const relevantDocs = await vectorDB.search(embedding);

// 3. Include in context
const result = await streamText({
  model: myProvider.languageModel("chat-model"),
  system: `Context: ${relevantDocs.join("\n\n")}`,
  prompt: userQuery,
});
```

### Multi-Modal Inputs

Already supported - send images with messages:

```typescript
{
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    { type: 'image', image: imageUrl },
  ],
}
```

### Streaming UI Components

Use `createStreamableUI()` for dynamic UI:

```typescript
import { createStreamableUI } from "ai/rsc";

const ui = createStreamableUI();
ui.update(<LoadingSpinner />);
// ... do work ...
ui.done(<ResultComponent data={result} />);
```

## Best Practices

1. **Tool Descriptions**: Be specific and clear - helps AI choose correctly
2. **Input Validation**: Use Zod schemas for type safety
3. **Error Handling**: Always handle tool execution errors gracefully
4. **Rate Limiting**: Implement per-user limits for expensive operations
5. **Security**: Validate all inputs, sanitize outputs, check permissions
6. **Streaming**: Use streaming for better UX on long operations
7. **Caching**: Cache expensive operations (embeddings, API calls)
8. **Monitoring**: Log tool usage for debugging and analytics

## Resources

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Tool Calling Guide](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling)
- [Gemini Models](https://ai.google.dev/gemini-api/docs/models)
- [Structured Output](https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data)
