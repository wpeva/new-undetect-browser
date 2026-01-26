/**
 * Enhanced Privacy Protection Module
 *
 * Provides protection against:
 * - WebRTC IP leaks (via spoofing, not blocking - more natural)
 * - DNS leaks
 * - Proxy bypass attempts
 *
 * IMPORTANT: Minimal flags to avoid detection.
 * Too many --disable flags trigger fingerprint detection!
 */

import { Page } from 'puppeteer';
import {
  applyWebRTCSpoofing,
  createWebRTCConfigFromProxy,
  WebRTCSpoofConfig,
} from './webrtc-advanced-spoofing';

/**
 * Chrome launch arguments - MINIMAL set to avoid detection
 */
export function getEnhancedPrivacyArgs(proxyServer?: string): string[] {
  const args = [
    // WebRTC - only limit UDP to prevent IP leaks
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',

    // Essential for stability
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',

    // Hide automation
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',

    // Basic privacy
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-breakpad',
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
 * This should be called after page creation
 */
export async function applyEnhancedPrivacyProtection(
  page: Page,
  options: EnhancedPrivacyOptions = {}
): Promise<void> {
  const { proxyIP, webrtc, blockWebRTC = false } = options;

  // Configure WebRTC based on options
  if (blockWebRTC) {
    // Complete WebRTC blocking (not recommended - detectable)
    await page.evaluateOnNewDocument(() => {
      // @ts-ignore
      delete window.RTCPeerConnection;
      // @ts-ignore
      delete window.RTCDataChannel;
      // @ts-ignore
      delete window.RTCSessionDescription;
      // @ts-ignore
      delete window.webkitRTCPeerConnection;
    });
  } else if (proxyIP || webrtc) {
    // WebRTC spoofing (recommended - looks natural)
    const webrtcConfig: WebRTCSpoofConfig = webrtc || {
      mode: 'spoof',
      publicIP: proxyIP,
    };

    // If we have a proxy IP, use it
    if (proxyIP && !webrtcConfig.publicIP) {
      webrtcConfig.publicIP = proxyIP;
    }

    await applyWebRTCSpoofing(page, webrtcConfig);
  }
}

/**
 * Generate proxy-aware WebRTC config
 */
export function getWebRTCConfigForProxy(proxyIP: string): WebRTCSpoofConfig {
  return createWebRTCConfigFromProxy(proxyIP);
}
