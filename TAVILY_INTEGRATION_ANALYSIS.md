# Tavily Integration Analysis & Improvement Opportunities

## Current Integration Overview

### Architecture

Tavily is integrated as an AI tool that the language model can call during conversations:

```
User Query → AI Model → Decides to use tavilySearch tool → Tavily API → Results → AI synthesizes response
```

**Location:** `lib/ai/tools/tavily-search.ts`

**Integration Point:** `app/(chat)/api/chat/route.ts` (registered as a tool)

**Prompt Instructions:** `lib/ai/prompts.ts` (system prompt with search directives)

### Current Capabilities

✅ **What Works Well:**

1. **Proactive Search** - AI searches first, asks later (after recent improvements)
2. **Flexible Queries** - Accepts partial information and refines
3. **Domain Filtering** - Can target specific authoritative sources
4. **Error Handling** - Graceful degradation when search fails
5. **Multi-turn Research** - Can perform sequential searches
6. **Rich Results** - Returns titles, URLs, content, relevance scores, dates

✅ **Search Parameters:**

- Query string (flexible, can be broad or specific)
- Search depth (basic/advanced)
- Max results (1-10)
- Include/exclude domains
- Automatic answer generation

✅ **Error Handling:**

- Missing API key detection
- Rate limit handling
- Network error recovery
- Helpful error messages

## Identified Improvement Opportunities

### 1. **Result Caching** (High Impact)

**Problem:** Repeated searches for the same information waste API calls and slow responses.

**Solution:** Implement intelligent caching

```typescript
// Proposed: lib/ai/tools/tavily-cache.ts
interface CachedResult {
  query: string;
  results: TavilyResponse;
  timestamp: number;
  expiresAt: number;
}

// Cache strategy:
// - Legal statutes: 7 days (rarely change)
// - Case law: 24 hours (new cases added)
// - News/amendments: 1 hour (frequently updated)
// - General queries: 6 hours
```

**Benefits:**

- Reduce API costs by 40-60%
- Faster response times
- Better user experience
- Stay within free tier limits

**Implementation:**

- Use Redis for distributed caching
- Or in-memory cache for single-instance deployments
- Cache key: hash of (query + searchDepth + domains)
- TTL based on query type (detect with keywords)

---

### 2. **Smart Query Enhancement** (Medium Impact)

**Problem:** User queries may be too vague or missing important context.

**Solution:** Automatic query enhancement before searching

```typescript
// Proposed enhancement
function enhanceQuery(userQuery: string, context: ConversationContext) {
  // Add jurisdiction if missing
  if (!userQuery.includes("Zimbabwe") && !userQuery.includes("Zimbabwean")) {
    userQuery += " Zimbabwe";
  }

  // Add legal context
  if (isLegalQuery(userQuery)) {
    userQuery += " law legal";
  }

  // Add recency for amendments/changes
  if (userQuery.includes("recent") || userQuery.includes("latest")) {
    userQuery += ` ${new Date().getFullYear()}`;
  }

  return userQuery;
}
```

**Benefits:**

- More relevant results
- Better hit rate
- Reduced need for follow-up searches

---

### 3. **Source Ranking & Filtering** (High Impact)

**Problem:** Not all sources are equally authoritative for legal information.

**Solution:** Implement source quality scoring

```typescript
// Proposed: lib/ai/tools/source-ranking.ts
const SOURCE_AUTHORITY_SCORES = {
  // Tier 1: Official government sources
  "gov.zw": 1.0,
  "parlzim.gov.zw": 1.0,
  "justice.gov.zw": 1.0,

  // Tier 2: Legal information institutes
  "zimlii.org": 0.9,
  "southernafricalitigationcentre.org": 0.9,

  // Tier 3: Reputable news
  "herald.co.zw": 0.7,
  "newsday.co.zw": 0.7,

  // Tier 4: Other sources
  default: 0.5,
};

function rankResults(results: TavilySearchResult[]) {
  return results
    .map((result) => ({
      ...result,
      authorityScore: getAuthorityScore(result.url),
      combinedScore: result.score * getAuthorityScore(result.url),
    }))
    .sort((a, b) => b.combinedScore - a.combinedScore);
}
```

