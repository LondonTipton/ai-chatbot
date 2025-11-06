/**
 * Data Lineage & Audit Trail Utilities
 *
 * Provides mechanisms to:
 * 1. Track data flow through workflow steps
 * 2. Log intermediate step outputs for audit trails
 * 3. Validate data integrity at step boundaries
 * 4. Implement retry logic with exponential backoff
 */

/**
 * Optional logger interface for flexibility
 */
export type WorkflowLogger = {
  info: (msg: string | Record<string, any>, context?: string) => void;
  warn: (msg: string | Record<string, any>, context?: string) => void;
  error: (msg: string | Record<string, any>, context?: string) => void;
  debug: (msg: string | Record<string, any>, context?: string) => void;
};

/**
 * Data lineage entry - captures what data moves between steps
 */
export type DataLineageEntry = {
  stepId: string;
  timestamp: Date;
  inputDataMetrics: Record<string, unknown>;
  outputDataMetrics: Record<string, unknown>;
  executionTime: number;
  tokenUsed: number;
  error?: string;
};

/**
 * Audit trail - persists intermediate step outputs for recovery
 */
export type AuditEntry = {
  stepId: string;
  timestamp: Date;
  inputHash: string;
  outputHash: string;
  outputSnapshot: unknown;
  executionId: string;
};

/**
 * Step execution context with lineage tracking
 */
export type StepExecutionContext = {
  stepId: string;
  executionId: string;
  lineageLog: DataLineageEntry[];
  auditTrail: AuditEntry[];
  logger?: WorkflowLogger;
};

/**
 * Creates a data lineage tracker for a step
 * @param stepId - Identifier for the step
 * @param executionId - Unique execution identifier
 * @param logger - Optional logger for output
 */
export function createLineageTracker(
  stepId: string,
  executionId: string,
  logger?: WorkflowLogger
): StepExecutionContext {
  return {
    stepId,
    executionId,
    lineageLog: [],
    auditTrail: [],
    logger,
  };
}

/**
 * Log data lineage for a step execution
 * Captures what data enters and exits a step
 */
export function logDataLineage(
  context: StepExecutionContext,
  inputData: unknown,
  outputData: unknown,
  executionTime: number,
  tokenUsed: number
): void {
  const entry: DataLineageEntry = {
    stepId: context.stepId,
    timestamp: new Date(),
    inputDataMetrics: extractMetrics(inputData),
    outputDataMetrics: extractMetrics(outputData),
    executionTime,
    tokenUsed,
  };

  context.lineageLog.push(entry);

  if (context.logger) {
    context.logger.info(
      {
        stepId: context.stepId,
        inputMetrics: entry.inputDataMetrics,
        outputMetrics: entry.outputDataMetrics,
        executionTime,
        tokenUsed,
      },
      "Step executed with data lineage"
    );
  }
}

/**
 * Log data to audit trail for recovery/debugging
 * Creates snapshots of intermediate outputs
 */
export function logAuditTrail(
  context: StepExecutionContext,
  inputData: unknown,
  outputData: unknown
): void {
  const entry: AuditEntry = {
    stepId: context.stepId,
    timestamp: new Date(),
    inputHash: hashData(inputData),
    outputHash: hashData(outputData),
    outputSnapshot: deepClone(outputData),
    executionId: context.executionId,
  };

  context.auditTrail.push(entry);

  if (context.logger) {
    context.logger.debug(
      {
        stepId: context.stepId,
        inputHash: entry.inputHash,
        outputHash: entry.outputHash,
      },
      "Audit trail entry recorded"
    );
  }
}

/**
 * Extract metrics from data for lineage tracking
 * Counts items, sizes, presence of key fields
 */
function extractMetrics(data: unknown): Record<string, unknown> {
  if (!data) {
    return { type: "null" };
  }

  const metrics: Record<string, unknown> = {
    type: typeof data,
    timestamp: new Date().toISOString(),
  };

  if (Array.isArray(data)) {
    metrics.length = data.length;
    if (data.length > 0 && typeof data[0] === "object") {
      metrics.firstItemKeys = Object.keys(data[0] as Record<string, unknown>);
    }
  } else if (typeof data === "object") {
    metrics.keys = Object.keys(data as Record<string, unknown>);
    // Capture counts for common array fields
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>
    )) {
      if (Array.isArray(value)) {
        metrics[`${key}_count`] = value.length;
      } else if (typeof value === "string") {
        metrics[`${key}_length`] = value.length;
      } else if (typeof value === "number") {
        metrics[`${key}_value`] = value;
      }
    }
  }

  return metrics;
}

