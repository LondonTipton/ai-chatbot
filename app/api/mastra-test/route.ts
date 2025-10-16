import { NextResponse } from "next/server";
import { mastra } from "@/mastra";

/**
 * Test endpoint for Mastra legal agent
 *
 * Usage:
 * POST /api/mastra-test
 * Body: { "query": "What is the legal framework for IP in Zimbabwe?" }
 */
export async function POST(request: Request) {
  console.log("=".repeat(80));
  console.log("🟢 MASTRA LEGAL AGENT ROUTE INVOKED (POST)");
  console.log("=".repeat(80));

  try {
    const { query } = await request.json();

    console.log(`[Mastra Agent] Query: ${query?.substring(0, 100)}...`);

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get the legal agent
    console.log("[Mastra Agent] Getting legal agent from Mastra...");
    const agent = mastra.getAgent("legalAgent");

    if (!agent) {
      console.error("[Mastra Agent] ❌ Legal agent not found!");
      return NextResponse.json(
        { error: "Legal agent not found" },
        { status: 500 }
      );
    }

    console.log("[Mastra Agent] ✅ Legal agent found, generating response...");

    // Generate a response
    const result = await agent.generate(query);

    console.log(
      `[Mastra Agent] ✅ Response generated (${result.text?.length || 0} chars)`
    );

    return NextResponse.json({
      success: true,
      response: result.text,
      usage: result.usage,
    });
  } catch (error) {
    console.error("Mastra test error:", error);
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
  console.log("=".repeat(80));
  console.log("🟢 MASTRA LEGAL AGENT ROUTE INVOKED (GET)");
  console.log("=".repeat(80));

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    console.log(`[Mastra Agent] Query: ${query?.substring(0, 100)}...`);

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // Get the legal agent
    console.log("[Mastra Agent] Getting legal agent from Mastra...");
    const agent = mastra.getAgent("legalAgent");

    if (!agent) {
      console.error("[Mastra Agent] ❌ Legal agent not found!");
      return NextResponse.json(
        { error: "Legal agent not found" },
        { status: 500 }
      );
    }

    console.log("[Mastra Agent] ✅ Legal agent found, generating response...");

    // For now, use generate instead of stream
    // Streaming will be implemented in a future update
    const result = await agent.generate(query);

    console.log(
      `[Mastra Agent] ✅ Response generated (${result.text?.length || 0} chars)`
    );

    return NextResponse.json({
      success: true,
      response: result.text,
      usage: result.usage,
      note: "Streaming endpoint - currently using generate(). Stream support coming soon.",
    });
  } catch (error) {
    console.error("Mastra stream error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
