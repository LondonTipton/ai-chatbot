# Session Configuration and Persistence

This document describes how session management is configured for persistent login in DeepCounsel.

## Overview

The application uses Appwrite's built-in session management with automatic session refresh to maintain continuous authentication. Sessions are configured to last 30 days and are automatically refreshed when they approach expiration.

## Session Duration

### Appwrite Configuration

Session duration is controlled by Appwrite and must be configured in the Appwrite Console:

1. Go to your Appwrite project in the [Appwrite Console](https://cloud.appwrite.io/)
2. Navigate to **Settings > Security**
3. Set **Session Length** to **2592000 seconds** (30 days)
4. Save the configuration

**Note:** The default Appwrite session length is 365 days, which already exceeds our 30-day requirement.

### Application Configuration

The application is configured to work with 30-day sessions:

- **Session Cookie Duration**: 30 days (`lib/appwrite/session.ts`)
- **Session Refresh Threshold**: 1 day before expiration
- **Session Check Interval**: Every 5 minutes (client-side)

## Session Refresh Mechanism

### How It Works

Appwrite automatically extends session expiration when the session is accessed. Our application implements automatic refresh in three places:

1. **Middleware** (`middleware.ts`):

   - Validates sessions on every request
   - Refreshes sessions that expire in less than 1 day
   - Caches session data for 5 minutes to reduce API calls

2. **Auth Provider** (`components/providers/auth-provider.tsx`):

   - Checks session every 5 minutes
   - Refreshes sessions that expire in less than 1 day
   - Refreshes on tab visibility change (when user returns to tab)

3. **Server-Side** (`lib/appwrite/session.ts`):
   - Provides utilities for session validation and refresh
   - Used by API routes and server actions

### Refresh Threshold

Sessions are refreshed when they have less than **1 day (24 hours)** remaining before expiration. This ensures:

- Continuous authentication for active users
- Minimal API calls (only when needed)
- Seamless user experience without interruptions

## Session Persistence

### Browser Restart

Sessions persist across browser restarts because:

1. **HTTP-Only Cookies**: Session tokens are stored in HTTP-only cookies that survive browser restarts
2. **Long Duration**: 30-day expiration ensures sessions remain valid
3. **Automatic Validation**: Middleware validates sessions on every request

### Testing Persistence

To test session persistence:

1. Log in to the application
2. Close the browser completely (not just the tab)
3. Reopen the browser and navigate to the application
4. You should be automatically logged in without entering credentials

You can also run the test script:

```bash
npx tsx scripts/test-session-persistence.ts
```

## Session Security

### Cookie Configuration

Session cookies are configured with security best practices:

- **HTTP-Only**: Prevents JavaScript access (XSS protection)
- **Secure**: HTTPS-only in production
- **SameSite=Strict**: Prevents CSRF attacks
- **Path=/**: Available to entire application

### Session Validation

Every request validates the session:

1. Extract session cookie from request
2. Validate with Appwrite API
3. Check expiration and refresh if needed
4. Cache valid sessions for 5 minutes

Invalid or expired sessions result in redirect to login page.

## Troubleshooting

### Session Not Persisting

If sessions don't persist across browser restarts:

1. **Check Cookie Settings**: Ensure cookies are enabled in browser
2. **Check HTTPS**: Secure cookies require HTTPS in production
3. **Check Appwrite Configuration**: Verify session length in Appwrite Console
4. **Check Browser Privacy Settings**: Some privacy modes block persistent cookies

### Session Expiring Too Soon

If sessions expire before 30 days:

1. **Check Appwrite Session Length**: Verify it's set to at least 2592000 seconds (30 days)
2. **Check Refresh Logic**: Ensure refresh threshold is working (1 day before expiration)
3. **Check Browser Activity**: Sessions only refresh when application is accessed

### Session Not Refreshing

If sessions aren't refreshing automatically:

1. **Check Console Logs**: Look for refresh messages in browser console
2. **Check Network Tab**: Verify API calls to Appwrite
3. **Check Middleware**: Ensure middleware is running on protected routes
4. **Check Auth Provider**: Verify refresh interval is active

## Implementation Details

### Key Files

- `lib/appwrite/session.ts` - Session utilities and configuration
- `lib/appwrite/auth.ts` - Authentication functions including session refresh
- `middleware.ts` - Request-level session validation and refresh
- `components/providers/auth-provider.tsx` - Client-side session management

### Session Flow

```
User logs in
    ↓
Appwrite creates session (30 days)
    ↓
Session cookie stored in browser
    ↓
Every request:
    - Middleware validates session
    - If < 1 day remaining → refresh
    ↓
Every 5 minutes (client-side):
    - Auth provider checks session
    - If < 1 day remaining → refresh
    ↓
User closes browser
    ↓
Session cookie persists
    ↓
User reopens browser
    ↓
Middleware validates session
    ↓
User automatically logged in
```

## Configuration Reference

### Environment Variables

Required for session management:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
```

### Constants

```typescript
// Session cookie duration
SESSION_COOKIE_OPTIONS.maxAge = 60 * 60 * 24 * 30; // 30 days

// Session refresh threshold
SESSION_REFRESH_THRESHOLD = 60 * 60 * 24; // 1 day (server-side)
SESSION_REFRESH_THRESHOLD = 24 * 60 * 60 * 1000; // 1 day (client-side)

// Session check interval
SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Session cache duration
CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
```

## Best Practices

1. **Always Use HTTPS in Production**: Required for secure cookies
2. **Monitor Session Refresh**: Check logs for refresh activity
3. **Test Across Browsers**: Different browsers handle cookies differently
4. **Handle Expired Sessions Gracefully**: Redirect to login with clear messaging
5. **Keep Appwrite SDK Updated**: Ensure compatibility with latest features

## Future Enhancements

Potential improvements to session management:

1. **Configurable Session Duration**: Allow users to choose session length
2. **Remember Me Option**: Shorter sessions (7 days) vs longer (30 days)
3. **Session Management UI**: Show active sessions and allow revocation
4. **Session Activity Tracking**: Log session access for security auditing
5. **Multi-Device Session Limits**: Limit number of concurrent sessions
