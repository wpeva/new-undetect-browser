/**
 * Connection Pool
 *
 * Maintains pools of reusable HTTP/HTTPS and database connections
 * to eliminate connection overhead (TCP + TLS handshake).
 */

import http from 'http';
import https from 'https';
import { Pool as PgPool, PoolConfig } from 'pg';
import Redis from 'ioredis';

/**
 * HTTP/HTTPS connection pool configuration
 */
export interface HttpPoolOptions {
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  maxSockets?: number;
  maxFreeSockets?: number;
  timeout?: number;
}

/**
 * Create HTTP agent with connection pooling
 */
export function createHttpAgent(options: HttpPoolOptions = {}): http.Agent {
  return new http.Agent({
    keepAlive: options.keepAlive !== false,
    keepAliveMsecs: options.keepAliveMsecs || 30000,
    maxSockets: options.maxSockets || 50,
    maxFreeSockets: options.maxFreeSockets || 10,
    timeout: options.timeout || 60000
  });
}

/**
 * Create HTTPS agent with connection pooling
 */
export function createHttpsAgent(options: HttpPoolOptions = {}): https.Agent {
  return new https.Agent({
    keepAlive: options.keepAlive !== false,
    keepAliveMsecs: options.keepAliveMsecs || 30000,
    maxSockets: options.maxSockets || 50,
    maxFreeSockets: options.maxFreeSockets || 10,
    timeout: options.timeout || 60000
  });
}

/**
 * PostgreSQL connection pool
 */
export class PostgresPool {
  private pool: PgPool;

  constructor(config: PoolConfig) {
    this.pool = new PgPool({
      ...config,
      // Pool configuration
      min: config.min || 5,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,

      // Performance
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    });

    // Error handling
    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });

    this.pool.on('connect', () => {
      console.log('PostgreSQL client connected');
    });

    this.pool.on('remove', () => {
      console.log('PostgreSQL client removed');
    });
  }

  /**
   * Execute query
   */
  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Query executed', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Query error', { text, error });
      throw error;
    }
  }

  /**
   * Get client for transaction
   */
  async getClient() {
    return await this.pool.connect();
  }

  /**
   * Get pool stats
   */
  getStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }

  /**
   * Close pool
   */
  async close() {
    await this.pool.end();
  }
}

/**
 * Redis connection pool (cluster)
 */
export class RedisPool {
// @ts-ignore - Redis namespace usage is valid
  private cluster: Redis.Cluster;

  constructor(nodes: Array<{ host: string; port: number }>, options: any = {}) {
    this.cluster = new Redis.Cluster(nodes, {
      redisOptions: {
        password: options.password,
        db: options.db || 0
      },

      // Connection pool
      clusterRetryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 2000);
      },
      enableReadyCheck: true,
// @ts-ignore - maxRetriesPerRequest is valid option
      maxRetriesPerRequest: 3,

      // Performance
      lazyConnect: false,
      keepAlive: 30000,
      enableOfflineQueue: false,

      // Cluster options
      scaleReads: 'slave',  // Read from slaves
      maxRedirections: 16
    });

    // Error handling
    this.cluster.on('error', (err) => {
      console.error('Redis cluster error:', err);
    });

    this.cluster.on('connect', () => {
      console.log('Redis cluster connected');
    });

    this.cluster.on('ready', () => {
      console.log('Redis cluster ready');
    });
  }

  /**
   * Get value
   */
  async get(key: string): Promise<string | null> {
    return await this.cluster.get(key);
  }

  /**
   * Set value
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.cluster.set(key, value, 'EX', ttl);
    } else {
      await this.cluster.set(key, value);
    }
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<void> {
    await this.cluster.del(key);
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    const nodes = this.cluster.nodes('master');

    for (const node of nodes) {
      const nodeKeys = await node.keys(pattern);
      keys.push(...nodeKeys);
    }

    return keys;
  }

  /**
   * Close cluster
   */
  async close() {
    await this.cluster.quit();
  }
}

/**
 * Connection pool manager
 */
export class ConnectionPoolManager {
  private httpAgent: http.Agent;
  private httpsAgent: https.Agent;
  private pgPool: PostgresPool | null = null;
  private redisPool: RedisPool | null = null;

  constructor() {
    // Create HTTP/HTTPS agents
    this.httpAgent = createHttpAgent();
    this.httpsAgent = createHttpsAgent();
  }

  /**
   * Initialize PostgreSQL pool
   */
  initPostgres(config: PoolConfig) {
    this.pgPool = new PostgresPool(config);
  }

  /**
   * Initialize Redis pool
   */
  initRedis(nodes: Array<{ host: string; port: number }>, options?: any) {
    this.redisPool = new RedisPool(nodes, options);
  }

  /**
   * Get HTTP agent
   */
  getHttpAgent(url: string): http.Agent | https.Agent {
    return url.startsWith('https') ? this.httpsAgent : this.httpAgent;
  }

  /**
   * Get PostgreSQL pool
   */
  getPostgresPool(): PostgresPool {
    if (!this.pgPool) {
      throw new Error('PostgreSQL pool not initialized');
    }
    return this.pgPool;
  }

  /**
   * Get Redis pool
   */
  getRedisPool(): RedisPool {
    if (!this.redisPool) {
      throw new Error('Redis pool not initialized');
    }
    return this.redisPool;
  }

  /**
   * Get all pool stats
   */
  getStats() {
    return {
      http: {
        sockets: (this.httpAgent as any).sockets,
        freeSockets: (this.httpAgent as any).freeSockets
      },
      https: {
        sockets: (this.httpsAgent as any).sockets,
        freeSockets: (this.httpsAgent as any).freeSockets
      },
      postgres: this.pgPool ? this.pgPool.getStats() : null,
      redis: this.redisPool ? 'connected' : null
    };
  }

  /**
   * Close all pools
   */
  async closeAll() {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();

    if (this.pgPool) {
      await this.pgPool.close();
    }

    if (this.redisPool) {
      await this.redisPool.close();
    }
  }
}

// Singleton instance
export const connectionPools = new ConnectionPoolManager();

// Example usage:
/*
// Initialize pools
connectionPools.initPostgres({
  host: 'localhost',
  port: 5432,
  database: 'antidetect',
  user: 'antidetect',
  password: 'password',
  min: 5,
  max: 20
});

connectionPools.initRedis([
  { host: 'redis-1', port: 6379 },
  { host: 'redis-2', port: 6379 },
  { host: 'redis-3', port: 6379 }
], { password: 'password' });

// Use PostgreSQL pool
const pgPool = connectionPools.getPostgresPool();
const result = await pgPool.query('SELECT * FROM sessions WHERE id = $1', ['123']);

// Use Redis pool
const redisPool = connectionPools.getRedisPool();
await redisPool.set('key', 'value', 3600);
const value = await redisPool.get('key');

// Use HTTP agent with fetch/axios
const agent = connectionPools.getHttpAgent('https://example.com');
const response = await fetch('https://example.com', { agent });

// Get stats
const stats = connectionPools.getStats();
console.log('Pool stats:', stats);

// Cleanup
await connectionPools.closeAll();
*/
