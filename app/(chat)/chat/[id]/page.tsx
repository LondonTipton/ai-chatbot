import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { auth } from "@/lib/appwrite/server-auth";
import {
  getChatById,
  getMessagesByChatId,
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

  if (!session) {
    redirect("/api/auth/guest");
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    // Check if the chat belongs to the current user
    // The session.user.id is the Appwrite ID, but chat.userId is the database UUID
    // We need to look up the database user by Appwrite ID to get the database UUID
    const dbUser = await getUserByAppwriteId(session.user.id);

    if (!dbUser) {
      // User doesn't exist in database yet - they can't own this chat
      return notFound();
    }

    // Check if the database user ID matches the chat's user ID
    if (dbUser.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  // Determine if the chat is readonly
  // Get the database user to compare with chat.userId
  const dbUser = session?.user?.id
    ? await getUserByAppwriteId(session.user.id)
    : null;
  const isReadonly = !dbUser || dbUser.id !== chat.userId;

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
