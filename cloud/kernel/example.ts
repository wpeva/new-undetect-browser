/**
 * eBPF Network Fingerprinting Examples
 *
 * Demonstrates how to use eBPF for TCP/IP and TLS fingerprint spoofing
 */

import {
  ebpfLoader,
  getNetworkProfile,
  randomizeTCPProfile,
  randomizeJA3Profile,
  OSType,
  BrowserType,
  TCPProfiles,
  JA3Profiles
} from './index';

/**
 * Example 1: Check eBPF Support
 */
export async function example1_CheckSupport() {
  console.log('=== Example 1: Check eBPF Support ===\n');

  const supported = await ebpfLoader.checkeBPFSupport();

  if (supported) {
    console.log('✓ eBPF is supported on this system');
    console.log('✓ Kernel version is compatible');
    console.log('✓ BPF filesystem is mounted');
  } else {
    console.log('✗ eBPF is not supported');
    console.log('\nInstallation instructions:');
    console.log('Please install eBPF requirements for your system');
  }
}

/**
 * Example 2: Load TCP Fingerprint Spoofing
 */
export async function example2_TCPFingerprint() {
  console.log('\n=== Example 2: TCP Fingerprint Spoofing ===\n');

  try {
    // Get Windows 11 + Chrome profile
    const profile = TCPProfiles['windows11-chrome'];

    if (!profile) {
      throw new Error('Profile not found');
    }

    console.log('TCP Profile:');
    console.log(`  Window Size: ${profile.windowSize}`);
    console.log(`  TTL: ${profile.ttl}`);
    console.log(`  MSS: ${profile.mss}`);
    console.log(`  Window Scale: ${profile.windowScale}`);
    console.log(`  SACK: ${profile.sackPermitted}`);
    console.log(`  Timestamps: ${profile.timestamps}`);
    console.log(`  ECN: ${profile.ecn}`);

    // Load eBPF program
    console.log('\nCompiling and loading TCP fingerprint program...');
    const progInfo = await ebpfLoader.loadTCPFingerprint(profile);

    console.log(`✓ Loaded: ${progInfo.name}`);
    console.log(`✓ Program ID: ${progInfo.fd}`);
    console.log(`✓ Type: ${progInfo.type}`);
    console.log(`✓ Attached: ${progInfo.attached}`);

    // Get statistics
    const stats = await ebpfLoader.getStats('tcp_fingerprint');
    if (stats) {
      console.log('\nStatistics:');
      console.log(`  Connections modified: ${stats.connectionsModified}`);
      console.log(`  Packets processed: ${stats.packetsProcessed}`);
      console.log(`  Errors: ${stats.errors}`);
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

/**
 * Example 3: Load JA3 TLS Fingerprint Spoofing
 */
export async function example3_JA3Fingerprint() {
  console.log('\n=== Example 3: JA3 TLS Fingerprint Spoofing ===\n');

  try {
    // Get Chrome profile
    const profile = JA3Profiles['chrome-120-windows'];

    if (!profile) {
      throw new Error('Profile not found');
    }

    console.log('JA3 Profile:');
    console.log(`  TLS Version: 0x${profile.tlsVersion.toString(16)}`);
    console.log(`  Ciphers: ${profile.ciphers.length}`);
    console.log(`  Extensions: ${profile.extensions.length}`);
    console.log(`  Curves: ${profile.curves.length}`);

    // Show some ciphers
    console.log('\nCipher Suites:');
    profile.ciphers.slice(0, 5).forEach(cipher => {
      console.log(`  - 0x${cipher.toString(16).padStart(4, '0')}`);
    });

    // Load eBPF program
    console.log('\nCompiling and loading JA3 program...');
    const progInfo = await ebpfLoader.loadJA3Fingerprint(profile);

    console.log(`✓ Loaded: ${progInfo.name}`);
    console.log(`✓ Program ID: ${progInfo.fd}`);
  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

/**
 * Example 4: Use Predefined OS/Browser Profiles
 */
export async function example4_PredefinedProfiles() {
  console.log('\n=== Example 4: Predefined Profiles ===\n');

  const combinations = [
    { os: OSType.Windows, browser: BrowserType.Chrome },
    { os: OSType.MacOS, browser: BrowserType.Safari },
    { os: OSType.Linux, browser: BrowserType.Firefox },
  ];

  for (const { os, browser } of combinations) {
    const profile = getNetworkProfile(os, browser);

    console.log(`${os} + ${browser}:`);
    console.log(`  TCP TTL: ${profile.tcp.ttl}`);
    console.log(`  TCP Window: ${profile.tcp.windowSize}`);
    console.log(`  TLS Version: 0x${profile.ja3.tlsVersion.toString(16)}`);
    console.log(`  Ciphers: ${profile.ja3.ciphers.length}`);
    console.log();
  }
}

/**
 * Example 5: Randomize Fingerprints
 */
export async function example5_RandomizeFingerprints() {
  console.log('\n=== Example 5: Randomize Fingerprints ===\n');

  // Base profile
  const baseTCP = TCPProfiles['linux-chrome'];
  const baseJA3 = JA3Profiles['chrome-120-windows'];

  if (!baseTCP) {
    console.log('TCP profile not found');
    return;
  }

  if (!baseJA3) {
    console.log('JA3 profile not found');
    return;
  }

  console.log('Original TCP Profile:');
  console.log(`  Window Size: ${baseTCP.windowSize}`);
  console.log(`  MSS: ${baseTCP.mss}`);
  console.log(`  Initial CWnd: ${baseTCP.initialCongestionWindow}`);

  // Randomize 3 times
  console.log('\nRandomized variations:');
  for (let i = 1; i <= 3; i++) {
    const randomized = randomizeTCPProfile(baseTCP);
    console.log(`\nVariation ${i}:`);
    console.log(`  Window Size: ${randomized.windowSize}`);
    console.log(`  MSS: ${randomized.mss}`);
    console.log(`  Initial CWnd: ${randomized.initialCongestionWindow}`);
  }

  // Randomize JA3
  console.log('\n\nOriginal JA3 cipher order:');
  console.log(baseJA3.ciphers.slice(0, 5).map(c => `0x${c.toString(16)}`).join(', '));

  const randomizedJA3 = randomizeJA3Profile(baseJA3);
  console.log('\nRandomized cipher order:');
  console.log(randomizedJA3.ciphers.slice(0, 5).map(c => `0x${c.toString(16)}`).join(', '));
}

/**
 * Example 6: Complete Workflow
 */
export async function example6_CompleteWorkflow() {
  console.log('\n=== Example 6: Complete Workflow ===\n');

  try {
    // 1. Check support
    console.log('Step 1: Checking eBPF support...');
    const supported = await ebpfLoader.checkeBPFSupport();
    if (!supported) {
      console.log('✗ eBPF not supported. Exiting.');
      return;
    }
    console.log('✓ eBPF supported\n');

    // 2. Select profile
    console.log('Step 2: Selecting fingerprint profile...');
    const profile = getNetworkProfile(OSType.Windows, BrowserType.Chrome);
    console.log(`✓ Profile: Windows 11 + Chrome\n`);

    // 3. Randomize for uniqueness
    console.log('Step 3: Randomizing fingerprint...');
    const tcpProfile = randomizeTCPProfile(profile.tcp);
    const ja3Profile = randomizeJA3Profile(profile.ja3);
    console.log('✓ Fingerprint randomized\n');

    // 4. Load TCP spoofing
    console.log('Step 4: Loading TCP fingerprint spoofing...');
    const tcpProg = await ebpfLoader.loadTCPFingerprint(tcpProfile);
    console.log(`✓ TCP program loaded (ID: ${tcpProg.fd})\n`);

    // 5. Load JA3 spoofing
    console.log('Step 5: Loading JA3 fingerprint spoofing...');
    const ja3Prog = await ebpfLoader.loadJA3Fingerprint(ja3Profile);
    console.log(`✓ JA3 program loaded (ID: ${ja3Prog.fd})\n`);

    // 6. Show loaded programs
    console.log('Step 6: Loaded programs:');
    const programs = ebpfLoader.getLoadedPrograms();
    programs.forEach(prog => {
      console.log(`  - ${prog.name}: ${prog.attached ? 'attached' : 'loaded'}`);
    });

    console.log('\n✓ Network fingerprinting is active!');
    console.log('\nYou can now:');
    console.log('  - Launch a browser');
    console.log('  - Visit browserleaks.com/tcp');
    console.log('  - Visit browserleaks.com/ssl');
    console.log('  - Verify spoofed fingerprints');

    // Keep running for 60 seconds
    console.log('\nRunning for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    // 7. Cleanup
    console.log('\nStep 7: Cleaning up...');
    await ebpfLoader.unloadAll();
    console.log('✓ All programs unloaded');

  } catch (error) {
    console.error('Error:', (error as Error).message);
    console.error('\nMake sure you:');
    console.error('  1. Run as root (sudo)');
    console.error('  2. Have clang and bpftool installed');
    console.error('  3. Have BPF filesystem mounted');
  }
}

/**
 * Example 7: Test with Specific Browser Process
 */
export async function example7_SpecificProcess() {
  console.log('\n=== Example 7: Target Specific Process ===\n');

  try {
    // Get Chrome PID
    const { execSync } = require('child_process');
    const chromePid = execSync('pgrep -f chrome | head -1').toString().trim();

    if (!chromePid) {
      console.log('Chrome is not running. Please start Chrome first.');
      return;
    }

    console.log(`Found Chrome process: PID ${chromePid}`);

    // Load profile for this specific PID
    const profile = TCPProfiles['linux-chrome'];
    if (!profile) {
      throw new Error('Profile not found');
    }
    await ebpfLoader.loadTCPFingerprint(profile, parseInt(chromePid));

    console.log(`✓ TCP fingerprinting applied to PID ${chromePid}`);
    console.log('\nNow all connections from this Chrome process will be spoofed!');

  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log('eBPF Network Fingerprinting Examples');
  console.log('=====================================\n');

  const examples = [
    { name: 'Check Support', fn: example1_CheckSupport },
    { name: 'TCP Fingerprint', fn: example2_TCPFingerprint },
    { name: 'JA3 Fingerprint', fn: example3_JA3Fingerprint },
    { name: 'Predefined Profiles', fn: example4_PredefinedProfiles },
    { name: 'Randomize', fn: example5_RandomizeFingerprints },
    { name: 'Complete Workflow', fn: example6_CompleteWorkflow },
    { name: 'Specific Process', fn: example7_SpecificProcess },
  ];

  // Run based on command line argument
  const exampleNum = parseInt(process.argv[2] || '0') || 0;

  if (exampleNum > 0 && exampleNum <= examples.length) {
    // Run specific example
    const example = examples[exampleNum - 1];
    if (example) {
      console.log(`Running: ${example.name}\n`);
      await example.fn();
    }
  } else {
    // Show menu
    console.log('Usage: npx ts-node cloud/kernel/example.ts [number]\n');
    console.log('Available examples:');
    examples.forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.name}`);
    });
    console.log('\nExample:');
    console.log('  npx ts-node cloud/kernel/example.ts 1\n');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
