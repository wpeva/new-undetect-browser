/**
 * GPU Passthrough Manager
 * Session 6: Hardware Virtualization Setup
 *
 * Manages GPU passthrough (VFIO) and SwiftShader software rendering
 */

import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GPUPassthroughConfig, SwiftShaderConfig } from '../types';

const execAsync = promisify(exec);

export class GPUPassthroughManager {
  /**
   * Check if VFIO is available and configured
   */
  async checkVFIOSupport(): Promise<{
    available: boolean;
    iommuEnabled: boolean;
    vfioLoaded: boolean;
    devices: Array<{
      slot: string;
      vendor: string;
      device: string;
      driver: string;
      iommuGroup?: number;
    }>;
  }> {
    try {
      // Check if IOMMU is enabled
      const { stdout: cmdline } = await execAsync('cat /proc/cmdline');
      const iommuEnabled = cmdline.includes('intel_iommu=on') || cmdline.includes('amd_iommu=on');

      // Check if VFIO driver is loaded
      let vfioLoaded = false;
      try {
        await fs.access('/dev/vfio/vfio');
        vfioLoaded = true;
      } catch {
        // VFIO not loaded
      }

      // List PCI devices
      const devices = await this.listPCIDevices();

      return {
        available: iommuEnabled && vfioLoaded,
        iommuEnabled,
        vfioLoaded,
        devices
      };
    } catch (error) {
      return {
        available: false,
        iommuEnabled: false,
        vfioLoaded: false,
        devices: []
      };
    }
  }

  /**
   * List all PCI devices (especially GPUs)
   */
  async listPCIDevices(): Promise<Array<{
    slot: string;
    vendor: string;
    device: string;
    driver: string;
    iommuGroup?: number;
  }>> {
    try {
      const { stdout } = await execAsync('lspci -nn -D');
      const lines = stdout.split('\n').filter(line =>
        line.includes('VGA') ||
        line.includes('3D') ||
        line.includes('Display')
      );

      const devices = await Promise.all(
        lines.map(async line => {
          const match = line.match(/^([\w:.]+)\s+.*?\[(\w+:\w+)\]/);
          if (!match) return null;

          const slot = match[1];
          const [vendor, device] = match[2].split(':');

          // Get driver info
          let driver = 'none';
          try {
            const driverPath = `/sys/bus/pci/devices/${slot}/driver`;
            const driverLink = await fs.readlink(driverPath);
            driver = path.basename(driverLink);
          } catch {
            // No driver bound
          }

          // Get IOMMU group
          let iommuGroup: number | undefined;
          try {
            const iommuPath = `/sys/bus/pci/devices/${slot}/iommu_group`;
            const groupLink = await fs.readlink(iommuPath);
            iommuGroup = parseInt(path.basename(groupLink));
          } catch {
            // No IOMMU group
          }

          return {
            slot,
            vendor,
            device,
            driver,
            iommuGroup
          };
        })
      );

      return devices.filter(d => d !== null) as any[];
    } catch (error) {
      console.error('Failed to list PCI devices:', error);
      return [];
    }
  }

  /**
   * Bind GPU to VFIO driver
   */
  async bindToVFIO(pciSlot: string): Promise<void> {
    console.log(`Binding ${pciSlot} to VFIO driver...`);

    // Get vendor and device IDs
    const { stdout: ids } = await execAsync(`lspci -n -s ${pciSlot}`);
    const match = ids.match(/(\w+):(\w+)/);
    if (!match) {
      throw new Error(`Failed to get vendor/device ID for ${pciSlot}`);
    }

    const [, vendorId, deviceId] = match;

    // Unbind from current driver
    try {
      await execAsync(`echo "${pciSlot}" > /sys/bus/pci/devices/${pciSlot}/driver/unbind`);
    } catch {
      // May already be unbound
    }

    // Bind to VFIO
    await execAsync(`echo "${vendorId} ${deviceId}" > /sys/bus/pci/drivers/vfio-pci/new_id`);
    await execAsync(`echo "${pciSlot}" > /sys/bus/pci/drivers/vfio-pci/bind`);

    console.log(`Successfully bound ${pciSlot} to VFIO`);
  }

  /**
   * Unbind GPU from VFIO driver
   */
  async unbindFromVFIO(pciSlot: string): Promise<void> {
    console.log(`Unbinding ${pciSlot} from VFIO driver...`);

    try {
      await execAsync(`echo "${pciSlot}" > /sys/bus/pci/drivers/vfio-pci/unbind`);
      console.log(`Successfully unbound ${pciSlot} from VFIO`);
    } catch (error) {
      console.error(`Failed to unbind ${pciSlot}:`, error);
      throw error;
    }
  }

  /**
   * Configure GPU passthrough for a VM
   */
  async configurePassthrough(config: GPUPassthroughConfig): Promise<{
    qemuArgs: string[];
    envVars: Record<string, string>;
  }> {
    if (!config.enabled) {
      return { qemuArgs: [], envVars: {} };
    }

    const qemuArgs: string[] = [];
    const envVars: Record<string, string> = {};

    // Check if device is bound to VFIO
    const devices = await this.listPCIDevices();
    const device = devices.find(d => d.slot === config.pciDevice);

    if (!device) {
      throw new Error(`PCI device ${config.pciDevice} not found`);
    }

    if (device.driver !== 'vfio-pci' && config.vfioDriver) {
      await this.bindToVFIO(config.pciDevice);
    }

    // Add VFIO device to QEMU args
    qemuArgs.push('-device', `vfio-pci,host=${config.pciDevice}`);

    // Add secondary GPU if specified
    if (config.multiGPU && config.secondaryDevice) {
      qemuArgs.push('-device', `vfio-pci,host=${config.secondaryDevice}`);
    }

    // Add ROM file if specified
    if (config.romFile) {
      qemuArgs.push('-device', `vfio-pci,host=${config.pciDevice},romfile=${config.romFile}`);
    }

    return { qemuArgs, envVars };
  }

