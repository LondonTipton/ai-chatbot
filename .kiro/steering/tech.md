# Technology Stack

## Core Framework

- **Next.js 15** (App Router with React Server Components)
- **React 19** (RC version)
- **TypeScript 5.6** with strict mode enabled
- **pnpm** as package manager

## Key Libraries & Tools

### AI & LLM Integration

- **AI SDK** (Vercel) - Unified API for LLM interactions with streaming support
- **@ai-sdk/xai** - xAI Grok integration (default provider)
- Support for OpenAI, Anthropic, Fireworks, and other providers

### UI & Styling

- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library built on Radix UI primitives
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animation library
- **next-themes** - Theme management
- **Geist** fonts (sans and mono)

### Data & State Management

- **Drizzle ORM** - Type-safe database toolkit
- **Vercel Postgres** (Neon) - Serverless PostgreSQL
- **Vercel Blob** - File storage
- **SWR** - Data fetching and caching
- **Zod** - Schema validation

### Authentication

- **Auth.js (NextAuth v5 beta)** - Authentication with guest and registered user support

### Code Editors

- **CodeMirror 6** - Code editing for artifacts
- **ProseMirror** - Rich text editing

### Development Tools

- **Biome** - Fast linter and formatter (replaces ESLint + Prettier for most tasks)
- **ESLint** - Additional linting with Next.js config
- **Playwright** - E2E testing
- **tsx** - TypeScript execution for scripts

## Common Commands

### Development

```bash
pnpm dev              # Start dev server with Turbo
pnpm build            # Run migrations and build for production
pnpm start            # Start production server
```

### Code Quality

```bash
pnpm lint             # Run linters
pnpm lint:fix         # Auto-fix linting issues
pnpm format           # Format code with Biome
```

### Database

```bash
pnpm db:generate      # Generate migration files
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio
pnpm db:push          # Push schema changes
pnpm db:pull          # Pull schema from database
```

### Testing

```bash
pnpm test             # Run Playwright E2E tests
```

## Configuration Files

- `next.config.ts` - Next.js configuration with PPR enabled
- `tailwind.config.ts` - Tailwind with custom theme tokens
- `tsconfig.json` - TypeScript with path aliases (`@/*`)
- `drizzle.config.ts` - Database configuration
- `biome.jsonc` - Biome linter/formatter settings
- `.eslintrc.json` - ESLint configuration
- `playwright.config.ts` - E2E test configuration

## Environment Variables

Required environment variables are defined in `.env.example`. Use `.env.local` for local development. Never commit `.env.local` to version control.
