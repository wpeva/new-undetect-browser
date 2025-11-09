import { BehavioralSimulationModule } from '../../src/modules/behavioral-simulation';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('BehavioralSimulationModule', () => {
  let browser: Browser;
  let page: Page;
  let behavioral: BehavioralSimulationModule;

  beforeAll(async () => {
    behavioral = new BehavioralSimulationModule();
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

  it('should inject behavioral helpers into page', async () => {
    await behavioral.injectHelpers(page);

    const hasHelpers = await page.evaluate(() => {
      return typeof (window as any).lastMouseX === 'number' &&
             typeof (window as any).lastMouseY === 'number';
    });

    expect(hasHelpers).toBe(true);
  });

  it('should perform human-like mouse movement', async () => {
    await behavioral.injectHelpers(page);
    await behavioral.humanMouseMove(page, 100, 100);

    const position = await page.evaluate(() => ({
      x: (window as any).lastMouseX,
      y: (window as any).lastMouseY,
    }));

    // Position should be close to target (within jitter range)
    expect(position.x).toBeGreaterThan(95);
    expect(position.x).toBeLessThan(105);
    expect(position.y).toBeGreaterThan(95);
    expect(position.y).toBeLessThan(105);
  });

  it('should have realistic timing', async () => {
    const startTime = Date.now();

    await behavioral.humanDelay(100, 200);

    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeGreaterThanOrEqual(100);
    expect(elapsed).toBeLessThan(300); // Some buffer
  });

  it('should get module name', () => {
    expect(behavioral.getName()).toBe('BehavioralSimulation');
  });
});
