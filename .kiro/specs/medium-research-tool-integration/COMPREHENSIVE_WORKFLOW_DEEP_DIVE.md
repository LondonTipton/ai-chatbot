# Comprehensive Analysis Workflow: Deep Dive

## Overview

The Comprehensive Analysis Workflow is the **publication-quality research mode** - exhaustive, intelligent, and adaptive. It's designed for queries that require deep investigation with multiple perspectives and complete coverage.

---

## Architecture

```
User Query
    ↓
Step 1: Initial Research (5K tokens, 8-12s)
    ↓
Step 2: Analyze Gaps (minimal, <1s)
    ↓
Step 3: Conditional Branching
    ├─→ Enhance Path (gaps ≤ 2): +5K tokens, 8-12s
    └─→ Deep Dive Path (gaps > 2): +10K tokens, 15-20s
    ↓
Step 4: Document Synthesis (3-5K tokens, 2-5s)
    ↓
Final Response (18-20K tokens total, 25-47s)
```

---

## Step 1: Initial Research (Deep Dive)

### What It Does

Performs **comprehensive context search** using Tavily's RAG mode with a 5K token budget.

### The Context Search Tool

Unlike standard search (returns snippets) or extract (returns full pages), **context search** is Tavily's RAG mode:

```typescript
{
  search_depth: "advanced",
  include_answer: false,          // We want raw context, not AI answer
  include_raw_content: true,      // Get full document content
  max_tokens: 5000,               // Strict token budget
  time_range: "year",             // Recent content
  include_domains: [...]          // Zimbabwe legal domains (optional)
}
```

### How Context Search
