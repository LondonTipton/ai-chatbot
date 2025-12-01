/**
 * Modal A10 GPU embedding client with failover support
 *
 * Supports multiple endpoints for redundancy:
 * - Primary: MODAL_EMBEDDING_URL
 * - Backup 1: MODAL_EMBEDDING_URL_BACKUP_1
 * - Backup 2: MODAL_EMBEDDING_URL_BACKUP_2
 *
 * Endpoints per server:
 * - /search - POST search queries
 * - /embed - POST generate embeddings
 * - /health - GET health check
 * - /docs - Swagger UI
 */

// Default primary endpoint
const DEFAULT_PRIMARY =
  "https://chrismutibvu--legal-search-8b-fast-gpu-a10-fastgpusearch-ce0540.modal.run";

/**
 * Get all configured Modal endpoints in priority order
 */
function getEndpoints(): string[] {
  const endpoints: string[] = [];

  // Primary endpoint
  const primary = process.env.MODAL_EMBEDDING_URL || DEFAULT_PRIMARY;
  endpoints.push(primary.replace(/\/$/, ""));

  // Backup endpoints (optional)
  if (process.env.MODAL_EMBEDDING_URL_BACKUP_1) {
    endpoints.push(process.env.MODAL_EMBEDDING_URL_BACKUP_1.replace(/\/$/, ""));
  }
  if (process.env.MODAL_EMBEDDING_URL_BACKUP_2) {
    endpoints.push(process.env.MODAL_EMBEDDING_URL_BACKUP_2.replace(/\/$/, ""));
  }

  return endpoints;
}

// Track endpoint health for smart routing
const endpointHealth: Map<
  string,
  { failures: number; lastFailure: number; lastSuccess: number }
> = new Map();

const FAILURE_THRESHOLD = 3; // Mark unhealthy after 3 consecutive failures
const RECOVERY_TIME_MS = 60_000; // Try unhealthy endpoint again after 1 minute

/**
 * Get endpoints sorted by health (healthy first, then by recent success)
 */
function getHealthyEndpoints(): string[] {
  const endpoints = getEndpoints();
  const now = Date.now();

  return endpoints.sort((a, b) => {
    const healthA = endpointHealth.get(a) || {
      failures: 0,
      lastFailure: 0,
      lastSuccess: now,
    };
    const healthB = endpointHealth.get(b) || {
      failures: 0,
      lastFailure: 0,
      lastSuccess: now,
    };

    // Check if endpoint should be considered unhealthy
    const aUnhealthy =
      healthA.failures >= FAILURE_THRESHOLD &&
      now - healthA.lastFailure < RECOVERY_TIME_MS;
    const bUnhealthy =
      healthB.failures >= FAILURE_THRESHOLD &&
      now - healthB.lastFailure < RECOVERY_TIME_MS;

    // Healthy endpoints first
    if (aUnhealthy && !bUnhealthy) return 1;
    if (!aUnhealthy && bUnhealthy) return -1;

    // Then by most recent success
    return healthB.lastSuccess - healthA.lastSuccess;
  });
}

/**
 * Record endpoint success
 */
function recordSuccess(endpoint: string): void {
  endpointHealth.set(endpoint, {
    failures: 0,
    lastFailure: 0,
    lastSuccess: Date.now(),
  });
}

/**
 * Record endpoint failure
 */
function recordFailure(endpoint: string): void {
  const current = endpointHealth.get(endpoint) || {
    failures: 0,
    lastFailure: 0,
    lastSuccess: 0,
  };
  endpointHealth.set(endpoint, {
    failures: current.failures + 1,
    lastFailure: Date.now(),
    lastSuccess: current.lastSuccess,
  });
}

export interface EmbeddingResult {
  dense_embedding?: number[];
  embedding?: number[];
  embeddings?: number[][];
  sparse_embedding?: Record<string, number>;
  dense_dim?: number;
  sparse_nonzero?: number;
  inference_time_ms?: number;
  model_info?: {
    dense: string;
    sparse: string;
  };
}

export interface EmbeddingError {
  error: string;
  isWarmup?: boolean;
  isColdStart?: boolean;
  failedEndpoints?: string[];
}

/**
 * Execute a request with failover across all configured endpoints
 */
