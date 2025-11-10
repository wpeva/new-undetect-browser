/**
 * Performance Optimizer
 * Advanced performance optimization utilities
 */

import { logger } from './logger';

/**
 * Module-level cache for expensive operations
 */
class ModuleCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  private ttl: number;
  private timestamps = new Map<K, number>();

  constructor(maxSize = 100, ttlMs = 300000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: K): V | undefined {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return undefined;
    }
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.timestamps.entries().next().value?.[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.timestamps.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Lazy initialization wrapper
 */
export class LazyInit<T> {
  private value: T | undefined;
  private initialized = false;
  private initPromise: Promise<T> | undefined;
  private factory: () => T | Promise<T>;

  constructor(factory: () => T | Promise<T>) {
    this.factory = factory;
  }

  async get(): Promise<T> {
    if (this.initialized && this.value !== undefined) {
      return this.value;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = Promise.resolve(this.factory()).then((value) => {
      this.value = value;
      this.initialized = true;
      this.initPromise = undefined;
      return value;
    });

    return this.initPromise;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  reset(): void {
    this.value = undefined;
    this.initialized = false;
    this.initPromise = undefined;
  }
}

/**
 * Batch processor for operations
 */
export class BatchProcessor<T, R> {
  private queue: Array<{ item: T; resolve: (result: R) => void; reject: (error: Error) => void }> = [];
  private processor: (items: T[]) => Promise<R[]>;
  private maxBatchSize: number;
  private maxWaitMs: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    options: { maxBatchSize?: number; maxWaitMs?: number } = {}
  ) {
    this.processor = processor;
    this.maxBatchSize = options.maxBatchSize || 10;
    this.maxWaitMs = options.maxWaitMs || 50;
  }

  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });

      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.maxWaitMs);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) {return;}

    const batch = this.queue.splice(0, this.queue.length);
    const items = batch.map((b) => b.item);

    try {
      const results = await this.processor(items);
      batch.forEach((b, i) => b.resolve(results[i]));
    } catch (error) {
      batch.forEach((b) => b.reject(error as Error));
    }
  }
}

/**
 * Debounced executor
 */
export function createDebounced<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): T & { cancel: () => void } {
  let timer: NodeJS.Timeout | null = null;

  const debounced = function (this: any, ...args: any[]) {
    if (timer) {clearTimeout(timer);}
    return new Promise((resolve) => {
      timer = setTimeout(() => {
        resolve(fn.apply(this, args));
      }, delayMs);
    });
  };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced as T & { cancel: () => void };
}

/**
 * Throttled executor
 */
export function createThrottled<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number
): T {
  let lastRun = 0;
  let timer: NodeJS.Timeout | null = null;

  return function (this: any, ...args: any[]) {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun;

    if (timeSinceLastRun >= limitMs) {
      lastRun = now;
      return fn.apply(this, args);
    }

    if (timer) {clearTimeout(timer);}
    return new Promise((resolve) => {
      timer = setTimeout(() => {
        lastRun = Date.now();
        resolve(fn.apply(this, args));
      }, limitMs - timeSinceLastRun);
    });
  } as T;
}

/**
 * Memory-efficient object pool
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (obj: T) => void, maxSize = 10) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    let obj = this.available.pop();
    if (!obj) {
      obj = this.factory();
    }
    this.inUse.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.inUse.has(obj)) {return;}

    this.inUse.delete(obj);
    this.reset(obj);

    if (this.available.length < this.maxSize) {
      this.available.push(obj);
    }
  }

  clear(): void {
    this.available = [];
    this.inUse.clear();
  }

  stats(): { available: number; inUse: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
    };
  }
}

/**
 * Performance monitoring decorator
 */
export function measurePerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = performance.now();
    try {
      const result = await originalMethod.apply(this, args);
      const duration = performance.now() - start;

      if (duration > 100) {
        logger.warn(`Slow operation detected: ${propertyKey} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`Operation failed: ${propertyKey} after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  };

  return descriptor;
}

/**
 * Global fingerprint cache
 */
export const fingerprintCache = new ModuleCache<string, any>(50, 600000); // 10 minutes TTL

/**
 * Global stealth script cache
 */
export const stealthScriptCache = new ModuleCache<string, string>(20, 3600000); // 1 hour TTL

/**
 * Optimization metrics
 */
class OptimizationMetrics {
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    totalOperations: 0,
    avgOperationTime: 0,
    slowOperations: 0,
  };

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  recordOperation(durationMs: number): void {
    this.metrics.totalOperations++;
    this.metrics.avgOperationTime =
      (this.metrics.avgOperationTime * (this.metrics.totalOperations - 1) + durationMs) /
      this.metrics.totalOperations;

    if (durationMs > 100) {
      this.metrics.slowOperations++;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
    };
  }

  reset(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalOperations: 0,
      avgOperationTime: 0,
      slowOperations: 0,
    };
  }
}

export const optimizationMetrics = new OptimizationMetrics();

/**
 * Resource cleanup helper
 */
export class ResourceManager {
  private resources: Array<() => void | Promise<void>> = [];

  register(cleanup: () => void | Promise<void>): void {
    this.resources.push(cleanup);
  }

  async cleanup(): Promise<void> {
    const cleanupPromises = this.resources.map((fn) => Promise.resolve(fn()));
    await Promise.allSettled(cleanupPromises);
    this.resources = [];
  }

  size(): number {
    return this.resources.length;
  }
}

/**
 * Memory usage monitor
 */
export function getMemoryUsage(): {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
} {
  const mem = process.memoryUsage();
  return {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024), // MB
    external: Math.round(mem.external / 1024 / 1024), // MB
    rss: Math.round(mem.rss / 1024 / 1024), // MB
  };
}

/**
 * Log memory usage
 */
export function logMemoryUsage(label = 'Memory'): void {
  const mem = getMemoryUsage();
  logger.debug(`${label}: Heap ${mem.heapUsed}/${mem.heapTotal}MB, RSS ${mem.rss}MB`);
}

/**
 * Optimize module exports for tree-shaking
 */
export const PerformanceOptimizer = {
  ModuleCache,
  LazyInit,
  BatchProcessor,
  createDebounced,
  createThrottled,
  ObjectPool,
  fingerprintCache,
  stealthScriptCache,
  optimizationMetrics,
  ResourceManager,
  getMemoryUsage,
  logMemoryUsage,
};
