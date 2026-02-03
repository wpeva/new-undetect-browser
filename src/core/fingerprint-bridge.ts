/**
 * Fingerprint Bridge - Unified Configuration System
 *
 * This module ensures that JavaScript-level fingerprint protections
 * use the EXACT SAME configuration as the C++ Chromium patches.
 *
 * The FingerprintSessionManager in C++ reads configuration from:
 * 1. Command line: --fingerprint-config=/path/to/config.json
 * 2. Environment: UNDETECT_FINGERPRINT_CONFIG=/path/to/config.json
 * 3. Default generated values (if neither is provided)
 *
 * This TypeScript module:
 * 1. Generates the config file before browser launch
 * 2. Injects the SAME config into JS context via __fpConfig
 * 3. Ensures all JS modules read from __fpConfig
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * Unified fingerprint configuration schema
 * MUST match the C++ FingerprintConfig struct in fingerprint_session_manager.h
 */
export interface UnifiedFingerprintConfig {
  sessionSeed: number;

  navigator: {
    hardwareConcurrency: number;
    deviceMemory: number;
    platform: string;
    userAgent: string;
    languages: string[];
  };

  canvas: {
    noiseLevel: number;      // 0.001 = 0.1% of pixels
    noiseAmplitude: number;  // Max change per channel (±N)
  };

  webgl: {
    vendor: string;
    renderer: string;
    version: string;
    readpixelsNoise: number;
  };

  audio: {
    analyserNoise: number;
    oscillatorNoise: number;
    compressorNoise: number;
  };

  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelRatio: number;
  };

  timezone: {
    offsetMinutes: number;
    timezoneId: string;
  };
}

/**
 * Default realistic configurations for different profiles
 */
export const PROFILE_PRESETS = {
  windows_chrome: {
    platform: 'Win32',
    webglVendor: 'Google Inc. (Intel)',
    webglRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    colorDepth: 24,
    screenWidth: 1920,
    screenHeight: 1080,
  },
  windows_edge: {
    platform: 'Win32',
    webglVendor: 'Google Inc. (Intel)',
    webglRenderer: 'ANGLE (Intel, Intel(R) Iris Plus Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    colorDepth: 24,
    screenWidth: 2560,
    screenHeight: 1440,
  },
  mac_chrome: {
    platform: 'MacIntel',
    webglVendor: 'Google Inc. (Apple)',
    webglRenderer: 'ANGLE (Apple, Apple M1, OpenGL 4.1)',
    colorDepth: 30,
    screenWidth: 2560,
    screenHeight: 1600,
  },
  linux_chrome: {
    platform: 'Linux x86_64',
    webglVendor: 'Google Inc. (Mesa)',
    webglRenderer: 'ANGLE (Mesa, llvmpipe, OpenGL 4.5)',
    colorDepth: 24,
    screenWidth: 1920,
    screenHeight: 1080,
  },
};

/**
 * FingerprintBridge - Manages unified configuration between JS and C++
 */
export class FingerprintBridge {
  private config: UnifiedFingerprintConfig;
  private configFilePath: string | null = null;

  constructor(config?: Partial<UnifiedFingerprintConfig>) {
    this.config = this.createConfig(config);
  }

