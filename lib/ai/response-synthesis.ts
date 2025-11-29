import { createLogger } from "@/lib/logger";
import {
  buildCitationsFromResults,
  formatReferencesSection,
  type TavilySource,
  type Citation,
} from "@/lib/citations";

const logger = createLogger("ai/response-synthesis");

/**
 * Response Synthesis Utility
 *
 * Handles extraction and synthesis of responses from tool results
 * when AI models fail to generate text responses.
 *
 * This ensures users always get a response even when models
 * execute tools but don't synthesize the results into text.
 *
 * Now includes source attribution via the citation system.
 */

type MessagePart = {
  type: string;
  text?: string;
  output?: any;
  [key: string]: any;
};

type Message = {
  role: string;
  parts: MessagePart[];
  [key: string]: any;
};

/**
 * Extract text content from a message's parts
 */
export function extractTextFromParts(parts: MessagePart[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text || "")
    .join("")
    .trim();
}

/**
 * Synthesize a response from tool results
 * Supports multiple tool types and formats the output appropriately
 */
export function synthesizeFromToolResults(parts: MessagePart[]): string | null {
  // AI SDK uses "tool-result" type with toolName property
  const toolParts = parts.filter(
    (p) => p.type === "tool-result" && (p.result || p.output)
  );

  if (toolParts.length === 0) {
    return null;
  }

  let synthesizedText = "";

  for (const toolPart of toolParts) {
    // Get the result data (AI SDK uses 'result' property)
    const resultData = toolPart.result || toolPart.output;
    const toolName = toolPart.toolName || "";

    // Tavily QNA tool
    if (toolName === "tavilyQna" && resultData?.answer) {
      synthesizedText = resultData.answer;
      if (resultData.sources?.length > 0) {
        synthesizedText += "\n\nSources:\n";
        for (const source of resultData.sources) {
          synthesizedText += `- ${source.title}: ${source.url}\n`;
        }
      }
      break;
    }

    // Tavily Advanced Search tool
    if (toolName === "tavilyAdvancedSearch" && resultData?.results) {
      const results = resultData.results;
      if (results.length > 0) {
        synthesizedText = "Based on my research:\n\n";
        for (const result of results.slice(0, 3)) {
          synthesizedText += `**${result.title}**\n`;
          if (result.content) {
            synthesizedText += `${result.content.substring(0, 200)}...\n`;
          }
          synthesizedText += `Source: ${result.url}\n\n`;
        }
      }
      break;
    }

    // Tavily Search tool
    if (toolName === "tavilySearch" && resultData?.results) {
      const results = resultData.results;
      if (results.length > 0) {
        synthesizedText = "Here's what I found:\n\n";
        for (const result of results.slice(0, 3)) {
          synthesizedText += `**${result.title}**\n`;
          if (result.content) {
            synthesizedText += `${result.content.substring(0, 150)}...\n`;
          }
          synthesizedText += `[Read more](${result.url})\n\n`;
        }
      }
      break;
    }

    // Weather tool
    if (toolName === "getWeather" && resultData) {
      const weather = resultData;
      synthesizedText = `The weather in ${
        weather.location || "the requested location"
      } is ${weather.temperature || "N/A"}°C with ${
        weather.conditions || "unknown conditions"
      }.`;
      break;
    }

    // Document creation tool
    if (toolName === "createDocument" && resultData) {
      synthesizedText = `I've created the document "${
        resultData.title || "Untitled"
      }" for you. You can view and edit it in the artifacts panel.`;
      break;
    }

    // Document update tool
    if (toolName === "updateDocument" && resultData) {
      synthesizedText = `I've updated the document with your requested changes.`;
      break;
    }

    // Generic tool fallback
    if (resultData && typeof resultData === "object") {
      // Try to extract any text-like content
      if (resultData.answer) {
        synthesizedText = resultData.answer;
        break;
      }
      if (resultData.result) {
        synthesizedText = resultData.result;
        break;
      }
      if (resultData.content) {
        synthesizedText = resultData.content;
        break;
      }
    }
  }

  return synthesizedText || null;
}

/**
 * Ensure a message has text content
 * If not, synthesize from tool results
 * Returns true if synthesis was performed
 */
