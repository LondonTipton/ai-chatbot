"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "@/components/toast";
import { register } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      const emailVal = String(formData.get("email") || "").trim();
      setEmail(emailVal);
      setSubmitting(true);

      const result = await register({ status: "idle" }, formData);

      if (result.status === "success") {
        setIsSuccessful(true);
        toast({
          type: "success",
          description: "Account created! Please verify your email.",
        });
        router.push("/verify-pending");
        router.refresh();
      } else {
        const msg = result.error || "Failed to create account!";
        toast({ type: "error", description: msg });
        setIsSuccessful(false);
      }

      setSubmitting(false);
    },
    [router]
  );

  return (
    <div
      className={`relative flex h-dvh w-screen flex-col items-center bg-background transition-all duration-200 ease-out ${
        isKeyboardVisible ? "justify-start pt-4" : "justify-center"
      } md:justify-start md:pt-16`}
    >
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Large Logo at Top */}
      <Link
        className={`transition-all duration-200 ease-out hover:opacity-80 ${
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
            Get started
          </h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Create your account to access your AI legal assistant
          </p>
        </div>

        {/* Auth Form */}
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful || submitting}>
            Sign Up
          </SubmitButton>
          <p className="mt-3 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Already have an account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/login"
            >
              Sign in
            </Link>
            {" instead."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
