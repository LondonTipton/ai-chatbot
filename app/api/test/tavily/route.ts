import { NextResponse } from "next/server";
import {
  analyzeSourceDistribution,
  buildTavilyRequestBody,
} from "@/lib/utils/tavily-domain-strategy";
import {
  ALL_ZIMBABWE_LEGAL_DOMAINS,
  getDomainTier,
} from "@/lib/utils/zimbabwe-domains";

/**
 * Test endpoint to verify Tavily API integration with domain prioritization
 * GET /api/test/tavily
 * GET /api/test/tavily?strategy=strict&depth=deep
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const strategy = (searchParams.get("strategy") || "prioritized") as
    | "strict"
    | "prioritized"
    | "open";
  const depth = (searchParams.get("depth") || "standard") as
    | "quick"
    | "standard"
    | "deep"
    | "comprehensive";

  const apiKey = process.env.TAVILY_API_KEY;

  // Check if API key is configured
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "TAVILY_API_KEY not configured",
        message:
          "Please add TAVILY_API_KEY to your .env.local file and restart the server",
      },
      { status: 500 }
    );
  }

  // Verify API key format
  if (!apiKey.startsWith("tvly-")) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid API key format",
        message: 'Tavily API keys should start with "tvly-"',
      },
      { status: 500 }
    );
  }

  try {
    // Build request body using domain prioritization
    const requestBody = buildTavilyRequestBody(
      "Zimbabwe legal system contract law",
      strategy,
      depth
    );

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...requestBody,
        api_key: apiKey,
        max_results: 3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Tavily API returned ${response.status}`,
          details: errorText,
          message:
            response.status === 401
              ? "Invalid API key - please check your key at tavily.com/dashboard"
              : response.status === 429
                ? "Rate limit exceeded - check your usage at tavily.com/dashboard"
                : "API request failed - check Tavily service status",
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Analyze source distribution
    const sourceDistribution = analyzeSourceDistribution(
      data.results?.map((r: any) => ({ url: r.url })) || []
    );

    // Categorize results by tier
    const resultsByTier = {
      tier1: [] as any[],
      tier2: [] as any[],
      tier3: [] as any[],
      tier4: [] as any[],
      external: [] as any[],
    };

    for (const r of data.results || []) {
      const tier = getDomainTier(r.url);
      resultsByTier[tier].push({
        title: r.title,
        url: r.url,
        tier,
      });
    }

    return NextResponse.json({
      success: true,
      message: "✅ Tavily API with domain prioritization is working!",
      configuration: {
        strategy,
        depth,
        totalZimbabweLegalDomains: ALL_ZIMBABWE_LEGAL_DOMAINS.length,
      },
      testQuery: data.query,
      results: {
        total: data.results?.length || 0,
        byTier: {
          tier1: resultsByTier.tier1.length,
          tier2: resultsByTier.tier2.length,
          tier3: resultsByTier.tier3.length,
          tier4: resultsByTier.tier4.length,
          external: resultsByTier.external.length,
        },
        byCategory: sourceDistribution,
        samples: {
          tier1: resultsByTier.tier1[0] || null,
          tier2: resultsByTier.tier2[0] || null,
          external: resultsByTier.external[0] || null,
        },
      },
      responseTime: data.response_time,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to Tavily API",
        details: error instanceof Error ? error.message : "Unknown error",
        message:
          "Check your internet connection and verify Tavily service status",
      },
      { status: 500 }
    );
  }
}
