import { UndetectBrowser } from '../../src/index';

describe('Bot.Sannysoft.com Detection Tests', () => {
  let undetect: UndetectBrowser;

  beforeAll(() => {
    undetect = new UndetectBrowser({
      stealth: { level: 'advanced' },
    });
  });

  it('should pass WebDriver detection', async () => {
    const browser = await undetect.launch({ headless: false });
    const page = await browser.newPage();

    try {
      await page.goto('https://bot.sannysoft.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for the page to fully load
      await page.waitForTimeout(2000);

      // Check for WebDriver property
      const webdriverResult = await page.evaluate(() => {
        const element = document.querySelector('#webdriver');
        return element?.textContent?.trim();
      });

      console.log('WebDriver detection result:', webdriverResult);
      expect(webdriverResult).not.toContain('present');

      // Check for Chrome property
      const chromeResult = await page.evaluate(() => {
        const element = document.querySelector('#chrome');
        return element?.textContent?.trim();
      });

      console.log('Chrome detection result:', chromeResult);
      expect(chromeResult).toContain('present');

      // Check for Permissions
      const permissionsResult = await page.evaluate(() => {
        const element = document.querySelector('#permissions');
        return element?.textContent?.trim();
      });

      console.log('Permissions detection result:', permissionsResult);

      // Take screenshot for manual inspection
      await page.screenshot({ path: 'tests/detection/screenshots/sannysoft.png', fullPage: true });

      console.log('✅ Bot.Sannysoft.com test completed');
    } finally {
      await browser.close();
    }
  }, 60000);

  it('should have consistent navigator properties', async () => {
    const browser = await undetect.launch({ headless: false });
    const page = await browser.newPage();

    try {
      await page.goto('https://bot.sannysoft.com/');
      await page.waitForTimeout(2000);

      const properties = await page.evaluate(() => {
        return {
          webdriver: navigator.webdriver,
          plugins: navigator.plugins.length,
          languages: navigator.languages,
          platform: navigator.platform,
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: (navigator as any).deviceMemory,
        };
      });

      console.log('Navigator properties:', properties);

      expect(properties.webdriver).toBeUndefined();
      expect(properties.plugins).toBeGreaterThan(0);
      expect(properties.languages).toContain('en-US');
      expect(properties.hardwareConcurrency).toBeGreaterThan(0);

      console.log('✅ Navigator properties test passed');
    } finally {
      await browser.close();
    }
  }, 60000);
});