async function executeWithFailover<T>(
  path: string,
  options: {
    method: "GET" | "POST";
    body?: any;
    timeout?: number;
  }
): Promise<{ data: T; endpoint: string }> {
  const { method, body, timeout = 30_000 } = options;
  const endpoints = getHealthyEndpoints();
  const errors: Array<{ endpoint: string; error: string }> = [];

  for (const endpoint of endpoints) {
    const url = `${endpoint}${path}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      recordSuccess(endpoint);

      return { data, endpoint };
    } catch (error) {
      recordFailure(endpoint);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push({ endpoint, error: errorMsg });
      console.warn(`[Modal Failover] Endpoint ${endpoint} failed: ${errorMsg}`);
      // Continue to next endpoint
    }
  }

  // All endpoints failed
  const failedEndpoints = errors.map((e) => e.endpoint);
  const errorDetails = errors
    .map((e) => `${e.endpoint}: ${e.error}`)
    .join("; ");
  throw Object.assign(
    new Error(`All Modal endpoints failed: ${errorDetails}`),
    { failedEndpoints }
  );
}

/**
 * Generate embeddings with failover support
 */
export async function generateEmbeddings(
  text: string,
  options: {
    timeout?: number;
  } = {}
): Promise<EmbeddingResult> {
  const { timeout = 60_000 } = options;

  const { data } = await executeWithFailover<EmbeddingResult>("/embed", {
    method: "POST",
    body: { queries: [text] },
    timeout,
  });

  return data;
}

/**
 * Generate embeddings in batch with failover support
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  options: {
    timeout?: number;
  } = {}
): Promise<number[][]> {
  const { timeout = 120_000 } = options;

  const { data } = await executeWithFailover<EmbeddingResult>("/embed", {
    method: "POST",
    body: { queries: texts },
    timeout,
  });

  // Handle batch response format
  if (data.embeddings && Array.isArray(data.embeddings)) {
    return data.embeddings;
  }

  // Fallback for single embedding response
  if (data.embedding) {
    return [data.embedding];
  }

  throw new Error("Invalid embedding response format");
}

/**
 * Check health of all configured Modal endpoints
 */
export async function checkModalHealth(): Promise<{
  primary: { isWarm: boolean; responseTime: number; status: string };
  backups: Array<{
    url: string;
    isWarm: boolean;
    responseTime: number;
    status: string;
  }>;
  healthyCount: number;
}> {
  const endpoints = getEndpoints();
  const results: Array<{
    url: string;
    isWarm: boolean;
    responseTime: number;
    status: string;
  }> = [];

  for (const endpoint of endpoints) {
    const start = Date.now();
    const healthUrl = `${endpoint}/health`;

    try {
      const response = await fetch(healthUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - start;
      const data = await response.json().catch(() => ({}));

      results.push({
        url: endpoint,
        isWarm: response.ok && responseTime < 2000,
        responseTime,
        status: data.status || (response.ok ? "healthy" : "unhealthy"),
      });

      if (response.ok) {
        recordSuccess(endpoint);
      } else {
        recordFailure(endpoint);
      }
    } catch {
      results.push({
        url: endpoint,
        isWarm: false,
        responseTime: Date.now() - start,
        status: "unreachable",
      });
      recordFailure(endpoint);
    }
  }

  const healthyCount = results.filter((r) => r.status === "healthy").length;

  return {
    primary: results[0] || {
      isWarm: false,
      responseTime: 0,
      status: "not configured",
    },
    backups: results.slice(1),
    healthyCount,
  };
}

/**
 * Perform a direct search with failover support
 */
export async function modalSearch(
  query: string,
  options: {
    topK?: number;
    timeout?: number;
  } = {}
): Promise<any> {
  const { topK = 10, timeout = 60_000 } = options;

  const { data } = await executeWithFailover("/search", {
    method: "POST",
    body: { query, top_k: topK },
    timeout,
  });

  return data;
}

/**
 * Get current endpoint health status (for monitoring/debugging)
 */
export function getEndpointHealthStatus(): Array<{
  url: string;
  failures: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  isHealthy: boolean;
}> {
  const endpoints = getEndpoints();
  const now = Date.now();

  return endpoints.map((endpoint) => {
    const health = endpointHealth.get(endpoint);
    const isHealthy = health
      ? health.failures < FAILURE_THRESHOLD ||
        now - health.lastFailure >= RECOVERY_TIME_MS
      : true;

    return {
      url: endpoint,
      failures: health?.failures || 0,
      lastFailure: health?.lastFailure ? new Date(health.lastFailure) : null,
      lastSuccess: health?.lastSuccess ? new Date(health.lastSuccess) : null,
      isHealthy,
    };
  });
}