  /**
   * Create configuration with defaults and overrides
   */
  private createConfig(overrides?: Partial<UnifiedFingerprintConfig>): UnifiedFingerprintConfig {
    // Generate deterministic seed if not provided
    const sessionSeed = overrides?.sessionSeed ||
      parseInt(crypto.randomBytes(6).toString('hex'), 16);

    // Use seed for deterministic "random" values
    const seededRandom = this.createSeededRandom(sessionSeed);

    // Select random preset if not specified
    const presetKeys = Object.keys(PROFILE_PRESETS) as (keyof typeof PROFILE_PRESETS)[];
    const presetIndex = Math.floor(seededRandom() * presetKeys.length);
    const preset = PROFILE_PRESETS[presetKeys[presetIndex]];

    // Common hardware configurations
    const commonCores = [4, 8, 12, 16];
    const commonMemory = [4, 8, 16, 32];

    const config: UnifiedFingerprintConfig = {
      sessionSeed,

      navigator: {
        hardwareConcurrency: overrides?.navigator?.hardwareConcurrency ||
          commonCores[Math.floor(seededRandom() * commonCores.length)],
        deviceMemory: overrides?.navigator?.deviceMemory ||
          commonMemory[Math.floor(seededRandom() * commonMemory.length)],
        platform: overrides?.navigator?.platform || preset.platform,
        userAgent: overrides?.navigator?.userAgent || this.generateUserAgent(preset.platform, seededRandom),
        languages: overrides?.navigator?.languages || ['en-US', 'en'],
      },

      canvas: {
        noiseLevel: overrides?.canvas?.noiseLevel ?? 0.001,
        noiseAmplitude: overrides?.canvas?.noiseAmplitude ?? 2,
      },

      webgl: {
        vendor: overrides?.webgl?.vendor || preset.webglVendor,
        renderer: overrides?.webgl?.renderer || preset.webglRenderer,
        version: overrides?.webgl?.version || 'WebGL 1.0 (OpenGL ES 2.0 Chromium)',
        readpixelsNoise: overrides?.webgl?.readpixelsNoise ?? 0.001,
      },

      audio: {
        analyserNoise: overrides?.audio?.analyserNoise ?? 0.0001,
        oscillatorNoise: overrides?.audio?.oscillatorNoise ?? 0.00001,
        compressorNoise: overrides?.audio?.compressorNoise ?? 0.001,
      },

      screen: {
        width: overrides?.screen?.width || preset.screenWidth,
        height: overrides?.screen?.height || preset.screenHeight,
        availWidth: overrides?.screen?.availWidth || preset.screenWidth,
        availHeight: overrides?.screen?.availHeight || (preset.screenHeight - 40), // Taskbar
        colorDepth: overrides?.screen?.colorDepth || preset.colorDepth,
        pixelRatio: overrides?.screen?.pixelRatio ?? 1.0,
      },

      timezone: {
        offsetMinutes: overrides?.timezone?.offsetMinutes ?? -(new Date().getTimezoneOffset()),
        timezoneId: overrides?.timezone?.timezoneId ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    return config;
  }

  /**
   * Create a seeded pseudo-random number generator
   */
  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  /**
   * Generate realistic user agent string
   */
  private generateUserAgent(platform: string, random: () => number): string {
    const chromeVersion = 122 + Math.floor(random() * 3); // 122-124
    const buildVersion = 6261 + Math.floor(random() * 100);

    const platformStrings: Record<string, string> = {
      'Win32': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${buildVersion}.0 Safari/537.36`,
      'MacIntel': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${buildVersion}.0 Safari/537.36`,
      'Linux x86_64': `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${buildVersion}.0 Safari/537.36`,
    };

    return platformStrings[platform] || platformStrings['Win32'];
  }

  /**
   * Write configuration to a temporary file for C++ engine
   * Returns the file path that should be passed to --fingerprint-config
   */
  writeConfigFile(): string {
    if (this.configFilePath) {
      return this.configFilePath;
    }

    const tempDir = os.tmpdir();
    const filename = `fp_config_${this.config.sessionSeed}.json`;
    this.configFilePath = path.join(tempDir, filename);

    fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2));

    return this.configFilePath;
  }

  /**
   * Clean up the config file
   */
  cleanup(): void {
    if (this.configFilePath && fs.existsSync(this.configFilePath)) {
      try {
        fs.unlinkSync(this.configFilePath);
      } catch {
        // Ignore cleanup errors
      }
      this.configFilePath = null;
    }
  }

  /**
   * Get Chrome launch arguments for fingerprint configuration
   */
  getLaunchArgs(): string[] {
    const configPath = this.writeConfigFile();
    return [
      `--fingerprint-config=${configPath}`,
      `--fingerprint-seed=${this.config.sessionSeed}`,
    ];
  }

  /**
   * Get the configuration object
   */
  getConfig(): UnifiedFingerprintConfig {
    return this.config;
  }

