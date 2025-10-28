# Migration Scripts Documentation

This document provides an overview of the user migration scripts created for migrating from the local authentication system to Appwrite.

## Scripts Overview

### 1. migrate-users-to-appwrite.ts

**Purpose:** Migrates existing users from the local database to Appwrite.

**Location:** `scripts/migrate-users-to-appwrite.ts`

**What it does:**

- Fetches all users from the local PostgreSQL database
- Creates Appwrite accounts for non-guest users
- Generates secure temporary passwords (16 characters)
- Stores Appwrite user IDs in the local database
- Skips users that already have Appwrite IDs
- Skips guest users (they use anonymous sessions)
- Generates a detailed migration report (JSON file)
- Implements retry logic with exponential backoff for network failures

**Usage:**

```bash
pnpm migrate:users
```

**Output:**

- Console logs showing progress for each user
- JSON report file: `migration-report-{timestamp}.json`
- Exit code 0 on success, 1 if any users failed

### 2. send-password-reset-notifications.ts

**Purpose:** Sends password reset emails to all migrated users.

**Location:** `scripts/send-password-reset-notifications.ts`

**What it does:**

- Fetches all users with Appwrite IDs (migrated users)
- Uses Appwrite's password recovery feature to send reset emails
- Skips guest users
- Includes password reset link in email
- Generates a detailed notification report (JSON file)
- Implements rate limiting delays to avoid API throttling

**Usage:**

```bash
pnpm migrate:send-reset
```

**Output:**

- Console logs showing progress for each user
- JSON report file: `password-reset-report-{timestamp}.json`
- Exit code 0 on success, 1 if any notifications failed

**Email Content:**

- Sent by Appwrite's email service
- Contains a secure password reset link
- Link redirects to `/reset-password` page
- Link includes `userId` and `secret` parameters
- Link expires after a set time (configured in Appwrite)

### 3. test-migration.ts

**Purpose:** Validates the migration was successful.

**Location:** `scripts/test-migration.ts`

**What it does:**

- Runs 5 comprehensive tests:
  1. Verifies Appwrite accounts were created for all non-guest users
  2. Verifies local database was updated with valid Appwrite IDs
  3. Tests that users exist in Appwrite (not full login test)
  4. Verifies chat history is preserved and not orphaned
  5. Verifies guest users were not migrated
- Generates a detailed test report (JSON file)
- Provides clear pass/fail status for each test

**Usage:**

```bash
pnpm migrate:test
```

**Output:**

- Console logs showing test results
- JSON report file: `migration-test-report-{timestamp}.json`
- Exit code 0 if all tests pass, 1 if any test fails

## Supporting Files

### Password Reset Page

**Location:** `app/(auth)/reset-password/page.tsx`

**Purpose:** Allows users to set a new password after migration.

**Features:**

- Accepts `userId` and `secret` from URL parameters
- Validates password length (minimum 8 characters)
- Confirms password match
- Calls password reset API
- Redirects to login page on success
- Shows user-friendly error messages

### Password Reset API

**Location:** `app/api/auth/reset-password/route.ts`

**Purpose:** Handles password reset requests from the UI.

**Features:**

- Validates input parameters
- Calls Appwrite's `updateRecovery` method
- Returns success/error responses
- Implements proper error handling

## Migration Workflow

1. **Backup Database**

   ```bash
   pg_dump $POSTGRES_URL > backup.sql
   ```

2. **Run Migration Script**

   ```bash
   pnpm migrate:users
   ```

3. **Review Migration Report**

   - Check `migration-report-*.json`
   - Verify all users migrated successfully

4. **Send Password Reset Emails**

   ```bash
   pnpm migrate:send-reset
   ```

5. **Review Notification Report**

   - Check `password-reset-report-*.json`
   - Verify all emails sent successfully

6. **Run Migration Tests**

   ```bash
   pnpm migrate:test
   ```

7. **Review Test Report**
   - Check `migration-test-report-*.json`
   - Verify all tests passed

## Error Handling

All scripts implement comprehensive error handling:

- **Network Errors:** Automatic retry with exponential backoff (up to 3 attempts)
- **Appwrite Errors:** Mapped to user-friendly error messages
- **Database Errors:** Caught and logged with context
- **Validation Errors:** Checked before API calls

## Reports

All scripts generate JSON reports with detailed information:

### Migration Report Structure

```json
{
  "totalUsers": 10,
  "migratedUsers": 8,
  "failedUsers": 0,
  "skippedUsers": 2,
  "errors": []
}
```

### Notification Report Structure

```json
{
  "totalUsers": 8,
  "sentNotifications": 8,
  "failedNotifications": 0,
  "skippedUsers": 0,
  "errors": []
}
```

### Test Report Structure

```json
{
  "totalTests": 5,
  "passedTests": 5,
  "failedTests": 0,
  "results": [
    {
      "testName": "Verify Appwrite accounts created",
      "passed": true,
      "details": { ... }
    }
  ]
}
```

## Security Considerations

- **Temporary Passwords:** Generated with 16 characters including special characters
- **Password Reset:** Uses Appwrite's secure password recovery flow
- **API Keys:** Never exposed to client-side code
- **Session Tokens:** Stored in HTTP-only cookies
- **Rate Limiting:** Delays between API calls to avoid throttling

## Troubleshooting

### Migration Fails with "User already exists"

- The script automatically skips users with existing Appwrite IDs
- Check the migration report for details

### Password Reset Emails Not Received

- Verify Appwrite email service is configured
- Check Appwrite console for email delivery logs
- Verify `NEXT_PUBLIC_APP_URL` is set correctly

### Tests Fail

- Review the test report for specific failures
- Check database connectivity
- Verify Appwrite API key has proper permissions

## Next Steps

After successful migration:

1. Monitor application logs for authentication errors
2. Provide user support for password reset requests
3. Update user documentation
4. Plan cleanup of old authentication code (Task 11)

## Additional Resources

- [Migration Guide](./MIGRATION_GUIDE.md) - Comprehensive migration guide
- [Design Document](.kiro/specs/appwrite-auth-migration/design.md) - Technical design
- [Requirements](.kiro/specs/appwrite-auth-migration/requirements.md) - Requirements specification
