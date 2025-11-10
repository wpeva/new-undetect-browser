/**
 * Proxy-Fingerprint Integration Example
 *
 * This example demonstrates how to integrate proxy management with
 * consistent fingerprinting to ensure all browser data matches the
 * proxy's geolocation.
 *
 * Key Features:
 * - Automatic country detection from proxy
 * - Fingerprint generation based on proxy location
 * - Complete consistency between proxy and browser fingerprint
 */

import { UndetectBrowser } from '../src/index';
import { ProxyManager, ProxyConfig } from '../src/core/proxy-manager';
import {
  generateConsistentFingerprint,
  applyConsistentFingerprint,
  ConsistentFingerprint,
} from '../src/modules/consistent-fingerprint';
import {
  generateBiometricProfile,
  humanType,
  humanClick,
  humanScroll,
  BiometricProfile,
} from '../src/modules/realistic-human-behavior';

/**
 * Detect country from proxy (mock implementation)
 * In production, you would use a GeoIP service or proxy provider API
 */
async function detectProxyCountry(proxy: ProxyConfig): Promise<string> {
  // Mock implementation - in reality you would:
  // 1. Use a GeoIP lookup service
  // 2. Query your proxy provider's API
  // 3. Make a test request through the proxy to a geolocation API

  // For this example, we'll use common proxy IP patterns
  // In production, replace with real geolocation lookup

  console.log(`[Mock] Detecting country for proxy ${proxy.host}:${proxy.port}...`);

  // Simulate delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock country detection based on IP
  const mockCountries = ['US', 'GB', 'DE', 'FR', 'ES', 'IT', 'JP', 'AU'];
  const randomCountry = mockCountries[Math.floor(Math.random() * mockCountries.length)];

  console.log(`[Mock] Detected country: ${randomCountry}`);
  return randomCountry;
}

/**
 * Create a fully consistent browser with proxy
 */
async function createRealisticBrowserWithProxy(
  proxy: ProxyConfig,
  userId: string = 'user-001'
): Promise<{
  browserInstance: any;
  page: any;
  fingerprint: ConsistentFingerprint;
  biometricProfile: BiometricProfile;
  proxyCountry: string;
}> {
  // Step 1: Detect proxy country
  const proxyCountry = await detectProxyCountry(proxy);
  console.log(`✅ Proxy country: ${proxyCountry}`);

  // Step 2: Generate consistent fingerprint for that country
  const fingerprint = generateConsistentFingerprint(proxyCountry, userId);
  console.log(`✅ Generated fingerprint for ${proxyCountry}:`);
  console.log(`   - Timezone: ${fingerprint.timezone}`);
  console.log(`   - Locale: ${fingerprint.locale}`);
  console.log(`   - Languages: ${fingerprint.languages.join(', ')}`);

  // Step 3: Generate biometric profile
  const biometricProfile = generateBiometricProfile(userId);
  console.log(`✅ Generated biometric profile:`);
  console.log(`   - Typing: ${Math.round(biometricProfile.typingSpeed)} WPM`);
  console.log(`   - Mouse: ${Math.round(biometricProfile.mouseSpeed)} px/s`);

  // Step 4: Launch browser with proxy
  const undetect = new UndetectBrowser({ logLevel: 'info' });

  // Format proxy for Puppeteer
  const proxyServer = `${proxy.type}://${proxy.host}:${proxy.port}`;
  const args = [`--proxy-server=${proxyServer}`];

  const browserInstance = await undetect.launch({
    headless: false,
    args,
  });

  // Step 5: Create page and apply fingerprint
  const page = await browserInstance.newPage();

  // Set proxy authentication if needed
  if (proxy.username && proxy.password) {
    await page.authenticate({
      username: proxy.username,
      password: proxy.password,
    });
  }

  // Apply consistent fingerprint
  await applyConsistentFingerprint(page, fingerprint);
  console.log(`✅ Fingerprint applied to page`);

  return {
    browserInstance,
    page,
    fingerprint,
    biometricProfile,
    proxyCountry,
  };
}

/**
 * Example 1: Single Proxy with Consistent Fingerprint
 */
