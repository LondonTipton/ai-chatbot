# Implementation Plan

This document outlines the implementation tasks for the Hybrid Agent + Workflow Architecture. Each task builds incrementally on previous tasks, with no orphaned code.

---

## Phase 1: Foundation & Utilities

- [x] 1. Set up utility functions and helpers

  - Create `lib/utils/token-estimation.ts` with `estimateTokens()` and `estimateSearchResultTokens()` functions
  - Create `lib/utils/zimbabwe-domains.ts` with `getZimbabweLegalDomains()` function returning curated domain list
  - Create `lib/utils/research-helpers.ts` with `identifyResearchGaps()` function for gap analysis
  - Add unit tests for token estimation accuracy (±10% tolerance)
  - _Requirements: 3.4, 3.5, 10.4_

-

- [x] 2. Implement rate limiting infrastructure

  - Create `lib/rate-limiter.ts` with Upstash Ratelimit configuration for Cerebras (tokens/min, tokens/day, requests/min) and Tavily (requests/min)
  - Implement `checkRateLimits()` function that checks all limits before execution
  - Set 80% thresholds for all rate limits (48K tokens/min, 800K tokens/day, 24 requests/min for Cerebras; 80 requests/min for Tavily)
  - Add error handling for rate limit exceeded scenarios
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

-

- [x] 3. Implement daily token tracking

  - Create `lib/token-tracker.ts` with Redis-based daily token tracking
  - Implement `getDailyTokenUsage()`, `incrementDailyTokenUsage()`, and `checkDailyLimit()` functions
  - Add automatic daily reset with 2-day TTL
  - Add logging for token usage milestones (80%, 95%)
  - _Requirements: 3.4, 4.1_

-

- [x] 4. Implement caching layer

  - Create `lib/cache.ts` with Redis-based query caching
  - Implement `generateCacheKey()` using MD5 hash of query + mode + jurisdiction
  - Implement `QueryCache` class with `get()`, `set()`, and `invalidate()` methods
  - Set TTL to 1 hour for general queries, 15 minutes for news queries
  - Add cache hit/miss logging
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

---

## Phase 2: Tavily Tools

- [x] 5. Create QnA Direct tool

  - Create `mastra/tools/tavily-qna-direct.ts` using Tavily's `qna_search()` function
  - Return only answer string with token estimate (200-500 tokens)
  - Add input validation for query parameter
  - Add error handling for API failures with retry logic
  - Add unit tests for token estimation and error handling
  - _Requirements: 7.1_

-

- [x] 6. Create Context Search tool

  - Create `mastra/tools/tavily-context-search.ts` using Tavily's `get_search_context()` function
  - Implement configurable `maxTokens` parameter (2K-15K range)
  - Add support for jurisdiction, timeRange, and includeDomains parameters
  - Return context string with token count and truncation indicator
  - Add unit tests for token limit enforcement
  - _Requirements: 7.2_

-

- [x] 7. Create News Search tool

  - Create `mastra/tools/tavily-news-search.ts` using Tavily search with `topic: 'news'`
  - Implement `days` parameter for time filtering (1-30 days)
  - Return results with publishedDate, title, url, content, and score
  - Add token estimation to response (2K-5K tokens)
  - Add unit tests for date filtering
  - _Requirements: 7.3_

- [x] 8. Optimize existing Basic Search tool

  - Update `mastra/tools/tavily-search.ts` to reduce default `maxResults` from 5 to 3
  - Add `tokenEstimate` field to response using `estimateSearchResultTokens()`
  - Add optional Zimbabwe domain filtering
  - Update tests to verify token estimates and result limits
  - _Requirements: 7.5_

-

- [x] 9. Optimize existing Advanced Search tool

  - Update `mastra/tools/tavily-search-advanced.ts` to reduce default `maxResults` from 10 to 7
  - Add `includeDomains`, `country`, and `timeRange` parameters
  - Set Zimbabwe domains as default when jurisdiction is Zimbabwe
  - Add token estimation to response
  - Update tests for new parameters and token estimates
  - _Requirements: 7.5, 10.2_

-

- [x] 10. Optimize existing Extract tool

  - Update `mastra/tools/tavily-extract.ts` to enforce max 3 URLs
  - Add token estimation per URL and total token tracking
  - Add `totalTokens` field to response
  - Update tests to verify URL limit enforcement
  - _Requirements: 7.5_

---

## Phase 3: Workflows

