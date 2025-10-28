# Appwrite Authentication Quick Reference

This document provides a quick reference for developers working with the Appwrite authentication system in DeepCounsel.

## Table of Contents

- [Authentication Flow](#authentication-flow)
- [Server-Side Authentication](#server-side-authentication)
- [Client-Side Authentication](#client-side-authentication)
- [Session Management](#session-management)
- [Guest Users](#guest-users)
- [Common Patterns](#common-patterns)
- [Error Handling](#error-handling)

## Authentication Flow

### Registration

```typescript
// Server action
import { register } from "@/app/(auth)/actions";

// In a form
<form action={register}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">Register</button>
</form>;
```

### Login

```typescript
// Server action
import { login } from "@/app/(auth)/actions";

// In a form
<form action={login}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">Login</button>
</form>;
```

### Logout

```typescript
// Server action
import { logout } from "@/app/(auth)/actions";

// In a form or button
<form action={logout}>
  <button type="submit">Logout</button>
</form>;
```

## Server-Side Authentication

### Getting Current User

```typescript
import { auth } from "@/lib/appwrite/server-auth";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const userType = session.user.type; // "guest" | "regular"

  // Your logic here
}
```

### Protecting API Routes

```typescript
import { auth } from "@/lib/appwrite/server-auth";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protected logic here
}
```

### Checking User Type

```typescript
import { auth } from "@/lib/appwrite/server-auth";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.type === "guest") {
    return Response.json({ error: "Registration required" }, { status: 403 });
  }

  // Regular user logic here
}
```

## Client-Side Authentication

### Using the Auth Hook

```typescript
"use client";

import { useAuth } from "@/hooks/use-auth";

export function MyComponent() {
  const { user, isLoading, isAnonymous, login, logout } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <p>Welcome, {user.email || "Guest"}</p>
      {isAnonymous && <p>You are using a guest account</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Conditional Rendering

```typescript
"use client";

import { useAuth } from "@/hooks/use-auth";

export function MyComponent() {
  const { user, isAnonymous } = useAuth();

  return (
    <div>
      {isAnonymous ? (
        <div>
          <p>You are using a guest account</p>
          <a href="/register">Register to save your work</a>
        </div>
      ) : (
        <div>
          <p>Welcome back, {user?.email}</p>
        </div>
      )}
    </div>
  );
}
```

## Session Management

### Session Type

```typescript
import type { Session } from "@/lib/types";

// Session structure
type Session = {
  user?: {
    id: string;
    email?: string;
    name?: string;
    type: "guest" | "regular";
  };
  appwriteSession?: Models.Session;
};
```

### Passing Session to Tools

```typescript
import { auth } from "@/lib/appwrite/server-auth";
import { createDocument } from "@/lib/ai/tools/create-document";

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pass session to tools
  const tool = createDocument({ session, dataStream });

  // Use tool
}
```

## Guest Users

### Creating Guest Session

Guest sessions are automatically created by the middleware when a user accesses the app without authentication.

### Upgrading Guest to Registered User

```typescript
// Server action
import { upgradeGuestToAccount } from "@/app/(auth)/actions";

// In a form
<form action={upgradeGuestToAccount}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">Upgrade Account</button>
</form>;
```

### Checking if User is Guest

```typescript
"use client";

import { useAuth } from "@/hooks/use-auth";

export function MyComponent() {
  const { isAnonymous } = useAuth();

  if (isAnonymous) {
    return <div>Guest user - register to save your work</div>;
  }

  return <div>Registered user</div>;
}
```

## Common Patterns

### Protected Page

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/appwrite/server-auth";

export default async function ProtectedPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.type === "guest") {
    redirect("/register");
  }

  return <div>Protected content</div>;
}
```

### User-Specific Data Fetching

```typescript
import { auth } from "@/lib/appwrite/server-auth";
import { getChatsByUserId } from "@/lib/db/queries";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chats = await getChatsByUserId({ id: session.user.id });

  return Response.json({ chats });
}
```

### Conditional Features Based on User Type

```typescript
import { auth } from "@/lib/appwrite/server-auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entitlements = entitlementsByUserType[session.user.type];

  if (entitlements.maxMessagesPerDay < userMessageCount) {
    return Response.json({ error: "Message limit reached" }, { status: 429 });
  }

  // Process request
}
```

## Error Handling

### Authentication Errors

```typescript
import { AuthErrorCode, type AuthError } from "@/lib/appwrite/errors";

try {
  // Authentication operation
} catch (error) {
  const authError = error as AuthError;

  switch (authError.code) {
    case AuthErrorCode.INVALID_CREDENTIALS:
      return "Invalid email or password";
    case AuthErrorCode.USER_EXISTS:
      return "User already exists";
    case AuthErrorCode.NETWORK_ERROR:
      return "Network error. Please try again.";
    case AuthErrorCode.APPWRITE_ERROR:
      return "Service temporarily unavailable";
    default:
      return "An error occurred. Please try again.";
  }
}
```

### Session Validation Errors

```typescript
import { auth } from "@/lib/appwrite/server-auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Your logic here
  } catch (error) {
    console.error("[api] Error validating session:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## Environment Variables

Required environment variables:

```bash
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
```

## Key Files

- **Authentication Service**: `lib/appwrite/auth.ts`
- **Server Auth Utility**: `lib/appwrite/server-auth.ts`
- **Session Management**: `lib/appwrite/session.ts`
- **Error Types**: `lib/appwrite/errors.ts`
- **Auth Provider**: `components/providers/auth-provider.tsx`
- **Auth Hook**: `hooks/use-auth.ts`
- **Server Actions**: `app/(auth)/actions.ts`
- **Middleware**: `middleware.ts`
- **Type Definitions**: `lib/types.ts`

## Additional Resources

- [Appwrite Documentation](https://appwrite.io/docs)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Design Document](.kiro/specs/appwrite-auth-migration/design.md)
- [Requirements Document](.kiro/specs/appwrite-auth-migration/requirements.md)
