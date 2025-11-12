/**
 * QEMU/KVM Virtual Machine Manager
 * Session 6: Hardware Virtualization Setup
 *
 * Main manager class for creating, controlling, and monitoring QEMU/KVM virtual machines
 */

import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  VMInstance,
  HardwareProfile,
  VMImageTemplate,
  QEMUOptions,
  CreateVMOptions,
  VMControlOptions,
  MonitorCommandResult,
  VMStatus,
  GPUPassthroughConfig,
  NetworkIsolationConfig,
  SwiftShaderConfig,
  PerformanceTuning
} from './types';

const execAsync = promisify(exec);

export class QEMUManager {
  private instances: Map<string, VMInstance> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private baseImageDir: string;
  private instanceDir: string;
  private socketDir: string;

  constructor(config?: {
    baseImageDir?: string;
    instanceDir?: string;
    socketDir?: string;
  }) {
    this.baseImageDir = config?.baseImageDir || '/var/lib/undetect-browser/vm/images';
    this.instanceDir = config?.instanceDir || '/var/lib/undetect-browser/vm/instances';
    this.socketDir = config?.socketDir || '/var/run/undetect-browser/vm';
  }

  /**
   * Initialize VM manager directories
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.baseImageDir, { recursive: true });
    await fs.mkdir(this.instanceDir, { recursive: true });
    await fs.mkdir(this.socketDir, { recursive: true });
  }

  /**
   * Create a new virtual machine
   */
  async createVM(options: CreateVMOptions): Promise<VMInstance> {
    const vmId = this.generateVMId();
    const { hardwareProfile, imageTemplate, name, autoStart, cloneImage } = options;

    console.log(`Creating VM: ${name} (${vmId})`);

    // Create VM instance directory
    const vmDir = path.join(this.instanceDir, vmId);
    await fs.mkdir(vmDir, { recursive: true });

    // Clone or link image
    const diskPath = await this.prepareDiskImage(
      vmDir,
      imageTemplate.imagePath,
      cloneImage || false
    );

    // Allocate VNC port
    const vncPort = await this.allocateVNCPort();

    // Create sockets
    const monitorSocket = path.join(this.socketDir, `${vmId}-monitor.sock`);
    const qmpSocket = path.join(this.socketDir, `${vmId}-qmp.sock`);

    // Build QEMU options
    const qemuOptions = this.buildQEMUOptions(hardwareProfile, {
      diskPath,
      vncPort,
      monitorSocket,
      qmpSocket
    });

    // Create VM instance object
    const instance: VMInstance = {
      id: vmId,
      name,
      profileId: hardwareProfile.id,
      imageTemplateId: imageTemplate.id,
      status: 'creating',
      vncPort,
      monitorSocket,
      qmpSocket,
      createdAt: new Date()
    };

    this.instances.set(vmId, instance);

    try {
      // Start QEMU process
      const process = await this.startQEMUProcess(qemuOptions);
      this.processes.set(vmId, process);

      instance.pid = process.pid;
      instance.status = 'running';
      instance.startedAt = new Date();

      console.log(`VM ${name} started with PID ${process.pid}`);

      // Setup process monitoring
      this.monitorProcess(vmId, process);

      if (autoStart === false) {
        await this.pauseVM(vmId);
      }

      return instance;
    } catch (error) {
      instance.status = 'error';
      throw error;
    }
  }

