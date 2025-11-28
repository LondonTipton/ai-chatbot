/**
 * Modal embedding client with retry logic and cold start handling
 */

const MODAL_ENDPOINT =
  process.env.MODAL_ENDPOINT ||
  "https://chrismutibvu--hybrid-embeddings-simple-embed-hybrid.modal.run";

export interface EmbeddingResult {
  dense_embedding: number[];
  sparse_embedding: Record<string, number>;
  dense_dim: number;
  sparse_nonzero: number;
  inference_time_ms: number;
  model_info: {
    dense: string;
    sparse: string;
  };
}

export interface EmbeddingError {
  error: string;
  isWarmup?: boolean;
  isColdStart?: boolean;
}

/**
 * Generate embeddings with retry logic for cold starts
 */
export async function generateEmbeddings(
  text: string,
  options: {
    retries?: number;
    timeout?: number;
  } = {}
): Promise<EmbeddingResult> {
  const { retries = 2, timeout = 180_000 } = options; // 3 min default timeout

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(MODAL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: text }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      const isLastAttempt = attempt === retries - 1;
      const isColdStart =
        error instanceof Error &&
        (error.message.includes("timeout") ||
          error.message.includes("aborted"));

      if (isLastAttempt) {
        if (isColdStart) {
          throw new Error(
            "Embedding service is warming up (60-120s on first request). Please try again in a moment."
          );
        }
        throw error;
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 5000 * (attempt + 1)));
    }
  }

  throw new Error("Failed to generate embeddings after retries");
}

/**
 * Generate embeddings in batch
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  options: {
    timeout?: number;
  } = {}
): Promise<EmbeddingResult[]> {
  // Process in parallel with concurrency limit
  const BATCH_SIZE = 5;
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((text) => generateEmbeddings(text, options))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check if Modal service is warm (quick health check)
 */
export async function checkModalHealth(): Promise<{
  isWarm: boolean;
  responseTime: number;
}> {
  const start = Date.now();

  try {
    const response = await fetch(MODAL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "health check" }),
      signal: AbortSignal.timeout(5000), // 5s timeout for health check
    });

    const responseTime = Date.now() - start;

    return {
      isWarm: response.ok && responseTime < 2000, // Warm if responds in <2s
      responseTime,
    };
  } catch {
    return {
      isWarm: false,
      responseTime: Date.now() - start,
    };
  }
}
