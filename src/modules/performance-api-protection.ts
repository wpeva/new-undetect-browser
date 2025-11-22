/**
 * Performance API Protection Module
 *
 * Adds consistent noise to Performance API methods to prevent fingerprinting
 * while maintaining realistic timing values.
 *
 * Protects against:
 * - performance.now() fingerprinting
 * - performance.timing analysis
 * - Resource timing correlation
 *
 * CRITICAL for passing:
 * - creepjs.com
 * - Advanced timing-based fingerprinting
 */

import type { Page } from 'puppeteer';

export interface PerformanceAPIConfig {
  enabled: boolean;
  noiseLevel: 'subtle' | 'moderate' | 'aggressive';
  seed: number;
  protectNow: boolean;
  protectTiming: boolean;
  protectResourceTiming: boolean;
}

export class PerformanceAPIProtection {
  private config: PerformanceAPIConfig;

  constructor(config: Partial<PerformanceAPIConfig> = {}) {
    this.config = {
      enabled: true,
      noiseLevel: 'moderate',
      seed: Math.floor(Math.random() * 1000000),
      protectNow: true,
      protectTiming: true,
      protectResourceTiming: true,
      ...config,
    };
  }

  /**
   * Apply Performance API protection to a page
   */
  async apply(page: Page): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await page.evaluateOnNewDocument(this.getInjectionScript(), this.config);
  }

  /**
   * Get the injection script
   */
  private getInjectionScript() {
    return (config: PerformanceAPIConfig) => {
      // Seeded random number generator
      function seededRandom(seed: number, min: number, max: number): number {
        const x = Math.sin(seed++) * 10000;
        const random = x - Math.floor(x);
        return min + random * (max - min);
      }

      // Get noise range based on level
      function getNoiseRange(level: string): number {
        switch (level) {
          case 'subtle':
            return 0.01; // ±0.01ms
          case 'moderate':
            return 0.1; // ±0.1ms
          case 'aggressive':
            return 1.0; // ±1ms
          default:
            return 0.1;
        }
      }

      const noiseRange = getNoiseRange(config.noiseLevel);
      let currentSeed = config.seed;

      // ========== Protect performance.now() ==========
      if (config.protectNow) {
        const originalNow = Performance.prototype.now;
        let lastTime = 0;
        let accumulatedNoise = 0;

        Performance.prototype.now = function () {
          const realTime = originalNow.call(this);

          // Add consistent but slightly variable noise
          const noise = seededRandom(currentSeed++, -noiseRange, noiseRange);
          accumulatedNoise += noise;

          // Ensure time always increases (monotonic)
          const noisyTime = realTime + accumulatedNoise;
          const result = Math.max(noisyTime, lastTime + 0.0001);
          lastTime = result;

          return result;
        };
      }

      // ========== Protect performance.timing ==========
      if (config.protectTiming) {
        // Get original timing
        const originalTiming = performance.timing;

        // Create a proxy for timing object
        const timingProxy = new Proxy(originalTiming, {
          get(target, prop) {
            const value = (target as any)[prop];

            // Don't modify non-numeric properties
            if (typeof value !== 'number' || value === 0) {
              return value;
            }

            // Add consistent noise to timing values
            const noise = seededRandom(
              config.seed + prop.toString().length,
              -50,
              50
            ); // ±50ms for timing events

            return Math.round(value + noise);
          },
        });

        // Replace performance.timing
        Object.defineProperty(performance, 'timing', {
          get: () => timingProxy,
          configurable: true,
          enumerable: true,
        });
      }

      // ========== Protect Resource Timing ==========
      if (config.protectResourceTiming) {
        const originalGetEntriesByType = Performance.prototype.getEntriesByType;

        Performance.prototype.getEntriesByType = function (type: string) {
          const entries = originalGetEntriesByType.call(this, type);

          if (type === 'resource') {
            // Add noise to resource timing entries
            return entries.map((entry: any, index: number) => {
              const noisyEntry = { ...entry };

              // Add noise to timing properties
              const timingProps = [
                'fetchStart',
                'domainLookupStart',
                'domainLookupEnd',
                'connectStart',
                'connectEnd',
                'requestStart',
                'responseStart',
                'responseEnd',
                'duration',
              ];

              timingProps.forEach((prop) => {
                if (typeof noisyEntry[prop] === 'number' && noisyEntry[prop] > 0) {
                  const noise = seededRandom(
                    config.seed + index + prop.length,
                    -10,
                    10
                  );
                  noisyEntry[prop] += noise;
                }
              });

              return noisyEntry;
            });
          }

          return entries;
        };

        // Also protect getEntries() and getEntriesByName()
        const originalGetEntries = Performance.prototype.getEntries;
        Performance.prototype.getEntries = function () {
          const entries = originalGetEntries.call(this);
          return entries.map((entry: any, index: number) => {
            if (entry.entryType === 'resource') {
              const noisyEntry = { ...entry };
              const noise = seededRandom(config.seed + index, -10, 10);
              if (noisyEntry.duration) {
                noisyEntry.duration += noise;
              }
              return noisyEntry;
            }
            return entry;
          });
        };
      }

      // ========== Protect performance.timeOrigin ==========
      const originalTimeOrigin = performance.timeOrigin;
      const timeOriginNoise = seededRandom(config.seed + 999, -100, 100);

      Object.defineProperty(performance, 'timeOrigin', {
        get: () => originalTimeOrigin + timeOriginNoise,
        configurable: true,
        enumerable: true,
      });

      // ========== Protect performance.mark() and performance.measure() ==========
      const originalMark = Performance.prototype.mark;
      const originalMeasure = Performance.prototype.measure;
      const markOffsets = new Map<string, number>();

      Performance.prototype.mark = function (markName: string, options?: any) {
        const result = originalMark.call(this, markName, options);

        // Store a consistent noise offset for this mark
        const noise = seededRandom(
          config.seed + markName.length,
          -noiseRange,
          noiseRange
        );
        markOffsets.set(markName, noise);

        return result;
      };

      Performance.prototype.measure = function (
        measureName: string,
        startMark?: string,
        endMark?: string
      ) {
        const result = originalMeasure.call(this, measureName, startMark, endMark);

        // Apply noise based on marks
        let noise = 0;
        if (startMark && markOffsets.has(startMark)) {
          noise -= markOffsets.get(startMark)!;
        }
        if (endMark && markOffsets.has(endMark)) {
          noise += markOffsets.get(endMark)!;
        }

        // Modify the measure entry
        if (result && typeof result === 'object') {
          const entry = performance.getEntriesByName(measureName, 'measure')[0];
          if (entry) {
            (entry as any).duration += noise;
          }
        }

        return result;
      };

      // ========== Protect Date.now() consistency ==========
      // Make sure Date.now() and performance.now() are relatively consistent
      const originalDateNow = Date.now;
      const dateNoiseOffset = seededRandom(config.seed + 1000, -100, 100);

      Date.now = function () {
        const realNow = originalDateNow.call(this);
        return Math.round(realNow + dateNoiseOffset);
      };

      // ========== Fix toString to look native ==========
      const originalToString = Function.prototype.toString;
      Function.prototype.toString = function () {
        if (this === Performance.prototype.now) {
          return 'function now() { [native code] }';
        }
        if (this === Performance.prototype.getEntriesByType) {
          return 'function getEntriesByType() { [native code] }';
        }
        if (this === Performance.prototype.getEntries) {
          return 'function getEntries() { [native code] }';
        }
        if (this === Performance.prototype.mark) {
          return 'function mark() { [native code] }';
        }
        if (this === Performance.prototype.measure) {
          return 'function measure() { [native code] }';
        }
        if (this === Date.now) {
          return 'function now() { [native code] }';
        }
        return originalToString.call(this);
      };

      // ========== Protect against detection via descriptor checks ==========
      const nowDescriptor = Object.getOwnPropertyDescriptor(
        Performance.prototype,
        'now'
      );
      if (nowDescriptor) {
        nowDescriptor.writable = true;
        nowDescriptor.configurable = true;
      }

      // Log for debugging
      if (typeof console !== 'undefined' && console.log) {
        console.log(
          `[Performance API Protection] Applied with noise level: ${config.noiseLevel}`
        );
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceAPIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate a new seed
   */
  regenerateSeed(): void {
    this.config.seed = Math.floor(Math.random() * 1000000);
  }
}

/**
 * Factory function
 */
export function createPerformanceAPIProtection(
  config?: Partial<PerformanceAPIConfig>
): PerformanceAPIProtection {
  return new PerformanceAPIProtection(config);
}

/**
 * Apply to multiple pages
 */
export async function applyPerformanceAPIProtectionToPages(
  pages: Page[],
  config?: Partial<PerformanceAPIConfig>
): Promise<void> {
  const protection = new PerformanceAPIProtection(config);
  await Promise.all(pages.map((page) => protection.apply(page)));
}
