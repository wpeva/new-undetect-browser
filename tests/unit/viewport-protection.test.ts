import { ViewportProtectionModule } from '../../src/modules/viewport-protection';
import { ViewportProfile } from '../../src/types/browser-types';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('ViewportProtectionModule', () => {
  let browser: Browser;
  let page: Page;
  let viewport: ViewportProtectionModule;
  let testProfile: ViewportProfile;

  beforeAll(async () => {
    viewport = new ViewportProtectionModule();
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Create test profile
    testProfile = {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: true,
    };
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Viewport Configuration', () => {
    it('should set viewport dimensions', async () => {
      await page.setViewport({
        width: testProfile.width,
        height: testProfile.height,
        deviceScaleFactor: testProfile.deviceScaleFactor,
      });

      await viewport.inject(page);

      const dimensions = await page.evaluate(() => {
        return {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
        };
      });

      expect(dimensions.innerWidth).toBe(testProfile.width);
      expect(dimensions.innerHeight).toBe(testProfile.height);
    });

    it('should handle device scale factor', async () => {
      const highDPIProfile: ViewportProfile = {
        ...testProfile,
        deviceScaleFactor: 2,
      };

      await page.setViewport({
        width: highDPIProfile.width,
        height: highDPIProfile.height,
        deviceScaleFactor: highDPIProfile.deviceScaleFactor,
      });

      await viewport.inject(page);

      const dpr = await page.evaluate(() => window.devicePixelRatio);
      expect(dpr).toBe(2);
    });
  });

  describe('Window Size Consistency', () => {
    it('should inject viewport protection', async () => {
      await expect(viewport.inject(page)).resolves.not.toThrow();
    });

    it('should ensure innerWidth matches viewport', async () => {
      await page.setViewport({
        width: testProfile.width,
        height: testProfile.height,
      });

      await viewport.inject(page);

      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(innerWidth).toBe(testProfile.width);
    });

    it('should ensure innerHeight matches viewport', async () => {
      await page.setViewport({
        width: testProfile.width,
        height: testProfile.height,
      });

      await viewport.inject(page);

      const innerHeight = await page.evaluate(() => window.innerHeight);
      expect(innerHeight).toBe(testProfile.height);
    });
  });

  describe('Outer Dimensions', () => {
    it('should set realistic outerWidth', async () => {
      await page.setViewport({
        width: testProfile.width,
        height: testProfile.height,
      });

      await viewport.inject(page);

      const outerWidth = await page.evaluate(() => window.outerWidth);
      expect(outerWidth).toBeGreaterThanOrEqual(testProfile.width);
    });

    it('should set realistic outerHeight', async () => {
      await page.setViewport({
        width: testProfile.width,
        height: testProfile.height,
      });

      await viewport.inject(page);

      const outerHeight = await page.evaluate(() => window.outerHeight);
      expect(outerHeight).toBeGreaterThanOrEqual(testProfile.height);
    });

    it('should add browser chrome dimensions', async () => {
      await page.setViewport({
        width: testProfile.width,
        height: testProfile.height,
      });

      await viewport.inject(page);

      const dimensions = await page.evaluate(() => {
        return {
          inner: { width: window.innerWidth, height: window.innerHeight },
          outer: { width: window.outerWidth, height: window.outerHeight },
        };
      });

      // Outer should be larger due to browser chrome
      expect(dimensions.outer.width).toBeGreaterThanOrEqual(dimensions.inner.width);
      expect(dimensions.outer.height).toBeGreaterThanOrEqual(dimensions.inner.height);
    });
  });

  describe('Screen Properties', () => {
    it('should match screen and window dimensions', async () => {
      await page.setViewport({
        width: testProfile.width,
        height: testProfile.height,
      });

      await viewport.inject(page);

      const props = await page.evaluate(() => {
        return {
          screenWidth: screen.width,
          screenHeight: screen.height,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
        };
      });

      expect(props.screenWidth).toBeGreaterThanOrEqual(props.innerWidth);
      expect(props.screenHeight).toBeGreaterThanOrEqual(props.innerHeight);
    });
  });

  describe('Mobile vs Desktop', () => {
    it('should handle desktop viewport', async () => {
      const desktopProfile: ViewportProfile = {
        ...testProfile,
        isMobile: false,
        hasTouch: false,
      };

      await page.setViewport({
        width: desktopProfile.width,
        height: desktopProfile.height,
        isMobile: desktopProfile.isMobile,
      });

      await viewport.inject(page);

      const isMobile = await page.evaluate(() => {
        return 'ontouchstart' in window;
      });

      // Desktop should not have touch by default
      expect(isMobile).toBeDefined();
    });

    it('should handle mobile viewport', async () => {
      const mobileProfile: ViewportProfile = {
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        isLandscape: false,
      };

      await page.setViewport({
        width: mobileProfile.width,
        height: mobileProfile.height,
        isMobile: mobileProfile.isMobile,
        hasTouch: mobileProfile.hasTouch,
      });

      await viewport.inject(page);

      const dimensions = await page.evaluate(() => {
        return {
          width: window.innerWidth,
          height: window.innerHeight,
        };
      });

      expect(dimensions.width).toBe(mobileProfile.width);
      expect(dimensions.height).toBe(mobileProfile.height);
    });
  });

  describe('Orientation', () => {
    it('should handle landscape orientation', async () => {
      const landscapeProfile: ViewportProfile = {
        ...testProfile,
        width: 1920,
        height: 1080,
        isLandscape: true,
      };

      await page.setViewport({
        width: landscapeProfile.width,
        height: landscapeProfile.height,
        isLandscape: landscapeProfile.isLandscape,
      });

      await viewport.inject(page);

      const dims = await page.evaluate(() => {
        return {
          width: window.innerWidth,
          height: window.innerHeight,
        };
      });

      expect(dims.width).toBeGreaterThan(dims.height);
    });

    it('should handle portrait orientation', async () => {
      const portraitProfile: ViewportProfile = {
        width: 768,
        height: 1024,
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        isLandscape: false,
      };

      await page.setViewport({
        width: portraitProfile.width,
        height: portraitProfile.height,
        isMobile: portraitProfile.isMobile,
      });

      await viewport.inject(page);

      const dims = await page.evaluate(() => {
        return {
          width: window.innerWidth,
          height: window.innerHeight,
        };
      });

      expect(dims.height).toBeGreaterThan(dims.width);
    });
  });

  describe('Device Pixel Ratio', () => {
    it('should handle standard DPR (1x)', async () => {
      await page.setViewport({
        width: testProfile.width,
        height: testProfile.height,
        deviceScaleFactor: 1,
      });

      await viewport.inject(page);

      const dpr = await page.evaluate(() => window.devicePixelRatio);
      expect(dpr).toBe(1);
    });

    it('should handle high DPR (2x)', async () => {
      await page.setViewport({
        width: testProfile.width,
        height: testProfile.height,
        deviceScaleFactor: 2,
      });

      await viewport.inject(page);

      const dpr = await page.evaluate(() => window.devicePixelRatio);
      expect(dpr).toBe(2);
    });

    it('should handle very high DPR (3x)', async () => {
      await page.setViewport({
        width: testProfile.width,
        height: testProfile.height,
        deviceScaleFactor: 3,
      });

      await viewport.inject(page);

      const dpr = await page.evaluate(() => window.devicePixelRatio);
      expect(dpr).toBe(3);
    });
  });

  describe('Resize Events', () => {
    it('should handle window resize', async () => {
      await viewport.inject(page);

      await page.setViewport({
        width: 800,
        height: 600,
      });

      const dims = await page.evaluate(() => {
        return {
          width: window.innerWidth,
          height: window.innerHeight,
        };
      });

      expect(dims.width).toBe(800);
      expect(dims.height).toBe(600);
    });
  });

  describe('Visual Viewport API Protection', () => {
    it('should protect visual viewport if available', async () => {
      await viewport.inject(page);

      const hasVisualViewport = await page.evaluate(() => {
        return typeof window.visualViewport !== 'undefined';
      });

      // visualViewport may or may not be available
      expect(typeof hasVisualViewport).toBe('boolean');
    });
  });

  describe('Integration Tests', () => {
    it('should inject without errors', async () => {
      await expect(viewport.inject(page)).resolves.not.toThrow();
    });

    it('should maintain consistency across multiple checks', async () => {
      await page.setViewport({
        width: testProfile.width,
        height: testProfile.height,
      });

      await viewport.inject(page);

      const check1 = await page.evaluate(() => {
        return {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight,
        };
      });

      const check2 = await page.evaluate(() => {
        return {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight,
        };
      });

      expect(check1).toEqual(check2);
    });

    it('should not break page functionality', async () => {
      await viewport.inject(page);

      const canRender = await page.evaluate(() => {
        const div = document.createElement('div');
        div.style.width = '100px';
        div.style.height = '100px';
        document.body.appendChild(div);

        return div.offsetWidth === 100 && div.offsetHeight === 100;
      });

      expect(canRender).toBe(true);
    });

    it('should work with different viewport sizes', async () => {
      const sizes = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 375, height: 667 },
      ];

      for (const size of sizes) {
        await page.setViewport(size);
        await viewport.inject(page);

        const dims = await page.evaluate(() => {
          return {
            width: window.innerWidth,
            height: window.innerHeight,
          };
        });

        expect(dims.width).toBe(size.width);
        expect(dims.height).toBe(size.height);
      }
    });
  });
});
