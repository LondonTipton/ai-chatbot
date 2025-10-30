"use client";

import type { Models } from "appwrite";
import { createContext, useContext } from "react";

export type AuthContextValue = {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
};

// Export the context so it can be used by the provider
export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

/**
 * Custom hook to access authentication context
 * Must be used within an AuthProvider
 *
 * @throws {Error} If used outside of AuthProvider
 * @returns {AuthContextValue} Authentication context value
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider. " +
        "Make sure your component is wrapped with <AuthProvider>."
    );
  }

  return context;
}
