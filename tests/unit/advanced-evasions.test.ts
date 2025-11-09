import { AdvancedEvasionsModule } from '../../src/modules/advanced-evasions';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('AdvancedEvasionsModule', () => {
  let browser: Browser;
  let page: Page;
  let advancedEvasions: AdvancedEvasionsModule;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    advancedEvasions = new AdvancedEvasionsModule();
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Module Initialization', () => {
    it('should have correct module name', () => {
      expect(advancedEvasions.getName()).toBe('AdvancedEvasions');
    });

    it('should inject without errors', async () => {
      await expect(advancedEvasions.inject(page)).resolves.not.toThrow();
    });
  });

  describe('Performance API Protection', () => {
    it('should protect performance.now()', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        const now1 = performance.now();
        const now2 = performance.now();
        return {
          hasPerformance: typeof performance.now === 'function',
          isNumber: typeof now1 === 'number',
          isDifferent: now1 !== now2,
        };
      });

      expect(result.hasPerformance).toBe(true);
      expect(result.isNumber).toBe(true);
      expect(result.isDifferent).toBe(true);
    });

    it('should protect performance.timing', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        return {
          hasTiming: typeof performance.timing === 'object',
          hasNavigationStart: typeof performance.timing.navigationStart === 'number',
          hasLoadEventEnd: typeof performance.timing.loadEventEnd === 'number',
        };
      });

      expect(result.hasTiming).toBe(true);
      expect(result.hasNavigationStart).toBe(true);
      expect(result.hasLoadEventEnd).toBe(true);
    });
  });

  describe('Sensor APIs Removal', () => {
    it('should remove Sensor API', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        return {
          sensor: typeof (window as any).Sensor === 'undefined',
          accelerometer: typeof (window as any).Accelerometer === 'undefined',
          gyroscope: typeof (window as any).Gyroscope === 'undefined',
          magnetometer: typeof (window as any).Magnetometer === 'undefined',
        };
      });

      expect(result.sensor).toBe(true);
      expect(result.accelerometer).toBe(true);
      expect(result.gyroscope).toBe(true);
      expect(result.magnetometer).toBe(true);
    });

    it('should remove ambient light and proximity sensors', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        return {
          ambientLight: typeof (window as any).AmbientLightSensor === 'undefined',
          proximity: typeof (window as any).ProximitySensor === 'undefined',
        };
      });

      expect(result.ambientLight).toBe(true);
      expect(result.proximity).toBe(true);
    });
  });

  describe('Device APIs Removal', () => {
    it('should remove USB API', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        return typeof (navigator as any).usb === 'undefined';
      });

      expect(result).toBe(true);
    });

    it('should remove Bluetooth API', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        return typeof (navigator as any).bluetooth === 'undefined';
      });

      expect(result).toBe(true);
    });

    it('should remove Serial API', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        return typeof (navigator as any).serial === 'undefined';
      });

      expect(result).toBe(true);
    });

    it('should remove HID API', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        return typeof (navigator as any).hid === 'undefined';
      });

      expect(result).toBe(true);
    });

    it('should remove NFC API', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        return typeof (navigator as any).nfc === 'undefined';
      });

      expect(result).toBe(true);
    });
  });

  describe('Gamepad API Protection', () => {
    it('should protect getGamepads()', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        if (!navigator.getGamepads) {
          return { hasAPI: false, gamepads: null };
        }

        const gamepads = navigator.getGamepads();
        return {
          hasAPI: true,
          isArray: Array.isArray(gamepads),
          length: gamepads.length,
          allNull: gamepads.every((g) => g === null),
        };
      });

      if (result.hasAPI) {
        expect(result.isArray).toBe(true);
        expect(result.length).toBe(4);
        expect(result.allNull).toBe(true);
      }
    });
  });

  describe('Media Codecs Protection', () => {
    it('should spoof canPlayType()', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        const video = document.createElement('video');
        return {
          mp4: video.canPlayType('video/mp4'),
          webm: video.canPlayType('video/webm'),
          ogg: video.canPlayType('video/ogg'),
          audioMpeg: video.canPlayType('audio/mpeg'),
        };
      });

      expect(result.mp4).toBeTruthy();
      expect(result.webm).toBeTruthy();
      expect(['maybe', 'probably']).toContain(result.ogg);
      expect(result.audioMpeg).toBeTruthy();
    });
  });

  describe('ClientRects Noise Injection', () => {
    it('should add noise to getBoundingClientRect()', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        const div = document.createElement('div');
        div.style.width = '100px';
        div.style.height = '100px';
        document.body.appendChild(div);

        const rect1 = div.getBoundingClientRect();
        const rect2 = div.getBoundingClientRect();

        document.body.removeChild(div);

        return {
          rect1: { x: rect1.x, y: rect1.y, width: rect1.width, height: rect1.height },
          rect2: { x: rect2.x, y: rect2.y, width: rect2.width, height: rect2.height },
          xSame: rect1.x === rect2.x,
          ySame: rect1.y === rect2.y,
        };
      });

      // Noise should make measurements slightly different
      expect(result.xSame || result.ySame).toBe(false);
    });
  });

  describe('Storage Quota Normalization', () => {
    it('should normalize storage.estimate()', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(async () => {
        if (!navigator.storage || !navigator.storage.estimate) {
          return { hasAPI: false };
        }

        const estimate = await navigator.storage.estimate();
        return {
          hasAPI: true,
          hasQuota: typeof estimate.quota === 'number',
          hasUsage: typeof estimate.usage === 'number',
          quota: estimate.quota,
        };
      });

      if (result.hasAPI) {
        expect(result.hasQuota).toBe(true);
        expect(result.hasUsage).toBe(true);
        expect(result.quota).toBe(1024 * 1024 * 1024 * 10); // 10GB
      }
    });
  });

  describe('Error Stack Trace Sanitization', () => {
    it('should sanitize error stack traces', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        try {
          throw new Error('Test error');
        } catch (e) {
          const error = e as Error;
          return {
            hasStack: !!error.stack,
            containsPuppeteer: error.stack?.includes('puppeteer') || false,
            containsPlaywright: error.stack?.includes('playwright') || false,
            containsSelenium: error.stack?.includes('selenium') || false,
            containsWebdriver: error.stack?.includes('webdriver') || false,
          };
        }
      });

      expect(result.hasStack).toBe(true);
      expect(result.containsPuppeteer).toBe(false);
      expect(result.containsPlaywright).toBe(false);
      expect(result.containsSelenium).toBe(false);
      expect(result.containsWebdriver).toBe(false);
    });
  });

  describe('VR/XR Protection', () => {
    it('should protect getVRDisplays()', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(async () => {
        if (!(navigator as any).getVRDisplays) {
          return { hasAPI: false };
        }

        const displays = await (navigator as any).getVRDisplays();
        return {
          hasAPI: true,
          isArray: Array.isArray(displays),
          isEmpty: displays.length === 0,
        };
      });

      if (result.hasAPI) {
        expect(result.isArray).toBe(true);
        expect(result.isEmpty).toBe(true);
      }
    });

    it('should remove navigator.xr', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        return typeof (navigator as any).xr === 'undefined';
      });

      expect(result).toBe(true);
    });
  });

  describe('Presentation API Removal', () => {
    it('should remove Presentation API', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        return {
          windowPresentation: typeof (window as any).Presentation === 'undefined',
          navigatorPresentation: typeof (navigator as any).presentation === 'undefined',
        };
      });

      expect(result.windowPresentation).toBe(true);
      expect(result.navigatorPresentation).toBe(true);
    });
  });

  describe('Speech API Protection', () => {
    it('should protect speechSynthesis.getVoices()', async () => {
      await advancedEvasions.inject(page);

      const result = await page.evaluate(() => {
        if (!window.speechSynthesis) {
          return { hasAPI: false };
        }

        const voices = window.speechSynthesis.getVoices();
        return {
          hasAPI: true,
          isArray: Array.isArray(voices),
          hasVoices: voices.length > 0,
        };
      });

      if (result.hasAPI) {
        expect(result.isArray).toBe(true);
        expect(result.hasVoices).toBe(true);
      }
    });
  });
});
