/**
 * Session Lifecycle Manager
 *
 * Manages the complete lifecycle of browser sessions including:
 * - Session creation and initialization
 * - Session pooling and recycling
 * - Health monitoring and auto-recovery
 * - Resource limits and cleanup
 * - Profile management integration
 *
 * Features:
 * - Automatic session recycling
 * - Health checks with auto-restart
 * - Memory and CPU monitoring
 * - Session warmup pool
 * - Graceful degradation
 */

import { Browser, Page } from 'puppeteer';
import { EventEmitter } from 'events';
import { BrowserFingerprint } from '../../src/types';

// ========== Types ==========
export interface SessionConfig {
  fingerprint?: Partial<BrowserFingerprint>;
  profileId?: string;
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  proxy?: string;
  stealthLevel?: 'basic' | 'moderate' | 'advanced' | 'paranoid';
  timeout?: number;
  maxPages?: number;
  enableRecording?: boolean;
}

export interface Session {
  id: string;
  browser: Browser;
  pages: Page[];
  config: SessionConfig;
  createdAt: Date;
  lastActivity: Date;
  cdpUrl: string;
  status: SessionStatus;
  metadata: SessionMetadata;
}

export enum SessionStatus {
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  IDLE = 'idle',
  UNHEALTHY = 'unhealthy',
  CLOSING = 'closing',
  CLOSED = 'closed',
}

export interface SessionMetadata {
  requestCount: number;
  errorCount: number;
  memoryUsage: number;
  cpuUsage: number;
  lastHealthCheck: Date;
  pageLoadTime: number[];
}

export interface SessionManagerConfig {
  maxSessions: number;
  sessionTimeout: number;
  healthCheckInterval: number;
  warmPoolSize: number;
  maxRequestsPerSession: number;
  memoryThreshold: number; // MB
  enableAutoRecycle: boolean;
  enableHealthChecks: boolean;
}

export interface SessionStats {
  total: number;
  active: number;
  idle: number;
  unhealthy: number;
  warmPool: number;
  avgLifetime: number;
  totalRequests: number;
  totalErrors: number;
}

// ========== Session Manager ==========
export class SessionManager extends EventEmitter {
  private sessions = new Map<string, Session>();
  private warmPool: Session[] = [];
  private config: SessionManagerConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private statsInterval?: NodeJS.Timeout;
  private sessionIdCounter = 0;

  // Statistics
  private stats = {
    totalCreated: 0,
    totalDestroyed: 0,
    totalRequests: 0,
    totalErrors: 0,
    lifetimes: [] as number[],
  };

  constructor(config: Partial<SessionManagerConfig> = {}) {
    super();

    this.config = {
      maxSessions: 100,
      sessionTimeout: 1800000, // 30 minutes
      healthCheckInterval: 60000, // 1 minute
      warmPoolSize: 5,
      maxRequestsPerSession: 1000,
      memoryThreshold: 500, // 500 MB
      enableAutoRecycle: true,
      enableHealthChecks: true,
      ...config,
    };

    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }

