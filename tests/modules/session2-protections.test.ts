/**
 * Tests for Session 2 protection modules
 *
 * Tests:
 * - Device Orientation Protection
 * - WebAuthn Protection
 * - Bluetooth/USB Protection
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { DeviceOrientationProtection } from '../../src/modules/device-orientation-protection';
import { WebAuthnProtection } from '../../src/modules/webauthn-protection';
import { BluetoothUSBProtection } from '../../src/modules/bluetooth-usb-protection';

describe('Session 2 Protection Modules', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Device Orientation Protection', () => {
    it('should remove Device APIs on desktop', async () => {
      const protection = new DeviceOrientationProtection({
        enabled: true,
        deviceType: 'desktop',
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        return {
          hasDeviceOrientationEvent:
            typeof DeviceOrientationEvent !== 'undefined',
          hasDeviceMotionEvent: typeof DeviceMotionEvent !== 'undefined',
          hasOnDeviceOrientation: 'ondeviceorientation' in window,
          hasOnDeviceMotion: 'ondevicemotion' in window,
        };
      });

      // Desktop should not have these APIs
      expect(result.hasDeviceOrientationEvent).toBe(false);
      expect(result.hasDeviceMotionEvent).toBe(false);
      expect(result.hasOnDeviceOrientation).toBe(false);
      expect(result.hasOnDeviceMotion).toBe(false);
    });

    it('should block event listeners on desktop', async () => {
      const protection = new DeviceOrientationProtection({
        enabled: true,
        deviceType: 'desktop',
      });

      await protection.apply(page);

      const listenerCalled = await page.evaluate(() => {
        return new Promise((resolve) => {
          let called = false;

          window.addEventListener('deviceorientation', () => {
            called = true;
          });

          // Try to trigger (won't work on desktop)
          setTimeout(() => resolve(called), 200);
        });
      });

      expect(listenerCalled).toBe(false);
    });

    it('should provide Device APIs on mobile', async () => {
      const protection = new DeviceOrientationProtection({
        enabled: true,
        deviceType: 'mobile',
        enableOrientation: true,
        enableMotion: true,
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        return {
          hasDeviceOrientationEvent:
            typeof DeviceOrientationEvent !== 'undefined',
          hasDeviceMotionEvent: typeof DeviceMotionEvent !== 'undefined',
        };
      });

      // Mobile should have these APIs
      expect(result.hasDeviceOrientationEvent).toBe(true);
      expect(result.hasDeviceMotionEvent).toBe(true);
    });

    it('should trigger orientation events on mobile', async () => {
      const protection = new DeviceOrientationProtection({
        enabled: true,
        deviceType: 'mobile',
        enableOrientation: true,
      });

      await protection.apply(page);

      const eventReceived = await page.evaluate(() => {
        return new Promise((resolve) => {
          window.addEventListener('deviceorientation', (event: any) => {
            resolve({
              hasAlpha: event.alpha !== null && event.alpha !== undefined,
              hasBeta: event.beta !== null && event.beta !== undefined,
              hasGamma: event.gamma !== null && event.gamma !== undefined,
            });
          });

          setTimeout(() => resolve(null), 500);
        });
      });

      expect(eventReceived).not.toBeNull();
      expect((eventReceived as any).hasAlpha).toBe(true);
    });
  });

  describe('WebAuthn Protection', () => {
    it('should provide PublicKeyCredential for Windows', async () => {
      const protection = new WebAuthnProtection({
        enabled: true,
        platform: 'Win32',
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        return {
          hasPublicKeyCredential: typeof PublicKeyCredential !== 'undefined',
          hasCredentials: !!navigator.credentials,
        };
      });

      expect(result.hasPublicKeyCredential).toBe(true);
      expect(result.hasCredentials).toBe(true);
    });

    it('should report platform authenticator availability', async () => {
      const protection = new WebAuthnProtection({
        enabled: true,
        platform: 'Win32',
        supportPlatformAuthenticator: true,
      });

      await protection.apply(page);

      const hasPlatformAuth = await page.evaluate(async () => {
        if (typeof PublicKeyCredential === 'undefined') {
          return false;
        }
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      });

      expect(hasPlatformAuth).toBe(true);
    });

    it('should report no platform authenticator on Linux', async () => {
      const protection = new WebAuthnProtection({
        enabled: true,
        platform: 'Linux x86_64',
      });

      await protection.apply(page);

      const hasPlatformAuth = await page.evaluate(async () => {
        if (typeof PublicKeyCredential === 'undefined') {
          return false;
        }
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      });

      expect(hasPlatformAuth).toBe(false);
    });

    it('should provide PasswordCredential class', async () => {
      const protection = new WebAuthnProtection({
        enabled: true,
        platform: 'Win32',
        credentialManagementAvailable: true,
      });

      await protection.apply(page);

      const hasPasswordCredential = await page.evaluate(() => {
        return typeof PasswordCredential !== 'undefined';
      });

      expect(hasPasswordCredential).toBe(true);
    });

    it('should make toString look native', async () => {
      const protection = new WebAuthnProtection({
        enabled: true,
        platform: 'Win32',
      });

      await protection.apply(page);

      const isNative = await page.evaluate(() => {
        if (typeof PublicKeyCredential === 'undefined') {
          return false;
        }
        return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
          .toString()
          .includes('[native code]');
      });

      expect(isNative).toBe(true);
    });
  });

  describe('Bluetooth/USB Protection', () => {
    it('should provide Bluetooth API on Chrome/Windows', async () => {
      const protection = new BluetoothUSBProtection({
        enabled: true,
        platform: 'Win32',
        browser: 'chrome',
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        return {
          hasBluetooth: !!navigator.bluetooth,
          hasUSB: !!navigator.usb,
        };
      });

      expect(result.hasBluetooth).toBe(true);
      expect(result.hasUSB).toBe(true);
    });

    it('should not provide Bluetooth on Firefox', async () => {
      const protection = new BluetoothUSBProtection({
        enabled: true,
        platform: 'Win32',
        browser: 'firefox',
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        return {
          hasBluetooth: !!navigator.bluetooth,
          hasUSB: !!navigator.usb,
        };
      });

      expect(result.hasBluetooth).toBe(false);
      expect(result.hasUSB).toBe(false);
    });

    it('should not provide Bluetooth on Safari', async () => {
      const protection = new BluetoothUSBProtection({
        enabled: true,
        platform: 'MacIntel',
        browser: 'safari',
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        return {
          hasBluetooth: !!navigator.bluetooth,
          hasUSB: !!navigator.usb,
        };
      });

      expect(result.hasBluetooth).toBe(false);
      expect(result.hasUSB).toBe(false);
    });

    it('should provide Bluetooth but not USB on Android', async () => {
      const protection = new BluetoothUSBProtection({
        enabled: true,
        platform: 'Android',
        browser: 'chrome',
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        return {
          hasBluetooth: !!navigator.bluetooth,
          hasUSB: !!navigator.usb,
        };
      });

      expect(result.hasBluetooth).toBe(true);
      expect(result.hasUSB).toBe(false); // No USB on mobile
    });

    it('should provide Serial and HID APIs on Chrome/Windows', async () => {
      const protection = new BluetoothUSBProtection({
        enabled: true,
        platform: 'Win32',
        browser: 'chrome',
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        return {
          hasSerial: !!(navigator as any).serial,
          hasHID: !!(navigator as any).hid,
        };
      });

      expect(result.hasSerial).toBe(true);
      expect(result.hasHID).toBe(true);
    });

    it('should remove NFC and Presentation APIs', async () => {
      const protection = new BluetoothUSBProtection({
        enabled: true,
        platform: 'Win32',
        browser: 'chrome',
      });

      // Set some dummy APIs
      await page.evaluateOnNewDocument(() => {
        (navigator as any).nfc = { fake: true };
        (navigator as any).presentation = { fake: true };
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        return {
          hasNFC: !!(navigator as any).nfc,
          hasPresentation: !!(navigator as any).presentation,
        };
      });

      expect(result.hasNFC).toBe(false);
      expect(result.hasPresentation).toBe(false);
    });

    it('should make Bluetooth methods look native', async () => {
      const protection = new BluetoothUSBProtection({
        enabled: true,
        platform: 'Win32',
        browser: 'chrome',
      });

      await protection.apply(page);

      const isNative = await page.evaluate(() => {
        if (!navigator.bluetooth) return false;
        return navigator.bluetooth.getAvailability.toString().includes('[native code]');
      });

      expect(isNative).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should apply all Session 2 protections together', async () => {
      const deviceOrientation = new DeviceOrientationProtection({
        deviceType: 'desktop',
      });
      const webauthn = new WebAuthnProtection({
        platform: 'Win32',
      });
      const bluetoothUSB = new BluetoothUSBProtection({
        platform: 'Win32',
        browser: 'chrome',
      });

      await Promise.all([
        deviceOrientation.apply(page),
        webauthn.apply(page),
        bluetoothUSB.apply(page),
      ]);

      const result = await page.evaluate(() => {
        return {
          // Device Orientation (should be removed on desktop)
          hasDeviceOrientation: typeof DeviceOrientationEvent !== 'undefined',
          // WebAuthn (should be present)
          hasPublicKeyCredential: typeof PublicKeyCredential !== 'undefined',
          hasCredentials: !!navigator.credentials,
          // Bluetooth/USB (should be present on Chrome/Windows)
          hasBluetooth: !!navigator.bluetooth,
          hasUSB: !!navigator.usb,
        };
      });

      expect(result.hasDeviceOrientation).toBe(false);
      expect(result.hasPublicKeyCredential).toBe(true);
      expect(result.hasCredentials).toBe(true);
      expect(result.hasBluetooth).toBe(true);
      expect(result.hasUSB).toBe(true);
    });

    it('should maintain consistency for mobile device', async () => {
      const deviceOrientation = new DeviceOrientationProtection({
        deviceType: 'mobile',
        enableOrientation: true,
      });
      const webauthn = new WebAuthnProtection({
        platform: 'Android',
      });
      const bluetoothUSB = new BluetoothUSBProtection({
        platform: 'Android',
        browser: 'chrome',
      });

      await Promise.all([
        deviceOrientation.apply(page),
        webauthn.apply(page),
        bluetoothUSB.apply(page),
      ]);

      const result = await page.evaluate(() => {
        return {
          // Device Orientation (should be present on mobile)
          hasDeviceOrientation: typeof DeviceOrientationEvent !== 'undefined',
          // WebAuthn (should be present)
          hasPublicKeyCredential: typeof PublicKeyCredential !== 'undefined',
          // Bluetooth (should be present on Android Chrome)
          hasBluetooth: !!navigator.bluetooth,
          // USB (should NOT be present on mobile)
          hasUSB: !!navigator.usb,
        };
      });

      expect(result.hasDeviceOrientation).toBe(true);
      expect(result.hasPublicKeyCredential).toBe(true);
      expect(result.hasBluetooth).toBe(true);
      expect(result.hasUSB).toBe(false); // No USB on mobile
    });
  });
});
