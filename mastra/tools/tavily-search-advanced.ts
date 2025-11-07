import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  analyzeSourceDistribution,
  type DomainStrategy,
  getExcludeDomains,
  getPriorityDomains,
  type ResearchDepth,
} from "@/lib/utils/tavily-domain-strategy";
import {
  estimateSearchResultTokens,
  estimateTokens,
} from "@/lib/utils/token-estimation";
import { getDomainTier } from "@/lib/utils/zimbabwe-domains";

/**
 * Tavily Advanced Search Tool for Mastra
 * Deep search with comprehensive results and AI-generated answer
 * Optimized for token efficiency with intelligent Zimbabwe legal domain prioritization
 */
export const tavilySearchAdvancedTool = createTool({
  id: "tavily-search-advanced",
  description:
    "Advanced search for legal information with comprehensive results and AI-generated answer. Use for queries needing detailed information with domain prioritization. Optimized for token efficiency with default 20 results.",

  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query for detailed legal information"),
    maxResults: z
      .number()
      .optional()
      .default(20)
      .describe("Maximum number of results (1-20, default: 20)"),
    domainStrategy: z
      .enum(["strict", "prioritized", "open"])
      .optional()
      .default("prioritized")
      .describe(
        "Domain strategy: 'strict' (ZW only), 'prioritized' (ZW + global), 'open' (exclude spam only)"
      ),
    researchDepth: z
      .enum(["quick", "standard", "deep", "comprehensive"])
      .optional()
      .default("deep")
      .describe("Research depth for domain prioritization"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for context"),
    includeRawContent: z
      .boolean()
      .default(false)
      .describe("Whether to include raw content in search results"),
  }),

  outputSchema: z.object({
    query: z.string(),
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
          tier: z.enum(["tier1", "tier2", "tier3", "tier4", "external"]),
        })
      )
      .describe("Array of detailed search results with authority tier"),
    totalResults: z.number(),
    searchDepth: z.string(),
    tokenEstimate: z
      .number()
      .describe("Estimated token count for the search results"),
    sourceDistribution: z.object({
      zimbabweAuthority: z.number(),
      zimbabweOther: z.number(),
      regional: z.number(),
      global: z.number(),
    }),
  }),

  execute: async ({ context }) => {
    const {
      query,
      maxResults = 20,
      domainStrategy = "prioritized",
      researchDepth = "deep",
      includeRawContent = false,
    } = context as {
      query: string;
      maxResults?: number;
      domainStrategy?: DomainStrategy;
      researchDepth?: ResearchDepth;
      jurisdiction?: string;
      includeRawContent?: boolean;
    };

    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    try {
      // Validate maxResults
      const validMaxResults = Math.min(Math.max(maxResults, 1), 20);

      // Build request body
      const requestBody: Record<string, unknown> = {
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        include_answer: true,
        include_raw_content: includeRawContent,
        max_results: validMaxResults,
      };

      // Apply domain strategy
      if (domainStrategy === "strict") {
        // Strict: ONLY search priority domains
        requestBody.include_domains = getPriorityDomains(researchDepth);
      } else if (domainStrategy === "prioritized") {
        // Prioritized: Exclude spam but search globally
        // Note: Removed include_domains to allow broader search while still excluding spam
        requestBody.exclude_domains = getExcludeDomains();
      } else {
        // Open: Just exclude spam, let Tavily find best matches globally
        requestBody.exclude_domains = getExcludeDomains();
      }

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();

      const formattedResults =
        data.results?.map((result: any, index: number) => ({
          position: index + 1,
          title: result.title || "",
          url: result.url || "",
          content: result.content || "",
          relevanceScore: result.score || 0,
          publishedDate: result.published_date || "Not available",
          tier: getDomainTier(result.url),
        })) || [];

      // Calculate token estimate for results
      const answerTokens = estimateTokens(data.answer || "");
      const resultsTokens = estimateSearchResultTokens(formattedResults);
      const tokenEstimate = answerTokens + resultsTokens;

      const sourceDistribution = analyzeSourceDistribution(formattedResults);

      return {
        query: data.query,
        answer: data.answer || "No comprehensive answer available",
        results: formattedResults,
        totalResults: formattedResults.length,
        searchDepth: "advanced",
        tokenEstimate,
        sourceDistribution,
      };
    } catch (error) {
      console.error("Tavily advanced search error:", error);
      throw error;
    }
  },
});
