import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { synthesizerAgent } from "../agents/synthesizer-agent";
import { tavilySearchTool } from "../tools/tavily-search";

/**
 * Regex patterns for source classification (defined at module level for performance)
 */
const CASE_NAME_PATTERN = /\sv\s/;
const CITATION_PATTERN = /\[20\d{2}\]/;
const COURT_CODE_PATTERN = /zwcc|zwhhc|zwsc|sadct/;

/**
 * Helper function to classify source type
 */
function classifySourceType(
  url: string,
  title: string,
  content: string
): "court-case" | "academic" | "news" | "government" | "other" {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  // Court cases
  if (
    urlLower.includes("zimlii.org") ||
    urlLower.includes("saflii.org") ||
    urlLower.includes("africanlii.org") ||
    CASE_NAME_PATTERN.test(titleLower) ||
    CITATION_PATTERN.test(titleLower) ||
    contentLower.includes("judgment") ||
    contentLower.includes("court of") ||
    contentLower.includes("appellant") ||
    COURT_CODE_PATTERN.test(contentLower)
  ) {
    return "court-case";
  }

  // Academic
  if (
    urlLower.includes("researchgate") ||
    urlLower.includes("academia.edu") ||
    urlLower.includes("sciencedirect") ||
    titleLower.includes("study") ||
    titleLower.includes("research")
  ) {
    return "academic";
  }

  // Government
  if (urlLower.includes(".gov.zw") || urlLower.includes("parliament")) {
    return "government";
  }

  // News
  if (
    urlLower.includes("news") ||
    urlLower.includes("herald") ||
    urlLower.includes("zimlive")
  ) {
    return "news";
  }

  return "other";
}

/**
 * Basic Search Workflow
 *
 * Token Budget: 1K-2.5K tokens
 * Steps: search → synthesize
 * Latency: 3-5s
 *
 * This workflow provides fast, token-efficient research by:
 * 1. Performing a basic search with 5 results
 * 2. Synthesizing the results into a clear answer
 *
 * Requirements: 6.1
 */

/**
 * Step 1: Search
 * Performs a basic Tavily search with maxResults=5
 * Token estimate: 500-1000 tokens
 */
