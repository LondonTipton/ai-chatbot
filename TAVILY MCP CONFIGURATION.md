# Tavily MCP Server - Complete Manual

## Overview

The Tavily MCP (Model Context Protocol) server provides AI assistants with powerful web search, content extraction, crawling, and mapping capabilities. This manual covers all available tools and their usage.

## Table of Contents

1. [Setup](#setup)
2. [Available Tools](#available-tools)
3. [Tool Details](#tool-details)
4. [Use Cases](#use-cases)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Setup

### Installation

**Option 1: Remote Server (Recommended)**

```json
{
  "mcpServers": {
    "tavily": {
      "url": "https://mcp.tavily.com/mcp/?tavilyApiKey=YOUR_API_KEY",
      "disabled": false,
      "autoApprove": ["tavily_search", "tavily_extract"]
    }
  }
}
```

**Option 2: Local NPM Package**

```json
{
  "mcpServers": {
    "tavily": {
      "command": "npx",
      "args": ["-y", "tavily-mcp@latest"],
      "env": {
        "TAVILY_API_KEY": "YOUR_API_KEY"
      },
      "disabled": false,
      "autoApprove": ["tavily_search"]
    }
  }
}
```

### Get API Key

- Sign up at [https://app.tavily.com/](https://app.tavily.com/)
- Free tier: 1,000 API credits/month
- No credit card required

---

## Available Tools

| Tool             | Description                              | Credits   |
| ---------------- | ---------------------------------------- | --------- |
| `tavily_search`  | Search the web with AI-optimized results | 1-2       |
| `tavily_extract` | Extract clean content from URLs          | 1 per URL |
| `tavily_crawl`   | Intelligently crawl entire domains       | Variable  |
| `tavily_map`     | Map website structure and discover URLs  | Variable  |

---

## Tool Details

### 1. tavily_search

Search the web with AI-optimized ranking and content extraction.

#### Parameters

```typescript
{
  query: string,              // Required: Search query
  max_results?: number,       // Default: 5, Range: 5-20
  search_depth?: string,      // 'basic' (1 credit) or 'advanced' (2 credits)
  topic?: string,             // 'general', 'news', 'finance'
  include_answer?: boolean,   // Include AI-generated answer
  include_raw_content?: boolean, // Include full page content
  include_images?: boolean,   // Include related images
  include_domains?: string[], // Whitelist domains
  exclude_domains?: string[], // Blacklist domains
  time_range?: string,        // 'day', 'week', 'month', 'year'
  country?: string,           // Boost results from specific country
  auto_parameters?: boolean   // Let Tavily optimize parameters
}
```

#### Response

```typescript
{
  query: string,
  answer?: string,           // AI-generated answer (if requested)
  results: [
    {
      title: string,
      url: string,
      content: string,       // Relevant snippet
      score: number,         // Relevancy score
      raw_content?: string,  // Full page content (if requested)
      favicon?: string
    }
  ],
  images?: [
    {
      url: string,
      description?: string
    }
  ],
  response_time: string,
  request_id: string
}
```

#### Examples

**Basic Search**

```typescript
tavily_search({
  query: "Next.js 15 new features",
  max_results: 5,
});
```

**Advanced Search with Answer**

```typescript
tavily_search({
  query: "How does React Server Components work?",
  search_depth: "advanced",
  include_answer: true,
  max_results: 10,
});
```

**News Search**

```typescript
tavily_search({
  query: "AI developments",
  topic: "news",
  time_range: "week",
  max_results: 5,
});
```

**Domain-Specific Search**

```typescript
tavily_search({
  query: "TypeScript best practices",
  include_domains: ["typescript.org", "github.com"],
  max_results: 5,
});
```

**Country-Specific Search**

```typescript
tavily_search({
  query: "local business regulations",
  country: "united states",
  max_results: 5,
});
```

---

### 2. tavily_extract

Extract clean, structured content from one or multiple URLs.

#### Parameters

```typescript
{
  urls: string[],              // Required: Array of URLs to extract
  format?: string,             // 'markdown' or 'text'
  extract_depth?: string,      // 'basic' or 'advanced'
  include_images?: boolean,    // Include images from pages
  include_favicon?: boolean    // Include favicon URLs
}
```

#### Response

```typescript
{
  results: [
    {
      url: string,
      title?: string,
      content?: string,        // Cleaned content
      raw_content: string,     // Full extracted content
      images?: string[],
      favicon?: string
    }
  ],
  response_time: string
}
```

#### Examples

**Extract Single URL**

```typescript
tavily_extract({
  urls: ["https://docs.example.com/api"],
});
```

**Extract Multiple URLs**

```typescript
tavily_extract({
  urls: [
    "https://blog.example.com/post-1",
    "https://blog.example.com/post-2",
    "https://blog.example.com/post-3",
  ],
  format: "markdown",
});
```

**Advanced Extraction with Images**

```typescript
tavily_extract({
  urls: ["https://example.com/article"],
  extract_depth: "advanced",
  include_images: true,
  format: "markdown",
});
```

#### Use Cases

- Extract documentation for RAG systems
- Scrape article content for analysis
- Get clean text from web pages
- Build knowledge bases from URLs
- Content migration and archiving

---

### 3. tavily_crawl

Intelligently crawl websites starting from a base URL, following links and extracting content.

#### Parameters

```typescript
{
  url: string,                 // Required: Starting URL
  instructions?: string,       // Natural language crawl instructions
  max_depth?: number,          // How deep to crawl (default: 1)
  max_breadth?: number,        // Links per page (default: 20)
  limit?: number,              // Total pages to crawl (default: 50)
  select_domains?: string[],   // Regex patterns for allowed domains
  select_paths?: string[],     // Regex patterns for allowed paths
  allow_external?: boolean,    // Include external links (default: true)
  format?: string,             // 'markdown' or 'text'
  extract_depth?: string       // 'basic' or 'advanced'
}
```

#### Response

```typescript
{
  results: [
    {
      url: string,
      title: string,
      content: string,
      raw_content: string,
      links: string[]          // Links found on this page
    }
  ],
  external_links?: string[],   // External links discovered
  response_time: string
}
```

#### Examples

**Basic Documentation Crawl**

```typescript
tavily_crawl({
  url: "https://docs.example.com",
  instructions: "Find all API documentation pages",
  max_depth: 2,
  limit: 50,
});
```

**Focused Path Crawl**

```typescript
tavily_crawl({
  url: "https://example.com",
  select_paths: ["/docs/.*", "/api/.*"],
  max_depth: 3,
  limit: 100,
});
```

**Subdomain-Specific Crawl**

```typescript
tavily_crawl({
  url: "https://docs.example.com",
  select_domains: ["^docs\\.example\\.com$"],
  instructions: "Crawl only the documentation subdomain",
  max_depth: 2,
});
```

**Blog Content Crawl**

```typescript
tavily_crawl({
  url: "https://blog.example.com",
  instructions: "Find all blog posts from 2024",
  select_paths: ["/2024/.*"],
  max_breadth: 30,
  limit: 200,
});
```

#### Use Cases

- Build comprehensive documentation databases
- Create site backups or archives
- Gather training data for AI models
- Competitive analysis and research
- Content auditing and SEO analysis

---

### 4. tavily_map

Map website structure without extracting content - discover all accessible URLs.

#### Parameters

```typescript
{
  url: string,                 // Required: Starting URL
  instructions?: string,       // Natural language mapping instructions
  max_depth?: number,          // How deep to map (default: 1)
  max_breadth?: number,        // Links per page (default: 20)
  limit?: number,              // Total URLs to discover (default: 50)
  select_domains?: string[],   // Regex patterns for allowed domains
  select_paths?: string[],     // Regex patterns for allowed paths
  allow_external?: boolean     // Include external links (default: true)
}
```

#### Response

```typescript
{
  results: [
    {
      url: string,
      title: string,
      links: string[]          // All links found on this page
    }
  ],
  external_links?: string[],   // External links discovered
  total_urls: number,
  response_time: string
}
```

#### Examples

**Site Structure Discovery**

```typescript
tavily_map({
  url: "https://example.com",
  max_depth: 3,
  limit: 500,
});
```

**API Endpoint Discovery**

```typescript
tavily_map({
  url: "https://api.example.com",
  instructions: "Map all API endpoints",
  select_paths: ["/v1/.*", "/v2/.*"],
});
```

**Sitemap Generation**

```typescript
tavily_map({
  url: "https://example.com",
  instructions: "Create a complete sitemap",
  max_depth: 5,
  limit: 1000,
  allow_external: false,
});
```

#### Use Cases

- Generate sitemaps
- Discover hidden pages
- Analyze site architecture
- Find broken links
- SEO auditing
- Competitive analysis

---

## Use Cases

### 1. Research & Analysis

**Deep Research Workflow**

```typescript
// Step 1: Search for relevant sources
const searchResults = await tavily_search({
  query: "quantum computing applications",
  search_depth: "advanced",
  max_results: 10,
});

// Step 2: Extract full content from top sources
const urls = searchResults.results.slice(0, 5).map((r) => r.url);
const extracted = await tavily_extract({ urls });

// Step 3: Analyze extracted content
// Process the full content for comprehensive analysis
```

**Legal Document Research**

```typescript
// Search for specific case
const cases = await tavily_search({
  query: "Supreme Court ruling 2024",
  include_domains: ["supremecourt.gov", "law.cornell.edu"],
  max_results: 5,
});

// Extract full judgment text
const judgment = await tavily_extract({
  urls: [cases.results[0].url],
  format: "markdown",
});
```

### 2. Documentation & Knowledge Base

**Build Documentation Database**

```typescript
// Crawl entire documentation site
const docs = await tavily_crawl({
  url: "https://docs.framework.com",
  instructions: "Extract all documentation pages",
  max_depth: 3,
  limit: 500,
  format: "markdown",
});

// Store in vector database for RAG
docs.results.forEach((doc) => {
  // Store doc.content in your vector DB
});
```

**API Documentation Extraction**

```typescript
const apiDocs = await tavily_crawl({
  url: "https://api.example.com/docs",
  select_paths: ["/docs/api/.*", "/reference/.*"],
  instructions: "Extract all API endpoint documentation",
  max_depth: 2,
});
```

### 3. Content Aggregation

**News Monitoring**

```typescript
const news = await tavily_search({
  query: "AI industry news",
  topic: "news",
  time_range: "day",
  max_results: 20,
  include_images: true,
});
```

**Blog Content Collection**

```typescript
const blogPosts = await tavily_crawl({
  url: "https://blog.example.com",
  instructions: "Find all blog posts",
  select_paths: ["/blog/.*", "/posts/.*"],
  max_depth: 2,
  limit: 100,
});
```

### 4. Competitive Intelligence

**Competitor Analysis**

```typescript
// Map competitor site structure
const siteMap = await tavily_map({
  url: "https://competitor.com",
  max_depth: 3,
  limit: 500,
});

// Extract key pages
const keyPages = await tavily_extract({
  urls: [
    "https://competitor.com/pricing",
    "https://competitor.com/features",
    "https://competitor.com/about",
  ],
});
```

### 5. SEO & Site Auditing

**Comprehensive Site Audit**

```typescript
// Map entire site
const sitemap = await tavily_map({
  url: "https://yoursite.com",
  max_depth: 5,
  limit: 1000,
  allow_external: true,
});

// Identify external links
const externalLinks = sitemap.external_links;

// Check for broken links
// Analyze site structure
```

### 6. Training Data Collection

**Gather Training Data**

```typescript
// Search for relevant content
const sources = await tavily_search({
  query: "machine learning tutorials",
  search_depth: "advanced",
  max_results: 20,
});

// Extract full content
const trainingData = await tavily_extract({
  urls: sources.results.map((r) => r.url),
  format: "text",
});
```

---

## Best Practices

### Search Optimization

1. **Use Specific Queries**

   - ❌ "programming"
   - ✅ "React Server Components best practices 2024"

2. **Leverage Search Depth**

   - Use `basic` for quick answers (1 credit)
   - Use `advanced` for comprehensive research (2 credits)

3. **Filter by Domain**

   ```typescript
   // For technical docs
   include_domains: ["docs.microsoft.com", "developer.mozilla.org"];

   // Exclude forums
   exclude_domains: ["reddit.com", "stackoverflow.com"];
   ```

4. **Use Auto Parameters**
   ```typescript
   auto_parameters: true; // Let Tavily optimize
   ```

### Extraction Best Practices

1. **Batch URLs**

   ```typescript
   // ✅ Good: Extract multiple URLs at once
   tavily_extract({ urls: [url1, url2, url3] });

   // ❌ Bad: Multiple separate calls
   tavily_extract({ urls: [url1] });
   tavily_extract({ urls: [url2] });
   ```

2. **Choose Right Format**

   - `markdown`: For structured content, documentation
   - `text`: For plain text analysis, embeddings

3. **Use Advanced Depth for Complex Pages**
   ```typescript
   extract_depth: "advanced"; // Better for tables, embedded content
   ```

### Crawling Best Practices

1. **Start Small**

   ```typescript
   max_depth: 1,  // Test first
   limit: 10
   ```

2. **Use Instructions**

   ```typescript
   instructions: "Find only product documentation pages, ignore blog posts";
   ```

3. **Limit Scope with Regex**

   ```typescript
   select_paths: ["/docs/.*"],  // Only /docs/* paths
   select_domains: ["^docs\\.example\\.com$"]  // Only docs subdomain
   ```

4. **Monitor Credits**
   - Crawling can use many credits
   - Set reasonable `limit` values
   - Use `max_depth` wisely

### Cost Optimization

| Operation         | Credits  | Optimization              |
| ----------------- | -------- | ------------------------- |
| Basic Search      | 1        | Default for quick queries |
| Advanced Search   | 2        | Use when depth matters    |
| Extract (per URL) | 1        | Batch multiple URLs       |
| Crawl             | Variable | Set strict limits         |

---

## Troubleshooting

### Common Issues

**1. "No results found"**

- Query too specific
- Try broader terms
- Remove domain filters

**2. "Rate limit exceeded"**

- Free tier: 1,000 credits/month
- Upgrade plan or optimize usage
- Batch operations when possible

**3. "Extraction failed"**

- URL might be blocked
- Try different `extract_depth`
- Check if site allows scraping

**4. "Crawl timeout"**

- Reduce `max_depth`
- Lower `limit`
- Use more specific `select_paths`

### Error Handling

```typescript
try {
  const results = await tavily_search({ query, max_results: 5 });
} catch (error) {
  if (error.message.includes("rate limit")) {
    // Handle rate limiting
  } else if (error.message.includes("invalid")) {
    // Handle invalid parameters
  }
}
```

---

## API Limits

### Free Tier

- 1,000 API credits/month
- No credit card required
- All features available

### Rate Limits

- Development: 5 requests/second
- Production: Contact Tavily for higher limits

### Credit Usage

- Basic search: 1 credit
- Advanced search: 2 credits
- Extract: 1 credit per URL
- Crawl/Map: Variable (based on pages processed)

---

## Additional Resources

- **Documentation**: [https://docs.tavily.com](https://docs.tavily.com)
- **API Playground**: [https://app.tavily.com/playground](https://app.tavily.com/playground)
- **Community**: [https://community.tavily.com](https://community.tavily.com)
- **GitHub**: [https://github.com/tavily-ai](https://github.com/tavily-ai)
- **Status**: [https://status.tavily.com](https://status.tavily.com)

---

## Quick Reference

### Search

```typescript
tavily_search({ query: "your query", max_results: 5 });
```

### Extract

```typescript
tavily_extract({ urls: ["https://example.com"] });
```

### Crawl

```typescript
tavily_crawl({
  url: "https://example.com",
  instructions: "Find all docs",
  max_depth: 2,
});
```

### Map

```typescript
tavily_map({
  url: "https://example.com",
  max_depth: 3,
  limit: 100,
});
```

---

**Last Updated**: January 2025  
**Version**: 1.0  
**MCP Package**: `tavily-mcp@latest`
