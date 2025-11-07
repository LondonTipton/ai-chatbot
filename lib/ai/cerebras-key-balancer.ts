/**
 * Cerebras API Key Load Balancer
 * Rotates through multiple API keys to distribute load and avoid rate limits
 */

import { createCerebras } from "@ai-sdk/cerebras";
import { createLogger } from "@/lib/logger";
import { isCerebrasRateLimitError } from "./cerebras-retry-handler";

const logger = createLogger("ai/cerebras-key-balancer");

/**
 * Wrap a Cerebras provider to add debug logging when a model instance is requested.
 */
function wrapWithLogging(
  provider: ReturnType<typeof createCerebras>,
  keyPreview: string
): ReturnType<typeof createCerebras> {
  const wrapped = ((modelId: string) => {
    logger.log(
      `[Cerebras Balancer] 🧪 Creating language model '${modelId}' using key ${keyPreview}...`
    );
    return provider(modelId);
  }) as unknown as ReturnType<typeof createCerebras>;

  try {
    Object.assign(wrapped, provider);
  } catch {
    // ignore if assignment fails
  }

  return wrapped;
}

type KeyUsageStats = {
  key: string;
  lastUsed: number;
  requestCount: number;
  errorCount: number;
  lastError?: string;
  isDisabled: boolean;
  disabledUntil?: number;
};

class CerebrasKeyBalancer {
  private readonly keys: string[];
  private currentIndex: number;
  private readonly keyStats: Map<string, KeyUsageStats>;
  private readonly providers: Map<string, ReturnType<typeof createCerebras>>;

  constructor() {
    // Only initialize on server side
    if (typeof window !== "undefined") {
      logger.warn(
        "[Cerebras Balancer] Attempted to initialize on client side - skipping"
      );
      this.keys = [];
      this.currentIndex = 0;
      this.keyStats = new Map();
      this.providers = new Map();
      return;
    }

    this.keys = this.loadApiKeys();
    this.currentIndex = 0;
    this.keyStats = new Map();
    this.providers = new Map();

    // Initialize stats and providers for each key
    for (const key of this.keys) {
      this.keyStats.set(key, {
        key,
        lastUsed: 0,
        requestCount: 0,
        errorCount: 0,
        isDisabled: false,
      });
      // Note: @ai-sdk/cerebras doesn't expose maxRetries option
      // Retries are handled at the AI SDK level (streamText maxRetries: 5)
      const base = createCerebras({ apiKey: key });
      const keyPreview = key.substring(0, 8);
      this.providers.set(key, wrapWithLogging(base, keyPreview));
    }

    // Log initialized keys for visibility
    logger.log("[Cerebras Balancer] 🔑 Initialized keys:");
    for (let i = 0; i < this.keys.length; i++) {
      logger.log(
        `[Cerebras Balancer]   Key ${i + 1}: ${this.keys[i].substring(
          0,
          8
        )}... ✅`
      );
    }
  }

  /**
   * Load API keys from environment variables
   * Supports CEREBRAS_API_KEY and CEREBRAS_API_KEY_85 through _89
   */
  private loadApiKeys(): string[] {
    const keys: string[] = [];

    // Primary key (optional)
    const primaryKey = process.env.CEREBRAS_API_KEY;
    if (primaryKey) {
      keys.push(primaryKey);
    }

    // Additional keys (85-89 as shown in .env.example)
    for (let i = 85; i <= 89; i++) {
      const key = process.env[`CEREBRAS_API_KEY_${i}`];
      if (key) {
        keys.push(key);
      }
    }

    if (keys.length === 0) {
      throw new Error(
        "No Cerebras API keys found. Please set CEREBRAS_API_KEY or CEREBRAS_API_KEY_85 through _89"
      );
    }

    logger.log(`[Cerebras Balancer] Loaded ${keys.length} API key(s)`);
    return keys;
  }