**Benefits:**

- Prioritize official sources
- Reduce misinformation risk
- Better legal accuracy
- User trust

---

### 4. **Search Analytics & Monitoring** (Medium Impact)

**Problem:** No visibility into search effectiveness, costs, or patterns.

**Solution:** Implement analytics tracking

```typescript
// Proposed: lib/ai/tools/tavily-analytics.ts
interface SearchAnalytics {
  timestamp: Date;
  query: string;
  searchDepth: string;
  resultCount: number;
  responseTime: number;
  cacheHit: boolean;
  userId?: string;
  chatId: string;
  success: boolean;
  errorType?: string;
}

// Track metrics:
// - Total searches per day/week/month
// - Cache hit rate
// - Average response time
// - Most common queries
// - Error rates by type
// - Cost estimation
```

**Benefits:**

- Monitor API usage and costs
- Identify optimization opportunities
- Track search quality
- Detect issues early
- Inform caching strategy

---

### 5. **Parallel Multi-Source Search** (Medium Impact)

**Problem:** Sequential searches are slow for comprehensive research.

**Solution:** Parallel search execution

```typescript
// Proposed enhancement
async function comprehensiveSearch(topic: string) {
  const searches = await Promise.all([
    // Official sources
    tavilySearch({
      query: `${topic} Zimbabwe`,
      includeDomains: ["gov.zw", "parlzim.gov.zw"],
      searchDepth: "advanced",
    }),

    // Case law
    tavilySearch({
      query: `${topic} Zimbabwe court case`,
      includeDomains: ["zimlii.org"],
      searchDepth: "advanced",
    }),

    // Recent news
    tavilySearch({
      query: `${topic} Zimbabwe ${new Date().getFullYear()}`,
      searchDepth: "basic",
    }),
  ]);

  return mergeAndRankResults(searches);
}
```

**Benefits:**

- Faster comprehensive research
- Better coverage
- Cross-reference sources
- Identify conflicts

---

### 6. **Fallback Search Strategies** (Low Impact)

**Problem:** Initial search may return no results or poor results.

**Solution:** Automatic query refinement

```typescript
// Proposed: lib/ai/tools/search-fallback.ts
async function searchWithFallback(query: string) {
  // Try 1: Original query
  let results = await tavilySearch({ query, searchDepth: "advanced" });

  if (results.totalResults === 0) {
    // Try 2: Broader query (remove specific terms)
    results = await tavilySearch({
      query: broadenQuery(query),
      searchDepth: "advanced",
    });
  }

  if (results.totalResults === 0) {
    // Try 3: Remove domain restrictions
    results = await tavilySearch({
      query,
      searchDepth: "basic",
      // No domain filters
    });
  }

  return results;
}
```

**Benefits:**

- Higher success rate
- Better user experience
- Reduced "no results" scenarios

---

### 7. **PDF & Document Extraction** (High Impact)

**Problem:** Many legal documents are in PDF format, not indexed well by search.

**Solution:** Direct PDF processing

```typescript
// Proposed: lib/ai/tools/pdf-extractor.ts
async function extractLegalDocument(url: string) {
  // Use Tavily's raw content feature or external PDF parser
  const pdfContent = await extractPDFText(url);

  return {
    url,
    content: pdfContent,
    type: "legal_document",
    sections: parseLegalSections(pdfContent),
  };
}
```

**Benefits:**

- Access to official legal documents
- Better case law research
- Direct statute access
- More accurate citations

---

### 8. **Semantic Search Enhancement** (Medium Impact)

**Problem:** Keyword-based search may miss relevant results.

**Solution:** Use embeddings for semantic similarity

