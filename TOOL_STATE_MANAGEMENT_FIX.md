# Tool State Management Fix

## Issues Fixed

### 1. Tools Accumulating Across Requests

**Problem**: Tool events from previous requests were persisting in the dataStream, causing the UI to show old tools along with new ones.

**Symptom**: When making a new request, the progress UI would show a long list of tools from previous requests before showing the current ones.

### 2. UI Showing Up Late

**Problem**: Tool events were being added to dataStream but the UI wasn't updating immediately.

**Symptom**: Progress UI appeared late or during text streaming instead of at the beginning.

## Solution

### Enhanced State Management in `hooks/use-tool-execution.ts`

#### 1. Clear Tool Events After Completion

```typescript
useEffect(() => {
  if (tools.length > 0 && tools.every((t) => t.status === "complete")) {
    const timer = setTimeout(() => {
      setTools([]);
      // Clear tool events from dataStream to prevent accumulation
      setDataStream((prev) =>
        prev.filter(
          (part) =>
            part.type !== "data-toolStart" && part.type !== "data-toolComplete"
        )
      );
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [tools, setDataStream]);
```

**What this does**:

- Waits for all tools to complete
- After 3 seconds, clears the tools state
- **Removes tool events from dataStream** to prevent accumulation

#### 2. Reset Tools on New Request

```typescript
useEffect(() => {
  // If dataStream is empty or has no tool events, reset tools
  const hasToolEvents = dataStream.some(
    (part) =>
      part.type === "data-toolStart" || part.type === "data-toolComplete"
  );

  if (!hasToolEvents && tools.length > 0) {
    setTools([]);
  }
}, [dataStream, tools.length]);
```

**What this does**:

- Monitors dataStream for tool events
- If dataStream has no tool events but tools state has items, reset tools
- Ensures clean state for new requests

## How It Works Now

### Request Lifecycle

1. **User sends message**

   - dataStream is cleared for new request
   - tools state is reset (via useEffect)

2. **Tools execute**

   - `data-toolStart` events added to dataStream
   - UI shows tools as "running"
   - Duration counters update in real-time

3. **Tools complete**

   - `data-toolComplete` events added to dataStream
   - UI shows tools as "complete" with checkmarks

4. **After 3 seconds**

   - tools state cleared
   - Tool events removed from dataStream
   - UI disappears

5. **Next request**
   - Clean slate - no old tool events
   - Only current request's tools shown

## Benefits

✅ **No Accumulation**: Old tool events don't carry over  
✅ **Immediate Display**: UI shows as soon as first tool starts  
✅ **Clean State**: Each request starts fresh  
✅ **Auto-Cleanup**: Events removed after completion  
✅ **Proper Timing**: UI appears at the right time

## Testing

Test with multiple consecutive research queries:

1. Ask: "Are there cases about spamming?"

   - Watch tools execute and complete
   - Wait for UI to disappear (3 seconds)

2. Ask: "Find cases about Notice of Opposition"

   - UI should show ONLY new tools
   - No old tools from previous request

3. Ask another question immediately
   - UI should reset and show only current tools

## Edge Cases Handled

### Case 1: Rapid Consecutive Requests

- Old tools cleared before new ones start
- No overlap or confusion

### Case 2: Request with No Tools

- No progress UI shown
- State remains clean

### Case 3: Tools Still Running When New Request Starts

- Old tools cleared immediately
- New tools shown fresh

### Case 4: User Navigates Away

- Cleanup timer cleared properly
- No memory leaks

## Files Modified

- `hooks/use-tool-execution.ts`
  - Added dataStream cleanup
  - Added reset logic for new requests
  - Improved state management

## Related Issues

This fix also resolves:

- Progress UI showing stale data
- UI appearing during text streaming
- Confusing UX with mixed old/new tools
- Memory accumulation in dataStream

## Future Improvements

Potential enhancements:

1. Add transition animations when tools clear
2. Show "Previous research" section for old tools
3. Add manual dismiss button
4. Persist tool history in session storage
5. Add analytics for tool usage patterns
