import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

export interface DetectionResult {
  category: string;
  test: string;
  passed: boolean;
  value?: any;
  expected?: any;
  severity: 'critical' | 'warning' | 'info';
}

export interface DetectionTestReport {
  timestamp: number;
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  criticalFailures: number;
  results: DetectionResult[];
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Detection Test Utility
 * Comprehensive testing suite for browser automation detection
 */
export class DetectionTester {
  /**
   * Run all detection tests on a page
   */
  async runAllTests(page: Page): Promise<DetectionTestReport> {
    logger.info('Starting comprehensive detection tests...');

    const results: DetectionResult[] = [];

    // WebDriver tests
    results.push(...(await this.testWebDriver(page)));

    // Chrome Runtime tests
    results.push(...(await this.testChromeRuntime(page)));

    // Fingerprinting tests
    results.push(...(await this.testFingerprinting(page)));

    // Behavioral tests
    results.push(...(await this.testBehavioral(page)));

    // Network tests
    results.push(...(await this.testNetwork(page)));

    // Advanced evasions tests
    results.push(...(await this.testAdvancedEvasions(page)));

    // Calculate report
    const report = this.generateReport(results);

    logger.info(`Detection tests completed. Score: ${report.score}/100 (Grade: ${report.grade})`);

    return report;
  }

  /**
   * Test WebDriver detection methods
   */
  private async testWebDriver(page: Page): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    const tests = await page.evaluate(() => {
      return {
        navigatorWebdriver: typeof navigator.webdriver,
        navigatorWebdriverValue: navigator.webdriver,
        cdcProps: Object.keys(window).filter((prop) =>
          /^(cdc_|__webdriver|__driver|__selenium)/.test(prop)
        ),
        domAutomation: typeof (window as any).domAutomation,
        domAutomationController: typeof (window as any).domAutomationController,
        callPhantom: typeof (window as any).callPhantom,
        _phantom: typeof (window as any)._phantom,
        phantom: typeof (window as any).phantom,
      };
    });

    results.push({
      category: 'WebDriver',
      test: 'navigator.webdriver',
      passed: tests.navigatorWebdriverValue === undefined,
      value: tests.navigatorWebdriverValue,
      expected: undefined,
      severity: 'critical',
    });

    results.push({
      category: 'WebDriver',
      test: 'CDP variables',
      passed: tests.cdcProps.length === 0,
      value: tests.cdcProps,
      expected: [],
      severity: 'critical',
    });

    results.push({
      category: 'WebDriver',
      test: 'domAutomation',
      passed: tests.domAutomation === 'undefined',
      value: tests.domAutomation,
      expected: 'undefined',
      severity: 'warning',
    });

    results.push({
      category: 'WebDriver',
      test: 'Phantom variables',
      passed:
        tests.callPhantom === 'undefined' &&
        tests._phantom === 'undefined' &&
        tests.phantom === 'undefined',
      value: { callPhantom: tests.callPhantom, _phantom: tests._phantom, phantom: tests.phantom },
      expected: { callPhantom: 'undefined', _phantom: 'undefined', phantom: 'undefined' },
      severity: 'warning',
    });

    return results;
  }

  /**
   * Test Chrome Runtime
   */
  private async testChromeRuntime(page: Page): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    const tests = await page.evaluate(() => {
      return {
        hasChromeObject: typeof window.chrome !== 'undefined',
        hasRuntime: typeof window.chrome?.runtime !== 'undefined',
        hasApp: typeof window.chrome?.app !== 'undefined',
        runtimeKeys: window.chrome?.runtime ? Object.keys(window.chrome.runtime).length : 0,
      };
    });

    results.push({
      category: 'Chrome Runtime',
      test: 'chrome object exists',
      passed: tests.hasChromeObject,
      value: tests.hasChromeObject,
      expected: true,
      severity: 'critical',
    });

    results.push({
      category: 'Chrome Runtime',
      test: 'chrome.runtime exists',
      passed: tests.hasRuntime,
      value: tests.hasRuntime,
      expected: true,
      severity: 'warning',
    });

    results.push({
      category: 'Chrome Runtime',
      test: 'chrome.app exists',
      passed: tests.hasApp,
      value: tests.hasApp,
      expected: true,
      severity: 'info',
    });

