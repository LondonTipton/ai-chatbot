# Implementation Plan

- [x] 1. Create Advanced Search Workflow tool wrapper

  - Create new file `mastra/tools/advanced-search-workflow-tool.ts`
  - Import `advancedSearchWorkflow` from `mastra/workflows/advanced-search-workflow.ts`
  - Define input schema with query and jurisdiction fields using Zod
  - Define output schema with response, sources, and totalTokens fields
  - Implement execute function that calls `workflow.createRunAsync()` and `run.start()`
  - Extract output from synthesize step (last step in workflow)
  - Handle workflow failure status with error message
  - Add comprehensive logging for debugging
  - Follow the pattern from `mastra/agents/medium-agent.ts` (already proven)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

-

- [x] 2. Update Chat Agent to include Workflow tool

  - [x] 2.1 Import Advanced Search Workflow tool in chat-agent.ts

    - Add import statement for advancedSearchWorkflowTool from tools directory
    - _Requirements: 3.1_

  - [x] 2.2 Register tool in Chat Agent configuration

    - Add advancedSearchWorkflow to tools object in Agent constructor
    - Ensure tool is available alongside createDocument and updateDocument
    - _Requirements: 3.1_

  - [x] 2.3 Update Chat Agent instructions

    - Add guidance on when to invoke advancedSearchWorkflow tool
    - Specify criteria for workflow vs direct response
    - Include examples of research-appropriate queries
    - Maintain existing document creation instructions
    - Emphasize that workflow tool uses only 1 step
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 3. Update Mastra SDK Integration routing

  - [x] 3.1 Modify selectAgentForComplexity function

    - Update "medium" complexity case to return "chatAgent"
    - Keep "simple" and "light" routing to chatAgent
    - Preserve "deep" and workflow routing to searchAgent
    - _Requirements: 1.1, 3.3, 3.4_

  - [x] 3.2 Update chatAgent factory in streamMastraAgent

    - Import advancedSearchWorkflowTool in the factory switch case
    - Add advancedSearchWorkflow to tools configuration when creating chatAgent with context
    - Ensure userId is properly passed through agentContext for document tools
    - _Requirements: 2.3, 3.1_

-

- [x] 4. Update Chat Route complexity handling

  - [x] 4.1 Simplify medium complexity routing

    - Remove separate AI SDK handling for medium complexity
    - Route medium queries through Mastra with chatAgent
    - Update shouldUseMastra logic to include medium complexity
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2_

  - [x] 4.2 Update logging for workflow tool invocations

    - Add log statements when routing to chatAgent with workflow capability
    - Log complexity analysis results
    - Track workflow tool usage in metrics
    - _Requirements: 1.1, 4.3_

-

- [x] 5. Test end-to-end workflow integration

  - [x] 5.1 Create test file for workflow tool integration

    - Create `tests/e2e/workflow-tool-integration.spec.ts`
    - Set up test fixtures and helpers
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]\* 5.2 Write test for simple query (no workflow)

    - Test that simple questions don't invoke workflow tool
    - Verify direct chat response
    - _Requirements: 3.3_

  - [ ]\* 5.3 Write test for research query

    - Test that research questions invoke advancedSearchWorkflow tool
    - Verify tool invocation indicator appears in UI
    - Validate research results with sources appear in chat
    - Verify only 1 tool call is made (not nested)
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]\* 5.4 Write test for document creation during research

    - Test research query with document creation request
    - Verify workflow tool is called first for research
    - Verify createDocument tool is called separately
    - Validate document artifact is created and displayed
    - _Requirements: 1.4, 1.5_

  - [ ]\* 5.5 Write test for error handling
    - Mock workflow failure
    - Verify graceful error message
    - Ensure chat continues to function
    - _Requirements: 2.5_

-

- [x] 6. Manual testing and validation

  - Test simple question: "What is a contract?" - should not invoke workflow
  - Test research question: "Find cases about property rights in Zimbabwe" - should invoke workflow tool
  - Test document creation: "Research employment law and create a document" - should use workflow then createDocument
  - Verify tool invocation indicators appear in UI ("Using tool: advanced-search-workflow")
  - Validate source citations are properly formatted
  - Check error handling with invalid queries
  - Monitor logs for proper execution flow
  - Verify only 1 tool call for research (not nested agent calls)
  - Confirm token usage stays within 4K-8K range
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.5, 3.3, 3.4, 4.4_
