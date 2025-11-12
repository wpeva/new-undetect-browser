/**
 * Type definitions for eBPF Network Fingerprinting
 */

/**
 * TCP Fingerprint Profile
 *
 * Defines parameters for TCP/IP stack fingerprinting spoofing
 */
export interface TCPProfile {
  /** TCP window size (bytes) */
  windowSize: number;

  /** IP TTL (Time To Live) */
  ttl: number;

  /** TCP Maximum Segment Size */
  mss: number;

  /** TCP window scale factor (0-14) */
  windowScale: number;

  /** SACK (Selective Acknowledgment) permitted */
  sackPermitted: boolean;

  /** TCP timestamps enabled */
  timestamps: boolean;

  /** TCP_NODELAY (disable Nagle's algorithm) */
  noDelay: boolean;

  /** Initial congestion window (segments) */
  initialCongestionWindow: number;

  /** ECN (Explicit Congestion Notification) support */
  ecn: boolean;

  /** TCP Fast Open enabled */
  fastOpen: boolean;
}

/**
 * JA3 TLS Fingerprint Profile
 *
 * Defines TLS Client Hello parameters for JA3 fingerprint spoofing
 */
export interface JA3Profile {
  /** TLS version (0x0301=TLS1.0, 0x0302=TLS1.1, 0x0303=TLS1.2, 0x0304=TLS1.3) */
  tlsVersion: number;

  /** List of cipher suite IDs */
  ciphers: number[];

  /** List of extension IDs */
  extensions: number[];

  /** List of elliptic curve IDs */
  curves: number[];

  /** List of point format IDs */
  formats: number[];

  /** Profile enabled flag */
  enabled: boolean;
}

/**
 * eBPF Statistics
 */
export interface eBPFStats {
  /** Number of connections modified */
  connectionsModified: number;

  /** Number of packets processed */
  packetsProcessed: number;

  /** Number of errors encountered */
  errors: number;
}

/**
 * Operating System Types
 */
export enum OSType {
  Windows = 'windows',
  Linux = 'linux',
  MacOS = 'macos',
  Android = 'android',
  iOS = 'ios'
}

/**
 * Browser Types
 */
export enum BrowserType {
  Chrome = 'chrome',
  Firefox = 'firefox',
  Safari = 'safari',
  Edge = 'edge',
  Opera = 'opera'
}

/**
 * Predefined TCP Profiles for common OS/Browser combinations
 */
export const TCPProfiles: Record<string, TCPProfile> = {
  // Windows 11 + Chrome
  'windows11-chrome': {
    windowSize: 65535,
    ttl: 128,
    mss: 1460,
    windowScale: 8,
    sackPermitted: true,
    timestamps: true,
    noDelay: true,
    initialCongestionWindow: 10,
    ecn: false,
    fastOpen: false
  },

  // Windows 10 + Chrome
  'windows10-chrome': {
    windowSize: 65535,
    ttl: 128,
    mss: 1460,
    windowScale: 8,
    sackPermitted: true,
    timestamps: true,
    noDelay: true,
    initialCongestionWindow: 10,
    ecn: false,
    fastOpen: false
  },

  // macOS + Safari
  'macos-safari': {
    windowSize: 65535,
    ttl: 64,
    mss: 1460,
    windowScale: 6,
    sackPermitted: true,
    timestamps: true,
    noDelay: true,
    initialCongestionWindow: 10,
    ecn: true,
    fastOpen: false
  },

  // macOS + Chrome
  'macos-chrome': {
    windowSize: 65535,
    ttl: 64,
    mss: 1460,
    windowScale: 8,
    sackPermitted: true,
    timestamps: true,
    noDelay: true,
    initialCongestionWindow: 10,
    ecn: false,
    fastOpen: false
  },

  // Linux + Chrome
  'linux-chrome': {
    windowSize: 65535,
    ttl: 64,
    mss: 1460,
    windowScale: 7,
    sackPermitted: true,
    timestamps: true,
    noDelay: true,
    initialCongestionWindow: 10,
    ecn: false,
    fastOpen: false
  },

  // Linux + Firefox
  'linux-firefox': {
    windowSize: 65535,
    ttl: 64,
    mss: 1460,
    windowScale: 7,
    sackPermitted: true,
    timestamps: true,
    noDelay: false,
    initialCongestionWindow: 10,
    ecn: false,
    fastOpen: false
  },

  // Android + Chrome
  'android-chrome': {
    windowSize: 65535,
    ttl: 64,
    mss: 1440,
    windowScale: 8,
    sackPermitted: true,
    timestamps: true,
    noDelay: true,
    initialCongestionWindow: 10,
    ecn: false,
    fastOpen: true
  },

  // iOS + Safari
  'ios-safari': {
    windowSize: 65535,
    ttl: 64,
    mss: 1460,
    windowScale: 6,
    sackPermitted: true,
    timestamps: true,
    noDelay: true,
    initialCongestionWindow: 10,
    ecn: true,
    fastOpen: false
  }
};

/**
 * Predefined JA3 Profiles for common browsers
 */
