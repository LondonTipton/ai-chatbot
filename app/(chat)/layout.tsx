import { cookies } from "next/headers";
import Script from "next/script";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { validateSession } from "@/lib/appwrite/auth";

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get session information from cookies
  const cookieStore = await cookies();
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const appwriteSessionCookie = projectId
    ? cookieStore.get(`a_session_${projectId}`)?.value
    : null;

  // Fallback to custom session cookies if Appwrite cookie not available
  const fallbackSessionId = cookieStore.get("appwrite-session")?.value;
  const fallbackUserId = cookieStore.get("appwrite_user_id")?.value;

  // Try Appwrite session first, then fallback to user validation
  let validation = null;
  let appwriteUser = null;

  if (appwriteSessionCookie) {
    validation = await validateSession(appwriteSessionCookie);
    appwriteUser = validation?.user || null;
  } else if (fallbackUserId) {
    // Use the same validation method as API routes
    try {
      const { getUserByAppwriteId } = await import("@/lib/db/queries");
      const user = await getUserByAppwriteId(fallbackUserId);
      if (user) {
        // Convert database user to Appwrite-like user format
        appwriteUser = {
          $id: fallbackUserId,
          email: user.email,
          name: user.email.split("@")[0], // Use email prefix as name fallback
        } as any;
      }
    } catch (error) {
      console.error("[layout] Fallback user validation failed:", error);
    }
  }

  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  // Convert Appwrite user to our User interface
  const user = appwriteUser
    ? {
        id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
      }
    : undefined;

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <SidebarProvider defaultOpen={!isCollapsed}>
          <AppSidebar user={user} />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </DataStreamProvider>
    </>
  );
}
