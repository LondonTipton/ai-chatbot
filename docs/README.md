# DeepCounsel Documentation

This directory contains comprehensive documentation for the DeepCounsel AI legal assistant platform.

## Quick Start

- **[Getting Started](../README.md)** - Main project README
- **[Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)** - Production deployment guide
- **[Migration Guide](../MIGRATION_GUIDE.md)** - Version migration instructions

## Core Integrations

### AI & Search

- **[Cerebras Integration](CEREBRAS_INTEGRATION.md)** - AI model configuration, key balancing, rate limits
- **[Tavily Integration](TAVILY_INTEGRATION.md)** - Search API setup, domain prioritization, optimization
- **[Query Enhancement](QUERY_ENHANCEMENT.md)** - LLM-based query enhancement, HyDE, caching

### Authentication & User Management

- **[Appwrite Setup](APPWRITE_SETUP.md)** - Authentication, email verification, session management

### Architecture

- **[Workflow Architecture](WORKFLOW_ARCHITECTURE.md)** - Workflow types, routing, performance optimization

## Additional Resources

### Guides

- **[Appwrite Setup Guide](guides/APPWRITE_SETUP.md)** - Detailed Appwrite configuration

## Project Structure

```
docs/
├── README.md                      # This file
├── CEREBRAS_INTEGRATION.md        # Cerebras AI setup
├── TAVILY_INTEGRATION.md          # Tavily search setup
├── QUERY_ENHANCEMENT.md           # Query enhancement system
├── APPWRITE_SETUP.md              # Authentication setup
├── WORKFLOW_ARCHITECTURE.md       # Workflow design
└── guides/
    └── APPWRITE_SETUP.md          # Detailed Appwrite guide
```

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **AI SDK**: Vercel AI SDK v5
- **AI Provider**: Cerebras (gpt-oss-120b, llama-3.3-70b)
- **Search**: Tavily API
- **Auth**: Appwrite Cloud
- **Database**: Vercel Postgres (Neon)
- **Vector DB**: Zilliz Cloud (Milvus)
- **Orchestration**: Mastra

## Key Features

### AI Capabilities

- Multi-model support (Cerebras, OpenAI, Anthropic)
- Intelligent workflow routing
- Query enhancement with HyDE
- Context-aware responses
- Tool calling and function execution

### Search & Retrieval

- Hybrid search (keyword + semantic)
- Domain prioritization for legal sources
- Multi-search with parallel execution
- Result caching and optimization

### User Experience

- Real-time streaming responses
- Conversation history
- Document creation and editing
- Mobile-responsive design
- Dark/light theme

## Development

### Environment Setup

1. Copy `.env.example` to `.env.local`
2. Configure required API keys:
   - `CEREBRAS_API_KEY` - AI model access
   - `TAVILY_API_KEY` - Search API
   - `APPWRITE_PROJECT_ID` - Authentication
   - `POSTGRES_URL` - Database
   - `ZILLIZ_URI` - Vector database

### Running Locally

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

### Building for Production

```bash
pnpm build
pnpm start
```

## Support

For issues or questions:

1. Check the relevant documentation above
2. Review the [Migration Guide](../MIGRATION_GUIDE.md)
3. Check the [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)

## Contributing

When adding new features:

1. Update relevant documentation
2. Add tests where appropriate
3. Follow existing code patterns
4. Update this README if adding new docs

## License

See [LICENSE](../LICENSE) file for details.
