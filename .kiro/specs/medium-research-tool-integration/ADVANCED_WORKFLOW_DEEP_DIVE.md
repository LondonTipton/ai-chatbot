# Advanced Search Workflow: Deep Dive

## Overview

The Advanced Search Workflow is the **sweet spot** between speed and quality - comprehensive enough for serious research, fast enough for interactive use. Let's explore how it works in detail.

---

## Architecture

```
User Query
    ↓
Step 1: Advanced Search (2-4K tokens, 2-4s)
    ↓
Step 2: Extract Top Sources (1-3K tokens, 2-4s)
    ↓
Step 3: Synthesize (1-1.5K tokens, 1-2s)
    ↓
Final Response (4-8K tokens total, 5-10s)
```

---

## Step 1: Advanced Search (Deep Dive)

### What It Does

Performs a **comprehensive Tavily search** with Zimbabwe-specific optimizations.

### Configuration

```typescript
{
  search_depth: "advanced",        // Deep search algorithm
  include_answer: true,            // Get AI-generated answer
  include_raw_content: false,      // Don't include full content (yet)
  max_results: 7,                  // Balanced breadth
  include_domains: [               // Zimbabwe legal domains
    "gov.zw",
    "zimlii.org",
    "parlzim.gov.zw",
    "veritaszim.net",
    "co.zw"
  ],
  country: "ZW",                   // Boost Zimbabwe results
  time_range: "year"               // Recent content (past year)
}
```

### Input

```typescript
{
  query: "employment termination procedures in Zimbabwe",
  jurisdiction: "Zimbabwe"
}
```

### Process

1. **Query Enhancement**

   - Original: "employment termination procedures"
   - Enhanced: "employment termination procedures Zimbabwe"
   - Adds jurisdiction context

2. **Domain Filtering**

   - Prioritizes Zimbabwe legal domains
   - `.gov.zw` - Government sites
   - `zimlii.org` - Zimbabwe Legal Information Institute
   - `parlzim.gov.zw` - Parliament of Zimbabwe
   - `veritaszim.net` - Veritas Zimbabwe
   - `.co.zw` - Zimbabwe commercial domains

3. **Advanced Search Algorithm**

   - Tavily's "advanced" depth uses:
     - Multiple search engines
     - Semantic understanding
     - Relevance ranking
     - Content quality scoring

4. **Country Boosting**

   - `country: "ZW"` prioritizes Zimbabwe sources
   - Doesn't exclude international sources
   - Balances local and global perspectives

5. **Time Range Filtering**
   - `time_range: "year"` focuses on recent content
   - Ensures current legal information
   - Filters out outdated sources

### Output

```typescript
{
  query: "employment termination procedures Zimbabwe",
  answer: "In Zimbabwe, employment termination procedures are governed by...",
  results: [
    {
      position: 1,
      title: "Labour Act Chapter 28:01 - Employment Termination",
      url: "https://zimlii.org/zw/legislation/act/...",
      content: "The Labour Act provides that an employer may terminate...",
      relevanceScore: 0.95,
      publishedDate: "2023-08-15"
    },
    // ... 6 more results
  ],
  totalResults: 7,
  searchDepth: "advanced",
  tokenEstimate: 3200
}
```

### Token Breakdown

- **AI Answer:** ~500-800 tokens
  - Comprehensive summary from Tavily
  - Synthesized from all sources
- **7 Search Results:** ~1500-3000 tokens

  - Title: ~10-20 tokens each
  - URL: ~10-15 tokens each
  - Content snippet: ~150-300 tokens each
  - Metadata: ~20-30 tokens each

- **Total:** 2000-4000 tokens

### Why 7 Results?

- **Not too few:** 3 results (basic) may miss important perspectives
- **Not too many:** 10 results (comprehensive) increases tokens/latency
- **Sweet spot:** 7 provides good coverage without bloat
- **Token efficient:** Balances breadth with budget

---

## Step 2: Extract Top Sources (Deep Dive)

### What It Does

Extracts **full raw content** from the **top 2 most relevant URLs** for deeper analysis.

### Why Extract?

**Search snippets are limited:**

- Only ~150-300 tokens per result
- May miss crucial details
- Lack full context
- Can't quote extensively

**Full extraction provides:**

- Complete document content
- Full legal text
- Detailed explanations
- Quotable passages

### Selection Logic

