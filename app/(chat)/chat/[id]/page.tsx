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
    // Redirect to login with return URL to come back to this chat
    redirect(`/login?returnUrl=/chat/${id}`);
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    // Check if the chat belongs to the current user
    // Try to find the database user by Appwrite ID
    const dbUser = await getUserByAppwriteId(session.user.id);

    // If we can't find the user by Appwrite ID, check if the session user ID
    // directly matches the chat's user ID (for backward compatibility)
    const isOwner = dbUser
      ? dbUser.id === chat.userId
      : session.user.id === chat.userId;

    if (!isOwner) {
      // Show a more helpful error message
      console.error(
        `[Chat Access Denied] User ${session.user.id} (email: ${session.user.email}) attempted to access chat ${id} owned by ${chat.userId}`
      );
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

  // Check ownership: either database user ID matches, or session user ID matches directly
  const isOwner = dbUser
    ? dbUser.id === chat.userId
    : session?.user?.id === chat.userId;

  const isReadonly = !isOwner;

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
