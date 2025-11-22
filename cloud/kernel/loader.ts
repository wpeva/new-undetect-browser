/**
 * eBPF Program Loader
 *
 * Loads and manages eBPF programs for network fingerprint spoofing.
 * Handles compilation, loading, attachment, and lifecycle management.
 */

import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import { TCPProfile, JA3Profile, eBPFStats } from './types';

const execAsync = promisify(exec);

export interface eBPFProgramInfo {
  fd: number;
  name: string;
  type: string;
  loaded: boolean;
  attached: boolean;
  attachPoint?: string;
}

export interface CompileOptions {
  optimization?: number;  // -O0, -O1, -O2, -O3
  target?: string;        // bpf, bpfel, bpfeb
  debug?: boolean;
  includes?: string[];
}

export interface LoadOptions {
  progType?: string;      // sockops, socket, classifier, etc.
  section?: string;       // SEC() name from C code
  pinPath?: string;       // Pin to BPF filesystem
  cgroupPath?: string;    // Cgroup to attach to
}

export class eBPFLoader {
  private loadedPrograms: Map<string, eBPFProgramInfo> = new Map();
  private ebpfBasePath: string;
  private bpfFsPath: string = '/sys/fs/bpf';
  private cgroupPath: string = '/sys/fs/cgroup';

  constructor(basePath?: string) {
    this.ebpfBasePath = basePath || path.join(__dirname, 'ebpf');
  }

  /**
   * Check if eBPF is supported on this system
   */
  async checkeBPFSupport(): Promise<boolean> {
    try {
      // Check if BPF syscall is available
      const { stdout } = await execAsync('which bpftool');
      if (!stdout) {
        console.warn('bpftool not found. Install with: apt-get install linux-tools-common');
        return false;
      }

      // Check kernel version (eBPF requires 4.x+)
      const { stdout: kernelVersion } = await execAsync('uname -r');
      const [major] = kernelVersion.split('.').map(Number);
      if (major < 4) {
        console.warn(`Kernel ${kernelVersion} is too old. eBPF requires 4.x+`);
        return false;
      }

      // Check if BPF filesystem is mounted
      try {
        await fs.access(this.bpfFsPath);
      } catch {
        console.warn('BPF filesystem not mounted. Mounting...');
        await execAsync(`sudo mount -t bpf bpffs ${this.bpfFsPath}`);
      }

      return true;
    } catch (error) {
      console.error('eBPF support check failed:', error);
      return false;
    }
  }

  /**
   * Compile eBPF C program to object file
   */
  async compile(
    sourcePath: string,
    outputPath?: string,
    options: CompileOptions = {}
  ): Promise<string> {
    const {
      optimization = 2,
      target = 'bpf',
      debug = false,
      includes = []
    } = options;

    const source = path.join(this.ebpfBasePath, sourcePath);
    const output = outputPath || source.replace('.c', '.o');

    // Check if source exists
    try {
      await fs.access(source);
    } catch {
      throw new Error(`Source file not found: ${source}`);
    }

    // Build clang command
    const args = [
      `-O${optimization}`,
      '-target', target,
      '-g',  // Always include debug info for verifier
      '-c', source,
      '-o', output,
      // Standard includes
      '-I/usr/include',
      '-I/usr/include/x86_64-linux-gnu',
      // BPF includes
      '-I/usr/include/bpf',
      '-I/usr/include/linux',
      // Custom includes
      ...includes.map(inc => `-I${inc}`),
      // Defines
      '-D__BPF_TRACING__',
      '-D__TARGET_ARCH_x86',
      // Warnings
      '-Wall',
      '-Werror'
    ];

    if (debug) {
      args.push('-DDEBUG');
    }

    return new Promise((resolve, reject) => {
      console.log(`Compiling ${sourcePath}...`);
      const clang = spawn('clang', args);

      let stderr = '';
      clang.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      clang.on('close', (code) => {
        if (code === 0) {
          console.log(`✓ Compiled: ${output}`);
          resolve(output);
        } else {
          console.error('Compilation failed:');
          console.error(stderr);
          reject(new Error(`Compilation failed with code ${code}`));
        }
      });

      clang.on('error', (error) => {
        reject(new Error(`Failed to spawn clang: ${error.message}`));
      });
    });
  }

