import { describe, it, expect, beforeEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { AutomationDetectionProtection } from '../../src/modules/automation-detection-protection';

describe('AutomationDetectionProtection', () => {
  let browser: Browser;
  let page: Page;
  let protection: AutomationDetectionProtection;

  beforeEach(async () => {
    protection = new AutomationDetectionProtection();

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

  describe('Function.toString() Protection', () => {
    it('should make modified functions appear native', async () => {
      const isNative = await page.evaluate(() => {
        // Check if overridden functions return native-like toString
        const func = Object.getOwnPropertyDescriptor(navigator, 'webdriver')?.get;
        if (func) {
          return func.toString().includes('[native code]');
        }
        return false;
      });
      expect(isNative).toBe(true);
    });
  });

  describe('Puppeteer Variable Removal', () => {
    it('should remove __puppeteer_evaluation_script__', async () => {
      const hasPuppeteerVar = await page.evaluate(() => {
        return '__puppeteer_evaluation_script__' in window;
      });
      expect(hasPuppeteerVar).toBe(false);
    });

    it('should remove __playwright__ variable', async () => {
      const hasPlaywrightVar = await page.evaluate(() => {
        return '__playwright__' in window;
      });
      expect(hasPlaywrightVar).toBe(false);
    });

    it('should remove selenium variables', async () => {
      const hasSeleniumVars = await page.evaluate(() => {
        return (
          '__selenium_evaluate__' in window ||
          '__webdriver_evaluate__' in window ||
          '__driver_evaluate__' in window
        );
      });
      expect(hasSeleniumVars).toBe(false);
    });

    it('should prevent automation variables from being added', async () => {
      const cannotAdd = await page.evaluate(() => {
        try {
          (window as any).__puppeteer__ = 'test';
          return '__puppeteer__' in window && (window as any).__puppeteer__ === 'test';
        } catch (e) {
          return false;
        }
      });
      expect(cannotAdd).toBe(false);
    });
  });

  describe('Document Property Protection', () => {
    it('should remove $cdc_ properties from document', async () => {
      const hasCdcProps = await page.evaluate(() => {
        return Object.keys(document).some(key => key.startsWith('$cdc_'));
      });
      expect(hasCdcProps).toBe(false);
    });

    it('should remove $chrome_ properties from document', async () => {
      const hasChromeProps = await page.evaluate(() => {
        return Object.keys(document).some(key => key.startsWith('$chrome_'));
      });
      expect(hasChromeProps).toBe(false);
    });
  });

  describe('Stack Trace Sanitization', () => {
    it('should sanitize error stack traces', async () => {
      const stack = await page.evaluate(() => {
        try {
          throw new Error('Test error');
        } catch (e: any) {
          return e.stack;
        }
      });

      expect(stack).not.toContain('puppeteer');
      expect(stack).not.toContain('playwright');
      expect(stack).not.toContain('selenium');
      expect(stack).not.toContain('webdriver');
      expect(stack).not.toContain('CDP');
    });
  });

  describe('Object.keys() Consistency', () => {
    it('should filter automation keys from Object.keys', async () => {
      const hasAutomationKeys = await page.evaluate(() => {
        // Try to add automation key
        (window as any).__test_puppeteer = 'test';

        const keys = Object.keys(window);
        return keys.some(key =>
          key.startsWith('__puppeteer') ||
          key.startsWith('__playwright') ||
          key.startsWith('__selenium') ||
          key.startsWith('$cdc_')
        );
      });
      expect(hasAutomationKeys).toBe(false);
    });
  });

  describe('JSON.stringify Consistency', () => {
    it('should filter automation properties from JSON.stringify', async () => {
      const jsonString = await page.evaluate(() => {
        const obj = {
          normal: 'value',
          __puppeteer: 'hidden',
          __playwright: 'hidden',
          $cdc_test: 'hidden',
        };
        return JSON.stringify(obj);
      });

      expect(jsonString).toContain('normal');
      expect(jsonString).not.toContain('__puppeteer');
      expect(jsonString).not.toContain('__playwright');
      expect(jsonString).not.toContain('$cdc_');
    });
  });

  describe('Observer APIs', () => {
    it('should make MutationObserver methods appear native', async () => {
      const areNative = await page.evaluate(() => {
        const observer = new MutationObserver(() => {});
        return (
          observer.observe.toString().includes('[native code]') &&
          observer.disconnect.toString().includes('[native code]') &&
          observer.takeRecords.toString().includes('[native code]')
        );
      });
      expect(areNative).toBe(true);
    });

    it('should make IntersectionObserver methods appear native', async () => {
      const areNative = await page.evaluate(() => {
        if (!window.IntersectionObserver) return true; // Skip if not supported

        const observer = new IntersectionObserver(() => {});
        return (
          observer.observe.toString().includes('[native code]') &&
          observer.disconnect.toString().includes('[native code]')
        );
      });
      expect(areNative).toBe(true);
    });

    it('should make PerformanceObserver methods appear native', async () => {
      const areNative = await page.evaluate(() => {
        if (!window.PerformanceObserver) return true; // Skip if not supported

        const observer = new PerformanceObserver(() => {});
        return (
          observer.observe.toString().includes('[native code]') &&
          observer.disconnect.toString().includes('[native code]')
        );
      });
      expect(areNative).toBe(true);
    });
  });

  describe('Trusted Types API', () => {
    it('should have trustedTypes API', async () => {
      const hasTrustedTypes = await page.evaluate(() => {
        return 'trustedTypes' in window;
      });
      expect(hasTrustedTypes).toBe(true);
    });

    it('should allow creating trusted types policies', async () => {
      const canCreatePolicy = await page.evaluate(() => {
        try {
          const policy = (window as any).trustedTypes.createPolicy('test', {
            createHTML: (input: string) => input,
          });
          return policy && policy.name === 'test';
        } catch (e) {
          return false;
        }
      });
      expect(canCreatePolicy).toBe(true);
    });
  });

  describe('Array.from Consistency', () => {
    it('should make Array.from appear native', async () => {
      const isNative = await page.evaluate(() => {
        return Array.from.toString().includes('[native code]');
      });
      expect(isNative).toBe(true);
    });

    it('should work correctly', async () => {
      const result = await page.evaluate(() => {
        return Array.from([1, 2, 3], x => x * 2);
      });
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe('Reflect API Consistency', () => {
    it('should make Reflect methods appear native', async () => {
      const areNative = await page.evaluate(() => {
        return (
          Reflect.get.toString().includes('[native code]') &&
          Reflect.set.toString().includes('[native code]') &&
          Reflect.has.toString().includes('[native code]')
        );
      });
      expect(areNative).toBe(true);
    });
  });

  describe('Proxy Detection Prevention', () => {
    it('should allow creating proxies', async () => {
      const canCreateProxy = await page.evaluate(() => {
        try {
          const obj = { test: 'value' };
          const proxy = new Proxy(obj, {
            get: (target, prop) => Reflect.get(target, prop),
          });
          return proxy.test === 'value';
        } catch (e) {
          return false;
        }
      });
      expect(canCreateProxy).toBe(true);
    });
  });

  describe('Window.external Consistency', () => {
    it('should not have wdsl property', async () => {
      const hasWdsl = await page.evaluate(() => {
        return window.external && 'wdsl' in window.external;
      });
      expect(hasWdsl).toBe(false);
    });
  });

  describe('Symbol.toStringTag Protection', () => {
    it('should not reveal automation in toString', async () => {
      const toString = await page.evaluate(() => {
        const obj = { [Symbol.toStringTag]: 'Puppeteer' };
        return Object.prototype.toString.call(obj);
      });
      expect(toString).toBe('[object Object]');
    });
  });

  describe('Module Name', () => {
    it('should return correct module name', () => {
      expect(protection.getName()).toBe('AutomationDetectionProtection');
    });
  });

  describe('Integration Tests', () => {
    it('should pass basic bot detection tests', async () => {
      const detectionResults = await page.evaluate(() => {
        const checks = {
          hasWebdriver: 'webdriver' in navigator && (navigator as any).webdriver === true,
          hasPuppeteerVars: '__puppeteer_evaluation_script__' in window,
          hasPlaywrightVars: '__playwright__' in window,
          hasSeleniumVars: '__selenium_evaluate__' in window,
          hasCdcProps: Object.keys(document).some(key => key.startsWith('$cdc_')),
        };

        return checks;
      });

      expect(detectionResults.hasWebdriver).toBe(false);
      expect(detectionResults.hasPuppeteerVars).toBe(false);
      expect(detectionResults.hasPlaywrightVars).toBe(false);
      expect(detectionResults.hasSeleniumVars).toBe(false);
      expect(detectionResults.hasCdcProps).toBe(false);
    });
  });
});
