"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type UsageIndicatorProps = {
  requestsToday: number;
  dailyLimit: number;
  plan: string;
};

export function UsageIndicator({
  requestsToday,
  dailyLimit,
  plan,
}: UsageIndicatorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const percentage = (requestsToday / dailyLimit) * 100;
  const remaining = dailyLimit - requestsToday;
  const isNearLimit = percentage >= 80;
  const isAtLimit = requestsToday >= dailyLimit;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="relative h-2 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    isAtLimit
                      ? "bg-red-500"
                      : isNearLimit
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <span className="text-muted-foreground text-xs">
                {requestsToday}/{dailyLimit}
              </span>
            </div>

            {plan === "Free" && remaining <= 2 && remaining > 0 && (
              <Button asChild size="sm" variant="outline">
                <Link href="/pricing">Upgrade</Link>
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{remaining} requests remaining today</p>
            <p className="text-muted-foreground text-xs">
              {plan} plan • Resets at midnight UTC
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
