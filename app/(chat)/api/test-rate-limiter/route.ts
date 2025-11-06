/**
 * Test Rate Limiter API Route
 * Provides endpoints for testing rate limiting functionality
 * Only available in development/test environments
 */

import { NextResponse } from "next/server";
import {
  checkRateLimits,
  checkTavilyRateLimit,
  getCerebrasRateLimitStatus,
  getTavilyRateLimitStatus,
  RateLimitError,
} from "@/lib/rate-limiter";

export async function POST(request: Request) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Test helpers are not available in production" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "checkRateLimits": {
        const { estimatedTokens, identifier } = params;
        try {
          await checkRateLimits(estimatedTokens || 1000, identifier || "test");
          return NextResponse.json({ success: true });
        } catch (error) {
          if (error instanceof RateLimitError) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  message: error.message,
                  retryAfter: error.retryAfter,
                  limitType: error.limitType,
                },
              },
              { status: 429 }
            );
          }
          throw error;
        }
      }

      case "checkTavilyRateLimit": {
        const { identifier } = params;
        try {
          await checkTavilyRateLimit(identifier || "test");
          return NextResponse.json({ success: true });
        } catch (error) {
          if (error instanceof RateLimitError) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  message: error.message,
                  retryAfter: error.retryAfter,
                  limitType: error.limitType,
                },
              },
              { status: 429 }
            );
          }
          throw error;
        }
      }

      case "getCerebrasStatus": {
        const { identifier } = params;
        const status = await getCerebrasRateLimitStatus(identifier || "test");
        return NextResponse.json({ status });
      }

      case "getTavilyStatus": {
        const { identifier } = params;
        const status = await getTavilyRateLimitStatus(identifier || "test");
        return NextResponse.json({ status });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[TestRateLimiter] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
