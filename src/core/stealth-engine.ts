import { Page } from 'puppeteer';
import { WebDriverEvasionModule } from '../modules/webdriver-evasion';
import { FingerprintSpoofingModule } from '../modules/fingerprint-spoofing';
import { BehavioralSimulationModule } from '../modules/behavioral-simulation';
import { NetworkProtectionModule } from '../modules/network-protection';
import { AdvancedEvasionsModule } from '../modules/advanced-evasions';
import { HeadlessDetectionProtection } from '../modules/headless-detection-protection';
import { AutomationDetectionProtection } from '../modules/automation-detection-protection';
import { ClientRectsProtection } from '../modules/client-rects-protection';
import { SpeechSynthesisProtection } from '../modules/speech-synthesis-protection';
import { MediaCodecsProtection } from '../modules/media-codecs-protection';
import { WebGL2Protection } from '../modules/webgl2-protection';
import { PerformanceAPIProtection } from '../modules/performance-api-protection';
import { DeviceOrientationProtection } from '../modules/device-orientation-protection';
import { WebAuthnProtection } from '../modules/webauthn-protection';
import { BluetoothUSBProtection } from '../modules/bluetooth-usb-protection';
import { logger } from '../utils/logger';
import {
  FingerprintProfile,
  generateFingerprintProfile,
} from '../utils/fingerprint-generator';

export interface StealthConfig {
  level?: 'basic' | 'advanced' | 'paranoid';
  webdriverEvasion?: boolean;
  fingerprintSpoofing?: boolean;
  behavioralSimulation?: boolean;
  networkProtection?: boolean;
  advancedEvasions?: boolean;
  headlessProtection?: boolean;
  automationProtection?: boolean;
  // New advanced protection modules (Session 1)
  clientRectsProtection?: boolean;
  speechSynthesisProtection?: boolean;
  mediaCodecsProtection?: boolean;
  webgl2Protection?: boolean;
  performanceAPIProtection?: boolean;
  // Session 2 protection modules
  deviceOrientationProtection?: boolean;
  webauthnProtection?: boolean;
  bluetoothUSBProtection?: boolean;
  customFingerprint?: FingerprintProfile;
}

/**
 * Stealth Engine - Core protection system
 * Coordinates all anti-detection modules
 */
export class StealthEngine {
  private config: StealthConfig;
  private webdriverEvasion: WebDriverEvasionModule;
  private fingerprintSpoofer: FingerprintSpoofingModule;
  private behavioralSimulation: BehavioralSimulationModule;
  private advancedEvasions: AdvancedEvasionsModule;
  private headlessProtection: HeadlessDetectionProtection;
  private automationProtection: AutomationDetectionProtection;
  private networkProtection: NetworkProtectionModule | null = null;
  // New protection modules (Session 1)
  private clientRectsProtection: ClientRectsProtection;
  private speechSynthesisProtection: SpeechSynthesisProtection;
  private mediaCodecsProtection: MediaCodecsProtection;
  private webgl2Protection: WebGL2Protection;
  private performanceAPIProtection: PerformanceAPIProtection;
  // Session 2 protection modules
  private deviceOrientationProtection: DeviceOrientationProtection;
  private webauthnProtection: WebAuthnProtection;
  private bluetoothUSBProtection: BluetoothUSBProtection;
  private fingerprint: FingerprintProfile;
  private initialized: boolean = false;

  constructor(config: StealthConfig = {}) {
    // Default to 'basic' to avoid conflicts with StealthPlugin
    // StealthPlugin handles most evasions, we only add minimal extras
    const level = config.level || 'basic';

    // Apply level-based defaults
    this.config = {
      level,
      webdriverEvasion: config.webdriverEvasion ?? true,
      fingerprintSpoofing: config.fingerprintSpoofing ?? (level !== 'basic'),
      behavioralSimulation: config.behavioralSimulation ?? (level !== 'basic'),
      networkProtection: config.networkProtection ?? (level !== 'basic'),
      advancedEvasions: config.advancedEvasions ?? (level === 'paranoid'),
      headlessProtection: config.headlessProtection ?? true, // Always enable by default
      automationProtection: config.automationProtection ?? (level !== 'basic'),
      // New protection modules - enabled for advanced and paranoid levels
      clientRectsProtection: config.clientRectsProtection ?? (level !== 'basic'),
      speechSynthesisProtection: config.speechSynthesisProtection ?? (level !== 'basic'),
      mediaCodecsProtection: config.mediaCodecsProtection ?? (level !== 'basic'),
      webgl2Protection: config.webgl2Protection ?? (level !== 'basic'),
      performanceAPIProtection: config.performanceAPIProtection ?? (level === 'paranoid'),
      // Session 2 modules - enabled for advanced and paranoid levels
      deviceOrientationProtection: config.deviceOrientationProtection ?? (level !== 'basic'),
      webauthnProtection: config.webauthnProtection ?? (level !== 'basic'),
      bluetoothUSBProtection: config.bluetoothUSBProtection ?? (level !== 'basic'),
      customFingerprint: config.customFingerprint,
    };

    // Generate or use custom fingerprint
    this.fingerprint =
      this.config.customFingerprint || generateFingerprintProfile();

    // Initialize modules
    this.webdriverEvasion = new WebDriverEvasionModule();
    this.fingerprintSpoofer = new FingerprintSpoofingModule(this.fingerprint);
    this.behavioralSimulation = new BehavioralSimulationModule();
    this.advancedEvasions = new AdvancedEvasionsModule();
    this.headlessProtection = new HeadlessDetectionProtection();
    this.automationProtection = new AutomationDetectionProtection();

    // Initialize new protection modules (Session 1)
    this.clientRectsProtection = new ClientRectsProtection({
      enabled: this.config.clientRectsProtection,
      noiseLevel: level === 'paranoid' ? 'aggressive' : 'moderate',
    });
    this.speechSynthesisProtection = new SpeechSynthesisProtection({
      enabled: this.config.speechSynthesisProtection,
      platform: this.fingerprint.platform as any,
    });
    this.mediaCodecsProtection = new MediaCodecsProtection({
      enabled: this.config.mediaCodecsProtection,
      platform: this.fingerprint.platform as any,
      browser: 'chrome',
    });
    this.webgl2Protection = new WebGL2Protection({
      enabled: this.config.webgl2Protection,
      vendor: this.fingerprint.webgl.vendor,
      gpu: this.fingerprint.webgl.renderer,
    });
    this.performanceAPIProtection = new PerformanceAPIProtection({
      enabled: this.config.performanceAPIProtection,
      noiseLevel: level === 'paranoid' ? 'aggressive' : 'moderate',
    });

    // Initialize Session 2 protection modules
    this.deviceOrientationProtection = new DeviceOrientationProtection({
      enabled: this.config.deviceOrientationProtection,
      deviceType: this.fingerprint.isMobile ? 'mobile' : 'desktop',
    });
    this.webauthnProtection = new WebAuthnProtection({
      enabled: this.config.webauthnProtection,
      platform: this.fingerprint.platform as any,
    });
    this.bluetoothUSBProtection = new BluetoothUSBProtection({
      enabled: this.config.bluetoothUSBProtection,
      platform: this.fingerprint.platform as any,
      browser: 'chrome', // Default to chrome
    });

    logger.info(`StealthEngine initialized with level: ${this.config.level}`);
  }

