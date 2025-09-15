/**
 * Enhanced error handling and fallback mechanisms
 */

export interface CacheError extends Error {
  code: string;
  retryable: boolean;
  fallbackAvailable: boolean;
  timestamp: number;
  context?: any;
}

export interface ErrorHandlingConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Base delay between retries in ms */
  baseDelay: number;
  /** Maximum delay between retries in ms */
  maxDelay: number;
  /** Enable circuit breaker */
  enableCircuitBreaker: boolean;
  /** Circuit breaker failure threshold */
  circuitBreakerThreshold: number;
  /** Circuit breaker timeout in ms */
  circuitBreakerTimeout: number;
  /** Enable fallback to memory cache */
  enableMemoryFallback: boolean;
  /** Enable graceful degradation */
  enableGracefulDegradation: boolean;
}

export class CacheErrorHandler {
  private retryCounts = new Map<string, number>();
  private circuitBreakerStates = new Map<string, { failures: number; lastFailure: number; state: "closed" | "open" | "half-open" }>();

  constructor(private config: ErrorHandlingConfig) {}

  /**
   * Handle cache operation errors with retry logic
   */
  async handleWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Check circuit breaker
        if (this.isCircuitBreakerOpen(operationId)) {
          throw new Error(`Circuit breaker is open for operation: ${operationId}`);
        }

        const result = await operation();

        // Reset circuit breaker on success
        this.resetCircuitBreaker(operationId);

        return result;
      } catch (error) {
        lastError = error as Error;

        // Record failure for circuit breaker
        this.recordFailure(operationId);

        // If this is the last attempt, try fallback
        if (attempt === this.config.maxRetries) {
          if (fallback && this.config.enableMemoryFallback) {
            try {
              console.warn(`Operation ${operationId} failed, using fallback`);
              return await fallback();
            } catch (fallbackError) {
              console.error(`Fallback also failed for ${operationId}:`, fallbackError);
            }
          }
          break;
        }

        // Wait before retry
        const delay = this.calculateRetryDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw this.createCacheError(lastError!, operationId);
  }

  /**
   * Handle cache operation with graceful degradation
   */
  async handleWithGracefulDegradation<T>(
    operation: () => Promise<T>,
    operationId: string,
    fallbackValue: T,
  ): Promise<T> {
    try {
      return await this.handleWithRetry(operation, operationId);
    } catch (error) {
      if (this.config.enableGracefulDegradation) {
        console.warn(`Graceful degradation for ${operationId}:`, error);
        return fallbackValue;
      }
      throw error;
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(operationId: string): boolean {
    if (!this.config.enableCircuitBreaker) {
      return false;
    }

    const state = this.circuitBreakerStates.get(operationId);
    if (!state) {
      return false;
    }

    const now = Date.now();

    if (state.state === "open") {
      // Check if timeout has passed
      if (now - state.lastFailure > this.config.circuitBreakerTimeout) {
        state.state = "half-open";
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record operation failure
   */
  private recordFailure(operationId: string): void {
    if (!this.config.enableCircuitBreaker) {
      return;
    }

    const state = this.circuitBreakerStates.get(operationId) || {
      failures: 0,
      lastFailure: 0,
      state: "closed" as const,
    };

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.config.circuitBreakerThreshold) {
      state.state = "open";
      console.warn(`Circuit breaker opened for operation: ${operationId}`);
    }

    this.circuitBreakerStates.set(operationId, state);
  }

  /**
   * Reset circuit breaker
   */
  private resetCircuitBreaker(operationId: string): void {
    if (!this.config.enableCircuitBreaker) {
      return;
    }

    const state = this.circuitBreakerStates.get(operationId);
    if (state) {
      state.failures = 0;
      state.state = "closed";
      this.circuitBreakerStates.set(operationId, state);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.config.baseDelay * 2 ** attempt,
      this.config.maxDelay,
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create standardized cache error
   */
  private createCacheError(error: Error, operationId: string): CacheError {
    const cacheError = error as CacheError;
    cacheError.code = this.getErrorCode(error);
    cacheError.retryable = this.isRetryableError(error);
    cacheError.fallbackAvailable = this.config.enableMemoryFallback;
    cacheError.timestamp = Date.now();
    cacheError.context = { operationId };

    return cacheError;
  }

  /**
   * Get error code from error
   */
  private getErrorCode(error: Error): string {
    if (error.message.includes("ECONNREFUSED")) {
      return "CONNECTION_REFUSED";
    }
    if (error.message.includes("timeout")) {
      return "TIMEOUT";
    }
    if (error.message.includes("circuit breaker")) {
      return "CIRCUIT_BREAKER_OPEN";
    }
    if (error.message.includes("rate limit")) {
      return "RATE_LIMIT_EXCEEDED";
    }
    return "UNKNOWN_ERROR";
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableCodes = [
      "CONNECTION_REFUSED",
      "TIMEOUT",
      "NETWORK_ERROR",
      "TEMPORARY_FAILURE",
    ];

    const code = this.getErrorCode(error);
    return retryableCodes.includes(code);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalOperations: number;
    failedOperations: number;
    circuitBreakerStates: Record<string, any>;
  } {
    const totalOperations = this.retryCounts.size;
    const failedOperations = Array.from(this.retryCounts.values())
      .reduce((sum, count) => sum + count, 0);

    const circuitBreakerStates: Record<string, any> = {};
    this.circuitBreakerStates.forEach((state, operationId) => {
      circuitBreakerStates[operationId] = state;
    });

    return {
      totalOperations,
      failedOperations,
      circuitBreakerStates,
    };
  }
}

/**
 * Default error handling configuration
 */
export const defaultErrorHandlingConfig: ErrorHandlingConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000, // 1 minute
  enableMemoryFallback: true,
  enableGracefulDegradation: true,
};

/**
 * Create error handler instance
 */
let errorHandlerInstance: CacheErrorHandler | null = null;

export function getErrorHandler(): CacheErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new CacheErrorHandler(defaultErrorHandlingConfig);
  }
  return errorHandlerInstance;
}