  /**
   * Build QEMU command line options
   */
  private buildQEMUOptions(
    profile: HardwareProfile,
    runtime: {
      diskPath: string;
      vncPort: number;
      monitorSocket: string;
      qmpSocket: string;
    }
  ): QEMUOptions {
    const options: QEMUOptions = {
      enableKVM: true,
      cpuModel: this.getCPUModel(profile.cpu),
      cpuCores: profile.cpu.cores,
      ramMB: profile.ramGB * 1024,
      devices: [],
      netdevs: [],
      drives: [],
      vncDisplay: `:${runtime.vncPort - 5900}`,
      monitorSocket: runtime.monitorSocket,
      qmpSocket: runtime.qmpSocket,
      daemonize: false,
      additionalArgs: []
    };

    // CPU configuration
    if (profile.cpu.threads > profile.cpu.cores) {
      options.additionalArgs!.push(
        '-smp',
        `${profile.cpu.threads},cores=${profile.cpu.cores},threads=${profile.cpu.threads / profile.cpu.cores}`
      );
    } else {
      options.additionalArgs!.push('-smp', `${profile.cpu.cores}`);
    }

    // GPU configuration
    const gpuDevice = this.getGPUDevice(profile.gpu);
    if (gpuDevice) {
      options.devices.push(gpuDevice);
    }

    // Network configuration
    const netConfig = this.getNetworkConfig(profile.network);
    options.netdevs.push(netConfig.netdev);
    options.devices.push(netConfig.device);

    // Disk configuration
    options.drives.push(
      `file=${runtime.diskPath},format=${profile.disk.format},` +
      `cache=${profile.disk.cache},if=${profile.disk.interface}`
    );

    // USB configuration
    if (profile.usb) {
      options.devices.push(`usb-ehci,id=ehci`);
      profile.usb.devices.forEach((device, idx) => {
        options.devices.push(
          `usb-host,vendorId=${device.vendorId},productId=${device.productId},id=usb${idx}`
        );
      });
    }

    // Audio configuration
    if (profile.audio?.enabled) {
      options.devices.push(`intel-hda`);
      options.devices.push(`hda-duplex`);
    }

    // TPM configuration (for Windows 11)
    if (profile.tpm?.enabled) {
      options.additionalArgs!.push(
        '-chardev', 'socket,id=chrtpm,path=/tmp/swtpm-sock',
        '-tpmdev', 'emulator,id=tpm0,chardev=chrtpm',
        '-device', `tpm-tis,tpmdev=tpm0`
      );
    }

    // UEFI firmware
    if (profile.firmware.type === 'uefi') {
      options.additionalArgs!.push(
        '-drive',
        `if=pflash,format=raw,readonly=on,file=/usr/share/OVMF/OVMF_CODE.fd`
      );
    }

    return options;
  }

  /**
   * Get CPU model string for QEMU
   */
  private getCPUModel(cpu: {
    model: string;
    vendor: string;
    cores: number;
    features?: string[];
  }): string {
    const cpuModels: Record<string, string> = {
      'Intel i7-12700K': 'host,vendor=GenuineIntel,+alder-lake',
      'Intel i9-13900K': 'host,vendor=GenuineIntel,+raptor-lake',
      'AMD Ryzen 9 5950X': 'host,vendor=AuthenticAMD,+zen3',
      'AMD Ryzen 7 7700X': 'host,vendor=AuthenticAMD,+zen4',
      'Apple M2': 'max' // Not realistic but best effort
    };

    const baseModel = cpuModels[cpu.model] || 'host';

    // Add additional CPU features
    if (cpu.features && cpu.features.length > 0) {
      return `${baseModel},${cpu.features.map(f => `+${f}`).join(',')}`;
    }

    return baseModel;
  }

  /**
   * Get GPU device configuration
   */
  private getGPUDevice(gpu: HardwareProfile['gpu']): string | null {
    switch (gpu.type) {
      case 'vfio-pci':
        // GPU passthrough
        if (gpu.pciSlot) {
          return `vfio-pci,host=${gpu.pciSlot}`;
        }
        return null;

      case 'virtio-vga':
        return 'virtio-vga,vgamem_mb=256';

      case 'qxl':
        return `qxl-vga,vram_size=${gpu.vram}`;

      case 'swiftshader':
        // Software rendering - handled via environment variables
        return 'virtio-vga';

      default:
        return 'virtio-vga';
    }
  }

  /**
   * Get network configuration
   */
  private getNetworkConfig(network: HardwareProfile['network']): {
    netdev: string;
    device: string;
  } {
    let netdev: string;
    let device: string;

    switch (network.mode) {
      case 'user':
        netdev = `user,id=net0`;
        break;

      case 'bridge':
        netdev = `bridge,id=net0,br=${network.bridgeName || 'virbr0'}`;
        break;

      case 'macvlan':
        netdev = `tap,id=net0,ifname=${network.tapDevice || 'tap0'},script=no,downscript=no`;
        break;

      case 'tap':
        netdev = `tap,id=net0,ifname=${network.tapDevice},script=no,downscript=no`;
        break;

      default:
        netdev = 'user,id=net0';
    }

    device = `virtio-net-pci,netdev=net0,mac=${network.macAddress}`;

    return { netdev, device };
  }

