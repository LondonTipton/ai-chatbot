import { auth } from "@/lib/appwrite/server-auth";
import {
  getChatById,
  getMessagesByChatId,
  getUserByAppwriteId,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { convertToUIMessages } from "@/lib/utils";

const logger = createLogger("messages/route");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const dbUser = await getUserByAppwriteId(session.user.id);
    if (!dbUser) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const chat = await getChatById({ id: chatId });
    if (!chat || chat.userId !== dbUser.id) {
      return new ChatSDKError("forbidden:chat").toResponse();
    }

    const messagesFromDb = await getMessagesByChatId({ id: chatId });
    const uiMessages = convertToUIMessages(messagesFromDb);

    return Response.json(uiMessages, { status: 200 });
  } catch (error) {
    logger.error("[GET /api/messages] Unhandled error:", error);
    return new ChatSDKError("offline:chat").toResponse();
  }
}
