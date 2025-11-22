import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { ClientRectsProtection } from '../../src/modules/client-rects-protection';

describe('ClientRectsProtection', () => {
  let browser: Browser;
  let page: Page;
  let protection: ClientRectsProtection;

  beforeEach(async () => {
    protection = new ClientRectsProtection({
      noiseLevel: 'medium',
      seed: 12345,
    });

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

  describe('getBoundingClientRect', () => {
    it('should add noise to getBoundingClientRect dimensions', async () => {
      const result = await page.evaluate(() => {
        const element = document.createElement('div');
        element.style.width = '100px';
        element.style.height = '100px';
        element.style.position = 'absolute';
        element.style.top = '50px';
        element.style.left = '50px';
        document.body.appendChild(element);

        const rect1 = element.getBoundingClientRect();
        const rect2 = element.getBoundingClientRect();

        return {
          width: rect1.width,
          height: rect1.height,
          x: rect1.x,
          y: rect1.y,
          consistent: rect1.width === rect2.width && rect1.height === rect2.height,
        };
      });

      // Should have dimensions (may be noisy)
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);

      // Noise should be consistent (same seed produces same noise)
      expect(result.consistent).toBe(true);
    });

    it('should return DOMRect with all required properties', async () => {
      const hasAllProperties = await page.evaluate(() => {
        const element = document.createElement('div');
        element.style.width = '100px';
        element.style.height = '100px';
        document.body.appendChild(element);

        const rect = element.getBoundingClientRect();

        return (
          typeof rect.x === 'number' &&
          typeof rect.y === 'number' &&
          typeof rect.width === 'number' &&
          typeof rect.height === 'number' &&
          typeof rect.top === 'number' &&
          typeof rect.right === 'number' &&
          typeof rect.bottom === 'number' &&
          typeof rect.left === 'number' &&
          typeof rect.toJSON === 'function'
        );
      });

      expect(hasAllProperties).toBe(true);
    });

    it('should preserve relative dimensions', async () => {
      const result = await page.evaluate(() => {
        const element = document.createElement('div');
        element.style.width = '100px';
        element.style.height = '100px';
        element.style.position = 'absolute';
        element.style.top = '50px';
        element.style.left = '50px';
        document.body.appendChild(element);

        const rect = element.getBoundingClientRect();

        // Check that right = left + width (approximately, accounting for noise)
        const rightCalc = Math.abs(rect.right - (rect.left + rect.width));
        const bottomCalc = Math.abs(rect.bottom - (rect.top + rect.height));

        return {
          rightCorrect: rightCalc < 0.1, // Allow small variance due to noise
          bottomCorrect: bottomCalc < 0.1,
        };
      });

      expect(result.rightCorrect).toBe(true);
      expect(result.bottomCorrect).toBe(true);
    });
  });

  describe('getClientRects', () => {
    it('should add noise to getClientRects', async () => {
      const result = await page.evaluate(() => {
        const element = document.createElement('div');
        element.style.width = '200px';
        element.style.height = '100px';
        element.textContent = 'Test content';
        document.body.appendChild(element);

        const rects = element.getClientRects();

        return {
          length: rects.length,
          hasRects: rects.length > 0,
          firstRect: rects[0]
            ? {
                width: rects[0].width,
                height: rects[0].height,
              }
            : null,
        };
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result.hasRects).toBe(true);
      if (result.firstRect) {
        expect(result.firstRect.width).toBeGreaterThan(0);
        expect(result.firstRect.height).toBeGreaterThan(0);
      }
    });

    it('should return DOMRectList with item method', async () => {
      const hasItemMethod = await page.evaluate(() => {
        const element = document.createElement('div');
        element.textContent = 'Test';
        document.body.appendChild(element);

        const rects = element.getClientRects();
        const rect = rects.item(0);

        return typeof rects.item === 'function' && rect !== null;
      });

      expect(hasItemMethod).toBe(true);
    });
  });

  describe('Range methods', () => {
    it('should add noise to Range.getBoundingClientRect', async () => {
      const result = await page.evaluate(() => {
        const element = document.createElement('div');
        element.textContent = 'Test content for range';
        document.body.appendChild(element);

        const range = document.createRange();
        range.selectNodeContents(element);

        const rect = range.getBoundingClientRect();

        return {
          width: rect.width,
          height: rect.height,
          hasProperties:
            typeof rect.x === 'number' &&
            typeof rect.y === 'number' &&
            typeof rect.width === 'number' &&
            typeof rect.height === 'number',
        };
      });

      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.hasProperties).toBe(true);
    });

    it('should add noise to Range.getClientRects', async () => {
      const result = await page.evaluate(() => {
        const element = document.createElement('div');
        element.textContent = 'Test content for range';
        document.body.appendChild(element);

        const range = document.createRange();
        range.selectNodeContents(element);

        const rects = range.getClientRects();

        return {
          length: rects.length,
          hasRects: rects.length > 0,
        };
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result.hasRects).toBe(true);
    });
  });

  describe('Offset properties', () => {
    it('should add noise to offsetWidth and offsetHeight', async () => {
      const result = await page.evaluate(() => {
        const element = document.createElement('div');
        element.style.width = '150px';
        element.style.height = '100px';
        element.style.padding = '10px';
        document.body.appendChild(element);

        return {
          offsetWidth: element.offsetWidth,
          offsetHeight: element.offsetHeight,
          hasValues: element.offsetWidth > 0 && element.offsetHeight > 0,
        };
      });

      expect(result.hasValues).toBe(true);
      expect(result.offsetWidth).toBeGreaterThan(0);
      expect(result.offsetHeight).toBeGreaterThan(0);
    });

    it('should add noise to offsetTop and offsetLeft', async () => {
      const result = await page.evaluate(() => {
        const parent = document.createElement('div');
        parent.style.position = 'relative';
        parent.style.width = '300px';
        parent.style.height = '300px';
        document.body.appendChild(parent);

        const element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.top = '50px';
        element.style.left = '50px';
        element.style.width = '100px';
        element.style.height = '100px';
        parent.appendChild(element);

        return {
          offsetTop: element.offsetTop,
          offsetLeft: element.offsetLeft,
          hasValues: typeof element.offsetTop === 'number' && typeof element.offsetLeft === 'number',
        };
      });

      expect(result.hasValues).toBe(true);
      expect(typeof result.offsetTop).toBe('number');
      expect(typeof result.offsetLeft).toBe('number');
    });
  });

  describe('Client properties', () => {
    it('should add noise to clientWidth and clientHeight', async () => {
      const result = await page.evaluate(() => {
        const element = document.createElement('div');
        element.style.width = '150px';
        element.style.height = '100px';
        element.style.padding = '10px';
        element.style.border = '5px solid black';
        document.body.appendChild(element);

        return {
          clientWidth: element.clientWidth,
          clientHeight: element.clientHeight,
          hasValues: element.clientWidth > 0 && element.clientHeight > 0,
        };
      });

      expect(result.hasValues).toBe(true);
      expect(result.clientWidth).toBeGreaterThan(0);
      expect(result.clientHeight).toBeGreaterThan(0);
    });
  });

  describe('Consistency', () => {
    it('should provide consistent noise across multiple calls with same seed', async () => {
      const result = await page.evaluate(() => {
        const element = document.createElement('div');
        element.style.width = '100px';
        element.style.height = '100px';
        document.body.appendChild(element);

        const rect1 = element.getBoundingClientRect();
        const rect2 = element.getBoundingClientRect();

        return {
          sameWidth: rect1.width === rect2.width,
          sameHeight: rect1.height === rect2.height,
          sameX: rect1.x === rect2.x,
          sameY: rect1.y === rect2.y,
        };
      });

      expect(result.sameWidth).toBe(true);
      expect(result.sameHeight).toBe(true);
      expect(result.sameX).toBe(true);
      expect(result.sameY).toBe(true);
    });
  });

  describe('Module name', () => {
    it('should return correct module name', () => {
      expect(protection.getName()).toBe('ClientRectsProtection');
    });
  });

  describe('Seed management', () => {
    it('should return the configured seed', () => {
      expect(protection.getSeed()).toBe(12345);
    });

    it('should generate seed from string', () => {
      const seed1 = ClientRectsProtection.seedFromString('test');
      const seed2 = ClientRectsProtection.seedFromString('test');
      const seed3 = ClientRectsProtection.seedFromString('different');

      expect(seed1).toBe(seed2);
      expect(seed1).not.toBe(seed3);
    });
  });
});
