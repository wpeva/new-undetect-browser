/**
 * Performance Monitoring Middleware
 * Tracks request duration, memory usage, and response times
 */

import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  requestCount: number;
  totalDuration: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  memoryUsage: NodeJS.MemoryUsage;
  slowRequests: number; // Requests > 1s
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private readonly SLOW_REQUEST_THRESHOLD = 1000; // 1 second

  trackRequest(path: string, duration: number, memory: NodeJS.MemoryUsage): void {
    const existing = this.metrics.get(path) || {
      requestCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      memoryUsage: memory,
      slowRequests: 0,
    };

    existing.requestCount++;
    existing.totalDuration += duration;
    existing.averageDuration = existing.totalDuration / existing.requestCount;
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.memoryUsage = memory;

    if (duration > this.SLOW_REQUEST_THRESHOLD) {
      existing.slowRequests++;
    }

    this.metrics.set(path, existing);
  }

  getMetrics(path?: string): PerformanceMetrics | Map<string, PerformanceMetrics> {
    if (path) {
      return this.metrics.get(path) || this.createEmptyMetrics();
    }
    return this.metrics;
  }

  getSummary(): {
    totalRequests: number;
    averageResponseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    slowRequests: number;
    uptime: number;
  } {
    let totalRequests = 0;
    let totalDuration = 0;
    let slowRequests = 0;

    this.metrics.forEach((metric) => {
      totalRequests += metric.requestCount;
      totalDuration += metric.totalDuration;
      slowRequests += metric.slowRequests;
    });

    return {
      totalRequests,
      averageResponseTime: totalRequests > 0 ? totalDuration / totalRequests : 0,
      memoryUsage: process.memoryUsage(),
      slowRequests,
      uptime: process.uptime(),
    };
  }

  reset(): void {
    this.metrics.clear();
  }

  private createEmptyMetrics(): PerformanceMetrics {
    return {
      requestCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      memoryUsage: process.memoryUsage(),
      slowRequests: 0,
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware to track request performance
 */
export function performanceMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    // Track response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();

      // Log slow requests
      if (duration > 1000) {
        console.warn(`⚠️  Slow request: ${req.method} ${req.path} took ${duration}ms`);
      }

      // Track metrics
      performanceMonitor.trackRequest(req.path, duration, endMemory);

      // Add performance headers
      res.setHeader('X-Response-Time', `${duration}ms`);
    });

    next();
  };
}

/**
 * Get performance report
 */
export function getPerformanceReport(): {
  summary: ReturnType<typeof performanceMonitor.getSummary>;
  topSlowEndpoints: Array<{ path: string; avgDuration: number; slowRequests: number }>;
  memoryTrend: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
} {
  const summary = performanceMonitor.getSummary();
  const metrics = performanceMonitor.getMetrics() as Map<string, PerformanceMetrics>;

  // Get top 10 slow endpoints
  const topSlowEndpoints = Array.from(metrics.entries())
    .map(([path, metric]) => ({
      path,
      avgDuration: metric.averageDuration,
      slowRequests: metric.slowRequests,
    }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 10);

  const memory = process.memoryUsage();

  return {
    summary,
    topSlowEndpoints,
    memoryTrend: {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024), // MB
      external: Math.round(memory.external / 1024 / 1024), // MB
      rss: Math.round(memory.rss / 1024 / 1024), // MB
    },
  };
}
