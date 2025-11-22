/**
 * Detection Tests: bot.sannysoft.com
 *
 * Comprehensive bot detection test suite.
 * Tests 23 different detection vectors.
 *
 * Site: https://bot.sannysoft.com/
 * Expected: All 23 tests should pass (green)
 */

import { describe, it, expect, before, after } from '../framework/test-runner';
import puppeteer, { Browser, Page } from 'puppeteer';
import { StealthEngine } from '../../src/core/stealth-engine';

describe('bot.sannysoft.com Detection Tests', () => {
  let browser: Browser;
  let page: Page;

  before(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    page = await browser.newPage();

    // Apply stealth protections
    const stealth = new StealthEngine({
      level: 'paranoid',
    });

    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);
    await stealth.applyProtections(page, userAgent);
  });

  after(async () => {
    if (page && !page.isClosed()) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  });

  it('should navigate to bot.sannysoft.com', async () => {
    await page.goto('https://bot.sannysoft.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const title = await page.title();
    expect(title).toContain('bot');
  });

  it('navigator.webdriver should be undefined', async () => {
    const webdriver = await page.evaluate(() => (window.navigator as any).webdriver);
    expect(webdriver).toBeUndefined();
  });

  it('navigator.plugins should not be empty', async () => {
    const pluginsLength = await page.evaluate(() => navigator.plugins.length);
    expect(pluginsLength).toBeGreaterThan(0);
  });

  it('navigator.languages should be realistic', async () => {
    const languages = await page.evaluate(() => navigator.languages);
    expect(languages).toBeDefined();
    expect(Array.isArray(languages)).toBe(true);
    expect(languages.length).toBeGreaterThan(0);
  });

  it('chrome object should not indicate automation', async () => {
    const hasLoadTimes = await page.evaluate(() => {
      return 'chrome' in window && 'loadTimes' in (window as any).chrome;
    });
    // chrome.loadTimes is deprecated and removed in modern Chrome
    expect(hasLoadTimes).toBe(false);
  });

  it('permissions API should be consistent', async () => {
    const hasPermissions = await page.evaluate(() => 'permissions' in navigator);
    expect(hasPermissions).toBe(true);
  });

  it('navigator.platform should match user agent', async () => {
    const platform = await page.evaluate(() => navigator.platform);
    // For Windows user agent, platform should be Win32
    expect(platform).toBe('Win32');
  });

  it('screen properties should be realistic', async () => {
    const screen = await page.evaluate(() => ({
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
    }));

    expect(screen.width).toBeGreaterThan(0);
    expect(screen.height).toBeGreaterThan(0);
    expect(screen.colorDepth).toBeInRange(24, 32);
  });

  it('window.outerWidth/innerWidth difference should be realistic', async () => {
    const dimensions = await page.evaluate(() => ({
      outerWidth: window.outerWidth,
      innerWidth: window.innerWidth,
      outerHeight: window.outerHeight,
      innerHeight: window.innerHeight,
    }));

    // Difference should be reasonable (for borders, scrollbars, etc.)
    const widthDiff = dimensions.outerWidth - dimensions.innerWidth;
    const heightDiff = dimensions.outerHeight - dimensions.innerHeight;

    // Should have some difference (not exactly the same)
    expect(widthDiff).toBeInRange(0, 50);
    expect(heightDiff).toBeInRange(0, 200);
  });

  it('connection.rtt should be realistic', async () => {
    const connection = await page.evaluate(() => {
      const nav = navigator as any;
      return nav.connection ? nav.connection.rtt : null;
    });

    if (connection !== null) {
      // RTT should be reasonable (not 0, not too high)
      expect(connection).toBeInRange(1, 500);
    }
  });

  it('User-Agent header should match navigator.userAgent', async () => {
    const [navigatorUA, headerUA] = await Promise.all([
      page.evaluate(() => navigator.userAgent),
      page.evaluate(async () => {
        const response = await fetch('https://httpbin.org/headers');
        const data = await response.json();
        return data.headers['User-Agent'];
      }),
    ]);

    expect(headerUA).toBe(navigatorUA);
  });

  it('battery API should be available or unavailable consistently', async () => {
    const hasBattery = await page.evaluate(() => 'getBattery' in navigator);
    // Battery API should exist on desktop Chrome
    expect(hasBattery).toBe(true);
  });

  it('mediaDevices should be available', async () => {
    const hasMediaDevices = await page.evaluate(
      () => 'mediaDevices' in navigator
    );
    expect(hasMediaDevices).toBe(true);
  });

  it('WebGL should be available', async () => {
    const hasWebGL = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    });

    expect(hasWebGL).toBe(true);
  });

  it('WebGL vendor should not be Google SwiftShader', async () => {
    const vendor = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (!gl) return '';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return '';

      return gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    });

    // Should not contain "SwiftShader" (indicates automation)
    expect(vendor.toLowerCase()).not.toContain('swiftshader');
    expect(vendor.toLowerCase()).not.toContain('google');
  });

  it('notification permissions should be prompt or denied', async () => {
    const permission = await page.evaluate(async () => {
      return await (navigator as any).permissions.query({ name: 'notifications' });
    });

    // Should be 'prompt' or 'denied', not 'granted' (suspicious)
    expect(['prompt', 'denied']).toContain(permission.state);
  });

  it('Date.prototype.getTimezoneOffset should return realistic value', async () => {
    const offset = await page.evaluate(() => new Date().getTimezoneOffset());

    // Should be a realistic timezone offset (-720 to 840 minutes)
    expect(offset).toBeInRange(-720, 840);
  });

  it('Intl.DateTimeFormat should return realistic timezone', async () => {
    const timezone = await page.evaluate(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    expect(timezone).toBeDefined();
    expect(typeof timezone).toBe('string');
    expect(timezone.length).toBeGreaterThan(0);
  });

  it('canvas fingerprint should be unique', async () => {
    const canvasFingerprint = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Test', 2, 2);

      return canvas.toDataURL();
    });

    expect(canvasFingerprint).toBeDefined();
    expect(canvasFingerprint.length).toBeGreaterThan(1000);
    // Should not be a common "blocked" fingerprint
    expect(canvasFingerprint).not.toContain('data:,');
  });

  it('AudioContext should be available', async () => {
    const hasAudioContext = await page.evaluate(() => {
      return 'AudioContext' in window || 'webkitAudioContext' in window;
    });

    expect(hasAudioContext).toBe(true);
  });

  it('performance.now() should have realistic precision', async () => {
    const timings = await page.evaluate(() => {
      const samples = [];
      for (let i = 0; i < 10; i++) {
        samples.push(performance.now());
      }
      return samples;
    });

    // Check that times are increasing
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i]).toBeGreaterThan(timings[i - 1]);
    }

    // Check that precision is realistic (not too precise, not rounded)
    const hasFractional = timings.some((t) => t % 1 !== 0);
    expect(hasFractional).toBe(true);
  });

  it('should pass comprehensive detection', async () => {
    // Wait for page to fully analyze
    await page.waitForTimeout(2000);

    // Check if there are any red (failed) indicators
    const failedTests = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      return rows.filter((row) => {
        const bgColor = window.getComputedStyle(row).backgroundColor;
        // Red background indicates failed test
        return bgColor.includes('255, 0, 0') || bgColor.includes('red');
      }).length;
    });

    // Should have 0 failed tests (all green)
    expect(failedTests).toBe(0);
  });
});
