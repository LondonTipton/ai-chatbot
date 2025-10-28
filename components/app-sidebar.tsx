"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons";
import { SidebarHistory } from "@/components/sidebar-history";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useIsMainChatPage } from "@/hooks/use-is-main-chat-page";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type User = {
  id: string;
  email: string;
  name?: string;
};

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { user: authUser, isLoading } = useAuth();
  const isMainChatPage = useIsMainChatPage();

  // Use server-side user prop if available, otherwise fall back to client-side auth user
  const currentUser =
    user ||
    (authUser
      ? {
          id: authUser.$id,
          email: authUser.email,
          name: authUser.name,
        }
      : undefined);

  // Debug logging
  console.log("[AppSidebar] Server user:", user ? user.email : "None");
  console.log("[AppSidebar] Client user:", authUser ? authUser.email : "None");
  console.log(
    "[AppSidebar] Final currentUser:",
    currentUser ? currentUser.email : "None"
  );
  console.log("[AppSidebar] Auth loading:", isLoading);

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row items-center justify-between">
            {isMainChatPage ? (
              <Link
                className="flex flex-row items-center gap-3"
                href="https://deep-counsel.org"
                onClick={() => {
                  setOpenMobile(false);
                }}
                rel="noreferrer"
                target="_blank"
              >
                <span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                  DeepCounsel
                </span>
              </Link>
            ) : (
              <button
                className="flex flex-row items-center gap-3"
                onClick={() => {
                  setOpenMobile(false);
                  router.push("/");
                }}
                type="button"
              >
                <span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                  DeepCounsel
                </span>
              </button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="h-8 p-1 md:h-fit md:p-2"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push("/");
                    router.refresh();
                  }}
                  type="button"
                  variant="ghost"
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end" className="hidden md:block">
                New Chat
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={currentUser} />
      </SidebarContent>
      <SidebarFooter>
        {currentUser && <SidebarUserNav user={currentUser} />}
      </SidebarFooter>
    </Sidebar>
  );
}
