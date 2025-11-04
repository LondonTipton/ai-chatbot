import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { requestSuggestionsService } from "@/lib/services/suggestion-service";

/**
 * Mastra Tool: Request Suggestions
 *
 * Generates AI-powered writing suggestions for documents.
 * This tool is compatible with Mastra agents and delegates to the shared service layer.
 *
 * Note: userId must be provided in the context for proper suggestion ownership.
 */
export const requestSuggestionsTool = createTool({
  id: "request-suggestions",
  description:
    "Request AI-powered suggestions to improve a document's writing. Analyzes the document content and provides up to 5 suggestions with original text, suggested improvements, and explanations.",

  inputSchema: z.object({
    documentId: z
      .string()
      .describe("The ID of the document to get suggestions for (required)"),
    userId: z
      .string()
      .describe("The ID of the user requesting suggestions (required)"),
  }),

  outputSchema: z.object({
    documentId: z.string().describe("The ID of the document"),
    suggestionsCount: z
      .number()
      .describe("The number of suggestions generated"),
    suggestions: z
      .array(
        z.object({
          id: z.string(),
          originalText: z.string(),
          suggestedText: z.string(),
          description: z.string(),
        })
      )
      .describe("List of suggestions with details"),
    message: z.string().describe("A success message"),
  }),

  execute: async ({ context }) => {
    const { documentId, userId } = context;

    console.log(
      `[Mastra Tool - requestSuggestions] Requesting suggestions for document: ${documentId}`
    );

    try {
      // Use the service layer to generate suggestions
      const suggestions = await requestSuggestionsService({
        documentId,
        userId,
      });

      console.log(
        `[Mastra Tool - requestSuggestions] Generated ${suggestions.length} suggestions`
      );

      return {
        documentId,
        suggestionsCount: suggestions.length,
        suggestions: suggestions.map((s) => ({
          id: s.id,
          originalText: s.originalText,
          suggestedText: s.suggestedText,
          description: s.description,
        })),
        message: `Generated ${suggestions.length} suggestions to improve the document. The suggestions have been saved and are ready for review.`,
      };
    } catch (error) {
      console.error(
        "[Mastra Tool - requestSuggestions] Error requesting suggestions:",
        error
      );
      throw new Error(
        `Failed to request suggestions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },
});
