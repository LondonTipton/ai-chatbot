# Implementation Plan

- [x] 1. Set up Appwrite project and install dependencies

  - Create Appwrite project in Appwrite Cloud console
  - Enable email/password authentication in Appwrite settings
  - Configure anonymous sessions in Appwrite project
  - Install `appwrite` and `node-appwrite` packages via pnpm
  - Add Appwrite environment variables to `.env.example` and `.env.local`
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Create Appwrite client configuration utilities

  - [x] 2.1 Implement Appwrite configuration module

    - Create `lib/appwrite/config.ts` with environment variable exports
    - Implement `createAdminClient()` function for server-side operations with API key
    - Implement `createSessionClient()` function for client-side operations
    - Add TypeScript interfaces for Appwrite configuration
    - _Requirements: 1.1, 1.4, 6.1_

  - [x] 2.2 Implement authentication service layer

    - Create `lib/appwrite/auth.ts` with authentication methods
    - Implement `createAccount()` for user registration
    - Implement `createEmailSession()` for login
    - Implement `deleteSession()` for logout
    - Implement `getCurrentUser()` for fetching authenticated user
    - Implement `createAnonymousSession()` for guest users
    - Implement `upgradeAnonymousToAccount()` for guest-to-registered conversion
    - Add error handling and retry logic for network failures
    - _Requirements: 1.1, 2.1, 3.1, 3.3, 4.1, 10.2_

  - [x] 2.3 Create authentication error types and utilities

    - Create `lib/appwrite/errors.ts` with AuthErrorCode enum
    - Implement error mapping from Appwrite errors to application errors
    - Add error logging utilities with context
    - _Requirements: 10.1, 10.3, 10.5_

- [x] 3. Update database schema and queries

  - [x] 3.1 Create database migration for Appwrite integration

    - Add `appwriteId` varchar field to user table (nullable, unique)
    - Add `isGuest` boolean field to user table (default false)
    - Add `createdAt` and `updatedAt` timestamp fields if not present
    - Create database migration file in `lib/db/migrations/`
    - _Requirements: 2.2, 5.2_

  - [x] 3.2 Update database schema definitions

    - Modify `lib/db/schema.ts` to include new fields
    - Update User type export with new fields
    - Keep password field for backward compatibility during migration
    - _Requirements: 2.2, 5.2_

  - [x] 3.3 Implement updated database queries

    - Add `getUserByAppwriteId()` query function
    - Add `createUserWithAppwriteId()` function
    - Add `updateUserAppwriteId()` function
    - Add `createGuestUser()` function with Appwrite ID
    - Add `upgradeGuestUser()` function to convert guest to registered
    - Add `transferGuestChats()` function to move chat history
    - Update existing `getUser()` to support Appwrite ID lookup
    - _Requirements: 2.2, 3.2, 3.3, 5.2_

- [x] 4. Implement server actions for authentication

  - [x] 4.1 Create new registration server action

    - Update `app/(auth)/actions.ts` register function
    - Call Appwrite `createAccount()` to create user
    - Store Appwrite user ID in local database
    - Call Appwrite `createEmailSession()` to log in user
    - Set session cookie with HTTP-only, secure, and SameSite flags
    - Add Zod validation for email and password
    - Return appropriate status codes and error messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 10.1_

  - [x] 4.2 Create new login server action

    - Update `app/(auth)/actions.ts` login function
    - Call Appwrite `createEmailSession()` with credentials
    - Set session cookie with appropriate security flags
    - Handle invalid credentials with user-friendly errors
    - Implement rate limiting check
    - _Requirements: 1.1, 1.2, 1.3, 9.3, 9.4, 10.1_

  - [x] 4.3 Create logout server action

    - Implement logout function in `app/(auth)/actions.ts`
    - Call Appwrite `deleteSession()` to invalidate session
    - Clear session cookie from browser
    - _Requirements: 4.1, 4.2_

  - [x] 4.4 Create guest session server action

    - Create `app/api/auth/guest/route.ts` API route
    - Call Appwrite `createAnonymousSession()` for unauthenticated users
    - Create guest user record in local database with Appwrite ID
    - Set session cookie for guest user
    - _Requirements: 3.1, 3.2, 3.4_

- [x] 5. Update middleware for Appwrite session validation

  - [x] 5.1 Implement Appwrite session validation in middleware

    - Update `middleware.ts` to use Appwrite client SDK (Edge compatible)
    - Replace NextAuth `getToken()` with Appwrite session validation
    - Implement session cookie extraction and validation
    - Add session caching to improve performance (5-minute cache)
    - Handle missing or invalid sessions by creating anonymous session
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [x] 5.2 Update middleware route protection logic

    - Keep existing redirect logic for authenticated users on auth pages
    - Maintain guest user detection and handling
    - Update session context attachment to request
    - Ensure Edge runtime compatibility (no node-appwrite usage)
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 6. Create authentication context provider for client-side

  - [x] 6.1 Implement React authentication context

    - Create `components/providers/auth-provider.tsx`
    - Implement AuthContext with user, session, and loading states
    - Add `login()`, `register()`, `logout()` methods
    - Add `refreshUser()` method to fetch current user
    - Implement `isAnonymous` computed property
    - Use Appwrite client SDK for user operations
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 7.2_

  - [x] 6.2 Create useAuth custom hook

    - Create `hooks/use-auth.ts` hook
    - Export typed hook to access AuthContext
    - Add error handling for context usage outside provider
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [x] 6.3 Update root layout with AuthProvider

    - Modify `app/layout.tsx` to replace SessionProvider with AuthProvider
    - Wrap application with AuthProvider
    - Remove NextAuth SessionProvider import
    - _Requirements: 1.1, 2.1, 7.2_

