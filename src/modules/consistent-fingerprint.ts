/**
 * Advanced Consistent Fingerprint Generator
 * Generates realistic, consistent fingerprints based on proxy geolocation
 */

import { Page } from 'puppeteer';

export interface GeoLocation {
  country: string;
  countryCode: string;
  city: string;
  timezone: string;
  locale: string;
  languages: string[];
  currency: string;
  latitude: number;
  longitude: number;
}

export interface ConsistentFingerprint {
  userAgent: string;
  platform: string;
  vendor: string;
  renderer: string;
  languages: string[];
  timezone: string;
  locale: string;
  resolution: { width: number; height: number };
  colorDepth: number;
  pixelRatio: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  canvas: {
    noise: number;
    seed: string;
  };
  webgl: {
    vendor: string;
    renderer: string;
    unmasked: boolean;
  };
  audio: {
    noise: number;
    oscillator: number;
  };
  fonts: string[];
  plugins: any[];
  mediaDevices: {
    audioinput: number;
    audiooutput: number;
    videoinput: number;
  };
  battery: {
    charging: boolean;
    level: number;
  };
  geolocation: GeoLocation;
}

/**
 * Geolocation database by country
 */
const GEO_DATABASE: Record<string, GeoLocation> = {
  US: {
    country: 'United States',
    countryCode: 'US',
    city: 'New York',
    timezone: 'America/New_York',
    locale: 'en-US',
    languages: ['en-US', 'en'],
    currency: 'USD',
    latitude: 40.7128,
    longitude: -74.0060,
  },
  GB: {
    country: 'United Kingdom',
    countryCode: 'GB',
    city: 'London',
    timezone: 'Europe/London',
    locale: 'en-GB',
    languages: ['en-GB', 'en'],
    currency: 'GBP',
    latitude: 51.5074,
    longitude: -0.1278,
  },
  DE: {
    country: 'Germany',
    countryCode: 'DE',
    city: 'Berlin',
    timezone: 'Europe/Berlin',
    locale: 'de-DE',
    languages: ['de-DE', 'de', 'en-US'],
    currency: 'EUR',
    latitude: 52.5200,
    longitude: 13.4050,
  },
  FR: {
    country: 'France',
    countryCode: 'FR',
    city: 'Paris',
    timezone: 'Europe/Paris',
    locale: 'fr-FR',
    languages: ['fr-FR', 'fr', 'en-US'],
    currency: 'EUR',
    latitude: 48.8566,
    longitude: 2.3522,
  },
  ES: {
    country: 'Spain',
    countryCode: 'ES',
    city: 'Madrid',
    timezone: 'Europe/Madrid',
    locale: 'es-ES',
    languages: ['es-ES', 'es', 'en-US'],
    currency: 'EUR',
    latitude: 40.4168,
    longitude: -3.7038,
  },
  IT: {
    country: 'Italy',
    countryCode: 'IT',
    city: 'Rome',
    timezone: 'Europe/Rome',
    locale: 'it-IT',
    languages: ['it-IT', 'it', 'en-US'],
    currency: 'EUR',
    latitude: 41.9028,
    longitude: 12.4964,
  },
  RU: {
    country: 'Russia',
    countryCode: 'RU',
    city: 'Moscow',
    timezone: 'Europe/Moscow',
    locale: 'ru-RU',
    languages: ['ru-RU', 'ru', 'en-US'],
    currency: 'RUB',
    latitude: 55.7558,
    longitude: 37.6173,
  },
  CN: {
    country: 'China',
    countryCode: 'CN',
    city: 'Beijing',
    timezone: 'Asia/Shanghai',
    locale: 'zh-CN',
    languages: ['zh-CN', 'zh', 'en-US'],
    currency: 'CNY',
    latitude: 39.9042,
    longitude: 116.4074,
  },
  JP: {
    country: 'Japan',
    countryCode: 'JP',
    city: 'Tokyo',
    timezone: 'Asia/Tokyo',
    locale: 'ja-JP',
    languages: ['ja-JP', 'ja', 'en-US'],
    currency: 'JPY',
    latitude: 35.6762,
    longitude: 139.6503,
  },
  BR: {
    country: 'Brazil',
    countryCode: 'BR',
    city: 'São Paulo',
    timezone: 'America/Sao_Paulo',
    locale: 'pt-BR',
    languages: ['pt-BR', 'pt', 'en-US'],
    currency: 'BRL',
    latitude: -23.5505,
    longitude: -46.6333,
  },
  AU: {
    country: 'Australia',
    countryCode: 'AU',
    city: 'Sydney',
    timezone: 'Australia/Sydney',
    locale: 'en-AU',
    languages: ['en-AU', 'en'],
    currency: 'AUD',
    latitude: -33.8688,
    longitude: 151.2093,
  },
  CA: {
    country: 'Canada',
    countryCode: 'CA',
    city: 'Toronto',
    timezone: 'America/Toronto',
    locale: 'en-CA',
    languages: ['en-CA', 'en', 'fr-CA'],
    currency: 'CAD',
    latitude: 43.6532,
    longitude: -79.3832,
  },
};

/**
 * Common fonts by operating system
 */
const FONTS_BY_OS: Record<string, string[]> = {
  Windows: [
    'Arial', 'Calibri', 'Cambria', 'Cambria Math', 'Comic Sans MS',
    'Consolas', 'Courier New', 'Georgia', 'Impact', 'Lucida Console',
    'Lucida Sans Unicode', 'Microsoft Sans Serif', 'Palatino Linotype',
    'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana',
  ],
  macOS: [
    'American Typewriter', 'Andale Mono', 'Arial', 'Arial Black',
    'Brush Script MT', 'Comic Sans MS', 'Courier', 'Courier New',
    'Georgia', 'Helvetica', 'Helvetica Neue', 'Impact', 'Lucida Grande',
    'Monaco', 'Palatino', 'Times', 'Times New Roman', 'Trebuchet MS',
    'Verdana', 'SF Pro Display', 'SF Pro Text',
  ],
  Linux: [
    'Arial', 'Century Schoolbook L', 'Courier 10 Pitch', 'DejaVu Sans',
    'DejaVu Sans Mono', 'DejaVu Serif', 'Droid Sans', 'FreeMono',
    'FreeSans', 'FreeSerif', 'Liberation Mono', 'Liberation Sans',
    'Liberation Serif', 'Nimbus Mono L', 'Nimbus Roman No9 L',
    'Nimbus Sans L', 'Ubuntu', 'Ubuntu Mono',
  ],
};

/**
 * WebGL renderers by GPU vendor
 */