  /**
   * Start QEMU process
   */
  private async startQEMUProcess(options: QEMUOptions): Promise<ChildProcess> {
    const args: string[] = [];

    // KVM
    if (options.enableKVM) {
      args.push('-enable-kvm');
    }

    // CPU
    args.push('-cpu', options.cpuModel);
    args.push('-smp', `${options.cpuCores}`);

    // Memory
    args.push('-m', `${options.ramMB}`);

    // Devices
    options.devices.forEach(device => {
      args.push('-device', device);
    });

    // Network devices
    options.netdevs.forEach(netdev => {
      args.push('-netdev', netdev);
    });

    // Drives
    options.drives.forEach(drive => {
      args.push('-drive', drive);
    });

    // VNC
    if (options.vncDisplay) {
      args.push('-vnc', options.vncDisplay);
    }

    // Monitor socket
    if (options.monitorSocket) {
      args.push('-monitor', `unix:${options.monitorSocket},server,nowait`);
    }

    // QMP socket
    if (options.qmpSocket) {
      args.push('-qmp', `unix:${options.qmpSocket},server,nowait`);
    }

    // Additional args
    if (options.additionalArgs) {
      args.push(...options.additionalArgs);
    }

    console.log('Starting QEMU with args:', args.join(' '));

    const process = spawn('qemu-system-x86_64', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    return new Promise((resolve, reject) => {
      let startupTimeout: NodeJS.Timeout;

      process.once('spawn', () => {
        clearTimeout(startupTimeout);
        resolve(process);
      });

      process.once('error', (error) => {
        clearTimeout(startupTimeout);
        reject(error);
      });

      // Timeout after 30 seconds
      startupTimeout = setTimeout(() => {
        process.kill();
        reject(new Error('QEMU process failed to start within 30 seconds'));
      }, 30000);
    });
  }

  /**
   * Monitor QEMU process
   */
  private monitorProcess(vmId: string, process: ChildProcess): void {
    process.stdout?.on('data', (data) => {
      console.log(`[VM ${vmId}] ${data.toString()}`);
    });

    process.stderr?.on('data', (data) => {
      console.error(`[VM ${vmId}] ${data.toString()}`);
    });

    process.on('exit', (code) => {
      console.log(`VM ${vmId} exited with code ${code}`);
      const instance = this.instances.get(vmId);
      if (instance) {
        instance.status = code === 0 ? 'stopped' : 'error';
        instance.stoppedAt = new Date();
      }
      this.processes.delete(vmId);
    });
  }

  /**
   * Stop a virtual machine
   */
  async stopVM(vmId: string, options?: VMControlOptions): Promise<void> {
    const instance = this.instances.get(vmId);
    if (!instance) {
      throw new Error(`VM ${vmId} not found`);
    }

    const process = this.processes.get(vmId);
    if (!process) {
      throw new Error(`VM ${vmId} process not found`);
    }

    if (options?.force) {
      process.kill('SIGKILL');
    } else {
      // Send ACPI shutdown via monitor
      if (instance.monitorSocket) {
        await this.sendMonitorCommand(instance.monitorSocket, 'system_powerdown');
      }

      // Wait for graceful shutdown, timeout after 30s
      await this.waitForProcessExit(process, 30000);

      // Force kill if still running
      if (!process.killed) {
        process.kill('SIGKILL');
      }
    }

    instance.status = 'stopped';
    instance.stoppedAt = new Date();
  }

  /**
   * Pause a virtual machine
   */
  async pauseVM(vmId: string): Promise<void> {
    const instance = this.instances.get(vmId);
    if (!instance || !instance.monitorSocket) {
      throw new Error(`VM ${vmId} not found or monitor socket unavailable`);
    }

    await this.sendMonitorCommand(instance.monitorSocket, 'stop');
    instance.status = 'paused';
  }

  /**
   * Resume a paused virtual machine
   */
  async resumeVM(vmId: string): Promise<void> {
    const instance = this.instances.get(vmId);
    if (!instance || !instance.monitorSocket) {
      throw new Error(`VM ${vmId} not found or monitor socket unavailable`);
    }

    await this.sendMonitorCommand(instance.monitorSocket, 'cont');
    instance.status = 'running';
  }

  /**
   * Get VM instance information
   */
  getVM(vmId: string): VMInstance | undefined {
    return this.instances.get(vmId);
  }

  /**
   * List all VM instances
   */
  listVMs(): VMInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Delete a VM instance
   */
  async deleteVM(vmId: string, deleteImage = false): Promise<void> {
    const instance = this.instances.get(vmId);
    if (!instance) {
      throw new Error(`VM ${vmId} not found`);
    }

    // Stop VM if running
    if (instance.status === 'running' || instance.status === 'paused') {
      await this.stopVM(vmId, { force: true });
    }

    // Delete instance directory
    const vmDir = path.join(this.instanceDir, vmId);
    if (deleteImage) {
      await fs.rm(vmDir, { recursive: true, force: true });
    }

    // Remove from tracking
    this.instances.delete(vmId);
    this.processes.delete(vmId);
  }

  /**
   * Helper: Send command to QEMU monitor
   */
  private async sendMonitorCommand(
    socketPath: string,
    command: string
  ): Promise<MonitorCommandResult> {
    try {
      const { stdout, stderr } = await execAsync(
        `echo "${command}" | socat - UNIX-CONNECT:${socketPath}`
      );
      return { success: true, output: stdout };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Helper: Wait for process to exit
   */
  private waitForProcessExit(
    process: ChildProcess,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Process exit timeout'));
      }, timeout);

      process.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * Helper: Prepare disk image (clone or create overlay)
   */
  private async prepareDiskImage(
    vmDir: string,
    baseImagePath: string,
    clone: boolean
  ): Promise<string> {
    const diskPath = path.join(vmDir, 'disk.qcow2');

    if (clone) {
      // Full clone
      await execAsync(`qemu-img create -f qcow2 -b ${baseImagePath} ${diskPath}`);
    } else {
      // Create overlay (CoW)
      await execAsync(
        `qemu-img create -f qcow2 -F qcow2 -b ${baseImagePath} ${diskPath}`
      );
    }

    return diskPath;
  }

  /**
   * Helper: Allocate available VNC port
   */
  private async allocateVNCPort(): Promise<number> {
    const usedPorts = new Set(
      Array.from(this.instances.values()).map(vm => vm.vncPort)
    );

    for (let port = 5900; port < 6000; port++) {
      if (!usedPorts.has(port)) {
        return port;
      }
    }

    throw new Error('No available VNC ports');
  }

  /**
   * Helper: Generate unique VM ID
   */
  private generateVMId(): string {
    return `vm-${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Check if KVM is available
   */
  async checkKVMSupport(): Promise<boolean> {
    try {
      await fs.access('/dev/kvm', fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get system capabilities
   */
  async getSystemCapabilities(): Promise<{
    kvmSupport: boolean;
    qemuVersion: string;
    cpuModel: string;
    cpuCores: number;
    totalMemoryMB: number;
    vfioSupport: boolean;
  }> {
    const kvmSupport = await this.checkKVMSupport();

    // Get QEMU version
    const { stdout: qemuVersion } = await execAsync('qemu-system-x86_64 --version');

    // Get CPU info
    const { stdout: cpuInfo } = await execAsync('lscpu');
    const cpuLines = cpuInfo.split('\n');
    const cpuModel = cpuLines.find(l => l.startsWith('Model name:'))?.split(':')[1].trim() || 'Unknown';
    const cpuCores = parseInt(cpuLines.find(l => l.startsWith('CPU(s):'))?.split(':')[1].trim() || '0');

    // Get memory info
    const { stdout: memInfo } = await execAsync('free -m');
    const memLines = memInfo.split('\n');
    const totalMemoryMB = parseInt(memLines[1].split(/\s+/)[1]);

    // Check VFIO support
    let vfioSupport = false;
    try {
      await fs.access('/dev/vfio/vfio');
      vfioSupport = true;
    } catch {
      // VFIO not available
    }

    return {
      kvmSupport,
      qemuVersion: qemuVersion.trim(),
      cpuModel,
      cpuCores,
      totalMemoryMB,
      vfioSupport
    };
  }
}

export default QEMUManager;
