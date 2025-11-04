import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import { createLogger } from "@/lib/logger";
import type { ChatMessage, Session } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

const logger = createLogger("tools/create-document");

type CreateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

/**
 * AI SDK Tool: Create Document
 *
 * This tool wraps the document creation service with UI streaming capabilities.
 * It handles real-time updates to the UI via dataStream while delegating
 * the core business logic to the service layer.
 */
export const createDocument = ({ session, dataStream }: CreateDocumentProps) =>
  tool({
    description:
      "Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.",
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind }) => {
      logger.log(
        `[createDocument] Tool called with title: "${title}", kind: ${kind}`
      );

      if (!session?.user?.id) {
        throw new Error("User session required to create document");
      }

      const id = generateUUID();

      // Stream metadata to UI
      dataStream.write({
        type: "data-kind",
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: "data-id",
        data: id,
        transient: true,
      });

      dataStream.write({
        type: "data-title",
        data: title,
        transient: true,
      });

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      // Use the document handler to generate and save the document
      // This maintains the streaming behavior for the UI
      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        session,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: "A document was created and is now visible to the user.",
      };
    },
  });
