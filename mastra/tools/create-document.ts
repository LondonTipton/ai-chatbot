import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { artifactKinds } from "@/lib/artifacts/server";
import { createDocumentService } from "@/lib/services/document-service";

/**
 * Mastra Tool: Create Document
 *
 * Creates document artifacts (code, text, spreadsheets, images) using the service layer.
 * This tool is compatible with Mastra agents and delegates to the shared service layer.
 *
 * Note: userId must be provided in the context for proper document ownership.
 */
export const createDocumentTool = createTool({
  id: "create-document",
  description:
    "Create a document for writing or content creation activities. This tool will generate the contents of the document based on the title and kind. Supports text documents, code files, spreadsheets, and images.",

  inputSchema: z.object({
    title: z.string().describe("The title or topic of the document to create"),
    kind: z
      .enum(artifactKinds)
      .describe(
        "The type of document: 'text' for markdown documents, 'code' for code files, 'sheet' for spreadsheets, 'image' for images"
      ),
    userId: z
      .string()
      .describe("The ID of the user creating the document (required)"),
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
    const { title, kind, userId } = context;

    console.log(
      `[Mastra Tool - createDocument] Creating document: "${title}" (${kind}) for user ${userId}`
    );

    try {
      // Use the service layer to create the document
      const result = await createDocumentService({
        title,
        kind,
        userId,
      });

      console.log(
        `[Mastra Tool - createDocument] Document created successfully: ${result.id}`
      );

      return {
        id: result.id,
        title: result.title,
        kind: result.kind,
        content: result.content,
        message: `Document "${result.title}" created successfully. The document is now available for viewing and editing.`,
      };
    } catch (error) {
      console.error(
        "[Mastra Tool - createDocument] Error creating document:",
        error
      );
      throw new Error(
        `Failed to create document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },
});
