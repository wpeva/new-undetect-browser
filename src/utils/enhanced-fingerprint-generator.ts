import { FingerprintProfile } from './fingerprint-generator';
import { logger } from './logger';

/**
 * Enhanced fingerprint generator
 * Generates realistic, consistent fingerprints like Multilogin
 */

// Real browser configurations database
const BROWSER_CONFIGS = {
  chrome: {
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
    vendors: [
      'Intel Inc.',
      'Google Inc. (Intel)',
      'Google Inc. (NVIDIA)',
      'Google Inc. (AMD)',
    ],
    renderers: [
      'ANGLE (Intel, Intel(R) UHD Graphics 620, OpenGL 4.1)',
      'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060, OpenGL 4.5)',
      'ANGLE (AMD, AMD Radeon Pro 5500M, OpenGL 4.5)',
      'Intel Iris OpenGL Engine',
    ],
  },
};

// Screen resolutions database (most common)
const SCREEN_RESOLUTIONS = [
  { width: 1920, height: 1080, ratio: 16 / 9 },
  { width: 1366, height: 768, ratio: 16 / 9 },
  { width: 1536, height: 864, ratio: 16 / 9 },
  { width: 1440, height: 900, ratio: 16 / 10 },
  { width: 2560, height: 1440, ratio: 16 / 9 },
  { width: 3840, height: 2160, ratio: 16 / 9 }, // 4K
];

// Device memory configurations (GB)
const DEVICE_MEMORY_OPTIONS = [4, 8, 16, 32];

// Hardware concurrency options (CPU cores)
const HARDWARE_CONCURRENCY_OPTIONS = [2, 4, 6, 8, 12, 16];

// Platform configurations
const PLATFORMS = {
  windows: {
    platform: 'Win32',
    oscpu: 'Windows NT 10.0; Win64; x64',
    languages: ['en-US', 'en'],
    timezones: ['America/New_York', 'America/Los_Angeles', 'America/Chicago'],
  },
  mac: {
    platform: 'MacIntel',
    oscpu: 'Intel Mac OS X 10_15_7',
    languages: ['en-US', 'en'],
    timezones: ['America/New_York', 'America/Los_Angeles', 'America/Chicago'],
  },
  linux: {
    platform: 'Linux x86_64',
    oscpu: 'Linux x86_64',
    languages: ['en-US', 'en'],
    timezones: ['America/New_York', 'America/Los_Angeles', 'Europe/London'],
  },
};

// Font databases by platform
const FONTS_BY_PLATFORM = {
  windows: [
    'Arial',
    'Arial Black',
    'Calibri',
    'Cambria',
    'Candara',
    'Comic Sans MS',
    'Consolas',
    'Constantia',
    'Corbel',
    'Courier New',
    'Georgia',
    'Impact',
    'Lucida Console',
    'Lucida Sans Unicode',
    'Microsoft Sans Serif',
    'Palatino Linotype',
    'Segoe UI',
    'Tahoma',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
  ],
  mac: [
    'American Typewriter',
    'Andale Mono',
    'Arial',
    'Arial Black',
    'Arial Narrow',
    'Arial Rounded MT Bold',
    'Arial Unicode MS',
    'Avant Garde',
    'Baskerville',
    'Big Caslon',
    'Bodoni 72',
    'Bodoni 72 Oldstyle',
    'Bodoni 72 Smallcaps',
    'Book Antiqua',
    'Bookman',
    'Bradley Hand',
    'Brush Script MT',
    'Chalkboard',
    'Chalkboard SE',
    'Comic Sans MS',
    'Copperplate',
    'Courier',
    'Courier New',
    'Didot',
    'Futura',
    'Geneva',
    'Georgia',
    'Gill Sans',
    'Helvetica',
    'Helvetica Neue',
    'Herculanum',
    'Hoefler Text',
    'Impact',
    'Lucida Grande',
    'Marker Felt',
    'Monaco',
    'Optima',
    'Palatino',
    'Papyrus',
    'Phosphate',
    'Rockwell',
    'Savoye LET',
    'SignPainter',
    'Skia',
    'Snell Roundhand',
    'Tahoma',
    'Times',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
    'Zapfino',
  ],
  linux: [
    'Abyssinica SIL',
    'C059',
    'Cantarell',
    'DejaVu Sans',
    'DejaVu Sans Mono',
    'DejaVu Serif',
    'Droid Sans',
    'Droid Sans Fallback',
    'Droid Serif',
    'FreeMono',
    'FreeSans',
    'FreeSerif',
    'Liberation Mono',
    'Liberation Sans',
    'Liberation Serif',
    'Nimbus Mono L',
    'Nimbus Roman No9 L',
    'Nimbus Sans L',
    'Noto Color Emoji',
    'Noto Sans',
    'Noto Sans Mono',
    'Noto Serif',
    'Ubuntu',
    'Ubuntu Mono',
  ],
};

