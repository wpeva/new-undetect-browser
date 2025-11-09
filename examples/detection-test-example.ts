import { UndetectBrowser } from '../src/index';
import { DetectionTester } from '../src/utils/detection-tester';

/**
 * Detection Testing Example
 * Demonstrates how to use the DetectionTester utility to verify
 * that all protection methods are working correctly
 */
async function main() {
  console.log('🔍 Detection Testing Example\n');

  // Test different stealth levels
  const levels: Array<'basic' | 'advanced' | 'paranoid'> = ['basic', 'advanced', 'paranoid'];

  for (const level of levels) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Testing Level: ${level.toUpperCase()}`);
    console.log('='.repeat(70));

    // Create browser with specific stealth level
    const undetect = new UndetectBrowser({
      stealth: { level },
    });

    const browser = await undetect.launch({
      headless: true, // Run headless for faster testing
    });

    const page = await browser.newPage();

    // Create detection tester
    const tester = new DetectionTester();

    // Navigate to a page (to initialize everything)
    await page.goto('https://example.com', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Run all detection tests
    const report = await tester.runAllTests(page);

    // Print the report
    tester.printReport(report);

    // Export report to file
    const filename = `detection-report-${level}-${Date.now()}.json`;
    tester.exportReport(report, filename);
    console.log(`📄 Report saved to: ${filename}\n`);

    // Close browser
    await browser.close();

    // Add delay between tests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('\n✅ All detection tests completed!\n');
  console.log('📊 Summary:');
  console.log('  - Basic level: Should pass core WebDriver tests');
  console.log('  - Advanced level: Should pass most fingerprinting tests');
  console.log('  - Paranoid level: Should pass ALL tests with Grade A\n');
}

/**
 * Test specific detection site
 */
async function testDetectionSite() {
  console.log('\n🌐 Testing Against Real Detection Site\n');

  const undetect = new UndetectBrowser({
    stealth: { level: 'paranoid' },
  });

  const browser = await undetect.launch({
    headless: false, // Use headful to see results
  });

  const page = await browser.newPage();

  // Visit bot detection site
  console.log('Navigating to bot.sannysoft.com...');
  await page.goto('https://bot.sannysoft.com/', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  console.log('✓ Page loaded\n');

  // Run detection tests
  const tester = new DetectionTester();
  const report = await tester.runAllTests(page);

  // Print report
  tester.printReport(report);

  // Take screenshot
  await page.screenshot({
    path: 'detection-site-test.png',
    fullPage: true,
  });

  console.log('📸 Screenshot saved to: detection-site-test.png');

  // Check specific results
  console.log('\n🔍 Key Detection Points:');

  const webdriverTest = report.results.find((r) => r.test === 'navigator.webdriver');
  console.log(
    `  navigator.webdriver: ${webdriverTest?.passed ? '✓ PASS' : '✗ FAIL'} (${webdriverTest?.value})`
  );

  const cdpTest = report.results.find((r) => r.test === 'CDP variables');
  console.log(`  CDP variables: ${cdpTest?.passed ? '✓ PASS' : '✗ FAIL'} (${cdpTest?.value?.length || 0} found)`);

  const chromeTest = report.results.find((r) => r.test === 'chrome object exists');
  console.log(`  chrome object: ${chromeTest?.passed ? '✓ PASS' : '✗ FAIL'}`);

  // Keep browser open for manual inspection
  console.log('\n⏱️  Keeping browser open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('\n✅ Detection site test completed!\n');
}

/**
 * Compare different configurations
 */
async function compareConfigurations() {
  console.log('\n📊 Comparing Different Configurations\n');

  const configs = [
    {
      name: 'No Protection',
      config: {
        stealth: {
          webdriverEvasion: false,
          fingerprintSpoofing: false,
          behavioralSimulation: false,
          networkProtection: false,
          advancedEvasions: false,
        },
      },
    },
    {
      name: 'WebDriver Only',
      config: {
        stealth: {
          webdriverEvasion: true,
          fingerprintSpoofing: false,
          behavioralSimulation: false,
          networkProtection: false,
          advancedEvasions: false,
        },
      },
    },
    {
      name: 'WebDriver + Fingerprinting',
      config: {
        stealth: {
          webdriverEvasion: true,
          fingerprintSpoofing: true,
          behavioralSimulation: false,
          networkProtection: false,
          advancedEvasions: false,
        },
      },
    },
    {
      name: 'Full Protection (Paranoid)',
      config: {
        stealth: { level: 'paranoid' },
      },
    },
  ];

  const results: any[] = [];

  for (const { name, config } of configs) {
    console.log(`\nTesting: ${name}...`);

    const undetect = new UndetectBrowser(config as any);
    const browser = await undetect.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://example.com', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const tester = new DetectionTester();
    const report = await tester.runAllTests(page);

    results.push({
      name,
      score: report.score,
      grade: report.grade,
      passed: report.passed,
      failed: report.failed,
      criticalFailures: report.criticalFailures,
    });

    await browser.close();

    console.log(`  Score: ${report.score}/100 (Grade: ${report.grade})`);
    console.log(`  Passed: ${report.passed}/${report.totalTests}`);
    console.log(`  Critical Failures: ${report.criticalFailures}`);
  }

  // Print comparison table
  console.log('\n' + '='.repeat(70));
  console.log('📊 COMPARISON TABLE');
  console.log('='.repeat(70));
  console.log('Configuration                    | Score | Grade | Pass | Fail | Critical');
  console.log('-'.repeat(70));

  results.forEach((r) => {
    const name = r.name.padEnd(32);
    const score = `${r.score}/100`.padEnd(5);
    const grade = r.grade.padEnd(5);
    const pass = r.passed.toString().padEnd(4);
    const fail = r.failed.toString().padEnd(4);
    const crit = r.criticalFailures.toString().padEnd(8);

    console.log(`${name} | ${score} | ${grade} | ${pass} | ${fail} | ${crit}`);
  });

  console.log('='.repeat(70));
  console.log('\n✅ Comparison completed!\n');
}

// Run examples based on command line argument
const arg = process.argv[2];

switch (arg) {
  case 'site':
    testDetectionSite().catch(console.error);
    break;
  case 'compare':
    compareConfigurations().catch(console.error);
    break;
  default:
    main().catch(console.error);
}
