# Artifact Auto-Open Fix

## Problem

When opening old chat history that contained documents created via the `createDocument` tool, the artifact panel would automatically open itself. This was unintended behavior - the artifact should only auto-open when a document is actively being created (during streaming), not when loading historical chat conversations.

**Unwanted Behavior:**
- User opens old chat history
- Artifact panel automatically opens
- This happens for every document in the chat history
- Creates a jarring user experience

**Desired Behavior:**
- Artifact should only auto-open when actively being created
- Old chat history should show document previews, but NOT auto-open the artifact
- User can manually click to open artifacts from old chats

## Root Cause

In `components/document-preview.tsx`, the auto-open logic was triggered whenever:
1. A document result existed (`result?.id`)
2. The document hadn't been auto-opened before (`hasAutoOpenedRef.current !== result.id`)

This logic didn't distinguish between:
- **NEW documents being created** (should auto-open)
- **OLD documents from chat history** (should NOT auto-open)

### Original Code (Problematic)

```tsx
// Auto-open artifact when document is created (only once per document)
useEffect(() => {
  // Only auto-open if we haven't already opened this document
  if (result?.id && hasAutoOpenedRef.current !== result.id) {
    hasAutoOpenedRef.current = result.id;
    const boundingBox = hitboxRef.current?.getBoundingClientRect();

    setArtifact((currentArtifact) => ({
      ...currentArtifact,
      title: result.title,
      documentId: result.id,
      kind: result.kind,
      isVisible: true,  // ❌ Always opens, even for old chats
      boundingBox: boundingBox ? { /* ... */ } : currentArtifact.boundingBox,
    }));
  }
}, [result, setArtifact]);
```

**Problem:** This useEffect fires whenever `result` changes, which includes when loading old chat history.

## Solution

Added a check for `artifact.status === "streaming"` to ensure the artifact only auto-opens when a document is actively being created, not when loading from history.

### Fixed Code

```tsx
// Auto-open artifact when document is created (only once per document)
// Only auto-open during streaming (when being created), not when loading old chats
useEffect(() => {
  // Only auto-open if:
  // 1. We haven't already opened this document
  // 2. The artifact is currently streaming (being created)
  if (
    result?.id &&
    hasAutoOpenedRef.current !== result.id &&
    artifact.status === "streaming"  // ✅ Only when actively creating
  ) {
    hasAutoOpenedRef.current = result.id;
    const boundingBox = hitboxRef.current?.getBoundingClientRect();

    setArtifact((currentArtifact) => ({
      ...currentArtifact,
      title: result.title,
      documentId: result.id,
      kind: result.kind,
      isVisible: true,
      boundingBox: boundingBox ? { /* ... */ } : currentArtifact.boundingBox,
    }));
  }
}, [result, artifact.status, setArtifact]);  // Added artifact.status dependency
```

## Key Changes

1. **Added streaming check:** `artifact.status === "streaming"`
   - This ensures auto-open only happens during active document creation
   - When loading old chats, `artifact.status` is "idle", so auto-open is skipped

2. **Updated dependencies:** Added `artifact.status` to the useEffect dependency array
   - Ensures the effect re-evaluates when artifact status changes
   - Maintains proper React hook behavior

## How It Works

### When Creating a New Document:

1. User asks AI to create a document
2. `createDocument` tool is called
3. Document starts streaming → `artifact.status = "streaming"`
4. DocumentPreview component receives the result
5. **Auto-open triggers** because:
   - ✅ `result?.id` exists
   - ✅ `hasAutoOpenedRef.current !== result.id` (first time seeing this doc)
   - ✅ `artifact.status === "streaming"` (actively creating)
6. Artifact panel opens automatically

### When Loading Old Chat History:

1. User opens old chat with documents
2. Chat history is loaded from database
3. DocumentPreview components render for each document
4. `artifact.status = "idle"` (not streaming)
5. **Auto-open does NOT trigger** because:
   - ✅ `result?.id` exists
   - ✅ `hasAutoOpenedRef.current !== result.id` (first time in this session)
   - ❌ `artifact.status === "streaming"` (FALSE - not creating)
6. Artifact panel stays closed
7. User can manually click to open if desired

## Files Changed

- `components/document-preview.tsx` - Modified auto-open useEffect logic

## Testing Scenarios

✅ **New Document Creation:**
- Create a new document via chat
- Artifact should auto-open during streaming
- Document should be visible and editable

✅ **Old Chat History:**
- Open a chat with existing documents
- Artifacts should NOT auto-open
- Document previews should be visible
- Clicking preview should manually open artifact

✅ **Multiple Documents:**
- Create multiple documents in same chat
- Each new document should auto-open when created
- Old documents should remain closed

✅ **Switching Between Chats:**
- Navigate between chats with documents
- No artifacts should auto-open from history
- New documents in any chat should still auto-open

## Benefits

1. **Better UX:** Old chats load cleanly without unexpected panel opens
2. **Preserves Intent:** Auto-open only happens when user requests document creation
3. **Consistent Behavior:** Streaming status accurately reflects document creation state
4. **No Side Effects:** Existing document functionality remains unchanged
