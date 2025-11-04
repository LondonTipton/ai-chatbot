/**
 * Gemini API Key Load Balancer
 * Rotates through multiple API keys to distribute load and avoid rate limits
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ai/gemini-key-balancer");

interface KeyUsageStats {
  key: string;
  lastUsed: number;
  requestCount: number;
  errorCount: number;
  lastError?: string;
  isDisabled: boolean;
  disabledUntil?: number;
}

class GeminiKeyBalancer {
  private keys: string[];
  private currentIndex = 0;
  private keyStats: Map<string, KeyUsageStats>;
  private providers: Map<string, ReturnType<typeof createGoogleGenerativeAI>>;

  constructor() {
    // Only initialize on server side
    if (typeof window !== "undefined") {
      logger.warn(
        "[Gemini Balancer] Attempted to initialize on client side - skipping"
      );
      this.keys = [];
      this.keyStats = new Map();
      this.providers = new Map();
      return;
    }

    this.keys = this.loadApiKeys();
    this.keyStats = new Map();
    this.providers = new Map();

    // Initialize stats and providers for each key
    this.keys.forEach((key) => {
      this.keyStats.set(key, {
        key,
        lastUsed: 0,
        requestCount: 0,
        errorCount: 0,
        isDisabled: false,
      });
      this.providers.set(key, createGoogleGenerativeAI({ apiKey: key }));
    });
  }

  /**
   * Load API keys from environment variables
   * Supports GOOGLE_GENERATIVE_AI_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY_1 through _5
   */
  private loadApiKeys(): string[] {
    const keys: string[] = [];

    // Primary key
    const primaryKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (primaryKey) {
      keys.push(primaryKey);
    }

    // Additional keys (1-5)
    for (let i = 1; i <= 5; i++) {
      const key = process.env[`GOOGLE_GENERATIVE_AI_API_KEY_${i}`];
      if (key) {
        keys.push(key);
      }
    }

    if (keys.length === 0) {
      throw new Error(
        "No Gemini API keys found. Please set GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY_1 through _5"
      );
    }

    logger.log(`[Gemini Balancer] Loaded ${keys.length} API key(s)`);
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

      if (!stats) continue;

      // Re-enable key if cooldown period has passed
      if (
        stats.isDisabled &&
        stats.disabledUntil &&
        now >= stats.disabledUntil
      ) {
        stats.isDisabled = false;
        stats.disabledUntil = undefined;
        logger.log(
          `[Gemini Balancer] Re-enabled key ${key.substring(
            0,
            8
          )}... after cooldown`
        );
      }

      // Return key if it's not disabled
      if (!stats.isDisabled) {
        return key;
      }
    }

    // If all keys are disabled, return the least recently disabled one
    logger.warn(
      "[Gemini Balancer] All keys disabled, using least recently disabled key"
    );
    const leastRecentlyDisabled = Array.from(this.keyStats.entries())
      .filter(([_, stats]) => stats.isDisabled)
      .sort((a, b) => (a[1].disabledUntil || 0) - (b[1].disabledUntil || 0))[0];

    if (leastRecentlyDisabled) {
      const [key, stats] = leastRecentlyDisabled;
      stats.isDisabled = false;
      stats.disabledUntil = undefined;
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
    }
  }

  /**
   * Get the Google provider instance with load balancing
   */
  public getProvider(): ReturnType<typeof createGoogleGenerativeAI> {
    if (this.keys.length === 0) {
      throw new Error(
        "Gemini balancer not initialized - running on client side?"
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
  public markKeyAsFailed(
    key: string,
    error: string,
    retryDelaySeconds?: number
  ): void {
    const stats = this.keyStats.get(key);
    if (!stats) return;

    stats.errorCount++;
    stats.lastError = error;
    stats.isDisabled = true;

    // Default to 60 seconds cooldown, or use the retry delay from the error
    const cooldownMs = (retryDelaySeconds || 60) * 1000;
    stats.disabledUntil = Date.now() + cooldownMs;

    logger.warn(
      `[Gemini Balancer] Disabled key ${key.substring(0, 8)}... for ${
        retryDelaySeconds || 60
      }s due to: ${error}`
    );
  }

  /**
   * Get usage statistics for all keys
   */
  public getStats(): KeyUsageStats[] {
    return Array.from(this.keyStats.values()).map((stats) => ({
      ...stats,
      key: `${stats.key.substring(0, 8)}...`, // Mask the key for security
    }));
  }

  /**
   * Get the number of available keys
   */
  public getKeyCount(): number {
    return this.keys.length;
  }
}

// Singleton instance
let balancerInstance: GeminiKeyBalancer | null = null;

/**
 * Get or create the Gemini key balancer instance
 */
export function getGeminiBalancer(): GeminiKeyBalancer {
  if (!balancerInstance) {
    balancerInstance = new GeminiKeyBalancer();
  }
  return balancerInstance;
}

/**
 * Get a load-balanced Google provider instance
 */
export function getBalancedGoogleProvider(): ReturnType<
  typeof createGoogleGenerativeAI
> {
  return getGeminiBalancer().getProvider();
}

/**
 * Handle API errors and mark keys as failed for automatic rotation
 * Call this from error handlers to disable problematic keys
 */
export function handleGeminiError(error: any, apiKey?: string): void {
  const balancer = getGeminiBalancer();

  // Check if it's a quota/rate limit error
  const isQuotaError =
    error?.statusCode === 429 ||
    error?.message?.includes("quota") ||
    error?.message?.includes("rate limit") ||
    error?.message?.includes("RESOURCE_EXHAUSTED");

  if (isQuotaError && apiKey) {
    // Extract retry delay from error if available
    const retryMatch = error?.message?.match(/retry in ([\d.]+)s/i);
    const retryDelay = retryMatch ? Number.parseFloat(retryMatch[1]) : 60;

    balancer.markKeyAsFailed(
      apiKey,
      error?.message || "Quota exceeded",
      retryDelay
    );
  }
}
