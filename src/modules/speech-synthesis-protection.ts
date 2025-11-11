import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * Speech synthesis voice data
 */
export interface SynthesisVoice {
  name: string;
  lang: string;
  voiceURI: string;
  default: boolean;
  localService: boolean;
}

/**
 * SpeechSynthesis configuration
 */
export interface SpeechSynthesisConfig {
  enabled: boolean;
  locale?: string;
  voices?: SynthesisVoice[];
}

/**
 * Default voice sets for common locales
 */
const DEFAULT_VOICE_SETS: Record<string, SynthesisVoice[]> = {
  'en-US': [
    {
      name: 'Microsoft David - English (United States)',
      lang: 'en-US',
      voiceURI: 'Microsoft David - English (United States)',
      default: true,
      localService: true,
    },
    {
      name: 'Microsoft Zira - English (United States)',
      lang: 'en-US',
      voiceURI: 'Microsoft Zira - English (United States)',
      default: false,
      localService: true,
    },
    {
      name: 'Google US English',
      lang: 'en-US',
      voiceURI: 'Google US English',
      default: false,
      localService: false,
    },
  ],
  'en-GB': [
    {
      name: 'Microsoft Hazel - English (Great Britain)',
      lang: 'en-GB',
      voiceURI: 'Microsoft Hazel - English (Great Britain)',
      default: true,
      localService: true,
    },
    {
      name: 'Microsoft George - English (Great Britain)',
      lang: 'en-GB',
      voiceURI: 'Microsoft George - English (Great Britain)',
      default: false,
      localService: true,
    },
    {
      name: 'Google UK English Female',
      lang: 'en-GB',
      voiceURI: 'Google UK English Female',
      default: false,
      localService: false,
    },
  ],
  'es-ES': [
    {
      name: 'Microsoft Helena - Spanish (Spain)',
      lang: 'es-ES',
      voiceURI: 'Microsoft Helena - Spanish (Spain)',
      default: true,
      localService: true,
    },
    {
      name: 'Google español',
      lang: 'es-ES',
      voiceURI: 'Google español',
      default: false,
      localService: false,
    },
  ],
  'fr-FR': [
    {
      name: 'Microsoft Hortense - French (France)',
      lang: 'fr-FR',
      voiceURI: 'Microsoft Hortense - French (France)',
      default: true,
      localService: true,
    },
    {
      name: 'Google français',
      lang: 'fr-FR',
      voiceURI: 'Google français',
      default: false,
      localService: false,
    },
  ],
  'de-DE': [
    {
      name: 'Microsoft Hedda - German (Germany)',
      lang: 'de-DE',
      voiceURI: 'Microsoft Hedda - German (Germany)',
      default: true,
      localService: true,
    },
    {
      name: 'Google Deutsch',
      lang: 'de-DE',
      voiceURI: 'Google Deutsch',
      default: false,
      localService: false,
    },
  ],
};

/**
 * SpeechSynthesis Protection Module
 * Spoofs the speech synthesis API to present realistic voice lists
 */
export class SpeechSynthesisProtection {
  private config: SpeechSynthesisConfig;
  private voices: SynthesisVoice[];

  constructor(config: Partial<SpeechSynthesisConfig> = {}) {
    const locale = config.locale || 'en-US';
    const voices =
      config.voices || DEFAULT_VOICE_SETS[locale] || DEFAULT_VOICE_SETS['en-US'];

    this.config = {
      enabled: true,
      locale,
      voices,
      ...config,
    };

    this.voices = voices;

    logger.info(
      `SpeechSynthesis Protection initialized (locale: ${this.config.locale}, voices: ${this.voices.length})`
    );
  }