async function example1_SingleProxyConsistency() {
  console.log('\n=== Example 1: Single Proxy with Consistent Fingerprint ===\n');

  // Define proxy (use your own proxy here)
  const proxy: ProxyConfig = {
    type: 'http',
    host: '1.2.3.4', // Replace with real proxy
    port: 8080,
    username: 'user', // Optional
    password: 'pass', // Optional
  };

  // Create realistic browser
  const { browserInstance, page, fingerprint, biometricProfile, proxyCountry } =
    await createRealisticBrowserWithProxy(proxy, 'user-001');

  console.log('\n📊 Testing fingerprint consistency...');

  // Navigate to fingerprint testing site
  await page.goto('https://abrahamjuliot.github.io/creepjs/', {
    waitUntil: 'networkidle2',
  });

  console.log('✅ Loaded fingerprint test page');

  // Wait for page to load and analyze
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Scroll to see results
  await humanScroll(page, 'down', 1000, biometricProfile);
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('\n🎯 Fingerprint consistency check:');
  console.log(`   Expected Country: ${proxyCountry}`);
  console.log(`   Expected Timezone: ${fingerprint.timezone}`);
  console.log(`   Expected Locale: ${fingerprint.locale}`);
  console.log(`   Expected Languages: ${fingerprint.languages.join(', ')}`);

  // Keep open for inspection
  console.log('\nBrowser will stay open for 60 seconds for manual inspection...');
  await new Promise((resolve) => setTimeout(resolve, 60000));

  await browserInstance.close();
}

/**
 * Example 2: Multiple Proxies with Different Fingerprints
 */
