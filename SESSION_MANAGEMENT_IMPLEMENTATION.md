# Session Management and Persistence Implementation

## Overview

This document describes the implementation of session cookie management and persistence logic for the Appwrite authentication migration (Task 10).

## Implemented Features

### 1. Session Cookie Management (Task 10.1)

Created `lib/appwrite/session.ts` with centralized session cookie utilities:

#### Cookie Configuration

- **Cookie Name**: `appwrite-session`
- **Security Options**:
  - `httpOnly: true` - Prevents JavaScript access to cookies
  - `secure: true` (production only) - HTTPS-only transmission
  - `sameSite: 'strict'` - CSRF protection
  - `maxAge: 7 days` - Session duration
  - `path: '/'` - Available across entire application

#### Utility Functions

- `setSessionCookie(sessionId)` - Set session cookie with security options
- `getSessionCookie()` - Retrieve current session cookie value
- `clearSessionCookie()` - Remove session cookie
- `shouldRefreshSession(session)` - Check if session needs refresh (< 1 day remaining)
- `refreshSessionIfNeeded(sessionId)` - Automatically refresh expiring sessions
- `validateAndRefreshSession()` - Validate and refresh session in one call

#### Session Refresh Logic

- Sessions are refreshed when less than 1 day remains until expiration
- Automatic retry with exponential backoff for network failures
- Cookie is updated if session ID changes after refresh
- Invalid/expired sessions automatically clear cookies

### 2. Session Persistence Logic (Task 10.2)

Updated `components/providers/auth-provider.tsx` with comprehensive session persistence:

#### Session Restoration

- Automatically restores session on app load
- Fetches user and session data from Appwrite
- Handles expired sessions gracefully by clearing state

#### Automatic Session Refresh

- **Check Interval**: Every 5 minutes
- **Refresh Threshold**: When less than 24 hours remain
- Background refresh prevents session expiration during active use
- Refresh interval is cleared on logout or unmount

#### Visibility-Based Refresh

- Monitors tab visibility changes
- Automatically checks session when tab becomes active
- Ensures session validity after user returns to app

#### Enhanced Middleware

Updated `middleware.ts` to support session persistence:

- Validates session and retrieves full session object
- Checks session expiration and logs warnings
- Caches session validation results (5 minutes)
- Attaches session ID to request headers for downstream use

### 3. Updated Components

#### Server Actions (`app/(auth)/actions.ts`)

- Replaced inline cookie management with utility functions
- Consistent cookie handling across login, register, logout, and upgrade
- Simplified code and improved maintainability

#### Guest Session Route (`app/api/auth/guest/route.ts`)

- Uses centralized session cookie utilities
- Consistent with other authentication flows

## Security Features

### Cookie Security

- HTTP-only cookies prevent XSS attacks
- Secure flag ensures HTTPS-only transmission in production
- SameSite strict prevents CSRF attacks
- 7-day expiration balances security and convenience

### Session Validation

- Server-side validation in middleware
- Client-side validation in AuthProvider
- Automatic cleanup of invalid sessions
- Retry logic for transient network failures

### Session Refresh

- Proactive refresh before expiration
- Prevents user disruption from expired sessions
- Handles refresh failures gracefully
- Clears invalid sessions automatically

## Performance Optimizations

### Caching

- Middleware caches session validation (5 minutes)
- Reduces Appwrite API calls
- Improves response times for protected routes

### Efficient Refresh

- Only refreshes when threshold is reached
- Background refresh doesn't block user interactions
- Visibility-based refresh reduces unnecessary checks

### Cleanup

- Intervals are properly cleaned up on unmount
- Prevents memory leaks
- Removes event listeners on cleanup

## User Experience Improvements

### Seamless Authentication

- Sessions persist across browser sessions
- Automatic refresh prevents unexpected logouts
- Tab switching doesn't interrupt sessions

### Error Handling

- Graceful handling of expired sessions
- Automatic fallback to guest sessions
- Clear error messages for users

### Performance

- Fast session validation with caching
- Non-blocking background refresh
- Minimal impact on page load times

## Testing Recommendations

### Manual Testing

1. Login and verify session persists after browser restart
2. Leave app idle for 6 days and verify automatic refresh
3. Switch tabs and verify session remains valid
4. Test logout clears session properly
5. Test expired session handling

### Automated Testing

1. Unit tests for session utility functions
2. Integration tests for session refresh logic
3. E2E tests for session persistence across page reloads
4. Test session expiration and automatic cleanup

## Requirements Satisfied

### Requirement 7.1

✅ Session cookie configured with appropriate expiration time (7 days)

### Requirement 7.2

✅ Session restored from cookie when browser reopens

### Requirement 7.3

✅ Automatic session refresh before expiration (< 1 day threshold)

### Requirement 7.4

✅ New anonymous session created when restoration fails

### Requirement 9.1

✅ Credentials transmitted over HTTPS only (secure flag in production)

## Next Steps

The session management implementation is complete. The next tasks in the migration are:

- Task 11: Remove NextAuth dependencies and cleanup
- Task 12: Testing and validation

## Files Modified

1. `lib/appwrite/session.ts` (new)
2. `app/(auth)/actions.ts`
3. `app/api/auth/guest/route.ts`
4. `components/providers/auth-provider.tsx`
5. `middleware.ts`

All files have been validated and contain no TypeScript errors.
