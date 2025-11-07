# Mobile Keyboard Fix

## Problem

On mobile devices, when tapping the textbox input, the virtual keyboard would rise up and cover the input field, making it impossible to see what you're typing. Additionally, the suggested actions remained visible while the hero text ("Welcome, Counsel...") scrolled out of view.

## Solution

Implemented a comprehensive fix with multiple parts:

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

### 4. Suggested Actions Fade-Out

Added keyboard detection in `components/suggested-actions.tsx` that fades out the suggested actions when the keyboard appears, prioritizing the hero text visibility:

```typescript
const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

useEffect(() => {
  const handleResize = () => {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const windowHeight = window.innerHeight;
    const heightDiff = windowHeight - viewportHeight;

    // If height difference is more than 150px, assume keyboard is visible
    setIsKeyboardVisible(heightDiff > 150);
  };

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleResize);
    window.visualViewport.addEventListener("scroll", handleResize);
  }
  // ...
}, []);
```

The suggested actions container now animates opacity and pointer events based on keyboard visibility:

```typescript
<motion.div
  animate={{
    opacity: isKeyboardVisible ? 0 : 1,
    y: isKeyboardVisible ? 20 : 0,
    pointerEvents: isKeyboardVisible ? "none" : "auto"
  }}
  transition={{ duration: 0.2 }}
>
```

### 5. Gradient Fade for Input Container

Added a gradient background to the mobile input container to create a smooth visual transition:

```css
.mobile-input-container {
  background: linear-gradient(to top, var(--background) 70%, transparent);
  padding-top: 1rem;
}
```

### 6. Greeting Scroll Margin

Added `scrollMarginTop` to the greeting component to ensure proper spacing when scrolling:

```typescript
<div style={{ scrollMarginTop: "2rem" }}>
```

## Auth Pages Centering

Applied the same keyboard detection logic to all auth pages with form inputs:

### Pages Updated:

- `app/(auth)/login/page.tsx` - Login form
- `app/(auth)/register/page.tsx` - Registration form
- `app/(auth)/verify/page.tsx` - Email verification status
- `app/(auth)/verify-pending/page.tsx` - Verification pending with resend option

### Behavior:

- On mobile without keyboard: Content is vertically centered (`justify-center`)
- On mobile with keyboard: Content moves to top with minimal padding (`justify-start pt-4`)
- On desktop: Always positioned at top (`md:justify-start md:pt-16`)
- Logo margin adjusts dynamically based on keyboard state (`mb-12` → `mb-4`)
- Smooth transitions with `transition-all duration-300`

### Pages Not Modified:

- `app/(auth)/checkout/page.tsx` - Uses full-page layout with header
- `app/(auth)/pricing/page.tsx` - Uses full-page layout with header
- `app/(auth)/payment/status/page.tsx` - Uses full-page layout with header
- `app/(auth)/payment/setup/page.tsx` - Uses full-page layout with header

These pages already have proper layouts and don't need the centering behavior.

## Testing

### Chat Interface

Test on mobile devices by:

1. Opening the app on a mobile browser
2. Observe the hero text ("Welcome, Counsel...") and suggested actions
3. Tap the input textbox
4. Verify:
   - The suggested actions fade out smoothly
   - The hero text remains visible in the viewport
   - The input scrolls into view and remains visible above the keyboard
   - The input container has a gradient fade effect
5. Type some text to ensure it's visible while typing
6. Dismiss the keyboard and verify suggested actions fade back in

### Auth Pages

Test login/register pages on mobile:

1. Open login or register page on mobile
2. Verify content is vertically centered on the screen
3. Tap an input field (email or password)
4. Verify:
   - Content smoothly transitions to top of screen
   - Logo margin reduces to save space
   - All form fields remain accessible
   - No content is cut off
5. Dismiss keyboard and verify content returns to center

## Browser Support

- `dvh` units are supported in all modern mobile browsers (iOS Safari 15.4+, Chrome 108+)
- Visual Viewport API is supported in all modern browsers (iOS Safari 13+, Chrome 61+)
- Graceful fallback for older browsers (they'll use the original sticky positioning without the fade effects)
