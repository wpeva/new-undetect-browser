import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * WebDriver Evasion Module
 * Removes all traces of WebDriver and automation from the browser
 */
export class WebDriverEvasionModule {
  /**
   * Inject all evasion scripts into the page
   */
  async inject(page: Page): Promise<void> {
    logger.debug('Injecting WebDriver evasion scripts');

    await page.evaluateOnNewDocument(() => {
      // ========================================
      // 1. Navigator.webdriver - MUST be false, not undefined!
      // ========================================
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true,
      });

      // Also delete the property from prototype chain
      delete (Object.getPrototypeOf(navigator) as any).webdriver;

      // ========================================
      // 2. Chrome DevTools Protocol (CDP) variables
      // ========================================
      // Remove all CDP-related variables
      const cdcProps = Object.getOwnPropertyNames(window).filter((prop) =>
        /^(cdc_|__webdriver|__driver|__selenium|__fxdriver|__lastWatirAlert|__lastWatirConfirm|__lastWatirPrompt|_phantom|callPhantom|_selenium)/.test(
          prop
        )
      );

      cdcProps.forEach((prop) => {
        delete (window as any)[prop];
      });

      // Prevent new CDP variables from being added
      const originalDefineProperty = Object.defineProperty;
      Object.defineProperty = function (obj: any, prop: any, descriptor: any) {
        if (
          typeof prop === 'string' &&
          /^(cdc_|__webdriver|__driver|__selenium)/.test(prop)
        ) {
          return obj;
        }
        return originalDefineProperty(obj, prop, descriptor);
      } as any;

      // ========================================
      // 3. Chrome Runtime
      // ========================================
      if (!window.chrome) {
        (window as any).chrome = {};
      }

      if (!(window.chrome as any).runtime) {
        (window.chrome as any).runtime = {
          // Constants
          OnInstalledReason: {
            CHROME_UPDATE: 'chrome_update',
            INSTALL: 'install',
            SHARED_MODULE_UPDATE: 'shared_module_update',
            UPDATE: 'update',
          },
          OnRestartRequiredReason: {
            APP_UPDATE: 'app_update',
            OS_UPDATE: 'os_update',
            PERIODIC: 'periodic',
          },
          PlatformArch: {
            ARM: 'arm',
            ARM64: 'arm64',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64',
          },
          PlatformNaclArch: {
            ARM: 'arm',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64',
          },
          PlatformOs: {
            ANDROID: 'android',
            CROS: 'cros',
            LINUX: 'linux',
            MAC: 'mac',
            OPENBSD: 'openbsd',
            WIN: 'win',
          },
          RequestUpdateCheckStatus: {
            NO_UPDATE: 'no_update',
            THROTTLED: 'throttled',
            UPDATE_AVAILABLE: 'update_available',
          },
          // Critical methods that detection scripts check
          connect: function(extensionId?: string, connectInfo?: any) {
            // Return a fake port object
            return {
              name: connectInfo?.name || '',
              disconnect: function() {},
              onDisconnect: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
              onMessage: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
              postMessage: function() {},
              sender: undefined,
            };
          },
          sendMessage: function(extensionId?: any, message?: any, options?: any, callback?: any) {
            // Handle different argument patterns
            if (typeof callback === 'function') {
              setTimeout(() => callback(undefined), 0);
            } else if (typeof options === 'function') {
              setTimeout(() => options(undefined), 0);
            } else if (typeof message === 'function') {
              setTimeout(() => message(undefined), 0);
            }
            return Promise.resolve(undefined);
          },
          getManifest: function() {
            return undefined; // Normal for non-extension pages
          },
          getURL: function(path: string) {
            return ''; // Return empty string for non-extension pages
          },
          id: undefined, // Extensions have an ID, normal pages don't
          lastError: undefined,
        } as any;
      }

      // Add chrome.app
      if (!(window.chrome as any).app) {
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
        } as any;
      }

