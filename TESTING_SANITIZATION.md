# Testing Input Sanitization

## How to Test

### 1. Check Browser Console

After pasting text, look for:

```
[multimodal-input] Sanitization result: {
  originalLength: 3456,
  sanitizedLength: 3450,
  isValid: true,
  errors: [],
  truncated: false,
  firstChars: "II. THE REGISTRATION PROCESS..."
}
```

**What to look for:**

- ✅ `isValid: true` - Input passed validation
- ❌ `isValid: false` - Input was rejected
- Check `errors` array for reason
- Check `sanitizedLength` - should be close to `originalLength`

### 2. Check Server Terminal

Look for:

```
[chat/route] Sanitization result: {
  originalLength: 3456,
  sanitizedLength: 3450,
  isValid: true,
  errors: [],
  truncated: false
}
```

## Expected Results for Legal Text

Your legal text should:

- ✅ Pass client validation (isValid: true)
- ✅ Pass server validation (isValid: true)
- ✅ Not be truncated (text is < 10,000 characters)
- ✅ Maintain content length (minimal character removal)

## Common Issues

### Issue: "Input contains no valid content after sanitization"

**Cause:** Text was completely stripped
**Solution:** Check if text contains only special characters that are being removed

### Issue: "Input exceeded maximum length"

**Cause:** Text is > 10,000 characters
**Solution:** Text will be auto-truncated at 10,000 characters

### Issue: Empty errors array but still failing

**Cause:** Something else in the API route is failing
**Solution:** Check full server logs for other errors

## Quick Test

Paste this simple text first to verify the system works:

```
Hello, this is a test message.
```

If that works, then paste your legal text.

## Debugging Steps

1. Open browser DevTools (F12)
2. Go to Console tab
3. Clear console
4. Paste your legal text
5. Click send
6. Look for sanitization logs
7. Check terminal for server logs
8. Report back what you see!

## Expected Behavior

- Character counter should update immediately
- No toast error messages
- Message should send successfully
- You should get an AI response

## What Changed

We made the sanitizer **less aggressive**:

**BEFORE:**

- Trimmed every single line
- Could accidentally remove content
- Too strict whitespace rules

**AFTER:**

- Only trims start/end of entire input
- Preserves line formatting
- Only limits excessive blank lines (>3 newlines → 3 newlines)
- Removes dangerous patterns (scripts, javascript:, event handlers)
- Does NOT escape HTML characters

This should allow normal text (including legal documents) to pass through while still blocking XSS attacks.
