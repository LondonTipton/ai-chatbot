/**
 * Gemini API Key Load Balancer
 * Rotates through multiple API keys to distribute load and avoid rate limits
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';

interface KeyUsageStats {
  key: string;
  lastUsed: number;
  requestCount: number;
}

class GeminiKeyBalancer {
  private keys: string[];
  private currentIndex: number = 0;
  private keyStats: Map<string, KeyUsageStats>;
  private providers: Map<string, ReturnType<typeof createGoogleGenerativeAI>>;

  constructor() {
    this.keys = this.loadApiKeys();
    this.keyStats = new Map();
    this.providers = new Map();

    // Initialize stats and providers for each key
    this.keys.forEach((key) => {
      this.keyStats.set(key, {
        key,
        lastUsed: 0,
        requestCount: 0,
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
        'No Gemini API keys found. Please set GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY_1 through _5',
      );
    }

    console.log(`[Gemini Balancer] Loaded ${keys.length} API key(s)`);
    return keys;
  }

  /**
   * Get the next API key using round-robin strategy
   */
  private getNextKey(): string {
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
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
    const key = this.getNextKey();
    this.updateStats(key);

    const provider = this.providers.get(key);
    if (!provider) {
      throw new Error('Provider not found for key');
    }

    return provider;
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
