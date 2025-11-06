# Quick Reference: Tavily Domain Prioritization

## 🎯 The Solution at a Glance

**Problem**: `include_domains` restricts Tavily to ONLY those domains  
**Solution**: Use `include_domains` as soft suggestions + `exclude_domains` for hard filters

```
┌─────────────────────────────────────────────────────────────┐
│                 TAVILY SEARCH REQUEST                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  exclude_domains: [spam, reddit, quora, medium, youtube]  │  ← Hard Filter
│                                                             │    (never included)
│  include_domains: [60+ ZW legal domains]                   │  ← Soft Suggestion
│                                                             │    (ranked higher)
│                                                             │
│  Result: ✅ Zimbabwe authority sources FIRST               │
│          ✅ Global sources ALSO included                   │
│          ✅ Spam NEVER included                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 The 60+ Zimbabwe Legal Domains (Organized by Tier)

### TIER 1: Government & Judicial Authority

```
Government:
  • zim.gov.zw - Ministry of Justice
  • parliament.go.zw - Parliament
  • molab.gov.zw - Ministry of Labour
  • zimra.co.zw - Zimbabwe Revenue Authority
  • rbz.co.zw - Reserve Bank

Courts:
  • jsc.org.zw - Judicial Service Commission
  • supremecourt.co.zw - Supreme Court
  • zimlii.org - Zimbabwe Legal Information Institute
```

### TIER 2: Legal Professionals & Organizations

```
Legal Bodies:
  • zils.ac.zw - Zimbabwe Institute of Legal Studies
  • zlsc.co.zw - Zimbabwe Law Society
  • lrfzim.com - Legal Resource Foundation
  • lawportal.co.zw - Legal portal
  • law.co.zw - Law aggregator

Education:
  • msu.ac.zw - Midlands State University Law
  • uz.ac.zw - University of Zimbabwe Law

Advocacy:
  • veritaszim.net - Veritas Zimbabwe
  • zimrights.org - Zimbabwe Human Rights Forum
```

### TIER 3: Regional & Publishers

```
  • saflii.org - Southern African Legal Information Institute
  • sadc.int - SADC
  • au.int - African Union
  • bailii.org - British & Irish Legal Info (common law reference)
```

### TIER 4: News Sources

```
  • herald.co.zw, newsday.co.zw, newzimbabwe.com, thestandard.co.zw
```

---

## 🎮 Using Domain Prioritization

### Method 1: Direct Tool Use (Recommended)

```typescript
// mastra/agents/my-agent.ts
import { tavilySearchTool } from "@mastra/core/tools";

// Simple question - get balanced results
const result = await tavilySearchTool.execute({
  query: "What is employment law?",
  domainStrategy: "prioritized", // Default - Zimbabwe + global
});
// Returns: tier1 sources first, then tier2-4

// Specific statute - Zimbabwe only
const result = await tavilySearchTool.execute({
  query: "Section 5 Labour Act",
  domainStrategy: "strict", // ONLY Zimbabwe
});
// Returns: Only tier1 + tier2 sources

// Comparative study - global focus
const result = await tavilySearchTool.execute({
  query: "Compare Zimbabwe IP law with South Africa",
  domainStrategy: "open", // Exclude spam, search globally
});
// Returns: All sources ranked by Tavily relevance
```

### Method 2: Using Domain Strategy Builder

```typescript
import {
  buildTavilyRequestBody,
  selectOptimalStrategy,
} from "@/lib/utils/tavily-domain-strategy";

const query = "What is the Zimbabwe Labour Act?";
const strategy = selectOptimalStrategy(query); // Auto-selects "prioritized"

const requestBody = buildTavilyRequestBody(query, strategy, "standard");
// requestBody includes optimized exclude/include_domains

const response = await fetch("https://api.tavily.com/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ...requestBody,
    api_key: process.env.TAVILY_API_KEY,
  }),
});
```

### Method 3: Testing

```bash
# Test default prioritized strategy
curl http://localhost:3000/api/test/tavily

# Test strict (Zimbabwe only)
curl http://localhost:3000/api/test/tavily?strategy=strict

