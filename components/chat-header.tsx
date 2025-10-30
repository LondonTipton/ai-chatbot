"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { UsageIndicator } from "@/components/usage-indicator";
import { useIsMainChatPage } from "@/hooks/use-is-main-chat-page";
import { useUsage } from "@/hooks/use-usage";
import { PlusIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "./ui/sidebar";

function PureChatHeader() {
  const router = useRouter();
  const { open } = useSidebar();
  const isMainChatPage = useIsMainChatPage();
  const { usage } = useUsage();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Button
          className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="outline"
        >
          <PlusIcon />
          <span className="md:sr-only">New Chat</span>
        </Button>
      )}

      <ThemeToggle className="order-1 md:order-2" />

      {usage && (
        <div className="order-2 md:order-3">
          <UsageIndicator
            dailyLimit={usage.dailyLimit}
            plan={usage.plan}
            requestsToday={usage.requestsToday}
          />
        </div>
      )}

      {isMainChatPage ? (
        <Button
          asChild
          className="order-3 hidden bg-zinc-900 px-2 text-zinc-50 hover:bg-zinc-800 md:ml-auto md:flex md:h-fit dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Link
            href={"https://deep-counsel.org"}
            rel="noreferrer"
            target="_blank"
          >
            DeepCounsel
          </Link>
        </Button>
      ) : (
        <Button
          className="order-3 hidden bg-zinc-900 px-2 text-zinc-50 hover:bg-zinc-800 md:ml-auto md:flex md:h-fit dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          onClick={() => router.push("/")}
        >
          DeepCounsel
        </Button>
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);
