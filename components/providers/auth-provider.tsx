"use client";

import type { Models } from "appwrite";
import { useCallback, useEffect, useState } from "react";
import { AuthContext, type AuthContextValue } from "@/hooks/use-auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("providers/auth-provider");

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user from session API
  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          logger.log("[Auth] User authenticated:", data.user.email);
          return;
        }
      }

      // No valid session
      setUser(null);
      logger.log("[Auth] No authenticated user");
    } catch (error) {
      // Error fetching user - treat as not authenticated
      setUser(null);
      logger.log("[Auth] Error fetching user:", error);
    }
  }, []);

  // Public refresh function
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      logger.log("[Auth] Initializing...");
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
