# 🚀 Getting Started with UndetectBrowser

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/undetect-browser.git
cd undetect-browser

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Run Basic Example

```bash
# Run the basic usage example
npx ts-node examples/basic-usage.ts
```

This will:
- Launch a browser with stealth protections
- Navigate to bot.sannysoft.com
- Take a screenshot
- Display detection results

### 3. Run Detection Tests

```bash
# Test against multiple detection sites
npx ts-node examples/detection-test.ts
```

This will test your browser against:
- Bot.Sannysoft
- Are You Headless
- BrowserLeaks

### 4. Profile Management

```bash
# Create and manage browser profiles
npx ts-node examples/profile-management.ts
```

This demonstrates:
- Creating profiles
- Saving cookies and localStorage
- Reusing profiles across sessions

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit
```

### Detection Tests

```bash
# Run detection tests (requires Chromium)
npm run test:detection
```

### All Tests

```bash
# Run all tests
npm test
```

---

## Using in Your Project

### Installation

```bash
npm install undetect-browser
```

### Basic Usage

```typescript
import { UndetectBrowser } from 'undetect-browser';

async function main() {
  const undetect = new UndetectBrowser({
    stealth: { level: 'advanced' }
  });

  const browser = await undetect.launch();
  const page = await browser.newPage();

  await page.goto('https://example.com');

  // Your automation code here...

  await browser.close();
}

main();
```

---

## Configuration Options

### Stealth Levels

- **basic**: Minimal protection, fastest performance
- **advanced**: Recommended balance (default)
- **paranoid**: Maximum protection, may be slower

```typescript
const undetect = new UndetectBrowser({
  stealth: {
    level: 'paranoid',
    webdriverEvasion: true,
    fingerprintSpoofing: true,
  }
});
```

### Storage Configuration

```typescript
const undetect = new UndetectBrowser({
  storage: {
    type: 'file', // or 'memory'
    path: './my-profiles'
  }
});
```

### Profile Options

```typescript
const profileId = await undetect.createProfile({
  name: 'My Profile',
  timezone: 'America/New_York',
  locale: 'en-US',
  geolocation: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  platform: 'windows' // 'windows' | 'mac' | 'linux'
});
```

---

## Docker Usage

### Build Image

```bash
docker build -t undetect-browser .
```

### Run Container

```bash
docker run -it --rm \
  -v $(pwd)/profiles:/app/profiles \
  undetect-browser
```

---

## Testing Against Detection Sites

### Recommended Test Sites

1. **Bot.Sannysoft** - https://bot.sannysoft.com/
   - Comprehensive WebDriver detection
   - Tests multiple properties

2. **Are You Headless** - https://arh.antoinevastel.com/bots/areyouheadless
   - Headless browser detection
   - Chrome-specific tests

3. **PixelScan** - https://pixelscan.net/
   - Fingerprinting analysis
   - Canvas, WebGL, Audio tests

4. **BrowserLeaks** - https://browserleaks.com/
   - Comprehensive browser leak tests
   - WebRTC, Canvas, Fonts, etc.

5. **Cover Your Tracks** - https://coveryourtracks.eff.org/
   - EFF's tracker test
   - Fingerprinting uniqueness

### Running Manual Tests

```typescript
const browser = await undetect.launch({ headless: false });
const page = await browser.newPage();

await page.goto('https://bot.sannysoft.com/');

// Leave browser open for inspection
await page.waitForTimeout(60000);
```

---

## Troubleshooting

### Chromium Not Found

```bash
# Install Chromium
sudo apt-get install chromium-browser

# Or download from puppeteer
npx puppeteer browsers install chrome
```

### Permission Errors

```bash
# Fix permissions for profiles directory
chmod 755 ./profiles
```

### Detection Still Happening

1. Try increasing stealth level to 'paranoid'
2. Use a profile with realistic fingerprint
3. Check if you're using the latest version
4. Review the DETECTION_METHODS_ANALYSIS.md

---

## Next Steps

1. Read the [Implementation Plan](UNDETECT_BROWSER_PLAN.md)
2. Review [Technical Architecture](TECHNICAL_ARCHITECTURE.md)
3. Study [Detection Methods](DETECTION_METHODS_ANALYSIS.md)
4. Check the [Roadmap](IMPLEMENTATION_ROADMAP.md)

---

## Support

- 📝 [GitHub Issues](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)
- 📧 Email: support@example.com

---

## License

MIT License - see [LICENSE](LICENSE) file
