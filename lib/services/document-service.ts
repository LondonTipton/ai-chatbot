import "server-only";

import type { UIMessageStreamWriter } from "ai";
import type { ArtifactKind } from "@/components/artifact";
import { documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import { getDocumentById } from "@/lib/db/queries";
import type { Document } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import type { ChatMessage, Session } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

const logger = createLogger("services/document-service");

export type CreateDocumentParams = {
  title: string;
  kind: ArtifactKind;
  userId: string;
};

export type UpdateDocumentParams = {
  documentId: string;
  description: string;
  userId: string;
};

export type DocumentResult = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
};

/**
 * Service layer for document operations
 * This provides core business logic that can be used by both AI SDK tools and Mastra tools
 *
 * IMPORTANT: This service now uses the existing documentHandlersByArtifactKind
 * to ensure both Vercel AI SDK and Mastra tools use the same proven document generation code.
 */

/**
 * Create a no-op dataStream for non-UI contexts (e.g., Mastra tools)
 * This allows us to reuse the document handlers without UI streaming
 */
function createNoOpDataStream(): UIMessageStreamWriter<ChatMessage> {
  return {
    write: () => {
      /* No-op: discard UI updates */
    },
    merge: () => {
      /* No-op */
    },
    onError: () => {
      /* No-op */
    },
  } as UIMessageStreamWriter<ChatMessage>;
}

/**
 * Create a minimal session object for handler compatibility
 */
function createServiceSession(userId: string): Session {
  return {
    user: {
      id: userId,
      email: `user-${userId}@service.internal`,
    },
  } as Session;
}

/**
 * Create a new document using the existing document handlers
 * This ensures both Vercel AI SDK and Mastra tools use the same proven code
 */
export async function createDocumentService(
  params: CreateDocumentParams
): Promise<DocumentResult> {
  const { title, kind, userId } = params;
  const id = generateUUID();

  logger.log(
    `[DocumentService] Creating document: "${title}" (${kind}) for user ${userId}`
  );

  // Find the appropriate document handler for this kind
  const documentHandler = documentHandlersByArtifactKind.find(
    (handler) => handler.kind === kind
  );

  if (!documentHandler) {
    throw new Error(`No document handler found for kind: ${kind}`);
  }

  // Use a no-op dataStream since Mastra doesn't need UI updates
  const dataStream = createNoOpDataStream();
  const session = createServiceSession(userId);

  // Call the existing handler - it will generate content AND save to database
  await documentHandler.onCreateDocument({
    id,
    title,
    dataStream,
    session,
  });

  // Retrieve the saved document to return its content
  const document = await getDocumentById({ id });

  if (!document) {
    throw new Error(`Document was not saved correctly: ${id}`);
  }

  logger.log(`[DocumentService] Document created successfully: ${id}`);

  return {
    id: document.id,
    title: document.title,
    kind: document.kind,
    content: document.content ?? "",
  };
}

/**
 * Update an existing document using the existing document handlers
 * This ensures both Vercel AI SDK and Mastra tools use the same proven code
 */
export async function updateDocumentService(
  params: UpdateDocumentParams
): Promise<DocumentResult> {
  const { documentId, description, userId } = params;

  logger.log(
    `[DocumentService] Updating document: ${documentId} for user ${userId}`
  );

  // Get the existing document
  const document = await getDocumentById({ id: documentId });

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  // Verify ownership
  if (document.userId !== userId) {
    throw new Error("Unauthorized: You don't own this document");
  }

  // Find the appropriate document handler for this kind
  const documentHandler = documentHandlersByArtifactKind.find(
    (handler) => handler.kind === document.kind
  );

  if (!documentHandler) {
    throw new Error(`No document handler found for kind: ${document.kind}`);
  }

  // Use a no-op dataStream since Mastra doesn't need UI updates
  const dataStream = createNoOpDataStream();
  const session = createServiceSession(userId);

  // Call the existing handler - it will generate updated content AND save to database
  await documentHandler.onUpdateDocument({
    document,
    description,
    dataStream,
    session,
  });

  // Retrieve the updated document to return its new content
  const updatedDocument = await getDocumentById({ id: documentId });

  if (!updatedDocument) {
    throw new Error(`Document not found after update: ${documentId}`);
  }

  logger.log(`[DocumentService] Document updated successfully: ${documentId}`);

  return {
    id: updatedDocument.id,
    title: updatedDocument.title,
    kind: updatedDocument.kind,
    content: updatedDocument.content ?? "",
  };
}

/**
 * Get document by ID
 * Wrapper around the database query for consistent service layer API
 */
export async function getDocumentService(
  documentId: string
): Promise<Document | null> {
  return (await getDocumentById({ id: documentId })) as Document | null;
}
