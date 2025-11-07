# Animation Timing Optimization

## Research-Based Timing

Based on UX research from Nielsen Norman Group and industry best practices:

- **100-200ms**: Micro-interactions (hover effects, button clicks)
- **200-300ms**: Standard UI transitions (optimal sweet spot)
- **300-500ms**: Large element movements
- **500ms+**: Feels sluggish and annoying to users

## Changes Applied

### Auth Pages

Updated all auth pages from `duration-300` (300ms) to `duration-200` (200ms) with `ease-out`:

- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(auth)/verify/page.tsx`
- `app/(auth)/verify-pending/page.tsx`

**Before:**

```tsx
className = "transition-all duration-300";
```

**After:**

```tsx
className = "transition-all duration-200 ease-out";
```

### Chat Interface Components

**Suggested Actions** (`components/suggested-actions.tsx`):

- Changed from `duration: 0.3` to `duration: 0.25`
- Changed from `ease: "easeInOut"` to `ease: "easeOut"`

**Greeting** (`components/greeting.tsx`):

- Changed from `duration: 0.3` to `duration: 0.25`
- Changed from `ease: "easeInOut"` to `ease: "easeOut"`

## Easing Functions

- **ease-out**: Starts fast, ends slow - best for elements entering the viewport or moving into final position
- **ease-in**: Starts slow, ends fast - best for elements exiting
- **ease-in-out**: Slow start and end - best for continuous loops or back-and-forth motion

We use `ease-out` because our animations are primarily elements moving into their final positions (keyboard appearing, content adjusting).

## Benefits

1. **Snappier feel**: 200-250ms feels more responsive than 300ms
2. **Better perceived performance**: Users perceive the app as faster
3. **Less waiting**: Animations complete before users get impatient
4. **Natural motion**: ease-out mimics real-world physics (deceleration)

## Sources

- Nielsen Norman Group: "Executing UX Animations: Duration and Motion Characteristics"
- Josh Comeau: "An Interactive Guide to CSS Transitions"
- Parachute Design: "3 UX Animation Best Practices"
- UX Stack Exchange: "Optimal duration for animating transitions"
