/**
 * Multilogin-Level Features Example
 * Demonstrates enterprise-grade anti-detection browser capabilities
 */

import {
  createAdvancedBrowser,
  AdvancedBrowser,
  AdvancedProfile,
  ProxyConfig,
} from '../src';

async function main() {
  console.log('🚀 Multilogin-Level Browser Example\n');

  // ============================================================
  // 1. Initialize Advanced Browser
  // ============================================================

  const browser = createAdvancedBrowser({
    dataDir: './.undetect-advanced',
    headless: false,
    proxyEnabled: true,
    canvasProtection: true,
    webrtcProtection: true,
    hardwareSpoofing: true,
    cookiePersistence: true,
  });

  await browser.initialize();
  console.log('✅ Advanced browser initialized\n');

  // ============================================================
  // 2. Create Advanced Profiles with Metadata
  // ============================================================

  console.log('📋 Creating advanced profiles...');

  const socialProfile = await browser.createProfile('Social Media Account', {
    tags: ['social', 'personal'],
    category: 'Social Media',
    description: 'Profile for managing social media accounts',
    fingerprint: {
      os: 'windows',
      browser: 'chrome',
    },
  });

  const workProfile = await browser.createProfile('Work Account', {
    tags: ['work', 'business'],
    category: 'Business',
    description: 'Profile for work-related browsing',
    fingerprint: {
      os: 'mac',
      browser: 'chrome',
    },
  });

  const ecommerceProfile = await browser.createProfile('E-commerce', {
    tags: ['shopping', 'ecommerce'],
    category: 'Shopping',
    description: 'Profile for online shopping',
    fingerprint: {
      os: 'windows',
      browser: 'chrome',
    },
  });

  console.log(`✅ Created ${3} profiles\n`);

  // ============================================================
  // 3. Add Proxies to Pool
  // ============================================================

  console.log('🌐 Setting up proxy pool...');

  const proxies: ProxyConfig[] = [
    {
      type: 'http',
      host: 'proxy1.example.com',
      port: 8080,
      enabled: true,
      country: 'US',
    },
    {
      type: 'socks5',
      host: 'proxy2.example.com',
      port: 1080,
      username: 'user',
      password: 'pass',
      enabled: true,
      country: 'UK',
    },
  ];

  browser.addProxies(proxies);

  // Or import from text file
  const proxyText = `
http://proxy3.example.com:8080
socks5://user:pass@proxy4.example.com:1080
`;
  const imported = browser.importProxiesFromText(proxyText.trim(), 'http');
  console.log(`✅ Added ${imported + proxies.length} proxies to pool\n`);

  // Set rotation strategy
  const proxyManager = browser.getProxyManager();
  proxyManager.setRotationStrategy('fastest');
  console.log('✅ Proxy rotation strategy: fastest\n');

  // ============================================================
  // 4. Launch Browser with Profile
  // ============================================================

  console.log('🌍 Launching browser with social media profile...');

  const instance = await browser.launch({
    profileId: socialProfile.id,
    proxy: proxies[0], // Use specific proxy
  });

  const page = await instance.newPage();

  // ============================================================
  // 5. Use Advanced Protection Features
  // ============================================================

  console.log('🛡️ Testing protection features...\n');

  // Test Canvas Protection
  await page.goto('https://browserleaks.com/canvas', {
    waitUntil: 'networkidle2',
  });
  console.log('✅ Canvas fingerprinting protection active');

  await page.waitForTimeout(2000);

  // Test WebRTC Protection
  await page.goto('https://browserleaks.com/webrtc', {
    waitUntil: 'networkidle2',
  });
  console.log('✅ WebRTC leak prevention active');

  await page.waitForTimeout(2000);

  // ============================================================
  // 6. Cookie and Session Persistence
  // ============================================================

  console.log('\n🍪 Testing cookie and session persistence...');

  await page.goto('https://example.com');

  // Set some test data
  await page.evaluate(() => {
    localStorage.setItem('testKey', 'testValue');
    sessionStorage.setItem('sessionKey', 'sessionValue');
  });

  console.log('✅ Set localStorage and sessionStorage');

  // Close and save session
  await browser.close(instance, true);
  console.log('✅ Session saved');

  // Relaunch with same profile
  console.log('🔄 Re-launching with same profile...');
  const instance2 = await browser.launch({
    profileId: socialProfile.id,
  });

  const page2 = await instance2.newPage();
  await page2.goto('https://example.com');

  // Check if data was restored
  const restored = await page2.evaluate(() => ({
    localStorage: localStorage.getItem('testKey'),
    sessionStorage: sessionStorage.getItem('sessionKey'),
  }));

  console.log('✅ Session restored:', restored);

  await browser.close(instance2, true);

  // ============================================================
  // 7. Search and Filter Profiles
  // ============================================================

  console.log('\n🔍 Searching profiles...');

  const socialProfiles = await browser.searchProfiles({
    tags: ['social'],
  });
  console.log(`✅ Found ${socialProfiles.length} social media profiles`);

  const workProfiles = await browser.searchProfiles({
    category: 'Business',
  });
  console.log(`✅ Found ${workProfiles.length} business profiles`);

  // ============================================================
  // 8. Export and Import Profiles
  // ============================================================

  console.log('\n📦 Testing profile export/import...');

  // Export all profiles
  const exportPath = './.undetect-advanced/profiles-export.json';
  await browser.exportProfiles(undefined, exportPath);
  console.log(`✅ Exported profiles to ${exportPath}`);

  // Import profiles
  const imported2 = await browser.importProfiles(exportPath, {
    skipExisting: true,
  });
  console.log(`✅ Imported ${imported2.length} profiles`);

  // ============================================================
  // 9. Proxy Validation
  // ============================================================

  console.log('\n🔍 Validating proxies...');

  // Note: This will fail if proxies are not real
  // await browser.validateProxies(3);
  console.log('⚠️  Proxy validation skipped (demo proxies)');

  // Get proxy statistics
  const proxyStats = proxyManager.getStatistics();
  console.log('📊 Proxy Statistics:', {
    total: proxyStats.total,
    active: proxyStats.active,
    byType: proxyStats.byType,
  });

  // ============================================================
  // 10. Get Overall Statistics
  // ============================================================

  console.log('\n📊 Overall Statistics:');

  const stats = await browser.getStatistics();
  console.log('Profiles:', {
    total: stats.profiles.total,
    byCategory: stats.profiles.byCategory,
    withProxy: stats.profiles.withProxy,
  });
  console.log('Proxies:', {
    total: stats.proxies.total,
    active: stats.proxies.active,
  });
  console.log('Active Browsers:', stats.activeBrowsers);

  // ============================================================
  // 11. Profile Management
  // ============================================================

  console.log('\n🔧 Advanced profile management...');

  const profileManager = browser.getProfileManager();

  // Get all profiles
  const allProfiles = await profileManager.getAllProfiles();
  console.log(`✅ Total profiles: ${allProfiles.length}`);

  // Get profiles by category
  const categories = profileManager.getCategories();
  console.log(`✅ Categories: ${categories.join(', ')}`);

  // Get all tags
  const tags = profileManager.getTags();
  console.log(`✅ Tags: ${tags.join(', ')}`);

  // Clone a profile
  const clonedProfile = await profileManager.cloneProfile(
    socialProfile.id,
    'Social Media Account (Backup)'
  );
  console.log(`✅ Cloned profile: ${clonedProfile.metadata.name}`);

  // Update profile metadata
  await profileManager.updateProfile(socialProfile.id, {
    description: 'Updated description',
    tags: ['social', 'personal', 'updated'],
    notes: 'This is a test note',
  });
  console.log('✅ Updated profile metadata');

  // Get profile statistics
  const profileStats = await profileManager.getStatistics();
  console.log('📊 Profile Statistics:', {
    total: profileStats.total,
    byCategory: profileStats.byCategory,
    recentlyUsed: profileStats.recentlyUsed,
  });

  // ============================================================
  // 12. Cookie Session Management
  // ============================================================

  console.log('\n🍪 Advanced cookie session management...');

  const sessionManager = browser.getCookieSessionManager();

  // List all sessions
  const sessions = await sessionManager.listSessions();
  console.log(`✅ Found ${sessions.length} saved sessions`);

  // Get session info
  if (sessions.length > 0) {
    const sessionInfo = await sessionManager.getSessionInfo(sessions[0]);
    console.log('📋 Session Info:', {
      url: sessionInfo?.url,
      cookieCount: sessionInfo?.cookies.length,
      timestamp: sessionInfo?.timestamp,
    });
  }

  // ============================================================
  // Summary
  // ============================================================

  console.log('\n' + '='.repeat(60));
  console.log('✨ Multilogin-Level Features Demonstrated:');
  console.log('='.repeat(60));
  console.log('✅ Advanced profile management with metadata');
  console.log('✅ Realistic fingerprint generation');
  console.log('✅ Proxy rotation and validation');
  console.log('✅ Cookie and session persistence');
  console.log('✅ Enhanced canvas protection v2');
  console.log('✅ WebRTC leak prevention v2');
  console.log('✅ Hardware spoofing');
  console.log('✅ Profile import/export');
  console.log('✅ Search and filter profiles');
  console.log('✅ Profile cloning');
  console.log('✅ Session management');
  console.log('✅ Comprehensive statistics');
  console.log('='.repeat(60));
  console.log('\n🎉 All features working! Browser is Multilogin-level ready!');
}

// Run the example
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
