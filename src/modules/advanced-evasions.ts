import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * Advanced Evasions Module
 * Protection against modern detection methods:
 * - Performance API timing attacks
 * - Touch events detection
 * - Speech API fingerprinting
 * - Gamepad API fingerprinting
 * - Media codecs fingerprinting
 * - ClientRects noise injection
 */
export class AdvancedEvasionsModule {
  /**
   * Inject advanced evasion scripts
   */
  async inject(page: Page): Promise<void> {
    logger.debug('Injecting advanced evasion scripts');

    await page.evaluateOnNewDocument(() => {
      // ========================================
      // 1. Performance API Timing Protection
      // ========================================
      // Prevent detection via performance.now() patterns
      const originalPerformanceNow = performance.now.bind(performance);
      let performanceOffset = Math.random() * 0.1; // 0-0.1ms offset

      performance.now = function () {
        const actualTime = originalPerformanceNow();
        // Add subtle noise to prevent timing pattern detection
        const noise = (Math.random() - 0.5) * 0.05;
        return actualTime + performanceOffset + noise;
      };

      // Spoof performance.timing to hide automation artifacts
      const originalPerformanceTiming = performance.timing;
      Object.defineProperty(performance, 'timing', {
        get: function () {
          const timing = originalPerformanceTiming;
          // Ensure realistic timing values
          const now = Date.now();
          const loadTime = 500 + Math.random() * 1000; // 500-1500ms load time

          return new Proxy(timing, {
            get: function (target, prop) {
              if (prop === 'navigationStart') {
                return now - loadTime;
              }
              if (prop === 'loadEventEnd') {
                return now;
              }
              return Reflect.get(target, prop);
            },
          });
        },
      });

      // ========================================
      // 2. Touch Events Emulation
      // ========================================
      // Make mobile user agents more believable
      if (!('ontouchstart' in window)) {
        // Add touch event support for mobile user agents
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
          (window as any).ontouchstart = null;
          (window as any).ontouchmove = null;
          (window as any).ontouchend = null;
          (window as any).ontouchcancel = null;

          // Add Touch and TouchList constructors
          (window as any).Touch = class Touch {
            identifier: number;
            target: EventTarget;
            screenX: number;
            screenY: number;
            clientX: number;
            clientY: number;
            pageX: number;
            pageY: number;
            radiusX?: number;
            radiusY?: number;
            rotationAngle?: number;
            force?: number;

            constructor(init: any) {
              this.identifier = init.identifier || 0;
              this.target = init.target || document.body;
              this.screenX = init.screenX || 0;
              this.screenY = init.screenY || 0;
              this.clientX = init.clientX || 0;
              this.clientY = init.clientY || 0;
              this.pageX = init.pageX || 0;
              this.pageY = init.pageY || 0;
            }
          };

          (window as any).TouchList = class TouchList extends Array {
            item(index: number) {
              return this[index];
            }
          };

          // Add maxTouchPoints
          Object.defineProperty(navigator, 'maxTouchPoints', {
            get: () => 5,
            configurable: true,
          });
        }
      }

      // ========================================
      // 3. Speech API Protection
      // ========================================
      // Protect against SpeechSynthesis fingerprinting
      if (window.speechSynthesis) {
        const originalGetVoices = window.speechSynthesis.getVoices.bind(
          window.speechSynthesis
        );

        window.speechSynthesis.getVoices = function () {
          const voices = originalGetVoices();
          // Ensure at least some standard voices exist
          if (voices.length === 0) {
            return [
              {
                voiceURI: 'Google US English',
                name: 'Google US English',
                lang: 'en-US',
                localService: false,
                default: true,
              } as SpeechSynthesisVoice,
            ];
          }
          return voices;
        };
      }

      // ========================================
      // 4. Gamepad API Protection
      // ========================================
      // Prevent gamepad fingerprinting
      if (navigator.getGamepads) {
        const originalGetGamepads = navigator.getGamepads.bind(navigator);

        navigator.getGamepads = function () {
          // Always return empty array for consistency
          return [null, null, null, null] as (Gamepad | null)[];
        };
      }

      // ========================================
      // 5. Media Codecs Spoofing
      // ========================================
      // Ensure consistent codec support
      if (HTMLMediaElement.prototype.canPlayType) {
        const originalCanPlayType =
          HTMLMediaElement.prototype.canPlayType.bind(HTMLMediaElement.prototype);

        HTMLMediaElement.prototype.canPlayType = function (type: string) {
          // Standard codec support for Chrome
          const supportedTypes: Record<string, string> = {
            'video/mp4': 'probably',
            'video/webm': 'probably',
            'video/ogg': 'maybe',
            'audio/mpeg': 'probably',
            'audio/ogg': 'probably',
            'audio/wav': 'probably',
            'audio/webm': 'probably',
          };

          const baseType = type.split(';')[0].trim().toLowerCase();
          if (supportedTypes[baseType]) {
            return supportedTypes[baseType];
          }

          return originalCanPlayType.call(this, type);
        };
      }

      // ========================================
      // 6. ClientRects Noise Injection
      // ========================================
      // Add subtle noise to ClientRects to prevent rect-based fingerprinting
      const originalGetBoundingClientRect =
        Element.prototype.getBoundingClientRect;

      Element.prototype.getBoundingClientRect = function () {
        const rect = originalGetBoundingClientRect.call(this);
        const noise = 0.0001; // Subtle noise

        return new Proxy(rect, {
          get: function (target, prop) {
            if (typeof prop === 'string' && ['x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left'].includes(prop)) {
              const value = Reflect.get(target, prop) as number;
              // Add imperceptible noise
              return value + (Math.random() - 0.5) * noise;
            }
            return Reflect.get(target, prop);
          },
        });
      };

      // ========================================
      // 7. DeviceOrientation/Motion Events
      // ========================================
      // Spoof device orientation for desktop browsers
      const ua = navigator.userAgent.toLowerCase();
      if (!ua.includes('mobile') && !ua.includes('android') && !ua.includes('iphone')) {
        // Desktop shouldn't have these events
        if ((window as any).DeviceOrientationEvent) {
          delete (window as any).DeviceOrientationEvent;
        }
        if ((window as any).DeviceMotionEvent) {
          delete (window as any).DeviceMotionEvent;
        }
      }

      // ========================================
      // 8. Sensor API Protection
      // ========================================
      // Remove sensor APIs that leak device information
      if ((window as any).Sensor) {
        delete (window as any).Sensor;
      }
      if ((window as any).Accelerometer) {
        delete (window as any).Accelerometer;
      }
      if ((window as any).LinearAccelerationSensor) {
        delete (window as any).LinearAccelerationSensor;
      }
      if ((window as any).Gyroscope) {
        delete (window as any).Gyroscope;
      }
      if ((window as any).Magnetometer) {
        delete (window as any).Magnetometer;
      }
      if ((window as any).AbsoluteOrientationSensor) {
        delete (window as any).AbsoluteOrientationSensor;
      }
      if ((window as any).RelativeOrientationSensor) {
        delete (window as any).RelativeOrientationSensor;
      }
      if ((window as any).AmbientLightSensor) {
        delete (window as any).AmbientLightSensor;
      }
      if ((window as any).ProximitySensor) {
        delete (window as any).ProximitySensor;
      }

      // ========================================
      // 9. Presentation API Protection
      // ========================================
      // Remove Presentation API that can leak device info
      if ((window as any).Presentation) {
        delete (window as any).Presentation;
      }
      if ((navigator as any).presentation) {
        delete (navigator as any).presentation;
      }

      // ========================================
      // 10. WebVR/WebXR Protection
      // ========================================
      // Remove VR/XR APIs to reduce fingerprinting surface
      if ((navigator as any).getVRDisplays) {
        (navigator as any).getVRDisplays = function () {
          return Promise.resolve([]);
        };
      }

      if ((navigator as any).xr) {
        delete (navigator as any).xr;
      }

      // ========================================
      // 11. USB API Protection
      // ========================================
      // Remove USB API
      if ((navigator as any).usb) {
        delete (navigator as any).usb;
      }

      // ========================================
      // 12. Bluetooth API Protection
      // ========================================
      // Remove Bluetooth API
      if ((navigator as any).bluetooth) {
        delete (navigator as any).bluetooth;
      }

      // ========================================
      // 13. NFC API Protection
      // ========================================
      // Remove NFC API
      if ((navigator as any).nfc) {
        delete (navigator as any).nfc;
      }

      // ========================================
      // 14. Serial API Protection
      // ========================================
      // Remove Serial API
      if ((navigator as any).serial) {
        delete (navigator as any).serial;
      }

      // ========================================
      // 15. HID API Protection
      // ========================================
      // Remove HID API
      if ((navigator as any).hid) {
        delete (navigator as any).hid;
      }

      // ========================================
      // 16. Storage Quota API Protection
      // ========================================
      // Normalize storage quota to prevent fingerprinting
      if (navigator.storage && navigator.storage.estimate) {
        const originalEstimate = navigator.storage.estimate.bind(navigator.storage);

        navigator.storage.estimate = function () {
          return originalEstimate().then((estimate) => {
            // Normalize to common values
            return {
              quota: 1024 * 1024 * 1024 * 10, // 10GB
              usage: Math.floor(Math.random() * 1024 * 1024 * 100), // 0-100MB
              usageDetails: estimate.usageDetails || {},
            };
          });
        };
      }

      // ========================================
      // 17. MathML Detection Protection
      // ========================================
      // Some bots are detected by lack of MathML support
      if (!document.createElementNS) {
        (document as any).createElementNS = function (namespaceURI: string, qualifiedName: string) {
          return document.createElement(qualifiedName);
        };
      }

      // ========================================
      // 18. RTCPeerConnection Fingerprinting Protection
      // ========================================
      // WebRTC can leak real IP even through proxies
      if (window.RTCPeerConnection || (window as any).webkitRTCPeerConnection) {
        const OriginalRTCPeerConnection = window.RTCPeerConnection || (window as any).webkitRTCPeerConnection;

        const ModifiedRTCPeerConnection = function (this: any, config?: RTCConfiguration) {
          // Modify ICE servers to prevent IP leaks
          if (config && config.iceServers) {
            config.iceServers = config.iceServers.filter((server: RTCIceServer) => {
              // Only allow TURN servers (not STUN which leak IP)
              if (typeof server.urls === 'string') {
                return server.urls.startsWith('turn:');
              } else if (Array.isArray(server.urls)) {
                return server.urls.some((url) => url.startsWith('turn:'));
              }
              return false;
            });
          }

          return new OriginalRTCPeerConnection(config);
        };

        ModifiedRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;

        if (window.RTCPeerConnection) {
          (window as any).RTCPeerConnection = ModifiedRTCPeerConnection;
        }
        if ((window as any).webkitRTCPeerConnection) {
          (window as any).webkitRTCPeerConnection = ModifiedRTCPeerConnection;
        }
      }

      // ========================================
      // 19. Feature Policy / Permissions Policy
      // ========================================
      // Ensure consistent feature policy
      if (document.featurePolicy) {
        const originalAllowsFeature = document.featurePolicy.allowsFeature.bind(
          document.featurePolicy
        );

        document.featurePolicy.allowsFeature = function (feature: string) {
          // Common features that should be allowed
          const allowedFeatures = [
            'geolocation',
            'microphone',
            'camera',
            'payment',
            'usb',
            'fullscreen',
          ];

          if (allowedFeatures.includes(feature)) {
            return true;
          }

          return originalAllowsFeature(feature);
        };
      }

      // ========================================
      // 20. Error Stack Trace Sanitization
      // ========================================
      // Sanitize error stack traces to hide automation traces
      const OriginalError = Error;
      (window as any).Error = function (this: Error, message?: string) {
        const err = new OriginalError(message);

        // Clean up stack trace
        if (err.stack) {
          err.stack = err.stack
            .split('\n')
            .filter((line) => {
              // Remove lines that might indicate automation
              return (
                !line.includes('puppeteer') &&
                !line.includes('playwright') &&
                !line.includes('selenium') &&
                !line.includes('webdriver') &&
                !line.includes('__nightmare')
              );
            })
            .join('\n');
        }

        return err;
      };

      (window as any).Error.prototype = OriginalError.prototype;
      (window as any).Error.captureStackTrace = OriginalError.captureStackTrace;
    });

    logger.debug('Advanced evasion scripts injected successfully');
  }

  /**
   * Get the name of this module
   */
  getName(): string {
    return 'AdvancedEvasions';
  }
}
