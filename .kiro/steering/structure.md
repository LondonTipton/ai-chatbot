# Project Structure

## Directory Organization

### `/app` - Next.js App Router

Route groups organize related functionality:

- `(auth)/` - Authentication routes (login, register) and auth configuration
- `(chat)/` - Main chat interface and API routes
- `layout.tsx` - Root layout with theme provider and session management
- `globals.css` - Global styles and CSS variables

### `/components` - React Components

All UI components organized by feature:

- Chat components: `chat.tsx`, `messages.tsx`, `message.tsx`, `multimodal-input.tsx`
- Artifact components: `artifact.tsx`, `artifact-messages.tsx`, `create-artifact.tsx`
- Editor components: `code-editor.tsx`, `text-editor.tsx`, `sheet-editor.tsx`, `image-editor.tsx`
- UI primitives: `ui/` subdirectory (shadcn/ui components - ignored by ESLint)
- Layout components: `app-sidebar.tsx`, `sidebar-*.tsx`, `toolbar.tsx`
- Shared utilities: `theme-provider.tsx`, `toast.tsx`, `icons.tsx`

### `/artifacts` - Artifact System

Artifact generation and rendering logic:

- `actions.ts` - Server actions for artifact operations
- `code/`, `image/`, `sheet/`, `text/` - Type-specific artifact handlers

### `/lib` - Shared Utilities & Logic

Core application logic organized by domain:

- `ai/` - AI SDK integration and model configuration
- `artifacts/` - Artifact type definitions and utilities
- `db/` - Database schema, migrations, and queries (Drizzle ORM)
- `editor/` - Editor-specific utilities
- `constants.ts` - Application constants
- `types.ts` - Shared TypeScript types
- `utils.ts` - General utility functions
- `errors.ts` - Error handling utilities

### `/hooks` - Custom React Hooks

Reusable hooks for common patterns:

- `use-artifact.ts` - Artifact state management
- `use-messages.tsx` - Message handling
- `use-chat-visibility.ts` - Chat visibility state
- `use-scroll-to-bottom.tsx` - Auto-scroll behavior
- `use-mobile.tsx` - Mobile detection
- `use-auto-resume.ts` - Session resumption

### `/tests` - Test Suite

Playwright E2E tests:

- `e2e/` - End-to-end test scenarios
- `pages/` - Page object models
- `routes/` - API route tests
- `prompts/` - Test prompts and fixtures
- `fixtures.ts`, `helpers.ts` - Test utilities

### `/extracted-artifacts` - Standalone Package

Extracted components for external use with its own `package.json` and build configuration.

### Root Configuration Files

- `middleware.ts` - Next.js middleware for auth and routing
- `instrumentation.ts` - OpenTelemetry instrumentation
- `drizzle.config.ts` - Database configuration
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `biome.jsonc` - Biome linter/formatter configuration
- `.eslintrc.json` - ESLint configuration
- `playwright.config.ts` - Test configuration

## Architectural Patterns

### Route Groups

Next.js route groups `(auth)` and `(chat)` organize routes without affecting URL structure.

### Server Actions

Server-side logic in `actions.ts` files within route groups for data mutations and API calls.

### Path Aliases

Use `@/` prefix for imports (e.g., `@/components/chat`, `@/lib/utils`).

### Component Organization

- UI primitives in `components/ui/` (shadcn/ui - auto-generated, ESLint ignored)
- Feature components at `components/` root level
- Shared hooks in `/hooks`
- Shared utilities in `/lib`

### Database Layer

- Schema definitions in `lib/db/schema.ts`
- Migrations in `lib/db/migrations/`
- Database queries colocated with schema

### Type Safety

- Strict TypeScript configuration
- Zod schemas for runtime validation
- Type-safe database queries with Drizzle ORM
