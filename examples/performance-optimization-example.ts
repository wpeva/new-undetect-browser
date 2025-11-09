/**
 * Performance Optimization Examples
 * Demonstrates memoization, caching, benchmarking, and performance monitoring
 */

import { UndetectBrowser } from '../src/index';
import {
  memoize,
  memoizeAsync,
  LRUCache,
  debounce,
  throttle,
  Lazy,
  ResourcePool,
  BatchProcessor,
} from '../src/utils/memoization';
import {
  PerformanceMonitor,
  benchmark,
  compareBenchmarks,
  MemoryProfiler,
  performanceMonitor,
} from '../src/utils/performance';
import { logger } from '../src/utils/logger';

/**
 * Example 1: Memoization for Expensive Computations
 */
async function memoizationExample() {
  console.log('\n=== Memoization Example ===\n');

  // Expensive computation without memoization
  function expensiveComputation(n: number): number {
    let result = 0;
    for (let i = 0; i < n * 1000000; i++) {
      result += Math.sqrt(i);
    }
    return result;
  }

  // Memoized version
  const memoizedComputation = memoize(expensiveComputation);

  // First call - slow
  console.time('First call (not cached)');
  memoizedComputation(100);
  console.timeEnd('First call (not cached)');

  // Second call - instant (cached)
  console.time('Second call (cached)');
  memoizedComputation(100);
  console.timeEnd('Second call (cached)');

  // Benchmark the difference
  await compareBenchmarks([
    {
      name: 'Without memoization',
      fn: () => expensiveComputation(50),
    },
    {
      name: 'With memoization (cached)',
      fn: () => memoizedComputation(50),
    },
  ], { iterations: 10, warmup: 2 });
}

/**
 * Example 2: LRU Cache for Page Resources
 */
async function lruCacheExample() {
  console.log('\n=== LRU Cache Example ===\n');

  // Create LRU cache for page data
  const pageCache = new LRUCache<string, { title: string; content: string }>(
    5, // max 5 entries
    60000 // 1 minute TTL
  );

  const undetect = new UndetectBrowser();
  const browser = await undetect.launch();
  const page = await browser.newPage();

  try {
    const urls = [
      'https://example.com',
      'https://httpbin.org/html',
      'https://example.org',
    ];

    // Fetch and cache pages
    for (const url of urls) {
      if (pageCache.has(url)) {
        console.log(`✓ Cache hit for: ${url}`);
        const cached = pageCache.get(url);
        console.log(`  Cached title: ${cached?.title}`);
      } else {
        console.log(`✗ Cache miss for: ${url}, fetching...`);
        await page.goto(url, { timeout: 10000 });

        const title = await page.title();
        const content = await page.content();

        pageCache.set(url, { title, content: content.substring(0, 100) });
        console.log(`  Fetched and cached: ${title}`);
      }
    }

    // Show cache stats
    const stats = pageCache.getStats();
    console.log('\nCache Statistics:');
    console.log(`  Size: ${stats.size}/${stats.maxSize}`);
    console.log(`  Hit rate: ${stats.hitRate.toFixed(2)}`);
    console.log(`  Entries: ${stats.entries.length}`);
  } finally {
    await browser.close();
  }
}

/**
 * Example 3: Performance Monitoring
 */
async function performanceMonitoringExample() {
  console.log('\n=== Performance Monitoring Example ===\n');

  const monitor = new PerformanceMonitor(100);
  const undetect = new UndetectBrowser();
  const browser = await undetect.launch();

  try {
    // Monitor page operations
    const page = await browser.newPage();

    // Measure navigation
    await monitor.measure('page-navigation', async () => {
      await page.goto('https://example.com');
    });

    // Measure screenshot
    await monitor.measure('screenshot', async () => {
      await page.screenshot({ path: '/tmp/perf-test.png' });
    });

    // Measure content extraction
    await monitor.measure('content-extraction', async () => {
      await page.evaluate(() => document.body.innerText);
    });

    // Get statistics
    const navStats = monitor.getStats('page-navigation');
    if (navStats) {
      console.log('Navigation Stats:');
      console.log(`  Average: ${navStats.average.toFixed(2)}ms`);
      console.log(`  Min: ${navStats.min}ms`);
      console.log(`  Max: ${navStats.max}ms`);
      console.log(`  P95: ${navStats.p95}ms`);
      console.log(`  P99: ${navStats.p99}ms`);
    }

    // Log summary
    monitor.logSummary();

    await page.close();
  } finally {
    await browser.close();
  }
}

