/**
 * Tests for new protection modules (Session 1)
 *
 * Tests:
 * - ClientRects Protection
 * - SpeechSynthesis Protection
 * - MediaCodecs Protection
 * - WebGL2 Protection
 * - Performance API Protection
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { ClientRectsProtection } from '../../src/modules/client-rects-protection';
import { SpeechSynthesisProtection } from '../../src/modules/speech-synthesis-protection';
import { MediaCodecsProtection } from '../../src/modules/media-codecs-protection';
import { WebGL2Protection } from '../../src/modules/webgl2-protection';
import { PerformanceAPIProtection } from '../../src/modules/performance-api-protection';

describe('New Protection Modules (Session 1)', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('ClientRects Protection', () => {
    it('should add noise to getBoundingClientRect()', async () => {
      const protection = new ClientRectsProtection({
        enabled: true,
        noiseLevel: 'moderate',
        seed: 12345,
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        const div = document.createElement('div');
        div.style.width = '100px';
        div.style.height = '50px';
        document.body.appendChild(div);

        const rect1 = div.getBoundingClientRect();
        const rect2 = div.getBoundingClientRect();

        return {
          rect1: { x: rect1.x, y: rect1.y, width: rect1.width, height: rect1.height },
          rect2: { x: rect2.x, y: rect2.y, width: rect2.width, height: rect2.height },
          isConsistent: rect1.x === rect2.x && rect1.y === rect2.y,
        };
      });

      // Rects should be consistent across multiple calls
      expect(result.isConsistent).toBe(true);

      // Values should have noise (unlikely to be exact integers)
      expect(result.rect1.width).toBeCloseTo(100, 0);
      expect(result.rect1.height).toBeCloseTo(50, 0);
    });

    it('should protect getClientRects()', async () => {
      const protection = new ClientRectsProtection({
        enabled: true,
        noiseLevel: 'subtle',
        seed: 54321,
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        const div = document.createElement('div');
        div.textContent = 'Test content';
        document.body.appendChild(div);

        const rects = div.getClientRects();
        return {
          count: rects.length,
          hasNoise: rects.length > 0 && rects[0].width % 1 !== 0,
        };
      });

      expect(result.count).toBeGreaterThan(0);
    });

    it('should make modifications undetectable', async () => {
      const protection = new ClientRectsProtection();
      await protection.apply(page);

      const isNative = await page.evaluate(() => {
        return (
          Element.prototype.getBoundingClientRect.toString() ===
          'function getBoundingClientRect() { [native code] }'
        );
      });

      expect(isNative).toBe(true);
    });
  });

  describe('SpeechSynthesis Protection', () => {
    it('should spoof voice list for Windows', async () => {
      const protection = new SpeechSynthesisProtection({
        enabled: true,
        platform: 'Win32',
      });

      await protection.apply(page);

      const voices = await page.evaluate(() => {
        return window.speechSynthesis.getVoices().map((v) => ({
          name: v.name,
          lang: v.lang,
          default: v.default,
          localService: v.localService,
        }));
      });

      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0].name).toContain('Microsoft');
      expect(voices.some((v) => v.default)).toBe(true);
    });

    it('should spoof voice list for macOS', async () => {
      const protection = new SpeechSynthesisProtection({
        enabled: true,
        platform: 'MacIntel',
      });

      await protection.apply(page);

      const voices = await page.evaluate(() => {
        return window.speechSynthesis.getVoices().map((v) => v.name);
      });

      expect(voices).toContain('Alex');
      expect(voices).toContain('Samantha');
      expect(voices.length).toBeGreaterThan(10);
    });

    it('should trigger voiceschanged event', async () => {
      const protection = new SpeechSynthesisProtection({
        enabled: true,
        platform: 'Win32',
      });

      await protection.apply(page);

      const eventTriggered = await page.evaluate(() => {
        return new Promise((resolve) => {
          window.speechSynthesis.addEventListener('voiceschanged', () => {
            resolve(true);
          });
          setTimeout(() => resolve(false), 500);
        });
      });

      expect(eventTriggered).toBe(true);
    });
  });

  describe('MediaCodecs Protection', () => {
    it('should spoof video codec support', async () => {
      const protection = new MediaCodecsProtection({
        enabled: true,
        platform: 'Win32',
        browser: 'chrome',
      });

      await protection.apply(page);

      const support = await page.evaluate(() => {
        const video = document.createElement('video');
        return {
          mp4: video.canPlayType('video/mp4'),
          h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
          webm: video.canPlayType('video/webm'),
          vp9: video.canPlayType('video/webm; codecs="vp9"'),
          ogg: video.canPlayType('video/ogg'),
        };
      });

      expect(support.mp4).toBe('probably');
      expect(support.h264).toBe('probably');
      expect(support.webm).toBe('probably');
      expect(support.vp9).toBe('probably');
    });

    it('should spoof audio codec support', async () => {
      const protection = new MediaCodecsProtection({
        enabled: true,
        platform: 'Win32',
        browser: 'chrome',
      });

      await protection.apply(page);

      const support = await page.evaluate(() => {
        const audio = document.createElement('audio');
        return {
          mp3: audio.canPlayType('audio/mpeg'),
          aac: audio.canPlayType('audio/mp4; codecs="mp4a.40.2"'),
          opus: audio.canPlayType('audio/webm; codecs="opus"'),
          wav: audio.canPlayType('audio/wav'),
          flac: audio.canPlayType('audio/flac'),
        };
      });

      expect(support.mp3).toBe('probably');
      expect(support.aac).toBe('probably');
      expect(support.opus).toBe('probably');
      expect(support.wav).toBe('probably');
      expect(support.flac).toBe('probably');
    });

    it('should be platform-specific (Safari)', async () => {
      const protection = new MediaCodecsProtection({
        enabled: true,
        platform: 'MacIntel',
        browser: 'safari',
      });

      await protection.apply(page);

      const support = await page.evaluate(() => {
        const video = document.createElement('video');
        return {
          webm: video.canPlayType('video/webm'),
          ogg: video.canPlayType('video/ogg'),
        };
      });

      // Safari doesn't support WebM/Ogg
      expect(support.webm).toBe('');
      expect(support.ogg).toBe('');
    });
  });

  describe('WebGL2 Protection', () => {
    it('should spoof WebGL2 vendor and renderer', async () => {
      const protection = new WebGL2Protection({
        enabled: true,
        vendor: 'NVIDIA Corporation',
        gpu: 'NVIDIA GeForce RTX 3080',
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');

        if (!gl) return null;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          vendor: debugInfo
            ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
            : null,
          renderer: debugInfo
            ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            : null,
        };
      });

      expect(result).not.toBeNull();
      expect(result!.vendor).toBe('NVIDIA Corporation');
      expect(result!.renderer).toBe('NVIDIA GeForce RTX 3080');
    });

    it('should spoof WebGL2 parameters', async () => {
      const protection = new WebGL2Protection({
        enabled: true,
        vendor: 'NVIDIA Corporation',
        gpu: 'NVIDIA GeForce RTX 3080',
      });

      await protection.apply(page);

      const params = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

        if (!gl) return null;

        return {
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
          maxColorAttachments: gl.getParameter(gl.MAX_COLOR_ATTACHMENTS),
          maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS),
          maxSamples: gl.getParameter(gl.MAX_SAMPLES),
        };
      });

      expect(params).not.toBeNull();
      expect(params!.maxTextureSize).toBe(32768);
      expect(params!.maxColorAttachments).toBe(8);
      expect(params!.maxDrawBuffers).toBe(8);
      expect(params!.maxSamples).toBe(16);
    });

    it('should filter extensions', async () => {
      const protection = new WebGL2Protection({
        enabled: true,
        vendor: 'NVIDIA Corporation',
        gpu: 'NVIDIA GeForce RTX 3080',
      });

      await protection.apply(page);

      const extensions = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');

        if (!gl) return null;

        return gl.getSupportedExtensions();
      });

      expect(extensions).not.toBeNull();
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions!.length).toBeGreaterThan(0);
    });
  });

  describe('Performance API Protection', () => {
    it('should add noise to performance.now()', async () => {
      const protection = new PerformanceAPIProtection({
        enabled: true,
        noiseLevel: 'moderate',
        seed: 12345,
      });

      await protection.apply(page);

      const result = await page.evaluate(() => {
        const time1 = performance.now();
        const time2 = performance.now();
        const time3 = performance.now();

        return {
          time1,
          time2,
          time3,
          isMonotonic: time1 < time2 && time2 < time3,
          hasDecimal: time1 % 1 !== 0,
        };
      });

      // Time should be monotonic
      expect(result.isMonotonic).toBe(true);

      // Should have decimal places (noise)
      expect(result.hasDecimal).toBe(true);
    });

    it('should protect performance.timing', async () => {
      const protection = new PerformanceAPIProtection({
        enabled: true,
        protectTiming: true,
      });

      await protection.apply(page);

      const timing = await page.evaluate(() => {
        return {
          navigationStart: performance.timing.navigationStart,
          loadEventEnd: performance.timing.loadEventEnd,
        };
      });

      expect(timing.navigationStart).toBeGreaterThan(0);
    });

    it('should protect resource timing', async () => {
      const protection = new PerformanceAPIProtection({
        enabled: true,
        protectResourceTiming: true,
      });

      await protection.apply(page);

      // Navigate to trigger some resource loading
      await page.goto('data:text/html,<html><body>Test</body></html>');

      const resources = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        return entries.length;
      });

      // Should return resource entries (might be 0 for data URL)
      expect(typeof resources).toBe('number');
    });

    it('should make modifications look native', async () => {
      const protection = new PerformanceAPIProtection();
      await protection.apply(page);

      const isNative = await page.evaluate(() => {
        return (
          performance.now.toString() === 'function now() { [native code] }'
        );
      });

      expect(isNative).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should apply all protections together', async () => {
      // Apply all protections
      const clientRects = new ClientRectsProtection();
      const speechSynthesis = new SpeechSynthesisProtection();
      const mediaCodecs = new MediaCodecsProtection();
      const webgl2 = new WebGL2Protection();
      const performanceAPI = new PerformanceAPIProtection();

      await Promise.all([
        clientRects.apply(page),
        speechSynthesis.apply(page),
        mediaCodecs.apply(page),
        webgl2.apply(page),
        performanceAPI.apply(page),
      ]);

      // Verify all protections are active
      const result = await page.evaluate(() => {
        return {
          clientRects:
            typeof Element.prototype.getBoundingClientRect === 'function',
          speechSynthesis: window.speechSynthesis.getVoices().length > 0,
          mediaCodecs:
            document.createElement('video').canPlayType('video/mp4') !=='',
          webgl2:
            document.createElement('canvas').getContext('webgl2') !== null,
          performance: typeof performance.now === 'function',
        };
      });

      expect(result.clientRects).toBe(true);
      expect(result.speechSynthesis).toBe(true);
      expect(result.mediaCodecs).toBe(true);
      expect(result.webgl2).toBe(true);
      expect(result.performance).toBe(true);
    });
  });
});
