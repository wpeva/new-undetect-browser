/**
 * ML-based Browser Fingerprint Generator
 *
 * Generates realistic browser fingerprints based on real-world usage statistics.
 * Ensures all components are correlated and consistent with each other.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Load distribution data
const distributionsPath = path.join(__dirname, '../data/distributions.json');
const distributions = JSON.parse(fs.readFileSync(distributionsPath, 'utf-8'));

export interface GeneratorOptions {
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'auto';
  osType?: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'auto';
  browserType?: 'chrome' | 'edge' | 'firefox' | 'safari' | 'auto';
  region?: string;  // ISO country code (US, GB, DE, etc.)
  consistency?: 'strict' | 'normal' | 'loose';
}

export interface Profile {
  fingerprint: Fingerprint;
  behavior: BehaviorProfile;
  metadata: ProfileMetadata;
}

export interface Fingerprint {
  navigator: NavigatorFingerprint;
  screen: ScreenFingerprint;
  webgl: WebGLFingerprint;
  canvas: CanvasFingerprint;
  audio: AudioFingerprint;
  fonts: string[];
  plugins: Plugin[];
  mediaDevices: MediaDevice[];
}

export interface NavigatorFingerprint {
  userAgent: string;
  appVersion: string;
  platform: string;
  vendor: string;
  language: string;
  languages: string[];
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  doNotTrack: string | null;
  cookieEnabled: boolean;
  pdfViewerEnabled: boolean;
}

export interface ScreenFingerprint {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  pixelRatio: number;
  orientation: {
    type: string;
    angle: number;
  };
}

export interface WebGLFingerprint {
  vendor: string;
  renderer: string;
  version: string;
  shadingLanguageVersion: string;
  extensions: string[];
  parameters: { [key: string]: any };
}

export interface CanvasFingerprint {
  hash: string;
  noise: number;
}

export interface AudioFingerprint {
  hash: string;
  noise: number;
}

export interface Plugin {
  name: string;
  description: string;
  filename: string;
  mimeTypes: MimeType[];
}

export interface MimeType {
  type: string;
  description: string;
  suffixes: string;
}

export interface MediaDevice {
  deviceId: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
  label: string;
  groupId: string;
}

export interface BehaviorProfile {
  mouseSpeed: number;      // pixels per second
  typingSpeed: number;     // WPM (words per minute)
  scrollSpeed: number;     // pixels per second
  readingSpeed: number;    // words per minute
  randomness: number;      // 0-1 (how random/erratic)
  mistakes: boolean;       // Enable typing mistakes
  pauses: boolean;         // Enable reading pauses
}

export interface ProfileMetadata {
  id: string;
  createdAt: number;
  deviceType: string;
  osType: string;
  browserType: string;
  region: string;
  version: string;
}

export class ProfileGenerator {
  private options: Required<GeneratorOptions>;

  constructor(options: GeneratorOptions = {}) {
    this.options = {
      deviceType: options.deviceType || 'auto',
      osType: options.osType || 'auto',
      browserType: options.browserType || 'auto',
      region: options.region || 'US',
      consistency: options.consistency || 'normal'
    };
  }

  /**
   * Generate a single profile
   */
  async generate(): Promise<Profile> {
    // Step 1: Determine device type
    const deviceType = this.selectDeviceType();

    // Step 2: Determine OS (correlated with device)
    const osType = this.selectOS(deviceType);

    // Step 3: Determine browser (correlated with OS)
    const browserType = this.selectBrowser(deviceType, osType);

    // Step 4: Generate correlated fingerprint components
    const fingerprint = this.generateFingerprint(deviceType, osType, browserType);

    // Step 5: Generate behavior profile
    const behavior = this.generateBehavior(deviceType);

    // Step 6: Create metadata
    const metadata: ProfileMetadata = {
      id: this.generateId(),
      createdAt: Date.now(),
      deviceType,
      osType,
      browserType,
      region: this.options.region,
      version: '1.0.0'
    };

    return { fingerprint, behavior, metadata };
  }

  /**
   * Generate multiple profiles in batch (faster)
   */
  async generateBatch(count: number): Promise<Profile[]> {
    const profiles: Profile[] = [];
    for (let i = 0; i < count; i++) {
      profiles.push(await this.generate());
    }
    return profiles;
  }

  /**
   * Select device type based on distribution or user preference
   */
  private selectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (this.options.deviceType !== 'auto') {
      return this.options.deviceType;
    }

    // Default distribution: 70% desktop, 25% mobile, 5% tablet
    const rand = Math.random();
    if (rand < 0.70) return 'desktop';
    if (rand < 0.95) return 'mobile';
    return 'tablet';
  }

  /**
   * Select OS based on device type and distribution
   */
  private selectOS(deviceType: string): string {
    if (this.options.osType !== 'auto') {
      return this.options.osType;
    }

    const osDistribution = distributions.operatingSystems[deviceType];
    return this.weightedRandom(osDistribution);
  }

  /**
   * Select browser based on device and OS
   */
  private selectBrowser(deviceType: string, osType: string): string {
    if (this.options.browserType !== 'auto') {
      return this.options.browserType;
    }

    // Safari is dominant on macOS/iOS
    if (osType === 'macos' || osType === 'iOS') {
      return Math.random() < 0.65 ? 'Safari' : 'Chrome';
    }

    const browserDistribution = distributions.browsers[deviceType];
    return this.weightedRandom(browserDistribution);
  }

  /**
   * Generate complete fingerprint with correlated components
   */
  private generateFingerprint(
    deviceType: string,
    osType: string,
    browserType: string
  ): Fingerprint {
    // Generate screen (first, as it affects other components)
    const screen = this.generateScreen(deviceType);

    // Generate navigator
    const navigator = this.generateNavigator(deviceType, osType, browserType, screen);

    // Generate WebGL (correlated with OS and screen)
    const webgl = this.generateWebGL(osType, deviceType);

    // Generate canvas fingerprint (based on GPU)
    const canvas = this.generateCanvas(webgl);

    // Generate audio fingerprint
    const audio = this.generateAudio(osType);

    // Get fonts for OS
    const fonts = this.getFonts(osType);

    // Get plugins for browser
    const plugins = this.getPlugins(browserType);

    // Generate media devices
    const mediaDevices = this.generateMediaDevices(deviceType);

    return {
      navigator,
      screen,
      webgl,
      canvas,
      audio,
      fonts,
      plugins,
      mediaDevices
    };
  }

  /**
   * Generate navigator fingerprint
   */
  private generateNavigator(
    deviceType: string,
    osType: string,
    browserType: string,
    screen: ScreenFingerprint
  ): NavigatorFingerprint {
    // Hardware specs (correlated)
    const hardwareConcurrency = this.weightedRandom(
      distributions.hardwareConcurrency[deviceType]
    );
    const deviceMemory = this.weightedRandom(
      distributions.deviceMemory[deviceType]
    );

    // Platform
    const platforms = distributions.platforms[this.capitalizeOS(osType)];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    // Languages (based on region)
    const languages = distributions.languages[this.options.region] || ['en-US', 'en'];

    // User agent
    const userAgent = this.generateUserAgent(osType, browserType, deviceType);

    // Touch points
    const maxTouchPoints = deviceType === 'mobile' || deviceType === 'tablet' ? 5 : 0;

    // PDF viewer (Chrome 94+, Firefox always)
    const pdfViewerEnabled = browserType === 'Firefox' || browserType === 'Chrome';

    return {
      userAgent,
      appVersion: userAgent.substring(userAgent.indexOf('/') + 1),
      platform,
      vendor: browserType === 'Chrome' || browserType === 'Edge' ? 'Google Inc.' : '',
      language: languages[0],
      languages,
      hardwareConcurrency: parseInt(hardwareConcurrency as string),
      deviceMemory: parseInt(deviceMemory as string),
      maxTouchPoints,
      doNotTrack: null,  // Most users don't set this
      cookieEnabled: true,
      pdfViewerEnabled
    };
  }

  /**
   * Generate screen fingerprint
   */
  private generateScreen(deviceType: string): ScreenFingerprint {
    // Select resolution from distribution
    const resolutionStr = this.weightedRandom(
      distributions.screenResolutions[deviceType]
    );
    const [width, height] = resolutionStr.split('x').map(Number);

    // Pixel ratio
    const pixelRatio = parseFloat(
      this.weightedRandom(distributions.pixelRatios[deviceType])
    );

    // Color depth
    const colorDepth = parseInt(
      this.weightedRandom(distributions.colorDepths)
    );

    // Available size (subtract taskbar/notch)
    const availWidth = width;
    const availHeight = deviceType === 'desktop'
      ? height - (Math.random() < 0.5 ? 40 : 48)  // Windows taskbar
      : height - 20;  // Mobile status bar

    return {
      width,
      height,
      availWidth,
      availHeight,
      colorDepth,
      pixelDepth: colorDepth,
      pixelRatio,
      orientation: {
        type: width > height ? 'landscape-primary' : 'portrait-primary',
        angle: 0
      }
    };
  }

  /**
   * Generate WebGL fingerprint
   */
  private generateWebGL(osType: string, deviceType: string): WebGLFingerprint {
    let vendor: string;
    let renderer: string;

    if (osType === 'macos' || osType === 'iOS') {
      // Apple devices
      const gpuModel = this.weightedRandom(distributions.gpuModels.Apple);
      vendor = 'Apple Inc.';
      renderer = `Apple ${gpuModel}`;
    } else if (osType === 'Windows' || osType === 'Linux') {
      // Windows/Linux - NVIDIA, AMD, or Intel
      const gpuVendor = this.weightedRandom(distributions.gpuVendors.desktop);
      const gpuModel = this.weightedRandom(distributions.gpuModels[gpuVendor]);

      if (osType === 'Windows') {
        // Windows uses ANGLE (Direct3D)
        vendor = 'Google Inc. (NVIDIA Corporation)';
        renderer = `ANGLE (${gpuVendor} ${gpuModel} Direct3D11 vs_5_0 ps_5_0)`;
      } else {
        // Linux uses native OpenGL
        vendor = `${gpuVendor} Corporation`;
        renderer = `${gpuVendor} ${gpuModel}/PCIe/SSE2`;
      }
    } else {
      // Android
      vendor = 'Qualcomm';
      renderer = 'Adreno (TM) 660';
    }

    return {
      vendor,
      renderer,
      version: 'WebGL 1.0',
      shadingLanguageVersion: 'WebGL GLSL ES 1.0',
      extensions: distributions.webglExtensions.common,
      parameters: {
        MAX_TEXTURE_SIZE: 16384,
        MAX_RENDERBUFFER_SIZE: 16384,
        MAX_VIEWPORT_DIMS: [16384, 16384],
        MAX_VERTEX_ATTRIBS: 16,
        MAX_VERTEX_UNIFORM_VECTORS: 4096,
        MAX_FRAGMENT_UNIFORM_VECTORS: 4096,
        MAX_VARYING_VECTORS: 30,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 32,
        MAX_VERTEX_TEXTURE_IMAGE_UNITS: 16,
        MAX_TEXTURE_IMAGE_UNITS: 16
      }
    };
  }

  /**
   * Generate canvas fingerprint (based on GPU)
   */
  private generateCanvas(webgl: WebGLFingerprint): CanvasFingerprint {
    // Create stable hash based on GPU
    const hash = crypto
      .createHash('sha256')
      .update(webgl.renderer)
      .digest('hex')
      .substring(0, 16);

    // Small noise variation (0-2 pixels difference)
    const noise = Math.random() * 2;

    return { hash, noise };
  }

  /**
   * Generate audio fingerprint
   */
  private generateAudio(osType: string): AudioFingerprint {
    // Different audio contexts produce different fingerprints
    const hash = crypto
      .createHash('sha256')
      .update(osType + Math.random().toString())
      .digest('hex')
      .substring(0, 16);

    const noise = Math.random() * 0.0001;  // Very small audio noise

    return { hash, noise };
  }

  /**
   * Get font list for OS
   */
  private getFonts(osType: string): string[] {
    const osKey = this.capitalizeOS(osType).toLowerCase();
    const fontList = (distributions.fonts[osKey] || distributions.fonts.windows) as string[];

    // Return 60-90% of fonts (not all users have all fonts)
    const percentage = 0.6 + Math.random() * 0.3;
    const count = Math.floor(fontList.length * percentage);

    return this.shuffle(fontList).slice(0, count).sort();
  }

  /**
   * Get plugins for browser
   */
  private getPlugins(browserType: string): Plugin[] {
    const browserKey = browserType.toLowerCase();
    const pluginNames = distributions.plugins[browserKey] || [];

    return pluginNames.map((name: string) => ({
      name,
      description: name,
      filename: name.toLowerCase().replace(/ /g, '-') + '.plugin',
      mimeTypes: []
    }));
  }

  /**
   * Generate media devices (cameras, microphones)
   */
  private generateMediaDevices(deviceType: string): MediaDevice[] {
    const devices: MediaDevice[] = [];

    // Most devices have at least 1 camera and 1 microphone
    if (deviceType === 'mobile' || deviceType === 'tablet') {
      // Mobile: front + back camera, 1 mic
      devices.push(
        this.createMediaDevice('videoinput', 'Front Camera'),
        this.createMediaDevice('videoinput', 'Back Camera'),
        this.createMediaDevice('audioinput', 'Built-in Microphone')
      );
    } else {
      // Desktop: 50% have webcam, all have mic, some have multiple audio outputs
      if (Math.random() < 0.5) {
        devices.push(this.createMediaDevice('videoinput', 'Integrated Camera'));
      }

      devices.push(
        this.createMediaDevice('audioinput', 'Default - Microphone'),
        this.createMediaDevice('audiooutput', 'Default - Speakers')
      );

      // 30% have headphones
      if (Math.random() < 0.3) {
        devices.push(this.createMediaDevice('audiooutput', 'Headphones'));
      }
    }

    return devices;
  }

  /**
   * Create a media device with random IDs
   */
  private createMediaDevice(kind: MediaDevice['kind'], label: string): MediaDevice {
    return {
      deviceId: this.generateDeviceId(),
      kind,
      label,
      groupId: this.generateGroupId()
    };
  }

  /**
   * Generate behavior profile
   */
  private generateBehavior(deviceType: string): BehaviorProfile {
    // Mobile users are generally slower
    const baseTypingSpeed = deviceType === 'mobile' ? 35 : 50;  // WPM
    const baseMouseSpeed = deviceType === 'mobile' ? 800 : 1200;  // px/s

    return {
      mouseSpeed: baseMouseSpeed + (Math.random() * 400 - 200),  // ±200 px/s
      typingSpeed: baseTypingSpeed + (Math.random() * 20 - 10),  // ±10 WPM
      scrollSpeed: 800 + (Math.random() * 400 - 200),  // ±200 px/s
      readingSpeed: 200 + (Math.random() * 100 - 50),  // ±50 WPM
      randomness: 0.3 + Math.random() * 0.4,  // 0.3-0.7
      mistakes: Math.random() < 0.8,  // 80% make mistakes
      pauses: Math.random() < 0.9  // 90% pause while reading
    };
  }

  /**
   * Generate User Agent string
   */
  private generateUserAgent(osType: string, browserType: string, deviceType: string): string {
    const chromeVersion = 120 + Math.floor(Math.random() * 5);  // 120-124

    if (browserType === 'Chrome' || browserType === 'Edge') {
      if (osType === 'Windows') {
        return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
      } else if (osType === 'macOS') {
        return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
      } else if (osType === 'Linux') {
        return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
      } else if (osType === 'Android') {
        return `Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Mobile Safari/537.36`;
      }
    } else if (browserType === 'Firefox') {
      const firefoxVersion = 120 + Math.floor(Math.random() * 5);
      if (osType === 'Windows') {
        return `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${firefoxVersion}.0) Gecko/20100101 Firefox/${firefoxVersion}.0`;
      } else if (osType === 'macOS') {
        return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${firefoxVersion}.0) Gecko/20100101 Firefox/${firefoxVersion}.0`;
      }
    } else if (browserType === 'Safari') {
      if (osType === 'macOS') {
        return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15`;
      } else if (osType === 'iOS') {
        return `Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1`;
      }
    }

    // Default to Chrome on Windows
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
  }

  /**
   * Weighted random selection from distribution
   */
  private weightedRandom(distribution: { [key: string]: number }): string {
    const rand = Math.random();
    let cumulative = 0;

    for (const [value, weight] of Object.entries(distribution)) {
      cumulative += weight;
      if (rand < cumulative) {
        return value;
      }
    }

    // Fallback to first item
    return Object.keys(distribution)[0];
  }

  /**
   * Capitalize OS name
   */
  private capitalizeOS(os: string): string {
    const map: { [key: string]: string } = {
      'windows': 'Windows',
      'macos': 'macOS',
      'linux': 'Linux',
      'android': 'Android',
      'ios': 'iOS'
    };
    return map[os.toLowerCase()] || os;
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Generate unique profile ID
   */
  private generateId(): string {
    return `profile-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate device ID (format: lowercase hex string)
   */
  private generateDeviceId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate group ID (format: lowercase hex string)
   */
  private generateGroupId(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Export default instance
export const profileGenerator = new ProfileGenerator();
