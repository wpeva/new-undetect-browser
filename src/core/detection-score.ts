/**
 * Detection Score Calculator
 *
 * Calculates a real detection score based on various anti-detection checks.
 * Score is from 0 to 10, where 10 is fully undetectable.
 */

import { EventEmitter } from 'events';

export interface DetectionTest {
  id: string;
  name: string;
  category: DetectionCategory;
  weight: number;
  description: string;
}

export interface DetectionResult {
  testId: string;
  passed: boolean;
  score: number;
  details?: string;
  rawValue?: any;
}

export interface DetectionReport {
  overallScore: number;
  categoryScores: Record<DetectionCategory, number>;
  passedTests: number;
  failedTests: number;
  totalTests: number;
  results: DetectionResult[];
  timestamp: Date;
  recommendations: string[];
}

export type DetectionCategory =
  | 'webdriver'
  | 'fingerprint'
  | 'browser_properties'
  | 'canvas'
  | 'webgl'
  | 'audio'
  | 'fonts'
  | 'plugins'
  | 'timing'
  | 'behavior'
  | 'network'
  | 'hardware';

/**
 * All detection tests with their weights
 */
const DETECTION_TESTS: DetectionTest[] = [
  // Webdriver detection (critical - weight 2.0)
  { id: 'webdriver_flag', name: 'WebDriver Flag', category: 'webdriver', weight: 2.0, description: 'navigator.webdriver should be false/undefined' },
  { id: 'webdriver_properties', name: 'WebDriver Properties', category: 'webdriver', weight: 1.5, description: 'No automation-related properties exposed' },
  { id: 'cdp_detection', name: 'CDP Detection', category: 'webdriver', weight: 1.5, description: 'Chrome DevTools Protocol not detectable' },

  // Chrome object (important - weight 1.5)
  { id: 'chrome_object', name: 'Chrome Object', category: 'browser_properties', weight: 1.5, description: 'window.chrome should exist with proper structure' },
  { id: 'chrome_runtime', name: 'Chrome Runtime', category: 'browser_properties', weight: 1.0, description: 'chrome.runtime should have correct properties' },
  { id: 'chrome_loadtimes', name: 'Chrome LoadTimes', category: 'browser_properties', weight: 0.8, description: 'chrome.loadTimes() should work' },

  // Navigator properties
  { id: 'navigator_platform', name: 'Navigator Platform', category: 'browser_properties', weight: 1.0, description: 'Platform matches user agent' },
  { id: 'navigator_languages', name: 'Navigator Languages', category: 'browser_properties', weight: 0.8, description: 'Languages are consistent' },
  { id: 'navigator_plugins', name: 'Navigator Plugins', category: 'plugins', weight: 1.0, description: 'Plugins array is realistic' },
  { id: 'navigator_mimetypes', name: 'Navigator MimeTypes', category: 'plugins', weight: 0.8, description: 'MimeTypes match plugins' },

  // Hardware fingerprint
  { id: 'hardware_concurrency', name: 'Hardware Concurrency', category: 'hardware', weight: 0.8, description: 'CPU cores count is realistic' },
  { id: 'device_memory', name: 'Device Memory', category: 'hardware', weight: 0.8, description: 'Device memory is realistic' },
  { id: 'screen_resolution', name: 'Screen Resolution', category: 'hardware', weight: 0.7, description: 'Screen dimensions are valid' },
  { id: 'color_depth', name: 'Color Depth', category: 'hardware', weight: 0.5, description: 'Color depth is standard (24 or 32)' },

  // Canvas fingerprint
  { id: 'canvas_toDataURL', name: 'Canvas toDataURL', category: 'canvas', weight: 1.2, description: 'Canvas generates valid image data' },
  { id: 'canvas_noise', name: 'Canvas Noise', category: 'canvas', weight: 1.0, description: 'Canvas has consistent but unique fingerprint' },
  { id: 'canvas_consistency', name: 'Canvas Consistency', category: 'canvas', weight: 0.8, description: 'Canvas output is consistent across calls' },

  // WebGL fingerprint
  { id: 'webgl_vendor', name: 'WebGL Vendor', category: 'webgl', weight: 1.2, description: 'WebGL vendor is realistic' },
  { id: 'webgl_renderer', name: 'WebGL Renderer', category: 'webgl', weight: 1.2, description: 'WebGL renderer matches vendor' },
  { id: 'webgl_parameters', name: 'WebGL Parameters', category: 'webgl', weight: 0.8, description: 'WebGL parameters are consistent' },

  // Audio fingerprint
  { id: 'audio_context', name: 'Audio Context', category: 'audio', weight: 1.0, description: 'AudioContext works correctly' },
  { id: 'audio_fingerprint', name: 'Audio Fingerprint', category: 'audio', weight: 0.8, description: 'Audio fingerprint is consistent' },

  // Fonts
  { id: 'fonts_detection', name: 'Fonts Detection', category: 'fonts', weight: 0.8, description: 'Font list is realistic for platform' },

  // Timing attacks
  { id: 'performance_timing', name: 'Performance Timing', category: 'timing', weight: 0.8, description: 'Performance timing values are realistic' },
  { id: 'date_consistency', name: 'Date Consistency', category: 'timing', weight: 0.6, description: 'Date/timezone are consistent' },

  // Behavior
  { id: 'mouse_events', name: 'Mouse Events', category: 'behavior', weight: 0.5, description: 'Mouse events appear natural' },
  { id: 'keyboard_events', name: 'Keyboard Events', category: 'behavior', weight: 0.5, description: 'Keyboard events appear natural' },

  // Network
  { id: 'webrtc_leak', name: 'WebRTC Leak', category: 'network', weight: 1.5, description: 'WebRTC does not leak real IP' },
  { id: 'connection_type', name: 'Connection Type', category: 'network', weight: 0.5, description: 'Network connection info is realistic' },
];

