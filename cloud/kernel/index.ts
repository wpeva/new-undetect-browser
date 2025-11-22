/**
 * eBPF Network Fingerprinting Module
 *
 * Provides kernel-level TCP/IP and TLS fingerprint spoofing using eBPF.
 *
 * @example
 * ```typescript
 * import { ebpfLoader, getNetworkProfile, OSType, BrowserType } from './cloud/kernel';
 *
 * // Check eBPF support
 * const supported = await ebpfLoader.checkeBPFSupport();
 *
 * // Get a predefined profile
 * const profile = getNetworkProfile(OSType.Windows, BrowserType.Chrome);
 *
 * // Load TCP fingerprint spoofing
 * await ebpfLoader.loadTCPFingerprint(profile.tcp);
 *
 * // Load JA3 TLS spoofing
 * await ebpfLoader.loadJA3Fingerprint(profile.ja3);
 * ```
 */

// Export main loader
export { eBPFLoader, ebpfLoader } from './loader';

// Export types
export {
  TCPProfile,
  JA3Profile,
  eBPFStats,
  OSType,
  BrowserType,
  NetworkFingerprintConfig,
  TCPProfiles,
  JA3Profiles,
  getNetworkProfile,
  randomizeTCPProfile,
  randomizeJA3Profile
} from './types';

// Export loader types
export type {
  eBPFProgramInfo,
  CompileOptions,
  LoadOptions
} from './loader';