/**
 * Enhanced fingerprint generation options
 */
export interface EnhancedFingerprintOptions {
  os?: 'windows' | 'mac' | 'linux';
  locale?: string;
  timezone?: string;
  screen?: { width: number; height: number };
  deviceMemory?: number;
  hardwareConcurrency?: number;
  consistency?: 'low' | 'medium' | 'high'; // Consistency across properties
}

/**
 * Generate enhanced, realistic fingerprint
 */
export function generateEnhancedFingerprint(
  options: EnhancedFingerprintOptions = {}
): FingerprintProfile {
  // Determine OS (or random)
  const os = options.os || randomChoice(['windows', 'mac', 'linux']);
  const platformConfig = PLATFORMS[os];

  // Select consistent screen resolution
  const screen =
    options.screen ||
    randomChoice(SCREEN_RESOLUTIONS.filter((s) => s.width >= 1280));

  // Select device memory (should match screen resolution tier)
  const deviceMemory =
    options.deviceMemory ||
    (screen.width >= 2560
      ? 16
      : screen.width >= 1920
      ? 8
      : randomChoice([4, 8]));

  // Select hardware concurrency (should match device memory)
  const hardwareConcurrency =
    options.hardwareConcurrency ||
    (deviceMemory >= 16 ? randomChoice([8, 12, 16]) : randomChoice([4, 6, 8]));

  // Select user agent matching OS
  const userAgentIndex = os === 'windows' ? 0 : os === 'mac' ? 1 : 2;
  const userAgent = BROWSER_CONFIGS.chrome.userAgents[userAgentIndex];

  // Select WebGL vendor/renderer (should match OS and hardware)
  const vendor = randomChoice(BROWSER_CONFIGS.chrome.vendors);
  const renderer =
    deviceMemory >= 16
      ? BROWSER_CONFIGS.chrome.renderers[1] // NVIDIA for high-end
      : randomChoice(BROWSER_CONFIGS.chrome.renderers.slice(0, 3));

  // Select timezone
  const timezone =
    options.timezone || randomChoice(platformConfig.timezones);

  // Select locale
  const locale = options.locale || randomChoice(platformConfig.languages);

  // Select fonts for OS
  const fonts = FONTS_BY_PLATFORM[os];

  // Generate canvas noise (consistent with hardware)
  const canvasNoise = deviceMemory >= 16 ? 0.00001 : 0.0001;

  // Generate audio noise
  const audioNoise = 0.00001;

  // Build fingerprint
  const fingerprint: FingerprintProfile = {
    canvas: {
      noise: canvasNoise,
      toDataURL: true,
    },
    webgl: {
      vendor,
      renderer,
      noise: 0.0001,
    },
    audio: {
      noise: audioNoise,
      frequencyVariation: 0.0001,
    },
    fonts: fonts.slice(0, randomInt(15, 30)), // Realistic number of fonts
    plugins: [] as any,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: 24,
      pixelDepth: 24,
    },
    timezone: getTimezoneOffset(timezone),
    language: locale,
    platform: platformConfig.platform,
    hardwareConcurrency,
    deviceMemory,
    userAgent,
  };

  logger.debug('Generated enhanced fingerprint', {
    os,
    screen: `${screen.width}x${screen.height}`,
    deviceMemory,
    hardwareConcurrency,
  });

  return fingerprint;
}

