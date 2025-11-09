import { describe, it, expect, beforeEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { HeadlessDetectionProtection } from '../../src/modules/headless-detection-protection';

describe('HeadlessDetectionProtection', () => {
  let browser: Browser;
  let page: Page;
  let protection: HeadlessDetectionProtection;

  beforeEach(async () => {
    protection = new HeadlessDetectionProtection();

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    page = await browser.newPage();
    await protection.inject(page);
  });

  afterEach(async () => {
    await browser.close();
  });

  describe('Navigator Properties', () => {
    it('should set navigator.webdriver to false', async () => {
      const webdriver = await page.evaluate(() => (navigator as any).webdriver);
      expect(webdriver).toBe(false);
    });

    it('should remove Headless from user agent', async () => {
      const userAgent = await page.evaluate(() => navigator.userAgent);
      expect(userAgent).not.toContain('Headless');
      expect(userAgent).not.toContain('HeadlessChrome');
    });

    it('should add connection API', async () => {
      const hasConnection = await page.evaluate(() => 'connection' in navigator);
      expect(hasConnection).toBe(true);
    });

    it('should have realistic connection properties', async () => {
      const connection = await page.evaluate(() => {
        const conn = (navigator as any).connection;
        return {
          effectiveType: conn.effectiveType,
          rtt: conn.rtt,
          downlink: conn.downlink,
          saveData: conn.saveData,
        };
      });

      expect(connection.effectiveType).toBe('4g');
      expect(typeof connection.rtt).toBe('number');
      expect(typeof connection.downlink).toBe('number');
      expect(connection.saveData).toBe(false);
    });

    it('should add battery API', async () => {
      const hasBattery = await page.evaluate(() => typeof (navigator as any).getBattery === 'function');
      expect(hasBattery).toBe(true);
    });
  });

  describe('Chrome Object', () => {
    it('should have chrome.loadTimes', async () => {
      const hasLoadTimes = await page.evaluate(() => {
        return window.chrome && typeof (window.chrome as any).loadTimes === 'function';
      });
      expect(hasLoadTimes).toBe(true);
    });

    it('should have chrome.csi', async () => {
      const hasCsi = await page.evaluate(() => {
        return window.chrome && typeof (window.chrome as any).csi === 'function';
      });
      expect(hasCsi).toBe(true);
    });

    it('should have chrome.app', async () => {
      const hasApp = await page.evaluate(() => {
        return window.chrome && (window.chrome as any).app;
      });
      expect(hasApp).toBeTruthy();
    });
  });

  describe('Window Properties', () => {
    it('should have non-zero outerWidth', async () => {
      const outerWidth = await page.evaluate(() => window.outerWidth);
      expect(outerWidth).toBeGreaterThan(0);
    });

    it('should have non-zero outerHeight', async () => {
      const outerHeight = await page.evaluate(() => window.outerHeight);
      expect(outerHeight).toBeGreaterThan(0);
    });

    it('should have realistic screen dimensions', async () => {
      const dimensions = await page.evaluate(() => ({
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      }));

      expect(dimensions.screenWidth).toBeGreaterThanOrEqual(dimensions.innerWidth);
      expect(dimensions.screenHeight).toBeGreaterThanOrEqual(dimensions.innerHeight);
    });
  });

  describe('Document Properties', () => {
    it('should have document.hidden as false', async () => {
      const hidden = await page.evaluate(() => document.hidden);
      expect(hidden).toBe(false);
    });

    it('should have visibilityState as visible', async () => {
      const visibilityState = await page.evaluate(() => document.visibilityState);
      expect(visibilityState).toBe('visible');
    });
  });

  describe('Notification Permission', () => {
    it('should have default notification permission', async () => {
      const permission = await page.evaluate(() => {
        if (typeof Notification !== 'undefined') {
          return Notification.permission;
        }
        return null;
      });

      if (permission !== null) {
        expect(permission).toBe('default');
      }
    });
  });

  describe('Media Devices', () => {
    it('should have media devices', async () => {
      const hasMediaDevices = await page.evaluate(() => {
        return (
          navigator.mediaDevices &&
          typeof navigator.mediaDevices.enumerateDevices === 'function'
        );
      });
      expect(hasMediaDevices).toBe(true);
    });

    it('should enumerate media devices', async () => {
      const devices = await page.evaluate(async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          return await navigator.mediaDevices.enumerateDevices();
        }
        return [];
      });

      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThan(0);
    });
  });

  describe('Service Worker API', () => {
    it('should have service worker API', async () => {
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      expect(hasServiceWorker).toBe(true);
    });
  });

  describe('Performance Memory', () => {
    it('should have performance.memory', async () => {
      const hasMemory = await page.evaluate(() => {
        return 'memory' in performance;
      });
      expect(hasMemory).toBe(true);
    });

    it('should have realistic memory values', async () => {
      const memory = await page.evaluate(() => {
        const mem = (performance as any).memory;
        return {
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
          totalJSHeapSize: mem.totalJSHeapSize,
          usedJSHeapSize: mem.usedJSHeapSize,
        };
      });

      expect(memory.jsHeapSizeLimit).toBeGreaterThan(0);
      expect(memory.totalJSHeapSize).toBeGreaterThan(0);
      expect(memory.usedJSHeapSize).toBeGreaterThan(0);
      expect(memory.totalJSHeapSize).toBeLessThanOrEqual(memory.jsHeapSizeLimit);
      expect(memory.usedJSHeapSize).toBeLessThanOrEqual(memory.totalJSHeapSize);
    });
  });

  describe('Console Methods', () => {
    it('should have all console methods', async () => {
      const consoleMethods = await page.evaluate(() => {
        const methods = [
          'assert', 'clear', 'count', 'countReset', 'debug', 'dir', 'dirxml',
          'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info',
          'log', 'profile', 'profileEnd', 'table', 'time', 'timeEnd', 'timeLog',
          'timeStamp', 'trace', 'warn'
        ];
        return methods.every(method => typeof (console as any)[method] === 'function');
      });
      expect(consoleMethods).toBe(true);
    });
  });

  describe('Intl API', () => {
    it('should have complete Intl API', async () => {
      const hasIntl = await page.evaluate(() => {
        return (
          window.Intl &&
          typeof Intl.DateTimeFormat === 'function' &&
          typeof Intl.NumberFormat === 'function' &&
          typeof Intl.Collator === 'function'
        );
      });
      expect(hasIntl).toBe(true);
    });

    it('should have Intl.PluralRules', async () => {
      const hasPluralRules = await page.evaluate(() => {
        return window.Intl && typeof (Intl as any).PluralRules === 'function';
      });
      expect(hasPluralRules).toBe(true);
    });
  });

  describe('Module Name', () => {
    it('should return correct module name', () => {
      expect(protection.getName()).toBe('HeadlessDetectionProtection');
    });
  });
});
