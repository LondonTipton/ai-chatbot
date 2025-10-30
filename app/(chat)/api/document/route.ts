import type { ArtifactKind } from "@/components/artifact";
import { auth } from "@/lib/appwrite/server-auth";
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is missing"
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  // Convert Appwrite ID to database UUID for ownership check
  const { getUserByAppwriteId } = await import("@/lib/db/queries");
  const dbUser = await getUserByAppwriteId(session.user.id);

  if (!dbUser || document.userId !== dbUser.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required."
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: ArtifactKind } =
    await request.json();

  // Convert Appwrite ID to database UUID
  const { getUserByAppwriteId } = await import("@/lib/db/queries");
  const dbUser = await getUserByAppwriteId(session.user.id);

  if (!dbUser) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  const documents = await getDocumentsById({ id });

  if (documents.length > 0) {
    const [doc] = documents;

    if (doc.userId !== dbUser.id) {
      return new ChatSDKError("forbidden:document").toResponse();
    }
  }

  // Use database UUID for saving the document
  const document = await saveDocument({
    id,
    content,
    title,
    kind,
    userId: dbUser.id,
  });

  return Response.json(document, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const timestamp = searchParams.get("timestamp");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required."
    ).toResponse();
  }

  if (!timestamp) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter timestamp is required."
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  // Convert Appwrite ID to database UUID for ownership check
  const { getUserByAppwriteId } = await import("@/lib/db/queries");
  const dbUser = await getUserByAppwriteId(session.user.id);

  if (!dbUser || document.userId !== dbUser.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return Response.json(documentsDeleted, { status: 200 });
}
