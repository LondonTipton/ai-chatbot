"use client";

import { usePathname } from "next/navigation";

/**
 * Hook to determine if the current page is the main chat page
 * Main chat page is considered to be:
 * - "/" (root chat page)
 * - "/chat/[id]" (individual chat pages)
 */
export function useIsMainChatPage() {
  const pathname = usePathname();

  // Main chat page is the root "/" or any chat page "/chat/[id]"
  const isMainChatPage = pathname === "/" || pathname.startsWith("/chat/");

  return isMainChatPage;
}