/**
 * Generate fingerprint from real device data
 */
export function cloneDeviceFingerprint(
  deviceData: Partial<FingerprintProfile>
): FingerprintProfile {
  return {
    canvas: deviceData.canvas || {
      noise: 0.0001,
      toDataURL: true,
    },
    webgl: deviceData.webgl || {
      vendor: 'Intel Inc.',
      renderer: 'Intel Iris OpenGL Engine',
      noise: 0.0001,
    },
    audio: deviceData.audio || {
      noise: 0.00001,
      frequencyVariation: 0.0001,
    },
    fonts: deviceData.fonts || FONTS_BY_PLATFORM.mac,
    plugins: deviceData.plugins || ([] as any),
    screen: deviceData.screen || {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      pixelDepth: 24,
    },
    timezone: deviceData.timezone || -240,
    language: deviceData.language || 'en-US',
    platform: deviceData.platform || 'MacIntel',
    hardwareConcurrency: deviceData.hardwareConcurrency || 8,
    deviceMemory: deviceData.deviceMemory || 8,
    userAgent:
      deviceData.userAgent ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  };
}

/**
 * Generate consistent fingerprint set for profile rotation
 */
export function generateFingerprintSet(
  count: number,
  options: EnhancedFingerprintOptions = {}
): FingerprintProfile[] {
  const fingerprints: FingerprintProfile[] = [];

  for (let i = 0; i < count; i++) {
    fingerprints.push(generateEnhancedFingerprint(options));
  }

  return fingerprints;
}

/**
 * Validate fingerprint consistency
 */
export function validateFingerprintConsistency(
  fingerprint: FingerprintProfile
): {
  consistent: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check screen resolution vs device memory
  if (
    fingerprint.screen.width >= 2560 &&
    fingerprint.deviceMemory! < 8
  ) {
    issues.push('4K screen with low device memory');
  }

  // Check hardware concurrency vs device memory
  if (
    fingerprint.deviceMemory! >= 16 &&
    fingerprint.hardwareConcurrency! < 8
  ) {
    issues.push('High memory with low CPU cores');
  }

  // Check platform vs user agent
  const platformInUA = fingerprint.userAgent.toLowerCase();
  const platform = fingerprint.platform.toLowerCase();

  if (platform.includes('win') && !platformInUA.includes('windows')) {
    issues.push('Platform/UserAgent mismatch (Windows)');
  }

  if (platform.includes('mac') && !platformInUA.includes('mac')) {
    issues.push('Platform/UserAgent mismatch (Mac)');
  }

  if (platform.includes('linux') && !platformInUA.includes('linux')) {
    issues.push('Platform/UserAgent mismatch (Linux)');
  }

  return {
    consistent: issues.length === 0,
    issues,
  };
}

/**
 * Helper: Random choice from array
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Helper: Random integer between min and max
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Helper: Get timezone offset in minutes
 */
function getTimezoneOffset(timezone: string): number {
  // Simplified timezone offset mapping
  const offsets: Record<string, number> = {
    'America/New_York': -300,
    'America/Los_Angeles': -480,
    'America/Chicago': -360,
    'Europe/London': 0,
    'Europe/Paris': 60,
    'Asia/Tokyo': 540,
    'Asia/Shanghai': 480,
    'Australia/Sydney': 600,
  };

  return offsets[timezone] || 0;
}

/**
 * Get realistic fonts for platform
 */
export function getFontsForPlatform(
  platform: 'windows' | 'mac' | 'linux'
): string[] {
  return FONTS_BY_PLATFORM[platform];
}

/**
 * Get realistic screen resolutions
 */
export function getCommonScreenResolutions(): Array<{
  width: number;
  height: number;
  ratio: number;
}> {
  return SCREEN_RESOLUTIONS;
}
