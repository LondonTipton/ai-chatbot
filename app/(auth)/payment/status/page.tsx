"use client";

import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createLogger } from "@/lib/logger";

const logger = createLogger("status/page");

type PaymentStatus = "pending" | "completed" | "failed";

function PaymentStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referenceNumber = searchParams.get("ref");
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  logger.log("[Payment Status Page] Reference from URL:", referenceNumber);

  useEffect(() => {
    if (!referenceNumber) {
      logger.error("[Payment Status Page] No reference number in URL");
      setError("Invalid payment reference");
      setLoading(false);
      return;
    }

    logger.log(
      "[Payment Status Page] Starting status check for:",
      referenceNumber
    );

    let pollInterval: NodeJS.Timeout;
    let timeoutTimer: NodeJS.Timeout;
    const startTime = Date.now();
    const TIMEOUT_DURATION = 3 * 60 * 1000; // 3 minutes
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;

    const checkStatus = async () => {
      try {
        // Check if we've exceeded the timeout
        const elapsed = Date.now() - startTime;
        if (elapsed > TIMEOUT_DURATION) {
          logger.warn("[Payment Status Page] Payment timeout reached");
          clearInterval(pollInterval);
          setStatus("failed");
          setError(
            "Payment timeout. The payment was not completed within 3 minutes. Please try again or contact support if you were charged."
          );
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/payment/status?ref=${referenceNumber}`
        );
        const data = await response.json();

        if (!response.ok) {
          // Check if it's a transient error (401, 500, network issues)
          if (response.status === 401 || response.status >= 500) {
            consecutiveErrors++;
            logger.warn(
              `[Payment Status Page] Transient error (${response.status}), retry ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}`
            );

            // Only fail after multiple consecutive errors
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
              throw new Error(
                data.error || "Failed to check status after multiple retries"
              );
            }
            // Don't throw, just continue polling
            return;
          }

          throw new Error(data.error || "Failed to check status");
        }

        // Reset error counter on success
        consecutiveErrors = 0;

        setPaymentDetails(data);
        setStatus(data.status);

        // Stop polling if payment is completed or failed
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(pollInterval);
          clearTimeout(timeoutTimer);
          setLoading(false);
        }
      } catch (err) {
        consecutiveErrors++;
        logger.error(
          `Status check error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
          err
        );

        // Only show error and stop polling after multiple consecutive failures
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to check payment status"
          );
          setLoading(false);
          clearInterval(pollInterval);
          clearTimeout(timeoutTimer);
        }
        // Otherwise, continue polling - it might be a transient error
      }
    };

    // Initial check
    checkStatus();

    // Poll every 5 seconds
    pollInterval = setInterval(checkStatus, 5000);

    // Set timeout to stop polling after 3 minutes
    timeoutTimer = setTimeout(() => {
      logger.warn("[Payment Status Page] Payment timeout reached (timer)");
      clearInterval(pollInterval);
      setStatus("failed");
      setError(
        "Payment timeout. The payment was not completed within 3 minutes. Please try again or contact support if you were charged."
      );
      setLoading(false);
    }, TIMEOUT_DURATION);

    // Cleanup
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    };
  }, [referenceNumber]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="size-6" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">{error}</p>
            <Button className="w-full" onClick={() => router.push("/pricing")}>
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Theme Toggle and DeepCounsel Button */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <ThemeToggle />
          <Button
            asChild
            className="bg-zinc-900 px-2 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Link href="/">DeepCounsel</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Icon */}
            <div className="flex justify-center">
              {status === "pending" && (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="size-16 animate-spin text-blue-500" />
                  <div className="text-center">
                    <p className="font-medium">Processing Payment</p>
                    <p className="text-muted-foreground text-sm">
                      Please check your phone for the Ecocash prompt
                    </p>
                  </div>
                </div>
              )}

              {status === "completed" && (
                <div className="flex flex-col items-center gap-4">
                  <CheckCircle className="size-16 text-green-500" />
                  <div className="text-center">
                    <p className="font-medium text-lg">Payment Successful!</p>
                    <p className="text-muted-foreground text-sm">
                      Your plan is now active
                    </p>
                  </div>
                </div>
              )}

              {status === "failed" && (
                <div className="flex flex-col items-center gap-4">
                  <XCircle className="size-16 text-red-500" />
                  <div className="text-center">
                    <p className="font-medium text-lg">Payment Failed</p>
                    <p className="text-muted-foreground text-sm">
                      Please try again or contact support
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Details */}
            {paymentDetails && (
              <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-mono">{referenceNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">
                    ${paymentDetails.amount} {paymentDetails.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Method:</span>
                  <span className="capitalize">
                    {paymentDetails.paymentMethod}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {status === "completed" && (
                <Button
                  className="w-full"
                  onClick={() => router.push("/")}
                  size="lg"
                >
                  Start Using DeepCounsel
                </Button>
              )}

              {status === "failed" && (
                <>
                  <Button
                    className="w-full"
                    onClick={() => router.push("/pricing")}
                    size="lg"
                  >
                    Try Again
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => router.push("/")}
                    size="lg"
                    variant="outline"
                  >
                    Back to Home
                  </Button>
                </>
              )}

              {status === "pending" && (
                <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 size-5 text-blue-500" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Waiting for confirmation
                      </p>
                      <p className="mt-1 text-blue-700 dark:text-blue-300">
                        This usually takes a few seconds. Please don't close
                        this page.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin" />
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  );
}
