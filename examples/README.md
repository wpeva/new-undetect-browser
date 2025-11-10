# 🎯 UndetectBrowser v2.0 - Realistic Human Simulation Examples

This directory contains comprehensive examples demonstrating the most advanced features of UndetectBrowser v2.0, including **consistent fingerprinting**, **realistic human behavior**, and **proxy-fingerprint integration**.

## 🚀 Quick Start

The fastest way to get started with realistic browser automation:

```bash
# Build the project
npm run build

# Run quick start example
npx ts-node examples/quick-start-realistic.ts
```

## 📚 Examples Overview

### 1. **quick-start-realistic.ts** ⭐ RECOMMENDED
The simplest way to use UndetectBrowser v2.0 with all advanced features.

**Features:**
- ✅ One-line browser creation
- ✅ Automatic proxy-fingerprint matching
- ✅ Built-in human behavior methods
- ✅ 6 different usage scenarios

**Quick Example:**
```typescript
import { createRealisticBrowser } from '../src/core/realistic-browser-factory';

// Create browser with automatic proxy-fingerprint matching
const browser = await createRealisticBrowser({
  proxy: {
    type: 'http',
    host: '1.2.3.4',
    port: 8080
  }
});

// Create page with human-like methods
const page = await browser.newPage();

// Use human behavior
await page.humanClick('#button');
await page.humanType('#input', 'Hello World');
await page.humanScroll('down', 800);
```

**Run:**
```bash
npx ts-node examples/quick-start-realistic.ts
```

---

### 2. **realistic-human-simulation.ts**
Comprehensive examples of realistic human behavior simulation.

**Features:**
- Human-like typing with variance and typos
- Bezier curve mouse movements
- Natural scrolling patterns
- Page reading simulation
- Form filling with realistic delays
- Element exploration behavior

**Examples Included:**
1. Basic realistic browser with proxy
2. Form filling with realistic behavior
3. Reading and exploring pages
4. Multi-country proxy rotation
5. E-commerce shopping scenario

**Run:**
```bash
npx ts-node examples/realistic-human-simulation.ts
```

---

### 3. **proxy-fingerprint-integration.ts**
Advanced proxy integration with automatic fingerprint consistency.

**Features:**
- Proxy country detection
- Automatic fingerprint matching
- ProxyManager integration
- Automated task rotation
- E-commerce bot example

**Examples Included:**
1. Single proxy with consistent fingerprint
2. Multiple proxies rotation
3. ProxyManager integration
4. Automated task with proxy rotation
5. E-commerce bot with proxy

**Run:**
```bash
npx ts-node examples/proxy-fingerprint-integration.ts
```

---

## 🎨 Key Features

### 1. Consistent Fingerprinting

All browser fingerprint data automatically matches your proxy's geolocation:

```typescript
import { generateConsistentFingerprint, applyConsistentFingerprint } from '../src/modules/consistent-fingerprint';

// Generate fingerprint for US proxy
const fingerprint = generateConsistentFingerprint('US', 'user-seed-123');

// Fingerprint includes:
// - User Agent (matching platform)
// - Timezone (America/New_York)
// - Locale (en-US)
// - Languages ['en-US', 'en']
// - Resolution, WebGL, Canvas, etc.

// Apply to page
await applyConsistentFingerprint(page, fingerprint);
```

**Supported Countries:**
- 🇺🇸 United States (US)
- 🇬🇧 United Kingdom (GB)
- 🇩🇪 Germany (DE)
- 🇫🇷 France (FR)
- 🇪🇸 Spain (ES)
- 🇮🇹 Italy (IT)
- 🇷🇺 Russia (RU)
- 🇨🇳 China (CN)
- 🇯🇵 Japan (JP)
- 🇧🇷 Brazil (BR)
- 🇦🇺 Australia (AU)
- 🇨🇦 Canada (CA)

---

### 2. Realistic Human Behavior

Simulate human interactions with natural variance:

```typescript
import {
  generateBiometricProfile,
  humanType,
  humanClick,
  humanScroll,
  humanReadPage,
  humanExplorePage,
  humanFillForm
} from '../src/modules/realistic-human-behavior';

// Generate biometric profile
const profile = generateBiometricProfile('user-seed-123');
// Profile includes:
// - Typing speed: 40-80 WPM
// - Mouse speed: 200-600 px/s
// - Reaction time: 150-350ms
// - Reading speed: 200-300 WPM
// - Scroll pattern: smooth/jumpy/mixed
// - Error rate: 0-5%

// Use realistic behaviors
await humanType(page, '#input', 'Hello World', profile);
await humanClick(page, '#button', profile);
await humanScroll(page, 'down', 800, profile);
await humanReadPage(page, profile);
await humanExplorePage(page, profile);
await humanFillForm(page, { '#name': 'John', '#email': 'john@example.com' }, profile);
```

**Human Behavior Features:**
- ✅ Typing with variance (faster for common bigrams like "th", "he")
- ✅ Occasional typos with correction
- ✅ Bezier curve mouse movement
- ✅ Mouse jitter and tremor
- ✅ Natural scrolling (smooth, jumpy, mixed)
- ✅ Reading simulation with pauses
- ✅ Element hovering and exploration
- ✅ Reaction time delays

