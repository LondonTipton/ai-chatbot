# Manual Testing Guide - Medium Research Tool Integration

## Overview

This guide provides step-by-step instructions for manually testing the Advanced Search Workflow tool integration with the Chat Agent. Follow each test scenario to verify the implementation meets all requirements.

## Prerequisites

Before testing, ensure:

- ✅ Development server is running (`pnpm dev`)
- ✅ All environment variables are configured (`.env.local`)
- ✅ Tavily API key is valid and has credits
- ✅ Database is migrated and accessible
- ✅ You're logged in as a test user

## Test Scenarios

### Test 1: Simple Question (No Workflow)

**Objective:** Verify that simple questions get direct answers without invoking the workflow tool.

**Test Query:** "What is a contract?"

**Expected Behavior:**

- ✅ Chat Agent responds directly without tool invocation
- ✅ No "Using tool: advanced-search-workflow" indicator appears
- ✅ Response is quick (< 3 seconds)
- ✅ Answer is clear and concise
- ✅ No source citations appear

**Steps:**

1. Open the chat interface
2. Type: "What is a contract?"
3. Send the message
4. Observe the response

**Success Criteria:**

- Direct answer provided
- No workflow tool invoked
- Response time < 3 seconds

**Logs to Monitor:**

```
[Complexity Detector] Detected complexity: simple
[Chat Route] Using simple chat mode
[Chat Agent] Responding directly without tools
```

---

### Test 2: Research Question (Workflow Invocation)

**Objective:** Verify that research questions invoke the Advanced Search Workflow tool.

**Test Query:** "Find cases about property rights in Zimbabwe"

**Expected Behavior:**

- ✅ Chat Agent invokes the workflow tool
- ✅ "Using tool: advanced-search-workflow" indicator appears in UI
- ✅ Workflow executes all steps (search → extract → synthesize)
- ✅ Response includes synthesized answer with multiple sources
- ✅ Source citations are properly formatted with titles and URLs
- ✅ Only 1 tool call is made (not nested)
- ✅ Total execution time: 5-10 seconds
- ✅ Token usage: 4K-8K tokens

**Steps:**

1. Open the chat interface
2. Type: "Find cases about property rights in Zimbabwe"
3. Send the message
4. Observe the tool invocation indicator
5. Wait for the complete response
6. Verify source citations

**Success Criteria:**

- Workflow tool invoked exactly once
- Tool invocation indicator visible
- Response includes 3-5 source citations
- Sources have proper titles and URLs
- Token usage within 4K-8K range

**Logs to Monitor:**

```
[Complexity Detector] Detected complexity: medium
[Chat Route] Routing to Mastra with chatAgent
[Chat Agent] Invoking advancedSearchWorkflow tool
[Workflow Tool] Creating workflow run
[Workflow] Step 1: advanced-search starting
[Workflow] Step 1: advanced-search complete (2.3s, 3.2K tokens)
[Workflow] Step 2: extract-top-sources starting
[Workflow] Step 2: extract-top-sources complete (1.8s, 2.1K tokens)
[Workflow] Step 3: synthesize starting
[Workflow] Step 3: synthesize complete (2.1s, 1.4K tokens)
[Workflow Tool] Workflow complete: 6.2s, 6.7K tokens, 5 sources
[Chat Agent] Streaming workflow results to user
```

---

### Test 3: Document Creation with Research

**Objective:** Verify that document creation requests work alongside research.

**Test Query:** "Research employment law in Zimbabwe and create a document"

**Expected Behavior:**

- ✅ Chat Agent invokes workflow tool first for research
- ✅ Chat Agent invokes createDocument tool separately
- ✅ Two distinct tool invocations appear in UI
- ✅ Document artifact is created and displayed
- ✅ Document contains research findings
- ✅ Document is saved to database with proper user association

**Steps:**

1. Open the chat interface
2. Type: "Research employment law in Zimbabwe and create a document"
3. Send the message
4. Observe both tool invocations
5. Verify document artifact appears
6. Check document content includes research findings
7. Verify document is saved (refresh page and check it persists)

**Success Criteria:**

- Two separate tool calls: advancedSearchWorkflow + createDocument
- Document artifact displayed in chat
- Document contains research content
- Document persists after page refresh

**Logs to Monitor:**

```
[Chat Agent] Invoking advancedSearchWorkflow tool
[Workflow Tool] Workflow complete: 6.2s, 6.7K tokens, 5 sources
[Chat Agent] Invoking createDocument tool
[Document] Created document with ID: xxx
[Chat Agent] Streaming document artifact to user
```

---

### Test 4: Error Handling - Invalid Query

**Objective:** Verify graceful error handling when workflow fails.

**Test Query:** "Find cases about [gibberish random text that makes no sense]"

**Expected Behavior:**

- ✅ Workflow tool is invoked
- ✅ Workflow handles error gracefully
- ✅ User receives informative error message
- ✅ Chat continues to function normally
- ✅ No application crash or unhandled exceptions

**Steps:**

1. Open the chat interface
2. Type: "Find cases about asdfghjkl qwertyuiop zxcvbnm"
3. Send the message
4. Observe error handling
5. Try another query to verify chat still works