  /**
   * Get the next available API key using round-robin strategy
   * Skips disabled keys and re-enables keys after cooldown period
   */
  private getNextKey(): string {
    const now = Date.now();
    let attempts = 0;
    const maxAttempts = this.keys.length;

    while (attempts < maxAttempts) {
      const key = this.keys[this.currentIndex];
      const stats = this.keyStats.get(key);

      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;

      if (!stats) {
        continue;
      }

      // Re-enable key if cooldown period has passed
      if (
        stats.isDisabled &&
        stats.disabledUntil &&
        now >= stats.disabledUntil
      ) {
        stats.isDisabled = false;
        stats.disabledUntil = undefined;
        const availableKeys = Array.from(this.keyStats.values()).filter(
          (s) => !s.isDisabled
        ).length;
        logger.log(
          `[Cerebras Balancer] ✅ Re-enabled key ${key.substring(
            0,
            8
          )}... after cooldown (${availableKeys}/${
            this.keys.length
          } keys now available)`
        );
      }

      // Return key if it's not disabled
      if (!stats.isDisabled) {
        return key;
      }
    }

    // If all keys are disabled, return the least recently disabled one
    logger.warn(
      "[Cerebras Balancer] ⚠️  ALL KEYS DISABLED - forcing re-enable of least recently disabled key"
    );
    const leastRecentlyDisabled = Array.from(this.keyStats.entries())
      .filter(([_, stats]) => stats.isDisabled)
      .sort((a, b) => (a[1].disabledUntil || 0) - (b[1].disabledUntil || 0))[0];

    if (leastRecentlyDisabled) {
      const [key, stats] = leastRecentlyDisabled;
      stats.isDisabled = false;
      stats.disabledUntil = undefined;
      logger.warn(
        `[Cerebras Balancer] 🔄 Force re-enabled key ${key.substring(
          0,
          8
        )}... (was disabled until ${new Date(
          stats.disabledUntil || 0
        ).toLocaleTimeString()})`
      );
      return key;
    }

    // Fallback to first key
    return this.keys[0];
  }

  /**
   * Update usage statistics for a key
   */
  private updateStats(key: string): void {
    const stats = this.keyStats.get(key);
    if (stats) {
      stats.lastUsed = Date.now();
      stats.requestCount++;

      // Log key usage for monitoring
      const keyPreview = key.substring(0, 8);
      const availableKeys = Array.from(this.keyStats.values()).filter(
        (s) => !s.isDisabled
      ).length;
      logger.log(
        `[Cerebras Balancer] 🔑 Using key ${keyPreview}... (Request #${stats.requestCount}, ${availableKeys}/${this.keys.length} keys available)`
      );
    }
  }

  /**
   * Get the Cerebras provider instance with load balancing
   */
  getProvider(): ReturnType<typeof createCerebras> {
    if (this.keys.length === 0) {
      throw new Error(
        "Cerebras balancer not initialized - running on client side?"
      );
    }

    const key = this.getNextKey();
    this.updateStats(key);

    const provider = this.providers.get(key);
    if (!provider) {
      throw new Error("Provider not found for key");
    }

    return provider;
  }

  /**
   * Mark a key as failed and disable it temporarily
   */
  markKeyAsFailed(
    key: string,
    error: string,
    retryDelaySeconds?: number
  ): void {
    const stats = this.keyStats.get(key);
    if (!stats) {
      return;
    }

    stats.errorCount++;
    stats.lastError = error;
    stats.isDisabled = true;

    // Default to 60 seconds cooldown, or use the retry delay from the error
    const cooldownMs = (retryDelaySeconds || 60) * 1000;
    stats.disabledUntil = Date.now() + cooldownMs;

    const availableKeys = Array.from(this.keyStats.values()).filter(
      (s) => !s.isDisabled
    ).length;

    logger.warn(
      `[Cerebras Balancer] ⚠️  DISABLED key ${key.substring(0, 8)}... for ${
        retryDelaySeconds || 60
      }s due to: ${error}`
    );
    logger.warn(
      `[Cerebras Balancer] 📊 Status: ${availableKeys}/${this.keys.length} keys available, ${stats.errorCount} total errors on this key`
    );
  }

  /**
   * Get usage statistics for all keys
   */
  getStats(): KeyUsageStats[] {
    return Array.from(this.keyStats.values()).map((stats) => ({
      ...stats,
      key: `${stats.key.substring(0, 8)}...`, // Mask the key for security
    }));
  }

  /**
   * Get the number of available keys
   */
  getKeyCount(): number {
    return this.keys.length;
  }

  /**
   * Get the most recently used key (for error handling when key is not specified)
   */
  getMostRecentlyUsedKey(): string | undefined {
    const sortedKeys = Array.from(this.keyStats.entries()).sort(
      (a, b) => b[1].lastUsed - a[1].lastUsed
    );
    return sortedKeys[0]?.[0];
  }
}

// Singleton instance
let balancerInstance: CerebrasKeyBalancer | null = null;

/**
 * Get or create the Cerebras key balancer instance
 */
export function getCerebrasBalancer(): CerebrasKeyBalancer {
  if (!balancerInstance) {
    balancerInstance = new CerebrasKeyBalancer();
  }
  return balancerInstance;
}

