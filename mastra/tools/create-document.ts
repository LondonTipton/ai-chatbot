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
  id: "createDocument",
  description:
    "REQUIRED: Call this tool IMMEDIATELY when users ask to create, write, draft, generate, compose, or produce any document. This tool generates full content automatically based on title and kind. NEVER write document content in chat responses. Supports text documents, code files, spreadsheets, and images.",

  inputSchema: z.object({
    title: z.string().describe("The title or topic of the document to create"),
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

  execute: async (executionContext: any) => {
    const { context } = executionContext;
    const { title, kind } = context;

    // Get userId from agent context (passed through agent.generate() or agent.stream() options)
    // Priority: agentContext > runtimeContext > context > default
    const userId =
      executionContext?.agentContext?.userId ||
      executionContext?.runtimeContext?.userId ||
      executionContext?.context?.userId ||
      "anonymous";

    console.log(
      `[Mastra Tool - createDocument] ✅ TOOL CALLED! Creating document: "${title}" (${kind}) for user ${userId}`
    );
    console.log(
      "[Mastra Tool - createDocument] This message proves the tool was invoked!"
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