```typescript
// Proposed: lib/ai/tools/semantic-search.ts
async function semanticSearch(query: string) {
  // Get initial results
  const results = await tavilySearch({ query });

  // Re-rank using embeddings
  const queryEmbedding = await getEmbedding(query);

  const reranked = await Promise.all(
    results.results.map(async (result) => {
      const contentEmbedding = await getEmbedding(result.content);
      const similarity = cosineSimilarity(queryEmbedding, contentEmbedding);

      return {
        ...result,
        semanticScore: similarity,
        finalScore: result.score * 0.5 + similarity * 0.5,
      };
    })
  );

  return reranked.sort((a, b) => b.finalScore - a.finalScore);
}
```

**Benefits:**

- Find conceptually related content
- Better understanding of user intent
- Improved result relevance

---

### 9. **Search Result Summarization** (Low Impact)

**Problem:** Long search results are hard to digest quickly.

**Solution:** AI-powered summarization

```typescript
// Proposed: lib/ai/tools/result-summarizer.ts
async function summarizeResults(results: TavilySearchResult[]) {
  const summaries = await Promise.all(
    results.map(async (result) => ({
      ...result,
      summary: await generateSummary(result.content, {
        maxLength: 100,
        focus: "legal_implications",
      }),
      keyPoints: extractKeyPoints(result.content),
    }))
  );

  return summaries;
}
```

**Benefits:**

- Faster information scanning
- Better user experience
- Highlight key legal points

---

### 10. **Domain-Specific Search Modes** (Medium Impact)

**Problem:** Different legal queries need different search strategies.

**Solution:** Specialized search modes

```typescript
// Proposed: lib/ai/tools/search-modes.ts
const SEARCH_MODES = {
  case_law: {
    domains: ["zimlii.org", "southernafricalitigationcentre.org"],
    searchDepth: "advanced",
    maxResults: 10,
    queryEnhancement: (q) => `${q} court case judgment`,
  },

  statutes: {
    domains: ["gov.zw", "parlzim.gov.zw"],
    searchDepth: "advanced",
    maxResults: 5,
    queryEnhancement: (q) => `${q} act statute law`,
  },

  news: {
    domains: ["herald.co.zw", "newsday.co.zw"],
    searchDepth: "basic",
    maxResults: 7,
    queryEnhancement: (q) => `${q} ${new Date().getFullYear()}`,
  },

  procedures: {
    domains: ["gov.zw", "justice.gov.zw"],
    searchDepth: "advanced",
    maxResults: 5,
    queryEnhancement: (q) => `${q} procedure requirements how to`,
  },
};

function detectSearchMode(query: string): keyof typeof SEARCH_MODES {
  // Use keywords or AI classification
  if (query.match(/case|judgment|precedent/i)) return "case_law";
  if (query.match(/act|statute|section|law/i)) return "statutes";
  if (query.match(/recent|latest|news|amendment/i)) return "news";
  if (query.match(/how to|procedure|requirements|register/i))
    return "procedures";

  return "statutes"; // default
}
```

**Benefits:**

- Optimized search for each use case
- Better result quality
- Faster searches
- Lower costs

---

## Implementation Priority Matrix

### High Priority (Implement First)

1. **Result Caching** - Immediate cost savings and performance boost
2. **Source Ranking** - Critical for legal accuracy
3. **PDF Extraction** - Access to primary legal sources

### Medium Priority (Implement Next)

4. **Search Analytics** - Understand usage and optimize
5. **Smart Query Enhancement** - Improve result quality
6. **Parallel Multi-Source** - Better research capability
7. **Domain-Specific Modes** - Specialized search strategies
8. **Semantic Search** - Better relevance

### Low Priority (Nice to Have)

9. **Fallback Strategies** - Edge case handling
10. **Result Summarization** - UX enhancement

---

## Cost-Benefit Analysis

### Current Costs (Estimated)

