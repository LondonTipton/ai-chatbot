import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getZimbabweLegalDomains } from "@/lib/utils/zimbabwe-domains";
import { synthesizerAgent } from "../agents/synthesizer-agent";
import { tavilyExtractTool } from "../tools/tavily-extract";
import { tavilySearchAdvancedTool } from "../tools/tavily-search-advanced";

/**
 * Advanced Search Workflow
 *
 * Token Budget: 4K-8K tokens
 * Steps: advanced-search → extract-top-sources → synthesize
 * Latency: 5-10s
 *
 * This workflow provides balanced research with comprehensive sources by:
 * 1. Performing advanced search with Zimbabwe domain filtering
 * 2. Extracting content from top 2 URLs (optional, skips if no URLs)
 * 3. Synthesizing results into a detailed answer
 *
 * Requirements: 6.2
 */

/**
 * Step 1: Advanced Search
 * Performs advanced Tavily search with Zimbabwe domains, timeRange='year', country='ZW'
 * Token estimate: 2K-4K tokens
 */
const advancedSearchStep = createStep({
  id: "advanced-search",
  description:
    "Perform advanced web search with Zimbabwe legal domain filtering",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),
  outputSchema: z.object({
    answer: z.string().describe("AI-generated comprehensive answer"),
    results: z
      .array(
        z.object({
          position: z.number(),
          title: z.string(),
          url: z.string(),
          content: z.string(),
          relevanceScore: z.number(),
          publishedDate: z.string(),
        })
      )
      .describe("Array of detailed search results"),
    totalResults: z.number(),
    tokenEstimate: z.number(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction } = inputData;

    try {
      // Execute advanced search with Zimbabwe-specific configuration
      const searchResults = await tavilySearchAdvancedTool.execute({
        context: {
          query: `${query} ${jurisdiction}`,
          maxResults: 7,
          jurisdiction,
          includeRawContent: true, // Required for content extraction
          domainStrategy: "prioritized", // Automatically uses Zimbabwe domain prioritization
          researchDepth: "deep",
          country: "ZW",
          timeRange: "year",
        },
        runtimeContext,
      });

      return {
        answer: searchResults.answer,
        results: searchResults.results,
        totalResults: searchResults.totalResults,
        tokenEstimate: searchResults.tokenEstimate,
      };
    } catch (error) {
      // Error handling: return partial results to allow workflow to continue
      console.error("[Advanced Search Workflow] Search step error:", error);

      return {
        answer: "",
        results: [],
        totalResults: 0,
        tokenEstimate: 0,
      };
    }
  },
});

/**
 * Step 2: Extract Top Sources
 * Extracts content from top 2 URLs (skips if no URLs available)
 * Token estimate: 1K-3K tokens
 */