- [x] 11. Implement Basic Search workflow

  - Create `mastra/workflows/basic-search-workflow.ts` with search → synthesize steps
  - Configure search step to use `tavilySearchBasic` with maxResults=3
  - Configure synthesize step to use `synthesizerAgent` with maxTokens=1500
  - Add error handling for search failures (skip to synthesis with partial results)
  - Verify token budget stays within 1K-2.5K range
  - Add integration tests for complete workflow execution
  - _Requirements: 6.1_

-

- [x] 12. Implement Advanced Search workflow

  - Create `mastra/workflows/advanced-search-workflow.ts` with advanced-search → extract-top-sources → synthesize steps
  - Configure advanced-search step with Zimbabwe domains, timeRange='year', country='ZW'
  - Configure extract step to extract top 2 URLs (skip if no URLs available)
  - Configure synthesize step with maxTokens=1500
  - Add error handling for extraction failures (continue with search results only)
  - Verify token budget stays within 4K-8K range
  - Add integration tests for all steps including optional extraction
  - _Requirements: 6.2_

-

- [x] 13. Implement Comprehensive Analysis workflow

  - Create `mastra/workflows/comprehensive-analysis-workflow.ts` with initial-research → analyze-gaps → [enhance OR deep-dive] → document steps
  - Configure initial-research step using `tavilyContextSearch` with maxTokens=5000
  - Implement analyze-gaps step using `identifyResearchGaps()` function
  - Add conditional branching: if gaps.length > 2, go to deep-dive; else go to enhance
  - Configure deep-dive with 2 parallel `tavilyContextSearch` calls at 5K tokens each
  - Configure synthesis with maxTokens=3000-5000
  - Add document creation step for final output
  - Verify token budget stays within 18K-20K range
  - Add integration tests for both paths (enhance and deep-dive)
  - _Requirements: 6.3_

---

## Phase 4: Agents

- [x] 14. Implement Synthesizer Agent

  - Create `mastra/agents/synthesizer-agent.ts` with no tools (formatting only)
  - Configure with temperature=0.6, maxTokens=6000
  - Add instructions for formatting, maintaining citations, and using markdown
  - Add unit tests for response formatting and citation preservation
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 15. Implement Analysis Agent

  - Create `mastra/agents/analysis-agent.ts` with summarize tool
  - Configure with temperature=0.5, maxTokens=10000
  - Add instructions for comprehensive analysis and Zimbabwe legal context
  - Add unit tests for analysis quality and citation handling
  - _Requirements: 6.3_

- [x] 16. Implement AUTO Agent

  - Create `mastra/agents/auto-agent.ts` with qnaDirect tool and basicSearch workflow
  - Configure with maxSteps=3, temperature=0.7
  - Add instructions emphasizing direct answers for simple questions
  - Add decision guide for when to use tools vs direct answers
  - Add unit tests for routing decisions (direct answer, qna, workflow)
  - Verify maxSteps budget enforcement
  - _Requirements: 1.1, 2.1, 2.2, 2.4_

- [x] 17. Implement MEDIUM Agent

  - Create `mastra/agents/medium-agent.ts` with qnaDirect, advancedSearch workflow, and newsSearch tools
  - Configure with maxSteps=6, temperature=0.7
  - Add instructions for balanced research and comparative analysis
  - Add decision guide for tool selection based on query type
  - Add unit tests for routing decisions and multi-workflow invocation
  - Verify maxSteps budget enforcement
  - _Requirements: 1.2, 2.1, 2.2, 2.4_

-

- [x] 18. Implement DEEP Agent

  - Create `mastra/agents/deep-agent.ts` with comprehensiveAnalysis workflow
  - Configure with maxSteps=3, temperature=0.5
  - Add instructions for comprehensive analysis and direct answers for well-established topics
  - Add decision guide for when to use workflow vs direct answer
  - Add unit tests for routing decisions and workflow invocation
  - Verify maxSteps budget enforcement
  - _Requirements: 1.3, 2.1, 2.2, 2.4_

---

## Phase 5: API & Queue

- [x] 19. Implement unified research API endpoint

  - Create `app/(chat)/api/research/route.ts` with POST handler
  - Add input validation for query and mode parameters
  - Implement rate limit checking before execution using `checkRateLimits()`
  - Implement cache lookup before agent invocation using `queryCache.get()`
  - Route to appropriate agent based on mode (auto/medium/deep)
  - Cache successful responses using `queryCache.set()`
  - Track token usage using `dailyTokenTracker.increment()`
  - Add error handling for rate limits, API errors, and validation errors
  - Return metadata including mode, stepsUsed, toolsCalled, and cached status
  - Add integration tests for all three modes
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 5.2, 5.3_

-

