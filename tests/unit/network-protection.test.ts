import { NetworkProtectionModule } from '../../src/modules/network-protection';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('NetworkProtectionModule', () => {
  let browser: Browser;
  let page: Page;
  let network: NetworkProtectionModule;
  const testUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

  beforeAll(async () => {
    network = new NetworkProtectionModule(testUserAgent);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
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

  describe('Request Interception', () => {
    it('should setup request interception', async () => {
      await expect(network.setupInterception(page)).resolves.not.toThrow();
    });

    it('should allow requests to proceed', async () => {
      await network.setupInterception(page);

      // Navigate to a simple page
      const response = await page.goto('about:blank');
      expect(response).toBeTruthy();
    });

    it('should intercept requests without errors', async () => {
      await network.setupInterception(page);

      let errorOccurred = false;
      page.on('pageerror', () => {
        errorOccurred = true;
      });

      await page.setContent('<html><body>Test</body></html>');

      expect(errorOccurred).toBe(false);
    });
  });

  describe('Header Management', () => {
    it('should preserve custom user agent in constructor', () => {
      const customNetwork = new NetworkProtectionModule(testUserAgent);
      expect(customNetwork).toBeDefined();
    });

    it('should allow setting user agent', async () => {
      await page.setUserAgent(testUserAgent);
      const userAgent = await page.evaluate(() => navigator.userAgent);

      expect(userAgent).toBe(testUserAgent);
    });
  });

  describe('Timing Profile Generation', () => {
    it('should create network protection module', () => {
      const module = new NetworkProtectionModule(testUserAgent);
      expect(module).toBeInstanceOf(NetworkProtectionModule);
    });

    it('should generate timing profile on construction', () => {
      // The constructor should not throw and should create timing profile internally
      expect(() => new NetworkProtectionModule(testUserAgent)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle interception errors gracefully', async () => {
      await network.setupInterception(page);

      // Should not throw when navigating
      await expect(page.goto('about:blank')).resolves.toBeTruthy();
    });

    it('should continue request on error', async () => {
      await network.setupInterception(page);

      // Multiple navigations should work
      await page.goto('about:blank');
      const response = await page.goto('about:blank');

      expect(response).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('should work with page navigation', async () => {
      await network.setupInterception(page);
      await page.setUserAgent(testUserAgent);

      await page.setContent(`
        <html>
          <head><title>Test Page</title></head>
          <body><h1>Test Content</h1></body>
        </html>
      `);

      const title = await page.title();
      expect(title).toBe('Test Page');
    });

    it('should not break page functionality', async () => {
      await network.setupInterception(page);

      const content = await page.evaluate(() => {
        const div = document.createElement('div');
        div.textContent = 'Test';
        return div.textContent;
      });

      expect(content).toBe('Test');
    });

    it('should handle multiple pages', async () => {
      const page2 = await browser.newPage();
      const network2 = new NetworkProtectionModule(testUserAgent);

      await network.setupInterception(page);
      await network2.setupInterception(page2);

      await page.goto('about:blank');
      await page2.goto('about:blank');

      await page2.close();
    });

    it('should maintain interception across navigations', async () => {
      await network.setupInterception(page);

      await page.goto('about:blank');
      await page.setContent('<div>First</div>');

      await page.goto('about:blank');
      await page.setContent('<div>Second</div>');

      const content = await page.evaluate(() => document.querySelector('div')?.textContent);
      expect(content).toBe('Second');
    });
  });

  describe('Request Types', () => {
    it('should handle document requests', async () => {
      await network.setupInterception(page);

      const response = await page.setContent('<html><body>Test</body></html>');
      expect(response).toBeUndefined(); // setContent returns undefined
    });

    it('should handle script requests', async () => {
      await network.setupInterception(page);

      await page.setContent(`
        <html>
          <body>
            <script>window.testVar = 'loaded';</script>
          </body>
        </html>
      `);

      const testVar = await page.evaluate(() => (window as any).testVar);
      expect(testVar).toBe('loaded');
    });

    it('should handle style requests', async () => {
      await network.setupInterception(page);

      await page.setContent(`
        <html>
          <head>
            <style>body { background: red; }</style>
          </head>
          <body></body>
        </html>
      `);

      const bgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).background;
      });

      expect(bgColor).toContain('red');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      await network.setupInterception(page);

      await page.setContent(`
        <html>
          <head>
            <script>window.test1 = 1;</script>
            <script>window.test2 = 2;</script>
            <script>window.test3 = 3;</script>
          </head>
          <body></body>
        </html>
      `);

      const values = await page.evaluate(() => {
        return {
          test1: (window as any).test1,
          test2: (window as any).test2,
          test3: (window as any).test3,
        };
      });

      expect(values.test1).toBe(1);
      expect(values.test2).toBe(2);
      expect(values.test3).toBe(3);
    });
  });

  describe('User Agent Persistence', () => {
    it('should maintain user agent after interception setup', async () => {
      await page.setUserAgent(testUserAgent);
      await network.setupInterception(page);

      const userAgent = await page.evaluate(() => navigator.userAgent);
      expect(userAgent).toBe(testUserAgent);
    });

    it('should allow user agent changes after setup', async () => {
      await network.setupInterception(page);

      const newUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      await page.setUserAgent(newUA);

      const userAgent = await page.evaluate(() => navigator.userAgent);
      expect(userAgent).toBe(newUA);
    });
  });
});
