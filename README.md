<a href="https://chat.vercel.ai/">
  <img alt="DeepCounsel - AI-powered legal assistant chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">DeepCounsel</h1>
</a>

<p align="center">
    DeepCounsel is an AI-powered legal assistant chatbot built with Next.js and the AI SDK.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- **Legal Assistant Focus**
  - Specialized in Zimbabwean law and legal information
  - Web search integration via [Tavily](https://tavily.com) for current legal information
  - Professional legal context and terminology
- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports Google Gemini (default) with load balancing across multiple API keys
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Appwrite](https://appwrite.io)
  - Cloud-based authentication with email/password and anonymous sessions
  - Guest user support with seamless upgrade to registered accounts
- **Advanced Features**
  - Gemini API key load balancing (up to 5 keys)
  - Real-time web search for current legal information
  - Source citation and reference tracking

## Model Providers

This template ships with [xAI](https://x.ai) `grok-2-1212` as the default chat model. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of DeepCounsel to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=AI+Chatbot&demo-description=An+Open-Source+AI+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&demo-url=https%3A%2F%2Fchat.vercel.ai&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22grok%22%2C%22integrationSlug%22%3A%22xai%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22upstash-kv%22%2C%22integrationSlug%22%3A%22upstash%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run DeepCounsel. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

## Authentication Setup

DeepCounsel uses [Appwrite](https://appwrite.io) for authentication. Follow these steps to set up authentication:

### 1. Create an Appwrite Project

1. Go to [Appwrite Cloud](https://cloud.appwrite.io/) and create a free account
2. Create a new project
3. Copy your Project ID from Settings > General

### 2. Configure Authentication

1. Navigate to **Auth** in your Appwrite project
2. Enable **Email/Password** authentication
3. Enable **Anonymous Sessions** (for guest users)
4. Configure session limits and security settings as needed

### 3. Create an API Key

1. Go to **Settings > API Keys**
2. Create a new API key with the following scopes:
   - `users.read`
   - `users.write`
3. Copy the API key (you won't be able to see it again)

### 4. Set Environment Variables

Add the following to your `.env.local` file:

```bash
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id_here
APPWRITE_API_KEY=your_api_key_here
```

### Authentication Features

- **Guest Users**: Unauthenticated users can access the app with anonymous sessions
- **Registration**: Users can create accounts with email and password
- **Login**: Registered users can log in with their credentials
- **Guest Upgrade**: Guest users can upgrade to full accounts while preserving chat history
- **Session Management**: Automatic session refresh and validation

For more details on the authentication migration, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

## Testing Integrations

### Test Tavily Search API

```bash
# Visit the test endpoint
curl http://localhost:3000/api/test/tavily

# Or open in browser
open http://localhost:3000/api/test/tavily
```

### Test Gemini Load Balancer

```bash
# View API key statistics
curl http://localhost:3000/api/admin/gemini-stats
```

## Documentation

- [FEATURES.md](./FEATURES.md) - Complete feature overview
- [TAVILY_QUICK_START.md](./TAVILY_QUICK_START.md) - Web search setup (3 minutes)
- [GEMINI_LOAD_BALANCER.md](./GEMINI_LOAD_BALANCER.md) - Multi-key load balancing
- [MESSAGE_LIMITS.md](./MESSAGE_LIMITS.md) - Configure usage limits
- [TAVILY_TROUBLESHOOTING.md](./TAVILY_TROUBLESHOOTING.md) - Common issues and solutions
