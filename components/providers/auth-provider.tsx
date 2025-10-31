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
      // Helper to fetch with no-store to avoid any caching flicker
      const doFetch = async () =>
        fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          // Bust any intermediate caches just in case
          headers: { "x-request-ts": Date.now().toString() },
        });

      // First attempt
      let response = await doFetch();
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          console.log("[Auth] User authenticated:", data.user.email);
          return;
        }
      }

      // If first attempt returned null, retry once after a short tick to smooth over transient states
      await new Promise((r) => setTimeout(r, 75));
      response = await doFetch();
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          console.log("[Auth] User authenticated (retry):", data.user.email);
          return;
        }
      }

      // No valid session after retry
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
