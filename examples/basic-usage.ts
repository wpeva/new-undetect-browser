import { UndetectBrowser } from '../src/index';

/**
 * Basic Usage Example
 * Demonstrates the simplest way to use UndetectBrowser
 */
async function main() {
  console.log('🚀 Starting UndetectBrowser Basic Example\n');

  // Create UndetectBrowser instance
  const undetect = new UndetectBrowser({
    stealth: {
      level: 'advanced', // basic | advanced | paranoid
    },
  });

  // Launch browser
  console.log('Launching browser...');
  const browser = await undetect.launch({
    headless: false, // Set to true for headless mode
  });

  console.log('✅ Browser launched successfully\n');

  // Create new page
  const page = await browser.newPage();

  // Navigate to detection test site
  console.log('Navigating to bot.sannysoft.com...');
  await page.goto('https://bot.sannysoft.com/', {
    waitUntil: 'networkidle2',
  });

  console.log('✅ Page loaded\n');

  // Wait a bit for inspection
  console.log('Waiting 10 seconds for inspection...');
  await page.waitForTimeout(10000);

  // Check WebDriver property
  const webdriver = await page.evaluate(() => {
    return navigator.webdriver;
  });

  console.log('Navigator.webdriver:', webdriver);

  // Check Chrome property
  const hasChrome = await page.evaluate(() => {
    return !!(window as any).chrome;
  });

  console.log('Has window.chrome:', hasChrome);

  // Get plugins count
  const pluginsCount = await page.evaluate(() => {
    return navigator.plugins.length;
  });

  console.log('Plugins count:', pluginsCount);

  // Take screenshot
  await page.screenshot({
    path: 'examples/screenshots/basic-usage.png',
    fullPage: true,
  });

  console.log('\n✅ Screenshot saved to examples/screenshots/basic-usage.png');

  // Close browser
  console.log('\nClosing browser...');
  await browser.close();

  console.log('✅ Done!');
}

main().catch(console.error);
