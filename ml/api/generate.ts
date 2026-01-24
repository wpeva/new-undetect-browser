/**
 * ML Profile Generator API
 * Session 10: Training Profile Generator ML Model
 *
 * TypeScript API for generating fingerprint profiles using the trained ML model
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Generation parameters
 */
export interface GenerateParams {
  country: string;
  os: 'windows' | 'mac' | 'linux' | 'Windows' | 'Mac' | 'Linux';
  browser?: string;
  browserVersion?: string;
}

/**
 * Canvas fingerprint
 */
export interface CanvasFingerprint {
  hash: string;
  parameters: {
    width: number;
    height: number;
    textRendering: string;
    fontFamily: string;
  };
}

/**
 * WebGL fingerprint
 */
export interface WebGLFingerprint {
  vendor: string;
  renderer: string;
  version: string;
  shadingLanguageVersion: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
  extensions: string[];
  supportedExtensions: string[];
  maxTextureSize: number;
  maxViewportDims: number[];
  maxRenderbufferSize: number;
  aliasedLineWidthRange: number[];
  aliasedPointSizeRange: number[];
}

/**
 * Audio fingerprint
 */
export interface AudioFingerprint {
  hash: string;
  sampleRate: number;
  channelCount: number;
  channelCountMode: string;
  channelInterpretation: string;
  latency: number;
  baseLatency: number;
  outputLatency: number;
}

/**
 * Hardware fingerprint
 */
export interface HardwareFingerprint {
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  userAgent: string;
  language: string;
  languages: string[];
  timezone: string;
  timezoneOffset: number;
}

/**
 * Screen fingerprint
 */
export interface ScreenFingerprint {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  orientation: {
    angle: number;
    type: string;
  };
  devicePixelRatio: number;
  touchSupport: {
    maxTouchPoints: number;
    touchEvent: boolean;
    touchStart: boolean;
  };
}

/**
 * Generated profile
 */
export interface GeneratedProfile {
  canvas: CanvasFingerprint;
  webgl: WebGLFingerprint;
  audio: AudioFingerprint;
  hardware: HardwareFingerprint;
  screen: ScreenFingerprint;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * ML Profile Generator
 */
export class MLProfileGenerator {
  private pythonPath: string;
  private scriptPath: string;
  private modelPath: string;

  constructor(options?: {
    pythonPath?: string;
    modelPath?: string;
  }) {
    this.pythonPath = options?.pythonPath || 'python3';
    this.scriptPath = path.join(__dirname, '../models/generate.py');
    this.modelPath =
      options?.modelPath ||
      path.join(__dirname, '../models/fingerprint_generator.pth');
  }

