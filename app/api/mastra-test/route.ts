import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { mastra } from "@/mastra";

const logger = createLogger("mastra-test/route");

// Prevent static generation
export const dynamic = "force-dynamic";

/**
 * Test endpoint for Mastra legal agent
 *
 * Usage:
 * POST /api/mastra-test
 * Body: { "query": "What is the legal framework for IP in Zimbabwe?" }
 */
export async function POST(request: Request) {
  logger.log("=".repeat(80));
  logger.log("🟢 MASTRA LEGAL AGENT ROUTE INVOKED (POST)");
  logger.log("=".repeat(80));

  try {
    const { query } = await request.json();

    logger.log(`[Mastra Agent] Query: ${query?.substring(0, 100)}...`);

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get the legal agent
    logger.log("[Mastra Agent] Getting legal agent from Mastra...");
    const agent = mastra.getAgent("legalAgent");

    if (!agent) {
      logger.error("[Mastra Agent] ❌ Legal agent not found!");
      return NextResponse.json(
        { error: "Legal agent not found" },
        { status: 500 }
      );
    }

    logger.log("[Mastra Agent] ✅ Legal agent found, generating response...");

    // Generate a response
    const result = await agent.generate(query);

    logger.log(
      `[Mastra Agent] ✅ Response generated (${result.text?.length || 0} chars)`
    );

    return NextResponse.json({
      success: true,
      response: result.text,
      usage: result.usage,
    });
  } catch (error) {
    logger.error("Mastra test error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Test endpoint with streaming
 *
 * Usage:
 * GET /api/mastra-test?query=What+is+contract+law
 */
export async function GET(request: Request) {
  logger.log("=".repeat(80));
  logger.log("🟢 MASTRA LEGAL AGENT ROUTE INVOKED (GET)");
  logger.log("=".repeat(80));

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    logger.log(`[Mastra Agent] Query: ${query?.substring(0, 100)}...`);

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // Get the legal agent
    logger.log("[Mastra Agent] Getting legal agent from Mastra...");
    const agent = mastra.getAgent("legalAgent");

    if (!agent) {
      logger.error("[Mastra Agent] ❌ Legal agent not found!");
      return NextResponse.json(
        { error: "Legal agent not found" },
        { status: 500 }
      );
    }

    logger.log("[Mastra Agent] ✅ Legal agent found, generating response...");

    // For now, use generate instead of stream
    // Streaming will be implemented in a future update
    const result = await agent.generate(query);

    logger.log(
      `[Mastra Agent] ✅ Response generated (${result.text?.length || 0} chars)`
    );

    return NextResponse.json({
      success: true,
      response: result.text,
      usage: result.usage,
      note: "Streaming endpoint - currently using generate(). Stream support coming soon.",
    });
  } catch (error) {
    logger.error("Mastra stream error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
