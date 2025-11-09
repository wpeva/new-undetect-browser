import { Browser, Page, LaunchOptions } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { AdvancedProfileManager, AdvancedProfile } from './advanced-profile-manager';
import { ProxyManager, ProxyConfig } from './proxy-manager';
import { CookieSessionManager } from './cookie-session-manager';
import { CanvasProtectionV2 } from '../modules/canvas-protection-v2';
import { WebRTCProtectionV2 } from '../modules/webrtc-protection-v2';
import { HardwareSpoofing } from '../modules/hardware-spoofing';
import {
  generateEnhancedFingerprint,
  EnhancedFingerprintOptions,
} from '../utils/enhanced-fingerprint-generator';
import { logger } from '../utils/logger';
import { ProfileStorage } from '../storage/profile-storage';

// Add stealth plugin
puppeteer.use(StealthPlugin());

/**
 * Advanced browser configuration
 */
export interface AdvancedBrowserConfig {
  dataDir?: string;
  headless?: boolean;
  proxyEnabled?: boolean;
  canvasProtection?: boolean;
  webrtcProtection?: boolean;
  hardwareSpoofing?: boolean;
  cookiePersistence?: boolean;
}

/**
 * Launch options for advanced browser
 */
export interface AdvancedLaunchOptions {
  profileId?: string;
  profileName?: string;
  proxy?: ProxyConfig;
  fingerprint?: EnhancedFingerprintOptions;
  launchOptions?: LaunchOptions;
}

/**
 * Advanced Browser
 * Multilogin-level browser automation with complete anti-detection
 */
export class AdvancedBrowser {
  private config: AdvancedBrowserConfig;
  private profileManager: AdvancedProfileManager;
  private proxyManager: ProxyManager;
  private cookieSessionManager: CookieSessionManager;
  private canvasProtection: CanvasProtectionV2;
  private webrtcProtection: WebRTCProtectionV2;
  private hardwareSpoofing: HardwareSpoofing;
  private activeBrowsers: Map<string, Browser> = new Map();
  private activeSessions: Map<string, string> = new Map();

  constructor(config: AdvancedBrowserConfig = {}) {
    this.config = {
      dataDir: config.dataDir || './.undetect',
      headless: config.headless ?? false,
      proxyEnabled: config.proxyEnabled ?? true,
      canvasProtection: config.canvasProtection ?? true,
      webrtcProtection: config.webrtcProtection ?? true,
      hardwareSpoofing: config.hardwareSpoofing ?? true,
      cookiePersistence: config.cookiePersistence ?? true,
    };

    // Initialize managers
    const storage = new ProfileStorage({
      type: 'file',
      path: this.config.dataDir,
    });

    this.profileManager = new AdvancedProfileManager(storage);
    this.proxyManager = new ProxyManager();
    this.cookieSessionManager = new CookieSessionManager(
      `${this.config.dataDir}/sessions`
    );
    this.canvasProtection = new CanvasProtectionV2({
      enabled: this.config.canvasProtection,
      algorithm: 'moderate',
      consistency: 'session',
    });
    this.webrtcProtection = new WebRTCProtectionV2({
      enabled: this.config.webrtcProtection,
      blockPublicIP: true,
      blockLocalIP: true,
      mode: 'block',
    });
    this.hardwareSpoofing = new HardwareSpoofing('windows-medium');

    logger.info('Advanced Browser initialized');
  }

  /**
   * Initialize all managers
   */
  async initialize(): Promise<void> {
    await Promise.all([
      this.profileManager.initialize(),
      this.cookieSessionManager.initialize(),
    ]);

    logger.info('Advanced Browser managers initialized');
  }

  /**
   * Create new advanced profile
   */
  async createProfile(
    name: string,
    options?: {
      fingerprint?: EnhancedFingerprintOptions;
      proxy?: ProxyConfig;
      tags?: string[];
      category?: string;
      description?: string;
    }
  ): Promise<AdvancedProfile> {
    // Generate enhanced fingerprint
    const fingerprint = generateEnhancedFingerprint(
      options?.fingerprint || {}
    );

    // Create profile with metadata
    const profile = await this.profileManager.createAdvancedProfile(name, {
      timezone: fingerprint.timezone,
      locale: fingerprint.locale,
      userAgent: fingerprint.userAgent,
      metadata: {
        tags: options?.tags || [],
        category: options?.category,
        description: options?.description,
        proxy: options?.proxy,
      },
    });

    logger.info(`Created advanced profile: ${name} (${profile.id})`);
    return profile;
  }

  /**
   * Launch browser with profile
   */
  async launch(options: AdvancedLaunchOptions = {}): Promise<Browser> {
    // Get or create profile
    let profile: AdvancedProfile | null = null;

    if (options.profileId) {
      profile = await this.profileManager.loadAdvancedProfile(
        options.profileId
      );
      if (!profile) {
        throw new Error(`Profile ${options.profileId} not found`);
      }
    } else if (options.profileName) {
      const profiles = await this.profileManager.searchProfiles({
        name: options.profileName,
      });
      profile = profiles[0] || null;
    }

    if (!profile) {
      // Create temporary profile
      const tempName = `temp_${Date.now()}`;
      profile = await this.createProfile(tempName, {
        fingerprint: options.fingerprint,
        proxy: options.proxy,
      });
    }

    // Get proxy if enabled
    let proxyServer: string | undefined;
    if (this.config.proxyEnabled) {
      const proxyConfig = options.proxy || profile.metadata.proxy;
      if (proxyConfig && proxyConfig.enabled) {
        proxyServer = `${proxyConfig.type}://${proxyConfig.host}:${proxyConfig.port}`;
        if (proxyConfig.username && proxyConfig.password) {
          proxyServer = `${proxyConfig.type}://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyConfig.port}`;
        }
      } else {
        // Get from proxy pool
        const poolProxy = this.proxyManager.getNextProxy();
        if (poolProxy) {
          proxyServer = `${poolProxy.type}://${poolProxy.host}:${poolProxy.port}`;
        }
      }
    }

    // Prepare launch options
    const launchOptions: LaunchOptions = {
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        ...(proxyServer ? [`--proxy-server=${proxyServer}`] : []),
      ],
      ...options.launchOptions,
    };

