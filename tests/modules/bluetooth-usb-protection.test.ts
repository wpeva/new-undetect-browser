import { describe, it, expect, beforeEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { BluetoothUSBProtectionModule } from '../../src/modules/bluetooth-usb-protection';

describe('BluetoothUSBProtectionModule', () => {
  let browser: Browser;
  let page: Page;

  beforeEach(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();
  });

  describe('Desktop Profile without Device APIs', () => {
    let protection: BluetoothUSBProtectionModule;

    beforeEach(async () => {
      protection = new BluetoothUSBProtectionModule({
        hasBluetooth: false,
        hasUSB: false,
        hasSerial: false,
        hasHID: false,
        hasNFC: false,
        platformType: 'desktop',
      });
      await protection.inject(page);
    });

    it('should not have navigator.bluetooth', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).bluetooth !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have navigator.usb', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).usb !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have navigator.serial', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).serial !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have navigator.hid', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).hid !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have BluetoothDevice', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (window as any).BluetoothDevice !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have USB classes', async () => {
      const hasClasses = await page.evaluate(() => {
        return {
          USB: typeof (window as any).USB !== 'undefined',
          USBDevice: typeof (window as any).USBDevice !== 'undefined',
        };
      });
      expect(hasClasses.USB).toBe(false);
      expect(hasClasses.USBDevice).toBe(false);
    });

    it('should not have Serial classes', async () => {
      const hasClasses = await page.evaluate(() => {
        return {
          Serial: typeof (window as any).Serial !== 'undefined',
          SerialPort: typeof (window as any).SerialPort !== 'undefined',
        };
      });
      expect(hasClasses.Serial).toBe(false);
      expect(hasClasses.SerialPort).toBe(false);
    });

    it('should not have HID classes', async () => {
      const hasClasses = await page.evaluate(() => {
        return {
          HID: typeof (window as any).HID !== 'undefined',
          HIDDevice: typeof (window as any).HIDDevice !== 'undefined',
        };
      });
      expect(hasClasses.HID).toBe(false);
      expect(hasClasses.HIDDevice).toBe(false);
    });

    it('should not have NFC API', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (window as any).NDEFReader !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should return denied permission for bluetooth', async () => {
      const permission = await page.evaluate(async () => {
        if (!navigator.permissions || !navigator.permissions.query) {
          return 'unavailable';
        }
        try {
          const result = await navigator.permissions.query({ name: 'bluetooth' as any });
          return result.state;
        } catch {
          return 'unavailable';
        }
      });

      expect(permission).toBe('denied');
    });

    it('should return correct module name', () => {
      expect(protection.getName()).toBe('BluetoothUSBProtection');
    });

    it('should allow updating profile', () => {
      const newProfile = {
        hasBluetooth: true,
        hasUSB: false,
        hasSerial: false,
        hasHID: false,
        hasNFC: false,
        platformType: 'mobile' as const,
      };
      protection.setProfile(newProfile);
      expect(protection.getProfile()).toEqual(newProfile);
    });
  });

  describe('Desktop Profile with USB and Serial', () => {
    let protection: BluetoothUSBProtectionModule;

    beforeEach(async () => {
      protection = new BluetoothUSBProtectionModule({
        hasBluetooth: false,
        hasUSB: true,
        hasSerial: true,
        hasHID: true,
        hasNFC: false,
        platformType: 'desktop',
      });
      await protection.inject(page);
    });

    it('should have navigator.usb', async () => {
      const hasAPI = await page.evaluate(() => {
        return (
          (navigator as any).usb &&
          typeof (navigator as any).usb.requestDevice === 'function'
        );
      });
      expect(hasAPI).toBe(true);
    });

    it('should have navigator.serial', async () => {
      const hasAPI = await page.evaluate(() => {
        return (
          (navigator as any).serial &&
          typeof (navigator as any).serial.requestPort === 'function'
        );
      });
      expect(hasAPI).toBe(true);
    });

    it('should have navigator.hid', async () => {
      const hasAPI = await page.evaluate(() => {
        return (
          (navigator as any).hid &&
          typeof (navigator as any).hid.requestDevice === 'function'
        );
      });
      expect(hasAPI).toBe(true);
    });

    it('should add realistic delay to USB requestDevice', async () => {
      const startTime = Date.now();

      await page.evaluate(async () => {
        try {
          await (navigator as any).usb.requestDevice({ filters: [] });
        } catch (e) {
          // Expected to throw (user cancelled or no devices)
        }
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(800);
    });

    it('should add realistic delay to Serial requestPort', async () => {
      const startTime = Date.now();

      await page.evaluate(async () => {
        try {
          await (navigator as any).serial.requestPort();
        } catch (e) {
          // Expected to throw
        }
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(600);
    });

    it('should add realistic delay to HID requestDevice', async () => {
      const startTime = Date.now();

      await page.evaluate(async () => {
        try {
          await (navigator as any).hid.requestDevice({ filters: [] });
        } catch (e) {
          // Expected to throw
        }
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(700);
    });

    it('should return empty array from USB getDevices', async () => {
      const devices = await page.evaluate(async () => {
        if ((navigator as any).usb && (navigator as any).usb.getDevices) {
          return await (navigator as any).usb.getDevices();
        }
        return null;
      });

      expect(devices).toEqual([]);
    });

    it('should return empty array from Serial getPorts', async () => {
      const ports = await page.evaluate(async () => {
        if ((navigator as any).serial && (navigator as any).serial.getPorts) {
          return await (navigator as any).serial.getPorts();
        }
        return null;
      });

      expect(ports).toEqual([]);
    });

    it('should return empty array from HID getDevices', async () => {
      const devices = await page.evaluate(async () => {
        if ((navigator as any).hid && (navigator as any).hid.getDevices) {
          return await (navigator as any).hid.getDevices();
        }
        return null;
      });

      expect(devices).toEqual([]);
    });

    it('should still not have bluetooth on desktop', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).bluetooth !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should still not have NFC on desktop', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (window as any).NDEFReader !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });
  });

  describe('Mobile Profile with Bluetooth and NFC', () => {
    let protection: BluetoothUSBProtectionModule;

    beforeEach(async () => {
      protection = new BluetoothUSBProtectionModule({
        hasBluetooth: true,
        hasUSB: false,
        hasSerial: false,
        hasHID: false,
        hasNFC: true,
        platformType: 'mobile',
      });
      await protection.inject(page);
    });

    it('should have navigator.bluetooth', async () => {
      const hasAPI = await page.evaluate(() => {
        return (
          (navigator as any).bluetooth &&
          typeof (navigator as any).bluetooth.requestDevice === 'function'
        );
      });
      expect(hasAPI).toBe(true);
    });

    it('should have NFC API', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (window as any).NDEFReader === 'function';
      });
      expect(hasAPI).toBe(true);
    });

    it('should not have USB on mobile', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).usb !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have Serial on mobile', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).serial !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have HID on mobile', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).hid !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should add realistic delay to Bluetooth requestDevice', async () => {
      const startTime = Date.now();

      await page.evaluate(async () => {
        try {
          await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
          });
        } catch (e) {
          // Expected to throw
        }
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(1000);
    });

    it('should have getAvailability method', async () => {
      const hasMethod = await page.evaluate(() => {
        return (
          (navigator as any).bluetooth &&
          typeof (navigator as any).bluetooth.getAvailability === 'function'
        );
      });
      expect(hasMethod).toBe(true);
    });

    it('should report Bluetooth as available', async () => {
      const isAvailable = await page.evaluate(async () => {
        if ((navigator as any).bluetooth && (navigator as any).bluetooth.getAvailability) {
          return await (navigator as any).bluetooth.getAvailability();
        }
        return false;
      });
      expect(isAvailable).toBe(true);
    });

    it('should have getDevices method', async () => {
      const hasMethod = await page.evaluate(() => {
        return (
          (navigator as any).bluetooth &&
          typeof (navigator as any).bluetooth.getDevices === 'function'
        );
      });
      expect(hasMethod).toBe(true);
    });

    it('should return empty array from Bluetooth getDevices', async () => {
      const devices = await page.evaluate(async () => {
        if ((navigator as any).bluetooth && (navigator as any).bluetooth.getDevices) {
          return await (navigator as any).bluetooth.getDevices();
        }
        return null;
      });

      expect(devices).toEqual([]);
    });

    it('should return prompt permission for bluetooth', async () => {
      const permission = await page.evaluate(async () => {
        if (!navigator.permissions || !navigator.permissions.query) {
          return 'unavailable';
        }
        try {
          const result = await navigator.permissions.query({ name: 'bluetooth' as any });
          return result.state;
        } catch {
          return 'unavailable';
        }
      });

      expect(permission).toBe('prompt');
    });

    it('should return prompt permission for NFC', async () => {
      const permission = await page.evaluate(async () => {
        if (!navigator.permissions || !navigator.permissions.query) {
          return 'unavailable';
        }
        try {
          const result = await navigator.permissions.query({ name: 'nfc' as any });
          return result.state;
        } catch {
          return 'unavailable';
        }
      });

      expect(permission).toBe('prompt');
    });
  });

  describe('Tablet Profile', () => {
    let protection: BluetoothUSBProtectionModule;

    beforeEach(async () => {
      protection = new BluetoothUSBProtectionModule({
        hasBluetooth: true,
        hasUSB: false,
        hasSerial: false,
        hasHID: false,
        hasNFC: false,
        platformType: 'tablet',
      });
      await protection.inject(page);
    });

    it('should have Bluetooth on tablet', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).bluetooth !== 'undefined';
      });
      expect(hasAPI).toBe(true);
    });

    it('should not have USB on tablet', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).usb !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have Serial on tablet', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).serial !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });

    it('should not have HID on tablet', async () => {
      const hasAPI = await page.evaluate(() => {
        return typeof (navigator as any).hid !== 'undefined';
      });
      expect(hasAPI).toBe(false);
    });
  });
});