**Success Criteria:**

- Error message is user-friendly
- No stack traces visible to user
- Chat remains functional
- Logs show error details for debugging

**Logs to Monitor:**

```
[Workflow Tool] Error during workflow execution
[Workflow Tool] Returning graceful error response
[Chat Agent] Received error from workflow tool
[Chat Agent] Providing fallback response
```

---

### Test 5: Error Handling - API Failure

**Objective:** Verify error handling when Tavily API is unavailable.

**Setup:** Temporarily set invalid Tavily API key in `.env.local`

**Test Query:** "Find cases about contract law in Zimbabwe"

**Expected Behavior:**

- ✅ Workflow tool is invoked
- ✅ API error is caught and handled
- ✅ User receives informative error message
- ✅ No sensitive error details exposed
- ✅ Chat continues to function

**Steps:**

1. Edit `.env.local` and set `TAVILY_API_KEY=invalid_key`
2. Restart dev server
3. Open chat interface
4. Type: "Find cases about contract law in Zimbabwe"
5. Send message
6. Observe error handling
7. Restore valid API key and restart server

**Success Criteria:**

- Error handled gracefully
- User-friendly error message
- No API key or sensitive data in error
- Chat remains functional

---

### Test 6: Tool Invocation Indicators

**Objective:** Verify that tool invocation indicators appear correctly in the UI.

**Test Query:** "Research property law in Zimbabwe"

**Expected Behavior:**

- ✅ Tool invocation indicator appears immediately
- ✅ Indicator shows correct tool name: "advanced-search-workflow"
- ✅ Indicator remains visible during execution
- ✅ Indicator is replaced by results when complete
- ✅ UI provides visual feedback throughout

**Steps:**

1. Open chat interface
2. Type: "Research property law in Zimbabwe"
3. Send message
4. Watch for tool invocation indicator
5. Observe indicator throughout execution
6. Verify indicator is replaced by results

**Success Criteria:**

- Indicator appears within 1 second
- Correct tool name displayed
- Visual feedback throughout execution
- Smooth transition to results

---

### Test 7: Source Citation Formatting

**Objective:** Verify that source citations are properly formatted and functional.

**Test Query:** "Find recent cases about land reform in Zimbabwe"

**Expected Behavior:**

- ✅ Response includes 3-5 source citations
- ✅ Each citation has a title
- ✅ Each citation has a clickable URL
- ✅ Citations are formatted consistently
- ✅ URLs are valid and accessible

**Steps:**

1. Open chat interface
2. Type: "Find recent cases about land reform in Zimbabwe"
3. Send message
4. Wait for response
5. Examine source citations
6. Click on URLs to verify they work

**Success Criteria:**

- 3-5 sources cited
- All sources have titles and URLs
- URLs are clickable
- Consistent formatting
- URLs lead to relevant content

---

### Test 8: Single Tool Call Verification

**Objective:** Verify that only 1 tool call is made for research (not nested).

**Test Query:** "Research constitutional law in Zimbabwe"

**Expected Behavior:**

- ✅ Only 1 tool invocation appears in UI
- ✅ Logs show single workflow tool call
- ✅ No nested agent tool calls
- ✅ Workflow executes deterministically
- ✅ Complete response returned in single call

**Steps:**

1. Open browser developer console
2. Open chat interface
3. Type: "Research constitutional law in Zimbabwe"
4. Send message
5. Monitor network requests
6. Check logs for tool call count

**Success Criteria:**

- Single tool invocation in UI
- Logs show 1 workflow tool call
- No nested agent calls
- Deterministic execution

**Logs to Monitor:**

```
[Chat Agent] Step 1: Invoking advancedSearchWorkflow tool
[Workflow Tool] Executing workflow
[Workflow Tool] Workflow complete
[Chat Agent] Step 2: Streaming results
```

---

### Test 9: Token Usage Verification

**Objective:** Verify that token usage stays within 4K-8K range.

**Test Query:** "Find cases about employment contracts in Zimbabwe"

**Expected Behavior:**

- ✅ Total token usage: 4K-8K tokens
- ✅ Search step: ~2K-4K tokens
- ✅ Extract step: ~1K-3K tokens
- ✅ Synthesize step: ~1K-1.5K tokens
- ✅ Token usage logged accurately

**Steps:**

1. Open chat interface
2. Type: "Find cases about employment contracts in Zimbabwe"
3. Send message
4. Wait for response
5. Check logs for token usage
6. Verify total is within range

**Success Criteria:**

- Total tokens: 4K-8K
- Token breakdown logged
- Usage is predictable
- No token budget exceeded errors

**Logs to Monitor:**

```
[Workflow] Step 1 tokens: 3200
[Workflow] Step 2 tokens: 2100
[Workflow] Step 3 tokens: 1400
[Workflow Tool] Total tokens: 6700
```

---

### Test 10: Complexity Routing

**Objective:** Verify that complexity detection routes queries correctly.

**Test Queries:**

