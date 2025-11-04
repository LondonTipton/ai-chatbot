# Mastra Integration API Reference

## Core Functions

### routeToMastra()

Routes queries to appropriate Mastra agent or workflow.

**Location**: `lib/ai/mastra-router.ts`

**Signature**:

```typescript
async function routeToMastra(
  complexity: QueryComplexity,
  messages: CoreMessage[],
  context: MastraContext
): Promise<ReadableStream>;
```

**Parameters**:

- `complexity`: Query complexity level (`"medium"`, `"deep"`, `"workflow-review"`, `"workflow-caselaw"`, `"workflow-drafting"`)
- `messages`: Array of conversation messages
- `context`: Execution context including session, user, chat info

**Returns**: `ReadableStream` - Streaming response compatible with UI

**Example**:

```typescript
const stream = await routeToMastra("medium", messages, {
  session,
  userId: session.userId,
  chatId: chat.id,
  transactionId: transaction.id,
});
```

**Throws**:

- `Error` - If complexity type is unsupported
- `Error` - If workflow execution fails

---

### shouldUseMastra()

Determines if query should use Mastra or AI SDK.

**Location**: `lib/ai/complexity-detector.ts`

**Signature**:

```typescript
function shouldUseMastra(complexity: QueryComplexity): boolean;
```

**Parameters**:

- `complexity`: Query complexity level

**Returns**: `boolean` - `true` if should use Mastra, `false` for AI SDK

**Example**:

```typescript
const complexity = detectComplexity(userMessage);
if (shouldUseMastra(complexity)) {
  // Use Mastra
} else {
  // Use AI SDK
}
```

---

### detectComplexity()

Analyzes query and determines complexity level.

**Location**: `lib/ai/complexity-detector.ts`

**Signature**:

```typescript
function detectComplexity(message: string): QueryComplexity;
```

**Parameters**:

- `message`: User query text

**Returns**: `QueryComplexity` - One of: `"simple"`, `"light"`, `"medium"`, `"deep"`, `"workflow-review"`, `"workflow-caselaw"`, `"workflow-drafting"`

**Example**:

```typescript
const complexity = detectComplexity("Compare contract law in 3 states");
// Returns: "medium"
```

---

### convertMastraStreamToUI()

Converts Mastra stream format to UI-compatible format.

**Location**: `lib/ai/mastra-stream-converter.ts`

**Signature**:

```typescript
function convertMastraStreamToUI(
  mastraStream: ReadableStream,
  context: MastraContext
): ReadableStream;
```

**Parameters**:

- `mastraStream`: Raw Mastra stream
- `context`: Execution context

**Returns**: `ReadableStream` - UI-compatible stream

**Example**:

```typescript
const mastraStream = await agent.stream(messages);
const uiStream = convertMastraStreamToUI(mastraStream, context);
```

---

### validateMastraResponse()

Validates Mastra response meets quality requirements.

**Location**: `lib/ai/mastra-validation.ts`

**Signature**:

```typescript
function validateMastraResponse(response: string): boolean;
```

**Parameters**:

- `response`: Response text to validate

**Returns**: `boolean` - `true` if valid, `false` otherwise

**Validation Rules**:

- Minimum 10 characters
- Not empty or whitespace only
- Contains actual content

**Example**:

```typescript
if (!validateMastraResponse(response)) {
  console.error("[Mastra] Invalid response, falling back");
  return fallbackToAISDK();
}
```

---

### recordMastraMetrics()

Records workflow execution metrics.

**Location**: `lib/ai/mastra-metrics.ts`

**Signature**:

```typescript
async function recordMastraMetrics(metrics: MastraMetrics): Promise<void>;
```

**Parameters**:

- `metrics`: Metrics object

**Metrics Object**:

```typescript
interface MastraMetrics {
  workflowType: string;
  executionTime: number;
  agentsUsed: number;
  stepsCompleted: number;
  success: boolean;
  fallbackUsed: boolean;
  responseLength: number;
  timestamp: Date;
}
```

**Example**:

```typescript
await recordMastraMetrics({
  workflowType: "medium",
  executionTime: 2300,
  agentsUsed: 1,
  stepsCompleted: 3,
  success: true,
  fallbackUsed: false,
  responseLength: 245,
  timestamp: new Date(),
});
```

---

### getMastraMetrics()

Retrieves aggregated metrics.

**Location**: `lib/ai/mastra-metrics.ts`

**Signature**:

