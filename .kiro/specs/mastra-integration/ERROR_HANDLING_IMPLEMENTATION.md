# Mastra Error Handling and Fallback Implementation

## Overview

Implemented comprehensive error handling and fallback mechanisms for Mastra workflows to ensure reliable operation and graceful degradation when sub-agents fail.

## Changes Made

### 1. Chat Route Error Handling (`app/(chat)/api/chat/route.ts`)

#### Transaction Management

- Added proper transaction ID validation before attempting Mastra routing
- Implemented fallback flag (`shouldFallbackToAiSdk`) to track when fallback is needed
- Added transaction rollback on Mastra failures

#### Stream Error Detection

- Implemented stream error detection in the transform stream
- Automatically rolls back transactions when stream errors are detected
- Commits transactions only on successful stream completion

#### Fallback to AI SDK

- Catches all Mastra routing errors and sets fallback flag
- Logs detailed error information including stack traces
- Seamlessly falls back to AI SDK when Mastra fails
- Distinguishes between fallback and normal AI SDK usage in logs

### 2. Deep Research Workflow (`lib/ai/workflows/deep-research.ts`)

#### Sub-Agent Failure Handling

- **Extract Agent**: Continues with search results if extraction fails
- **Analyze Agent**: Uses extracted content as fallback if analysis fails
- Stores partial results in step output even when errors occur

#### Partial Results Support

- Relaxed validation when sub-agents fail (10 chars minimum vs 100 chars)
- Returns partial success when any content is available
- Tracks which steps had errors in the response

#### Enhanced Logging

- Added warning logs (⚠️) for sub-agent failures
- Logs partial result lengths when continuing with fallback data
- Includes error counts in success logs

### 3. Document Review Workflow (`lib/ai/workflows/document-review.ts`)

#### Sub-Agent Failure Handling

- **Issues Agent**: Continues with structure analysis if issues identification fails
- **Recommendations Agent**: Uses issues analysis as fallback if recommendations fail
- Stores partial results in step output even when errors occur

#### Partial Results Support

- Relaxed validation when sub-agents fail (10 chars minimum vs 100 chars)
- Returns partial success when any content is available
- Tracks which steps had errors in the response

#### Enhanced Logging

- Added warning logs (⚠️) for sub-agent failures
- Logs partial result lengths when continuing with fallback data
- Includes error counts in success logs

## Error Handling Strategy

### 1. Graceful Degradation

- Workflows continue with partial results when sub-agents fail
- Each step uses output from previous step as fallback
- Minimum viable response is returned rather than complete failure

### 2. Transaction Safety

- Transactions are rolled back on any Mastra failure
- Stream errors trigger automatic rollback
- Only successful completions commit transactions

### 3. Fallback to AI SDK

- Any Mastra routing error triggers fallback to AI SDK
- Transaction ID validation failures trigger fallback
- Fallback is logged distinctly from normal AI SDK usage

### 4. Comprehensive Logging

- All errors include detailed context (error message, duration, stack trace)
- Partial results are logged with warning level
- Success logs include error counts for transparency

## Requirements Satisfied

- ✅ 9.1: Sub-agent failures are logged and workflow continues with available information
- ✅ 9.2: Workflow failures trigger automatic fallback to AI SDK
- ✅ 9.3: All fallback decisions are logged with context
- ✅ 9.4: Usage transactions are rolled back appropriately on errors

## Testing Recommendations

1. **Sub-Agent Failure**: Test each workflow with simulated sub-agent failures
2. **Transaction Rollback**: Verify transactions are rolled back on errors
3. **Fallback Behavior**: Confirm AI SDK is used when Mastra fails
4. **Partial Results**: Test that partial results are returned when possible
5. **Stream Errors**: Verify stream error detection and rollback

## Example Error Scenarios

### Scenario 1: Extract Agent Fails

```
[Deep Research Workflow] Step 1/3: Search Agent ✅
[Deep Research Workflow] Step 2/3: Extract Agent ❌
[Deep Research Workflow] ⚠️ Extract Agent failed, continuing with search results
[Deep Research Workflow] Step 3/3: Analyze Agent ✅
[Deep Research Workflow] ✅ Returning partial results (1 error)
```

### Scenario 2: Mastra Routing Fails

```
[Routing] 🤖 Using Mastra for deep query
[Mastra] ❌ Mastra routing failed: Connection timeout
[Usage] Rolled back transaction abc123 after Mastra failure
[Routing] 🔄 Falling back to AI SDK due to Mastra error
[Routing] 🔄 Using AI SDK as fallback for deep query
```

### Scenario 3: Stream Error Detected

```
[Mastra] ✅ Mastra stream created successfully
[Mastra] ❌ Stream error detected: Agent timeout
[Usage] Rolled back transaction abc123 due to stream error
```

## Benefits

1. **Reliability**: Workflows complete even when individual agents fail
2. **Transparency**: All errors and fallbacks are logged for debugging
3. **User Experience**: Users get partial results rather than complete failures
4. **Data Integrity**: Transactions are properly managed and rolled back on errors
5. **Maintainability**: Clear error handling patterns across all workflows

## Future Improvements

1. Add retry logic for transient failures
2. Implement circuit breaker pattern for repeated failures
3. Add metrics collection for error rates
4. Implement more sophisticated partial result validation
5. Add user-facing error messages for different failure types