/**
 * Get a load-balanced Cerebras provider instance
 */
export function getBalancedCerebrasProvider(): ReturnType<
  typeof createCerebras
> {
  return getCerebrasBalancer().getProvider();
}

/**
 * Handle API errors and mark keys as failed for automatic rotation
 * Call this from error handlers to disable problematic keys
 *
 * Now uses the standardized isCerebrasRateLimitError check
 */
const RETRY_DELAY_REGEX = /retry in ([\d.]+)s/i;

export function handleCerebrasError(error: any, apiKey?: string): void {
  const balancer = getCerebrasBalancer();

  // Extract error details from nested error structure
  // AI_RetryError has lastError property with the actual API error
  const lastError = error?.lastError || error;
  const statusCode = lastError?.statusCode || error?.statusCode;
  const errorMessage = lastError?.message || error?.message || "";
  const errorData = lastError?.data || error?.data;
  const errorCode = errorData?.code || "";

  // Use standardized rate limit check
  const isRateLimitError = isCerebrasRateLimitError(error);

  logger.log(
    `[Cerebras Balancer] 🔍 Analyzing error: Status ${statusCode}, Code: ${errorCode}, IsRateLimit: ${isRateLimitError}`
  );

  // Check if it's a server error (500)
  const isServerError =
    statusCode === 500 ||
    statusCode >= 500 ||
    errorMessage.includes("server error");

  if (isRateLimitError || isServerError) {
    // For rate limit errors, use shorter cooldown since it's temporary traffic
    // For server errors, use medium cooldown
    let retryDelay = 60; // default

    if (isRateLimitError) {
      retryDelay = 15; // Rate limit issues are usually temporary
      logger.log(
        "[Cerebras Balancer] 🚦 Rate limit error detected - using 15s cooldown"
      );
    } else if (isServerError) {
      retryDelay = 30;
      logger.log(
        "[Cerebras Balancer] 🔧 Server error detected - using 30s cooldown"
      );
    }

    // Extract retry delay from error if available
    const retryMatch = errorMessage.match(RETRY_DELAY_REGEX);
    if (retryMatch) {
      retryDelay = Number.parseFloat(retryMatch[1]);
      logger.log(
        `[Cerebras Balancer] ⏱️  Using retry delay from error: ${retryDelay}s`
      );
    }

    // If we have a specific API key, mark it as failed
    // Otherwise, mark the most recently used key
    const keyToMark = apiKey || balancer.getMostRecentlyUsedKey();

    if (keyToMark) {
      logger.log(
        `[Cerebras Balancer] 🔄 Rotating away from failed key ${keyToMark.substring(
          0,
          8
        )}...`
      );
      balancer.markKeyAsFailed(
        keyToMark,
        errorMessage ||
          (isRateLimitError ? "Rate limit exceeded" : "Server error"),
        retryDelay
      );
    } else {
      logger.warn(
        "[Cerebras Balancer] ⚠️  Could not identify which key failed"
      );
    }
  } else {
    logger.log(
      "[Cerebras Balancer] ℹ️  Error not related to rate limits or server issues - no key rotation needed"
    );
  }
}

/**
 * Get statistics about key usage and health
 */
export function getCerebrasStats(): KeyUsageStats[] {
  return getCerebrasBalancer().getStats();
}

/**
 * Log detailed health status of all keys
 */
export function logCerebrasHealth(): void {
  const stats = getCerebrasStats();
  const healthyKeys = stats.filter((s) => !s.isDisabled).length;

  logger.log("=".repeat(60));
  logger.log("[Cerebras Balancer] 📊 KEY HEALTH REPORT");
  logger.log("=".repeat(60));
  logger.log(`Overall Status: ${healthyKeys}/${stats.length} keys available`);
  logger.log("");

  for (const stat of stats) {
    const status = stat.isDisabled ? "🔴 DISABLED" : "🟢 ACTIVE";
    const cooldownInfo = stat.disabledUntil
      ? ` (until ${new Date(stat.disabledUntil).toLocaleTimeString()})`
      : "";

    logger.log(`Key: ${stat.key}`);
    logger.log(`  Status: ${status}${cooldownInfo}`);
    logger.log(`  Requests: ${stat.requestCount}`);
    logger.log(`  Errors: ${stat.errorCount}`);
    if (stat.lastError) {
      logger.log(`  Last Error: ${stat.lastError}`);
    }
    logger.log("");
  }
  logger.log("=".repeat(60));
}
