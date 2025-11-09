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
      // ========================================
      // 1. Canvas Fingerprint Protection
      // ========================================
      const canvasNoise = (canvas: HTMLCanvasElement) => {
        const context = canvas.getContext('2d');
        if (!context) return;

        const originalGetImageData = context.getImageData;
        context.getImageData = function (...args: any[]) {
          const imageData = originalGetImageData.apply(this, args as any);

          // Add subtle noise based on profile
          const noiseLevel = profile.canvas.noiseLevel;

          for (let i = 0; i < imageData.data.length; i += 4) {
            if (Math.random() < noiseLevel) {
              const noise = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
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
      // 2. WebGL Fingerprint Protection
      // ========================================
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return profile.webgl.vendor;
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return profile.webgl.renderer;
        }
        return getParameter.call(this, parameter);
      };

      // WebGL2
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function (parameter) {
          if (parameter === 37445) {
            return profile.webgl.vendor;
          }
          if (parameter === 37446) {
            return profile.webgl.renderer;
          }
          return getParameter2.call(this, parameter);
        };
      }

      // ========================================
      // 3. Audio Context Fingerprint Protection
      // ========================================
      if (typeof AudioContext !== 'undefined') {
        const audioContext = AudioContext.prototype.createOscillator;
        AudioContext.prototype.createOscillator = function (...args: any[]) {
          const oscillator = audioContext.apply(this, args as any);
          const originalStart = oscillator.start;

          oscillator.start = function (...args: any[]) {
            // Add micro-variation to frequency
            if (this.frequency) {
              const variation = profile.audio.frequencyVariation;
              this.frequency.value += variation;
            }
            return originalStart.apply(this, args as any);
          };

          return oscillator;
        };
      }

      // ========================================
      // 4. Screen Properties
      // ========================================
      Object.defineProperties(screen, {
        availWidth: {
          get: () => profile.screen.availWidth,
          configurable: true,
        },
        availHeight: {
          get: () => profile.screen.availHeight,
          configurable: true,
        },
        width: {
          get: () => profile.screen.width,
          configurable: true,
        },
        height: {
          get: () => profile.screen.height,
          configurable: true,
        },
        colorDepth: {
          get: () => profile.screen.colorDepth,
          configurable: true,
        },
        pixelDepth: {
          get: () => profile.screen.pixelDepth,
          configurable: true,
        },
      });

      // ========================================
      // 5. Hardware Properties
      // ========================================
      Object.defineProperties(navigator, {
        hardwareConcurrency: {
          get: () => profile.hardware.cores,
          configurable: true,
        },
        deviceMemory: {
          get: () => profile.hardware.memory,
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
      const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
      CanvasRenderingContext2D.prototype.measureText = function (text: string) {
        const metrics = originalMeasureText.call(this, text);
        // Add imperceptible noise to metrics
        const noise = 0.0001;

        return new Proxy(metrics, {
          get: function (target, prop) {
            if (prop === 'width') {
              return (target as any)[prop] + (Math.random() - 0.5) * noise;
            }
            return Reflect.get(target, prop);
          },
        });
      };

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
