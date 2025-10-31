import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { auth } from "@/lib/appwrite/server-auth";
import {
  getChatById,
  getMessagesByChatId,
  getUser,
  getUserByAppwriteId,
} from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  // Determine ownership when we have a session; if no session, treat as not owner for now
  let isOwner = false;
  if (chat.visibility === "private" && session?.user) {
    // Debug logging for live server
    console.log(`[Chat ${id}] Session user:`, {
      id: session.user.id,
      email: session.user.email,
    });
    console.log(`[Chat ${id}] Chat owner:`, chat.userId);

    // Resolve ownership
    // 1) Try DB user by Appwrite ID
    let dbUser = await getUserByAppwriteId(session.user.id);

    // 2) Fallback: if missing, try by email (handles users without appwriteId mapped)
    if (!dbUser && session.user.email) {
      try {
        const usersByEmail = await getUser(session.user.email);
        dbUser = usersByEmail?.[0] || null;
        if (dbUser) {
          console.log(
            `[Chat ${id}] Resolved user via email fallback: ${dbUser.id}`
          );
        }
      } catch (e) {
        console.warn(`[Chat ${id}] Email fallback lookup failed:`, e);
      }
    }

    console.log(
      `[Chat ${id}] Database user lookup:`,
      dbUser
        ? {
            id: dbUser.id,
            email: dbUser.email,
            appwriteId: dbUser.appwriteId,
          }
        : "null"
    );

    // Ownership rules (accept both modern and legacy):
    // - Modern: dbUser.id (UUID) matches chat.userId
    // - Legacy: session.user.id (Appwrite ID) matches chat.userId
    isOwner =
      (dbUser ? dbUser.id === chat.userId : false) ||
      session.user.id === chat.userId;

    console.log(`[Chat ${id}] Ownership check:`, {
      dbUserExists: typeof isOwner === "boolean" ? !!dbUser : false,
      dbUserIdMatches: dbUser?.id === chat.userId,
      sessionIdMatches: session.user.id === chat.userId,
      finalIsOwner: isOwner,
    });

    // If we definitively have a session and ownership is false, deny access
    if (!isOwner) {
      console.error(
        `[Chat Access Denied] User ${session.user.id} (email: ${session.user.email}) attempted to access chat ${id} owned by ${chat.userId}`
      );
      return notFound();
    }
  }

  // Only fetch messages for private chats when ownership is confirmed.
  // For public chats, always fetch. When session is null on a private chat,
  // render readonly with no messages to avoid redirect and data leak; client auth will settle.
  const messagesFromDb =
    chat.visibility === "private" && !isOwner
      ? []
      : await getMessagesByChatId({ id });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  // Determine readonly state: private chats are readonly unless owner confirmed; public are editable.
  const isReadonly = chat.visibility === "private" ? !isOwner : false;

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          autoResume={true}
          id={chat.id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialLastContext={chat.lastContext ?? undefined}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility}
          isReadonly={isReadonly}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={true}
        id={chat.id}
        initialChatModel={chatModelFromCookie.value}
        initialLastContext={chat.lastContext ?? undefined}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isReadonly={isReadonly}
      />
      <DataStreamHandler />
    </>
  );
}
