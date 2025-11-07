/**
 * Cerebras API Retry Handler
 *
 * Implements exponential backoff retry logic specifically for Cerebras API rate limit errors.
 * Handles 429 errors, queue_exceeded, and too_many_requests_error gracefully.
 */

export type RetryOptions = {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, delay: number, error: any) => void;
};

export type CerebrasError = Error & {
  statusCode?: number;
  code?: string;
  type?: string;
  isRetryable?: boolean;
  data?: {
    code?: string;
    type?: string;
    message?: string;
  };
};

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry">> = {
  maxRetries: 3,
  initialDelay: 2000, // 2 seconds
  maxDelay: 15_000, // 15 seconds
  backoffMultiplier: 2,
};

/**
 * Check if an error is a Cerebras rate limit error
 */
export function isCerebrasRateLimitError(error: any): boolean {
  return (
    error.statusCode === 429 ||
    error.code === "queue_exceeded" ||
    error.type === "too_many_requests_error" ||
    error.data?.code === "queue_exceeded" ||
    error.data?.type === "too_many_requests_error"
  );
}

/**
 * Check if an error is retryable (rate limit or server errors)
 */
export function isCerebrasRetryableError(error: any): boolean {
  return (
    isCerebrasRateLimitError(error) ||
    error.isRetryable === true ||
    (error.statusCode && error.statusCode >= 500)
  );
}

/**
 * Execute a function with exponential backoff retry logic for Cerebras API errors
 *
 * @example
 * ```typescript
 * const result = await withCerebrasRetry(
 *   async () => await agent.stream(input, options),
 *   { maxRetries: 3, initialDelay: 2000 }
 * );
 * ```
 */
export async function withCerebrasRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: CerebrasError | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = isCerebrasRetryableError(error);
      const isLastAttempt = attempt === config.maxRetries;

      // Log the error
      console.error(
        `[Cerebras Retry] Attempt ${attempt + 1}/${
          config.maxRetries + 1
        } failed:`,
        {
          statusCode: error.statusCode,
          code: error.code || error.data?.code,
          type: error.type || error.data?.type,
          message: error.message || error.data?.message,
          isRetryable,
        }
      );

      // Don't retry if not retryable or last attempt
      if (!isRetryable || isLastAttempt) {
        console.error(
          `[Cerebras Retry] ${
            isLastAttempt ? "Max retries reached" : "Error not retryable"
          }, giving up`
        );
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay =
        config.initialDelay * config.backoffMultiplier ** attempt;
      const jitter = Math.random() * 1000; // Add up to 1 second of jitter
      const delay = Math.min(baseDelay + jitter, config.maxDelay);

      console.log(
        `[Cerebras Retry] ${
          isCerebrasRateLimitError(error)
            ? "⏳ Rate limit hit"
            : "🔄 Retryable error"
        }, waiting ${Math.round(delay)}ms before retry (attempt ${
          attempt + 1
        }/${config.maxRetries})`
      );

      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(attempt + 1, delay, error);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted - throw the last error if available
  if (lastError) {
    throw lastError;
  }

  // This should never happen, but TypeScript needs it
  throw new Error("Retry failed with no error captured");
}

/**
 * Create a retry-wrapped version of an async function
 *
 * @example
 * ```typescript
 * const retryableStream = createRetryableFunction(
 *   (input) => agent.stream(input, options),
 *   { maxRetries: 3 }
 * );
 *
 * const stream = await retryableStream(input);
 * ```
 */
export function createRetryableFunction<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TReturn> {
  return (...args: TArgs) => withCerebrasRetry(() => fn(...args), options);
}
