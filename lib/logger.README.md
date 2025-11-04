# Production-Safe Logging

This project uses a custom logger that automatically suppresses logs in production while keeping full visibility during local development.

## How It Works

- **Local Development** (`NODE_ENV=development`): All logs are visible
- **Production** (Vercel): Logs are suppressed to prevent data leakage

## Usage

The logger has been automatically integrated throughout the codebase. Instead of:

```typescript
console.log("User logged in:", user.email);
console.error("Payment failed:", error);
```

We now use:

```typescript
logger.log("User logged in:", user.email);
logger.error("Payment failed:", error);
```

## Available Methods

- `logger.log()` - General logging (dev only)
- `logger.error()` - Error logging (sanitized in production)
- `logger.warn()` - Warning logging (dev only)
- `logger.info()` - Info logging (dev only)
- `logger.debug()` - Debug logging (dev only)

## Creating Namespaced Loggers

For better log organization:

```typescript
import { createLogger } from "@/lib/logger";

const logger = createLogger("payment-service");

logger.log("Processing payment..."); // [payment-service] Processing payment...
```

## Production Behavior

In production:

- `logger.log()`, `logger.warn()`, `logger.info()`, `logger.debug()` are completely silent
- `logger.error()` still logs but automatically sanitizes:
  - Email addresses → `[email]`
  - UUIDs → `[uuid]`
  - Tokens/secrets → `[token]`
  - Session IDs → `sessionId=[redacted]`
  - User IDs → `userId=[redacted]`

## Re-running the Migration

If you add new files with `console.log` statements:

```bash
pnpm tsx scripts/replace-console-logs.ts
```

This will automatically:

1. Find all `console.*` calls
2. Replace them with `logger.*`
3. Add the necessary imports
4. Create namespaced loggers based on file paths

## Why This Matters

Logging sensitive data in production can:

- Expose user emails, session tokens, and personal information
- Violate privacy regulations (GDPR, CCPA)
- Create security vulnerabilities
- Clutter production logs with unnecessary debug info

This logger ensures you get full visibility locally while maintaining security in production.
