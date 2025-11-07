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

### 4. Suggested Actions Collapse

Added keyboard detection in `components/suggested-actions.tsx` that collapses the suggested actions when the keyboard appears, freeing up space for the hero text:

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

## V2 Improvements (Collapse & Scroll)

### Issues Fixed:

1. **Empty space after fade** - Suggested actions now collapse completely (height: 0) instead of just fading out
2. **Hero text doesn't move** - Greeting component now detects keyboard and scrolls into view
3. **Inconsistent scroll** - Multiple scroll attempts at different timings to handle keyboard animation

### Changes:

**Suggested Actions (`components/suggested-actions.tsx`):**

- Changed from opacity-only fade to full height collapse
- Animates `height: 0`, `marginBottom: 0`, and `overflow: hidden`
- Duration increased to 0.3s with easeInOut for smoother transition
- Space is now reclaimed, allowing content to move up

**Greeting (`components/greeting.tsx`):**

- Now client component with keyboard detection
- Scrolls itself into view when keyboard appears
- Reduces top margin when keyboard is visible
- Uses `scrollIntoView({ block: "start" })` for better positioning

**Multimodal Input (`components/multimodal-input.tsx`):**

- Multiple scroll attempts (immediate, 100ms, 300ms, 500ms) to catch keyboard animation
- Changed to `block: "nearest"` for more natural scrolling
- Cleans up timeouts on blur to prevent memory leaks

## V3 Improvements (Keyboard Height Detection)

### Issue Fixed:

Textarea was being hidden behind the keyboard instead of staying above it.

### Solution:

Created a custom hook `useKeyboardHeight` that uses the Visual Viewport API to calculate the exact keyboard height in real-time.

**New Hook** (`hooks/use-keyboard-height.ts`):

```typescript
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const height = Math.max(0, windowHeight - viewportHeight);
        setKeyboardHeight(height);
      }
    };
    // ...
  }, []);

  return keyboardHeight;
}
```

**Chat Component** (`components/chat.tsx`):

- Uses `keyboardHeight` hook
- Dynamically sets `bottom` style based on keyboard height
- Smooth transition with `duration-200 ease-out`

```tsx
<div
  style={{
    bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : "0px",
  }}
>
```

**Artifact Component** (`components/artifact.tsx`):

- Uses `keyboardHeight` hook
- Adjusts `paddingBottom` to push content above keyboard
- Adds base padding (16px) plus keyboard height

```tsx
<div
  style={{
    paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : "16px",
  }}
>
```

### Benefits:

1. **Precise positioning**: Uses actual keyboard height, not estimates
2. **Always visible**: Input stays above keyboard on all devices
3. **Smooth transitions**: 200ms ease-out animation
4. **Hero text preserved**: Greeting stays visible while input moves up
5. **Works everywhere**: Both main chat and artifact chat interfaces

### How It Works:

1. Visual Viewport API detects when keyboard appears
2. Calculates keyboard height: `windowHeight - viewportHeight`
3. Applies height as inline style to input container
4. Container smoothly transitions to new position
5. Input is always visible above keyboard