- Simple: "What is a contract?"
- Light: "Explain property rights"
- Medium: "Find cases about property rights in Zimbabwe"
- Deep: "Comprehensive analysis of constitutional law"

**Expected Behavior:**

- ✅ Simple → Direct chat response
- ✅ Light → Direct chat response
- ✅ Medium → Chat Agent with workflow tool
- ✅ Deep → Search Agent (existing behavior)

**Steps:**

1. Test each query type
2. Monitor logs for routing decisions
3. Verify correct agent is used
4. Verify correct tools are invoked

**Success Criteria:**

- Correct complexity detected
- Correct agent selected
- Correct tools invoked
- Consistent routing behavior

---

## Monitoring and Debugging

### Key Log Patterns

**Successful Workflow Invocation:**

```
[Complexity Detector] Detected complexity: medium
[Chat Route] Routing to Mastra with chatAgent
[Chat Agent] Invoking advancedSearchWorkflow tool
[Workflow Tool] Workflow complete: 6.2s, 6.7K tokens, 5 sources
```

**Direct Chat Response:**

```
[Complexity Detector] Detected complexity: simple
[Chat Route] Using simple chat mode
[Chat Agent] Responding directly
```

**Error Handling:**

```
[Workflow Tool] Error during execution: [error details]
[Workflow Tool] Returning graceful error response
[Chat Agent] Providing fallback response
```

### Browser Console Checks

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for:
   - Network requests to `/api/chat`
   - WebSocket connections for streaming
   - Any JavaScript errors
   - Tool invocation events

### Network Tab Checks

1. Open Developer Tools (F12)
2. Go to Network tab
3. Filter by "chat"
4. Verify:
   - POST request to `/api/chat`
   - Streaming response (Transfer-Encoding: chunked)
   - Response includes tool invocation data
   - No 500 errors

---

## Test Results Checklist

Use this checklist to track your testing progress:

- [ ] Test 1: Simple question (no workflow) ✓
- [ ] Test 2: Research question (workflow invocation) ✓
- [ ] Test 3: Document creation with research ✓
- [ ] Test 4: Error handling - invalid query ✓
- [ ] Test 5: Error handling - API failure ✓
- [ ] Test 6: Tool invocation indicators ✓
- [ ] Test 7: Source citation formatting ✓
- [ ] Test 8: Single tool call verification ✓
- [ ] Test 9: Token usage verification ✓
- [ ] Test 10: Complexity routing ✓

---

## Common Issues and Solutions

### Issue: Workflow tool not invoked

**Symptoms:** Research queries get direct responses without tool invocation

**Possible Causes:**

- Complexity detector not detecting "medium" complexity
- Chat Agent instructions not clear about when to use tool
- Tool not registered in Chat Agent

**Solutions:**

1. Check complexity detector logs
2. Review Chat Agent instructions
3. Verify tool registration in `chat-agent.ts`

### Issue: Nested tool calls

**Symptoms:** Multiple tool invocations for single research query

**Possible Causes:**

- Chat Agent calling Search Agent instead of workflow tool
- Incorrect routing logic

**Solutions:**

1. Verify routing in `mastra-sdk-integration.ts`
2. Check that medium complexity routes to chatAgent
3. Review agent selection logic

### Issue: Token usage exceeds range

**Symptoms:** Token usage > 8K tokens

**Possible Causes:**

- Workflow steps using too many tokens
- Synthesis step too verbose

**Solutions:**

1. Review workflow step configurations
2. Adjust synthesis prompt to be more concise
3. Check token limits in workflow steps

### Issue: Sources not formatted correctly

**Symptoms:** Source citations missing titles or URLs

**Possible Causes:**

- Workflow output schema mismatch
- UI not rendering sources correctly

**Solutions:**

1. Verify workflow output matches schema
2. Check message rendering in `messages.tsx`
3. Review artifact rendering in `artifact.tsx`

---

## Performance Benchmarks

Expected performance metrics:

| Metric                       | Target | Acceptable Range |
| ---------------------------- | ------ | ---------------- |
| Simple query response time   | < 3s   | 1-5s             |
| Research query response time | 5-10s  | 5-15s            |
| Token usage (research)       | 4K-8K  | 3K-10K           |
| Tool invocation latency      | < 1s   | < 2s             |
| Source count                 | 3-5    | 2-7              |

---

## Reporting Issues

If you encounter issues during testing:

1. **Capture logs:** Copy relevant log output
2. **Screenshot UI:** Capture any error messages or unexpected behavior
3. **Document steps:** Write down exact steps to reproduce
4. **Check environment:** Verify all environment variables are set
5. **Test isolation:** Try to reproduce in a clean session

---

## Next Steps

After completing manual testing:

1. ✅ Mark all test scenarios as complete
2. ✅ Document any issues found
3. ✅ Create bug reports for failures
4. ✅ Update implementation if needed
5. ✅ Re-test after fixes
6. ✅ Mark task as complete in tasks.md

---

## Conclusion

This manual testing guide ensures comprehensive validation of the Medium Research Tool Integration. Follow each test scenario carefully and document your results. If all tests pass, the implementation is ready for production use.
