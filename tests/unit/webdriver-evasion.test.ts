import { WebDriverEvasionModule } from '../../src/modules/webdriver-evasion';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('WebDriverEvasionModule', () => {
  let browser: Browser;
  let page: Page;
  let evasion: WebDriverEvasionModule;

  beforeAll(async () => {
    evasion = new WebDriverEvasionModule();
    browser = await puppeteer.launch({ headless: true });
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

  it('should remove navigator.webdriver', async () => {
    await evasion.inject(page);

    const webdriver = await page.evaluate(() => {
      return navigator.webdriver;
    });

    expect(webdriver).toBeUndefined();
  });

  it('should add chrome runtime', async () => {
    await evasion.inject(page);

    const chromeRuntime = await page.evaluate(() => {
      return !!(window as any).chrome && !!(window as any).chrome.runtime;
    });

    expect(chromeRuntime).toBe(true);
  });

  it('should have realistic plugins', async () => {
    await evasion.inject(page);

    const pluginsCount = await page.evaluate(() => {
      return navigator.plugins.length;
    });

    expect(pluginsCount).toBeGreaterThan(0);
  });

  it('should have languages array', async () => {
    await evasion.inject(page);

    const languages = await page.evaluate(() => {
      return navigator.languages;
    });

    expect(Array.isArray(languages)).toBe(true);
    expect(languages.length).toBeGreaterThan(0);
  });

  it('should remove CDP variables', async () => {
    await evasion.inject(page);

    const cdcVars = await page.evaluate(() => {
      const keys = Object.keys(window);
      return keys.filter((key) => /^cdc_/.test(key));
    });

    expect(cdcVars.length).toBe(0);
  });
});
