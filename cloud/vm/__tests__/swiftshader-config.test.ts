/**
 * SwiftShader Configuration Tests
 * Session 7: GPU Virtualization & SwiftShader
 */

import { SwiftShaderConfig } from '../swiftshader-config';
import { GPUProfile } from '../gpu-types';
import { getGPUDevice, NVIDIA_DEVICES } from '../gpu-database';

describe('SwiftShaderConfig', () => {
  let config: SwiftShaderConfig;

  beforeEach(() => {
    config = new SwiftShaderConfig();
    // Clear environment variables
    delete process.env.VK_ICD_FILENAMES;
    delete process.env.VK_LOADER_DEBUG;
    delete process.env.VK_INSTANCE_LAYERS;
    delete process.env.SWIFTSHADER_VALIDATION;
    delete process.env.SWIFTSHADER_DEBUG;
  });

  describe('setup', () => {
    it('should generate Chromium flags for NVIDIA RTX 3080', async () => {
      const profile: GPUProfile = {
        vendor: 'NVIDIA',
        renderer: 'GeForce RTX 3080',
        version: '537.13'
      };

      const flags = await config.setup(profile);

      expect(flags).toContain('--use-gl=swiftshader');
      expect(flags).toContain('--use-angle=swiftshader');
      expect(flags).toContain('--gpu-vendor-id=0x10de');
      expect(flags).toContain('--gpu-device-id=0x2206');
      expect(flags).toContain('--enable-gpu-rasterization');
      expect(flags).toContain('--enable-webgl');
    });

    it('should generate Chromium flags for AMD RX 6900 XT', async () => {
      const profile: GPUProfile = {
        vendor: 'AMD',
        renderer: 'Radeon RX 6900 XT',
        version: '23.11.1'
      };

      const flags = await config.setup(profile);

      expect(flags).toContain('--gpu-vendor-id=0x1002');
      expect(flags).toContain('--gpu-device-id=0x73bf');
    });

    it('should generate Chromium flags for Intel Arc A770', async () => {
      const profile: GPUProfile = {
        vendor: 'Intel',
        renderer: 'Arc A770',
        version: '31.0.101.4575'
      };

      const flags = await config.setup(profile);

      expect(flags).toContain('--gpu-vendor-id=0x8086');
      expect(flags).toContain('--gpu-device-id=0x56a0');
    });

    it('should setup Vulkan environment variables', async () => {
      const profile: GPUProfile = {
        vendor: 'NVIDIA',
        renderer: 'GeForce RTX 4090',
        version: '537.13'
      };

      await config.setup(profile, {
        vulkanConfig: {
          loaderDebug: true,
          layers: ['VK_LAYER_KHRONOS_validation']
        }
      });

      expect(process.env.VK_ICD_FILENAMES).toBeDefined();
      expect(process.env.VK_LOADER_DEBUG).toBe('all');
      expect(process.env.VK_INSTANCE_LAYERS).toBe('VK_LAYER_KHRONOS_validation');
    });

    it('should setup SwiftShader environment variables', async () => {
      const profile: GPUProfile = {
        vendor: 'NVIDIA',
        renderer: 'GeForce RTX 3090',
        version: '537.13'
      };

      await config.setup(profile, {
        enableValidation: true,
        enableDebug: true
      });

      expect(process.env.SWIFTSHADER_VALIDATION).toBe('1');
      expect(process.env.SWIFTSHADER_DEBUG).toBe('1');
    });

    it('should include custom Chromium flags', async () => {
      const profile: GPUProfile = {
        vendor: 'NVIDIA',
        renderer: 'GeForce RTX 3080',
        version: '537.13'
      };

      const flags = await config.setup(profile, {
        chromiumFlags: ['--custom-flag-1', '--custom-flag-2']
      });

      expect(flags).toContain('--custom-flag-1');
      expect(flags).toContain('--custom-flag-2');
    });

    it('should include driver version if specified', async () => {
      const profile: GPUProfile = {
        vendor: 'NVIDIA',
        renderer: 'GeForce RTX 3080',
        version: '537.13',
        driverVersion: '537.13.0.0'
      };

      const flags = await config.setup(profile);

      expect(flags).toContain('--gpu-driver-version=537.13.0.0');
    });

    it('should include GL version if specified', async () => {
      const profile: GPUProfile = {
        vendor: 'NVIDIA',
        renderer: 'GeForce RTX 3080',
        version: '537.13',
        glVersion: '4.6.0'
      };

      const flags = await config.setup(profile);

      expect(flags).toContain('--override-gl-version=4.6.0');
    });

    it('should enable Vulkan if specified', async () => {
      const profile: GPUProfile = {
        vendor: 'NVIDIA',
        renderer: 'GeForce RTX 3080',
        version: '537.13',
        angle: 'vulkan'
      };

      const flags = await config.setup(profile);

      expect(flags).toContain('--use-vulkan=swiftshader');
    });
  });

  describe('createRandomProfile', () => {
    it('should create a random NVIDIA profile', () => {
      const profile = config.createRandomProfile('NVIDIA');

      expect(profile.vendor).toBe('NVIDIA');
      expect(profile.vendorId).toBe('0x10de');
      expect(profile.renderer).toContain('NVIDIA');
      expect(profile.version).toMatch(/^537\.\d+$/);
      expect(profile.glVersion).toBe('4.6.0');
    });

    it('should create a random AMD profile', () => {
      const profile = config.createRandomProfile('AMD');

      expect(profile.vendor).toBe('AMD');
      expect(profile.vendorId).toBe('0x1002');
      expect(profile.renderer).toContain('AMD');
      expect(profile.version).toMatch(/^23\.\d+\.\d+$/);
    });

    it('should create a random Intel profile', () => {
      const profile = config.createRandomProfile('Intel');

      expect(profile.vendor).toBe('Intel');
      expect(profile.vendorId).toBe('0x8086');
      expect(profile.renderer).toContain('Intel');
      expect(profile.version).toMatch(/^31\.0\.101\.\d+$/);
    });

    it('should create a random profile from any vendor if not specified', () => {
      const profile = config.createRandomProfile();

      expect(profile.vendor).toBeDefined();
      expect(profile.vendorId).toBeDefined();
      expect(profile.deviceId).toBeDefined();
      expect(profile.renderer).toBeDefined();
      expect(profile.version).toBeDefined();
    });
  });

  describe('getGPUInfoStrings', () => {
    it('should return GPU info strings', () => {
      const profile: GPUProfile = {
        vendor: 'NVIDIA',
        renderer: 'GeForce RTX 3080',
        version: '537.13',
        glVersion: '4.6.0 NVIDIA 537.13'
      };

      const info = config.getGPUInfoStrings(profile);

      expect(info.vendor).toBe('NVIDIA');
      expect(info.renderer).toBe('GeForce RTX 3080');
      expect(info.version).toBe('537.13');
      expect(info.unmaskedVendor).toBe('NVIDIA');
      expect(info.unmaskedRenderer).toBe('GeForce RTX 3080');
      expect(info.glVersion).toBe('4.6.0 NVIDIA 537.13');
      expect(info.extensions).toContain('WEBGL_debug_renderer_info');
    });

    it('should include WebGL extensions', () => {
      const profile: GPUProfile = {
        vendor: 'AMD',
        renderer: 'Radeon RX 6900 XT',
        version: '23.11.1'
      };

      const info = config.getGPUInfoStrings(profile);

      expect(info.extensions).toContain('EXT_texture_filter_anisotropic');
      expect(info.extensions).toContain('WEBGL_compressed_texture_s3tc');
      expect(info.extensions).toContain('KHR_parallel_shader_compile');
    });
  });

  describe('getInstallationInstructions', () => {
    it('should return installation instructions', () => {
      const instructions = config.getInstallationInstructions();

      expect(instructions).toBeDefined();
      expect(typeof instructions).toBe('string');
      expect(instructions.length).toBeGreaterThan(0);
    });
  });
});

