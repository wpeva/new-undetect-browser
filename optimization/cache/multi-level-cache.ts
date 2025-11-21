/**
 * Multi-Level Cache System
 *
 * Implements L1 (in-memory), L2 (Redis), and L3 (CDN) caching layers
 * for maximum performance and minimal latency.
 */

import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { compress, decompress } from '../utils/compression';

export interface CacheOptions {
  l1?: {
    enabled: boolean;
    ttl: number;          // seconds
    maxKeys: number;
  };
  l2?: {
    enabled: boolean;
    ttl: number;          // seconds
    compression: boolean;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

export interface CacheStats {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
}

export class MultiLevelCache {
  private l1Cache: NodeCache | null = null;
  private l2Cache: Redis | null = null;
  private stats: CacheStats;

  constructor(private options: CacheOptions) {
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0
    };

    this.initialize();
  }

  private initialize() {
    // Initialize L1 (in-memory) cache
    if (this.options.l1?.enabled) {
      this.l1Cache = new NodeCache({
        stdTTL: this.options.l1.ttl,
        checkperiod: Math.floor(this.options.l1.ttl / 10),
        useClones: false,  // Don't clone objects (faster)
        maxKeys: this.options.l1.maxKeys
      });

      console.log('L1 cache initialized (in-memory)');
    }

    // Initialize L2 (Redis) cache
    if (this.options.l2?.enabled && this.options.redis) {
      this.l2Cache = new Redis({
        ...this.options.redis,
        keyPrefix: 'cache:',
        lazyConnect: false,
        keepAlive: 30000,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 2000);
        }
      });

      this.l2Cache.on('error', (err) => {
        console.error('Redis cache error:', err);
      });

      console.log('L2 cache initialized (Redis)');
    }
  }

  /**
   * Get value from cache (checks L1, then L2)
   */
  async get<T>(key: string): Promise<T | null> {
    // Check L1 cache first
    if (this.l1Cache) {
      const value = this.l1Cache.get<T>(key);
      if (value !== undefined) {
        this.stats.l1Hits++;
        this.stats.totalHits++;
        this.updateHitRate();
        return value;
      }
      this.stats.l1Misses++;
    }

    // Check L2 cache
    if (this.l2Cache) {
      try {
        const cached = await this.l2Cache.get(key);
        if (cached) {
          this.stats.l2Hits++;
          this.stats.totalHits++;

          // Deserialize value
          let value: T;
          if (this.options.l2?.compression) {
            const decompressed = await decompress(Buffer.from(cached, 'base64'));
            value = JSON.parse(decompressed.toString());
          } else {
            value = JSON.parse(cached);
          }

          // Populate L1 cache
          if (this.l1Cache) {
            this.l1Cache.set(key, value);
          }

          this.updateHitRate();
          return value;
        }
        this.stats.l2Misses++;
      } catch (error) {
        console.error('L2 cache get error:', error);
        this.stats.l2Misses++;
      }
    }

    this.stats.totalMisses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Set value in cache (writes to both L1 and L2)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Set in L1 cache
    if (this.l1Cache) {
      const l1TTL = ttl || this.options.l1?.ttl || 300;
      this.l1Cache.set(key, value, l1TTL);
    }

    // Set in L2 cache
    if (this.l2Cache) {
      try {
        const l2TTL = ttl || this.options.l2?.ttl || 3600;

        // Serialize value
        let serialized: string;
        if (this.options.l2?.compression) {
          const compressed = await compress(Buffer.from(JSON.stringify(value)));
          serialized = compressed.toString('base64');
        } else {
          serialized = JSON.stringify(value);
        }

        await this.l2Cache.set(key, serialized, 'EX', l2TTL);
      } catch (error) {
        console.error('L2 cache set error:', error);
      }
    }
  }

  /**
   * Delete key from all cache levels
   */
  async delete(key: string): Promise<void> {
    if (this.l1Cache) {
      this.l1Cache.del(key);
    }

    if (this.l2Cache) {
      try {
        await this.l2Cache.del(key);
      } catch (error) {
        console.error('L2 cache delete error:', error);
      }
    }
  }

  /**
   * Delete keys matching pattern (L2 only)
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.l2Cache) return 0;

    try {
      const keys = await this.l2Cache.keys(pattern);
      if (keys.length === 0) return 0;

      await this.l2Cache.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('L2 cache deletePattern error:', error);
      return 0;
    }
  }

  /**
   * Wrap function with caching
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const value = await fn();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0
    };
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    if (this.l1Cache) {
      this.l1Cache.flushAll();
    }

    if (this.l2Cache) {
      try {
        await this.l2Cache.flushdb();
      } catch (error) {
        console.error('L2 cache clear error:', error);
      }
    }
  }

  /**
   * Close cache connections
   */
  async close(): Promise<void> {
    if (this.l1Cache) {
      this.l1Cache.close();
    }

    if (this.l2Cache) {
      await this.l2Cache.quit();
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
  }

  /**
   * Get cache size
   */
  getCacheSize(): { l1: number; l2?: number } {
    const result: { l1: number; l2?: number } = {
      l1: this.l1Cache ? this.l1Cache.keys().length : 0
    };

    return result;
  }
}

// Example usage:
/*
const cache = new MultiLevelCache({
  l1: {
    enabled: true,
    ttl: 300,        // 5 minutes
    maxKeys: 10000
  },
  l2: {
    enabled: true,
    ttl: 3600,       // 1 hour
    compression: true
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'password',
    db: 0
  }
});

// Get with automatic fallback
const profile = await cache.wrap('profile:123', async () => {
  return await profileGenerator.generate();  // Expensive operation
}, 3600);

// Direct get/set
await cache.set('key', { data: 'value' }, 300);
const value = await cache.get('key');

// Statistics
const stats = cache.getStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`L1 hits: ${stats.l1Hits}, L2 hits: ${stats.l2Hits}`);
*/