```typescript
// Take top 2 URLs by relevance score
const topUrls = results
  .slice(0, 2) // First 2 results
  .map((r) => r.url) // Extract URLs
  .filter(Boolean); // Remove nulls
```

**Why top 2?**

- **Relevance:** Tavily ranks by relevance score
- **Quality:** Top results are most authoritative
- **Token budget:** 2 full documents = ~1K-3K tokens
- **Diminishing returns:** 3rd+ sources add less value

### Input

```typescript
{
  urls: [
    "https://zimlii.org/zw/legislation/act/...",
    "https://parlzim.gov.zw/labour-act-amendments",
  ];
}
```

### Process

1. **API Call to Tavily Extract**

   ```typescript
   POST https://api.tavily.com/extract
   {
     api_key: "...",
     urls: [url1, url2]
   }
   ```

2. **Content Extraction**

   - Tavily fetches full webpage
   - Extracts main content (removes nav, ads, etc.)
   - Returns clean raw text
   - Preserves structure and formatting

3. **Token Estimation**
   - Calculates tokens per URL
   - Tracks total tokens
   - Helps with budget management

### Output

```typescript
{
  results: [
    {
      url: "https://zimlii.org/zw/legislation/act/...",
      rawContent: "LABOUR ACT [CHAPTER 28:01]\n\nPART I\nPRELIMINARY\n\n1. Short title\nThis Act may be cited as the Labour Act [Chapter 28:01].\n\n2. Interpretation\n(1) In this Act—\n\"contract of employment\" means...\n\n[Full 5000+ word document]",
      tokenEstimate: 1500
    },
    {
      url: "https://parlzim.gov.zw/labour-act-amendments",
      rawContent: "Labour Act Amendment Bill 2023\n\nMEMORANDUM\n\nThe purpose of this Bill is to amend the Labour Act...\n\n[Full 3000+ word document]",
      tokenEstimate: 900
    }
  ],
  totalTokens: 2400
}
```

### Token Breakdown

- **URL 1 (Legislation):** ~1000-2000 tokens

  - Full legal text
  - Definitions
  - Provisions
  - Amendments

- **URL 2 (Commentary):** ~500-1500 tokens

  - Analysis
  - Explanations
  - Examples
  - Context

- **Total:** 1500-3500 tokens

### Smart Skipping

The workflow **skips extraction** if:

- No search results available
- URLs are invalid/empty
- Extraction API fails
- Token budget exceeded

**Graceful degradation:**

```typescript
if (results.length === 0) {
  return {
    ...searchResults,
    extractions: [],
    extractionTokens: 0,
    skipped: true,
  };
}
```

This ensures the workflow **always completes** even if extraction fails.

---

## Step 3: Synthesize (Deep Dive)

### What It Does

Uses the **Synthesizer Agent** to create a comprehensive, well-formatted response from all gathered information.

### Input Data

```typescript
{
  // From Step 1: Search
  answer: "AI-generated answer from Tavily",
  results: [7 search results with snippets],

  // From Step 2: Extract
  extractions: [2 full documents],

  // Original query
  query: "employment termination procedures in Zimbabwe"
}
```

### Synthesis Prompt

```typescript
const synthesisPrompt = `Create comprehensive answer for Zimbabwe legal query: "${query}"

Search Results:
[
  {
    "position": 1,
    "title": "Labour Act Chapter 28:01",
    "url": "https://zimlii.org/...",
    "content": "The Labour Act provides that...",
    "relevanceScore": 0.95
  },
  // ... 6 more results
]

AI Answer: In Zimbabwe, employment termination procedures are governed by...

Extracted Content from Top Sources:
[
  {
    "url": "https://zimlii.org/...",
    "rawContent": "LABOUR ACT [CHAPTER 28:01]\n\nPART I\nPRELIMINARY...",
    "tokenEstimate": 1500
  },
  {
    "url": "https://parlzim.gov.zw/...",
    "rawContent": "Labour Act Amendment Bill 2023...",
    "tokenEstimate": 900
  }
]

Provide detailed answer with proper citations and Zimbabwe legal context.`;
```

### Synthesizer Agent Configuration

**Model:** `llama-3.3-70b` (more powerful for synthesis)

- Better at understanding complex legal text
- Superior formatting capabilities
- Stronger citation handling

**Instructions:**

- Format with markdown (headings, bullets, bold)
- Preserve ALL citations
- Structure: summary → sections → sources
- Professional legal writing
- Zimbabwe context emphasis