- **Free Tier**: 1,000 searches/month = $0
- **Pro Tier**: ~$50-100/month for production use
- **Without caching**: ~500-1000 searches/day in production

### With Improvements (Estimated)

- **With caching (40% hit rate)**: 300-600 searches/day
- **Savings**: $20-40/month
- **Performance**: 50-200ms faster responses
- **User experience**: Significantly better

---

## Technical Implementation Plan

### Phase 1: Foundation (Week 1-2)

```typescript
// 1. Add caching infrastructure
// lib/ai/tools/tavily-cache.ts
export class TavilyCache {
  private cache: Map<string, CachedResult>;

  async get(key: string): Promise<TavilyResponse | null> {}
  async set(key: string, value: TavilyResponse, ttl: number): Promise<void> {}
  getCacheKey(params: SearchParams): string {}
}

// 2. Add analytics tracking
// lib/ai/tools/tavily-analytics.ts
export function trackSearch(analytics: SearchAnalytics): void {}
export function getSearchStats(): SearchStats {}

// 3. Implement source ranking
// lib/ai/tools/source-ranking.ts
export function rankResults(results: TavilySearchResult[]): RankedResult[] {}
```

### Phase 2: Enhancement (Week 3-4)

```typescript
// 4. Add query enhancement
// lib/ai/tools/query-enhancer.ts
export function enhanceQuery(query: string, context: Context): string {}

// 5. Implement search modes
// lib/ai/tools/search-modes.ts
export function detectMode(query: string): SearchMode {}
export function applyMode(
  params: SearchParams,
  mode: SearchMode
): SearchParams {}

// 6. Add parallel search
// lib/ai/tools/parallel-search.ts
export async function comprehensiveSearch(
  topic: string
): Promise<MergedResults> {}
```

### Phase 3: Advanced (Week 5-6)

```typescript
// 7. PDF extraction
// lib/ai/tools/pdf-extractor.ts
export async function extractPDF(url: string): Promise<DocumentContent> {}

// 8. Semantic search
// lib/ai/tools/semantic-search.ts
export async function semanticRerank(
  results: TavilySearchResult[]
): Promise<RankedResult[]> {}
```

---

## Configuration Changes Needed

### Environment Variables

```bash
# Current
TAVILY_API_KEY=tvly-xxx

# Add for improvements
REDIS_URL=redis://localhost:6379  # For caching
ENABLE_SEARCH_CACHE=true
CACHE_TTL_STATUTES=604800  # 7 days
CACHE_TTL_CASE_LAW=86400   # 24 hours
CACHE_TTL_NEWS=3600        # 1 hour
ENABLE_SEARCH_ANALYTICS=true
```

### Database Schema (Optional)

```sql
-- For persistent analytics
CREATE TABLE search_analytics (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  query TEXT NOT NULL,
  search_depth VARCHAR(20),
  result_count INTEGER,
  response_time FLOAT,
  cache_hit BOOLEAN,
  user_id UUID,
  chat_id UUID,
  success BOOLEAN,
  error_type VARCHAR(50)
);

CREATE INDEX idx_search_analytics_timestamp ON search_analytics(timestamp);
CREATE INDEX idx_search_analytics_user ON search_analytics(user_id);
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/tavily-cache.test.ts
describe("TavilyCache", () => {
  it("should cache and retrieve results", async () => {});
  it("should expire cached results after TTL", async () => {});
  it("should generate consistent cache keys", () => {});
});

// tests/source-ranking.test.ts
describe("Source Ranking", () => {
  it("should rank gov.zw higher than other sources", () => {});
  it("should combine relevance and authority scores", () => {});
});

// tests/query-enhancer.test.ts
describe("Query Enhancement", () => {
  it("should add Zimbabwe to queries", () => {});
  it("should add year to recent queries", () => {});
});
```

### Integration Tests

