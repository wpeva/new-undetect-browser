/**
 * SwiftShader Configuration
 * Session 7: GPU Virtualization & SwiftShader
 *
 * SwiftShader is a high-performance CPU-based implementation of Vulkan and OpenGL ES
 * that allows software GPU rendering with customizable GPU parameters.
 */

import { GPUProfile, SwiftShaderOptions, VulkanConfig } from './gpu-types';
import { GPU_VENDOR_IDS, getGPUDevice, getRandomGPU } from './gpu-database';
import * as path from 'path';
import * as os from 'os';

export class SwiftShaderConfig {
  private readonly swiftShaderPaths = {
    linux: {
      vulkan: '/usr/lib/x86_64-linux-gnu/libvulkan.so.1',
      swiftShader: '/usr/lib/x86_64-linux-gnu/libvk_swiftshader.so',
      icd: '/usr/share/vulkan/icd.d/vk_swiftshader_icd.json'
    },
    darwin: {
      vulkan: '/usr/local/lib/libvulkan.dylib',
      swiftShader: '/usr/local/lib/libvk_swiftshader.dylib',
      icd: '/usr/local/share/vulkan/icd.d/vk_swiftshader_icd.json'
    },
    win32: {
      vulkan: 'C:\\Windows\\System32\\vulkan-1.dll',
      swiftShader: 'C:\\Program Files\\SwiftShader\\vk_swiftshader.dll',
      icd: 'C:\\Program Files\\SwiftShader\\vk_swiftshader_icd.json'
    }
  };

  /**
   * Setup SwiftShader with custom GPU profile
   */
  async setup(
    profile: GPUProfile,
    options: SwiftShaderOptions = {}
  ): Promise<string[]> {
    // Setup Vulkan environment
    this.setupVulkanEnvironment(options.vulkanConfig);

    // Setup SwiftShader environment
    this.setupSwiftShaderEnvironment(options);

    // Generate Chromium flags
    const flags = this.generateChromiumFlags(profile, options);

    return flags;
  }

  /**
   * Setup Vulkan environment variables
   */
  private setupVulkanEnvironment(config?: VulkanConfig): void {
    const platform = os.platform() as keyof typeof this.swiftShaderPaths;
    const paths = this.swiftShaderPaths[platform] || this.swiftShaderPaths.linux;

    // Set Vulkan ICD filename (tells Vulkan loader to use SwiftShader)
    process.env.VK_ICD_FILENAMES = config?.icdFilename || paths.icd;

    // Enable Vulkan loader debug output
    if (config?.loaderDebug) {
      process.env.VK_LOADER_DEBUG = 'all';
    }

    // Set Vulkan layers
    if (config?.layers && config.layers.length > 0) {
      process.env.VK_INSTANCE_LAYERS = config.layers.join(':');
    }

    // Set library path
    process.env.LD_LIBRARY_PATH = path.dirname(paths.swiftShader);
  }

  /**
   * Setup SwiftShader-specific environment
   */
  private setupSwiftShaderEnvironment(options: SwiftShaderOptions): void {
    // Enable SwiftShader validation layers
    if (options.enableValidation) {
      process.env.SWIFTSHADER_VALIDATION = '1';
    }

    // Enable SwiftShader debug mode
    if (options.enableDebug) {
      process.env.SWIFTSHADER_DEBUG = '1';
    }

    // Disable GPU process crash handling (for debugging)
    if (options.enableDebug) {
      process.env.CHROMIUM_GPU_PROCESS_DISABLE_CRASH_HANDLING = '1';
    }
  }

  /**
   * Generate Chromium command-line flags for GPU virtualization
   */
  private generateChromiumFlags(
    profile: GPUProfile,
    options: SwiftShaderOptions
  ): string[] {
    const flags: string[] = [
      // Use SwiftShader for OpenGL
      '--use-gl=swiftshader',

      // Use SwiftShader for ANGLE (Almost Native Graphics Layer Engine)
      '--use-angle=swiftshader',

      // Enable GPU rasterization
      '--enable-gpu-rasterization',

      // Override GPU vendor ID
      `--gpu-vendor-id=${this.getVendorId(profile.vendor)}`,

      // Override GPU device ID
      `--gpu-device-id=${this.getDeviceId(profile.renderer)}`,

      // Disable GPU driver bug workarounds
      '--disable-gpu-driver-bug-workarounds',

      // Enable WebGL
      '--enable-webgl',
      '--enable-webgl2-compute-context',

      // Disable GPU sandbox (for software rendering)
      '--disable-gpu-sandbox',

      // Enable Vulkan if specified
      ...(profile.angle === 'vulkan' ? ['--use-vulkan=swiftshader'] : []),

      // Custom flags from options
      ...(options.chromiumFlags || [])
    ];

    // Add driver version override if specified
    if (profile.driverVersion) {
      flags.push(`--gpu-driver-version=${profile.driverVersion}`);
    }

    // Add GL version override if specified
    if (profile.glVersion) {
      flags.push(`--override-gl-version=${profile.glVersion}`);
    }

    return flags;
  }

  /**
   * Get GPU vendor ID from vendor name
   */
  private getVendorId(vendor: string): string {
    // Check if vendor is already a hex ID
    if (vendor.startsWith('0x')) {
      return vendor;
    }

    // Try to match with known vendors
    const vendorUpper = vendor.toUpperCase();
    for (const [key, value] of Object.entries(GPU_VENDOR_IDS)) {
      if (vendorUpper.includes(key)) {
        return value;
      }
    }

    // Default to Microsoft Basic Render Driver
    return '0x1414';
  }

