import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { validateSession } from "@/lib/appwrite/auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("(chat)/layout");

export const experimental_ppr = true;

export const metadata: Metadata = {
  title: { template: "%s | DeepCounsel", default: "DeepCounsel" },
  robots: { index: false, follow: false },
};

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
  const fallbackUserId = cookieStore.get("appwrite_user_id")?.value;

  // Try Appwrite session first, then fallback to user validation
  let validation: Awaited<ReturnType<typeof validateSession>> | null = null;
  let appwriteUser: { $id: string; email: string; name?: string } | null = null;

  if (appwriteSessionCookie) {
    try {
      validation = await validateSession(appwriteSessionCookie);
      appwriteUser = validation?.user || null;
    } catch {
      // Session validation can fail during SSR due to timing - this is expected
      logger.debug("[layout] Session validation skipped during SSR");
    }
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
      logger.error("[layout] Fallback user validation failed:", error);
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
