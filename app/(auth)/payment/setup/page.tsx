"use client";

import { AlertCircle, CheckCircle, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createLogger } from "@/lib/logger";

const logger = createLogger("setup/page");

interface SetupStatus {
  status: string;
  checks: {
    pesepayCredentials: boolean;
    appUrl: boolean;
    databaseConnection: boolean;
    paymentTableExists: boolean;
    subscriptionTableExists: boolean;
  };
  errors: string[];
  message: string;
  nextSteps: string[];
}

export default function PaymentSetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/payment/test");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      logger.error("Error checking setup:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSetup();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Failed to check setup status
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isReady = status.status === "ready";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-bold text-3xl">Payment System Setup</h1>
          <p className="text-muted-foreground">
            Check if your payment system is configured correctly
          </p>
        </div>

        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isReady ? (
                <>
                  <CheckCircle className="size-6 text-green-500" />
                  System Ready
                </>
              ) : (
                <>
                  <AlertCircle className="size-6 text-yellow-500" />
                  Configuration Required
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <div
              className={`rounded-lg border p-4 ${
                isReady
                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
                  : "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20"
              }`}
            >
              <p
                className={
                  isReady
                    ? "text-green-900 dark:text-green-100"
                    : "text-yellow-900 dark:text-yellow-100"
                }
              >
                {status.message}
              </p>
            </div>

            {/* Checks */}
            <div className="space-y-3">
              <h3 className="font-semibold">Configuration Checks:</h3>
              {Object.entries(status.checks).map(([key, value]) => (
                <div className="flex items-center gap-2" key={key}>
                  {value ? (
                    <CheckCircle className="size-5 text-green-500" />
                  ) : (
                    <XCircle className="size-5 text-red-500" />
                  )}
                  <span className="text-sm">
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>

            {/* Errors */}
            {status.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-red-600 dark:text-red-400">
                  Issues Found:
                </h3>
                <ul className="space-y-1">
                  {status.errors.map((error, index) => (
                    <li className="text-muted-foreground text-sm" key={index}>
                      • {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            <div className="space-y-2">
              <h3 className="font-semibold">Next Steps:</h3>
              <ol className="space-y-1">
                {status.nextSteps.map((step, index) => (
                  <li className="text-muted-foreground text-sm" key={index}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={checkSetup}>
                Recheck Status
              </Button>
              {isReady && (
                <Button asChild className="flex-1" variant="default">
                  <a href="/pricing">Go to Pricing</a>
                </Button>
              )}
            </div>

            {/* Setup Instructions */}
            {!isReady && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="mb-2 font-medium text-sm">Quick Setup Guide:</h4>
                <div className="space-y-2 text-sm">
                  <p>1. Add to your .env.local file:</p>
                  <pre className="overflow-x-auto rounded bg-black p-2 text-green-400 text-xs">
                    {`PESEPAY_INTEGRATION_KEY=your_key_here
PESEPAY_ENCRYPTION_KEY=your_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000`}
                  </pre>
                  <p>2. Run the setup script:</p>
                  <pre className="overflow-x-auto rounded bg-black p-2 text-green-400 text-xs">
                    pnpm tsx scripts/setup-payments.ts
                  </pre>
                  <p>3. Restart your dev server</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