const extractTopSourcesStep = createStep({
  id: "extract-top-sources",
  description: "Extract detailed content from top 2 search results",
  inputSchema: z.object({
    answer: z.string(),
    results: z.array(
      z.object({
        position: z.number(),
        title: z.string(),
        url: z.string(),
        content: z.string(),
        relevanceScore: z.number(),
        publishedDate: z.string(),
      })
    ),
    totalResults: z.number(),
    tokenEstimate: z.number(),
  }),
  outputSchema: z.object({
    answer: z.string().describe("AI-generated answer from search"),
    results: z
      .array(
        z.object({
          position: z.number(),
          title: z.string(),
          url: z.string(),
          content: z.string(),
          relevanceScore: z.number(),
          publishedDate: z.string(),
        })
      )
      .describe("Search results"),
    totalResults: z.number(),
    tokenEstimate: z.number(),
    extractions: z
      .array(
        z.object({
          url: z.string(),
          rawContent: z.string(),
          tokenEstimate: z.number(),
        })
      )
      .describe("Extracted content from top URLs"),
    extractionTokens: z.number().describe("Tokens used for extraction"),
    skipped: z.boolean().describe("Whether extraction was skipped"),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { answer, results, totalResults, tokenEstimate } = inputData;

    // Skip extraction if no results available
    if (!results || results.length === 0) {
      console.log(
        "[Advanced Search Workflow] No URLs available for extraction, skipping"
      );
      return {
        answer,
        results,
        totalResults,
        tokenEstimate,
        extractions: [],
        extractionTokens: 0,
        skipped: true,
      };
    }

    try {
      // Extract top 2 URLs
      const topUrls = results
        .slice(0, 2)
        .map((r) => r.url)
        .filter(Boolean);

      if (topUrls.length === 0) {
        return {
          answer,
          results,
          totalResults,
          tokenEstimate,
          extractions: [],
          extractionTokens: 0,
          skipped: true,
        };
      }

      const extractionResults = await tavilyExtractTool.execute({
        context: {
          urls: topUrls,
        },
        runtimeContext,
      });

      return {
        answer,
        results,
        totalResults,
        tokenEstimate,
        extractions: extractionResults.results,
        extractionTokens: extractionResults.totalTokens,
        skipped: false,
      };
    } catch (error) {
      // Error handling: continue with search results only
      console.error("[Advanced Search Workflow] Extraction step error:", error);
      console.log(
        "[Advanced Search Workflow] Continuing with search results only"
      );

      return {
        answer,
        results,
        totalResults,
        tokenEstimate,
        extractions: [],
        extractionTokens: 0,
        skipped: true,
      };
    }
  },
});

/**
 * Step 3: Synthesize
 * Uses the synthesizer agent to create comprehensive answer from search and extraction results
 * Token estimate: 1K-1.5K tokens
 */
const synthesizeStep = createStep({
  id: "synthesize",
  description:
    "Synthesize search and extraction results into comprehensive answer",
  inputSchema: z.object({
    answer: z.string(),
    results: z.array(
      z.object({
        position: z.number(),
        title: z.string(),
        url: z.string(),
        content: z.string(),
        relevanceScore: z.number(),
        publishedDate: z.string(),
      })
    ),
    totalResults: z.number(),
    tokenEstimate: z.number(),
    extractions: z.array(
      z.object({
        url: z.string(),
        rawContent: z.string(),
        tokenEstimate: z.number(),
      })
    ),
    extractionTokens: z.number(),
    skipped: z.boolean(),
  }),
  outputSchema: z.object({
    response: z.string().describe("Synthesized comprehensive response"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("Source citations"),
    totalTokens: z.number().describe("Total tokens used in workflow"),
  }),
  execute: async ({ inputData, getInitData }) => {
    const {
      answer,
      results,
      tokenEstimate,
      extractions,
      extractionTokens,
      skipped,
    } = inputData;
    const initData = getInitData();
    const { query } = initData;

    try {
      // BUILD STRUCTURED PROMPT WITH EXPLICIT GROUNDING RULES
      // This prevents hallucination by enforcing source-only responses
      
      let synthesisPrompt = `You are synthesizing search results for Zimbabwe legal query: "${query}"

🎯 CRITICAL GROUNDING RULES (STRICTLY ENFORCE):
1. ✅ ONLY use information from the provided sources below
2. ✅ NEVER add information not explicitly in the sources
3. ✅ NEVER claim a source says something it doesn't
4. ✅ Label each major claim with its source URL: [Source: URL]
5. ✅ If information is not in sources, say "This information was not found in the available sources"
6. ✅ If sources conflict, note the disagreement clearly
7. ✅ Qualify uncertain statements with "may", "might", "according to", "some argue"
8. ✅ Use exact quotations when taking direct statements from sources
9. ❌ NEVER fabricate statute references, section numbers, or case names
10. ❌ NEVER add general legal knowledge beyond provided sources

AVAILABLE SOURCES:
${results.map((r: any, i: number) => 
  `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE ${i + 1}: "${r.title}"
URL: ${r.url}
Relevance Score: ${(r.relevanceScore * 100).toFixed(0)}%
Published: ${r.publishedDate}

Content:
${r.content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
).join('\n\n')}`;

      // Add extracted content if available
      if (!skipped && extractions.length > 0) {
        synthesisPrompt += `

DETAILED EXTRACTIONS FROM TOP SOURCES:
${extractions.map((e: any, i: number) => 
  `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXTRACTION ${i + 1}
From: ${e.url}
Tokens: ${e.tokenEstimate}

Full Content:
${e.rawContent}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
).join('\n\n')}`;
      }

      synthesisPrompt += `

INITIAL AI ANSWER (use as reference structure, but verify all facts against sources above):
${answer || "No initial answer provided"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR TASK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create a comprehensive response that:
1. Directly answers the query: "${query}"
2. ONLY uses facts from the provided sources (no external knowledge)
3. Labels each major claim with its source: [Source: URL]
4. Notes any gaps: "The sources do not address..."
5. Highlights any conflicts between sources
6. Uses professional legal language appropriate for Zimbabwe
7. Provides proper citations with URLs

STRUCTURE YOUR RESPONSE:
1. **Direct Answer** - Answer the query directly with citations
2. **Key Findings** - Bullet points with source labels
3. **Detailed Explanation** - Comprehensive information from sources
4. **Source Citations** - List all sources used with URLs
5. **Limitations** - What the sources don't cover

ABSOLUTE RULE: Accuracy over comprehensiveness. If unsure, say so. Better to admit gaps than to fabricate.`;

      // Generate synthesis with maxSteps=15
      const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
        maxSteps: 15,
      });

      // Extract sources from results
      const sources = results.map((r: any) => ({
        title: r.title,
        url: r.url,
      }));

      // Calculate total tokens
      const synthesisTokens = Math.ceil(synthesized.text.length / 4);
      const totalTokens = tokenEstimate + extractionTokens + synthesisTokens;

      return {
        response: synthesized.text,
        sources,
        totalTokens,
      };
    } catch (error) {
      // Error handling: return structured fallback with all available data
      console.error("[Advanced Search Workflow] Synthesize step error:", error);

      // IMPROVED FALLBACK: Return structured response instead of raw answer
      const fallbackResponse = `# Research Findings for: "${query}"

⚠️ **Note:** Automatic synthesis failed. Please review the sources below directly.

## Summary
The following sources were found relevant to your query:

${results.map((r: any, i: number) => 
  `### ${i + 1}. ${r.title}
**URL:** ${r.url}  
**Relevance:** ${(r.relevanceScore * 100).toFixed(0)}%  
**Published:** ${r.publishedDate}

${r.content}

📎 [Read full article](${r.url})`
).join('\n\n---\n\n')}

${!skipped && extractions.length > 0 ? `
## Detailed Information

${extractions.map((e: any, i: number) => 
  `### Detailed Content ${i + 1}
**Source:** ${e.url}

${e.rawContent.length > 1000 ? `${e.rawContent.substring(0, 1000)}...` : e.rawContent}

📎 [Full article](${e.url})`
).join('\n\n---\n\n')}
` : ''}

${answer ? `
## Initial Analysis
${answer}
` : ''}

---

**Recommendation:** Review the sources above directly or try your query again.`;

      const sources = results.map((r: any) => ({
        title: r.title,
        url: r.url,
      }));

      return {
        response: fallbackResponse,
        sources,
        totalTokens: tokenEstimate + extractionTokens,
      };
    }
  },
});

/**
 * Advanced Search Workflow
 *
 * Executes: advanced-search → extract-top-sources → synthesize
 * Token Budget: 4K-8K tokens
 * Latency Target: 5-10s
 */
export const advancedSearchWorkflow = createWorkflow({
  id: "advanced-search-workflow",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),
  outputSchema: z.object({
    response: z.string().describe("Synthesized comprehensive response"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("Source citations"),
    totalTokens: z.number().describe("Total tokens used in workflow"),
  }),
})
  .then(advancedSearchStep)
  .then(extractTopSourcesStep)
  .then(synthesizeStep)
  .commit();
