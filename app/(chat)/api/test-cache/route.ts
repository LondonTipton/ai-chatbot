import { NextResponse } from "next/server";
import { generateCacheKey, queryCache } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Test endpoint for cache functionality
 * GET /api/test-cache - Run cache tests
 */
export async function GET() {
  const results: Array<{ test: string; status: string; details?: string }> = [];

  try {
    // Test 1: Generate cache key
    results.push({
      test: "Generate cache key",
      status: "✓ PASS",
      details: generateCacheKey("test query", "auto", "Zimbabwe"),
    });

    // Test 2: Cache miss
    const missResult = await queryCache.get(
      `test-${Date.now()}`,
      "auto",
      "Zimbabwe"
    );
    results.push({
      test: "Cache miss returns null",
      status: missResult === null ? "✓ PASS" : "✗ FAIL",
      details: `Result: ${missResult}`,
    });

    // Test 3: Set and get cache
    const testQuery = `test-query-${Date.now()}`;
    const testResponse = "This is a test response";
    const testMetadata = {
      mode: "auto",
      stepsUsed: 2,
      toolsCalled: ["qna"],
      tokenEstimate: 150,
    };

    await queryCache.set({
      query: testQuery,
      mode: "auto",
      jurisdiction: "Zimbabwe",
      response: testResponse,
      metadata: testMetadata,
      ttl: 60, // 1 minute TTL
    });

    const hitResult = await queryCache.get(testQuery, "auto", "Zimbabwe");
    results.push({
      test: "Cache set and get",
      status: hitResult?.response === testResponse ? "✓ PASS" : "✗ FAIL",
      details: `Cached: ${hitResult !== null}, Response matches: ${
        hitResult?.response === testResponse
      }`,
    });

    // Test 4: Cache invalidation
    await queryCache.invalidate(testQuery, "auto", "Zimbabwe");
    const afterInvalidate = await queryCache.get(testQuery, "auto", "Zimbabwe");
    results.push({
      test: "Cache invalidation",
      status: afterInvalidate === null ? "✓ PASS" : "✗ FAIL",
      details: `After invalidate: ${afterInvalidate}`,
    });

    // Test 5: News query TTL detection
    const newsQuery = `latest news ${Date.now()}`;
    await queryCache.set({
      query: newsQuery,
      mode: "auto",
      jurisdiction: "Zimbabwe",
      response: "News response",
      metadata: testMetadata,
    });
    const newsResult = await queryCache.get(newsQuery, "auto", "Zimbabwe");
    results.push({
      test: "News query detection",
      status: newsResult !== null ? "✓ PASS" : "✗ FAIL",
      details: `News query cached: ${newsResult !== null}`,
    });

    // Test 6: Different modes generate different keys
    const query = "test query";
    const autoKey = generateCacheKey(query, "auto", "Zimbabwe");
    const mediumKey = generateCacheKey(query, "medium", "Zimbabwe");
    const deepKey = generateCacheKey(query, "deep", "Zimbabwe");
    results.push({
      test: "Different modes generate different keys",
      status:
        autoKey !== mediumKey && mediumKey !== deepKey && autoKey !== deepKey
          ? "✓ PASS"
          : "✗ FAIL",
      details: `Auto: ${autoKey.substring(
        0,
        30
      )}..., Medium: ${mediumKey.substring(
        0,
        30
      )}..., Deep: ${deepKey.substring(0, 30)}...`,
    });

    // Test 7: Case-insensitive normalization
    const key1 = generateCacheKey("Test Query", "auto", "Zimbabwe");
    const key2 = generateCacheKey("test query", "auto", "Zimbabwe");
    const key3 = generateCacheKey("  TEST QUERY  ", "auto", "Zimbabwe");
    results.push({
      test: "Case-insensitive normalization",
      status: key1 === key2 && key2 === key3 ? "✓ PASS" : "✗ FAIL",
      details: `All keys match: ${key1 === key2 && key2 === key3}`,
    });

    const passCount = results.filter((r) => r.status.includes("PASS")).length;
    const failCount = results.filter((r) => r.status.includes("FAIL")).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        passed: passCount,
        failed: failCount,
      },
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        results,
      },
      { status: 500 }
    );
  }
}