**Max Steps:** 1 (no tool calls, pure synthesis)

### Process

1. **Parse Input Data**

   - Understand query intent
   - Identify key information
   - Note source quality

2. **Structure Response**

   - Create outline
   - Organize by topic
   - Plan citation placement

3. **Write Summary**

   - 2-3 sentence overview
   - Key findings
   - Main takeaway

4. **Develop Sections**

   - Break into logical parts
   - Use clear headings
   - Include details from extractions

5. **Add Citations**

   - Inline citations where used
   - Sources section at end
   - Preserve all URLs

6. **Format Output**
   - Apply markdown
   - Ensure readability
   - Professional presentation

### Output

```markdown
## Employment Termination Procedures in Zimbabwe

**Summary:** In Zimbabwe, employment termination is governed by the Labour Act [Chapter 28:01], which requires employers to follow specific procedures including notice periods, grounds for termination, and employee rights. Recent amendments have strengthened worker protections.

### Legal Framework

The primary legislation governing employment termination in Zimbabwe is the **Labour Act [Chapter 28:01]**. According to the Act, an employer may terminate an employment contract on the following grounds:

- Misconduct by the employee
- Incapacity or incompetence
- Operational requirements (retrenchment)
- Expiry of a fixed-term contract

### Notice Requirements

The Labour Act specifies minimum notice periods based on employment duration:

- **Less than 1 year:** 1 week notice
- **1-2 years:** 2 weeks notice
- **2-5 years:** 1 month notice
- **Over 5 years:** 3 months notice

Employers may pay salary in lieu of notice.

### Termination for Misconduct

When terminating for misconduct, employers must:

1. Conduct a fair hearing
2. Allow the employee to respond to allegations
3. Consider mitigating circumstances
4. Apply progressive discipline where appropriate

The Labour Act Amendment Bill 2023 has strengthened these procedural requirements, emphasizing the importance of natural justice.

### Retrenchment Procedures

For operational requirements (retrenchment), employers must:

- Consult with affected employees or their representatives
- Provide at least 3 months notice
- Pay retrenchment packages as prescribed
- Follow the "last in, first out" principle unless skills are critical

### Employee Rights

Employees have the right to:

- Challenge unfair dismissal at the Labour Court
- Receive terminal benefits (unused leave, severance)
- Access their employment records
- Union representation during disciplinary proceedings

### Practical Implications

Employers should:

- Document all disciplinary processes thoroughly
- Ensure compliance with notice periods
- Consult legal counsel for complex cases
- Maintain clear employment policies

Employees should:

- Understand their rights under the Labour Act
- Seek legal advice if facing termination
- Document any unfair treatment
- Consider mediation before litigation

---

### Sources

1. [Labour Act Chapter 28:01 - Employment Termination](https://zimlii.org/zw/legislation/act/...)
2. [Labour Act Amendment Bill 2023](https://parlzim.gov.zw/labour-act-amendments)
3. [Employment Law in Zimbabwe - Government Portal](https://gov.zw/employment-law)
4. [Termination of Employment Guide](https://veritaszim.net/termination-guide)
5. [Labour Court Decisions on Unfair Dismissal](https://zimlii.org/zw/judgment/...)
6. [Employee Rights Under Zimbabwe Law](https://co.zw/employee-rights)
7. [Retrenchment Procedures and Best Practices](https://parlzim.gov.zw/retrenchment)
```

### Token Breakdown

- **Summary:** ~100-150 tokens
- **Main Content:** ~800-1200 tokens
  - Legal framework section
  - Notice requirements
  - Procedures
  - Rights
  - Practical implications
- **Sources Section:** ~100-200 tokens
- **Total:** 1000-1550 tokens

---

## Complete Workflow Token Budget

| Step       | Component        | Tokens        |
| ---------- | ---------------- | ------------- |
| **Step 1** | AI Answer        | 500-800       |
|            | 7 Search Results | 1500-3000     |
|            | **Subtotal**     | **2000-4000** |
| **Step 2** | URL 1 Extraction | 1000-2000     |
|            | URL 2 Extraction | 500-1500      |
|            | **Subtotal**     | **1500-3500** |
| **Step 3** | Synthesis        | 1000-1550     |
|            | **Subtotal**     | **1000-1550** |
| **Total**  |                  | **4500-9050** |

**Target:** 4K-8K tokens (within budget ✅)