      // ========================================
      // 4. Permissions API - Handle ALL permissions properly
      // ========================================
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (async (parameters: any) => {
        // Create realistic permission response
        const createPermissionStatus = (name: string, state: PermissionState): PermissionStatus => {
          const status = {
            name: name as PermissionName,
            state: state,
            onchange: null,
            addEventListener: function() {},
            removeEventListener: function() {},
            dispatchEvent: function() { return true; },
          } as PermissionStatus;
          return status;
        };

        // Handle different permission types realistically
        switch (parameters.name) {
          case 'notifications':
            const notifState = typeof Notification !== 'undefined' ? Notification.permission : 'default';
            return createPermissionStatus('notifications', notifState as PermissionState);

          case 'geolocation':
            return createPermissionStatus('geolocation', 'prompt');

          case 'camera':
          case 'microphone':
            return createPermissionStatus(parameters.name, 'prompt');

          case 'clipboard-read':
          case 'clipboard-write':
            return createPermissionStatus(parameters.name, 'prompt');

          case 'midi':
          case 'midi-sysex':
            return createPermissionStatus(parameters.name, 'prompt');

          case 'storage-access':
          case 'persistent-storage':
            return createPermissionStatus(parameters.name, 'prompt');

          case 'accelerometer':
          case 'gyroscope':
          case 'magnetometer':
          case 'ambient-light-sensor':
            return createPermissionStatus(parameters.name, 'granted');

          case 'push':
            return createPermissionStatus('push', 'prompt');

          case 'speaker-selection':
            return createPermissionStatus(parameters.name, 'prompt');

          case 'display-capture':
            return createPermissionStatus(parameters.name, 'prompt');

          default:
            // For unknown permissions, try original query, fallback to prompt
            try {
              return await originalQuery.call(navigator.permissions, parameters);
            } catch {
              return createPermissionStatus(parameters.name, 'prompt');
            }
        }
      }) as any;

      // ========================================
      // 5. Plugins
      // ========================================
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [
            {
              0: {
                type: 'application/x-google-chrome-pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format',
                enabledPlugin: null,
              },
              description: 'Portable Document Format',
              filename: 'internal-pdf-viewer',
              length: 1,
              name: 'Chrome PDF Plugin',
              item: function (index: number) {
                return this[index];
              },
              namedItem: function (name: string) {
                return this[name];
              },
            },
            {
              0: {
                type: 'application/pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format',
                enabledPlugin: null,
              },
              description: 'Portable Document Format',
              filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
              length: 1,
              name: 'Chrome PDF Viewer',
              item: function (index: number) {
                return this[index];
              },
              namedItem: function (name: string) {
                return this[name];
              },
            },
            {
              0: {
                type: 'application/x-nacl',
                suffixes: '',
                description: 'Native Client Executable',
                enabledPlugin: null,
              },
              1: {
                type: 'application/x-pnacl',
                suffixes: '',
                description: 'Portable Native Client Executable',
                enabledPlugin: null,
              },
              description: '',
              filename: 'internal-nacl-plugin',
              length: 2,
              name: 'Native Client',
              item: function (index: number) {
                return this[index];
              },
              namedItem: function (name: string) {
                return this[name];
              },
            },
          ];

          return Object.setPrototypeOf(plugins, PluginArray.prototype);
        },
        configurable: true,
      });

      // ========================================
      // 6. Languages
      // ========================================
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true,
      });

      // ========================================
      // 7. WebGL Vendor
      // ========================================
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
      };

      // ========================================
      // 8. Console debug
      // ========================================
      // Some sites check for console.debug
      if (!console.debug) {
        console.debug = console.log;
      }

      // ========================================
      // 9. Window properties
      // ========================================
      // Remove automation-related properties
      delete (window as any).domAutomation;
      delete (window as any).domAutomationController;

      // ========================================
      // 10. Iframe consistency
      // ========================================
      // Ensure all iframes get the same evasions
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = function (tagName: string, options?: any) {
        const element = originalCreateElement(tagName, options);

        if (tagName.toLowerCase() === 'iframe') {
          element.addEventListener('load', function () {
            try {
              const iframeWindow = (element as HTMLIFrameElement).contentWindow;
              if (iframeWindow) {
                // Apply the same evasions to iframe
                Object.defineProperty(iframeWindow.navigator, 'webdriver', {
                  get: () => undefined,
                });
              }
            } catch (_e) {
              // Cross-origin iframe, can't access
            }
          });
        }

        return element;
      };

      // ========================================
      // 11. Error stack trace
      // ========================================
      // Modify Error.prepareStackTrace to hide automation
      const originalPrepareStackTrace = Error.prepareStackTrace;
      Error.prepareStackTrace = function (error, stackTraces) {
        if (originalPrepareStackTrace) {
          return originalPrepareStackTrace(error, stackTraces);
        }
        return error.stack;
      };
    });

    logger.debug('WebDriver evasion scripts injected successfully');
  }

  /**
   * Get the name of this module
   */
  getName(): string {
    return 'WebDriverEvasion';
  }
}