```typescript
async function getMastraMetrics(
  timeRange?: "hour" | "day" | "week" | "month"
): Promise<AggregatedMetrics>;
```

**Parameters**:

- `timeRange`: Optional time range filter

**Returns**: `AggregatedMetrics` - Aggregated metrics data

**Response Object**:

```typescript
interface AggregatedMetrics {
  totalWorkflows: number;
  successRate: number;
  averageExecutionTime: number;
  fallbackRate: number;
  workflowBreakdown: {
    [key: string]: {
      count: number;
      successRate: number;
      avgExecutionTime: number;
    };
  };
}
```

**Example**:

```typescript
const metrics = await getMastraMetrics("day");
console.log(`Success rate: ${metrics.successRate * 100}%`);
```

---

## Agent Classes

### MediumResearchAgent

**Location**: `lib/ai/agents/medium-research.ts`

**Configuration**:

```typescript
{
  name: "medium-research",
  maxSteps: 3,
  tools: [all tools],
  model: {
    provider: "cerebras",
    name: "llama-3.3-70b",
  }
}
```

**Usage**:

```typescript
import { mediumResearchAgent } from "@/lib/ai/agents/medium-research";

const result = await mediumResearchAgent.stream(messages, context);
```

---

### SearchAgent

**Location**: `lib/ai/agents/search-agent.ts`

**Purpose**: Initial search step in workflows

**Configuration**:

```typescript
{
  name: "search-agent",
  maxSteps: 3,
  tools: [all tools],
}
```

---

### ExtractAgent

**Location**: `lib/ai/agents/extract-agent.ts`

**Purpose**: Content extraction step in workflows

**Configuration**:

```typescript
{
  name: "extract-agent",
  maxSteps: 3,
  tools: [all tools],
}
```

---

### AnalyzeAgent

**Location**: `lib/ai/agents/analyze-agent.ts`

**Purpose**: Analysis and synthesis step in workflows

**Configuration**:

```typescript
{
  name: "analyze-agent",
  maxSteps: 3,
  tools: [all tools],
}
```

---

## Workflow Classes

### DeepResearchWorkflow

**Location**: `lib/ai/workflows/deep-research.ts`

**Steps**:

1. Search (SearchAgent)
2. Extract (ExtractAgent)
3. Analyze (AnalyzeAgent)

**Usage**:

```typescript
import { deepResearchWorkflow } from "@/lib/ai/workflows/deep-research";

const result = await deepResearchWorkflow.execute(messages, context);
```

---

### DocumentReviewWorkflow

**Location**: `lib/ai/workflows/document-review.ts`

**Steps**:

1. Structure (StructureAgent)
2. Issues (IssuesAgent)
3. Recommendations (RecommendationsAgent)

**Usage**:

```typescript
import { documentReviewWorkflow } from "@/lib/ai/workflows/document-review";

const result = await documentReviewWorkflow.execute(messages, context);
```

---

### CaseLawAnalysisWorkflow

**Location**: `lib/ai/workflows/case-law-analysis.ts`

**Steps**:

1. Search Cases (CaseSearchAgent)
2. Extract Holdings (HoldingsAgent)
3. Compare (CompareAgent)

**Usage**:

```typescript
import { caseLawAnalysisWorkflow } from "@/lib/ai/workflows/case-law-analysis";

const result = await caseLawAnalysisWorkflow.execute(messages, context);
```

---

### LegalDraftingWorkflow

**Location**: `lib/ai/workflows/legal-drafting.ts`

**Steps**:

1. Research (ResearchAgent)
2. Draft (DraftAgent)
3. Refine (RefineAgent)

**Usage**:

```typescript
import { legalDraftingWorkflow } from "@/lib/ai/workflows/legal-drafting";

const result = await legalDraftingWorkflow.execute(messages, context);
```

---

## Tool Definitions

### tavilySearch

**Purpose**: General web search

**Parameters**:

```typescript
{
  query: string;
  maxResults?: number;
}
```

**Returns**: Array of search results with titles, URLs, and snippets

---

### tavilyAdvancedSearch

**Purpose**: Advanced search with depth control

**Parameters**:

```typescript
{
  query: string;
  searchDepth?: "basic" | "advanced";
  maxResults?: number;
}
```

**Returns**: Detailed search results with full content

---

### tavilyQna

**Purpose**: Quick question-answering

**Parameters**:

```typescript
{
  query: string;
}
```

**Returns**: Direct answer to question

---

### tavilyExtract

**Purpose**: Extract content from URLs

