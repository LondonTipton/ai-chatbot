import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  type DomainStrategy,
  getExcludeDomains,
  getPriorityDomains,
} from "@/lib/utils/tavily-domain-strategy";
import { getDomainTier } from "@/lib/utils/zimbabwe-domains";

/**
 * Tavily QNA Tool for Mastra
 * Quick question-answering with direct answers and domain prioritization
 */
export const tavilyQnaTool = createTool({
  id: "tavily-qna",
  description:
    "Quick question-answering search for simple legal queries. Returns a direct, concise answer with domain-prioritized sources. Use for straightforward questions needing fast responses.",

  inputSchema: z.object({
    query: z
      .string()
      .describe("The question to answer (e.g., 'What is contract law?')"),
    domainStrategy: z
      .enum(["strict", "prioritized", "open"])
      .optional()
      .default("prioritized")
      .describe(
        "Domain strategy: 'strict' (ZW only), 'prioritized' (ZW + global), 'open' (exclude spam)"
      ),
  }),

  outputSchema: z.object({
    query: z.string(),
    answer: z.string().describe("Direct answer to the question"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          tier: z.enum(["tier1", "tier2", "tier3", "tier4", "external"]),
        })
      )
      .describe("Brief list of sources with authority tier"),
  }),

  execute: async ({ context }) => {
    const { query, domainStrategy = "prioritized" } = context as {
      query: string;
      domainStrategy?: DomainStrategy;
    };

    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    try {
      const requestBody: Record<string, unknown> = {
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
        max_results: 3,
        country: "ZW",
      };

      // Apply domain strategy
      if (domainStrategy === "strict") {
        requestBody.include_domains = getPriorityDomains("quick");
      } else if (domainStrategy === "prioritized") {
        requestBody.exclude_domains = getExcludeDomains();
        requestBody.include_domains = getPriorityDomains("quick");
      } else {
        // open
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

      return {
        query,
        answer: data.answer || "No answer available",
        sources:
          data.results?.slice(0, 3).map((r: any) => ({
            title: r.title || "",
            url: r.url || "",
            tier: getDomainTier(r.url),
          })) || [],
      };
    } catch (error) {
      console.error("Tavily QNA error:", error);
      throw error;
    }
  },
});
