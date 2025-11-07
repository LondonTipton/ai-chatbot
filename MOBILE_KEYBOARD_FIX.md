# Mobile Keyboard Fix

## Problem

On mobile devices, when tapping the textbox input, the virtual keyboard would rise up and cover the input field, making it impossible to see what you're typing.

## Solution

Implemented a three-part fix:

### 1. Auto-scroll on Focus

Added a focus event listener in `components/multimodal-input.tsx` that automatically scrolls the textarea into view when the keyboard appears:

```typescript
useEffect(() => {
  const handleFocus = () => {
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 300); // Delay to allow keyboard animation
  };

  const textarea = textareaRef.current;
  textarea?.addEventListener("focus", handleFocus);

  return () => {
    textarea?.removeEventListener("focus", handleFocus);
  };
}, []);
```

### 2. Dynamic Viewport Height

Updated `app/globals.css` to use `dvh` (dynamic viewport height) units instead of regular viewport units. This accounts for mobile browser chrome and keyboard:

```css
html {
  height: 100dvh;
}

body {
  min-height: 100dvh;
}
```

### 3. Mobile Input Container

Added a new CSS class `.mobile-input-container` that uses `position: fixed` on mobile devices to ensure the input stays at the bottom of the visible viewport:

```css
@supports (height: 100dvh) {
  @media (max-width: 768px) {
    .mobile-input-container {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 50;
    }
  }
}
```

Applied this class to both:

- `components/chat.tsx` - Main chat input container
- `components/artifact.tsx` - Artifact chat input container

## Testing

Test on mobile devices by:

1. Opening the app on a mobile browser
2. Tapping the input textbox
3. Verify the input scrolls into view and remains visible above the keyboard
4. Type some text to ensure it's visible while typing

## Browser Support

- `dvh` units are supported in all modern mobile browsers (iOS Safari 15.4+, Chrome 108+)
- Graceful fallback for older browsers (they'll use the original sticky positioning)
