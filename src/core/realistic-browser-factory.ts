/**
 * Realistic Browser Factory
 *
 * High-level API for creating the most realistic, undetectable browsers possible.
 * Automatically handles proxy-to-fingerprint consistency, human behavior simulation,
 * and all advanced evasion techniques.
 *
 * This is the easiest way to use UndetectBrowser's advanced features.
 */

import { Browser, Page } from 'puppeteer';
import { UndetectBrowser, LaunchOptions } from '../index';
import { ProxyConfig } from './proxy-manager';
import {
  generateConsistentFingerprint,
  applyConsistentFingerprint,
  ConsistentFingerprint,
} from '../modules/consistent-fingerprint';
import {
  generateHumanBehaviorProfile,
  humanType,
  humanClick,
  humanScroll,
  humanMoveMouse,
  humanReadPage,
  humanExplorePage,
  humanFillForm,
  HumanBehaviorProfile,
} from '../modules/realistic-human-behavior';
import {
  getEnhancedPrivacyArgs,
  applyEnhancedPrivacyProtection,
  EnhancedPrivacyOptions,
} from '../modules/enhanced-privacy-protection';
import { WebRTCSpoofConfig } from '../modules/webrtc-advanced-spoofing';
import { logger, LogLevel } from '../utils/logger';
import http from 'http';

/**
 * Configuration for realistic browser
 */
export interface RealisticBrowserConfig {
  /** Proxy configuration */
  proxy?: ProxyConfig;

  /** Country code (e.g., 'US', 'GB', 'DE') - auto-detected from proxy if not provided */
  country?: string;

  /** User seed for consistent fingerprint generation */
  userSeed?: string;

  /** Puppeteer launch options */
  launchOptions?: LaunchOptions;

  /** Whether to apply human behavior automatically */
  autoHumanBehavior?: boolean;

  /**
   * WebRTC configuration
   * Default: 'spoof' mode (WebRTC works but shows only proxy IPs)
   * This is more natural than blocking WebRTC completely
   */
  webrtc?: WebRTCSpoofConfig;

  /**
   * Privacy options
   */
  privacy?: EnhancedPrivacyOptions;
}

/**
 * Enhanced page with human-like methods
 */
export interface RealisticPage extends Page {
  /** Human-like typing */
  humanType(selector: string, text: string): Promise<void>;

  /** Human-like click */
  humanClick(selector: string): Promise<void>;

  /** Human-like scroll - scroll in a direction by amount */
  humanScrollSimple(direction: 'up' | 'down', amount: number): Promise<void>;

  /** Human-like mouse movement */
  humanMoveMouse(x: number, y: number): Promise<void>;

  /** Simulate reading page content */
  humanReadPage(): Promise<void>;

  /** Explore page elements */
  humanExplorePage(): Promise<void>;

  /** Fill form with human behavior */
  humanFillForm(formData: Record<string, string>): Promise<void>;

  /** Get the fingerprint used */
  getFingerprint(): ConsistentFingerprint;

  /** Get the biometric profile used */
  getHumanBehaviorProfile(): HumanBehaviorProfile;
}

/**
 * Realistic Browser Instance
 */
export class RealisticBrowserInstance {
  private browserInstance: any;
  private fingerprint: ConsistentFingerprint;
  private biometricProfile: HumanBehaviorProfile;
  private proxyCountry: string;
  private config: RealisticBrowserConfig;

  constructor(
    browserInstance: any,
    fingerprint: ConsistentFingerprint,
    biometricProfile: HumanBehaviorProfile,
    proxyCountry: string,
    config: RealisticBrowserConfig
  ) {
    this.browserInstance = browserInstance;
    this.fingerprint = fingerprint;
    this.biometricProfile = biometricProfile;
    this.proxyCountry = proxyCountry;
    this.config = config;
  }

