"use client";

import type { Models } from "appwrite";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthContext, type AuthContextValue } from "@/hooks/use-auth";
import { createBrowserClient } from "@/lib/appwrite/config";

// Session refresh interval (check every 5 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

// Session refresh threshold (refresh when less than 1 day remains)
const SESSION_REFRESH_THRESHOLD = 24 * 60 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [session, setSession] = useState<Models.Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Internal function to fetch current user and session
  const fetchUserAndSession = useCallback(async () => {
    try {
      console.log("[AuthProvider] Fetching user and session...");

      const { account } = createBrowserClient();

      // Get current user
      const currentUser = await account.get();
      console.log("[AuthProvider] Got user:", currentUser.email);
      setUser(currentUser);

      // Get current session
      const sessions = await account.listSessions();
      const currentSession = sessions.sessions.find((s) => s.current);
      console.log(
        "[AuthProvider] Got session:",
        currentSession ? currentSession.$id.slice(0, 8) + "..." : "None"
      );
      setSession(currentSession || null);

      return { user: currentUser, session: currentSession || null };
    } catch (error: any) {
      // Check if this is a guest user (not logged in) - this is expected
      if (error?.code === 401 || error?.message?.includes("guests")) {
        console.log("[AuthProvider] No active session (guest user)");
        setUser(null);
        setSession(null);
        return { user: null, session: null };
      }

      // For other errors, log them
      console.log("[AuthProvider] Session error:", error);

      // Clear any invalid session cookies
      try {
        const { account } = createBrowserClient();
        await account.deleteSession("current").catch(() => {
          // Ignore errors when deleting invalid sessions
        });
      } catch {
        // Ignore errors
      }

      setUser(null);
      setSession(null);
      return { user: null, session: null };
    }
  }, []);

  // Public function to refresh user (matches interface)
  const refreshUser = useCallback(async () => {
    await fetchUserAndSession();
  }, [fetchUserAndSession]);

  // Check if session needs refresh
  const shouldRefreshSession = useCallback(
    (currentSession: Models.Session): boolean => {
      try {
        const expirationDate = new Date(currentSession.expire);
        const now = new Date();
        const timeUntilExpiration = expirationDate.getTime() - now.getTime();

        return timeUntilExpiration < SESSION_REFRESH_THRESHOLD;
      } catch {
        return true;
      }
    },
    []
  );

  // Refresh session if needed
  const refreshSessionIfNeeded = useCallback(async () => {
    if (!session) {
      return;
    }

    if (shouldRefreshSession(session)) {
      console.log(
        `[auth] Session expiring soon (${session.expire}), refreshing...`
      );

      try {
        const { account } = createBrowserClient();

        // Access the session to trigger Appwrite's automatic refresh
        const sessions = await account.listSessions();
        const currentSession = sessions.sessions.find((s) => s.current);

        if (currentSession) {
          setSession(currentSession);
          console.log(
            `[auth] Session refreshed. New expiration: ${currentSession.expire}`
          );
        } else {
          // No current session found, fetch full user data
          await refreshUser();
        }
      } catch (error) {
        console.error("[auth] Failed to refresh session:", error);
        // If refresh fails, try to get fresh user data
        await refreshUser();
      }
    }
  }, [session, shouldRefreshSession, refreshUser]);

  // Login method
  const login = async (email: string, password: string) => {
    try {
      const { account } = createBrowserClient();

      // First, try to delete any existing session (including invalid guest sessions)
      try {
        await account.deleteSession("current");
        console.log("[auth] Deleted existing session before login");
      } catch {
        // Ignore errors - there might not be a session to delete
        console.log(
          "[auth] No existing session to delete (or already invalid)"
        );
      }

      // Note: We don't manipulate Appwrite cookies client-side; Browser SDK handles it.

      // Create email session
      const loginSession = await account.createEmailPasswordSession(
        email,
        password
      );

      // Sync httpOnly cookies on our domain for middleware fallback
      try {
        const syncResponse = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: loginSession.$id,
            userId: loginSession.userId,
          }),
        });

        if (syncResponse.ok) {
          console.log("[auth] Cookie sync completed successfully");

          // Store session info in localStorage temporarily for immediate redirect
          // This will be used by middleware if cookies aren't immediately available
          localStorage.setItem(
            "appwrite-temp-session",
            JSON.stringify({
              sessionId: loginSession.$id,
              userId: loginSession.userId,
              timestamp: Date.now(),
            })
          );
        } else {
          console.warn("[auth] Cookie sync failed, but continuing with login");
        }
      } catch (error) {
        console.warn("[auth] Cookie sync error:", error);
        // Non-fatal - continue with login
      }

      // Refresh user data
      await refreshUser();
    } catch (error: unknown) {
      console.error("Login error:", error);

      // Map Appwrite errors to user-friendly messages
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 401
      ) {
        throw new Error("Invalid email or password");
      }

      throw new Error("Failed to login. Please try again.");
    }
  };

  // Register method
  const register = async (email: string, password: string, name?: string) => {
    try {
      const { account } = createBrowserClient();

      // First, try to delete any existing session (including invalid guest sessions)
      try {
        await account.deleteSession("current");
        console.log("[auth] Deleted existing session before registration");
      } catch {
        // Ignore errors - there might not be a session to delete
        console.log(
          "[auth] No existing session to delete (or already invalid)"
        );
      }

      // Note: We don't manipulate Appwrite cookies client-side; Browser SDK handles it.

      // Create account
      await account.create("unique()", email, password, name);

      // Automatically login after registration
      const regSession = await account.createEmailPasswordSession(
        email,
        password
      );

      // Sync httpOnly cookies on our domain for middleware fallback
      try {
        const syncResponse = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: regSession.$id,
            userId: regSession.userId,
          }),
        });

        if (syncResponse.ok) {
          console.log("[auth] Registration cookie sync completed successfully");
        } else {
          console.warn(
            "[auth] Cookie sync failed during registration, but continuing"
          );
        }
      } catch (error) {
        console.warn("[auth] Registration cookie sync error:", error);
        // Non-fatal - continue with registration
      }

      // Refresh user data
      await refreshUser();
    } catch (error: unknown) {
      console.error("Registration error:", error);

      // Map Appwrite errors to user-friendly messages
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 409
      ) {
        throw new Error("An account with this email already exists");
      }

      throw new Error("Failed to register. Please try again.");
    }
  };

  // Logout method
  const logout = async () => {
    try {
      const { account } = createBrowserClient();

      // Try to delete current session
      try {
        await account.deleteSession("current");
        console.log("[AuthProvider] Successfully deleted Appwrite session");
      } catch (sessionError: any) {
        console.log(
          "[AuthProvider] Failed to delete Appwrite session:",
          sessionError
        );

        // If it's a guest user error, that's expected - just continue
        if (
          sessionError?.code === 401 ||
          sessionError?.message?.includes("guests")
        ) {
          console.log(
            "[AuthProvider] Guest user detected, skipping session deletion"
          );
        } else {
          // For other errors, we still want to continue with cleanup
          console.warn(
            "[AuthProvider] Unexpected session deletion error, continuing with cleanup"
          );
        }
      }

      // Clear user and session state
      setUser(null);
      setSession(null);

      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // Clear any temporary session data
      localStorage.removeItem("appwrite-temp-session");

      console.log("[AuthProvider] Client-side logout completed");
    } catch (error) {
      console.error("[AuthProvider] Logout error:", error);

      // Even if logout fails, clear local state
      setUser(null);
      setSession(null);

      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // Clear any temporary session data
      localStorage.removeItem("appwrite-temp-session");

      // Don't throw error - let the UI handle fallback logout
      console.log(
        "[AuthProvider] Client-side logout completed with errors, but state cleared"
      );
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      console.log("[AuthProvider] Initializing auth state...");
      await fetchUserAndSession();
      setIsLoading(false);
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUserAndSession]); // run once on mount; fetchUserAndSession is memoized

  // Set up session refresh interval when session changes
  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Set up new interval if user is authenticated
    if (session) {
      console.log("[auth] Setting up session refresh interval");
      refreshIntervalRef.current = setInterval(() => {
        refreshSessionIfNeeded();
      }, SESSION_CHECK_INTERVAL);
    }

    // Cleanup interval on unmount or when session changes
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [session, refreshSessionIfNeeded]);

  // Handle visibility change to refresh session when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && session) {
        console.log("[auth] Tab became visible, checking session...");
        refreshSessionIfNeeded();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session, refreshSessionIfNeeded]);

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
