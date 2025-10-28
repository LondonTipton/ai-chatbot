"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
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
          description: "Account created successfully!",
        });
        router.push("/");
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
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Sign Up</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful || submitting}>
            Sign Up
          </SubmitButton>
          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
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