---

## Latency Breakdown

| Step       | Operation               | Time      |
| ---------- | ----------------------- | --------- |
| **Step 1** | Tavily Advanced Search  | 2-4s      |
| **Step 2** | Tavily Extract (2 URLs) | 2-4s      |
| **Step 3** | LLM Synthesis           | 1-2s      |
| **Total**  |                         | **5-10s** |

**Target:** 5-10s (on target ✅)

---

## Quality Features

### 1. Zimbabwe-Specific Optimization

**Domain Filtering:**

- Prioritizes authoritative Zimbabwe sources
- Government sites (`.gov.zw`)
- Legal databases (`zimlii.org`)
- Parliament (`parlzim.gov.zw`)

**Country Boosting:**

- `country: "ZW"` parameter
- Boosts local results
- Maintains global context

### 2. Recency

**Time Range:**

- `time_range: "year"` ensures current info
- Filters outdated sources
- Captures recent amendments

### 3. Depth

**7 Search Results:**

- Multiple perspectives
- Comprehensive coverage
- Authoritative sources

**2 Full Extractions:**

- Complete legal text
- Detailed analysis
- Quotable content

### 4. Professional Synthesis

**Synthesizer Agent:**

- Powerful model (llama-3.3-70b)
- Legal writing expertise
- Citation preservation
- Markdown formatting

### 5. Robust Error Handling

**Graceful Degradation:**

- Search fails → empty results, continue
- Extract fails → skip, use search only
- Synthesis fails → return Tavily answer

**Always Returns Something:**

- Never fails completely
- Provides best available response
- Logs errors for debugging

---

## Use Cases

### ✅ Perfect For

1. **Complex Legal Questions**

   - "Explain employment termination procedures in Zimbabwe"
   - "What are the requirements for company registration?"
   - "Compare contract law principles in Zimbabwe"

2. **Multi-Perspective Research**

   - "Analyze recent constitutional amendments"
   - "What are different views on land reform?"
   - "Compare Zimbabwe and SADC labor laws"

3. **Current Legal Information**

   - "Latest Supreme Court decisions on X"
   - "Recent changes to tax law"
   - "Current regulatory requirements for Y"

4. **Comprehensive Analysis**
   - "Detailed overview of intellectual property law"
   - "Complete guide to business incorporation"
   - "Comprehensive analysis of criminal procedure"

### ❌ Not Ideal For

1. **Simple Factual Questions**

   - "What is the VAT rate?" → Use Basic Workflow
   - "Legal drinking age?" → Use QnA

2. **Extremely Deep Research**

   - "Publication-quality research paper" → Use Comprehensive Workflow
   - "Exhaustive case law analysis" → Use Comprehensive Workflow

3. **URL-Specific Analysis**
   - "Analyze this specific document" → Use Extract Mode

---

## Comparison to Other Workflows

| Feature             | Basic         | **Advanced**          | Comprehensive |
| ------------------- | ------------- | --------------------- | ------------- |
| **Steps**           | 2             | **3**                 | 5+            |
| **Search Results**  | 3             | **7**                 | 10            |
| **Extraction**      | None          | **Top 2**             | Top 5         |
| **Synthesis Model** | llama-3.3-70b | **llama-3.3-70b**     | llama-3.3-70b |
| **Tokens**          | 1K-2.5K       | **4K-8K**             | 18K-20K       |
| **Latency**         | 3-5s          | **5-10s**             | 25-47s        |
| **Quality**         | Good          | **Excellent**         | Publication   |
| **Use Case**        | Quick answers | **Balanced research** | Deep analysis |

---

## Key Takeaways

1. **Sweet Spot Design**

   - Balances depth (7 results + 2 extractions) with speed (5-10s)
   - Comprehensive enough for serious research
   - Fast enough for interactive use

2. **Zimbabwe Optimization**

   - Domain filtering for local sources
   - Country boosting for relevance
   - Time range for current info

3. **Robust Architecture**

   - Graceful error handling
   - Smart skipping when needed
   - Always returns something useful

4. **Professional Output**

   - Well-formatted markdown
   - Comprehensive citations
   - Legal writing standards

5. **Token Efficient**
   - 4K-8K budget (reasonable)
   - Tracks tokens at each step
   - Optimized for cost

The Advanced Search Workflow is the **default choice** for most legal research queries - it provides excellent quality without the latency and token cost of comprehensive workflows.
