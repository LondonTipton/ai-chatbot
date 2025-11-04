import "server-only";

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { artifactKinds } from "@/lib/artifacts/server";
import { createLogger } from "@/lib/logger";
import {
  createDocumentService,
  updateDocumentService,
} from "@/lib/services/document-service";
import { requestSuggestionsService } from "@/lib/services/suggestion-service";

const logger = createLogger("services/tool-context-factory");

/**
 * Tool Context Factory
 *
 * Creates Mastra tools with pre-injected context (userId).
 * This allows tools to work with the service layer without requiring
 * the agent to manually pass userId in every tool call.
 *
 * Usage:
 * ```typescript
 * const tools = createToolsWithContext(userId);
 * const agent = new Agent({
 *   tools: {
 *     createDocument: tools.createDocument,
 *     updateDocument: tools.updateDocument,
 *   }
 * });
 * ```
 */

export type ToolContext = {
  userId: string;
};

/**
 * Create document creation tool with pre-injected userId
 */
function createDocumentToolWithContext(userId: string) {
  return createTool({
    id: "create-document",
    description:
      "Create a document for writing or content creation activities. This tool will generate the contents of the document based on the title and kind. Supports text documents, code files, spreadsheets, and images.",

    inputSchema: z.object({
      title: z
        .string()
        .describe("The title or topic of the document to create"),
      kind: z
        .enum(artifactKinds)
        .describe(
          "The type of document: 'text' for markdown documents, 'code' for code files, 'sheet' for spreadsheets, 'image' for images"
        ),
    }),

    outputSchema: z.object({
      id: z.string().describe("The unique ID of the created document"),
      title: z.string().describe("The title of the document"),
      kind: z.string().describe("The type of document"),
      content: z.string().describe("The generated content of the document"),
      message: z
        .string()
        .describe("A success message about the document creation"),
    }),

    execute: async ({ context }) => {
      const { title, kind } = context;

      logger.log(
        `[Tool - createDocument] Creating document: "${title}" (${kind}) for user ${userId}`
      );

      try {
        const result = await createDocumentService({
          title,
          kind,
          userId, // Injected from closure
        });

        logger.log(
          `[Tool - createDocument] Document created successfully: ${result.id}`
        );

        return {
          id: result.id,
          title: result.title,
          kind: result.kind,
          content: result.content,
          message: `Document "${result.title}" created successfully. The document is now available for viewing and editing.`,
        };
      } catch (error) {
        logger.error("[Tool - createDocument] Error creating document:", error);
        throw new Error(
          `Failed to create document: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
  });
}

/**
 * Create document update tool with pre-injected userId
 */
function updateDocumentToolWithContext(userId: string) {
  return createTool({
    id: "update-document",
    description:
      "Update an existing document with changes based on a description. Use this when you need to modify, improve, or revise document content.",

    inputSchema: z.object({
      id: z.string().describe("The ID of the document to update (required)"),
      description: z
        .string()
        .describe(
          "A description of the changes to make to the document (e.g., 'add a conclusion section', 'fix typos', 'make it more formal')"
        ),
    }),

    outputSchema: z.object({
      id: z.string().describe("The ID of the updated document"),
      title: z.string().describe("The title of the document"),
      kind: z.string().describe("The type of document"),
      content: z.string().describe("The updated content"),
      message: z.string().describe("A success message"),
    }),

    execute: async ({ context }) => {
      const { id, description } = context;

      logger.log(
        `[Tool - updateDocument] Updating document: ${id} for user ${userId}`
      );

      try {
        const result = await updateDocumentService({
          documentId: id,
          description,
          userId, // Injected from closure
        });

        logger.log(
          `[Tool - updateDocument] Document updated successfully: ${result.id}`
        );

        return {
          id: result.id,
          title: result.title,
          kind: result.kind,
          content: result.content,
          message: `Document "${result.title}" has been updated successfully based on your description.`,
        };
      } catch (error) {
        logger.error("[Tool - updateDocument] Error updating document:", error);
        throw new Error(
          `Failed to update document: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
  });
}

/**
 * Create request suggestions tool with pre-injected userId
 */
function requestSuggestionsToolWithContext(userId: string) {
  return createTool({
    id: "request-suggestions",
    description:
      "Request AI-powered suggestions to improve a document's writing. Analyzes the document content and provides up to 5 suggestions with original text, suggested improvements, and explanations.",

    inputSchema: z.object({
      documentId: z
        .string()
        .describe("The ID of the document to get suggestions for (required)"),
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
      const { documentId } = context;

      logger.log(
        `[Tool - requestSuggestions] Requesting suggestions for document: ${documentId}`
      );

      try {
        const suggestions = await requestSuggestionsService({
          documentId,
          userId, // Injected from closure
        });

        logger.log(
          `[Tool - requestSuggestions] Generated ${suggestions.length} suggestions`
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
        logger.error(
          "[Tool - requestSuggestions] Error requesting suggestions:",
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
}

/**
 * Create all Mastra tools with injected userId context
 *
 * This function returns a complete set of tools that have the userId
 * pre-configured, so agents can use them without manually passing userId.
 *
 * @param userId - The ID of the user for whom tools are being created
 * @returns Object containing all configured tools
 */
export function createToolsWithContext(userId: string) {
  return {
    createDocument: createDocumentToolWithContext(userId),
    updateDocument: updateDocumentToolWithContext(userId),
    requestSuggestions: requestSuggestionsToolWithContext(userId),
  };
}