  /**
   * Create a new page with all realistic behaviors enabled
   */
  async newPage(): Promise<RealisticPage> {
    const page = await this.browserInstance.newPage();

    // Set viewport to match fingerprint resolution - CRITICAL for screen size detection
    await page.setViewport({
      width: this.fingerprint.resolution.width,
      height: this.fingerprint.resolution.height,
      deviceScaleFactor: this.fingerprint.pixelRatio,
    });
    logger.debug(`Viewport set to ${this.fingerprint.resolution.width}x${this.fingerprint.resolution.height}`);

    // Apply proxy authentication if needed
    if (this.config.proxy && this.config.proxy.username && this.config.proxy.password) {
      await page.authenticate({
        username: this.config.proxy.username,
        password: this.config.proxy.password,
      });
      logger.debug('Proxy authentication applied to new page');
    }

    // Get proxy IP for WebRTC spoofing
    const proxyIP = this.config.proxy ? this.config.proxy.host : undefined;

    // Apply enhanced privacy protection (WebRTC spoofing, DNS leaks, etc.)
    await applyEnhancedPrivacyProtection(page, {
      proxyIP,
      webrtc: this.config.webrtc,
      ...this.config.privacy,
    });

    // Apply consistent fingerprint
    await applyConsistentFingerprint(page, this.fingerprint);

    // Enhance page with human-like methods
    const enhancedPage = page as RealisticPage;

    // Bind human behavior methods to this page and profile
    enhancedPage.humanType = async (selector: string, text: string) => {
      return humanType(page, selector, text, this.biometricProfile);
    };

    enhancedPage.humanClick = async (selector: string) => {
      return humanClick(page, selector, this.biometricProfile);
    };

    enhancedPage.humanScrollSimple = async (direction: 'up' | 'down', amount: number) => {
      return humanScroll(page, direction, amount, this.biometricProfile);
    };

    enhancedPage.humanMoveMouse = async (x: number, y: number) => {
      return humanMoveMouse(page, x, y, this.biometricProfile);
    };

    enhancedPage.humanReadPage = async () => {
      return humanReadPage(page, this.biometricProfile);
    };

    enhancedPage.humanExplorePage = async () => {
      return humanExplorePage(page, this.biometricProfile);
    };

    enhancedPage.humanFillForm = async (formData: Record<string, string>) => {
      return humanFillForm(page, formData, this.biometricProfile);
    };

    enhancedPage.getFingerprint = () => {
      return this.fingerprint;
    };

    enhancedPage.getHumanBehaviorProfile = () => {
      return this.biometricProfile;
    };

    logger.debug('Created new realistic page');

    return enhancedPage;
  }

  /**
   * Get all pages
   */
  async pages(): Promise<Page[]> {
    return await this.browserInstance.pages();
  }

  /**
   * Get the underlying browser instance
   */
  getBrowser(): Browser {
    return this.browserInstance.getBrowser();
  }

  /**
   * Get the fingerprint used
   */
  getFingerprint(): ConsistentFingerprint {
    return this.fingerprint;
  }

  /**
   * Get the biometric profile used
   */
  getHumanBehaviorProfile(): HumanBehaviorProfile {
    return this.biometricProfile;
  }

  /**
   * Get the detected proxy country
   */
  getProxyCountry(): string {
    return this.proxyCountry;
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    await this.browserInstance.close();
    logger.info('Realistic browser closed');
  }
}

/**
 * Realistic Browser Factory
 *
 * Main class for creating realistic browsers with automatic
 * proxy-fingerprint consistency and human behavior.
 */
export class RealisticBrowserFactory {
  private undetect: UndetectBrowser;

  constructor() {
    this.undetect = new UndetectBrowser({
      logLevel: LogLevel.INFO,
    });
  }

