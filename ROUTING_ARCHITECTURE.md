# Intelligent Routing Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Query                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Complexity Detector                             │
│  Analyzes query intent, keywords, and structure                  │
│  Returns: complexity level + reasoning + estimated steps         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌───────────────┐         ┌──────────────┐
        │   AI SDK      │         │   Mastra     │
        │   (Simple)    │         │  (Complex)   │
        └───────┬───────┘         └──────┬───────┘
                │                        │
    ┌───────────┴───────────┐   ┌────────┴────────┐
    │                       │   │                 │
    ▼                       ▼   ▼                 ▼
┌────────┐            ┌────────┐ ┌──────┐    ┌──────────┐
│ Simple │            │ Light  │ │Medium│    │   Deep   │
│  QNA   │            │Advanced│ │Agent │    │ Workflow │
└────────┘            └────────┘ └──────┘    └──────────┘
```

## Routing Decision Matrix

| Query Type  | Example                   | Complexity | Route  | Tools                | Steps |
| ----------- | ------------------------- | ---------- | ------ | -------------------- | ----- |
| Definition  | "What is contract law?"   | Simple     | AI SDK | tavilyQna            | 1     |
| Explanation | "Explain property rights" | Light      | AI SDK | tavilyAdvancedSearch | 1     |
| Case Search | "Find cases about X"      | Medium     | Mastra | Agent (4 searches)   | 3     |
| Analysis    | "Compare precedents"      | Deep       | Mastra | Workflow (S→E→A)     | 4     |
| Review      | "Review this document"    | Workflow   | Mastra | Multi-agent          | 5     |

## AI SDK Flow (Simple & Light)

```
User Query
    │
    ├─ Simple: "What is contract law?"
    │     │
    │     ▼
    │  ┌──────────────────┐
    │  │  Tavily QNA      │
    │  │  - Basic search  │
    │  │  - 3 sources     │
    │  │  - Fast answer   │
    │  └────────┬─────────┘
    │           │
    │           ▼
    │  ┌──────────────────┐
    │  │  Cerebras Model  │
    │  │  gpt-oss-120b    │
    │  └────────┬─────────┘
    │           │
    │           ▼
    │     Direct Answer
    │
    └─ Light: "Explain property rights in Zimbabwe"
          │
          ▼
       ┌──────────────────────┐
       │ Tavily Advanced      │
       │ - Advanced search    │
       │ - 5-10 sources       │
       │ - Detailed answer    │
       └────────┬─────────────┘
                │
                ▼
       ┌──────────────────────┐
       │  Cerebras Model      │
       │  gpt-oss-120b        │
       └────────┬─────────────┘
                │
                ▼
         Detailed Response
```

## Mastra Agent Flow (Medium)

```
User Query: "Find cases about labor disputes in Zimbabwe"
    │
    ▼
┌─────────────────────────────────────────┐
│     Medium Research Agent               │
│     Max 4 tool calls                    │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┐
    │             │             │             │
    ▼             ▼             ▼             ▼
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│Search 1│   │Search 2│   │Search 3│   │Search 4│
│Labor   │   │Disputes│   │Zimbabwe│   │Recent  │
│Law     │   │Cases   │   │Courts  │   │Rulings │
└───┬────┘   └───┬────┘   └───┬────┘   └───┬────┘
    │            │            │            │
    └────────────┴────────────┴────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  Synthesize        │
         │  All Results       │
         └────────┬───────────┘
                  │
                  ▼
         Comprehensive Answer
```

## Mastra Workflow Flow (Deep)

```
User Query: "Compare precedents on intellectual property rights"
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│              Deep Research Workflow                      │
└─────────────────────────────────────────────────────────┘
    │
    ├─ Step 1: Search Agent (Max 4 searches)
    │     │
    │     ├─ Search: "IP rights case law"
    │     ├─ Search: "intellectual property precedents"
    │     ├─ Search: "patent copyright trademark cases"
    │     └─ Search: "IP rights Zimbabwe"
    │     │
    │     ▼
    │  ┌──────────────────────────────────┐
    │  │ Output: List of 8-12 URLs        │
    │  │ with titles and descriptions     │
    │  └────────────┬─────────────────────┘
    │               │
    ├─ Step 2: Extract Agent (Max 4 extractions)
    │     │
    │     ├─ Extract: URL 1 (most relevant)
    │     ├─ Extract: URL 2
    │     ├─ Extract: URL 3
    │     └─ Extract: URL 4
    │     │
    │     ▼
    │  ┌──────────────────────────────────┐
    │  │ Output: Full content from        │
    │  │ 4 sources (summarized if large)  │
    │  └────────────┬─────────────────────┘
    │               │
    └─ Step 3: Analysis Agent (No tools)
          │
          ▼
       ┌──────────────────────────────────┐
       │ Pure Reasoning:                  │
       │ - Compare holdings               │
       │ - Identify patterns              │
       │ - Note conflicts                 │
       │ - Synthesize findings            │
       └────────────┬─────────────────────┘
                    │
                    ▼
         Comprehensive Legal Analysis
         with Citations
