/**
 * Mastra Metrics API
 *
 * Provides access to Mastra workflow performance metrics.
 * This endpoint is useful for monitoring and debugging.
 *
 * GET /api/admin/mastra-metrics - Get metrics summary
 * GET /api/admin/mastra-metrics?export=true - Export all metrics
 * DELETE /api/admin/mastra-metrics - Clear all metrics
 */

import { type NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("mastra-metrics/route");

import {
  clearMetrics,
  exportMetrics,
  getMetricsSummary,
  logMetricsSummary,
} from "@/lib/ai/mastra-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET - Retrieve metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldExport = searchParams.get("export") === "true";

    if (shouldExport) {
      // Export all metrics including raw data
      const exported = exportMetrics();

      return NextResponse.json(
        {
          success: true,
          data: exported,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Return summary only
    const summary = getMetricsSummary();

    // Also log to console
    logMetricsSummary();

    return NextResponse.json(
      {
        success: true,
        data: summary,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    logger.error("[Mastra Metrics API] Error retrieving metrics:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to retrieve metrics",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear all metrics
 */
export async function DELETE() {
  try {
    clearMetrics();

    return NextResponse.json(
      {
        success: true,
        message: "All metrics cleared",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    logger.error("[Mastra Metrics API] Error clearing metrics:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to clear metrics",
      },
      { status: 500 }
    );
  }
}
