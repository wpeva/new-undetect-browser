import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * Hardware configuration
 */
export interface HardwareConfig {
  cpu: {
    cores: number;
    architecture: string;
  };
  memory: {
    total: number; // GB
    available: number; // GB
  };
  gpu: {
    vendor: string;
    renderer: string;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  battery?: {
    charging: boolean;
    level: number;
    chargingTime?: number;
    dischargingTime?: number;
  };
  platform: 'Windows' | 'MacOS' | 'Linux';
}

/**
 * Hardware profiles for different systems
 */
const HARDWARE_PROFILES: Record<string, HardwareConfig> = {
  'windows-high': {
    cpu: { cores: 8, architecture: 'x86_64' },
    memory: { total: 16, available: 12 },
    gpu: {
      vendor: 'NVIDIA Corporation',
      renderer: 'NVIDIA GeForce GTX 1660 Ti',
    },
    screen: { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1 },
    battery: { charging: false, level: 0.85, dischargingTime: Infinity },
    platform: 'Windows',
  },
  'windows-medium': {
    cpu: { cores: 4, architecture: 'x86_64' },
    memory: { total: 8, available: 6 },
    gpu: {
      vendor: 'Intel Inc.',
      renderer: 'Intel(R) UHD Graphics 620',
    },
    screen: { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1 },
    battery: { charging: true, level: 0.65, chargingTime: 3600 },
    platform: 'Windows',
  },
  'mac-high': {
    cpu: { cores: 8, architecture: 'arm64' },
    memory: { total: 16, available: 12 },
    gpu: { vendor: 'Apple', renderer: 'Apple M1 Pro' },
    screen: { width: 2560, height: 1600, colorDepth: 24, pixelRatio: 2 },
    platform: 'MacOS',
  },
  'mac-medium': {
    cpu: { cores: 4, architecture: 'x86_64' },
    memory: { total: 8, available: 6 },
    gpu: { vendor: 'Intel Inc.', renderer: 'Intel Iris Plus Graphics 640' },
    screen: { width: 1440, height: 900, colorDepth: 24, pixelRatio: 2 },
    platform: 'MacOS',
  },
  'linux-medium': {
    cpu: { cores: 4, architecture: 'x86_64' },
    memory: { total: 8, available: 6 },
    gpu: { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 620 (KBL GT2)' },
    screen: { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1 },
    platform: 'Linux',
  },
};

/**
 * Hardware Spoofing Module
 * Provides consistent hardware fingerprinting across sessions
 */
export class HardwareSpoofing {
  private config: HardwareConfig;

  constructor(config?: Partial<HardwareConfig> | string) {
    if (typeof config === 'string') {
      // Load preset profile
      this.config = HARDWARE_PROFILES[config] || HARDWARE_PROFILES['windows-medium'];
    } else {
      // Use custom config or default
      this.config = config
        ? { ...HARDWARE_PROFILES['windows-medium'], ...config }
        : HARDWARE_PROFILES['windows-medium'];
    }

    logger.info(
      `Hardware Spoofing initialized (${this.config.cpu.cores} cores, ${this.config.memory.total}GB RAM, ${this.config.gpu.vendor})`
    );
  }

  /**
   * Inject hardware spoofing into page
   */
  async inject(page: Page): Promise<void> {
    await page.evaluateOnNewDocument((config: HardwareConfig) => {
      // Spoof navigator.hardwareConcurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => config.cpu.cores,
        configurable: true,
      });

      // Spoof navigator.deviceMemory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => config.memory.total,
        configurable: true,
      });

      // Spoof WebGL vendor and renderer
      const getParameterProxyHandler = {
        apply(target: any, thisArg: any, args: any[]) {
          const param = args[0];

          if (param === 37445) {
            // UNMASKED_VENDOR_WEBGL
            return config.gpu.vendor;
          }
          if (param === 37446) {
            // UNMASKED_RENDERER_WEBGL
            return config.gpu.renderer;
          }

          return Reflect.apply(target, thisArg, args);
        },
      };

      // Override WebGLRenderingContext
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = new Proxy(
        originalGetParameter,
        getParameterProxyHandler
      );

      // Override WebGL2RenderingContext if available
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = new Proxy(
          originalGetParameter2,
          getParameterProxyHandler
        );
      }

