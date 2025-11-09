import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from 'puppeteer';
import { StealthEngine, StealthConfig } from './core/stealth-engine';
import { ProfileManager, ProfileOptions } from './core/profile-manager';
import { BrowserProfile, StorageConfig } from './storage/profile-storage';
import { logger, LogLevel } from './utils/logger';

export interface UndetectConfig {
  stealth?: StealthConfig;
  storage?: StorageConfig;
  logLevel?: LogLevel;
}

export interface LaunchOptions extends Partial<PuppeteerLaunchOptions> {
  profileId?: string;
  profile?: ProfileOptions;
}

/**
 * Main UndetectBrowser class
 * High-level API for launching undetectable browsers
 */
export class UndetectBrowser {
  private stealthEngine: StealthEngine;
  private profileManager: ProfileManager;
  private config: UndetectConfig;

  constructor(config: UndetectConfig = {}) {
    this.config = config;

    // Set log level
    if (config.logLevel !== undefined) {
      logger.setLevel(config.logLevel);
    }

    // Initialize components
    this.stealthEngine = new StealthEngine(config.stealth);
    this.profileManager = new ProfileManager(config.storage);

    logger.info('UndetectBrowser initialized');
  }

  /**
   * Launch a new undetectable browser
   */
  async launch(options: LaunchOptions = {}): Promise<UndetectBrowserInstance> {
    // Initialize profile manager if needed
    await this.profileManager.initialize();

    // Get or create profile
    let profile: BrowserProfile;
    if (options.profileId) {
      const loadedProfile = await this.profileManager.loadProfile(options.profileId);
      if (!loadedProfile) {
        throw new Error(`Profile ${options.profileId} not found`);
      }
      profile = loadedProfile;
    } else if (options.profile) {
      profile = await this.profileManager.createProfile(options.profile);
    } else {
      profile = await this.profileManager.createProfile();
    }

    logger.info(`Launching browser with profile: ${profile.id}`);

    // Prepare launch args
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      `--user-agent=${profile.userAgent}`,
      `--window-size=${profile.viewport.width},${profile.viewport.height}`,
      ...(options.args || []),
    ];

    // Launch browser
    const browser = await puppeteer.launch({
      headless: options.headless ?? false,
      args: launchArgs,
      ignoreDefaultArgs: ['--enable-automation'],
      ...options,
    });

    logger.info('Browser launched successfully');

    // Create instance
    const instance = new UndetectBrowserInstance(
      browser,
      profile,
      this.stealthEngine,
      this.profileManager
    );

    await instance.initialize();

    return instance;
  }

  /**
   * Create a new profile without launching browser
   */
  async createProfile(options?: ProfileOptions): Promise<string> {
    await this.profileManager.initialize();
    const profile = await this.profileManager.createProfile(options);
    return profile.id;
  }

  /**
   * Load an existing profile
   */
  async loadProfile(profileId: string): Promise<BrowserProfile | null> {
    await this.profileManager.initialize();
    return await this.profileManager.loadProfile(profileId);
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    await this.profileManager.initialize();
    await this.profileManager.deleteProfile(profileId);
  }

  /**
   * List all profiles
   */
  async listProfiles(): Promise<string[]> {
    await this.profileManager.initialize();
    return await this.profileManager.listProfiles();
  }

  /**
   * Get the stealth engine
   */
  getStealthEngine(): StealthEngine {
    return this.stealthEngine;
  }

  /**
   * Get the profile manager
   */
  getProfileManager(): ProfileManager {
    return this.profileManager;
  }
}

/**
 * UndetectBrowser Instance
 * Represents an active browser session
 */
export class UndetectBrowserInstance {
  private browser: Browser;
  private profile: BrowserProfile;
  private stealthEngine: StealthEngine;
  private profileManager: ProfileManager;
  private _pages: Set<Page>;

  constructor(
    browser: Browser,
    profile: BrowserProfile,
    stealthEngine: StealthEngine,
    profileManager: ProfileManager
  ) {
    this.browser = browser;
    this.profile = profile;
    this.stealthEngine = stealthEngine;
    this.profileManager = profileManager;
    this._pages = new Set();
  }

  /**
   * Initialize the browser instance
   */
  async initialize(): Promise<void> {
    // Apply stealth to all new pages
    this.browser.on('targetcreated', async (target) => {
      const page = await target.page();
      if (page) {
        await this.applyStealthToPage(page);
      }
    });

    // Get existing pages and apply stealth
    const pages = await this.browser.pages();
    for (const page of pages) {
      await this.applyStealthToPage(page);
    }

    logger.debug('Browser instance initialized');
  }

