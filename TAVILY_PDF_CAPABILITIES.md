# Tavily PDF and Document Access Capabilities

## Current Status

**Short Answer:** Tavily can find PDFs in search results but has **limited ability** to extract their full content directly.

## What Tavily Currently Does

### ✅ What Works

1. **PDF Discovery**

   - Tavily finds PDF links in search results
   - Returns PDF URLs in the results
   - Provides metadata (title, source)

2. **Snippet Extraction**

   - Returns text snippets from PDFs when available
   - Extracts content that's been indexed by search engines
   - Provides context around search terms

3. **Raw Content Option**
   - Tavily has an `include_raw_content` parameter
   - Currently set to `false` in our implementation
   - When enabled, provides fuller page content (but not complete PDF text)

### ❌ Current Limitations

1. **Full PDF Text Extraction**

   - Tavily doesn't extract complete PDF content
   - Only provides snippets/excerpts
   - Full document text requires separate processing

2. **Scanned PDFs**

   - OCR (Optical Character Recognition) not included
   - Image-based PDFs may not be accessible
   - Requires external OCR service

3. **Complex Formatting**
   - Legal document structure may be lost
   - Tables, footnotes, citations may not be preserved
   - Formatting information not included

## Current Implementation

```typescript
// lib/ai/tools/tavily-search.ts
const requestBody = {
  api_key: apiKey,
  query,
  search_depth: searchDepth,
  max_results: maxResults,
  include_answer: true,
  include_raw_content: false, // ← Currently disabled
};
```

## What You Get Now

When Tavily finds a PDF:

```json
{
  "title": "Zimbabwe Labour Act Amendment 2023",
  "url": "https://gov.zw/documents/labour-act-2023.pdf",
  "content": "...excerpt from the PDF showing relevant sections...",
  "score": 0.95,
  "published_date": "2023-12-15"
}
```

**The `content` field contains:**

- Text snippets around search terms
- Limited context (usually 200-500 characters)
- Not the full PDF content

## Improvement Options

### Option 1: Enable Raw Content (Easy)

**Change:**

```typescript
include_raw_content: true, // Enable fuller content extraction
```

**Benefits:**

- More content from web pages
- Better context
- No additional cost

**Limitations:**

- Still doesn't extract full PDF text
- Increases response size
- May slow down searches

**Recommendation:** ✅ Enable this - it's a simple improvement

---

### Option 2: Add PDF Extraction Service (Medium Complexity)

**Approach:** When Tavily returns a PDF URL, fetch and extract it separately

```typescript
// Proposed: lib/ai/tools/pdf-extractor.ts
import pdf from "pdf-parse";

async function extractPDFContent(url: string): Promise<string> {
  // Download PDF
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  // Extract text
  const data = await pdf(Buffer.from(buffer));

  return data.text;
}

// Enhanced search flow
async function searchWithPDFExtraction(query: string) {
  // 1. Search with Tavily
  const results = await tavilySearch({ query });

  // 2. Identify PDF results
  const pdfResults = results.results.filter((r) => r.url.endsWith(".pdf"));

  // 3. Extract PDF content
  const enrichedResults = await Promise.all(
    pdfResults.map(async (result) => ({
      ...result,
      fullContent: await extractPDFContent(result.url),
      contentType: "pdf",
    }))
  );

  return enrichedResults;
}
```

**Benefits:**

- Full PDF text access
- Better legal document analysis
- Complete statute/case text

**Challenges:**

- Requires PDF parsing library (`pdf-parse` or similar)
- Slower (download + parse time)
- Large PDFs may timeout
- Some PDFs may be protected/encrypted
- Scanned PDFs need OCR

**Cost:**

- PDF parsing library: Free (pdf-parse)
- Bandwidth: Minimal
- Processing time: 2-10 seconds per PDF

**Recommendation:** ✅ Implement for high-value use cases

---

### Option 3: Use Specialized Legal Document APIs (Complex)

**Services:**

