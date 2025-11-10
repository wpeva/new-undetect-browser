/**
 * Type definitions for advanced features
 * Extends base types for Multilogin-level functionality
 */

/**
 * Proxy configuration (re-export to avoid conflicts)
 */
export interface AdvancedProxyConfig {
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  enabled: boolean;
  country?: string;
  city?: string;
  isp?: string;
}

/**
 * Cookie data (re-export to avoid conflicts)
 */
export interface AdvancedCookieData {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Enhanced fingerprint options
 */
export interface EnhancedFingerprintOptions {
  os?: 'windows' | 'mac' | 'linux';
  browser?: 'chrome' | 'firefox' | 'edge';
  deviceType?: 'desktop' | 'laptop' | 'tablet';
  screen?: {
    width: number;
    height: number;
  };
  timezone?: string;
  locale?: string;
  userAgent?: string;
}

/**
 * Enhanced fingerprint result matching base FingerprintProfile
 */
export interface EnhancedFingerprintResult {
  userAgent: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  timezone: string;
  locale: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    availWidth: number;
    availHeight: number;
  };
  canvas: {
    noise: number;
  };
  webgl: {
    vendor: string;
    renderer: string;
  };
  audio: {
    noise: number;
  };
  fonts: string[];
}
