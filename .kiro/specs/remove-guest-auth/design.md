# Design Document

## Overview

This design removes all guest user functionality from DeepCounsel and implements a mandatory authentication flow with persistent sessions. The application will redirect unauthenticated users to the login page and automatically authenticate returning users using Appwrite's built-in session cookies.

The design leverages Appwrite's existing session management capabilities, which already provide HTTP-only secure cookies with configurable expiration times. We will remove all anonymous session creation logic and update the middleware to enforce authentication on all protected routes.

## Architecture

### High-Level Flow

```
User visits app
    ↓
Middleware checks for Appwrite session cookie
    ↓
    ├─ Valid session exists → Allow access to chat
    │                          └─ Auto-refresh if expiring soon
    │
    └─ No valid session → Redirect to /login
                          ↓
                          User logs in or registers
                          ↓
                          Appwrite creates session cookie
                          ↓
                          Redirect to chat interface
```

### Session Management Strategy

Appwrite automatically manages session cookies with the naming convention `a_session_{projectId}`. These cookies are:

- HTTP-only (not accessible via JavaScript)
- Secure (HTTPS only in production)
- SameSite=Strict (CSRF protection)
- Long-lived (configurable, default 365 days)

We will leverage this existing infrastructure and remove our custom session cookie management where it duplicates Appwrite's functionality.

## Components and Interfaces

### 1. Middleware (`middleware.ts`)

**Current State:**

- Validates sessions but allows unauthenticated access
- Creates guest sessions via redirect to `/api/auth/guest`
- Checks for anonymous users and handles them specially

**Changes Required:**

- Remove guest session creation logic
- Remove `isAnonymousUser()` function and related checks
- Redirect unauthenticated users to `/login` with return URL
- Keep session validation and refresh logic
- Simplify logic since all users will be authenticated

**New Flow:**

```typescript
1. Extract Appwrite session cookie
2. If no cookie → redirect to /login?returnUrl={currentPath}
3. If cookie exists → validate with Appwrite
4. If validation fails → redirect to /login
5. If validation succeeds:
   - Check if session needs refresh (< 1 day remaining)
   - If needs refresh → call Appwrite to refresh
   - Attach user context to headers
   - Allow request to proceed
```

### 2. Auth Provider (`components/providers/auth-provider.tsx`)

**Current State:**

- Manages user and session state
- Provides login, register, logout methods
- Handles session refresh
- Tracks anonymous users

**Changes Required:**

- Remove `isAnonymous` property and logic
- Remove any guest user upgrade functionality
- Simplify state management (all users are authenticated)
- Keep session refresh interval (5 minutes)
- Keep visibility change handler for session refresh

**Interface (Updated):**

```typescript
interface AuthContextValue {
  user: Models.User<Models.Preferences> | null;
  session: Models.Session | null;
  isLoading: boolean;
  // isAnonymous removed
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

### 3. Auth Library (`lib/appwrite/auth.ts`)

**Current State:**

- Provides functions for account creation, login, logout
- Includes `createAnonymousSession()` for guest users
- Includes `upgradeAnonymousToAccount()` for guest upgrades
- Includes `isAnonymousSession()` helper

**Changes Required:**

- Remove `createAnonymousSession()` function
- Remove `upgradeAnonymousToAccount()` function
- Remove `isAnonymousSession()` function
- Keep all other authentication functions
- Update session refresh to use longer expiration (30 days)

### 4. Session Management (`lib/appwrite/session.ts`)

**Current State:**

- Manages custom session cookies
- Provides session refresh logic
- Validates and refreshes sessions

**Changes Required:**

- Remove custom `SESSION_COOKIE_NAME` constant (use Appwrite's cookie)
- Update `SESSION_COOKIE_OPTIONS` to extend session duration to 30 days
- Keep session refresh threshold (1 day before expiration)
- Keep `refreshSessionIfNeeded()` logic
- Update cookie operations to work with Appwrite's cookie name format

### 5. API Routes

**Routes to Remove:**

- `/app/api/auth/guest/route.ts` - Guest session creation endpoint

**Routes to Keep:**

- All other auth routes (login, register, reset-password)

### 6. Components to Remove

**Files to Delete:**

- `components/guest-upgrade-prompt.tsx` - Guest upgrade UI
- `app/(chat)/ensure-session.tsx` - Guest session creation guard

**Components to Update:**

- `components/app-sidebar.tsx` - Remove guest-related UI
- `components/sidebar-user-nav.tsx` - Remove guest upgrade button
- `components/sidebar-history.tsx` - Remove guest-specific logic

### 7. Login/Register Pages

**Current State:**

- Login and register pages exist at `/app/(auth)/login` and `/app/(auth)/register`
- Pages use auth actions from `app/(auth)/actions.ts`

**Changes Required:**

- Update login page to handle `returnUrl` query parameter
- Redirect to `returnUrl` after successful login (default to `/`)
- Add "Remember Me" checkbox (optional - Appwrite sessions are long-lived by default)
- Ensure proper error handling and user feedback
- Keep existing form validation and UI

### 8. Database Queries (`lib/db/queries.ts`)

**Current State:**

- Includes `createGuestUser()` function
- May have guest-specific user queries

**Changes Required:**

- Remove `createGuestUser()` function
- Update user queries to remove guest-specific logic
- Ensure all queries expect authenticated users with valid Appwrite IDs

## Data Models

### User Model (No Changes Required)

The existing user model in the database already supports authenticated users. We simply remove guest user creation:

```typescript
// Remove this function
export async function createGuestUser(appwriteId: string) { ... }