  /**
   * Load eBPF program into kernel
   */
  async load(
    objectPath: string,
    options: LoadOptions = {}
  ): Promise<eBPFProgramInfo> {
    const {
      section = 'sockops',
      pinPath,
      progType
    } = options;

    const fullPath = path.isAbsolute(objectPath)
      ? objectPath
      : path.join(this.ebpfBasePath, objectPath);

    // Verify object file exists
    try {
      await fs.access(fullPath);
    } catch {
      throw new Error(`Object file not found: ${fullPath}`);
    }

    // Pin path for the program
    const pinLocation = pinPath || path.join(this.bpfFsPath, path.basename(objectPath, '.o'));

    try {
      // Load using bpftool
      const cmd = `bpftool prog load ${fullPath} ${pinLocation} type ${progType || section}`;
      console.log(`Loading: ${cmd}`);

      const { stdout, stderr } = await execAsync(cmd);

      // Get program ID from bpftool
      const { stdout: listOutput } = await execAsync(`bpftool prog show pinned ${pinLocation}`);
      const match = listOutput.match(/id (\d+)/);

      if (!match) {
        throw new Error('Failed to get program ID');
      }

      const progInfo: eBPFProgramInfo = {
        fd: parseInt(match[1], 10),
        name: path.basename(objectPath, '.o'),
        type: section,
        loaded: true,
        attached: false
      };

      this.loadedPrograms.set(progInfo.name, progInfo);

      console.log(`✓ Loaded program ${progInfo.name} (ID: ${progInfo.fd})`);
      return progInfo;
    } catch (error) {
      throw new Error(`Failed to load eBPF program: ${error}`);
    }
  }

  /**
   * Attach eBPF program to cgroup
   */
  async attachToCgroup(
    programName: string,
    cgroupPath?: string,
    attachType: string = 'sock_ops'
  ): Promise<void> {
    const prog = this.loadedPrograms.get(programName);
    if (!prog) {
      throw new Error(`Program ${programName} not loaded`);
    }

    const cgroup = cgroupPath || this.cgroupPath;
    const pinPath = path.join(this.bpfFsPath, programName);

    try {
      const cmd = `bpftool cgroup attach ${cgroup} ${attachType} pinned ${pinPath}`;
      console.log(`Attaching: ${cmd}`);

      await execAsync(cmd);

      prog.attached = true;
      prog.attachPoint = cgroup;

      console.log(`✓ Attached ${programName} to ${cgroup}`);
    } catch (error) {
      throw new Error(`Failed to attach to cgroup: ${error}`);
    }
  }

  /**
   * Detach eBPF program from cgroup
   */
  async detachFromCgroup(
    programName: string,
    cgroupPath?: string,
    attachType: string = 'sock_ops'
  ): Promise<void> {
    const prog = this.loadedPrograms.get(programName);
    if (!prog) {
      throw new Error(`Program ${programName} not loaded`);
    }

    const cgroup = cgroupPath || this.cgroupPath;
    const pinPath = path.join(this.bpfFsPath, programName);

    try {
      const cmd = `bpftool cgroup detach ${cgroup} ${attachType} pinned ${pinPath}`;
      await execAsync(cmd);

      prog.attached = false;
      prog.attachPoint = undefined;

      console.log(`✓ Detached ${programName} from ${cgroup}`);
    } catch (error) {
      throw new Error(`Failed to detach from cgroup: ${error}`);
    }
  }

  /**
   * Update TCP profile in BPF map
   */
  async updateTCPProfile(pid: number, profile: TCPProfile): Promise<void> {
    const mapPath = path.join(this.bpfFsPath, 'tcp_profiles');

    // Create binary representation of profile
    const buffer = Buffer.alloc(32);  // Size of struct tcp_profile
    let offset = 0;

    buffer.writeUInt16LE(profile.windowSize || 65535, offset); offset += 2;
    buffer.writeUInt8(profile.ttl || 64, offset); offset += 1;
    offset += 1; // padding
    buffer.writeUInt16LE(profile.mss || 1460, offset); offset += 2;
    buffer.writeUInt8(profile.windowScale || 8, offset); offset += 1;
    buffer.writeUInt8(profile.sackPermitted ? 1 : 0, offset); offset += 1;
    buffer.writeUInt8(profile.timestamps ? 1 : 0, offset); offset += 1;
    buffer.writeUInt8(profile.noDelay ? 1 : 0, offset); offset += 1;
    buffer.writeUInt32LE(profile.initialCongestionWindow || 10, offset); offset += 4;
    buffer.writeUInt8(profile.ecn ? 1 : 0, offset); offset += 1;
    buffer.writeUInt8(profile.fastOpen ? 1 : 0, offset); offset += 1;

    // Write to temporary file
    const tmpFile = `/tmp/tcp_profile_${pid}`;
    await fs.writeFile(tmpFile, buffer);

    try {
      // Update map using bpftool
      const keyBuf = Buffer.alloc(4);
      keyBuf.writeUInt32LE(pid, 0);
      await fs.writeFile(`${tmpFile}_key`, keyBuf);

      await execAsync(`bpftool map update pinned ${mapPath} key hex ${keyBuf.toString('hex')} value hex ${buffer.toString('hex')}`);

      console.log(`✓ Updated TCP profile for PID ${pid}`);
    } finally {
      // Cleanup
      await fs.unlink(tmpFile).catch(() => {});
      await fs.unlink(`${tmpFile}_key`).catch(() => {});
    }
  }

