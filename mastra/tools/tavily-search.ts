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
 * Tavily Search Tool for Mastra
 * Performs web searches using the Tavily API
 * Optimized for token efficiency with intelligent Zimbabwe legal domain prioritization
 */
export const tavilySearchTool = createTool({
  id: "tavily-search",
  description:
    "Search the web for current information. Returns relevant search results with intelligent Zimbabwe domain prioritization. Optimized for token efficiency with default 20 results.",

  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .optional()
      .default(20)
      .describe("Maximum number of results to return (default: 20)"),
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
      .default("standard")
      .describe("Research depth for domain prioritization"),
  }),

  outputSchema: z.object({
    answer: z.string().describe("AI-generated answer based on search results"),
    results: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          content: z.string(),
          score: z.number(),
          tier: z.enum(["tier1", "tier2", "tier3", "tier4", "external"]),
        })
      )
      .describe("Array of search results with authority tier"),
    totalResults: z.number().describe("Total number of results found"),
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
      researchDepth = "standard",
    } = context as {
      query: string;
      maxResults?: number;
      domainStrategy?: DomainStrategy;
      researchDepth?: ResearchDepth;
    };

    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    try {
      // Build request body with intelligent domain prioritization
      const requestBody: Record<string, unknown> = {
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
        search_depth: "basic",
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

      const results =
        data.results?.map((result: any) => ({
          title: result.title || "",
          url: result.url || "",
          content: result.content || "",
          score: result.score || 0,
          tier: getDomainTier(result.url),
        })) || [];

      // Calculate token estimate for results
      const answerTokens = estimateTokens(data.answer || "");
      const resultsTokens = estimateSearchResultTokens(results);
      const tokenEstimate = answerTokens + resultsTokens;

      const sourceDistribution = analyzeSourceDistribution(results);

      return {
        answer: data.answer || "No answer generated",
        results,
        totalResults: results.length,
        tokenEstimate,
        sourceDistribution,
      };
    } catch (error) {
      console.error("Tavily search error:", error);
      throw error;
    }
  },
});
