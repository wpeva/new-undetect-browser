/**
 * Hardware Profiles for QEMU/KVM Virtual Machines
 * Session 6: Hardware Virtualization Setup
 */

import { HardwareProfile } from '../types';

/**
 * Generate a random MAC address
 */
function generateMACAddress(): string {
  const hex = '0123456789ABCDEF';
  let mac = '52:54:00'; // QEMU prefix
  for (let i = 0; i < 3; i++) {
    mac += ':' + hex.charAt(Math.floor(Math.random() * 16)) + hex.charAt(Math.floor(Math.random() * 16));
  }
  return mac;
}

/**
 * Standard Intel Desktop Profile
 * Intel i7-12700K + NVIDIA RTX 3060
 */
export const standardIntelDesktop: HardwareProfile = {
  id: 'profile-intel-standard',
  name: 'Standard Intel Desktop',
  description: 'Intel i7-12700K with NVIDIA RTX 3060 - balanced performance',

  cpu: {
    model: 'Intel Core i7-12700K',
    vendor: 'GenuineIntel',
    cores: 8,
    threads: 16,
    features: ['vmx', 'sse4_2', 'aes', 'avx2', 'rdrand'],
    emulatedModel: 'host'
  },

  ramGB: 16,

  gpu: {
    type: 'virtio-vga',
    vendor: 'NVIDIA',
    model: 'GeForce RTX 3060',
    vram: 12288
  },

  disk: {
    imagePath: '',
    format: 'qcow2',
    size: 128,
    cache: 'writeback',
    interface: 'virtio'
  },

  network: {
    mode: 'user',
    macAddress: generateMACAddress()
  },

  vnc: {
    enabled: true,
    port: 5900
  },

  firmware: {
    type: 'uefi'
  },

  tpm: {
    enabled: true,
    version: '2.0'
  }
};

/**
 * High Performance Intel Profile
 * Intel i9-13900K + GPU Passthrough ready
 */
export const highPerformanceIntel: HardwareProfile = {
  id: 'profile-intel-high-perf',
  name: 'High Performance Intel',
  description: 'Intel i9-13900K optimized for GPU passthrough',

  cpu: {
    model: 'Intel Core i9-13900K',
    vendor: 'GenuineIntel',
    cores: 16,
    threads: 32,
    features: ['vmx', 'sse4_2', 'aes', 'avx2', 'avx512f', 'rdrand'],
    emulatedModel: 'host'
  },

  ramGB: 32,

  gpu: {
    type: 'vfio-pci',
    vendor: 'NVIDIA',
    model: 'GPU Passthrough',
    vram: 16384
  },

  disk: {
    imagePath: '',
    format: 'qcow2',
    size: 256,
    cache: 'none',
    interface: 'nvme'
  },

  network: {
    mode: 'bridge',
    macAddress: generateMACAddress(),
    bridgeName: 'br0'
  },

  vnc: {
    enabled: true,
    port: 5901
  },

  spice: {
    enabled: true,
    port: 5910
  },

  firmware: {
    type: 'uefi'
  },

  tpm: {
    enabled: true,
    version: '2.0'
  },

  audio: {
    enabled: true,
    backend: 'pa'
  },

  usb: {
    version: '3.0',
    devices: []
  }
};

/**
 * Standard AMD Desktop Profile
 * AMD Ryzen 9 5950X + Radeon RX 6800
 */
export const standardAMDDesktop: HardwareProfile = {
  id: 'profile-amd-standard',
  name: 'Standard AMD Desktop',
  description: 'AMD Ryzen 9 5950X with Radeon RX 6800',

  cpu: {
    model: 'AMD Ryzen 9 5950X',
    vendor: 'AuthenticAMD',
    cores: 16,
    threads: 32,
    features: ['svm', 'sse4_2', 'aes', 'avx2', 'rdrand'],
    emulatedModel: 'EPYC'
  },

  ramGB: 32,

  gpu: {
    type: 'virtio-vga',
    vendor: 'AMD',
    model: 'Radeon RX 6800',
    vram: 16384
  },

  disk: {
    imagePath: '',
    format: 'qcow2',
    size: 256,
    cache: 'writeback',
    interface: 'virtio'
  },

  network: {
    mode: 'user',
    macAddress: generateMACAddress()
  },

  vnc: {
    enabled: true,
    port: 5902
  },

  firmware: {
    type: 'uefi'
  },

  tpm: {
    enabled: true,
    version: '2.0'
  }
};

/**
 * High Performance AMD Profile
 * AMD Ryzen 7 7700X + GPU Passthrough ready
 */
export const highPerformanceAMD: HardwareProfile = {
  id: 'profile-amd-high-perf',
  name: 'High Performance AMD',
  description: 'AMD Ryzen 7 7700X optimized for GPU passthrough',

  cpu: {
    model: 'AMD Ryzen 7 7700X',
    vendor: 'AuthenticAMD',
    cores: 8,
    threads: 16,
    features: ['svm', 'sse4_2', 'aes', 'avx2', 'rdrand'],
    emulatedModel: 'EPYC'
  },

  ramGB: 32,

  gpu: {
    type: 'vfio-pci',
    vendor: 'AMD',
    model: 'GPU Passthrough',
    vram: 16384
  },

  disk: {
    imagePath: '',
    format: 'qcow2',
    size: 512,
    cache: 'none',
    interface: 'nvme'
  },

  network: {
    mode: 'bridge',
    macAddress: generateMACAddress(),
    bridgeName: 'br0'
  },

  vnc: {
    enabled: true,
    port: 5903
  },

  spice: {
    enabled: true,
    port: 5911
  },

  firmware: {
    type: 'uefi'
  },

  tpm: {
    enabled: true,
    version: '2.0'
  },

  audio: {
    enabled: true,
    backend: 'pa'
  },

  usb: {
    version: '3.0',
    devices: []
  }
};

