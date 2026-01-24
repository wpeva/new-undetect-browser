/**
 * Garbage Collection Manager
 *
 * Monitors and optimizes V8 garbage collection for Node.js applications.
 * Helps prevent memory leaks and optimize memory usage.
 */

import v8 from 'v8';
import { EventEmitter } from 'events';

export interface GCStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  heapLimit: number;
  utilization: number;
}

export interface GCManagerOptions {
  enableMonitoring?: boolean;
  gcInterval?: number;         // Force GC interval (ms)
  heapThreshold?: number;      // Force GC when heap > threshold (0-1)
  enableHeapSnapshots?: boolean;
  snapshotInterval?: number;   // Heap snapshot interval (ms)
  snapshotPath?: string;
}

export class GCManager extends EventEmitter {
  private monitoringInterval: NodeJS.Timer | null = null;
  private gcInterval: NodeJS.Timer | null = null;
  private snapshotInterval: NodeJS.Timer | null = null;
  private stats: GCStats;
  private gcCount = 0;
  private lastGCTime = 0;

  constructor(private options: GCManagerOptions = {}) {
    super();

    this.stats = this.collectStats();

    if (this.options.enableMonitoring) {
      this.startMonitoring();
    }

    if (this.options.gcInterval) {
      this.startGCInterval();
    }

    if (this.options.enableHeapSnapshots) {
      this.startHeapSnapshots();
    }
  }

  /**
   * Collect current heap statistics
   */
  collectStats(): GCStats {
    const heapStats = v8.getHeapStatistics();

    return {
      heapUsed: heapStats.used_heap_size,
      heapTotal: heapStats.total_heap_size,
      external: heapStats.external_memory,
      arrayBuffers: heapStats.total_available_size,
      heapLimit: heapStats.heap_size_limit,
      utilization: heapStats.used_heap_size / heapStats.heap_size_limit
    };
  }

  /**
   * Get current statistics
   */
  getStats(): GCStats {
    return { ...this.stats };
  }

  /**
   * Get human-readable stats
   */
  getStatsFormatted(): {
    heapUsed: string;
    heapTotal: string;
    utilization: string;
    limit: string;
  } {
    const stats = this.collectStats();

    return {
      heapUsed: this.formatBytes(stats.heapUsed),
      heapTotal: this.formatBytes(stats.heapTotal),
      utilization: `${(stats.utilization * 100).toFixed(1)}%`,
      limit: this.formatBytes(stats.heapLimit)
    };
  }

  /**
   * Force garbage collection
   */
  forceGC(): boolean {
    if (!global.gc) {
      console.warn('GC not exposed. Run node with --expose-gc flag');
      return false;
    }

    const before = this.collectStats();
    const startTime = Date.now();

    global.gc();

    const after = this.collectStats();
    const duration = Date.now() - startTime;
    const freed = before.heapUsed - after.heapUsed;

    this.gcCount++;
    this.lastGCTime = Date.now();

    this.emit('gc', {
      duration,
      freed,
      before: before.heapUsed,
      after: after.heapUsed,
      count: this.gcCount
    });

    console.log(`GC completed: freed ${this.formatBytes(freed)} in ${duration}ms`);

    return true;
  }

