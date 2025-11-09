import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface BrowserProfile {
  id: string;
  name?: string;
  fingerprint: any;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  timezone: string;
  locale: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  permissions: Record<string, string>;
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  createdAt: Date;
  lastUsed: Date;
}

export interface StorageConfig {
  type: 'file' | 'memory';
  path?: string;
}

/**
 * Profile Storage - Manages browser profiles
 */
export class ProfileStorage {
  public config: StorageConfig;
  private memoryStore: Map<string, BrowserProfile>;

  constructor(config: StorageConfig = { type: 'file', path: './profiles' }) {
    this.config = config;
    this.memoryStore = new Map();
  }

  /**
   * Get the storage base path
   */
  getBasePath(): string | undefined {
    return this.config.path;
  }

  /**
   * Initialize storage (create directories, etc.)
   */
  async initialize(): Promise<void> {
    if (this.config.type === 'file' && this.config.path) {
      try {
        await fs.mkdir(this.config.path, { recursive: true });
        logger.info(`Profile storage initialized at: ${this.config.path}`);
      } catch (error) {
        logger.error('Failed to initialize profile storage:', error);
        throw error;
      }
    }
  }

  /**
   * Save a profile
   */
  async save(profile: BrowserProfile): Promise<void> {
    if (this.config.type === 'file' && this.config.path) {
      const filePath = path.join(this.config.path, `${profile.id}.json`);
      try {
        await fs.writeFile(
          filePath,
          JSON.stringify(profile, null, 2),
          'utf-8'
        );
        logger.debug(`Profile saved: ${profile.id}`);
      } catch (error) {
        logger.error(`Failed to save profile ${profile.id}:`, error);
        throw error;
      }
    } else {
      this.memoryStore.set(profile.id, profile);
    }
  }

  /**
   * Load a profile by ID
   */
  async load(profileId: string): Promise<BrowserProfile | null> {
    if (this.config.type === 'file' && this.config.path) {
      const filePath = path.join(this.config.path, `${profileId}.json`);
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const profile = JSON.parse(data);

        // Convert date strings back to Date objects
        profile.createdAt = new Date(profile.createdAt);
        profile.lastUsed = new Date(profile.lastUsed);

        logger.debug(`Profile loaded: ${profileId}`);
        return profile;
      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          logger.warn(`Profile not found: ${profileId}`);
          return null;
        }
        logger.error(`Failed to load profile ${profileId}:`, error);
        throw error;
      }
    } else {
      return this.memoryStore.get(profileId) || null;
    }
  }

  /**
   * Delete a profile
   */
  async delete(profileId: string): Promise<void> {
    if (this.config.type === 'file' && this.config.path) {
      const filePath = path.join(this.config.path, `${profileId}.json`);
      try {
        await fs.unlink(filePath);
        logger.debug(`Profile deleted: ${profileId}`);
      } catch (error) {
        if ((error as any).code !== 'ENOENT') {
          logger.error(`Failed to delete profile ${profileId}:`, error);
          throw error;
        }
      }
    } else {
      this.memoryStore.delete(profileId);
    }
  }

  /**
   * List all profiles
   */
  async list(): Promise<string[]> {
    if (this.config.type === 'file' && this.config.path) {
      try {
        const files = await fs.readdir(this.config.path);
        return files
          .filter((f) => f.endsWith('.json'))
          .map((f) => f.replace('.json', ''));
      } catch (error) {
        logger.error('Failed to list profiles:', error);
        return [];
      }
    } else {
      return Array.from(this.memoryStore.keys());
    }
  }

  /**
   * Check if a profile exists
   */
  async exists(profileId: string): Promise<boolean> {
    if (this.config.type === 'file' && this.config.path) {
      const filePath = path.join(this.config.path, `${profileId}.json`);
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    } else {
      return this.memoryStore.has(profileId);
    }
  }
}