  /**
   * Create a realistic browser instance
   *
   * This method automatically:
   * 1. Detects proxy country (or uses provided country)
   * 2. Generates consistent fingerprint matching the country
   * 3. Generates biometric profile for human behavior
   * 4. Launches browser with proxy
   * 5. Applies all protections and configurations
   *
   * @param config - Configuration options
   * @returns Realistic browser instance
   */
  async create(config: RealisticBrowserConfig = {}): Promise<RealisticBrowserInstance> {
    logger.info('Creating realistic browser...');

    // Step 1: Determine country
    let country = config.country || 'US';

    if (config.proxy && !config.country) {
      // Auto-detect country from proxy
      country = await this.detectProxyCountry(config.proxy);
      logger.info(`Auto-detected proxy country: ${country}`);
    }

    // Step 2: Generate consistent fingerprint
    const userSeed = config.userSeed || this.generateRandomSeed();
    const fingerprint = generateConsistentFingerprint(country, userSeed);

    logger.info(`Generated fingerprint for ${country}`);
    logger.debug(`  Timezone: ${fingerprint.timezone}`);
    logger.debug(`  Locale: ${fingerprint.locale}`);
    logger.debug(`  Languages: ${fingerprint.languages.join(', ')}`);

    // Step 3: Generate biometric profile
    const biometricProfile = generateHumanBehaviorProfile(userSeed);

    logger.debug(`Generated biometric profile:`);
    logger.debug(`  Typing: ${Math.round(biometricProfile.typingSpeed)} WPM`);
    logger.debug(`  Mouse: ${Math.round(biometricProfile.mouseSpeed)} px/s`);
    logger.debug(`  Reaction: ${Math.round(biometricProfile.reactionTime)} ms`);

    // Step 4: Prepare launch options with enhanced privacy
    const proxyServer = config.proxy ? this.formatProxyServer(config.proxy) : undefined;

    // Get enhanced privacy arguments (includes WebRTC blocking, DNS leak protection, etc.)
    const enhancedArgs = getEnhancedPrivacyArgs(proxyServer);

    const launchOptions: LaunchOptions = {
      headless: false,
      ...config.launchOptions,
      args: [
        ...enhancedArgs,
        `--window-size=${fingerprint.resolution.width},${fingerprint.resolution.height}`,
        ...(config.launchOptions?.args || []),
      ],
    };

    // Log all launch arguments for debugging
    logger.info(`Launch args: ${launchOptions.args?.join(' ')}`);

    if (config.proxy) {
      const webrtcMode = config.webrtc?.mode || 'spoof';
      logger.info(`Using proxy: ${proxyServer}`);
      logger.info('✅ Enhanced privacy protection enabled');
      logger.info(`✅ WebRTC mode: ${webrtcMode} ${webrtcMode === 'spoof' ? '(RECOMMENDED - looks natural)' : ''}`);
      logger.info('✅ WebRTC IPs spoofed to proxy IP');
      logger.info('✅ DNS leak protection active');
      logger.info('✅ 100% proxy isolation enforced');
    }

    // Step 5: Launch browser
    const browserInstance = await this.undetect.launch(launchOptions);

    logger.info('Browser launched successfully');

    // Step 6: Create realistic instance
    const instance = new RealisticBrowserInstance(
      browserInstance,
      fingerprint,
      biometricProfile,
      country,
      config
    );

    // Step 7: Setup first page - viewport, fingerprint, and proxy auth
    const pages = await browserInstance.pages();
    if (pages.length > 0) {
      const firstPage = pages[0];

      // Set viewport to match fingerprint
      await firstPage.setViewport({
        width: fingerprint.resolution.width,
        height: fingerprint.resolution.height,
        deviceScaleFactor: fingerprint.pixelRatio,
      });

      // Apply fingerprint to first page
      await applyConsistentFingerprint(firstPage, fingerprint);

      // Apply enhanced privacy protection
      await applyEnhancedPrivacyProtection(firstPage, {
        proxyIP: config.proxy?.host,
        webrtc: config.webrtc,
        ...config.privacy,
      });

      // Proxy authentication if needed
      if (config.proxy && config.proxy.username && config.proxy.password) {
        await firstPage.authenticate({
          username: config.proxy.username,
          password: config.proxy.password,
        });
      }

      logger.debug(`First page configured: ${fingerprint.resolution.width}x${fingerprint.resolution.height}`);
    }

    logger.info('Realistic browser ready');

    return instance;
  }

