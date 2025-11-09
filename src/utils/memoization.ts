/**
 * Memoization and Caching Utilities
 * Optimizes performance by caching expensive computations
 */

/**
 * Simple memoization for functions with single argument
 */
export function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
  const cache = new Map<T, R>();

  return (arg: T): R => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }

    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

/**
 * Memoization with custom key generator
 */
export function memoizeWithKey<T extends unknown[], R>(
  fn: (...args: T) => R,
  keyGenerator: (...args: T) => string
): (...args: T) => R {
  const cache = new Map<string, R>();

  return (...args: T): R => {
    const key = keyGenerator(...args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Memoization for async functions
 */
export function memoizeAsync<T, R>(
  fn: (arg: T) => Promise<R>
): (arg: T) => Promise<R> {
  const cache = new Map<T, Promise<R>>();

  return async (arg: T): Promise<R> => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }

    const promise = fn(arg);
    cache.set(arg, promise);

    try {
      const result = await promise;
      return result;
    } catch (error) {
      // Remove failed promise from cache
      cache.delete(arg);
      throw error;
    }
  };
}

/**
 * Time-based cache entry
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

/**
 * LRU (Least Recently Used) Cache
 */
export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize: number = 100, ttlMs: number = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Update hit count and timestamp
    entry.hits++;
    entry.timestamp = Date.now();

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Check if key exists
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete entry
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    hitRate: number;
    entries: Array<{ key: K; hits: number; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: now - entry.timestamp,
    }));

    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const hitRate = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      hitRate,
      entries,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

/**
 * Debounce function execution
 */
export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delayMs: number
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: T): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  delayMs: number
): (...args: T) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: T): void => {
    const now = Date.now();

    if (now - lastCall >= delayMs) {
      lastCall = now;
      fn(...args);
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
        timeoutId = null;
      }, delayMs - (now - lastCall));
    }
  };
}

/**
 * Once function - executes only once
 */
export function once<T extends unknown[], R>(
  fn: (...args: T) => R
): (...args: T) => R {
  let called = false;
  let result: R;

  return (...args: T): R => {
    if (!called) {
      result = fn(...args);
      called = true;
    }
    return result;
  };
}

/**
 * Lazy initialization
 */
export class Lazy<T> {
  private value: T | undefined;
  private initialized = false;

  constructor(private readonly initializer: () => T) {}

  /**
   * Get value, initializing if needed
   */
  getValue(): T {
    if (!this.initialized) {
      this.value = this.initializer();
      this.initialized = true;
    }
    return this.value!;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset lazy value
   */
  reset(): void {
    this.value = undefined;
    this.initialized = false;
  }
}

/**
 * Batch processing for reducing overhead
 */
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    private readonly processor: (items: T[]) => Promise<R[]>,
    private readonly maxBatchSize: number = 10,
    private readonly maxWaitMs: number = 100
  ) {}

  /**
   * Add item to batch for processing
   */
  async add(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const index = this.batch.length;
      this.batch.push(item);

      // Schedule processing
      if (!this.timeoutId) {
        this.timeoutId = setTimeout(() => this.flush(), this.maxWaitMs);
      }

      // Process immediately if batch is full
      if (this.batch.length >= this.maxBatchSize) {
        this.flush().then((results) => {
          resolve(results[index]);
        }).catch(reject);
      } else {
        // Store resolver for later
        const checkResults = () => {
          this.processor(this.batch)
            .then((results) => resolve(results[index]))
            .catch(reject);
        };

        setTimeout(checkResults, this.maxWaitMs + 10);
      }
    });
  }

  /**
   * Process current batch immediately
   */
  private async flush(): Promise<R[]> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.batch.length === 0) {
      return [];
    }

    const currentBatch = this.batch;
    this.batch = [];

    return this.processor(currentBatch);
  }

  /**
   * Get current batch size
   */
  getBatchSize(): number {
    return this.batch.length;
  }
}

/**
 * Resource pool for reusing expensive objects
 */
export class ResourcePool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();

  constructor(
    private readonly factory: () => T,
    private readonly destructor: (resource: T) => void,
    private readonly maxSize: number = 10
  ) {}

  /**
   * Acquire resource from pool
   */
  async acquire(): Promise<T> {
    let resource: T;

    if (this.available.length > 0) {
      resource = this.available.pop()!;
    } else if (this.inUse.size < this.maxSize) {
      resource = this.factory();
    } else {
      // Wait for resource to become available
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.acquire();
    }

    this.inUse.add(resource);
    return resource;
  }

  /**
   * Release resource back to pool
   */
  release(resource: T): void {
    if (!this.inUse.has(resource)) {
      return;
    }

    this.inUse.delete(resource);
    this.available.push(resource);
  }

  /**
   * Destroy resource
   */
  destroy(resource: T): void {
    this.inUse.delete(resource);
    const index = this.available.indexOf(resource);
    if (index !== -1) {
      this.available.splice(index, 1);
    }
    this.destructor(resource);
  }

  /**
   * Dispose all resources
   */
  disposeAll(): void {
    for (const resource of this.available) {
      this.destructor(resource);
    }
    for (const resource of this.inUse) {
      this.destructor(resource);
    }
    this.available = [];
    this.inUse.clear();
  }

  /**
   * Get pool statistics
   */
  getStats(): { available: number; inUse: number; total: number; maxSize: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
      maxSize: this.maxSize,
    };
  }
}
