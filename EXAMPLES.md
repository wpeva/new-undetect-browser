# Examples - UndetectBrowser Code Examples

This document provides an overview of all available code examples and how to use them.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Available Examples](#available-examples)
- [Running Examples](#running-examples)
- [Example Categories](#example-categories)
  - [Basic Usage](#basic-usage)
  - [Profile Management](#profile-management)
  - [Human Behavior Simulation](#human-behavior-simulation)
  - [Detection Testing](#detection-testing)
  - [Advanced Features](#advanced-features)
  - [Performance Optimization](#performance-optimization)

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Run an Example

```bash
# Using ts-node
npx ts-node examples/quick-start-realistic.ts

# Using compiled JavaScript
node dist/examples/quick-start-realistic.js
```

---

## Available Examples

| Example | File | Description | Difficulty |
|---------|------|-------------|------------|
| Quick Start | `quick-start-realistic.ts` | Best starting point, 6 usage scenarios | Beginner |
| Basic Usage | `basic-usage.ts` | Simple browser launch and navigation | Beginner |
| Profile Management | `profile-management.ts` | Create, save, load profiles | Beginner |
| Behavioral | `behavioral-example.ts` | Human-like behavior basics | Intermediate |
| Detection Test | `detection-test.ts` | Test against detection services | Intermediate |
| Realistic Human | `realistic-human-simulation.ts` | Advanced human simulation | Intermediate |
| Proxy Integration | `proxy-fingerprint-integration.ts` | Proxy with fingerprint matching | Intermediate |
| Paranoid Mode | `paranoid-mode.ts` | Maximum stealth configuration | Advanced |
| Ultimate Stealth | `ultimate-stealth-example.ts` | Full stealth setup | Advanced |
| Multilogin Level | `multilogin-level-example.ts` | Professional anti-detect setup | Advanced |
| ML Profiles | `ml-profile-generator.ts` | Machine learning fingerprints | Advanced |
| Performance | `performance-optimization-example.ts` | Optimization techniques | Advanced |
| Adaptive Detection | `adaptive-detection-example.ts` | Dynamic detection handling | Expert |
| Ultra Realistic | `ultra-realistic-behavior-example.ts` | Maximum realism | Expert |

---

## Running Examples

### Method 1: ts-node (Development)

```bash
npx ts-node examples/quick-start-realistic.ts
```

### Method 2: Compiled (Production)

```bash
npm run build
node dist/examples/quick-start-realistic.js
```

### Method 3: npm script

```bash
# Add to package.json scripts
"example:quick": "ts-node examples/quick-start-realistic.ts"

# Then run
npm run example:quick
```

---

## Example Categories

### Basic Usage

#### `basic-usage.ts` - Simple Browser Launch

The simplest way to get started:

```typescript
import { UndetectBrowser } from '../src';

async function main() {
  // Create browser with stealth mode
  const browser = new UndetectBrowser({
    stealth: true,
    headless: false
  });

  // Launch browser
  await browser.launch();

  // Create new page
  const page = await browser.newPage();

  // Navigate to website
  await page.goto('https://example.com');

  // Take screenshot
  await page.screenshot({ path: 'screenshot.png' });

  // Close browser
  await browser.close();
}

main();
```

**Use case**: Learning the basics, simple scraping tasks.

---

#### `quick-start-realistic.ts` - Recommended Starting Point

The best example to start with - covers 6 common scenarios:

```typescript
import { createRealisticBrowser } from '../src/core/realistic-browser-factory';

async function main() {
  // Scenario 1: Quick anonymous browsing
  const browser1 = await createRealisticBrowser();

  // Scenario 2: With specific country
  const browser2 = await createRealisticBrowser({
    country: 'US',
    os: 'windows'
  });

  // Scenario 3: With proxy
  const browser3 = await createRealisticBrowser({
    proxy: { host: 'proxy.com', port: 8080 }
  });

  // Scenario 4: Persistent profile
  const browser4 = await createRealisticBrowser({
    profileName: 'my-profile',
    persistent: true
  });

  // Scenario 5: Maximum stealth
  const browser5 = await createRealisticBrowser({
    stealthLevel: 'paranoid'
  });

  // Scenario 6: E-commerce use case
  const browser6 = await createRealisticBrowser({
    useCase: 'ecommerce',
    country: 'US'
  });
}

main();
```

**Use case**: Most common scenarios, production-ready code.

---

### Profile Management

#### `profile-management.ts` - Profile CRUD Operations

```typescript
import { UndetectBrowser } from '../src';

async function main() {
  const browser = new UndetectBrowser();

  // Create new profile
  const profile = await browser.createProfile({
    name: 'Shopping Profile',
    os: 'windows',
    browser: 'chrome',
    language: 'en-US',
    timezone: 'America/New_York'
  });

  console.log('Created profile:', profile.id);

  // Launch with profile
  await browser.launch();
  const page = await browser.newPage();

  // Do some browsing...
  await page.goto('https://amazon.com');

  // Save profile (cookies, storage, etc.)
  await browser.saveProfile();

  // Close browser
  await browser.close();

  // Later: Load saved profile
  const browser2 = new UndetectBrowser();
  await browser2.loadProfile(profile.id);
  await browser2.launch();

  // Cookies and session restored!
  const page2 = await browser2.newPage();
  await page2.goto('https://amazon.com');
  // User is still logged in

  // List all profiles
  const profiles = await browser2.listProfiles();
  console.log('All profiles:', profiles);

  // Delete profile
  await browser2.deleteProfile(profile.id);
}

main();
```

**Use case**: Multi-account management, session persistence.

---

### Human Behavior Simulation

#### `behavioral-example.ts` - Basic Human Behavior

```typescript
import { UndetectBrowser } from '../src';

async function main() {
  const browser = new UndetectBrowser({ stealth: true });
  await browser.launch();
  const page = await browser.newPage();

  await page.goto('https://example.com/login');

  // Human-like typing with variable speed
  await page.humanType('#email', 'user@example.com');

  // Random delay between actions
  await page.humanDelay(500, 1500);

  await page.humanType('#password', 'secretpassword');

  // Human-like click with mouse movement
  await page.humanClick('#login-button');

  // Wait for navigation
  await page.waitForNavigation();

  await browser.close();
}

main();
```

**Use case**: Form filling, login automation.

---

#### `realistic-human-simulation.ts` - Advanced Human Behavior

```typescript
import { UndetectBrowser } from '../src';
import { RealisticHumanBehavior } from '../src/modules/realistic-human-behavior';

async function main() {
  const browser = new UndetectBrowser({ stealth: true });
  await browser.launch();
  const page = await browser.newPage();

  const human = new RealisticHumanBehavior(page);

  await page.goto('https://news-website.com');

  // Simulate reading an article
  await human.simulateReading({
    duration: 60000,           // 1 minute
    scrollProbability: 0.7,    // 70% chance to scroll
    pauseOnImages: true,       // Pause when images are visible
    readingSpeed: 'normal'     // slow, normal, fast
  });

  // Simulate exploring the page
  await human.simulateExploration({
    clicks: 5,                 // Click on 5 elements
    scrolls: 10,               // Scroll 10 times
    duration: 120000           // Over 2 minutes
  });

  // Fill a complex form realistically
  await human.fillFormRealistic({
    '#name': 'John Smith',
    '#email': 'john@example.com',
    '#phone': '+1-555-123-4567',
    '#message': 'Hello, I am interested in your product...'
  });

  await browser.close();
}

main();
```

**Use case**: Long browsing sessions, content interaction.

---

#### `ultra-realistic-behavior-example.ts` - Maximum Realism

```typescript
import { UndetectBrowser } from '../src';
import { AdvancedBehavioralSimulator } from '../src/modules/advanced-behavioral-simulator';
import { BiometricProfiler } from '../src/modules/biometric-profiler';

async function main() {
  const browser = new UndetectBrowser({ stealthMode: 'paranoid' });
  await browser.launch();
  const page = await browser.newPage();

  // Generate unique biometric profile
  const biometrics = new BiometricProfiler();
  const profile = biometrics.generateProfile({
    typingStyle: 'hunt-and-peck',  // or 'touch-typing'
    mouseAccuracy: 0.85,
    reactionTime: 250              // ms
  });

  const simulator = new AdvancedBehavioralSimulator(page, profile);

  await page.goto('https://protected-website.com');

  // Ultra-realistic mouse movement with tremor
  await simulator.moveMouseRealistic({
    to: { x: 500, y: 300 },
    addTremor: true,
    addDrift: true,
    speed: 'human'
  });

  // Typing with personal rhythm
  await simulator.typeWithPersonality('#input', 'Hello World', {
    typos: true,           // Make and correct typos
    pauses: true,          // Pause to "think"
    rhythm: profile.typingRhythm
  });

  await browser.close();
}

main();
```

**Use case**: High-security websites, bot detection bypass.

---

### Detection Testing

#### `detection-test.ts` - Basic Detection Testing

```typescript
import { UndetectBrowser } from '../src';

async function testDetection() {
  const browser = new UndetectBrowser({
    stealth: true,
    stealthMode: 'advanced'
  });

  await browser.launch();
  const page = await browser.newPage();

  const testSites = [
    'https://bot.sannysoft.com',
    'https://pixelscan.net',
    'https://arh.antoinevastel.com/bots/areyouheadless',
    'https://abrahamjuliot.github.io/creepjs/'
  ];

  for (const site of testSites) {
    console.log(`Testing: ${site}`);

    await page.goto(site, { waitUntil: 'networkidle2' });

    // Wait for tests to complete
    await page.waitForTimeout(5000);

    // Take screenshot
    const filename = site.replace(/[^a-z]/gi, '') + '.png';
    await page.screenshot({ path: `screenshots/${filename}` });

    console.log(`Screenshot saved: ${filename}`);
  }

  await browser.close();
}

testDetection();
```

**Use case**: Verify stealth configuration is working.

---

#### `detection-test-example.ts` - Comprehensive Detection Analysis

```typescript
import { UndetectBrowser } from '../src';
import { DetectionScoreCalculator } from '../src/core/detection-score';

async function comprehensiveTest() {
  const browser = new UndetectBrowser({ stealthMode: 'paranoid' });
  await browser.launch();
  const page = await browser.newPage();

  const calculator = new DetectionScoreCalculator(page);

  // Run all detection tests
  const results = await calculator.runAllTests();

  console.log('\n=== Detection Test Results ===\n');

  console.log('WebDriver:', results.webdriver ? 'PASS' : 'FAIL');
  console.log('Headless:', results.headless ? 'PASS' : 'FAIL');
  console.log('Chrome:', results.chrome ? 'PASS' : 'FAIL');
  console.log('Permissions:', results.permissions ? 'PASS' : 'FAIL');
  console.log('Plugins:', results.plugins ? 'PASS' : 'FAIL');
  console.log('Languages:', results.languages ? 'PASS' : 'FAIL');
  console.log('WebGL:', results.webgl ? 'PASS' : 'FAIL');
  console.log('Canvas:', results.canvas ? 'PASS' : 'FAIL');

  console.log('\n=== Overall Score ===');
  console.log(`Detection Score: ${results.score}/10`);

  await browser.close();
}

comprehensiveTest();
```

**Use case**: Detailed analysis of detection vulnerabilities.

---

### Advanced Features

#### `proxy-fingerprint-integration.ts` - Proxy with Matching Fingerprint

```typescript
import { createRealisticBrowser } from '../src/core/realistic-browser-factory';
import { ProxyManager } from '../src/core/proxy-manager';

async function main() {
  const proxyManager = new ProxyManager();

  // Add proxies with location info
  await proxyManager.addProxies([
    { host: 'us-proxy.com', port: 8080, country: 'US' },
    { host: 'uk-proxy.com', port: 8080, country: 'GB' },
    { host: 'de-proxy.com', port: 8080, country: 'DE' }
  ]);

  // Get US proxy
  const usProxy = await proxyManager.getByCountry('US');

  // Create browser with matching fingerprint
  // Automatically sets US timezone, language, etc.
  const browser = await createRealisticBrowser({
    proxy: usProxy,
    matchFingerprintToProxy: true  // Auto-match!
  });

  const page = await browser.newPage();
  await page.goto('https://whatismyipaddress.com');

  // Verify location matches
  await page.screenshot({ path: 'location-check.png' });

  await browser.close();
}

main();
```

**Use case**: Geo-targeted browsing, location-based testing.

---

#### `paranoid-mode.ts` - Maximum Stealth Configuration

```typescript
import { UndetectBrowser } from '../src';

async function main() {
  const browser = new UndetectBrowser({
    stealth: true,
    stealthMode: 'paranoid',

    // Enable ALL protection modules
    evasions: {
      webdriver: true,
      chrome: true,
      permissions: true,
      plugins: true,
      languages: true,
      webgl: true,
      canvas: true,
      audio: true,
      fonts: true,
      webrtc: true,
      hardware: true,
      headless: true,
      automation: true,
      clientRects: true,
      speechSynthesis: true,
      mediaCodecs: true,
      webgl2: true,
      performanceApi: true,
      deviceOrientation: true,
      bluetooth: true,
      webauthn: true
    },

    // Additional paranoid settings
    viewport: { width: 1920, height: 1080 },
    userAgent: 'realistic',  // Auto-generate realistic UA
    timezone: 'America/New_York',
    locale: 'en-US',

    // Human behavior
    humanBehavior: {
      enabled: true,
      mouseMovement: true,
      typingVariance: true,
      scrollBehavior: 'natural'
    }
  });

  await browser.launch();
  const page = await browser.newPage();

  // Now browsing with maximum protection
  await page.goto('https://highly-protected-site.com');

  await browser.close();
}

main();
```

**Use case**: Highest security requirements, advanced bot detection.

---

#### `multilogin-level-example.ts` - Professional Anti-Detect Setup

```typescript
import { UndetectBrowser } from '../src';
import { ConsistentFingerprint } from '../src/modules/consistent-fingerprint';
import { AdvancedProfileManager } from '../src/core/advanced-profile-manager';

async function main() {
  const profileManager = new AdvancedProfileManager();
  const fingerprintGen = new ConsistentFingerprint();

  // Generate country-specific fingerprint
  const fingerprint = fingerprintGen.generateForCountry('US', {
    os: 'windows',
    browser: 'chrome',
    deviceType: 'desktop'
  });

  // Create professional profile
  const profile = await profileManager.createAdvancedProfile({
    name: 'US Business Account',
    fingerprint: fingerprint,

    // Proxy configuration
    proxy: {
      type: 'residential',
      host: 'us-residential.proxy.com',
      port: 8080,
      rotationType: 'sticky',
      stickyDuration: 3600000  // 1 hour
    },

    // Cookie management
    cookies: {
      persistence: true,
      encryption: true,
      isolation: 'strict'
    },

    // Start URLs (warm-up)
    warmupUrls: [
      'https://google.com',
      'https://youtube.com',
      'https://facebook.com'
    ]
  });

  // Launch with profile
  const browser = new UndetectBrowser();
  await browser.loadProfile(profile.id);
  await browser.launch();

  // Warm-up browsing
  const page = await browser.newPage();
  for (const url of profile.warmupUrls) {
    await page.goto(url);
    await page.humanDelay(5000, 15000);
    await page.simulateReading({ duration: 30000 });
  }

  // Now ready for main task
  await page.goto('https://target-site.com');

  // Save session for later use
  await browser.saveProfile();
  await browser.close();
}

main();
```

**Use case**: Professional multi-account management, e-commerce.

---

#### `ml-profile-generator.ts` - Machine Learning Fingerprints

```typescript
import { MLProfileGenerator } from '../src/ml-profiles/generator';

async function main() {
  const generator = new MLProfileGenerator();

  // Load real browser distribution data
  await generator.loadDistributions();

  // Generate statistically accurate profile
  const profile = generator.generate({
    // Use real 2024 browser statistics
    useRealDistributions: true,

    // Ensure components are correlated
    // (e.g., Windows + DirectX GPU, not Windows + Metal)
    ensureCorrelation: true,

    // Target parameters
    os: 'windows',
    browserType: 'chrome',

    // Anti-correlation (ensure uniqueness)
    minDissimilarity: 0.7,
    existingProfiles: await loadExistingProfiles()
  });

  console.log('Generated Profile:');
  console.log('User Agent:', profile.userAgent);
  console.log('Screen:', profile.screen);
  console.log('WebGL Vendor:', profile.webgl.vendor);
  console.log('WebGL Renderer:', profile.webgl.renderer);
  console.log('Timezone:', profile.timezone);
  console.log('Languages:', profile.languages);

  // Use in browser
  const browser = new UndetectBrowser({
    fingerprint: profile
  });

  await browser.launch();
}

main();
```

**Use case**: Large-scale profile generation, bot farms.

---

### Performance Optimization

#### `performance-optimization-example.ts` - Optimized Configuration

```typescript
import { UndetectBrowser } from '../src';
import { BrowserPool } from '../src/optimization/browser-pool';
import { CacheManager } from '../src/optimization/cache';

async function main() {
  // Initialize browser pool for fast launches
  const pool = new BrowserPool({
    size: 5,           // Keep 5 browsers ready
    warmup: true,      // Pre-launch on init
    maxAge: 3600000    // Recycle after 1 hour
  });

  await pool.initialize();

  // Initialize multi-level cache
  const cache = new CacheManager({
    l1: { type: 'memory', size: 100 },
    l2: { type: 'redis', host: 'localhost' },
    l3: { type: 'disk', path: './cache' }
  });

  // Get browser from pool (70ms vs 2000ms cold start)
  const browser = await pool.acquire();

  try {
    const page = await browser.newPage();

    // Enable request caching
    await page.setRequestInterception(true);
    page.on('request', async (req) => {
      const cached = await cache.get(req.url());
      if (cached) {
        await req.respond(cached);
      } else {
        req.continue();
      }
    });

    await page.goto('https://example.com');

    // ... do work ...

  } finally {
    // Return browser to pool (not close)
    await pool.release(browser);
  }

  // Cleanup
  await pool.shutdown();
}

main();
```

**Use case**: High-throughput scraping, API services.

---

## Common Patterns

### Error Handling

```typescript
import { UndetectBrowser } from '../src';

async function safeExample() {
  const browser = new UndetectBrowser({ stealth: true });

  try {
    await browser.launch();
    const page = await browser.newPage();

    await page.goto('https://example.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.error('Page load timeout');
    } else if (error.message.includes('net::ERR')) {
      console.error('Network error:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  } finally {
    await browser.close();
  }
}
```

### Retry Logic

```typescript
async function withRetry(fn: () => Promise<void>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fn();
      return;
    } catch (error) {
      console.log(`Attempt ${i + 1} failed:`, error.message);
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
await withRetry(async () => {
  await page.goto('https://flaky-site.com');
});
```

### Parallel Execution

```typescript
async function parallelScraping(urls: string[]) {
  const browsers = await Promise.all(
    urls.map(() => UndetectBrowser.launch({ stealth: true }))
  );

  const results = await Promise.all(
    browsers.map(async (browser, i) => {
      const page = await browser.newPage();
      await page.goto(urls[i]);
      const title = await page.title();
      await browser.close();
      return { url: urls[i], title };
    })
  );

  return results;
}
```

---

## Next Steps

1. Start with `quick-start-realistic.ts`
2. Progress to `behavioral-example.ts`
3. Try `detection-test.ts` to verify your setup
4. Explore advanced examples as needed

For more information:
- [USER_GUIDE.md](USER_GUIDE.md) - Complete user guide
- [FAQ.md](FAQ.md) - Frequently asked questions
- [docs/API.md](docs/API.md) - API reference

---

**Happy Coding!**