/**
 * Budget Profile with SwiftShader Software Rendering
 * Minimal hardware for cloud environments
 */
export const budgetSwiftShader: HardwareProfile = {
  id: 'profile-budget-swiftshader',
  name: 'Budget SwiftShader',
  description: 'Budget profile with software rendering for cloud environments',

  cpu: {
    model: 'Intel Xeon E5-2680 v4',
    vendor: 'GenuineIntel',
    cores: 4,
    threads: 8,
    features: ['vmx', 'sse4_2', 'aes', 'avx2'],
    emulatedModel: 'Skylake-Server'
  },

  ramGB: 8,

  gpu: {
    type: 'swiftshader',
    vendor: 'Intel',
    model: 'SwiftShader Software Renderer',
    vram: 2048,
    swiftshaderPath: '/usr/lib/swiftshader',
    threadsPerCore: 2
  },

  disk: {
    imagePath: '',
    format: 'qcow2',
    size: 64,
    cache: 'writeback',
    interface: 'virtio'
  },

  network: {
    mode: 'user',
    macAddress: generateMACAddress()
  },

  vnc: {
    enabled: true,
    port: 5904
  },

  firmware: {
    type: 'bios'
  }
};

/**
 * macOS Profile (Hackintosh)
 * Configuration for macOS virtualization
 */
export const macOSProfile: HardwareProfile = {
  id: 'profile-macos',
  name: 'macOS Profile',
  description: 'Configuration for macOS virtualization (Hackintosh)',

  cpu: {
    model: 'Intel Core i9-10900K',
    vendor: 'GenuineIntel',
    cores: 10,
    threads: 20,
    features: ['vmx', 'sse4_2', 'aes', 'avx2', 'rdrand'],
    emulatedModel: 'Penryn'
  },

  ramGB: 16,

  gpu: {
    type: 'virtio-vga',
    vendor: 'Apple',
    model: 'Apple GPU Emulated',
    vram: 4096
  },

  disk: {
    imagePath: '',
    format: 'qcow2',
    size: 128,
    cache: 'writeback',
    interface: 'sata'
  },

  network: {
    mode: 'user',
    macAddress: generateMACAddress()
  },

  vnc: {
    enabled: true,
    port: 5905
  },

  firmware: {
    type: 'uefi',
    path: '/usr/share/OVMF/OVMF_CODE.fd'
  }
};

/**
 * Linux Development Profile
 * Optimized for software development on Linux
 */
export const linuxDevelopment: HardwareProfile = {
  id: 'profile-linux-dev',
  name: 'Linux Development',
  description: 'Optimized for software development on Linux',

  cpu: {
    model: 'Intel Core i7-11700K',
    vendor: 'GenuineIntel',
    cores: 8,
    threads: 16,
    features: ['vmx', 'sse4_2', 'aes', 'avx2', 'rdrand'],
    emulatedModel: 'host'
  },

  ramGB: 16,

  gpu: {
    type: 'virtio-vga',
    vendor: 'Intel',
    model: 'Intel UHD Graphics 750',
    vram: 2048
  },

  disk: {
    imagePath: '',
    format: 'qcow2',
    size: 256,
    cache: 'writeback',
    interface: 'virtio'
  },

  network: {
    mode: 'user',
    macAddress: generateMACAddress()
  },

  vnc: {
    enabled: true,
    port: 5906
  },

  firmware: {
    type: 'uefi'
  },

  audio: {
    enabled: true,
    backend: 'pa'
  }
};

/**
 * Clone a hardware profile with modifications
 */
export function cloneProfile(
  baseProfile: HardwareProfile,
  overrides: Partial<HardwareProfile>
): HardwareProfile {
  const cloned: HardwareProfile = JSON.parse(JSON.stringify(baseProfile));

  // Generate new ID and MAC address
  cloned.id = `profile-cloned-${Date.now()}`;
  cloned.network.macAddress = generateMACAddress();

  // Apply overrides
  if (overrides.name) cloned.name = overrides.name;
  if (overrides.description) cloned.description = overrides.description;
  if (overrides.ramGB) cloned.ramGB = overrides.ramGB;

  if (overrides.cpu) {
    cloned.cpu = { ...cloned.cpu, ...overrides.cpu };
  }
  if (overrides.gpu) {
    cloned.gpu = { ...cloned.gpu, ...overrides.gpu };
  }
  if (overrides.disk) {
    cloned.disk = { ...cloned.disk, ...overrides.disk };
  }
  if (overrides.network) {
    cloned.network = { ...cloned.network, ...overrides.network };
  }
  if (overrides.vnc) {
    cloned.vnc = { ...cloned.vnc, ...overrides.vnc };
  }
  if (overrides.spice) {
    cloned.spice = overrides.spice;
  }
  if (overrides.usb) {
    cloned.usb = overrides.usb;
  }
  if (overrides.audio) {
    cloned.audio = overrides.audio;
  }
  if (overrides.firmware) {
    cloned.firmware = { ...cloned.firmware, ...overrides.firmware };
  }
  if (overrides.tpm) {
    cloned.tpm = overrides.tpm;
  }

  return cloned;
}

/**
 * Get all available profiles
 */
export function getAllProfiles(): HardwareProfile[] {
  return [
    standardIntelDesktop,
    highPerformanceIntel,
    standardAMDDesktop,
    highPerformanceAMD,
    budgetSwiftShader,
    macOSProfile,
    linuxDevelopment
  ];
}

/**
 * Get profile by ID
 */
export function getProfileById(id: string): HardwareProfile | undefined {
  return getAllProfiles().find(p => p.id === id);
}