  /**
   * Get GPU device ID from renderer name
   */
  private getDeviceId(renderer: string): string {
    // Check if renderer is already a hex ID
    if (renderer.startsWith('0x')) {
      return renderer;
    }

    // Try to find device in database
    const device = getGPUDevice(renderer);
    if (device) {
      return device.deviceId;
    }

    // Try to extract model name and search
    const models = [
      'RTX 4090',
      'RTX 4080',
      'RTX 3090',
      'RTX 3080',
      'RTX 3070',
      'RX 7900 XTX',
      'RX 6900 XT',
      'Arc A770'
    ];

    for (const model of models) {
      if (renderer.includes(model)) {
        const device = getGPUDevice(`GeForce ${model}`) || getGPUDevice(`Radeon ${model}`) || getGPUDevice(`Intel ${model}`);
        if (device) {
          return device.deviceId;
        }
      }
    }

    // Default to generic device
    return '0x0001';
  }

  /**
   * Create a random GPU profile
   */
  createRandomProfile(vendor?: 'NVIDIA' | 'AMD' | 'Intel' | 'Apple'): GPUProfile {
    const device = getRandomGPU(vendor);

    return {
      vendor: vendor || 'NVIDIA',
      renderer: device.name,
      version: this.generateDriverVersion(vendor || 'NVIDIA'),
      vendorId: device.vendorId,
      deviceId: device.deviceId,
      glVersion: '4.6.0',
      shadingLanguageVersion: '4.60'
    };
  }

  /**
   * Generate realistic driver version
   */
  private generateDriverVersion(vendor: string): string {
    const versions = {
      'NVIDIA': `537.${Math.floor(Math.random() * 100)}`,
      'AMD': `23.${Math.floor(Math.random() * 12)}.${Math.floor(Math.random() * 10)}`,
      'Intel': `31.0.101.${Math.floor(Math.random() * 5000)}`,
      'Apple': `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`
    };

    return versions[vendor] || '1.0.0';
  }

  /**
   * Get GPU info strings for injection
   */
  getGPUInfoStrings(profile: GPUProfile): Record<string, string> {
    return {
      vendor: profile.vendor,
      renderer: profile.renderer,
      version: profile.version,
      unmaskedVendor: profile.vendor,
      unmaskedRenderer: profile.renderer,
      glVersion: profile.glVersion || '4.6.0 NVIDIA 537.13',
      shadingLanguageVersion: profile.shadingLanguageVersion || 'WebGL GLSL ES 3.00',
      angle: profile.angle || 'ANGLE (SwiftShader, Vulkan)',
      glslVersion: profile.shadingLanguageVersion || '4.60',
      extensions: this.getExtensions(profile.vendor)
    };
  }

  /**
   * Get realistic WebGL extensions for vendor
   */
  private getExtensions(vendor: string): string {
    const commonExtensions = [
      'ANGLE_instanced_arrays',
      'EXT_blend_minmax',
      'EXT_color_buffer_half_float',
      'EXT_disjoint_timer_query',
      'EXT_float_blend',
      'EXT_frag_depth',
      'EXT_shader_texture_lod',
      'EXT_texture_compression_bptc',
      'EXT_texture_compression_rgtc',
      'EXT_texture_filter_anisotropic',
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
      'WEBGL_compressed_texture_s3tc_srgb',
      'WEBGL_debug_renderer_info',
      'WEBGL_debug_shaders',
      'WEBGL_depth_texture',
      'WEBGL_draw_buffers',
      'WEBGL_lose_context',
      'WEBGL_multi_draw'
    ];

    return commonExtensions.join(' ');
  }

  /**
   * Validate SwiftShader installation
   */
  async validateInstallation(): Promise<boolean> {
    const platform = os.platform() as keyof typeof this.swiftShaderPaths;
    const paths = this.swiftShaderPaths[platform] || this.swiftShaderPaths.linux;

    const fs = require('fs').promises;

    try {
      // Check if SwiftShader library exists
      await fs.access(paths.swiftShader);
      return true;
    } catch (error) {
      console.warn(`SwiftShader not found at ${paths.swiftShader}`);
      return false;
    }
  }

  /**
   * Get installation instructions
   */
  getInstallationInstructions(): string {
    const platform = os.platform();

    const instructions = {
      linux: `
# Install SwiftShader on Linux
sudo apt-get update
sudo apt-get install -y libvulkan1 vulkan-tools
wget https://github.com/google/swiftshader/releases/latest/download/swiftshader-linux.tar.gz
tar -xzf swiftshader-linux.tar.gz
sudo cp libvk_swiftshader.so /usr/lib/x86_64-linux-gnu/
sudo cp vk_swiftshader_icd.json /usr/share/vulkan/icd.d/
      `,
      darwin: `
# Install SwiftShader on macOS
brew install vulkan-loader
wget https://github.com/google/swiftshader/releases/latest/download/swiftshader-macos.tar.gz
tar -xzf swiftshader-macos.tar.gz
sudo cp libvk_swiftshader.dylib /usr/local/lib/
sudo cp vk_swiftshader_icd.json /usr/local/share/vulkan/icd.d/
      `,
      win32: `
# Install SwiftShader on Windows
# Download from: https://github.com/google/swiftshader/releases/latest
# Extract to C:\\Program Files\\SwiftShader\\
# Add to PATH environment variable
      `
    };

    return instructions[platform] || instructions.linux;
  }
}

// Export singleton instance
export const swiftShaderConfig = new SwiftShaderConfig();
