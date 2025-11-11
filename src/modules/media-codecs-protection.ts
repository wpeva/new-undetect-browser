import { Page } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * Codec profile types
 */
export type CodecProfile = 'chrome' | 'firefox' | 'safari' | 'edge' | 'custom';

/**
 * Codec support data
 */
export interface CodecSupport {
  audioCodecs: Record<string, string>;
  videoCodecs: Record<string, string>;
}

/**
 * MediaCodecs configuration
 */
export interface MediaCodecsConfig {
  enabled: boolean;
  profile: CodecProfile;
  customCodecs?: CodecSupport;
}

/**
 * Default codec profiles for different browsers
 */
const CODEC_PROFILES: Record<CodecProfile, CodecSupport> = {
  chrome: {
    audioCodecs: {
      'audio/mpeg': 'probably',
      'audio/mp4': 'probably',
      'audio/ogg; codecs="vorbis"': 'probably',
      'audio/ogg; codecs="opus"': 'probably',
      'audio/webm; codecs="vorbis"': 'probably',
      'audio/webm; codecs="opus"': 'probably',
      'audio/wav': 'probably',
      'audio/flac': 'probably',
      'audio/aac': 'probably',
    },
    videoCodecs: {
      'video/mp4; codecs="avc1.42E01E"': 'probably',
      'video/mp4; codecs="avc1.4D401E"': 'probably',
      'video/mp4; codecs="avc1.64001E"': 'probably',
      'video/mp4; codecs="vp9"': 'probably',
      'video/webm; codecs="vp8"': 'probably',
      'video/webm; codecs="vp9"': 'probably',
      'video/webm; codecs="av01.0.05M.08"': 'probably',
      'video/ogg; codecs="theora"': 'probably',
      'video/x-matroska; codecs="theora"': 'maybe',
    },
  },
  firefox: {
    audioCodecs: {
      'audio/mpeg': 'maybe',
      'audio/mp4': 'maybe',
      'audio/ogg; codecs="vorbis"': 'probably',
      'audio/ogg; codecs="opus"': 'probably',
      'audio/webm; codecs="vorbis"': 'probably',
      'audio/webm; codecs="opus"': 'probably',
      'audio/wav': 'probably',
      'audio/flac': 'probably',
    },
    videoCodecs: {
      'video/mp4; codecs="avc1.42E01E"': 'probably',
      'video/mp4; codecs="avc1.4D401E"': 'probably',
      'video/mp4; codecs="vp9"': 'probably',
      'video/webm; codecs="vp8"': 'probably',
      'video/webm; codecs="vp9"': 'probably',
      'video/ogg; codecs="theora"': 'probably',
    },
  },
  safari: {
    audioCodecs: {
      'audio/mpeg': 'probably',
      'audio/mp4': 'probably',
      'audio/wav': 'probably',
      'audio/aac': 'probably',
      'audio/x-m4a': 'maybe',
    },
    videoCodecs: {
      'video/mp4; codecs="avc1.42E01E"': 'probably',
      'video/mp4; codecs="avc1.4D401E"': 'probably',
      'video/mp4; codecs="avc1.64001E"': 'probably',
      'video/mp4; codecs="hvc1.1.6.L93.B0"': 'probably',
      'video/quicktime': 'maybe',
    },
  },
  edge: {
    audioCodecs: {
      'audio/mpeg': 'probably',
      'audio/mp4': 'probably',
      'audio/ogg; codecs="vorbis"': 'probably',
      'audio/ogg; codecs="opus"': 'probably',
      'audio/webm; codecs="vorbis"': 'probably',
      'audio/webm; codecs="opus"': 'probably',
      'audio/wav': 'probably',
      'audio/flac': 'probably',
      'audio/aac': 'probably',
    },
    videoCodecs: {
      'video/mp4; codecs="avc1.42E01E"': 'probably',
      'video/mp4; codecs="avc1.4D401E"': 'probably',
      'video/mp4; codecs="avc1.64001E"': 'probably',
      'video/mp4; codecs="vp9"': 'probably',
      'video/webm; codecs="vp8"': 'probably',
      'video/webm; codecs="vp9"': 'probably',
      'video/webm; codecs="av01.0.05M.08"': 'probably',
    },
  },
  custom: {
    audioCodecs: {},
    videoCodecs: {},
  },
};

/**
 * MediaCodecs Protection Module
 * Spoofs media codec support to match realistic browser profiles
 */
export class MediaCodecsProtection {
  private config: MediaCodecsConfig;
  private codecs: CodecSupport;

  constructor(config: Partial<MediaCodecsConfig> = {}) {
    const profile = config.profile || 'chrome';

    this.config = {
      enabled: true,
      profile,
      customCodecs: config.customCodecs,
      ...config,
    };

    // Use custom codecs if provided, otherwise use profile
    if (config.customCodecs) {
      this.codecs = config.customCodecs;
    } else {
      this.codecs = CODEC_PROFILES[profile];
    }

    logger.info(
      `MediaCodecs Protection initialized (profile: ${this.config.profile})`
    );
  }

