import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import { getDocumentById } from "@/lib/db/queries";
import type { ChatMessage, Session } from "@/lib/types";

type UpdateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

/**
 * AI SDK Tool: Update Document
 *
 * This tool wraps the document update service with UI streaming capabilities.
 * It handles real-time updates to the UI via dataStream.
 */
export const updateDocument = ({ session, dataStream }: UpdateDocumentProps) =>
  tool({
    description: "Update a document with the given description.",
    inputSchema: z.object({
      id: z.string().describe("The ID of the document to update"),
      description: z
        .string()
        .describe("The description of changes that need to be made"),
    }),
    execute: async ({ id, description }) => {
      if (!session?.user?.id) {
        throw new Error("User session required to update document");
      }

      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: "Document not found",
        };
      }

      // Verify ownership
      if (document.userId !== session.user.id) {
        return {
          error: "Unauthorized: You don't own this document",
        };
      }

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        session,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: "The document has been updated successfully.",
      };
    },
  });
