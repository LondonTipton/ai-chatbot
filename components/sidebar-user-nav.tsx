"use client";

import { ChevronUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { LoaderIcon } from "./icons";
import { toast } from "./toast";

type SidebarUserNavProps = {
  user: {
    id: string;
    email: string;
    name?: string;
  };
};

export function SidebarUserNav({ user }: SidebarUserNavProps) {
  const router = useRouter();
  const { user: authUser, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      // Use server-side logout API
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("[logout] Server error:", errorData);
        throw new Error(`Server-side logout failed: ${response.status}`);
      }

      // Clear any local storage
      localStorage.removeItem("appwrite-temp-session");
      localStorage.removeItem("pending-verification-email");

      // Wait a moment for cookie operations to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Force a hard redirect to ensure cookies are cleared
      window.location.href = "/login";
    } catch (error) {
      console.error("[logout] Logout failed:", error);
      toast({
        type: "error",
        description: "Failed to sign out. Please try again.",
      });
    }
  };

  // Prioritize the server-side user prop, fall back to client-side auth user
  const displayEmail = user.email || authUser?.email;
  const displayName = user.name || authUser?.name;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isLoading ? (
              <SidebarMenuButton className="h-10 justify-between bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex flex-row gap-2">
                  <div className="size-6 animate-pulse rounded-full bg-zinc-500/30" />
                  <span className="animate-pulse rounded-md bg-zinc-500/30 text-transparent">
                    Loading auth status
                  </span>
                </div>
                <div className="animate-spin text-zinc-500">
                  <LoaderIcon />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                className="h-10 bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                data-testid="user-nav-button"
              >
                <Image
                  alt={displayEmail ?? "User Avatar"}
                  className="rounded-full"
                  height={24}
                  src={`https://avatar.vercel.sh/${displayEmail}`}
                  width={24}
                />
                <span className="truncate" data-testid="user-email">
                  {displayName || displayEmail}
                </span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-popper-anchor-width)"
            data-testid="user-nav-menu"
            side="top"
          >
            <DropdownMenuItem
              className="cursor-pointer"
              data-testid="user-nav-item-pricing"
              onSelect={() => router.push("/pricing")}
            >
              Pricing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                className="w-full cursor-pointer"
                onClick={() => {
                  if (isLoading) {
                    toast({
                      type: "error",
                      description:
                        "Checking authentication status, please try again!",
                    });

                    return;
                  }

                  handleLogout();
                }}
                type="button"
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
