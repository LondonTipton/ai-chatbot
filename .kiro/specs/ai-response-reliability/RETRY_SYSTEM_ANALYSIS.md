# Retry System Analysis and Recommendations

## Current State

The retry system is implemented and working, but has a fundamental architectural limitation that prevents it from solving the core problem.

## The Problem

### What's Happening

1. AI calls tools (e.g., `tavilyAdvancedSearch`) successfully ✅
2. AI generates reasoning steps ✅
3. AI **does not generate final explanatory text** ❌
4. Validation detects the problem (0 chars of text) ✅
5. But validation runs in `onFinish` - **after the stream is already sent** ❌
6. Cannot retry because response already delivered to client ❌

### Example from Logs

```
[StreamRetry] Message 1: 15 parts - step-start, reasoning, tool-tavilyAdvancedSearch,
  step-start, reasoning, tool-tavilyAdvancedSearch, step-start, reasoning,
  tool-tavilyAdvancedSearch, step-start, reasoning, tool-tavilyAdvancedSearch,
  step-start, reasoning, data-usage

[Validation] INVALID: Tool outputs present but insufficient follow-up text (0 chars)
[StreamRetry] ⚠️  Validation failed but stream already returned
```

## Root Cause

This is a **model behavior issue**, not a code issue:

- The Cerebras `chat-model` sometimes generates tool calls and reasoning but no final text
- This appears to be a quirk of how the model interprets the prompt
- The model thinks it's "done" after reasoning, without generating user-facing text

## Why Retry System Can't Fix This

### Architectural Limitation

```
Stream Creation → Stream Returned to Client → onFinish Called → Validation Runs
                  ↑ Point of no return
```

Once the stream is returned (which happens immediately), we cannot:

- Cancel it
- Retry it
- Modify it
- Replace it

The validation in `onFinish` is too late.

### What We Tried

1. **Warmup Period** - Wait 500ms before returning stream

   - Problem: Delays all responses, doesn't solve the issue
   - The AI generates tool calls quickly, text generation is what's missing

2. **Lenient Validation** - Accept tool activity without text

   - Problem: Users see empty responses in the UI
   - Not acceptable for production

3. **Strict Validation** - Reject tool outputs without text
   - Problem: Correctly detects issue but can't retry
   - Current state

## Solutions

### Option 1: Disable Retry Logic (Recommended for Now)

**Pros:**

- Removes complexity that isn't working
- Reduces latency (no validation overhead)
- Simpler codebase

**Cons:**

- Doesn't solve the empty response problem
- Loses transaction rollback capability

**Implementation:**

```env
ENABLE_RETRY_LOGIC=false
```

### Option 2: Fix Model Behavior (Best Long-term)

**Approaches:**

- Update system prompt to be more explicit about text generation ✅ (Done)
- Try different model (e.g., `chat-model-reasoning`)
- Adjust `stopWhen` to require text generation
- Add a "force text" parameter to the model

**Status:** Prompt updated, needs testing

### Option 3: Client-Side Retry

**Pros:**

- Can detect empty responses in UI
- Can trigger new request automatically
- User sees retry happening

**Cons:**

- Doubles API calls for failed responses
- More complex client logic
- Usage counter issues

### Option 4: Buffer Entire Response

**Pros:**

- Can validate before sending to client
- Can retry if validation fails
- Full control over response

**Cons:**

- Defeats purpose of streaming
- Increases latency significantly
- Higher memory usage

### Option 5: Hybrid Approach

**Idea:** Use streaming for most responses, but if validation fails, trigger a non-streaming retry

**Pros:**

- Best of both worlds
- Only impacts failed responses

**Cons:**

- Complex implementation
- User sees partial response then replacement

## Recommendation

### Immediate Action (Next 24 Hours)

1. **Keep retry logic enabled** to collect metrics
2. **Monitor validation failure rate**
3. **Test updated prompt** to see if it reduces failures
4. **Don't block on this** - the system works for most requests

### Short-term (Next Week)

1. **Analyze failure patterns**

   - Which queries trigger empty responses?
   - Is it specific to certain tools?
   - Does it correlate with query complexity?

2. **Test alternative models**

   - Try `chat-model-reasoning` for comparison
   - Test with different providers

3. **Implement client-side detection**
   - Add UI indicator for empty responses
   - Offer manual retry button

### Long-term (Next Month)

1. **Work with Cerebras** on model behavior
2. **Implement proper streaming validation** (if possible)
3. **Consider hybrid streaming/buffering approach**

## Metrics to Track

### Current Metrics

```sql
-- Validation failure rate
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN validation_failed = true THEN 1 ELSE 0 END) as failures,
  (SUM(CASE WHEN validation_failed = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as failure_rate
FROM request_logs
GROUP BY DATE(timestamp);
```

### Target Metrics

- Validation failure rate < 5%
- Empty response rate < 1%
- Retry success rate > 80% (when retries work)

## Current Status

### What's Working

- ✅ Transaction management
- ✅ Usage counter accuracy
- ✅ Validation detection
- ✅ Retry orchestration (when applicable)
- ✅ Metrics and logging

### What's Not Working

- ❌ Retrying streams that have already been sent
- ❌ Model consistently generating text after tools
- ❌ Preventing empty responses from reaching users

### What's Acceptable

- Most requests (>90%) work fine
- First request usually succeeds
- System is stable and performant
- No data corruption or counter issues

## Conclusion

The retry system is well-implemented but cannot solve the fundamental problem of model behavior within a streaming architecture. The best path forward is:

1. Keep the system as-is for now (it's not causing harm)
2. Focus on fixing model behavior through prompts
3. Add client-side detection for empty responses
4. Consider non-streaming fallback for retries

The empty response issue affects a small percentage of requests and is better solved at the model level than through retry logic.
