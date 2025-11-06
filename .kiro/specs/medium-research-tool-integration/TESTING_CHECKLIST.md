# Manual Testing Checklist

Quick reference checklist for testing the Advanced Search Workflow Tool Integration.

## Pre-Testing Setup

- [ ] Development server running (`pnpm dev`)
- [ ] Environment variables configured (`.env.local`)
- [ ] Tavily API key valid and has credits
- [ ] Logged in as test user
- [ ] Browser console open for monitoring

## Core Test Scenarios

### 1. Simple Question (No Workflow)

- [ ] Query: "What is a contract?"
- [ ] ✅ Direct response (no tool invocation)
- [ ] ✅ Response time < 3 seconds
- [ ] ✅ No source citations

### 2. Research Question (Workflow Invocation)

- [ ] Query: "Find cases about property rights in Zimbabwe"
- [ ] ✅ Tool invocation indicator appears
- [ ] ✅ "Using tool: advanced-search-workflow" shown
- [ ] ✅ Response includes 3-5 sources
- [ ] ✅ Sources have titles and URLs
- [ ] ✅ Only 1 tool call made
- [ ] ✅ Execution time: 5-10 seconds
- [ ] ✅ Token usage: 4K-8K tokens (check logs)

### 3. Document Creation with Research

- [ ] Query: "Research employment law in Zimbabwe and create a document"
- [ ] ✅ Workflow tool invoked first
- [ ] ✅ createDocument tool invoked second
- [ ] ✅ Document artifact displayed
- [ ] ✅ Document contains research findings
- [ ] ✅ Document persists after refresh

### 4. Error Handling - Invalid Query

- [ ] Query: "Find cases about asdfghjkl qwertyuiop"
- [ ] ✅ Graceful error message
- [ ] ✅ No crash or stack trace
- [ ] ✅ Chat continues to function

### 5. Error Handling - API Failure

- [ ] Set invalid Tavily API key
- [ ] Query: "Find cases about contract law"
- [ ] ✅ User-friendly error message
- [ ] ✅ No sensitive data exposed
- [ ] ✅ Chat remains functional
- [ ] Restore valid API key

## UI Verification

### Tool Invocation Indicators

- [ ] ✅ Indicator appears within 1 second
- [ ] ✅ Correct tool name displayed
- [ ] ✅ Visual feedback throughout execution
- [ ] ✅ Smooth transition to results

### Source Citation Formatting

- [ ] ✅ 3-5 sources cited
- [ ] ✅ All sources have titles
- [ ] ✅ All sources have clickable URLs
- [ ] ✅ Consistent formatting
- [ ] ✅ URLs lead to relevant content

## Technical Verification

### Single Tool Call

- [ ] ✅ Only 1 tool invocation in UI
- [ ] ✅ Logs show single workflow call
- [ ] ✅ No nested agent calls
- [ ] ✅ Deterministic execution

### Token Usage

- [ ] ✅ Total tokens: 4K-8K range
- [ ] ✅ Search step: ~2K-4K tokens
- [ ] ✅ Extract step: ~1K-3K tokens
- [ ] ✅ Synthesize step: ~1K-1.5K tokens

### Complexity Routing

- [ ] Simple query → Direct response
- [ ] Light query → Direct response
- [ ] Medium query → Chat Agent + workflow tool
- [ ] Deep query → Search Agent (existing)

## Log Monitoring

### Successful Workflow

```
[Complexity Detector] Detected complexity: medium
[Chat Route] Routing to Mastra with chatAgent
[Chat Agent] Invoking advancedSearchWorkflow tool
[Workflow Tool] Workflow complete: X.Xs, XK tokens, X sources
```

### Direct Response

```
[Complexity Detector] Detected complexity: simple
[Chat Route] Using simple chat mode
[Chat Agent] Responding directly
```

### Error Handling

```
[Workflow Tool] Error during execution
[Workflow Tool] Returning graceful error response
[Chat Agent] Providing fallback response
```

## Performance Benchmarks

- [ ] Simple query: < 3s
- [ ] Research query: 5-10s
- [ ] Token usage: 4K-8K
- [ ] Tool invocation latency: < 1s
- [ ] Source count: 3-5

## Issues Found

Document any issues here:

1.
2.
3.

## Sign-Off

- [ ] All core scenarios tested
- [ ] All UI elements verified
- [ ] All technical checks passed
- [ ] Performance within benchmarks
- [ ] No critical issues found
- [ ] Ready for production

**Tested by:** ******\_\_\_******  
**Date:** ******\_\_\_******  
**Status:** ⬜ PASS ⬜ FAIL ⬜ NEEDS REVIEW
