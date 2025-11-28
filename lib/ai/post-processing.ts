import {
  ensureAllMessagesHaveText,
  ensureMessageHasText,
} from "@/lib/ai/response-synthesis";

type MessagePart = {
  type: string;
  text?: string;
  [key: string]: any;
};

type Message = {
  role: string;
  parts: MessagePart[];
  [key: string]: any;
};

export type PostProcessOptions = {
  activeTools: string[];
  userQueryText: string;
};

export type PostProcessResult = {
  changed: boolean;
  messages: Message[];
};

/**
 * Performs a separate post-processing pass on streamed messages to ensure
 * the final assistant message has text, even if the model omitted it after tool calls.
 *
 * Steps:
 * 1) Try deterministic synthesis from tool-results
 * 2) If still empty and light-search tools were active, run Tavily fallback
 */
export async function postProcessAssistantResponse(
  messages: Message[],
  { activeTools, userQueryText }: PostProcessOptions
): Promise<PostProcessResult> {
  let changed = false;

  // Step 1: Deterministic synthesis from tool results
  const count = ensureAllMessagesHaveText(messages);
  if (count > 0) {
    changed = true;
  }

  // If still empty, try a targeted fallback for light search flows
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const lastAssistant = assistantMessages.at(-1);
  if (!lastAssistant) {
    return { changed, messages };
  }

  const currentText = (lastAssistant.parts || [])
    .filter((p) => p.type === "text")
    .map((p) => p.text || "")
    .join("")
    .trim();

  if (currentText.length > 0) {
    return { changed, messages };
  }

  // Step 2: Strong fallback for tavilyAdvancedSearch use-cases
  if (
    Array.isArray(activeTools) &&
    activeTools.includes("tavilyAdvancedSearch")
  ) {
  try {
    const { getTavilyBalancer } = await import("@/lib/ai/tavily-key-balancer");
    const apiKey = await getTavilyBalancer().getApiKey();

    if (!apiKey) {
      throw new Error("Missing TAVILY_API_KEY");
    }

    const body = {
      api_key: apiKey,
      query: userQueryText,
      search_depth: "advanced",
      include_answer: true,
      include_raw_content: false,
      max_results: 5,
    } as const;

    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let tavilyResult: any;
    if (resp.ok) {
      const data = await resp.json();
      const formattedResults =
        data.results?.map((r: any, i: number) => ({
          position: i + 1,
          title: r.title,
          url: r.url,
          content: r.content,
          relevanceScore: r.score,
          publishedDate: r.published_date || "Not available",
        })) || [];
      tavilyResult = {
        query: data.query,
        answer: data.answer || "No comprehensive answer available",
        results: formattedResults,
        totalResults: formattedResults.length,
        searchDepth: "advanced",
      };
    } else {
      const txt = await resp.text();
      tavilyResult = {
        query: userQueryText,
        answer: `Search failed during fallback: ${resp.status} ${txt}`,
        results: [],
        totalResults: 0,
        searchDepth: "advanced",
        error: true,
      };
    }

    // Attach synthetic tool-result for synthesis
    lastAssistant.parts.push({
      type: "tool-result",
      toolName: "tavilyAdvancedSearch",
      result: tavilyResult,
    } as MessagePart);

    const synthesized = ensureMessageHasText(lastAssistant as Message);
    if (synthesized) {
      changed = true;
    } else {
      // Final defensive fallback text
      lastAssistant.parts.push({
        type: "text",
        text: "I couldn’t generate a response from the search results. Please rephrase your question or ask for a summary of specific points you care about (e.g., protections, remedies, procedures).",
      });
      changed = true;
    }
  } catch {
    // As a last resort, add a friendly message
    lastAssistant.parts.push({
      type: "text",
      text: "The follow-up processing step encountered an issue while summarizing results. Please try again or rephrase your question.",
    });
    changed = true;
  }
  }

  return { changed, messages };
}
