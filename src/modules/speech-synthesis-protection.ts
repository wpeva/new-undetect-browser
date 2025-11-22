/**
 * SpeechSynthesis API Protection Module
 *
 * Spoofs speechSynthesis.getVoices() to return realistic voice lists
 * based on the operating system and browser.
 *
 * This is CRITICAL for passing:
 * - browserleaks.com
 * - creepjs.com
 * - pixelscan.net
 */

import type { Page } from 'puppeteer';

export interface SpeechSynthesisConfig {
  enabled: boolean;
  platform: 'Win32' | 'MacIntel' | 'Linux x86_64' | 'iPhone' | 'iPad' | 'Android';
  locale?: string;
  customVoices?: SpeechSynthesisVoiceData[];
}

export interface SpeechSynthesisVoiceData {
  name: string;
  lang: string;
  default?: boolean;
  localService: boolean;
  voiceURI: string;
}

/**
 * Realistic voice lists for different platforms
 */
const PLATFORM_VOICES: Record<string, SpeechSynthesisVoiceData[]> = {
  // Windows 11 voices (Chrome)
  Win32: [
    { name: 'Microsoft David - English (United States)', lang: 'en-US', default: true, localService: true, voiceURI: 'Microsoft David - English (United States)' },
    { name: 'Microsoft Zira - English (United States)', lang: 'en-US', default: false, localService: true, voiceURI: 'Microsoft Zira - English (United States)' },
    { name: 'Microsoft Mark - English (United States)', lang: 'en-US', default: false, localService: true, voiceURI: 'Microsoft Mark - English (United States)' },
    { name: 'Google US English', lang: 'en-US', default: false, localService: false, voiceURI: 'Google US English' },
    { name: 'Google UK English Female', lang: 'en-GB', default: false, localService: false, voiceURI: 'Google UK English Female' },
    { name: 'Google UK English Male', lang: 'en-GB', default: false, localService: false, voiceURI: 'Google UK English Male' },
    { name: 'Microsoft Hazel - English (Great Britain)', lang: 'en-GB', default: false, localService: true, voiceURI: 'Microsoft Hazel - English (Great Britain)' },
    { name: 'Microsoft Susan - English (Great Britain)', lang: 'en-GB', default: false, localService: true, voiceURI: 'Microsoft Susan - English (Great Britain)' },
    { name: 'Microsoft George - English (Great Britain)', lang: 'en-GB', default: false, localService: true, voiceURI: 'Microsoft George - English (Great Britain)' },
    { name: 'Google español', lang: 'es-ES', default: false, localService: false, voiceURI: 'Google español' },
    { name: 'Google español de Estados Unidos', lang: 'es-US', default: false, localService: false, voiceURI: 'Google español de Estados Unidos' },
    { name: 'Google français', lang: 'fr-FR', default: false, localService: false, voiceURI: 'Google français' },
    { name: 'Google Deutsch', lang: 'de-DE', default: false, localService: false, voiceURI: 'Google Deutsch' },
    { name: 'Google italiano', lang: 'it-IT', default: false, localService: false, voiceURI: 'Google italiano' },
    { name: 'Google 日本語', lang: 'ja-JP', default: false, localService: false, voiceURI: 'Google 日本語' },
    { name: 'Google 한국의', lang: 'ko-KR', default: false, localService: false, voiceURI: 'Google 한국의' },
    { name: 'Google 普通话（中国大陆）', lang: 'zh-CN', default: false, localService: false, voiceURI: 'Google 普通话（中国大陆）' },
    { name: 'Google 粤語（香港）', lang: 'zh-HK', default: false, localService: false, voiceURI: 'Google 粤語（香港）' },
    { name: 'Google 國語（臺灣）', lang: 'zh-TW', default: false, localService: false, voiceURI: 'Google 國語（臺灣）' },
  ],

  // macOS voices (Safari/Chrome)
  MacIntel: [
    { name: 'Alex', lang: 'en-US', default: true, localService: true, voiceURI: 'Alex' },
    { name: 'Samantha', lang: 'en-US', default: false, localService: true, voiceURI: 'Samantha' },
    { name: 'Victoria', lang: 'en-US', default: false, localService: true, voiceURI: 'Victoria' },
    { name: 'Karen', lang: 'en-AU', default: false, localService: true, voiceURI: 'Karen' },
    { name: 'Daniel', lang: 'en-GB', default: false, localService: true, voiceURI: 'Daniel' },
    { name: 'Kate', lang: 'en-GB', default: false, localService: true, voiceURI: 'Kate' },
    { name: 'Moira', lang: 'en-IE', default: false, localService: true, voiceURI: 'Moira' },
    { name: 'Rishi', lang: 'en-IN', default: false, localService: true, voiceURI: 'Rishi' },
    { name: 'Fiona', lang: 'en-scotland', default: false, localService: true, voiceURI: 'Fiona' },
    { name: 'Tessa', lang: 'en-ZA', default: false, localService: true, voiceURI: 'Tessa' },
    { name: 'Monica', lang: 'es-ES', default: false, localService: true, voiceURI: 'Monica' },
    { name: 'Paulina', lang: 'es-MX', default: false, localService: true, voiceURI: 'Paulina' },
    { name: 'Amelie', lang: 'fr-CA', default: false, localService: true, voiceURI: 'Amelie' },
    { name: 'Thomas', lang: 'fr-FR', default: false, localService: true, voiceURI: 'Thomas' },
    { name: 'Anna', lang: 'de-DE', default: false, localService: true, voiceURI: 'Anna' },
    { name: 'Alice', lang: 'it-IT', default: false, localService: true, voiceURI: 'Alice' },
    { name: 'Kyoko', lang: 'ja-JP', default: false, localService: true, voiceURI: 'Kyoko' },
    { name: 'Yuna', lang: 'ko-KR', default: false, localService: true, voiceURI: 'Yuna' },
    { name: 'Ting-Ting', lang: 'zh-CN', default: false, localService: true, voiceURI: 'Ting-Ting' },
    { name: 'Sin-Ji', lang: 'zh-HK', default: false, localService: true, voiceURI: 'Sin-Ji' },
    { name: 'Mei-Jia', lang: 'zh-TW', default: false, localService: true, voiceURI: 'Mei-Jia' },
  ],

  // Linux voices (typically fewer)
  'Linux x86_64': [
    { name: 'Google US English', lang: 'en-US', default: true, localService: false, voiceURI: 'Google US English' },
    { name: 'Google UK English Female', lang: 'en-GB', default: false, localService: false, voiceURI: 'Google UK English Female' },
    { name: 'Google UK English Male', lang: 'en-GB', default: false, localService: false, voiceURI: 'Google UK English Male' },
    { name: 'Google español', lang: 'es-ES', default: false, localService: false, voiceURI: 'Google español' },
    { name: 'Google français', lang: 'fr-FR', default: false, localService: false, voiceURI: 'Google français' },
    { name: 'Google Deutsch', lang: 'de-DE', default: false, localService: false, voiceURI: 'Google Deutsch' },
    { name: 'Google italiano', lang: 'it-IT', default: false, localService: false, voiceURI: 'Google italiano' },
  ],

  // Mobile platforms (iOS)
  iPhone: [
    { name: 'Samantha (Enhanced)', lang: 'en-US', default: true, localService: true, voiceURI: 'Samantha (Enhanced)' },
    { name: 'Alex', lang: 'en-US', default: false, localService: true, voiceURI: 'Alex' },
    { name: 'Karen', lang: 'en-AU', default: false, localService: true, voiceURI: 'Karen' },
    { name: 'Daniel (Enhanced)', lang: 'en-GB', default: false, localService: true, voiceURI: 'Daniel (Enhanced)' },
  ],

  iPad: [
    { name: 'Samantha (Enhanced)', lang: 'en-US', default: true, localService: true, voiceURI: 'Samantha (Enhanced)' },
    { name: 'Alex', lang: 'en-US', default: false, localService: true, voiceURI: 'Alex' },
    { name: 'Karen', lang: 'en-AU', default: false, localService: true, voiceURI: 'Karen' },
    { name: 'Daniel (Enhanced)', lang: 'en-GB', default: false, localService: true, voiceURI: 'Daniel (Enhanced)' },
  ],

  // Android
  Android: [
    { name: 'Google US English', lang: 'en-US', default: true, localService: false, voiceURI: 'Google US English' },
    { name: 'Google UK English Female', lang: 'en-GB', default: false, localService: false, voiceURI: 'Google UK English Female' },
    { name: 'Google UK English Male', lang: 'en-GB', default: false, localService: false, voiceURI: 'Google UK English Male' },
  ],
};

