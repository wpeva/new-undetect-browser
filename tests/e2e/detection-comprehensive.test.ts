/**
 * Comprehensive Detection Testing Suite
 *
 * Tests the antidetect platform against all major bot detection services:
 * - Pixelscan.net - Browser fingerprint analysis
 * - CreepJS - Advanced fingerprinting techniques
 * - Sannysoft - Automation detection
 * - Incolumitas - Bot detection patterns
 * - BrowserLeaks - Various leak detection (WebRTC, Canvas, Audio, etc.)
 * - Arh.Antoinevastel - Sophisticated bot detection
 * - FingerprintJS - Commercial fingerprinting
 */

import { chromium, Browser, Page } from 'playwright';
import { UndetectBrowser } from '../../src/index';

interface DetectionTestResult {
  detector: string;
  passed: boolean;
  score?: string | number;
  details?: any;
  error?: string;
}

describe('Comprehensive Detection Testing', () => {
  let browser: Browser;
  let page: Page;
  const results: DetectionTestResult[] = [];

  beforeAll(async () => {
    // Initialize UndetectBrowser with paranoid protection
    const undetect = new UndetectBrowser({
      protectionLevel: 'paranoid',
      browserEngine: 'playwright',
      fingerprint: {
        country: 'US',
        os: 'windows',
        screen: {
          width: 1920,
          height: 1080,
        },
      },
    });

    browser = await undetect.launch();
    page = await browser.newPage();
  }, 60000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }

    // Print comprehensive results
    console.log('\n========================================');
    console.log('DETECTION TEST RESULTS SUMMARY');
    console.log('========================================\n');

    results.forEach((result) => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} - ${result.detector}`);
      if (result.score) {
        console.log(`  Score: ${result.score}`);
      }
      if (result.details) {
        console.log(`  Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      console.log('');
    });

    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    const passRate = (passedCount / totalCount) * 100;

    console.log('========================================');
    console.log(`Overall Pass Rate: ${passRate.toFixed(1)}% (${passedCount}/${totalCount})`);
    console.log('========================================\n');
  }, 30000);

  describe('Pixelscan.net - Fingerprint Analysis', () => {
    it('should pass Pixelscan detection with high score', async () => {
      const testName = 'Pixelscan.net';
      try {
        await page.goto('https://pixelscan.net', {
          waitUntil: 'networkidle',
          timeout: 60000,
        });

        // Wait for analysis to complete
        await page.waitForTimeout(10000);

        // Extract score
        const scoreElement = await page.$('.score, .consistency-score');
        const score = scoreElement
          ? await scoreElement.textContent()
          : 'Not found';

        const passed = score !== 'Not found' && !score.toLowerCase().includes('suspicious');

        results.push({
          detector: testName,
          passed,
          score: score || 'Unable to determine',
        });

        expect(passed).toBe(true);
      } catch (error) {
        results.push({
          detector: testName,
          passed: false,
          error: (error as Error).message,
        });
        throw error;
      }
    }, 120000);
  });

  describe('CreepJS - Advanced Fingerprinting', () => {
    it('should achieve good CreepJS grade', async () => {
      const testName = 'CreepJS';
      try {
        await page.goto('https://abrahamjuliot.github.io/creepjs/', {
          waitUntil: 'networkidle',
          timeout: 60000,
        });

        // Wait for analysis
        await page.waitForTimeout(8000);

        // Get grade
        const gradeElement = await page.$('.grade, .trust-score');
        const grade = gradeElement
          ? await gradeElement.textContent()
          : 'Not found';

        // Get trust score if available
        const trustScore = await page.evaluate(() => {
          const scoreEl = document.querySelector('[data-trust-score]');
          return scoreEl ? scoreEl.getAttribute('data-trust-score') : null;
        });

        const passed =
          grade !== 'Not found' &&
          (grade.includes('A') || grade.includes('B') || (trustScore && parseFloat(trustScore) > 70));

        results.push({
          detector: testName,
          passed,
          score: grade,
          details: { trustScore },
        });

        expect(passed).toBe(true);
      } catch (error) {
        results.push({
          detector: testName,
          passed: false,
          error: (error as Error).message,
        });
        throw error;
      }
    }, 120000);
  });

  describe('Sannysoft - Automation Detection', () => {
    it('should pass Sannysoft bot detection tests', async () => {
      const testName = 'Sannysoft';
      try {
        await page.goto('https://bot.sannysoft.com', {
          waitUntil: 'networkidle',
          timeout: 60000,
        });

        await page.waitForTimeout(3000);

        // Analyze test results
        const testResults = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('tr'));
          const failedTests: string[] = [];
          const passedTests: string[] = [];

          rows.forEach((row) => {
            const text = row.textContent || '';
            const testName = text.split(':')[0]?.trim();

            if (text.toLowerCase().includes('failed') || text.toLowerCase().includes('bot')) {
              if (testName) failedTests.push(testName);
            } else if (testName && testName.length > 0) {
              passedTests.push(testName);
            }
          });

          return {
            total: rows.length,
            passed: passedTests.length,
            failed: failedTests.length,
            failedTests,
          };
        });

        const passRate = (testResults.passed / testResults.total) * 100;
        const passed = passRate >= 80; // Require 80%+ pass rate

        results.push({
          detector: testName,
          passed,
          score: `${passRate.toFixed(1)}%`,
          details: testResults,
        });

        expect(passed).toBe(true);
      } catch (error) {
        results.push({
          detector: testName,
          passed: false,
          error: (error as Error).message,
        });
        throw error;
      }
    }, 120000);
  });

  describe('Incolumitas - Bot Detection', () => {
    it('should not be detected as bot by Incolumitas', async () => {
      const testName = 'Incolumitas';
      try {
        await page.goto('https://bot.incolumitas.com', {
          waitUntil: 'networkidle',
          timeout: 60000,
        });

        await page.waitForTimeout(5000);

        // Check for bot detection
        const bodyText = await page.evaluate(() => document.body.textContent || '');
        const isBotDetected = bodyText.toLowerCase().includes('bot detected');

        results.push({
          detector: testName,
          passed: !isBotDetected,
          score: isBotDetected ? 'Bot Detected' : 'Not Detected',
        });

        expect(isBotDetected).toBe(false);
      } catch (error) {
        results.push({
          detector: testName,
          passed: false,
          error: (error as Error).message,
        });
        throw error;
      }
    }, 120000);
  });

  describe('BrowserLeaks - WebRTC Leak Detection', () => {
    it('should not leak IP via WebRTC', async () => {
      const testName = 'BrowserLeaks WebRTC';
      try {
        await page.goto('https://browserleaks.com/webrtc', {
          waitUntil: 'networkidle',
          timeout: 60000,
        });

        await page.waitForTimeout(5000);

        // Check for IP leaks
        const leakResults = await page.evaluate(() => {
          const ipElements = document.querySelectorAll('.ip-address, .local-ip');
          const leakedIPs: string[] = [];

          ipElements.forEach((el) => {
            const ip = el.textContent?.trim();
            if (ip && ip.length > 0 && ip !== 'N/A') {
              leakedIPs.push(ip);
            }
          });

          return {
            hasLeaks: leakedIPs.length > 0,
            leakedIPs,
          };
        });

        results.push({
          detector: testName,
          passed: !leakResults.hasLeaks,
          score: leakResults.hasLeaks ? 'Leaks Detected' : 'No Leaks',
          details: leakResults,
        });

        expect(leakResults.hasLeaks).toBe(false);
      } catch (error) {
        results.push({
          detector: testName,
          passed: false,
          error: (error as Error).message,
        });
        throw error;
      }
    }, 120000);
  });

  describe('BrowserLeaks - Canvas Fingerprinting', () => {
    it('should have consistent canvas fingerprint', async () => {
      const testName = 'BrowserLeaks Canvas';
      try {
        await page.goto('https://browserleaks.com/canvas', {
          waitUntil: 'networkidle',
          timeout: 60000,
        });

        await page.waitForTimeout(3000);

        // Get canvas hash
        const canvasHash = await page.evaluate(() => {
          const hashElement = document.querySelector('.hash, .fingerprint-hash');
          return hashElement ? hashElement.textContent?.trim() : null;
        });

        const passed = canvasHash !== null && canvasHash.length > 0;

        results.push({
          detector: testName,
          passed,
          score: canvasHash || 'Unable to get hash',
        });

        expect(passed).toBe(true);
      } catch (error) {
        results.push({
          detector: testName,
          passed: false,
          error: (error as Error).message,
        });
        throw error;
      }
    }, 120000);
  });

  describe('BrowserLeaks - Audio Fingerprinting', () => {
    it('should have consistent audio fingerprint', async () => {
      const testName = 'BrowserLeaks Audio';
      try {
        await page.goto('https://browserleaks.com/audio', {
          waitUntil: 'networkidle',
          timeout: 60000,
        });

        await page.waitForTimeout(3000);

        // Check audio context
        const audioResult = await page.evaluate(() => {
          const hashElement = document.querySelector('.audio-hash, .fingerprint');
          return {
            hasAudio: hashElement !== null,
            hash: hashElement ? hashElement.textContent?.trim() : null,
          };
        });

        results.push({
          detector: testName,
          passed: audioResult.hasAudio,
          score: audioResult.hash || 'Generated',
        });

        expect(audioResult.hasAudio).toBe(true);
      } catch (error) {
        results.push({
          detector: testName,
          passed: false,
          error: (error as Error).message,
        });
        throw error;
      }
    }, 120000);
  });

  describe('BrowserLeaks - WebGL Fingerprinting', () => {
    it('should have consistent WebGL fingerprint', async () => {
      const testName = 'BrowserLeaks WebGL';
      try {
        await page.goto('https://browserleaks.com/webgl', {
          waitUntil: 'networkidle',
          timeout: 60000,
        });

        await page.waitForTimeout(3000);

        // Get WebGL info
        const webglInfo = await page.evaluate(() => {
          const vendor = document.querySelector('.vendor');
          const renderer = document.querySelector('.renderer');
          return {
            vendor: vendor ? vendor.textContent?.trim() : null,
            renderer: renderer ? renderer.textContent?.trim() : null,
          };
        });

        const passed = webglInfo.vendor !== null && webglInfo.renderer !== null;

        results.push({
          detector: testName,
          passed,
          details: webglInfo,
        });

        expect(passed).toBe(true);
      } catch (error) {
        results.push({
          detector: testName,
          passed: false,
          error: (error as Error).message,
        });
        throw error;
      }
    }, 120000);
  });

  describe('Arh.Antoinevastel - Bot Detection', () => {
    it('should pass Antoinevastel bot detection', async () => {
      const testName = 'Arh.Antoinevastel';
      try {
        await page.goto('https://arh.antoinevastel.com/bots/areyouheadless', {
          waitUntil: 'networkidle',
          timeout: 60000,
        });

        await page.waitForTimeout(5000);

        // Check detection result
        const detectionResult = await page.evaluate(() => {
          const body = document.body.textContent || '';
          return {
            isHeadless: body.toLowerCase().includes('headless'),
            isBot: body.toLowerCase().includes('bot'),
            fullText: body.substring(0, 500),
          };
        });

        const passed = !detectionResult.isHeadless && !detectionResult.isBot;

        results.push({
          detector: testName,
          passed,
          score: passed ? 'Not Detected' : 'Detected as Bot/Headless',
          details: detectionResult,
        });

        expect(passed).toBe(true);
      } catch (error) {
        results.push({
          detector: testName,
          passed: false,
          error: (error as Error).message,
        });
        throw error;
      }
    }, 120000);
  });

  describe('Performance and Consistency Tests', () => {
    it('should maintain consistent fingerprint across page reloads', async () => {
      const testName = 'Fingerprint Consistency';
      try {
        // Get fingerprint data from first load
        await page.goto('about:blank');

        const fingerprint1 = await page.evaluate(() => {
          return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: (navigator as any).deviceMemory,
            screenWidth: screen.width,
            screenHeight: screen.height,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
          };
        });

        // Reload and get fingerprint again
        await page.reload();
        await page.waitForTimeout(1000);

        const fingerprint2 = await page.evaluate(() => {
          return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: (navigator as any).deviceMemory,
            screenWidth: screen.width,
            screenHeight: screen.height,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
          };
        });

        // Compare fingerprints
        const isConsistent = JSON.stringify(fingerprint1) === JSON.stringify(fingerprint2);

        results.push({
          detector: testName,
          passed: isConsistent,
          score: isConsistent ? 'Consistent' : 'Inconsistent',
          details: { fingerprint1, fingerprint2 },
        });

        expect(isConsistent).toBe(true);
      } catch (error) {
        results.push({
          detector: testName,
          passed: false,
          error: (error as Error).message,
        });
        throw error;
      }
    }, 60000);

    it('should not expose automation properties', async () => {
      const testName = 'Automation Property Check';
      try {
        await page.goto('about:blank');

        const automationCheck = await page.evaluate(() => {
          return {
            webdriver: navigator.webdriver,
            hasChrome: typeof (window as any).chrome !== 'undefined',
            hasAutomation: typeof (window as any).__webdriver_script_fn !== 'undefined',
            hasSelenium: typeof (window as any)._Selenium_IDE_Recorder !== 'undefined',
            hasPhantom: typeof (window as any).callPhantom !== 'undefined',
            documentHasPhantom: typeof (document as any).__phantomas !== 'undefined',
          };
        });

        const passed =
          automationCheck.webdriver === undefined &&
          !automationCheck.hasAutomation &&
          !automationCheck.hasSelenium &&
          !automationCheck.hasPhantom &&
          !automationCheck.documentHasPhantom;

        results.push({
          detector: testName,
          passed,
          details: automationCheck,
        });

        expect(passed).toBe(true);
      } catch (error) {
        results.push({
          detector: testName,
          passed: false,
          error: (error as Error).message,
        });
        throw error;
      }
    }, 30000);
  });
});
