/**
 * Realistic Human Simulation Example
 *
 * This example demonstrates how to use the new consistent fingerprinting
 * and realistic human behavior modules to create the most undetectable
 * browser automation possible.
 *
 * Key Features:
 * - All fingerprint data matches proxy geolocation
 * - Realistic human typing, mouse movement, scrolling
 * - Biometric profiles with natural variance
 * - Complete consistency across all browser APIs
 */

import { UndetectBrowser } from '../src/index';
import {
  generateConsistentFingerprint,
  applyConsistentFingerprint,
} from '../src/modules/consistent-fingerprint';
import {
  generateBiometricProfile,
  humanType,
  humanClick,
  humanScroll,
  humanReadPage,
  humanExplorePage,
  humanFillForm,
} from '../src/modules/realistic-human-behavior';

/**
 * Example 1: Basic Realistic Browser with Proxy
 */
async function example1_BasicRealisticBrowser() {
  console.log('\n=== Example 1: Basic Realistic Browser ===\n');

  // Initialize UndetectBrowser
  const undetect = new UndetectBrowser({
    logLevel: 'info',
  });

  // Launch browser
  const browserInstance = await undetect.launch({
    headless: false,
  });

  // Create new page
  const page = await browserInstance.newPage();

  // Generate consistent fingerprint based on proxy country
  // In real usage, you would get the country from your proxy
  const fingerprint = generateConsistentFingerprint('US', 'seed-12345');

  console.log('Generated Fingerprint:');
  console.log('- User Agent:', fingerprint.userAgent);
  console.log('- Platform:', fingerprint.platform);
  console.log('- Timezone:', fingerprint.timezone);
  console.log('- Locale:', fingerprint.locale);
  console.log('- Languages:', fingerprint.languages.join(', '));
  console.log('- Resolution:', `${fingerprint.resolution.width}x${fingerprint.resolution.height}`);
  console.log('- WebGL Vendor:', fingerprint.webgl.vendor);
  console.log('- WebGL Renderer:', fingerprint.webgl.renderer);

  // Apply consistent fingerprint to page
  await applyConsistentFingerprint(page, fingerprint);

  // Generate biometric profile for human behavior
  const biometricProfile = generateBiometricProfile('seed-12345');

  console.log('\nBiometric Profile:');
  console.log('- Typing Speed:', Math.round(biometricProfile.typingSpeed), 'WPM');
  console.log('- Mouse Speed:', Math.round(biometricProfile.mouseSpeed), 'px/s');
  console.log('- Reaction Time:', Math.round(biometricProfile.reactionTime), 'ms');
  console.log('- Reading Speed:', Math.round(biometricProfile.readingSpeed), 'WPM');
  console.log('- Scroll Pattern:', biometricProfile.scrollPattern);
  console.log('- Click Pattern:', biometricProfile.clickPattern);

  // Navigate to a test page
  await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

  // Use human-like interaction
  console.log('\nSimulating human search...');

  // Wait a bit (human reads the page first)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Type in search box with human behavior
  await humanType(page, 'textarea[name="q"]', 'undetectable browser automation', biometricProfile);

  // Small pause before clicking
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Human-like click on search button
  await humanClick(page, 'input[name="btnK"]', biometricProfile);

  // Wait for results
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  console.log('Search completed with realistic human behavior!');

  // Scroll through results like a human
  await humanScroll(page, 'down', 800, biometricProfile);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await humanScroll(page, 'down', 600, biometricProfile);

  // Keep browser open for inspection
  console.log('\nBrowser will stay open for 30 seconds for inspection...');
  await new Promise((resolve) => setTimeout(resolve, 30000));

  await browserInstance.close();
}

/**
 * Example 2: Form Filling with Realistic Behavior
 */
