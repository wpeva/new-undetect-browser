import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { MediaCodecsProtection } from '../../src/modules/media-codecs-protection';

describe('MediaCodecsProtection', () => {
  let browser: Browser;
  let page: Page;
  let protection: MediaCodecsProtection;

  beforeEach(async () => {
    protection = new MediaCodecsProtection({
      profile: 'chrome',
    });

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    page = await browser.newPage();
    await protection.inject(page);
  });

  afterEach(async () => {
    await browser.close();
  });

  describe('HTMLMediaElement.canPlayType', () => {
    it('should support common audio formats', async () => {
      const result = await page.evaluate(() => {
        const audio = document.createElement('audio');
        return {
          mp3: audio.canPlayType('audio/mpeg'),
          mp4: audio.canPlayType('audio/mp4'),
          ogg: audio.canPlayType('audio/ogg'),
          webm: audio.canPlayType('audio/webm'),
          wav: audio.canPlayType('audio/wav'),
        };
      });

      expect(result.mp3).toBeTruthy();
      expect(result.mp4).toBeTruthy();
      expect(result.ogg).toBeTruthy();
      expect(result.webm).toBeTruthy();
      expect(result.wav).toBeTruthy();
    });

    it('should support common video formats', async () => {
      const result = await page.evaluate(() => {
        const video = document.createElement('video');
        return {
          mp4: video.canPlayType('video/mp4'),
          webm: video.canPlayType('video/webm'),
          ogg: video.canPlayType('video/ogg'),
        };
      });

      expect(result.mp4).toBeTruthy();
      expect(result.webm).toBeTruthy();
      expect(result.ogg).toBeTruthy();
    });

    it('should support codec-specific queries', async () => {
      const result = await page.evaluate(() => {
        const video = document.createElement('video');
        return {
          h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
          vp8: video.canPlayType('video/webm; codecs="vp8"'),
          vp9: video.canPlayType('video/webm; codecs="vp9"'),
        };
      });

      expect(result.h264).toBeTruthy();
      expect(result.vp8).toBeTruthy();
      expect(result.vp9).toBeTruthy();
    });

    it('should return empty string for unsupported formats', async () => {
      const result = await page.evaluate(() => {
        const video = document.createElement('video');
        return video.canPlayType('video/unsupported-format');
      });

      expect(result).toBe('');
    });

    it('should return "probably" or "maybe" for supported codecs', async () => {
      const result = await page.evaluate(() => {
        const audio = document.createElement('audio');
        const support = audio.canPlayType('audio/mpeg');
        return support === 'probably' || support === 'maybe';
      });

      expect(result).toBe(true);
    });
  });

  describe('MediaSource.isTypeSupported', () => {
    it('should have MediaSource API', async () => {
      const hasMediaSource = await page.evaluate(() => {
        return typeof MediaSource !== 'undefined';
      });

      expect(hasMediaSource).toBe(true);
    });

    it('should support common video codecs', async () => {
      const result = await page.evaluate(() => {
        if (typeof MediaSource === 'undefined') {
          return { supported: false };
        }

        return {
          supported: true,
          mp4: MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"'),
          webm: MediaSource.isTypeSupported('video/webm; codecs="vp8"'),
        };
      });

      if (result.supported) {
        expect(result.mp4).toBe(true);
        expect(result.webm).toBe(true);
      }
    });

    it('should return false for unsupported codecs', async () => {
      const result = await page.evaluate(() => {
        if (typeof MediaSource === 'undefined') {
          return null;
        }

        return MediaSource.isTypeSupported('video/unsupported; codecs="fake"');
      });

      if (result !== null) {
        expect(result).toBe(false);
      }
    });
  });

  describe('RTCRtpSender.getCapabilities', () => {
    it('should have RTCRtpSender API', async () => {
      const hasRTC = await page.evaluate(() => {
        return (
          typeof RTCRtpSender !== 'undefined' &&
          typeof RTCRtpSender.getCapabilities === 'function'
        );
      });

      expect(hasRTC).toBe(true);
    });

    it('should filter audio codecs', async () => {
      const result = await page.evaluate(() => {
        if (
          typeof RTCRtpSender === 'undefined' ||
          !RTCRtpSender.getCapabilities
        ) {
          return { supported: false };
        }

        const capabilities = RTCRtpSender.getCapabilities('audio');
        return {
          supported: true,
          hasCodecs: capabilities && capabilities.codecs.length > 0,
          codecCount: capabilities?.codecs.length || 0,
        };
      });

      if (result.supported) {
        expect(result.hasCodecs).toBe(true);
        expect(result.codecCount).toBeGreaterThan(0);
      }
    });

    it('should filter video codecs', async () => {
      const result = await page.evaluate(() => {
        if (
          typeof RTCRtpSender === 'undefined' ||
          !RTCRtpSender.getCapabilities
        ) {
          return { supported: false };
        }

        const capabilities = RTCRtpSender.getCapabilities('video');
        return {
          supported: true,
          hasCodecs: capabilities && capabilities.codecs.length > 0,
          codecCount: capabilities?.codecs.length || 0,
        };
      });

      if (result.supported) {
        expect(result.hasCodecs).toBe(true);
        expect(result.codecCount).toBeGreaterThan(0);
      }
    });
  });

  describe('RTCRtpReceiver.getCapabilities', () => {
    it('should have RTCRtpReceiver API', async () => {
      const hasRTC = await page.evaluate(() => {
        return (
          typeof RTCRtpReceiver !== 'undefined' &&
          typeof RTCRtpReceiver.getCapabilities === 'function'
        );
      });

      expect(hasRTC).toBe(true);
    });

    it('should filter receiver codecs', async () => {
      const result = await page.evaluate(() => {
        if (
          typeof RTCRtpReceiver === 'undefined' ||
          !RTCRtpReceiver.getCapabilities
        ) {
          return { supported: false };
        }

        const audioCaps = RTCRtpReceiver.getCapabilities('audio');
        const videoCaps = RTCRtpReceiver.getCapabilities('video');

        return {
          supported: true,
          hasAudioCodecs: audioCaps && audioCaps.codecs.length > 0,
          hasVideoCodecs: videoCaps && videoCaps.codecs.length > 0,
        };
      });

      if (result.supported) {
        expect(result.hasAudioCodecs).toBe(true);
        expect(result.hasVideoCodecs).toBe(true);
      }
    });
  });

  describe('Module configuration', () => {
    it('should return correct module name', () => {
      expect(protection.getName()).toBe('MediaCodecsProtection');
    });

    it('should return current codec support', () => {
      const codecs = protection.getCodecs();
      expect(codecs).toHaveProperty('audioCodecs');
      expect(codecs).toHaveProperty('videoCodecs');
      expect(Object.keys(codecs.audioCodecs).length).toBeGreaterThan(0);
      expect(Object.keys(codecs.videoCodecs).length).toBeGreaterThan(0);
    });

    it('should allow setting custom codecs', () => {
      const customCodecs = {
        audioCodecs: {
          'audio/mp3': 'probably',
        },
        videoCodecs: {
          'video/mp4': 'probably',
        },
      };

      protection.setCodecs(customCodecs);
      const codecs = protection.getCodecs();

      expect(Object.keys(codecs.audioCodecs).length).toBe(1);
      expect(Object.keys(codecs.videoCodecs).length).toBe(1);
      expect(codecs.audioCodecs['audio/mp3']).toBe('probably');
    });

    it('should get available profiles', () => {
      const profiles = MediaCodecsProtection.getAvailableProfiles();
      expect(profiles).toContain('chrome');
      expect(profiles).toContain('firefox');
      expect(profiles).toContain('safari');
      expect(profiles).toContain('edge');
    });

    it('should get profile codecs', () => {
      const chromeCodecs = MediaCodecsProtection.getProfileCodecs('chrome');
      expect(chromeCodecs).toHaveProperty('audioCodecs');
      expect(chromeCodecs).toHaveProperty('videoCodecs');
      expect(Object.keys(chromeCodecs.audioCodecs).length).toBeGreaterThan(0);
    });
  });

  describe('Different profiles', () => {
    it('should support Firefox profile', async () => {
      await browser.close();

      const ffProtection = new MediaCodecsProtection({
        profile: 'firefox',
      });

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();
      await ffProtection.inject(page);

      const result = await page.evaluate(() => {
        const audio = document.createElement('audio');
        return {
          ogg: audio.canPlayType('audio/ogg'),
          webm: audio.canPlayType('audio/webm'),
        };
      });

      expect(result.ogg).toBeTruthy();
      expect(result.webm).toBeTruthy();
    });

    it('should support Safari profile', async () => {
      await browser.close();

      const safariProtection = new MediaCodecsProtection({
        profile: 'safari',
      });

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();
      await safariProtection.inject(page);

      const result = await page.evaluate(() => {
        const audio = document.createElement('audio');
        return {
          mp4: audio.canPlayType('audio/mp4'),
          aac: audio.canPlayType('audio/aac'),
        };
      });

      expect(result.mp4).toBeTruthy();
      expect(result.aac).toBeTruthy();
    });
  });

  describe('Codec consistency', () => {
    it('should return consistent results across multiple calls', async () => {
      const result = await page.evaluate(() => {
        const video = document.createElement('video');
        const result1 = video.canPlayType('video/mp4');
        const result2 = video.canPlayType('video/mp4');

        return result1 === result2;
      });

      expect(result).toBe(true);
    });
  });
});
