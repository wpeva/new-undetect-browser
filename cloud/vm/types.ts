/**
 * QEMU/KVM Virtual Machine Types and Interfaces
 * Session 6: Hardware Virtualization Setup
 */

export type VMStatus = 'creating' | 'running' | 'paused' | 'stopped' | 'error' | 'suspended';
export type OSType = 'windows11' | 'windows10' | 'ubuntu22' | 'ubuntu20' | 'macos-ventura' | 'macos-monterey';
export type GPUType = 'virtio-vga' | 'vfio-pci' | 'swiftshader' | 'qxl';
export type NetworkMode = 'user' | 'bridge' | 'macvlan' | 'tap';

/**
 * CPU Profile Configuration
 */
export interface CPUProfile {
  model: string;
  vendor: 'GenuineIntel' | 'AuthenticAMD';
  cores: number;
  threads: number;
  features: string[];
  emulatedModel?: string;
}

/**
 * GPU Configuration
 */
export interface GPUConfig {
  type: GPUType;
  vendor: 'NVIDIA' | 'AMD' | 'Intel' | 'Apple';
  model: string;
  vram: number; // MB
  pciSlot?: string; // For passthrough (e.g., "01:00.0")
  swiftshaderPath?: string;
  threadsPerCore?: number;
}

/**
 * Network Configuration
 */
export interface NetworkConfig {
  mode: NetworkMode;
  macAddress: string;
  bridgeName?: string;
  tapDevice?: string;
  vlanId?: number;
  bandwidth?: {
    upload: number; // Mbps
    download: number; // Mbps
  };
  ipAddress?: string;
  gateway?: string;
  dns?: string[];
}

/**
 * Disk Configuration
 */
export interface DiskConfig {
  imagePath: string;
  format: 'qcow2' | 'raw' | 'vmdk';
  size: number; // GB
  cache: 'none' | 'writeback' | 'writethrough';
  interface: 'virtio' | 'sata' | 'ide' | 'nvme';
}

/**
 * Hardware Profile - Complete VM Hardware Configuration
 */
export interface HardwareProfile {
  id: string;
  name: string;
  description?: string;

  // System
  cpu: CPUProfile;
  ramGB: number;

  // Graphics
  gpu: GPUConfig;

  // Storage
  disk: DiskConfig;

  // Network
  network: NetworkConfig;

  // Display
  vnc: {
    enabled: boolean;
    port: number;
    password?: string;
  };

  spice?: {
    enabled: boolean;
    port: number;
  };

  // USB Devices
  usb?: {
    version: '2.0' | '3.0';
    devices: Array<{
      vendorId: string;
      productId: string;
      name: string;
    }>;
  };

  // Audio
  audio?: {
    enabled: boolean;
    backend: 'pa' | 'alsa' | 'oss';
  };

  // BIOS/UEFI
  firmware: {
    type: 'bios' | 'uefi';
    path?: string;
  };

  // TPM (for Windows 11)
  tpm?: {
    enabled: boolean;
    version: '1.2' | '2.0';
  };
}

/**
 * VM Image Template
 */
export interface VMImageTemplate {
  id: string;
  name: string;
  osType: OSType;
  version: string;
  imagePath: string;
  snapshotName?: string;
  description?: string;
  minRamGB: number;
  minDiskGB: number;
  recommendedCPUCores: number;
  created: Date;
  size: number; // bytes
}

/**
 * VM Instance
 */
export interface VMInstance {
  id: string;
  name: string;
  profileId: string;
  imageTemplateId: string;
  status: VMStatus;
  pid?: number;

  // Runtime info
  vncPort: number;
  monitorSocket?: string;
  qmpSocket?: string;

  // Resource usage
  stats?: {
    cpuUsage: number; // percentage
    memoryUsage: number; // MB
    diskIO: {
      read: number; // bytes/s
      write: number; // bytes/s
    };
    networkIO: {
      rx: number; // bytes/s
      tx: number; // bytes/s
    };
  };

  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;

  // Snapshots
  snapshots?: Array<{
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
  }>;
}

/**
 * QEMU Command Options
 */
export interface QEMUOptions {
  enableKVM: boolean;
  cpuModel: string;
  cpuCores: number;
  ramMB: number;

  devices: string[];
  netdevs: string[];
  drives: string[];

  vncDisplay?: string;
  monitorSocket?: string;
  qmpSocket?: string;

  daemonize: boolean;
  pidFile?: string;

  additionalArgs?: string[];
}

/**
 * VM Creation Options
 */
export interface CreateVMOptions {
  name: string;
  hardwareProfile: HardwareProfile;
  imageTemplate: VMImageTemplate;
  autoStart?: boolean;
  cloneImage?: boolean;
}

/**
 * VM Control Options
 */
export interface VMControlOptions {
  force?: boolean;
  saveState?: boolean;
  createSnapshot?: boolean;
  snapshotName?: string;
}

/**
 * VM Monitor Command Result
 */
export interface MonitorCommandResult {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * GPU Passthrough Configuration
 */
export interface GPUPassthroughConfig {
  enabled: boolean;
  pciDevice: string; // e.g., "0000:01:00.0"
  vfioDriver: boolean;
  iommuGroup?: number;
  resetMethod?: 'function' | 'bus' | 'vendor';

  // ROM file for GPU BIOS
  romFile?: string;

  // Multi-GPU setup
  multiGPU?: boolean;
  secondaryDevice?: string;
}

/**
 * Network Isolation Configuration (macvlan)
 */
export interface NetworkIsolationConfig {
  enabled: boolean;
  mode: 'bridge' | 'macvlan' | 'ipvlan';

  // macvlan specific
  parentInterface?: string;
  macvlanMode?: 'private' | 'vepa' | 'bridge' | 'passthru';

  // Firewall rules
  firewall?: {
    enabled: boolean;
    allowedPorts?: number[];
    blockedIPs?: string[];
    rateLimiting?: boolean;
  };

  // DNS isolation
  customDNS?: string[];
  blockDNSLeaks?: boolean;
}

/**
 * SwiftShader Software Rendering Configuration
 */
export interface SwiftShaderConfig {
  enabled: boolean;
  libraryPath: string;
  threadCount?: number;
  debugLevel?: 0 | 1 | 2 | 3;

  // Environment variables
  env?: {
    [key: string]: string;
  };
}

/**
 * VM Performance Tuning
 */
export interface PerformanceTuning {
  hugepages?: boolean;
  cpuPinning?: {
    enabled: boolean;
    cpuSet: string; // e.g., "0-3,8-11"
  };

  ioThreads?: {
    enabled: boolean;
    count: number;
  };

  diskCache?: 'none' | 'writeback' | 'writethrough' | 'directsync' | 'unsafe';

  kvmPit?: boolean;
  hyperVEnlightenments?: boolean;
}
