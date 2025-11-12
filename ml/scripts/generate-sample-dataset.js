#!/usr/bin/env node
/**
 * Generate sample fingerprint dataset
 * Simple JavaScript version without external dependencies
 */

const fs = require('fs');
const path = require('path');

// Simple UUID generator
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateFingerprint() {
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
  const platforms = ['Windows', 'macOS', 'Linux'];
  const screenResolutions = [
    [1920, 1080],
    [1366, 768],
    [1440, 900],
    [1536, 864],
    [2560, 1440],
    [3840, 2160],
  ];

  const browser = randomChoice(browsers);
  const platform = randomChoice(platforms);
  const [screenWidth, screenHeight] = randomChoice(screenResolutions);
  const cores = randomChoice([2, 4, 6, 8, 12, 16]);
  const memory = randomChoice([4, 8, 16, 32]);

  const platformUA = {
    Windows: `Windows NT ${randomChoice(['10.0', '11.0'])}; Win64; x64`,
    macOS: `Macintosh; Intel Mac OS X ${randomInt(10, 13)}_${randomInt(0, 6)}_${randomInt(0, 9)}`,
    Linux: 'X11; Linux x86_64',
  };

  const platformString = {
    Windows: 'Win32',
    macOS: 'MacIntel',
    Linux: 'Linux x86_64',
  };

  const userAgentTemplates = {
    Chrome: `Mozilla/5.0 (${platformUA[platform]}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${randomInt(100, 120)}.0.0.0 Safari/537.36`,
    Firefox: `Mozilla/5.0 (${platformUA[platform]}; rv:${randomInt(100, 120)}.0) Gecko/20100101 Firefox/${randomInt(100, 120)}.0`,
    Safari: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15`,
    Edge: `Mozilla/5.0 (${platformUA[platform]}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${randomInt(100, 120)}.0.0.0 Safari/537.36 Edg/${randomInt(100, 120)}.0.0.0`,
  };

  const userAgent = userAgentTemplates[browser];

  const webglExtensions = [
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

  const commonFonts = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'];
  const platformFonts = {
    Windows: ['Calibri', 'Cambria', 'Consolas', 'Segoe UI', 'Tahoma'],
    macOS: ['Helvetica', 'San Francisco', 'Monaco', 'Menlo', 'Lucida Grande'],
    Linux: ['Ubuntu', 'DejaVu Sans', 'Liberation Sans', 'Noto Sans'],
  };

  const availableFonts = [...commonFonts, ...platformFonts[platform]];

  return {
    id: uuid(),
    timestamp: Date.now() - Math.floor(Math.random() * 86400000 * 30),
    source: 'generated',
    canvas: {
      hash: Math.floor(Math.random() * 0xffffffff)
        .toString(16)
        .padStart(8, '0'),
      imageData: 'data:image/png;base64,' + 'x'.repeat(90),
      toDataURL: 'data:image/png;base64,' + 'x'.repeat(90),
      parameters: {
        width: 280,
        height: 60,
        textRendering: 'geometricPrecision',
        fontFamily: 'Arial',
      },
    },
    webgl: {
      vendor: randomChoice(['WebKit', 'Mozilla', 'Google Inc.']),
      renderer: randomChoice([
        'WebKit WebGL',
        'ANGLE (NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0)',
        'ANGLE (Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
      ]),
      version: 'WebGL 1.0',
      shadingLanguageVersion: 'WebGL GLSL ES 1.0',
      unmaskedVendor: randomChoice(['NVIDIA Corporation', 'Intel Inc.', 'AMD']),
      unmaskedRenderer: randomChoice([
        'NVIDIA GeForce RTX 3080',
        'Intel(R) UHD Graphics 630',
        'AMD Radeon RX 6800',
      ]),
      extensions: webglExtensions,
      supportedExtensions: webglExtensions,
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
      hash: `${randomChoice([44100, 48000])}-2-2`,
      sampleRate: randomChoice([44100, 48000]),
      channelCount: 2,
      channelCountMode: 'max',
      channelInterpretation: 'speakers',
      latency: Math.random() * 0.01,
      baseLatency: Math.random() * 0.01,
      outputLatency: Math.random() * 0.01,
    },
    fonts: {
      availableFonts,
      fontCount: availableFonts.length,
      defaultFonts: ['monospace', 'sans-serif', 'serif'],
      customFonts: availableFonts,
    },
    screen: {
      width: screenWidth,
      height: screenHeight,
      availWidth: screenWidth,
      availHeight: screenHeight - randomChoice([0, 30, 40, 48]),
      colorDepth: 24,
      pixelDepth: 24,
      orientation: {
        angle: 0,
        type: 'landscape-primary',
      },
      devicePixelRatio: randomChoice([1, 1.5, 2]),
      touchSupport: {
        maxTouchPoints: platform === 'Windows' ? randomChoice([0, 10]) : 0,
        touchEvent: platform === 'Windows' ? randomChoice([true, false]) : false,
        touchStart: platform === 'Windows' ? randomChoice([true, false]) : false,
      },
    },
    hardware: {
      platform: platformString[platform],
      hardwareConcurrency: cores,
      deviceMemory: memory,
      maxTouchPoints: platform === 'Windows' ? randomChoice([0, 10]) : 0,
      userAgent,
      language: 'en-US',
      languages: ['en-US', 'en'],
      timezone: randomChoice(['America/New_York', 'Europe/London', 'Asia/Tokyo']),
      timezoneOffset: randomChoice([-300, 0, 540]),
    },
    navigator: {
      userAgent,
      platform: platformString[platform],
      language: 'en-US',
      languages: ['en-US', 'en'],
      hardwareConcurrency: cores,
      deviceMemory: memory,
      maxTouchPoints: platform === 'Windows' ? randomChoice([0, 10]) : 0,
      vendor: browser === 'Chrome' || browser === 'Edge' ? 'Google Inc.' : '',
      vendorSub: '',
      productSub: '20030107',
      appVersion: `5.0 (${platformUA[platform]})`,
      appName: 'Netscape',
      appCodeName: 'Mozilla',
      doNotTrack: null,
      cookieEnabled: true,
      plugins:
        browser === 'Chrome' || browser === 'Edge'
          ? [
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
            ]
          : [],
    },
    metadata: {
      userAgent,
      browserName: browser,
      browserVersion: `${randomInt(100, 120)}.0.${randomInt(5000, 6000)}.${randomInt(100, 200)}`,
      osName: platform,
      osVersion: randomChoice({
        Windows: ['10.0', '11.0'],
        macOS: ['10.15', '11.0', '12.0', '13.0'],
        Linux: ['5.15', '6.0'],
      }[platform]),
      deviceType: 'desktop',
      isBot: false,
      consistency: 1.0,
    },
  };
}

function main() {
  const count = parseInt(process.argv[2]) || 1000;
  const outputPath =
    process.argv[3] ||
    path.join(__dirname, '../datasets/fingerprints.json');

  console.log(`🎲 Generating ${count} sample fingerprints...`);

  const fingerprints = [];
  for (let i = 0; i < count; i++) {
    fingerprints.push(generateFingerprint());

    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/${count}`);
    }
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(fingerprints, null, 2));
  console.log(`✅ Generated ${fingerprints.length} fingerprints`);
  console.log(`💾 Saved to ${outputPath}`);
}

main();
