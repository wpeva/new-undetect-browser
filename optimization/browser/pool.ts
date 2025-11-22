/**
 * Browser Pool
 *
 * Maintains a pool of pre-launched "warm" browsers for instant availability.
 * Eliminates 2-3 second cold start time.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { EventEmitter } from 'events';

export interface BrowserPoolOptions {
  poolSize: number;           // Number of warm browsers to maintain
  maxBrowsers: number;        // Maximum total browsers
  idleTimeout: number;        // Milliseconds before idle browser is closed
  launchOptions?: any;        // Puppeteer launch options
  enableMetrics?: boolean;    // Track pool metrics
}

export interface PoolMetrics {
  totalLaunched: number;
  totalClosed: number;
  currentWarm: number;
  currentActive: number;
  avgGetTime: number;         // Average time to get browser (ms)
  avgLaunchTime: number;      // Average launch time (ms)
}

interface PooledBrowser {
  browser: Browser;
  createdAt: number;
  lastUsed: number;
  usageCount: number;
}

export class BrowserPool extends EventEmitter {
  private warmBrowsers: PooledBrowser[] = [];
  private activeBrowsers = new Map<Browser, PooledBrowser>();
  private metrics: PoolMetrics;
  private maintenanceInterval: NodeJS.Timer | null = null;

  constructor(private options: BrowserPoolOptions) {
    super();

    this.metrics = {
      totalLaunched: 0,
      totalClosed: 0,
      currentWarm: 0,
      currentActive: 0,
      avgGetTime: 0,
      avgLaunchTime: 0
    };
  }

  /**
   * Initialize pool with warm browsers
   */
  async initialize(): Promise<void> {
    console.log(`Initializing browser pool (size: ${this.options.poolSize})...`);

    // Launch initial browsers in parallel
    const launches = [];
    for (let i = 0; i < this.options.poolSize; i++) {
      launches.push(this.launchBrowser());
    }

    const browsers = await Promise.all(launches);
    this.warmBrowsers = browsers;
    this.metrics.currentWarm = browsers.length;

    console.log(`Browser pool ready with ${browsers.length} warm browsers`);

    // Start maintenance loop
    this.startMaintenance();

    this.emit('initialized', { count: browsers.length });
  }

  /**
   * Get browser from pool (instant if available)
   */
  async getBrowser(): Promise<Browser> {
    const startTime = Date.now();

    // Get from warm pool (fast path)
    if (this.warmBrowsers.length > 0) {
      const pooled = this.warmBrowsers.pop()!;
      pooled.lastUsed = Date.now();
      pooled.usageCount++;

      this.activeBrowsers.set(pooled.browser, pooled);
      this.metrics.currentWarm = this.warmBrowsers.length;
      this.metrics.currentActive = this.activeBrowsers.size;

      // Replenish pool in background
      this.replenishPool();

      const getTime = Date.now() - startTime;
      this.updateAvgGetTime(getTime);

      this.emit('acquired', {
        source: 'pool',
        time: getTime,
        poolSize: this.warmBrowsers.length
      });

      return pooled.browser;
    }

    // Pool is empty - launch new browser (slow path)
    console.warn('Browser pool exhausted, launching new browser');

    const pooled = await this.launchBrowser();
    pooled.lastUsed = Date.now();
    pooled.usageCount++;

    this.activeBrowsers.set(pooled.browser, pooled);
    this.metrics.currentActive = this.activeBrowsers.size;

    const getTime = Date.now() - startTime;
    this.updateAvgGetTime(getTime);

    this.emit('acquired', {
      source: 'new',
      time: getTime,
      poolSize: this.warmBrowsers.length
    });

    // Replenish pool in background
    this.replenishPool();

    return pooled.browser;
  }

  /**
   * Release browser back to pool
   */
  async releaseBrowser(browser: Browser): Promise<void> {
    const pooled = this.activeBrowsers.get(browser);
    if (!pooled) {
      console.warn('Attempted to release browser not in pool');
      return;
    }

    this.activeBrowsers.delete(browser);
    this.metrics.currentActive = this.activeBrowsers.size;

    // Check if browser is healthy
    const isHealthy = await this.checkBrowserHealth(browser);
    if (!isHealthy) {
      await this.closeBrowser(pooled);
      this.replenishPool();
      return;
    }

    // Check if browser has been used too many times
    const maxUsage = 100;  // Restart after 100 uses
    if (pooled.usageCount >= maxUsage) {
      console.log(`Browser reached max usage (${maxUsage}), restarting`);
      await this.closeBrowser(pooled);
      this.replenishPool();
      return;
    }

    // Check if browser is too old
    const maxAge = 60 * 60 * 1000;  // 1 hour
    const age = Date.now() - pooled.createdAt;
    if (age >= maxAge) {
      console.log(`Browser reached max age (${maxAge}ms), restarting`);
      await this.closeBrowser(pooled);
      this.replenishPool();
      return;
    }

    // Return to warm pool
    pooled.lastUsed = Date.now();
    this.warmBrowsers.push(pooled);
    this.metrics.currentWarm = this.warmBrowsers.length;

    this.emit('released', {
      poolSize: this.warmBrowsers.length,
      usageCount: pooled.usageCount
    });
  }

  /**
   * Close specific browser
   */
  private async closeBrowser(pooled: PooledBrowser): Promise<void> {
    try {
      await pooled.browser.close();
      this.metrics.totalClosed++;

      this.emit('closed', {
        age: Date.now() - pooled.createdAt,
        usageCount: pooled.usageCount
      });
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }

  /**
   * Launch new browser
   */
  private async launchBrowser(): Promise<PooledBrowser> {
    const startTime = Date.now();

    const browser = await puppeteer.launch({
      headless: true,
      ...this.options.launchOptions,
      args: this.getOptimizedArgs()
    });

    const launchTime = Date.now() - startTime;
    this.updateAvgLaunchTime(launchTime);

    this.metrics.totalLaunched++;

    this.emit('launched', {
      time: launchTime,
      total: this.metrics.totalLaunched
    });

    return {
      browser,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      usageCount: 0
    };
  }

  /**
   * Get optimized Chrome args
   */
  private getOptimizedArgs(): string[] {
    return [
      // Disable unnecessary features
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',

      // Performance
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',

      // Memory limits
      '--max-old-space-size=512',
      '--js-flags=--max-old-space-size=512',

      // Disable unnecessary features
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-sync',

      // Faster startup
      '--disable-background-networking',
      '--disable-client-side-phishing-detection',
      '--disable-hang-monitor',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--metrics-recording-only',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',

      // Security (but faster)
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security'
    ];
  }

  /**
   * Check if browser is healthy
   */
  private async checkBrowserHealth(browser: Browser): Promise<boolean> {
    try {
      const version = await browser.version();
      return !!version;
    } catch (error) {
      return false;
    }
  }

  /**
   * Replenish pool to target size
   */
  private async replenishPool(): Promise<void> {
    const needed = this.options.poolSize - this.warmBrowsers.length;
    if (needed <= 0) return;

    const total = this.warmBrowsers.length + this.activeBrowsers.size;
    if (total >= this.options.maxBrowsers) {
      console.warn(`Max browsers limit reached (${this.options.maxBrowsers})`);
      return;
    }

    // Launch browsers in background
    const toLaunch = Math.min(needed, this.options.maxBrowsers - total);
    for (let i = 0; i < toLaunch; i++) {
      this.launchBrowser()
        .then(pooled => {
          this.warmBrowsers.push(pooled);
          this.metrics.currentWarm = this.warmBrowsers.length;
        })
        .catch(error => {
          console.error('Error replenishing pool:', error);
        });
    }
  }

  /**
   * Maintenance loop - close idle browsers
   */
  private startMaintenance(): void {
    this.maintenanceInterval = setInterval(() => {
      this.runMaintenance();
    }, 60000);  // Every minute
  }

  private async runMaintenance(): Promise<void> {
    const now = Date.now();
    const toClose: PooledBrowser[] = [];

    // Find idle browsers
    for (const pooled of this.warmBrowsers) {
      const idleTime = now - pooled.lastUsed;
      if (idleTime >= this.options.idleTimeout) {
        toClose.push(pooled);
      }
    }

    // Close idle browsers
    for (const pooled of toClose) {
      const index = this.warmBrowsers.indexOf(pooled);
      if (index !== -1) {
        this.warmBrowsers.splice(index, 1);
        await this.closeBrowser(pooled);
      }
    }

    if (toClose.length > 0) {
      console.log(`Closed ${toClose.length} idle browsers`);
      this.metrics.currentWarm = this.warmBrowsers.length;
      this.emit('maintenance', { closed: toClose.length });
    }
  }

  /**
   * Get pool metrics
   */
  getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Get pool status
   */
  getStatus(): {
    warm: number;
    active: number;
    total: number;
    utilization: number;
  } {
    const total = this.warmBrowsers.length + this.activeBrowsers.size;
    return {
      warm: this.warmBrowsers.length,
      active: this.activeBrowsers.size,
      total,
      utilization: total / this.options.maxBrowsers
    };
  }

  /**
   * Close all browsers and stop pool
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down browser pool...');

    // Stop maintenance
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
    }

    // Close all browsers
    const allBrowsers = [
      ...this.warmBrowsers,
      ...Array.from(this.activeBrowsers.values())
    ];

    await Promise.all(allBrowsers.map(pooled => this.closeBrowser(pooled)));

    this.warmBrowsers = [];
    this.activeBrowsers.clear();
    this.metrics.currentWarm = 0;
    this.metrics.currentActive = 0;

    console.log('Browser pool shut down');
    this.emit('shutdown');
  }

  /**
   * Update average get time
   */
  private updateAvgGetTime(time: number): void {
    const total = this.metrics.totalLaunched + this.metrics.totalClosed;
    if (total === 0) {
      this.metrics.avgGetTime = time;
    } else {
      this.metrics.avgGetTime = (this.metrics.avgGetTime * (total - 1) + time) / total;
    }
  }

  /**
   * Update average launch time
   */
  private updateAvgLaunchTime(time: number): void {
    const count = this.metrics.totalLaunched;
    if (count === 1) {
      this.metrics.avgLaunchTime = time;
    } else {
      this.metrics.avgLaunchTime = (this.metrics.avgLaunchTime * (count - 1) + time) / count;
    }
  }
}

// Example usage:
/*
const pool = new BrowserPool({
  poolSize: 10,         // Maintain 10 warm browsers
  maxBrowsers: 50,      // Max 50 total browsers
  idleTimeout: 300000,  // Close after 5 minutes idle
  enableMetrics: true
});

await pool.initialize();

// Get browser (instant from pool)
const browser = await pool.getBrowser();  // ~10ms vs ~2000ms cold start

// Use browser...
const page = await browser.newPage();
await page.goto('https://example.com');

// Release back to pool
await pool.releaseBrowser(browser);

// Metrics
const metrics = pool.getMetrics();
console.log(`Avg get time: ${metrics.avgGetTime}ms`);
console.log(`Avg launch time: ${metrics.avgLaunchTime}ms`);
console.log(`Pool size: ${pool.getStatus().warm}`);

// Shutdown
await pool.shutdown();
*/
