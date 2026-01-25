# FAQ - Frequently Asked Questions

Common questions and answers about UndetectBrowser.

---

## Table of Contents

- [General Questions](#general-questions)
- [Installation](#installation)
- [Profiles & Fingerprints](#profiles--fingerprints)
- [Proxies](#proxies)
- [Detection & Stealth](#detection--stealth)
- [Automation](#automation)
- [API & SDKs](#api--sdks)
- [Performance](#performance)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## General Questions

### What is UndetectBrowser?

UndetectBrowser is an open-source, enterprise-grade anti-detection browser. It allows you to create multiple isolated browser profiles with unique fingerprints, making each browser instance appear as a different real user.

### How is it different from regular Chrome/Firefox?

| Feature | Regular Browser | UndetectBrowser |
|---------|----------------|-----------------|
| Fingerprint | Fixed, trackable | Spoofed, unique per profile |
| Multiple identities | Manual, complex | Built-in profile management |
| Detection evasion | None | 25+ protection modules |
| Automation detection | Easily detected | Stealth mode |
| Session isolation | Limited | Complete isolation |

### Is it legal to use?

Yes, UndetectBrowser is legal software. However, how you use it matters:

**Legal uses:**
- Web scraping (with respect to ToS)
- Multi-account management
- Privacy protection
- QA testing
- Security research

**Check local laws for:**
- Automated purchases
- Credential testing
- Terms of Service violations

### Is it free?

Yes, UndetectBrowser is 100% free and open source under the MIT license. You can:
- Use it commercially
- Modify the code
- Self-host without limits
- No subscription fees

### How does it compare to Multilogin/AdsPower/GoLogin?

| Feature | Multilogin | AdsPower | GoLogin | UndetectBrowser |
|---------|------------|----------|---------|-----------------|
| Detection Score | 9.3/10 | 9.2/10 | 9.1/10 | **9.9/10** |
| Price | $99/mo | $49/mo | $49/mo | **Free** |
| Open Source | No | No | No | **Yes** |
| Self-Hosted | No | No | No | **Yes** |
| Kubernetes | No | No | No | **Yes** |
| ML Fingerprints | No | No | No | **Yes** |

---

## Installation

### What are the system requirements?

**Minimum:**
- Node.js 18+
- 4 GB RAM
- 2 GB disk space
- Windows 10 / macOS 10.15 / Ubuntu 20.04

**Recommended:**
- Node.js 20 LTS
- 8+ GB RAM
- 10+ GB disk space
- SSD storage

### How do I install on Windows?

```bash
# Option 1: npm
git clone https://github.com/wpeva/new-undetect-browser.git
cd new-undetect-browser
npm install
npm run build

# Option 2: One-click installer
# Download UndetectBrowser-Setup.exe from releases
```

### How do I install on macOS?

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Clone and install
git clone https://github.com/wpeva/new-undetect-browser.git
cd new-undetect-browser
npm install
npm run build
```

### How do I install on Linux?

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and install
git clone https://github.com/wpeva/new-undetect-browser.git
cd new-undetect-browser
npm install
npm run build
```

### Can I use Docker?

Yes! Docker is fully supported:

```bash
# Using pre-built image
docker run -p 3000:3000 wpeva/undetect-browser

# Building locally
docker build -t undetect-browser .
docker run -p 3000:3000 undetect-browser

# With docker-compose
docker-compose up -d
```

### How do I deploy to Kubernetes?

```bash
# Using Helm
helm install antidetect ./kubernetes/helm/antidetect-browser \
  --namespace antidetect \
  --create-namespace

# Using manifests
kubectl apply -f kubernetes/manifests/
```

---

## Profiles & Fingerprints

### What is a browser profile?

A browser profile is a complete browser identity including:
- Unique fingerprint (Canvas, WebGL, Audio, etc.)
- Cookies and session data
- localStorage and sessionStorage
- Browser settings (language, timezone, etc.)
- Proxy configuration

### How many profiles can I create?

Unlimited. There are no artificial limits on profile count.

### Are fingerprints unique?

Yes. Each profile gets a unique fingerprint generated using:
- Statistical modeling from real browser data
- OS-appropriate hardware configurations
- Correlated components (e.g., Windows + DirectX GPU)
- Anti-correlation engine (ensures diversity)

### Can I customize fingerprints?

Yes, you can customize:
- User Agent
- Screen resolution
- Language and timezone
- WebGL vendor/renderer
- Canvas noise
- Audio noise
- Font list
- Hardware specs (CPU cores, memory)

```typescript
const profile = await browser.createProfile({
  name: 'Custom Profile',
  fingerprint: {
    userAgent: 'Mozilla/5.0...',
    screen: { width: 1920, height: 1080 },
    timezone: 'America/New_York',
    language: 'en-US',
    webgl: {
      vendor: 'Google Inc.',
      renderer: 'ANGLE (NVIDIA GeForce RTX 3080)'
    }
  }
});
```

### How do I export/import profiles?

```typescript
// Export
const profileData = await browser.exportProfile('profile-id');
fs.writeFileSync('profile.json', JSON.stringify(profileData));

// Import
const data = JSON.parse(fs.readFileSync('profile.json'));
await browser.importProfile(data);
```

### Are cookies saved between sessions?

Yes, if you use `saveProfile()`:

```typescript
const browser = new UndetectBrowser();
await browser.loadProfile('my-profile');
await browser.launch();

// ... do stuff ...

await browser.saveProfile(); // Saves cookies, storage, etc.
await browser.close();
```

---

## Proxies

### What proxy types are supported?

- HTTP
- HTTPS
- SOCKS4
- SOCKS5 (with and without authentication)

### How do I add a proxy?

```typescript
const browser = new UndetectBrowser({
  proxy: {
    protocol: 'http',
    host: 'proxy.example.com',
    port: 8080,
    username: 'user',     // optional
    password: 'pass'      // optional
  }
});
```

### Can I rotate proxies?

Yes, using ProxyManager:

```typescript
const proxyManager = new ProxyManager();

// Add proxy pool
await proxyManager.addProxies([
  { host: 'proxy1.com', port: 8080 },
  { host: 'proxy2.com', port: 8080 },
  { host: 'proxy3.com', port: 8080 }
]);

// Rotation strategies
proxyManager.setRotation('round-robin'); // Default
proxyManager.setRotation('random');
proxyManager.setRotation('least-used');
```

### Does it auto-match fingerprint to proxy location?

Yes! When using `createRealisticBrowser()`:

```typescript
const browser = await createRealisticBrowser({
  proxy: { host: 'us-proxy.com', port: 8080 }
});
// Automatically sets US timezone, language, etc.
```

### How do I test if my proxy is working?

```typescript
// Via API
const result = await fetch('http://localhost:3000/api/proxies/1/check', {
  method: 'POST'
});

// Via code
const proxyManager = new ProxyManager();
const isWorking = await proxyManager.checkProxy({
  host: 'proxy.com',
  port: 8080
});
```

---

## Detection & Stealth

### What detection methods does it bypass?

| Detection Method | Status |
|-----------------|--------|
| navigator.webdriver | Bypassed |
| Chrome DevTools Protocol | Bypassed |
| Canvas fingerprinting | Spoofed |
| WebGL fingerprinting | Spoofed |
| Audio fingerprinting | Spoofed |
| Font enumeration | Spoofed |
| WebRTC IP leak | Protected |
| Headless detection | Protected |
| Automation detection | Protected |
| Timezone mismatch | Configurable |
| Language mismatch | Configurable |
| Screen resolution | Configurable |

### What is the detection score?

Our detection score is **9.9/10** based on testing against:
- bot.sannysoft.com
- pixelscan.net
- creepjs
- browserleaks.com
- And 20+ other detection services

### How do I test my stealth level?

```typescript
const browser = new UndetectBrowser({ stealth: true });
await browser.launch();
const page = await browser.newPage();

// Test sites
await page.goto('https://bot.sannysoft.com');
await page.screenshot({ path: 'sannysoft.png' });

await page.goto('https://pixelscan.net');
await page.screenshot({ path: 'pixelscan.png' });
```

### What stealth modes are available?

| Mode | Protections | Use Case |
|------|------------|----------|
| `basic` | WebDriver, basic evasions | Simple scraping |
| `advanced` | + Canvas, WebGL, Audio | E-commerce, social |
| `paranoid` | All 25 modules | Maximum protection |

```typescript
const browser = new UndetectBrowser({
  stealthMode: 'paranoid'
});
```

### Why am I still getting detected?

Common reasons:

1. **Fingerprint mismatch** - US proxy but Europe timezone
2. **Behavioral patterns** - Too fast, no mouse movement
3. **Missing human behavior** - Use `humanClick()`, `humanType()`
4. **Headless mode** - Use `headless: false` for sensitive sites
5. **Old fingerprint** - Regenerate periodically

---

## Automation

### Is it compatible with Puppeteer?

Yes, 100% compatible:

```typescript
import { UndetectBrowser } from 'undetect-browser';

const browser = new UndetectBrowser();
await browser.launch();

const page = await browser.newPage();
// All Puppeteer methods work
await page.goto('https://example.com');
await page.click('#button');
await page.type('#input', 'text');
```

### Is it compatible with Playwright?

Yes:

```typescript
import { UndetectBrowser } from 'undetect-browser';

const browser = new UndetectBrowser({
  engine: 'playwright'
});

await browser.launch();
const page = await browser.newPage();
```

### How do I make automation look human?

```typescript
// Use human-like methods
await page.humanClick('#button');          // Bezier curve movement + click
await page.humanType('#input', 'text');    // Variable typing speed
await page.humanScroll({ distance: 500 }); // Natural scrolling
await page.humanDelay(1000, 3000);         // Random delay

// Simulate reading
await page.simulateReading({ duration: 30000 });

// Simulate page exploration
await page.simulateExploration({ clicks: 5, scrolls: 10 });
```

### Can I run multiple browsers in parallel?

Yes:

```typescript
const browsers = await Promise.all([
  UndetectBrowser.launch({ profile: 'profile1' }),
  UndetectBrowser.launch({ profile: 'profile2' }),
  UndetectBrowser.launch({ profile: 'profile3' })
]);

// Each browser has unique fingerprint
```

---

## API & SDKs

### How do I authenticate with the API?

```bash
# Get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Use token in requests
curl http://localhost:3000/api/profiles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### What SDKs are available?

- **JavaScript/TypeScript** - Full-featured, async/await
- **Python** - Pip installable, async support
- **Go** - Type-safe, goroutine-friendly

### Where is the API documentation?

Full API documentation: [docs/API.md](docs/API.md)

### Can I use WebSocket for real-time updates?

Yes:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('profile:launched', (data) => {
  console.log('Profile launched:', data);
});

socket.on('session:screenshot', (data) => {
  console.log('Screenshot taken:', data);
});
```

---

## Performance

### How fast is browser launch?

| Mode | Cold Start | Warm Start (Pool) |
|------|------------|-------------------|
| Without pool | ~2000ms | N/A |
| With pool | ~2000ms first | **~70ms** |

Enable browser pool:
```typescript
const browser = new UndetectBrowser({
  pool: { enabled: true, size: 5 }
});
```

### How much memory does each browser use?

- **Default**: ~650 MB per browser
- **Optimized**: ~240 MB per browser (63% reduction)

Enable optimization:
```typescript
const browser = new UndetectBrowser({
  optimization: {
    memory: true,
    gc: 'aggressive'
  }
});
```

### How many concurrent browsers can I run?

Depends on your hardware:

| RAM | Concurrent Browsers |
|-----|---------------------|
| 4 GB | 2-4 |
| 8 GB | 5-10 |
| 16 GB | 15-25 |
| 32 GB | 40-60 |
| 64 GB | 100+ |

With Kubernetes: **10,000+ concurrent sessions**

---

## Security

### Is my data encrypted?

Yes:
- **At rest**: AES-256-GCM encryption
- **In transit**: HTTPS/TLS
- **Passwords**: bcrypt hashing
- **Keys**: PBKDF2 derivation (100k iterations)

### How do I enable HTTPS?

```typescript
// server config
const server = createServer({
  https: {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
  }
});
```

Or use reverse proxy (nginx, Caddy).

### Is it GDPR compliant?

Yes, UndetectBrowser supports GDPR compliance:
- Data encryption
- Audit logging
- Data export
- Data deletion
- Access controls

---

## Troubleshooting

### "Chrome not found" error

```bash
# Install Chrome/Chromium
# Ubuntu
sudo apt install chromium-browser

# macOS
brew install --cask google-chrome

# Or let Puppeteer download it
npx puppeteer browsers install chrome
```

### "Permission denied" error

```bash
# Linux/macOS
chmod +x node_modules/puppeteer/.local-chromium/*/chrome-linux/chrome

# Or run with sudo (not recommended)
sudo npm run server
```

### Browser crashes on launch

```bash
# Increase shared memory (Docker)
docker run --shm-size=2gb undetect-browser

# Or disable sandbox (development only)
const browser = new UndetectBrowser({
  args: ['--no-sandbox']
});
```

### Proxy not working

```bash
# Test proxy manually
curl -x http://user:pass@host:port http://ipinfo.io

# Check format
# Correct: http://user:pass@host:port
# Wrong: host:port:user:pass
```

### Still detected after using stealth

1. Check fingerprint consistency (timezone matches proxy location)
2. Enable paranoid mode
3. Add human-like behavior
4. Use headless: false
5. Warm up profile before automation

---

## More Questions?

- Check [USER_GUIDE.md](USER_GUIDE.md) for detailed guides
- See [EXAMPLES.md](EXAMPLES.md) for code examples
- Read [docs/API.md](docs/API.md) for API reference
- Open an issue on [GitHub](https://github.com/wpeva/new-undetect-browser/issues)

---

**Last updated**: January 2025
