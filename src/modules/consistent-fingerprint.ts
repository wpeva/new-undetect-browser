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
    // ============================================================
    // CRITICAL: Anti-Bot Detection - Must be first!
    // ============================================================

    // Remove webdriver flag - MOST IMPORTANT for bot detection
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
    });

    // Delete webdriver completely
    delete (navigator as any).webdriver;

    // Override userAgent to match fingerprint (prevents HTTP vs JS mismatch)
    Object.defineProperty(navigator, 'userAgent', {
      get: () => fp.userAgent,
      configurable: true,
    });

    // Remove automation indicators
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = fp.plugins.map((p: any) => {
          const plugin: any = {
            name: p.name,
            filename: p.filename,
            description: p.description,
            length: p.mimeTypes?.length || 0,
          };
          // Add mimeTypes
          if (p.mimeTypes) {
            p.mimeTypes.forEach((mt: any, i: number) => {
              plugin[i] = {
                type: mt.type,
                suffixes: mt.suffixes,
                description: mt.description,
                enabledPlugin: plugin,
              };
            });
          }
          plugin.item = (i: number) => plugin[i];
          plugin.namedItem = (name: string) => plugin[name];
          plugin[Symbol.iterator] = function* () {
            for (let i = 0; i < plugin.length; i++) yield plugin[i];
          };
          return plugin;
        });
        const pluginArray: any = plugins;
        pluginArray.item = (i: number) => plugins[i];
        pluginArray.namedItem = (name: string) => plugins.find((p: any) => p.name === name);
        pluginArray.refresh = () => {};
        pluginArray[Symbol.iterator] = function* () {
          for (const p of plugins) yield p;
        };
        return pluginArray;
      },
      configurable: true,
    });

    // Chrome-specific properties
    if (!(window as any).chrome) {
      (window as any).chrome = {};
    }
    (window as any).chrome.runtime = {
      PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
      PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64' },
      PlatformNaclArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64' },
      RequestUpdateCheckStatus: { THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available' },
      OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update' },
      OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
    };

    // Remove Puppeteer/Playwright indicators
    delete (window as any).__puppeteer_evaluation_script__;
    delete (window as any).__webdriver_evaluate;
    delete (window as any).__selenium_evaluate;
    delete (window as any).__webdriver_script_function;
    delete (window as any).__webdriver_script_func;
    delete (window as any).__webdriver_script_fn;
    delete (window as any).__fxdriver_evaluate;
    delete (window as any).__driver_unwrapped;
    delete (window as any).__webdriver_unwrapped;
    delete (window as any).__driver_evaluate;
    delete (window as any).__selenium_unwrapped;
    delete (window as any).__fxdriver_unwrapped;
    delete (window as any)._Selenium_IDE_Recorder;
    delete (window as any)._selenium;
    delete (window as any).callSelenium;
    delete (window as any).calledSelenium;
    delete (window as any).$chrome_asyncScriptInfo;
    delete (window as any).$cdc_asdjflasutopfhvcZLmcfl_;
    delete (window as any).$cdc_asdjflasutopfhvcZLmcfl__;

    // Hide automation in permissions
    const originalQuery = navigator.permissions.query;
    navigator.permissions.query = function(parameters: any): Promise<PermissionStatus> {
      if (parameters.name === 'notifications') {
        return Promise.resolve({
          state: Notification.permission as PermissionState,
          name: 'notifications',
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        } as unknown as PermissionStatus);
      }
      return originalQuery.call(navigator.permissions, parameters);
    };

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

    // Override timezone
    const originalDateTimeFormat = Intl.DateTimeFormat;
    // @ts-expect-error - Overriding Intl
    Intl.DateTimeFormat = function (...args: any[]) {
      if (args.length === 0 || !args[0]) {
        args[0] = fp.locale;
      }
      if (args.length < 2) {
        args[1] = { timeZone: fp.timezone };
      } else if (!args[1]?.timeZone) {
        args[1] = { ...args[1], timeZone: fp.timezone };
      }
      return new originalDateTimeFormat(...args);
    };
    // @ts-ignore - Copy prototype
    Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
    Intl.DateTimeFormat.supportedLocalesOf = originalDateTimeFormat.supportedLocalesOf;

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

    // Override getTimezoneOffset
    Date.prototype.getTimezoneOffset = function() {
      return targetOffset;
    };

    // Override toString to show correct timezone
    const origToString = Date.prototype.toString;
    Date.prototype.toString = function() {
      const str = origToString.call(this);
      // Replace timezone part (e.g., GMT-0500 (Eastern Standard Time))
      const gmtOffset = targetOffset <= 0
        ? `+${String(Math.abs(targetOffset / 60)).padStart(2, '0')}00`
        : `-${String(targetOffset / 60).padStart(2, '0')}00`;
      return str.replace(/GMT[+-]\d{4} \([^)]+\)/, `GMT${gmtOffset} (${targetTzName})`);
    };

    // Override toTimeString
    const origToTimeString = Date.prototype.toTimeString;
    Date.prototype.toTimeString = function() {
      const str = origToTimeString.call(this);
      const gmtOffset = targetOffset <= 0
        ? `+${String(Math.abs(targetOffset / 60)).padStart(2, '0')}00`
        : `-${String(targetOffset / 60).padStart(2, '0')}00`;
      return str.replace(/GMT[+-]\d{4} \([^)]+\)/, `GMT${gmtOffset} (${targetTzName})`);
    };

    // Override toLocaleString to use correct timezone
    const origToLocaleString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      const opts = { ...options, timeZone: fp.timezone };
      return origToLocaleString.call(this, locales || fp.locale, opts);
    };

    // Override toLocaleDateString
    const origToLocaleDateString = Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      const opts = { ...options, timeZone: fp.timezone };
      return origToLocaleDateString.call(this, locales || fp.locale, opts);
    };

    // Override toLocaleTimeString
    const origToLocaleTimeString = Date.prototype.toLocaleTimeString;
    Date.prototype.toLocaleTimeString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      const opts = { ...options, timeZone: fp.timezone };
      return origToLocaleTimeString.call(this, locales || fp.locale, opts);
    };

    // Override geolocation
    navigator.geolocation.getCurrentPosition = function (
      success,
      _error,
      _options
    ) {
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

    // Canvas fingerprint with noise
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type?: string) {
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;

        // Add consistent noise based on seed
        let seed = fp.canvas.seed.split('').reduce((a, b) => {
          a = (a << 5) - a + b.charCodeAt(0);
          return a & a;
        }, 0);

        for (let i = 0; i < data.length; i += 4) {
          seed = (seed * 9301 + 49297) % 233280;
          const noise = (seed / 233280.0 - 0.5) * fp.canvas.noise * 255;
          data[i] = Math.min(255, Math.max(0, (data[i] ?? 0) + noise));
          data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] ?? 0) + noise));
          data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] ?? 0) + noise));
        }

        context.putImageData(imageData, 0, 0);
      }

      return originalToDataURL.apply(this, [type] as any);
    };

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

    // Battery API
    navigator.getBattery = () => Promise.resolve({
      charging: fp.battery.charging,
      chargingTime: fp.battery.charging ? 3600 : Infinity,
      dischargingTime: fp.battery.charging ? Infinity : 7200,
      level: fp.battery.level,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any);

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

    console.log('[ConsistentFingerprint] Applied:', {
      country: fp.geolocation.country,
      timezone: fp.timezone,
      locale: fp.locale,
      resolution: `${fp.resolution.width}x${fp.resolution.height}`,
      platform: fp.platform,
    });
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
 */
function generateConsistentUserAgent(
  platform: string,
  _locale: string,
  random: () => number
): string {
  // IMPORTANT: Use current Chrome versions to avoid mismatch detection
  // The browser will send real Chrome version in HTTP headers
  const chromeVersions = ['130', '131', '132', '133'];
  const chromeVersion = chromeVersions[Math.floor(random() * chromeVersions.length)] || '131';

  if (platform === 'Windows') {
    const windowsVersions = ['10.0', '11.0'];
    const winVersion = windowsVersions[Math.floor(random() * windowsVersions.length)];
    return `Mozilla/5.0 (Windows NT ${winVersion}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
  }

  if (platform === 'macOS') {
    const macVersions = ['10_15_7', '11_6_0', '12_5_0', '13_0_0'];
    const macVersion = macVersions[Math.floor(random() * macVersions.length)];
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macVersion}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
  }

  // Linux
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
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
