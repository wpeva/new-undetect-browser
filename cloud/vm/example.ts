/**
 * QEMU/KVM Usage Examples
 * Session 6: Hardware Virtualization Setup
 */

import { QEMUManager } from './qemu-manager';
import { ImageManager } from './images/image-manager';
import { GPUPassthroughManager, SwiftShaderManager } from './gpu/gpu-passthrough';
import { NetworkIsolationManager } from './network/network-isolation';
import {
  standardIntelDesktop,
  highPerformanceIntel,
  budgetSwiftShader,
  cloneProfile
} from './profiles/hardware-profiles';

/**
 * Example 1: Create a simple Windows 11 VM
 */
async function example1_simpleVM() {
  console.log('\n=== Example 1: Simple Windows 11 VM ===\n');

  const qemu = new QEMUManager();
  const images = new ImageManager();

  await qemu.initialize();
  await images.initialize();

  // Get Windows 11 template
  const template = images.getTemplate('img-windows11-standard');

  if (!template) {
    console.error('Windows 11 template not found');
    return;
  }

  // Create VM
  const vm = await qemu.createVM({
    name: 'windows11-test',
    hardwareProfile: standardIntelDesktop,
    imageTemplate: template,
    autoStart: true
  });

  console.log(`✓ VM created successfully!`);
  console.log(`  ID: ${vm.id}`);
  console.log(`  Status: ${vm.status}`);
  console.log(`  VNC Port: ${vm.vncPort}`);
  console.log(`  Connect: vncviewer localhost:${vm.vncPort}`);

  // Wait 10 seconds then pause VM
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('\nPausing VM...');
  await qemu.pauseVM(vm.id);

  console.log('VM paused. Press Ctrl+C to exit.');

  return vm;
}

/**
 * Example 2: High-performance VM with GPU passthrough
 */
async function example2_gpuPassthrough() {
  console.log('\n=== Example 2: VM with GPU Passthrough ===\n');

  const qemu = new QEMUManager();
  const gpu = new GPUPassthroughManager();

  // Check VFIO support
  const support = await gpu.checkVFIOSupport();

  console.log('GPU Passthrough Support:');
  console.log(`  IOMMU enabled: ${support.iommuEnabled}`);
  console.log(`  VFIO loaded: ${support.vfioLoaded}`);
  console.log(`  Available: ${support.available}`);

  if (!support.available) {
    console.error('\n✗ GPU passthrough not available');
    console.log('Enable IOMMU in BIOS and add to kernel parameters:');
    console.log('  Intel: intel_iommu=on');
    console.log('  AMD: amd_iommu=on');
    return;
  }

  // List GPU devices
  console.log('\nAvailable GPU devices:');
  const devices = await gpu.listPCIDevices();
  devices.forEach((dev, idx) => {
    console.log(`  ${idx + 1}. ${dev.slot}`);
    console.log(`     Vendor: ${dev.vendor}`);
    console.log(`     Device: ${dev.device}`);
    console.log(`     Driver: ${dev.driver}`);
    if (dev.iommuGroup !== undefined) {
      console.log(`     IOMMU Group: ${dev.iommuGroup}`);
    }
  });

  // Find NVIDIA GPU
  const nvidiaGPU = devices.find(d => d.vendor === '10de');

  if (!nvidiaGPU) {
    console.log('\n✗ No NVIDIA GPU found for passthrough');
    return;
  }

  console.log(`\nUsing GPU: ${nvidiaGPU.slot}`);

  // Bind to VFIO if not already bound
  if (nvidiaGPU.driver !== 'vfio-pci') {
    console.log('Binding GPU to VFIO driver...');
    await gpu.bindToVFIO(nvidiaGPU.slot);
    console.log('✓ GPU bound to VFIO');
  }

  // Create profile with GPU passthrough
  const profile = cloneProfile(highPerformanceIntel, {
    gpu: {
      type: 'vfio-pci',
      vendor: 'NVIDIA',
      model: 'GPU Passthrough',
      vram: 16384,
      pciSlot: nvidiaGPU.slot
    }
  });

  // Create VM (commented out to avoid actually starting)
  console.log('\n✓ Ready to create VM with GPU passthrough');
  console.log('Uncomment the following code to create the VM:\n');
  console.log(`/*
  const vm = await qemu.createVM({
    name: 'gaming-vm',
    hardwareProfile: profile,
    imageTemplate: windowsTemplate,
    autoStart: true
  });
  */`);
}

/**
 * Example 3: Budget VM with SwiftShader
 */