// Keep existing user functions
export async function getUser(id: string) { ... }
export async function getUserByAppwriteId(appwriteId: string) { ... }
```

### Session Model (Managed by Appwrite)

Appwrite manages sessions internally. We only interact with session data through the Appwrite SDK:

```typescript
interface Models.Session {
  $id: string;
  userId: string;
  provider: string; // Will always be "email" after removing anonymous
  expire: string;   // ISO 8601 date string
  current: boolean;
  // ... other Appwrite session fields
}
```

## Error Handling

### Authentication Errors

**Scenario: User tries to access chat without session**

- Middleware redirects to `/login?returnUrl={path}`
- User sees login page with clear messaging
- After login, user is redirected back to original path

**Scenario: Session expires during use**

- Auth provider detects expired session during refresh interval
- Client-side redirect to `/login` with message "Your session has expired"
- User logs in again and continues

**Scenario: Network error during session validation**

- Middleware retries validation (existing retry logic)
- If all retries fail, redirect to `/login` with error message
- User can retry login

**Scenario: Invalid credentials during login**

- Login form displays error message
- User can retry or navigate to registration
- No automatic guest session creation

### Session Refresh Errors

**Scenario: Session refresh fails**

- Auth provider logs error
- Clears local session state
- Redirects to `/login`
- User must re-authenticate

## Testing Strategy

### Unit Tests

1. **Middleware Tests**

   - Test redirect to login when no session cookie exists
   - Test redirect to login when session validation fails
   - Test successful session validation and request continuation
   - Test session refresh when expiration is near
   - Test returnUrl preservation in redirects

2. **Auth Provider Tests**

   - Test login flow with valid credentials
   - Test login flow with invalid credentials
   - Test registration flow
   - Test logout flow
   - Test session refresh interval
   - Test visibility change handler

3. **Auth Library Tests**
   - Test `createAccount()` with valid data
   - Test `createEmailSession()` with valid credentials
   - Test `deleteSession()` for logout
   - Test `getCurrentUser()` with valid session
   - Test `refreshSession()` functionality

### Integration Tests

1. **Authentication Flow**

   - User visits root URL without session → redirected to login
   - User logs in → redirected to chat interface
   - User closes browser and returns → automatically logged in
   - User logs out → redirected to login page

2. **Session Persistence**

   - User logs in → session cookie is set
   - User closes browser → session cookie persists
   - User reopens browser → session is validated and user is logged in
   - Session expires → user is redirected to login

3. **Protected Routes**
   - Unauthenticated user tries to access `/chat/:id` → redirected to login
   - Authenticated user accesses `/chat/:id` → allowed
   - Authenticated user accesses `/login` → redirected to chat

### E2E Tests

1. **New User Journey**

   - Visit app → see login page
   - Click "Register" → see registration form
   - Fill form and submit → account created and logged in
   - See chat interface → can start chatting

2. **Returning User Journey**

   - Visit app with existing session → immediately see chat
   - Use app normally → session refreshes automatically
   - Close browser → session persists
   - Reopen browser → automatically logged in

3. **Session Expiration**
   - Log in → use app
   - Wait for session to expire (or mock expiration)
   - Try to interact → redirected to login
   - Log in again → return to previous state

## Migration Strategy

### Code Removal Checklist

1. Remove guest session creation:

   - Delete `/app/api/auth/guest/route.ts`
   - Delete `app/(chat)/ensure-session.tsx`
   - Remove `createAnonymousSession()` from `lib/appwrite/auth.ts`
   - Remove `upgradeAnonymousToAccount()` from `lib/appwrite/auth.ts`
   - Remove `isAnonymousSession()` from `lib/appwrite/auth.ts`

2. Remove guest UI components:

   - Delete `components/guest-upgrade-prompt.tsx`
   - Remove guest-related code from `components/app-sidebar.tsx`
   - Remove guest-related code from `components/sidebar-user-nav.tsx`
   - Remove guest-related code from `components/sidebar-history.tsx`

3. Update middleware:

   - Remove `isAnonymousUser()` function
   - Remove guest session creation redirect
   - Add redirect to login for unauthenticated users
   - Preserve returnUrl in redirect

4. Update auth provider:

   - Remove `isAnonymous` from context
   - Remove anonymous user checks
   - Simplify state management

5. Update database queries:
   - Remove `createGuestUser()` function
   - Remove guest-specific queries

### Deployment Considerations

**Existing Guest Users:**

- Existing anonymous sessions will become invalid after deployment
- Guest users will be redirected to login page
- Guest users will need to create accounts to continue
- Chat history for guest users will be lost (unless we implement a migration)

**Session Cookie Compatibility:**

- Appwrite session cookies are already in use
- No cookie migration needed
- Existing authenticated users will remain logged in

**Rollback Plan:**

- Keep deleted code in version control
- Can revert changes if issues arise
- Monitor error rates after deployment

## Security Considerations

### Session Security

1. **Cookie Security:**

   - Appwrite cookies are HTTP-only (not accessible via JavaScript)
   - Secure flag enabled in production (HTTPS only)
   - SameSite=Strict prevents CSRF attacks
   - Long expiration (30 days) balanced with refresh mechanism

2. **Session Validation:**

   - Every request validates session with Appwrite
   - Invalid sessions immediately redirect to login
   - Session refresh prevents expiration during active use

3. **Authentication Requirements:**
   - All users must have valid email and password
   - No anonymous access to chat functionality
   - Password requirements enforced by Appwrite

### Privacy Considerations

1. **User Data:**

   - All users have identifiable accounts
   - Chat history tied to authenticated users
   - Users can delete accounts and data

2. **Session Tracking:**
   - Sessions tracked by Appwrite
   - Session data includes IP address and user agent
   - Users can view and revoke sessions (future feature)

## Performance Considerations

### Session Validation

- Middleware validates sessions on every request
- Session cache (5 minutes) reduces Appwrite API calls
- Session refresh only when needed (< 1 day remaining)

### Client-Side Performance

- Auth provider checks session every 5 minutes
- Visibility change handler refreshes on tab focus
- Minimal impact on user experience

### Database Impact

- Removing guest users reduces database writes
- Fewer user records to manage
- Simpler queries without guest filtering

## Future Enhancements

1. **Social Login:**

   - Add OAuth providers (Google, GitHub, etc.)
   - Leverage Appwrite's OAuth support
   - Simplify registration process

2. **Session Management UI:**

   - Show active sessions to users
   - Allow users to revoke sessions
   - Display session details (device, location, last active)

3. **Two-Factor Authentication:**

   - Add 2FA support using Appwrite
   - Enhance security for sensitive accounts
   - Optional for users

4. **Remember Me Enhancement:**
   - Add explicit "Remember Me" checkbox
   - Shorter session duration if not checked (7 days vs 30 days)
   - User control over session persistence
