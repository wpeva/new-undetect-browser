import { BrowserProfile } from '../storage/profile-storage';
import { ProfileManager, ProfileOptions } from './profile-manager';
import { logger } from '../utils/logger';
import { validateRequired, validateNonEmptyString } from '../utils/validators';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Extended profile with metadata for advanced management
 */
export interface AdvancedProfile extends BrowserProfile {
  metadata: ProfileMetadata;
}

/**
 * Profile metadata for organization and management
 */
export interface ProfileMetadata {
  name: string;
  description?: string;
  tags: string[];
  category?: string;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  notes?: string;
  website?: string;
  proxy?: ProxyConfig;
  cookies?: CookieData[];
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
}

/**
 * Proxy configuration for profile
 */
export interface ProxyConfig {
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  enabled: boolean;
}

/**
 * Cookie data for persistence
 */
export interface CookieData {
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
 * Profile search filters
 */
export interface ProfileFilters {
  name?: string;
  tags?: string[];
  category?: string;
  website?: string;
  hasProxy?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  usedAfter?: Date;
}

/**
 * Profile export format
 */
export interface ProfileExport {
  version: string;
  exportDate: string;
  profiles: AdvancedProfile[];
}

/**
 * Advanced Profile Manager
 * Enterprise-grade multi-profile management like Multilogin
 */
export class AdvancedProfileManager extends ProfileManager {
  private profiles: Map<string, AdvancedProfile> = new Map();
  private categories: Set<string> = new Set();
  private tags: Set<string> = new Set();

  /**
   * Initialize and load all profiles
   */
  async initialize(): Promise<void> {
    await super.initialize();
    await this.loadAllProfiles();
    logger.info(`Loaded ${this.profiles.size} profiles`);
  }

  /**
   * Create advanced profile with metadata
   */
  async createAdvancedProfile(
    name: string,
    options?: ProfileOptions & { metadata?: Partial<ProfileMetadata> }
  ): Promise<AdvancedProfile> {
    validateRequired(name, 'Profile name');
    validateNonEmptyString(name, 'Profile name');

    // Create base profile
    const baseProfile = await super.createProfile(options);

    // Add metadata
    const metadata: ProfileMetadata = {
      name,
      description: options?.metadata?.description,
      tags: options?.metadata?.tags || [],
      category: options?.metadata?.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: options?.metadata?.notes,
      website: options?.metadata?.website,
      proxy: options?.metadata?.proxy,
      cookies: options?.metadata?.cookies || [],
      localStorage: options?.metadata?.localStorage || {},
      sessionStorage: options?.metadata?.sessionStorage || {},
    };

    const advancedProfile: AdvancedProfile = {
      ...baseProfile,
      metadata,
    };

    // Save profile
    await this.saveAdvancedProfile(advancedProfile);

    // Update indices
    this.profiles.set(advancedProfile.id, advancedProfile);
    if (metadata.category) {
      this.categories.add(metadata.category);
    }
    metadata.tags.forEach((tag) => this.tags.add(tag));

    logger.info(`Created advanced profile: ${name} (${advancedProfile.id})`);
    return advancedProfile;
  }

  /**
   * Load advanced profile by ID
   */
  async loadAdvancedProfile(id: string): Promise<AdvancedProfile | null> {
    validateRequired(id, 'Profile ID');

    // Check cache first
    if (this.profiles.has(id)) {
      return this.profiles.get(id)!;
    }

    // Load from storage
    const profilePath = path.join(
      this.storage.config.dataDir,
      'profiles',
      `${id}.json`
    );

    try {
      const data = await fs.readFile(profilePath, 'utf-8');
      const profile: AdvancedProfile = JSON.parse(data);
      this.profiles.set(id, profile);
      return profile;
    } catch (error) {
      logger.warn(`Profile ${id} not found`);
      return null;
    }
  }

