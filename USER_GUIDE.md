# User Guide - UndetectBrowser

Complete guide for using UndetectBrowser - Professional Anti-Detection Browser.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [First Launch](#first-launch)
4. [Creating Browser Profiles](#creating-browser-profiles)
5. [Managing Proxies](#managing-proxies)
6. [Launching Browsers](#launching-browsers)
7. [Automation](#automation)
8. [API Usage](#api-usage)
9. [SDK Integration](#sdk-integration)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### What is UndetectBrowser?

UndetectBrowser is a professional anti-detection browser that allows you to:

- Create multiple isolated browser profiles
- Spoof browser fingerprints (Canvas, WebGL, Audio, Fonts, etc.)
- Use proxies with automatic fingerprint matching
- Automate browser tasks with Puppeteer/Playwright
- Manage sessions and cookies across profiles

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10, macOS 10.15, Ubuntu 20.04 | Windows 11, macOS 14, Ubuntu 22.04 |
| **Node.js** | 18.0.0 | 20.x LTS |
| **RAM** | 4 GB | 8 GB+ |
| **Disk** | 2 GB | 10 GB+ |
| **Network** | Broadband | Low latency connection |

---

## Installation

### Option 1: npm Installation

```bash
# Clone repository
git clone https://github.com/wpeva/new-undetect-browser.git
cd new-undetect-browser

# Install dependencies
npm install

# Build project
npm run build
```

### Option 2: Docker Installation

```bash
# Pull and run
docker pull wpeva/undetect-browser:latest
docker run -p 3000:3000 wpeva/undetect-browser

# Or build locally
docker build -t undetect-browser .
docker run -p 3000:3000 undetect-browser
```

### Option 3: One-Click Windows Installer

1. Download `UndetectBrowser-Setup.exe` from releases
2. Run installer
3. Follow installation wizard
4. Launch from desktop shortcut

---

## First Launch

### Starting the Server

```bash
# Development mode
npm run server:dev

# Production mode
npm run build && npm run server
```

### Starting the Frontend

```bash
cd frontend
npm install
npm run dev
```

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3001 | Web dashboard |
| **API** | http://localhost:3000 | REST API |
| **WebSocket** | ws://localhost:3000 | Real-time updates |

---

## Creating Browser Profiles

### Via Web Interface

1. Open http://localhost:3001
2. Navigate to **Profiles** page
3. Click **Create Profile**
4. Configure profile settings:
   - **Name**: Profile identifier
   - **OS**: Windows, macOS, Linux
   - **Browser**: Chrome, Firefox, Edge
   - **Proxy**: Optional proxy configuration
   - **Fingerprint**: Auto-generated or custom
5. Click **Save**

### Via API

```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Profile",
    "os": "windows",
    "browser": "chrome",
    "proxy": {
      "host": "proxy.example.com",
      "port": 8080,
      "username": "user",
      "password": "pass"
    }
  }'
```

### Via SDK (TypeScript)

```typescript
import { UndetectBrowser } from 'undetect-browser';

const browser = new UndetectBrowser();

// Create profile
const profile = await browser.createProfile({
  name: 'My Profile',
  os: 'windows',
  browser: 'chrome'
});

console.log('Profile created:', profile.id);
```

### Profile Settings

| Setting | Description | Values |
|---------|-------------|--------|
| **name** | Profile name | String |
| **os** | Operating system | `windows`, `macos`, `linux` |
| **browser** | Browser type | `chrome`, `firefox`, `edge`, `safari` |
| **language** | Browser language | `en-US`, `ru-RU`, etc. |
| **timezone** | Timezone | `America/New_York`, `Europe/Moscow`, etc. |
| **screen** | Screen resolution | `1920x1080`, `2560x1440`, etc. |
| **webrtc** | WebRTC mode | `real`, `fake`, `disabled` |
| **geolocation** | Location | `{lat: 40.7128, lng: -74.0060}` |

---

## Managing Proxies

### Adding Proxies

**Via Web Interface:**

1. Go to **Proxies** page
2. Click **Add Proxy**
3. Enter proxy details:
   - Protocol: HTTP, HTTPS, SOCKS4, SOCKS5
   - Host and Port
   - Credentials (optional)
4. Click **Test** to verify
5. Click **Save**

**Via API:**

```bash
curl -X POST http://localhost:3000/api/proxies \
  -H "Content-Type: application/json" \
  -d '{
    "protocol": "http",
    "host": "proxy.example.com",
    "port": 8080,
    "username": "user",
    "password": "pass"
  }'
```

### Proxy Rotation

```typescript
import { ProxyManager } from 'undetect-browser';

const proxyManager = new ProxyManager();

// Add multiple proxies
await proxyManager.addProxies([
  { host: 'proxy1.com', port: 8080 },
  { host: 'proxy2.com', port: 8080 },
  { host: 'proxy3.com', port: 8080 }
]);

// Get next proxy (rotation)
const proxy = await proxyManager.getNext();
```

### Proxy Testing

```bash
# Test single proxy
curl -X POST http://localhost:3000/api/proxies/{id}/check

# Test all proxies
curl -X POST http://localhost:3000/api/proxies/check-all
```

---

## Launching Browsers

### Quick Launch

```typescript
import { UndetectBrowser } from 'undetect-browser';

const browser = new UndetectBrowser({
  stealth: true,
  headless: false
});

await browser.launch();
const page = await browser.newPage();

await page.goto('https://example.com');
```

### Launch with Profile

```typescript
// Load existing profile
const browser = new UndetectBrowser();
await browser.loadProfile('profile-id');
await browser.launch();

// Or create new profile and launch
const browser = new UndetectBrowser();
await browser.createProfile({ name: 'Test' });
await browser.launch();
```

### Launch with Proxy

```typescript
const browser = new UndetectBrowser({
  stealth: true,
  proxy: {
    host: 'proxy.example.com',
    port: 8080,
    username: 'user',
    password: 'pass'
  }
});

await browser.launch();
```

### Stealth Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **basic** | Essential protections | Simple automation |
| **advanced** | Full fingerprint spoofing | E-commerce, social media |
| **paranoid** | Maximum protection | High-security targets |

```typescript
const browser = new UndetectBrowser({
  stealthMode: 'paranoid'
});
```

---

## Automation

### Human-Like Behavior

```typescript
const page = await browser.newPage();
await page.goto('https://example.com');

// Human-like click
await page.humanClick('#button');

// Human-like typing
await page.humanType('#input', 'Hello World');

// Human-like scrolling
await page.humanScroll({ direction: 'down', distance: 500 });

// Random delay
await page.humanDelay(1000, 3000); // 1-3 seconds
```

### Form Filling

```typescript
// Realistic form filling with delays
await page.humanType('#email', 'user@example.com');
await page.humanDelay(500, 1500);

await page.humanType('#password', 'secretpass');
await page.humanDelay(300, 800);

await page.humanClick('#submit');
```

### Page Reading Simulation

```typescript
// Simulate reading a page
await page.simulateReading({
  duration: 30000,      // 30 seconds
  scrollProbability: 0.7,
  pauseOnImages: true
});
```

### Mouse Movement

```typescript
// Natural mouse movement using Bezier curves
await page.humanMove({ x: 500, y: 300 });

// Move to element
await page.humanMoveToElement('#target');
```

---

## API Usage

### Authentication

```bash
# Get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Use token
curl http://localhost:3000/api/profiles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Profiles API

```bash
# List profiles
GET /api/profiles

# Create profile
POST /api/profiles
{
  "name": "Profile Name",
  "os": "windows",
  "browser": "chrome"
}

# Get profile
GET /api/profiles/:id

# Update profile
PUT /api/profiles/:id
{
  "name": "New Name"
}

# Delete profile
DELETE /api/profiles/:id

# Launch browser
POST /api/profiles/:id/launch

# Stop browser
POST /api/profiles/:id/stop
```

### Sessions API

```bash
# List active sessions
GET /api/sessions

# Get session
GET /api/sessions/:id

# Execute script in session
POST /api/sessions/:id/execute
{
  "script": "return document.title"
}

# Take screenshot
POST /api/sessions/:id/screenshot

# Close session
DELETE /api/sessions/:id
```

---

## SDK Integration

### JavaScript/TypeScript SDK

```typescript
import { AntidetectClient } from 'undetect-browser/sdk';

const client = new AntidetectClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key'
});

// Create profile
const profile = await client.profiles.create({
  name: 'My Profile'
});

// Launch session
const session = await client.sessions.create({
  profileId: profile.id
});

// Navigate
await client.sessions.navigate(session.id, 'https://example.com');

// Take screenshot
const screenshot = await client.sessions.screenshot(session.id);
```

### Python SDK

```python
from antidetect_sdk import AntidetectClient

client = AntidetectClient(
    base_url='http://localhost:3000',
    api_key='your-api-key'
)

# Create profile
profile = client.profiles.create(name='My Profile')

# Launch session
session = client.sessions.create(profile_id=profile.id)

# Navigate
client.sessions.navigate(session.id, 'https://example.com')

# Take screenshot
screenshot = client.sessions.screenshot(session.id)
```

### Go SDK

```go
package main

import "github.com/wpeva/new-undetect-browser/sdk/go"

func main() {
    client := antidetect.NewClient(
        "http://localhost:3000",
        "your-api-key",
    )

    // Create profile
    profile, _ := client.Profiles.Create(&antidetect.ProfileOptions{
        Name: "My Profile",
    })

    // Launch session
    session, _ := client.Sessions.Create(&antidetect.SessionOptions{
        ProfileID: profile.ID,
    })

    // Navigate
    client.Sessions.Navigate(session.ID, "https://example.com")
}
```

---

## Troubleshooting

### Common Issues

#### Browser doesn't launch

```bash
# Check Chrome/Chromium is installed
which chromium || which google-chrome

# Install if missing (Ubuntu)
sudo apt install chromium-browser

# Check permissions
chmod +x node_modules/puppeteer/.local-chromium/*/chrome-linux/chrome
```

#### Profile not saving

```bash
# Check storage directory exists
mkdir -p profiles

# Check write permissions
chmod 755 profiles

# Clear corrupted profiles
rm -rf profiles/*
```

#### Proxy connection failed

```bash
# Test proxy manually
curl -x http://user:pass@proxy:port http://ipinfo.io

# Check proxy format
# Correct: http://user:pass@host:port
# Wrong: http://host:port:user:pass
```

#### Detection test failing

```typescript
// Enable paranoid mode
const browser = new UndetectBrowser({
  stealthMode: 'paranoid',
  evasions: {
    canvas: true,
    webgl: true,
    audio: true,
    fonts: true,
    webrtc: true,
    hardware: true
  }
});
```

### Logs and Debugging

```bash
# Enable debug logging
DEBUG=undetect:* npm run server

# View logs
tail -f logs/app.log

# Check browser console
# In browser DevTools: Console tab
```

### Performance Issues

```typescript
// Enable browser pool for faster launches
const browser = new UndetectBrowser({
  pool: {
    enabled: true,
    size: 5,
    warmup: true
  }
});

// Enable caching
const browser = new UndetectBrowser({
  cache: {
    enabled: true,
    ttl: 3600
  }
});
```

### Getting Help

1. Check [FAQ.md](FAQ.md) for common questions
2. Search [GitHub Issues](https://github.com/wpeva/new-undetect-browser/issues)
3. Read [API Documentation](docs/API.md)
4. Join community discussions

---

## Best Practices

### Profile Management

1. **Use meaningful names** - `amazon-shopping-us` not `profile1`
2. **Match fingerprint to proxy** - US proxy = US timezone, language
3. **Don't share profiles** - Each profile = one identity
4. **Regular rotation** - Create new profiles periodically
5. **Save sessions** - Enable session persistence

### Detection Avoidance

1. **Use realistic behavior** - Random delays, human-like actions
2. **Match fingerprints** - OS + Browser + Hardware consistency
3. **Rotate proxies** - Don't use same IP too long
4. **Warm up profiles** - Browse normally before automation
5. **Check detection score** - Test on bot.sannysoft.com

### Security

1. **Use strong passwords** - For API and dashboard
2. **Enable HTTPS** - In production environments
3. **Rotate API keys** - Periodically regenerate
4. **Monitor audit logs** - Check for suspicious activity
5. **Backup profiles** - Regular exports

---

## Next Steps

- Read [EXAMPLES.md](EXAMPLES.md) for code examples
- Check [FAQ.md](FAQ.md) for common questions
- See [docs/API.md](docs/API.md) for full API reference
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for production setup

---

**Happy Browsing!**