---

### 3. High-Level API (Recommended)

The easiest way to use all features:

```typescript
import { createRealisticBrowser } from '../src/core/realistic-browser-factory';

// Create with all features enabled
const browser = await createRealisticBrowser({
  proxy: {
    type: 'http',
    host: '1.2.3.4',
    port: 8080,
    username: 'user',  // Optional
    password: 'pass'   // Optional
  },
  country: 'US',       // Optional - auto-detected from proxy
  userSeed: 'seed-123' // Optional - for consistent fingerprints
});

// Pages have human-like methods built-in
const page = await browser.newPage();
await page.humanClick('#button');
await page.humanType('#input', 'text');
await page.humanScroll('down', 800);
await page.humanReadPage();
await page.humanExplorePage();
await page.humanFillForm({ '#field': 'value' });

// Get generated fingerprint and profile
const fingerprint = browser.getFingerprint();
const biometricProfile = browser.getBiometricProfile();
const country = browser.getProxyCountry();
```

---

## 🔧 Configuration Options

### RealisticBrowserConfig

```typescript
interface RealisticBrowserConfig {
  /** Proxy configuration */
  proxy?: {
    type: 'http' | 'https' | 'socks4' | 'socks5';
    host: string;
    port: number;
    username?: string;
    password?: string;
  };

  /** Country code (e.g., 'US', 'GB', 'DE') */
  /** Auto-detected from proxy if not provided */
  country?: string;

  /** User seed for consistent fingerprint generation */
  /** Same seed = same fingerprint every time */
  userSeed?: string;

  /** Puppeteer launch options */
  launchOptions?: {
    headless?: boolean;
    args?: string[];
    // ... other Puppeteer options
  };
}
```

---

## 📖 Usage Patterns

### Pattern 1: Simple Automation (No Proxy)

```typescript
const browser = await createRealisticBrowser();
const page = await browser.newPage();

await page.goto('https://example.com');
await page.humanClick('#button');
await page.humanType('#input', 'Hello');
```

### Pattern 2: With Proxy (Auto-matching)

```typescript
const browser = await createRealisticBrowser({
  proxy: { type: 'http', host: '1.2.3.4', port: 8080 }
});

// Fingerprint automatically matches proxy location!
const page = await browser.newPage();
await page.goto('https://example.com');
```

### Pattern 3: Specific Country

```typescript
const browser = await createRealisticBrowser({
  country: 'JP',  // Force Japanese fingerprint
  userSeed: 'consistent-user-001'
});
```

### Pattern 4: Consistent Profile Across Sessions

```typescript
// Session 1
const browser1 = await createRealisticBrowser({
  userSeed: 'my-user-123'
});
// Always generates same fingerprint!

// Session 2 (later)
const browser2 = await createRealisticBrowser({
  userSeed: 'my-user-123'
});
// Same fingerprint as Session 1!
```

### Pattern 5: Multiple Browsers in Parallel

```typescript
import { createRealisticBrowsers } from '../src/core/realistic-browser-factory';

const browsers = await createRealisticBrowsers([
  { country: 'US', userSeed: 'user-1' },
  { country: 'GB', userSeed: 'user-2' },
  { country: 'DE', userSeed: 'user-3' }
]);

// Use all browsers in parallel
await Promise.all(browsers.map(async (browser) => {
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.humanClick('#button');
}));
```

### Pattern 6: ProxyManager Integration

```typescript
import { ProxyManager } from '../src/core/proxy-manager';
import { createRealisticBrowser } from '../src/core/realistic-browser-factory';

const proxyManager = new ProxyManager();

// Add proxies
await proxyManager.addProxy('http://1.2.3.4:8080');
await proxyManager.addProxy('http://5.6.7.8:8080');

// Rotate through proxies
for (let i = 0; i < 10; i++) {
  const proxy = await proxyManager.getNextProxy();

  const browser = await createRealisticBrowser({ proxy });
  const page = await browser.newPage();

  // Do your automation...

  await browser.close();
}
```

---

## 🎯 Best Practices

### 1. Always Use Consistent Seeds for Same User

```typescript
// ✅ Good - consistent user profile
const browser = await createRealisticBrowser({
  userSeed: 'john-doe-12345'
});

// ❌ Bad - random profile every time
const browser = await createRealisticBrowser(); // Random seed
```

### 2. Match Proxy to Fingerprint

```typescript
// ✅ Good - automatic matching
const browser = await createRealisticBrowser({
  proxy: usProxy
});
// Fingerprint is US automatically!

// ❌ Bad - mismatched data
const browser = await createRealisticBrowser({
  proxy: usProxy,
  country: 'CN'  // Chinese fingerprint with US proxy!
});
```

### 3. Use Human Behavior for All Interactions

```typescript
// ✅ Good - realistic
await page.humanType('#search', 'laptop');
await page.humanClick('#submit');
await page.humanScroll('down', 800);

// ❌ Bad - robotic
await page.type('#search', 'laptop');
await page.click('#submit');
await page.evaluate(() => window.scrollBy(0, 800));
```

