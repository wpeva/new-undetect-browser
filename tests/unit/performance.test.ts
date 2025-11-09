import {
  PerformanceMonitor,
  benchmark,
  compareBenchmarks,
  MemoryProfiler,
  performanceMonitor,
} from '../../src/utils/performance';

describe('Performance Utilities', () => {
  describe('PerformanceMonitor', () => {
    it('should measure execution time', async () => {
      const monitor = new PerformanceMonitor();

      await monitor.measure('test', async () => {
        await new Promise((r) => setTimeout(r, 100));
      });

      const stats = monitor.getStats('test');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.average).toBeGreaterThan(90);
      expect(stats!.average).toBeLessThan(150);
    });

    it('should track multiple measurements', async () => {
      const monitor = new PerformanceMonitor();

      await monitor.measure('test', async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      await monitor.measure('test', async () => {
        await new Promise((r) => setTimeout(r, 100));
      });

      const stats = monitor.getStats('test');
      expect(stats!.count).toBe(2);
      expect(stats!.min).toBeLessThan(stats!.max);
    });

    it('should calculate percentiles correctly', async () => {
      const monitor = new PerformanceMonitor();

      // Create 100 measurements with known distribution
      for (let i = 0; i < 100; i++) {
        await monitor.measure('test', async () => {
          await new Promise((r) => setTimeout(r, i));
        });
      }

      const stats = monitor.getStats('test');
      expect(stats!.count).toBe(100);
      expect(stats!.p50).toBeGreaterThan(stats!.min);
      expect(stats!.p95).toBeGreaterThan(stats!.p50);
      expect(stats!.p99).toBeGreaterThan(stats!.p95);
      expect(stats!.p99).toBeLessThanOrEqual(stats!.max);
    });

    it('should handle metadata', async () => {
      const monitor = new PerformanceMonitor();

      await monitor.measure(
        'test',
        async () => {
          await new Promise((r) => setTimeout(r, 10));
        },
        { userId: 123, operation: 'fetch' }
      );

      const metrics = monitor.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].metadata).toEqual({ userId: 123, operation: 'fetch' });
    });

    it('should start and end timers manually', () => {
      const monitor = new PerformanceMonitor();

      monitor.startTimer('test');
      // Simulate some work
      const now = Date.now();
      while (Date.now() - now < 50) {
        // Busy wait
      }
      monitor.endTimer('test');

      const stats = monitor.getStats('test');
      expect(stats!.count).toBe(1);
      expect(stats!.average).toBeGreaterThan(40);
    });

    it('should respect maxMetrics limit', async () => {
      const monitor = new PerformanceMonitor(5);

      for (let i = 0; i < 10; i++) {
        await monitor.measure('test', async () => {});
      }

      const metrics = monitor.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(5);
    });

    it('should clear metrics', async () => {
      const monitor = new PerformanceMonitor();

      await monitor.measure('test', async () => {});
      expect(monitor.getMetrics().length).toBe(1);

      monitor.clearMetrics();
      expect(monitor.getMetrics().length).toBe(0);
    });

    it('should return null for non-existent stats', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor.getStats('nonexistent')).toBeNull();
    });

    it('should track errors in metadata', async () => {
      const monitor = new PerformanceMonitor();

      try {
        await monitor.measure('test', async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected
      }

      const metrics = monitor.getMetrics();
      expect(metrics[0].metadata).toEqual({ error: true });
    });
  });

  describe('benchmark', () => {
    it('should run warmup iterations', async () => {
      const fn = jest.fn(() => {});

      await benchmark('test', fn, {
        iterations: 60,
        warmup: 5,
        minSamples: 60,
      });

      expect(fn).toHaveBeenCalledTimes(65); // 5 warmup + 60 iterations
    });

    it('should calculate statistics', async () => {
      const result = await benchmark(
        'test',
        () => {
          const start = Date.now();
          while (Date.now() - start < 2) {
            // Small delay
          }
        },
        { iterations: 60, warmup: 2, minSamples: 60 }
      );

      expect(result.name).toBe('test');
      expect(result.iterations).toBeGreaterThanOrEqual(60);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.minTime).toBeGreaterThan(0);
      expect(result.maxTime).toBeGreaterThanOrEqual(result.minTime);
      expect(result.opsPerSecond).toBeGreaterThan(0);
      expect(result.samples.length).toBeGreaterThanOrEqual(60);
    });

    it('should handle async functions', async () => {
      const result = await benchmark(
        'async-test',
        async () => {
          await new Promise((r) => setTimeout(r, 5));
        },
        { iterations: 20, warmup: 1, minSamples: 20 }
      );

      expect(result.iterations).toBeGreaterThanOrEqual(20);
      expect(result.averageTime).toBeGreaterThan(3);
    });

    it('should collect minimum samples', async () => {
      const result = await benchmark(
        'test',
        () => {},
        {
          iterations: 3,
          minSamples: 10,
        }
      );

      expect(result.samples.length).toBeGreaterThanOrEqual(10);
    });

    it('should calculate standard deviation', async () => {
      // Create function with variable execution time
      let counter = 0;
      const result = await benchmark(
        'test',
        () => {
          counter++;
          const delay = counter % 2 === 0 ? 10 : 5;
          const start = Date.now();
          while (Date.now() - start < delay) {
            // Variable delay
          }
        },
        { iterations: 20, warmup: 0 }
      );

      expect(result.standardDeviation).toBeGreaterThan(0);
    });
  });

  describe('compareBenchmarks', () => {
    it('should run and log multiple benchmarks', async () => {
      const benchmarks = [
        { name: 'fast', fn: async () => {} },
        {
          name: 'slow',
          fn: async () => {
            await new Promise((r) => setTimeout(r, 5));
          },
        },
      ];

      // Should complete without errors
      await expect(
        compareBenchmarks(benchmarks, { iterations: 5, warmup: 1 })
      ).resolves.toBeUndefined();
    });

    it('should handle single benchmark', async () => {
      await expect(
        compareBenchmarks([{ name: 'test', fn: async () => {} }], {
          iterations: 3,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('MemoryProfiler', () => {
    it('should take snapshots', () => {
      const profiler = new MemoryProfiler();

      profiler.snapshot('start');
      expect(profiler.getSnapshots().length).toBe(1);
      expect(profiler.getSnapshots()[0].label).toBe('start');
    });

    it('should calculate memory diff', () => {
      const profiler = new MemoryProfiler();

      profiler.snapshot('start');

      // Allocate some memory
      const data = new Array(1000000).fill(0);

      profiler.snapshot('end');

      const diff = profiler.diff('start', 'end');
      expect(diff).toBeDefined();

      // Memory should have increased
      expect(diff!.heapUsed).toBeGreaterThanOrEqual(0);

      // Keep data in scope to prevent GC
      expect(data.length).toBe(1000000);
    });

    it('should return null for non-existent snapshots', () => {
      const profiler = new MemoryProfiler();

      profiler.snapshot('start');

      expect(profiler.diff('start', 'nonexistent')).toBeNull();
      expect(profiler.diff('nonexistent', 'start')).toBeNull();
    });

    it('should clear snapshots', () => {
      const profiler = new MemoryProfiler();

      profiler.snapshot('start');
      profiler.snapshot('end');
      expect(profiler.getSnapshots().length).toBe(2);

      profiler.clear();
      expect(profiler.getSnapshots().length).toBe(0);
    });

    it('should handle multiple snapshots', () => {
      const profiler = new MemoryProfiler();

      profiler.snapshot('s1');
      profiler.snapshot('s2');
      profiler.snapshot('s3');

      expect(profiler.getSnapshots().length).toBe(3);
      expect(profiler.diff('s1', 's2')).toBeDefined();
      expect(profiler.diff('s2', 's3')).toBeDefined();
      expect(profiler.diff('s1', 's3')).toBeDefined();
    });
  });

  describe('performanceMonitor (global instance)', () => {
    afterEach(() => {
      performanceMonitor.clearMetrics();
    });

    it('should be accessible globally', async () => {
      await performanceMonitor.measure('global-test', async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      const stats = performanceMonitor.getStats('global-test');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
    });

    it('should accumulate measurements across calls', async () => {
      await performanceMonitor.measure('test', async () => {});
      await performanceMonitor.measure('test', async () => {});

      const stats = performanceMonitor.getStats('test');
      expect(stats!.count).toBe(2);
    });
  });

  describe('PerformanceMonitor - Edge Cases', () => {
    it('should propagate errors from measured functions', async () => {
      const monitor = new PerformanceMonitor();

      await expect(
        monitor.measure('error-test', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      // Metric should still be recorded
      const stats = monitor.getStats('error-test');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
    });

    it('should handle empty metrics gracefully', () => {
      const monitor = new PerformanceMonitor();

      expect(monitor.getMetrics()).toEqual([]);
      expect(monitor.getStats('anything')).toBeNull();
    });

    it('should calculate percentiles with single measurement', async () => {
      const monitor = new PerformanceMonitor();

      await monitor.measure('test', async () => {});

      const stats = monitor.getStats('test');
      expect(stats!.p50).toBe(stats!.average);
      expect(stats!.p95).toBe(stats!.average);
      expect(stats!.p99).toBe(stats!.average);
    });
  });

  describe('benchmark - Edge Cases', () => {
    it('should handle zero iterations gracefully', async () => {
      const result = await benchmark('test', () => {}, {
        iterations: 0,
        minSamples: 1,
      });

      expect(result.samples.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle functions that throw errors', async () => {
      await expect(
        benchmark(
          'error-test',
          () => {
            throw new Error('Benchmark error');
          },
          { iterations: 1 }
        )
      ).rejects.toThrow('Benchmark error');
    });
  });
});
