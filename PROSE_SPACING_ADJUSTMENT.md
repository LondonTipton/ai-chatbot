# Prose Spacing Adjustment

## Issue

The prose class provided good readability but had too much spacing between sections, making the chat feel overly spaced out.

## Solution

Added custom CSS overrides to reduce prose spacing while maintaining readability benefits.

## Changes Made

### Custom CSS Added to `app/globals.css`

```css
/* Tighter prose spacing for chat messages */
.prose-sm {
  --tw-prose-body: theme(colors.foreground);
  --tw-prose-headings: theme(colors.foreground);
  --tw-prose-links: theme(colors.primary);
  --tw-prose-bold: theme(colors.foreground);
  --tw-prose-code: theme(colors.foreground);
  --tw-prose-pre-bg: theme(colors.muted);
}

/* Reduce paragraph spacing */
.prose-sm p {
  margin-top: 0.75em; /* was 1.25em */
  margin-bottom: 0.75em; /* was 1.25em */
}

/* Reduce heading spacing */
.prose-sm h1,
.prose-sm h2,
.prose-sm h3,
.prose-sm h4 {
  margin-top: 1em; /* was 1.5-2em */
  margin-bottom: 0.5em; /* was 0.75-1em */
}

/* Reduce list spacing */
.prose-sm ul,
.prose-sm ol {
  margin-top: 0.75em; /* was 1.25em */
  margin-bottom: 0.75em; /* was 1.25em */
}

.prose-sm li {
  margin-top: 0.25em; /* was 0.5em */
  margin-bottom: 0.25em; /* was 0.5em */
}

/* Reduce code block spacing */
.prose-sm pre {
  margin-top: 0.75em; /* was 1.5em */
  margin-bottom: 0.75em; /* was 1.5em */
}

/* Reduce blockquote spacing */
.prose-sm blockquote {
  margin-top: 0.75em; /* was 1.5em */
  margin-bottom: 0.75em; /* was 1.5em */
}
```

## Spacing Comparison

| Element           | Default Prose | Adjusted | Reduction |
| ----------------- | ------------- | -------- | --------- |
| Paragraphs        | 1.25em        | 0.75em   | 40% less  |
| Headings (top)    | 1.5-2em       | 1em      | ~40% less |
| Headings (bottom) | 0.75-1em      | 0.5em    | ~33% less |
| Lists             | 1.25em        | 0.75em   | 40% less  |
| List items        | 0.5em         | 0.25em   | 50% less  |
| Code blocks       | 1.5em         | 0.75em   | 50% less  |
| Blockquotes       | 1.5em         | 0.75em   | 50% less  |

## What's Preserved

✅ **Line height** - Still 1.75 for better readability
✅ **Font sizes** - All heading and text sizes unchanged
✅ **Typography styles** - Bold, italic, links, code styling
✅ **Visual hierarchy** - Headings still stand out
✅ **Dark mode** - All color variables work in dark mode

## What's Improved

✅ **More compact** - 40-50% less vertical spacing
✅ **Better for chat** - Feels more conversational
✅ **Faster scanning** - Less scrolling needed
✅ **Still readable** - Maintains good line height and typography
✅ **Professional** - Keeps the polished look

## Visual Impact

**Before (Default Prose):**

- Very generous spacing
- Felt like a document/article
- Required more scrolling
- Good for long-form reading

**After (Adjusted Prose):**

- Tighter, chat-appropriate spacing
- Feels more conversational
- Less scrolling required
- Still maintains readability benefits

## Testing

Test these scenarios:

- [ ] Short responses (1-2 paragraphs)
- [ ] Long responses with multiple sections
- [ ] Responses with headings (H1, H2, H3)
- [ ] Responses with lists (bullets and numbered)
- [ ] Responses with code blocks
- [ ] Responses with blockquotes
- [ ] Mixed content (headings + lists + code)
- [ ] Dark mode appearance
- [ ] Mobile view

## Fine-tuning Options

If spacing still needs adjustment, modify these values in `app/globals.css`:

**Make even tighter:**

```css
.prose-sm p {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}
```

**Make slightly looser:**

```css
.prose-sm p {
  margin-top: 1em;
  margin-bottom: 1em;
}
```

## Rollback

To revert to default prose spacing, remove the custom CSS rules from `app/globals.css` (lines added in this change).

## Related Files

- `app/globals.css` - Custom prose spacing rules
- `components/message.tsx` - Uses prose-sm class
- `PROSE_CLASS_IMPLEMENTATION.md` - Original prose implementation
- `FONT_SIZE_ANALYSIS.md` - Typography analysis

## Notes

- These overrides only affect `.prose-sm` class used in chat
- Document artifacts still use default prose spacing
- Can be further customized per element type
- All spacing uses `em` units for scalability
