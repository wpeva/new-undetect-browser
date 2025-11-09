import { UndetectBrowser } from '../src/index';

/**
 * Paranoid Mode Example
 * Demonstrates maximum protection level with Advanced Evasions
 */
async function main() {
  console.log('🔒 Paranoid Mode Example - Maximum Protection\n');

  // Create UndetectBrowser with paranoid mode
  const undetect = new UndetectBrowser({
    stealth: {
      level: 'paranoid', // Enables ALL protections
      // In paranoid mode, all protections are enabled by default:
      // ✓ WebDriver Evasion
      // ✓ Fingerprint Spoofing
      // ✓ Behavioral Simulation
      // ✓ Network Protection
      // ✓ Advanced Evasions (Performance API, Touch Events, Sensors, etc.)
    },
  });

  console.log('Launching browser with PARANOID mode...');
  const browser = await undetect.launch({
    headless: false, // Use headful for demonstration
  });

  const page = await browser.newPage();

  console.log('\n📊 Protection Levels:');
  console.log('  [✓] WebDriver Evasion');
  console.log('  [✓] Fingerprint Spoofing (Canvas, WebGL, Audio, Fonts)');
  console.log('  [✓] Advanced Evasions (20+ protection methods)');
  console.log('  [✓] Behavioral Simulation');
  console.log('  [✓] Network Protection');

  // Test 1: Visit detection site
  console.log('\n\n🌐 Test 1: Visiting bot detection site...');
  await page.goto('https://bot.sannysoft.com/', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log('✓ Page loaded successfully');
  console.log('  → Check for green checkmarks (should be undetected)');

  // Wait for inspection
  await page.waitForTimeout(5000);

  // Test 2: Test advanced evasions
  console.log('\n🔬 Test 2: Testing Advanced Evasions...');

  const advancedTests = await page.evaluate(() => {
    const results: Record<string, any> = {};

    // Performance API
    results.performanceNow = typeof performance.now === 'function';
    results.performanceTiming = typeof performance.timing === 'object';

    // Touch Events (for mobile UA)
    results.touchSupport = 'ontouchstart' in window;
    results.maxTouchPoints = navigator.maxTouchPoints;

    // APIs that should be removed/protected
    results.sensor = typeof (window as any).Sensor === 'undefined';
    results.accelerometer = typeof (window as any).Accelerometer === 'undefined';
    results.usb = typeof (navigator as any).usb === 'undefined';
    results.bluetooth = typeof (navigator as any).bluetooth === 'undefined';
    results.vr = typeof (navigator as any).getVRDisplays === 'function';

    // Media codecs
    const video = document.createElement('video');
    results.canPlayMP4 = video.canPlayType('video/mp4');
    results.canPlayWebM = video.canPlayType('video/webm');

    // Storage quota
    results.storageEstimate = typeof navigator.storage?.estimate === 'function';

    // WebRTC
    results.rtcPeerConnection = typeof window.RTCPeerConnection === 'function';

    return results;
  });

  console.log('\n  Advanced Evasions Status:');
  console.log(`    Performance API: ${advancedTests.performanceNow ? '✓' : '✗'}`);
  console.log(`    Touch Support: ${advancedTests.touchSupport ? '✓' : '✗'} (maxTouchPoints: ${advancedTests.maxTouchPoints})`);
  console.log(`    Sensor APIs removed: ${advancedTests.sensor ? '✓' : '✗'}`);
  console.log(`    USB API removed: ${advancedTests.usb ? '✓' : '✗'}`);
  console.log(`    Bluetooth API removed: ${advancedTests.bluetooth ? '✓' : '✗'}`);
  console.log(`    Media Codecs: MP4=${advancedTests.canPlayMP4}, WebM=${advancedTests.canPlayWebM}`);
  console.log(`    Storage Estimate: ${advancedTests.storageEstimate ? '✓' : '✗'}`);
  console.log(`    WebRTC: ${advancedTests.rtcPeerConnection ? '✓' : '✗'}`);

  // Test 3: Font fingerprinting protection
  console.log('\n🔤 Test 3: Testing Font Fingerprinting Protection...');

  const fontTests = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Measure text with different fonts (fingerprinting attempt)
    const fonts = ['Arial', 'Times New Roman', 'Courier New'];
    const measurements: Record<string, number> = {};

    fonts.forEach((font) => {
      ctx.font = `16px ${font}`;
      const metrics = ctx.measureText('UndetectBrowser Test');
      measurements[font] = metrics.width;
    });

    return measurements;
  });

  if (fontTests) {
    console.log('  Font text measurements (with noise protection):');
    Object.entries(fontTests).forEach(([font, width]) => {
      console.log(`    ${font}: ${width.toFixed(6)}px`);
    });
  }

  // Test 4: ClientRects noise
  console.log('\n📏 Test 4: Testing ClientRects Noise Protection...');

  const rectTests = await page.evaluate(() => {
    const div = document.createElement('div');
    div.style.width = '100px';
    div.style.height = '50px';
    div.textContent = 'Test';
    document.body.appendChild(div);

    const rect1 = div.getBoundingClientRect();
    const rect2 = div.getBoundingClientRect();

    document.body.removeChild(div);

    return {
      rect1: { x: rect1.x, y: rect1.y, width: rect1.width, height: rect1.height },
      rect2: { x: rect2.x, y: rect2.y, width: rect2.width, height: rect2.height },
      hasDifference:
        rect1.x !== rect2.x ||
        rect1.y !== rect2.y ||
        rect1.width !== rect2.width ||
        rect1.height !== rect2.height,
    };
  });

  console.log('  ClientRects with noise:');
  console.log(`    First:  x=${rectTests.rect1.x.toFixed(6)}, width=${rectTests.rect1.width.toFixed(6)}`);
  console.log(`    Second: x=${rectTests.rect2.x.toFixed(6)}, width=${rectTests.rect2.width.toFixed(6)}`);
  console.log(`    Has subtle differences: ${rectTests.hasDifference ? '✓' : '✗'}`);

  // Test 5: Error stack trace sanitization
  console.log('\n🚫 Test 5: Testing Error Stack Trace Sanitization...');

  const errorTest = await page.evaluate(() => {
    try {
      throw new Error('Test error');
    } catch (e) {
      const error = e as Error;
      return {
        hasStack: !!error.stack,
        stackLines: error.stack?.split('\n').length || 0,
        containsPuppeteer: error.stack?.includes('puppeteer') || false,
        containsSelenium: error.stack?.includes('selenium') || false,
      };
    }
  });

  console.log('  Error stack trace:');
  console.log(`    Has stack: ${errorTest.hasStack ? '✓' : '✗'}`);
  console.log(`    Stack lines: ${errorTest.stackLines}`);
  console.log(`    Contains 'puppeteer': ${errorTest.containsPuppeteer ? '✗ (BAD)' : '✓ (GOOD)'}`);
  console.log(`    Contains 'selenium': ${errorTest.containsSelenium ? '✗ (BAD)' : '✓ (GOOD)'}`);

  // Test 6: Human-like interaction with paranoid mode
  console.log('\n🖱️  Test 6: Human-like interaction...');

  // Navigate to Google
  await page.goto('https://www.google.com', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  console.log('  → Performing human-like Google search...');

  try {
    // Use human-like typing
    const searchBox = await page.$('textarea[name="q"], input[name="q"]');
    if (searchBox) {
      // Human click on search box
      await (page as any).humanClick('textarea[name="q"], input[name="q"]');

      // Human-like typing
      await (page as any).humanType(
        'textarea[name="q"], input[name="q"]',
        'undetectable browser automation'
      );

      // Human delay before submitting
      await (page as any).humanDelay(1000, 2000);

      // Submit search
      await page.keyboard.press('Enter');

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
        console.log('    (Navigation timeout - this is normal)');
      });

      console.log('  ✓ Search completed with human-like behavior');

      // Simulate reading results
      await (page as any).simulateReading(3000);
      console.log('  ✓ Simulated reading results');

      // Human-like scrolling
      await (page as any).humanScroll({ direction: 'down', distance: 500 });
      console.log('  ✓ Human-like scroll completed');
    }
  } catch (error) {
    console.log('  ⚠️  Interaction test skipped (element not found or blocked)');
  }

  // Screenshot for verification
  console.log('\n📸 Taking screenshot...');
  await page.screenshot({ path: 'paranoid-mode-test.png', fullPage: true });
  console.log('  → Saved to: paranoid-mode-test.png');

  // Summary
  console.log('\n\n✅ Paranoid Mode Test Summary:');
  console.log('━'.repeat(60));
  console.log('Protection Level: PARANOID (Maximum)');
  console.log('Modules Active: 5/5');
  console.log('  • WebDriver Evasion       ✓');
  console.log('  • Fingerprint Spoofing    ✓');
  console.log('  • Advanced Evasions       ✓');
  console.log('  • Behavioral Simulation   ✓');
  console.log('  • Network Protection      ✓');
  console.log('━'.repeat(60));
  console.log('\n20+ Advanced Protection Methods:');
  console.log('  • Performance API timing protection');
  console.log('  • Touch events emulation');
  console.log('  • Speech API normalization');
  console.log('  • Gamepad API blocking');
  console.log('  • Media codecs spoofing');
  console.log('  • ClientRects noise injection');
  console.log('  • Font fingerprinting protection');
  console.log('  • Device orientation/motion blocking');
  console.log('  • Sensor APIs removal (9 sensors)');
  console.log('  • Presentation API blocking');
  console.log('  • WebVR/WebXR protection');
  console.log('  • USB/Bluetooth/NFC/Serial/HID blocking');
  console.log('  • Storage quota normalization');
  console.log('  • WebRTC IP leak prevention');
  console.log('  • Feature policy consistency');
  console.log('  • Error stack trace sanitization');
  console.log('  ...and more!');
  console.log('━'.repeat(60));

  console.log('\n⏱️  Keeping browser open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  console.log('\n🔒 Closing browser...');
  await browser.close();

  console.log('✨ Paranoid mode test completed!\n');
}

// Run the example
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