async function example2_RealisticFormFilling() {
  console.log('\n=== Example 2: Realistic Form Filling ===\n');

  const undetect = new UndetectBrowser({ logLevel: 'info' });
  const browserInstance = await undetect.launch({ headless: false });
  const page = await browserInstance.newPage();

  // Generate fingerprint for Germany (example with different country)
  const fingerprint = generateConsistentFingerprint('DE', 'german-user-001');
  await applyConsistentFingerprint(page, fingerprint);

  // Generate biometric profile
  const biometricProfile = generateBiometricProfile('german-user-001');

  // Create a simple HTML form for demonstration
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Demo Form</title>
        <style>
          body { font-family: Arial; padding: 50px; }
          input { display: block; margin: 10px 0; padding: 8px; width: 300px; }
          button { padding: 10px 20px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Demo Registration Form</h1>
        <input id="name" type="text" placeholder="Name" />
        <input id="email" type="email" placeholder="Email" />
        <input id="password" type="password" placeholder="Password" />
        <input id="phone" type="tel" placeholder="Phone" />
        <button id="submit">Submit</button>
      </body>
    </html>
  `);

  console.log('Filling form with realistic human behavior...');

  // Fill form with human behavior
  await humanFillForm(
    page,
    {
      '#name': 'Max Müller',
      '#email': 'max.mueller@example.de',
      '#password': 'SecurePass123!',
      '#phone': '+49 30 12345678',
    },
    biometricProfile
  );

  console.log('Form filled successfully!');

  // Click submit button
  await humanClick(page, '#submit', biometricProfile);

  console.log('Browser will stay open for 20 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 20000));

  await browserInstance.close();
}

/**
 * Example 3: Reading and Exploring Page Like Human
 */
async function example3_HumanPageExploration() {
  console.log('\n=== Example 3: Human Page Exploration ===\n');

  const undetect = new UndetectBrowser({ logLevel: 'info' });
  const browserInstance = await undetect.launch({ headless: false });
  const page = await browserInstance.newPage();

  // Use UK fingerprint
  const fingerprint = generateConsistentFingerprint('GB', 'uk-user-123');
  await applyConsistentFingerprint(page, fingerprint);

  const biometricProfile = generateBiometricProfile('uk-user-123');

  // Navigate to a content-heavy page
  await page.goto('https://en.wikipedia.org/wiki/Web_scraping', {
    waitUntil: 'networkidle2',
  });

  console.log('Page loaded. Starting human-like exploration...');

  // Read the page like a human (scrolls, pauses, etc.)
  console.log('Reading page content...');
  await humanReadPage(page, biometricProfile);

  console.log('Exploring interactive elements...');
  // Explore the page (hover over links, buttons, etc.)
  await humanExplorePage(page, biometricProfile);

  // Scroll back to top with natural behavior
  console.log('Scrolling back to top...');
  for (let i = 0; i < 3; i++) {
    await humanScroll(page, 'up', 500, biometricProfile);
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
  }

  console.log('Exploration complete!');
  console.log('Browser will stay open for 20 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 20000));

  await browserInstance.close();
}

/**
 * Example 4: Multi-Country Proxy Rotation with Consistent Fingerprints
 */
async function example4_ProxyRotationWithConsistency() {
  console.log('\n=== Example 4: Proxy Rotation with Consistent Fingerprints ===\n');

  const undetect = new UndetectBrowser({ logLevel: 'info' });

  // Simulate different proxy countries
  const countries = ['US', 'GB', 'DE', 'FR', 'JP'];

  for (const country of countries) {
    console.log(`\n--- Testing with ${country} proxy ---`);

    const browserInstance = await undetect.launch({ headless: false });
    const page = await browserInstance.newPage();

    // Generate consistent fingerprint for this country
    const fingerprint = generateConsistentFingerprint(country, `user-${country.toLowerCase()}`);

    console.log(`Fingerprint for ${country}:`);
    console.log('  Timezone:', fingerprint.timezone);
    console.log('  Locale:', fingerprint.locale);
    console.log('  Languages:', fingerprint.languages.join(', '));

    await applyConsistentFingerprint(page, fingerprint);

    // Generate biometric profile
    const biometricProfile = generateBiometricProfile(`user-${country.toLowerCase()}`);

    // Test on a fingerprinting test site
    await page.goto('https://www.whatismybrowser.com/', {
      waitUntil: 'networkidle2',
    });

    // Read page briefly
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Scroll a bit
    await humanScroll(page, 'down', 400, biometricProfile);

    console.log(`${country} test complete`);

    await browserInstance.close();

    // Delay between countries
    if (country !== countries[countries.length - 1]) {
      console.log('Waiting before next country...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log('\n=== All proxy rotation tests complete! ===');
}

/**
 * Example 5: E-commerce Scenario with Complete Realism
 */
async function example5_EcommerceScenario() {
  console.log('\n=== Example 5: E-commerce Scenario ===\n');

  const undetect = new UndetectBrowser({ logLevel: 'info' });
  const browserInstance = await undetect.launch({ headless: false });
  const page = await browserInstance.newPage();

  // Use US fingerprint (common for e-commerce)
  const fingerprint = generateConsistentFingerprint('US', 'shopper-001');
  await applyConsistentFingerprint(page, fingerprint);

  const biometricProfile = generateBiometricProfile('shopper-001');

  // Navigate to Amazon
  await page.goto('https://www.amazon.com', { waitUntil: 'networkidle2' });

  console.log('Starting realistic shopping behavior...');

  // Human reads homepage
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 2000));

  // Scroll to explore products
  await humanScroll(page, 'down', 600, biometricProfile);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Look for search box and type
  try {
    const searchBox = await page.$('#twotabsearchtextbox');
    if (searchBox) {
      await humanClick(page, '#twotabsearchtextbox', biometricProfile);
      await humanType(page, '#twotabsearchtextbox', 'wireless headphones', biometricProfile);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Click search button
      const searchButton = await page.$('#nav-search-submit-button');
      if (searchButton) {
        await humanClick(page, '#nav-search-submit-button', biometricProfile);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log('Search results loaded');

        // Browse results like a human
        await humanScroll(page, 'down', 800, biometricProfile);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Explore products
        await humanExplorePage(page, biometricProfile);

        console.log('Shopping behavior simulation complete!');
      }
    }
  } catch (error) {
    console.log('Note: Amazon layout may vary, but behavior was realistic');
  }

  console.log('Browser will stay open for 30 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 30000));

  await browserInstance.close();
}

/**
 * Main function - run all examples
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Realistic Human Simulation Examples                    ║');
  console.log('║   UndetectBrowser v2.0                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Run examples one by one
  // Comment out examples you don't want to run

  try {
    // await example1_BasicRealisticBrowser();
    // await example2_RealisticFormFilling();
    // await example3_HumanPageExploration();
    // await example4_ProxyRotationWithConsistency();
    await example5_EcommerceScenario();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
