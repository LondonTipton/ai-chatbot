import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { updateDocumentService } from "@/lib/services/document-service";

/**
 * Mastra Tool: Update Document
 *
 * Updates existing documents with new content based on a description.
 * This tool is compatible with Mastra agents and delegates to the shared service layer.
 *
 * Note: userId must be provided in the context for ownership verification.
 */
export const updateDocumentTool = createTool({
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
    userId: z
      .string()
      .describe("The ID of the user updating the document (required)"),
  }),

  outputSchema: z.object({
    id: z.string().describe("The ID of the updated document"),
    title: z.string().describe("The title of the document"),
    kind: z.string().describe("The type of document"),
    content: z.string().describe("The updated content"),
    message: z.string().describe("A success message"),
  }),

  execute: async ({ context }) => {
    const { id, description, userId } = context;

    console.log(
      `[Mastra Tool - updateDocument] Updating document: ${id} for user ${userId}`
    );

    try {
      // Use the service layer to update the document
      const result = await updateDocumentService({
        documentId: id,
        description,
        userId,
      });

      console.log(
        `[Mastra Tool - updateDocument] Document updated successfully: ${result.id}`
      );

      return {
        id: result.id,
        title: result.title,
        kind: result.kind,
        content: result.content,
        message: `Document "${result.title}" has been updated successfully based on your description.`,
      };
    } catch (error) {
      console.error(
        "[Mastra Tool - updateDocument] Error updating document:",
        error
      );
      throw new Error(
        `Failed to update document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },
});