export class SpeechSynthesisProtection {
  private config: SpeechSynthesisConfig;

  constructor(config: Partial<SpeechSynthesisConfig> = {}) {
    this.config = {
      enabled: true,
      platform: 'Win32',
      ...config,
    };
  }

  /**
   * Apply SpeechSynthesis protection to a page
   */
  async apply(page: Page): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const voices = this.getVoicesForPlatform();

    await page.evaluateOnNewDocument(this.getInjectionScript(), voices);
  }

  /**
   * Get the injection script
   */
  private getInjectionScript() {
    return (voicesData: SpeechSynthesisVoiceData[]) => {
      // Create mock SpeechSynthesisVoice objects
      const voices: any[] = voicesData.map((voiceData) => {
        const voice: any = {};

        Object.defineProperties(voice, {
          name: { get: () => voiceData.name, enumerable: true },
          lang: { get: () => voiceData.lang, enumerable: true },
          default: {
            get: () => voiceData.default || false,
            enumerable: true,
          },
          localService: {
            get: () => voiceData.localService,
            enumerable: true,
          },
          voiceURI: { get: () => voiceData.voiceURI, enumerable: true },
        });

        // Make it look like SpeechSynthesisVoice
        Object.setPrototypeOf(voice, SpeechSynthesisVoice.prototype);

        return voice;
      });

      // Store the original getVoices
      const originalGetVoices = SpeechSynthesis.prototype.getVoices;

      // Override getVoices
      SpeechSynthesis.prototype.getVoices = function () {
        return voices;
      };

      // Make sure voiceschanged event works
      const originalAddEventListener = SpeechSynthesis.prototype.addEventListener;
      const voicesChangedListeners: EventListener[] = [];

      SpeechSynthesis.prototype.addEventListener = function (
        type: string,
        listener: EventListener,
        options?: any
      ) {
        if (type === 'voiceschanged') {
          voicesChangedListeners.push(listener);
          // Trigger immediately with voices already loaded
          setTimeout(() => {
            const event = new Event('voiceschanged');
            listener.call(this, event);
          }, 100);
        }
        return originalAddEventListener.call(this, type, listener, options);
      };

      // Fix toString to look native
      const originalToString = Function.prototype.toString;
      Function.prototype.toString = function () {
        if (this === SpeechSynthesis.prototype.getVoices) {
          return 'function getVoices() { [native code] }';
        }
        return originalToString.call(this);
      };

      // Log for debugging
      if (typeof console !== 'undefined' && console.log) {
        console.log(
          `[SpeechSynthesis Protection] Loaded ${voices.length} voices`
        );
      }
    };
  }

  /**
   * Get voices for the configured platform
   */
  private getVoicesForPlatform(): SpeechSynthesisVoiceData[] {
    if (this.config.customVoices) {
      return this.config.customVoices;
    }

    const voices = PLATFORM_VOICES[this.config.platform] || PLATFORM_VOICES.Win32;

    // Filter by locale if specified
    if (this.config.locale) {
      return voices.filter(
        (voice) =>
          voice.lang.startsWith(this.config.locale!) ||
          voice.lang === this.config.locale
      );
    }

    return voices;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SpeechSynthesisConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Factory function
 */
export function createSpeechSynthesisProtection(
  config?: Partial<SpeechSynthesisConfig>
): SpeechSynthesisProtection {
  return new SpeechSynthesisProtection(config);
}

/**
 * Apply to multiple pages
 */
export async function applySpeechSynthesisProtectionToPages(
  pages: Page[],
  config?: Partial<SpeechSynthesisConfig>
): Promise<void> {
  const protection = new SpeechSynthesisProtection(config);
  await Promise.all(pages.map((page) => protection.apply(page)));
}
