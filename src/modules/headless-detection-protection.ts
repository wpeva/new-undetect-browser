import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * Headless Detection Protection Module
 * Protects against headless browser detection techniques
 *
 * Detection methods covered:
 * - User-Agent analysis
 * - Navigator properties inconsistencies
 * - Missing browser features
 * - Chrome object inconsistencies
 * - WebDriver flags
 * - Headless-specific behaviors
 * - Screen and window size anomalies
 * - Missing media codecs
 * - Plugin inconsistencies
 * - Performance timing anomalies
 */
export class HeadlessDetectionProtection {
  /**
   * Inject headless protection scripts
   */
  async inject(page: Page): Promise<void> {
    logger.debug('Injecting headless detection protection');

    await page.evaluateOnNewDocument(() => {
      // ========================================
      // 1. Navigator Properties Consistency
      // ========================================

      // Ensure navigator.webdriver is false (not undefined)
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true,
      });

      // Fix headless user agent
      const originalUserAgent = navigator.userAgent;
      if (originalUserAgent.includes('Headless')) {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => originalUserAgent.replace(/Headless/gi, ''),
          configurable: true,
        });
      }

      // ========================================
      // 2. Chrome Object Consistency
      // ========================================

      // Ensure chrome object has all expected properties
      if (window.chrome) {
        // Add loadTimes (often missing in headless)
        if (!window.chrome.loadTimes) {
          (window.chrome as any).loadTimes = function () {
            return {
              commitLoadTime: Date.now() / 1000 - Math.random() * 2,
              connectionInfo: 'http/1.1',
              finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
              finishLoadTime: Date.now() / 1000 - Math.random() * 0.5,
              firstPaintAfterLoadTime: Date.now() / 1000 - Math.random() * 0.3,
              firstPaintTime: Date.now() / 1000 - Math.random() * 1.5,
              navigationType: 'Other',
              npnNegotiatedProtocol: 'h2',
              requestTime: Date.now() / 1000 - Math.random() * 3,
              startLoadTime: Date.now() / 1000 - Math.random() * 2.5,
              wasAlternateProtocolAvailable: false,
              wasFetchedViaSpdy: true,
              wasNpnNegotiated: true,
            };
          };
        }

        // Add csi (Chrome Speed Index)
        if (!window.chrome.csi) {
          (window.chrome as any).csi = function () {
            return {
              onloadT: Date.now(),
              pageT: Math.random() * 1000 + 500,
              startE: Date.now() - Math.random() * 3000,
              tran: 15,
            };
          };
        }
      }

      // ========================================
      // 3. Screen and Window Properties
      // ========================================

      // Fix common headless detection: outerWidth/Height === 0
      if (window.outerWidth === 0 || window.outerHeight === 0) {
        Object.defineProperty(window, 'outerWidth', {
          get: () => window.innerWidth || 1920,
          configurable: true,
        });
        Object.defineProperty(window, 'outerHeight', {
          get: () => window.innerHeight + 85 || 1080, // Add browser chrome height
          configurable: true,
        });
      }

      // Ensure screen properties are realistic
      if (window.screen.width < window.innerWidth || window.screen.height < window.innerHeight) {
        Object.defineProperty(window.screen, 'width', {
          get: () => Math.max(window.innerWidth, 1920),
          configurable: true,
        });
        Object.defineProperty(window.screen, 'height', {
          get: () => Math.max(window.innerHeight, 1080),
          configurable: true,
        });
      }

      // ========================================
      // 4. Notification Permission
      // ========================================

      // Headless browsers often have 'denied' notification permission by default
      // Real browsers usually have 'default'
      if (Notification && Notification.permission === 'denied') {
        Object.defineProperty(Notification, 'permission', {
          get: () => 'default',
          configurable: true,
        });
      }

      // ========================================
      // 5. Connection Information
      // ========================================

      // Add realistic connection info (often missing in headless)
      if (navigator.connection === undefined) {
        Object.defineProperty(navigator, 'connection', {
          get: () => ({
            effectiveType: '4g',
            rtt: 50,
            downlink: 10,
            saveData: false,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          }),
          configurable: true,
        });
      }

      // ========================================
      // 6. Battery API
      // ========================================

      // Add battery API if missing (common in headless)
      if (!navigator.getBattery) {
        (navigator as any).getBattery = function () {
          return Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1.0,
            onchargingchange: null,
            onchargingtimechange: null,
            ondischargingtimechange: null,
            onlevelchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          });
        };
      }

      // ========================================
      // 7. Media Devices
      // ========================================

      // Ensure media devices exist (often missing in headless)
      if (navigator.mediaDevices && !navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices = async function () {
          return [
            {
              deviceId: 'default',
              kind: 'audioinput' as MediaDeviceKind,
              label: 'Default - Microphone',
              groupId: 'default',
              toJSON: () => {},
            },
            {
              deviceId: 'default',
              kind: 'audiooutput' as MediaDeviceKind,
              label: 'Default - Speaker',
              groupId: 'default',
              toJSON: () => {},
            },
            {
              deviceId: 'default',
              kind: 'videoinput' as MediaDeviceKind,
              label: 'Default - Camera',
              groupId: 'default',
              toJSON: () => {},
            },
          ];
        };
      }

      // ========================================
      // 8. Image Rendering Detection
      // ========================================

      // Headless browsers sometimes don't render images properly
      // Override Image constructor to ensure realistic behavior
      const OriginalImage = Image;
      (window as any).Image = function (this: HTMLImageElement, width?: number, height?: number) {
        const img = new OriginalImage(width, height);

        // Add realistic loading behavior
        const originalSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        if (originalSrc) {
          Object.defineProperty(img, 'src', {
            get: originalSrc.get,
            set: function (value) {
              originalSrc.set?.call(this, value);

              // Simulate realistic loading delay
              setTimeout(() => {
                if (this.onload) {
                  this.onload.call(this, new Event('load'));
                }
              }, Math.random() * 100 + 50);
            },
            configurable: true,
          });
        }

        return img;
      };
      (window as any).Image.prototype = OriginalImage.prototype;

      // ========================================
      // 9. Document Hidden State
      // ========================================

      // Headless browsers often have document.hidden = true
      Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: true,
      });

      Object.defineProperty(document, 'visibilityState', {
        // @ts-ignore - VisibilityState type is defined in browser-types.d.ts
        get: () => 'visible' as VisibilityState,
        configurable: true,
      });

      // ========================================
      // 10. Animation Frame Timing
      // ========================================

      // Headless browsers often have irregular RAF timing
      const originalRAF = window.requestAnimationFrame;
      const originalCAF = window.cancelAnimationFrame;

      let rafCallbacks = new Map();
      let rafId = 0;

      window.requestAnimationFrame = function (callback: FrameRequestCallback): number {
        const id = ++rafId;

        // Ensure consistent ~60fps timing (16.67ms per frame)
        const timeout = setTimeout(() => {
          const now = performance.now();
          callback(now);
          rafCallbacks.delete(id);
        }, 16.67);

        rafCallbacks.set(id, timeout);
        return id;
      };

      window.cancelAnimationFrame = function (id: number): void {
        const timeout = rafCallbacks.get(id);
        if (timeout) {
          clearTimeout(timeout);
          rafCallbacks.delete(id);
        }
      };

      // ========================================
      // 11. MouseEvent Properties
      // ========================================

      // Headless browsers often have missing mouse event properties
      const originalMouseEvent = MouseEvent;
      (window as any).MouseEvent = function (type: string, eventInitDict?: MouseEventInit) {
        const event = new originalMouseEvent(type, eventInitDict);

        // Ensure all mouse properties are present
        if (!event.movementX) {
          Object.defineProperty(event, 'movementX', {
            get: () => 0,
            configurable: true,
          });
        }
        if (!event.movementY) {
          Object.defineProperty(event, 'movementY', {
            get: () => 0,
            configurable: true,
          });
        }

        return event;
      };
      (window as any).MouseEvent.prototype = originalMouseEvent.prototype;

      // ========================================
      // 12. Clipboard API
      // ========================================

      // Add clipboard API if missing (often not available in headless)
      if (!navigator.clipboard) {
        (navigator as any).clipboard = {
          readText: () => Promise.resolve(''),
          writeText: (text: string) => Promise.resolve(),
          read: () => Promise.resolve([]),
          write: (data: any) => Promise.resolve(),
        };
      }

      // ========================================
      // 13. Service Worker
      // ========================================

      // Ensure service worker API is available
      if (!navigator.serviceWorker) {
        (navigator as any).serviceWorker = {
          ready: Promise.resolve({
            active: null,
            installing: null,
            waiting: null,
            navigationPreload: {
              enable: () => Promise.resolve(),
              disable: () => Promise.resolve(),
              setHeaderValue: () => Promise.resolve(),
              getState: () => Promise.resolve({ enabled: false }),
            },
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          }),
          controller: null,
          oncontrollerchange: null,
          onmessage: null,
          onmessageerror: null,
          register: (scriptURL: string) => Promise.resolve({
            active: null,
            installing: null,
            waiting: null,
            scope: location.origin,
            updateViaCache: 'imports' as ServiceWorkerUpdateViaCache,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
            update: () => Promise.resolve(),
            unregister: () => Promise.resolve(true),
            // @ts-ignore - Partial ServiceWorkerRegistration for headless detection
          } as unknown as ServiceWorkerRegistration),
          getRegistration: () => Promise.resolve(undefined),
          getRegistrations: () => Promise.resolve([]),
          startMessages: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        };
      }

      // ========================================
      // 14. Performance Memory
      // ========================================

      // Add realistic memory info (often missing in headless)
      if (!(performance as any).memory) {
        Object.defineProperty(performance, 'memory', {
          get: () => ({
            jsHeapSizeLimit: 2172649472,
            totalJSHeapSize: 50000000 + Math.random() * 10000000,
            usedJSHeapSize: 30000000 + Math.random() * 5000000,
          }),
          configurable: true,
        });
      }

      // ========================================
      // 15. WebGL Debug Info
      // ========================================

      // Ensure consistent WebGL debug info
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (gl && 'getParameter' in gl) {
        // @ts-ignore - getExtension returns specific extension types
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          // @ts-ignore - getParameter exists on WebGL contexts
          const originalGetParameter = gl.getParameter.bind(gl);
          // @ts-ignore - Overriding getParameter for WebGL spoofing
          gl.getParameter = function (pname: number) {
            // @ts-ignore - UNMASKED_VENDOR_WEBGL exists on debug extension
            if (pname === debugInfo.UNMASKED_VENDOR_WEBGL) {
              return 'Intel Inc.';
            }
            // @ts-ignore - UNMASKED_RENDERER_WEBGL exists on debug extension
            if (pname === debugInfo.UNMASKED_RENDERER_WEBGL) {
              return 'Intel Iris OpenGL Engine';
            }
            return originalGetParameter(pname);
          };
        }
      }

      // ========================================
      // 16. Date/Time Consistency
      // ========================================

      // Ensure Date.prototype.getTimezoneOffset is consistent
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function () {
        // Return consistent timezone offset
        return originalGetTimezoneOffset.call(this);
      };

      // ========================================
      // 17. Console Methods
      // ========================================

      // Headless browsers sometimes have incomplete console object
      const consoleMethods = [
        'assert', 'clear', 'count', 'countReset', 'debug', 'dir', 'dirxml',
        'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info',
        'log', 'profile', 'profileEnd', 'table', 'time', 'timeEnd', 'timeLog',
        'timeStamp', 'trace', 'warn'
      ];

      consoleMethods.forEach(method => {
        if (!(console as any)[method]) {
          (console as any)[method] = function (...args: any[]) {
            // Implement as no-op or forward to console.log
            if (console.log) {
              console.log(`[${method}]`, ...args);
            }
          };
        }
      });

      // ========================================
      // 18. Window.chrome.app
      // ========================================

      // Ensure chrome.app is present (often missing in headless)
      if (window.chrome && !(window.chrome as any).app) {
        (window.chrome as any).app = {
          isInstalled: false,
          InstallState: {
            DISABLED: 'disabled',
            INSTALLED: 'installed',
            NOT_INSTALLED: 'not_installed',
          },
          RunningState: {
            CANNOT_RUN: 'cannot_run',
            READY_TO_RUN: 'ready_to_run',
            RUNNING: 'running',
          },
          getDetails: () => null,
          getIsInstalled: () => false,
          installState: () => 'not_installed',
          runningState: () => 'cannot_run',
        };
      }

      // ========================================
      // 19. Intl API Consistency
      // ========================================

      // Ensure Intl API is complete (sometimes incomplete in headless)
      if (window.Intl) {
        if (!Intl.PluralRules) {
          (Intl as any).PluralRules = function (locales?: string | string[], options?: any) {
            return {
              select: (n: number) => 'other',
              resolvedOptions: () => ({ locale: 'en-US', type: 'cardinal' }),
            };
          };
        }

        if (!Intl.RelativeTimeFormat) {
          (Intl as any).RelativeTimeFormat = function (locales?: string | string[], options?: any) {
            return {
              format: (value: number, unit: string) => `${value} ${unit}${value !== 1 ? 's' : ''} ago`,
              formatToParts: (value: number, unit: string) => [],
              resolvedOptions: () => ({ locale: 'en-US', style: 'long', numeric: 'always' }),
            };
          };
        }
      }

      // ========================================
      // 20. History API
      // ========================================

      // Ensure history.scrollRestoration is present
      if (!history.scrollRestoration) {
        try {
          (history as any).scrollRestoration = 'auto';
        } catch (e) {
          // Read-only in some browsers
        }
      }

      logger.debug('Headless detection protection injected successfully');
    });

    logger.info('Headless detection protection applied');
  }

  /**
   * Get the name of this module
   */
  getName(): string {
    return 'HeadlessDetectionProtection';
  }
}

/**
 * Create headless detection protection instance
 */
export function createHeadlessDetectionProtection(): HeadlessDetectionProtection {
  return new HeadlessDetectionProtection();
}
