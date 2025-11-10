/**
 * Quick Start - Realistic Browser
 *
 * The simplest way to create an ultra-realistic, undetectable browser
 * with automatic proxy-fingerprint consistency and human behavior.
 *
 * This is the RECOMMENDED way to use UndetectBrowser v2.0
 */

import { createRealisticBrowser } from '../src/core/realistic-browser-factory';

/**
 * Example 1: Minimal Setup (No Proxy)
 */
async function example1_MinimalSetup() {
  console.log('=== Example 1: Minimal Setup ===\n');

  // Create browser with default settings
  const browser = await createRealisticBrowser();

  // Create a page with human-like methods
  const page = await browser.newPage();

  // Navigate to a website
  await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

  // Use human-like interactions
  await page.humanType('textarea[name="q"]', 'realistic browser automation');
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Scroll like a human
  await page.humanScroll('down', 800);

  console.log('✅ Minimal setup complete!');

  // Keep open for inspection
  await new Promise((resolve) => setTimeout(resolve, 30000));
  await browser.close();
}

/**
 * Example 2: With Proxy (Automatic Fingerprint Matching)
 */
async function example2_WithProxy() {
  console.log('=== Example 2: With Proxy ===\n');

  // Create browser with proxy - fingerprint automatically matches proxy location!
  const browser = await createRealisticBrowser({
    proxy: {
      type: 'http',
      host: '1.2.3.4', // Replace with your proxy
      port: 8080,
      username: 'user', // Optional
      password: 'pass', // Optional
    },
  });

  // Get the generated fingerprint and profile
  const fingerprint = browser.getFingerprint();
  const profile = browser.getBiometricProfile();
  const country = browser.getProxyCountry();

  console.log('🌍 Auto-generated Configuration:');
  console.log(`  Country: ${country}`);
  console.log(`  Timezone: ${fingerprint.timezone}`);
  console.log(`  Locale: ${fingerprint.locale}`);
  console.log(`  Languages: ${fingerprint.languages.join(', ')}`);
  console.log(`  Typing Speed: ${Math.round(profile.typingSpeed)} WPM`);
  console.log(`  Mouse Speed: ${Math.round(profile.mouseSpeed)} px/s\n`);

  // Create page and use it
  const page = await browser.newPage();

  await page.goto('https://www.whatismybrowser.com/', {
    waitUntil: 'networkidle2',
  });

  console.log('✅ Page loaded with consistent fingerprint');

  // Human-like behavior
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await page.humanScroll('down', 600);

  // Keep open
  await new Promise((resolve) => setTimeout(resolve, 30000));
  await browser.close();
}

/**
 * Example 3: Specific Country (Override Auto-detection)
 */
async function example3_SpecificCountry() {
  console.log('=== Example 3: Specific Country ===\n');

  // Force specific country regardless of proxy
  const browser = await createRealisticBrowser({
    country: 'JP', // Force Japanese fingerprint
    userSeed: 'consistent-user-123', // Same seed = same fingerprint
  });

  const fingerprint = browser.getFingerprint();

  console.log('🇯🇵 Japanese Fingerprint:');
  console.log(`  Timezone: ${fingerprint.timezone}`);
  console.log(`  Locale: ${fingerprint.locale}`);
  console.log(`  Languages: ${fingerprint.languages.join(', ')}\n`);

  const page = await browser.newPage();

  // Test fingerprint
  await page.goto('https://abrahamjuliot.github.io/creepjs/', {
    waitUntil: 'networkidle2',
  });

  console.log('✅ Fingerprint test page loaded');

  await new Promise((resolve) => setTimeout(resolve, 60000));
  await browser.close();
}

/**
 * Example 4: Complete E-commerce Workflow
 */
async function example4_EcommerceWorkflow() {
  console.log('=== Example 4: E-commerce Workflow ===\n');

  const browser = await createRealisticBrowser({
    country: 'US',
    userSeed: 'shopper-vip-001',
  });

  const page = await browser.newPage();

  console.log('🛒 Starting realistic shopping session...');

  // Navigate to Amazon
  await page.goto('https://www.amazon.com', { waitUntil: 'networkidle2' });

  // Human reads homepage
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Scroll to explore
  await page.humanScroll('down', 800);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Search for product
  try {
    await page.humanClick('#twotabsearchtextbox');
    await page.humanType('#twotabsearchtextbox', 'mechanical keyboard');
    await new Promise((resolve) => setTimeout(resolve, 500));
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('✅ Search results loaded');

    // Browse results
    await page.humanScroll('down', 1000);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Explore page
    await page.humanExplorePage();

    console.log('✅ Realistic shopping behavior complete');
  } catch (error) {
    console.log('Note: Amazon layout may vary, but behavior was realistic');
  }

  await new Promise((resolve) => setTimeout(resolve, 30000));
  await browser.close();
}

