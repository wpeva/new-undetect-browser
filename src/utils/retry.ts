/**
 * Retry Logic Utilities
 * Provides robust retry mechanisms for critical operations
 */

import { logger } from './logger';
import { validateRetryConfig, RetryConfig } from './validators';

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Retry options with custom error handling
 */
export interface RetryOptions extends RetryConfig {
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Executes a function with retry logic
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await page.goto(url),
 *   { maxAttempts: 3, delayMs: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: RetryOptions = {
    ...DEFAULT_RETRY_CONFIG,
    ...options,
  };

  validateRetryConfig(config);

  let lastError: Error | undefined;
  let currentDelay = config.delayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (config.shouldRetry && !config.shouldRetry(lastError)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Log retry attempt
      logger.warn(
        `Retry attempt ${attempt}/${config.maxAttempts} failed: ${lastError.message}`
      );

      // Call retry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, lastError);
      }

      // Wait before retrying with exponential backoff
      await delay(currentDelay);
      currentDelay *= config.backoffMultiplier || 1;
    }
  }

  // All retries failed
  logger.error(
    `All ${config.maxAttempts} retry attempts failed: ${lastError?.message}`
  );
  throw lastError;
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with timeout
 *
 * @param fn - The async function to retry
 * @param timeoutMs - Timeout in milliseconds
 * @param retryOptions - Retry configuration
 * @returns The result of the function
 * @throws TimeoutError if operation times out
 *
 * @example
 * ```typescript
 * const result = await withRetryAndTimeout(
 *   async () => await page.waitForSelector('.element'),
 *   30000, // 30 second timeout
 *   { maxAttempts: 2 }
 * );
 * ```
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  retryOptions: Partial<RetryOptions> = {}
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    withRetry(fn, retryOptions),
    timeoutPromise,
  ]);
}

/**
 * Check if error is retryable (network errors, timeouts, etc.)
 */
export function isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    /timeout/i,
    /ECONNREFUSED/i,
    /ENOTFOUND/i,
    /ETIMEDOUT/i,
    /ECONNRESET/i,
    /socket hang up/i,
    /network/i,
    /fetch failed/i,
  ];

  const errorMessage = error.message;
  return retryablePatterns.some((pattern) => pattern.test(errorMessage));
}

/**
 * Retry specifically for network operations
 */
export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  return withRetry(fn, {
    maxAttempts,
    delayMs: 1000,
    backoffMultiplier: 2,
    shouldRetry: isRetryableError,
    onRetry: (attempt, error) => {
      logger.debug(`Network retry ${attempt}: ${error.message}`);
    },
  });
}

/**
 * Retry for page navigation
 */
export async function withNavigationRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 2
): Promise<T> {
  return withRetry(fn, {
    maxAttempts,
    delayMs: 2000,
    backoffMultiplier: 1.5,
    shouldRetry: (error) => {
      // Retry on navigation timeouts or network errors
      return (
        isRetryableError(error) ||
        error.message.includes('Navigation') ||
        error.message.includes('timeout')
      );
    },
    onRetry: (attempt, error) => {
      logger.warn(`Navigation retry ${attempt}: ${error.message}`);
    },
  });
}

/**
 * Batch retry for multiple operations
 * Retries failed operations while keeping successful ones
 *
 * @param operations - Array of async functions to execute
 * @param retryOptions - Retry configuration
 * @returns Array of results (successful operations)
 * @throws If all operations fail
 */
export async function batchRetry<T>(
  operations: (() => Promise<T>)[],
  retryOptions: Partial<RetryOptions> = {}
): Promise<T[]> {
  const results: T[] = [];
  const errors: Error[] = [];

  for (const operation of operations) {
    try {
      const result = await withRetry(operation, retryOptions);
      results.push(result);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  if (results.length === 0 && errors.length > 0) {
    throw new Error(
      `All batch operations failed: ${errors.map((e) => e.message).join(', ')}`
    );
  }

  if (errors.length > 0) {
    logger.warn(`${errors.length} operations failed in batch`);
  }

  return results;
}

/**
 * Circuit breaker pattern for preventing cascade failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 60000
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'half-open';
        logger.info('Circuit breaker entering half-open state');
      } else {
        throw new Error('Circuit breaker is open - too many failures');
      }
    }

    try {
      const result = await fn();

      // Success - reset on half-open or keep closed
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
        logger.info('Circuit breaker closed after successful attempt');
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
        logger.error(
          `Circuit breaker opened after ${this.failures} failures`
        );
      }

      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): { state: string; failures: number } {
    return {
      state: this.state,
      failures: this.failures,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailureTime = 0;
    logger.info('Circuit breaker manually reset');
  }
}