      // Spoof screen properties
      Object.defineProperty(window.screen, 'width', {
        get: () => config.screen.width,
        configurable: true,
      });

      Object.defineProperty(window.screen, 'height', {
        get: () => config.screen.height,
        configurable: true,
      });

      Object.defineProperty(window.screen, 'availWidth', {
        get: () => config.screen.width,
        configurable: true,
      });

      Object.defineProperty(window.screen, 'availHeight', {
        get: () => config.screen.height - 40, // Account for taskbar
        configurable: true,
      });

      Object.defineProperty(window.screen, 'colorDepth', {
        get: () => config.screen.colorDepth,
        configurable: true,
      });

      Object.defineProperty(window.screen, 'pixelDepth', {
        get: () => config.screen.colorDepth,
        configurable: true,
      });

      // Spoof devicePixelRatio
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => config.screen.pixelRatio,
        configurable: true,
      });

      // Spoof Battery API
      if (config.battery && navigator.getBattery) {
        const originalGetBattery = navigator.getBattery;
        // @ts-ignore - BatteryManager type is defined in browser-types.d.ts
        navigator.getBattery = function (): Promise<BatteryManager> {
          return originalGetBattery.call(this).then((battery) => {
            // Create proxy for battery
            return new Proxy(battery, {
              get(target, prop) {
                switch (prop) {
                  case 'charging':
                    return config.battery!.charging;
                  case 'level':
                    return config.battery!.level;
                  case 'chargingTime':
                    return config.battery!.chargingTime !== undefined
                      ? config.battery!.chargingTime
                      : target.chargingTime;
                  case 'dischargingTime':
                    return config.battery!.dischargingTime !== undefined
                      ? config.battery!.dischargingTime
                      : target.dischargingTime;
                  default:
                    return Reflect.get(target, prop);
                }
              },
            });
          });
        };
      }

      // Spoof navigator.platform
      Object.defineProperty(navigator, 'platform', {
        get: () => {
          switch (config.platform) {
            case 'Windows':
              return 'Win32';
            case 'MacOS':
              return 'MacIntel';
            case 'Linux':
              return 'Linux x86_64';
            default:
              return 'Win32';
          }
        },
        configurable: true,
      });

      // Spoof Performance API timing
      const originalNow = Performance.prototype.now;
      let timeOffset = Math.random() * 100; // Add random offset

      Performance.prototype.now = function (): number {
        return originalNow.call(this) + timeOffset;
      };

      // Spoof Storage Quota API
      if (navigator.storage && navigator.storage.estimate) {
        const originalEstimate = navigator.storage.estimate;
        navigator.storage.estimate = async function (): Promise<StorageEstimate> {
          const estimate = await originalEstimate.call(this);

          // Return consistent storage based on device memory
          const totalStorage = config.memory.total * 1024 * 1024 * 1024; // Convert GB to bytes
          const usedStorage = totalStorage * 0.3; // Use 30%

          return {
            quota: totalStorage,
            usage: usedStorage,
            // @ts-ignore - usageDetails is a non-standard property
            usageDetails: estimate.usageDetails,
          };
        };
      }

      // Spoof Media Devices
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
        navigator.mediaDevices.enumerateDevices = async function (): Promise<
          MediaDeviceInfo[]
        > {
          const devices = await originalEnumerateDevices.call(this);

          // Return consistent device count based on platform
          const deviceCount = {
            Windows: { audio: 2, video: 1 },
            MacOS: { audio: 2, video: 1 },
            Linux: { audio: 1, video: 1 },
          }[config.platform];

          return devices.slice(0, deviceCount.audio + deviceCount.video);
        };
      }

      // Spoof Gamepad API
      Object.defineProperty(navigator, 'getGamepads', {
        value: function (): (Gamepad | null)[] {
          // Return empty array (no gamepads)
          return [];
        },
        configurable: true,
      });

      // Spoof Keyboard Layout
      // @ts-ignore - keyboard property is defined in browser-types.d.ts
      if (navigator.keyboard) {
        // @ts-ignore - keyboard property is defined in browser-types.d.ts
        Object.defineProperty(navigator.keyboard, 'getLayoutMap', {
          value: async function (): Promise<Map<string, string>> {
            // Return US keyboard layout
            const layout = new Map<string, string>();
            layout.set('KeyA', 'a');
            layout.set('KeyB', 'b');
            // ... (simplified)
            return layout;
          },
          configurable: true,
        });
      }

      // Spoof Audio Context
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const originalAudioContext = AudioContext;
        (window as any).AudioContext = function (
          this: AudioContext,
          ...args: any[]
        ) {
          const context = new originalAudioContext(...args);

          // Spoof sample rate based on platform
          const sampleRate = {
            Windows: 48000,
            MacOS: 44100,
            Linux: 48000,
          }[config.platform];

          Object.defineProperty(context, 'sampleRate', {
            get: () => sampleRate,
            configurable: true,
          });

          return context;
        };
        (window as any).AudioContext.prototype = originalAudioContext.prototype;
      }

      // Spoof USB/Bluetooth/HID APIs (remove them)
      delete (navigator as any).usb;
      delete (navigator as any).bluetooth;
      delete (navigator as any).hid;

      // Spoof Sensors API
      delete (window as any).Accelerometer;
      delete (window as any).Gyroscope;
      delete (window as any).LinearAccelerationSensor;
      delete (window as any).AbsoluteOrientationSensor;
      delete (window as any).RelativeOrientationSensor;
      delete (window as any).GravitySensor;
      delete (window as any).Magnetometer;

      // Spoof VR/XR APIs
      delete (navigator as any).xr;
      delete (navigator as any).getVRDisplays;

      logger.info('Hardware Spoofing injected successfully');
    }, this.config);

    logger.info('Hardware Spoofing injected into page');
  }

  /**
   * Get current hardware configuration
   */
  getConfig(): HardwareConfig {
    return { ...this.config };
  }

  /**
   * Update hardware configuration
   */
  updateConfig(config: Partial<HardwareConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Hardware Spoofing configuration updated');
  }

  /**
   * Get available hardware profiles
   */
  static getProfiles(): string[] {
    return Object.keys(HARDWARE_PROFILES);
  }

  /**
   * Get specific hardware profile
   */
  static getProfile(name: string): HardwareConfig | undefined {
    return HARDWARE_PROFILES[name];
  }

  /**
   * Validate hardware configuration consistency
   */
  validateConsistency(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check CPU cores (reasonable range: 1-32)
    if (this.config.cpu.cores < 1 || this.config.cpu.cores > 32) {
      issues.push(`Invalid CPU cores: ${this.config.cpu.cores}`);
    }

    // Check memory (reasonable range: 1-128 GB)
    if (this.config.memory.total < 1 || this.config.memory.total > 128) {
      issues.push(`Invalid memory total: ${this.config.memory.total}GB`);
    }

    if (this.config.memory.available > this.config.memory.total) {
      issues.push('Available memory exceeds total memory');
    }

    // Check screen resolution
    if (
      this.config.screen.width < 800 ||
      this.config.screen.width > 7680 ||
      this.config.screen.height < 600 ||
      this.config.screen.height > 4320
    ) {
      issues.push(
        `Invalid screen resolution: ${this.config.screen.width}x${this.config.screen.height}`
      );
    }

    // Check color depth
    if (![16, 24, 32, 48].includes(this.config.screen.colorDepth)) {
      issues.push(`Invalid color depth: ${this.config.screen.colorDepth}`);
    }

    // Check pixel ratio
    if (
      this.config.screen.pixelRatio < 0.5 ||
      this.config.screen.pixelRatio > 3
    ) {
      issues.push(`Invalid pixel ratio: ${this.config.screen.pixelRatio}`);
    }

    // Check battery level
    if (this.config.battery) {
      if (this.config.battery.level < 0 || this.config.battery.level > 1) {
        issues.push(`Invalid battery level: ${this.config.battery.level}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

/**
 * Create hardware spoofing instance
 */
export function createHardwareSpoofing(
  config?: Partial<HardwareConfig> | string
): HardwareSpoofing {
  return new HardwareSpoofing(config);
}
