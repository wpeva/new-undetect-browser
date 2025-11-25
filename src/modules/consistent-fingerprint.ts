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
  const geo = GEO_DATABASE[countryCode] || GEO_DATABASE.US;

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
  const resolution = resolutions[Math.floor(seededRandom() * resolutions.length)];

  // WebGL configuration
  const gpuVendors = ['NVIDIA', 'Intel', 'AMD'];
  const gpuWeights = [0.5, 0.3, 0.2];
  const gpuVendor = weightedChoice(gpuVendors, gpuWeights, seededRandom);
  const webglConfigs = WEBGL_CONFIGS[gpuVendor];
  const webglConfig = webglConfigs[Math.floor(seededRandom() * webglConfigs.length)];

  // Hardware specs
  const hardwareConcurrency = [2, 4, 6, 8, 12, 16][Math.floor(seededRandom() * 6)];
  const deviceMemory = [2, 4, 8, 16][Math.floor(seededRandom() * 4)];

  // Pixel ratio
  const pixelRatios = [1, 1.25, 1.5, 2];
  const pixelRatio = pixelRatios[Math.floor(seededRandom() * pixelRatios.length)];

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
    fonts: FONTS_BY_OS[platform] || FONTS_BY_OS.Windows,
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
    // Override navigator properties
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
      return new originalDateTimeFormat(...args);
    };
    // @ts-expect-error - Copy properties
    Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;

    // Override geolocation
    const _originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
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
          data[i] = Math.min(255, Math.max(0, data[i] + noise));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
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
    const _originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
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
    if (randomNum < weights[i]) {
      return items[i];
    }
    randomNum -= weights[i];
  }

  return items[items.length - 1];
}

/**
 * Generate consistent user agent
 */
function generateConsistentUserAgent(
  platform: string,
  locale: string,
  random: () => number
): string {
  const chromeVersions = ['120', '121', '122', '123'];
  const chromeVersion = chromeVersions[Math.floor(random() * chromeVersions.length)];

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