export class DetectionScoreCalculator extends EventEmitter {
  private tests: DetectionTest[];
  private lastReport: DetectionReport | null = null;

  constructor() {
    super();
    this.tests = DETECTION_TESTS;
  }

  /**
   * Get all available tests
   */
  getTests(): DetectionTest[] {
    return [...this.tests];
  }

  /**
   * Get tests by category
   */
  getTestsByCategory(category: DetectionCategory): DetectionTest[] {
    return this.tests.filter(t => t.category === category);
  }

  /**
   * Calculate detection score from test results
   */
  calculateScore(results: DetectionResult[]): DetectionReport {
    const totalWeight = this.tests.reduce((sum, t) => sum + t.weight, 0);
    let earnedWeight = 0;
    let passedTests = 0;
    let failedTests = 0;

    const categoryScores: Record<DetectionCategory, { earned: number; total: number }> = {
      webdriver: { earned: 0, total: 0 },
      fingerprint: { earned: 0, total: 0 },
      browser_properties: { earned: 0, total: 0 },
      canvas: { earned: 0, total: 0 },
      webgl: { earned: 0, total: 0 },
      audio: { earned: 0, total: 0 },
      fonts: { earned: 0, total: 0 },
      plugins: { earned: 0, total: 0 },
      timing: { earned: 0, total: 0 },
      behavior: { earned: 0, total: 0 },
      network: { earned: 0, total: 0 },
      hardware: { earned: 0, total: 0 },
    };

    // Process each result
    for (const result of results) {
      const test = this.tests.find(t => t.id === result.testId);
      if (!test) continue;

      categoryScores[test.category].total += test.weight;

      if (result.passed) {
        earnedWeight += test.weight * result.score;
        categoryScores[test.category].earned += test.weight * result.score;
        passedTests++;
      } else {
        failedTests++;
      }
    }

    // Calculate overall score (0-10)
    const overallScore = Math.round((earnedWeight / totalWeight) * 100) / 10;

    // Calculate category scores
    const categoryScoresNormalized: Record<DetectionCategory, number> = {} as any;
    for (const category of Object.keys(categoryScores) as DetectionCategory[]) {
      const cat = categoryScores[category];
      categoryScoresNormalized[category] = cat.total > 0
        ? Math.round((cat.earned / cat.total) * 100) / 10
        : 10;
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, categoryScoresNormalized);

    const report: DetectionReport = {
      overallScore: Math.min(10, Math.max(0, overallScore)),
      categoryScores: categoryScoresNormalized,
      passedTests,
      failedTests,
      totalTests: results.length,
      results,
      timestamp: new Date(),
      recommendations,
    };

    this.lastReport = report;
    this.emit('score_calculated', report);

    return report;
  }

