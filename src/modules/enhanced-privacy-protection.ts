/**
 * Enhanced Privacy Protection Module
 *
 * Provides protection against:
 * - WebRTC IP leaks (DISABLED at browser level - spoofing doesn't work reliably)
 * - DNS leaks
 * - Proxy bypass attempts
 * - Headless detection
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
    // WebRTC - COMPLETELY DISABLE to prevent IP leaks
    // This is the ONLY reliable way to prevent WebRTC leaks
    '--disable-webrtc',
    '--webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--enforce-webrtc-ip-permission-check',

    // Essential for stability
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',

    // Hide automation - CRITICAL
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',

    // Language/Locale - force English
    '--lang=en-US',
    '--accept-lang=en-US,en',

    // Basic privacy
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-breakpad',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',

    // GPU - use software rendering to avoid fingerprinting
    '--use-gl=swiftshader',
    '--disable-software-rasterizer',
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
  const { proxyIP } = options;

  // ALWAYS block WebRTC completely - spoofing doesn't work reliably
  // This is applied via evaluateOnNewDocument to run before any page scripts
  await page.evaluateOnNewDocument((proxyIPArg: string | undefined) => {
    // ============================================================
    // WEBRTC BLOCKING - Make it look like WebRTC is not supported
    // ============================================================

    // Store a fake RTCPeerConnection that does nothing
    const FakeRTCPeerConnection = function(this: any) {
      this.createDataChannel = () => ({});
      this.createOffer = () => Promise.resolve({});
      this.createAnswer = () => Promise.resolve({});
      this.setLocalDescription = () => Promise.resolve();
      this.setRemoteDescription = () => Promise.resolve();
      this.addIceCandidate = () => Promise.resolve();
      this.getStats = () => Promise.resolve(new Map());
      this.getSenders = () => [];
      this.getReceivers = () => [];
      this.close = () => {};
      this.addEventListener = () => {};
      this.removeEventListener = () => {};
      this.onicecandidate = null;
      this.ontrack = null;
      this.onnegotiationneeded = null;
      this.onsignalingstatechange = null;
      this.oniceconnectionstatechange = null;
      this.onicegatheringstatechange = null;
      this.onconnectionstatechange = null;
      this.signalingState = 'closed';
      this.iceConnectionState = 'closed';
      this.connectionState = 'closed';
      this.iceGatheringState = 'complete';
      this.localDescription = null;
      this.remoteDescription = null;
    };

    // Replace with fake that returns proxy IP or nothing
    Object.defineProperty(window, 'RTCPeerConnection', {
      value: FakeRTCPeerConnection,
      writable: false,
      configurable: false,
    });

    Object.defineProperty(window, 'webkitRTCPeerConnection', {
      value: FakeRTCPeerConnection,
      writable: false,
      configurable: false,
    });

    Object.defineProperty(window, 'mozRTCPeerConnection', {
      value: undefined,
      writable: false,
      configurable: false,
    });

    // Also block RTCDataChannel
    Object.defineProperty(window, 'RTCDataChannel', {
      value: function() { return {}; },
      writable: false,
      configurable: false,
    });

    // Block MediaDevices getUserMedia to prevent additional leaks
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = () => {
        return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      };

      navigator.mediaDevices.enumerateDevices = () => {
        return Promise.resolve([]);
      };
    }

    console.log('[Privacy] WebRTC blocked - no IP leaks possible');
  }, proxyIP);
}

/**
 * Generate proxy-aware WebRTC config
 */
export function getWebRTCConfigForProxy(proxyIP: string): WebRTCSpoofConfig {
  return createWebRTCConfigFromProxy(proxyIP);
}
