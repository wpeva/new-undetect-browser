/**
 * Biometric Behavior Profiler
 * Creates unique, consistent behavioral profiles for each user/session
 * Implements machine learning for adaptive behavior
 */

import { logger } from '../utils/logger';
import { BIOMETRIC_VARIANCE } from '../utils/human-behavior-stats';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Biometric profile for a user
 */
export interface BiometricProfile {
  id: string;
  name: string;
  created: string;
  lastUsed: string;
  sessionCount: number;

  // Behavioral characteristics
  behavior: {
    mouseSpeed: number; // 0.5-2.0 multiplier
    typingSpeed: number; // WPM
    readingSpeed: number; // WPM
    errorRate: number; // 0-1
    attentionSpan: number; // seconds
    impulsiveness: number; // 0-1 (affects pauses)
  };

  // Learned patterns
  patterns: {
    commonDigraphs: Record<string, number>; // Typing speed for common pairs
    mouseTrajectories: Array<{ start: Point; end: Point; duration: number }>;
    clickLocations: Array<{ element: string; position: Point }>;
    scrollDistances: number[]; // Common scroll distances
    pausePatterns: number[]; // Common pause durations
  };

  // Time-based variations
  timeOfDay: {
    morning: number; // Performance multiplier
    afternoon: number;
    evening: number;
  };

  // Learning progress
  learning: {
    sessionsCompleted: number;
    averageSessionDuration: number;
    errorTrend: number[]; // Last 10 sessions
    speedTrend: number[]; // Last 10 sessions
  };
}

interface Point {
  x: number;
  y: number;
}

/**
 * Biometric Profiler Class
 */
export class BiometricProfiler {
  private profiles: Map<string, BiometricProfile> = new Map();
  private dataDir: string;
  private currentProfile: BiometricProfile | null = null;

  constructor(dataDir: string = './.undetect/biometric') {
    this.dataDir = dataDir;
    logger.info('Biometric Profiler initialized');
  }

