/**
 * Advanced Features Example
 * Demonstrates advanced capabilities including retry logic,
 * validation, error handling, and performance monitoring
 */

import { UndetectBrowser, UndetectConfig, LaunchOptions } from '../src/index';
import { LogLevel, logger } from '../src/utils/logger';
import { withRetry, withNavigationRetry, CircuitBreaker } from '../src/utils/retry';
import { validateUrl, validatePositiveNumber } from '../src/utils/validators';
import { ValidationError, InjectionError } from '../src/types/browser-types';

/**
 * Example 1: Robust Navigation with Retry Logic
 */
async function robustNavigationExample() {
  console.log('\n=== Robust Navigation Example ===\n');

  const undetect = new UndetectBrowser({
    logLevel: LogLevel.DEBUG,
  });

  const browser = await undetect.launch();
  const page = await browser.newPage();

  try {
    // Navigate with automatic retry on failure
    const url = 'https://example.com';
    validateUrl(url); // Validate before navigating

    await withNavigationRetry(async () => {
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      if (!response || !response.ok()) {
        throw new Error(`Navigation failed with status: ${response?.status()}`);
      }

      return response;
    }, 3); // Max 3 attempts

    console.log('Successfully navigated to:', url);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Navigation failed after retries:', error);
    }
  } finally {
    await browser.close();
  }
}

/**
 * Example 2: Circuit Breaker Pattern for API Calls
 */
async function circuitBreakerExample() {
  console.log('\n=== Circuit Breaker Example ===\n');

  const circuitBreaker = new CircuitBreaker(3, 30000); // 3 failures, 30s reset

  const undetect = new UndetectBrowser();
  const browser = await undetect.launch();
  const page = await browser.newPage();

  try {
    // Simulate multiple API calls
    for (let i = 0; i < 10; i++) {
      try {
        await circuitBreaker.execute(async () => {
          // Simulate API call
          await page.goto('https://httpbin.org/delay/1', { timeout: 5000 });
          console.log(`Request ${i + 1} succeeded`);
        });
      } catch (error) {
        console.error(`Request ${i + 1} failed:`, error.message);

        const state = circuitBreaker.getState();
        console.log(`Circuit breaker state:`, state);

        if (state.state === 'open') {
          console.log('Circuit breaker is open, stopping requests');
          break;
        }
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } finally {
    await browser.close();
  }
}

/**
 * Example 3: Performance Monitoring
 */
async function performanceMonitoringExample() {
  console.log('\n=== Performance Monitoring Example ===\n');

  const undetect = new UndetectBrowser({
    logLevel: LogLevel.DEBUG,
  });

  const browser = await undetect.launch();
  const page = await browser.newPage();

  try {
    // Measure page load time
    const url = 'https://example.com';

    await logger.measureTime('Page load', async () => {
      await page.goto(url, { waitUntil: 'networkidle2' });
    });

    // Measure screenshot generation
    await logger.measureTime('Screenshot', async () => {
      await page.screenshot({ path: '/tmp/screenshot.png' });
    });

    // Log custom performance metrics
    logger.perf('Custom metric', {
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 + ' MB',
      timestamp: Date.now(),
    });
  } finally {
    await browser.close();
  }
}

/**
 * Example 4: Input Validation and Error Handling
 */
async function validationExample() {
  console.log('\n=== Validation and Error Handling Example ===\n');

  try {
    // Validate viewport dimensions
    const width = 1920;
    const height = 1080;

    validatePositiveNumber(width, 'Viewport width');
    validatePositiveNumber(height, 'Viewport height');

    console.log(`Viewport validated: ${width}x${height}`);

    // Launch with validated config
    const undetect = new UndetectBrowser();
    const browser = await undetect.launch({
      profile: {
        viewport: { width, height },
      },
    });

    console.log('Browser launched with validated config');
    await browser.close();
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation failed:', error.message);
      console.error('Error code:', error.code);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 5: Structured Logging with Context
 */
async function structuredLoggingExample() {
  console.log('\n=== Structured Logging Example ===\n');

  // Create child logger with session context
  const sessionId = `session-${Date.now()}`;
  const sessionLogger = logger.child('SessionManager', {
    sessionId,
    userId: 'user-123',
  });

  const undetect = new UndetectBrowser();

  try {
    sessionLogger.info('Starting browser session');

    const browser = await undetect.launch();
    const page = await browser.newPage();

    sessionLogger.debug('Page created', {
      url: page.url(),
      viewport: await page.viewport(),
    });

    await page.goto('https://example.com');

    sessionLogger.info('Navigation completed', {
      title: await page.title(),
      url: page.url(),
    });

    await browser.close();

    sessionLogger.info('Session ended successfully');
  } catch (error) {
    sessionLogger.error(
      'Session failed',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Example 6: Batch Operations with Retry
 */
async function batchOperationsExample() {
  console.log('\n=== Batch Operations Example ===\n');

  const undetect = new UndetectBrowser();
  const browser = await undetect.launch();

  try {
    const urls = [
      'https://example.com',
      'https://httpbin.org/get',
      'https://httpstat.us/200',
    ];

    // Navigate to multiple URLs with retry
    const operations = urls.map((url) => async () => {
      const page = await browser.newPage();
      try {
        await withRetry(
          async () => {
            await page.goto(url, { timeout: 10000 });
            console.log(`Successfully loaded: ${url}`);
            return await page.title();
          },
          { maxAttempts: 2, delayMs: 1000 }
        );
      } finally {
        await page.close();
      }
    });

    // Execute all operations
    await Promise.allSettled(operations.map((op) => op()));

    console.log('All batch operations completed');
  } finally {
    await browser.close();
  }
}

/**
 * Example 7: Custom Error Handling Strategy
 */
async function customErrorHandlingExample() {
  console.log('\n=== Custom Error Handling Example ===\n');

  const undetect = new UndetectBrowser();
  const browser = await undetect.launch();
  const page = await browser.newPage();

  try {
    await page.goto('https://example.com');

    // Try to inject with custom error handling
    try {
      await page.evaluate(() => {
        // Simulate injection error
        if (!window.navigator) {
          throw new Error('Navigator not available');
        }
      });
    } catch (error) {
      // Wrap in custom error
      const injectionError = new InjectionError(
        'Failed to inject script: ' + (error as Error).message
      );

      logger.error('Injection failed', injectionError);

      // Retry with fallback strategy
      await page.evaluate(() => {
        console.log('Using fallback injection strategy');
      });
    }
  } finally {
    await browser.close();
  }
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log('=================================================');
  console.log('Advanced Features Examples');
  console.log('=================================================');

  try {
    await robustNavigationExample();
    await circuitBreakerExample();
    await performanceMonitoringExample();
    await validationExample();
    await structuredLoggingExample();
    await batchOperationsExample();
    await customErrorHandlingExample();

    console.log('\n=================================================');
    console.log('All examples completed successfully!');
    console.log('=================================================\n');
  } catch (error) {
    console.error('\nExample failed:', error);
    process.exit(1);
  }
}

// Run examples if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export {
  robustNavigationExample,
  circuitBreakerExample,
  performanceMonitoringExample,
  validationExample,
  structuredLoggingExample,
  batchOperationsExample,
  customErrorHandlingExample,
};