### 4. Add Random Delays Between Actions

```typescript
// ✅ Good - natural pauses
await page.humanClick('#button');
await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
await page.humanType('#input', 'text');

// ❌ Bad - instant actions
await page.humanClick('#button');
await page.humanType('#input', 'text');
```

### 5. Read Pages Like Humans

```typescript
// ✅ Good - realistic browsing
await page.goto('https://example.com');
await page.humanReadPage();     // Scrolls and reads
await page.humanExplorePage();   // Hovers over elements
await page.humanClick('#link');

// ❌ Bad - instant actions
await page.goto('https://example.com');
await page.click('#link');
```

---

## 🧪 Testing Your Setup

### Test Fingerprint Consistency

```typescript
const browser = await createRealisticBrowser({
  country: 'US',
  userSeed: 'test-user'
});

const page = await browser.newPage();

// Visit fingerprint testing sites
await page.goto('https://abrahamjuliot.github.io/creepjs/');
await page.goto('https://pixelscan.net/');
await page.goto('https://www.deviceinfo.me/');

// Check that all data is consistent:
// - Timezone matches country
// - Locale matches country
// - Languages match country
// - Canvas fingerprint is stable
// - WebGL data is consistent
```

---

## 📊 Fingerprint Consistency Checklist

When using the realistic browser, verify:

- ✅ **User Agent** matches platform (Windows/Mac/Linux)
- ✅ **Timezone** matches proxy country
- ✅ **Locale** matches proxy country
- ✅ **Languages** match proxy country
- ✅ **Resolution** is common for platform
- ✅ **WebGL Vendor/Renderer** matches GPU
- ✅ **Canvas Fingerprint** is consistent (same seed = same canvas)
- ✅ **Hardware Concurrency** is realistic (4-16 cores)
- ✅ **Device Memory** is realistic (4-32 GB)
- ✅ **Platform** matches user agent

---

## 🐛 Troubleshooting

### Issue: Fingerprint doesn't match proxy

**Solution:** Make sure you're not overriding the country:
```typescript
// ✅ Let it auto-detect
const browser = await createRealisticBrowser({ proxy });

// ❌ Don't override unless needed
const browser = await createRealisticBrowser({
  proxy,
  country: 'XX'  // Remove this
});
```

### Issue: Behavior is too fast

**Solution:** The biometric profile is random. Use a specific seed for consistent behavior:
```typescript
const browser = await createRealisticBrowser({
  userSeed: 'slower-user'  // Will generate consistent (possibly slower) profile
});
```

### Issue: TypeScript errors

**Solution:** Build the project first:
```bash
npm run build
```

---

## 📝 Additional Resources

- **Main Documentation:** `../IMPROVEMENTS.md`
- **Quick Start Guide:** `../QUICKSTART.md`
- **What's New in v2.0:** `../WHATS_NEW.md`
- **API Reference:** Check TypeScript definitions in `src/`

---

## 🎓 Learning Path

1. **Start Here:** `quick-start-realistic.ts` - Learn the basic API
2. **Next:** `realistic-human-simulation.ts` - Understand human behaviors
3. **Advanced:** `proxy-fingerprint-integration.ts` - Master proxy integration
4. **Expert:** Create your own automation combining all features!

---

## 💡 Tips & Tricks

### Tip 1: Consistent User Profiles

Use the same seed for the same "user":
```typescript
const regularUser = await createRealisticBrowser({
  userSeed: 'john-doe-regular',  // Fast typer, smooth scroller
  country: 'US'
});

const slowUser = await createRealisticBrowser({
  userSeed: 'jane-smith-careful',  // Slower, more deliberate
  country: 'GB'
});
```

### Tip 2: Debug Fingerprint

```typescript
const browser = await createRealisticBrowser({ country: 'US' });
const fingerprint = browser.getFingerprint();

console.log('Fingerprint Details:');
console.log(JSON.stringify(fingerprint, null, 2));
```

### Tip 3: Combine with Existing Code

```typescript
// Use with your existing Puppeteer code
const browser = await createRealisticBrowser();
const page = await browser.newPage();

// Now mix human-like and regular Puppeteer methods
await page.goto('https://example.com');
await page.humanClick('#button');          // Human-like
await page.waitForSelector('.result');      // Regular Puppeteer
await page.humanScroll('down', 800);        // Human-like
const text = await page.$eval('.text', el => el.textContent);  // Regular
```

---

## 🚀 Production Checklist

Before deploying to production:

- [ ] Test fingerprint consistency on multiple sites
- [ ] Verify proxy-fingerprint matching
- [ ] Test human behavior looks natural
- [ ] Add error handling for all operations
- [ ] Implement retry logic for failed requests
- [ ] Add logging for debugging
- [ ] Monitor detection rates
- [ ] Rotate proxies appropriately
- [ ] Use consistent user seeds per "user"
- [ ] Add delays between actions

---

## 📞 Support

- **Issues:** Create an issue on GitHub
- **Questions:** Check documentation files
- **Contributions:** Pull requests welcome!

---

**Version:** 2.0.0
**Last Updated:** 2025-01-10
**Author:** UndetectBrowser Team