**Parameters**:

```typescript
{
  urls: string[];
}
```

**Returns**: Extracted content from each URL

---

### createDocument

**Purpose**: Create document artifact

**Parameters**:

```typescript
{
  title: string;
  content: string;
  kind: "text" | "code";
}
```

**Returns**: Document ID and metadata

---

### updateDocument

**Purpose**: Update existing document

**Parameters**:

```typescript
{
  documentId: string;
  content: string;
  description?: string;
}
```

**Returns**: Updated document metadata

---

### requestSuggestions

**Purpose**: Generate follow-up suggestions

**Parameters**:

```typescript
{
  context: string;
  count?: number;
}
```

**Returns**: Array of suggestion strings

---

### summarizeContent

**Purpose**: Summarize long content

**Parameters**:

```typescript
{
  content: string;
  maxLength?: number;
}
```

**Returns**: Summarized text

---

### getWeather

**Purpose**: Get weather information (demo tool)

**Parameters**:

```typescript
{
  location: string;
}
```

**Returns**: Weather data for location

---

## REST API Endpoints

### GET /api/admin/mastra-metrics

Retrieve Mastra workflow metrics.

**Query Parameters**:

- `timeRange`: Optional (`"hour"`, `"day"`, `"week"`, `"month"`)

**Response**:

```json
{
  "totalWorkflows": 150,
  "successRate": 0.96,
  "averageExecutionTime": 3200,
  "fallbackRate": 0.04,
  "workflowBreakdown": {
    "medium": {
      "count": 50,
      "successRate": 0.98,
      "avgExecutionTime": 2100
    },
    "deep": {
      "count": 40,
      "successRate": 0.95,
      "avgExecutionTime": 4500
    }
  }
}
```

**Example**:

```bash
curl http://localhost:3000/api/admin/mastra-metrics?timeRange=day
```

---

## Type Definitions

### QueryComplexity

```typescript
type QueryComplexity =
  | "simple"
  | "light"
  | "medium"
  | "deep"
  | "workflow-review"
  | "workflow-caselaw"
  | "workflow-drafting";
```

### MastraContext

```typescript
interface MastraContext {
  session: Session;
  userId: string;
  chatId: string;
  transactionId: string;
}
```

### MastraMetrics

```typescript
interface MastraMetrics {
  workflowType: string;
  executionTime: number;
  agentsUsed: number;
  stepsCompleted: number;
  success: boolean;
  fallbackUsed: boolean;
  responseLength: number;
  timestamp: Date;
}
```

### WorkflowResult

```typescript
interface WorkflowResult {
  success: boolean;
  response: string;
  steps: WorkflowStep[];
  duration: number;
  agentsUsed: number;
}

interface WorkflowStep {
  agent: string;
  duration: number;
  output: any;
  error?: string;
}
```

---

## Configuration Constants

### MASTRA_CONFIG

**Location**: `lib/ai/mastra-config.ts`

```typescript
export const MASTRA_CONFIG = {
  maxStepsPerAgent: 3,
  streamingEnabled: true,
  fallbackEnabled: true,
};
```

### Environment Variables

```typescript
process.env.ENABLE_MASTRA; // "true" | "false"
process.env.MASTRA_MAX_STEPS_PER_AGENT; // "3"
process.env.MASTRA_ENABLE_STREAMING; // "true" | "false"
process.env.MASTRA_FALLBACK_TO_AI_SDK; // "true" | "false"
```

---

## Error Types

### MastraWorkflowError

```typescript
class MastraWorkflowError extends Error {
  constructor(
    message: string,
    public workflowType: string,
    public step?: string
  ) {
    super(message);
    this.name = "MastraWorkflowError";
  }
}
```

### MastraValidationError

```typescript
class MastraValidationError extends Error {
  constructor(message: string, public response: string) {
    super(message);
    this.name = "MastraValidationError";
  }
}
```

---

## Testing Utilities

### testMastraWorkflow()

**Location**: `scripts/test-real-queries.ts`

```typescript
async function testMastraWorkflow(
  complexity: QueryComplexity,
  query: string
): Promise<TestResult>;
```

### verifyAgentTools()

**Location**: `scripts/verify-agent-tools.ts`

```typescript
async function verifyAgentTools(): Promise<VerificationResult>;
```

### verifyMastraTools()

**Location**: `scripts/verify-mastra-tools.ts`

```typescript
async function verifyMastraTools(): Promise<VerificationResult>;
```