  /**
   * Apply stealth protections to a page
   */
  private async applyStealthToPage(page: Page): Promise<void> {
    this._pages.add(page);

    // Set viewport
    await page.setViewport(this.profile.viewport);

    // Set user agent
    await page.setUserAgent(this.profile.userAgent);

    // Set timezone if supported
    if (this.profile.timezone) {
      try {
        await (page as any).emulateTimezone(this.profile.timezone);
      } catch (e) {
        logger.warn('Failed to set timezone:', { error: String(e) });
      }
    }

    // Set geolocation
    if (this.profile.geolocation) {
      await page.setGeolocation(this.profile.geolocation);
    }

    // Restore cookies
    if (this.profile.cookies.length > 0) {
      await page.setCookie(...this.profile.cookies);
    }

    // Restore localStorage and sessionStorage
    if (
      Object.keys(this.profile.localStorage).length > 0 ||
      Object.keys(this.profile.sessionStorage).length > 0
    ) {
      await page.evaluateOnNewDocument(
        (localStorage: any, sessionStorage: any) => {
          Object.keys(localStorage).forEach((key) => {
            window.localStorage.setItem(key, localStorage[key]);
          });
          Object.keys(sessionStorage).forEach((key) => {
            window.sessionStorage.setItem(key, sessionStorage[key]);
          });
        },
        this.profile.localStorage,
        this.profile.sessionStorage
      );
    }

    // Apply stealth protections
    await this.stealthEngine.applyProtections(page, this.profile.userAgent);

    // Add human-like methods to page
    this.addHumanLikeMethods(page);

    logger.debug('Stealth protections applied to page');
  }

  /**
   * Add human-like interaction methods to a page
   */
  private addHumanLikeMethods(page: Page): void {
    const behavioralSim = this.stealthEngine.getBehavioralSimulation();

    // Add human-like methods
    (page as any).humanClick = async (selector: string, options?: any) => {
      return behavioralSim.humanClick(page, selector, options);
    };

    (page as any).humanType = async (selector: string, text: string, options?: any) => {
      return behavioralSim.humanType(page, selector, text, options);
    };

    (page as any).humanScroll = async (options: any) => {
      return behavioralSim.humanScroll(page, options);
    };

    (page as any).humanMove = async (x: number, y: number, options?: any) => {
      return behavioralSim.humanMouseMove(page, x, y, options);
    };

    (page as any).humanDelay = async (min?: number, max?: number) => {
      return behavioralSim.humanDelay(min, max);
    };

    (page as any).simulateReading = async (duration?: number) => {
      return behavioralSim.simulateReading(page, duration);
    };

    logger.debug('Human-like methods added to page');
  }

  /**
   * Create a new page
   */
  async newPage(): Promise<Page> {
    const page = await this.browser.newPage();
    await this.applyStealthToPage(page);
    return page;
  }

  /**
   * Get all pages
   */
  async pages(): Promise<Page[]> {
    return await this.browser.pages();
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    // Save profile state before closing
    await this.saveProfile();

    await this.browser.close();
    logger.info('Browser closed');
  }

  /**
   * Save current profile state
   */
  async saveProfile(): Promise<void> {
    try {
      const pages = await this.browser.pages();
      if (pages.length > 0) {
        const page = pages[0];

        // Get cookies
        const cookies = await page.cookies();

        // Get localStorage and sessionStorage
        const storage = await page.evaluate(() => {
          const local: Record<string, string> = {};
          const session: Record<string, string> = {};

          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              local[key] = localStorage.getItem(key) || '';
            }
          }

          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) {
              session[key] = sessionStorage.getItem(key) || '';
            }
          }

          return { local, session };
        });

        // Save to profile
        await this.profileManager.saveProfileState(this.profile.id, {
          cookies,
          localStorage: storage.local,
          sessionStorage: storage.session,
        });

        logger.debug('Profile state saved');
      }
    } catch (error) {
      logger.error('Failed to save profile state:', error);
    }
  }

  /**
   * Get the underlying Puppeteer browser
   */
  getBrowser(): Browser {
    return this.browser;
  }

  /**
   * Get the profile
   */
  getProfile(): BrowserProfile {
    return this.profile;
  }
}

// Export modules
export * from './modules/webdriver-evasion';
export * from './modules/fingerprint-spoofing';
export * from './modules/behavioral-simulation';
export * from './modules/network-protection';
export * from './modules/advanced-evasions';

// Export types and utilities
export * from './utils/logger';
export * from './utils/helpers';
export * from './utils/fingerprint-generator';
export * from './core/stealth-engine';
export * from './core/profile-manager';
export * from './storage/profile-storage';
