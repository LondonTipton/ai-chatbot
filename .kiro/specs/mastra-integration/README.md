# Mastra Integration Spec

## Overview

This spec implements Mastra multi-agent workflows to handle complex queries by breaking them into smaller sub-agents (max 3 steps each). This solves the provider limitation where long-running queries fail, ensuring reliable responses for complex legal research and document tasks.

## Key Features

### Intelligent Routing

- **Simple/Light queries** → AI SDK (fast, direct)
- **Medium queries** → Mastra Medium Research Agent (single agent, 3 steps)
- **Deep queries** → Mastra Deep Research Workflow (3 sub-agents, 3 steps each)
- **Document Review** → Mastra Document Review Workflow (3 sub-agents, 3 steps each)
- **Case Law Analysis** → Mastra Case Law Analysis Workflow (3 sub-agents, 3 steps each)
- **Legal Drafting** → Mastra Legal Drafting Workflow (3 sub-agents, 3 steps each)

### All Tools Available

Every Mastra agent has access to all tools:

- `tavilySearch` - General web search
- `tavilyAdvancedSearch` - Advanced search with depth control
- `tavilyQna` - Quick Q&A search
- `tavilyExtract` - Extract content from URLs
- `createDocument` - Create document artifacts
- `updateDocument` - Update existing documents
- `requestSuggestions` - Request follow-up suggestions
- `summarizeContent` - Summarize long content
- `getWeather` - Weather information (demo)

### Workflows

#### 1. Medium Research Agent

Single agent, 3 steps max

- Performs multiple searches
- Synthesizes results
- Returns comprehensive answer

#### 2. Deep Research Workflow

3 sub-agents, 9 steps total

1. **Search Agent** (3 steps) - Find relevant information
2. **Extract Agent** (3 steps) - Extract detailed content
3. **Analyze Agent** (3 steps) - Analyze and synthesize

#### 3. Document Review Workflow

3 sub-agents, 9 steps total

1. **Structure Agent** (3 steps) - Analyze document structure
2. **Issues Agent** (3 steps) - Identify issues and gaps
3. **Recommendations Agent** (3 steps) - Provide recommendations

#### 4. Case Law Analysis Workflow

3 sub-agents, 9 steps total

1. **Case Search Agent** (3 steps) - Search for relevant cases
2. **Holdings Agent** (3 steps) - Extract key holdings
3. **Compare Agent** (3 steps) - Compare and analyze precedents

#### 5. Legal Drafting Workflow

3 sub-agents, 9 steps total

1. **Research Agent** (3 steps) - Research provisions and precedents
2. **Draft Agent** (3 steps) - Draft document structure
3. **Refine Agent** (3 steps) - Refine and finalize document

## Benefits

1. **Solves Provider Limitation** - Each sub-agent limited to 3 steps guarantees completion
2. **Handles Complexity** - Multi-agent workflows for complex queries
3. **Maintains Speed** - Simple queries still use fast AI SDK
4. **Automatic Fallback** - Falls back to AI SDK if Mastra fails
5. **Progress Visibility** - Users see workflow progress
6. **Tool Flexibility** - All agents have access to all tools

## Implementation

### Files Structure

```
lib/ai/
├── mastra-config.ts              # Mastra configuration
├── mastra-router.ts              # Routing logic
├── mastra-stream-converter.ts   # Stream format conversion
├── agents/
│   ├── medium-research.ts        # Medium research agent
│   ├── search-agent.ts           # Search sub-agent
│   ├── extract-agent.ts          # Extract sub-agent
│   ├── analyze-agent.ts          # Analyze sub-agent
│   ├── structure-agent.ts        # Structure sub-agent
│   ├── issues-agent.ts           # Issues sub-agent
│   ├── recommendations-agent.ts  # Recommendations sub-agent
│   ├── case-search-agent.ts      # Case search sub-agent
│   ├── holdings-agent.ts         # Holdings sub-agent
│   ├── compare-agent.ts          # Compare sub-agent
│   ├── research-agent.ts         # Research sub-agent
│   ├── draft-agent.ts            # Draft sub-agent
│   └── refine-agent.ts           # Refine sub-agent
└── workflows/
    ├── deep-research.ts          # Deep research workflow
    ├── document-review.ts        # Document review workflow
    ├── case-law-analysis.ts      # Case law analysis workflow
    └── legal-drafting.ts         # Legal drafting workflow
```

