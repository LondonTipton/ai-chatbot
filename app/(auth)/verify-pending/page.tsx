"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "@/components/toast";
import { useAuth } from "@/hooks/use-auth";

function VerifyPendingContent() {
  const router = useRouter();
  const { user, resendVerification, logout } = useAuth();
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendVerification();
      toast({
        type: "success",
        description: "Verification email sent! Please check your inbox.",
      });
    } catch (error: any) {
      toast({
        type: "error",
        description: error?.message || "Failed to send verification email.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="relative flex h-dvh w-screen flex-col items-center justify-start bg-background pt-8 md:pt-16">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Large Logo at Top */}
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

      <div className="flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl p-8">
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
              {user?.email || "your email address"}
            </p>
            <p className="text-gray-500 text-sm dark:text-zinc-400">
              Please check your inbox and click the verification link to access
              the application.
            </p>
          </div>

          <div className="mt-4 w-full space-y-3">
            <button
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={isResending}
              onClick={handleResend}
              type="button"
            >
              {isResending ? "Sending..." : "Resend Verification Email"}
            </button>

            <button
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-700 text-sm hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={handleLogout}
              type="button"
            >
              Sign Out
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
        <div className="relative flex h-dvh w-screen flex-col items-center justify-start bg-background pt-8 md:pt-16">
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
          <div className="flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl p-8">
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
