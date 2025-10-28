# User Migration Guide - Appwrite Authentication

This guide provides step-by-step instructions for migrating existing users from the local authentication system to Appwrite.

## Overview

The migration process involves:

1. Creating Appwrite accounts for all existing users
2. Storing Appwrite user IDs in the local database
3. Sending password reset notifications to users
4. Testing the migration to ensure data integrity

## Prerequisites

Before starting the migration:

1. **Backup your database**

   ```bash
   # Create a database backup
   pg_dump $POSTGRES_URL > backup-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Verify Appwrite configuration**

   - Ensure `NEXT_PUBLIC_APPWRITE_ENDPOINT` is set
   - Ensure `NEXT_PUBLIC_APPWRITE_PROJECT_ID` is set
   - Ensure `APPWRITE_API_KEY` is set (server-side only)
   - Ensure `NEXT_PUBLIC_APP_URL` is set for password reset links

3. **Test Appwrite connection**
   ```bash
   pnpm migrate:test
   ```

## Migration Steps

### Step 1: Run Migration Script

The migration script will:

- Fetch all existing users from the database
- Create Appwrite accounts for non-guest users
- Generate temporary passwords for each user
- Store Appwrite user IDs in the local database
- Generate a migration report

```bash
pnpm migrate:users
```

**Expected Output:**

```
==========================================================
Starting User Migration to Appwrite
==========================================================

[FETCH] Fetching users from database...
[FETCH] Found 10 users to process

==========================================================
Processing user: user@example.com
User ID: 123e4567-e89b-12d3-a456-426614174000
Is Guest: false
Has Appwrite ID: false
==========================================================
[MIGRATE] Creating Appwrite account for user@example.com...
[MIGRATE] Appwrite account created with ID: 5f8a7b9c...
[MIGRATE] Database updated for user user@example.com
[SUCCESS] User user@example.com migrated successfully

...

==========================================================
Migration Complete
==========================================================
Total Users: 10
Successfully Migrated: 8
Failed: 0
Skipped: 2
==========================================================

Migration report saved to: migration-report-1234567890.json
```

**Review the migration report:**

- Check `migration-report-*.json` for detailed results
- Verify that all non-guest users were migrated successfully
- Review any errors and address them before proceeding

### Step 2: Send Password Reset Notifications

After successful migration, send password reset emails to all migrated users:

```bash
pnpm migrate:send-reset
```

**Expected Output:**

```
==========================================================
Sending Password Reset Notifications
==========================================================

[FETCH] Fetching migrated users from database...
[FETCH] Found 8 migrated users

==========================================================
Processing user: user@example.com
User ID: 123e4567-e89b-12d3-a456-426614174000
Appwrite ID: 5f8a7b9c...
Is Guest: false
==========================================================
[SEND] Sending password reset email to user@example.com...
[SUCCESS] Password reset email sent to user@example.com

...

==========================================================
Notification Process Complete
==========================================================
Total Users: 8
Successfully Sent: 8
Failed: 0
Skipped: 0
==========================================================

Notification report saved to: password-reset-report-1234567890.json
```

**What users will receive:**

- An email from Appwrite with a password reset link
- The link will redirect to `/reset-password` on your application
- Users can set a new password and log in

### Step 3: Test Migration

Run comprehensive tests to verify the migration:

```bash
pnpm migrate:test
```

**Tests performed:**

1. ✅ Verify Appwrite accounts were created
2. ✅ Verify local database updated with Appwrite IDs
3. ✅ Test user login after migration
4. ✅ Verify chat history preserved
5. ✅ Verify guest users not migrated

**Expected Output:**

```
==========================================================
Running Migration Tests
==========================================================

[TEST] Verify Appwrite accounts created...
  Total non-guest users: 10
  Users with Appwrite ID: 10
  Users without Appwrite ID: 0

[TEST] Verify database updated with Appwrite IDs...
  Valid Appwrite IDs: 10
  Invalid Appwrite IDs: 0

[TEST] Test user login after migration...
  Testing login for user: user@example.com
  ⚠️  Note: This test will fail if the user hasn't reset their password yet
  This is expected behavior - users need to reset passwords after migration
  ✅ User exists in Appwrite: user@example.com
  User ID: 5f8a7b9c...
  Email verified: false

[TEST] Verify chat history preserved...
  Total users: 10
  Users with chat history: 5
  Total chats: 25
  Orphaned chats: 0

[TEST] Verify guest users not migrated...
  Total guest users: 2
  Guest users with Appwrite ID: 0

==========================================================
Test Summary
==========================================================
Total Tests: 5
Passed: 5
Failed: 0
==========================================================