- [x] 7. Update authentication UI components

  - [x] 7.1 Update login page

    - Modify `app/(auth)/login/page.tsx` to use new login action
    - Update error handling to display Appwrite errors
    - Ensure form validation works with new action
    - Test redirect after successful login
    - _Requirements: 1.1, 1.2, 10.1_

  - [x] 7.2 Update register page

    - Modify `app/(auth)/register/page.tsx` to use new register action
    - Update error handling for user exists scenario
    - Ensure automatic login after registration
    - Test redirect after successful registration
    - _Requirements: 2.1, 2.3, 2.4, 10.1_

  - [x] 7.3 Update sidebar user navigation

    - Modify `components/sidebar-user-nav.tsx` to use useAuth hook
    - Update logout button to call new logout action
    - Update user display to show Appwrite user data
    - Handle guest user display appropriately
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.4 Update other components using session

    - Update `components/app-sidebar.tsx` to use useAuth
    - Update `components/sidebar-history.tsx` to use useAuth
    - Update any other components importing from next-auth
    - _Requirements: 1.4, 7.2_

- [x] 8. Implement guest user upgrade flow

  - [x] 8.1 Create guest upgrade server action

    - Create server action to upgrade anonymous session to full account
    - Call Appwrite `updateEmail()` and `updatePassword()` on anonymous user
    - Update local database to mark user as non-guest
    - Transfer chat history from guest user to registered user
    - _Requirements: 3.3, 5.2_

  - [x] 8.2 Add guest upgrade UI prompt

    - Create component to prompt guest users to register
    - Display prompt after guest creates first chat
    - Implement upgrade flow that preserves chat history
    - Test chat history preservation during upgrade
    - _Requirements: 3.3_

- [x] 9. Create user migration script

  - [x] 9.1 Implement migration script

    - Create `scripts/migrate-users-to-appwrite.ts`
    - Fetch all existing users from local database
    - For each user, create Appwrite account with email
    - Generate temporary password for each user
    - Store Appwrite user ID in local database
    - Log migration results (success/failure counts)
    - Generate migration report
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 9.2 Create password reset notification

    - Implement email notification for migrated users
    - Include password reset link in email
    - Use Appwrite's password recovery feature
    - _Requirements: 5.4, 9.5_

  - [x] 9.3 Test migration script in staging

    - Run migration script against staging database
    - Verify Appwrite accounts created correctly
    - Verify local database updated with Appwrite IDs
    - Test user login after migration
    - Verify chat history preserved
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 10. Update session management and persistence

  - [x] 10.1 Implement session cookie management

    - Create utility functions for setting/clearing session cookies
    - Configure cookie options (httpOnly, secure, sameSite, maxAge)
    - Implement session refresh logic before expiration
    - _Requirements: 7.1, 7.2, 7.3, 9.1_

  - [x] 10.2 Add session persistence logic

    - Implement session restoration on app load
    - Handle expired session gracefully
    - Implement automatic session refresh
    - _Requirements: 7.2, 7.3, 7.4_

- [ ] 11. Remove NextAuth dependencies and cleanup

  - [x] 11.1 Remove NextAuth configuration files

    - Delete `app/(auth)/auth.ts`
    - Delete `app/(auth)/auth.config.ts`
    - Delete `lib/auth-secret.ts`
    - Remove AUTH_SECRET from environment variables
    - _Requirements: 8.1, 8.2_

  - [x] 11.2 Remove NextAuth package dependencies

    - Remove `next-auth` from package.json
    - Remove `@auth/core` if not used elsewhere
    - Run pnpm install to clean up lock file
    - _Requirements: 8.1_

  - [x] 11.3 Update imports and type declarations

    - Remove NextAuth type declarations from files
    - Update all imports to use Appwrite types
    - Remove unused NextAuth utility imports
    - _Requirements: 8.3_

  - [x] 11.4 Update documentation

    - Update README.md with Appwrite setup instructions
    - Document new authentication flow
    - Update environment variable documentation
    - Add migration guide for developers
    - _Requirements: 8.4_

-

- [ ] 12. Testing and validation

  - [x] 12.1 Write unit tests for authentication service

    - Test createAccount with valid/invalid data
    - Test createEmailSession with valid/invalid credentials
    - Test anonymous session creation
    - Test guest user upgrade
    - Test error handling for all operations
    - _Requirements: 1.1, 2.1, 3.1, 10.1_

  - [x] 12.2 Write integration tests for server actions

    - Test registration flow end-to-end
    - Test login flow end-to-end
    - Test logout flow
    - Test guest session creation
    - Test session validation in middleware
    - _Requirements: 1.1, 2.1, 4.1, 6.1_

  - [x] 12.3 Update Playwright E2E tests

    - Update existing auth tests to work with Appwrite
    - Test new user registration and auto-login
    - Test existing user login
    - Test guest user flow and upgrade
    - Test session persistence across page reloads
    - Test logout and redirect
    - Test protected route access
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 7.2, 8.5_

  - [x] 12.4 Perform manual testing

    - Test complete registration flow in browser
    - Test complete login flow in browser
    - Test guest user creation and upgrade
    - Test session expiration handling
    - Test error scenarios (invalid credentials, network errors)
    - Test on multiple browsers and devices
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 7.2_