export const JA3Profiles: Record<string, JA3Profile> = {
  // Chrome 120 on Windows
  'chrome-120-windows': {
    tlsVersion: 0x0303, // TLS 1.2
    ciphers: [
      0x1301, // TLS_AES_128_GCM_SHA256
      0x1302, // TLS_AES_256_GCM_SHA384
      0x1303, // TLS_CHACHA20_POLY1305_SHA256
      0xc02b, // TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
      0xc02f, // TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
      0xc02c, // TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
      0xc030, // TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
      0xcca9, // TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256
      0xcca8, // TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
    ],
    extensions: [
      0,     // server_name
      10,    // supported_groups
      11,    // ec_point_formats
      13,    // signature_algorithms
      16,    // application_layer_protocol_negotiation
      23,    // extended_master_secret
      27,    // compressed_certificate
      35,    // session_ticket
      43,    // supported_versions
      45,    // psk_key_exchange_modes
      51,    // key_share
      65281  // renegotiation_info
    ],
    curves: [
      0x001d, // x25519
      0x0017, // secp256r1
      0x0018, // secp384r1
    ],
    formats: [0], // uncompressed
    enabled: true
  },

  // Firefox 121 on Windows
  'firefox-121-windows': {
    tlsVersion: 0x0303,
    ciphers: [
      0x1301, // TLS_AES_128_GCM_SHA256
      0x1303, // TLS_CHACHA20_POLY1305_SHA256
      0x1302, // TLS_AES_256_GCM_SHA384
      0xc02b, // TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
      0xc02f, // TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
      0xc02c, // TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
      0xc030, // TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
      0xcca9, // TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256
      0xcca8, // TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
    ],
    extensions: [
      0, 10, 11, 13, 16, 23, 35, 43, 45, 51, 65281
    ],
    curves: [
      0x001d, // x25519
      0x0017, // secp256r1
      0x001e, // x448
      0x0018, // secp384r1
      0x0019, // secp521r1
    ],
    formats: [0],
    enabled: true
  },

  // Safari 17 on macOS
  'safari-17-macos': {
    tlsVersion: 0x0303,
    ciphers: [
      0x1301, 0x1302, 0x1303,
      0xc02b, 0xc02f, 0xc02c, 0xc030,
      0xcca9, 0xcca8, 0xc013, 0xc014,
    ],
    extensions: [
      0, 10, 11, 13, 16, 23, 27, 35, 43, 45, 51, 65281
    ],
    curves: [
      0x001d, // x25519
      0x0017, // secp256r1
      0x0018, // secp384r1
      0x0019, // secp521r1
    ],
    formats: [0],
    enabled: true
  },

  // Edge 120 on Windows
  'edge-120-windows': {
    tlsVersion: 0x0303,
    ciphers: [
      0x1301, 0x1302, 0x1303,
      0xc02b, 0xc02f, 0xc02c, 0xc030,
      0xcca9, 0xcca8,
    ],
    extensions: [
      0, 10, 11, 13, 16, 23, 27, 35, 43, 45, 51, 65281
    ],
    curves: [
      0x001d, 0x0017, 0x0018,
    ],
    formats: [0],
    enabled: true
  }
};

/**
 * Network Fingerprint Configuration
 */
export interface NetworkFingerprintConfig {
  /** TCP profile */
  tcp: TCPProfile;

  /** JA3 TLS profile */
  ja3: JA3Profile;

  /** Target process ID (optional) */
  pid?: number;

  /** Target cgroup path (optional) */
  cgroupPath?: string;
}

/**
 * Get a predefined network fingerprint profile
 */
export function getNetworkProfile(os: OSType, browser: BrowserType): NetworkFingerprintConfig {
  const key = `${os}-${browser}`;
  const tcpKey = key.replace('_', '-');
  const ja3Key = `${browser}-120-${os}`;

  return {
    tcp: TCPProfiles[tcpKey] || TCPProfiles['linux-chrome'],
    ja3: JA3Profiles[ja3Key] || JA3Profiles['chrome-120-windows']
  };
}

/**
 * Create a randomized TCP profile based on a template
 */
export function randomizeTCPProfile(base: TCPProfile): TCPProfile {
  const variance = (value: number, percent: number) => {
    const delta = Math.floor(value * percent / 100);
    return value + Math.floor(Math.random() * delta * 2) - delta;
  };

  return {
    ...base,
    windowSize: variance(base.windowSize, 5),
    mss: variance(base.mss, 3),
    initialCongestionWindow: base.initialCongestionWindow + Math.floor(Math.random() * 3),
    // Keep boolean flags the same
  };
}

/**
 * Create a randomized JA3 profile by shuffling non-critical elements
 */
export function randomizeJA3Profile(base: JA3Profile): JA3Profile {
  const shuffleArray = <T>(arr: T[]): T[] => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  return {
    ...base,
    // Shuffle cipher order (some servers accept different orders)
    ciphers: shuffleArray(base.ciphers),
    // Keep extensions in order (some are order-sensitive)
    // Only shuffle curves
    curves: shuffleArray(base.curves),
  };
}