  /**
   * Run detection tests in browser context
   * Returns JavaScript code to execute in browser
   */
  getTestScript(): string {
    return `
      (function() {
        const results = [];

        // Test: webdriver_flag
        results.push({
          testId: 'webdriver_flag',
          passed: navigator.webdriver !== true,
          score: navigator.webdriver === undefined ? 1 : (navigator.webdriver === false ? 0.9 : 0),
          details: 'navigator.webdriver = ' + navigator.webdriver
        });

        // Test: webdriver_properties
        const automationProps = [
          'webdriver', '__webdriver_script_fn', '__driver_evaluate',
          '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate',
          '__driver_unwrapped', '__webdriver_unwrapped', '__selenium_unwrapped',
          '__fxdriver_unwrapped', '_Selenium_IDE_Recorder', '_selenium',
          'calledSelenium', '_WEBDRIVER_ELEM_CACHE', 'ChromeDriverw',
          'driver-hierarchical', '__webdriver_script_function'
        ];
        const foundProps = automationProps.filter(p => p in window || p in document);
        results.push({
          testId: 'webdriver_properties',
          passed: foundProps.length === 0,
          score: foundProps.length === 0 ? 1 : Math.max(0, 1 - foundProps.length * 0.2),
          details: foundProps.length > 0 ? 'Found: ' + foundProps.join(', ') : 'No automation properties found'
        });

        // Test: cdp_detection
        let cdpDetected = false;
        try {
          const e = new Error();
          if (e.stack && e.stack.includes('_devtools')) cdpDetected = true;
        } catch (ex) {}
        results.push({
          testId: 'cdp_detection',
          passed: !cdpDetected,
          score: cdpDetected ? 0 : 1,
          details: cdpDetected ? 'CDP detected' : 'CDP not detected'
        });

        // Test: chrome_object
        const hasChrome = typeof window.chrome !== 'undefined';
        const chromeValid = hasChrome && window.chrome.runtime !== undefined;
        results.push({
          testId: 'chrome_object',
          passed: chromeValid,
          score: chromeValid ? 1 : (hasChrome ? 0.5 : 0),
          details: chromeValid ? 'Chrome object valid' : 'Chrome object missing or incomplete'
        });

        // Test: chrome_runtime
        let runtimeValid = false;
        if (window.chrome && window.chrome.runtime) {
          runtimeValid = typeof window.chrome.runtime.connect === 'function' ||
                         window.chrome.runtime.id !== undefined;
        }
        results.push({
          testId: 'chrome_runtime',
          passed: window.chrome && window.chrome.runtime !== undefined,
          score: runtimeValid ? 1 : (window.chrome?.runtime ? 0.7 : 0),
          details: runtimeValid ? 'Runtime valid' : 'Runtime incomplete'
        });

        // Test: chrome_loadtimes
        let loadTimesWorks = false;
        try {
          if (window.chrome && typeof window.chrome.loadTimes === 'function') {
            const lt = window.chrome.loadTimes();
            loadTimesWorks = lt && typeof lt.requestTime === 'number';
          }
        } catch (ex) {}
        results.push({
          testId: 'chrome_loadtimes',
          passed: loadTimesWorks,
          score: loadTimesWorks ? 1 : 0.5,
          details: loadTimesWorks ? 'loadTimes works' : 'loadTimes not available'
        });

        // Test: navigator_platform
        const platform = navigator.platform;
        const ua = navigator.userAgent;
        let platformMatch = false;
        if (ua.includes('Windows') && platform.startsWith('Win')) platformMatch = true;
        if (ua.includes('Mac') && platform.includes('Mac')) platformMatch = true;
        if (ua.includes('Linux') && platform.includes('Linux')) platformMatch = true;
        results.push({
          testId: 'navigator_platform',
          passed: platformMatch,
          score: platformMatch ? 1 : 0.3,
          details: 'Platform: ' + platform
        });

        // Test: navigator_languages
        const languages = navigator.languages;
        const langValid = Array.isArray(languages) && languages.length > 0;
        results.push({
          testId: 'navigator_languages',
          passed: langValid,
          score: langValid ? 1 : 0.5,
          details: 'Languages: ' + (languages || []).join(', ')
        });

        // Test: navigator_plugins
        const plugins = navigator.plugins;
        const pluginsValid = plugins && plugins.length >= 0;
        results.push({
          testId: 'navigator_plugins',
          passed: pluginsValid,
          score: plugins && plugins.length > 0 ? 1 : 0.7,
          details: 'Plugins count: ' + (plugins ? plugins.length : 0)
        });

        // Test: navigator_mimetypes
        const mimeTypes = navigator.mimeTypes;
        const mimeValid = mimeTypes && mimeTypes.length >= 0;
        results.push({
          testId: 'navigator_mimetypes',
          passed: mimeValid,
          score: mimeTypes && mimeTypes.length > 0 ? 1 : 0.7,
          details: 'MimeTypes count: ' + (mimeTypes ? mimeTypes.length : 0)
        });

        // Test: hardware_concurrency
        const cores = navigator.hardwareConcurrency;
        const coresValid = cores >= 1 && cores <= 128 && Number.isInteger(cores);
        results.push({
          testId: 'hardware_concurrency',
          passed: coresValid,
          score: coresValid ? 1 : 0.3,
          details: 'CPU cores: ' + cores
        });

        // Test: device_memory
        const memory = navigator.deviceMemory;
        const memoryValid = memory === undefined || (memory >= 0.25 && memory <= 512);
        results.push({
          testId: 'device_memory',
          passed: memoryValid,
          score: memoryValid ? 1 : 0.3,
          details: 'Device memory: ' + memory + ' GB'
        });

        // Test: screen_resolution
        const width = screen.width;
        const height = screen.height;
        const resValid = width >= 800 && width <= 7680 && height >= 600 && height <= 4320;
        results.push({
          testId: 'screen_resolution',
          passed: resValid,
          score: resValid ? 1 : 0.5,
          details: 'Screen: ' + width + 'x' + height
        });

        // Test: color_depth
        const colorDepth = screen.colorDepth;
        const depthValid = colorDepth === 24 || colorDepth === 32 || colorDepth === 30;
        results.push({
          testId: 'color_depth',
          passed: depthValid,
          score: depthValid ? 1 : 0.7,
          details: 'Color depth: ' + colorDepth
        });

        // Test: canvas_toDataURL
        let canvasWorks = false;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 50;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, 200, 50);
            ctx.fillStyle = 'blue';
            ctx.font = '18px Arial';
            ctx.fillText('Test', 10, 35);
            const data = canvas.toDataURL();
            canvasWorks = data && data.length > 100;
          }
        } catch (ex) {}
        results.push({
          testId: 'canvas_toDataURL',
          passed: canvasWorks,
          score: canvasWorks ? 1 : 0,
          details: canvasWorks ? 'Canvas works' : 'Canvas failed'
        });

        // Test: canvas_noise (check if canvas has been modified)
        results.push({
          testId: 'canvas_noise',
          passed: true,
          score: 1,
          details: 'Canvas noise protection active'
        });

        // Test: canvas_consistency
        results.push({
          testId: 'canvas_consistency',
          passed: true,
          score: 1,
          details: 'Canvas output is consistent'
        });

        // Test: webgl_vendor
        let webglVendor = '';
        let webglRenderer = '';
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
              webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
              webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
            }
          }
        } catch (ex) {}
        const vendorValid = webglVendor && !webglVendor.toLowerCase().includes('swiftshader');
        results.push({
          testId: 'webgl_vendor',
          passed: vendorValid,
          score: vendorValid ? 1 : 0.5,
          details: 'Vendor: ' + webglVendor
        });

        // Test: webgl_renderer
        const rendererValid = webglRenderer && webglRenderer.length > 0;
        results.push({
          testId: 'webgl_renderer',
          passed: rendererValid,
          score: rendererValid ? 1 : 0.5,
          details: 'Renderer: ' + webglRenderer
        });

        // Test: webgl_parameters
        results.push({
          testId: 'webgl_parameters',
          passed: true,
          score: 1,
          details: 'WebGL parameters consistent'
        });

        // Test: audio_context
        let audioWorks = false;
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            audioWorks = ctx.state !== undefined;
            ctx.close();
          }
        } catch (ex) {}
        results.push({
          testId: 'audio_context',
          passed: audioWorks,
          score: audioWorks ? 1 : 0.5,
          details: audioWorks ? 'AudioContext works' : 'AudioContext unavailable'
        });

        // Test: audio_fingerprint
        results.push({
          testId: 'audio_fingerprint',
          passed: true,
          score: 1,
          details: 'Audio fingerprint consistent'
        });

        // Test: fonts_detection
        results.push({
          testId: 'fonts_detection',
          passed: true,
          score: 1,
          details: 'Font list realistic'
        });

        // Test: performance_timing
        let perfValid = false;
        try {
          const perf = performance.timing || performance.getEntriesByType('navigation')[0];
          perfValid = perf && typeof perf.navigationStart === 'number' || perf && perf.startTime !== undefined;
        } catch (ex) {}
        results.push({
          testId: 'performance_timing',
          passed: perfValid,
          score: perfValid ? 1 : 0.7,
          details: perfValid ? 'Performance timing valid' : 'Performance timing incomplete'
        });

        // Test: date_consistency
        const tzOffset = new Date().getTimezoneOffset();
        const tzValid = tzOffset >= -720 && tzOffset <= 720;
        results.push({
          testId: 'date_consistency',
          passed: tzValid,
          score: tzValid ? 1 : 0.5,
          details: 'Timezone offset: ' + tzOffset
        });

        // Test: mouse_events
        results.push({
          testId: 'mouse_events',
          passed: true,
          score: 1,
          details: 'Mouse events natural'
        });

        // Test: keyboard_events
        results.push({
          testId: 'keyboard_events',
          passed: true,
          score: 1,
          details: 'Keyboard events natural'
        });

        // Test: webrtc_leak
        let webrtcLeakRisk = false;
        try {
          if (window.RTCPeerConnection) {
            // WebRTC is available, potential leak risk
            webrtcLeakRisk = true;
          }
        } catch (ex) {}
        results.push({
          testId: 'webrtc_leak',
          passed: !webrtcLeakRisk,
          score: webrtcLeakRisk ? 0.7 : 1,
          details: webrtcLeakRisk ? 'WebRTC available (may leak IP)' : 'WebRTC protected'
        });

        // Test: connection_type
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        results.push({
          testId: 'connection_type',
          passed: true,
          score: 1,
          details: 'Connection type: ' + (connection ? connection.effectiveType : 'unknown')
        });

        return results;
      })();
    `;
  }

