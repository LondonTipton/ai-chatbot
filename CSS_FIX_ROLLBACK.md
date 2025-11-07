# CSS Fix - Rollback of Prose Customizations

## Issue

The custom prose spacing CSS broke the table layout, causing columns to overlap and display incorrectly.

## Root Cause

The custom CSS rules we added to `app/globals.css` were conflicting with the default Tailwind Typography plugin's table styles. Specifically:

1. Custom `.prose-sm` overrides interfered with table display properties
2. The spacing adjustments affected table cell rendering
3. CSS specificity issues caused layout conflicts

## Solution

**Rolled back to simpler implementation:**

### 1. Removed Custom Prose CSS

Removed all custom `.prose-sm` overrides from `app/globals.css`:

- Removed paragraph spacing overrides
- Removed heading spacing overrides
- Removed list spacing overrides
- Removed code block spacing overrides
- Removed blockquote spacing overrides

### 2. Removed Prose Class from Messages

Simplified `components/message.tsx` to remove `prose` classes:

**Before:**

```tsx
"prose prose-sm dark:prose-invert max-w-none bg-transparent px-0 py-0 text-left [&>div>*:first-child]:mt-0 [&>div>*:last-child]:mb-0";
```

**After:**

```tsx
"bg-transparent px-0 py-0 text-left";
```

## What We Kept

✅ **Font size improvements:**

- Input fields: 16px (prevents iOS zoom)
- Model selector: 12-14px (better readability)
- Chat messages: 16px base (text-base class)
- Greeting: Improved sizing

✅ **Table styling in Response component:**

- Horizontal scroll for wide tables
- Responsive cell padding
- Border styling
- All table functionality intact

✅ **All other typography improvements:**

- Line heights
- Font sizing
- Spacing in other components

## What We Lost

❌ **Prose typography system:**

- No automatic heading styles
- No styled lists
- No blockquote styling
- No link styling
- No code block enhancements

❌ **Professional typography polish:**

- Standard line height (1.5 instead of 1.75)
- No paragraph spacing optimization
- No visual hierarchy for headings

## Current State

**Chat messages now have:**

- ✅ Correct 16px base font size
- ✅ Working table layouts
- ✅ No layout breaks
- ✅ Responsive design
- ⚠️ Basic typography (no prose enhancements)

## Why This Happened

The Tailwind Typography plugin (`@tailwindcss/typography`) has complex CSS rules for tables that include:

- Display properties
- Width calculations
- Border collapse
- Cell spacing

Our custom overrides inadvertently broke these carefully balanced rules, causing the table display to fail.

## Lessons Learned

1. **Don't override prose internals** - The typography plugin is complex
2. **Test with tables** - Always test with complex content
3. **Use browser dev tools** - Check computed styles when CSS breaks
4. **Simpler is better** - Basic styling is more reliable

## Alternative Approaches (Future)

If we want better typography without breaking tables:

### Option 1: Targeted Prose (Recommended)

Only apply prose to specific elements, not the whole container:

```tsx
<div className="[&_p]:leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold">
  {content}
</div>
```

### Option 2: Custom Typography System

Build our own typography without using prose:

```css
.chat-message p {
  line-height: 1.75;
  margin: 0.75em 0;
}
.chat-message h1 {
  font-size: 1.5em;
  font-weight: bold;
}
```

### Option 3: Prose with Table Exception

Use prose but explicitly preserve table styles:

```tsx
className = "prose prose-sm [&_table]:not-prose";
```

### Option 4: Use Default Prose

Don't customize, use prose as-is:

```tsx
className = "prose prose-sm dark:prose-invert";
```

## Recommendation

**Keep current simple implementation** until we have time to properly test a typography system that doesn't break tables. The font size improvements we made are the most important for readability and mobile UX.

If better typography is needed:

1. Test thoroughly with tables
2. Use browser dev tools to inspect
3. Consider Option 1 (targeted prose) above
4. Always have a rollback plan

## Files Changed

1. `app/globals.css` - Removed custom prose CSS
2. `components/message.tsx` - Removed prose classes
3. `components/elements/response.tsx` - No changes (table styles intact)

## Testing Checklist

- [x] Tables display correctly
- [x] No column overlap
- [x] Horizontal scroll works
- [x] Mobile responsive
- [x] Dark mode works
- [x] Font sizes correct (16px base)
- [ ] Test with various table sizes
- [ ] Test with long content
- [ ] Test on actual mobile device

## Related Documents

- `FONT_SIZE_ANALYSIS.md` - Original font size analysis
- `PROSE_CLASS_IMPLEMENTATION.md` - Initial prose implementation
- `PROSE_SPACING_ADJUSTMENT.md` - Custom spacing (now removed)
- `TABLE_RENDERING_EXPLANATION.md` - Table rendering details