export function ensureMessageHasText(message: Message): boolean {
  const textContent = extractTextFromParts(message.parts);

  if (textContent.length > 0) {
    return false; // Already has text, no synthesis needed
  }

  logger.warn(
    "[Response Synthesis] Empty response detected, attempting synthesis..."
  );
  logger.log(
    `[Response Synthesis] Message parts: ${message.parts.length} parts`
  );
  logger.log(
    `[Response Synthesis] Part types: ${message.parts
      .map((p) => p.type)
      .join(", ")}`
  );

  // Log tool results for debugging
  const toolParts = message.parts.filter((p) => p.type === "tool-result");
  if (toolParts.length > 0) {
    logger.log(
      `[Response Synthesis] Found ${toolParts.length} tool result(s):`
    );
    for (const toolPart of toolParts) {
      logger.log(
        `[Response Synthesis]   - ${
          toolPart.toolName || "unknown"
        }: ${JSON.stringify(toolPart.result || toolPart.output).substring(
          0,
          100
        )}...`
      );
    }
  } else {
    logger.log("[Response Synthesis] No tool results found in message parts");
  }

  const synthesizedText = synthesizeFromToolResults(message.parts);

  if (synthesizedText) {
    message.parts.push({
      type: "text",
      text: synthesizedText,
    });
    logger.log(
      "[Response Synthesis] ✅ Successfully synthesized response from tool results"
    );
    logger.log(
      `[Response Synthesis] Synthesized text length: ${synthesizedText.length}`
    );
    logger.log(
      `[Response Synthesis] Synthesized text preview: "${synthesizedText.substring(
        0,
        100
      )}..."`
    );
    return true;
  }

  logger.error(
    "[Response Synthesis] ❌ Could not synthesize response - no tool results available"
  );
  return false;
}

/**
 * Process multiple messages and ensure all assistant messages have text
 */
export function ensureAllMessagesHaveText(messages: Message[]): number {
  let synthesisCount = 0;

  for (const message of messages) {
    if (message.role === "assistant" && ensureMessageHasText(message)) {
      synthesisCount++;
    }
  }

  return synthesisCount;
}

/**
 * Extract and format tool results for display
 * Useful for debugging and logging
 */
export function formatToolResults(parts: MessagePart[]): string {
  const toolParts = parts.filter(
    (p) => p.type === "tool-result" && (p.result || p.output)
  );

  if (toolParts.length === 0) {
    return "No tool results found";
  }

  let formatted = "Tool Results:\n";
  for (const toolPart of toolParts) {
    const toolName = toolPart.toolName || "unknown";
    const resultData = toolPart.result || toolPart.output;
    formatted += `\n- ${toolName}:\n`;
    formatted += `  ${JSON.stringify(resultData, null, 2)}\n`;
  }

  return formatted;
}

/**
 * Extract all sources from tool results for citation building
 * Handles Tavily results, legal DB results, and workflow tool results
 */
export function extractTavilySources(parts: MessagePart[]): TavilySource[] {
  const sources: TavilySource[] = [];

  // Find all tool results
  const toolParts = parts.filter((p) => p.type === "tool-result");

  for (const toolPart of toolParts) {
    const resultData = toolPart.result || toolPart.output;
    const toolName = toolPart.toolName || "";

    // Handle direct Tavily tool results
    if (
      toolName === "tavilySearch" ||
      toolName === "tavilyAdvancedSearch" ||
      toolName === "tavilyQna"
    ) {
      if (resultData?.results && Array.isArray(resultData.results)) {
        for (const result of resultData.results) {
          sources.push({
            title: result.title,
            url: result.url,
            content: result.content,
            score: result.relevanceScore || result.score,
            publishedDate: result.publishedDate || result.published_date,
          });
        }
      }
      if (resultData?.sources && Array.isArray(resultData.sources)) {
        for (const source of resultData.sources) {
          sources.push({
            title: source.title,
            url: source.url,
            content: source.snippet || "",
            score: source.relevance,
          });
        }
      }
    }

    // Handle workflow tool results (standardResearch, quickFactSearch, etc.)
    if (
      toolName === "standardResearch" ||
      toolName === "quickFactSearch" ||
      toolName === "deepResearch" ||
      toolName === "multiSearch" ||
      toolName === "comprehensiveResearch"
    ) {
      // Extract rawResults (Tavily results)
      if (resultData?.rawResults && Array.isArray(resultData.rawResults)) {
        for (const result of resultData.rawResults) {
          sources.push({
            title: result.title,
            url: result.url,
            content: result.content,
            score: result.score,
            publishedDate: result.publishedDate,
          });
        }
      }

      // Extract sources array
      if (resultData?.sources && Array.isArray(resultData.sources)) {
        for (const source of resultData.sources) {
          // Skip if already added via rawResults
          if (sources.some((s) => s.url === source.url)) continue;

          sources.push({
            title: source.title,
            url: source.url,
            content: source.content || "",
            score: source.score,
          });
        }
      }
    }

    // Handle legal-search tool results (from vector database)
    if (toolName === "legal-search") {
      if (resultData?.results && Array.isArray(resultData.results)) {
        for (const result of resultData.results) {
          // Convert legal DB format to TavilySource format for unified handling
          sources.push({
            title: `${result.source} - ${result.sourceFile}`,
            url: `legal-db://${result.docId || "unknown"}`,
            content: result.text,
            score: result.score,
          });
        }
      }
    }

    // Handle generic tool results that might contain sources
    if (resultData && typeof resultData === "object") {
      // Check for nested rawResults in any tool
      if (
        resultData.rawResults?.results &&
        Array.isArray(resultData.rawResults.results)
      ) {
        for (const result of resultData.rawResults.results) {
          if (sources.some((s) => s.url === result.url)) continue;
          sources.push({
            title: result.title,
            url: result.url,
            content: result.content,
            score: result.score || result.relevanceScore,
            publishedDate: result.publishedDate || result.published_date,
          });
        }
      }
    }
  }

  return sources;
}