/**
 * Simple hash function for data integrity checking
 * NOT cryptographic - for comparison only
 */
function hashData(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Deep clone for snapshot creation
 */
function deepClone(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item));
  }
  if (typeof obj === "object") {
    const clonedObj: Record<string, unknown> = {};
    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      if (!key.startsWith("__proto__") && !key.startsWith("constructor")) {
        clonedObj[key] = deepClone(objRecord[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Validate data at step boundary
 * Checks for corruption, missing fields, type mismatches
 */
export function validateDataIntegrity(
  data: any,
  expectedSchema: Record<string, string>,
  stepId: string,
  logger?: WorkflowLogger
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push(`Data is not an object at step ${stepId}`);
    return { valid: false, errors };
  }

  // Check for expected fields
  for (const [field, expectedType] of Object.entries(expectedSchema)) {
    if (!(field in data)) {
      errors.push(`Missing field '${field}' at step ${stepId}`);
      continue;
    }

    const actualType = Array.isArray(data[field])
      ? "array"
      : typeof data[field];
    if (actualType !== expectedType) {
      errors.push(
        `Field '${field}' has type '${actualType}', expected '${expectedType}' at step ${stepId}`
      );
    }
  }

  if (errors.length > 0 && logger) {
    logger.warn({ stepId, errors }, "Data integrity validation failed");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Retry wrapper with exponential backoff
 * Implements transient failure recovery
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    stepId?: string;
    logger?: WorkflowLogger;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
    stepId = "unknown",
    logger,
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0 && logger) {
        logger.info(
          { stepId, attempt, delayMs: delay },
          "Retrying operation after delay"
        );
      }

      const result = await operation();
      if (attempt > 0 && logger) {
        logger.info(
          { stepId, successAfterAttempts: attempt + 1 },
          "Operation succeeded after retries"
        );
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        // Calculate delay with exponential backoff
        delay = Math.min(delay * backoffMultiplier, maxDelayMs);

        // Add jitter to prevent thundering herd
        const jitter = delay * 0.1 * Math.random();
        const totalDelay = delay + jitter;

        if (logger) {
          logger.warn(
            {
              stepId,
              attempt: attempt + 1,
              error: lastError.message,
              nextDelayMs: Math.round(totalDelay),
            },
            "Operation failed, will retry"
          );
        }

        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      }
    }
  }

  if (logger) {
    logger.error(
      { stepId, attemptsExhausted: maxRetries, finalError: lastError?.message },
      "Operation failed after all retries"
    );
  }

  throw new Error(
    `Operation failed after ${maxRetries} attempts: ${
      lastError?.message || "Unknown error"
    }`
  );
}

/**
 * Generate execution report from lineage and audit data
 * Useful for debugging and optimization
 */
export function generateExecutionReport(context: StepExecutionContext): {
  stepId: string;
  executionId: string;
  totalExecutionTime: number;
  totalTokens: number;
  stepCount: number;
  dataFlowSummary: Record<string, any>;
  auditTrailEntries: number;
  errors: string[];
} {
  const errors: string[] = [];
  for (const entry of context.lineageLog) {
    if (entry.error) {
      errors.push(entry.error);
    }
  }

  const totalExecutionTime = context.lineageLog.reduce(
    (sum, entry) => sum + entry.executionTime,
    0
  );

  const totalTokens = context.lineageLog.reduce(
    (sum, entry) => sum + entry.tokenUsed,
    0
  );

  const dataFlowSummary: Record<string, any> = {};
  for (const entry of context.lineageLog) {
    dataFlowSummary[entry.stepId] = {
      input: entry.inputDataMetrics,
      output: entry.outputDataMetrics,
      time: entry.executionTime,
      tokens: entry.tokenUsed,
    };
  }

  return {
    stepId: context.stepId,
    executionId: context.executionId,
    totalExecutionTime,
    totalTokens,
    stepCount: context.lineageLog.length,
    dataFlowSummary,
    auditTrailEntries: context.auditTrail.length,
    errors,
  };
}