  /**
   * Inject MediaCodecs protection into page
   */
  async inject(page: Page): Promise<void> {
    if (!this.config.enabled) {
      logger.info('MediaCodecs protection disabled, skipping injection');
      return;
    }

    await page.evaluateOnNewDocument((codecsData: CodecSupport) => {
      // Override HTMLMediaElement.canPlayType
      const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;

      HTMLMediaElement.prototype.canPlayType = function (
        type: string
      ): CanPlayTypeResult {
        // Check audio codecs
        const audioResult = codecsData.audioCodecs[type];
        if (audioResult) {
          return audioResult as CanPlayTypeResult;
        }

        // Check video codecs
        const videoResult = codecsData.videoCodecs[type];
        if (videoResult) {
          return videoResult as CanPlayTypeResult;
        }

        // Check with partial match for complex MIME types
        for (const [codec, result] of Object.entries(codecsData.audioCodecs)) {
          if (type.includes(codec.split(';')[0])) {
            return result as CanPlayTypeResult;
          }
        }

        for (const [codec, result] of Object.entries(codecsData.videoCodecs)) {
          if (type.includes(codec.split(';')[0])) {
            return result as CanPlayTypeResult;
          }
        }

        // Default to empty string for unsupported codecs
        return '';
      };

      // Override MediaSource.isTypeSupported
      if (typeof MediaSource !== 'undefined') {
        const originalIsTypeSupported = MediaSource.isTypeSupported;

        MediaSource.isTypeSupported = function (type: string): boolean {
          // Check audio codecs
          if (codecsData.audioCodecs[type]) {
            return codecsData.audioCodecs[type] === 'probably';
          }

          // Check video codecs
          if (codecsData.videoCodecs[type]) {
            return codecsData.videoCodecs[type] === 'probably';
          }

          // Check with partial match
          for (const [codec, result] of Object.entries(
            codecsData.audioCodecs
          )) {
            if (type.includes(codec.split(';')[0])) {
              return result === 'probably';
            }
          }

          for (const [codec, result] of Object.entries(
            codecsData.videoCodecs
          )) {
            if (type.includes(codec.split(';')[0])) {
              return result === 'probably';
            }
          }

          // Default to false for unsupported codecs
          return false;
        };
      }

      // Override RTCRtpSender.getCapabilities (WebRTC codec capabilities)
      if (
        typeof RTCRtpSender !== 'undefined' &&
        RTCRtpSender.getCapabilities
      ) {
        const originalGetCapabilities = RTCRtpSender.getCapabilities;

        RTCRtpSender.getCapabilities = function (
          kind: string
        ): RTCRtpCapabilities | null {
          const capabilities = originalGetCapabilities.call(this, kind);

          if (!capabilities) {
            return null;
          }

          // Filter codecs based on our profile
          if (kind === 'audio') {
            // Keep only supported audio codecs
            capabilities.codecs = capabilities.codecs.filter((codec) => {
              const mimeType = codec.mimeType.toLowerCase();
              return Object.keys(codecsData.audioCodecs).some((supportedCodec) =>
                supportedCodec.toLowerCase().includes(mimeType.split('/')[1])
              );
            });
          } else if (kind === 'video') {
            // Keep only supported video codecs
            capabilities.codecs = capabilities.codecs.filter((codec) => {
              const mimeType = codec.mimeType.toLowerCase();
              return Object.keys(codecsData.videoCodecs).some((supportedCodec) =>
                supportedCodec.toLowerCase().includes(mimeType.split('/')[1])
              );
            });
          }

          return capabilities;
        };
      }

      // Override RTCRtpReceiver.getCapabilities
      if (
        typeof RTCRtpReceiver !== 'undefined' &&
        RTCRtpReceiver.getCapabilities
      ) {
        const originalGetCapabilities = RTCRtpReceiver.getCapabilities;

        RTCRtpReceiver.getCapabilities = function (
          kind: string
        ): RTCRtpCapabilities | null {
          const capabilities = originalGetCapabilities.call(this, kind);

          if (!capabilities) {
            return null;
          }

          // Filter codecs based on our profile
          if (kind === 'audio') {
            capabilities.codecs = capabilities.codecs.filter((codec) => {
              const mimeType = codec.mimeType.toLowerCase();
              return Object.keys(codecsData.audioCodecs).some((supportedCodec) =>
                supportedCodec.toLowerCase().includes(mimeType.split('/')[1])
              );
            });
          } else if (kind === 'video') {
            capabilities.codecs = capabilities.codecs.filter((codec) => {
              const mimeType = codec.mimeType.toLowerCase();
              return Object.keys(codecsData.videoCodecs).some((supportedCodec) =>
                supportedCodec.toLowerCase().includes(mimeType.split('/')[1])
              );
            });
          }

          return capabilities;
        };
      }

      logger.info('MediaCodecs Protection injected successfully');
    }, this.codecs);

    logger.info('MediaCodecs Protection injected into page');
  }

  /**
   * Get the module name
   */
  getName(): string {
    return 'MediaCodecsProtection';
  }

  /**
   * Get current codec support
   */
  getCodecs(): CodecSupport {
    return {
      audioCodecs: { ...this.codecs.audioCodecs },
      videoCodecs: { ...this.codecs.videoCodecs },
    };
  }

  /**
   * Set custom codec support
   */
  setCodecs(codecs: CodecSupport): void {
    this.codecs = codecs;
    this.config.customCodecs = codecs;
    this.config.profile = 'custom';
    logger.info('MediaCodecs support updated to custom profile');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MediaCodecsConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.customCodecs) {
      this.codecs = config.customCodecs;
    } else if (config.profile) {
      this.codecs = CODEC_PROFILES[config.profile];
    }

    logger.info('MediaCodecs Protection configuration updated');
  }

  /**
   * Get available profiles
   */
  static getAvailableProfiles(): CodecProfile[] {
    return ['chrome', 'firefox', 'safari', 'edge', 'custom'];
  }

  /**
   * Get codec support for profile
   */
  static getProfileCodecs(profile: CodecProfile): CodecSupport {
    return {
      audioCodecs: { ...CODEC_PROFILES[profile].audioCodecs },
      videoCodecs: { ...CODEC_PROFILES[profile].videoCodecs },
    };
  }
}

/**
 * Create MediaCodecs protection instance
 */
export function createMediaCodecsProtection(
  config?: Partial<MediaCodecsConfig>
): MediaCodecsProtection {
  return new MediaCodecsProtection(config);
}