const WEBGL_CONFIGS: Record<string, { vendor: string; renderer: string }[]> = {
  NVIDIA: [
    { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3060/PCIe/SSE2' },
    { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1660 Ti/PCIe/SSE2' },
    { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2070/PCIe/SSE2' },
  ],
  Intel: [
    { vendor: 'Intel Inc.', renderer: 'Intel(R) UHD Graphics 630' },
    { vendor: 'Intel Inc.', renderer: 'Intel(R) Iris(R) Plus Graphics 655' },
    { vendor: 'Intel Inc.', renderer: 'Intel(R) HD Graphics 620' },
  ],
  AMD: [
    { vendor: 'AMD', renderer: 'AMD Radeon RX 580 Series' },
    { vendor: 'AMD', renderer: 'AMD Radeon RX 5700 XT' },
    { vendor: 'AMD', renderer: 'AMD Radeon(TM) Graphics' },
  ],
};

/**
 * Generate consistent fingerprint based on proxy country
 */
export function generateConsistentFingerprint(
  proxyCountry?: string,
  seed?: string
): ConsistentFingerprint {
  const randomSeed = seed || Math.random().toString(36).substring(2);
  const seededRandom = createSeededRandom(randomSeed);

  // Get geolocation based on proxy
  const countryCode = proxyCountry?.toUpperCase() || 'US';
  const geo = GEO_DATABASE[countryCode] || GEO_DATABASE.US!;

  // Determine OS (platform)
  const platforms = ['Windows', 'macOS', 'Linux'];
  const platformWeights = [0.7, 0.2, 0.1]; // Windows most common
  const platform = weightedChoice(platforms, platformWeights, seededRandom);

  // Generate user agent consistent with platform and location
  const userAgent = generateConsistentUserAgent(platform, geo.locale, seededRandom);

  // Screen resolution (common resolutions)
  const resolutions = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 2560, height: 1440 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
  ];
  const resolutionIndex = Math.floor(seededRandom() * resolutions.length);
  const resolution = resolutions[resolutionIndex] || resolutions[0]!;

  // WebGL configuration
  const gpuVendors = ['NVIDIA', 'Intel', 'AMD'];
  const gpuWeights = [0.5, 0.3, 0.2];
  const gpuVendor = weightedChoice(gpuVendors, gpuWeights, seededRandom);
  const webglConfigs = WEBGL_CONFIGS[gpuVendor] || WEBGL_CONFIGS.NVIDIA!;
  const webglIndex = Math.floor(seededRandom() * webglConfigs.length);
  const webglConfig = webglConfigs[webglIndex] || webglConfigs[0] || {
    vendor: 'Google Inc.',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  };

  // Hardware specs
  const cpuCores = [2, 4, 6, 8, 12, 16];
  const hardwareConcurrency = cpuCores[Math.floor(seededRandom() * cpuCores.length)] || 8;
  const memoryOptions = [2, 4, 8, 16];
  const deviceMemory = memoryOptions[Math.floor(seededRandom() * memoryOptions.length)] || 8;

  // Pixel ratio
  const pixelRatios = [1, 1.25, 1.5, 2];
  const pixelRatio = pixelRatios[Math.floor(seededRandom() * pixelRatios.length)] || 1;

  return {
    userAgent,
    platform: getPlatformString(platform),
    vendor: platform === 'macOS' ? 'Apple Computer, Inc.' : 'Google Inc.',
    renderer: webglConfig.renderer,
    languages: geo.languages,
    timezone: geo.timezone,
    locale: geo.locale,
    resolution,
    colorDepth: 24,
    pixelRatio,
    hardwareConcurrency,
    deviceMemory,
    canvas: {
      noise: 0.001 + seededRandom() * 0.004, // 0.001-0.005
      seed: randomSeed,
    },
    webgl: {
      vendor: webglConfig.vendor,
      renderer: webglConfig.renderer,
      unmasked: false,
    },
    audio: {
      noise: seededRandom() * 0.0001,
      oscillator: seededRandom(),
    },
    fonts: FONTS_BY_OS[platform] || FONTS_BY_OS.Windows!,
    plugins: generatePlugins(platform, seededRandom),
    mediaDevices: {
      audioinput: 1,
      audiooutput: Math.floor(seededRandom() * 2) + 1,
      videoinput: Math.random() > 0.5 ? 1 : 0,
    },
    battery: {
      charging: seededRandom() > 0.5,
      level: 0.5 + seededRandom() * 0.5, // 50-100%
    },
    geolocation: geo,
  };
}

/**
 * Apply consistent fingerprint to page
 */
export async function applyConsistentFingerprint(
  page: Page,
  fingerprint: ConsistentFingerprint
): Promise<void> {
  await page.evaluateOnNewDocument((fp) => {
    // Wrap everything in try-catch to prevent page breakage
    try {
      // ============================================================
      // SAFE PROPERTY ACCESS HELPER
      // ============================================================
      const safeGet = (obj: any, path: string, defaultVal: any) => {
        try {
          const keys = path.split('.');
          let result = obj;
          for (const key of keys) {
            if (result === null || result === undefined) return defaultVal;
            result = result[key];
          }
          return result ?? defaultVal;
        } catch {
          return defaultVal;
        }
      };

      // ============================================================
      // NATIVE FUNCTION SPOOFING UTILITY
      // ============================================================
      // NOTE: We intentionally do NOT override Function.prototype.toString
      // Overriding it is detectable by hasToStringProxy check in CreepJS
      // Instead, we just define our functions normally - detection scripts
      // primarily check VALUES (like navigator.webdriver), not whether
      // getter functions look "native"

      // Simple pass-through helper (no longer spoofs toString)
      function makeNative<T extends Function>(fn: T, _name: string): T {
        return fn;
      }

    // ============================================================
    // CRITICAL: Anti-Bot Detection - Must be first!
    // ============================================================

    // Remove webdriver flag - MOST IMPORTANT for bot detection
    // CRITICAL: Must return false, not undefined! undefined triggers detection
    Object.defineProperty(navigator, 'webdriver', {
      get: makeNative(() => false, 'get webdriver'),
      configurable: true,
    });

    // Also remove from prototype chain
    try {
      delete (Object.getPrototypeOf(navigator) as any).webdriver;
    } catch (e) {
      // Ignore if not deletable
    }

    // IMPORTANT: Do NOT override userAgent - it causes mismatch with HTTP headers
    // The browser sends real userAgent in HTTP headers, changing it in JS = detection
    // Only override if explicitly set (non-empty)
    if (fp.userAgent && fp.userAgent.length > 0) {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => fp.userAgent,
        configurable: true,
      });
    }

    // ============================================================
    // PLUGINS & MIMETYPES SPOOFING - Use prototype override
    // ============================================================

    // Chrome's default plugins (PDF viewers)
    const chromePlugins = [
      {
        name: 'PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
        mimeTypes: [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
        ]
      },
      {
        name: 'Chrome PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
        mimeTypes: [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
        ]
      },
      {
        name: 'Chromium PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
        mimeTypes: [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
        ]
      },
    ];

    // Build fake Plugin objects
    const fakePlugins: any[] = chromePlugins.map((p, idx) => {
      const plugin: any = Object.create(Plugin.prototype);
      Object.defineProperties(plugin, {
        name: { value: p.name, enumerable: true },
        filename: { value: p.filename, enumerable: true },
        description: { value: p.description, enumerable: true },
        length: { value: p.mimeTypes.length, enumerable: true },
      });
      p.mimeTypes.forEach((mt, i) => {
        const mimeType: any = Object.create(MimeType.prototype);
        Object.defineProperties(mimeType, {
          type: { value: mt.type, enumerable: true },
          suffixes: { value: mt.suffixes, enumerable: true },
          description: { value: mt.description, enumerable: true },
          enabledPlugin: { value: plugin, enumerable: true },
        });
        Object.defineProperty(plugin, i, { value: mimeType, enumerable: true });
      });
      plugin.item = function(i: number) { return this[i]; };
      plugin.namedItem = function(name: string) {
        for (let i = 0; i < this.length; i++) {
          if (this[i]?.type === name) return this[i];
        }
        return null;
      };
      return plugin;
    });

    // Build fake PluginArray
    const fakePluginArray: any = Object.create(PluginArray.prototype);
    Object.defineProperty(fakePluginArray, 'length', { value: fakePlugins.length, enumerable: true });
    fakePlugins.forEach((plugin, i) => {
      Object.defineProperty(fakePluginArray, i, { value: plugin, enumerable: true });
    });
    fakePluginArray.item = function(i: number) { return fakePlugins[i]; };
    fakePluginArray.namedItem = function(name: string) { return fakePlugins.find(p => p.name === name) || null; };
    fakePluginArray.refresh = function() {};
    fakePluginArray[Symbol.iterator] = function*() { for (const p of fakePlugins) yield p; };

    // Build fake MimeTypeArray
    const allMimeTypes: any[] = [];
    fakePlugins.forEach(plugin => {
      for (let i = 0; i < plugin.length; i++) {
        allMimeTypes.push(plugin[i]);
      }
    });
    const fakeMimeTypeArray: any = Object.create(MimeTypeArray.prototype);
    Object.defineProperty(fakeMimeTypeArray, 'length', { value: allMimeTypes.length, enumerable: true });
    allMimeTypes.forEach((mt, i) => {
      Object.defineProperty(fakeMimeTypeArray, i, { value: mt, enumerable: true });
    });
    fakeMimeTypeArray.item = function(i: number) { return allMimeTypes[i]; };
    fakeMimeTypeArray.namedItem = function(name: string) { return allMimeTypes.find(m => m.type === name) || null; };
    fakeMimeTypeArray[Symbol.iterator] = function*() { for (const m of allMimeTypes) yield m; };

    // Override navigator.plugins using getter on Navigator.prototype
    try {
      Object.defineProperty(Navigator.prototype, 'plugins', {
        get: function() { return fakePluginArray; },
        configurable: true,
      });
      Object.defineProperty(Navigator.prototype, 'mimeTypes', {
        get: function() { return fakeMimeTypeArray; },
        configurable: true,
      });
    } catch {
      // Fallback: try direct property
      try {
        Object.defineProperty(navigator, 'plugins', {
          get: () => fakePluginArray,
          configurable: true,
        });
        Object.defineProperty(navigator, 'mimeTypes', {
          get: () => fakeMimeTypeArray,
          configurable: true,
        });
      } catch { /* ignore */ }
    }

    // ============================================================
    // COMPREHENSIVE CHROME OBJECT (Anti-Headless Detection)
    // ============================================================
    if (!(window as any).chrome) {
      (window as any).chrome = {};
    }

    // chrome.runtime - Functions must NOT have prototype property (like native functions)
    // This is checked by hasBadChromeRuntime detection in CreepJS
    (window as any).chrome.runtime = {
      PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
      PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64' },
      PlatformNaclArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64' },
      RequestUpdateCheckStatus: { THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available' },
      OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update' },
      OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
      // Functions without prototype property (like native)
      connect: (() => {
        const fn = function connect(extensionId?: string, connectInfo?: any) {
          if (new.target) throw new TypeError('Illegal constructor');
          return {
            name: connectInfo?.name || '',
            disconnect: function() {},
            onDisconnect: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
            onMessage: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
            postMessage: function() {},
            sender: undefined,
          };
        };
        delete (fn as any).prototype;
        return fn;
      })(),
      sendMessage: (() => {
        const fn = function sendMessage(extensionId?: any, message?: any, options?: any, callback?: any) {
          if (new.target) throw new TypeError('Illegal constructor');
          if (typeof callback === 'function') setTimeout(() => callback(undefined), 0);
          else if (typeof options === 'function') setTimeout(() => options(undefined), 0);
          else if (typeof message === 'function') setTimeout(() => message(undefined), 0);
          return Promise.resolve(undefined);
        };
        delete (fn as any).prototype;
        return fn;
      })(),
      getManifest: (() => {
        const fn = function getManifest() {
          if (new.target) throw new TypeError('Illegal constructor');
          return undefined;
        };
        delete (fn as any).prototype;
        return fn;
      })(),
      getURL: (() => {
        const fn = function getURL(path: string) {
          if (new.target) throw new TypeError('Illegal constructor');
          return '';
        };
        delete (fn as any).prototype;
        return fn;
      })(),
      id: undefined,
      lastError: undefined,
    };

    // chrome.app - exists in real Chrome
    (window as any).chrome.app = {
      isInstalled: false,
      InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
      RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
      getDetails: () => null,
      getIsInstalled: () => false,
      runningState: () => 'cannot_run',
    };

    // chrome.csi - timing info (generate ONCE and cache for consistency)
    const csiStartE = Date.now() - Math.floor(Math.random() * 500 + 200);
    const csiPageT = Math.floor(Math.random() * 300 + 100);
    const csiOnloadT = csiStartE + csiPageT;
    const cachedCsi = {
      onloadT: csiOnloadT,
      startE: csiStartE,
      pageT: csiPageT,
      tran: 15,
    };
    (window as any).chrome.csi = function csi() {
      return cachedCsi;
    };

    // chrome.loadTimes - deprecated but still checked (generate ONCE)
    const loadTimesBase = Date.now() / 1000;
    const cachedLoadTimes = {
      commitLoadTime: loadTimesBase - 0.5,
      connectionInfo: 'h2',
      finishDocumentLoadTime: loadTimesBase - 0.1,
      finishLoadTime: loadTimesBase,
      firstPaintAfterLoadTime: 0,
      firstPaintTime: loadTimesBase - 0.3,
      navigationType: 'Other',
      npnNegotiatedProtocol: 'h2',
      requestTime: loadTimesBase - 0.8,
      startLoadTime: loadTimesBase - 0.7,
      wasAlternateProtocolAvailable: false,
      wasFetchedViaSpdy: true,
      wasNpnNegotiated: true,
    };
    (window as any).chrome.loadTimes = function loadTimes() {
      return cachedLoadTimes;
    };

    // ============================================================
    // WINDOW/VIEWPORT PROPERTIES - MUST BE CONSISTENT
    // ============================================================

    // Standard scrollbar width on Windows
    const scrollbarWidth = 17;
    const browserChromeHeight = 0; // For maximized window
    const taskbarHeight = 40;

    // Calculate consistent values
    const screenW = fp.resolution.width;
    const screenH = fp.resolution.height;
    const availH = screenH - taskbarHeight;

    // Browser chrome heights (typical values)
    const browserToolbarHeight = 85; // Address bar + tabs + bookmarks
    // scrollbarWidth already defined above

    // For maximized window:
    // outerWidth = screen.availWidth (full window)
    // innerWidth = outerWidth - scrollbar (viewport without scrollbar)
    // outerHeight = screen.availHeight (full window)
    // innerHeight = outerHeight - browser chrome (viewport area)

    const outerW = screenW;
    const outerH = availH;
    const innerW = screenW - scrollbarWidth; // Viewport is smaller than window
    const innerH = availH - browserToolbarHeight; // Minus browser chrome

    // outerWidth/outerHeight - browser window size (larger)
    Object.defineProperty(window, 'outerWidth', {
      get: () => outerW,
      configurable: true,
    });

    Object.defineProperty(window, 'outerHeight', {
      get: () => outerH,
      configurable: true,
    });

    // innerWidth/innerHeight - viewport size (smaller)
    Object.defineProperty(window, 'innerWidth', {
      get: () => innerW,
      configurable: true,
    });

    Object.defineProperty(window, 'innerHeight', {
      get: () => innerH,
      configurable: true,
    });

    // screenX/screenY - window position (0 for maximized)
    Object.defineProperty(window, 'screenX', {
      get: () => 0,
      configurable: true,
    });

    Object.defineProperty(window, 'screenY', {
      get: () => 0,
      configurable: true,
    });

    Object.defineProperty(window, 'screenLeft', {
      get: () => 0,
      configurable: true,
    });

    Object.defineProperty(window, 'screenTop', {
      get: () => 0,
      configurable: true,
    });

    // VisualViewport API - IMPORTANT for consistency
    if (window.visualViewport) {
      Object.defineProperty(window.visualViewport, 'width', {
        get: () => innerW,
        configurable: true,
      });
      Object.defineProperty(window.visualViewport, 'height', {
        get: () => innerH,
        configurable: true,
      });
      Object.defineProperty(window.visualViewport, 'offsetLeft', {
        get: () => 0,
        configurable: true,
      });
      Object.defineProperty(window.visualViewport, 'offsetTop', {
        get: () => 0,
        configurable: true,
      });
      Object.defineProperty(window.visualViewport, 'pageLeft', {
        get: () => 0,
        configurable: true,
      });
      Object.defineProperty(window.visualViewport, 'pageTop', {
        get: () => 0,
        configurable: true,
      });
      Object.defineProperty(window.visualViewport, 'scale', {
        get: () => 1,
        configurable: true,
      });
    }

    // ============================================================
    // NOTIFICATION (Anti-Headless Detection)
    // ============================================================
    // In headless mode, Notification.permission is often "denied" by default
    if (typeof Notification !== 'undefined') {
      Object.defineProperty(Notification, 'permission', {
        get: () => 'default',
        configurable: true,
      });
    }

    // ============================================================
    // NAVIGATOR CONNECTION (Network Information API)
    // ============================================================
    if ((navigator as any).connection) {
      Object.defineProperty((navigator as any).connection, 'rtt', {
        get: () => 50 + Math.floor(Math.random() * 50),
        configurable: true,
      });
      Object.defineProperty((navigator as any).connection, 'downlink', {
        get: () => 10 + Math.random() * 5,
        configurable: true,
      });
      Object.defineProperty((navigator as any).connection, 'effectiveType', {
        get: () => '4g',
        configurable: true,
      });
      Object.defineProperty((navigator as any).connection, 'saveData', {
        get: () => false,
        configurable: true,
      });
    }

    // ============================================================
    // DOCUMENT PROPERTIES
    // ============================================================
    // document.hidden should be false (visible tab)
    Object.defineProperty(document, 'hidden', {
      get: () => false,
      configurable: true,
    });

    Object.defineProperty(document, 'visibilityState', {
      get: () => 'visible',
      configurable: true,
    });

    // ============================================================
    // CONSOLE (Hide "cdc_" markers used by ChromeDriver)
    // ============================================================
    // Remove any console markers
    const originalConsoleLog = console.log;
    console.log = function(...args: any[]) {
      // Filter out potential detection markers
      const filtered = args.filter(arg => {
        if (typeof arg === 'string') {
          return !arg.includes('cdc_') && !arg.includes('webdriver');
        }
        return true;
      });
      if (filtered.length > 0) {
        originalConsoleLog.apply(console, filtered);
      }
    };

    // Remove Puppeteer/Playwright/Selenium indicators
    const automationProps = [
      '__puppeteer_evaluation_script__',
      '__webdriver_evaluate',
      '__selenium_evaluate',
      '__webdriver_script_function',
      '__webdriver_script_func',
      '__webdriver_script_fn',
      '__fxdriver_evaluate',
      '__driver_unwrapped',
      '__webdriver_unwrapped',
      '__driver_evaluate',
      '__selenium_unwrapped',
      '__fxdriver_unwrapped',
      '_Selenium_IDE_Recorder',
      '_selenium',
      'callSelenium',
      'calledSelenium',
      '$chrome_asyncScriptInfo',
    ];

    // Delete all known automation properties
    automationProps.forEach(prop => {
      try { delete (window as any)[prop]; } catch {}
    });

    // Remove ALL cdc_ prefixed properties (Chrome DevTools Protocol markers)
    // These are dynamically generated, so we need to find and remove them
    Object.getOwnPropertyNames(window).forEach(prop => {
      if (prop.match(/^\$?cdc_/i) || prop.match(/^[\$_]*[Cc]dc/)) {
        try {
          delete (window as any)[prop];
        } catch {}
      }
    });

    // Also check document for automation markers
    Object.getOwnPropertyNames(document).forEach(prop => {
      if (prop.match(/^\$?cdc_/i) || prop.match(/^[\$_]*[Cc]dc/) || prop.match(/webdriver|selenium|puppeteer/i)) {
        try {
          delete (document as any)[prop];
        } catch {}
      }
    });

    // Prevent new automation properties from being added
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj: any, prop: PropertyKey, descriptor: PropertyDescriptor) {
      const propStr = String(prop);
      // Block automation-related properties from being defined
      if (propStr.match(/^\$?cdc_/i) || propStr.match(/webdriver|selenium|puppeteer/i)) {
        return obj; // Silently ignore
      }
      return originalDefineProperty.call(Object, obj, prop, descriptor);
    };

    // Hide automation in permissions - handle ALL common permission types
    const originalQuery = navigator.permissions.query;
    navigator.permissions.query = makeNative(function(parameters: any): Promise<PermissionStatus> {
      // Create a fake PermissionStatus object
      const createPermissionStatus = (name: string, state: PermissionState): PermissionStatus => ({
        state,
        name: name as PermissionName,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      } as unknown as PermissionStatus);

      // Handle common permission types that PixelScan might check
      const permissionName = parameters.name;
      switch (permissionName) {
        case 'notifications': {
          // Map notification permission: 'default' -> 'prompt'
          let notifState: PermissionState = 'prompt';
          if (typeof Notification !== 'undefined') {
            notifState = Notification.permission === 'granted' ? 'granted' :
                         Notification.permission === 'denied' ? 'denied' : 'prompt';
          }
          return Promise.resolve(createPermissionStatus(permissionName, notifState));
        }
        case 'geolocation':
          return Promise.resolve(createPermissionStatus(permissionName, 'granted'));
        case 'camera':
        case 'microphone':
        case 'midi':
        case 'persistent-storage':
        case 'push':
        case 'clipboard-read':
        case 'clipboard-write':
        case 'screen-wake-lock':
        case 'accelerometer':
        case 'gyroscope':
        case 'magnetometer':
        case 'ambient-light-sensor':
        case 'background-sync':
        case 'display-capture':
          return Promise.resolve(createPermissionStatus(permissionName, 'prompt'));
        default:
          // For unknown permissions, try original query but catch errors
          return originalQuery.call(navigator.permissions, parameters).catch(() =>
            createPermissionStatus(permissionName, 'prompt'));
      }
    }, 'query');

    // ============================================================
    // COMPREHENSIVE HEADLESS DETECTION EVASION
    // ============================================================

    // Override navigator.languages to ensure it's an array (headless can have issues)
    if (!navigator.languages || navigator.languages.length === 0) {
      Object.defineProperty(navigator, 'languages', {
        get: makeNative(() => ['en-US', 'en'], 'get languages'),
        configurable: true,
      });
    }

    // Ensure navigator.cookieEnabled is true
    Object.defineProperty(navigator, 'cookieEnabled', {
      get: makeNative(() => true, 'get cookieEnabled'),
      configurable: true,
    });

    // Ensure navigator.onLine is true
    Object.defineProperty(navigator, 'onLine', {
      get: makeNative(() => true, 'get onLine'),
      configurable: true,
    });

    // Ensure navigator.javaEnabled returns false (normal for modern browsers)
    navigator.javaEnabled = makeNative(() => false, 'javaEnabled');

    // Fix navigator.maxTouchPoints for desktop (0 for non-touch devices)
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: makeNative(() => 0, 'get maxTouchPoints'),
      configurable: true,
    });

    // Fix window.chrome existence check
    if (typeof (window as any).chrome === 'undefined') {
      (window as any).chrome = {};
    }

    // Ensure Error stack traces don't reveal automation
    const originalError = Error;
    (window as any).Error = function(message?: string) {
      const error = new originalError(message);
      // Clean up stack trace
      if (error.stack) {
        error.stack = error.stack
          .replace(/puppeteer/gi, 'chrome')
          .replace(/playwright/gi, 'chrome')
          .replace(/selenium/gi, 'chrome')
          .replace(/webdriver/gi, 'chrome');
      }
      return error;
    };
    (window as any).Error.prototype = originalError.prototype;
    Object.getOwnPropertyNames(originalError).forEach(prop => {
      if (prop !== 'prototype' && prop !== 'length' && prop !== 'name') {
        try {
          (window as any).Error[prop] = (originalError as any)[prop];
        } catch {}
      }
    });

    // ============================================================
    // Override navigator properties
    // ============================================================

    Object.defineProperty(navigator, 'platform', {
      get: () => fp.platform,
    });

    Object.defineProperty(navigator, 'vendor', {
      get: () => fp.vendor,
    });

    Object.defineProperty(navigator, 'languages', {
      get: () => fp.languages,
    });

    Object.defineProperty(navigator, 'language', {
      get: () => fp.languages[0],
    });

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => fp.hardwareConcurrency,
    });

    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => fp.deviceMemory,
    });

    // Override screen properties
    Object.defineProperty(screen, 'width', {
      get: () => fp.resolution.width,
    });

    Object.defineProperty(screen, 'height', {
      get: () => fp.resolution.height,
    });

    Object.defineProperty(screen, 'availWidth', {
      get: () => fp.resolution.width,
    });

    Object.defineProperty(screen, 'availHeight', {
      get: () => fp.resolution.height - 40, // Taskbar
    });

    Object.defineProperty(screen, 'colorDepth', {
      get: () => fp.colorDepth,
    });

    Object.defineProperty(screen, 'pixelDepth', {
      get: () => fp.colorDepth,
    });

    Object.defineProperty(window, 'devicePixelRatio', {
      get: () => fp.pixelRatio,
    });

    // Override timezone - COMPLETE OVERRIDE including resolvedOptions
    const originalDateTimeFormat = Intl.DateTimeFormat;

    class SpoofedDateTimeFormat extends originalDateTimeFormat {
      constructor(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
        const spoofedOptions = {
          ...options,
          timeZone: options?.timeZone || fp.timezone,
        };
        super(locales || fp.locale, spoofedOptions);
      }

      override resolvedOptions(): Intl.ResolvedDateTimeFormatOptions {
        const original = super.resolvedOptions();
        return {
          ...original,
          timeZone: fp.timezone,
          locale: fp.locale,
        };
      }
    }

    // Copy static methods
    (SpoofedDateTimeFormat as any).supportedLocalesOf = originalDateTimeFormat.supportedLocalesOf;

    // Replace Intl.DateTimeFormat
    (Intl as any).DateTimeFormat = SpoofedDateTimeFormat;

    // ============================================================
    // COMPREHENSIVE TIMEZONE SPOOFING
    // ============================================================
    const timezoneOffsets: Record<string, number> = {
      'America/New_York': 300, // UTC-5
      'America/Chicago': 360, // UTC-6
      'America/Denver': 420, // UTC-7
      'America/Los_Angeles': 480, // UTC-8
      'America/Toronto': 300, // UTC-5
      'America/Sao_Paulo': 180, // UTC-3
      'Europe/London': 0, // UTC+0
      'Europe/Paris': -60, // UTC+1
      'Europe/Berlin': -60, // UTC+1
      'Europe/Madrid': -60, // UTC+1
      'Europe/Rome': -60, // UTC+1
      'Europe/Moscow': -180, // UTC+3
      'Asia/Shanghai': -480, // UTC+8
      'Asia/Tokyo': -540, // UTC+9
      'Australia/Sydney': -600, // UTC+10
    };

    const timezoneNames: Record<string, string> = {
      'America/New_York': 'Eastern Standard Time',
      'America/Chicago': 'Central Standard Time',
      'America/Denver': 'Mountain Standard Time',
      'America/Los_Angeles': 'Pacific Standard Time',
      'America/Toronto': 'Eastern Standard Time',
      'America/Sao_Paulo': 'Brasilia Standard Time',
      'Europe/London': 'Greenwich Mean Time',
      'Europe/Paris': 'Central European Standard Time',
      'Europe/Berlin': 'Central European Standard Time',
      'Europe/Madrid': 'Central European Standard Time',
      'Europe/Rome': 'Central European Standard Time',
      'Europe/Moscow': 'Moscow Standard Time',
      'Asia/Shanghai': 'China Standard Time',
      'Asia/Tokyo': 'Japan Standard Time',
      'Australia/Sydney': 'Australian Eastern Standard Time',
    };

    const timezoneAbbrs: Record<string, string> = {
      'America/New_York': 'EST',
      'America/Chicago': 'CST',
      'America/Denver': 'MST',
      'America/Los_Angeles': 'PST',
      'America/Toronto': 'EST',
      'America/Sao_Paulo': 'BRT',
      'Europe/London': 'GMT',
      'Europe/Paris': 'CET',
      'Europe/Berlin': 'CET',
      'Europe/Madrid': 'CET',
      'Europe/Rome': 'CET',
      'Europe/Moscow': 'MSK',
      'Asia/Shanghai': 'CST',
      'Asia/Tokyo': 'JST',
      'Australia/Sydney': 'AEST',
    };

    const targetOffset = timezoneOffsets[fp.timezone] ?? 0;
    const targetTzName = timezoneNames[fp.timezone] ?? fp.timezone;
    const targetTzAbbr = timezoneAbbrs[fp.timezone] ?? 'UTC';

    // Override getTimezoneOffset - make it look native
    const origGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = makeNative(function(this: Date) {
      return targetOffset;
    }, 'getTimezoneOffset');

    // Override toString to show correct timezone
    const origToString = Date.prototype.toString;
    Date.prototype.toString = makeNative(function(this: Date) {
      const str = origToString.call(this);
      // Replace timezone part (e.g., GMT-0500 (Eastern Standard Time))
      const gmtOffset = targetOffset <= 0
        ? `+${String(Math.abs(targetOffset / 60)).padStart(2, '0')}00`
        : `-${String(targetOffset / 60).padStart(2, '0')}00`;
      return str.replace(/GMT[+-]\d{4} \([^)]+\)/, `GMT${gmtOffset} (${targetTzName})`);
    }, 'toString');

    // Override toTimeString
    const origToTimeString = Date.prototype.toTimeString;
    Date.prototype.toTimeString = makeNative(function(this: Date) {
      const str = origToTimeString.call(this);
      const gmtOffset = targetOffset <= 0
        ? `+${String(Math.abs(targetOffset / 60)).padStart(2, '0')}00`
        : `-${String(targetOffset / 60).padStart(2, '0')}00`;
      return str.replace(/GMT[+-]\d{4} \([^)]+\)/, `GMT${gmtOffset} (${targetTzName})`);
    }, 'toTimeString');

    // Override toLocaleString to use correct timezone
    const origToLocaleString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = makeNative(function(this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      const opts = { ...options, timeZone: fp.timezone };
      return origToLocaleString.call(this, locales || fp.locale, opts);
    }, 'toLocaleString');

    // Override toLocaleDateString
    const origToLocaleDateString = Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = makeNative(function(this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      const opts = { ...options, timeZone: fp.timezone };
      return origToLocaleDateString.call(this, locales || fp.locale, opts);
    }, 'toLocaleDateString');

    // Override toLocaleTimeString
    const origToLocaleTimeString = Date.prototype.toLocaleTimeString;
    Date.prototype.toLocaleTimeString = makeNative(function(this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      const opts = { ...options, timeZone: fp.timezone };
      return origToLocaleTimeString.call(this, locales || fp.locale, opts);
    }, 'toLocaleTimeString');

    // ============================================================
    // COMPREHENSIVE LOCALE/LANGUAGE SPOOFING
    // ============================================================

    // Override Intl.NumberFormat to use correct locale
    const originalNumberFormat = Intl.NumberFormat;
    // @ts-expect-error - Overriding Intl
    Intl.NumberFormat = function (...args: any[]) {
      if (args.length === 0 || !args[0]) {
        args[0] = fp.locale;
      }
      return new originalNumberFormat(...args);
    };
    // @ts-ignore
    Intl.NumberFormat.prototype = originalNumberFormat.prototype;
    Intl.NumberFormat.supportedLocalesOf = originalNumberFormat.supportedLocalesOf;

    // Override Intl.Collator
    const originalCollator = Intl.Collator;
    // @ts-expect-error - Overriding Intl
    Intl.Collator = function (...args: any[]) {
      if (args.length === 0 || !args[0]) {
        args[0] = fp.locale;
      }
      return new originalCollator(...args);
    };
    // @ts-ignore
    Intl.Collator.prototype = originalCollator.prototype;
    Intl.Collator.supportedLocalesOf = originalCollator.supportedLocalesOf;

    // Override Intl.PluralRules
    const originalPluralRules = Intl.PluralRules;
    // @ts-expect-error - Overriding Intl
    Intl.PluralRules = function (...args: any[]) {
      if (args.length === 0 || !args[0]) {
        args[0] = fp.locale;
      }
      return new originalPluralRules(...args);
    };
    // @ts-ignore
    Intl.PluralRules.prototype = originalPluralRules.prototype;
    Intl.PluralRules.supportedLocalesOf = originalPluralRules.supportedLocalesOf;

    // Override Intl.RelativeTimeFormat
    if ((Intl as any).RelativeTimeFormat) {
      const originalRelativeTimeFormat = (Intl as any).RelativeTimeFormat;
      (Intl as any).RelativeTimeFormat = function (...args: any[]) {
        if (args.length === 0 || !args[0]) {
          args[0] = fp.locale;
        }
        return new originalRelativeTimeFormat(...args);
      };
      (Intl as any).RelativeTimeFormat.prototype = originalRelativeTimeFormat.prototype;
      (Intl as any).RelativeTimeFormat.supportedLocalesOf = originalRelativeTimeFormat.supportedLocalesOf;
    }

    // Override Intl.ListFormat
    if ((Intl as any).ListFormat) {
      const originalListFormat = (Intl as any).ListFormat;
      (Intl as any).ListFormat = function (...args: any[]) {
        if (args.length === 0 || !args[0]) {
          args[0] = fp.locale;
        }
        return new originalListFormat(...args);
      };
      (Intl as any).ListFormat.prototype = originalListFormat.prototype;
      (Intl as any).ListFormat.supportedLocalesOf = originalListFormat.supportedLocalesOf;
    }

    // Override Number.prototype.toLocaleString
    const origNumberToLocaleString = Number.prototype.toLocaleString;
    Number.prototype.toLocaleString = function(locales?: string | string[], options?: Intl.NumberFormatOptions) {
      return origNumberToLocaleString.call(this, locales || fp.locale, options);
    };

    // Override String.prototype.localeCompare
    const origLocaleCompare = String.prototype.localeCompare;
    String.prototype.localeCompare = function(that: string, locales?: string | string[], options?: Intl.CollatorOptions) {
      return origLocaleCompare.call(this, that, locales || fp.locale, options);
    };

    // Override Array.prototype.toLocaleString
    const origArrayToLocaleString = Array.prototype.toLocaleString;
    Array.prototype.toLocaleString = function(locales?: string | string[], options?: any) {
      return origArrayToLocaleString.call(this, locales || fp.locale, options);
    };

    // ============================================================
    // AUDIO FINGERPRINT PROTECTION
    // ============================================================

    // Add noise to AudioContext to prevent audio fingerprinting
    const audioNoise = fp.audio.noise;
    const audioOscillator = fp.audio.oscillator;

    // Override AudioContext
    const OriginalAudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (OriginalAudioContext) {
      const ModifiedAudioContext = function(this: any, options?: AudioContextOptions) {
        const ctx = new OriginalAudioContext(options);

        // Override createAnalyser to add noise
        const originalCreateAnalyser = ctx.createAnalyser.bind(ctx);
        ctx.createAnalyser = function() {
          const analyser = originalCreateAnalyser();

          // Override getFloatFrequencyData
          const originalGetFloatFrequencyData = analyser.getFloatFrequencyData.bind(analyser);
          analyser.getFloatFrequencyData = function(array: Float32Array) {
            originalGetFloatFrequencyData(array);
            // Add consistent noise based on fingerprint
            for (let i = 0; i < array.length; i++) {
              array[i] = array[i] + (audioNoise * (audioOscillator - 0.5) * 2);
            }
          };

          // Override getByteFrequencyData
          const originalGetByteFrequencyData = analyser.getByteFrequencyData.bind(analyser);
          analyser.getByteFrequencyData = function(array: Uint8Array) {
            originalGetByteFrequencyData(array);
            for (let i = 0; i < array.length; i++) {
              const noise = Math.floor(audioNoise * 10 * (audioOscillator - 0.5));
              array[i] = Math.max(0, Math.min(255, array[i] + noise));
            }
          };

          return analyser;
        };

        // Override createOscillator to vary slightly
        const originalCreateOscillator = ctx.createOscillator.bind(ctx);
        ctx.createOscillator = function() {
          const osc = originalCreateOscillator();
          // Add tiny frequency variation
          const originalSetFrequency = osc.frequency.setValueAtTime.bind(osc.frequency);
          osc.frequency.setValueAtTime = function(value: number, startTime: number) {
            const variance = value * audioNoise * 0.001;
            return originalSetFrequency(value + variance, startTime);
          };
          return osc;
        };

        // Override getChannelData for OfflineAudioContext compatibility
        const originalCreateBuffer = ctx.createBuffer?.bind(ctx);
        if (originalCreateBuffer) {
          ctx.createBuffer = function(numberOfChannels: number, length: number, sampleRate: number) {
            const buffer = originalCreateBuffer(numberOfChannels, length, sampleRate);

            // Override getChannelData
            const originalGetChannelData = buffer.getChannelData.bind(buffer);
            buffer.getChannelData = function(channel: number) {
              const data = originalGetChannelData(channel);
              // Add very small noise that doesn't affect sound quality
              for (let i = 0; i < data.length; i++) {
                data[i] = data[i] + (audioNoise * 0.0001 * (Math.random() - 0.5));
              }
              return data;
            };

            return buffer;
          };
        }

        return ctx;
      };

      ModifiedAudioContext.prototype = OriginalAudioContext.prototype;
      (window as any).AudioContext = ModifiedAudioContext;
      (window as any).webkitAudioContext = ModifiedAudioContext;
    }

    // Override OfflineAudioContext
    const OriginalOfflineAudioContext = (window as any).OfflineAudioContext;
    if (OriginalOfflineAudioContext) {
      const ModifiedOfflineAudioContext = function(
        this: any,
        numberOfChannels: number,
        length: number,
        sampleRate: number
      ) {
        const ctx = new OriginalOfflineAudioContext(numberOfChannels, length, sampleRate);

        // Override startRendering
        const originalStartRendering = ctx.startRendering.bind(ctx);
        ctx.startRendering = function() {
          return originalStartRendering().then((renderedBuffer: AudioBuffer) => {
            // Add noise to the rendered buffer
            for (let channel = 0; channel < renderedBuffer.numberOfChannels; channel++) {
              const data = renderedBuffer.getChannelData(channel);
              for (let i = 0; i < data.length; i++) {
                data[i] = data[i] + (audioNoise * 0.0001 * (audioOscillator - 0.5));
              }
            }
            return renderedBuffer;
          });
        };

        return ctx;
      };

      ModifiedOfflineAudioContext.prototype = OriginalOfflineAudioContext.prototype;
      (window as any).OfflineAudioContext = ModifiedOfflineAudioContext;
    }

    // ============================================================
    // DOMRECT / SVGRECT NOISE (Anti-Fingerprinting)
    // ============================================================
    const rectNoise = fp.canvas.noise * 0.00001; // Very small noise

    // Override Element.getBoundingClientRect
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function(): DOMRect {
      const rect = originalGetBoundingClientRect.call(this);
      // Add tiny consistent noise based on element
      const noise = rectNoise;
      return new DOMRect(
        rect.x + noise,
        rect.y + noise,
        rect.width + noise,
        rect.height + noise
      );
    };

    // Override Element.getClientRects
    const originalGetClientRects = Element.prototype.getClientRects;
    Element.prototype.getClientRects = function(): DOMRectList {
      const rects = originalGetClientRects.call(this);
      // Create a modified DOMRectList-like object
      const modifiedRects: any = [];
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        modifiedRects.push(new DOMRect(
          rect.x + rectNoise,
          rect.y + rectNoise,
          rect.width + rectNoise,
          rect.height + rectNoise
        ));
      }
      modifiedRects.item = (index: number) => modifiedRects[index];
      return modifiedRects as DOMRectList;
    };

    // Override Range.getBoundingClientRect
    const originalRangeGetBoundingClientRect = Range.prototype.getBoundingClientRect;
    Range.prototype.getBoundingClientRect = function(): DOMRect {
      const rect = originalRangeGetBoundingClientRect.call(this);
      return new DOMRect(
        rect.x + rectNoise,
        rect.y + rectNoise,
        rect.width + rectNoise,
        rect.height + rectNoise
      );
    };

    // Override Range.getClientRects
    const originalRangeGetClientRects = Range.prototype.getClientRects;
    Range.prototype.getClientRects = function(): DOMRectList {
      const rects = originalRangeGetClientRects.call(this);
      const modifiedRects: any = [];
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        modifiedRects.push(new DOMRect(
          rect.x + rectNoise,
          rect.y + rectNoise,
          rect.width + rectNoise,
          rect.height + rectNoise
        ));
      }
      modifiedRects.item = (index: number) => modifiedRects[index];
      return modifiedRects as DOMRectList;
    };

    // ============================================================
    // MATH OPERATIONS - DO NOT MODIFY!
    // ============================================================
    // WARNING: Overriding Math.sin/cos/tan/log/exp is DANGEROUS!
    // - sin(0) must equal exactly 0, not 0.0000001
    // - These functions are used throughout the browser
    // - Detection scripts can easily check: Math.sin(0) === 0
    // - Adding noise breaks mathematical properties
    // REMOVED: All Math function overrides

    // ============================================================
    // CSS MEDIA QUERIES SPOOFING
    // ============================================================
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = function(query: string): MediaQueryList {
      const result = originalMatchMedia.call(window, query);

      // Override specific queries that are used for fingerprinting
      const queryLower = query.toLowerCase();

      // prefers-color-scheme - report as "light" (most common)
      if (queryLower.includes('prefers-color-scheme')) {
        if (queryLower.includes('dark')) {
          return {
            ...result,
            matches: false,
            media: query,
          } as MediaQueryList;
        }
        if (queryLower.includes('light')) {
          return {
            ...result,
            matches: true,
            media: query,
          } as MediaQueryList;
        }
      }

      // prefers-reduced-motion - report as "no-preference"
      if (queryLower.includes('prefers-reduced-motion')) {
        if (queryLower.includes('reduce')) {
          return { ...result, matches: false, media: query } as MediaQueryList;
        }
      }

      // prefers-contrast - report as "no-preference"
      if (queryLower.includes('prefers-contrast')) {
        if (queryLower.includes('high') || queryLower.includes('more')) {
          return { ...result, matches: false, media: query } as MediaQueryList;
        }
      }

      return result;
    };

    // ============================================================
    // SPEECH SYNTHESIS & RECOGNITION SPOOFING
    // ============================================================

    // SpeechSynthesis - create fake voices for the locale
    const fakeVoices: SpeechSynthesisVoice[] = [
      {
        voiceURI: 'Microsoft David - English (United States)',
        name: 'Microsoft David - English (United States)',
        lang: 'en-US',
        localService: true,
        default: true,
      } as SpeechSynthesisVoice,
      {
        voiceURI: 'Microsoft Zira - English (United States)',
        name: 'Microsoft Zira - English (United States)',
        lang: 'en-US',
        localService: true,
        default: false,
      } as SpeechSynthesisVoice,
      {
        voiceURI: 'Google US English',
        name: 'Google US English',
        lang: 'en-US',
        localService: false,
        default: false,
      } as SpeechSynthesisVoice,
    ];

    // Override speechSynthesis.getVoices
    if (window.speechSynthesis) {
      const originalGetVoices = window.speechSynthesis.getVoices.bind(window.speechSynthesis);
      window.speechSynthesis.getVoices = function(): SpeechSynthesisVoice[] {
        const realVoices = originalGetVoices();
        // Return fake voices if real ones are empty (common in automated browsers)
        return realVoices.length > 0 ? realVoices : fakeVoices;
      };

      // Also override onvoiceschanged to trigger with fake voices
      Object.defineProperty(window.speechSynthesis, 'onvoiceschanged', {
        get: () => null,
        set: (handler) => {
          if (handler) {
            setTimeout(() => handler(new Event('voiceschanged')), 100);
          }
        },
        configurable: true,
      });
    }

    // SpeechRecognition - ensure it exists
    if (!(window as any).webkitSpeechRecognition) {
      const FakeSpeechRecognition = function(this: any) {
        this.continuous = false;
        this.interimResults = false;
        this.lang = fp.locale;
        this.maxAlternatives = 1;
        this.grammars = null;
        this.onaudioend = null;
        this.onaudiostart = null;
        this.onend = null;
        this.onerror = null;
        this.onnomatch = null;
        this.onresult = null;
        this.onsoundend = null;
        this.onsoundstart = null;
        this.onspeechend = null;
        this.onspeechstart = null;
        this.onstart = null;
        this.start = function() { if (this.onstart) this.onstart(new Event('start')); };
        this.stop = function() { if (this.onend) this.onend(new Event('end')); };
        this.abort = function() { if (this.onend) this.onend(new Event('end')); };
      };
      (window as any).webkitSpeechRecognition = FakeSpeechRecognition;
      (window as any).SpeechRecognition = FakeSpeechRecognition;
    } else if (!(window as any).SpeechRecognition) {
      (window as any).SpeechRecognition = (window as any).webkitSpeechRecognition;
    }

    // ============================================================
    // CLIENT HINTS API (Navigator UAData)
    // ============================================================
    // IMPORTANT: Extract Chrome version from REAL navigator.userAgent, not fp.userAgent
    // This ensures userAgentData matches the actual browser version
    const realUserAgent = navigator.userAgent;
    const chromeVersionMatch = realUserAgent.match(/Chrome\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
    const chromeVersion = chromeVersionMatch ? chromeVersionMatch[1] : '131';
    const chromeFullVersion = chromeVersionMatch
      ? `${chromeVersionMatch[1]}.${chromeVersionMatch[2]}.${chromeVersionMatch[3]}.${chromeVersionMatch[4]}`
      : '131.0.6778.139';

    // Determine platform from fingerprint (not real userAgent!)
    // This ensures consistency between userAgent and userAgentData
    const fpPlatform = fp.platform === 'Win32' ? 'Windows' :
                       fp.platform === 'MacIntel' ? 'macOS' : 'Linux';
    const platformVersion = fpPlatform === 'Windows' ? '10.0.0' :
                            fpPlatform === 'macOS' ? '14.0.0' : '6.5.0';

    // ALWAYS override userAgentData to match our fingerprint
    // This is critical for consistency between userAgent and userAgentData
    const uaData = {
      brands: [
        { brand: 'Google Chrome', version: chromeVersion },
        { brand: 'Chromium', version: chromeVersion },
        { brand: 'Not_A Brand', version: '24' },
      ],
      mobile: false,
      platform: fpPlatform,
      getHighEntropyValues: async (hints: string[]) => {
        const result: any = {
          brands: [
            { brand: 'Google Chrome', version: chromeVersion },
            { brand: 'Chromium', version: chromeVersion },
            { brand: 'Not_A Brand', version: '24' },
          ],
          mobile: false,
          platform: fpPlatform,
        };
        if (hints.includes('platformVersion')) result.platformVersion = platformVersion;
        if (hints.includes('architecture')) result.architecture = 'x86';
        if (hints.includes('bitness')) result.bitness = '64';
        if (hints.includes('model')) result.model = '';
        if (hints.includes('uaFullVersion')) result.uaFullVersion = chromeFullVersion;
        if (hints.includes('fullVersionList')) {
          result.fullVersionList = [
            { brand: 'Google Chrome', version: chromeFullVersion },
            { brand: 'Chromium', version: chromeFullVersion },
            { brand: 'Not_A Brand', version: '24.0.0.0' },
          ];
        }
        return result;
      },
      toJSON: () => ({
        brands: [
          { brand: 'Google Chrome', version: chromeVersion },
          { brand: 'Chromium', version: chromeVersion },
          { brand: 'Not_A Brand', version: '24' },
        ],
        mobile: false,
        platform: fpPlatform,
      }),
    };
    // Force override even if userAgentData exists
    {

      Object.defineProperty(navigator, 'userAgentData', {
        get: () => uaData,
        configurable: true,
      });
    }

    // ============================================================
    // WORKER CONTEXT SPOOFING
    // ============================================================

    // Intercept Worker creation to inject our overrides
    const OriginalWorker = window.Worker;
    window.Worker = function(scriptURL: string | URL, options?: WorkerOptions): Worker {
      // Create a blob that injects our timezone/locale/WebGL settings
      // CRITICAL: WebGL must be consistent between main thread and Workers!
      const injectScript = `
        // Inject timezone offset
        Date.prototype.getTimezoneOffset = function() { return ${targetOffset}; };

        // Inject locale
        const fpLocale = '${fp.locale}';
        const fpTimezone = '${fp.timezone}';
        const fpLanguages = ${JSON.stringify(fp.languages)};

        // Override navigator in worker
        Object.defineProperty(self.navigator, 'language', { get: () => fpLanguages[0] });
        Object.defineProperty(self.navigator, 'languages', { get: () => fpLanguages });

        // Override Intl in worker
        const origDTF = Intl.DateTimeFormat;
        Intl.DateTimeFormat = function(...args) {
          if (!args[0]) args[0] = fpLocale;
          if (!args[1]) args[1] = { timeZone: fpTimezone };
          else if (!args[1].timeZone) args[1] = { ...args[1], timeZone: fpTimezone };
          return new origDTF(...args);
        };
        Intl.DateTimeFormat.prototype = origDTF.prototype;
        Intl.DateTimeFormat.supportedLocalesOf = origDTF.supportedLocalesOf;

        const origNF = Intl.NumberFormat;
        Intl.NumberFormat = function(...args) {
          if (!args[0]) args[0] = fpLocale;
          return new origNF(...args);
        };
        Intl.NumberFormat.prototype = origNF.prototype;
        Intl.NumberFormat.supportedLocalesOf = origNF.supportedLocalesOf;

        // CRITICAL: WebGL spoofing in Worker for consistency
        const fpWebGLVendor = '${fp.webgl.vendor}';
        const fpWebGLRenderer = '${fp.webgl.renderer}';
        const UNMASKED_VENDOR = 37445;
        const UNMASKED_RENDERER = 37446;

        // Override WebGLRenderingContext.getParameter
        if (typeof WebGLRenderingContext !== 'undefined') {
          const origGetParam = WebGLRenderingContext.prototype.getParameter;
          WebGLRenderingContext.prototype.getParameter = function(param) {
            if (param === UNMASKED_VENDOR) return fpWebGLVendor;
            if (param === UNMASKED_RENDERER) return fpWebGLRenderer;
            return origGetParam.call(this, param);
          };
        }

        // Override WebGL2RenderingContext.getParameter
        if (typeof WebGL2RenderingContext !== 'undefined') {
          const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
          WebGL2RenderingContext.prototype.getParameter = function(param) {
            if (param === UNMASKED_VENDOR) return fpWebGLVendor;
            if (param === UNMASKED_RENDERER) return fpWebGLRenderer;
            return origGetParam2.call(this, param);
          };
        }

        // Import the original script
        importScripts('${scriptURL}');
      `;

      // For module workers or when we can't inject, just use original
      if (options?.type === 'module' || typeof scriptURL !== 'string') {
        return new OriginalWorker(scriptURL, options);
      }

      try {
        const blob = new Blob([injectScript], { type: 'application/javascript' });
        const blobURL = URL.createObjectURL(blob);
        const worker = new OriginalWorker(blobURL, options);
        // Clean up blob URL when worker terminates
        worker.addEventListener('error', () => URL.revokeObjectURL(blobURL));
        return worker;
      } catch {
        // Fallback to original if injection fails
        return new OriginalWorker(scriptURL, options);
      }
    } as any;
    (window.Worker as any).prototype = OriginalWorker.prototype;

    // Override geolocation - both getCurrentPosition AND watchPosition
    const geolocationSuccess = (success: PositionCallback) => {
      success({
        coords: {
          latitude: fp.geolocation.latitude,
          longitude: fp.geolocation.longitude,
          accuracy: 10 + Math.random() * 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    };

    navigator.geolocation.getCurrentPosition = function (
      success,
      _error,
      _options
    ) {
      // Simulate async behavior like real geolocation
      setTimeout(() => geolocationSuccess(success), 100);
    };

    // CRITICAL: Also override watchPosition - PixelScan might use this!
    let watchId = 1;
    navigator.geolocation.watchPosition = function (
      success,
      _error,
      _options
    ) {
      // Simulate async behavior and return immediately
      setTimeout(() => geolocationSuccess(success), 100);
      return watchId++;
    };

    navigator.geolocation.clearWatch = function (_id: number) {
      // No-op - just accept the call
    };

    // Canvas fingerprint - DO NOT add noise!
    // WARNING: Adding noise via putImageData MODIFIES the canvas before toDataURL
    // This is DETECTABLE because:
    // 1. The canvas content changes between calls
    // 2. Detection scripts can call toDataURL twice and compare results
    // 3. Real browsers produce CONSISTENT output
    //
    // Instead, we just let the canvas work normally.
    // The browser's natural rendering differences provide uniqueness.
    // If you need different fingerprints, use different browser profiles/instances.

    // WebGL fingerprint
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
      if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
        return fp.webgl.vendor;
      }
      if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
        return fp.webgl.renderer;
      }
      return originalGetParameter.apply(this, [parameter]);
    };

    // Fonts
    Object.defineProperty(document, 'fonts', {
      get: () => ({
        check: (font: string) => {
          const fontFamily = font.split(' ').pop()?.replace(/['"]/g, '');
          return fp.fonts.includes(fontFamily || '');
        },
      }),
    });

    // Battery API - complete BatteryManager interface
    const batteryManager = {
      charging: fp.battery.charging,
      chargingTime: fp.battery.charging ? 0 : Infinity,
      dischargingTime: fp.battery.charging ? Infinity : Math.floor(7200 + Math.random() * 3600),
      level: fp.battery.level,
      // Event handlers
      onchargingchange: null as ((this: any, ev: Event) => any) | null,
      onchargingtimechange: null as ((this: any, ev: Event) => any) | null,
      ondischargingtimechange: null as ((this: any, ev: Event) => any) | null,
      onlevelchange: null as ((this: any, ev: Event) => any) | null,
      // EventTarget methods
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return true; },
    };
    navigator.getBattery = () => Promise.resolve(batteryManager as any);

    // Media Devices
    navigator.mediaDevices.enumerateDevices = function () {
      const devices: MediaDeviceInfo[] = [];

      for (let i = 0; i < fp.mediaDevices.audioinput; i++) {
        devices.push({
          deviceId: `audioinput${i}`,
          kind: 'audioinput',
          label: `Microphone ${i + 1}`,
          groupId: 'default',
          toJSON: () => ({}),
        } as MediaDeviceInfo);
      }

      for (let i = 0; i < fp.mediaDevices.audiooutput; i++) {
        devices.push({
          deviceId: `audiooutput${i}`,
          kind: 'audiooutput',
          label: `Speaker ${i + 1}`,
          groupId: 'default',
          toJSON: () => ({}),
        } as MediaDeviceInfo);
      }

      for (let i = 0; i < fp.mediaDevices.videoinput; i++) {
        devices.push({
          deviceId: `videoinput${i}`,
          kind: 'videoinput',
          label: `Camera ${i + 1}`,
          groupId: 'default',
          toJSON: () => ({}),
        } as MediaDeviceInfo);
      }

      return Promise.resolve(devices);
    };

    // getUserMedia - return fake stream, NOT block!
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async function(constraints?: MediaStreamConstraints): Promise<MediaStream> {
        // Return a mock MediaStream that looks real
        try {
          // Try to get real stream first (for functionality)
          const stream = await originalGetUserMedia(constraints);
          return stream;
        } catch {
          // If fails, return empty MediaStream (looks like permission denied by user)
          // This is better than throwing an error which looks like blocking
          const audioContext = new AudioContext();
          const destination = audioContext.createMediaStreamDestination();
          return destination.stream;
        }
      };
    }

    // IMPORTANT: NO LOGGING in page context!
    // Detection scripts can monitor console for automation signatures
    // "Молчание - не логируй, не выбрасывай ошибки при проверках"

    } catch (e) {
      // Silently fail to avoid breaking the page
      // console.error('[ConsistentFingerprint] Error:', e);
    }
  }, fingerprint);

  // Set timezone
  await page.emulateTimezone(fingerprint.timezone);

  // Set locale
  await page.setExtraHTTPHeaders({
    'Accept-Language': fingerprint.languages.join(','),
  });

  // Set viewport
  await page.setViewport({
    width: fingerprint.resolution.width,
    height: fingerprint.resolution.height,
    deviceScaleFactor: fingerprint.pixelRatio,
  });

  // Set geolocation permissions (only for HTTP/HTTPS URLs)
  const pageUrl = page.url();
  if (pageUrl && pageUrl.startsWith('http')) {
    try {
      const context = page.browserContext();
      await context.overridePermissions(pageUrl, ['geolocation']);
    } catch {
      // Ignore permission errors for special URLs
    }
  }

  try {
    await page.setGeolocation({
      latitude: fingerprint.geolocation.latitude,
      longitude: fingerprint.geolocation.longitude,
      accuracy: 10,
    });
  } catch {
    // Ignore geolocation errors
  }
}

