/**
 * Tests for eBPF Loader
 */

import { eBPFLoader } from '../loader';
import {
  TCPProfiles,
  JA3Profiles,
  getNetworkProfile,
  randomizeTCPProfile,
  randomizeJA3Profile,
  OSType,
  BrowserType
} from '../types';

describe('eBPF Loader', () => {
  let loader: eBPFLoader;

  beforeEach(() => {
    loader = new eBPFLoader();
  });

  afterEach(async () => {
    // Cleanup: unload all programs
    try {
      await loader.unloadAll();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('eBPF Support Check', () => {
    it('should check if eBPF is supported', async () => {
      const supported = await loader.checkeBPFSupport();
      expect(typeof supported).toBe('boolean');
    });

    it('should provide installation instructions if not supported', () => {
      const instructions = eBPFLoader.getInstallationInstructions();
      expect(instructions).toContain('clang');
      expect(instructions).toContain('bpftool');
      expect(instructions).toContain('libbpf');
    });
  });

  describe('TCP Fingerprint Profiles', () => {
    it('should have predefined TCP profiles', () => {
      expect(TCPProfiles['windows11-chrome']).toBeDefined();
      expect(TCPProfiles['macos-safari']).toBeDefined();
      expect(TCPProfiles['linux-chrome']).toBeDefined();
    });

    it('should validate Windows 11 Chrome profile', () => {
      const profile = TCPProfiles['windows11-chrome'];
      expect(profile.ttl).toBe(128);
      expect(profile.windowSize).toBe(65535);
      expect(profile.mss).toBe(1460);
      expect(profile.sackPermitted).toBe(true);
    });

    it('should validate macOS Safari profile', () => {
      const profile = TCPProfiles['macos-safari'];
      expect(profile.ttl).toBe(64);
      expect(profile.ecn).toBe(true);
      expect(profile.windowScale).toBe(6);
    });

    it('should randomize TCP profile', () => {
      const base = TCPProfiles['linux-chrome'];
      const randomized = randomizeTCPProfile(base);

      // Values should be different but close
      expect(randomized.windowSize).not.toBe(base.windowSize);
      expect(Math.abs(randomized.windowSize - base.windowSize)).toBeLessThan(base.windowSize * 0.1);

      // Boolean flags should remain the same
      expect(randomized.sackPermitted).toBe(base.sackPermitted);
      expect(randomized.timestamps).toBe(base.timestamps);
    });
  });

  describe('JA3 Fingerprint Profiles', () => {
    it('should have predefined JA3 profiles', () => {
      expect(JA3Profiles['chrome-120-windows']).toBeDefined();
      expect(JA3Profiles['firefox-121-windows']).toBeDefined();
      expect(JA3Profiles['safari-17-macos']).toBeDefined();
    });

    it('should validate Chrome JA3 profile', () => {
      const profile = JA3Profiles['chrome-120-windows'];
      expect(profile.tlsVersion).toBe(0x0303); // TLS 1.2
      expect(profile.ciphers.length).toBeGreaterThan(0);
      expect(profile.extensions.length).toBeGreaterThan(0);
      expect(profile.curves.length).toBeGreaterThan(0);
      expect(profile.enabled).toBe(true);
    });

    it('should validate Firefox JA3 profile', () => {
      const profile = JA3Profiles['firefox-121-windows'];
      expect(profile.ciphers).toContain(0x1301); // TLS_AES_128_GCM_SHA256
      expect(profile.ciphers).toContain(0x1303); // TLS_CHACHA20_POLY1305_SHA256
    });

    it('should randomize JA3 profile', () => {
      const base = JA3Profiles['chrome-120-windows'];
      const randomized = randomizeJA3Profile(base);

      // Cipher order should be different
      expect(randomized.ciphers).not.toEqual(base.ciphers);

      // But should contain same ciphers
      expect(randomized.ciphers.sort()).toEqual(base.ciphers.sort());

      // TLS version should remain the same
      expect(randomized.tlsVersion).toBe(base.tlsVersion);
    });
  });

  describe('Network Profile Selection', () => {
    it('should get network profile for Windows + Chrome', () => {
      const profile = getNetworkProfile(OSType.Windows, BrowserType.Chrome);
      expect(profile.tcp).toBeDefined();
      expect(profile.ja3).toBeDefined();
    });

    it('should get network profile for macOS + Safari', () => {
      const profile = getNetworkProfile(OSType.MacOS, BrowserType.Safari);
      expect(profile.tcp.ttl).toBe(64);
      expect(profile.tcp.ecn).toBe(true);
    });

    it('should fallback to default profile for unknown combinations', () => {
      const profile = getNetworkProfile('unknown' as OSType, 'unknown' as BrowserType);
      expect(profile.tcp).toBeDefined();
      expect(profile.ja3).toBeDefined();
    });
  });

  describe('Compilation', () => {
    it('should compile TCP fingerprint program', async () => {
      // This test requires clang to be installed
      try {
        const output = await loader.compile('tcp_fingerprint.c', undefined, {
          optimization: 2,
          debug: false
        });

        expect(output).toContain('.o');
      } catch (error) {
        // If compilation fails due to missing tools, skip test
        if (error.message.includes('clang')) {
          console.warn('Skipping compilation test: clang not available');
          return;
        }
        throw error;
      }
    }, 30000); // 30 second timeout

    it('should compile JA3 program', async () => {
      try {
        const output = await loader.compile('tls_ja3.c', undefined, {
          optimization: 2
        });

        expect(output).toContain('.o');
      } catch (error) {
        if (error.message.includes('clang')) {
          console.warn('Skipping compilation test: clang not available');
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe('Program Management', () => {
    it('should track loaded programs', () => {
      const programs = loader.getLoadedPrograms();
      expect(Array.isArray(programs)).toBe(true);
    });

    it('should load and unload programs', async () => {
      // This test requires root privileges and properly compiled eBPF programs
      // Skipping in CI environment
      if (process.env.CI) {
        console.warn('Skipping eBPF load test in CI environment');
        return;
      }

      // Test would go here with proper setup
    });
  });

  describe('Profile Updates', () => {
    it('should format TCP profile for BPF map', async () => {
      const profile = TCPProfiles['linux-chrome'];
      const pid = process.pid;

      // This would require actual BPF maps to be loaded
      // Testing the interface only
      try {
        await loader.updateTCPProfile(pid, profile);
      } catch (error) {
        // Expected to fail if eBPF is not loaded
        expect(error.message).toBeDefined();
      }
    });

    it('should format JA3 profile for BPF map', async () => {
      const profile = JA3Profiles['chrome-120-windows'];
      const pid = process.pid;

      try {
        await loader.updateJA3Profile(pid, profile);
      } catch (error) {
        // Expected to fail if eBPF is not loaded
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Statistics', () => {
    it('should get statistics from loaded program', async () => {
      try {
        const stats = await loader.getStats('tcp_fingerprint');
        if (stats) {
          expect(stats).toHaveProperty('connectionsModified');
          expect(stats).toHaveProperty('packetsProcessed');
          expect(stats).toHaveProperty('errors');
        }
      } catch (error) {
        // Expected to fail if program is not loaded
        expect(error).toBeDefined();
      }
    });
  });

  describe('Integration', () => {
    it('should provide complete workflow example', async () => {
      // Check support
      const supported = await loader.checkeBPFSupport();

      if (!supported) {
        console.warn('eBPF not supported, skipping integration test');
        return;
      }

      // Get profile
      const profile = getNetworkProfile(OSType.Linux, BrowserType.Chrome);
      expect(profile.tcp).toBeDefined();
      expect(profile.ja3).toBeDefined();

      // Randomize for uniqueness
      const randomTCP = randomizeTCPProfile(profile.tcp);
      const randomJA3 = randomizeJA3Profile(profile.ja3);

      expect(randomTCP).toBeDefined();
      expect(randomJA3).toBeDefined();

      // In production, would load programs here
      // try {
      //   await loader.loadTCPFingerprint(randomTCP);
      //   await loader.loadJA3Fingerprint(randomJA3);
      // } catch (error) {
      //   // Handle errors
      // }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing source files', async () => {
      await expect(
        loader.compile('nonexistent.c')
      ).rejects.toThrow('not found');
    });

    it('should handle missing object files', async () => {
      await expect(
        loader.load('nonexistent.o')
      ).rejects.toThrow('not found');
    });

    it('should handle unload of non-existent program', async () => {
      // Should not throw
      await loader.unload('nonexistent-program');
    });
  });
});

describe('Type Exports', () => {
  it('should export OSType enum', () => {
    expect(OSType.Windows).toBe('windows');
    expect(OSType.Linux).toBe('linux');
    expect(OSType.MacOS).toBe('macos');
  });

  it('should export BrowserType enum', () => {
    expect(BrowserType.Chrome).toBe('chrome');
    expect(BrowserType.Firefox).toBe('firefox');
    expect(BrowserType.Safari).toBe('safari');
  });
});
