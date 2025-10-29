"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { CheckCircleFillIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const planDetails = {
  Basic: {
    price: 10,
    features: [
      "Limited AI requests",
      "Basic model access",
      "Artifact generation",
    ],
  },
  Pro: {
    price: 30,
    features: [
      "Everything in Basic",
      "Extended AI requests",
      "Advanced model access",
      "Agentic research",
      "Legal template library",
      "Faster document processing",
      "Document comparison",
    ],
  },
  "Pro+": {
    price: 50,
    features: [
      "Everything in Pro",
      "3x usage on all models",
      "Team collaboration",
      "Custom workflows",
      "Priority artifact processing",
      "Long-running agents",
    ],
  },
  Ultra: {
    price: 100,
    features: [
      "Everything in Pro+",
      "20x usage on all models",
      "Priority access to new legal features",
      "Dedicated support",
      "Custom model fine-tuning for legal data",
      "API access",
    ],
  },
};

export default function CheckoutPage() {
  const [plan, setPlan] = useState<keyof typeof planDetails | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get("plan");
      // URLSearchParams automatically decodes the parameter
      setPlan(planParam as keyof typeof planDetails);
    }
  }, []);

  if (!plan || !planDetails[plan]) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-4 font-bold text-2xl">Invalid Plan</h1>
          <p className="text-muted-foreground">
            Please select a valid plan from the pricing page.
          </p>
        </div>
      </div>
    );
  }

  const selectedPlan = planDetails[plan];

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
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-bold text-3xl">Complete Your Purchase</h1>
          <p className="text-muted-foreground">
            Get {plan} plan - ${selectedPlan.price} for 30 days
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-2 font-semibold text-lg">{plan} Plan</h3>
                <p className="text-muted-foreground text-sm">
                  30 days of access
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Included Features:</h4>
                <ul className="space-y-2">
                  {selectedPlan.features.map((feature) => (
                    <li className="flex items-start gap-2" key={feature}>
                      <CheckCircleFillIcon size={16} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total (USD)</span>
                  <span className="font-bold text-2xl">
                    ${selectedPlan.price}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground text-xs">
                  One-time payment for 30 days
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <CheckoutForm amount={selectedPlan.price} plan={plan} />
        </div>
      </div>
    </div>
  );
}