async function example2_MultipleProxiesRotation() {
  console.log('\n=== Example 2: Multiple Proxies with Different Fingerprints ===\n');

  // Define multiple proxies from different locations
  const proxies: ProxyConfig[] = [
    { type: 'http', host: '1.2.3.4', port: 8080 }, // US proxy (mock)
    { type: 'http', host: '5.6.7.8', port: 8080 }, // UK proxy (mock)
    { type: 'http', host: '9.10.11.12', port: 8080 }, // DE proxy (mock)
  ];

  for (let i = 0; i < proxies.length; i++) {
    const proxy = proxies[i];
    console.log(`\n--- Testing Proxy ${i + 1}/${proxies.length} ---`);

    // Create browser with proxy-matched fingerprint
    const { browserInstance, page, fingerprint, biometricProfile, proxyCountry } =
      await createRealisticBrowserWithProxy(proxy, `user-${i + 1}`);

    // Test the setup
    await page.goto('https://www.whatismybrowser.com/', {
      waitUntil: 'networkidle2',
    });

    console.log(`✅ Page loaded with ${proxyCountry} fingerprint`);

    // Human-like interaction
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await humanScroll(page, 'down', 600, biometricProfile);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log(`✅ Proxy ${i + 1} test complete`);

    await browserInstance.close();

    // Delay between proxies
    if (i < proxies.length - 1) {
      console.log('Waiting before next proxy...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log('\n✅ All proxy rotation tests complete!');
}

/**
 * Example 3: ProxyManager Integration
 */
async function example3_ProxyManagerIntegration() {
  console.log('\n=== Example 3: ProxyManager Integration ===\n');

  // Initialize ProxyManager
  const proxyManager = new ProxyManager();

  // Add multiple proxies
  const proxyStrings = [
    'http://1.2.3.4:8080',
    'http://5.6.7.8:8080',
    'socks5://9.10.11.12:1080:username:password',
  ];

  console.log('Adding proxies to ProxyManager...');
  for (const proxyString of proxyStrings) {
    const proxy = await proxyManager.addProxy(proxyString);
    console.log(`✅ Added proxy: ${proxy.id}`);
  }

  // Get all proxies
  const proxies = proxyManager.getProxies();
  console.log(`\nTotal proxies available: ${proxies.length}`);

  // Use each proxy with matching fingerprint
  for (const proxy of proxies) {
    console.log(`\n--- Using proxy ${proxy.id} ---`);

    const { browserInstance, page, biometricProfile, proxyCountry } =
      await createRealisticBrowserWithProxy(proxy, `user-${proxy.id}`);

    console.log(`✅ Browser launched with ${proxyCountry} fingerprint`);

    // Test navigation
    await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle2' });

    // Get the IP address shown
    const ipData = await page.evaluate(() => document.body.innerText);
    console.log('IP Check Result:', ipData);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    await browserInstance.close();
  }

  console.log('\n✅ ProxyManager integration test complete!');
}

/**
 * Example 4: Automated Task with Proxy Rotation
 */
async function example4_AutomatedTaskWithRotation() {
  console.log('\n=== Example 4: Automated Task with Proxy Rotation ===\n');

  const searchQueries = ['web automation', 'browser fingerprinting', 'proxy rotation'];

  const proxyManager = new ProxyManager();

  // Add proxies
  await proxyManager.addProxy('http://1.2.3.4:8080');
  await proxyManager.addProxy('http://5.6.7.8:8080');

  for (let i = 0; i < searchQueries.length; i++) {
    const query = searchQueries[i];
    console.log(`\n--- Task ${i + 1}: Searching for "${query}" ---`);

    // Rotate proxy
    const proxy = await proxyManager.getNextProxy();
    if (!proxy) {
      console.log('No proxy available');
      continue;
    }

    console.log(`Using proxy: ${proxy.host}:${proxy.port}`);

    // Create browser with proxy
    const { browserInstance, page, biometricProfile } = await createRealisticBrowserWithProxy(
      proxy,
      `task-${i}`
    );

    try {
      // Navigate to Google
      await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

      // Human-like search
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await humanType(page, 'textarea[name="q"]', query, biometricProfile);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Press Enter instead of clicking button
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      console.log(`✅ Search for "${query}" completed`);

      // Brief interaction
      await humanScroll(page, 'down', 600, biometricProfile);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Error during task:`, error);
    }

    await browserInstance.close();

    // Delay between tasks
    if (i < searchQueries.length - 1) {
      const delay = 5000 + Math.random() * 5000;
      console.log(`Waiting ${Math.round(delay / 1000)}s before next task...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log('\n✅ All automated tasks complete!');
}

/**
 * Example 5: Complete E-commerce Bot with Proxy
 */
async function example5_EcommerceBotWithProxy() {
  console.log('\n=== Example 5: E-commerce Bot with Proxy ===\n');

  const proxy: ProxyConfig = {
    type: 'http',
    host: '1.2.3.4',
    port: 8080,
  };

  const { browserInstance, page, biometricProfile, proxyCountry } =
    await createRealisticBrowserWithProxy(proxy, 'shopper-premium');

  console.log(`🛒 Starting e-commerce session with ${proxyCountry} profile`);

  try {
    // Navigate to e-commerce site
    await page.goto('https://www.amazon.com', { waitUntil: 'networkidle2' });

    console.log('✅ Loaded homepage');

    // Human reads and explores
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await humanScroll(page, 'down', 800, biometricProfile);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Search for product
    const searchSelector = '#twotabsearchtextbox';
    if (await page.$(searchSelector)) {
      console.log('Searching for product...');
      await humanClick(page, searchSelector, biometricProfile);
      await humanType(page, searchSelector, 'laptop', biometricProfile);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      console.log('✅ Search results loaded');

      // Browse results
      await humanScroll(page, 'down', 1000, biometricProfile);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await humanScroll(page, 'down', 600, biometricProfile);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('✅ Browsed search results');
    }

    console.log('E-commerce session complete!');
    console.log('Browser will stay open for 30 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 30000));
  } catch (error) {
    console.error('Error during e-commerce session:', error);
  }

  await browserInstance.close();
}

/**
 * Main function
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Proxy-Fingerprint Integration Examples                 ║');
  console.log('║   UndetectBrowser v2.0                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    // Run examples (comment out the ones you don't need)
    // await example1_SingleProxyConsistency();
    // await example2_MultipleProxiesRotation();
    // await example3_ProxyManagerIntegration();
    // await example4_AutomatedTaskWithRotation();
    await example5_EcommerceBotWithProxy();

    console.log('\n✅ All examples completed!');
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
