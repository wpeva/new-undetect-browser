/**
 * ML Validation Tests
 * Session 9: Machine Learning Dataset Collection
 */

import { FingerprintValidator } from '../../ml/datasets/validation';
import { Fingerprint } from '../../ml/types/fingerprint';

describe('FingerprintValidator', () => {
  let validator: FingerprintValidator;
  let validFingerprint: Fingerprint;

  beforeEach(() => {
    validator = new FingerprintValidator();

    validFingerprint = {
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
        supportedExtensions: ['EXT_blend_minmax'],
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
    };
  });

  describe('Single Fingerprint Validation', () => {
    it('should validate correct fingerprint', () => {
      const result = validator.validateFingerprint(validFingerprint);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('should detect missing ID', () => {
      const invalid = { ...validFingerprint, id: '' };
      const result = validator.validateFingerprint(invalid as Fingerprint);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing fingerprint ID');
    });

    it('should detect missing canvas', () => {
      const invalid = { ...validFingerprint, canvas: undefined };
      const result = validator.validateFingerprint(invalid as any);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('canvas'))).toBe(true);
    });

    it('should detect invalid screen dimensions', () => {
      const invalid = {
        ...validFingerprint,
        screen: { ...validFingerprint.screen, width: -1 },
      };
      const result = validator.validateFingerprint(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid screen width');
    });

    it('should detect user agent inconsistency', () => {
      const invalid = {
        ...validFingerprint,
        navigator: { ...validFingerprint.navigator, userAgent: 'Different UA' },
      };
      const result = validator.validateFingerprint(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Navigator and hardware user agents do not match');
    });

    it('should calculate quality score', () => {
      const result = validator.validateFingerprint(validFingerprint);

      expect(result.quality).toBeDefined();
      expect(result.quality).toBeGreaterThan(0);
      expect(result.quality).toBeLessThanOrEqual(1);
    });

    it('should calculate consistency score', () => {
      const result = validator.validateFingerprint(validFingerprint);

      expect(result.consistency).toBeDefined();
      expect(result.consistency).toBeGreaterThan(0);
      expect(result.consistency).toBeLessThanOrEqual(1);
    });
  });

  describe('Dataset Validation', () => {
    it('should validate dataset', () => {
      const dataset = [validFingerprint];
      const result = validator.validateDataset(dataset);

      expect(result).toBeDefined();
      expect(result.valid).toBe(1);
      expect(result.invalid).toBe(0);
      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(1);
    });

    it('should count valid and invalid fingerprints', () => {
      const invalid = { ...validFingerprint, id: '' };
      const dataset = [validFingerprint, invalid as Fingerprint];
      const result = validator.validateDataset(dataset);

      expect(result.valid).toBe(1);
      expect(result.invalid).toBe(1);
    });
  });

  describe('Report Generation', () => {
    it('should generate validation report', () => {
      const result = validator.validateFingerprint(validFingerprint);
      const report = validator.generateReport([result]);

      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
      expect(report).toContain('Fingerprint Validation Report');
    });

    it('should save validation report', () => {
      const fs = require('fs');
      const path = require('path');
      const tmpPath = path.join('/tmp', 'test-validation-report.md');

      const result = validator.validateFingerprint(validFingerprint);
      validator.saveReport([result], tmpPath);

      expect(fs.existsSync(tmpPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(tmpPath);
    });
  });
});