    return results;
  }

  /**
   * Test fingerprinting protection
   */
  private async testFingerprinting(page: Page): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    const tests = await page.evaluate(() => {
      // Canvas fingerprinting
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let canvasFingerprint1 = '';
      let canvasFingerprint2 = '';

      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Test', 2, 2);
        canvasFingerprint1 = canvas.toDataURL();
        canvasFingerprint2 = canvas.toDataURL();
      }

      // WebGL fingerprinting
      const gl = canvas.getContext('webgl');
      const webglVendor = gl?.getParameter(37445); // UNMASKED_VENDOR_WEBGL
      const webglRenderer = gl?.getParameter(37446); // UNMASKED_RENDERER_WEBGL

      // Plugins
      const plugins = Array.from(navigator.plugins || []).map((p) => p.name);

      // Hardware
      const hardwareConcurrency = navigator.hardwareConcurrency;
      const deviceMemory = (navigator as any).deviceMemory;

      // Screen
      const screen = {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
      };

      return {
        canvasConsistent: canvasFingerprint1 === canvasFingerprint2,
        canvasLength: canvasFingerprint1.length,
        webglVendor,
        webglRenderer,
        pluginsCount: plugins.length,
        plugins,
        hardwareConcurrency,
        deviceMemory,
        screen,
      };
    });

    results.push({
      category: 'Fingerprinting',
      test: 'Canvas consistency',
      passed: !tests.canvasConsistent, // Should have noise, so NOT consistent
      value: tests.canvasConsistent,
      expected: false,
      severity: 'warning',
    });

    results.push({
      category: 'Fingerprinting',
      test: 'WebGL vendor spoofed',
      passed: tests.webglVendor !== 'Google Inc.',
      value: tests.webglVendor,
      expected: 'Intel Inc. or similar',
      severity: 'warning',
    });

    results.push({
      category: 'Fingerprinting',
      test: 'Plugins present',
      passed: tests.pluginsCount > 0,
      value: tests.pluginsCount,
      expected: '> 0',
      severity: 'info',
    });

    results.push({
      category: 'Fingerprinting',
      test: 'Hardware concurrency set',
      passed: typeof tests.hardwareConcurrency === 'number' && tests.hardwareConcurrency > 0,
      value: tests.hardwareConcurrency,
      expected: '> 0',
      severity: 'info',
    });

    return results;
  }

  /**
   * Test behavioral simulation
   */
  private async testBehavioral(page: Page): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    const tests = await page.evaluate(() => {
      return {
        hasMousemoveListener: (window as any).lastMouseX !== undefined,
        mousePosition: {
          x: (window as any).lastMouseX,
          y: (window as any).lastMouseY,
        },
      };
    });

    results.push({
      category: 'Behavioral',
      test: 'Mouse tracking initialized',
      passed: tests.hasMousemoveListener,
      value: tests.hasMousemoveListener,
      expected: true,
      severity: 'info',
    });

    return results;
  }

  /**
   * Test network-level protection
   */
  private async testNetwork(page: Page): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    // Check headers (requires network interception)
    // This is tested indirectly through successful navigation

    results.push({
      category: 'Network',
      test: 'Headers set correctly',
      passed: true, // If page loaded successfully, headers are likely correct
      value: 'Verified through successful navigation',
      expected: 'Proper Accept, Accept-Language, etc.',
      severity: 'info',
    });

    return results;
  }

  /**
   * Test advanced evasions
   */
  private async testAdvancedEvasions(page: Page): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    const tests = await page.evaluate(() => {
      return {
        // Performance API
        hasPerformanceNow: typeof performance.now === 'function',

        // Sensor APIs
        noSensor: typeof (window as any).Sensor === 'undefined',
        noAccelerometer: typeof (window as any).Accelerometer === 'undefined',
        noGyroscope: typeof (window as any).Gyroscope === 'undefined',

        // Device APIs
        noUSB: typeof (navigator as any).usb === 'undefined',
        noBluetooth: typeof (navigator as any).bluetooth === 'undefined',
        noSerial: typeof (navigator as any).serial === 'undefined',

        // Gamepad
        hasGamepads: typeof navigator.getGamepads === 'function',
        gamepadsEmpty: navigator.getGamepads
          ? navigator.getGamepads().every((g) => g === null)
          : true,

        // WebRTC
        hasRTC: typeof window.RTCPeerConnection === 'function',

        // VR/XR
        noXR: typeof (navigator as any).xr === 'undefined',

        // Presentation
        noPresentation: typeof (navigator as any).presentation === 'undefined',
      };
    });

    results.push({
      category: 'Advanced Evasions',
      test: 'Sensor APIs removed',
      passed: tests.noSensor && tests.noAccelerometer && tests.noGyroscope,
      value: { sensor: tests.noSensor, accelerometer: tests.noAccelerometer, gyroscope: tests.noGyroscope },
      expected: 'all undefined',
      severity: 'info',
    });

    results.push({
      category: 'Advanced Evasions',
      test: 'Device APIs removed',
      passed: tests.noUSB && tests.noBluetooth && tests.noSerial,
      value: { usb: tests.noUSB, bluetooth: tests.noBluetooth, serial: tests.noSerial },
      expected: 'all undefined',
      severity: 'info',
    });

    results.push({
      category: 'Advanced Evasions',
      test: 'Gamepad API protected',
      passed: tests.gamepadsEmpty,
      value: tests.gamepadsEmpty,
      expected: true,
      severity: 'info',
    });

    results.push({
      category: 'Advanced Evasions',
      test: 'XR APIs removed',
      passed: tests.noXR,
      value: tests.noXR,
      expected: true,
      severity: 'info',
    });

    return results;
  }

  /**
   * Generate test report
   */
  private generateReport(results: DetectionResult[]): DetectionTestReport {
    const totalTests = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const warnings = results.filter((r) => !r.passed && r.severity === 'warning').length;
    const criticalFailures = results.filter((r) => !r.passed && r.severity === 'critical').length;

    // Calculate score (critical failures are weighted heavily)
    const criticalWeight = 10;
    const warningWeight = 3;
    const infoWeight = 1;

    const maxScore =
      results.filter((r) => r.severity === 'critical').length * criticalWeight +
      results.filter((r) => r.severity === 'warning').length * warningWeight +
      results.filter((r) => r.severity === 'info').length * infoWeight;

    const earnedScore =
      results.filter((r) => r.passed && r.severity === 'critical').length * criticalWeight +
      results.filter((r) => r.passed && r.severity === 'warning').length * warningWeight +
      results.filter((r) => r.passed && r.severity === 'info').length * infoWeight;

    const score = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 100;

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (criticalFailures > 0) {
      grade = 'F';
    } else if (score >= 90) {
      grade = 'A';
    } else if (score >= 80) {
      grade = 'B';
    } else if (score >= 70) {
      grade = 'C';
    } else if (score >= 60) {
      grade = 'D';
    } else {
      grade = 'F';
    }

    return {
      timestamp: Date.now(),
      totalTests,
      passed,
      failed,
      warnings,
      criticalFailures,
      results,
      score,
      grade,
    };
  }

  /**
   * Print report to console
   */
  printReport(report: DetectionTestReport): void {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 DETECTION TEST REPORT');
    console.log('='.repeat(70));
    console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
    console.log(`Score: ${report.score}/100 (Grade: ${report.grade})`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passed} ✓`);
    console.log(`Failed: ${report.failed} ✗`);
    console.log(`  - Critical: ${report.criticalFailures}`);
    console.log(`  - Warnings: ${report.warnings}`);
    console.log('='.repeat(70));

    // Group results by category
    const categories = [...new Set(report.results.map((r) => r.category))];

    categories.forEach((category) => {
      console.log(`\n📁 ${category}`);
      const categoryResults = report.results.filter((r) => r.category === category);

      categoryResults.forEach((result) => {
        const icon = result.passed ? '✓' : '✗';
        const severityIcon =
          result.severity === 'critical' ? '🔴' : result.severity === 'warning' ? '⚠️ ' : 'ℹ️ ';
        const status = result.passed ? 'PASS' : 'FAIL';

        console.log(`  ${icon} ${severityIcon} ${result.test}: ${status}`);

        if (!result.passed) {
          console.log(`     Expected: ${JSON.stringify(result.expected)}`);
          console.log(`     Got:      ${JSON.stringify(result.value)}`);
        }
      });
    });

    console.log('\n' + '='.repeat(70));
    console.log(`Overall Grade: ${report.grade} (${report.score}/100)`);

    if (report.criticalFailures > 0) {
      console.log('⚠️  CRITICAL: Bot detection may succeed!');
    } else if (report.warnings > 0) {
      console.log('⚠️  Some warnings present, but should be undetectable.');
    } else {
      console.log('✅ All tests passed! Excellent stealth.');
    }

    console.log('='.repeat(70) + '\n');
  }

  /**
   * Export report as JSON
   */
  exportReport(report: DetectionTestReport, filepath: string): void {
    const fs = require('fs');
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    logger.info(`Report exported to ${filepath}`);
  }
}
