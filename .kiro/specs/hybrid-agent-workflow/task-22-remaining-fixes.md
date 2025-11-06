# Task 22: Remaining Fixes

## Current Status

The integration is almost complete. The following small fixes are needed:

### 1. Add useCallback Import ✅ NEEDED

**File:** `components/chat.tsx` (line 6)

Change:

```typescript
import { useEffect, useRef, useState } from "react";
```

To:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
```

### 2. Update Artifact sendMessage Prop ✅ NEEDED

**File:** `components/chat.tsx` (around line 487)

Change:

```typescript
<Artifact
  ...
  sendMessage={sendMessage}
  ...
/>
```

To:

```typescript
<Artifact
  ...
  sendMessage={handleSendMessage}
  ...
/>
```

### 3. Fix Template Literal Warnings (Optional - Linter Preference)

**File:** `components/chat.tsx` (lines 320, 321, 332)

These are just linter warnings about using template literals when not needed. Can be ignored or fixed by changing:

- `"Mode:"` instead of `` `Mode:` ``
- `"Steps:"` instead of `` `Steps:` ``
- `"Sources:"` instead of `` `Sources:` ``

### 4. Fix Unused Variable (Optional)

**File:** `components/chat.tsx` (line 379)

Change:

```typescript
} catch (error) {
```

To:

```typescript
} catch {
```

### 5. Update Attachments Button Logic ✅ NEEDED

**File:** `components/multimodal-input.tsx` (around line 410)

Change:

```typescript
const isReasoningModel = selectedModelId === "chat-model-reasoning";
```

To:

```typescript
const isResearchModel = selectedModelId.startsWith("research-");
```

And update the disabled prop:

```typescript
disabled={status !== "ready" || isResearchModel}
```

## What's Already Working

✅ Model selector shows three research modes (AUTO, MEDIUM, DEEP) with icons
✅ Research mode detection logic is in place
✅ Custom handleSendMessage intercepts research requests
✅ Research API is called with correct parameters
✅ Loading messages are shown
✅ Results are formatted with metadata and sources
✅ Error handling for rate limits and network errors
✅ Toast notifications for errors
✅ MultimodalInput uses handleSendMessage

## Testing After Fixes

Once the above fixes are applied, test:

1. Select AUTO mode and send a query
2. Verify loading message appears
3. Check that results display with metadata
4. Test rate limit error handling
5. Test network error handling
6. Verify file attachments are disabled in research modes
7. Switch back to normal chat and verify it still works