  /**
   * Update profile metadata
   */
  async updateProfile(
    id: string,
    updates: Partial<ProfileMetadata>
  ): Promise<AdvancedProfile> {
    const profile = await this.loadAdvancedProfile(id);
    if (!profile) {
      throw new Error(`Profile ${id} not found`);
    }

    // Update metadata
    profile.metadata = {
      ...profile.metadata,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Update indices
    if (updates.category) {
      this.categories.add(updates.category);
    }
    if (updates.tags) {
      updates.tags.forEach((tag) => this.tags.add(tag));
    }

    // Save
    await this.saveAdvancedProfile(profile);
    this.profiles.set(id, profile);

    logger.info(`Updated profile: ${profile.metadata.name}`);
    return profile;
  }

  /**
   * Mark profile as used
   */
  async markProfileUsed(id: string): Promise<void> {
    const profile = await this.loadAdvancedProfile(id);
    if (profile) {
      profile.metadata.lastUsed = new Date().toISOString();
      await this.saveAdvancedProfile(profile);
    }
  }

  /**
   * Search profiles with filters
   */
  async searchProfiles(filters: ProfileFilters): Promise<AdvancedProfile[]> {
    let results = Array.from(this.profiles.values());

    // Filter by name
    if (filters.name) {
      const searchTerm = filters.name.toLowerCase();
      results = results.filter((p) =>
        p.metadata.name.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter((p) =>
        filters.tags!.some((tag) => p.metadata.tags.includes(tag))
      );
    }

    // Filter by category
    if (filters.category) {
      results = results.filter((p) => p.metadata.category === filters.category);
    }

    // Filter by website
    if (filters.website) {
      results = results.filter((p) => p.metadata.website === filters.website);
    }

    // Filter by proxy
    if (filters.hasProxy !== undefined) {
      results = results.filter(
        (p) => (p.metadata.proxy?.enabled || false) === filters.hasProxy
      );
    }

    // Filter by creation date
    if (filters.createdAfter) {
      results = results.filter(
        (p) => new Date(p.metadata.createdAt) >= filters.createdAfter!
      );
    }

    if (filters.createdBefore) {
      results = results.filter(
        (p) => new Date(p.metadata.createdAt) <= filters.createdBefore!
      );
    }

    // Filter by last used
    if (filters.usedAfter && filters.usedAfter) {
      results = results.filter(
        (p) =>
          p.metadata.lastUsed &&
          new Date(p.metadata.lastUsed) >= filters.usedAfter!
      );
    }

    return results;
  }

  /**
   * Get all profiles
   */
  async getAllProfiles(): Promise<AdvancedProfile[]> {
    return Array.from(this.profiles.values());
  }

  /**
   * Get profiles by category
   */
  async getProfilesByCategory(category: string): Promise<AdvancedProfile[]> {
    return this.searchProfiles({ category });
  }

  /**
   * Get profiles by tags
   */
  async getProfilesByTags(tags: string[]): Promise<AdvancedProfile[]> {
    return this.searchProfiles({ tags });
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories);
  }

  /**
   * Get all tags
   */
  getTags(): string[] {
    return Array.from(this.tags);
  }

  /**
   * Delete profile
   */
  async deleteProfile(id: string): Promise<void> {
    const profile = await this.loadAdvancedProfile(id);
    if (!profile) {
      throw new Error(`Profile ${id} not found`);
    }

    // Delete from storage
    const profilePath = path.join(
      this.storage.config.dataDir,
      'profiles',
      `${id}.json`
    );

    await fs.unlink(profilePath);

    // Remove from cache
    this.profiles.delete(id);

    logger.info(`Deleted profile: ${profile.metadata.name}`);
  }

  /**
   * Clone profile
   */
  async cloneProfile(
    id: string,
    newName: string
  ): Promise<AdvancedProfile> {
    const original = await this.loadAdvancedProfile(id);
    if (!original) {
      throw new Error(`Profile ${id} not found`);
    }

    // Create clone with new ID
    const clone: AdvancedProfile = {
      ...original,
      id: this.generateProfileId(),
      metadata: {
        ...original.metadata,
        name: newName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsed: undefined,
      },
    };

    await this.saveAdvancedProfile(clone);
    this.profiles.set(clone.id, clone);

    logger.info(`Cloned profile: ${newName} from ${original.metadata.name}`);
    return clone;
  }

  /**
   * Export profiles to JSON
   */
  async exportProfiles(
    profileIds?: string[],
    filePath?: string
  ): Promise<ProfileExport> {
    let profilesToExport: AdvancedProfile[];

    if (profileIds) {
      profilesToExport = await Promise.all(
        profileIds.map((id) => this.loadAdvancedProfile(id))
      ).then((profiles) =>
        profiles.filter((p): p is AdvancedProfile => p !== null)
      );
    } else {
      profilesToExport = Array.from(this.profiles.values());
    }

    const exportData: ProfileExport = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      profiles: profilesToExport,
    };

    if (filePath) {
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
      logger.info(`Exported ${profilesToExport.length} profiles to ${filePath}`);
    }

    return exportData;
  }

