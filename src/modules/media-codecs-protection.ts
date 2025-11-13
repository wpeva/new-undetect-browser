/**
 * Media Codecs Protection Module
 *
 * Spoofs HTMLMediaElement.canPlayType() to return realistic codec support
 * based on the browser and platform.
 *
 * This prevents fingerprinting through media codec detection.
 *
 * CRITICAL for passing:
 * - browserleaks.com/media
 * - creepjs.com
 */

import type { Page } from 'puppeteer';

export interface MediaCodecsConfig {
  enabled: boolean;
  platform: 'Win32' | 'MacIntel' | 'Linux x86_64' | 'iPhone' | 'iPad' | 'Android';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  customCodecs?: CodecSupport;
}

export interface CodecSupport {
  video: { [codec: string]: 'probably' | 'maybe' | '' };
  audio: { [codec: string]: 'probably' | 'maybe' | '' };
}

/**
 * Realistic codec support for different platforms and browsers
 */
const PLATFORM_CODECS: Record<string, Record<string, CodecSupport>> = {
  Win32: {
    chrome: {
      video: {
        // MP4 / H.264
        'video/mp4': 'probably',
        'video/mp4; codecs="avc1.42E01E"': 'probably',
        'video/mp4; codecs="avc1.4D401E"': 'probably',
        'video/mp4; codecs="avc1.64001E"': 'probably',
        'video/mp4; codecs="avc1.640028"': 'probably',
        'video/mp4; codecs="mp4v.20.8"': 'probably',
        'video/mp4; codecs="mp4v.20.240"': 'probably',

        // H.265 / HEVC
        'video/mp4; codecs="hev1.1.6.L93.B0"': 'probably',
        'video/mp4; codecs="hvc1.1.6.L93.B0"': 'probably',

        // WebM / VP8 / VP9
        'video/webm': 'probably',
        'video/webm; codecs="vp8"': 'probably',
        'video/webm; codecs="vp8, vorbis"': 'probably',
        'video/webm; codecs="vp9"': 'probably',
        'video/webm; codecs="vp9, opus"': 'probably',
        'video/webm; codecs="vp09.00.10.08"': 'probably',

        // AV1
        'video/mp4; codecs="av01.0.05M.08"': 'probably',
        'video/webm; codecs="av01.0.05M.08"': 'probably',

        // Ogg Theora
        'video/ogg': 'probably',
        'video/ogg; codecs="theora"': 'probably',
        'video/ogg; codecs="theora, vorbis"': 'probably',

        // 3GPP
        'video/3gpp': 'maybe',
        'video/3gpp; codecs="mp4v.20.8, samr"': 'probably',

        // Not supported
        'video/x-matroska': '',
        'video/x-flv': '',
      },
      audio: {
        // MP3
        'audio/mpeg': 'probably',
        'audio/mp3': 'probably',

        // AAC
        'audio/mp4': 'probably',
        'audio/mp4; codecs="mp4a.40.2"': 'probably',
        'audio/mp4; codecs="mp4a.40.5"': 'probably',
        'audio/aac': 'probably',
        'audio/x-m4a': 'probably',

        // WebM / Opus / Vorbis
        'audio/webm': 'probably',
        'audio/webm; codecs="opus"': 'probably',
        'audio/webm; codecs="vorbis"': 'probably',

        // Ogg Vorbis
        'audio/ogg': 'probably',
        'audio/ogg; codecs="vorbis"': 'probably',
        'audio/ogg; codecs="opus"': 'probably',

        // WAV
        'audio/wav': 'probably',
        'audio/wav; codecs="1"': 'probably',
        'audio/x-wav': 'probably',

        // FLAC
        'audio/flac': 'probably',
        'audio/x-flac': 'probably',

        // 3GPP
        'audio/3gpp': 'maybe',
        'audio/3gpp; codecs="samr"': 'probably',
        'audio/amr': 'probably',

        // Not supported
        'audio/x-ms-wma': '',
        'audio/x-ms-wax': '',
      },
    },
    edge: {
      video: {
        // Similar to Chrome (Chromium-based)
        'video/mp4': 'probably',
        'video/mp4; codecs="avc1.42E01E"': 'probably',
        'video/mp4; codecs="avc1.4D401E"': 'probably',
        'video/webm': 'probably',
        'video/webm; codecs="vp8"': 'probably',
        'video/webm; codecs="vp9"': 'probably',
        'video/ogg': 'probably',
        'video/ogg; codecs="theora"': 'probably',
      },
      audio: {
        'audio/mpeg': 'probably',
        'audio/mp4': 'probably',
        'audio/mp4; codecs="mp4a.40.2"': 'probably',
        'audio/webm': 'probably',
        'audio/webm; codecs="opus"': 'probably',
        'audio/ogg': 'probably',
        'audio/wav': 'probably',
        'audio/flac': 'probably',
      },
    },
  },

  MacIntel: {
    chrome: {
      video: {
        'video/mp4': 'probably',
        'video/mp4; codecs="avc1.42E01E"': 'probably',
        'video/mp4; codecs="avc1.4D401E"': 'probably',
        'video/webm': 'probably',
        'video/webm; codecs="vp8"': 'probably',
        'video/webm; codecs="vp9"': 'probably',
        'video/ogg': 'probably',
        'video/ogg; codecs="theora"': 'probably',
      },
      audio: {
        'audio/mpeg': 'probably',
        'audio/mp4': 'probably',
        'audio/mp4; codecs="mp4a.40.2"': 'probably',
        'audio/webm': 'probably',
        'audio/webm; codecs="opus"': 'probably',
        'audio/ogg': 'probably',
        'audio/wav': 'probably',
        'audio/flac': 'probably',
      },
    },
    safari: {
      video: {
        // Safari has more limited codec support
        'video/mp4': 'probably',
        'video/mp4; codecs="avc1.42E01E"': 'probably',
        'video/mp4; codecs="avc1.4D401E"': 'probably',
        'video/mp4; codecs="hev1.1.6.L93.B0"': 'probably', // HEVC support
        'video/webm': '', // No WebM in older Safari
        'video/ogg': '', // No Ogg
        'video/quicktime': 'probably',
        'video/x-m4v': 'probably',
      },
      audio: {
        'audio/mpeg': 'probably',
        'audio/mp4': 'probably',
        'audio/mp4; codecs="mp4a.40.2"': 'probably',
        'audio/aac': 'probably',
        'audio/x-m4a': 'probably',
        'audio/wav': 'probably',
        'audio/flac': 'probably',
        'audio/webm': '', // No WebM
        'audio/ogg': '', // No Ogg
      },
    },
  },

  'Linux x86_64': {
    chrome: {
      video: {
        'video/mp4': 'probably',
        'video/mp4; codecs="avc1.42E01E"': 'probably',
        'video/webm': 'probably',
        'video/webm; codecs="vp8"': 'probably',
        'video/webm; codecs="vp9"': 'probably',
        'video/ogg': 'probably',
        'video/ogg; codecs="theora"': 'probably',
      },
      audio: {
        'audio/mpeg': 'probably',
        'audio/mp4': 'probably',
        'audio/webm': 'probably',
        'audio/webm; codecs="opus"': 'probably',
        'audio/ogg': 'probably',
        'audio/wav': 'probably',
        'audio/flac': 'probably',
      },
    },
    firefox: {
      video: {
        'video/mp4': 'probably',
        'video/mp4; codecs="avc1.42E01E"': 'probably',
        'video/webm': 'probably',
        'video/webm; codecs="vp8"': 'probably',
        'video/webm; codecs="vp9"': 'probably',
        'video/ogg': 'probably',
        'video/ogg; codecs="theora"': 'probably',
      },
      audio: {
        'audio/mpeg': 'probably',
        'audio/mp4': 'probably',
        'audio/webm': 'probably',
        'audio/webm; codecs="opus"': 'probably',
        'audio/ogg': 'probably',
        'audio/wav': 'probably',
        'audio/flac': 'probably',
      },
    },
  },

  // Mobile platforms
  iPhone: {
    safari: {
      video: {
        'video/mp4': 'probably',
        'video/mp4; codecs="avc1.42E01E"': 'probably',
        'video/mp4; codecs="hev1.1.6.L93.B0"': 'probably',
        'video/quicktime': 'probably',
        'video/x-m4v': 'probably',
      },
      audio: {
        'audio/mpeg': 'probably',
        'audio/mp4': 'probably',
        'audio/aac': 'probably',
        'audio/x-m4a': 'probably',
        'audio/wav': 'probably',
      },
    },
  },

  Android: {
    chrome: {
      video: {
        'video/mp4': 'probably',
        'video/mp4; codecs="avc1.42E01E"': 'probably',
        'video/webm': 'probably',
        'video/webm; codecs="vp8"': 'probably',
        'video/webm; codecs="vp9"': 'probably',
        'video/3gpp': 'probably',
      },
      audio: {
        'audio/mpeg': 'probably',
        'audio/mp4': 'probably',
        'audio/webm': 'probably',
        'audio/webm; codecs="opus"': 'probably',
        'audio/ogg': 'probably',
        'audio/3gpp': 'probably',
      },
    },
  },
};

