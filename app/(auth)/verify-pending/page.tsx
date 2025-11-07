"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "@/components/toast";
import { useAuth } from "@/hooks/use-auth";
import { createLogger } from "@/lib/logger";
import { logout, resendVerification } from "../actions";

const logger = createLogger("verify-pending/page");

function VerifyPendingContent() {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  // Store email in localStorage and state to persist across page reloads
  useEffect(() => {
    if (user?.email) {
      setUserEmail(user.email);
      localStorage.setItem("pending-verification-email", user.email);
    } else {
      // Try to restore from localStorage if user is not loaded yet
      const storedEmail = localStorage.getItem("pending-verification-email");
      if (storedEmail) {
        setUserEmail(storedEmail);
      }
    }
  }, [user]);

  const handleResend = async () => {
    if (!user && !userEmail) {
      toast({
        type: "error",
        description:
          "Unable to resend verification email. Please try logging in again.",
      });
      return;
    }

    setIsResending(true);

    const result = await resendVerification();

    if (result.status === "success") {
      toast({
        type: "success",
        description: "Verification email sent! Please check your inbox.",
      });
    } else {
      toast({
        type: "error",
        description: result.error || "Failed to send verification email.",
      });
    }

    setIsResending(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear stored email
      localStorage.removeItem("pending-verification-email");

      // Call server-side logout
      await logout();

      // Force redirect to login
      window.location.href = "/login";
    } catch (error) {
      logger.error("Logout error:", error);

      // Even if logout fails, clear local state and redirect
      localStorage.removeItem("pending-verification-email");
      window.location.href = "/login";
    }
  };

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const viewportHeight =
        window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDiff = windowHeight - viewportHeight;

      setIsKeyboardVisible(heightDiff > 150);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
    } else {
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      } else {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  return (
    <div
      className={`relative flex h-dvh w-screen flex-col items-center bg-background transition-all duration-300 ${
        isKeyboardVisible ? "justify-start pt-4" : "justify-center"
      } md:justify-start md:pt-16`}
    >
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Large Logo at Top */}
      <Link
        className={`transition-all duration-300 hover:opacity-80 ${
          isKeyboardVisible ? "mb-4" : "mb-12 md:mb-16"
        }`}
        href="https://deep-counsel.org"
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="font-bold text-4xl tracking-tight md:text-5xl dark:text-zinc-50">
          DeepCounsel
        </span>
      </Link>

      <div className="flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl p-8 px-4">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <svg
              className="h-8 w-8 text-blue-600 dark:text-blue-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>

          <h3 className="font-semibold text-xl dark:text-zinc-50">
            Verify Your Email
          </h3>

          <div className="space-y-2">
            <p className="text-gray-500 text-sm dark:text-zinc-400">
              We've sent a verification email to:
            </p>
            <p className="font-medium text-gray-900 text-sm dark:text-zinc-50">
              {userEmail || user?.email || "your email address"}
            </p>
            <p className="text-gray-500 text-sm dark:text-zinc-400">
              Please check your inbox and click the verification link to access
              the application.
            </p>
          </div>

          <div className="mt-4 w-full space-y-3">
            <button
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={isResending || isLoggingOut}
              onClick={handleResend}
              type="button"
            >
              {isResending ? "Sending..." : "Resend Verification Email"}
            </button>

            <button
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-700 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              disabled={isLoggingOut}
              onClick={handleLogout}
              type="button"
            >
              {isLoggingOut ? "Signing Out..." : "Sign Out"}
            </button>
          </div>

          <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-zinc-900">
            <p className="text-gray-600 text-xs dark:text-zinc-400">
              <strong>Didn't receive the email?</strong>
              <br />
              Check your spam folder or click the button above to resend.
              <br />
              The verification link expires after 1 hour.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex h-dvh w-screen flex-col items-center justify-center bg-background md:justify-start md:pt-16">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <Link
            className="mb-12 transition-opacity hover:opacity-80 md:mb-16"
            href="https://deep-counsel.org"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="font-bold text-4xl tracking-tight md:text-5xl dark:text-zinc-50">
              DeepCounsel
            </span>
          </Link>
          <div className="flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl p-8 px-4">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 dark:border-zinc-700 dark:border-t-zinc-50" />
              <h3 className="font-semibold text-xl dark:text-zinc-50">
                Loading...
              </h3>
            </div>
          </div>
        </div>
      }
    >
      <VerifyPendingContent />
    </Suspense>
  );
}
