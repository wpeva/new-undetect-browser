/**
 * ML Sample Dataset Generator
 * Session 9: Machine Learning Dataset Collection
 *
 * Generates sample fingerprint data without browser scraping
 * Useful for testing and initial dataset creation
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Fingerprint } from '../types/fingerprint';

export class SampleDataGenerator {
  private browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
  private platforms = ['Windows', 'macOS', 'Linux'];
  private screenResolutions = [
    [1920, 1080],
    [1366, 768],
    [1440, 900],
    [1536, 864],
    [2560, 1440],
    [3840, 2160],
  ];
  private cpuCores = [2, 4, 6, 8, 12, 16];
  private deviceMemory = [4, 8, 16, 32];

  /**
   * Generate sample dataset
   */
  generateDataset(count: number): Fingerprint[] {
    console.log(`🎲 Generating ${count} sample fingerprints...`);
    const fingerprints: Fingerprint[] = [];

    for (let i = 0; i < count; i++) {
      fingerprints.push(this.generateFingerprint());

      if ((i + 1) % 100 === 0) {
        console.log(`  Progress: ${i + 1}/${count}`);
      }
    }

    console.log(`✅ Generated ${fingerprints.length} fingerprints`);
    return fingerprints;
  }

  /**
   * Generate a single fingerprint
   */
  private generateFingerprint(): Fingerprint {
    const browser = this.randomChoice(this.browsers);
    const platform = this.randomChoice(this.platforms);
    const [screenWidth, screenHeight] = this.randomChoice(this.screenResolutions);
    const cores = this.randomChoice(this.cpuCores);
    const memory = this.randomChoice(this.deviceMemory);

    const userAgent = this.generateUserAgent(browser, platform);

    return {
      id: uuidv4(),
      timestamp: Date.now() - Math.floor(Math.random() * 86400000 * 30), // Last 30 days
      source: 'generated',
      canvas: {
        hash: this.generateCanvasHash(),
        imageData: this.generateRandomString(100),
        toDataURL: this.generateRandomString(100),
        parameters: {
          width: 280,
          height: 60,
          textRendering: 'geometricPrecision',
          fontFamily: 'Arial',
        },
      },
      webgl: {
        vendor: this.getWebGLVendor(),
        renderer: this.getWebGLRenderer(),
        version: 'WebGL 1.0',
        shadingLanguageVersion: 'WebGL GLSL ES 1.0',
        unmaskedVendor: this.getUnmaskedVendor(),
        unmaskedRenderer: this.getUnmaskedRenderer(),
        extensions: this.getWebGLExtensions(),
        supportedExtensions: this.getWebGLExtensions(),
        maxTextureSize: 16384,
        maxViewportDims: [16384, 16384],
        maxRenderbufferSize: 16384,
        aliasedLineWidthRange: [1, 1],
        aliasedPointSizeRange: [1, 1024],
        parameters: {
          MAX_VERTEX_ATTRIBS: 16,
          MAX_VERTEX_UNIFORM_VECTORS: 4096,
          MAX_VARYING_VECTORS: 30,
          MAX_COMBINED_TEXTURE_IMAGE_UNITS: 32,
          MAX_VERTEX_TEXTURE_IMAGE_UNITS: 16,
          MAX_TEXTURE_IMAGE_UNITS: 16,
          MAX_FRAGMENT_UNIFORM_VECTORS: 1024,
          MAX_CUBE_MAP_TEXTURE_SIZE: 16384,
        },
      },
      audio: {
        hash: `${this.randomInt(44100, 48000)}-2-2`,
        sampleRate: this.randomChoice([44100, 48000]),
        channelCount: 2,
        channelCountMode: 'max',
        channelInterpretation: 'speakers',
        latency: Math.random() * 0.01,
        baseLatency: Math.random() * 0.01,
        outputLatency: Math.random() * 0.01,
      },
      fonts: {
        availableFonts: this.getAvailableFonts(platform),
        fontCount: this.getAvailableFonts(platform).length,
        defaultFonts: ['monospace', 'sans-serif', 'serif'],
        customFonts: this.getAvailableFonts(platform),
      },
      screen: {
        width: screenWidth,
        height: screenHeight,
        availWidth: screenWidth,
        availHeight: screenHeight - this.randomChoice([0, 30, 40, 48]),
        colorDepth: 24,
        pixelDepth: 24,
        orientation: {
          angle: 0,
          type: 'landscape-primary',
        },
        devicePixelRatio: this.randomChoice([1, 1.5, 2]),
        touchSupport: {
          maxTouchPoints: platform === 'Windows' ? this.randomChoice([0, 10]) : 0,
          touchEvent: platform === 'Windows' ? this.randomChoice([true, false]) : false,
          touchStart: platform === 'Windows' ? this.randomChoice([true, false]) : false,
        },
      },
      hardware: {
        platform: this.getPlatformString(platform),
        hardwareConcurrency: cores,
        deviceMemory: memory,
        maxTouchPoints: platform === 'Windows' ? this.randomChoice([0, 10]) : 0,
        userAgent,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: this.randomChoice(['America/New_York', 'Europe/London', 'Asia/Tokyo']),
        timezoneOffset: this.randomChoice([-300, 0, 540]),
      },
      navigator: {
        userAgent,
        platform: this.getPlatformString(platform),
        language: 'en-US',
        languages: ['en-US', 'en'],
        hardwareConcurrency: cores,
        deviceMemory: memory,
        maxTouchPoints: platform === 'Windows' ? this.randomChoice([0, 10]) : 0,
        vendor: browser === 'Chrome' || browser === 'Edge' ? 'Google Inc.' : '',
        vendorSub: '',
        productSub: '20030107',
        appVersion: this.getAppVersion(browser, platform),
        appName: 'Netscape',
        appCodeName: 'Mozilla',
        doNotTrack: null,
        cookieEnabled: true,
        plugins: this.getPlugins(browser),
      },
      metadata: {
        userAgent,
        browserName: browser,
        browserVersion: this.getBrowserVersion(browser),
        osName: platform,
        osVersion: this.getOSVersion(platform),
        deviceType: 'desktop',
        isBot: false,
        consistency: 1.0,
      },
    };
  }

  private generateUserAgent(browser: string, platform: string): string {
    const templates: Record<string, string> = {
      Chrome: `Mozilla/5.0 (${this.getPlatformUA(platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.randomInt(100, 120)}.0.0.0 Safari/537.36`,
      Firefox: `Mozilla/5.0 (${this.getPlatformUA(platform)}; rv:${this.randomInt(100, 120)}.0) Gecko/20100101 Firefox/${this.randomInt(100, 120)}.0`,
      Safari: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15`,
      Edge: `Mozilla/5.0 (${this.getPlatformUA(platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.randomInt(100, 120)}.0.0.0 Safari/537.36 Edg/${this.randomInt(100, 120)}.0.0.0`,
    };
    return templates[browser];
  }

  private getPlatformUA(platform: string): string {
    const templates: Record<string, string> = {
      Windows: `Windows NT ${this.randomChoice(['10.0', '11.0'])}; Win64; x64`,
      macOS: `Macintosh; Intel Mac OS X ${this.randomInt(10, 13)}_${this.randomInt(0, 6)}_${this.randomInt(0, 9)}`,
      Linux: 'X11; Linux x86_64',
    };
    return templates[platform];
  }

  private getPlatformString(platform: string): string {
    const templates: Record<string, string> = {
      Windows: 'Win32',
      macOS: 'MacIntel',
      Linux: 'Linux x86_64',
    };
    return templates[platform];
  }

  private getAppVersion(browser: string, platform: string): string {
    return `5.0 (${this.getPlatformUA(platform)})`;
  }

  private getBrowserVersion(browser: string): string {
    return `${this.randomInt(100, 120)}.0.${this.randomInt(5000, 6000)}.${this.randomInt(100, 200)}`;
  }

  private getOSVersion(platform: string): string {
    const versions: Record<string, string[]> = {
      Windows: ['10.0', '11.0'],
      macOS: ['10.15', '11.0', '12.0', '13.0'],
      Linux: ['5.15', '6.0'],
    };
    return this.randomChoice(versions[platform]);
  }

  private getWebGLVendor(): string {
    return this.randomChoice(['WebKit', 'Mozilla', 'Google Inc.']);
  }

  private getWebGLRenderer(): string {
    return this.randomChoice([
      'WebKit WebGL',
      'ANGLE (NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0)',
      'ANGLE (Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
    ]);
  }

  private getUnmaskedVendor(): string {
    return this.randomChoice(['NVIDIA Corporation', 'Intel Inc.', 'AMD']);
  }

  private getUnmaskedRenderer(): string {
    return this.randomChoice([
      'NVIDIA GeForce RTX 3080',
      'Intel(R) UHD Graphics 630',
      'AMD Radeon RX 6800',
    ]);
  }

  private getWebGLExtensions(): string[] {
    return [
      'ANGLE_instanced_arrays',
      'EXT_blend_minmax',
      'EXT_color_buffer_half_float',
      'EXT_disjoint_timer_query',
      'EXT_float_blend',
      'EXT_frag_depth',
      'EXT_shader_texture_lod',
      'EXT_texture_compression_rgtc',
      'EXT_texture_filter_anisotropic',
      'WEBKIT_EXT_texture_filter_anisotropic',
      'EXT_sRGB',
      'KHR_parallel_shader_compile',
      'OES_element_index_uint',
      'OES_fbo_render_mipmap',
      'OES_standard_derivatives',
      'OES_texture_float',
      'OES_texture_float_linear',
      'OES_texture_half_float',
      'OES_texture_half_float_linear',
      'OES_vertex_array_object',
      'WEBGL_color_buffer_float',
      'WEBGL_compressed_texture_s3tc',
      'WEBKIT_WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_s3tc_srgb',
      'WEBGL_debug_renderer_info',
      'WEBGL_debug_shaders',
      'WEBGL_depth_texture',
      'WEBKIT_WEBGL_depth_texture',
      'WEBGL_draw_buffers',
      'WEBGL_lose_context',
      'WEBKIT_WEBGL_lose_context',
    ];
  }

  private getAvailableFonts(platform: string): string[] {
    const commonFonts = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'];
    const platformFonts: Record<string, string[]> = {
      Windows: ['Calibri', 'Cambria', 'Consolas', 'Segoe UI', 'Tahoma'],
      macOS: ['Helvetica', 'San Francisco', 'Monaco', 'Menlo', 'Lucida Grande'],
      Linux: ['Ubuntu', 'DejaVu Sans', 'Liberation Sans', 'Noto Sans'],
    };
    return [...commonFonts, ...platformFonts[platform]];
  }

  private getPlugins(browser: string): Array<{ name: string; description: string; filename: string; length: number }> {
    if (browser === 'Chrome' || browser === 'Edge') {
      return [
        {
          name: 'PDF Viewer',
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1,
        },
        {
          name: 'Chrome PDF Viewer',
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1,
        },
      ];
    }
    return [];
  }

  private generateCanvasHash(): string {
    return Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, '0');
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Save dataset to file
   */
  saveDataset(fingerprints: Fingerprint[], outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(fingerprints, null, 2));
    console.log(`💾 Saved ${fingerprints.length} fingerprints to ${outputPath}`);
  }
}

// CLI usage
if (require.main === module) {
  const count = parseInt(process.argv[2]) || 100;
  const outputPath = process.argv[3] || path.join(__dirname, '../datasets/sample-fingerprints.json');

  const generator = new SampleDataGenerator();
  const fingerprints = generator.generateDataset(count);
  generator.saveDataset(fingerprints, outputPath);
}