/**
 * Example 4: Debounce and Throttle
 */
async function debounceThrottleExample() {
  console.log('\n=== Debounce/Throttle Example ===\n');

  let callCount = 0;

  // Regular function
  const regularFn = () => {
    callCount++;
    console.log(`Regular call: ${callCount}`);
  };

  // Debounced (waits for quiet period)
  const debouncedFn = debounce(() => {
    console.log('Debounced: Called after quiet period');
  }, 100);

  // Throttled (limits rate)
  const throttledFn = throttle(() => {
    console.log('Throttled: Rate limited call');
  }, 100);

  // Simulate rapid calls
  console.log('Simulating rapid calls...');
  for (let i = 0; i < 10; i++) {
    regularFn(); // Called 10 times
    debouncedFn(); // Called once after quiet period
    throttledFn(); // Called ~2-3 times (rate limited)
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  // Wait for debounce
  await new Promise((resolve) => setTimeout(resolve, 150));
  console.log(`\nTotal regular calls: ${callCount}`);
}

/**
 * Example 5: Lazy Initialization
 */
async function lazyInitializationExample() {
  console.log('\n=== Lazy Initialization Example ===\n');

  // Expensive resource (only created when needed)
  const lazyBrowser = new Lazy(async () => {
    console.log('Initializing browser (expensive operation)...');
    const undetect = new UndetectBrowser();
    return await undetect.launch();
  });

  console.log('Lazy browser created (not initialized yet)');
  console.log(`Is initialized: ${lazyBrowser.isInitialized()}`);

  // First access - triggers initialization
  console.log('\nFirst access...');
  const browser = await lazyBrowser.getValue();
  console.log(`Is initialized: ${lazyBrowser.isInitialized()}`);

  // Second access - uses cached instance
  console.log('\nSecond access...');
  const browser2 = await lazyBrowser.getValue();
  console.log(`Same instance: ${browser === browser2}`);

  await browser.close();
}

/**
 * Example 6: Resource Pool
 */
async function resourcePoolExample() {
  console.log('\n=== Resource Pool Example ===\n');

  const undetect = new UndetectBrowser();
  const browser = await undetect.launch();

  // Create pool of page objects
  const pagePool = new ResourcePool(
    () => {
      console.log('  Creating new page');
      return browser.newPage();
    },
    async (page) => {
      console.log('  Destroying page');
      await page.close();
    },
    3 // max 3 pages
  );

  try {
    // Acquire pages from pool
    console.log('Acquiring pages...');
    const page1 = await pagePool.acquire();
    const page2 = await pagePool.acquire();

    console.log(`Pool stats: ${JSON.stringify(pagePool.getStats())}`);

    // Use pages
    await (await page1).goto('https://example.com');
    await (await page2).goto('https://httpbin.org/html');

    // Release pages back to pool
    console.log('\nReleasing pages...');
    pagePool.release(await page1);
    pagePool.release(await page2);

    console.log(`Pool stats: ${JSON.stringify(pagePool.getStats())}`);

    // Reuse from pool (no new creation)
    console.log('\nReusing page from pool...');
    const page3 = await pagePool.acquire();
    console.log(`Reused: ${page3 === (await page1) || page3 === (await page2)}`);

    pagePool.release(await page3);

    // Cleanup
    console.log('\nDisposing pool...');
    pagePool.disposeAll();
  } finally {
    await browser.close();
  }
}

/**
 * Example 7: Batch Processing
 */
async function batchProcessingExample() {
  console.log('\n=== Batch Processing Example ===\n');

  const undetect = new UndetectBrowser();
  const browser = await undetect.launch();
  const page = await browser.newPage();

  try {
    // Batch processor for URL checks
    const batchChecker = new BatchProcessor(
      async (urls: string[]) => {
        console.log(`Processing batch of ${urls.length} URLs`);
        const results = [];

        for (const url of urls) {
          try {
            await page.goto(url, { timeout: 5000 });
            results.push({
              url,
              status: 'success',
              title: await page.title(),
            });
          } catch (error) {
            results.push({
              url,
              status: 'error',
              error: (error as Error).message,
            });
          }
        }

        return results;
      },
      5, // max batch size
      1000 // max wait time
    );

    // Add URLs to batch (automatically batched)
    const urls = [
      'https://example.com',
      'https://example.org',
      'https://httpbin.org/html',
    ];

    console.log('Adding URLs to batch processor...');
    const promises = urls.map((url) => batchChecker.add(url));

    // Wait for batch processing
    const results = await Promise.all(promises);

    console.log('\nBatch Results:');
    results.forEach((result) => {
      console.log(`  ${result.url}: ${result.status}`);
    });
  } finally {
    await browser.close();
  }
}

/**
 * Example 8: Memory Profiling
 */
async function memoryProfilingExample() {
  console.log('\n=== Memory Profiling Example ===\n');

  const profiler = new MemoryProfiler();

  profiler.snapshot('start');

  // Create some objects
  const largeArray = new Array(1000000).fill({ data: 'test' });

  profiler.snapshot('after-array');

  // Do some operations
  const undetect = new UndetectBrowser();
  const browser = await undetect.launch();
  const page = await browser.newPage();

  profiler.snapshot('after-browser');

  await page.goto('https://example.com');

  profiler.snapshot('after-navigation');

  await browser.close();

  profiler.snapshot('after-close');

  // Show memory usage
  profiler.logSummary();

  // Clean up
  largeArray.length = 0;
}

/**
 * Example 9: Async Memoization
 */
async function asyncMemoizationExample() {
  console.log('\n=== Async Memoization Example ===\n');

  let fetchCount = 0;

  // Expensive async operation
  async function fetchPageTitle(url: string): Promise<string> {
    fetchCount++;
    console.log(`  Fetching (${fetchCount}): ${url}`);

    const undetect = new UndetectBrowser();
    const browser = await undetect.launch();
    const page = await browser.newPage();

    try {
      await page.goto(url);
      return await page.title();
    } finally {
      await browser.close();
    }
  }

  // Memoize async function
  const memoizedFetch = memoizeAsync(fetchPageTitle);

  // First call - fetches
  console.log('First call:');
  const title1 = await memoizedFetch('https://example.com');
  console.log(`Result: ${title1}\n`);

  // Second call - cached
  console.log('Second call (should be instant):');
  const title2 = await memoizedFetch('https://example.com');
  console.log(`Result: ${title2}\n`);

  console.log(`Total fetches: ${fetchCount} (should be 1)`);
  console.log(`Same result: ${title1 === title2}`);
}

/**
 * Example 10: Global Performance Monitor
 */
async function globalPerformanceExample() {
  console.log('\n=== Global Performance Monitor Example ===\n');

  const undetect = new UndetectBrowser();
  const browser = await undetect.launch();

  try {
    performanceMonitor.startTimer('total-session');

    const page = await browser.newPage();

    // Measure multiple operations
    performanceMonitor.startTimer('setup');
    await page.setViewport({ width: 1920, height: 1080 });
    performanceMonitor.endTimer('setup');

    performanceMonitor.startTimer('navigation');
    await page.goto('https://example.com');
    performanceMonitor.endTimer('navigation', { url: 'example.com' });

    performanceMonitor.startTimer('interaction');
    await page.evaluate(() => document.title);
    performanceMonitor.endTimer('interaction');

    performanceMonitor.endTimer('total-session');

    // Show all stats
    console.log('\nGlobal Performance Stats:');
    performanceMonitor.logSummary();

    await page.close();
  } finally {
    await browser.close();
  }
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Performance Optimization Examples');
  console.log('='.repeat(80));

  try {
    await memoizationExample();
    await lruCacheExample();
    await performanceMonitoringExample();
    await debounceThrottleExample();
    await lazyInitializationExample();
    await resourcePoolExample();
    await batchProcessingExample();
    await memoryProfilingExample();
    await asyncMemoizationExample();
    await globalPerformanceExample();

    console.log('\n' + '='.repeat(80));
    console.log('All performance examples completed successfully!');
    console.log('='.repeat(80) + '\n');
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
  memoizationExample,
  lruCacheExample,
  performanceMonitoringExample,
  debounceThrottleExample,
  lazyInitializationExample,
  resourcePoolExample,
  batchProcessingExample,
  memoryProfilingExample,
  asyncMemoizationExample,
  globalPerformanceExample,
};
