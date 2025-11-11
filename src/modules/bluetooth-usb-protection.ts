import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

export interface DeviceAPIProfile {
  hasBluetooth: boolean;
  hasUSB: boolean;
  hasSerial: boolean;
  hasHID: boolean;
  hasNFC: boolean;
  platformType: 'desktop' | 'mobile' | 'tablet';
}

/**
 * Bluetooth/USB Protection Module
 * Protects against detection via Web Bluetooth, WebUSB, Web Serial, WebHID, and Web NFC APIs
 * Hides or emulates device APIs based on platform type
 */
export class BluetoothUSBProtectionModule {
  private profile: DeviceAPIProfile;

  constructor(profile: DeviceAPIProfile) {
    this.profile = profile;
  }

  /**
   * Inject Bluetooth/USB protection scripts
   */
  async inject(page: Page): Promise<void> {
    logger.debug('Injecting Bluetooth/USB protection scripts');

    await page.evaluateOnNewDocument((profile: DeviceAPIProfile) => {
      // ========================================
      // 1. Web Bluetooth API Protection
      // ========================================

      if (!profile.hasBluetooth) {
        // Remove Bluetooth API entirely
        if ((navigator as any).bluetooth) {
          delete (navigator as any).bluetooth;
        }

        // Remove Bluetooth-related events
        if ((window as any).BluetoothDevice) {
          delete (window as any).BluetoothDevice;
        }
        if ((window as any).BluetoothRemoteGATTServer) {
          delete (window as any).BluetoothRemoteGATTServer;
        }
        if ((window as any).BluetoothRemoteGATTService) {
          delete (window as any).BluetoothRemoteGATTService;
        }
        if ((window as any).BluetoothRemoteGATTCharacteristic) {
          delete (window as any).BluetoothRemoteGATTCharacteristic;
        }
        if ((window as any).BluetoothCharacteristicProperties) {
          delete (window as any).BluetoothCharacteristicProperties;
        }
        if ((window as any).BluetoothRemoteGATTDescriptor) {
          delete (window as any).BluetoothRemoteGATTDescriptor;
        }

        logger.debug('Bluetooth API removed');
      } else {
        // Bluetooth is available - add realistic protection
        if ((navigator as any).bluetooth) {
          const originalRequestDevice = (navigator as any).bluetooth.requestDevice.bind(
            (navigator as any).bluetooth
          );

          (navigator as any).bluetooth.requestDevice = async function (options?: any) {
            // Add realistic delay for device scanning
            await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

            // Simulate user cancellation (15% chance)
            if (Math.random() < 0.15) {
              throw new DOMException(
                'User cancelled the requestDevice() chooser',
                'NotFoundError'
              );
            }

            // Simulate no devices found (10% chance)
            if (Math.random() < 0.1) {
              throw new DOMException('No Bluetooth devices found', 'NotFoundError');
            }

            return originalRequestDevice(options);
          };

          // Override getAvailability to return consistent state
          if ((navigator as any).bluetooth.getAvailability) {
            (navigator as any).bluetooth.getAvailability = async function () {
              return Promise.resolve(true);
            };
          }

          // Add getDevices method if missing (Chrome 85+)
          if (!(navigator as any).bluetooth.getDevices) {
            (navigator as any).bluetooth.getDevices = async function () {
              // Return empty array (no previously paired devices)
              return Promise.resolve([]);
            };
          }
        }
      }

      // ========================================
      // 2. WebUSB API Protection
      // ========================================

      if (!profile.hasUSB) {
        // Remove USB API entirely
        if ((navigator as any).usb) {
          delete (navigator as any).usb;
        }

        // Remove USB-related classes
        if ((window as any).USB) {
          delete (window as any).USB;
        }
        if ((window as any).USBDevice) {
          delete (window as any).USBDevice;
        }
        if ((window as any).USBConfiguration) {
          delete (window as any).USBConfiguration;
        }
        if ((window as any).USBInterface) {
          delete (window as any).USBInterface;
        }
        if ((window as any).USBAlternateInterface) {
          delete (window as any).USBAlternateInterface;
        }
        if ((window as any).USBEndpoint) {
          delete (window as any).USBEndpoint;
        }
        if ((window as any).USBInTransferResult) {
          delete (window as any).USBInTransferResult;
        }
        if ((window as any).USBOutTransferResult) {
          delete (window as any).USBOutTransferResult;
        }
        if ((window as any).USBIsochronousInTransferResult) {
          delete (window as any).USBIsochronousInTransferResult;
        }
        if ((window as any).USBIsochronousOutTransferResult) {
          delete (window as any).USBIsochronousOutTransferResult;
        }
        if ((window as any).USBConnectionEvent) {
          delete (window as any).USBConnectionEvent;
        }

        logger.debug('USB API removed');
      } else {
        // USB is available - add realistic protection
        if ((navigator as any).usb) {
          const originalRequestDevice = (navigator as any).usb.requestDevice.bind(
            (navigator as any).usb
          );

          (navigator as any).usb.requestDevice = async function (options?: any) {
            // Add realistic delay for device scanning
            await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1500));

            // Simulate user cancellation (20% chance)
            if (Math.random() < 0.2) {
              throw new DOMException(
                'User cancelled the requestDevice() chooser',
                'NotFoundError'
              );
            }

            // Simulate no devices found (15% chance)
            if (Math.random() < 0.15) {
              throw new DOMException('No USB devices found', 'NotFoundError');
            }

            return originalRequestDevice(options);
          };

          // Override getDevices to return consistent state
          const originalGetDevices = (navigator as any).usb.getDevices.bind(
            (navigator as any).usb
          );

          (navigator as any).usb.getDevices = async function () {
            // Return empty array (no previously authorized devices)
            return Promise.resolve([]);
          };
        }
      }

      // ========================================
      // 3. Web Serial API Protection
      // ========================================

      if (!profile.hasSerial) {
        // Remove Serial API entirely
        if ((navigator as any).serial) {
          delete (navigator as any).serial;
        }

        // Remove Serial-related classes
        if ((window as any).Serial) {
          delete (window as any).Serial;
        }
        if ((window as any).SerialPort) {
          delete (window as any).SerialPort;
        }

        logger.debug('Serial API removed');
      } else {
        // Serial is available - add realistic protection
        if ((navigator as any).serial) {
          const originalRequestPort = (navigator as any).serial.requestPort.bind(
            (navigator as any).serial
          );

          (navigator as any).serial.requestPort = async function (options?: any) {
            // Add realistic delay
            await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 1200));

            // Simulate user cancellation (25% chance)
            if (Math.random() < 0.25) {
              throw new DOMException(
                'User cancelled the requestPort() chooser',
                'NotFoundError'
              );
            }

            return originalRequestPort(options);
          };

          // Override getPorts
          if ((navigator as any).serial.getPorts) {
            (navigator as any).serial.getPorts = async function () {
              return Promise.resolve([]);
            };
          }
        }
      }

      // ========================================
      // 4. WebHID API Protection
      // ========================================

      if (!profile.hasHID) {
        // Remove HID API entirely
        if ((navigator as any).hid) {
          delete (navigator as any).hid;
        }

        // Remove HID-related classes
        if ((window as any).HID) {
          delete (window as any).HID;
        }
        if ((window as any).HIDDevice) {
          delete (window as any).HIDDevice;
        }
        if ((window as any).HIDConnectionEvent) {
          delete (window as any).HIDConnectionEvent;
        }
        if ((window as any).HIDInputReportEvent) {
          delete (window as any).HIDInputReportEvent;
        }

        logger.debug('HID API removed');
      } else {
        // HID is available - add realistic protection
        if ((navigator as any).hid) {
          const originalRequestDevice = (navigator as any).hid.requestDevice.bind(
            (navigator as any).hid
          );

          (navigator as any).hid.requestDevice = async function (options?: any) {
            // Add realistic delay
            await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 1400));

            // Simulate user cancellation (20% chance)
            if (Math.random() < 0.2) {
              throw new DOMException(
                'User cancelled the requestDevice() chooser',
                'NotFoundError'
              );
            }

            return originalRequestDevice(options);
          };

          // Override getDevices
          if ((navigator as any).hid.getDevices) {
            (navigator as any).hid.getDevices = async function () {
              return Promise.resolve([]);
            };
          }
        }
      }

      // ========================================
      // 5. Web NFC API Protection
      // ========================================

      if (!profile.hasNFC) {
        // Remove NFC API entirely (mostly mobile)
        if ((window as any).NDEFReader) {
          delete (window as any).NDEFReader;
        }
        if ((window as any).NDEFRecord) {
          delete (window as any).NDEFRecord;
        }
        if ((window as any).NDEFReadingEvent) {
          delete (window as any).NDEFReadingEvent;
        }

        logger.debug('NFC API removed');
      } else {
        // NFC is available (mobile devices) - add realistic protection
        if ((window as any).NDEFReader) {
          const OriginalNDEFReader = (window as any).NDEFReader;

          (window as any).NDEFReader = class NDEFReader extends OriginalNDEFReader {
            async scan(options?: any) {
              // Add realistic delay
              await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

              // Simulate permission denial (10% chance)
              if (Math.random() < 0.1) {
                throw new DOMException('NFC permission denied', 'NotAllowedError');
              }

              return super.scan(options);
            }

            async write(message: any, options?: any) {
              // Add realistic delay
              await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1500));

              // Simulate write failure (5% chance)
              if (Math.random() < 0.05) {
                throw new DOMException('NFC write failed', 'NetworkError');
              }

              return super.write(message, options);
            }
          };
        }
      }

      // ========================================
      // 6. Permissions API Consistency
      // ========================================

      if (navigator.permissions && navigator.permissions.query) {
        const originalQuery = navigator.permissions.query.bind(navigator.permissions);

        navigator.permissions.query = function (permissionDesc: any) {
          const name = permissionDesc.name;

          // Bluetooth
          if (name === 'bluetooth') {
            const state = profile.hasBluetooth ? 'prompt' : 'denied';
            return Promise.resolve({
              state,
              onchange: null,
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
            } as PermissionStatus);
          }

          // USB (no permission API yet, but future-proofing)
          if (name === 'usb') {
            const state = profile.hasUSB ? 'prompt' : 'denied';
            return Promise.resolve({
              state,
              onchange: null,
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
            } as PermissionStatus);
          }

          // Serial
          if (name === 'serial') {
            const state = profile.hasSerial ? 'prompt' : 'denied';
            return Promise.resolve({
              state,
              onchange: null,
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
            } as PermissionStatus);
          }

          // HID
          if (name === 'hid') {
            const state = profile.hasHID ? 'prompt' : 'denied';
            return Promise.resolve({
              state,
              onchange: null,
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
            } as PermissionStatus);
          }

          // NFC
          if (name === 'nfc') {
            const state = profile.hasNFC ? 'prompt' : 'denied';
            return Promise.resolve({
              state,
              onchange: null,
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
            } as PermissionStatus);
          }

          return originalQuery(permissionDesc);
        };
      }

      // ========================================
      // 7. Feature Detection Consistency
      // ========================================

      // Ensure feature policy is consistent
      if (document.featurePolicy || (document as any).permissionsPolicy) {
        const policy = document.featurePolicy || (document as any).permissionsPolicy;

        if (policy.features) {
          const originalFeatures = policy.features.bind(policy);

          policy.features = function () {
            const features = originalFeatures();

            // Remove device APIs from feature list if not supported
            const filteredFeatures = features.filter((feature: string) => {
              if (!profile.hasBluetooth && feature === 'bluetooth') return false;
              if (!profile.hasUSB && feature === 'usb') return false;
              if (!profile.hasSerial && feature === 'serial') return false;
              if (!profile.hasHID && feature === 'hid') return false;
              if (!profile.hasNFC && feature === 'nfc') return false;
              return true;
            });

            return filteredFeatures;
          };
        }

        // Override allowsFeature checks
        if (policy.allowsFeature) {
          const originalAllowsFeature = policy.allowsFeature.bind(policy);

          policy.allowsFeature = function (feature: string, origin?: string) {
            // Return false for unsupported device APIs
            if (!profile.hasBluetooth && feature === 'bluetooth') return false;
            if (!profile.hasUSB && feature === 'usb') return false;
            if (!profile.hasSerial && feature === 'serial') return false;
            if (!profile.hasHID && feature === 'hid') return false;
            if (!profile.hasNFC && feature === 'nfc') return false;

            return originalAllowsFeature(feature, origin);
          };
        }
      }

      // ========================================
      // 8. Platform-Specific Adjustments
      // ========================================

      // Mobile devices typically don't have USB/Serial/HID
      if (profile.platformType === 'mobile' || profile.platformType === 'tablet') {
        // Ensure these APIs are removed on mobile
        if ((navigator as any).usb) delete (navigator as any).usb;
        if ((navigator as any).serial) delete (navigator as any).serial;
        if ((navigator as any).hid) delete (navigator as any).hid;

        // But Bluetooth and NFC are common on mobile
        if (!profile.hasBluetooth && (navigator as any).bluetooth) {
          delete (navigator as any).bluetooth;
        }
        if (!profile.hasNFC && (window as any).NDEFReader) {
          delete (window as any).NDEFReader;
        }
      }

      // Desktop devices typically have USB/Serial/HID but not NFC
      if (profile.platformType === 'desktop') {
        // NFC is rare on desktop
        if ((window as any).NDEFReader) {
          delete (window as any).NDEFReader;
        }
      }

      logger.debug('Bluetooth/USB/Device API protection applied successfully');
    }, this.profile);

    logger.debug('Bluetooth/USB protection scripts injected successfully');
  }

  /**
   * Update device API profile
   */
  setProfile(profile: DeviceAPIProfile): void {
    this.profile = profile;
  }

  /**
   * Get current profile
   */
  getProfile(): DeviceAPIProfile {
    return this.profile;
  }

  /**
   * Get module name
   */
  getName(): string {
    return 'BluetoothUSBProtection';
  }
}