  /**
   * Update JA3 profile in BPF map
   */
  async updateJA3Profile(pid: number, profile: JA3Profile): Promise<void> {
    const mapPath = path.join(this.bpfFsPath, 'ja3_profiles');

    // Create binary representation
    // This is a simplified version - full implementation would need exact struct layout
    const buffer = Buffer.alloc(512);  // Size of struct ja3_profile
    let offset = 0;

    buffer.writeUInt16LE(profile.tlsVersion || 0x0303, offset); offset += 2;
    buffer.writeUInt16LE(profile.ciphers.length, offset); offset += 2;

    // Write cipher suites
    for (let i = 0; i < Math.min(profile.ciphers.length, 64); i++) {
      buffer.writeUInt16LE(profile.ciphers[i], offset);
      offset += 2;
    }

    // Similar for extensions, curves, formats...
    // (truncated for brevity)

    const tmpFile = `/tmp/ja3_profile_${pid}`;
    await fs.writeFile(tmpFile, buffer);

    try {
      const keyBuf = Buffer.alloc(4);
      keyBuf.writeUInt32LE(pid, 0);

      await execAsync(`bpftool map update pinned ${mapPath} key hex ${keyBuf.toString('hex')} value hex ${buffer.toString('hex')}`);

      console.log(`✓ Updated JA3 profile for PID ${pid}`);
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }

  /**
   * Load TCP fingerprint program
   */
  async loadTCPFingerprint(profile: TCPProfile, pid?: number): Promise<eBPFProgramInfo> {
    // Compile
    const objectFile = await this.compile('tcp_fingerprint.c', undefined, {
      optimization: 2,
      debug: false
    });

    // Load
    const progInfo = await this.load(objectFile, {
      section: 'sockops',
      progType: 'sockops'
    });

    // Attach to cgroup
    await this.attachToCgroup(progInfo.name);

    // Update profile
    const targetPid = pid || process.pid;
    await this.updateTCPProfile(targetPid, profile);

    return progInfo;
  }

  /**
   * Load JA3 fingerprint program
   */
  async loadJA3Fingerprint(profile: JA3Profile, pid?: number): Promise<eBPFProgramInfo> {
    // Compile
    const objectFile = await this.compile('tls_ja3.c', undefined, {
      optimization: 2,
      debug: false
    });

    // Load
    const progInfo = await this.load(objectFile, {
      section: 'sockops',
      progType: 'sockops'
    });

    // Attach
    await this.attachToCgroup(progInfo.name);

    // Update profile
    const targetPid = pid || process.pid;
    await this.updateJA3Profile(targetPid, profile);

    return progInfo;
  }

  /**
   * Get statistics from eBPF program
   */
  async getStats(programName: string): Promise<eBPFStats | null> {
    const mapPath = path.join(this.bpfFsPath, `${programName}_stats`);

    try {
      const { stdout } = await execAsync(`bpftool map dump pinned ${mapPath} -j`);
      const data = JSON.parse(stdout);

      return {
        connectionsModified: data[0]?.value?.[0] || 0,
        packetsProcessed: data[0]?.value?.[1] || 0,
        errors: data[0]?.value?.[2] || 0
      };
    } catch (error) {
      console.error(`Failed to get stats: ${error}`);
      return null;
    }
  }

  /**
   * Unload eBPF program
   */
  async unload(programName: string): Promise<void> {
    const prog = this.loadedPrograms.get(programName);
    if (!prog) {
      console.warn(`Program ${programName} not found`);
      return;
    }

    try {
      // Detach if attached
      if (prog.attached && prog.attachPoint) {
        await this.detachFromCgroup(programName);
      }

      // Unpin
      const pinPath = path.join(this.bpfFsPath, programName);
      await execAsync(`rm -f ${pinPath}`);

      this.loadedPrograms.delete(programName);
      console.log(`✓ Unloaded ${programName}`);
    } catch (error) {
      console.error(`Failed to unload ${programName}:`, error);
    }
  }

  /**
   * Unload all programs
   */
  async unloadAll(): Promise<void> {
    const programs = Array.from(this.loadedPrograms.keys());
    for (const name of programs) {
      await this.unload(name);
    }
  }

  /**
   * Get list of loaded programs
   */
  getLoadedPrograms(): eBPFProgramInfo[] {
    return Array.from(this.loadedPrograms.values());
  }

  /**
   * Get installation instructions
   */
  static getInstallationInstructions(): string {
    return `
eBPF Requirements Installation:

Ubuntu/Debian:
  sudo apt-get update
  sudo apt-get install -y \\
    clang llvm \\
    libbpf-dev \\
    linux-headers-$(uname -r) \\
    linux-tools-common \\
    linux-tools-$(uname -r)

  # Mount BPF filesystem
  sudo mount -t bpf bpffs /sys/fs/bpf

RHEL/CentOS:
  sudo yum install -y \\
    clang llvm \\
    libbpf-devel \\
    kernel-devel \\
    bpftool

Arch Linux:
  sudo pacman -S clang llvm libbpf bpf linux-headers

Verify Installation:
  clang --version
  bpftool version
  ls /sys/fs/bpf
`;
  }
}

// Export singleton instance
export const ebpfLoader = new eBPFLoader();

// Export types
export * from './types';
