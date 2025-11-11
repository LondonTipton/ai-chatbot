# Input Sanitization Fixes

## Issues Fixed

### 1. Character Counter Not Working ✅

**Problem:**

- Character counter remained at 0 even when typing/pasting text
- The counter wasn't updating in real-time

**Root Cause:**

- Textarea component wasn't tracking the `value` prop changes
- Initial character count wasn't being set from the initial value

**Solution:**

- Added `useEffect` to update character count when `value` prop changes
- Initialize character count from `value` or `defaultValue` on mount
- Properly pass `value` and `defaultValue` props to the native textarea element

**Changes Made to `components/ui/textarea.tsx`:**

```typescript
// Added useEffect import
import { useEffect, useState } from "react";

// Initialize with value/defaultValue
const [charCount, setCharCount] = useState(() => {
  const initialValue = value ?? defaultValue ?? "";
  return String(initialValue).length;
});

// Track value changes
useEffect(() => {
  if (value !== undefined) {
    setCharCount(String(value).length);
  }
}, [value]);

// Pass props to textarea
<textarea
  value={value}
  defaultValue={defaultValue}
  onChange={handleChange}
  {...props}
/>;
```

### 2. Chat Error: "The request couldn't be processed" ✅

**Problem:**

- Chat requests were failing with error message
- Long text pastes were causing issues

**Root Cause:**

- `sanitizeUserInput()` was calling `escapeHtml()` which converted characters like `<` to `&lt;`
- This broke the chat processing since the AI and markdown processors expected raw text
- HTML escaping should only happen at render time, not during input processing

**Solution:**

- Removed `escapeHtml()` call from `sanitizeUserInput()`
- Keep dangerous pattern removal (script tags, javascript: protocol, event handlers)
- Allow normal text to pass through without HTML entity encoding
- HTML escaping is handled by the rendering layer (`sanitizeMarkdownOutput`, React's built-in escaping)

**Changes Made to `lib/input-sanitizer.ts`:**

```typescript
// BEFORE (Breaking)
sanitizedInput = escapeHtml(sanitizedInput); // Converted < to &lt;, etc.
sanitizedInput = sanitizedInput
  .replace(/<script...>/gi, "")
  .replace(/javascript:/gi, "")
  .replace(/on\w+\s*=/gi, "");

// AFTER (Fixed)
// Remove dangerous patterns but DON'T escape HTML
// HTML escaping should be done at render time, not during input processing
sanitizedInput = sanitizedInput
  .replace(/<script...>/gi, "")
  .replace(/javascript:/gi, "")
  .replace(/on\w+\s*=/gi, "");
```

## Security Implications

### Still Protected Against:

✅ **XSS Attacks** - Output is sanitized at render time
✅ **Script Injection** - Script tags removed
✅ **JavaScript Protocol** - javascript: URLs blocked
✅ **Event Handlers** - onclick, onerror, etc. removed
✅ **Character Limits** - 10k input, 50k output enforced
✅ **Control Characters** - Null bytes and control chars removed
✅ **Rate Limiting** - Basic rate limiting in place

### Defense Layers:

1. **Input Validation** - Removes dangerous patterns, limits length
2. **React's Built-in Escaping** - React automatically escapes JSX content
3. **Markdown Output Sanitization** - `sanitizeMarkdownOutput()` for AI responses
4. **Component-level Safety** - Streamdown/markdown renderers have their own protections

## Testing

### Test Character Counter:

1. ✅ Type in the textarea - counter updates in real-time
2. ✅ Paste long text - counter shows correct count
3. ✅ Paste >10k characters - counter stops at 10,000 and turns red
4. ✅ Delete text - counter decreases

### Test Chat Functionality:

1. ✅ Type normal message - works
2. ✅ Paste long text - works (truncates at 10k)
3. ✅ Use special characters `< > & "` - works
4. ✅ Try to inject `<script>alert('XSS')</script>` - blocked
5. ✅ Try event handlers `<img onerror="alert()">` - blocked

## Files Modified

1. **components/ui/textarea.tsx**

   - Added `useEffect` to track value changes
   - Initialize character count from initial value
   - Pass `value` and `defaultValue` props correctly

2. **lib/input-sanitizer.ts**
   - Removed `escapeHtml()` call from `sanitizeUserInput()`
   - Added comment explaining escapeHtml is kept for potential output use
   - Input sanitization now allows normal typing while still blocking XSS

## Summary

Both issues are now fixed:

1. **Character counter works** - Updates in real-time, shows correct count
2. **Chat works** - Messages process correctly, no more "request couldn't be processed" error

The sanitization is now properly balanced:

- **Input layer**: Removes dangerous patterns, limits length, preserves user text
- **Output layer**: Sanitizes HTML/markdown for safe rendering

This follows security best practices:

- ✅ Defense in depth (multiple layers)
- ✅ Fail securely (dangerous patterns blocked)
- ✅ User-friendly (normal text works)
- ✅ XSS protection (output sanitization)
