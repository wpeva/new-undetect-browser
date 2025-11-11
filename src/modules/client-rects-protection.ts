import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * ClientRects noise configuration
 */
export interface ClientRectsConfig {
  enabled: boolean;
  noiseLevel: 'low' | 'medium' | 'high';
  seed?: number;
}

/**
 * ClientRects Protection Module
 * Protects against fingerprinting via element dimensions and positioning
 * Adds consistent noise to getBoundingClientRect and related methods
 */
export class ClientRectsProtection {
  private config: ClientRectsConfig;
  private seed: number;

  constructor(config: Partial<ClientRectsConfig> = {}) {
    this.config = {
      enabled: true,
      noiseLevel: 'medium',
      ...config,
    };

    this.seed = this.config.seed || this.generateSeed();

    logger.info(
      `ClientRects Protection initialized (noiseLevel: ${this.config.noiseLevel}, seed: ${this.seed})`
    );
  }

  /**
   * Inject ClientRects protection into page
   */
  async inject(page: Page): Promise<void> {
    if (!this.config.enabled) {
      logger.info('ClientRects protection disabled, skipping injection');
      return;
    }

    await page.evaluateOnNewDocument(
      (config: ClientRectsConfig, seed: number) => {
        // Seeded PRNG for consistent noise
        class SeededRandom {
          private seed: number;

          constructor(seed: number) {
            this.seed = seed;
          }

          next(): number {
            this.seed = (this.seed * 9301 + 49297) % 233280;
            return this.seed / 233280;
          }

          nextFloat(min: number, max: number): number {
            return this.next() * (max - min) + min;
          }
        }

        const rng = new SeededRandom(seed);

        // Noise magnitude based on level
        const noiseMagnitude = {
          low: 0.0001,
          medium: 0.001,
          high: 0.01,
        }[config.noiseLevel];

        /**
         * Add consistent noise to a numeric value
         */
        function addNoise(value: number): number {
          const noise = rng.nextFloat(-noiseMagnitude, noiseMagnitude);
          return value + noise;
        }

        /**
         * Create a noisy DOMRect object
         */
        function createNoisyRect(rect: DOMRect): DOMRect {
          const noisyRect = {
            x: addNoise(rect.x),
            y: addNoise(rect.y),
            width: addNoise(rect.width),
            height: addNoise(rect.height),
            top: addNoise(rect.top),
            right: addNoise(rect.right),
            bottom: addNoise(rect.bottom),
            left: addNoise(rect.left),
          };

          // Create a proper DOMRect object
          return Object.create(DOMRect.prototype, {
            x: { value: noisyRect.x, enumerable: true },
            y: { value: noisyRect.y, enumerable: true },
            width: { value: noisyRect.width, enumerable: true },
            height: { value: noisyRect.height, enumerable: true },
            top: { value: noisyRect.top, enumerable: true },
            right: { value: noisyRect.right, enumerable: true },
            bottom: { value: noisyRect.bottom, enumerable: true },
            left: { value: noisyRect.left, enumerable: true },
            toJSON: {
              value: function () {
                return {
                  x: this.x,
                  y: this.y,
                  width: this.width,
                  height: this.height,
                  top: this.top,
                  right: this.right,
                  bottom: this.bottom,
                  left: this.left,
                };
              },
              enumerable: true,
            },
          });
        }

        // Override Element.getBoundingClientRect
        const originalGetBoundingClientRect =
          Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = function (): DOMRect {
          const rect = originalGetBoundingClientRect.apply(this);
          return createNoisyRect(rect);
        };

        // Override Element.getClientRects
        const originalGetClientRects = Element.prototype.getClientRects;
        Element.prototype.getClientRects = function (): DOMRectList {
          const rects = originalGetClientRects.apply(this);
          const noisyRects: DOMRect[] = [];

          for (let i = 0; i < rects.length; i++) {
            noisyRects.push(createNoisyRect(rects[i]));
          }

          // Create a DOMRectList-like object
          const rectList = Object.create(DOMRectList.prototype, {
            length: { value: noisyRects.length, enumerable: true },
            item: {
              value: function (index: number): DOMRect | null {
                return index >= 0 && index < noisyRects.length
                  ? noisyRects[index]
                  : null;
              },
              enumerable: true,
            },
          });

          // Add indexed properties
          noisyRects.forEach((rect, index) => {
            Object.defineProperty(rectList, index, {
              value: rect,
              enumerable: true,
            });
          });

          return rectList;
        };

        // Override Range.getBoundingClientRect
        const originalRangeGetBoundingClientRect =
          Range.prototype.getBoundingClientRect;
        Range.prototype.getBoundingClientRect = function (): DOMRect {
          const rect = originalRangeGetBoundingClientRect.apply(this);
          return createNoisyRect(rect);
        };

        // Override Range.getClientRects
        const originalRangeGetClientRects = Range.prototype.getClientRects;
        Range.prototype.getClientRects = function (): DOMRectList {
          const rects = originalRangeGetClientRects.apply(this);
          const noisyRects: DOMRect[] = [];

          for (let i = 0; i < rects.length; i++) {
            noisyRects.push(createNoisyRect(rects[i]));
          }

          // Create a DOMRectList-like object
          const rectList = Object.create(DOMRectList.prototype, {
            length: { value: noisyRects.length, enumerable: true },
            item: {
              value: function (index: number): DOMRect | null {
                return index >= 0 && index < noisyRects.length
                  ? noisyRects[index]
                  : null;
              },
              enumerable: true,
            },
          });

          // Add indexed properties
          noisyRects.forEach((rect, index) => {
            Object.defineProperty(rectList, index, {
              value: rect,
              enumerable: true,
            });
          });

          return rectList;
        };

        // Override offsetWidth, offsetHeight, offsetTop, offsetLeft
        // These are read-only properties, so we use defineProperty
        const ElementProto = Element.prototype;

        // Store original descriptors
        const offsetWidthDescriptor = Object.getOwnPropertyDescriptor(
          HTMLElement.prototype,
          'offsetWidth'
        )!;
        const offsetHeightDescriptor = Object.getOwnPropertyDescriptor(
          HTMLElement.prototype,
          'offsetHeight'
        )!;
        const offsetTopDescriptor = Object.getOwnPropertyDescriptor(
          HTMLElement.prototype,
          'offsetTop'
        )!;
        const offsetLeftDescriptor = Object.getOwnPropertyDescriptor(
          HTMLElement.prototype,
          'offsetLeft'
        )!;

        // Override offsetWidth
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
          get: function () {
            const value = offsetWidthDescriptor.get!.apply(this);
            return Math.round(addNoise(value));
          },
          configurable: true,
          enumerable: true,
        });

        // Override offsetHeight
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
          get: function () {
            const value = offsetHeightDescriptor.get!.apply(this);
            return Math.round(addNoise(value));
          },
          configurable: true,
          enumerable: true,
        });

        // Override offsetTop
        Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
          get: function () {
            const value = offsetTopDescriptor.get!.apply(this);
            return Math.round(addNoise(value));
          },
          configurable: true,
          enumerable: true,
        });

        // Override offsetLeft
        Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
          get: function () {
            const value = offsetLeftDescriptor.get!.apply(this);
            return Math.round(addNoise(value));
          },
          configurable: true,
          enumerable: true,
        });

        // Override clientWidth and clientHeight
        const clientWidthDescriptor = Object.getOwnPropertyDescriptor(
          Element.prototype,
          'clientWidth'
        )!;
        const clientHeightDescriptor = Object.getOwnPropertyDescriptor(
          Element.prototype,
          'clientHeight'
        )!;

        Object.defineProperty(Element.prototype, 'clientWidth', {
          get: function () {
            const value = clientWidthDescriptor.get!.apply(this);
            return Math.round(addNoise(value));
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(Element.prototype, 'clientHeight', {
          get: function () {
            const value = clientHeightDescriptor.get!.apply(this);
            return Math.round(addNoise(value));
          },
          configurable: true,
          enumerable: true,
        });

        logger.info('ClientRects Protection injected successfully');
      },
      this.config,
      this.seed
    );

    logger.info('ClientRects Protection injected into page');
  }

  /**
   * Get the module name
   */
  getName(): string {
    return 'ClientRectsProtection';
  }

  /**
   * Get current seed
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ClientRectsConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.seed !== undefined) {
      this.seed = config.seed;
    }

    logger.info('ClientRects Protection configuration updated');
  }

  /**
   * Generate deterministic seed from string
   */
  static seedFromString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Private: Generate random seed
   */
  private generateSeed(): number {
    return Math.floor(Math.random() * 1000000);
  }
}

/**
 * Create ClientRects protection instance
 */
export function createClientRectsProtection(
  config?: Partial<ClientRectsConfig>
): ClientRectsProtection {
  return new ClientRectsProtection(config);
}
