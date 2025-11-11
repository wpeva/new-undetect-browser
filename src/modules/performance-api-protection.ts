import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * Performance API Protection Module
 * Adds noise to Performance.now() and other timing APIs
 * Prevents high-resolution timing attacks and fingerprinting
 */
export class PerformanceAPIProtectionModule {
  private noiseLevel: number;
  private randomSeed: number;

  constructor(config?: {
    noiseLevel?: number;
    randomSeed?: number;
  }) {
    // Default noise level: 0.1ms (100 microseconds)
    // This is small enough to not break functionality but large enough to prevent fingerprinting
    this.noiseLevel = config?.noiseLevel || 0.1;
    this.randomSeed = config?.randomSeed || Math.random();
  }

  /**
   * Inject Performance API protection scripts
   */
  async inject(page: Page): Promise<void> {
    logger.debug('Injecting Performance API protection scripts');

    await page.evaluateOnNewDocument((config: {
      noiseLevel: number;
      randomSeed: number;
    }) => {
      // ========================================
      // Performance.now() Noise Injection
      // ========================================

      // Seeded random number generator for consistency
      class SeededRandom {
        private seed: number;

        constructor(seed: number) {
          this.seed = seed;
        }

        next(): number {
          // Linear congruential generator
          this.seed = (this.seed * 9301 + 49297) % 233280;
          return this.seed / 233280;
        }
      }

      const rng = new SeededRandom(config.randomSeed * 1000000);

      // Store the original methods
      const originalNow = performance.now.bind(performance);
      const originalTimeOrigin = performance.timeOrigin;

      // Add noise to performance.now()
      let noiseOffset = 0;
      let lastCallTime = 0;

      performance.now = function() {
        const actualTime = originalNow();

        // Generate noise based on time delta
        if (actualTime !== lastCallTime) {
          // Generate consistent noise for this call
          const noise = (rng.next() - 0.5) * config.noiseLevel * 2;
          noiseOffset = noise;
          lastCallTime = actualTime;
        }

        // Return time with noise added
        return actualTime + noiseOffset;
      };

      // Protect timeOrigin (less critical but for consistency)
      Object.defineProperty(performance, 'timeOrigin', {
        get: function() {
          return originalTimeOrigin + (rng.next() - 0.5) * config.noiseLevel;
        },
        configurable: true,
      });

      // ========================================
      // Date.now() Protection
      // ========================================

      const originalDateNow = Date.now.bind(Date);
      Date.now = function() {
        const actualTime = originalDateNow();
        const noise = Math.floor((rng.next() - 0.5) * config.noiseLevel);
        return actualTime + noise;
      };

      // ========================================
      // Performance Entries Protection
      // ========================================

      const originalGetEntries = performance.getEntries.bind(performance);
      const originalGetEntriesByType = performance.getEntriesByType.bind(performance);
      const originalGetEntriesByName = performance.getEntriesByName.bind(performance);

      // Add noise to performance entries
      const addNoiseToEntry = (entry: PerformanceEntry): PerformanceEntry => {
        if (!entry) return entry;

        const noiseMultiplier = rng.next();
        const noise = (noiseMultiplier - 0.5) * config.noiseLevel;

        // Create proxy to modify timing properties
        return new Proxy(entry, {
          get(target, prop) {
            const value = (target as any)[prop];

            // Add noise to timing properties
            if (typeof value === 'number' &&
                (prop === 'startTime' || prop === 'duration' ||
                 prop === 'fetchStart' || prop === 'responseEnd' ||
                 prop === 'domContentLoadedEventEnd' || prop === 'loadEventEnd')) {
              return value + noise;
            }

            return value;
          }
        });
      };

      performance.getEntries = function() {
        const entries = originalGetEntries();
        return entries.map(addNoiseToEntry);
      };

      performance.getEntriesByType = function(type: string) {
        const entries = originalGetEntriesByType(type);
        return entries.map(addNoiseToEntry);
      };

      performance.getEntriesByName = function(name: string, type?: string) {
        const entries = originalGetEntriesByName(name, type);
        return entries.map(addNoiseToEntry);
      };

      // ========================================
      // Performance Timing Protection
      // ========================================

      if (performance.timing) {
        const originalTiming = performance.timing;
        const timingProxy = new Proxy(originalTiming, {
          get(target, prop) {
            const value = (target as any)[prop];

            // Add noise to all timing properties
            if (typeof value === 'number' && value > 0) {
              const noise = Math.floor((rng.next() - 0.5) * config.noiseLevel);
              return value + noise;
            }

            return value;
          }
        });

        Object.defineProperty(performance, 'timing', {
          get: function() {
            return timingProxy;
          },
          configurable: true,
        });
      }

      // ========================================
      // High Resolution Time Protection
      // ========================================

      // Reduce precision of performance.now() to prevent timing attacks
      const originalPerformanceNow = performance.now;
      performance.now = function() {
        const time = originalPerformanceNow.call(performance);
        const noise = (rng.next() - 0.5) * config.noiseLevel;

        // Round to reduce precision (0.1ms precision)
        return Math.round((time + noise) * 10) / 10;
      };

      // ========================================
      // Resource Timing Protection
      // ========================================

      if (performance.getEntriesByType) {
        const originalGetEntriesByType = performance.getEntriesByType.bind(performance);

        performance.getEntriesByType = function(type: string) {
          const entries = originalGetEntriesByType(type);

          // Add noise to resource timing entries
          if (type === 'resource' || type === 'navigation') {
            return entries.map((entry: any) => {
              return new Proxy(entry, {
                get(target, prop) {
                  const value = target[prop];

                  // Timing properties to add noise to
                  const timingProps = [
                    'startTime', 'duration', 'redirectStart', 'redirectEnd',
                    'fetchStart', 'domainLookupStart', 'domainLookupEnd',
                    'connectStart', 'connectEnd', 'secureConnectionStart',
                    'requestStart', 'responseStart', 'responseEnd',
                    'transferSize', 'encodedBodySize', 'decodedBodySize'
                  ];

                  if (timingProps.includes(prop as string) && typeof value === 'number') {
                    const noise = (rng.next() - 0.5) * config.noiseLevel;
                    return value + noise;
                  }

                  return value;
                }
              });
            });
          }

          return entries;
        };
      }

      // ========================================
      // Event Timing Protection
      // ========================================

      // Protect Event.timeStamp
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type: string, listener: any, options?: any) {
        if (typeof listener === 'function') {
          const wrappedListener = function(this: any, event: Event) {
            // Add noise to event timestamp
            const originalTimeStamp = event.timeStamp;
            Object.defineProperty(event, 'timeStamp', {
              get: function() {
                const noise = (rng.next() - 0.5) * config.noiseLevel;
                return originalTimeStamp + noise;
              },
              configurable: true,
            });

            return listener.call(this, event);
          };

          return originalAddEventListener.call(this, type, wrappedListener, options);
        }

        return originalAddEventListener.call(this, type, listener, options);
      };

      // ========================================
      // Animation Frame Timing Protection
      // ========================================

      const originalRequestAnimationFrame = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function(callback: FrameRequestCallback) {
        return originalRequestAnimationFrame(function(time: number) {
          const noise = (rng.next() - 0.5) * config.noiseLevel;
          return callback(time + noise);
        });
      };

      logger.debug?.('Performance API protection applied');
    }, {
      noiseLevel: this.noiseLevel,
      randomSeed: this.randomSeed,
    });

    logger.debug('Performance API protection scripts injected successfully');
  }

  /**
   * Update configuration
   */
  setConfig(config: {
    noiseLevel?: number;
    randomSeed?: number;
  }): void {
    if (config.noiseLevel !== undefined) this.noiseLevel = config.noiseLevel;
    if (config.randomSeed !== undefined) this.randomSeed = config.randomSeed;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      noiseLevel: this.noiseLevel,
      randomSeed: this.randomSeed,
    };
  }

  /**
   * Get the name of this module
   */
  getName(): string {
    return 'PerformanceAPIProtection';
  }
}
