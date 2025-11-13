/**
 * ML Profile Generator API Tests
 * Session 10: ML Profile Generation
 */

import { MLProfileGenerator, type GenerateParams } from '../../ml/api/generate';

describe('MLProfileGenerator', () => {
  let generator: MLProfileGenerator;

  beforeEach(() => {
    generator = new MLProfileGenerator();
  });

  describe('Parameter Validation', () => {
    test('should validate required parameters', async () => {
      const invalidParams = {} as GenerateParams;

      await expect(generator.generate(invalidParams)).rejects.toThrow(
        'Missing required parameter'
      );
    });

    test('should validate country parameter', async () => {
      const params = {
        os: 'windows' as const,
      } as GenerateParams;

      await expect(generator.generate(params)).rejects.toThrow(
        'Missing required parameter: country'
      );
    });

    test('should validate os parameter', async () => {
      const params = {
        country: 'US',
      } as GenerateParams;

      await expect(generator.generate(params)).rejects.toThrow(
        'Missing required parameter: os'
      );
    });

    test('should validate os value', async () => {
      const params = {
        country: 'US',
        os: 'invalid' as any,
      };

      await expect(generator.generate(params)).rejects.toThrow('Invalid OS');
    });

    test('should accept valid parameters', () => {
      const params: GenerateParams = {
        country: 'US',
        os: 'windows',
        browser: 'Chrome',
        browserVersion: '120',
      };

      // Should not throw
      expect(() => generator['validateParams'](params)).not.toThrow();
    });
  });

  describe('OS Normalization', () => {
    test('should normalize os to proper case', () => {
      expect(generator['normalizeOS']('windows')).toBe('Windows');
      expect(generator['normalizeOS']('Windows')).toBe('Windows');
      expect(generator['normalizeOS']('WINDOWS')).toBe('Windows');
    });

    test('should normalize mac', () => {
      expect(generator['normalizeOS']('mac')).toBe('Mac');
      expect(generator['normalizeOS']('Mac')).toBe('Mac');
      expect(generator['normalizeOS']('MAC')).toBe('Mac');
    });

    test('should normalize linux', () => {
      expect(generator['normalizeOS']('linux')).toBe('Linux');
      expect(generator['normalizeOS']('Linux')).toBe('Linux');
      expect(generator['normalizeOS']('LINUX')).toBe('Linux');
    });
  });

  describe('Consistency Validation', () => {
    test('should detect Mac with NVIDIA GPU as invalid', () => {
      const profile: any = {
        hardware: { platform: 'MacIntel' },
        webgl: { unmaskedVendor: 'NVIDIA Corporation' },
        screen: { width: 1920, height: 1080 },
      };

      const result = generator['validateConsistency'](profile);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mac systems do not use NVIDIA GPUs');
    });

    test('should detect Windows with Apple GPU as invalid', () => {
      const profile: any = {
        hardware: { platform: 'Win32' },
        webgl: { unmaskedVendor: 'Apple Inc.' },
        screen: { width: 1920, height: 1080 },
      };

      const result = generator['validateConsistency'](profile);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Windows systems do not use Apple GPUs');
    });

    test('should detect unrealistic screen ratio', () => {
      const profile: any = {
        hardware: { platform: 'Win32', timezoneOffset: 240 },
        webgl: { unmaskedVendor: 'NVIDIA Corporation' },
        screen: { width: 100, height: 1000 }, // Ratio = 0.1 (too low)
      };

      const result = generator['validateConsistency'](profile);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('aspect ratio'))).toBe(true);
    });

    test('should detect unrealistic screen resolution', () => {
      const profile: any = {
        hardware: { platform: 'Win32', timezoneOffset: 240 },
        webgl: { unmaskedVendor: 'NVIDIA Corporation' },
        screen: { width: 100, height: 100 }, // Too small
      };

      const result = generator['validateConsistency'](profile);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('screen resolution'))).toBe(true);
    });

    test('should detect invalid hardware concurrency', () => {
      const profile: any = {
        hardware: {
          platform: 'Win32',
          hardwareConcurrency: 256, // Too high
          timezoneOffset: 240,
        },
        webgl: { unmaskedVendor: 'NVIDIA Corporation' },
        screen: { width: 1920, height: 1080 },
      };

      const result = generator['validateConsistency'](profile);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('hardware concurrency'))).toBe(true);
    });

    test('should detect invalid timezone offset', () => {
      const profile: any = {
        hardware: {
          platform: 'Win32',
          hardwareConcurrency: 8,
          timezoneOffset: 1000, // Invalid
        },
        webgl: { unmaskedVendor: 'NVIDIA Corporation' },
        screen: { width: 1920, height: 1080 },
      };

      const result = generator['validateConsistency'](profile);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('timezone offset'))).toBe(true);
    });

    test('should warn about software WebGL renderer', () => {
      const profile: any = {
        hardware: { platform: 'Win32', timezoneOffset: 240 },
        webgl: {
          vendor: 'Brian Paul',
          renderer: 'Mesa OffScreen',
          unmaskedVendor: 'Mesa',
          extensions: ['EXT_test'],
        },
        screen: { width: 1920, height: 1080 },
      };

      const result = generator['validateConsistency'](profile);

      expect(result.warnings.some((w) => w.includes('renderer'))).toBe(true);
    });

    test('should warn about unusual device memory', () => {
      const profile: any = {
        hardware: {
          platform: 'Win32',
          hardwareConcurrency: 8,
          deviceMemory: 7, // Unusual value
          timezoneOffset: 240,
        },
        webgl: { unmaskedVendor: 'NVIDIA Corporation' },
        screen: { width: 1920, height: 1080 },
      };

      const result = generator['validateConsistency'](profile);

      expect(result.warnings.some((w) => w.includes('device memory'))).toBe(true);
    });

    test('should accept valid profile', () => {
      const profile: any = {
        canvas: { hash: 'abc123' },
        audio: { hash: 'def456' },
        hardware: {
          platform: 'Win32',
          hardwareConcurrency: 8,
          deviceMemory: 16,
          timezoneOffset: 240,
        },
        webgl: {
          vendor: 'WebKit',
          renderer: 'ANGLE (NVIDIA GeForce RTX 3070)',
          unmaskedVendor: 'NVIDIA Corporation',
          unmaskedRenderer: 'NVIDIA GeForce RTX 3070',
          extensions: Array(20).fill('EXT_test'),
        },
        screen: {
          width: 1920,
          height: 1080,
        },
      };

      const result = generator['validateConsistency'](profile);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Profile Generation', () => {
    test('should set default browserVersion', async () => {
      const params: GenerateParams = {
        country: 'US',
        os: 'windows',
      };

      // Mock the callPythonScript to avoid actual Python execution
      jest.spyOn(generator as any, 'callPythonScript').mockResolvedValue({
        canvas: { hash: 'test', parameters: { width: 280, height: 60 } },
        webgl: {
          vendor: 'WebKit',
          renderer: 'Test',
          unmaskedVendor: 'NVIDIA Corporation',
          unmaskedRenderer: 'Test',
          extensions: Array(20).fill('EXT_test'),
        },
        audio: { hash: 'test', sampleRate: 48000 },
        hardware: {
          platform: 'Win32',
          hardwareConcurrency: 8,
          deviceMemory: 16,
          timezoneOffset: 240,
        },
        screen: { width: 1920, height: 1080 },
      });

      await generator.generate(params);

      // Should have called with default browserVersion
      expect((generator as any).callPythonScript).toHaveBeenCalledWith(
        expect.objectContaining({
          browserVersion: '120',
        })
      );
    });
  });

  describe('Batch Generation', () => {
    test('should generate multiple profiles', async () => {
      const paramsArray: GenerateParams[] = [
        { country: 'US', os: 'windows', browser: 'Chrome' },
        { country: 'GB', os: 'mac', browser: 'Safari' },
      ];

      // Mock generate method
      jest.spyOn(generator, 'generate').mockResolvedValue({
        canvas: { hash: 'test', parameters: { width: 280, height: 60, textRendering: 'test', fontFamily: 'Arial' } },
        webgl: {
          vendor: 'WebKit',
          renderer: 'Test',
          version: '1.0',
          shadingLanguageVersion: '1.0',
          unmaskedVendor: 'NVIDIA',
          unmaskedRenderer: 'Test',
          extensions: [],
          supportedExtensions: [],
          maxTextureSize: 16384,
          maxViewportDims: [16384, 16384],
          maxRenderbufferSize: 16384,
          aliasedLineWidthRange: [1, 1],
          aliasedPointSizeRange: [1, 1024],
        },
        audio: {
          hash: 'test',
          sampleRate: 48000,
          channelCount: 2,
          channelCountMode: 'max',
          channelInterpretation: 'speakers',
          latency: 0.01,
          baseLatency: 0.005,
          outputLatency: 0.005,
        },
        hardware: {
          platform: 'Win32',
          hardwareConcurrency: 8,
          deviceMemory: 16,
          maxTouchPoints: 0,
          userAgent: 'test',
          language: 'en-US',
          languages: ['en-US'],
          timezone: 'America/New_York',
          timezoneOffset: 240,
        },
        screen: {
          width: 1920,
          height: 1080,
          availWidth: 1920,
          availHeight: 1040,
          colorDepth: 24,
          pixelDepth: 24,
          orientation: { angle: 0, type: 'landscape-primary' },
          devicePixelRatio: 1,
          touchSupport: { maxTouchPoints: 0, touchEvent: false, touchStart: false },
        },
      });

      const profiles = await generator.generateBatch(paramsArray);

      expect(profiles).toHaveLength(2);
      expect(generator.generate).toHaveBeenCalledTimes(2);
    });
  });
});
