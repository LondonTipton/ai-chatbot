import { Redis } from "@upstash/redis";

/**
 * Calculate seconds until next UTC midnight
 * Cerebras keys reset at 00:00 UTC daily
 */
function getSecondsUntilUTCMidnight() {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  return Math.floor((tomorrow - now) / 1000);
}

/**
 * Get current month key for credit tracking (YYYY-MM)
 * Tavily keys reset on the 1st of each month
 */
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async ({ req, res, log, error }) => {
  // Initialize Redis
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Parse request body
  let body = {};
  if (req.body) {
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (e) {
      return res.json({ error: "Invalid JSON body" }, 400);
    }
  }

  const action = body.action || "getKey";
  const provider = body.provider || "cerebras";
  const cost = body.cost || 1; // Default cost is 1 credit

  // Validate provider
  const validProviders = ["cerebras", "tavily"];
  if (!validProviders.includes(provider)) {
    return res.json(
      { error: `Invalid provider. Supported: ${validProviders.join(", ")}` },
      400
    );
  }

  const envPrefix =
    provider === "tavily" ? "TAVILY_API_KEY" : "CEREBRAS_API_KEY";
  const redisPrefix = provider === "tavily" ? "tavily" : "cerebras";

  // ============================================================================
  // ACTION: Report Error
  // ============================================================================
  if (action === "reportError") {
    const { keyId, errorType, retryAfter } = body;

    if (!keyId) {
      return res.json({ error: "Missing keyId parameter" }, 400);
    }

    try {
      if (errorType === "rate_limit") {
        // Mark key as dead until UTC midnight (Cerebras resets at 00:00 UTC)
        // For Tavily, rate limits are usually temporary (1 min), but we can use same logic or shorter
        const ttl = provider === "cerebras" ? getSecondsUntilUTCMidnight() : 60;
        const reviveTime = Date.now() + ttl * 1000;

        await redis.set(
          `${redisPrefix}:key:health:${keyId}:disabled`,
          reviveTime,
          { ex: ttl }
        );

        log(
          `⚠️ Key ${keyId} marked as rate-limited until ${new Date(reviveTime).toISOString()} (${ttl}s TTL)`
        );

        // Track rate limit event
        await redis.incr(`${redisPrefix}:key:ratelimits:${keyId}`);

        return res.json({
          success: true,
          action: "marked_dead",
          reviveAt: reviveTime,
          ttl,
        });
      }
      if (errorType === "queue_overflow") {
        // Don't mark key as dead, just log
        log(`ℹ️ Key ${keyId} experienced queue overflow (transient)`);

        await redis.incr(`${redisPrefix}:key:queue_overflows:${keyId}`);

        return res.json({
          success: true,
          action: "logged_transient",
          retryAfter: retryAfter || 60,
        });
      }
      // Other errors - just log
      log(`⚠️ Key ${keyId} reported error: ${errorType}`);

      await redis.incr(`${redisPrefix}:key:errors:${keyId}`);

      return res.json({
        success: true,
        action: "logged_error",
      });
    } catch (err) {
      error("Error reporting failed: " + err.message);
      return res.json({ error: "Failed to report error" }, 500);
    }
  }

  // ============================================================================
  // ACTION: Get Key (default)
  // ============================================================================

  // Load API keys from environment variables
  const keys = Object.keys(process.env)
    .filter((key) => key.startsWith(envPrefix))
    .map((key) => ({
      id: key,
      value: process.env[key],
    }))
    .filter((k) => k.value);

  if (keys.length === 0) {
    error(`No ${provider} API keys found in environment variables.`);
    return res.json({ error: `No ${provider} API keys configured` }, 500);
  }

  const REDIS_KEY_INDEX = `${redisPrefix}:balancer:index`;
  const REDIS_KEY_PREFIX_HEALTH = `${redisPrefix}:key:health:`;
  const monthKey = getCurrentMonthKey();

  try {
    // Auto-revive keys (check for expired TTLs)
    const now = Date.now();
    let revivedCount = 0;

    for (const key of keys) {
      const disabledUntil = await redis.get(
        `${REDIS_KEY_PREFIX_HEALTH}${key.id}:disabled`
      );

      if (disabledUntil && disabledUntil <= now) {
        // TTL expired but key still in Redis, delete it
        await redis.del(`${REDIS_KEY_PREFIX_HEALTH}${key.id}:disabled`);
        revivedCount++;
      }
    }

    if (revivedCount > 0) {
      log(`✨ Auto-revived ${revivedCount} keys`);
    }

    // Get current index (atomic increment)
    const index = await redis.incr(REDIS_KEY_INDEX);

    // Round Robin Selection - try up to N times to find a healthy key
    for (let i = 0; i < keys.length; i++) {
      const keyIndex = (index + i) % keys.length;
      const selectedKey = keys[keyIndex];

      // Parallel Checks: Disabled Status + Credit Limit
      const disabledKey = `${REDIS_KEY_PREFIX_HEALTH}${selectedKey.id}:disabled`;
      const creditsUsedKey = `${redisPrefix}:key:credits:${selectedKey.id}:${monthKey}`;

      const [disabledUntil, creditsUsed] = await Promise.all([
        redis.get(disabledKey),
        provider === "tavily" ? redis.get(creditsUsedKey) : Promise.resolve(0),
      ]);

      if (disabledUntil) {
        const secondsRemaining = Math.floor((disabledUntil - now) / 1000);
        // Only log if it's a long wait
        if (secondsRemaining > 60) {
          const hours = Math.floor(secondsRemaining / 3600);
          log(`Key ${selectedKey.id} disabled for ${hours}h. Skipping.`);
        }
        continue;
      }

      // Check Credit Limit (Tavily only)
      if (provider === "tavily") {
        const currentCredits = Number.parseInt(creditsUsed || 0);

        if (currentCredits + cost > 1000) {
          log(
            `Key ${selectedKey.id} exceeded monthly limit (${currentCredits}/1000). Skipping.`
          );
          continue;
        }

        // Increment credits (Reserve them)
        await redis.incrby(creditsUsedKey, cost);
        log(
          `Selected key: ${selectedKey.id} (Cost: ${cost}, Used: ${currentCredits + cost}/1000)`
        );
      } else {
        log(`Selected key: ${selectedKey.id}`);
      }

      // Track usage and last used timestamp
      await Promise.all([
        redis.incr(`${redisPrefix}:key:usage:${selectedKey.id}`),
        redis.set(`${redisPrefix}:key:lastused:${selectedKey.id}`, now),
      ]).catch((err) => error("Usage tracking failed: " + err.message));

      return res.json({
        apiKey: selectedKey.value,
        keyId: selectedKey.id,
      });
    }

    // If we get here, all keys are disabled or over limit
    log(
      "⚠️ All keys appear disabled or over limit. Returning first key as fallback."
    );

    return res.json({
      apiKey: keys[0].value,
      keyId: keys[0].id,
      warning: "All keys are marked as disabled or over limit",
    });
  } catch (err) {
    error("Redis error: " + err.message);

    // Fallback if Redis fails
    const fallbackKey = keys[Math.floor(Math.random() * keys.length)];
    return res.json({
      apiKey: fallbackKey.value,
      keyId: fallbackKey.id,
      source: "fallback",
    });
  }
};