### Environment Variables

```env
# Enable Mastra routing
ENABLE_MASTRA=true

# Mastra Configuration
MASTRA_MAX_STEPS_PER_AGENT=3
MASTRA_ENABLE_STREAMING=true
MASTRA_FALLBACK_TO_AI_SDK=true
```

## Tasks

20 tasks covering:

1. Configuration and setup
2. Agent creation (13 agents total)
3. Workflow creation (4 workflows)
4. Routing and integration
5. Error handling and fallback
6. Tool integration (all 9 tools)
7. Testing and documentation

## Success Criteria

- Medium/Deep/Workflow queries complete reliably (>95% success rate)
- Each sub-agent completes within 3 steps
- Response quality matches or exceeds AI SDK
- Fallback to AI SDK works seamlessly
- Performance acceptable (<10s for deep workflows)
- No empty responses

## Next Steps

1. Review requirements.md, design.md, and tasks.md
2. Approve the spec
3. Begin implementation starting with task 1

## Documentation

### Core Documentation

- **[Full Documentation](./MASTRA_DOCUMENTATION.md)** - Complete guide covering all aspects of Mastra integration
- **[Quick Reference](./QUICK_REFERENCE.md)** - Quick lookup guide for common tasks and commands
- **[API Reference](./API_REFERENCE.md)** - Detailed API documentation for all functions and types
- **[Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)** - Solutions to common issues and debugging techniques

### Specification Documents

- `requirements.md` - Detailed requirements with acceptance criteria
- `design.md` - Technical design and architecture
- `tasks.md` - Implementation task list (20 tasks)

### Implementation Guides

- [Quick Test Guide](./QUICK_TEST_GUIDE.md) - How to test the implementation
- [Real Query Testing](./REAL_QUERY_TESTING.md) - Results from real query tests
- [Integration Tests Summary](./INTEGRATION_TESTS_SUMMARY.md) - Integration test results
- [Performance Monitoring](./PERFORMANCE_MONITORING.md) - Metrics and monitoring guide
- [Tool Integration Summary](./TOOL_INTEGRATION_SUMMARY.md) - Tool configuration details
- [Error Handling Implementation](./ERROR_HANDLING_IMPLEMENTATION.md) - Error handling details
- [Validation Implementation](./VALIDATION_IMPLEMENTATION.md) - Response validation details

## Quick Start

### Enable Mastra

```env
ENABLE_MASTRA=true
MASTRA_MAX_STEPS_PER_AGENT=3
MASTRA_ENABLE_STREAMING=true
MASTRA_FALLBACK_TO_AI_SDK=true
```

### Test Implementation

```bash
# Test with real queries
pnpm tsx scripts/test-real-queries.ts

# Verify tools
pnpm tsx scripts/verify-agent-tools.ts

# Run tests
pnpm test tests/unit/mastra-*.test.ts
```

### View Metrics

```bash
curl http://localhost:3000/api/admin/mastra-metrics
```

## Documentation Guide

### For Getting Started

1. Start with [Quick Reference](./QUICK_REFERENCE.md) for overview
2. Read [Full Documentation](./MASTRA_DOCUMENTATION.md) for comprehensive details
3. Use [Quick Test Guide](./QUICK_TEST_GUIDE.md) to verify your setup

### For Development

1. Reference [API Reference](./API_REFERENCE.md) for function signatures and types
2. Check [Design](./design.md) for architecture details
3. Follow [Tasks](./tasks.md) for implementation checklist

### For Troubleshooting

1. Consult [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) first
2. Review [Error Handling Implementation](./ERROR_HANDLING_IMPLEMENTATION.md)
3. Check [Performance Monitoring](./PERFORMANCE_MONITORING.md) for metrics
