"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "@/components/toast";
import { createBrowserClient } from "@/lib/appwrite/config";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const verifyEmail = async () => {
      const userId = searchParams.get("userId");
      const secret = searchParams.get("secret");

      if (!userId || !secret) {
        setStatus("error");
        setErrorMessage(
          "Invalid verification link. Missing required parameters."
        );
        return;
      }

      try {
        const { account } = createBrowserClient();
        await account.updateVerification(userId, secret);

        setStatus("success");
        toast({
          type: "success",
          description: "Email verified successfully!",
        });

        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 2000);
      } catch (error: any) {
        console.error("Verification error:", error);
        setStatus("error");

        // Map Appwrite errors to user-friendly messages
        if (error?.code === 401) {
          setErrorMessage("Invalid or expired verification link.");
        } else if (error?.code === 404) {
          setErrorMessage("User not found.");
        } else {
          setErrorMessage("Failed to verify email. Please try again.");
        }

        toast({
          type: "error",
          description: errorMessage || "Verification failed",
        });
      }
    };

    verifyEmail();
  }, [searchParams, router, errorMessage]);

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
          {status === "verifying" && (
            <>
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 dark:border-zinc-700 dark:border-t-zinc-50" />
              <h3 className="font-semibold text-xl dark:text-zinc-50">
                Verifying Your Email
              </h3>
              <p className="text-gray-500 text-sm dark:text-zinc-400">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-xl dark:text-zinc-50">
                Email Verified!
              </h3>
              <p className="text-gray-500 text-sm dark:text-zinc-400">
                Your email has been successfully verified. Redirecting you to
                the app...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <svg
                  className="h-6 w-6 text-red-600 dark:text-red-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-xl dark:text-zinc-50">
                Verification Failed
              </h3>
              <p className="text-gray-500 text-sm dark:text-zinc-400">
                {errorMessage}
              </p>
              <button
                className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                onClick={() => router.push("/verify-pending")}
                type="button"
              >
                Request New Verification Email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
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
      <VerifyContent />
    </Suspense>
  );
}
