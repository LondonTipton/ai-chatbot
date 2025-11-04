# Mastra Integration Implementation Plan

- [x] 1. Set up Mastra configuration

  - Create `lib/ai/mastra-config.ts` with Mastra instance
  - Configure Mastra with Cerebras provider
  - Set maxStepsPerAgent to 3
  - Enable streaming support
  - Add environment variables for Mastra configuration
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

-

- [x] 2. Create Medium Research Agent

  - Create `lib/ai/agents/medium-research.ts`
  - Define agent with legal research instructions
  - Limit agent to 3 steps maximum
  - Configure agent with tavilySearch and tavilyAdvancedSearch tools
  - Add prompt for synthesizing multiple search results
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

-

- [x] 3. Create sub-agents for workflows

  - Create `lib/ai/agents/search-agent.ts` for initial search (3 steps max)
  - Create `lib/ai/agents/extract-agent.ts` for content extraction (3 steps max)
  - Create `lib/ai/agents/analyze-agent.ts` for analysis (3 steps max)
  - Create `lib/ai/agents/structure-agent.ts` for document structure analysis (3 steps max)
  - Create `lib/ai/agents/issues-agent.ts` for identifying issues (3 steps max)
  - Create `lib/ai/agents/recommendations-agent.ts` for recommendations (3 steps max)
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

-

- [x] 4. Create Deep Research Workflow

  - Create `lib/ai/workflows/deep-research.ts`
  - Define workflow with 3 steps: Search → Extract → Analyze
  - Configure each step with appropriate sub-agent
  - Set up data passing between steps
  - Add error handling for step failures
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

-

- [x] 5. Create Document Review Workflow

  - Create `lib/ai/workflows/document-review.ts`
  - Define workflow with 3 steps: Analyze Structure → Identify Issues → Recommend
  - Configure each step with appropriate sub-agent
  - Set up data passing between steps
  - Add error handling for step failures
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

-

- [x] 6. Create Case Law Analysis Workflow

  - Create `lib/ai/workflows/case-law-analysis.ts`
  - Define workflow with 3 steps: Search Cases → Extract Holdings → Compare
  - Configure each step with appropriate sub-agent (case-search, holdings, compare)
  - Set up data passing between steps
  - Add error handling for step failures
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Create Legal Drafting Workflow

  - Create `lib/ai/workflows/legal-drafting.ts`
  - Define workflow with 3 steps: Research → Draft → Refine
  - Configure each step with appropriate sub-agent (research, draft, refine)
  - Set up data passing between steps
  - Add error handling for step failures
  - Ensure final step creates document artifact
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Create Mastra router

  - Create `lib/ai/mastra-router.ts`
  - Implement `routeToMastra()` function
  - Route medium queries to Medium Research Agent
  - Route deep queries to Deep Research Workflow
  - Route workflow-review queries to Document Review Workflow
  - Route workflow-caselaw queries to Case Law Analysis Workflow
  - Route workflow-drafting queries to Legal Drafting Workflow
  - Add logging for routing decisions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

-

- [x] 9. Create stream converter

  - Create `lib/ai/mastra-stream-converter.ts`
  - Implement `convertMastraStreamToUI()` function
  - Convert Mastra stream format to UI stream format
  - Handle progress indicators from sub-agents
  - Ensure compatibility with existing UI components
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

-

- [x] 10. Integrate Mastra into chat route

  - Update `app/(chat)/api/chat/route.ts`
  - Add Mastra routing logic after complexity detection
  - Use `shouldUseMastra()` to determine routing
  - Call `routeToMastra()` for medium/deep/workflow queries
  - Keep AI SDK flow for simple/light queries
  - Add logging for routing decisions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 11. Implement error handling and fallback

  - Add try-catch around Mastra workflow execution
  - Implement fallback to AI SDK on Mastra failure
  - Log fallback decisions
  - Handle sub-agent failures gracefully
  - Continue workflows with partial results when possible
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 12. Add response validation

- [ ] 12. Add response validation

  - Validate Mastra responses have minimum 10 characters
  - Log validation failures
  - Trigger fallback to AI SDK on validation failure
  - Commit transaction only on successful validation
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

-
-

- [x] 13. Implement tool integration

  - Configure all tools for all Mastra agents (tavilySearch, tavilyAdvancedSearch, tavilyQna, tavilyExtract, createDocument, updateDocument, requestSuggestions, summarizeContent, getWeather)
  - Ensure tools work with Mastra's streaming format
  - Test each tool with at least one agent
  - Verify tool outputs are properly passed between workflow steps

  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

-

- [x] 14. Add performance monitoring

  - Log workflow execution time

  - Log number of sub-agents used

  - Track success rate per workflow type
  - Log warnings when performance degrades
  - Create metrics interface for Mastra workflows
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

-

- [x] 15. Add environment variables and feature flag

  - Add `ENABLE_MASTRA` to `.env.example`

  - Add `MASTRA_MAX_STEPS_PER_AGENT` to `.env.example`
  - Add `MASTRA_ENABLE_STREAMING` to `.env.example`

  - Add `MASTRA_FALLBACK_TO_AI_SDK` to `.env.example`

  - Set default values for all Mastra env vars
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 16. Update complexity detector

  - Update complexity types to include workflow-review, workflow-caselaw, workflow-drafting
  - Add detection patterns for drafting, case law, and review queries
  - Update `shouldUseMastra()` to include new workflow types
  - Update `getWorkflowType()` to return correct workflow names

  - Add logging for complexity detection decisions

  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 17. Create unit tests

  - Test Medium Research Agent in isolation
  - Test each sub-agent in isolation
  - Test Deep Research Workflow orchestration
  - Test Document Review Workflow orchestration
  - Test Case Law Analysi

s Workflow orchestration

- Test Legal Drafting W
  orkflow orchestration
- Test Mastra router logic
- Test stream converter
- _Requirements: All_
-

- [x] 18. Create integration tests

  - Test end-to-end flow for medium complexity queries
  - Test end-to-end flow for deep complexity queries

  - Test end-to-end flow for document review workflow
  - Test end-to-end flow for case law analysis workflow
  - Test end-to-end flow for
    legal drafting workflow
  - Test fallback to AI SDK on Mastra failure
  - Test error handling in workflows
  - Test streaming responses
  - _Requirements: All_

-

- [x] 19. Test with real queries

  - Test with simple legal questions (should use AI SDK)
  - Test with medium research queries (should use Medium Agent)
  - Test with deep research queries (should use Deep Workflow)
  - Test with document review queries (should use Review Workflow)
  - Test with case law comparison queries (should use Case Law Workflow)
  - Test with drafting queries (should use Drafting Workflow)
  - Verify responses are complete and accurate
  - Verify no empty responses
  - _Requirements: All_

-

- [x] 20. Create documentation

  - Document Mastra configuration
  - Document all agents and workflows (Medium Agent, Deep Workflow, Review Workflow, Case Law Workflow, Drafting Workflow)
  - Document routing logic and complexity detection
  - Document all available tools and their usage
  - Document error handling and fallback strategy
  - Document monitoring and metrics
  - Create troubleshooting guide
  - _Requirements: All_
