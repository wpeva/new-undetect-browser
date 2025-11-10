import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * Canvas noise configuration
 */
export interface CanvasNoiseConfig {
  enabled: boolean;
  algorithm: 'subtle' | 'moderate' | 'aggressive';
  seed?: number;
  consistency: 'session' | 'permanent' | 'random';
}

/**
 * Canvas protection statistics
 */
export interface CanvasProtectionStats {
  canvasCalls: number;
  toDataURLCalls: number;
  toBlobCalls: number;
  getImageDataCalls: number;
  noiseInjections: number;
}

/**
 * Enhanced Canvas Protection Module v2
 * Advanced canvas fingerprinting protection with multiple noise algorithms
 */
export class CanvasProtectionV2 {
  private config: CanvasNoiseConfig;
  private stats: CanvasProtectionStats;
  private seed: number;

  constructor(config: Partial<CanvasNoiseConfig> = {}) {
    this.config = {
      enabled: true,
      algorithm: 'moderate',
      consistency: 'session',
      ...config,
    };

    // Generate or use provided seed
    this.seed = this.config.seed || this.generateSeed();

    this.stats = {
      canvasCalls: 0,
      toDataURLCalls: 0,
      toBlobCalls: 0,
      getImageDataCalls: 0,
      noiseInjections: 0,
    };

    logger.info(
      `Canvas Protection V2 initialized (algorithm: ${this.config.algorithm}, seed: ${this.seed})`
    );
  }

