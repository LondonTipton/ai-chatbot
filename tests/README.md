# Testing Guide for Appwrite Authentication

This guide explains how to run and maintain tests for the Appwrite authentication implementation.

## Test Structure

The test suite is organized into four categories:

### 1. Unit Tests (`tests/unit/`)

Tests individual functions and modules in isolation.

**Files:**

- `auth.test.ts` - Tests for authentication service functions

**What they test:**

- `createAccount()` with valid/invalid data
- `createEmailSession()` with valid/invalid credentials
- `createAnonymousSession()` for guest users
- `getCurrentUser()` session validation
- `deleteSession()` logout functionality
- Error handling and retry logic

### 2. Integration Tests (`tests/integration/`)

Tests how multiple components work together.

**Files:**

- `auth-actions.test.ts` - Tests for server actions

**What they test:**

- Registration flow (server action → Appwrite → database)
- Login flow (server action → Appwrite → session cookie)
- Logout flow (server action → Appwrite → cookie cleanup)
- Guest upgrade flow (server action → Appwrite → database update)
- Session validation in middleware

### 3. E2E Tests (`tests/e2e/`)

Tests complete user flows through the browser.

**Files:**

- `session.test.ts` - Tests for authentication user flows

**What they test:**

- New user registration and auto-login
- Existing user login
- Guest user flow and upgrade
- Session persistence across page reloads
- Logout and redirect
- Protected route access

### 4. Route Tests (`tests/routes/`)

Tests API routes and server-side logic.

**Files:**

- `chat.test.ts` - Tests for chat API routes
- `document.test.ts` - Tests for document API routes

## Running Tests

### Prerequisites

1. **Install Playwright browsers:**

   ```bash
   pnpm exec playwright install
   ```

2. **Set up environment variables:**
   Ensure `.env.local` has all required Appwrite configuration:

   ```
   APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your-project-id
   APPWRITE_API_KEY=your-api-key
   ```

3. **Start development server:**
   The test suite will automatically start the dev server, but you can also start it manually:
   ```bash
   pnpm dev
   ```

### Run All Tests

```bash
pnpm test
```

This runs all test projects (unit, integration, e2e, routes).

### Run Specific Test Projects

**Unit tests only:**

```bash
pnpm exec playwright test --project=unit
```

**Integration tests only:**

```bash
pnpm exec playwright test --project=integration
```

**E2E tests only:**

```bash
pnpm exec playwright test --project=e2e
```

**Route tests only:**

```bash
pnpm exec playwright test --project=routes
```

### Run Specific Test Files

**Run a single test file:**

```bash
pnpm exec playwright test tests/unit/auth.test.ts
```

**Run tests matching a pattern:**

```bash
pnpm exec playwright test auth
```

### Run Tests in UI Mode

For interactive debugging:

```bash
pnpm exec playwright test --ui
```

### Run Tests in Debug Mode

For step-by-step debugging:

```bash
pnpm exec playwright test --debug
```

### Run Tests in Headed Mode

To see the browser:

```bash
pnpm exec playwright test --headed
```

## Test Configuration

The test configuration is in `playwright.config.ts`:

- **Timeout:** 240 seconds per test
- **Retries:** 0 (no retries by default)
- **Workers:** 8 parallel workers (2 on CI)
- **Reporter:** HTML report
- **Base URL:** `http://localhost:3000`

## Writing New Tests

### Unit Test Example

```typescript
import { describe, expect, it } from "@playwright/test";
import { createAccount } from "@/lib/appwrite/auth";

describe("Authentication Service", () => {
  it("should create account with valid data", async () => {
    const user = await createAccount("test@example.com", "password123");
    expect(user).toBeDefined();
    expect(user.email).toBe("test@example.com");
  });
});
```

### Integration Test Example

```typescript
import { describe, expect, it } from "@playwright/test";
import { register } from "@/app/(auth)/actions";

describe("Registration Action", () => {
  it("should register new user", async () => {
    const formData = new FormData();
    formData.append("email", "test@example.com");
    formData.append("password", "password123");

    const result = await register({ status: "idle" }, formData);
    expect(result.status).toBe("success");
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from "@playwright/test";

test("should login successfully", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("user@acme.com").fill("test@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL("/");
});
```

## Test Best Practices

### 1. Use Descriptive Test Names

```typescript
// Good
it("should create account with valid email and password", async () => {});

// Bad
it("test1", async () => {});
```

### 2. Test One Thing Per Test

```typescript
// Good
it("should fail with invalid email", async () => {});
it("should fail with short password", async () => {});

// Bad
it("should validate all inputs", async () => {
  // Tests multiple things
});
```

### 3. Clean Up After Tests

```typescript
afterAll(async () => {
  // Delete test data
  await deleteTestUser();
});
```

### 4. Use Test Fixtures

```typescript
import { test } from "../fixtures";

test("should access chat as authenticated user", async ({ adaContext }) => {
  // adaContext is a pre-authenticated user
});
```

### 5. Avoid Hard-Coded Values

```typescript
// Good
const testEmail = `test-${generateId()}@example.com`;

// Bad
const testEmail = "test@example.com";
```

## Debugging Tests

### View Test Report

After running tests, view the HTML report:

```bash
pnpm exec playwright show-report
```

### View Test Traces

For failed tests, view the trace:

```bash
pnpm exec playwright show-trace test-results/path-to-trace.zip
```

### Enable Debug Logs

Set environment variable for verbose logging:

```bash
DEBUG=pw:api pnpm test
```

## Continuous Integration

Tests run automatically on CI with:

- 2 parallel workers
- No retries
- Fail on `test.only`
- HTML report artifact

## Manual Testing

For comprehensive manual testing, see:

- `tests/MANUAL_TESTING_CHECKLIST.md`

This checklist covers:

- Registration flows
- Login flows
- Guest user flows
- Logout flows
- Session persistence
- Protected routes
- Error scenarios
- Multi-browser testing
- Mobile testing

## Troubleshooting

### Tests Fail with "Executable doesn't exist"

Install Playwright browsers:

```bash
pnpm exec playwright install
```

### Tests Fail with "Connection refused"

Ensure the development server is running:

```bash
pnpm dev
```

### Tests Fail with "Session expired"

Clear test data and retry:

```bash
rm -rf playwright/.sessions
pnpm test
```

### Tests Timeout

Increase timeout in `playwright.config.ts`:

```typescript
timeout: 300 * 1000, // 5 minutes
```

## Test Coverage

Current test coverage includes:

✅ Account creation (valid/invalid data)
✅ Email/password login (valid/invalid credentials)
✅ Anonymous session creation
✅ Guest user upgrade
✅ Session validation
✅ Logout functionality
✅ Error handling and retry logic
✅ Server action flows
✅ UI flows (registration, login, logout)
✅ Session persistence
✅ Protected route access

## Future Improvements

- [ ] Add performance tests
- [ ] Add load tests for authentication endpoints
- [ ] Add visual regression tests
- [ ] Add accessibility tests
- [ ] Increase test coverage to 90%+
- [ ] Add mutation testing
- [ ] Add contract tests for Appwrite API

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Appwrite Documentation](https://appwrite.io/docs)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
