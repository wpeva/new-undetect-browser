/**
 * SwiftShader Basic Usage Examples
 * Session 7: GPU Virtualization & SwiftShader
 */

import { SwiftShaderConfig, GPUProfile } from '../index';

async function example1_BasicSetup() {
  console.log('=== Example 1: Basic SwiftShader Setup ===\n');

  const config = new SwiftShaderConfig();

  // Define GPU profile
  const profile: GPUProfile = {
    vendor: 'NVIDIA',
    renderer: 'GeForce RTX 3080',
    version: '537.13',
    glVersion: '4.6.0',
    shadingLanguageVersion: '4.60'
  };

  // Setup SwiftShader and get Chromium flags
  const flags = await config.setup(profile);

  console.log('Chromium Launch Flags:');
  flags.forEach(flag => console.log(`  ${flag}`));

  return flags;
}

async function example2_RandomGPU() {
  console.log('\n=== Example 2: Random GPU Profile ===\n');

  const config = new SwiftShaderConfig();

  // Create random NVIDIA GPU profile
  const profile = config.createRandomProfile('NVIDIA');

  console.log('Random GPU Profile:');
  console.log(`  Vendor: ${profile.vendor}`);
  console.log(`  Renderer: ${profile.renderer}`);
  console.log(`  Version: ${profile.version}`);
  console.log(`  Vendor ID: ${profile.vendorId}`);
  console.log(`  Device ID: ${profile.deviceId}`);

  const flags = await config.setup(profile);
  console.log('\nChromium Flags:');
  flags.forEach(flag => console.log(`  ${flag}`));

  return profile;
}

async function example3_AdvancedSetup() {
  console.log('\n=== Example 3: Advanced Setup with Vulkan ===\n');

  const config = new SwiftShaderConfig();

  const profile: GPUProfile = {
    vendor: 'AMD',
    renderer: 'Radeon RX 6900 XT',
    version: '23.11.1',
    angle: 'vulkan',
    driverVersion: '23.11.1.0',
    glVersion: '4.6.0'
  };

  const flags = await config.setup(profile, {
    enableValidation: true,
    enableDebug: true,
    vulkanConfig: {
      loaderDebug: true,
      layers: ['VK_LAYER_KHRONOS_validation']
    },
    chromiumFlags: [
      '--enable-features=Vulkan',
      '--enable-unsafe-webgpu'
    ]
  });

  console.log('Advanced Configuration:');
  console.log(`  Vulkan ICD: ${process.env.VK_ICD_FILENAMES}`);
  console.log(`  Vulkan Debug: ${process.env.VK_LOADER_DEBUG}`);
  console.log(`  Validation Layers: ${process.env.VK_INSTANCE_LAYERS}`);

  console.log('\nChromium Flags:');
  flags.forEach(flag => console.log(`  ${flag}`));

  return flags;
}

async function example4_MultipleGPUs() {
  console.log('\n=== Example 4: Multiple GPU Profiles ===\n');

  const config = new SwiftShaderConfig();

  const vendors = ['NVIDIA', 'AMD', 'Intel'] as const;
  const profiles = vendors.map(vendor => config.createRandomProfile(vendor));

  profiles.forEach(profile => {
    console.log(`\n${profile.vendor} GPU:`);
    console.log(`  ${profile.renderer}`);
    console.log(`  ${profile.vendorId} / ${profile.deviceId}`);
    console.log(`  Driver: ${profile.version}`);
  });

  return profiles;
}

async function example5_GetGPUInfo() {
  console.log('\n=== Example 5: GPU Info Strings ===\n');

  const config = new SwiftShaderConfig();

  const profile: GPUProfile = {
    vendor: 'NVIDIA',
    renderer: 'GeForce RTX 4090',
    version: '537.13',
    glVersion: '4.6.0 NVIDIA 537.13'
  };

  const info = config.getGPUInfoStrings(profile);

  console.log('GPU Info for WebGL Injection:');
  console.log(`  Vendor: ${info.vendor}`);
  console.log(`  Renderer: ${info.renderer}`);
  console.log(`  Unmasked Vendor: ${info.unmaskedVendor}`);
  console.log(`  Unmasked Renderer: ${info.unmaskedRenderer}`);
  console.log(`  GL Version: ${info.glVersion}`);
  console.log(`  GLSL Version: ${info.glslVersion}`);
  console.log(`  ANGLE: ${info.angle}`);
  console.log(`  Extensions (${info.extensions.split(' ').length}):`,
    info.extensions.split(' ').slice(0, 5).join(', ') + '...');

  return info;
}

async function example6_ChromiumIntegration() {
  console.log('\n=== Example 6: Chromium Integration ===\n');

  const config = new SwiftShaderConfig();
  const profile = config.createRandomProfile('NVIDIA');

  const flags = await config.setup(profile, {
    chromiumFlags: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  console.log('Launch Chromium with these flags:');
  console.log('\nconst browser = await puppeteer.launch({');
  console.log('  headless: false,');
  console.log('  args: [');
  flags.forEach(flag => console.log(`    '${flag}',`));
  console.log('  ]');
  console.log('});');

  return flags;
}

async function example7_ValidateInstallation() {
  console.log('\n=== Example 7: Validate SwiftShader Installation ===\n');

  const config = new SwiftShaderConfig();
  const isInstalled = await config.validateInstallation();

  console.log(`SwiftShader installed: ${isInstalled}`);

  if (!isInstalled) {
    console.log('\nInstallation Instructions:');
    console.log(config.getInstallationInstructions());
  }

  return isInstalled;
}

// Run all examples
async function runAllExamples() {
  try {
    await example1_BasicSetup();
    await example2_RandomGPU();
    await example3_AdvancedSetup();
    await example4_MultipleGPUs();
    await example5_GetGPUInfo();
    await example6_ChromiumIntegration();
    await example7_ValidateInstallation();

    console.log('\n=== All Examples Completed ===\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export examples
export {
  example1_BasicSetup,
  example2_RandomGPU,
  example3_AdvancedSetup,
  example4_MultipleGPUs,
  example5_GetGPUInfo,
  example6_ChromiumIntegration,
  example7_ValidateInstallation,
  runAllExamples
};

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
