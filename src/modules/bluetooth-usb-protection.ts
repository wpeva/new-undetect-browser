/**
 * Bluetooth & USB APIs Protection Module
 *
 * Protects against fingerprinting through Bluetooth and USB Web APIs.
 * These APIs have limited browser/platform support and can be used
 * for device fingerprinting.
 *
 * Provides platform-appropriate behavior.
 *
 * CRITICAL for:
 * - Platform consistency
 * - API surface fingerprinting
 * - Advanced detection evasion
 */

import type { Page } from 'puppeteer';

export interface BluetoothUSBConfig {
  enabled: boolean;
  platform: 'Win32' | 'MacIntel' | 'Linux x86_64' | 'iPhone' | 'iPad' | 'Android';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  // Bluetooth API
  bluetoothAvailable: boolean;
  // USB API (WebUSB)
  usbAvailable: boolean;
  // Serial API
  serialAvailable: boolean;
  // HID API
  hidAvailable: boolean;
}

/**
 * Platform and browser-specific API availability
 */
const API_SUPPORT: Record<
  string,
  Record<string, Partial<BluetoothUSBConfig>>
> = {
  Win32: {
    chrome: {
      bluetoothAvailable: true,
      usbAvailable: true,
      serialAvailable: true,
      hidAvailable: true,
    },
    edge: {
      bluetoothAvailable: true,
      usbAvailable: true,
      serialAvailable: true,
      hidAvailable: true,
    },
    firefox: {
      bluetoothAvailable: false, // Firefox doesn't support Web Bluetooth on desktop
      usbAvailable: false,
      serialAvailable: false,
      hidAvailable: false,
    },
  },
  MacIntel: {
    chrome: {
      bluetoothAvailable: true,
      usbAvailable: true,
      serialAvailable: true,
      hidAvailable: true,
    },
    safari: {
      bluetoothAvailable: false, // Safari doesn't support Web Bluetooth
      usbAvailable: false,
      serialAvailable: false,
      hidAvailable: false,
    },
    firefox: {
      bluetoothAvailable: false,
      usbAvailable: false,
      serialAvailable: false,
      hidAvailable: false,
    },
  },
  'Linux x86_64': {
    chrome: {
      bluetoothAvailable: true,
      usbAvailable: true,
      serialAvailable: true,
      hidAvailable: true,
    },
    firefox: {
      bluetoothAvailable: false,
      usbAvailable: false,
      serialAvailable: false,
      hidAvailable: false,
    },
  },
  Android: {
    chrome: {
      bluetoothAvailable: true,
      usbAvailable: false, // No USB on mobile
      serialAvailable: false,
      hidAvailable: false,
    },
  },
  iPhone: {
    safari: {
      bluetoothAvailable: false,
      usbAvailable: false,
      serialAvailable: false,
      hidAvailable: false,
    },
  },
  iPad: {
    safari: {
      bluetoothAvailable: false,
      usbAvailable: false,
      serialAvailable: false,
      hidAvailable: false,
    },
  },
};

export class BluetoothUSBProtection {
  private config: BluetoothUSBConfig;

  constructor(config: Partial<BluetoothUSBConfig> = {}) {
    const platform = config.platform || 'Win32';
    const browser = config.browser || 'chrome';
    const platformSupport = API_SUPPORT[platform] || API_SUPPORT.Win32;
    const browserSupport = platformSupport[browser] || platformSupport.chrome;

    this.config = {
      enabled: true,
      platform,
      browser,
      bluetoothAvailable: false,
      usbAvailable: false,
      serialAvailable: false,
      hidAvailable: false,
      ...browserSupport,
      ...config,
    };
  }