  /**
   * Inject canvas protection into page
   */
  async inject(page: Page): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Canvas protection v2 disabled, skipping injection');
      return;
    }

    await page.evaluateOnNewDocument(
      (config: CanvasNoiseConfig, seed: number) => {
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

          nextInt(min: number, max: number): number {
            return Math.floor(this.next() * (max - min + 1)) + min;
          }

          nextFloat(min: number, max: number): number {
            return this.next() * (max - min) + min;
          }
        }

        const rng = new SeededRandom(seed);

        /**
         * Inject noise into canvas data
         */
        function injectNoise(
          imageData: ImageData,
          algorithm: 'subtle' | 'moderate' | 'aggressive'
        ): void {
          const data = imageData.data;
          const len = data.length;

          // Algorithm-specific parameters
          const params = {
            subtle: { frequency: 0.01, magnitude: 1 },
            moderate: { frequency: 0.05, magnitude: 2 },
            aggressive: { frequency: 0.1, magnitude: 3 },
          }[algorithm];

          // Apply noise to random pixels
          for (let i = 0; i < len; i += 4) {
            if (rng.next() < params.frequency) {
              // Add noise to RGB channels (skip alpha)
              data[i] = Math.min(
                255,
                Math.max(0, data[i] + rng.nextInt(-params.magnitude, params.magnitude))
              );
              data[i + 1] = Math.min(
                255,
                Math.max(0, data[i + 1] + rng.nextInt(-params.magnitude, params.magnitude))
              );
              data[i + 2] = Math.min(
                255,
                Math.max(0, data[i + 2] + rng.nextInt(-params.magnitude, params.magnitude))
              );
            }
          }
        }

        /**
         * Advanced noise - perlin-like pattern
         */
        function _injectPerlinNoise(imageData: ImageData, intensity: number): void {
          const data = imageData.data;
          const width = imageData.width;
          const height = imageData.height;

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4;

              // Generate smooth noise using sine waves
              const noise =
                Math.sin(x * 0.1 + rng.next() * 10) *
                Math.cos(y * 0.1 + rng.next() * 10) *
                intensity;

              data[i] = Math.min(255, Math.max(0, data[i] + noise));
              data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
              data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
            }
          }
        }

        // Override HTMLCanvasElement.toDataURL
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function (
          type?: string,
          quality?: number
        ): string {
          // Get canvas context and apply noise
          const context = this.getContext('2d');
          if (context) {
            const imageData = context.getImageData(
              0,
              0,
              this.width,
              this.height
            );
            injectNoise(imageData, config.algorithm);
            context.putImageData(imageData, 0, 0);
          }

          return originalToDataURL.apply(this, [type, quality] as never);
        };

        // Override HTMLCanvasElement.toBlob
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function (
          callback: BlobCallback,
          type?: string,
          quality?: number
        ): void {
          // Get canvas context and apply noise
          const context = this.getContext('2d');
          if (context) {
            const imageData = context.getImageData(
              0,
              0,
              this.width,
              this.height
            );
            injectNoise(imageData, config.algorithm);
            context.putImageData(imageData, 0, 0);
          }

          return originalToBlob.apply(this, [callback, type, quality] as never);
        };

        // Override CanvasRenderingContext2D.getImageData
        const originalGetImageData =
          CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function (
          sx: number,
          sy: number,
          sw: number,
          sh: number,
          settings?: ImageDataSettings
        ): ImageData {
          const imageData = originalGetImageData.apply(
            this,
            [sx, sy, sw, sh, settings] as never
          );

          // Apply noise
          injectNoise(imageData, config.algorithm);

          return imageData;
        };

        // Override OffscreenCanvas support if available
        if (typeof OffscreenCanvas !== 'undefined') {
          const originalOffscreenToBlob = OffscreenCanvas.prototype.convertToBlob;
          if (originalOffscreenToBlob) {
            OffscreenCanvas.prototype.convertToBlob = function (
              options?: ImageEncodeOptions
            ): Promise<Blob> {
              const context = this.getContext('2d') as OffscreenCanvasRenderingContext2D;
              if (context) {
                const imageData = context.getImageData(
                  0,
                  0,
                  this.width,
                  this.height
                );
                injectNoise(imageData, config.algorithm);
                context.putImageData(imageData, 0, 0);
              }

              return originalOffscreenToBlob.apply(this, [options] as never);
            };
          }
        }

        // Protect canvas fingerprinting through WebGL
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (
          pname: number
        ): unknown {
          const result = originalGetParameter.apply(this, [pname]);

          // Add slight noise to canvas dimensions
          // WebGL debug extension constants
          const UNMASKED_VENDOR_WEBGL = 0x9245;
          const UNMASKED_RENDERER_WEBGL = 0x9246;

          if (
            pname === UNMASKED_VENDOR_WEBGL ||
            pname === UNMASKED_RENDERER_WEBGL
          ) {
            // Return slightly modified vendor/renderer
            if (typeof result === 'string') {
              return result + String.fromCharCode(
                rng.nextInt(0, 1) === 0 ? 0x200b : 0x200c
              );
            }
          }

          return result;
        };

        // Override TextMetrics for font fingerprinting protection
        const originalMeasureText =
          CanvasRenderingContext2D.prototype.measureText;
        CanvasRenderingContext2D.prototype.measureText = function (
          text: string
        ): TextMetrics {
          const metrics = originalMeasureText.apply(this, [text]);

          // Add tiny noise to text metrics
          const noise = rng.nextFloat(-0.0001, 0.0001);
          Object.defineProperty(metrics, 'width', {
            value: metrics.width + noise,
            writable: false,
          });

          return metrics;
        };

        // Protection against canvas readback timing attacks
        const originalReadPixels = WebGLRenderingContext.prototype.readPixels;
        WebGLRenderingContext.prototype.readPixels = function (
          x: number,
          y: number,
          width: number,
          height: number,
          format: number,
          type: number,
          pixels: ArrayBufferView | null
        ): void {
          // Add slight delay to prevent timing attacks
          const start = performance.now();
          originalReadPixels.apply(this, [
            x,
            y,
            width,
            height,
            format,
            type,
            pixels,
          ] as never);

          // Ensure minimum time elapsed
          const elapsed = performance.now() - start;
          if (elapsed < 0.1) {
            // Busy wait for remaining time
            const target = start + 0.1;
            while (performance.now() < target) {
              // Busy wait
            }
          }
        };

        logger.info('Canvas Protection V2 injected successfully');
      },
      this.config,
      this.seed
    );

    logger.info('Canvas Protection V2 injected into page');
  }

  /**
   * Get protection statistics
   */
  getStats(): CanvasProtectionStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      canvasCalls: 0,
      toDataURLCalls: 0,
      toBlobCalls: 0,
      getImageDataCalls: 0,
      noiseInjections: 0,
    };
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
  updateConfig(config: Partial<CanvasNoiseConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.seed !== undefined) {
      this.seed = config.seed;
    }

    logger.info('Canvas Protection V2 configuration updated');
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
 * Create canvas protection v2 instance
 */
export function createCanvasProtectionV2(
  config?: Partial<CanvasNoiseConfig>
): CanvasProtectionV2 {
  return new CanvasProtectionV2(config);
}