  /**
   * Force GC if heap usage is above threshold
   */
  conditionalGC(threshold?: number): boolean {
    const stats = this.collectStats();
    const heapThreshold = threshold || this.options.heapThreshold || 0.8;

    if (stats.utilization >= heapThreshold) {
      console.log(`Heap utilization ${(stats.utilization * 100).toFixed(1)}% >= ${(heapThreshold * 100)}%, forcing GC`);
      return this.forceGC();
    }

    return false;
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.stats = this.collectStats();

      // Emit stats event
      this.emit('stats', this.stats);

      // Check for memory leaks (heap growing consistently)
      if (this.stats.utilization > 0.9) {
        this.emit('high-memory', this.stats);
        console.warn(`High memory usage: ${(this.stats.utilization * 100).toFixed(1)}%`);
      }
    }, 5000);  // Every 5 seconds
  }

  /**
   * Start periodic GC
   */
  private startGCInterval(): void {
    this.gcInterval = setInterval(() => {
      this.conditionalGC();
    }, this.options.gcInterval);
  }

  /**
   * Start heap snapshot collection
   */
  private startHeapSnapshots(): void {
    const interval = this.options.snapshotInterval || 300000;  // 5 minutes

    this.snapshotInterval = setInterval(() => {
      this.takeHeapSnapshot();
    }, interval);
  }

  /**
   * Take heap snapshot
   */
  takeHeapSnapshot(filename?: string): string {
    const path = filename || this.generateSnapshotPath();

    try {
      const snapshot = v8.writeHeapSnapshot(path);
      console.log(`Heap snapshot written to: ${snapshot}`);

      this.emit('snapshot', { path: snapshot });

      return snapshot;
    } catch (error) {
      console.error('Error taking heap snapshot:', error);
      throw error;
    }
  }

  /**
   * Generate snapshot filename
   */
  private generateSnapshotPath(): string {
    const basePath = this.options.snapshotPath || './snapshots';
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    return `${basePath}/heap-${timestamp}.heapsnapshot`;
  }

  /**
   * Get V8 heap code statistics
   */
  getHeapCodeStats() {
    const heapSpaces = v8.getHeapSpaceStatistics();

    return heapSpaces.map(space => ({
      name: space.space_name,
      size: this.formatBytes(space.space_size),
      used: this.formatBytes(space.space_used_size),
      available: this.formatBytes(space.space_available_size),
      physicalSize: this.formatBytes(space.physical_space_size)
    }));
  }

  /**
   * Stop all monitoring and intervals
   */
  stop(): void {
    if (this.monitoringInterval) {
// @ts-ignore - Overload mismatch is acceptable
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

// @ts-ignore - Overload mismatch is acceptable
    // @ts-ignore - Timer/Timeout type compatibility
    if (this.gcInterval) {
      clearInterval(this.gcInterval as any);
      this.gcInterval = null;
    }
// @ts-ignore - Overload mismatch is acceptable

    if (this.snapshotInterval) {
    // @ts-ignore - Timer/Timeout type compatibility
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    this.emit('stopped');
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Get GC metrics
   */
  getGCMetrics(): {
    count: number;
    lastTime: number;
    avgInterval: number;
  } {
    const now = Date.now();
    const avgInterval = this.gcCount > 0 ? (now - this.lastGCTime) / this.gcCount : 0;

    return {
      count: this.gcCount,
      lastTime: this.lastGCTime,
      avgInterval
    };
  }
}

// Singleton instance
export const gcManager = new GCManager({
  enableMonitoring: true,
  heapThreshold: 0.8,
  enableHeapSnapshots: false
});

// Example usage:
/*
// Initialize GC manager
const gcManager = new GCManager({
  enableMonitoring: true,
  gcInterval: 60000,        // Force GC every minute
  heapThreshold: 0.8,       // Force GC when heap > 80%
  enableHeapSnapshots: true,
  snapshotInterval: 300000, // Snapshot every 5 minutes
  snapshotPath: './snapshots'
});

// Listen to events
gcManager.on('stats', (stats) => {
  console.log('Heap stats:', stats);
});

gcManager.on('gc', (info) => {
  console.log(`GC freed ${info.freed} bytes in ${info.duration}ms`);
});

gcManager.on('high-memory', (stats) => {
  console.warn('High memory usage detected!', stats);
  // Maybe scale up or restart?
});

gcManager.on('snapshot', (info) => {
  console.log('Heap snapshot saved:', info.path);
});

// Get current stats
const stats = gcManager.getStatsFormatted();
console.log('Heap used:', stats.heapUsed);
console.log('Utilization:', stats.utilization);

// Force GC
gcManager.forceGC();

// Conditional GC (only if heap > 80%)
gcManager.conditionalGC(0.8);

// Take heap snapshot
gcManager.takeHeapSnapshot('./heap-snapshot.heapsnapshot');

// Get heap code stats
const codeStats = gcManager.getHeapCodeStats();
console.log('Heap code stats:', codeStats);

// Stop monitoring
gcManager.stop();
*/
