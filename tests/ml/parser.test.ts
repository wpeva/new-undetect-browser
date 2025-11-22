/**
 * ML Parser Tests
 * Session 9: Machine Learning Dataset Collection
 */

import { FingerprintParser } from '../../ml/data-collection/parser';
import { Fingerprint } from '../../ml/types/fingerprint';

describe('FingerprintParser', () => {
  let parser: FingerprintParser;
  let sampleFingerprints: Fingerprint[];

  beforeEach(() => {
    parser = new FingerprintParser();

    // Create sample fingerprints
    sampleFingerprints = [
      {
        id: '123',
        timestamp: Date.now(),
        source: 'test',
        canvas: {
          hash: 'abc123',
          parameters: { width: 280, height: 60, textRendering: 'auto', fontFamily: 'Arial' },
        },
        webgl: {
          vendor: 'Google Inc.',
          renderer: 'ANGLE',
          version: 'WebGL 1.0',
          shadingLanguageVersion: 'WebGL GLSL ES 1.0',
          unmaskedVendor: 'NVIDIA',
          unmaskedRenderer: 'NVIDIA GeForce GTX 1080',
          extensions: ['EXT_blend_minmax', 'EXT_color_buffer_half_float'],
          supportedExtensions: ['EXT_blend_minmax', 'EXT_color_buffer_half_float'],
          maxTextureSize: 16384,
          maxViewportDims: [16384, 16384],
          maxRenderbufferSize: 16384,
          aliasedLineWidthRange: [1, 1],
          aliasedPointSizeRange: [1, 1024],
          parameters: {},
        },
        audio: {
          hash: '44100-2-2',
          sampleRate: 44100,
          channelCount: 2,
          channelCountMode: 'max',
          channelInterpretation: 'speakers',
          latency: 0.01,
        },
        fonts: {
          availableFonts: ['Arial', 'Verdana'],
          fontCount: 2,
          defaultFonts: ['monospace'],
          customFonts: ['Arial'],
        },
        screen: {
          width: 1920,
          height: 1080,
          availWidth: 1920,
          availHeight: 1080,
          colorDepth: 24,
          pixelDepth: 24,
          orientation: { angle: 0, type: 'landscape-primary' },
          devicePixelRatio: 1,
          touchSupport: { maxTouchPoints: 0, touchEvent: false, touchStart: false },
        },
        hardware: {
          platform: 'Win32',
          hardwareConcurrency: 8,
          deviceMemory: 16,
          maxTouchPoints: 0,
          userAgent: 'Mozilla/5.0',
          language: 'en-US',
          languages: ['en-US', 'en'],
          timezone: 'America/New_York',
          timezoneOffset: -300,
        },
        navigator: {
          userAgent: 'Mozilla/5.0',
          platform: 'Win32',
          language: 'en-US',
          languages: ['en-US', 'en'],
          hardwareConcurrency: 8,
          deviceMemory: 16,
          maxTouchPoints: 0,
          vendor: 'Google Inc.',
          vendorSub: '',
          productSub: '20030107',
          appVersion: '5.0',
          appName: 'Netscape',
          appCodeName: 'Mozilla',
          doNotTrack: null,
          cookieEnabled: true,
          plugins: [],
        },
        metadata: {
          userAgent: 'Mozilla/5.0',
          browserName: 'Chrome',
          browserVersion: '120.0.0.0',
          osName: 'Windows',
          osVersion: '10.0',
          deviceType: 'desktop',
          isBot: false,
          consistency: 1.0,
        },
      },
    ];
  });

  describe('Loading Data', () => {
    it('should load fingerprints from array', () => {
      parser.loadFromArray(sampleFingerprints);
      expect(parser).toBeDefined();
    });

    it('should load fingerprints from file', () => {
      const fs = require('fs');
      const path = require('path');
      const tmpPath = path.join('/tmp', 'test-fingerprints-parser.json');

      fs.writeFileSync(tmpPath, JSON.stringify(sampleFingerprints));
      parser.loadFromFile(tmpPath);

      expect(parser).toBeDefined();

      // Cleanup
      fs.unlinkSync(tmpPath);
    });
  });

  describe('Parsing', () => {
    beforeEach(() => {
      parser.loadFromArray(sampleFingerprints);
    });

    it('should parse all fingerprints', () => {
      const parsed = parser.parseAll();
      expect(parsed).toBeDefined();
      expect(parsed.length).toBe(1);
    });

    it('should normalize fingerprints', () => {
      const parsed = parser.parseAll();
      const fp = parsed[0];

      expect(fp.normalized).toBe(true);
    });

    it('should validate fingerprints', () => {
      const parsed = parser.parseAll();
      const fp = parsed[0];

      expect(fp.validated).toBe(true);
    });

    it('should calculate quality score', () => {
      const parsed = parser.parseAll();
      const fp = parsed[0];

      expect(fp.quality).toBeDefined();
      expect(fp.quality).toBeGreaterThan(0);
      expect(fp.quality).toBeLessThanOrEqual(1);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      parser.loadFromArray(sampleFingerprints);
      parser.parseAll();
    });

    it('should filter by quality', () => {
      const filtered = parser.filterByQuality(0.5);
      expect(filtered).toBeDefined();
      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should filter valid fingerprints', () => {
      const valid = parser.filterValid();
      expect(valid).toBeDefined();
      expect(Array.isArray(valid)).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      parser.loadFromArray(sampleFingerprints);
      parser.parseAll();
    });

    it('should generate statistics', () => {
      const stats = parser.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalFingerprints).toBe(1);
      expect(stats.validFingerprints).toBeDefined();
      expect(stats.browsers).toBeDefined();
      expect(stats.os).toBeDefined();
    });

    it('should save statistics to file', () => {
      const fs = require('fs');
      const path = require('path');
      const tmpPath = path.join('/tmp', 'test-stats.json');

      parser.saveStats(tmpPath);
      expect(fs.existsSync(tmpPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(tmpPath);
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate fingerprints', () => {
      const duplicates = [...sampleFingerprints, ...sampleFingerprints];
      parser.loadFromArray(duplicates);
      parser.parseAll();

      const unique = parser.deduplicate();
      expect(unique.length).toBe(1);
    });
  });
});