/**
 * Build citations from message parts containing Tavily results
 */
export function buildCitationsFromMessage(parts: MessagePart[]): Citation[] {
  const sources = extractTavilySources(parts);
  return buildCitationsFromResults(sources);
}

/**
 * Synthesize response with citations from tool results
 * Enhanced version that includes proper source attribution
 */
export function synthesizeWithCitations(parts: MessagePart[]): {
  text: string | null;
  citations: Citation[];
} {
  const toolParts = parts.filter(
    (p) => p.type === "tool-result" && (p.result || p.output)
  );

  if (toolParts.length === 0) {
    return { text: null, citations: [] };
  }

  // Extract sources and build citations
  const sources = extractTavilySources(parts);
  const citations = buildCitationsFromResults(sources);

  let synthesizedText = "";

  for (const toolPart of toolParts) {
    const resultData = toolPart.result || toolPart.output;
    const toolName = toolPart.toolName || "";

    // Tavily QNA tool - use answer with citations
    if (toolName === "tavilyQna" && resultData?.answer) {
      synthesizedText = resultData.answer;
      if (citations.length > 0) {
        synthesizedText += formatReferencesSection(citations);
      }
      break;
    }

    // Tavily Advanced Search tool - synthesize with citations
    if (toolName === "tavilyAdvancedSearch" && resultData?.results) {
      const results = resultData.results;
      if (results.length > 0) {
        synthesizedText = resultData.answer || "Based on my research:\n\n";
        for (let i = 0; i < Math.min(results.length, 3); i++) {
          const result = results[i];
          const citation = citations[i];
          synthesizedText += `**${result.title}** ${citation?.marker || ""}\n`;
          if (result.content) {
            synthesizedText += `${result.content.substring(0, 200)}...\n\n`;
          }
        }
        if (citations.length > 0) {
          synthesizedText += formatReferencesSection(citations);
        }
      }
      break;
    }

    // Tavily Search tool - synthesize with citations
    if (toolName === "tavilySearch" && resultData?.results) {
      const results = resultData.results;
      if (results.length > 0) {
        synthesizedText = resultData.answer || "Here's what I found:\n\n";
        for (let i = 0; i < Math.min(results.length, 3); i++) {
          const result = results[i];
          const citation = citations[i];
          synthesizedText += `**${result.title}** ${citation?.marker || ""}\n`;
          if (result.content) {
            synthesizedText += `${result.content.substring(0, 150)}...\n\n`;
          }
        }
        if (citations.length > 0) {
          synthesizedText += formatReferencesSection(citations);
        }
      }
      break;
    }

    // Non-Tavily tools - use original synthesis
    if (toolName === "getWeather" && resultData) {
      synthesizedText = `The weather in ${
        resultData.location || "the requested location"
      } is ${resultData.temperature || "N/A"}°C with ${
        resultData.conditions || "unknown conditions"
      }.`;
      break;
    }

    if (toolName === "createDocument" && resultData) {
      synthesizedText = `I've created the document "${
        resultData.title || "Untitled"
      }" for you. You can view and edit it in the artifacts panel.`;
      break;
    }

    if (toolName === "updateDocument" && resultData) {
      synthesizedText = `I've updated the document with your requested changes.`;
      break;
    }
  }

  return {
    text: synthesizedText || null,
    citations,
  };
}
