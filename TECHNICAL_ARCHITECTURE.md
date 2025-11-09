# Техническая архитектура Undetect Browser

## 🏛️ Общая архитектура системы

```
┌─────────────────────────────────────────────────────────────┐
│                     User Application Layer                   │
│  (Your automation scripts, testing frameworks, scrapers)    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Undetect Browser API Layer                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Profile    │  │   Human      │  │   Session    │       │
│  │  Manager    │  │   Emulator   │  │   Manager    │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Stealth Engine (Core Protection)                │
│  ┌────────────────┐ ┌───────────────┐ ┌─────────────────┐  │
│  │ WebDriver      │ │ Fingerprint   │ │ Behavioral      │  │
│  │ Evasion        │ │ Spoofing      │ │ Simulation      │  │
│  └────────────────┘ └───────────────┘ └─────────────────┘  │
│  ┌────────────────┐ ┌───────────────┐ ┌─────────────────┐  │
│  │ Network        │ │ Canvas/WebGL  │ │ Timing          │  │
│  │ Fingerprint    │ │ Protection    │ │ Randomization   │  │
│  └────────────────┘ └───────────────┘ └─────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│          Browser Engine (Patched Chromium / CDP)             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Blink     │  │      V8      │  │  DevTools    │       │
│  │  (Patched)  │  │   (Patched)  │  │   Protocol   │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Proxy     │  │   Profile    │  │   Metrics    │       │
│  │   Pool      │  │   Storage    │  │   Monitor    │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Детальная архитектура компонентов

### 1. Stealth Engine Core

```typescript
// src/core/stealth-engine.ts
interface StealthEngine {
  // Evasion modules
  webdriverEvasion: WebDriverEvasionModule;
  fingerprintSpoofer: FingerprintSpoofingModule;
  behavioralSimulator: BehavioralSimulationModule;
  networkProtection: NetworkProtectionModule;

  // Configuration
  config: StealthConfig;

  // Runtime state
  activeProfile: BrowserProfile;
  detectionMonitor: DetectionMonitor;

  // Methods
  initialize(): Promise<void>;
  applyProtections(page: Page): Promise<void>;
  updateFingerprint(): void;
  detectAndAdapt(): Promise<void>;
}

class StealthEngineImpl implements StealthEngine {
  async initialize() {
    // Load all protection modules
    await this.webdriverEvasion.load();
    await this.fingerprintSpoofer.load();
    await this.behavioralSimulator.load();
    await this.networkProtection.load();

    // Setup monitoring
    this.detectionMonitor.start();
  }

  async applyProtections(page: Page) {
    // Apply in specific order for dependencies
    await this.webdriverEvasion.inject(page);
    await this.fingerprintSpoofer.inject(page);
    await this.behavioralSimulator.inject(page);

    // Setup network interceptors
    await page.setRequestInterception(true);
    page.on('request', this.networkProtection.interceptRequest);
  }
}
```

### 2. WebDriver Evasion Module

```typescript
// src/modules/webdriver-evasion.ts
export class WebDriverEvasionModule {
  private patches: EvasionPatch[] = [];

  constructor() {
    this.patches = [
      new NavigatorWebdriverPatch(),
      new ChromeRuntimePatch(),
      new PermissionsPatch(),
      new PluginsPatch(),
      new LanguagesPatch()
    ];
  }

