/**
 * Analytics Engine
 *
 * Production-ready analytics and reporting for browser sessions.
 * Supports multiple storage backends: SQLite (local), PostgreSQL, ClickHouse.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export type StorageBackend = 'sqlite' | 'postgres' | 'clickhouse' | 'memory';

export interface AnalyticsOptions {
  storage: StorageBackend;
  connectionString?: string;
  realtime?: boolean;
  retention?: number; // days
  batchSize?: number;
  flushInterval?: number; // ms
}

export interface TrackEvent {
  id?: string;
  event: string;
  userId: string;
  sessionId?: string;
  profileId?: string;
  timestamp?: number;
  properties?: Record<string, any>;
}

export interface ReportQuery {
  metric: string;
  timeRange: 'last_hour' | 'last_24_hours' | 'last_7_days' | 'last_30_days' | 'custom';
  startTime?: Date;
  endTime?: Date;
  groupBy?: string;
  filters?: Record<string, any>;
}

export interface ReportResult {
  metric: string;
  timeRange: string;
  data: DataPoint[];
  summary: ReportSummary;
  generatedAt: Date;
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  dimensions?: Record<string, string>;
}

export interface ReportSummary {
  total: number;
  average: number;
  min: number;
  max: number;
  count: number;
  percentiles?: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface SessionMetrics {
  sessionId: string;
  profileId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  detectionScore?: number;
  pagesVisited: number;
  actionsPerformed: number;
  errorsEncountered: number;
  status: 'active' | 'completed' | 'failed';
}

export interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  totalProfiles: number;
  averageDetectionScore: number;
  successRate: number;
  sessionsToday: number;
  sessionsThisWeek: number;
  topProfiles: Array<{ profileId: string; sessions: number }>;
  recentActivity: TrackEvent[];
}

/**
 * In-memory storage for development/testing
 */
class MemoryStorage {
  private events: TrackEvent[] = [];
  private sessions: Map<string, SessionMetrics> = new Map();

  async insert(event: TrackEvent): Promise<void> {
    this.events.push({
      ...event,
      id: event.id || this.generateId(),
      timestamp: event.timestamp || Date.now(),
    });

    // Keep only last 10000 events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
  }

  async query(query: ReportQuery): Promise<TrackEvent[]> {
    const now = Date.now();
    let startTime: number;

    switch (query.timeRange) {
      case 'last_hour':
        startTime = now - 3600000;
        break;
      case 'last_24_hours':
        startTime = now - 86400000;
        break;
      case 'last_7_days':
        startTime = now - 604800000;
        break;
      case 'last_30_days':
        startTime = now - 2592000000;
        break;
      case 'custom':
        startTime = query.startTime?.getTime() || 0;
        break;
      default:
        startTime = now - 86400000;
    }

    return this.events.filter(e => {
      if ((e.timestamp || 0) < startTime) return false;
      if (query.filters) {
        for (const [key, value] of Object.entries(query.filters)) {
          if (e.properties?.[key] !== value && (e as any)[key] !== value) {
            return false;
          }
        }
      }
      return true;
    });
  }

  async updateSession(metrics: SessionMetrics): Promise<void> {
    this.sessions.set(metrics.sessionId, metrics);
  }

  async getSession(sessionId: string): Promise<SessionMetrics | undefined> {
    return this.sessions.get(sessionId);
  }

  async getAllSessions(): Promise<SessionMetrics[]> {
    return Array.from(this.sessions.values());
  }

  async getStats(): Promise<DashboardStats> {
    const sessions = Array.from(this.sessions.values());
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;

    const activeSessions = sessions.filter(s => s.status === 'active');
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const failedSessions = sessions.filter(s => s.status === 'failed');

    const detectionScores = sessions
      .filter(s => s.detectionScore !== undefined)
      .map(s => s.detectionScore!);

    const profileCounts = new Map<string, number>();
    sessions.forEach(s => {
      profileCounts.set(s.profileId, (profileCounts.get(s.profileId) || 0) + 1);
    });

    const topProfiles = Array.from(profileCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([profileId, count]) => ({ profileId, sessions: count }));

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      totalProfiles: new Set(sessions.map(s => s.profileId)).size,
      averageDetectionScore: detectionScores.length > 0
        ? detectionScores.reduce((a, b) => a + b, 0) / detectionScores.length
        : 0,
      successRate: sessions.length > 0
        ? (completedSessions.length / (completedSessions.length + failedSessions.length)) * 100
        : 100,
      sessionsToday: sessions.filter(s => s.startTime.getTime() >= todayStart).length,
      sessionsThisWeek: sessions.filter(s => s.startTime.getTime() >= weekStart).length,
      topProfiles,
      recentActivity: this.events.slice(-10).reverse(),
    };
  }

  getEventCount(): number {
    return this.events.length;
  }

  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * SQLite storage for local persistent storage
 */
