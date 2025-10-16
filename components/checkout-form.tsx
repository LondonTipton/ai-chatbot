"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CheckoutFormProps {
  plan: string;
  amount: number;
}

export function CheckoutForm({ plan, amount }: CheckoutFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate phone number format (Zimbabwe Ecocash)
      const phoneRegex = /^(263|0)(77|78|71)\d{7}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ""))) {
        toast.error(
          "Invalid phone number. Please enter a valid Ecocash number (e.g., 0771234567)"
        );
        setLoading(false);
        return;
      }

      const response = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          amount,
          currency: "USD",
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(
          "Server error. Please check the setup at /payment/setup"
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate payment");
      }

      // Redirect to payment status page
      router.push(`/payment/status?ref=${data.referenceNumber}`);
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process payment";
      
      toast.error(errorMessage);
      
      // If it's a configuration error, suggest checking setup
      if (
        errorMessage.includes("not configured") ||
        errorMessage.includes("credentials")
      ) {
        setTimeout(() => {
          toast.info("Check payment setup at /payment/setup");
        }, 2000);
      }
      
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          Pay securely with Ecocash. You will receive a prompt on your phone to
          complete the payment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              disabled={loading}
              id="name"
              placeholder="John Doe"
              required
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              disabled={loading}
              id="email"
              placeholder="john@example.com"
              required
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Ecocash Phone Number</Label>
            <Input
              disabled={loading}
              id="phone"
              placeholder="0771234567"
              required
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
            <p className="text-muted-foreground text-xs">
              Enter your Ecocash number (e.g., 0771234567)
            </p>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start gap-2">
              <svg
                className="mt-0.5 size-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-sm">
                <p className="font-medium">How it works:</p>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
                  <li>Click "Pay with Ecocash" below</li>
                  <li>You'll receive a prompt on your phone</li>
                  <li>Enter your Ecocash PIN to complete payment</li>
                  <li>Your subscription activates immediately</li>
                </ol>
              </div>
            </div>
          </div>

          <Button className="w-full" disabled={loading} size="lg" type="submit">
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Pay ${amount} with Ecocash</>
            )}
          </Button>

          <p className="text-center text-muted-foreground text-xs">
            By completing this purchase, you agree to our terms of service. Your
            subscription will automatically renew every 30 days.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
