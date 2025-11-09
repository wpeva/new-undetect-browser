/**
 * Profile Manager API Routes
 * Manages browser profiles with full CRUD operations
 */

import { Router, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../../src/utils/logger';

const router = Router();

/**
 * In-memory profile store (replace with database in production)
 */
interface BrowserProfile {
  id: string;
  userId: string;
  name: string;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timezone?: string;
  locale?: string;
  fingerprint?: {
    canvas: boolean;
    webgl: boolean;
    audio: boolean;
  };
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  cookies?: any[];
  localStorage?: Record<string, string>;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
}

const profiles: Map<string, BrowserProfile> = new Map();

// Default profiles
const defaultProfiles: BrowserProfile[] = [
  {
    id: '1',
    userId: '1',
    name: 'Default Chrome - Windows',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    timezone: 'America/New_York',
    locale: 'en-US',
    fingerprint: { canvas: true, webgl: true, audio: true },
    tags: ['windows', 'chrome', 'default'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    userId: '1',
    name: 'MacOS Safari',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    viewport: { width: 1440, height: 900 },
    timezone: 'America/Los_Angeles',
    locale: 'en-US',
    fingerprint: { canvas: true, webgl: true, audio: true },
    tags: ['macos', 'safari'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    userId: '1',
    name: 'Mobile Chrome - Android',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    timezone: 'America/New_York',
    locale: 'en-US',
    fingerprint: { canvas: true, webgl: true, audio: true },
    tags: ['android', 'mobile', 'chrome'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Initialize with default profiles
defaultProfiles.forEach((profile) => profiles.set(profile.id, profile));

/**
 * GET /api/profiles
 * Get all profiles for current user
 */
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || '1'; // Default to user 1 if not authenticated

    const userProfiles = Array.from(profiles.values())
      .filter((profile) => profile.userId === userId)
      .map((profile) => ({
        ...profile,
        // Don't expose sensitive data like proxy credentials
        proxy: profile.proxy ? {
          host: profile.proxy.host,
          port: profile.proxy.port,
          // username/password hidden
        } : undefined,
      }));

    return res.json({
      success: true,
      profiles: userProfiles,
      total: userProfiles.length,
    });
  } catch (error: any) {
    logger.error('Get profiles failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/profiles/:id
 * Get single profile by ID
 */
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || '1';

    const profile = profiles.get(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    // Check ownership
    if (profile.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    return res.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    logger.error('Get profile failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/profiles
 * Create new profile
 */
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || '1';
    const { name, userAgent, viewport, geolocation, timezone, locale, fingerprint, proxy, tags, notes } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Profile name is required',
      });
    }

    // Generate profile ID
    const profileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newProfile: BrowserProfile = {
      id: profileId,
      userId,
      name,
      userAgent,
      viewport,
      geolocation,
      timezone,
      locale,
      fingerprint,
      proxy,
      tags: tags || [],
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    profiles.set(profileId, newProfile);

    logger.info(`Profile created: ${profileId} by user ${userId}`);

    return res.status(201).json({
      success: true,
      profile: newProfile,
    });
  } catch (error: any) {
    logger.error('Create profile failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/profiles/:id
 * Update existing profile
 */
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || '1';

    const profile = profiles.get(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    // Check ownership
    if (profile.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Update profile
    const { name, userAgent, viewport, geolocation, timezone, locale, fingerprint, proxy, tags, notes } = req.body;

    const updatedProfile: BrowserProfile = {
      ...profile,
      name: name || profile.name,
      userAgent: userAgent !== undefined ? userAgent : profile.userAgent,
      viewport: viewport || profile.viewport,
      geolocation: geolocation || profile.geolocation,
      timezone: timezone || profile.timezone,
      locale: locale || profile.locale,
      fingerprint: fingerprint || profile.fingerprint,
      proxy: proxy !== undefined ? proxy : profile.proxy,
      tags: tags || profile.tags,
      notes: notes !== undefined ? notes : profile.notes,
      updatedAt: new Date(),
    };

    profiles.set(id, updatedProfile);

    logger.info(`Profile updated: ${id} by user ${userId}`);

    return res.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error: any) {
    logger.error('Update profile failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/profiles/:id
 * Delete profile
 */
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || '1';

    const profile = profiles.get(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    // Check ownership
    if (profile.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    profiles.delete(id);

    logger.info(`Profile deleted: ${id} by user ${userId}`);

    return res.json({
      success: true,
      message: 'Profile deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete profile failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/profiles/:id/clone
 * Clone existing profile
 */
router.post('/:id/clone', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || '1';

    const profile = profiles.get(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    // Check ownership
    if (profile.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Create cloned profile
    const clonedProfileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clonedProfile: BrowserProfile = {
      ...profile,
      id: clonedProfileId,
      userId,
      name: `${profile.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: undefined,
    };

    profiles.set(clonedProfileId, clonedProfile);

    logger.info(`Profile cloned: ${id} → ${clonedProfileId} by user ${userId}`);

    return res.status(201).json({
      success: true,
      profile: clonedProfile,
    });
  } catch (error: any) {
    logger.error('Clone profile failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/profiles/:id/use
 * Mark profile as used (updates lastUsed timestamp)
 */
router.post('/:id/use', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || '1';

    const profile = profiles.get(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    // Check ownership
    if (profile.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    profile.lastUsed = new Date();
    profiles.set(id, profile);

    return res.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    logger.error('Use profile failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