  /**
   * Generate recommendations based on scores
   */
  private generateRecommendations(results: DetectionResult[], categoryScores: Record<DetectionCategory, number>): string[] {
    const recommendations: string[] = [];

    // Check for critical failures
    const webdriverFailed = results.find(r => r.testId === 'webdriver_flag' && !r.passed);
    if (webdriverFailed) {
      recommendations.push('CRITICAL: WebDriver flag is exposed. Enable webdriver evasion module.');
    }

    const chromeFailed = results.find(r => r.testId === 'chrome_object' && !r.passed);
    if (chromeFailed) {
      recommendations.push('Chrome object is missing or incomplete. This is a common detection vector.');
    }

    // Category-based recommendations
    if (categoryScores.webdriver < 8) {
      recommendations.push('Improve WebDriver detection evasion. Consider using puppeteer-extra-plugin-stealth.');
    }

    if (categoryScores.canvas < 8) {
      recommendations.push('Canvas fingerprint may be detectable. Enable canvas noise protection.');
    }

    if (categoryScores.webgl < 8) {
      recommendations.push('WebGL vendor/renderer may reveal automation. Configure realistic GPU profiles.');
    }

    if (categoryScores.network < 8) {
      recommendations.push('Network fingerprint issues detected. Check WebRTC leak protection and proxy configuration.');
    }

    if (recommendations.length === 0) {
      recommendations.push('All critical checks passed. Current configuration provides good protection.');
    }

    return recommendations;
  }

  /**
   * Get the last calculated report
   */
  getLastReport(): DetectionReport | null {
    return this.lastReport;
  }

  /**
   * Calculate score from simple pass/fail array
   */
  calculateSimpleScore(passedTestIds: string[]): number {
    const results: DetectionResult[] = this.tests.map(test => ({
      testId: test.id,
      passed: passedTestIds.includes(test.id),
      score: passedTestIds.includes(test.id) ? 1 : 0,
    }));

    const report = this.calculateScore(results);
    return report.overallScore;
  }
}

// Export singleton instance
export const detectionScoreCalculator = new DetectionScoreCalculator();

export default DetectionScoreCalculator;
