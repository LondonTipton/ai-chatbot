# Tavily Search Configuration Analysis

## Current Configuration Overview

Your application uses **three domain strategies** for Tavily searches:

### 1. **Strict Strategy** (Most Restrictive)

- **Only searches** domains in the priority list
- Used for: Specific Zimbabwe statutory requirements (e.g., "Section 12 of Zimbabwe Act")
- **This could exclude your website** if it's not in the priority list

### 2. **Prioritized Strategy** (Default, Recommended)

- Searches **globally** but ranks priority domains higher
- Excludes spam/low-quality domains
- Used for: General legal questions
- **Most likely to find diverse sources**

### 3. **Open Strategy** (Least Restrictive)

- Searches globally
- Only excludes spam domains
- Used for: Comparative law or international context
- **Best for finding non-Zimbabwe sources**

## Domains Currently EXCLUDED (Blocked from all searches)

```javascript
// Social media
"reddit.com",
  "quora.com",
  "medium.com",
  "linkedin.com",
  "youtube.com",
  "instagram.com",
  "tiktok.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "pinterest.com";

// SEO spam
"w3schools.com", "stackoverflow.com", "wikihow.com";

// Low-authority
("disqus.com");

// Paywalled
"lexisnexis.com", "westlaw.com";

// AI-generated
("huggingface.co");
```

**⚠️ If your website is in this list, it will NEVER appear in search results**

## Domains Currently PRIORITIZED (Zimbabwe Legal Sources)

### Tier 1 (Highest Authority)

**Government:**

- zim.gov.zw, gov.zw, parlzim.gov.zw, parliament.go.zw
- justice.gov.zw, zimtreasury.gov.zw, zec.gov.zw
- zhrc.org.zw, zimra.co.zw, rbz.co.zw, nssa.co.zw

**Courts:**

- jsc.org.zw, supremecourt.co.zw, highcourt.gov.zw
- courtsofzimbabwe.co.zw

### Tier 2 (Professional)

**Legal Resources:**

- zimlii.org, veritaszim.net, zlhr.org.zw
- zils.ac.zw, zlsc.co.zw, lrfzim.com
- msu.ac.zw, uz.ac.zw, kubatana.net

**Professional Bodies:**

- zlsc.co.zw, zbca.co.zw, zimrights.org
- hrforumzim.com, changezimbabwe.org

### Tier 3 (Regional/Comparative)

- sadc.int, au.int, achpr.org
- saflii.org, africanlii.org, bailii.org

### Tier 4 (News - Lower Priority)

- herald.co.zw, newsday.co.zw, newzimbabwe.com
- thestandard.co.zw

## Why Your Website Might Be Missing

### Reason 1: **It's in the Exclude List**

If your website is in the excluded domains list above, it will never appear.

**Solution:** Remove it from `getExcludeDomains()` in `lib/utils/tavily-domain-strategy.ts`

### Reason 2: **Strict Strategy is Being Used**

When "strict" strategy is active, ONLY domains in the priority list are searched.

**When strict is used:**

- Query contains "section " or "article " or "zimbabwe act"

**Solution:**

- Add your domain to the priority list in `lib/utils/zimbabwe-domains.ts`
- OR ensure queries don't trigger strict mode

### Reason 3: **Not Enough Search Results**

Default search limits:

- Basic search: 3 results (`tavilySearchTool`)
- Advanced search: 7 results (`tavilySearchAdvancedTool`)
- Context search: Variable based on token budget

**Solution:** Increase `max_results` parameter in search tools

### Reason 4: **Tavily's Ranking Algorithm**

Even with "prioritized" or "open" strategy, Tavily ranks results by relevance. Your website might be:

- Ranked lower than other sources
- Not considered relevant for the query
- Not indexed by Tavily

**Solution:**

- Add domain to priority list to boost ranking
- Use more specific queries that match your content
- Verify Tavily has indexed your site

### Reason 5: **Country Filter**

Most searches use `country: "ZW"` which boosts Zimbabwe results.

**Solution:** If your site is international, this might lower its ranking

### Reason 6: **Time Range Filter**

Some searches use `time_range: "year"` which only returns recent content.

**Solution:** If your content is older, it might be filtered out

## How to Add Your Website to Priority List

### Step 1: Identify the Right Tier

**Tier 1** - Government/Courts (highest authority)

- Use if: Official government or court website

**Tier 2** - Legal/Professional (professional sources)

- Use if: Legal database, law firm, professional body, university

**Tier 3** - Regional/Publishers (comparative sources)

- Use if: Regional organization, legal publisher

**Tier 4** - News (lower priority)

- Use if: News outlet

### Step 2: Edit `lib/utils/zimbabwe-domains.ts`

Add your domain to the appropriate category:

```typescript
export const ZIMBABWE_LEGAL_DOMAINS: ZimbabweDomains = {
  legal: [
    "zimlii.org",
    "veritaszim.net",
    "YOUR-DOMAIN.com", // <-- Add here
    // ... rest
  ],
  // ... other categories
};
```

### Step 3: Test

After adding, the domain will be:

- Prioritized in "prioritized" strategy (default)
- Included in "strict" strategy (if appropriate tier)
- Ranked higher by Tavily's algorithm

## How to Remove a Domain from Exclude List

Edit `lib/utils/tavily-domain-strategy.ts`:

```typescript
export function getExcludeDomains(): string[] {
  return [
    // Remove the domain you want to allow
    // "medium.com",  // <-- Comment out or delete
    "reddit.com",
    // ... rest
  ];
}
```

## Debugging: Check Which Strategy is Being Used

The strategy is auto-selected based on query:

```typescript
// Strict: Very specific Zimbabwe statutory requirements
if (query.includes("section ") || query.includes("article ")) {
  return "strict"; // ONLY priority domains
}

// Prioritized (DEFAULT): General legal questions
if (query.includes("how to") || query.includes("what is")) {
  return "prioritized"; // Global search, priority ranking
}

// Open: Comparative law or international context
if (query.includes("compare") || query.includes("international")) {
  return "open"; // Global search, minimal filtering
}

// Default: prioritized
return "prioritized";
```

## Quick Fixes

### To include ANY website (not in priority list):

1. Make sure it's NOT in the exclude list
2. Use queries that trigger "open" or "prioritized" strategy
3. Avoid queries with "section", "article", "zimbabwe act"

### To prioritize a specific website:

1. Add it to `ZIMBABWE_LEGAL_DOMAINS` in the appropriate category
2. It will be ranked higher in all searches

### To increase chances of finding it:

1. Increase `max_results` in search tools
2. Use more specific queries matching the site's content
3. Remove `time_range` filter if content is older
4. Consider using "open" strategy for broader searches

## Files to Modify

1. **Domain Priority List:** `lib/utils/zimbabwe-domains.ts`
2. **Exclude List:** `lib/utils/tavily-domain-strategy.ts`
3. **Search Tools:**
   - `mastra/tools/tavily-search.ts` (basic)
   - `mastra/tools/tavily-search-advanced.ts` (advanced)
   - `mastra/tools/tavily-context-search.ts` (context)

## What Website Are You Missing?

Please tell me:

1. **What is the domain?** (e.g., example.com)
2. **What type of content?** (government, legal database, news, etc.)
3. **Is it Zimbabwe-specific or international?**

I can then tell you exactly why it's being filtered and how to fix it.
