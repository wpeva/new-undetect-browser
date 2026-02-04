/**
 * Enhanced Privacy Protection Module
 *
 * PHILOSOPHY: SPOOF, DON'T BLOCK!
 * Everything should look REAL but show FAKE data.
 * Blocking = Suspicious. Spoofing = Undetectable.
 */

import { Page } from 'puppeteer';
import {
  applyWebRTCSpoofing,
  createWebRTCConfigFromProxy,
  WebRTCSpoofConfig,
} from './webrtc-advanced-spoofing';

/**
 * Chrome launch arguments - ABSOLUTE MINIMUM to look like real browser
 */
export function getEnhancedPrivacyArgs(proxyServer?: string): string[] {
  const args = [
    // Essential for stability only
    '--no-sandbox',
    '--disable-setuid-sandbox',

    // Hide automation - the ONLY critical flag
    '--disable-blink-features=AutomationControlled',

    // Language/Locale
    '--lang=en-US',

    // Minimal privacy (these are normal for any browser)
    '--no-first-run',
    '--no-default-browser-check',
  ];

  // Add proxy server if provided
  if (proxyServer) {
    args.push(`--proxy-server=${proxyServer}`);
  }

  return args;
}

/**
 * Enhanced privacy protection options
 */
export interface EnhancedPrivacyOptions {
  /** Proxy IP address for WebRTC spoofing */
  proxyIP?: string;

  /** WebRTC configuration */
  webrtc?: WebRTCSpoofConfig;

  /** Block all WebRTC completely (not recommended - looks suspicious) */
  blockWebRTC?: boolean;

  /** Enable DNS leak protection */
  dnsLeakProtection?: boolean;
}

/**
 * Apply enhanced privacy protection to a page
 * SPOOF everything, don't block!
 */
export async function applyEnhancedPrivacyProtection(
  page: Page,
  options: EnhancedPrivacyOptions = {}
): Promise<void> {
  const { proxyIP, webrtc } = options;

  // ALWAYS apply WebRTC SPOOFING to hide real IPs
  // Use proxy IP if provided, otherwise use default config (hides local IPs)
  const webrtcConfig: WebRTCSpoofConfig = webrtc || createWebRTCConfigFromProxy(proxyIP);
  await applyWebRTCSpoofing(page, webrtcConfig);
}

/**
 * Generate proxy-aware WebRTC config
 */
export function getWebRTCConfigForProxy(proxyIP: string): WebRTCSpoofConfig {
  return createWebRTCConfigFromProxy(proxyIP);
}