  /**
   * Generate a fingerprint profile
   *
   * @param params - Generation parameters
   * @returns Generated profile
   */
  async generate(params: GenerateParams): Promise<GeneratedProfile> {
    // Validate parameters
    this.validateParams(params);

    // Set defaults
    const fullParams = {
      country: params.country,
      os: this.normalizeOS(params.os),
      browser: params.browser || 'Chrome',
      browserVersion: params.browserVersion || '120',
    };

    // Call Python script
    const profile = await this.callPythonScript(fullParams);

    // Validate consistency
    const validation = this.validateConsistency(profile);
    if (!validation.valid) {
      throw new Error(
        `Generated profile is inconsistent: ${validation.errors.join(', ')}`
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn(
        'Profile generation warnings:',
        validation.warnings.join(', ')
      );
    }

    return profile;
  }

  /**
   * Validate input parameters
   */
  private validateParams(params: GenerateParams): void {
    if (!params.country) {
      throw new Error('Missing required parameter: country');
    }

    if (!params.os) {
      throw new Error('Missing required parameter: os');
    }

    const validOS = ['windows', 'mac', 'linux'];
    if (!validOS.includes(params.os.toLowerCase())) {
      throw new Error(
        `Invalid OS: ${params.os}. Must be one of: ${validOS.join(', ')}`
      );
    }
  }

  /**
   * Normalize OS name
   */
  private normalizeOS(os: string): string {
    const normalized = os.toLowerCase();
    if (normalized === 'windows') return 'Windows';
    if (normalized === 'mac') return 'Mac';
    if (normalized === 'linux') return 'Linux';
    return os;
  }

  /**
   * Call Python script to generate profile
   */
  private callPythonScript(params: any): Promise<GeneratedProfile> {
    return new Promise((resolve, reject) => {
      const pythonArgs = [this.scriptPath];

      // Check if model exists
      if (fs.existsSync(this.modelPath)) {
        pythonArgs.push('--model', this.modelPath);
      }

      const python = spawn(this.pythonPath, pythonArgs);

      let stdout = '';
      let stderr = '';

      // Write params to stdin
      python.stdin.write(JSON.stringify(params));
      python.stdin.end();

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(`Python script failed with code ${code}: ${stderr}`)
          );
          return;
        }

        try {
          const profile = JSON.parse(stdout);
          resolve(profile);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error}`));
      });
    });
  }

  /**
   * Validate consistency of generated profile
   */
  private validateConsistency(profile: GeneratedProfile): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check hardware consistency
    if (profile.hardware && profile.webgl) {
      const platform = profile.hardware.platform.toLowerCase();

      // Mac hasn't used NVIDIA since 2016
      if (
        platform.includes('mac') &&
        profile.webgl.unmaskedVendor.toLowerCase().includes('nvidia')
      ) {
        errors.push('Mac systems do not use NVIDIA GPUs');
      }

      // Windows with Apple GPU is impossible
      if (
        platform.includes('win') &&
        profile.webgl.unmaskedVendor.toLowerCase().includes('apple')
      ) {
        errors.push('Windows systems do not use Apple GPUs');
      }
    }

    // Check screen ratio consistency
    if (profile.screen) {
      const ratio = profile.screen.width / profile.screen.height;
      if (ratio < 1.0 || ratio > 3.5) {
        errors.push(`Unrealistic aspect ratio: ${ratio.toFixed(2)}`);
      }

      // Check resolution is reasonable
      if (profile.screen.width < 800 || profile.screen.height < 600) {
        errors.push(
          `Unrealistic screen resolution: ${profile.screen.width}x${profile.screen.height}`
        );
      }
    }

    // Check hardware limits
    if (profile.hardware) {
      // Check hardware concurrency
      if (
        profile.hardware.hardwareConcurrency < 1 ||
        profile.hardware.hardwareConcurrency > 128
      ) {
        errors.push(
          `Unrealistic hardware concurrency: ${profile.hardware.hardwareConcurrency}`
        );
      }

      // Check device memory
      if (profile.hardware.deviceMemory) {
        const validMemory = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64];
        if (!validMemory.includes(profile.hardware.deviceMemory)) {
          warnings.push(
            `Unusual device memory: ${profile.hardware.deviceMemory}GB`
          );
        }
      }

      // Check timezone offset
      if (
        profile.hardware.timezoneOffset < -720 ||
        profile.hardware.timezoneOffset > 720
      ) {
        errors.push(
          `Invalid timezone offset: ${profile.hardware.timezoneOffset}`
        );
      }
    }

    // Check WebGL consistency
    if (profile.webgl) {
      // Check for software renderer (possible headless detection)
      if (
        profile.webgl.renderer.toLowerCase().includes('swiftshader') ||
        profile.webgl.renderer.toLowerCase().includes('llvmpipe') ||
        (profile.webgl.vendor === 'Brian Paul' &&
          profile.webgl.renderer === 'Mesa OffScreen')
      ) {
        warnings.push('Software WebGL renderer detected');
      }

      // Check extension count
      if (profile.webgl.extensions.length < 5) {
        warnings.push('Very few WebGL extensions detected');
      }
    }

    // Check canvas fingerprint
    if (profile.canvas) {
      if (profile.canvas.hash === '0' || profile.canvas.hash === '') {
        warnings.push('Canvas hash is empty');
      }
    }

    // Check audio fingerprint
    if (profile.audio) {
      if (profile.audio.hash === '0' || profile.audio.hash === '') {
        warnings.push('Audio hash is empty');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate multiple profiles
   */
  async generateBatch(
    paramsArray: GenerateParams[]
  ): Promise<GeneratedProfile[]> {
    const profiles: GeneratedProfile[] = [];

    for (const params of paramsArray) {
      try {
        const profile = await this.generate(params);
        profiles.push(profile);
      } catch (error) {
        console.error(`Failed to generate profile for params:`, params, error);
        throw error;
      }
    }

    return profiles;
  }

  /**
   * Test if Python environment is available
   */
  async test(): Promise<boolean> {
    try {
      const testParams = {
        country: 'US',
        os: 'Windows',
        browser: 'Chrome',
        browserVersion: '120',
      };

// @ts-ignore - Type mismatch is acceptable here
      await this.generate(testParams);
      return true;
    } catch (error) {
      console.error('ML Profile Generator test failed:', error);
      return false;
    }
  }
}

/**
 * Create a new ML Profile Generator instance
 */
export function createMLProfileGenerator(options?: {
  pythonPath?: string;
  modelPath?: string;
}): MLProfileGenerator {
  return new MLProfileGenerator(options);
}

// Example usage
if (require.main === module) {
  (async () => {
    console.log('Testing ML Profile Generator...\n');

    const generator = createMLProfileGenerator();

    // Test generation
    const params: GenerateParams = {
      country: 'US',
      os: 'windows',
      browser: 'Chrome',
      browserVersion: '120',
    };

    console.log('Generating profile with params:', params);

    try {
      const profile = await generator.generate(params);
      console.log('\nGenerated profile:');
      console.log(JSON.stringify(profile, null, 2));
      console.log('\n✅ Test successful!');
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    }
  })();
}
