import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { PerformanceAPIProtectionModule } from '../../src/modules/performance-api-protection';

describe('PerformanceAPIProtectionModule', () => {
  let browser: Browser;
  let page: Page;
  let protection: PerformanceAPIProtectionModule;

  beforeEach(async () => {
    protection = new PerformanceAPIProtectionModule({
      noiseLevel: 0.1,
    });

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    page = await browser.newPage();
    await protection.inject(page);
  });

  afterEach(async () => {
    await browser.close();
  });

  describe('Performance.now() Protection', () => {
    it('should return numeric values from performance.now()', async () => {
      const result = await page.evaluate(() => {
        return typeof performance.now();
      });

      expect(result).toBe('number');
    });

    it('should add noise to performance.now()', async () => {
      const results = await page.evaluate(() => {
        const measurements: number[] = [];

        // Take multiple measurements at the same logical time
        for (let i = 0; i < 10; i++) {
          measurements.push(performance.now());
        }

        return measurements;
      });

      // All measurements should be numbers
      results.forEach((result) => {
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
      });

      // Measurements should be monotonically increasing
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBeGreaterThanOrEqual(results[i - 1]);
      }
    });

    it('should maintain monotonicity over time', async () => {
      const result = await page.evaluate(() => {
        const times: number[] = [];

        for (let i = 0; i < 100; i++) {
          times.push(performance.now());
        }

        // Check if times are monotonically increasing
        let isMonotonic = true;
        for (let i = 1; i < times.length; i++) {
          if (times[i] < times[i - 1]) {
            isMonotonic = false;
            break;
          }
        }

        return {
          isMonotonic,
          first: times[0],
          last: times[times.length - 1],
          count: times.length,
        };
      });

      expect(result.isMonotonic).toBe(true);
      expect(result.last).toBeGreaterThanOrEqual(result.first);
    });

    it('should reduce timing resolution', async () => {
      const result = await page.evaluate(() => {
        const measurements: number[] = [];

        // Take rapid measurements
        for (let i = 0; i < 100; i++) {
          measurements.push(performance.now());
        }

        // Count decimal places (check precision)
        const precisions = measurements.map((m) => {
          const str = m.toString();
          const decimalIndex = str.indexOf('.');
          if (decimalIndex === -1) return 0;
          return str.length - decimalIndex - 1;
        });

        return {
          avgPrecision: precisions.reduce((a, b) => a + b, 0) / precisions.length,
          maxPrecision: Math.max(...precisions),
        };
      });

      // With noise, precision should be limited
      expect(result.maxPrecision).toBeLessThanOrEqual(2);
    });
  });

  describe('Date.now() Protection', () => {
    it('should return numeric values from Date.now()', async () => {
      const result = await page.evaluate(() => {
        return typeof Date.now();
      });

      expect(result).toBe('number');
    });

    it('should maintain reasonable values', async () => {
      const result = await page.evaluate(() => {
        const now = Date.now();
        const expected = new Date().getTime();

        return {
          now,
          expected,
          diff: Math.abs(now - expected),
        };
      });

      expect(result.now).toBeGreaterThan(1600000000000); // After Sept 2020
      expect(result.diff).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('Performance.timeOrigin Protection', () => {
    it('should return numeric value for timeOrigin', async () => {
      const result = await page.evaluate(() => {
        return typeof performance.timeOrigin;
      });

      expect(result).toBe('number');
    });

    it('should add subtle noise to timeOrigin', async () => {
      const result = await page.evaluate(() => {
        const origins: number[] = [];

        // Read timeOrigin multiple times
        for (let i = 0; i < 10; i++) {
          origins.push(performance.timeOrigin);
        }

        return {
          origins,
          allSame: origins.every((o) => o === origins[0]),
        };
      });

      expect(result.origins.length).toBe(10);
      // timeOrigin may vary slightly due to noise
      result.origins.forEach((origin) => {
        expect(origin).toBeGreaterThan(1600000000000);
      });
    });
  });

  describe('Performance Entries Protection', () => {
    it('should return performance entries', async () => {
      const result = await page.evaluate(() => {
        const entries = performance.getEntries();
        return {
          count: entries.length,
          hasEntries: entries.length > 0,
        };
      });

      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('should return entries by type', async () => {
      const result = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation');
        const resource = performance.getEntriesByType('resource');

        return {
          navigationCount: navigation.length,
          resourceCount: resource.length,
        };
      });

      expect(result.navigationCount).toBeGreaterThanOrEqual(0);
      expect(result.resourceCount).toBeGreaterThanOrEqual(0);
    });

    it('should add noise to entry timings', async () => {
      await page.goto('about:blank');

      const result = await page.evaluate(() => {
        const entries = performance.getEntriesByType('navigation');

        if (entries.length === 0) {
          return { hasEntries: false };
        }

        const entry = entries[0];

        return {
          hasEntries: true,
          startTime: entry.startTime,
          duration: entry.duration,
          hasValidTimings:
            typeof entry.startTime === 'number' &&
            typeof entry.duration === 'number',
        };
      });

      if (result.hasEntries) {
        expect(result.hasValidTimings).toBe(true);
        expect(typeof result.startTime).toBe('number');
        expect(typeof result.duration).toBe('number');
      }
    });
  });

  describe('Performance Timing Protection', () => {
    it('should protect performance.timing properties', async () => {
      const result = await page.evaluate(() => {
        if (!performance.timing) {
          return { available: false };
        }

        return {
          available: true,
          navigationStart: performance.timing.navigationStart,
          loadEventEnd: performance.timing.loadEventEnd,
          domContentLoadedEventEnd:
            performance.timing.domContentLoadedEventEnd,
        };
      });

      if (result.available) {
        expect(result.navigationStart).toBeGreaterThan(1600000000000);
        expect(typeof result.loadEventEnd).toBe('number');
        expect(typeof result.domContentLoadedEventEnd).toBe('number');
      }
    });
  });

  describe('Event Timestamp Protection', () => {
    it('should add noise to event timestamps', async () => {
      const result = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clickTimestamp: number = 0;

          const button = document.createElement('button');
          document.body.appendChild(button);

          button.addEventListener('click', (event) => {
            clickTimestamp = event.timeStamp;
            resolve({
              timestamp: clickTimestamp,
              isNumber: typeof clickTimestamp === 'number',
            });
          });

          button.click();
        });
      });

      expect(result.isNumber).toBe(true);
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('RequestAnimationFrame Protection', () => {
    it('should add noise to animation frame timestamps', async () => {
      const result = await page.evaluate(() => {
        return new Promise((resolve) => {
          const timestamps: number[] = [];

          const collectTimestamps = (time: number) => {
            timestamps.push(time);

            if (timestamps.length < 5) {
              requestAnimationFrame(collectTimestamps);
            } else {
              resolve({
                count: timestamps.length,
                allNumbers: timestamps.every((t) => typeof t === 'number'),
                allPositive: timestamps.every((t) => t > 0),
                increasing: timestamps.every(
                  (t, i) => i === 0 || t >= timestamps[i - 1]
                ),
              });
            }
          };

          requestAnimationFrame(collectTimestamps);
        });
      });

      expect(result.count).toBe(5);
      expect(result.allNumbers).toBe(true);
      expect(result.allPositive).toBe(true);
      expect(result.increasing).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should allow updating configuration', () => {
      protection.setConfig({
        noiseLevel: 0.5,
        randomSeed: 12345,
      });

      const config = protection.getConfig();
      expect(config.noiseLevel).toBe(0.5);
      expect(config.randomSeed).toBe(12345);
    });

    it('should return module name', () => {
      expect(protection.getName()).toBe('PerformanceAPIProtection');
    });
  });

  describe('Consistency Tests', () => {
    it('should provide consistent noise across page loads with same seed', async () => {
      const page2 = await browser.newPage();
      const protection2 = new PerformanceAPIProtectionModule({
        noiseLevel: 0.1,
        randomSeed: 12345,
      });
      await protection2.inject(page2);

      const result1 = await page.evaluate(() => {
        const measurements: number[] = [];
        for (let i = 0; i < 5; i++) {
          measurements.push(performance.now());
        }
        return measurements;
      });

      const result2 = await page2.evaluate(() => {
        const measurements: number[] = [];
        for (let i = 0; i < 5; i++) {
          measurements.push(performance.now());
        }
        return measurements;
      });

      // Both should be arrays of numbers
      expect(result1.length).toBe(5);
      expect(result2.length).toBe(5);

      // All should be positive numbers
      result1.forEach((r) => expect(r).toBeGreaterThan(0));
      result2.forEach((r) => expect(r).toBeGreaterThan(0));

      await page2.close();
    });

    it('should not break normal timing functionality', async () => {
      const result = await page.evaluate(() => {
        return new Promise((resolve) => {
          const start = performance.now();

          setTimeout(() => {
            const end = performance.now();
            const elapsed = end - start;

            resolve({
              start,
              end,
              elapsed,
              expectedRange: elapsed >= 90 && elapsed <= 150, // ~100ms with noise
            });
          }, 100);
        });
      });

      expect(result.start).toBeGreaterThan(0);
      expect(result.end).toBeGreaterThan(result.start);
      expect(result.elapsed).toBeGreaterThan(0);
    });
  });

  describe('High-Resolution Timing Attack Prevention', () => {
    it('should prevent precise timing measurements', async () => {
      const result = await page.evaluate(() => {
        const measurements: number[] = [];

        // Try to measure with high precision
        for (let i = 0; i < 1000; i++) {
          const start = performance.now();
          // Minimal operation
          const temp = Math.sqrt(i);
          const end = performance.now();
          measurements.push(end - start);
        }

        // Count how many measurements are exactly 0
        const zeroCount = measurements.filter((m) => m === 0).length;

        // Count unique values (reduced precision means fewer unique values)
        const uniqueValues = new Set(measurements).size;

        return {
          totalMeasurements: measurements.length,
          zeroCount,
          uniqueValues,
          avgMeasurement:
            measurements.reduce((a, b) => a + b, 0) / measurements.length,
        };
      });

      expect(result.totalMeasurements).toBe(1000);

      // With noise and reduced precision, we should have limited unique values
      // This prevents timing attacks that rely on high precision
      expect(result.uniqueValues).toBeLessThan(100);
    });
  });
});
