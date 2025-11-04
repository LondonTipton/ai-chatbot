import { createLogger } from "@/lib/logger";

const logger = createLogger("cache-stats/route");

/**
 * Cache Statistics API Endpoint
 *
 * Provides real-time cache performance metrics for monitoring
 */

import {
  getCacheHitRate,
  getCacheStatistics,
} from "@/lib/db/usage-transaction";

export function GET() {
  try {
    const stats = getCacheStatistics();
    const hitRate = getCacheHitRate();

    return Response.json({
      cache: {
        ...stats,
        hitRate: `${(hitRate * 100).toFixed(2)}%`,
        hitRateDecimal: hitRate,
      },
      performance: {
        estimatedQueriesSaved: stats.hits,
        estimatedLatencySaved: `${(stats.hits * 50).toFixed(0)}ms`, // Assuming 50ms per query
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[CacheStats] Error fetching cache statistics:", error);
    return Response.json(
      { error: "Failed to fetch cache statistics" },
      { status: 500 }
    );
  }
}