/**
 * Example 5: Form Filling
 */
async function example5_FormFilling() {
  console.log('=== Example 5: Form Filling ===\n');

  const browser = await createRealisticBrowser({
    country: 'GB',
  });

  const page = await browser.newPage();

  // Create demo form
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Contact Form</title>
        <style>
          body { font-family: Arial; padding: 50px; background: #f5f5f5; }
          form { background: white; padding: 30px; max-width: 500px; border-radius: 8px; }
          input { display: block; width: 100%; margin: 15px 0; padding: 12px; border: 1px solid #ddd; border-radius: 4px; }
          button { background: #007bff; color: white; padding: 12px 30px; border: none; border-radius: 4px; cursor: pointer; }
        </style>
      </head>
      <body>
        <form>
          <h2>Contact Form</h2>
          <input id="name" type="text" placeholder="Full Name" />
          <input id="email" type="email" placeholder="Email Address" />
          <input id="phone" type="tel" placeholder="Phone Number" />
          <input id="company" type="text" placeholder="Company Name" />
          <button id="submit">Submit</button>
        </form>
      </body>
    </html>
  `);

  console.log('Filling form with human-like behavior...');

  // Fill form with realistic typing
  await page.humanFillForm({
    '#name': 'James Smith',
    '#email': 'james.smith@example.co.uk',
    '#phone': '+44 20 7123 4567',
    '#company': 'Acme Corporation Ltd',
  });

  console.log('✅ Form filled with realistic delays and patterns');

  // Click submit
  await page.humanClick('#submit');

  console.log('✅ Form submitted');

  await new Promise((resolve) => setTimeout(resolve, 20000));
  await browser.close();
}

/**
 * Example 6: Multiple Browsers in Parallel
 */
async function example6_ParallelBrowsers() {
  console.log('=== Example 6: Multiple Browsers in Parallel ===\n');

  // Import the multi-create function
  const { createRealisticBrowsers } = require('../src/core/realistic-browser-factory');

  // Create 3 browsers with different fingerprints
  const browsers = await createRealisticBrowsers([
    { country: 'US', userSeed: 'user-1' },
    { country: 'GB', userSeed: 'user-2' },
    { country: 'DE', userSeed: 'user-3' },
  ]);

  console.log(`✅ Created ${browsers.length} browsers in parallel`);

  // Use each browser
  for (let i = 0; i < browsers.length; i++) {
    const browser = browsers[i];
    const country = browser.getProxyCountry();

    console.log(`\nBrowser ${i + 1} - ${country}:`);

    const page = await browser.newPage();
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.humanType('textarea[name="q"]', `search from ${country}`);

    console.log(`  ✅ Search initiated from ${country}`);
  }

  // Keep all browsers open
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // Close all
  for (const browser of browsers) {
    await browser.close();
  }

  console.log('\n✅ All browsers closed');
}

/**
 * Main - Run examples
 */
async function main() {
  console.log('\n╔═════════════════════════════════════════════════════╗');
  console.log('║   Quick Start - Realistic Browser                  ║');
  console.log('║   UndetectBrowser v2.0                              ║');
  console.log('╚═════════════════════════════════════════════════════╝\n');

  try {
    // Uncomment the example you want to run:

    await example1_MinimalSetup();
    // await example2_WithProxy();
    // await example3_SpecificCountry();
    // await example4_EcommerceWorkflow();
    // await example5_FormFilling();
    // await example6_ParallelBrowsers();

    console.log('\n✅ Examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

/**
 * CHEAT SHEET
 * ===========
 *
 * 1. Basic Usage:
 *    const browser = await createRealisticBrowser();
 *    const page = await browser.newPage();
 *
 * 2. With Proxy:
 *    const browser = await createRealisticBrowser({
 *      proxy: { type: 'http', host: '1.2.3.4', port: 8080 }
 *    });
 *
 * 3. Specific Country:
 *    const browser = await createRealisticBrowser({
 *      country: 'GB',
 *      userSeed: 'consistent-seed'
 *    });
 *
 * 4. Human-like Interactions:
 *    await page.humanClick('#button');
 *    await page.humanType('#input', 'text');
 *    await page.humanScroll('down', 800);
 *    await page.humanReadPage();
 *    await page.humanExplorePage();
 *    await page.humanFillForm({ '#name': 'John', '#email': 'john@example.com' });
 *
 * 5. Get Info:
 *    const fingerprint = browser.getFingerprint();
 *    const profile = browser.getBiometricProfile();
 *    const country = browser.getProxyCountry();
 *
 * 6. Multiple Browsers:
 *    const browsers = await createRealisticBrowsers([
 *      { country: 'US' },
 *      { country: 'GB' }
 *    ]);
 */