    this.startStatsCollection();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    this.sessionIdCounter++;
    return `session_${Date.now()}_${this.sessionIdCounter.toString(36).padStart(6, '0')}`;
  }

  /**
   * Create a new session
   */
  async createSession(
    browser: Browser,
    config: SessionConfig,
    cdpUrl: string
  ): Promise<Session> {
    if (this.sessions.size >= this.config.maxSessions) {
      // Try to recycle an idle session
      const recycled = await this.recycleIdleSession();
      if (!recycled) {
        throw new Error(`Maximum sessions (${this.config.maxSessions}) reached`);
      }
    }

    const sessionId = this.generateSessionId();
    const now = new Date();

    const session: Session = {
      id: sessionId,
      browser,
      pages: [],
      config,
      createdAt: now,
      lastActivity: now,
      cdpUrl,
      status: SessionStatus.INITIALIZING,
      metadata: {
        requestCount: 0,
        errorCount: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        lastHealthCheck: now,
        pageLoadTime: [],
      },
    };

    this.sessions.set(sessionId, session);
    this.stats.totalCreated++;

    // Emit event
    this.emit('session:created', session);

    // Initialize session (create first page)
    try {
      const pages = await browser.pages();
      session.pages = pages.length > 0 ? pages : [await browser.newPage()];
      session.status = SessionStatus.ACTIVE;
      this.emit('session:ready', session);
    } catch (error) {
      session.status = SessionStatus.UNHEALTHY;
      this.emit('session:error', { session, error });
      throw error;
    }

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Update session activity
   */
  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      session.metadata.requestCount++;
      this.stats.totalRequests++;

      // Check if session needs recycling
      if (
        this.config.enableAutoRecycle &&
        session.metadata.requestCount >= this.config.maxRequestsPerSession
      ) {
        this.emit('session:recycle-needed', session);
      }
    }
  }

  /**
   * Record error for session
   */
  recordError(sessionId: string, error: Error): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metadata.errorCount++;
      this.stats.totalErrors++;
      this.emit('session:error', { session, error });

      // Mark as unhealthy if too many errors
      if (session.metadata.errorCount > 10) {
        session.status = SessionStatus.UNHEALTHY;
      }
    }
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = SessionStatus.CLOSING;

    try {
      // Close browser
      await session.browser.close();
    } catch (error) {
      console.error(`Error closing browser for session ${sessionId}:`, error);
    }

    // Calculate lifetime
    const lifetime = Date.now() - session.createdAt.getTime();
    this.stats.lifetimes.push(lifetime);
    if (this.stats.lifetimes.length > 1000) {
      this.stats.lifetimes.shift(); // Keep only last 1000
    }

    session.status = SessionStatus.CLOSED;
    this.sessions.delete(sessionId);
    this.stats.totalDestroyed++;

    this.emit('session:destroyed', session);
  }

  /**
   * Recycle idle session
   */
  private async recycleIdleSession(): Promise<boolean> {
    // Find oldest idle session
    let oldestIdle: Session | null = null;
    let oldestTime = Date.now();

    for (const session of this.sessions.values()) {
      if (
        session.status === SessionStatus.IDLE ||
        session.status === SessionStatus.UNHEALTHY
      ) {
        const lastActivity = session.lastActivity.getTime();
        if (lastActivity < oldestTime) {
          oldestTime = lastActivity;
          oldestIdle = session;
        }
      }
    }

    if (oldestIdle) {
      console.log(`Recycling idle session ${oldestIdle.id}`);
      await this.destroySession(oldestIdle.id);
      return true;
    }

    return false;
  }

  /**
   * Health check for a session
   */
  private async checkSessionHealth(session: Session): Promise<boolean> {
    try {
      // Check if browser is still connected
      if (!session.browser.isConnected()) {
        session.status = SessionStatus.UNHEALTHY;
        return false;
      }

      // Check memory usage
      const metrics = await session.browser.metrics();
      const memoryMB = metrics.JSHeapUsedSize / (1024 * 1024);
      session.metadata.memoryUsage = memoryMB;

      if (memoryMB > this.config.memoryThreshold) {
        console.warn(`Session ${session.id} memory usage high: ${memoryMB.toFixed(2)} MB`);
        session.status = SessionStatus.UNHEALTHY;
        return false;
      }

      // Check if pages are responsive
      for (const page of session.pages) {
        try {
          await page.evaluate(() => true);
        } catch (error) {
          console.error(`Session ${session.id} page unresponsive:`, error);
          session.status = SessionStatus.UNHEALTHY;
          return false;
        }
      }

      // Update last health check
      session.metadata.lastHealthCheck = new Date();

      // Update status based on activity
      const idleTime = Date.now() - session.lastActivity.getTime();
      if (idleTime > this.config.sessionTimeout / 2) {
        session.status = SessionStatus.IDLE;
      } else {
        session.status = SessionStatus.ACTIVE;
      }

      return true;
    } catch (error) {
      console.error(`Health check failed for session ${session.id}:`, error);
      session.status = SessionStatus.UNHEALTHY;
      return false;
    }
  }

  /**
   * Start health check interval
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      const sessions = Array.from(this.sessions.values());

      for (const session of sessions) {
        // Skip sessions that are already closing
        if (session.status === SessionStatus.CLOSING) {
          continue;
        }

        // Check health
        const healthy = await this.checkSessionHealth(session);

        // Destroy unhealthy or timed-out sessions
        const idleTime = Date.now() - session.lastActivity.getTime();
        if (!healthy || idleTime > this.config.sessionTimeout) {
          console.log(
            `Destroying session ${session.id} (healthy: ${healthy}, idle: ${idleTime}ms)`
          );
          try {
            await this.destroySession(session.id);
          } catch (error) {
            console.error(`Error destroying session ${session.id}:`, error);
          }
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Start statistics collection
   */
  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      const stats = this.getStats();
      this.emit('stats', stats);
    }, 60000); // Every minute
  }

  /**
   * Get session statistics
   */
  getStats(): SessionStats {
    const sessions = Array.from(this.sessions.values());

    const active = sessions.filter((s) => s.status === SessionStatus.ACTIVE).length;
    const idle = sessions.filter((s) => s.status === SessionStatus.IDLE).length;
    const unhealthy = sessions.filter((s) => s.status === SessionStatus.UNHEALTHY).length;

    const avgLifetime =
      this.stats.lifetimes.length > 0
        ? this.stats.lifetimes.reduce((a, b) => a + b, 0) / this.stats.lifetimes.length
        : 0;

    return {
      total: sessions.length,
      active,
      idle,
      unhealthy,
      warmPool: this.warmPool.length,
      avgLifetime,
      totalRequests: this.stats.totalRequests,
      totalErrors: this.stats.totalErrors,
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down SessionManager...');

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    // Destroy all sessions
    const sessionIds = Array.from(this.sessions.keys());
    const destroyPromises = sessionIds.map((id) =>
      this.destroySession(id).catch((err) =>
        console.error(`Error destroying session ${id}:`, err)
      )
    );

    await Promise.all(destroyPromises);

    console.log('SessionManager shut down');
    this.emit('shutdown');
  }

  /**
   * Get session count by status
   */
  getSessionCountByStatus(): Record<SessionStatus, number> {
    const counts: Record<SessionStatus, number> = {
      [SessionStatus.INITIALIZING]: 0,
      [SessionStatus.ACTIVE]: 0,
      [SessionStatus.IDLE]: 0,
      [SessionStatus.UNHEALTHY]: 0,
      [SessionStatus.CLOSING]: 0,
      [SessionStatus.CLOSED]: 0,
    };

    for (const session of this.sessions.values()) {
      counts[session.status]++;
    }

    return counts;
  }

  /**
   * Find sessions by criteria
   */
  findSessions(criteria: {
    status?: SessionStatus;
    profileId?: string;
    minIdleTime?: number;
    maxMemory?: number;
  }): Session[] {
    return Array.from(this.sessions.values()).filter((session) => {
      if (criteria.status && session.status !== criteria.status) {
        return false;
      }

      if (criteria.profileId && session.config.profileId !== criteria.profileId) {
        return false;
      }

      if (criteria.minIdleTime) {
        const idleTime = Date.now() - session.lastActivity.getTime();
        if (idleTime < criteria.minIdleTime) {
          return false;
        }
      }

      if (
        criteria.maxMemory &&
        session.metadata.memoryUsage > criteria.maxMemory
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Warm up pool of sessions
   */
  async warmUpPool(createSessionFn: () => Promise<Session>): Promise<void> {
    console.log(`Warming up pool with ${this.config.warmPoolSize} sessions...`);

    const promises = [];
    for (let i = 0; i < this.config.warmPoolSize; i++) {
      promises.push(
        createSessionFn()
          .then((session) => {
            this.warmPool.push(session);
            console.log(`Warmed up session ${session.id}`);
          })
          .catch((error) => {
            console.error('Error warming up session:', error);
          })
      );
    }

    await Promise.all(promises);
    console.log(`Pool warmed up with ${this.warmPool.length} sessions`);
  }

  /**
   * Get session from warm pool
   */
  getFromWarmPool(): Session | undefined {
    return this.warmPool.shift();
  }
}

/**
 * Factory function
 */
export function createSessionManager(
  config?: Partial<SessionManagerConfig>
): SessionManager {
  return new SessionManager(config);
}