  /**
   * Apply Bluetooth/USB protection to a page
   */
  async apply(page: Page): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await page.evaluateOnNewDocument(this.getInjectionScript(), this.config);
  }

  /**
   * Get the injection script
   */
  private getInjectionScript() {
    return (config: BluetoothUSBConfig) => {
      // ========== Bluetooth API ==========
      if (config.bluetoothAvailable) {
        // Ensure navigator.bluetooth exists with realistic behavior
        if (!navigator.bluetooth) {
          (navigator as any).bluetooth = {
            getAvailability: async () => {
              // Simulate checking Bluetooth adapter
              await new Promise((resolve) =>
                setTimeout(resolve, 50 + Math.random() * 100)
              );
              return true; // Bluetooth adapter available
            },
            requestDevice: async (options: any) => {
              // Simulate user prompt delay
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 + Math.random() * 2000)
              );
              // Usually user cancels or no device found
              throw new DOMException(
                'User cancelled the requestDevice() chooser.',
                'NotFoundError'
              );
            },
            getDevices: async () => {
              // Return empty array (no previously paired devices)
              return [];
            },
            addEventListener: () => {},
            removeEventListener: () => {},
          };
        }

        // Fix toString
        if (navigator.bluetooth) {
          const methods = ['getAvailability', 'requestDevice', 'getDevices'];
          const originalToString = Function.prototype.toString;

          Function.prototype.toString = function () {
            const methodName = methods.find(
              (m) => this === (navigator.bluetooth as any)[m]
            );
            if (methodName) {
              return `function ${methodName}() { [native code] }`;
            }
            return originalToString.call(this);
          };
        }
      } else {
        // Remove Bluetooth API if not available
        if (navigator.bluetooth) {
          (navigator as any).bluetooth = undefined;
          delete (navigator as any).bluetooth;
        }
      }

      // ========== USB API (WebUSB) ==========
      if (config.usbAvailable) {
        // Ensure navigator.usb exists with realistic behavior
        if (!navigator.usb) {
          (navigator as any).usb = {
            getDevices: async () => {
              // Return empty array (no previously authorized devices)
              return [];
            },
            requestDevice: async (options: any) => {
              // Simulate user prompt delay
              await new Promise((resolve) =>
                setTimeout(resolve, 500 + Math.random() * 1000)
              );
              // Usually user cancels or no device found
              throw new DOMException(
                'No device selected.',
                'NotFoundError'
              );
            },
            addEventListener: () => {},
            removeEventListener: () => {},
          };
        }

        // Fix toString
        if (navigator.usb) {
          const methods = ['getDevices', 'requestDevice'];
          const originalToString = Function.prototype.toString;

          Function.prototype.toString = function () {
            const methodName = methods.find(
              (m) => this === (navigator.usb as any)[m]
            );
            if (methodName) {
              return `function ${methodName}() { [native code] }`;
            }
            return originalToString.call(this);
          };
        }
      } else {
        // Remove USB API if not available
        if (navigator.usb) {
          (navigator as any).usb = undefined;
          delete (navigator as any).usb;
        }
      }

      // ========== Serial API ==========
      if (config.serialAvailable) {
        // Ensure navigator.serial exists with realistic behavior
        if (!(navigator as any).serial) {
          (navigator as any).serial = {
            getPorts: async () => {
              // Return empty array (no previously authorized ports)
              return [];
            },
            requestPort: async (options: any) => {
              // Simulate user prompt delay
              await new Promise((resolve) =>
                setTimeout(resolve, 500 + Math.random() * 1000)
              );
              // Usually user cancels
              throw new DOMException(
                'No port selected.',
                'NotFoundError'
              );
            },
            addEventListener: () => {},
            removeEventListener: () => {},
          };
        }

        // Fix toString
        if ((navigator as any).serial) {
          const methods = ['getPorts', 'requestPort'];
          const originalToString = Function.prototype.toString;

          Function.prototype.toString = function () {
            const methodName = methods.find(
              (m) => this === (navigator as any).serial[m]
            );
            if (methodName) {
              return `function ${methodName}() { [native code] }`;
            }
            return originalToString.call(this);
          };
        }
      } else {
        // Remove Serial API if not available
        if ((navigator as any).serial) {
          (navigator as any).serial = undefined;
          delete (navigator as any).serial;
        }
      }

      // ========== HID API ==========
      if (config.hidAvailable) {
        // Ensure navigator.hid exists with realistic behavior
        if (!(navigator as any).hid) {
          (navigator as any).hid = {
            getDevices: async () => {
              // Return empty array (no previously authorized devices)
              return [];
            },
            requestDevice: async (options: any) => {
              // Simulate user prompt delay
              await new Promise((resolve) =>
                setTimeout(resolve, 500 + Math.random() * 1000)
              );
              // Usually user cancels
              throw new DOMException(
                'No device selected.',
                'NotFoundError'
              );
            },
            addEventListener: () => {},
            removeEventListener: () => {},
          };
        }

        // Fix toString
        if ((navigator as any).hid) {
          const methods = ['getDevices', 'requestDevice'];
          const originalToString = Function.prototype.toString;

          Function.prototype.toString = function () {
            const methodName = methods.find(
              (m) => this === (navigator as any).hid[m]
            );
            if (methodName) {
              return `function ${methodName}() { [native code] }`;
            }
            return originalToString.call(this);
          };
        }
      } else {
        // Remove HID API if not available
        if ((navigator as any).hid) {
          (navigator as any).hid = undefined;
          delete (navigator as any).hid;
        }
      }

      // ========== Additional cleanup ==========
      // Remove NFC API (rarely used, good fingerprinting signal)
      if ((navigator as any).nfc) {
        (navigator as any).nfc = undefined;
        delete (navigator as any).nfc;
      }

      // Remove Presentation API (rarely used)
      if ((navigator as any).presentation) {
        (navigator as any).presentation = undefined;
        delete (navigator as any).presentation;
      }

      // Log for debugging
      if (typeof console !== 'undefined' && console.log) {
        const apis = [];
        if (config.bluetoothAvailable) apis.push('Bluetooth');
        if (config.usbAvailable) apis.push('USB');
        if (config.serialAvailable) apis.push('Serial');
        if (config.hidAvailable) apis.push('HID');

        console.log(
          `[Bluetooth/USB Protection] Applied for ${config.platform}/${config.browser} (${apis.length > 0 ? apis.join(', ') : 'No APIs'})`
        );
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BluetoothUSBConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Factory function
 */
export function createBluetoothUSBProtection(
  config?: Partial<BluetoothUSBConfig>
): BluetoothUSBProtection {
  return new BluetoothUSBProtection(config);
}

/**
 * Apply to multiple pages
 */
export async function applyBluetoothUSBProtectionToPages(
  pages: Page[],
  config?: Partial<BluetoothUSBConfig>
): Promise<void> {
  const protection = new BluetoothUSBProtection(config);
  await Promise.all(pages.map((page) => protection.apply(page)));
}