describe('GPU Database', () => {
  it('should retrieve NVIDIA RTX 3080 device info', () => {
    const device = getGPUDevice('GeForce RTX 3080');

    expect(device).toBeDefined();
    expect(device?.vendorId).toBe('0x10de');
    expect(device?.deviceId).toBe('0x2206');
    expect(device?.name).toBe('NVIDIA GeForce RTX 3080');
    expect(device?.architecture).toBe('Ampere');
  });

  it('should retrieve AMD RX 6900 XT device info', () => {
    const device = getGPUDevice('Radeon RX 6900 XT');

    expect(device).toBeDefined();
    expect(device?.vendorId).toBe('0x1002');
    expect(device?.deviceId).toBe('0x73bf');
    expect(device?.architecture).toBe('RDNA 2');
  });

  it('should retrieve Intel Arc A770 device info', () => {
    const device = getGPUDevice('Arc A770');

    expect(device).toBeDefined();
    expect(device?.vendorId).toBe('0x8086');
    expect(device?.deviceId).toBe('0x56a0');
    expect(device?.architecture).toBe('Alchemist');
  });

  it('should have all NVIDIA devices', () => {
    expect(NVIDIA_DEVICES['GeForce RTX 4090']).toBeDefined();
    expect(NVIDIA_DEVICES['GeForce RTX 3080']).toBeDefined();
    expect(NVIDIA_DEVICES['GeForce RTX 2080 Ti']).toBeDefined();
  });
});
