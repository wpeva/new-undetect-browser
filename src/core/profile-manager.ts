import { ProfileStorage, BrowserProfile, StorageConfig } from '../storage/profile-storage';
import { generateFingerprintProfile } from '../utils/fingerprint-generator';
import { generateUUID, generateUserAgent, randomChoice } from '../utils/helpers';
import { logger } from '../utils/logger';

export interface ProfileOptions {
  name?: string;
  timezone?: string;
  locale?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  permissions?: Record<string, string>;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  platform?: 'windows' | 'mac' | 'linux';
}

/**
 * Profile Manager - Creates and manages browser profiles
 */
export class ProfileManager {
  protected storage: ProfileStorage;
  private activeProfiles: Map<string, BrowserProfile>;

  constructor(storageConfig?: StorageConfig) {
    this.storage = new ProfileStorage(storageConfig);
    this.activeProfiles = new Map();
  }

  /**
   * Initialize the profile manager
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    logger.info('ProfileManager initialized');
  }

  /**
   * Create a new profile
   */
  async createProfile(options: ProfileOptions = {}): Promise<BrowserProfile> {
    const profile: BrowserProfile = {
      id: generateUUID(),
      name: options.name,
      fingerprint: generateFingerprintProfile(),
      userAgent: options.userAgent || generateUserAgent(options.platform || 'windows'),
      viewport: options.viewport || this.generateViewport(),
      timezone: options.timezone || 'America/New_York',
      locale: options.locale || 'en-US',
      geolocation: options.geolocation,
      permissions: options.permissions || {},
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    await this.storage.save(profile);
    this.activeProfiles.set(profile.id, profile);

    logger.info(`Profile created: ${profile.id}${profile.name ? ` (${profile.name})` : ''}`);
    return profile;
  }

  /**
   * Load an existing profile
   */
  async loadProfile(profileId: string): Promise<BrowserProfile | null> {
    // Check if already in memory
    if (this.activeProfiles.has(profileId)) {
      return this.activeProfiles.get(profileId)!;
    }

    // Load from storage
    const profile = await this.storage.load(profileId);
    if (profile) {
      this.activeProfiles.set(profileId, profile);
      logger.info(`Profile loaded: ${profileId}`);
    }

    return profile;
  }

  /**
   * Update a profile
   */
  async updateProfile(profileId: string, updates: Partial<BrowserProfile>): Promise<void> {
    const profile = await this.loadProfile(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    Object.assign(profile, updates, { lastUsed: new Date() });
    await this.storage.save(profile);

    logger.info(`Profile updated: ${profileId}`);
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    await this.storage.delete(profileId);
    this.activeProfiles.delete(profileId);

    logger.info(`Profile deleted: ${profileId}`);
  }

  /**
   * List all profiles
   */
  async listProfiles(): Promise<string[]> {
    return await this.storage.list();
  }

  /**
   * Save profile state (cookies, storage, etc.)
   */
  async saveProfileState(profileId: string, state: {
    cookies?: any[];
    localStorage?: Record<string, string>;
    sessionStorage?: Record<string, string>;
  }): Promise<void> {
    const profile = await this.loadProfile(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    if (state.cookies) {
      profile.cookies = state.cookies;
    }
    if (state.localStorage) {
      profile.localStorage = state.localStorage;
    }
    if (state.sessionStorage) {
      profile.sessionStorage = state.sessionStorage;
    }

    profile.lastUsed = new Date();
    await this.storage.save(profile);

    logger.debug(`Profile state saved: ${profileId}`);
  }

  /**
   * Generate realistic viewport
   */
  private generateViewport(): { width: number; height: number } {
    const resolutions = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 },
      { width: 2560, height: 1440 },
    ];

    return randomChoice(resolutions);
  }

  /**
   * Get storage instance
   */
  getStorage(): ProfileStorage {
    return this.storage;
  }
}