const searchStep = createStep({
  id: "search",
  description: "Perform basic web search with Tavily",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),
  outputSchema: z.object({
    answer: z.string().describe("AI-generated answer from search"),
    results: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          content: z.string(),
          score: z.number(),
          sourceType: z.enum([
            "court-case",
            "academic",
            "news",
            "government",
            "other",
          ]),
        })
      )
      .describe("Search results with source classification"),
    totalResults: z.number().describe("Total number of results"),
    tokenEstimate: z.number().describe("Estimated tokens used"),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction } = inputData;

    try {
      // Execute search with maxResults=5 for token efficiency
      const searchResults = await tavilySearchTool.execute({
        context: {
          query: `${query} ${jurisdiction} law`,
          maxResults: 5,
          domainStrategy:
            jurisdiction.toLowerCase() === "zimbabwe" ? "prioritized" : "open",
          researchDepth: "standard",
        },
        runtimeContext,
      });

      // Classify each result by source type
      const classifiedResults = searchResults.results.map((result: any) => ({
        ...result,
        sourceType: classifySourceType(
          result.url,
          result.title,
          result.content
        ),
      }));

      return {
        answer: searchResults.answer,
        results: classifiedResults,
        totalResults: searchResults.totalResults,
        tokenEstimate: searchResults.tokenEstimate,
      };
    } catch (error) {
      // Error handling: return partial results to allow synthesis to continue
      console.error("[Basic Search Workflow] Search step error:", error);

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
 * Step 2: Synthesize
 * Uses the synthesizer agent to format results into a clear answer
 * Token estimate: 500-1500 tokens
 */
const synthesizeStep = createStep({
  id: "synthesize",
  description: "Synthesize search results into clear answer",
  inputSchema: z.object({
    answer: z.string(),
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
        score: z.number(),
        sourceType: z.enum([
          "court-case",
          "academic",
          "news",
          "government",
          "other",
        ]),
      })
    ),
    totalResults: z.number(),
    tokenEstimate: z.number(),
  }),
  outputSchema: z.object({
    response: z.string().describe("Synthesized response"),
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
    const { answer, results, tokenEstimate } = inputData;
    const initData = getInitData();
    const { query } = initData;

    try {
      // Organize sources by type
      const courtCases = results.filter(
        (r: any) => r.sourceType === "court-case"
      );
      const academic = results.filter((r: any) => r.sourceType === "academic");
      const government = results.filter(
        (r: any) => r.sourceType === "government"
      );
      const news = results.filter((r: any) => r.sourceType === "news");
      const other = results.filter((r: any) => r.sourceType === "other");

      // Build synthesis prompt with sources first, then rules
      const synthesisPrompt = `You are synthesizing search results for Zimbabwe legal query: "${query}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 AVAILABLE SOURCES (READ THESE FIRST)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${
  courtCases.length > 0
    ? `⚖️ COURT CASES (Primary Legal Authority):
${courtCases
  .map(
    (r: any, i: number) =>
      `
CASE ${i + 1}: "${r.title}"
URL: ${r.url}
Content: ${r.content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  )
  .join("\n")}
`
    : ""
}

${
  government.length > 0
    ? `🏛️ GOVERNMENT SOURCES:
${government
  .map(
    (r: any, i: number) =>
      `
GOV ${i + 1}: "${r.title}"
URL: ${r.url}
Content: ${r.content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  )
  .join("\n")}
`
    : ""
}

${
  academic.length > 0
    ? `📚 ACADEMIC SOURCES (Secondary):
${academic
  .map(
    (r: any, i: number) =>
      `
STUDY ${i + 1}: "${r.title}"
URL: ${r.url}
Content: ${r.content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  )
  .join("\n")}
`
    : ""
}

${
  news.length > 0
    ? `📰 NEWS SOURCES:
${news
  .map(
    (r: any, i: number) =>
      `
NEWS ${i + 1}: "${r.title}"
URL: ${r.url}
Content: ${r.content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  )
  .join("\n")}
`
    : ""
}

${
  other.length > 0
    ? `📄 OTHER SOURCES:
${other
  .map(
    (r: any, i: number) =>
      `
SOURCE ${i + 1}: "${r.title}"
URL: ${r.url}
Content: ${r.content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  )
  .join("\n")}
`
    : ""
}

${
  answer
    ? `INITIAL AI ANSWER (verify all facts):
${answer}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    : ""
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CRITICAL GROUNDING RULES - READ BEFORE RESPONDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ MANDATORY:
1. ONLY use information from sources above
2. Cite every claim: [Source: URL]
3. Use case names EXACTLY as written
4. If case name not in sources, DO NOT mention it
5. Academic sources are NOT court cases - label as "Study"
6. Court cases have citations like "CCZ 11/23"
7. NEVER fabricate URLs or case names

❌ FORBIDDEN:
- Adding information not in sources
- Creating plausible case names
- Inventing citations
- Mixing studies with court cases

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 YOUR TASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Answer: "${query}"

STRUCTURE:
1. **Summary** - Direct answer with citations
2. **Key Points** - Bullet points with sources
3. **Sources** - List all sources used

REMEMBER: Accuracy > Comprehensiveness. If unsure, say so.`;

      // Generate synthesis with maxSteps=15
      // Note: Token limit is controlled by the agent's model configuration
      const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
        maxSteps: 15,
      });

      // Extract sources from results
      const sources = results.map((r) => ({
        title: r.title,
        url: r.url,
      }));

      // Estimate synthesis tokens (rough estimate based on response length)
      const synthesisTokens = Math.ceil(synthesized.text.length / 4);
      const totalTokens = tokenEstimate + synthesisTokens;

      return {
        response: synthesized.text,
        sources,
        totalTokens,
      };
    } catch (error) {
      // Error handling: return best available response
      console.error("[Basic Search Workflow] Synthesize step error:", error);

      // Fallback: return raw answer if synthesis fails
      const fallbackResponse =
        answer || "Unable to generate response. Please try again.";

      const sources = results.map((r) => ({
        title: r.title,
        url: r.url,
      }));

      return {
        response: fallbackResponse,
        sources,
        totalTokens: tokenEstimate,
      };
    }
  },
});

/**
 * Basic Search Workflow
 *
 * Executes: search → synthesize
 * Token Budget: 1K-2.5K tokens
 * Latency Target: 3-5s
 */
export const basicSearchWorkflow = createWorkflow({
  id: "basic-search-workflow",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),
  outputSchema: z.object({
    response: z.string().describe("Synthesized response"),
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
  .then(searchStep)
  .then(synthesizeStep)
  .commit();