```typescript
// tests/integration/tavily-search.test.ts
describe("Tavily Search Integration", () => {
  it("should use cache for repeated queries", async () => {});
  it("should track analytics for all searches", async () => {});
  it("should rank results by authority", async () => {});
  it("should handle parallel searches", async () => {});
});
```

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Search Performance**

   - Average response time
   - Cache hit rate
   - Success rate
   - Error rate by type

2. **Cost Metrics**

   - API calls per day/week/month
   - Cost per search
   - Cache savings
   - Rate limit hits

3. **Quality Metrics**

   - Result relevance (user feedback)
   - Source authority distribution
   - Follow-up search rate
   - User satisfaction

4. **Usage Patterns**
   - Most common queries
   - Peak usage times
   - Search mode distribution
   - Domain filter usage

### Dashboard (Future)

```typescript
// app/api/admin/search-stats/route.ts
export async function GET() {
  return {
    today: {
      totalSearches: 150,
      cacheHits: 60,
      avgResponseTime: 850,
      costEstimate: 2.5,
    },
    thisWeek: {
      totalSearches: 890,
      topQueries: ["Labour Act", "property rights", "company registration"],
      errorRate: 0.02,
    },
  };
}
```

---

## Migration Path

### Step 1: Add Caching (No Breaking Changes)

- Implement cache layer
- Deploy with caching disabled
- Test thoroughly
- Enable caching gradually

### Step 2: Add Analytics (No Breaking Changes)

- Add tracking code
- Deploy
- Monitor for issues
- Analyze data

### Step 3: Enhance Search (Backward Compatible)

- Add query enhancement
- Add source ranking
- Deploy
- Monitor quality improvements

### Step 4: Advanced Features (Optional)

- Add PDF extraction
- Add semantic search
- Deploy as opt-in features
- Gather feedback

---

## Risk Assessment

### Low Risk

- ✅ Caching (can be disabled)
- ✅ Analytics (passive tracking)
- ✅ Source ranking (improves quality)

### Medium Risk

- ⚠️ Query enhancement (may change results)
- ⚠️ Parallel search (increased API usage)
- ⚠️ Search modes (complexity)

### High Risk

- ⚠️ PDF extraction (external dependencies)
- ⚠️ Semantic search (computational cost)

### Mitigation Strategies

1. **Feature Flags** - Enable/disable features easily
2. **Gradual Rollout** - Test with small user groups
3. **Monitoring** - Track metrics closely
4. **Rollback Plan** - Quick revert if issues arise
5. **A/B Testing** - Compare old vs. new approaches

---

## Success Criteria

### Phase 1 Success

- ✅ Cache hit rate > 30%
- ✅ Average response time < 1 second
- ✅ API cost reduction > 25%
- ✅ Zero breaking changes

### Phase 2 Success

- ✅ Result relevance improved (user feedback)
- ✅ Official sources prioritized
- ✅ Analytics dashboard functional
- ✅ Search quality metrics tracked

### Phase 3 Success

- ✅ PDF extraction working for major sources
- ✅ Semantic search improves relevance by 15%
- ✅ User satisfaction increased
- ✅ Comprehensive research capability

---

## Conclusion

The current Tavily integration is solid and functional, but there are significant opportunities for improvement:

**Quick Wins:**

1. Implement caching (immediate cost savings)
2. Add source ranking (better quality)
3. Track analytics (visibility)

**Medium-Term:**

4. Query enhancement (better results)
5. Search modes (specialized searches)
6. Parallel search (faster research)

**Long-Term:**

7. PDF extraction (primary sources)
8. Semantic search (better relevance)
9. Advanced analytics (insights)

**Estimated Impact:**

- 40-60% cost reduction
- 50-200ms faster responses
- Significantly better result quality
- Better user experience
- More accurate legal information

**Recommended Next Steps:**

1. Implement caching this week
2. Add analytics tracking
3. Deploy source ranking
4. Monitor and iterate

The improvements are largely backward-compatible and can be rolled out incrementally with minimal risk.