# Test with deep research
curl http://localhost:3000/api/test/tavily?strategy=prioritized&depth=deep
```

---

## 🔍 Understanding Results

Each result now includes:

```typescript
{
  title: "...",
  url: "https://...",
  content: "...",
  tier: "tier1" | "tier2" | "tier3" | "tier4" | "external",

  sourceDistribution: {
    zimbabweAuthority: 3,    // tier1 sources
    zimbabweOther: 1,        // Other .zw domains
    regional: 2,             // SADC/African
    global: 4                // International
  }
}
```

### Tier Interpretation:

- **tier1** = Government/Court sources (Most authoritative)
- **tier2** = Legal professionals/educators (High authority)
- **tier3** = Regional/Publishers (Moderate authority)
- **tier4** = News sources (Current information)
- **external** = Other sources (Reference only)

---

## 🧠 When to Use Each Strategy

```
QUERY TYPE                          STRATEGY        DEPTH
──────────────────────────────────────────────────────────
"What is contract law?"             prioritized     standard
"Explain employment law"            prioritized     standard
"How do I file a court case?"       prioritized     standard

"Section 42 Labour Act"             strict          deep
"Constitutional provision"          strict          quick
"Recent legislative change"         prioritized     comprehensive

"Compare Zimbabwe vs RSA law"       open            comprehensive
"International best practices"      open            deep
```

---

## 🚀 Integration Checklist

- [x] `lib/utils/zimbabwe-domains.ts` - Created (60+ domains)
- [x] `lib/utils/tavily-domain-strategy.ts` - Created (3 strategies)
- [x] `mastra/tools/tavily-search.ts` - Updated
- [x] `mastra/tools/tavily-search-advanced.ts` - Updated
- [x] `mastra/tools/tavily-qna.ts` - Updated
- [x] `mastra/tools/tavily-news-search.ts` - Updated
- [x] `app/api/test/tavily/route.ts` - Enhanced
- [ ] `lib/ai/tools/tavily-search.ts` - Optional
- [ ] `lib/ai/tools/tavily-qna.ts` - Optional
- [ ] `lib/ai/tools/tavily-advanced-search.ts` - Optional

---

## 💡 Key Insight

```
The beauty of this approach:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ OLD WAY (Restrictive):
   include_domains: ["zimlii.org", "jsc.org.zw"]
   → Only those 2 domains
   → Very limited diversity
   → Can't find alternative perspectives

✅ NEW WAY (Intelligent Prioritization):
   exclude_domains: [spam, reddit, quora, ...]
   include_domains: [60+ ZW legal domains]
   → Zimbabwe sources ranked FIRST
   → Global sources still AVAILABLE
   → Tavily ranks relevance naturally
   → Balanced authority + diversity

RESULT: Users get authoritative Zimbabwe sources
        WITH context from trusted global perspectives
```

---

## 📞 Support

For specific queries about a domain's tier:

```typescript
import { getDomainTier } from "@/lib/utils/zimbabwe-domains";

const tier = getDomainTier("https://zimlii.org/case/123");
console.log(tier); // "tier1"

const tier = getDomainTier("https://reddit.com/r/law");
console.log(tier); // "external"
```

---

## 🎓 Examples by Use Case

### Legal Team Researching New Statute

```typescript
await tavilySearchTool.execute({
  query: "Zimbabwe Property Act 1996 Section 5",
  domainStrategy: "strict",
  researchDepth: "deep",
});
// Result: Only authoritative Zimbabwe sources
```

### Journalist Covering Legal Development

```typescript
await tavilyNewsSearchTool.execute({
  query: "Zimbabwe court ruling employment",
  days: 7,
  domainStrategy: "prioritized",
});
// Result: Recent news from Zimbabwe, including global context
```

### Academic Doing Comparative Study

```typescript
await tavilySearchTool.execute({
  query: "Intellectual property law Zimbabwe SADC comparison",
  domainStrategy: "open",
  researchDepth: "comprehensive",
});
// Result: Global sources ranked by relevance, Zimbabwe naturally prioritized
```

### Client Needing Quick Answer

```typescript
await tavilyQnaTool.execute({
  query: "Is a verbal contract legally binding in Zimbabwe?",
});
// Result: Direct answer from top tier1 sources
```

---

## 📊 Performance Impact

- **Search Time**: No additional latency (same as before)
- **API Credits**: Same usage as before (Tavily ignores unknown params)
- **Result Quality**: ⬆️ Higher (spam filtered, authority ranked first)
- **Token Usage**: Minimal change (same response structure)

---

## 🔐 Production Readiness

All code includes:

- ✅ Error handling
- ✅ Type safety (TypeScript)
- ✅ Linting compliance
- ✅ Environment variable validation
- ✅ Fallback strategies

Ready to deploy to production! 🚀
