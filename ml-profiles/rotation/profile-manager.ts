/**
 * Profile Manager
 *
 * Manages browser profile lifecycle including:
 * - Profile creation and storage
 * - Automatic rotation based on policies
 * - Profile retirement and cleanup
 * - Statistics and monitoring
 */

import { EventEmitter } from 'events';
import { ProfileGenerator, Profile } from '../generator/fingerprint-generator';
import { AntiCorrelation } from './anti-correlation';

export interface ManagerOptions {
  rotationPolicy: 'time-based' | 'request-based' | 'detection-based' | 'hybrid';
  rotationInterval?: number;       // milliseconds (for time-based)
  requestsPerProfile?: number;     // count (for request-based)
  maxProfileAge?: number;          // milliseconds
  rotationVariation?: number;      // 0-1 (random variation in timing)
  antiCorrelation?: boolean;
  minDissimilarity?: number;       // 0-1
  storageType?: 'memory' | 'redis' | 'postgres';
  retentionDays?: number;
}

export interface ProfileStatistics {
  totalProfiles: number;
  activeProfiles: number;
  retiredProfiles: number;
  avgDetectionRate: number;
  avgLifetime: number;  // milliseconds
  rotationReasons: { [key: string]: number };
}

export interface ProfileFilter {
  status?: 'active' | 'retired';
  deviceType?: string;
  osType?: string;
  minAge?: number;
  maxAge?: number;
}

interface StoredProfile {
  profile: Profile;
  sessionId: string;
  status: 'active' | 'retired';
  createdAt: number;
  lastUsedAt: number;
  requestCount: number;
  detectionCount: number;
  rotationHistory: Array<{
    timestamp: number;
    reason: string;
  }>;
}

export class ProfileManager extends EventEmitter {
  private options: Required<ManagerOptions>;
  private generator: ProfileGenerator;
  private antiCorrelation: AntiCorrelation;
  private storage: Map<string, StoredProfile>;  // sessionId -> StoredProfile
  private rotationTimers: Map<string, NodeJS.Timeout>;

  constructor(options: ManagerOptions) {
    super();

    this.options = {
      rotationPolicy: options.rotationPolicy,
      rotationInterval: options.rotationInterval || 24 * 60 * 60 * 1000,  // 24 hours
      requestsPerProfile: options.requestsPerProfile || 1000,
      maxProfileAge: options.maxProfileAge || 7 * 24 * 60 * 60 * 1000,  // 7 days
      rotationVariation: options.rotationVariation || 0.2,  // ±20%
      antiCorrelation: options.antiCorrelation !== false,  // default true
      minDissimilarity: options.minDissimilarity || 0.7,
      storageType: options.storageType || 'memory',
      retentionDays: options.retentionDays || 30
    };

    this.generator = new ProfileGenerator();
    this.antiCorrelation = new AntiCorrelation(this.generator, this.options.minDissimilarity);
    this.storage = new Map();
    this.rotationTimers = new Map();

    // Start cleanup interval (daily)
    setInterval(() => this.cleanup(), 24 * 60 * 60 * 1000);
  }

  /**
   * Get profile for session (create if doesn't exist)
   */
  async getProfile(sessionId: string): Promise<Profile> {
    let stored = this.storage.get(sessionId);

    if (!stored || stored.status === 'retired') {
      // Create new profile
      const profile = await this.createProfile(sessionId);
      return profile;
    }

    // Update last used time
    stored.lastUsedAt = Date.now();
    stored.requestCount++;

    // Check rotation conditions
    if (this.shouldRotate(stored)) {
      const reason = this.getRotationReason(stored);
      await this.rotateProfile(sessionId, reason);
      stored = this.storage.get(sessionId)!;
    }

    return stored.profile;
  }

  /**
   * Create new profile for session
   */
  private async createProfile(sessionId: string): Promise<Profile> {
    let profile: Profile;

    // Generate with anti-correlation if enabled
    if (this.options.antiCorrelation) {
      const existingProfiles = this.getActiveProfiles();
      profile = await this.antiCorrelation.generateUncorrelated(existingProfiles);
    } else {
      profile = await this.generator.generate();
    }

    // Store profile
    const stored: StoredProfile = {
      profile,
      sessionId,
      status: 'active',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      requestCount: 0,
      detectionCount: 0,
      rotationHistory: []
    };

    this.storage.set(sessionId, stored);

    // Set up rotation timer if time-based
    if (this.options.rotationPolicy === 'time-based' || this.options.rotationPolicy === 'hybrid') {
      this.scheduleRotation(sessionId);
    }

    this.emit('created', sessionId, profile);
    return profile;
  }

