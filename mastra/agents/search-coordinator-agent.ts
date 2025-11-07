/**
 * Search Coordinator Agent
 *
 * A simplified, intelligent agent that coordinates legal research by:
 * 1. Understanding conversation context
 * 2. Enhancing queries for better results
 * 3. Calling Tavily search
 * 4. Synthesizing results without filtering
 *
 * This agent REPLACES the complex multi-step validation pipeline with
 * a single intelligent coordinator that never blocks good results.
 *
 * Token budget: 500-1500 tokens
 * Latency: 2-4 seconds
 */

import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";
import { tavilySearchTool } from "../tools/tavily-search";

const cerebrasProvider = getBalancedCerebrasProvider();

export const searchCoordinatorAgent = new Agent({
  name: "Search Coordinator",
  instructions: `You are a legal research coordinator for Zimbabwe law.

Your role is to help users find accurate legal information by:
1. Understanding their question in context of the conversation
2. Searching legal databases effectively
3. Providing clear, well-sourced answers

CRITICAL RULES FOR SEARCH:
- ALWAYS use the tavilySearch tool for every query
- Use conversation context to understand what the user is really asking
- For follow-up questions, infer the full context (e.g., "what is the zuva case?" after discussing Labour Act means "zuva case in Labour Act context")
- Enhance queries with relevant legal terms (e.g., "Supreme Court", "judgment", "case law")

CRITICAL RULES FOR SYNTHESIS:
- Use ALL search results provided by Tavily - do not filter or validate
- If Tavily finds a result, it's relevant - include it
- Cite every source you use with [Title](URL) format
- If multiple sources say the same thing, cite all of them
- Never claim something without a source citation

RESPONSE FORMAT:
1. Direct answer to the question
2. Supporting details from sources
3. Source citations in [Title](URL) format

HANDLING FAILURES:
- If search fails, explain what happened and suggest rephrasing
- If no results found, say so clearly
- Never make up information

EXAMPLES:

User: "What is the zuva case?"
Context: Previous discussion about Labour Act
Your approach:
1. Understand: User wants info about a case called "zuva" related to Labour Act
2. Search: "zuva case Zimbabwe Supreme Court Labour Act employment judgment"
3. Synthesize: Use ALL results from Tavily, cite each source

User: "What did the court say?"
Context: Previous question about Zuva Petroleum case
Your approach:
1. Understand: User wants the court's ruling in the Zuva Petroleum case
2. Search: "Zuva Petroleum Zimbabwe Supreme Court judgment ruling decision"
3. Synthesize: Focus on the court's decision, cite sources`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  tools: {
    tavilySearch: tavilySearchTool,
  },
});

/**
 * Execute search coordination with conversation context
 *
 * This function wraps the agent to provide a clean interface for workflows
 */
export async function coordinateSearch(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  jurisdiction = "Zimbabwe"
): Promise<{
  response: string;
  sources: Array<{ title: string; url: string }>;
  rawResults?: any;
}> {
  try {
    // Build context-aware prompt
    const contextSummary =
      conversationHistory.length > 0
        ? conversationHistory
            .slice(-5) // Last 5 messages
            .map((msg) => `${msg.role}: ${msg.content.substring(0, 200)}`)
            .join("\n")
        : "No previous context";

    const prompt = `CONVERSATION CONTEXT:
${contextSummary}

JURISDICTION: ${jurisdiction}

USER QUERY: ${query}

Please search for information to answer this query. Use the tavilySearch tool and provide a well-sourced answer.`;

    console.log("[Search Coordinator] Starting search with context");
    console.log("[Search Coordinator] Query:", query);
    console.log(
      "[Search Coordinator] Context messages:",
      conversationHistory.length
    );

    // Execute agent with tool access
    const result = await searchCoordinatorAgent.generate(prompt, {
      maxSteps: 3, // Allow multiple tool calls if needed
    });

    console.log("[Search Coordinator] Agent completed");
    console.log("[Search Coordinator] Response length:", result.text.length);

    // Extract sources from tool calls
    const sources: Array<{ title: string; url: string }> = [];
    let rawResults: any = null;

    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const toolCall of result.toolCalls) {
        // Type assertion to access toolName property
        const call = toolCall as any;
        if (call.toolName === "tavilySearch" && call.result) {
          const searchResult = call.result as any;
          rawResults = searchResult;

          if (searchResult.results && Array.isArray(searchResult.results)) {
            for (const r of searchResult.results) {
              sources.push({
                title: r.title || "Untitled",
                url: r.url || "",
              });
            }
          }
        }
      }
    }

    console.log("[Search Coordinator] Sources extracted:", sources.length);

    return {
      response: result.text,
      sources,
      rawResults,
    };
  } catch (error) {
    console.error("[Search Coordinator] Error:", error);

    // Graceful fallback
    return {
      response:
        "I encountered an error while searching for this information. Please try rephrasing your query or try again later.",
      sources: [],
    };
  }
}