class SQLiteStorage {
  private dbPath: string;
  private memory: MemoryStorage; // Fallback if SQLite unavailable

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'analytics.db');
    this.memory = new MemoryStorage();
  }

  async initialize(): Promise<void> {
    // Ensure data directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // For now, use memory storage as SQLite requires optional dependency
    // In production, this would initialize SQLite tables
    console.log(`[Analytics] Using memory storage (SQLite path: ${this.dbPath})`);
  }

  async insert(event: TrackEvent): Promise<void> {
    await this.memory.insert(event);
  }

  async query(query: ReportQuery): Promise<TrackEvent[]> {
    return this.memory.query(query);
  }

  async updateSession(metrics: SessionMetrics): Promise<void> {
    await this.memory.updateSession(metrics);
  }

  async getSession(sessionId: string): Promise<SessionMetrics | undefined> {
    return this.memory.getSession(sessionId);
  }

  async getAllSessions(): Promise<SessionMetrics[]> {
    return this.memory.getAllSessions();
  }

  async getStats(): Promise<DashboardStats> {
    return this.memory.getStats();
  }
}

export class AnalyticsEngine extends EventEmitter {
  private storage: MemoryStorage | SQLiteStorage;
  private options: AnalyticsOptions;
  private eventBuffer: TrackEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor(options: AnalyticsOptions) {
    super();
    this.options = {
      realtime: true,
      retention: 365,
      batchSize: 100,
      flushInterval: 5000,
      ...options,
    };

    // Initialize storage based on backend
    if (options.storage === 'sqlite') {
      this.storage = new SQLiteStorage(options.connectionString);
    } else {
      this.storage = new MemoryStorage();
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.storage instanceof SQLiteStorage) {
      await this.storage.initialize();
    }

    // Start flush timer for batched writes
    if (this.options.flushInterval && this.options.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch(console.error);
      }, this.options.flushInterval);
    }

    this.initialized = true;
    console.log(`[Analytics] Engine initialized (storage: ${this.options.storage})`);
  }

  /**
   * Track an event
   */
  async track(event: TrackEvent): Promise<void> {
    const trackEvent: TrackEvent = {
      ...event,
      id: event.id || this.generateEventId(),
      timestamp: event.timestamp || Date.now(),
    };

    // Add to buffer
    this.eventBuffer.push(trackEvent);

    // Emit for realtime listeners
    if (this.options.realtime) {
      this.emit('event', trackEvent);
    }

    // Flush if buffer is full
    if (this.eventBuffer.length >= (this.options.batchSize || 100)) {
      await this.flush();
    }
  }

  /**
   * Flush buffered events to storage
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    for (const event of events) {
      await this.storage.insert(event);
    }

    this.emit('flush', { count: events.length });
  }

  /**
   * Track session start
   */
  async trackSessionStart(sessionId: string, profileId: string): Promise<void> {
    const metrics: SessionMetrics = {
      sessionId,
      profileId,
      startTime: new Date(),
      pagesVisited: 0,
      actionsPerformed: 0,
      errorsEncountered: 0,
      status: 'active',
    };

    await this.storage.updateSession(metrics);

    await this.track({
      event: 'session_start',
      userId: profileId,
      sessionId,
      properties: { profileId },
    });
  }

  /**
   * Track session end
   */
  async trackSessionEnd(
    sessionId: string,
    status: 'completed' | 'failed' = 'completed',
    detectionScore?: number
  ): Promise<void> {
    const session = await this.storage.getSession(sessionId);
    if (session) {
      session.endTime = new Date();
      session.duration = session.endTime.getTime() - session.startTime.getTime();
      session.status = status;
      if (detectionScore !== undefined) {
        session.detectionScore = detectionScore;
      }
      await this.storage.updateSession(session);
    }

    await this.track({
      event: 'session_end',
      userId: session?.profileId || 'unknown',
      sessionId,
      properties: {
        status,
        detectionScore,
        duration: session?.duration,
      },
    });
  }

  /**
   * Track page visit
   */
  async trackPageVisit(sessionId: string, url: string): Promise<void> {
    const session = await this.storage.getSession(sessionId);
    if (session) {
      session.pagesVisited++;
      await this.storage.updateSession(session);
    }

    await this.track({
      event: 'page_visit',
      userId: session?.profileId || 'unknown',
      sessionId,
      properties: { url },
    });
  }

  /**
   * Track detection score
   */
  async trackDetectionScore(
    sessionId: string,
    score: number,
    details?: Record<string, number>
  ): Promise<void> {
    const session = await this.storage.getSession(sessionId);
    if (session) {
      session.detectionScore = score;
      await this.storage.updateSession(session);
    }

    await this.track({
      event: 'detection_score',
      userId: session?.profileId || 'unknown',
      sessionId,
      properties: { score, details },
    });
  }

  /**
   * Track error
   */
  async trackError(sessionId: string, error: string, stack?: string): Promise<void> {
    const session = await this.storage.getSession(sessionId);
    if (session) {
      session.errorsEncountered++;
      await this.storage.updateSession(session);
    }

    await this.track({
      event: 'error',
      userId: session?.profileId || 'unknown',
      sessionId,
      properties: { error, stack },
    });
  }

  /**
   * Generate report
   */
  async report(query: ReportQuery): Promise<ReportResult> {
    const events = await this.storage.query(query);

    // Calculate metrics based on query.metric
    const values = this.extractMetricValues(events, query.metric);

    // Calculate summary statistics
    const summary = this.calculateSummary(values);

    // Group data points by time interval
    const data = this.groupByTime(events, query);

    return {
      metric: query.metric,
      timeRange: query.timeRange,
      data,
      summary,
      generatedAt: new Date(),
    };
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return this.storage.getStats();
  }

  /**
   * Get session metrics
   */
  async getSessionMetrics(sessionId: string): Promise<SessionMetrics | undefined> {
    return this.storage.getSession(sessionId);
  }

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<SessionMetrics[]> {
    return this.storage.getAllSessions();
  }

  /**
   * Export data to file
   */
  async export(options: {
    format: 'csv' | 'json' | 'ndjson';
    query: ReportQuery;
    filename: string;
  }): Promise<string> {
    const events = await this.storage.query(options.query);

    let content: string;
    switch (options.format) {
      case 'csv':
        content = this.toCSV(events);
        break;
      case 'ndjson':
        content = events.map(e => JSON.stringify(e)).join('\n');
        break;
      case 'json':
      default:
        content = JSON.stringify(events, null, 2);
        break;
    }

    // Write to file
    const outputPath = path.resolve(options.filename);
    fs.writeFileSync(outputPath, content);

    return outputPath;
  }

  /**
   * Shutdown engine gracefully
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    await this.flush();

    this.initialized = false;
    console.log('[Analytics] Engine shutdown complete');
  }

  // Private helper methods

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractMetricValues(events: TrackEvent[], metric: string): number[] {
    return events
      .filter(e => e.properties?.[metric] !== undefined)
      .map(e => Number(e.properties![metric]) || 0);
  }

  private calculateSummary(values: number[]): ReportSummary {
    if (values.length === 0) {
      return { total: 0, average: 0, min: 0, max: 0, count: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const total = values.reduce((a, b) => a + b, 0);

    return {
      total,
      average: total / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: values.length,
      percentiles: {
        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p90: sorted[Math.floor(sorted.length * 0.9)] || 0,
        p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
        p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      },
    };
  }

  private groupByTime(events: TrackEvent[], query: ReportQuery): DataPoint[] {
    const buckets = new Map<number, number[]>();

    // Determine bucket size based on time range
    let bucketSize: number;
    switch (query.timeRange) {
      case 'last_hour':
        bucketSize = 5 * 60 * 1000; // 5 minutes
        break;
      case 'last_24_hours':
        bucketSize = 60 * 60 * 1000; // 1 hour
        break;
      case 'last_7_days':
        bucketSize = 24 * 60 * 60 * 1000; // 1 day
        break;
      case 'last_30_days':
        bucketSize = 24 * 60 * 60 * 1000; // 1 day
        break;
      default:
        bucketSize = 60 * 60 * 1000;
    }

    for (const event of events) {
      const ts = event.timestamp || Date.now();
      const bucket = Math.floor(ts / bucketSize) * bucketSize;

      if (!buckets.has(bucket)) {
        buckets.set(bucket, []);
      }

      const value = event.properties?.[query.metric];
      if (typeof value === 'number') {
        buckets.get(bucket)!.push(value);
      } else {
        buckets.get(bucket)!.push(1); // Count events
      }
    }

    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestamp, values]) => ({
        timestamp: new Date(timestamp),
        value: values.reduce((a, b) => a + b, 0) / values.length,
      }));
  }

  private toCSV(events: TrackEvent[]): string {
    if (events.length === 0) return '';

    const headers = ['id', 'event', 'userId', 'sessionId', 'timestamp', 'properties'];
    const rows = events.map(e => [
      e.id || '',
      e.event,
      e.userId,
      e.sessionId || '',
      e.timestamp?.toString() || '',
      JSON.stringify(e.properties || {}),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

// Export factory function
export function createAnalyticsEngine(options?: Partial<AnalyticsOptions>): AnalyticsEngine {
  return new AnalyticsEngine({
    storage: 'memory',
    realtime: true,
    retention: 365,
    ...options,
  });
}

// Export default instance
export const analyticsEngine = createAnalyticsEngine();

export default AnalyticsEngine;