  /**
   * Get IOMMU groups
   */
  async getIOMMUGroups(): Promise<Map<number, string[]>> {
    const groups = new Map<number, string[]>();

    try {
      const { stdout } = await execAsync('find /sys/kernel/iommu_groups/ -type l');
      const links = stdout.split('\n').filter(Boolean);

      for (const link of links) {
        const match = link.match(/iommu_groups\/(\d+)/);
        if (!match) continue;

        const groupNum = parseInt(match[1]);
        const device = path.basename(link);

        if (!groups.has(groupNum)) {
          groups.set(groupNum, []);
        }
        groups.get(groupNum)!.push(device);
      }
    } catch {
      // IOMMU not available
    }

    return groups;
  }

  /**
   * Generate configuration script for GPU passthrough
   */
  async generatePassthroughScript(pciSlot: string, outputPath: string): Promise<void> {
    const script = `#!/bin/bash
# GPU Passthrough Configuration Script
# Generated for PCI device: ${pciSlot}

set -e

echo "Configuring GPU passthrough for ${pciSlot}..."

# Load VFIO modules
modprobe vfio
modprobe vfio_iommu_type1
modprobe vfio_pci

# Get vendor and device ID
DEVICE_INFO=$(lspci -n -s ${pciSlot} | grep -oP '\\w+:\\w+')
VENDOR_ID=$(echo $DEVICE_INFO | cut -d: -f1)
DEVICE_ID=$(echo $DEVICE_INFO | cut -d: -f2)

echo "Device: $VENDOR_ID:$DEVICE_ID"

# Unbind from current driver
if [ -e /sys/bus/pci/devices/${pciSlot}/driver ]; then
    echo "${pciSlot}" > /sys/bus/pci/devices/${pciSlot}/driver/unbind
fi

# Bind to VFIO
echo "$VENDOR_ID $DEVICE_ID" > /sys/bus/pci/drivers/vfio-pci/new_id
echo "${pciSlot}" > /sys/bus/pci/drivers/vfio-pci/bind

echo "GPU successfully bound to VFIO driver"
echo "IOMMU Group:"
readlink /sys/bus/pci/devices/${pciSlot}/iommu_group

echo "Done!"
`;

    await fs.writeFile(outputPath, script, { mode: 0o755 });
    console.log(`GPU passthrough script generated: ${outputPath}`);
  }
}

/**
 * SwiftShader Software Rendering Manager
 */
export class SwiftShaderManager {
  private libraryPath: string;

  constructor(libraryPath: string = '/usr/lib/swiftshader') {
    this.libraryPath = libraryPath;
  }

  /**
   * Check if SwiftShader is installed
   */
  async checkInstallation(): Promise<{
    installed: boolean;
    version?: string;
    libraries: string[];
  }> {
    const libraries: string[] = [];

    try {
      // Check for SwiftShader libraries
      const libFiles = [
        'libEGL.so',
        'libGLESv2.so',
        'libvk_swiftshader.so'
      ];

      for (const lib of libFiles) {
        const libPath = path.join(this.libraryPath, lib);
        try {
          await fs.access(libPath);
          libraries.push(lib);
        } catch {
          // Library not found
        }
      }

      const installed = libraries.length > 0;

      return {
        installed,
        libraries
      };
    } catch {
      return {
        installed: false,
        libraries: []
      };
    }
  }

  /**
   * Configure SwiftShader for a VM
   */
  async configureSwiftShader(config: SwiftShaderConfig): Promise<{
    qemuArgs: string[];
    envVars: Record<string, string>;
  }> {
    if (!config.enabled) {
      return { qemuArgs: [], envVars: {} };
    }

    const qemuArgs: string[] = [];
    const envVars: Record<string, string> = {
      LD_LIBRARY_PATH: config.libraryPath,
      VK_ICD_FILENAMES: path.join(config.libraryPath, 'vk_swiftshader_icd.json'),
      MESA_GL_VERSION_OVERRIDE: '4.5',
      MESA_GLSL_VERSION_OVERRIDE: '450'
    };

    // Add custom environment variables
    if (config.env) {
      Object.assign(envVars, config.env);
    }

    // SwiftShader uses software rendering, so we use virtio-vga
    qemuArgs.push('-device', 'virtio-vga,max_outputs=1');

    return { qemuArgs, envVars };
  }

  /**
   * Install SwiftShader
   */
  async installSwiftShader(): Promise<void> {
    console.log('Installing SwiftShader...');

    // Create directory
    await fs.mkdir(this.libraryPath, { recursive: true });

    // Download or build SwiftShader
    // This is a placeholder - actual implementation would download prebuilt binaries
    // or build from source
    console.log(`
SwiftShader installation requires manual setup:

1. Download SwiftShader from:
   https://github.com/google/swiftshader/releases

2. Extract libraries to:
   ${this.libraryPath}

3. Required files:
   - libEGL.so
   - libGLESv2.so
   - libvk_swiftshader.so
   - vk_swiftshader_icd.json

4. Set permissions:
   chmod 755 ${this.libraryPath}/*.so
    `);
  }

  /**
   * Test SwiftShader installation
   */
  async testSwiftShader(): Promise<boolean> {
    const installation = await this.checkInstallation();

    if (!installation.installed) {
      console.log('SwiftShader is not installed');
      return false;
    }

    console.log('SwiftShader libraries found:');
    installation.libraries.forEach(lib => console.log(`  - ${lib}`));

    return true;
  }
}

export default {
  GPUPassthroughManager,
  SwiftShaderManager
};