```

## Document Review Workflow

```
User Query: "Review this contract for compliance"
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│           Document Review Workflow                       │
└─────────────────────────────────────────────────────────┘
    │
    ├─ Step 1: Analyze Document
    │     │
    │     ▼
    │  ┌──────────────────────────────────┐
    │  │ Analysis Agent                   │
    │  │ - Identify issues                │
    │  │ - Note strengths                 │
    │  │ - Find gaps                      │
    │  └────────────┬─────────────────────┘
    │               │
    ├─ Step 2: Suggest Improvements
    │     │
    │     ▼
    │  ┌──────────────────────────────────┐
    │  │ Analysis Agent                   │
    │  │ - Generate suggestions           │
    │  │ - Provide reasoning              │
    │  │ - Recommend changes              │
    │  └────────────┬─────────────────────┘
    │               │
    └─ Step 3: Validate Suggestions
          │
          ▼
       ┌──────────────────────────────────┐
       │ Analysis Agent                   │
       │ - Verify suggestions             │
       │ - Prioritize (critical/minor)    │
       │ - Check for conflicts            │
       └────────────┬─────────────────────┘
                    │
                    ▼
         Validated Recommendations
         with Priority Rankings
```

## Tool Call Limits

Each agent has a **maximum of 4 tool calls** to prevent:

- Excessive API costs
- Long response times
- Infinite loops
- Rate limit issues

```
┌─────────────────────────────────────┐
│         Agent Execution             │
│                                     │
│  Tool Call 1 ✓                     │
│  Tool Call 2 ✓                     │
│  Tool Call 3 ✓                     │
│  Tool Call 4 ✓                     │
│  Tool Call 5 ✗ (Blocked)           │
│                                     │
│  maxSteps: 4 enforced              │
└─────────────────────────────────────┘
```

## Streaming Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mastra Agent                          │
│                                                          │
│  agent.stream(message)                                   │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────┐                                   │
│  │  chatRoute()     │  ← Transforms to AI SDK format    │
│  └────────┬─────────┘                                   │
└───────────┼──────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│              AI SDK Stream Format                        │
│                                                          │
│  JsonToSseTransformStream()                             │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────┐                                   │
│  │  Client UI       │  ← Seamless integration           │
│  └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

## Cost Optimization

```
Query Complexity → Route → Cost

Simple
  ├─ AI SDK
  ├─ 1 QNA search
  └─ $0.001
      ↓
Light
  ├─ AI SDK
  ├─ 1 Advanced search
  └─ $0.002
      ↓
Medium
  ├─ Mastra Agent
  ├─ 2-4 searches
  └─ $0.005-0.008
      ↓
Deep
  ├─ Mastra Workflow
  ├─ 4 searches + 4 extracts
  └─ $0.015-0.020
      ↓
Workflow
  ├─ Mastra Multi-Agent
  ├─ Pure reasoning (no tools)
  └─ $0.005-0.010
```

## Performance Characteristics

| Route           | Response Time | Accuracy  | Cost | Use Case          |
| --------------- | ------------- | --------- | ---- | ----------------- |
| Simple QNA      | 1-2s          | Good      | $    | Quick facts       |
| Light Advanced  | 2-4s          | Better    | $$   | Detailed info     |
| Medium Agent    | 5-10s         | Great     | $$$  | Multi-faceted     |
| Deep Workflow   | 15-30s        | Excellent | $$$$ | Comprehensive     |
| Review Workflow | 10-20s        | Excellent | $$$  | Document analysis |

## Key Benefits

1. **Automatic Routing** - No manual selection needed
2. **Cost Efficient** - Simple queries use cheap tools
3. **High Quality** - Complex queries get deep analysis
4. **Tool Limits** - Prevents runaway costs
5. **Seamless UX** - Consistent streaming experience
6. **Explicit Steps** - Clear workflow progression
7. **Scalable** - Easy to add new agents/workflows

## System Guarantees

✅ **Max 4 tool calls per agent** - Hard limit enforced
✅ **Explicit workflow steps** - No hidden complexity
✅ **Seamless streaming** - chatRoute() transformation
✅ **Cost predictability** - Known limits per route
✅ **Fallback handling** - Graceful degradation
✅ **Consistent UI** - Same interface for all routes

---

This architecture provides the best of both worlds: the speed and simplicity of Vercel AI SDK for basic queries, and the power and sophistication of Mastra for complex research and analysis.
