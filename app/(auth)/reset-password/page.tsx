"use client";

import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get userId and secret from URL on client side
  const [userId, setUserId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  // Extract params from URL on mount
  useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setUserId(params.get("userId"));
      setSecret(params.get("secret"));
    }
  });

  const handleSubmit = async (formData: FormData) => {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!userId || !secret) {
      setError("Invalid password reset link");
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          secret,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("An error occurred. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
        <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
          <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
            <h3 className="font-semibold text-xl dark:text-zinc-50">
              Password Reset Successful
            </h3>
            <p className="text-gray-500 text-sm dark:text-zinc-400">
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">
            Reset Password
          </h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Enter your new password below
          </p>
        </div>

        <Form
          action={handleSubmit}
          className="flex flex-col gap-4 px-4 sm:px-16"
        >
          <div className="flex flex-col gap-2">
            <Label
              className="font-normal text-zinc-600 dark:text-zinc-400"
              htmlFor="password"
            >
              New Password
            </Label>
            <Input
              autoComplete="new-password"
              className="bg-muted text-md md:text-sm"
              id="password"
              minLength={8}
              name="password"
              placeholder="Enter new password"
              required
              type="password"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              className="font-normal text-zinc-600 dark:text-zinc-400"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </Label>
            <Input
              autoComplete="new-password"
              className="bg-muted text-md md:text-sm"
              id="confirmPassword"
              minLength={8}
              name="confirmPassword"
              placeholder="Confirm new password"
              required
              type="password"
            />
          </div>

          {error && (
            <div className="text-center text-red-500 text-sm">{error}</div>
          )}

          <SubmitButton isSuccessful={false}>Reset Password</SubmitButton>
        </Form>

        <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
          Remember your password?{" "}
          <Link
            className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            href="/login"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
