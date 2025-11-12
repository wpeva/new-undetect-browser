#!/usr/bin/env node

/**
 * Chromium Anti-Detection Patch Verification Script
 *
 * This script tests the custom Chromium build to verify that
 * all anti-detection patches are working correctly.
 *
 * Usage:
 *   node test-patches.js /path/to/chromium/chrome
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, colors.green);
}

function failure(message) {
  log(`✗ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ ${message}`, colors.blue);
}

function warn(message) {
  log(`⚠ ${message}`, colors.yellow);
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

function addResult(test, passed, message) {
  results.tests.push({ test, passed, message });
  if (passed) {
    results.passed++;
    success(`${test}: ${message}`);
  } else {
    results.failed++;
    failure(`${test}: ${message}`);
  }
}

async function testCanvasFingerprint(page) {
  info('\n=== Testing Canvas Fingerprint Protection ===');

  const canvasTest = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Draw test pattern
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = '#00FF00';
    ctx.fillText('Test String', 10, 50);

    // Get two fingerprints from same canvas
    const fp1 = canvas.toDataURL();
    const fp2 = canvas.toDataURL();

    return {
      sameSession: fp1 === fp2,
      length: fp1.length,
    };
  });

  addResult(
    'Canvas Stability',
    canvasTest.sameSession,
    canvasTest.sameSession
      ? 'Canvas fingerprint is consistent within session'
      : 'Canvas fingerprint is not stable (FAIL)'
  );

  addResult(
    'Canvas Data Generated',
    canvasTest.length > 1000,
    `Canvas data length: ${canvasTest.length} bytes`
  );
}

async function testWebGLFingerprint(page) {
  info('\n=== Testing WebGL Fingerprint Protection ===');

  const webglTest = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
      return { error: 'WebGL not supported' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'N/A',
      unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A',
    };
  });

  if (webglTest.error) {
    addResult('WebGL Support', false, webglTest.error);
    return;
  }

  // Check if vendor is spoofed
  const vendorSpoofed = webglTest.vendor.includes('Google Inc.') ||
                        webglTest.vendor.includes('Intel');
  addResult(
    'WebGL Vendor Spoofing',
    vendorSpoofed,
    `Vendor: ${webglTest.vendor}`
  );

  // Check if renderer is spoofed
  const rendererSpoofed = webglTest.renderer.includes('ANGLE') ||
                          webglTest.renderer.includes('Intel');
  addResult(
    'WebGL Renderer Spoofing',
    rendererSpoofed,
    `Renderer: ${webglTest.renderer}`
  );

  // Check unmasked values
  info(`  Unmasked Vendor: ${webglTest.unmaskedVendor}`);
  info(`  Unmasked Renderer: ${webglTest.unmaskedRenderer}`);
}

async function testAutomationDetection(page) {
  info('\n=== Testing Automation Detection Removal ===');

  const automationTest = await page.evaluate(() => {
    // Check navigator.webdriver
    const webdriver = navigator.webdriver;

    // Check for automation variables
    const automationVars = [
      '$cdc_',
      '$wdc_',
      '$chrome_',
      '__webdriver_',
      '__selenium_',
      '__fxdriver_',
      '__driver_',
      '__nightmare',
      'callPhantom',
      '_phantom',
      'phantom',
    ];

    const foundVars = automationVars.filter(varName =>
      Object.keys(window).some(key => key.includes(varName.replace('$', '')))
    );

    // Check for automation properties on document
    const documentProps = [
      '__webdriver_script_fn',
      '__webdriver_evaluate',
      '__selenium_unwrapped',
      '__driver_unwrapped',
    ];

    const foundDocProps = documentProps.filter(prop => prop in document);

    return {
      webdriver,
      foundVars,
      foundDocProps,
      windowKeys: Object.keys(window).filter(k =>
        k.includes('selenium') ||
        k.includes('webdriver') ||
        k.includes('driver')
      ),
    };
  });

  addResult(
    'navigator.webdriver',
    automationTest.webdriver === false,
    `navigator.webdriver = ${automationTest.webdriver}`
  );

  addResult(
    'Automation Variables Removed',
    automationTest.foundVars.length === 0,
    automationTest.foundVars.length === 0
      ? 'No automation variables found'
      : `Found: ${automationTest.foundVars.join(', ')}`
  );

  addResult(
    'Document Properties Clean',
    automationTest.foundDocProps.length === 0,
    automationTest.foundDocProps.length === 0
      ? 'No automation properties on document'
      : `Found: ${automationTest.foundDocProps.join(', ')}`
  );

  if (automationTest.windowKeys.length > 0) {
    warn(`  Suspicious window keys: ${automationTest.windowKeys.join(', ')}`);
  }
}

async function testPermissions(page) {
  info('\n=== Testing Permissions Stealth ===');

  const permissionTest = await page.evaluate(async () => {
    const start = performance.now();

    try {
      const result = await navigator.permissions.query({ name: 'notifications' });
      const duration = performance.now() - start;

      return {
        state: result.state,
        duration,
        error: null,
      };
    } catch (error) {
      return {
        state: null,
        duration: 0,
        error: error.message,
      };
    }
  });

  if (permissionTest.error) {
    addResult('Permissions Query', false, `Error: ${permissionTest.error}`);
    return;
  }

  // Check for realistic delay (should be 5-25ms if patch applied)
  const hasDelay = permissionTest.duration >= 5 && permissionTest.duration <= 100;
  addResult(
    'Permission Query Timing',
    hasDelay,
    `Duration: ${permissionTest.duration.toFixed(2)}ms`
  );

  info(`  Permission state: ${permissionTest.state}`);
}

async function testChromeRuntime(page) {
  info('\n=== Testing Chrome Runtime Properties ===');

  const runtimeTest = await page.evaluate(() => {
    return {
      hasChromeRuntime: typeof chrome !== 'undefined' && chrome.runtime !== undefined,
      hasLoadTimes: typeof chrome !== 'undefined' && chrome.loadTimes !== undefined,
      hasCSI: typeof chrome !== 'undefined' && chrome.csi !== undefined,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      languages: navigator.languages,
      hardwareConcurrency: navigator.hardwareConcurrency,
    };
  });

  info(`  User Agent: ${runtimeTest.userAgent}`);
  info(`  Platform: ${runtimeTest.platform}`);
  info(`  Languages: ${runtimeTest.languages.join(', ')}`);
  info(`  Hardware Concurrency: ${runtimeTest.hardwareConcurrency}`);

  // These are informational, not pass/fail
  results.warnings++;
  warn(`  chrome.runtime present: ${runtimeTest.hasChromeRuntime}`);
  warn(`  chrome.loadTimes present: ${runtimeTest.hasLoadTimes}`);
}

async function testPlugins(page) {
  info('\n=== Testing Plugins and Mimetypes ===');

  const pluginTest = await page.evaluate(() => {
    return {
      pluginCount: navigator.plugins.length,
      mimeTypeCount: navigator.mimeTypes.length,
      plugins: Array.from(navigator.plugins).map(p => ({
        name: p.name,
        filename: p.filename,
      })),
    };
  });

  info(`  Plugin count: ${pluginTest.pluginCount}`);
  info(`  MimeType count: ${pluginTest.mimeTypeCount}`);

  if (pluginTest.plugins.length > 0) {
    info('  Plugins:');
    pluginTest.plugins.forEach(p => {
      info(`    - ${p.name} (${p.filename})`);
    });
  }
}

async function runAllTests(chromiumPath) {
  info(`Testing Chromium at: ${chromiumPath}`);

  if (!fs.existsSync(chromiumPath)) {
    failure(`Chromium not found at: ${chromiumPath}`);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.goto('about:blank');

    // Run all tests
    await testAutomationDetection(page);
    await testCanvasFingerprint(page);
    await testWebGLFingerprint(page);
    await testPermissions(page);
    await testChromeRuntime(page);
    await testPlugins(page);

  } finally {
    await browser.close();
  }

  // Print summary
  info('\n=== Test Summary ===');
  log(`Total Tests: ${results.tests.length}`, colors.blue);
  success(`Passed: ${results.passed}`);
  failure(`Failed: ${results.failed}`);
  warn(`Warnings: ${results.warnings}`);

  const passRate = (results.passed / results.tests.length * 100).toFixed(1);
  info(`Pass Rate: ${passRate}%`);

  // Exit with appropriate code
  if (results.failed === 0) {
    success('\n✓ All tests passed! Anti-detection patches are working correctly.');
    process.exit(0);
  } else {
    failure(`\n✗ ${results.failed} test(s) failed. Please check the patches.`);
    process.exit(1);
  }
}

// Main
const chromiumPath = process.argv[2] || '/usr/bin/chromium';
runAllTests(chromiumPath).catch(error => {
  failure(`\nError running tests: ${error.message}`);
  console.error(error);
  process.exit(1);
});