  async inject(page: Page): Promise<void> {
    // Inject before any page scripts run
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });

      // Remove CDP variables
      const cdcProps = Object.getOwnPropertyNames(window)
        .filter(prop => prop.includes('cdc_'));
      cdcProps.forEach(prop => delete window[prop]);

      // Chrome runtime
      if (!window.chrome) {
        window.chrome = {};
      }

      window.chrome.runtime = {
        OnInstalledReason: {
          CHROME_UPDATE: "chrome_update",
          INSTALL: "install",
          SHARED_MODULE_UPDATE: "shared_module_update",
          UPDATE: "update",
        },
        OnRestartRequiredReason: {
          APP_UPDATE: "app_update",
          OS_UPDATE: "os_update",
          PERIODIC: "periodic",
        },
        PlatformArch: {
          ARM: "arm",
          ARM64: "arm64",
          MIPS: "mips",
          MIPS64: "mips64",
          X86_32: "x86-32",
          X86_64: "x86-64",
        },
        PlatformNaclArch: {
          ARM: "arm",
          MIPS: "mips",
          MIPS64: "mips64",
          X86_32: "x86-32",
          X86_64: "x86-64",
        },
        PlatformOs: {
          ANDROID: "android",
          CROS: "cros",
          LINUX: "linux",
          MAC: "mac",
          OPENBSD: "openbsd",
          WIN: "win",
        },
        RequestUpdateCheckStatus: {
          NO_UPDATE: "no_update",
          THROTTLED: "throttled",
          UPDATE_AVAILABLE: "update_available",
        }
      };

      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters)
      );

      // Plugins - mock realistic set
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [
            {
              0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format"},
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 1,
              name: "Chrome PDF Plugin"
            },
            {
              0: {type: "application/pdf", suffixes: "pdf", description: "Portable Document Format"},
              description: "Portable Document Format",
              filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
              length: 1,
              name: "Chrome PDF Viewer"
            },
            {
              0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable"},
              1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable"},
              description: "",
              filename: "internal-nacl-plugin",
              length: 2,
              name: "Native Client"
            }
          ];

          return plugins;
        }
      });

      // Languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });
  }
}
```

### 3. Fingerprint Spoofing Module

```typescript
// src/modules/fingerprint-spoofing.ts
export class FingerprintSpoofingModule {
  private profile: FingerprintProfile;

  constructor(profile?: FingerprintProfile) {
    this.profile = profile || this.generateProfile();
  }

  private generateProfile(): FingerprintProfile {
    return {
      canvas: this.generateCanvasProfile(),
      webgl: this.generateWebGLProfile(),
      audio: this.generateAudioProfile(),
      fonts: this.generateFontsProfile(),
      screen: this.generateScreenProfile(),
      hardware: this.generateHardwareProfile()
    };
  }

  async inject(page: Page): Promise<void> {
    await page.evaluateOnNewDocument((profile) => {
      // Canvas Fingerprint Protection
      const canvasNoise = (context: CanvasRenderingContext2D) => {
        const originalGetImageData = context.getImageData;
        context.getImageData = function(...args) {
          const imageData = originalGetImageData.apply(this, args);

          // Add subtle noise
          for (let i = 0; i < imageData.data.length; i += 4) {
            if (Math.random() < 0.001) { // 0.1% of pixels
              const noise = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
              imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
              imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + noise));
              imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + noise));
            }
          }

          return imageData;
        };
      };

      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const context = this.getContext('2d');
        if (context) {
          canvasNoise(context);
        }
        return originalToDataURL.apply(this, args);
      };

      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function(...args) {
        const context = this.getContext('2d');
        if (context) {
          canvasNoise(context);
        }
        return originalToBlob.apply(this, args);
      };

      // WebGL Fingerprint Protection
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return profile.webgl.vendor;
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return profile.webgl.renderer;
        }
        return getParameter.call(this, parameter);
      };

      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return profile.webgl.vendor;
        }
        if (parameter === 37446) {
          return profile.webgl.renderer;
        }
        return getParameter2.call(this, parameter);
      };

      // Audio Context Protection
      const audioContext = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function() {
        const oscillator = audioContext.apply(this, arguments);
        const originalStart = oscillator.start;
        oscillator.start = function(...args) {
          // Add micro-variation to frequency
          if (this.frequency) {
            const variation = (Math.random() - 0.5) * 0.0001;
            this.frequency.value += variation;
          }
          return originalStart.apply(this, args);
        };
        return oscillator;
      };

      // Screen properties
      Object.defineProperties(screen, {
        availWidth: { get: () => profile.screen.availWidth },
        availHeight: { get: () => profile.screen.availHeight },
        width: { get: () => profile.screen.width },
        height: { get: () => profile.screen.height },
        colorDepth: { get: () => profile.screen.colorDepth },
        pixelDepth: { get: () => profile.screen.pixelDepth }
      });

      // Hardware properties
      Object.defineProperties(navigator, {
        hardwareConcurrency: { get: () => profile.hardware.cores },
        deviceMemory: { get: () => profile.hardware.memory }
      });

    }, this.profile);
  }

  private generateCanvasProfile() {
    return {
      noiseLevel: Math.random() * 0.002 + 0.001 // 0.001-0.003
    };
  }

  private generateWebGLProfile() {
    const vendors = [
      { vendor: 'Intel Inc.', renderer: 'Intel Iris OpenGL Engine' },
      { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1060/PCIe/SSE2' },
      { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 580' },
      { vendor: 'Intel', renderer: 'Intel(R) UHD Graphics 630' }
    ];
    return vendors[Math.floor(Math.random() * vendors.length)];
  }

  private generateAudioProfile() {
    return {
      frequencyVariation: (Math.random() - 0.5) * 0.0002
    };
  }

  private generateFontsProfile() {
    // Standard Windows/Mac fonts
    return [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New',
      'Georgia', 'Palatino', 'Garamond', 'Comic Sans MS',
      'Trebuchet MS', 'Impact'
    ];
  }

  private generateScreenProfile() {
    const resolutions = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 },
      { width: 2560, height: 1440 }
    ];
    const resolution = resolutions[Math.floor(Math.random() * resolutions.length)];

    return {
      width: resolution.width,
      height: resolution.height,
      availWidth: resolution.width,
      availHeight: resolution.height - 40, // Taskbar
      colorDepth: 24,
      pixelDepth: 24
    };
  }

  private generateHardwareProfile() {
    const cores = [4, 6, 8, 12, 16];
    const memory = [4, 8, 16, 32];

    return {
      cores: cores[Math.floor(Math.random() * cores.length)],
      memory: memory[Math.floor(Math.random() * memory.length)]
    };
  }
}
```

### 4. Behavioral Simulation Module

```typescript
// src/modules/behavioral-simulation.ts
export class BehavioralSimulationModule {
  async inject(page: Page): Promise<void> {
    // Human-like mouse movements
    page.humanMove = async (x: number, y: number) => {
      const steps = Math.floor(Math.random() * 20) + 10;
      const startX = await page.evaluate(() => window.lastMouseX || 0);
      const startY = await page.evaluate(() => window.lastMouseY || 0);

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Bezier curve for natural movement
        const bezierT = t < 0.5
          ? 2 * t * t
          : -1 + (4 - 2 * t) * t;

        const currentX = startX + (x - startX) * bezierT;
        const currentY = startY + (y - startY) * bezierT;

        await page.mouse.move(
          currentX + (Math.random() - 0.5) * 2,
          currentY + (Math.random() - 0.5) * 2
        );

        await this.randomDelay(5, 15);
      }

      await page.evaluate((x, y) => {
        window.lastMouseX = x;
        window.lastMouseY = y;
      }, x, y);
    };