  /**
   * Import profiles from JSON
   */
  async importProfiles(
    data: ProfileExport | string,
    options?: {
      skipExisting?: boolean;
      updateExisting?: boolean;
    }
  ): Promise<AdvancedProfile[]> {
    const exportData: ProfileExport =
      typeof data === 'string' ? JSON.parse(data) : data;

    const imported: AdvancedProfile[] = [];

    for (const profile of exportData.profiles) {
      const exists = this.profiles.has(profile.id);

      if (exists && options?.skipExisting) {
        logger.info(`Skipping existing profile: ${profile.metadata.name}`);
        continue;
      }

      if (exists && options?.updateExisting) {
        await this.saveAdvancedProfile(profile);
        this.profiles.set(profile.id, profile);
        logger.info(`Updated profile: ${profile.metadata.name}`);
      } else if (!exists) {
        await this.saveAdvancedProfile(profile);
        this.profiles.set(profile.id, profile);
        logger.info(`Imported profile: ${profile.metadata.name}`);
      }

      imported.push(profile);
    }

    logger.info(`Imported ${imported.length} profiles`);
    return imported;
  }

  /**
   * Import from file
   */
  async importFromFile(
    filePath: string,
    options?: { skipExisting?: boolean; updateExisting?: boolean }
  ): Promise<AdvancedProfile[]> {
    const data = await fs.readFile(filePath, 'utf-8');
    return this.importProfiles(data, options);
  }

  /**
   * Get profile statistics
   */
  async getStatistics(): Promise<ProfileStatistics> {
    const profiles = Array.from(this.profiles.values());

    return {
      total: profiles.length,
      byCategory: this.groupByCategory(profiles),
      byTags: this.groupByTags(profiles),
      withProxy: profiles.filter((p) => p.metadata.proxy?.enabled).length,
      withCookies: profiles.filter((p) => p.metadata.cookies!.length > 0).length,
      recentlyUsed: profiles.filter((p) => {
        if (!p.metadata.lastUsed) return false;
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return new Date(p.metadata.lastUsed) >= dayAgo;
      }).length,
    };
  }

  /**
   * Private: Save advanced profile to storage
   */
  private async saveAdvancedProfile(profile: AdvancedProfile): Promise<void> {
    const profilePath = path.join(
      this.storage.config.dataDir,
      'profiles',
      `${profile.id}.json`
    );

    await fs.mkdir(path.dirname(profilePath), { recursive: true });
    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));
  }

  /**
   * Private: Load all profiles from storage
   */
  private async loadAllProfiles(): Promise<void> {
    const profilesDir = path.join(this.storage.config.dataDir, 'profiles');

    try {
      await fs.mkdir(profilesDir, { recursive: true });
      const files = await fs.readdir(profilesDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const profilePath = path.join(profilesDir, file);
          try {
            const data = await fs.readFile(profilePath, 'utf-8');
            const profile: AdvancedProfile = JSON.parse(data);

            this.profiles.set(profile.id, profile);

            // Update indices
            if (profile.metadata.category) {
              this.categories.add(profile.metadata.category);
            }
            profile.metadata.tags.forEach((tag) => this.tags.add(tag));
          } catch (error) {
            logger.warn(`Failed to load profile from ${file}:`, error);
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to load profiles:', error);
    }
  }

  /**
   * Private: Generate unique profile ID
   */
  private generateProfileId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Group profiles by category
   */
  private groupByCategory(profiles: AdvancedProfile[]): Record<string, number> {
    return profiles.reduce((acc, p) => {
      const category = p.metadata.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Private: Group profiles by tags
   */
  private groupByTags(profiles: AdvancedProfile[]): Record<string, number> {
    return profiles.reduce((acc, p) => {
      p.metadata.tags.forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
  }
}

/**
 * Profile statistics
 */
export interface ProfileStatistics {
  total: number;
  byCategory: Record<string, number>;
  byTags: Record<string, number>;
  withProxy: number;
  withCookies: number;
  recentlyUsed: number;
}
