/**
 * Performance Monitoring and Benchmarking Utilities
 * Provides comprehensive performance measurement and analysis
 */

import { logger } from './logger';

/**
 * Performance metric entry
 */
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  memory?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Benchmark result
 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  opsPerSecond: number;
  samples: number[];
}

/**
 * Performance Monitor
 * Tracks and analyzes performance metrics
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers = new Map<string, number>();
  private maxMetrics: number;

  constructor(maxMetrics: number = 1000) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  /**
   * End timing and record metric
   */
  endTimer(name: string, metadata?: Record<string, unknown>): PerformanceMetric | undefined {
    const startTime = this.timers.get(name);
    if (!startTime) {
      logger.warn(`Timer "${name}" was not started`);
      return undefined;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    // Add memory info if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      metric.memory = {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      };
    }

    this.recordMetric(metric);
    return metric;
  }

  /**
   * Record a metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Limit metrics size
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Measure async function execution
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name, metadata);
      return result;
    } catch (error) {
      this.endTimer(name, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Get metrics by name
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter((m) => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    total: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: metrics.length,
      average: sum / metrics.length,
      min: durations[0] ?? 0,
      max: durations[durations.length - 1] ?? 0,
      total: sum,
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((sorted.length * p) / 100) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(new Set(this.metrics.map((m) => m.name)));
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        stats: this.getMetricNames().reduce((acc, name) => {
          acc[name] = this.getStats(name);
          return acc;
        }, {} as Record<string, ReturnType<typeof this.getStats>>),
      },
      null,
      2
    );
  }

  /**
   * Log summary of all metrics
   */
  logSummary(): void {
    const names = this.getMetricNames();

    logger.info('Performance Summary', {
      totalMetrics: this.metrics.length,
      uniqueOperations: names.length,
    });

    for (const name of names) {
      const stats = this.getStats(name);
      if (stats) {
        logger.info(`  ${name}`, {
          count: stats.count,
          avg: `${stats.average.toFixed(2)}ms`,
          min: `${stats.min}ms`,
          max: `${stats.max}ms`,
          p95: `${stats.p95}ms`,
        });
      }
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.timers.clear();
  }
}

/**
 * Benchmark a function
 */
export async function benchmark(
  name: string,
  fn: () => void | Promise<void>,
  options: {
    iterations?: number;
    warmup?: number;
    minSamples?: number;
  } = {}
): Promise<BenchmarkResult> {
  const { iterations = 100, warmup = 10, minSamples = 50 } = options;

  // Warmup
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // Collect samples
  const samples: number[] = [];
  const totalIterations = Math.max(iterations, minSamples);

  for (let i = 0; i < totalIterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    samples.push(end - start);
  }

  // Calculate statistics
  const sorted = samples.slice().sort((a, b) => a - b);
  const totalTime = samples.reduce((a, b) => a + b, 0);
  const averageTime = totalTime / samples.length;
  const minTime = sorted[0] ?? 0;
  const maxTime = sorted[sorted.length - 1] ?? 0;

  // Calculate standard deviation
  const squareDiffs = samples.map((value) => Math.pow(value - averageTime, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / samples.length;
  const standardDeviation = Math.sqrt(avgSquareDiff);

  const opsPerSecond = 1000 / averageTime;

  return {
    name,
    iterations: totalIterations,
    totalTime,
    averageTime,
    minTime,
    maxTime,
    standardDeviation,
    opsPerSecond,
    samples,
  };
}

/**
 * Compare multiple benchmarks
 */
export async function compareBenchmarks(
  benchmarks: Array<{ name: string; fn: () => void | Promise<void> }>,
  options?: { iterations?: number; warmup?: number }
): Promise<void> {
  logger.info('Starting benchmark comparison...');

  const results: BenchmarkResult[] = [];

  for (const { name, fn } of benchmarks) {
    logger.info(`Benchmarking: ${name}...`);
    const result = await benchmark(name, fn, options);
    results.push(result);
  }

  // Sort by ops per second (fastest first)
  results.sort((a, b) => b.opsPerSecond - a.opsPerSecond);

  logger.info('\nBenchmark Results:');
  logger.info('='.repeat(80));

  const fastest = results[0];
  if (!fastest) {
    logger.warn('No results to compare');
    return;
  }

  for (const result of results) {
    const relative = fastest === result ? '(fastest)' : `${(fastest.opsPerSecond / result.opsPerSecond).toFixed(2)}x slower`;

    logger.info(`${result.name}:`, {
      'Ops/sec': result.opsPerSecond.toFixed(0),
      'Avg time': `${result.averageTime.toFixed(3)}ms`,
      'Min': `${result.minTime.toFixed(3)}ms`,
      'Max': `${result.maxTime.toFixed(3)}ms`,
      'StdDev': `${result.standardDeviation.toFixed(3)}ms`,
      'Relative': relative,
    });
  }

  logger.info('='.repeat(80));
}

/**
 * Memory profiler
 */
export class MemoryProfiler {
  private snapshots: Array<{
    timestamp: number;
    label: string;
    memory: NodeJS.MemoryUsage;
  }> = [];

  /**
   * Take memory snapshot
   */
  snapshot(label: string): void {
    if (typeof process === 'undefined' || !process.memoryUsage) {
      return;
    }

    this.snapshots.push({
      timestamp: Date.now(),
      label,
      memory: process.memoryUsage(),
    });
  }

  /**
   * Get memory diff between two snapshots
   */
  diff(fromLabel: string, toLabel: string): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  } | null {
    const from = this.snapshots.find((s) => s.label === fromLabel);
    const to = this.snapshots.find((s) => s.label === toLabel);

    if (!from || !to) {
      return null;
    }

    return {
      heapUsed: to.memory.heapUsed - from.memory.heapUsed,
      heapTotal: to.memory.heapTotal - from.memory.heapTotal,
      external: to.memory.external - from.memory.external,
      rss: to.memory.rss - from.memory.rss,
    };
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): typeof this.snapshots {
    return [...this.snapshots];
  }

  /**
   * Clear snapshots
   */
  clear(): void {
    this.snapshots = [];
  }

  /**
   * Log memory usage summary
   */
  logSummary(): void {
    if (this.snapshots.length === 0) {
      logger.info('No memory snapshots available');
      return;
    }

    logger.info('Memory Snapshots:');
    for (const snapshot of this.snapshots) {
      logger.info(`  ${snapshot.label}:`, {
        heapUsed: `${(snapshot.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(snapshot.memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(snapshot.memory.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(snapshot.memory.rss / 1024 / 1024).toFixed(2)} MB`,
      });
    }

    // Show diffs
    if (this.snapshots.length > 1) {
      logger.info('\nMemory Changes:');
      for (let i = 1; i < this.snapshots.length; i++) {
        const from = this.snapshots[i - 1];
        const to = this.snapshots[i];
        if (!from || !to) {
          continue;
        }
        const diff = {
          heapUsed: to.memory.heapUsed - from.memory.heapUsed,
          external: to.memory.external - from.memory.external,
        };

        logger.info(`  ${from.label} → ${to.label}:`, {
          heapUsed: `${(diff.heapUsed / 1024 / 1024 > 0 ? '+' : '')}${(diff.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(diff.external / 1024 / 1024 > 0 ? '+' : '')}${(diff.external / 1024 / 1024).toFixed(2)} MB`,
        });
      }
    }
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();
