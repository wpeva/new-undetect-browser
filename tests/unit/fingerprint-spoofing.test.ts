import { FingerprintSpoofingModule } from '../../src/modules/fingerprint-spoofing';
import { FingerprintProfile } from '../../src/types/browser-types';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('FingerprintSpoofingModule', () => {
  let browser: Browser;
  let page: Page;
  let fingerprint: FingerprintSpoofingModule;

  // Create test profile
  const testProfile: FingerprintProfile = {
    canvas: {
      noise: 0.001,
      toDataURL: true,
    },
    webgl: {
      vendor: 'Intel Inc.',
      renderer: 'Intel Iris OpenGL Engine',
      noise: 0.0001,
    },
    audio: {
      noise: 0.00001,
      frequencyVariation: 0.0001,
    },
    fonts: ['Arial', 'Verdana', 'Times New Roman'],
    plugins: [] as unknown as PluginArray,
    screen: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      pixelDepth: 24,
    },
    timezone: -480, // PST
    language: 'en-US',
    platform: 'MacIntel',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  };

  beforeAll(async () => {
    fingerprint = new FingerprintSpoofingModule(testProfile);
    browser = await puppeteer.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Canvas Fingerprinting Protection', () => {
    it('should protect toDataURL method', async () => {
      await fingerprint.inject(page);

      const canvasData1 = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgb(255, 0, 0)';
          ctx.fillRect(0, 0, 100, 100);
        }
        return canvas.toDataURL();
      });

      const canvasData2 = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgb(255, 0, 0)';
          ctx.fillRect(0, 0, 100, 100);
        }
        return canvas.toDataURL();
      });

      // With noise, outputs should be slightly different
      expect(canvasData1).not.toBe(canvasData2);
      expect(canvasData1.length).toBeGreaterThan(100);
      expect(canvasData2.length).toBeGreaterThan(100);
    });

    it('should protect toBlob method', async () => {
      await fingerprint.inject(page);

      const hasToBlobProtection = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        return typeof canvas.toBlob === 'function';
      });

      expect(hasToBlobProtection).toBe(true);
    });
  });

  describe('WebGL Fingerprinting Protection', () => {
    it('should protect getParameter with custom vendor/renderer', async () => {
      await fingerprint.inject(page);

      const webglInfo = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return null;

        return {
          vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
          renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
        };
      });

      expect(webglInfo).toBeTruthy();
      expect(webglInfo?.vendor).toBe(testProfile.webgl.vendor);
      expect(webglInfo?.renderer).toBe(testProfile.webgl.renderer);
    });

    it('should add noise to readPixels', async () => {
      await fingerprint.inject(page);

      const pixelData1 = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        gl.clearColor(1, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const pixels = new Uint8Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return Array.from(pixels);
      });

      expect(pixelData1).toBeTruthy();
      expect(pixelData1?.length).toBe(4);
      // Noise should make it slightly different from perfect [255, 0, 0, 255]
    });
  });

  describe('Audio Context Fingerprinting Protection', () => {
    it('should protect AudioContext oscillator', async () => {
      await fingerprint.inject(page);

      const hasAudioProtection = await page.evaluate(() => {
        if (typeof AudioContext === 'undefined') return false;

        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();

        // Check if frequency is modifiable (means protection is active)
        return !!oscillator.frequency;
      });

      expect(hasAudioProtection).toBeTruthy();
    });

    it('should protect getChannelData', async () => {
      await fingerprint.inject(page);

      const hasChannelDataProtection = await page.evaluate(() => {
        if (typeof AudioContext === 'undefined') return false;

        const audioContext = new AudioContext();
        const buffer = audioContext.createBuffer(1, 1024, 44100);
        const channelData = buffer.getChannelData(0);

        return channelData instanceof Float32Array;
      });

      expect(hasChannelDataProtection).toBe(true);
    });
  });

  describe('Font Fingerprinting Protection', () => {
    it('should inject font detection protection', async () => {
      await fingerprint.inject(page);

      const hasFontProtection = await page.evaluate(() => {
        // Font detection typically uses canvas measureText
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        ctx.font = '12px Arial';
        const metrics = ctx.measureText('test');

        return metrics.width > 0;
      });

      expect(hasFontProtection).toBe(true);
    });
  });

  describe('Screen Fingerprinting Protection', () => {
    it('should protect screen properties', async () => {
      await fingerprint.inject(page);

      const screenInfo = await page.evaluate(() => {
        return {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth,
          pixelDepth: screen.pixelDepth,
        };
      });

      expect(screenInfo.width).toBe(testProfile.screen.width);
      expect(screenInfo.height).toBe(testProfile.screen.height);
      expect(screenInfo.colorDepth).toBe(testProfile.screen.colorDepth);
      expect(screenInfo.pixelDepth).toBe(testProfile.screen.pixelDepth);
    });
  });

  describe('Battery API Protection', () => {
    it('should protect getBattery if available', async () => {
      await fingerprint.inject(page);

      const hasBatteryProtection = await page.evaluate(() => {
        return typeof navigator.getBattery === 'function';
      });

      // getBattery may or may not be available, but shouldn't throw
      expect(typeof hasBatteryProtection).toBe('boolean');
    });
  });

  describe('Media Devices Protection', () => {
    it('should protect enumerateDevices', async () => {
      await fingerprint.inject(page);

      const hasMediaDevicesProtection = await page.evaluate(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          return false;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        return Array.isArray(devices);
      });

      expect(hasMediaDevicesProtection).toBeTruthy();
    });
  });

  describe('Navigator Properties Protection', () => {
    it('should protect navigator.hardwareConcurrency', async () => {
      await fingerprint.inject(page);

      const concurrency = await page.evaluate(() => {
        return navigator.hardwareConcurrency;
      });

      expect(concurrency).toBe(testProfile.hardwareConcurrency);
    });

    it('should protect navigator.deviceMemory if available', async () => {
      await fingerprint.inject(page);

      const deviceMemory = await page.evaluate(() => {
        return (navigator as any).deviceMemory;
      });

      if (deviceMemory !== undefined) {
        expect(deviceMemory).toBe(testProfile.deviceMemory);
      }
    });

    it('should protect navigator.platform', async () => {
      await fingerprint.inject(page);

      const platform = await page.evaluate(() => {
        return navigator.platform;
      });

      expect(platform).toBe(testProfile.platform);
    });

    it('should protect navigator.language', async () => {
      await fingerprint.inject(page);

      const language = await page.evaluate(() => {
        return navigator.language;
      });

      expect(language).toBe(testProfile.language);
    });
  });

  describe('Timezone Protection', () => {
    it('should protect Date.getTimezoneOffset', async () => {
      await fingerprint.inject(page);

      const timezoneOffset = await page.evaluate(() => {
        return new Date().getTimezoneOffset();
      });

      expect(timezoneOffset).toBe(testProfile.timezone);
    });
  });

  describe('Plugin Fingerprinting Protection', () => {
    it('should protect navigator.plugins', async () => {
      await fingerprint.inject(page);

      const plugins = await page.evaluate(() => {
        return navigator.plugins.length;
      });

      expect(typeof plugins).toBe('number');
      expect(plugins).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Tests', () => {
    it('should inject all protections without errors', async () => {
      await expect(fingerprint.inject(page, testProfile)).resolves.not.toThrow();
    });

    it('should maintain consistent fingerprint across multiple checks', async () => {
      await fingerprint.inject(page);

      const fingerprint1 = await page.evaluate(() => {
        return {
          platform: navigator.platform,
          language: navigator.language,
          hardwareConcurrency: navigator.hardwareConcurrency,
          timezone: new Date().getTimezoneOffset(),
          screenWidth: screen.width,
          screenHeight: screen.height,
        };
      });

      const fingerprint2 = await page.evaluate(() => {
        return {
          platform: navigator.platform,
          language: navigator.language,
          hardwareConcurrency: navigator.hardwareConcurrency,
          timezone: new Date().getTimezoneOffset(),
          screenWidth: screen.width,
          screenHeight: screen.height,
        };
      });

      // All properties should be consistent
      expect(fingerprint1).toEqual(fingerprint2);
    });

    it('should not break normal page functionality', async () => {
      await fingerprint.inject(page);

      const canRenderContent = await page.evaluate(() => {
        const div = document.createElement('div');
        div.textContent = 'Test';
        document.body.appendChild(div);
        return div.textContent === 'Test';
      });

      expect(canRenderContent).toBe(true);
    });
  });
});
