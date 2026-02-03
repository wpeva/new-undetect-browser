import { Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { FingerprintProfile } from '../utils/fingerprint-generator';

/**
 * Fingerprint Spoofing Module
 * Protects against Canvas, WebGL, and Audio fingerprinting
 */
export class FingerprintSpoofingModule {
  private profile: FingerprintProfile;

  constructor(profile: FingerprintProfile) {
    this.profile = profile;
  }

  /**
   * Inject fingerprint spoofing scripts
   */
  async inject(page: Page): Promise<void> {
    logger.debug('Injecting fingerprint spoofing scripts');

    await page.evaluateOnNewDocument((profile: FingerprintProfile) => {
      // Wrap everything in try-catch to prevent script breakage
      try {
        // ========================================
        // Safe property access helpers
        // ========================================
        const safeGet = (obj: any, path: string, defaultVal: any) => {
          try {
            const keys = path.split('.');
            let result = obj;
            for (const key of keys) {
              if (result === null || result === undefined) return defaultVal;
              result = result[key];
            }
            return result ?? defaultVal;
          } catch {
            return defaultVal;
          }
        };

        // ========================================
        // Per-Domain Consistency
        // ========================================

      // Generate deterministic seed from domain
      const getDomainSeed = (): number => {
        const domain = window.location.hostname || 'localhost';
        let hash = 0;
        for (let i = 0; i < domain.length; i++) {
          const char = domain.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
      };

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

      const domainSeed = getDomainSeed();
      const domainRng = new SeededRandom(domainSeed);

      // ========================================
      // 1. Canvas Fingerprint Protection (Per-Domain Consistency)
      // ========================================

      // Store canvas fingerprint per domain
      const canvasFingerprints = new Map<HTMLCanvasElement, ImageData>();

      const canvasNoise = (canvas: HTMLCanvasElement) => {
        const context = canvas.getContext('2d');
        if (!context) {return;}

        const originalGetImageData = context.getImageData;
        context.getImageData = function (...args: any[]) {
          const imageData = originalGetImageData.apply(this, args as any);

          // Use domain-specific RNG for consistent noise
          const canvasRng = new SeededRandom(domainSeed + canvas.width + canvas.height);

          // Add subtle noise based on profile (with safe defaults)
          const noiseLevel = safeGet(profile, 'canvas.noiseLevel', 0.01);

          for (let i = 0; i < imageData.data.length; i += 4) {
            if (canvasRng.next() < noiseLevel) {
              const noise = Math.floor(canvasRng.next() * 3) - 1; // -1, 0, or 1
              imageData.data[i] = Math.min(
                255,
                Math.max(0, imageData.data[i] + noise)
              );
              imageData.data[i + 1] = Math.min(
                255,
                Math.max(0, imageData.data[i + 1] + noise)
              );
              imageData.data[i + 2] = Math.min(
                255,
                Math.max(0, imageData.data[i + 2] + noise)
              );
            }
          }

          return imageData;
        };
      };

      // Hook toDataURL
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
        canvasNoise(this);
        return originalToDataURL.apply(this, args as any);
      };

      // Hook toBlob
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (...args: any[]) {
        canvasNoise(this);
        return originalToBlob.apply(this, args as any);
      };

      // ========================================
      // 2. WebGL Fingerprint Protection - ONLY vendor/renderer
      // ========================================
      // IMPORTANT: Only spoof vendor/renderer identifiers
      // All other parameters should return REAL values from the actual GPU
      // Hardcoding parameters causes inconsistencies that are easily detected

      const webglVendor = safeGet(profile, 'webgl.vendor', 'Intel Inc.');
      const webglRenderer = safeGet(profile, 'webgl.renderer', 'Intel Iris OpenGL Engine');

      // Only these two parameters are spoofed
      const UNMASKED_VENDOR_WEBGL = 37445;
      const UNMASKED_RENDERER_WEBGL = 37446;

      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        // Only spoof vendor/renderer - all other params return real GPU values
        if (parameter === UNMASKED_VENDOR_WEBGL) return webglVendor;
        if (parameter === UNMASKED_RENDERER_WEBGL) return webglRenderer;
        return getParameter.call(this, parameter);
      };

      // WebGL2 - same approach, only vendor/renderer
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function (parameter) {
          if (parameter === UNMASKED_VENDOR_WEBGL) return webglVendor;
          if (parameter === UNMASKED_RENDERER_WEBGL) return webglRenderer;
          return getParameter2.call(this, parameter);
        };
      }

      // WebGL extensions spoofing
      const originalGetExtension = WebGLRenderingContext.prototype.getExtension;
      WebGLRenderingContext.prototype.getExtension = function(name: string) {
        const extension = originalGetExtension.call(this, name);

        // Spoof WEBGL_debug_renderer_info extension
        if (name === 'WEBGL_debug_renderer_info' && extension) {
          const originalGetParameter = this.getParameter.bind(this);
          this.getParameter = function(parameter: number) {
            if (parameter === 37445) return webglVendor;
            if (parameter === 37446) return webglRenderer;
            return originalGetParameter(parameter);
          };
        }

        return extension;
      };

      if (typeof WebGL2RenderingContext !== 'undefined') {
        const originalGetExtension2 = WebGL2RenderingContext.prototype.getExtension;
        WebGL2RenderingContext.prototype.getExtension = function(name: string) {
          const extension = originalGetExtension2.call(this, name);

          if (name === 'WEBGL_debug_renderer_info' && extension) {
            const originalGetParameter = this.getParameter.bind(this);
            this.getParameter = function(parameter: number) {
              if (parameter === 37445) return webglVendor;
              if (parameter === 37446) return webglRenderer;
              return originalGetParameter(parameter);
            };
          }

          return extension;
        };
      }

      // ========================================
      // 3. Audio Context Fingerprint Protection (Enhanced)
      // ========================================
      if (typeof AudioContext !== 'undefined') {
        // Hook createOscillator for frequency variation
        const audioContext = AudioContext.prototype.createOscillator;
        AudioContext.prototype.createOscillator = function (...args: any[]) {
          const oscillator = audioContext.apply(this, args as any);
          const originalStart = oscillator.start;

          oscillator.start = function (...args: any[]) {
            // Add micro-variation to frequency (with safe default)
            if (this.frequency) {
              const variation = safeGet(profile, 'audio.frequencyVariation', 0.001);
              this.frequency.value += variation;
            }
            return originalStart.apply(this, args as any);
          };

          return oscillator;
        };

        // Hook createDynamicsCompressor for destination noise
        const originalCreateDynamicsCompressor = AudioContext.prototype.createDynamicsCompressor;
        AudioContext.prototype.createDynamicsCompressor = function (...args: any[]) {
          const compressor = originalCreateDynamicsCompressor.apply(this, args as any);

          // Add subtle variations to compressor parameters
          const audioRng = new SeededRandom(domainSeed + 1000);

          if (compressor.threshold) {
            compressor.threshold.value += (audioRng.next() - 0.5) * 0.001;
          }
          if (compressor.knee) {
            compressor.knee.value += (audioRng.next() - 0.5) * 0.001;
          }
          if (compressor.ratio) {
            compressor.ratio.value += (audioRng.next() - 0.5) * 0.001;
          }
          if (compressor.attack) {
            compressor.attack.value += (audioRng.next() - 0.5) * 0.00001;
          }
          if (compressor.release) {
            compressor.release.value += (audioRng.next() - 0.5) * 0.0001;
          }

          return compressor;
        };

        // Hook createAnalyser for consistent noise
        const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
        AudioContext.prototype.createAnalyser = function (...args: any[]) {
          const analyser = originalCreateAnalyser.apply(this, args as any);
          const audioRng = new SeededRandom(domainSeed + 2000);

          const originalGetByteTimeDomainData = analyser.getByteTimeDomainData.bind(analyser);
          analyser.getByteTimeDomainData = function (array: Uint8Array) {
            originalGetByteTimeDomainData(array);

            // Add minimal noise to audio data
            for (let i = 0; i < array.length; i++) {
              if (audioRng.next() < 0.01) {
                const noise = Math.floor(audioRng.next() * 3) - 1;
                array[i] = Math.min(255, Math.max(0, array[i] + noise));
              }
            }

            return;
          };

          const originalGetByteFrequencyData = analyser.getByteFrequencyData.bind(analyser);
          analyser.getByteFrequencyData = function (array: Uint8Array) {
            originalGetByteFrequencyData(array);

            // Add minimal noise to frequency data
            for (let i = 0; i < array.length; i++) {
              if (audioRng.next() < 0.01) {
                const noise = Math.floor(audioRng.next() * 3) - 1;
                array[i] = Math.min(255, Math.max(0, array[i] + noise));
              }
            }

            return;
          };

          return analyser;
        };

        // Hook destination for consistent audio output
        const originalDestination = Object.getOwnPropertyDescriptor(
          AudioContext.prototype,
          'destination'
        );

        if (originalDestination) {
          Object.defineProperty(AudioContext.prototype, 'destination', {
            get: function () {
              const destination = originalDestination.get?.call(this);

              if (destination && !destination._spoofed) {
                // Mark as spoofed to avoid re-wrapping
                (destination as any)._spoofed = true;

                // Add subtle variation to destination properties
                const audioRng = new SeededRandom(domainSeed + 3000);

                if (destination.maxChannelCount) {
                  Object.defineProperty(destination, 'maxChannelCount', {
                    get: function () {
                      const base = 2;
                      const noise = Math.floor(audioRng.next() * 2);
                      return base + noise; // 2-3 channels
                    },
                    configurable: true,
                  });
                }
              }

              return destination;
            },
            configurable: true,
          });
        }
      }

      // Support for webkitAudioContext
      if (typeof (window as any).webkitAudioContext !== 'undefined') {
        const WebkitAudioContext = (window as any).webkitAudioContext;

        const originalCreateOscillator = WebkitAudioContext.prototype.createOscillator;
        WebkitAudioContext.prototype.createOscillator = function (...args: any[]) {
          const oscillator = originalCreateOscillator.apply(this, args as any);
          const originalStart = oscillator.start;

          oscillator.start = function (...args: any[]) {
            if (this.frequency) {
              const variation = safeGet(profile, 'audio.frequencyVariation', 0.001);
              this.frequency.value += variation;
            }
            return originalStart.apply(this, args as any);
          };

          return oscillator;
        };
      }

      // ========================================
      // 4. Screen Properties (with safe defaults)
      // ========================================
      const screenWidth = safeGet(profile, 'screen.width', 1920);
      const screenHeight = safeGet(profile, 'screen.height', 1080);
      const screenAvailWidth = safeGet(profile, 'screen.availWidth', 1920);
      const screenAvailHeight = safeGet(profile, 'screen.availHeight', 1040);
      const screenColorDepth = safeGet(profile, 'screen.colorDepth', 24);
      const screenPixelDepth = safeGet(profile, 'screen.pixelDepth', 24);

      Object.defineProperties(screen, {
        availWidth: {
          get: () => screenAvailWidth,
          configurable: true,
        },
        availHeight: {
          get: () => screenAvailHeight,
          configurable: true,
        },
        width: {
          get: () => screenWidth,
          configurable: true,
        },
        height: {
          get: () => screenHeight,
          configurable: true,
        },
        colorDepth: {
          get: () => screenColorDepth,
          configurable: true,
        },
        pixelDepth: {
          get: () => screenPixelDepth,
          configurable: true,
        },
      });

      // ========================================
      // 5. Hardware Properties (with safe defaults)
      // ========================================
      const hardwareCores = safeGet(profile, 'hardware.cores', 4);
      const hardwareMemory = safeGet(profile, 'hardware.memory', 8);

      Object.defineProperties(navigator, {
        hardwareConcurrency: {
          get: () => hardwareCores,
          configurable: true,
        },
        deviceMemory: {
          get: () => hardwareMemory,
          configurable: true,
        },
      });

      // ========================================
      // 6. Font Fingerprinting Protection
      // ========================================
      // Protect against font enumeration via text measurement
      const originalOffsetWidth = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        'offsetWidth'
      );
      const originalOffsetHeight = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        'offsetHeight'
      );

      // Add subtle noise to text measurements
      if (originalOffsetWidth) {
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
          get: function () {
            const value = originalOffsetWidth.get?.call(this);
            // Only add noise for text measurement elements
            if (this.style && this.style.font) {
              const noise = (Math.random() - 0.5) * 0.01; // ±0.005px noise
              return value ? value + noise : value;
            }
            return value;
          },
          configurable: true,
        });
      }

      if (originalOffsetHeight) {
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
          get: function () {
            const value = originalOffsetHeight.get?.call(this);
            // Only add noise for text measurement elements
            if (this.style && this.style.font) {
              const noise = (Math.random() - 0.5) * 0.01; // ±0.005px noise
              return value ? value + noise : value;
            }
            return value;
          },
          configurable: true,
        });
      }

      // Protect against CanvasRenderingContext2D.measureText
      // WARNING: DO NOT use Proxy - it can be detected!
      // DO NOT add random noise - it causes inconsistency between calls
      // Just return the original metrics - consistency is more important than uniqueness
      // Font fingerprinting relies on EXACT measurements being the same every time

      // ========================================
      // 7. Battery API Protection
      // ========================================
      if (navigator.getBattery) {
        navigator.getBattery = function () {
          return Promise.resolve({
            charging: Math.random() > 0.5,
            chargingTime: Infinity,
            dischargingTime: Math.random() * 10800 + 3600, // 1-4 hours
            level: 0.5 + Math.random() * 0.5, // 50-100%
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
            onchargingchange: null,
            onchargingtimechange: null,
            ondischargingtimechange: null,
            onlevelchange: null,
          } as any);
        };
      }

      // ========================================
      // 8. Media Devices Protection
      // ========================================
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices = function () {
          return Promise.resolve([
            {
              deviceId: 'default',
              kind: 'audioinput' as MediaDeviceKind,
              label: 'Default - Microphone (Realtek High Definition Audio)',
              groupId: 'group1',
              toJSON: function () {
                return this;
              },
            },
            {
              deviceId: 'communications',
              kind: 'audioinput' as MediaDeviceKind,
              label:
                'Communications - Microphone (Realtek High Definition Audio)',
              groupId: 'group1',
              toJSON: function () {
                return this;
              },
            },
            {
              deviceId: 'device1',
              kind: 'videoinput' as MediaDeviceKind,
              label: 'HD WebCam (04f2:b5ce)',
              groupId: 'group2',
              toJSON: function () {
                return this;
              },
            },
            {
              deviceId: 'default',
              kind: 'audiooutput' as MediaDeviceKind,
              label: 'Default - Speakers (Realtek High Definition Audio)',
              groupId: 'group1',
              toJSON: function () {
                return this;
              },
            },
          ] as MediaDeviceInfo[]);
        };
      }

      // ========================================
      // 9. Timezone Consistency
      // ========================================
      // This is handled by Puppeteer's emulateTimezone
      // But we ensure Date methods are consistent

      // ========================================
      // 10. ClientRects/Range Fingerprinting Protection
      // ========================================
      // Add subtle noise to ClientRects measurements
      const originalGetClientRects = Element.prototype.getClientRects;
      Element.prototype.getClientRects = function () {
        const rects = originalGetClientRects.call(this);
        // Return as-is, but could add noise here if needed
        return rects;
      };

      } catch (e) {
        // Silently fail to avoid breaking the page
        // console.error('Fingerprint spoofing error:', e);
      }
    }, this.profile);

    logger.debug('Fingerprint spoofing scripts injected successfully');
  }

  /**
   * Update the fingerprint profile
   */
  setProfile(profile: FingerprintProfile): void {
    this.profile = profile;
  }

  /**
   * Get the current profile
   */
  getProfile(): FingerprintProfile {
    return this.profile;
  }

  /**
   * Get the name of this module
   */
  getName(): string {
    return 'FingerprintSpoofing';
  }
}
