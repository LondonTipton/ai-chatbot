# Schema Character Limit Fix

## The Problem

User was getting error: "The request couldn't be processed. Please check your input and try again."

When pasting a 3,884 character legal document, even though:

- ✅ Client-side sanitization passed (logged as valid)
- ✅ Input sanitizer supports 10,000 characters
- ✅ Character counter showed proper limit

## Root Cause

The Zod schema in `app/(chat)/api/chat/schema.ts` was limiting text to **2,000 characters**:

```typescript
text: z.string().min(1).max(2000),  // ❌ TOO LOW
```

This schema validation runs **BEFORE** the sanitization code in the API route, so the request was rejected before sanitization could even run.

## The Fix

Updated schema to match the input sanitizer limit:

```typescript
text: z.string().min(1).max(10_000), // ✅ Match MAX_INPUT_LENGTH from input-sanitizer
```

## File Changed

- `app/(chat)/api/chat/schema.ts` - Line 5

## Testing

1. Refresh your browser (Ctrl+F5)
2. Paste your 3,884 character legal document
3. Should now work! ✅

## Lessons Learned

When implementing input validation:

1. **Frontend validation** (character counter, UI limits)
2. **Request body schema validation** (Zod schema) ← THIS WAS THE ISSUE
3. **Backend sanitization** (input-sanitizer.ts)
4. **Output sanitization** (markdown rendering)

All layers must have **consistent limits** or requests will fail mysteriously!

## Related Files

- `lib/input-sanitizer.ts` - MAX_INPUT_LENGTH = 10_000
- `components/ui/textarea.tsx` - Uses MAX_INPUT_LENGTH for counter
- `components/multimodal-input.tsx` - Client-side validation
- `app/(chat)/api/chat/route.ts` - Server-side sanitization
- `app/(chat)/api/chat/schema.ts` - **THIS WAS THE MISSING PIECE**