  /**
   * Initialize profiler
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await this.loadAllProfiles();
    logger.info(`Loaded ${this.profiles.size} biometric profiles`);
  }

  /**
   * Create new biometric profile
   */
  async createProfile(name: string, baseCharacteristics?: Partial<BiometricProfile['behavior']>): Promise<BiometricProfile> {
    const profile: BiometricProfile = {
      id: `bio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      sessionCount: 0,

      behavior: {
        mouseSpeed: baseCharacteristics?.mouseSpeed || this.generateRandomCharacteristic(0.7, 1.3),
        typingSpeed: baseCharacteristics?.typingSpeed || this.generateRandomCharacteristic(35, 65),
        readingSpeed: baseCharacteristics?.readingSpeed || this.generateRandomCharacteristic(200, 300),
        errorRate: baseCharacteristics?.errorRate || this.generateRandomCharacteristic(0.01, 0.03),
        attentionSpan: baseCharacteristics?.attentionSpan || this.generateRandomCharacteristic(30, 180),
        impulsiveness: baseCharacteristics?.impulsiveness || this.generateRandomCharacteristic(0.2, 0.8),
        ...baseCharacteristics,
      },

      patterns: {
        commonDigraphs: {},
        mouseTrajectories: [],
        clickLocations: [],
        scrollDistances: [],
        pausePatterns: [],
      },

      timeOfDay: {
        morning: this.generateRandomCharacteristic(0.90, 1.05),
        afternoon: this.generateRandomCharacteristic(0.85, 0.95),
        evening: this.generateRandomCharacteristic(0.75, 0.90),
      },

      learning: {
        sessionsCompleted: 0,
        averageSessionDuration: 0,
        errorTrend: [],
        speedTrend: [],
      },
    };

    this.profiles.set(profile.id, profile);
    await this.saveProfile(profile);

    logger.info(`Created biometric profile: ${name} (${profile.id})`);
    return profile;
  }

  /**
   * Load profile and set as current
   */
  async loadProfile(profileId: string): Promise<BiometricProfile | null> {
    let profile = this.profiles.get(profileId);

    if (!profile) {
      // Try loading from disk
      profile = await this.loadProfileFromDisk(profileId);
      if (profile) {
        this.profiles.set(profileId, profile);
      }
    }

    if (profile) {
      this.currentProfile = profile;
      profile.lastUsed = new Date().toISOString();
      await this.saveProfile(profile);
      logger.info(`Loaded biometric profile: ${profile.name}`);
    }

    return profile;
  }

  /**
   * Get current profile
   */
  getCurrentProfile(): BiometricProfile | null {
    return this.currentProfile;
  }

  /**
   * Record mouse movement for learning
   */
  recordMouseMovement(start: Point, end: Point, duration: number): void {
    if (!this.currentProfile) {return;}

    const { mouseTrajectories } = this.currentProfile.patterns;

    // Keep last 100 movements
    if (mouseTrajectories.length >= 100) {
      mouseTrajectories.shift();
    }

    mouseTrajectories.push({ start, end, duration });

    // Update average mouse speed based on learned patterns
    if (mouseTrajectories.length >= 10) {
      const avgDuration = mouseTrajectories.reduce((sum, t) => sum + t.duration, 0) / mouseTrajectories.length;
      this.currentProfile.behavior.mouseSpeed = 1000 / avgDuration; // Normalize
    }
  }

  /**
   * Record typing for learning
   */
  recordTyping(digraph: string, duration: number): void {
    if (!this.currentProfile) {return;}

    const { commonDigraphs } = this.currentProfile.patterns;

    // Update digraph timing
    if (!commonDigraphs[digraph]) {
      commonDigraphs[digraph] = duration;
    } else {
      // Exponential moving average
      commonDigraphs[digraph] = commonDigraphs[digraph] * 0.8 + duration * 0.2;
    }
  }

  /**
   * Record click location for learning
   */
  recordClick(element: string, position: Point): void {
    if (!this.currentProfile) {return;}

    const { clickLocations } = this.currentProfile.patterns;

    // Keep last 50 clicks
    if (clickLocations.length >= 50) {
      clickLocations.shift();
    }

    clickLocations.push({ element, position });
  }

  /**
   * Record scroll distance for learning
   */
  recordScroll(distance: number): void {
    if (!this.currentProfile) {return;}

    const { scrollDistances } = this.currentProfile.patterns;

    // Keep last 50 scrolls
    if (scrollDistances.length >= 50) {
      scrollDistances.shift();
    }

    scrollDistances.push(distance);
  }

  /**
   * Record pause for learning
   */
  recordPause(duration: number): void {
    if (!this.currentProfile) {return;}

    const { pausePatterns } = this.currentProfile.patterns;

    // Keep last 50 pauses
    if (pausePatterns.length >= 50) {
      pausePatterns.shift();
    }

    pausePatterns.push(duration);
  }

  /**
   * Complete session and update learning
   */
  async completeSession(sessionDuration: number, errorCount: number, actionCount: number): Promise<void> {
    if (!this.currentProfile) {return;}

    const profile = this.currentProfile;

    // Update session count
    profile.sessionCount++;
    profile.learning.sessionsCompleted++;

    // Update average session duration
    const { averageSessionDuration, sessionsCompleted } = profile.learning;
    profile.learning.averageSessionDuration =
      (averageSessionDuration * (sessionsCompleted - 1) + sessionDuration) / sessionsCompleted;

    // Update error trend
    const errorRate = actionCount > 0 ? errorCount / actionCount : 0;
    profile.learning.errorTrend.push(errorRate);
    if (profile.learning.errorTrend.length > 10) {
      profile.learning.errorTrend.shift();
    }

    // Apply learning effect (get better over time)
    if (BIOMETRIC_VARIANCE.learning.enabled && sessionsCompleted < BIOMETRIC_VARIANCE.learning.plateau) {
      profile.behavior.errorRate *= BIOMETRIC_VARIANCE.learning.errorReduction;
      profile.behavior.typingSpeed *= BIOMETRIC_VARIANCE.learning.speedImprovement;
    }

    // Update speed trend
    profile.learning.speedTrend.push(profile.behavior.typingSpeed);
    if (profile.learning.speedTrend.length > 10) {
      profile.learning.speedTrend.shift();
    }

    // Save profile
    await this.saveProfile(profile);

    logger.info(`Session completed for profile ${profile.name}: ${sessionDuration}ms, ${errorCount} errors`);
  }

  /**
   * Get behavior adjustments for current time of day
   */
  getTimeOfDayMultiplier(): number {
    if (!this.currentProfile) {return 1.0;}

    const hour = new Date().getHours();

    if (hour >= 6 && hour < 12) {
      return this.currentProfile.timeOfDay.morning;
    } else if (hour >= 12 && hour < 18) {
      return this.currentProfile.timeOfDay.afternoon;
    } else {
      return this.currentProfile.timeOfDay.evening;
    }
  }

  /**
   * Get learned typing speed for specific digraph
   */
  getDigraphSpeed(digraph: string): number | null {
    if (!this.currentProfile) {return null;}

    return this.currentProfile.patterns.commonDigraphs[digraph] || null;
  }

  /**
   * Get average scroll distance
   */
  getAverageScrollDistance(): number {
    if (!this.currentProfile || this.currentProfile.patterns.scrollDistances.length === 0) {
      return 400; // Default
    }

    const { scrollDistances } = this.currentProfile.patterns;
    return scrollDistances.reduce((sum, d) => sum + d, 0) / scrollDistances.length;
  }

  /**
   * Get average pause duration
   */
  getAveragePauseDuration(): number {
    if (!this.currentProfile || this.currentProfile.patterns.pausePatterns.length === 0) {
      return 1000; // Default
    }

    const { pausePatterns } = this.currentProfile.patterns;
    return pausePatterns.reduce((sum, p) => sum + p, 0) / pausePatterns.length;
  }

  /**
   * Export profile
   */
  async exportProfile(profileId: string, outputPath: string): Promise<void> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    await fs.writeFile(outputPath, JSON.stringify(profile, null, 2));
    logger.info(`Exported biometric profile to ${outputPath}`);
  }

  /**
   * Import profile
   */
  async importProfile(inputPath: string): Promise<BiometricProfile> {
    const data = await fs.readFile(inputPath, 'utf-8');
    const profile: BiometricProfile = JSON.parse(data);

    this.profiles.set(profile.id, profile);
    await this.saveProfile(profile);

    logger.info(`Imported biometric profile: ${profile.name}`);
    return profile;
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): BiometricProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Delete profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    const filePath = path.join(this.dataDir, `${profileId}.json`);
    await fs.unlink(filePath);
    this.profiles.delete(profileId);

    if (this.currentProfile?.id === profileId) {
      this.currentProfile = null;
    }

    logger.info(`Deleted biometric profile: ${profile.name}`);
  }

  /**
   * Private: Generate random characteristic
   */
  private generateRandomCharacteristic(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Private: Load all profiles from disk
   */
  private async loadAllProfiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.dataDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const profilePath = path.join(this.dataDir, file);
          try {
            const data = await fs.readFile(profilePath, 'utf-8');
            const profile: BiometricProfile = JSON.parse(data);
            this.profiles.set(profile.id, profile);
          } catch (error) {
            logger.warn(`Failed to load profile ${file}:`, error);
          }
        }
      }
    } catch (_error) {
      // Directory doesn't exist yet
    }
  }

  /**
   * Private: Load profile from disk
   */
  private async loadProfileFromDisk(profileId: string): Promise<BiometricProfile | null> {
    try {
      const filePath = path.join(this.dataDir, `${profileId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Private: Save profile to disk
   */
  private async saveProfile(profile: BiometricProfile): Promise<void> {
    const filePath = path.join(this.dataDir, `${profile.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(profile, null, 2));
  }
}

/**
 * Create biometric profiler instance
 */
export function createBiometricProfiler(dataDir?: string): BiometricProfiler {
  return new BiometricProfiler(dataDir);
}
