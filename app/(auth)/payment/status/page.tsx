"use client";

import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PaymentStatus = "pending" | "completed" | "failed";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export default function PaymentStatusPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const referenceNumber = searchParams.get("ref");

  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    if (!referenceNumber) {
      setError("Invalid payment reference");
      setLoading(false);
      return;
    }

    let pollInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/payment/status?ref=${referenceNumber}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to check status");
        }

        setPaymentDetails(data);
        setStatus(data.status);

        // Stop polling if payment is completed or failed
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(pollInterval);
          setLoading(false);
        }
      } catch (err) {
        console.error("Status check error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to check payment status"
        );
        setLoading(false);
        clearInterval(pollInterval);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 5 seconds
    pollInterval = setInterval(checkStatus, 5000);

    // Cleanup
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
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
                      Your subscription is now active
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