  /**
   * Create multiple browser instances (for parallel operations)
   */
  async createMultiple(
    configs: RealisticBrowserConfig[]
  ): Promise<RealisticBrowserInstance[]> {
    logger.info(`Creating ${configs.length} realistic browsers...`);

    const instances = await Promise.all(configs.map((config) => this.create(config)));

    logger.info(`Created ${instances.length} browsers`);

    return instances;
  }

  /**
   * Detect country from proxy using real GeoIP lookup
   * Makes HTTP request through proxy to ip-api.com
   */
  private async detectProxyCountry(proxy: ProxyConfig): Promise<string> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        logger.warn(`GeoIP timeout for proxy ${proxy.host}, using fallback`);
        resolve('US'); // Fallback to US
      }, 15000);

      try {
        const options: http.RequestOptions = {
          host: proxy.host,
          port: proxy.port,
          path: 'http://ip-api.com/json/?fields=countryCode,country,city,timezone',
          method: 'GET',
          headers: {
            'Host': 'ip-api.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 15000,
        };

        // Add proxy authentication if provided
        if (proxy.username && proxy.password) {
          const auth = Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64');
          options.headers!['Proxy-Authorization'] = `Basic ${auth}`;
        }

        const req = http.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            clearTimeout(timeout);
            try {
              const json = JSON.parse(data);
              const countryCode = json.countryCode || 'US';
              logger.info(`Detected proxy country: ${countryCode} (${json.country || 'Unknown'})`);
              if (json.city) {
                logger.debug(`  City: ${json.city}`);
              }
              if (json.timezone) {
                logger.debug(`  Timezone: ${json.timezone}`);
              }
              resolve(countryCode);
            } catch (parseError) {
              logger.warn(`Failed to parse GeoIP response, using fallback`);
              resolve('US');
            }
          });
        });

        req.on('error', (err) => {
          clearTimeout(timeout);
          logger.warn(`GeoIP request failed: ${err.message}, using fallback`);
          resolve('US');
        });

        req.on('timeout', () => {
          clearTimeout(timeout);
          req.destroy();
          logger.warn(`GeoIP request timeout, using fallback`);
          resolve('US');
        });

        req.end();
      } catch (error: any) {
        clearTimeout(timeout);
        logger.warn(`GeoIP detection error: ${error.message}, using fallback`);
        resolve('US');
      }
    });
  }

  /**
   * Format proxy server string for Puppeteer
   */
  private formatProxyServer(proxy: ProxyConfig): string {
    return `${proxy.type}://${proxy.host}:${proxy.port}`;
  }

  /**
   * Generate random seed for consistent behavior
   */
  private generateRandomSeed(): string {
    return `seed-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Convenience function to create a realistic browser quickly
 *
 * @example
 * ```typescript
 * import { createRealisticBrowser } from './core/realistic-browser-factory';
 *
 * const browser = await createRealisticBrowser({
 *   proxy: {
 *     type: 'http',
 *     host: '1.2.3.4',
 *     port: 8080
 *   }
 * });
 *
 * const page = await browser.newPage();
 * await page.goto('https://example.com');
 * await page.humanClick('#button');
 * await page.humanType('#input', 'Hello World');
 * ```
 */
export async function createRealisticBrowser(
  config: RealisticBrowserConfig = {}
): Promise<RealisticBrowserInstance> {
  const factory = new RealisticBrowserFactory();
  return factory.create(config);
}

/**
 * Convenience function to create multiple realistic browsers
 *
 * @example
 * ```typescript
 * const browsers = await createRealisticBrowsers([
 *   { proxy: { type: 'http', host: '1.2.3.4', port: 8080 } },
 *   { proxy: { type: 'http', host: '5.6.7.8', port: 8080 } },
 * ]);
 * ```
 */
export async function createRealisticBrowsers(
  configs: RealisticBrowserConfig[]
): Promise<RealisticBrowserInstance[]> {
  const factory = new RealisticBrowserFactory();
  return factory.createMultiple(configs);
}