- [x] 20. Implement request queue system

  - Create `lib/query-queue.ts` with BullMQ configuration
  - Implement `queueQuery()` function with priority handling (AUTO=1, MEDIUM=2, DEEP=3)
  - Configure worker with concurrency=5 and retry logic (3 attempts, exponential backoff)
  - Integrate rate limit checking in worker before execution
  - Integrate cache checking in worker before execution
  - Add job status tracking and error handling
  - Add unit tests for queue operations and priority handling
  - _Requirements: 8.1, 8.2, 8.3_

---

## Phase 6: UI

-

- [x] 21. Implement research interface component

  - Create `components/research-interface.tsx` with three-mode selection buttons
  - Add mode descriptions (AUTO: Fast • 1-10s, MEDIUM: Balanced • 10-20s, DEEP: Comprehensive • 25-47s)
  - Add query textarea input
  - Add submit button with loading state
  - Add results display area with error handling
  - Integrate with `/api/research` endpoint
  - Add loading indicators and disabled states
  - Add unit tests for mode selection and form submission
  - _Requirements: 1.5_

- [x] 22. Integrate research interface into chat UI

  - Add research interface to existing chat page
  - Wire up mode selection to chat context
  - Display research results in chat message format
  - Add error messages for rate limits and failures
  - Test end-to-end flow from UI to API to agents
  - _Requirements: 1.1, 1.2, 1.3, 11.1, 11.2, 11.3, 11.4, 11.5_

---

## Phase 7: Testing & Validation

- [x] 23. Create end-to-end tests for all modes

  - Create `tests/e2e/research-modes.test.ts` with tests for AUTO, MEDIUM, and DEEP modes
  - Test simple query in AUTO mode (verify direct answer or qna tool usage)
  - Test comparative query in MEDIUM mode (verify multiple workflow invocations)
  - Test comprehensive query in DEEP mode (verify workflow execution and document creation)
  - Verify token budgets respected for all modes
  - Verify latency targets met for all modes
  - Test model selector integration (switching between research-auto, research-medium, research-deep)
  - Test chat UI integration with research modes
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3_

- [x] 24. Create performance and load tests

  - Create `tests/performance/load-test.ts` for production capacity validation
  - Load test with 350 queries over simulated 24-hour period
  - Verify no rate limit violations during sustained load
  - Verify cache hit rate ≥20% with realistic query patterns
  - Verify query success rate ≥95%
  - Verify zero crashes from tool overuse or rate limit violations
  - Test queue behavior under burst load (50+ concurrent queries)
  - Measure and verify latency targets for each mode under load
  - _Requirements: 4.1, 4.2, 4.3, 5.4, 8.1, 8.2, 12.1, 12.2, 12.3, 12.4, 12.5_

---

## Summary

### Completed Implementation (Phases 1-6)

All core functionality has been successfully implemented:

- ✅ **Phase 1**: Utility functions (token estimation, Zimbabwe domains, research helpers)
- ✅ **Phase 2**: Rate limiting infrastructure with Upstash
- ✅ **Phase 3**: Daily token tracking with Redis
- ✅ **Phase 4**: Caching layer with Redis
- ✅ **Phase 5**: All Tavily tools (qnaDirect, contextSearch, newsSearch, optimized basic/advanced/extract)
- ✅ **Phase 6**: All workflows (basicSearch, advancedSearch, comprehensiveAnalysis)
- ✅ **Phase 7**: All agents (AUTO, MEDIUM, DEEP, Synthesizer, Analysis)
- ✅ **Phase 8**: Unified research API endpoint with rate limiting and caching
- ✅ **Phase 9**: Request queue system with BullMQ
- ✅ **Phase 10**: Research interface component
- ✅ **Phase 11**: Chat UI integration with model selector (research-auto, research-medium, research-deep)

### Testing Status

- ✅ **Unit Tests**: Comprehensive coverage for all utilities, tools, workflows, and agents
- ✅ **Integration Tests**: All workflows and research API tested
- ⏳ **E2E Tests**: Need tests for complete user flows with all three research modes
- ⏳ **Performance Tests**: Need load testing to validate production capacity targets

### Remaining Work (Phase 7)

Only **2 testing tasks** remain to complete the specification:

1. **Task 23**: E2E tests for all three research modes through the UI
2. **Task 24**: Performance/load tests to validate production capacity (350-400 queries/day)

All implementation is complete and functional. The remaining tasks focus on validation and ensuring the system meets performance targets under production load.

---

## Implementation Notes

- Each task should be completed and tested before moving to the next
- Token budgets should be monitored during development
- All error scenarios should be tested
- Zimbabwe legal context should be verified in all outputs
- Rate limits should be respected at all times
- Cache should be tested for both hits and misses
