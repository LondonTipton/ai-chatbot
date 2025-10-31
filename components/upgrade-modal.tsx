"use client";

import Link from "next/link";
import { CheckCircleFillIcon } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type UpgradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestsToday: number;
  dailyLimit: number;
  currentPlan: string;
};

const recommendedPlans = {
  Free: {
    name: "Basic",
    price: 10,
    dailyLimit: 50,
    features: [
      "50 AI requests per day",
      "Basic model access",
      "Artifact generation",
      "Email support",
    ],
  },
  Basic: {
    name: "Pro",
    price: 30,
    dailyLimit: 200,
    features: [
      "200 AI requests per day",
      "Advanced model access",
      "Agentic research",
      "Legal template library",
      "Priority support",
    ],
  },
  Pro: {
    name: "Pro+",
    price: 50,
    dailyLimit: 600,
    features: [
      "600 AI requests per day",
      "Team collaboration",
      "Custom workflows",
      "Priority artifact processing",
      "Dedicated support",
    ],
  },
  "Pro+": {
    name: "Ultra",
    price: 100,
    dailyLimit: 4000,
    features: [
      "4000 AI requests per day",
      "Custom model fine-tuning",
      "API access",
      "White-glove support",
    ],
  },
};

export function UpgradeModal({
  open,
  onOpenChange,
  requestsToday,
  dailyLimit,
  currentPlan,
}: UpgradeModalProps) {
  const recommended =
    recommendedPlans[currentPlan as keyof typeof recommendedPlans] ||
    recommendedPlans.Free;

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Daily Limit Reached</AlertDialogTitle>
          <AlertDialogDescription>
            You've used {requestsToday} of {dailyLimit} daily requests on the{" "}
            {currentPlan} plan.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-semibold text-lg">
                Upgrade to {recommended.name}
              </h4>
              <div className="text-right">
                <div className="font-bold text-2xl">${recommended.price}</div>
                <div className="text-muted-foreground text-xs">/month</div>
              </div>
            </div>

            <p className="mb-4 text-muted-foreground text-sm">
              Get {recommended.dailyLimit} requests per day and unlock advanced
              features
            </p>

            <ul className="space-y-2">
              {recommended.features.map((feature) => (
                <li className="flex items-start gap-2" key={feature}>
                  <CheckCircleFillIcon size={16} />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
            <p className="text-blue-900 text-sm dark:text-blue-100">
              💡 Your daily limit resets at midnight UTC. You can continue using
              DeepCounsel tomorrow, or upgrade now for immediate access.
            </p>
          </div>
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogAction asChild className="w-full">
            <Link
              href={`/checkout?plan=${encodeURIComponent(recommended.name)}`}
            >
              Upgrade to {recommended.name}
            </Link>
          </AlertDialogAction>
          <AlertDialogAction
            asChild
            className="w-full"
            data-variant="secondary"
          >
            <Link href="/pricing">View All Plans</Link>
          </AlertDialogAction>
          <AlertDialogCancel className="w-full">Maybe Later</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