  /**
   * Generate JavaScript code to inject into page
   * This creates __fpConfig that JS modules will read from
   */
  getInjectionScript(): string {
    const configJson = JSON.stringify(this.config);

    return `
      // ==========================================================================
      // UNIFIED FINGERPRINT CONFIGURATION
      // This MUST match the C++ FingerprintSessionManager configuration
      // Generated by FingerprintBridge
      // ==========================================================================

      (function() {
        'use strict';

        // Prevent multiple injections
        if (window.__fpConfig) {
          return;
        }

        // Freeze the config to prevent tampering
        const config = Object.freeze(${configJson});

        // Define as non-enumerable, non-configurable property
        Object.defineProperty(window, '__fpConfig', {
          value: config,
          writable: false,
          configurable: false,
          enumerable: false
        });

        // Also provide a getter function for safety
        Object.defineProperty(window, '__getFpConfig', {
          value: function() { return config; },
          writable: false,
          configurable: false,
          enumerable: false
        });

        // =======================================================================
        // SEEDED RANDOM NUMBER GENERATOR
        // MUST match the C++ implementation for consistent noise
        // =======================================================================

        const seed = config.sessionSeed;
        let rngState = seed;

        function seededRandom() {
          rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
          return rngState / 0x7fffffff;
        }

        // Expose for modules
        Object.defineProperty(window, '__fpRandom', {
          value: seededRandom,
          writable: false,
          configurable: false,
          enumerable: false
        });

        // =======================================================================
        // APPLY NAVIGATOR SPOOFING
        // Must match C++ navigator patches
        // =======================================================================

        // hardwareConcurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => config.navigator.hardwareConcurrency,
          configurable: true
        });

        // deviceMemory
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => config.navigator.deviceMemory,
          configurable: true
        });

        // platform
        Object.defineProperty(navigator, 'platform', {
          get: () => config.navigator.platform,
          configurable: true
        });

        // languages
        Object.defineProperty(navigator, 'languages', {
          get: () => Object.freeze([...config.navigator.languages]),
          configurable: true
        });

        // language (first language)
        Object.defineProperty(navigator, 'language', {
          get: () => config.navigator.languages[0],
          configurable: true
        });

        // webdriver - CRITICAL: always false
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
          configurable: true
        });

        // =======================================================================
        // APPLY SCREEN SPOOFING
        // Must match C++ screen patches
        // =======================================================================

        Object.defineProperty(screen, 'width', {
          get: () => config.screen.width,
          configurable: true
        });

        Object.defineProperty(screen, 'height', {
          get: () => config.screen.height,
          configurable: true
        });

        Object.defineProperty(screen, 'availWidth', {
          get: () => config.screen.availWidth,
          configurable: true
        });

        Object.defineProperty(screen, 'availHeight', {
          get: () => config.screen.availHeight,
          configurable: true
        });

        Object.defineProperty(screen, 'colorDepth', {
          get: () => config.screen.colorDepth,
          configurable: true
        });

        Object.defineProperty(screen, 'pixelDepth', {
          get: () => config.screen.colorDepth,
          configurable: true
        });

        // devicePixelRatio
        Object.defineProperty(window, 'devicePixelRatio', {
          get: () => config.screen.pixelRatio,
          configurable: true
        });

        // outerWidth/outerHeight
        Object.defineProperty(window, 'outerWidth', {
          get: () => config.screen.width,
          configurable: true
        });

        Object.defineProperty(window, 'outerHeight', {
          get: () => config.screen.height,
          configurable: true
        });

        // =======================================================================
        // WEBGL SPOOFING
        // Must match C++ WebGL patches
        // =======================================================================

        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(pname) {
          // UNMASKED_VENDOR_WEBGL
          if (pname === 0x9245) {
            return config.webgl.vendor;
          }
          // UNMASKED_RENDERER_WEBGL
          if (pname === 0x9246) {
            return config.webgl.renderer;
          }
          return originalGetParameter.call(this, pname);
        };

        // WebGL2
        if (typeof WebGL2RenderingContext !== 'undefined') {
          const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
          WebGL2RenderingContext.prototype.getParameter = function(pname) {
            if (pname === 0x9245) {
              return config.webgl.vendor;
            }
            if (pname === 0x9246) {
              return config.webgl.renderer;
            }
            return originalGetParameter2.call(this, pname);
          };
        }

        // =======================================================================
        // CANVAS FINGERPRINT PROTECTION
        // Noise algorithm MUST match C++ implementation
        // =======================================================================

        function addCanvasNoise(imageData) {
          const data = imageData.data;
          const pixelCount = data.length / 4;
          const noiseCount = Math.floor(pixelCount * config.canvas.noiseLevel);
          const amplitude = config.canvas.noiseAmplitude;

          // Reset RNG state for consistency
          let state = seed;
          const random = () => {
            state = (state * 1103515245 + 12345) & 0x7fffffff;
            return state / 0x7fffffff;
          };

          for (let i = 0; i < noiseCount; i++) {
            const pixelIdx = Math.floor(random() * pixelCount);
            const byteIdx = pixelIdx * 4;

            // Modify RGB channels only (not alpha)
            for (let c = 0; c < 3; c++) {
              const noise = Math.floor(random() * (amplitude * 2 + 1)) - amplitude;
              let val = data[byteIdx + c] + noise;
              if (val < 0) val = 0;
              if (val > 255) val = 255;
              data[byteIdx + c] = val;
            }
          }

          return imageData;
        }

        // Override toDataURL
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(...args) {
          try {
            const ctx = this.getContext('2d');
            if (ctx && this.width > 0 && this.height > 0) {
              const imageData = ctx.getImageData(0, 0, this.width, this.height);
              addCanvasNoise(imageData);
              ctx.putImageData(imageData, 0, 0);
            }
          } catch (e) {
            // Ignore errors (tainted canvas, etc.)
          }
          return originalToDataURL.apply(this, args);
        };

        // Override toBlob
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
          try {
            const ctx = this.getContext('2d');
            if (ctx && this.width > 0 && this.height > 0) {
              const imageData = ctx.getImageData(0, 0, this.width, this.height);
              addCanvasNoise(imageData);
              ctx.putImageData(imageData, 0, 0);
            }
          } catch (e) {
            // Ignore errors
          }
          return originalToBlob.call(this, callback, ...args);
        };

        // Override getImageData
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
          const imageData = originalGetImageData.apply(this, args);
          addCanvasNoise(imageData);
          return imageData;
        };

        console.log('[FingerprintBridge] Unified configuration applied');
      })();
    `;
  }
}

/**
 * Export singleton for convenience
 */
export function createFingerprintBridge(config?: Partial<UnifiedFingerprintConfig>): FingerprintBridge {
  return new FingerprintBridge(config);
}
