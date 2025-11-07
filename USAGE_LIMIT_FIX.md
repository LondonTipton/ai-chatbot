# Usage Limit Error Handling Fix

## Problem

When users exceeded their daily usage limit, they were seeing a toast message saying "High traffic detected. Retrying in 25 seconds..." instead of the proper upgrade modal.

## Root Cause

The error handling logic was checking for rate limit errors in the wrong order:

1. First checked for ANY `rate_limit` type error → treated as Cerebras 429 error
2. Then checked for usage limit errors → never reached because already caught above

This meant usage limit errors (which have `type: "rate_limit"`) were being misidentified as Cerebras API rate limits.

## Solution

Reordered the error handling to check for **usage limit errors FIRST**:

### New Error Handling Order:

**1. Usage Limit Errors (Daily Quota)**

```typescript
if (
  errorData.code === "rate_limit:chat" ||
  errorData.cause === "daily_limit_reached" ||
  (errorData.requestsToday !== undefined && errorData.dailyLimit !== undefined)
) {
  // Show upgrade modal
  setUpgradeModalData({ requestsToday, dailyLimit, currentPlan });
  setShowUpgradeModal(true);
}
```

**2. Cerebras API Rate Limits (429)**

```typescript
if (
  (error as any).status === 429 ||
  ((error as any).type === "rate_limit" && !(error as any).data?.dailyLimit) ||
  (error as any).error === "rate_limit_exceeded"
) {
  // Show retry toast and auto-retry
  toast({
    description: `High traffic detected. Retrying in ${retryAfter} seconds...`,
  });
}
```

## Detection Logic

### Usage Limit Error (from API):

```json
{
  "code": "rate_limit:chat",
  "message": "You've reached your daily limit of 5 requests. Upgrade to continue.",
  "cause": "daily_limit_reached",
  "requestsToday": 5,
  "dailyLimit": 5,
  "plan": "Free"
}
```

### Cerebras Rate Limit Error:

```json
{
  "status": 429,
  "type": "rate_limit",
  "retryAfter": 15
}
```

## User Experience

### Before Fix:

- User exceeds daily limit
- Sees: "High traffic detected. Retrying in 25 seconds..."
- System retries automatically (fails again)
- Confusing experience

### After Fix:

- User exceeds daily limit
- Sees: Upgrade modal with:
  - "Daily Limit Reached"
  - Current usage: "5 of 5 daily requests"
  - Recommended upgrade plan
  - "Upgrade to Basic" button
  - "View All Plans" button
  - "Maybe Later" button
- Clear path to upgrade or wait until tomorrow

## Testing

To test the fix:

1. Use up your daily limit (5 requests for Free plan)
2. Try to send another message
3. Should see the upgrade modal, not a retry toast
4. Modal should show correct usage numbers and plan

## Update: Parsing Error Data

### Issue

The upgrade modal was showing "0 of 0" requests because the error data wasn't being parsed correctly from the API response.

### Debugging Added

1. **Multiple data source checks**: Tries `error.data`, `error.response.data`, `error.body`, and `error` itself
2. **Console logging**: Logs error object keys, message, and data for debugging
3. **Message parsing**: Extracts daily limit from error message as fallback
4. **Usage state fallback**: Uses current usage state if error data is unavailable

### Code Flow

```typescript
// 1. Try to get error data from multiple locations
const errorData = errorObj.data || errorObj.response?.data || errorObj.body || errorObj;

// 2. Try to extract from error message
if (errorObj.message?.match(/daily limit of (\d+)/)) {
  errorData.dailyLimit = extracted number;
}

// 3. Parse the numbers
let requestsToday = Number(errorData.requestsToday);
let dailyLimit = Number(errorData.dailyLimit);

// 4. Fallback to current usage state
if (!requestsToday || !dailyLimit) {
  requestsToday = usage?.requestsToday || 0;
  dailyLimit = usage?.dailyLimit || 5;
}
```

### Next Steps

Check browser console logs to see:

- What keys are in the error object
- What the error message says
- What the error data contains

This will help identify where the usage numbers are actually located in the error response.