/**
 * Seeded random number generator
 */
function createSeededRandom(seed: string): () => number {
  let value = seed.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280.0;
  };
}

/**
 * Weighted random choice
 */
function weightedChoice<T>(
  items: T[],
  weights: number[],
  random: () => number
): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let randomNum = random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    const weight = weights[i];
    const item = items[i];
    if (weight !== undefined && randomNum < weight && item !== undefined) {
      return item;
    }
    randomNum -= weight ?? 0;
  }

  return items[items.length - 1]!;
}

/**
 * Generate consistent user agent
 * Returns Chrome 131 User-Agent to match Puppeteer's bundled Chromium
 */
function generateConsistentUserAgent(
  platform: string,
  _locale: string,
  random: () => number
): string {
  // Chrome 131 stable versions (matches Puppeteer's bundled Chromium)
  const chromeVersions = ['131.0.6778.85', '131.0.6778.108', '131.0.6778.139'];
  const chromeVersion = chromeVersions[Math.floor(random() * chromeVersions.length)] || chromeVersions[0];

  const platformStrings: Record<string, string> = {
    Windows: 'Windows NT 10.0; Win64; x64',
    macOS: 'Macintosh; Intel Mac OS X 10_15_7',
    Linux: 'X11; Linux x86_64',
  };

  const platformString = platformStrings[platform] || platformStrings.Windows;

  return `Mozilla/5.0 (${platformString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}

/**
 * Get platform string
 */
function getPlatformString(platform: string): string {
  if (platform === 'macOS') {return 'MacIntel';}
  if (platform === 'Linux') {return 'Linux x86_64';}
  return 'Win32';
}

/**
 * Generate plugins based on platform
 */
function generatePlugins(platform: string, _random: () => number): any[] {
  if (platform === 'Windows') {
    return [
      {
        name: 'PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
      },
      {
        name: 'Chrome PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
      },
    ];
  }

  if (platform === 'macOS') {
    return [
      {
        name: 'PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
      },
      {
        name: 'Chrome PDF Plugin',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
      },
    ];
  }

  return [];
}
