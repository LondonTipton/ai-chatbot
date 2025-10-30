"use client";

import type { Models } from "appwrite";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createBrowserClient } from "@/lib/appwrite/config";

type AuthContextType = {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Simple function to get current user
  const fetchUser = useCallback(async () => {
    try {
      const { account } = createBrowserClient();
      const currentUser = await account.get();
      setUser(currentUser);
      console.log("[Auth] User authenticated:", currentUser.email);
    } catch {
      // User not authenticated - this is normal
      setUser(null);
      console.log("[Auth] No authenticated user");
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

  const value = {
    user,
    isLoading,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
