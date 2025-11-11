import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { SpeechSynthesisProtection } from '../../src/modules/speech-synthesis-protection';

describe('SpeechSynthesisProtection', () => {
  let browser: Browser;
  let page: Page;
  let protection: SpeechSynthesisProtection;

  beforeEach(async () => {
    protection = new SpeechSynthesisProtection({
      locale: 'en-US',
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

  describe('SpeechSynthesis API', () => {
    it('should have speechSynthesis object', async () => {
      const hasSpeechSynthesis = await page.evaluate(() => {
        return typeof window.speechSynthesis !== 'undefined';
      });

      expect(hasSpeechSynthesis).toBe(true);
    });

    it('should return spoofed voices', async () => {
      const result = await page.evaluate(() => {
        const voices = window.speechSynthesis.getVoices();
        return {
          count: voices.length,
          hasVoices: voices.length > 0,
          firstVoice: voices[0]
            ? {
                name: voices[0].name,
                lang: voices[0].lang,
                voiceURI: voices[0].voiceURI,
                default: voices[0].default,
                localService: voices[0].localService,
              }
            : null,
        };
      });

      expect(result.hasVoices).toBe(true);
      expect(result.count).toBeGreaterThan(0);
      if (result.firstVoice) {
        expect(typeof result.firstVoice.name).toBe('string');
        expect(typeof result.firstVoice.lang).toBe('string');
        expect(typeof result.firstVoice.voiceURI).toBe('string');
        expect(typeof result.firstVoice.default).toBe('boolean');
        expect(typeof result.firstVoice.localService).toBe('boolean');
      }
    });

    it('should have en-US voices by default', async () => {
      const hasEnUSVoices = await page.evaluate(() => {
        const voices = window.speechSynthesis.getVoices();
        return voices.some((voice) => voice.lang === 'en-US');
      });

      expect(hasEnUSVoices).toBe(true);
    });

    it('should have at least one default voice', async () => {
      const hasDefaultVoice = await page.evaluate(() => {
        const voices = window.speechSynthesis.getVoices();
        return voices.some((voice) => voice.default === true);
      });

      expect(hasDefaultVoice).toBe(true);
    });

    it('should return consistent voices across multiple calls', async () => {
      const result = await page.evaluate(() => {
        const voices1 = window.speechSynthesis.getVoices();
        const voices2 = window.speechSynthesis.getVoices();

        return {
          sameLength: voices1.length === voices2.length,
          firstSame: voices1[0] && voices2[0] && voices1[0].name === voices2[0].name,
        };
      });

      expect(result.sameLength).toBe(true);
      expect(result.firstSame).toBe(true);
    });
  });

  describe('SpeechSynthesis properties', () => {
    it('should have speaking property as false', async () => {
      const speaking = await page.evaluate(() => {
        return window.speechSynthesis.speaking;
      });

      expect(speaking).toBe(false);
    });

    it('should have pending property as false', async () => {
      const pending = await page.evaluate(() => {
        return window.speechSynthesis.pending;
      });

      expect(pending).toBe(false);
    });

    it('should have paused property as false', async () => {
      const paused = await page.evaluate(() => {
        return window.speechSynthesis.paused;
      });

      expect(paused).toBe(false);
    });
  });

  describe('SpeechSynthesis.speak', () => {
    it('should override speak method', async () => {
      const result = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          const utterance = new SpeechSynthesisUtterance('Test');
          let startFired = false;
          let endFired = false;

          utterance.onstart = () => {
            startFired = true;
          };

          utterance.onend = () => {
            endFired = true;
            resolve(startFired && endFired);
          };

          window.speechSynthesis.speak(utterance);

          // Timeout fallback
          setTimeout(() => {
            resolve(startFired && endFired);
          }, 2000);
        });
      });

      expect(result).toBe(true);
    });
  });

  describe('Voice properties', () => {
    it('should have all required voice properties', async () => {
      const result = await page.evaluate(() => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return false;

        const voice = voices[0];
        return (
          'name' in voice &&
          'lang' in voice &&
          'voiceURI' in voice &&
          'default' in voice &&
          'localService' in voice
        );
      });

      expect(result).toBe(true);
    });
  });

  describe('Module configuration', () => {
    it('should return correct module name', () => {
      expect(protection.getName()).toBe('SpeechSynthesisProtection');
    });

    it('should return configured voices', () => {
      const voices = protection.getVoices();
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0]).toHaveProperty('name');
      expect(voices[0]).toHaveProperty('lang');
    });

    it('should allow setting custom voices', () => {
      const customVoices = [
        {
          name: 'Custom Voice',
          lang: 'en-GB',
          voiceURI: 'custom',
          default: true,
          localService: true,
        },
      ];

      protection.setVoices(customVoices);
      const voices = protection.getVoices();

      expect(voices.length).toBe(1);
      expect(voices[0].name).toBe('Custom Voice');
      expect(voices[0].lang).toBe('en-GB');
    });

    it('should get available voice sets', () => {
      const sets = SpeechSynthesisProtection.getAvailableVoiceSets();
      expect(sets).toContain('en-US');
      expect(sets).toContain('en-GB');
      expect(sets).toContain('es-ES');
    });

    it('should get voice set for locale', () => {
      const voices = SpeechSynthesisProtection.getVoiceSetForLocale('en-GB');
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0].lang).toBe('en-GB');
    });
  });

  describe('Different locales', () => {
    it('should support Spanish locale', async () => {
      await browser.close();

      const esProtection = new SpeechSynthesisProtection({
        locale: 'es-ES',
      });

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();
      await esProtection.inject(page);

      const hasSpanishVoices = await page.evaluate(() => {
        const voices = window.speechSynthesis.getVoices();
        return voices.some((voice) => voice.lang === 'es-ES');
      });

      expect(hasSpanishVoices).toBe(true);
    });

    it('should support French locale', async () => {
      await browser.close();

      const frProtection = new SpeechSynthesisProtection({
        locale: 'fr-FR',
      });

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();
      await frProtection.inject(page);

      const hasFrenchVoices = await page.evaluate(() => {
        const voices = window.speechSynthesis.getVoices();
        return voices.some((voice) => voice.lang === 'fr-FR');
      });

      expect(hasFrenchVoices).toBe(true);
    });
  });
});
