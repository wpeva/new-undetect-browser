import { UndetectBrowser, LogLevel } from '../src/index';

/**
 * Profile Management Example
 * Demonstrates how to create, save, and reuse browser profiles
 */
async function main() {
  console.log('🔐 Profile Management Example\n');

  const undetect = new UndetectBrowser({
    stealth: { level: 'advanced' },
    storage: {
      type: 'file',
      path: './profiles',
    },
    logLevel: LogLevel.INFO,
  });

  // ========================================
  // Example 1: Create a new profile
  // ========================================
  console.log('📝 Creating new profile...');
  const profileId = await undetect.createProfile({
    name: 'My Test Profile',
    timezone: 'America/New_York',
    locale: 'en-US',
    geolocation: {
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 100,
    },
  });

  console.log('✅ Profile created:', profileId);

  // ========================================
  // Example 2: Use the profile
  // ========================================
  console.log('\n🚀 Launching browser with profile...');
  const browser = await undetect.launch({
    profileId,
    headless: false,
  });

  const page = await browser.newPage();

  // Navigate and set some cookies/storage
  console.log('📄 Navigating to example.com...');
  await page.goto('https://example.com');

  // Set some localStorage data
  await page.evaluate(() => {
    localStorage.setItem('myKey', 'myValue');
    localStorage.setItem('timestamp', Date.now().toString());
  });

  console.log('✅ Set localStorage data');

  // Set a cookie
  await page.setCookie({
    name: 'test_cookie',
    value: 'test_value',
    domain: 'example.com',
  });

  console.log('✅ Set cookie');

  // Wait a bit
  await page.waitForTimeout(3000);

  // Close and save profile
  console.log('\n💾 Saving and closing browser...');
  await browser.close(); // This automatically saves the profile

  console.log('✅ Profile saved');

  // ========================================
  // Example 3: Reuse the profile
  // ========================================
  console.log('\n🔄 Launching browser with saved profile...');
  const browser2 = await undetect.launch({
    profileId,
    headless: false,
  });

  const page2 = await browser2.newPage();

  await page2.goto('https://example.com');

  // Check if localStorage was restored
  const storedData = await page2.evaluate(() => {
    return {
      myKey: localStorage.getItem('myKey'),
      timestamp: localStorage.getItem('timestamp'),
    };
  });

  console.log('📦 Restored localStorage:', storedData);

  // Check if cookies were restored
  const cookies = await page2.cookies();
  console.log('🍪 Restored cookies:', cookies.length);

  await page2.waitForTimeout(3000);

  await browser2.close();

  // ========================================
  // Example 4: List all profiles
  // ========================================
  console.log('\n📋 Listing all profiles...');
  const profiles = await undetect.listProfiles();
  console.log('Profiles:', profiles);

  // ========================================
  // Example 5: Load profile data
  // ========================================
  console.log('\n🔍 Loading profile data...');
  const profileData = await undetect.loadProfile(profileId);
  if (profileData) {
    console.log('Profile details:');
    console.log('  - ID:', profileData.id);
    console.log('  - Name:', profileData.name);
    console.log('  - Timezone:', profileData.timezone);
    console.log('  - Locale:', profileData.locale);
    console.log('  - Created:', profileData.createdAt);
    console.log('  - Last used:', profileData.lastUsed);
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
