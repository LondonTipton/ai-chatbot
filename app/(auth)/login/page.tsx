"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createLogger } from "@/lib/logger";
import { login } from "../actions";

const logger = createLogger("login/page");

export default function Page() {
  const [status, setStatus] = useState<
    "idle" | "in_progress" | "success" | "failed"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (formData: FormData) => {
    setError(null);
    setStatus("in_progress");

    const result = await login({ status: "idle" }, formData);

    if (result.status === "success") {
      setStatus("success");
    } else {
      setError(result.error || "Failed to login. Please try again.");
      setStatus("failed");
    }
  }, []);

  useEffect(() => {
    if (status === "success") {
      logger.log(
        "[login] Login successful, using cookie bridge for reliable redirect..."
      );

      // Redirect to home page after successful login
      logger.log("[login] Login successful, redirecting...");
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    }
  }, [status]);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const viewportHeight =
        window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDiff = windowHeight - viewportHeight;

      // If height difference is more than 150px, assume keyboard is visible
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

      <div className="flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl px-4">
        {/* Welcome Section */}
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">
            Welcome back
          </h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Sign in to continue to your legal assistant
          </p>
        </div>

        {/* Auth Form */}
        <AuthForm action={handleSubmit} defaultEmail="">
          <SubmitButton isSuccessful={status === "success"}>
            Sign in
          </SubmitButton>
          {status === "failed" && error && (
            <p className="text-center text-red-600 text-sm dark:text-red-400">
              {error}
            </p>
          )}
          <p className="mt-3 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Don't have an account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/register"
            >
              Sign up
            </Link>
            {" for free."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
