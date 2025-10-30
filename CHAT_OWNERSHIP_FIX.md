# Chat Ownership & Access Fix

## Problem

Users were experiencing issues accessing their own chat history:

1. Clicking on old chats redirected to home page instead of opening the chat
2. Refreshing mid-conversation showed "This chat belongs to another user" error
3. Users were being logged out or denied access to their own chats

## Root Cause

The issue was caused by a mismatch between user IDs:

1. **Session User ID**: The `session.user.id` contains the Appwrite user ID
2. **Database User Records**: Older user records didn't have the `appwriteId` field populated
3. **Chat Ownership Check**: The code tried to look up users by Appwrite ID, but couldn't find them

This happened because:

- Users created before the Appwrite migration don't have `appwriteId` stored
- The lookup `getUserByAppwriteId()` returned `null` for these users
- The ownership check failed, denying access to their own chats

## Solutions Applied

### 1. Auto-Sync Appwrite ID on Login

Updated `app/(auth)/actions.ts` to automatically sync the Appwrite ID when users log in:

```typescript
// Check if user exists in local database and sync Appwrite ID if needed
const [dbUser] = await getUser(validatedData.email);
if (dbUser && !dbUser.appwriteId) {
  console.log("[LOGIN] User exists but missing Appwrite ID, syncing");
  await updateUserAppwriteId(dbUser.id, session.userId);
} else if (!dbUser) {
  // User doesn't exist in database yet, create them
  await createUserWithAppwriteId(validatedData.email, session.userId);
}
```

**Benefits**:

- Existing users get their Appwrite ID synced automatically on next login
- New users get Appwrite ID stored during registration
- No manual database migration needed

### 2. Fallback Ownership Check

Updated `app/(chat)/chat/[id]/page.tsx` to handle both scenarios:

```typescript
// Try to find the database user by Appwrite ID
const dbUser = await getUserByAppwriteId(session.user.id);

// If we can't find the user by Appwrite ID, check if the session user ID
// directly matches the chat's user ID (for backward compatibility)
const isOwner = dbUser
  ? dbUser.id === chat.userId
  : session.user.id === chat.userId;

if (!isOwner) {
  return notFound();
}
```

**Benefits**:

- Works for users with Appwrite ID synced (preferred method)
- Falls back to direct ID comparison for edge cases
- Provides better error logging for debugging

### 3. Improved Readonly Detection

Fixed the readonly check to use the same logic:

```typescript
const dbUser = session?.user?.id
  ? await getUserByAppwriteId(session.user.id)
  : null;

const isOwner = dbUser
  ? dbUser.id === chat.userId
  : session?.user?.id === chat.userId;

const isReadonly = !isOwner;
```

## How It Works Now

### First Login After Fix

1. User logs in with email/password
2. System checks if user exists in database
3. If user exists but has no `appwriteId`, it syncs it automatically
4. Session cookie is set
5. User can now access all their chats

### Accessing Chat History

1. User clicks on a chat in the sidebar
2. System looks up database user by Appwrite ID
3. If found, compares database UUID with chat's userId
4. If not found, falls back to direct ID comparison
5. If ownership matches, chat opens successfully
6. If not, returns 404

### Mid-Conversation Refresh

1. User refreshes the page while in a chat
2. Middleware validates session cookie
3. Chat page checks ownership using the same logic
4. Chat loads successfully without errors

## Testing

### Test Case 1: Existing User (No Appwrite ID)

1. User logs in
2. ✅ Appwrite ID is synced automatically
3. User clicks on old chat
4. ✅ Chat opens successfully

### Test Case 2: New User

1. User registers
2. ✅ Appwrite ID is stored during registration
3. User creates a chat
4. ✅ Chat is associated with correct user ID
5. User logs out and back in
6. ✅ Can access their chat history

### Test Case 3: Mid-Conversation Refresh

1. User is chatting
2. User refreshes the page
3. ✅ Session is validated
4. ✅ Ownership check passes
5. ✅ Chat continues without errors

## Files Modified

1. `app/(auth)/actions.ts` - Added auto-sync of Appwrite ID on login
2. `app/(chat)/chat/[id]/page.tsx` - Improved ownership check with fallback

## Database Schema

The `User` table has these relevant fields:

- `id` (UUID) - Database user ID (used in chat.userId)
- `appwriteId` (VARCHAR) - Appwrite user ID (from session)
- `email` (VARCHAR) - User's email address

## Migration Path

No manual migration needed! The auto-sync on login will gradually update all users:

- Users log in → Appwrite ID is synced
- After a few days, most active users will be synced
- Inactive users will be synced when they return

## Monitoring

Check server logs for these messages:

```
[LOGIN] User exists but missing Appwrite ID, syncing: <appwriteId>
[Chat Access Denied] User <userId> attempted to access chat <chatId> owned by <ownerId>
```

The first message indicates successful syncing.
The second message indicates a genuine access denial (not an error).