async function example3_swiftShader() {
  console.log('\n=== Example 3: Budget VM with SwiftShader ===\n');

  const swiftshader = new SwiftShaderManager();

  // Check installation
  const installation = await swiftshader.checkInstallation();

  console.log('SwiftShader Status:');
  console.log(`  Installed: ${installation.installed}`);

  if (installation.installed) {
    console.log('  Libraries:');
    installation.libraries.forEach(lib => {
      console.log(`    - ${lib}`);
    });
  } else {
    console.log('\n✗ SwiftShader not installed');
    console.log('Run the following to get installation instructions:');
    console.log('  await swiftshader.installSwiftShader()');
    return;
  }

  // Configure SwiftShader
  const config = await swiftshader.configureSwiftShader({
    enabled: true,
    libraryPath: '/usr/lib/swiftshader',
    threadCount: 4,
    env: {
      MESA_GL_VERSION_OVERRIDE: '4.5',
      MESA_GLSL_VERSION_OVERRIDE: '450'
    }
  });

  console.log('\nSwiftShader Configuration:');
  console.log('  Environment Variables:');
  Object.entries(config.envVars).forEach(([key, value]) => {
    console.log(`    ${key}=${value}`);
  });

  console.log('\n✓ SwiftShader ready for use with budget profile');
}

/**
 * Example 4: VM with network isolation
 */
async function example4_networkIsolation() {
  console.log('\n=== Example 4: VM with Network Isolation ===\n');

  const network = new NetworkIsolationManager();

  // Check capabilities
  const caps = await network.checkCapabilities();

  console.log('Network Capabilities:');
  console.log(`  Bridge support: ${caps.bridgeSupport}`);
  console.log(`  macvlan support: ${caps.macvlanSupport}`);
  console.log(`  ipvlan support: ${caps.ipvlanSupport}`);
  console.log(`  iptables available: ${caps.iptablesAvailable}`);

  if (!caps.macvlanSupport) {
    console.error('\n✗ macvlan not supported');
    return;
  }

  // List interfaces
  console.log('\nAvailable network interfaces:');
  caps.interfaces.forEach(iface => {
    console.log(`  - ${iface}`);
  });

  // Generate setup script
  const script = await network.generateSetupScript('vm-test-123', {
    enabled: true,
    mode: 'macvlan',
    parentInterface: 'eth0',
    macvlanMode: 'bridge',
    firewall: {
      enabled: true,
      allowedPorts: [80, 443, 8080],
      rateLimiting: true
    },
    blockDNSLeaks: true,
    customDNS: ['8.8.8.8', '1.1.1.1']
  });

  console.log('\nNetwork Isolation Setup Script:');
  console.log('─'.repeat(50));
  console.log(script);
  console.log('─'.repeat(50));

  console.log('\n✓ Network isolation configured');
}

/**
 * Example 5: VM lifecycle management
 */
async function example5_vmLifecycle() {
  console.log('\n=== Example 5: VM Lifecycle Management ===\n');

  const qemu = new QEMUManager();
  const images = new ImageManager();

  await qemu.initialize();
  await images.initialize();

  // Check system capabilities
  const capabilities = await qemu.getSystemCapabilities();

  console.log('System Capabilities:');
  console.log(`  KVM support: ${capabilities.kvmSupport}`);
  console.log(`  QEMU version: ${capabilities.qemuVersion.split('\n')[0]}`);
  console.log(`  CPU model: ${capabilities.cpuModel}`);
  console.log(`  CPU cores: ${capabilities.cpuCores}`);
  console.log(`  Total memory: ${capabilities.totalMemoryMB} MB`);
  console.log(`  VFIO support: ${capabilities.vfioSupport}`);

  // List all templates
  console.log('\nAvailable image templates:');
  const templates = images.listTemplates();
  templates.forEach((template, idx) => {
    console.log(`\n  ${idx + 1}. ${template.name} (${template.osType})`);
    console.log(`     ID: ${template.id}`);
    console.log(`     Min RAM: ${template.minRamGB} GB`);
    console.log(`     Min Disk: ${template.minDiskGB} GB`);
    console.log(`     Recommended CPUs: ${template.recommendedCPUCores}`);
  });

  // List all VMs
  console.log('\nActive VMs:');
  const vms = qemu.listVMs();

  if (vms.length === 0) {
    console.log('  No active VMs');
  } else {
    vms.forEach(vm => {
      console.log(`\n  - ${vm.name} (${vm.id})`);
      console.log(`    Status: ${vm.status}`);
      console.log(`    VNC Port: ${vm.vncPort}`);
      console.log(`    PID: ${vm.pid || 'N/A'}`);
    });
  }

  console.log('\n✓ Lifecycle management ready');
}

/**
 * Main function - run all examples
 */
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  QEMU/KVM Examples - Session 6                 ║');
  console.log('║  Hardware Virtualization Setup                 ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    // Run examples
    await example5_vmLifecycle();
    await example3_swiftShader();
    await example4_networkIsolation();
    await example2_gpuPassthrough();

    // Uncomment to actually create a VM
    // await example1_simpleVM();

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  All examples completed successfully!          ║');
    console.log('╚════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  example1_simpleVM,
  example2_gpuPassthrough,
  example3_swiftShader,
  example4_networkIsolation,
  example5_vmLifecycle
};
