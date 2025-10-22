import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { summarizeContent } from "./summarize-content";

type TavilyExtractResult = {
  url: string;
  title?: string;
  content?: string;
  raw_content: string;
  images?: string[];
  favicon?: string;
};

type TavilyExtractResponse = {
  results: TavilyExtractResult[];
  response_time: number;
};

// URL validation pattern (moved to top level for performance)
const URL_PATTERN = /^https?:\/\/.+/i;

type TavilyExtractProps = {
  dataStream?: UIMessageStreamWriter<ChatMessage>;
};

export const tavilyExtract = ({ dataStream }: TavilyExtractProps = {}) =>
  tool({
    description:
      "Extract clean, structured content from web URLs. Perfect for: extracting full text from legal documents, court cases, or rulings; getting complete article or documentation content; cleaning and formatting web content for analysis; extracting content from multiple URLs at once. Use this AFTER tavilySearch to get the full content of relevant sources. Returns the full content in markdown format, cleaned and ready for analysis or document creation.",
    inputSchema: z.object({
      urls: z
        .array(z.string())
        .describe(
          "URLs to extract content from (max 5). Use URLs from tavilySearch results to get full content of relevant sources. Must be valid URLs with https://"
        ),
      format: z
        .enum(["markdown", "text"])
        .optional()
        .default("markdown")
        .describe(
          'Output format: "markdown" for structured content (recommended for legal documents), "text" for plain text'
        ),
      extractDepth: z
        .enum(["basic", "advanced"])
        .optional()
        .default("basic")
        .describe(
          'Extraction depth: "basic" for standard content, "advanced" for complex pages with tables and embedded content'
        ),
    }),
    execute: async ({
      urls: rawUrls,
      format = "markdown",
      extractDepth = "basic",
    }) => {
      const toolId = generateUUID();

      // Emit tool start event
      if (dataStream) {
        dataStream.write({
          type: "data-toolStart",
          data: {
            id: toolId,
            tool: "tavilyExtract",
            message: "📄 Extracting content from sources",
          },
        });
      }

      try {
        // Validate URLs array constraints (since we can't use .min/.max with Cerebras)
        const urls = Array.isArray(rawUrls) ? rawUrls.slice(0, 5) : [];

        if (urls.length === 0) {
          throw new Error("At least one URL is required for extraction");
        }

        // Validate URL format (since we can't use .url() with Cerebras)
        const invalidUrls = urls.filter((url) => !URL_PATTERN.test(url));
        if (invalidUrls.length > 0) {
          throw new Error(
            `Invalid URLs provided: ${invalidUrls.join(
              ", "
            )}. URLs must start with http:// or https://`
          );
        }

        const apiKey = process.env.TAVILY_API_KEY;

        if (!apiKey) {
          throw new Error(
            "TAVILY_API_KEY is not configured. Please add it to your environment variables."
          );
        }
        const requestBody = {
          api_key: apiKey,
          urls,
          format,
          extract_depth: extractDepth,
        };

        const response = await fetch("https://api.tavily.com/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Tavily API error (${response.status}): ${errorText}`
          );
        }

        const data: TavilyExtractResponse = await response.json();

        // Smart content handling to prevent context overflow
        const MAX_CONTENT_LENGTH = 5000;
        const SUMMARIZE_THRESHOLD = 100_000; // With llama-3.3-70b's 128K context, we can handle much more
        const ABSOLUTE_MAX_LENGTH = 400_000; // Hard limit before summarization (matches summarizer limit)

        // Format results with smart summarization for large content
        const formattedResults = await Promise.all(
          data.results.map(async (result, index) => {
            let processedContent = result.raw_content;
            let processingMethod = "full";

            // Pre-truncate extremely large content before summarization
            if (result.raw_content.length > ABSOLUTE_MAX_LENGTH) {
              console.log(
                `[Tavily Extract] Content extremely large (${result.raw_content.length} chars), pre-truncating to ${ABSOLUTE_MAX_LENGTH}`
              );
              result.raw_content = result.raw_content.substring(
                0,
                ABSOLUTE_MAX_LENGTH
              );
            }

            // For very large content, use AI summarization
            if (result.raw_content.length > SUMMARIZE_THRESHOLD) {
              try {
                processedContent = await summarizeContent(
                  result.raw_content,
                  MAX_CONTENT_LENGTH,
                  `Legal document from ${result.title || result.url}`
                );
                processingMethod = "summarized";
              } catch (_error) {
                console.warn(
                  `[Tavily Extract] Summarization failed for ${result.url}, using truncation`
                );
                processedContent =
                  result.raw_content.substring(0, MAX_CONTENT_LENGTH) +
                  "\n\n[Truncated. Original: " +
                  result.raw_content.length +
                  " chars]";
                processingMethod = "truncated";
              }
            } else if (result.raw_content.length > MAX_CONTENT_LENGTH) {
              processedContent =
                result.raw_content.substring(0, MAX_CONTENT_LENGTH) +
                "\n\n[Truncated. Original: " +
                result.raw_content.length +
                " chars]";
              processingMethod = "truncated";
            }

            return {
              position: index + 1,
              url: result.url,
              title: result.title || "Untitled",
              content: processedContent,
              contentLength: result.raw_content.length,
              processingMethod,
              format,
            };
          })
        );

        const result = {
          results: formattedResults,
          totalExtracted: formattedResults.length,
          responseTime: data.response_time,
          extractDepth,
          format,
        };

        // Emit tool complete event
        if (dataStream) {
          dataStream.write({
            type: "data-toolComplete",
            data: { id: toolId },
          });
        }

        return result;
      } catch (error) {
        console.error("Tavily extract error:", error);

        // Provide helpful error context
        if (error instanceof Error) {
          if (error.message.includes("401") || error.message.includes("403")) {
            return {
              results: [],
              totalExtracted: 0,
              responseTime: 0,
              extractDepth,
              format,
              error:
                "Authentication error: Invalid or missing Tavily API key. Please check your TAVILY_API_KEY environment variable.",
            };
          }

          if (error.message.includes("429")) {
            return {
              results: [],
              totalExtracted: 0,
              responseTime: 0,
              extractDepth,
              format,
              error:
                "Rate limit exceeded: Tavily API rate limit reached. Please try again later or upgrade your plan.",
            };
          }
        }

        // Generic error with helpful message
        const errorResult = {
          results: [],
          totalExtracted: 0,
          responseTime: 0,
          extractDepth,
          format,
          error: `Extraction failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };

        // Emit tool complete event even on error
        if (dataStream) {
          dataStream.write({
            type: "data-toolComplete",
            data: { id: toolId },
          });
        }

        return errorResult;
      }
    },
  });