- **CourtListener API** - US case law (not Zimbabwe)
- **LexisNexis API** - Comprehensive but expensive
- **Justia API** - Free but limited
- **Custom scraping** - Zimbabwe-specific sources

**For Zimbabwe:**

```typescript
// Proposed: lib/ai/tools/zimlii-scraper.ts
async function fetchFromZimLII(caseId: string) {
  // Direct access to Zimbabwe Legal Information Institute
  const url = `https://zimlii.org/zw/judgment/${caseId}`;
  const response = await fetch(url);
  const html = await response.text();

  // Parse HTML to extract case text
  return parseZimLIICase(html);
}
```

**Benefits:**

- Direct access to legal databases
- Structured data
- Reliable sources

**Challenges:**

- Zimbabwe-specific APIs limited
- May require web scraping
- Terms of service considerations
- Maintenance overhead

**Recommendation:** ⚠️ Consider for future, requires research

---

### Option 4: Hybrid Approach (Recommended)

**Strategy:** Combine multiple methods based on source

```typescript
// Proposed: lib/ai/tools/document-fetcher.ts
async function fetchLegalDocument(url: string) {
  // Detect source type
  if (url.includes("zimlii.org")) {
    return await fetchFromZimLII(url);
  } else if (url.endsWith(".pdf")) {
    return await extractPDFContent(url);
  } else if (url.includes("gov.zw")) {
    return await fetchGovernmentPage(url);
  } else {
    // Fallback to Tavily's content
    return null;
  }
}

// Enhanced Tavily integration
async function enhancedSearch(query: string) {
  const results = await tavilySearch({ query, include_raw_content: true });

  // Enrich high-value results
  const enriched = await Promise.all(
    results.results.slice(0, 3).map(async (result) => {
      const fullContent = await fetchLegalDocument(result.url);

      return {
        ...result,
        fullContent: fullContent || result.content,
        hasFullContent: !!fullContent,
      };
    })
  );

  return enriched;
}
```

**Benefits:**

- Best of all approaches
- Optimized per source
- Fallback options

**Recommendation:** ✅ Best long-term solution

---

## Immediate Action Items

### Quick Win (This Week)

1. **Enable raw content extraction**

```typescript
// lib/ai/tools/tavily-search.ts
const requestBody = {
  // ...
  include_raw_content: true, // ← Change this
};
```

**Impact:** 20-30% more content from web pages

---

### Short Term (This Month)

2. **Add basic PDF extraction**

```bash
# Install PDF parser
pnpm add pdf-parse
```

```typescript
// lib/ai/tools/pdf-extractor.ts
import pdf from "pdf-parse";

export async function extractPDF(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const data = await pdf(Buffer.from(buffer));

    return data.text;
  } catch (error) {
    console.error("PDF extraction failed:", error);
    return null;
  }
}
```

```typescript
// Update lib/ai/tools/tavily-search.ts
import { extractPDF } from "./pdf-extractor";

