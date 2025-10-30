"use client";

import type { Models } from "appwrite";
import { useCallback, useEffect, useState } from "react";
import { AuthContext, type AuthContextValue } from "@/hooks/use-auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Simple function to get current user from server
  const fetchUser = useCallback(async () => {
    try {
      // Get session info from cookies
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
      const cookies = document.cookie.split(";").reduce((acc, cookie) => {
        const [key, val] = cookie.trim().split("=");
        acc[key] = val;
        return acc;
      }, {} as Record<string, string>);

      // Try Appwrite session cookie first
      const appwriteSessionCookie = projectId
        ? cookies[`a_session_${projectId}`]
        : null;

      // Fallback to custom session cookies
      const fallbackSessionId = cookies["appwrite-session"];
      const fallbackUserId = cookies.appwrite_user_id;

      const sessionId = appwriteSessionCookie || fallbackSessionId;
      const userId = fallbackUserId;

      if (!sessionId || !userId) {
        console.log("[Auth] No session cookies found");
        setUser(null);
        return;
      }

      // Use server-side validation API with session info
      const response = await fetch(
        `/api/auth/quick-validate?sessionId=${sessionId}&userId=${userId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.user) {
          setUser(data.user);
          console.log("[Auth] User authenticated:", data.user.email);
          return;
        }
      }

      // No valid session
      setUser(null);
      console.log("[Auth] No authenticated user");
    } catch (error) {
      // Error fetching user - treat as not authenticated
      setUser(null);
      console.log("[Auth] Error fetching user:", error);
    }
  }, []);

  // Public refresh function
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      console.log("[Auth] Initializing...");
      await fetchUser();
      setIsLoading(false);
    };

    initAuth();
  }, [fetchUser]);

  const value: AuthContextValue = {
    user,
    isLoading,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