    // Human-like clicking
    page.humanClick = async (selector: string) => {
      const element = await page.$(selector);
      if (!element) throw new Error(`Element ${selector} not found`);

      const box = await element.boundingBox();
      if (!box) throw new Error(`Element ${selector} has no bounding box`);

      // Click slightly off-center
      const offsetX = (Math.random() - 0.5) * box.width * 0.3;
      const offsetY = (Math.random() - 0.5) * box.height * 0.3;

      const clickX = box.x + box.width / 2 + offsetX;
      const clickY = box.y + box.height / 2 + offsetY;

      await page.humanMove(clickX, clickY);
      await this.randomDelay(50, 150);

      await page.mouse.down();
      await this.randomDelay(30, 120);
      await page.mouse.up();

      await this.randomDelay(100, 300);
    };

    // Human-like typing
    page.humanType = async (selector: string, text: string) => {
      await page.humanClick(selector);
      await this.randomDelay(100, 300);

      for (const char of text) {
        await page.keyboard.type(char);

        // Variable typing speed (50-120 WPM)
        const wpm = 50 + Math.random() * 70;
        const cpm = wpm * 5; // characters per minute
        const delayMs = 60000 / cpm;

        await this.randomDelay(delayMs * 0.7, delayMs * 1.3);

        // Occasional longer pauses (thinking)
        if (Math.random() < 0.05) {
          await this.randomDelay(300, 1000);
        }
      }
    };