✅ All tests passed!
```

## Troubleshooting

### Migration Script Fails

**Issue:** Migration script fails with "User already exists" error

**Solution:**

- This means the user already has an Appwrite account
- The script will skip users that already have an Appwrite ID
- Check the migration report for details

**Issue:** Migration script fails with "Network error"

**Solution:**

- Check your internet connection
- Verify Appwrite endpoint is accessible
- The script will automatically retry up to 3 times

### Password Reset Emails Not Sent

**Issue:** Password reset emails are not being sent

**Solution:**

- Verify Appwrite email service is configured
- Check Appwrite console for email delivery logs
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly

### Users Cannot Log In

**Issue:** Users cannot log in after migration

**Solution:**

- Users must reset their password using the link sent via email
- Temporary passwords are not shared with users for security
- Users can request a new password reset from the login page

### Chat History Missing

**Issue:** Users report missing chat history

**Solution:**

- Run the test script to verify chat history preservation
- Check for orphaned chats in the test results
- Verify user IDs match between chats and users

## Post-Migration

After successful migration:

1. **Monitor error logs**

   - Check application logs for authentication errors
   - Monitor Appwrite console for API errors

2. **User support**

   - Prepare support team for password reset requests
   - Create user documentation for the new login process

3. **Cleanup (after grace period)**
   - Remove `password` field from database schema
   - Remove NextAuth dependencies (see task 11)

## Rollback Plan

If migration fails or causes issues:

1. **Stop the application**

   ```bash
   # Stop the production server
   ```

2. **Restore database backup**

   ```bash
   # Restore from backup
   psql $POSTGRES_URL < backup-YYYYMMDD-HHMMSS.sql
   ```

3. **Revert code changes**

   ```bash
   # Revert to previous version
   git revert <commit-hash>
   ```

4. **Investigate issues**
   - Review migration reports
   - Check error logs
   - Test in staging environment

## Migration Checklist

- [ ] Database backup created
- [ ] Appwrite configuration verified
- [ ] Migration script tested in staging
- [ ] Migration script executed successfully
- [ ] Migration report reviewed
- [ ] Password reset notifications sent
- [ ] Notification report reviewed
- [ ] Migration tests passed
- [ ] User documentation updated
- [ ] Support team notified
- [ ] Monitoring in place

## Support

For issues or questions:

- Check the migration reports in the project root
- Review Appwrite console logs
- Check application error logs
- Contact the development team

## Additional Resources

- [Appwrite Authentication Documentation](https://appwrite.io/docs/products/auth)
- [Appwrite Email Service](https://appwrite.io/docs/products/messaging)
- [Migration Design Document](.kiro/specs/appwrite-auth-migration/design.md)
- [Migration Requirements](.kiro/specs/appwrite-auth-migration/requirements.md)

## Migration Status

### Completed Tasks

The following migration tasks have been completed:

1. ✅ **Appwrite Setup**

   - Appwrite project created and configured
   - Email/Password authentication enabled
   - Anonymous sessions enabled
   - API keys generated

2. ✅ **Code Implementation**

   - Appwrite client configuration utilities created
   - Authentication service layer implemented
   - Database schema updated with `appwriteId` field
   - Server actions for authentication implemented
   - Middleware updated for Appwrite session validation
   - Authentication context provider created
   - UI components updated to use Appwrite

3. ✅ **Guest User Support**

   - Anonymous session creation implemented
   - Guest user upgrade flow implemented
   - Chat history preservation during upgrade

4. ✅ **Migration Scripts**

   - User migration script created
   - Password reset notification script created
   - Migration test script created

5. ✅ **NextAuth Cleanup**
   - NextAuth configuration files removed
   - NextAuth package dependencies removed
   - All imports updated to use Appwrite types
   - Documentation updated

### Authentication Flow

The new authentication flow works as follows:

1. **Guest Users**

   - Automatically get an anonymous session when accessing the app
   - Can create chats and use the application
   - Prompted to register to save their work

2. **Registration**

   - Users provide email and password
   - Appwrite account created
   - User record created in local database with Appwrite ID
   - Automatic login after registration

3. **Login**

   - Users provide email and password
   - Appwrite validates credentials
   - Session cookie set in browser
   - User redirected to home page

4. **Session Management**

   - Sessions validated on every request via middleware
   - Sessions automatically refreshed before expiration
   - Invalid sessions result in anonymous session creation

5. **Logout**
   - Session deleted from Appwrite
   - Session cookie cleared from browser
   - User redirected to login page

### Key Files

- **Authentication Service**: `lib/appwrite/auth.ts`
- **Server Auth Utility**: `lib/appwrite/server-auth.ts`
- **Session Management**: `lib/appwrite/session.ts`
- **Middleware**: `middleware.ts`
- **Auth Provider**: `components/providers/auth-provider.tsx`
- **Server Actions**: `app/(auth)/actions.ts`
- **Type Definitions**: `lib/types.ts`

### Environment Variables

Required environment variables for Appwrite:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
```

### Next Steps

1. Run user migration script if you have existing users
2. Test authentication flows in staging
3. Deploy to production
4. Monitor for any issues
5. Provide user support for password resets
