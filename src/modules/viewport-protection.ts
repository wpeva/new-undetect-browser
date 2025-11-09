import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

export interface ViewportProfile {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  isLandscape: boolean;
}

/**
 * Viewport Protection Module
 * Protects against viewport fingerprinting and screen size detection
 */
export class ViewportProtectionModule {
  private profile: ViewportProfile;

  constructor(profile: ViewportProfile) {
    this.profile = profile;
  }

  /**
   * Inject viewport protection scripts
   */
  async inject(page: Page): Promise<void> {
    logger.debug('Injecting viewport protection scripts');

    await page.evaluateOnNewDocument((profile: ViewportProfile) => {
      // ========================================
      // 1. Window Size Consistency
      // ========================================
      // Ensure window.innerWidth/Height match viewport

      // Calculate realistic outer dimensions (adding browser chrome)
      const chromeHeight = profile.isMobile ? 0 : 85; // Browser toolbar height
      const chromeWidth = profile.isMobile ? 0 : 16; // Scrollbar width

      Object.defineProperty(window, 'innerWidth', {
        get: () => profile.width,
        configurable: true,
      });

      Object.defineProperty(window, 'innerHeight', {
        get: () => profile.height,
        configurable: true,
      });

      Object.defineProperty(window, 'outerWidth', {
        get: () => profile.width + chromeWidth,
        configurable: true,
      });

      Object.defineProperty(window, 'outerHeight', {
        get: () => profile.height + chromeHeight,
        configurable: true,
      });

      // ========================================
      // 2. Screen Orientation API
      // ========================================
      if (window.screen.orientation) {
        Object.defineProperty(window.screen.orientation, 'type', {
          get: () => profile.isLandscape ? 'landscape-primary' : 'portrait-primary',
          configurable: true,
        });

        Object.defineProperty(window.screen.orientation, 'angle', {
          get: () => profile.isLandscape ? 90 : 0,
          configurable: true,
        });
      }

      // ========================================
      // 3. Visual Viewport API Protection
      // ========================================
      if (window.visualViewport) {
        const originalVisualViewport = window.visualViewport;

        Object.defineProperty(window, 'visualViewport', {
          get: () => {
            return new Proxy(originalVisualViewport, {
              get: (target, prop) => {
                if (prop === 'width') {
                  return profile.width;
                }
                if (prop === 'height') {
                  return profile.height;
                }
                if (prop === 'scale') {
                  return 1; // Prevent zoom detection
                }
                if (prop === 'offsetLeft') {
                  return 0;
                }
                if (prop === 'offsetTop') {
                  return 0;
                }
                if (prop === 'pageLeft') {
                  return window.scrollX || window.pageXOffset || 0;
                }
                if (prop === 'pageTop') {
                  return window.scrollY || window.pageYOffset || 0;
                }
                return Reflect.get(target, prop);
              },
            });
          },
          configurable: true,
        });
      }

      // ========================================
      // 4. Matchmedia Queries Consistency
      // ========================================
      const originalMatchMedia = window.matchMedia.bind(window);

      window.matchMedia = function (query: string) {
        const result = originalMatchMedia(query);

        // Override specific media queries for consistency
        const overrides: Record<string, boolean> = {
          // Device width/height
          [`(min-width: ${profile.width}px)`]: true,
          [`(max-width: ${profile.width}px)`]: true,
          [`(min-height: ${profile.height}px)`]: true,
          [`(max-height: ${profile.height}px)`]: true,

          // Orientation
          '(orientation: portrait)': !profile.isLandscape,
          '(orientation: landscape)': profile.isLandscape,

          // Device pixel ratio
          [`(min-resolution: ${profile.deviceScaleFactor}dppx)`]: true,
          [`(max-resolution: ${profile.deviceScaleFactor}dppx)`]: true,

          // Touch
          '(pointer: coarse)': profile.hasTouch,
          '(pointer: fine)': !profile.hasTouch,
          '(any-pointer: coarse)': profile.hasTouch,
          '(any-pointer: fine)': true,
          '(hover: none)': profile.hasTouch,
          '(hover: hover)': !profile.hasTouch,
        };

        if (query in overrides) {
          return {
            matches: overrides[query],
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          } as MediaQueryList;
        }

        return result;
      };

      // ========================================
      // 5. Device Pixel Ratio Consistency
      // ========================================
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => profile.deviceScaleFactor,
        configurable: true,
      });

      // ========================================
      // 6. Screen Properties Alignment
      // ========================================
      // Make sure screen dimensions align with viewport
      const screenWidth = profile.width * profile.deviceScaleFactor;
      const screenHeight = profile.height * profile.deviceScaleFactor;

      Object.defineProperties(window.screen, {
        width: {
          get: () => screenWidth,
          configurable: true,
        },
        height: {
          get: () => screenHeight,
          configurable: true,
        },
        availWidth: {
          get: () => screenWidth,
          configurable: true,
        },
        availHeight: {
          get: () => screenHeight - (profile.isMobile ? 0 : 40), // Taskbar height
          configurable: true,
        },
      });

      // ========================================
      // 7. Zoom Detection Prevention
      // ========================================
      // Prevent detection of browser zoom level
      Object.defineProperty(window, 'outerWidth', {
        get: () => window.innerWidth + chromeWidth,
        configurable: true,
      });

      Object.defineProperty(window, 'outerHeight', {
        get: () => window.innerHeight + chromeHeight,
        configurable: true,
      });

      // ========================================
      // 8. Iframe Viewport Consistency
      // ========================================
      // Ensure iframes report consistent viewport
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = function (tagName: string, options?: any) {
        const element = originalCreateElement(tagName, options);

        if (tagName.toLowerCase() === 'iframe') {
          element.addEventListener('load', function () {
            try {
              const iframeWindow = (element as HTMLIFrameElement).contentWindow;
              if (iframeWindow) {
                // Apply same viewport protections to iframe
                Object.defineProperty(iframeWindow, 'innerWidth', {
                  get: () => (element as HTMLIFrameElement).clientWidth,
                  configurable: true,
                });

                Object.defineProperty(iframeWindow, 'innerHeight', {
                  get: () => (element as HTMLIFrameElement).clientHeight,
                  configurable: true,
                });
              }
            } catch (e) {
              // Cross-origin iframe
            }
          });
        }

        return element;
      };

      // ========================================
      // 9. Fullscreen API Consistency
      // ========================================
      if (document.documentElement.requestFullscreen) {
        const originalRequestFullscreen =
          document.documentElement.requestFullscreen.bind(document.documentElement);

        document.documentElement.requestFullscreen = function (options?: FullscreenOptions) {
          // Update viewport dimensions for fullscreen
          Object.defineProperty(window, 'innerWidth', {
            get: () => window.screen.width,
            configurable: true,
          });

          Object.defineProperty(window, 'innerHeight', {
            get: () => window.screen.height,
            configurable: true,
          });

          return originalRequestFullscreen(options);
        };
      }

      // ========================================
      // 10. ResizeObserver Consistency
      // ========================================
      if (typeof ResizeObserver !== 'undefined') {
        const OriginalResizeObserver = ResizeObserver;

        (window as any).ResizeObserver = class extends OriginalResizeObserver {
          constructor(callback: ResizeObserverCallback) {
            super((entries, observer) => {
              // Add slight noise to prevent fingerprinting via resize patterns
              const modifiedEntries = entries.map((entry) => {
                const noise = (Math.random() - 0.5) * 0.1; // ±0.05px noise
                return new Proxy(entry, {
                  get: (target, prop) => {
                    if (prop === 'contentRect') {
                      const rect = target.contentRect;
                      return new Proxy(rect, {
                        get: (rectTarget, rectProp) => {
                          if (['width', 'height', 'x', 'y'].includes(rectProp as string)) {
                            return (rectTarget as any)[rectProp] + noise;
                          }
                          return Reflect.get(rectTarget, rectProp);
                        },
                      });
                    }
                    return Reflect.get(target, prop);
                  },
                });
              });

              callback(modifiedEntries as any, observer);
            });
          }
        };
      }

      // ========================================
      // 11. Window.open Viewport Handling
      // ========================================
      const originalWindowOpen = window.open.bind(window);

      window.open = function (url?: string | URL, target?: string, features?: string) {
        // Ensure new windows have consistent viewport
        let modifiedFeatures = features || '';

        if (!modifiedFeatures.includes('width=')) {
          modifiedFeatures += `,width=${profile.width}`;
        }
        if (!modifiedFeatures.includes('height=')) {
          modifiedFeatures += `,height=${profile.height}`;
        }

        return originalWindowOpen(url, target, modifiedFeatures);
      };

      // ========================================
      // 12. getBoundingClientRect Viewport Awareness
      // ========================================
      // Ensure element positions are consistent with viewport
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

      Element.prototype.getBoundingClientRect = function () {
        const rect = originalGetBoundingClientRect.call(this);

        // Clamp to viewport bounds
        return new Proxy(rect, {
          get: (target, prop) => {
            const value = Reflect.get(target, prop);

            if (prop === 'left' || prop === 'x') {
              return Math.max(0, Math.min(value, profile.width));
            }
            if (prop === 'top' || prop === 'y') {
              return Math.max(0, Math.min(value, profile.height));
            }
            if (prop === 'right') {
              return Math.max(0, Math.min(value, profile.width));
            }
            if (prop === 'bottom') {
              return Math.max(0, Math.min(value, profile.height));
            }

            return value;
          },
        });
      };
    }, this.profile);

    logger.debug('Viewport protection scripts injected successfully');
  }

  /**
   * Update viewport profile
   */
  setProfile(profile: ViewportProfile): void {
    this.profile = profile;
  }

  /**
   * Get current profile
   */
  getProfile(): ViewportProfile {
    return this.profile;
  }

  /**
   * Get module name
   */
  getName(): string {
    return 'ViewportProtection';
  }
}