    // Human-like scrolling
    page.humanScroll = async (options: { direction: 'up' | 'down', distance?: number }) => {
      const distance = options.distance || Math.random() * 500 + 300;
      const steps = Math.floor(distance / (Math.random() * 30 + 20));
      const stepSize = distance / steps;

      for (let i = 0; i < steps; i++) {
        await page.evaluate((delta) => {
          window.scrollBy(0, delta);
        }, options.direction === 'down' ? stepSize : -stepSize);

        await this.randomDelay(10, 30);

        // Random pauses while scrolling
        if (Math.random() < 0.1) {
          await this.randomDelay(500, 2000);
        }
      }
    };
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### 5. Network Protection Module

```typescript
// src/modules/network-protection.ts
export class NetworkProtectionModule {
  private timing: NetworkTimingProfile;

  constructor() {
    this.timing = this.generateTimingProfile();
  }

  async interceptRequest(request: HTTPRequest): Promise<void> {
    // Realistic request headers
    const headers = {
      ...request.headers(),
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Sec-Fetch-Dest': this.getSecFetchDest(request.resourceType()),
      'Sec-Fetch-Mode': this.getSecFetchMode(request.resourceType()),
      'Sec-Fetch-Site': this.getSecFetchSite(request.url()),
      'Upgrade-Insecure-Requests': '1'
    };

    // Remove automation headers
    delete headers['X-Devtools-Emulate-Network-Conditions-Client-Id'];

    await request.continue({ headers });
  }

  private getSecFetchDest(resourceType: string): string {
    const mapping = {
      'document': 'document',
      'stylesheet': 'style',
      'image': 'image',
      'media': 'video',
      'font': 'font',
      'script': 'script',
      'xhr': 'empty',
      'fetch': 'empty'
    };
    return mapping[resourceType] || 'empty';
  }

  private getSecFetchMode(resourceType: string): string {
    return resourceType === 'document' ? 'navigate' : 'no-cors';
  }

  private getSecFetchSite(url: string): string {
    // Determine if cross-site, same-site, same-origin
    // Simplified version
    return 'none';
  }

  private generateTimingProfile() {
    return {
      dnsLookup: () => Math.random() * 50 + 10,
      tcpConnect: () => Math.random() * 100 + 30,
      tlsHandshake: () => Math.random() * 150 + 50,
      ttfb: () => Math.random() * 200 + 100
    };
  }
}
```

### 6. Profile Manager

```typescript
// src/core/profile-manager.ts
export class ProfileManager {
  private storage: ProfileStorage;
  private activeProfiles: Map<string, BrowserProfile>;

  constructor(storageConfig: StorageConfig) {
    this.storage = new ProfileStorage(storageConfig);
    this.activeProfiles = new Map();
  }

  async createProfile(options?: ProfileOptions): Promise<BrowserProfile> {
    const profile: BrowserProfile = {
      id: generateUUID(),
      fingerprint: new FingerprintSpoofingModule().generateProfile(),
      userAgent: this.generateUserAgent(),
      viewport: this.generateViewport(),
      timezone: options?.timezone || 'America/New_York',
      locale: options?.locale || 'en-US',
      geolocation: options?.geolocation,
      permissions: options?.permissions || {},
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      createdAt: new Date(),
      lastUsed: new Date()
    };

    await this.storage.save(profile);
    return profile;
  }

  async loadProfile(profileId: string): Promise<BrowserProfile> {
    const profile = await this.storage.load(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    this.activeProfiles.set(profileId, profile);
    return profile;
  }

  async updateProfile(profileId: string, updates: Partial<BrowserProfile>): Promise<void> {
    const profile = await this.loadProfile(profileId);
    Object.assign(profile, updates, { lastUsed: new Date() });
    await this.storage.save(profile);
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.storage.delete(profileId);
    this.activeProfiles.delete(profileId);
  }

  private generateUserAgent(): string {
    // Generate realistic UA based on current Chrome version
    const version = '120.0.6099.129';
    const platforms = [
      'Windows NT 10.0; Win64; x64',
      'Macintosh; Intel Mac OS X 10_15_7',
      'X11; Linux x86_64'
    ];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
  }

  private generateViewport() {
    const resolutions = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 }
    ];
    return resolutions[Math.floor(Math.random() * resolutions.length)];
  }
}
```

---

## 🚀 Main API Interface

```typescript
// src/index.ts
export class UndetectBrowser {
  private stealthEngine: StealthEngine;
  private profileManager: ProfileManager;
  private browserPool: BrowserPool;

  constructor(config?: UndetectConfig) {
    this.stealthEngine = new StealthEngineImpl(config?.stealth);
    this.profileManager = new ProfileManager(config?.storage);
    this.browserPool = new BrowserPool(config?.pool);
  }

  async launch(options?: LaunchOptions): Promise<UndetectBrowserInstance> {
    // Get or create profile
    const profile = options?.profileId
      ? await this.profileManager.loadProfile(options.profileId)
      : await this.profileManager.createProfile(options?.profile);

    // Launch browser with stealth
    const browser = await this.browserPool.acquire({
      ...options,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        `--user-agent=${profile.userAgent}`,
        ...( options?.args || [])
      ]
    });

    // Apply stealth protections
    browser.on('targetcreated', async (target) => {
      const page = await target.page();
      if (page) {
        await this.stealthEngine.applyProtections(page);
        await this.applyProfile(page, profile);
      }
    });

    return new UndetectBrowserInstance(browser, profile, this);
  }

  private async applyProfile(page: Page, profile: BrowserProfile): Promise<void> {
    // Set viewport
    await page.setViewport(profile.viewport);

    // Set geolocation
    if (profile.geolocation) {
      await page.setGeolocation(profile.geolocation);
    }

    // Set timezone
    await page.emulateTimezone(profile.timezone);

    // Restore cookies
    if (profile.cookies.length) {
      await page.setCookie(...profile.cookies);
    }

    // Restore localStorage/sessionStorage
    await page.evaluateOnNewDocument((localStorage, sessionStorage) => {
      Object.keys(localStorage).forEach(key => {
        window.localStorage.setItem(key, localStorage[key]);
      });
      Object.keys(sessionStorage).forEach(key => {
        window.sessionStorage.setItem(key, sessionStorage[key]);
      });
    }, profile.localStorage, profile.sessionStorage);
  }
}

// Usage example:
const undetect = new UndetectBrowser({
  stealth: { level: 'paranoid' },
  storage: { type: 'file', path: './profiles' }
});

const browser = await undetect.launch();
const page = await browser.newPage();

await page.humanType('#search', 'example query');
await page.humanClick('button[type="submit"]');
await page.humanScroll({ direction: 'down' });
```

---

## 📦 Структура проекта

```
undetect-browser/
├── src/
│   ├── core/
│   │   ├── stealth-engine.ts
│   │   ├── profile-manager.ts
│   │   ├── browser-pool.ts
│   │   └── detection-monitor.ts
│   ├── modules/
│   │   ├── webdriver-evasion.ts
│   │   ├── fingerprint-spoofing.ts
│   │   ├── behavioral-simulation.ts
│   │   ├── network-protection.ts
│   │   └── plugins/
│   ├── patches/
│   │   ├── chromium/
│   │   │   ├── navigator.patch
│   │   │   ├── webdriver.patch
│   │   │   └── devtools.patch
│   │   └── apply-patches.sh
│   ├── utils/
│   │   ├── fingerprint-generator.ts
│   │   ├── timing-randomizer.ts
│   │   └── logger.ts
│   ├── storage/
│   │   ├── profile-storage.ts
│   │   ├── file-storage.ts
│   │   └── database-storage.ts
│   ├── types/
│   │   └── index.d.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── detection/
├── examples/
│   ├── basic-usage.ts
│   ├── advanced-profile.ts
│   └── mass-automation.ts
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── CONTRIBUTING.md
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔄 Continuous Adaptation System

```typescript
// src/core/detection-monitor.ts
export class DetectionMonitor {
  private testSites: string[] = [
    'https://bot.sannysoft.com/',
    'https://arh.antoinevastel.com/bots/areyouheadless',
    'https://pixelscan.net/'
  ];

  async runTests(): Promise<DetectionReport> {
    const results = await Promise.all(
      this.testSites.map(site => this.testSite(site))
    );

    return this.analyzeResults(results);
  }

  private async testSite(url: string): Promise<TestResult> {
    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Extract detection results from page
    const detections = await page.evaluate(() => {
      // Site-specific scraping logic
      return window.detectionResults;
    });

    await page.close();
    return { url, detections };
  }

  private analyzeResults(results: TestResult[]): DetectionReport {
    const failed = results.filter(r => r.detections.length > 0);

    if (failed.length > 0) {
      console.warn(`⚠️ Detected on ${failed.length} sites`);
      this.adaptProtections(failed);
    }

    return {
      timestamp: new Date(),
      totalTests: results.length,
      failedTests: failed.length,
      details: results
    };
  }

  private async adaptProtections(failures: TestResult[]): Promise<void> {
    // ML-based adaptation logic
    const patterns = this.extractPatterns(failures);
    await this.updateProtections(patterns);
  }
}
```

---

Эта архитектура обеспечивает модульность, расширяемость и максимальную защиту от детекции.