export class MediaCodecsProtection {
  private config: MediaCodecsConfig;

  constructor(config: Partial<MediaCodecsConfig> = {}) {
    this.config = {
      enabled: true,
      platform: 'Win32',
      browser: 'chrome',
      ...config,
    };
  }

  /**
   * Apply Media Codecs protection to a page
   */
  async apply(page: Page): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const codecs = this.getCodecsForPlatform();

    await page.evaluateOnNewDocument(this.getInjectionScript(), codecs);
  }

  /**
   * Get the injection script
   */
  private getInjectionScript() {
    return (codecs: CodecSupport) => {
      // Store original methods
      const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;
      const originalVideoCanPlayType = HTMLVideoElement.prototype.canPlayType;
      const originalAudioCanPlayType = HTMLAudioElement.prototype.canPlayType;

      /**
       * Spoofed canPlayType implementation
       */
      function spoofedCanPlayType(this: HTMLMediaElement, type: string): CanPlayTypeResult {
        const normalizedType = type.toLowerCase().trim();

        // Determine if this is video or audio
        const isVideo = this instanceof HTMLVideoElement || this.tagName === 'VIDEO';
        const codecList = isVideo ? codecs.video : codecs.audio;

        // Check for exact match
        if (normalizedType in codecList) {
          return codecList[normalizedType];
        }

        // Check for partial match (without codecs parameter)
        const baseType = normalizedType.split(';')[0].trim();
        if (baseType in codecList) {
          return codecList[baseType];
        }

        // Default behavior: probably not supported
        return '';
      }

      // Override for all media elements
      HTMLMediaElement.prototype.canPlayType = spoofedCanPlayType;
      HTMLVideoElement.prototype.canPlayType = spoofedCanPlayType;
      HTMLAudioElement.prototype.canPlayType = spoofedCanPlayType;

      // Fix toString to look native
      const originalToString = Function.prototype.toString;
      Function.prototype.toString = function () {
        if (
          this === HTMLMediaElement.prototype.canPlayType ||
          this === HTMLVideoElement.prototype.canPlayType ||
          this === HTMLAudioElement.prototype.canPlayType
        ) {
          return 'function canPlayType() { [native code] }';
        }
        return originalToString.call(this);
      };

      // Log for debugging
      if (typeof console !== 'undefined' && console.log) {
        console.log(
          `[MediaCodecs Protection] Applied codec spoofing (${Object.keys(codecs.video).length} video, ${Object.keys(codecs.audio).length} audio codecs)`
        );
      }
    };
  }

  /**
   * Get codecs for the configured platform
   */
  private getCodecsForPlatform(): CodecSupport {
    if (this.config.customCodecs) {
      return this.config.customCodecs;
    }

    const platformCodecs = PLATFORM_CODECS[this.config.platform];
    if (!platformCodecs) {
      return PLATFORM_CODECS.Win32.chrome;
    }

    const browserCodecs = platformCodecs[this.config.browser];
    if (!browserCodecs) {
      return platformCodecs.chrome || platformCodecs.safari;
    }

    return browserCodecs;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MediaCodecsConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Factory function
 */
export function createMediaCodecsProtection(
  config?: Partial<MediaCodecsConfig>
): MediaCodecsProtection {
  return new MediaCodecsProtection(config);
}

/**
 * Apply to multiple pages
 */
export async function applyMediaCodecsProtectionToPages(
  pages: Page[],
  config?: Partial<MediaCodecsConfig>
): Promise<void> {
  const protection = new MediaCodecsProtection(config);
  await Promise.all(pages.map((page) => protection.apply(page)));
}
