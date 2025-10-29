"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "@/components/toast";
import { useAuth } from "@/hooks/use-auth";

export default function Page() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      const emailVal = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");
      setEmail(emailVal);
      setSubmitting(true);
      try {
        await register(emailVal, password);
        setIsSuccessful(true);
        toast({
          type: "success",
          description: "Account created! Please verify your email.",
        });
        router.push("/verify-pending");
        router.refresh();
      } catch (e: any) {
        const msg = e?.message || "Failed to create account!";
        toast({ type: "error", description: msg });
        setIsSuccessful(false);
      } finally {
        setSubmitting(false);
      }
    },
    [register, router]
  );

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

      <div className="flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl">
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