  /**
   * Rotate profile for session
   */
  async rotateProfile(sessionId: string, reason: string = 'manual'): Promise<Profile> {
    const stored = this.storage.get(sessionId);

    if (stored) {
      // Mark old profile as retired
      stored.status = 'retired';
      stored.rotationHistory.push({
        timestamp: Date.now(),
        reason
      });

      this.emit('rotation', sessionId, reason, stored.profile);
    }

    // Cancel existing rotation timer
    const timer = this.rotationTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.rotationTimers.delete(sessionId);
    }

    // Create new profile
    const newProfile = await this.createProfile(sessionId);

    return newProfile;
  }

  /**
   * Retire profile (stop using but keep for retention period)
   */
  async retireProfile(sessionId: string): Promise<void> {
    const stored = this.storage.get(sessionId);

    if (stored) {
      stored.status = 'retired';
      stored.rotationHistory.push({
        timestamp: Date.now(),
        reason: 'manual-retirement'
      });

      // Cancel rotation timer
      const timer = this.rotationTimers.get(sessionId);
      if (timer) {
        clearTimeout(timer);
        this.rotationTimers.delete(sessionId);
      }

      this.emit('retired', sessionId, stored.profile);
    }
  }

  /**
   * Report detection for profile
   */
  async reportDetection(sessionId: string, details?: any): Promise<void> {
    const stored = this.storage.get(sessionId);

    if (stored) {
      stored.detectionCount++;
      this.emit('detection', sessionId, stored.profile, details);

      // Rotate immediately if detection-based policy
      if (
        this.options.rotationPolicy === 'detection-based' ||
        this.options.rotationPolicy === 'hybrid'
      ) {
        await this.rotateProfile(sessionId, 'detection');
      }
    }
  }

  /**
   * List profiles with optional filters
   */
  async listProfiles(filter?: ProfileFilter): Promise<Profile[]> {
    let profiles = Array.from(this.storage.values());

    if (filter) {
      if (filter.status) {
        profiles = profiles.filter((p) => p.status === filter.status);
      }

      if (filter.deviceType) {
        profiles = profiles.filter(
          (p) => p.profile.metadata.deviceType === filter.deviceType
        );
      }

      if (filter.osType) {
        profiles = profiles.filter((p) => p.profile.metadata.osType === filter.osType);
      }

      if (filter.minAge !== undefined) {
        const minTime = Date.now() - filter.minAge;
        profiles = profiles.filter((p) => p.createdAt <= minTime);
      }

      if (filter.maxAge !== undefined) {
        const maxTime = Date.now() - filter.maxAge;
        profiles = profiles.filter((p) => p.createdAt >= maxTime);
      }
    }

    return profiles.map((p) => p.profile);
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<ProfileStatistics> {
    const all = Array.from(this.storage.values());
    const active = all.filter((p) => p.status === 'active');
    const retired = all.filter((p) => p.status === 'retired');

    // Calculate average detection rate
    const totalDetections = all.reduce((sum, p) => sum + p.detectionCount, 0);
    const totalRequests = all.reduce((sum, p) => sum + p.requestCount, 0);
    const avgDetectionRate = totalRequests > 0 ? totalDetections / totalRequests : 0;

    // Calculate average lifetime
    const lifetimes = all.map((p) => p.lastUsedAt - p.createdAt);
    const avgLifetime = lifetimes.length > 0
      ? lifetimes.reduce((sum, l) => sum + l, 0) / lifetimes.length
      : 0;

    // Count rotation reasons
    const rotationReasons: { [key: string]: number } = {};
    for (const stored of all) {
      for (const rotation of stored.rotationHistory) {
        rotationReasons[rotation.reason] = (rotationReasons[rotation.reason] || 0) + 1;
      }
    }

    return {
      totalProfiles: all.length,
      activeProfiles: active.length,
      retiredProfiles: retired.length,
      avgDetectionRate,
      avgLifetime,
      rotationReasons
    };
  }

  /**
   * Check if profile should rotate
   */
  private shouldRotate(stored: StoredProfile): boolean {
    const age = Date.now() - stored.createdAt;

    // Always rotate if max age exceeded
    if (age > this.options.maxProfileAge) {
      return true;
    }

    // Check policy-specific conditions
    switch (this.options.rotationPolicy) {
      case 'time-based':
        return age > this.getRotationInterval();

      case 'request-based':
        return stored.requestCount >= this.options.requestsPerProfile;

      case 'detection-based':
        return stored.detectionCount > 0;

      case 'hybrid':
        return (
          age > this.getRotationInterval() ||
          stored.requestCount >= this.options.requestsPerProfile ||
          stored.detectionCount > 0
        );

      default:
        return false;
    }
  }

  /**
   * Get rotation reason
   */
  private getRotationReason(stored: StoredProfile): string {
    const age = Date.now() - stored.createdAt;

    if (age > this.options.maxProfileAge) {
      return 'max-age';
    }

    if (stored.detectionCount > 0) {
      return 'detection';
    }

    if (stored.requestCount >= this.options.requestsPerProfile) {
      return 'request-limit';
    }

    if (age > this.getRotationInterval()) {
      return 'time-based';
    }

    return 'unknown';
  }

  /**
   * Get rotation interval with variation
   */
  private getRotationInterval(): number {
    const base = this.options.rotationInterval;
    const variation = base * this.options.rotationVariation;
    return base + (Math.random() * variation * 2 - variation);
  }

  /**
   * Schedule automatic rotation
   */
  private scheduleRotation(sessionId: string): void {
    const interval = this.getRotationInterval();

    const timer = setTimeout(async () => {
      await this.rotateProfile(sessionId, 'time-based');
    }, interval);

    this.rotationTimers.set(sessionId, timer);
  }

  /**
   * Get all active profiles (for anti-correlation)
   */
  private getActiveProfiles(): Profile[] {
    return Array.from(this.storage.values())
      .filter((p) => p.status === 'active')
      .map((p) => p.profile);
  }

  /**
   * Cleanup old retired profiles
   */
  private async cleanup(): Promise<void> {
    const retentionMs = this.options.retentionDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retentionMs;

    let deletedCount = 0;

    for (const [sessionId, stored] of this.storage.entries()) {
      if (stored.status === 'retired' && stored.lastUsedAt < cutoff) {
        this.storage.delete(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.emit('cleanup', deletedCount);
    }
  }

  /**
   * Export all profiles (for backup/migration)
   */
  async exportProfiles(): Promise<StoredProfile[]> {
    return Array.from(this.storage.values());
  }

  /**
   * Import profiles (for backup/migration)
   */
  async importProfiles(profiles: StoredProfile[]): Promise<void> {
    for (const stored of profiles) {
      this.storage.set(stored.sessionId, stored);

      // Reschedule rotation if active
      if (stored.status === 'active' &&
          (this.options.rotationPolicy === 'time-based' ||
           this.options.rotationPolicy === 'hybrid')) {
        this.scheduleRotation(stored.sessionId);
      }
    }

    this.emit('imported', profiles.length);
  }

  /**
   * Clear all profiles (for testing)
   */
  async clear(): Promise<void> {
    // Cancel all timers
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }

    this.rotationTimers.clear();
    this.storage.clear();

    this.emit('cleared');
  }

  /**
   * Get profile count
   */
  getProfileCount(): number {
    return this.storage.size;
  }

  /**
   * Get active profile count
   */
  getActiveProfileCount(): number {
    return Array.from(this.storage.values()).filter((p) => p.status === 'active').length;
  }
}

// Example usage:
/*
const manager = new ProfileManager({
  rotationPolicy: 'hybrid',
  rotationInterval: 24 * 60 * 60 * 1000,  // 24 hours
  requestsPerProfile: 1000,
  maxProfileAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  antiCorrelation: true,
  minDissimilarity: 0.7
});

// Get or create profile
const profile = await manager.getProfile('session-123');

// Report detection
await manager.reportDetection('session-123');

// Manual rotation
await manager.rotateProfile('session-123', 'manual');

// Statistics
const stats = await manager.getStatistics();
console.log(stats);

// Listen to events
manager.on('rotation', (sessionId, reason, oldProfile) => {
  console.log(`Profile rotated for ${sessionId}: ${reason}`);
});

manager.on('detection', (sessionId, profile, details) => {
  console.log(`Detection reported for ${sessionId}`);
});
*/