// In execute function, after getting results:
const enrichedResults = await Promise.all(
  formattedResults.map(async (result) => {
    if (result.url.endsWith(".pdf")) {
      const fullContent = await extractPDF(result.url);
      return {
        ...result,
        fullContent,
        hasFullContent: !!fullContent,
      };
    }
    return result;
  })
);
```

**Impact:** Full text access to PDF documents

---

### Medium Term (Next Quarter)

3. **Implement source-specific extractors**

   - ZimLII HTML parser
   - Government website scraper
   - News article extractor

4. **Add OCR for scanned PDFs**

   - Use Tesseract.js or cloud OCR
   - Handle image-based legal documents

5. **Implement caching**
   - Cache extracted PDF content
   - Reduce repeated downloads
   - Faster subsequent access

---

## Technical Considerations

### PDF Parsing Libraries

**Option A: pdf-parse (Recommended)**

```bash
pnpm add pdf-parse
```

- ✅ Simple API
- ✅ Good text extraction
- ✅ Free and open source
- ❌ No OCR for scanned PDFs
- ❌ May struggle with complex layouts

**Option B: pdf.js**

```bash
pnpm add pdfjs-dist
```

- ✅ Mozilla-maintained
- ✅ Robust
- ✅ Better layout handling
- ❌ More complex API
- ❌ Larger bundle size

**Option C: Cloud Services (Google Document AI, AWS Textract)**

- ✅ OCR included
- ✅ Better accuracy
- ✅ Handles complex documents
- ❌ Costs money
- ❌ External dependency
- ❌ Privacy concerns

### Performance Considerations

**PDF Download + Parse Time:**

- Small PDF (< 1MB): 1-3 seconds
- Medium PDF (1-5MB): 3-8 seconds
- Large PDF (> 5MB): 8-20 seconds

**Optimization Strategies:**

1. **Parallel processing** - Extract multiple PDFs concurrently
2. **Timeout limits** - Skip PDFs that take too long
3. **Size limits** - Only extract PDFs under 10MB
4. **Caching** - Store extracted content
5. **Lazy loading** - Extract only when user requests

### Error Handling

```typescript
async function safeExtractPDF(url: string): Promise<PDFResult> {
  try {
    // Check file size first
    const headResponse = await fetch(url, { method: "HEAD" });
    const size = parseInt(headResponse.headers.get("content-length") || "0");

    if (size > 10 * 1024 * 1024) {
      // 10MB limit
      return {
        success: false,
        error: "PDF too large",
        url,
      };
    }

    // Extract with timeout
    const content = await Promise.race([
      extractPDF(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 15000)
      ),
    ]);

    return {
      success: true,
      content,
      url,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url,
    };
  }
}
```

---

## Example: Enhanced Search with PDF Extraction

```typescript
// Complete implementation example
async function comprehensiveLegalSearch(query: string) {
  // 1. Search with Tavily
  const searchResults = await tavilySearch({
    query: `${query} Zimbabwe`,
    searchDepth: "advanced",
    maxResults: 7,
    includeDomains: ["gov.zw", "zimlii.org", "parlzim.gov.zw"],
  });

  // 2. Identify and extract PDFs
  const results = await Promise.all(
    searchResults.results.map(async (result) => {
      if (result.url.endsWith(".pdf")) {
        const pdfContent = await safeExtractPDF(result.url);

        return {
          ...result,
          contentType: "pdf",
          fullContent: pdfContent.success ? pdfContent.content : null,
          extractionError: pdfContent.success ? null : pdfContent.error,
          hasFullContent: pdfContent.success,
        };
      }

      return {
        ...result,
        contentType: "webpage",
        fullContent: result.content,
        hasFullContent: true,
      };
    })
  );

  // 3. Return enriched results
  return {
    query: searchResults.query,
    answer: searchResults.answer,
    results,
    pdfCount: results.filter((r) => r.contentType === "pdf").length,
    extractedPdfCount: results.filter(
      (r) => r.hasFullContent && r.contentType === "pdf"
    ).length,
  };
}
```

---

## Summary

**Current State:**

- ❌ Tavily does NOT extract full PDF content
- ✅ Tavily finds PDFs and provides snippets
- ⚠️ `include_raw_content` is disabled (easy to enable)

**Recommended Path:**

1. **Today:** Enable `include_raw_content: true` (5 minutes)
2. **This Week:** Add basic PDF extraction with `pdf-parse` (2-4 hours)
3. **This Month:** Implement caching and error handling (1-2 days)
4. **Next Quarter:** Add source-specific extractors and OCR (1-2 weeks)

**Expected Impact:**

- 📄 Full access to legal PDF documents
- 📚 Better case law research
- 📊 Complete statute text
- ⚡ Slightly slower searches (2-5 seconds for PDFs)
- 💰 Minimal additional cost

**Bottom Line:** Tavily alone can't extract full PDF content, but we can easily add that capability with a PDF parsing library. It's a worthwhile enhancement for a legal research tool.
