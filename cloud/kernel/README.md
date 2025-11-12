# eBPF Network Fingerprinting

Kernel-level TCP/IP and TLS fingerprint spoofing using eBPF (extended Berkeley Packet Filter).

## Quick Start

```bash
# Install dependencies (Ubuntu/Debian)
sudo apt-get install clang llvm libbpf-dev linux-headers-$(uname -r) bpftool

# Compile eBPF programs
cd cloud/kernel/ebpf
make

# Check eBPF support
npx ts-node ../example.ts 1

# Load TCP fingerprint spoofing
sudo npx ts-node ../example.ts 2

# Run complete workflow
sudo npx ts-node ../example.ts 6
```

## Features

### TCP Fingerprint Spoofing
- ✅ Window Size
- ✅ TTL (Time To Live)
- ✅ MSS (Maximum Segment Size)
- ✅ Window Scale
- ✅ SACK, Timestamps, ECN
- ✅ TCP Fast Open

### JA3 TLS Fingerprint
- ✅ TLS Version
- ✅ Cipher Suites
- ✅ Extensions
- ✅ Elliptic Curves
- ✅ Point Formats

## Usage

```typescript
import { ebpfLoader, getNetworkProfile, OSType, BrowserType } from './cloud/kernel';

// Check support
const supported = await ebpfLoader.checkeBPFSupport();

// Get profile
const profile = getNetworkProfile(OSType.Windows, BrowserType.Chrome);

// Load TCP spoofing
await ebpfLoader.loadTCPFingerprint(profile.tcp);

// Load JA3 spoofing
await ebpfLoader.loadJA3Fingerprint(profile.ja3);

// Get statistics
const stats = await ebpfLoader.getStats('tcp_fingerprint');
console.log(`Modified: ${stats.connectionsModified} connections`);
```

## Structure

```
cloud/kernel/
├── ebpf/
│   ├── tcp_fingerprint.c    # TCP/IP spoofing eBPF program
│   ├── tls_ja3.c             # JA3 TLS spoofing eBPF program
│   └── Makefile              # Compilation
├── loader.ts                 # eBPF program loader
├── types.ts                  # TypeScript types & profiles
├── index.ts                  # Module exports
├── example.ts                # Usage examples
├── __tests__/
│   └── loader.test.ts        # Unit tests
└── README.md                 # This file
```

## Predefined Profiles

### TCP Profiles
- `windows11-chrome` - Windows 11 + Chrome
- `windows10-chrome` - Windows 10 + Chrome
- `macos-safari` - macOS + Safari
- `macos-chrome` - macOS + Chrome
- `linux-chrome` - Linux + Chrome
- `linux-firefox` - Linux + Firefox
- `android-chrome` - Android + Chrome
- `ios-safari` - iOS + Safari

### JA3 Profiles
- `chrome-120-windows` - Chrome 120 on Windows
- `firefox-121-windows` - Firefox 121 on Windows
- `safari-17-macos` - Safari 17 on macOS
- `edge-120-windows` - Edge 120 on Windows

## Requirements

- Linux 4.x+ kernel
- clang/LLVM
- libbpf-dev
- linux-headers
- bpftool
- Root privileges (for loading)

## Testing

```bash
# Run tests
npm test cloud/kernel

# Test on BrowserLeaks
google-chrome https://browserleaks.com/tcp
google-chrome https://browserleaks.com/ssl
```

## Documentation

See [docs/SESSION_8.md](../../docs/SESSION_8.md) for complete documentation.

## License

MIT