    // Launch browser
    const browser = await puppeteer.launch(launchOptions);

    // Setup first page
    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());

    // Inject protections
    await this.injectProtections(page, profile);

    // Restore session if exists
    if (this.config.cookiePersistence) {
      await this.cookieSessionManager.restoreSession(page, profile.id);
    }

    // Mark profile as used
    await this.profileManager.markProfileUsed(profile.id);

    // Store active browser
    this.activeBrowsers.set(profile.id, browser);
    this.activeSessions.set(profile.id, profile.id);

    logger.info(`Launched browser with profile: ${profile.metadata.name}`);
    return browser;
  }

  /**
   * Close browser and save session
   */
  async close(browser: Browser, saveSession = true): Promise<void> {
    // Find profile ID for this browser
    let profileId: string | undefined;
    for (const [id, b] of this.activeBrowsers.entries()) {
      if (b === browser) {
        profileId = id;
        break;
      }
    }

    if (!profileId) {
      logger.warn('Browser not found in active browsers, closing without save');
      await browser.close();
      return;
    }

    // Save session if enabled
    if (saveSession && this.config.cookiePersistence) {
      const pages = await browser.pages();
      if (pages.length > 0) {
        await this.cookieSessionManager.saveSession(pages[0], profileId);
      }
    }

    // Close browser
    await browser.close();

    // Remove from active browsers
    this.activeBrowsers.delete(profileId);
    this.activeSessions.delete(profileId);

    logger.info(`Closed browser for profile: ${profileId}`);
  }

  /**
   * Get profile manager
   */
  getProfileManager(): AdvancedProfileManager {
    return this.profileManager;
  }

  /**
   * Get proxy manager
   */
  getProxyManager(): ProxyManager {
    return this.proxyManager;
  }

  /**
   * Get cookie session manager
   */
  getCookieSessionManager(): CookieSessionManager {
    return this.cookieSessionManager;
  }

  /**
   * Add proxies to pool
   */
  addProxies(proxies: ProxyConfig[]): void {
    this.proxyManager.addProxies(proxies);
    logger.info(`Added ${proxies.length} proxies to pool`);
  }

  /**
   * Import proxies from text
   */
  importProxiesFromText(
    text: string,
    type: 'http' | 'https' | 'socks4' | 'socks5' = 'http'
  ): number {
    return this.proxyManager.importProxiesFromText(text, type);
  }

  /**
   * Validate all proxies
   */
  async validateProxies(concurrency = 5): Promise<void> {
    const results = await this.proxyManager.validateAllProxies(concurrency);
    const validCount = results.filter((r) => r.valid).length;
    logger.info(
      `Proxy validation complete: ${validCount}/${results.length} valid`
    );
  }

  /**
   * Get all profiles
   */
  async getProfiles(): Promise<AdvancedProfile[]> {
    return this.profileManager.getAllProfiles();
  }

  /**
   * Search profiles
   */
  async searchProfiles(
    filters: Parameters<typeof this.profileManager.searchProfiles>[0]
  ): Promise<AdvancedProfile[]> {
    return this.profileManager.searchProfiles(filters);
  }

  /**
   * Export profiles
   */
  async exportProfiles(
    profileIds?: string[],
    filePath?: string
  ): Promise<ReturnType<typeof this.profileManager.exportProfiles>> {
    return this.profileManager.exportProfiles(profileIds, filePath);
  }

  /**
   * Import profiles
   */
  async importProfiles(
    data: Parameters<typeof this.profileManager.importProfiles>[0],
    options?: Parameters<typeof this.profileManager.importProfiles>[1]
  ): Promise<AdvancedProfile[]> {
    return this.profileManager.importProfiles(data, options);
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    profiles: ReturnType<typeof this.profileManager.getStatistics>;
    proxies: ReturnType<typeof this.proxyManager.getStatistics>;
    activeBrowsers: number;
  }> {
    return {
      profiles: await this.profileManager.getStatistics(),
      proxies: this.proxyManager.getStatistics(),
      activeBrowsers: this.activeBrowsers.size,
    };
  }

  /**
   * Private: Inject all protections into page
   */
  private async injectProtections(
    page: Page,
    profile: AdvancedProfile
  ): Promise<void> {
    const injections: Promise<void>[] = [];

    if (this.config.canvasProtection) {
      injections.push(this.canvasProtection.inject(page));
    }

    if (this.config.webrtcProtection) {
      injections.push(this.webrtcProtection.inject(page));
    }

    if (this.config.hardwareSpoofing) {
      injections.push(this.hardwareSpoofing.inject(page));
    }

    await Promise.all(injections);
    logger.info('All protections injected');
  }
}

/**
 * Create advanced browser instance
 */
export function createAdvancedBrowser(
  config?: AdvancedBrowserConfig
): AdvancedBrowser {
  return new AdvancedBrowser(config);
}