  /**
   * Inject SpeechSynthesis protection into page
   */
  async inject(page: Page): Promise<void> {
    if (!this.config.enabled) {
      logger.info('SpeechSynthesis protection disabled, skipping injection');
      return;
    }

    await page.evaluateOnNewDocument((voicesData: SynthesisVoice[]) => {
      // Create SpeechSynthesisVoice objects
      class FakeSpeechSynthesisVoice implements SpeechSynthesisVoice {
        public readonly name: string;
        public readonly lang: string;
        public readonly voiceURI: string;
        public readonly default: boolean;
        public readonly localService: boolean;

        constructor(data: SynthesisVoice) {
          this.name = data.name;
          this.lang = data.lang;
          this.voiceURI = data.voiceURI;
          this.default = data.default;
          this.localService = data.localService;
        }
      }

      // Create voice instances
      const fakeVoices = voicesData.map(
        (data) => new FakeSpeechSynthesisVoice(data)
      );

      // Override speechSynthesis.getVoices()
      if (window.speechSynthesis) {
        const originalGetVoices = window.speechSynthesis.getVoices.bind(
          window.speechSynthesis
        );

        // Store original to potentially mix with fake voices
        let voicesRetrieved = false;

        Object.defineProperty(window.speechSynthesis, 'getVoices', {
          value: function (): SpeechSynthesisVoice[] {
            voicesRetrieved = true;
            return fakeVoices;
          },
          writable: false,
          configurable: false,
        });

        // Trigger onvoiceschanged event
        setTimeout(() => {
          if (window.speechSynthesis.onvoiceschanged) {
            const event = new Event('voiceschanged');
            window.speechSynthesis.onvoiceschanged(event);
          }
        }, 0);

        // Override speak method to prevent actual speech
        const originalSpeak = window.speechSynthesis.speak.bind(
          window.speechSynthesis
        );
        window.speechSynthesis.speak = function (
          utterance: SpeechSynthesisUtterance
        ): void {
          // Simulate speech events without actually speaking
          setTimeout(() => {
            if (utterance.onstart) {
              const event = new SpeechSynthesisEvent('start', {
                utterance,
                charIndex: 0,
                charLength: utterance.text.length,
                elapsedTime: 0,
                name: '',
              });
              utterance.onstart(event);
            }
          }, 10);

          setTimeout(() => {
            if (utterance.onend) {
              const event = new SpeechSynthesisEvent('end', {
                utterance,
                charIndex: utterance.text.length,
                charLength: utterance.text.length,
                elapsedTime: utterance.text.length * 50, // Simulated duration
                name: '',
              });
              utterance.onend(event);
            }
          }, utterance.text.length * 50 + 100);
        };

        // Override other speechSynthesis properties
        Object.defineProperty(window.speechSynthesis, 'speaking', {
          get: () => false,
          configurable: false,
        });

        Object.defineProperty(window.speechSynthesis, 'pending', {
          get: () => false,
          configurable: false,
        });

        Object.defineProperty(window.speechSynthesis, 'paused', {
          get: () => false,
          configurable: false,
        });
      }

      logger.info('SpeechSynthesis Protection injected successfully');
    }, this.voices);

    logger.info('SpeechSynthesis Protection injected into page');
  }

  /**
   * Get the module name
   */
  getName(): string {
    return 'SpeechSynthesisProtection';
  }

  /**
   * Get current voices
   */
  getVoices(): SynthesisVoice[] {
    return [...this.voices];
  }

  /**
   * Set custom voices
   */
  setVoices(voices: SynthesisVoice[]): void {
    this.voices = voices;
    this.config.voices = voices;
    logger.info(`SpeechSynthesis voices updated (${voices.length} voices)`);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SpeechSynthesisConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.voices) {
      this.voices = config.voices;
    } else if (config.locale) {
      this.voices =
        DEFAULT_VOICE_SETS[config.locale] || DEFAULT_VOICE_SETS['en-US'];
    }

    logger.info('SpeechSynthesis Protection configuration updated');
  }

  /**
   * Get available voice sets
   */
  static getAvailableVoiceSets(): string[] {
    return Object.keys(DEFAULT_VOICE_SETS);
  }

  /**
   * Get voice set for locale
   */
  static getVoiceSetForLocale(locale: string): SynthesisVoice[] {
    return DEFAULT_VOICE_SETS[locale] || DEFAULT_VOICE_SETS['en-US'];
  }
}

/**
 * Create SpeechSynthesis protection instance
 */
export function createSpeechSynthesisProtection(
  config?: Partial<SpeechSynthesisConfig>
): SpeechSynthesisProtection {
  return new SpeechSynthesisProtection(config);
}