  /**
   * Initialize the stealth engine
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn('StealthEngine already initialized');
      return;
    }

    logger.info('Initializing StealthEngine modules...');

    // Modules are ready to use
    this.initialized = true;

    logger.info('StealthEngine initialization complete');
  }

  /**
   * Apply all protections to a page
   */
  async applyProtections(page: Page, userAgent: string): Promise<void> {
    if (!this.initialized) {
      this.initialize();
    }

    logger.debug('Applying stealth protections to page');

    try {
      // Apply WebDriver evasion (always first)
      if (this.config.webdriverEvasion) {
        await this.webdriverEvasion.inject(page);
      }

      // Apply headless detection protection (early)
      if (this.config.headlessProtection) {
        await this.headlessProtection.inject(page);
      }

      // Apply automation detection protection (early)
      if (this.config.automationProtection) {
        await this.automationProtection.inject(page);
      }

      // Apply fingerprint spoofing
      if (this.config.fingerprintSpoofing) {
        await this.fingerprintSpoofer.inject(page);
      }

      // Apply advanced evasions (paranoid mode)
      if (this.config.advancedEvasions) {
        await this.advancedEvasions.inject(page);
      }

      // Apply behavioral simulation helpers
      if (this.config.behavioralSimulation) {
        await this.behavioralSimulation.injectHelpers(page);
      }

      // Apply new protection modules (Session 1)
      if (this.config.clientRectsProtection) {
        await this.clientRectsProtection.apply(page);
      }

      if (this.config.speechSynthesisProtection) {
        await this.speechSynthesisProtection.apply(page);
      }

      if (this.config.mediaCodecsProtection) {
        await this.mediaCodecsProtection.apply(page);
      }

      if (this.config.webgl2Protection) {
        await this.webgl2Protection.apply(page);
      }

      if (this.config.performanceAPIProtection) {
        await this.performanceAPIProtection.apply(page);
      }

      // Apply Session 2 protection modules
      if (this.config.deviceOrientationProtection) {
        await this.deviceOrientationProtection.apply(page);
      }

      if (this.config.webauthnProtection) {
        await this.webauthnProtection.apply(page);
      }

      if (this.config.bluetoothUSBProtection) {
        await this.bluetoothUSBProtection.apply(page);
      }

      // Setup network protection (always last)
      if (this.config.networkProtection) {
        if (!this.networkProtection) {
          this.networkProtection = new NetworkProtectionModule(userAgent);
        }
        await this.networkProtection.setupInterception(page);
        await this.networkProtection.setExtraHeaders(page);
      }

      logger.debug('All stealth protections applied successfully');
    } catch (error) {
      logger.error('Error applying stealth protections:', error);
      throw error;
    }
  }

  /**
   * Update the fingerprint profile
   */
  updateFingerprint(fingerprint?: FingerprintProfile): void {
    this.fingerprint = fingerprint || generateFingerprintProfile();
    this.fingerprintSpoofer.setProfile(this.fingerprint);
    logger.info('Fingerprint profile updated');
  }

  /**
   * Get current fingerprint
   */
  getFingerprint(): FingerprintProfile {
    return this.fingerprint;
  }

  /**
   * Get configuration
   */
  getConfig(): StealthConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StealthConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('StealthEngine configuration updated', this.config as unknown as Record<string, unknown>);
  }

  /**
   * Check if engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get behavioral simulation module
   */
  getBehavioralSimulation(): BehavioralSimulationModule {
    return this.behavioralSimulation;
  }

  /**
   * Get network protection module
   */
  getNetworkProtection(): NetworkProtectionModule | null {
    return this.networkProtection;
  }

  /**
   * Get advanced evasions module
   */
  getAdvancedEvasions(): AdvancedEvasionsModule {
    return this.advancedEvasions;
  }

  /**
   * Get headless protection module
   */
  getHeadlessProtection(): HeadlessDetectionProtection {
    return this.headlessProtection;
  }

  /**
   * Get automation protection module
   */
  getAutomationProtection(): AutomationDetectionProtection {
    return this.automationProtection;
  }
}
