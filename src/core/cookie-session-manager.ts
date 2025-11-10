import { Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { validateRequired } from '../utils/validators';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Cookie data structure
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
 * Storage data structure
 */
export interface StorageData {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

/**
 * Session snapshot containing all persistent data
 */
export interface SessionSnapshot {
  cookies: CookieData[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  url: string;
  timestamp: string;
}

/**
 * Cookie and Session Manager
 * Handles persistence of cookies, localStorage, and sessionStorage
 */
export class CookieSessionManager {
  private dataDir: string;

  constructor(dataDir = './.undetect/sessions') {
    this.dataDir = dataDir;
  }

  /**
   * Initialize storage directory
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    logger.info(`Cookie/Session storage initialized at ${this.dataDir}`);
  }

  /**
   * Save cookies from page
   */
  async saveCookies(page: Page, sessionId: string): Promise<CookieData[]> {
    validateRequired(sessionId, 'Session ID');

    try {
      const cookies = await page.cookies();
      const cookieData = cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite as 'Strict' | 'Lax' | 'None',
      }));

      const filePath = path.join(this.dataDir, `${sessionId}_cookies.json`);
      await fs.writeFile(filePath, JSON.stringify(cookieData, null, 2));

      logger.info(
        `Saved ${cookieData.length} cookies for session ${sessionId}`
      );
      return cookieData;
    } catch (error) {
      logger.error(`Failed to save cookies for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Restore cookies to page
   */
  async restoreCookies(page: Page, sessionId: string): Promise<number> {
    validateRequired(sessionId, 'Session ID');

    try {
      const filePath = path.join(this.dataDir, `${sessionId}_cookies.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const cookies: CookieData[] = JSON.parse(data);

      // Filter out expired cookies
      const now = Date.now() / 1000;
      const validCookies = cookies.filter((c) => {
        if (!c.expires) {return true;}
        return c.expires > now;
      });

      // Set cookies
      await page.setCookie(...validCookies);

      logger.info(
        `Restored ${validCookies.length}/${cookies.length} cookies for session ${sessionId}`
      );
      return validCookies.length;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info(`No cookies found for session ${sessionId}`);
        return 0;
      }
      logger.error(
        `Failed to restore cookies for session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Save localStorage from page
   */
  async saveLocalStorage(page: Page, sessionId: string): Promise<number> {
    validateRequired(sessionId, 'Session ID');

    try {
      const localStorage = await page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            data[key] = window.localStorage.getItem(key) || '';
          }
        }
        return data;
      });

      const filePath = path.join(
        this.dataDir,
        `${sessionId}_localStorage.json`
      );
      await fs.writeFile(filePath, JSON.stringify(localStorage, null, 2));

      const count = Object.keys(localStorage).length;
      logger.info(
        `Saved ${count} localStorage items for session ${sessionId}`
      );
      return count;
    } catch (error) {
      logger.error(
        `Failed to save localStorage for session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Restore localStorage to page
   */
  async restoreLocalStorage(page: Page, sessionId: string): Promise<number> {
    validateRequired(sessionId, 'Session ID');

    try {
      const filePath = path.join(
        this.dataDir,
        `${sessionId}_localStorage.json`
      );
      const data = await fs.readFile(filePath, 'utf-8');
      const localStorage: Record<string, string> = JSON.parse(data);

      await page.evaluate((data) => {
        for (const [key, value] of Object.entries(data)) {
          window.localStorage.setItem(key, value);
        }
      }, localStorage);

      const count = Object.keys(localStorage).length;
      logger.info(
        `Restored ${count} localStorage items for session ${sessionId}`
      );
      return count;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info(`No localStorage found for session ${sessionId}`);
        return 0;
      }
      logger.error(
        `Failed to restore localStorage for session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Save sessionStorage from page
   */
  async saveSessionStorage(page: Page, sessionId: string): Promise<number> {
    validateRequired(sessionId, 'Session ID');

    try {
      const sessionStorage = await page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            data[key] = window.sessionStorage.getItem(key) || '';
          }
        }
        return data;
      });

      const filePath = path.join(
        this.dataDir,
        `${sessionId}_sessionStorage.json`
      );
      await fs.writeFile(filePath, JSON.stringify(sessionStorage, null, 2));

      const count = Object.keys(sessionStorage).length;
      logger.info(
        `Saved ${count} sessionStorage items for session ${sessionId}`
      );
      return count;
    } catch (error) {
      logger.error(
        `Failed to save sessionStorage for session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Restore sessionStorage to page
   */
  async restoreSessionStorage(page: Page, sessionId: string): Promise<number> {
    validateRequired(sessionId, 'Session ID');

    try {
      const filePath = path.join(
        this.dataDir,
        `${sessionId}_sessionStorage.json`
      );
      const data = await fs.readFile(filePath, 'utf-8');
      const sessionStorage: Record<string, string> = JSON.parse(data);

      await page.evaluate((data) => {
        for (const [key, value] of Object.entries(data)) {
          window.sessionStorage.setItem(key, value);
        }
      }, sessionStorage);

      const count = Object.keys(sessionStorage).length;
      logger.info(
        `Restored ${count} sessionStorage items for session ${sessionId}`
      );
      return count;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info(`No sessionStorage found for session ${sessionId}`);
        return 0;
      }
      logger.error(
        `Failed to restore sessionStorage for session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Save complete session snapshot
   */
  async saveSession(page: Page, sessionId: string): Promise<SessionSnapshot> {
    validateRequired(sessionId, 'Session ID');

    try {
      const [cookies, localStorageCount, sessionStorageCount] =
        await Promise.all([
          this.saveCookies(page, sessionId),
          this.saveLocalStorage(page, sessionId),
          this.saveSessionStorage(page, sessionId),
        ]);

      const url = page.url();
      const snapshot: SessionSnapshot = {
        cookies,
        localStorage: await this.readStorageFile(
          sessionId,
          'localStorage.json'
        ),
        sessionStorage: await this.readStorageFile(
          sessionId,
          'sessionStorage.json'
        ),
        url,
        timestamp: new Date().toISOString(),
      };

      // Save complete snapshot
      const snapshotPath = path.join(
        this.dataDir,
        `${sessionId}_snapshot.json`
      );
      await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));

      logger.info(
        `Saved complete session snapshot for ${sessionId} (${cookies.length} cookies, ${localStorageCount} localStorage, ${sessionStorageCount} sessionStorage)`
      );

      return snapshot;
    } catch (error) {
      logger.error(
        `Failed to save session snapshot for ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Restore complete session snapshot
   */
  async restoreSession(page: Page, sessionId: string): Promise<boolean> {
    validateRequired(sessionId, 'Session ID');

    try {
      const snapshotPath = path.join(
        this.dataDir,
        `${sessionId}_snapshot.json`
      );
      const data = await fs.readFile(snapshotPath, 'utf-8');
      const snapshot: SessionSnapshot = JSON.parse(data);

      // Restore cookies first (before navigation)
      await this.restoreCookies(page, sessionId);

      // Navigate to saved URL if different
      const currentUrl = page.url();
      if (currentUrl !== snapshot.url) {
        await page.goto(snapshot.url, { waitUntil: 'domcontentloaded' });
      }

      // Restore storage
      await Promise.all([
        this.restoreLocalStorage(page, sessionId),
        this.restoreSessionStorage(page, sessionId),
      ]);

      logger.info(`Restored complete session snapshot for ${sessionId}`);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info(`No session snapshot found for ${sessionId}`);
        return false;
      }
      logger.error(
        `Failed to restore session snapshot for ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete session data
   */
  async deleteSession(sessionId: string): Promise<void> {
    validateRequired(sessionId, 'Session ID');

    try {
      const files = [
        `${sessionId}_cookies.json`,
        `${sessionId}_localStorage.json`,
        `${sessionId}_sessionStorage.json`,
        `${sessionId}_snapshot.json`,
      ];

      await Promise.all(
        files.map(async (file) => {
          try {
            await fs.unlink(path.join(this.dataDir, file));
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
              throw error;
            }
          }
        })
      );

      logger.info(`Deleted session data for ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to delete session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.dataDir);
      const sessionIds = new Set<string>();

      for (const file of files) {
        if (file.endsWith('_snapshot.json')) {
          const sessionId = file.replace('_snapshot.json', '');
          sessionIds.add(sessionId);
        }
      }

      return Array.from(sessionIds);
    } catch (error) {
      logger.error('Failed to list sessions:', error);
      return [];
    }
  }

  /**
   * Get session info
   */
  async getSessionInfo(sessionId: string): Promise<SessionSnapshot | null> {
    validateRequired(sessionId, 'Session ID');

    try {
      const snapshotPath = path.join(
        this.dataDir,
        `${sessionId}_snapshot.json`
      );
      const data = await fs.readFile(snapshotPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      logger.error(`Failed to get session info for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Clean expired cookies from session
   */
  async cleanExpiredCookies(sessionId: string): Promise<number> {
    validateRequired(sessionId, 'Session ID');

    try {
      const filePath = path.join(this.dataDir, `${sessionId}_cookies.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const cookies: CookieData[] = JSON.parse(data);

      const now = Date.now() / 1000;
      const validCookies = cookies.filter((c) => {
        if (!c.expires) {return true;}
        return c.expires > now;
      });

      const removed = cookies.length - validCookies.length;

      if (removed > 0) {
        await fs.writeFile(filePath, JSON.stringify(validCookies, null, 2));
        logger.info(
          `Cleaned ${removed} expired cookies from session ${sessionId}`
        );
      }

      return removed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return 0;
      }
      logger.error(
        `Failed to clean expired cookies for session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Export session to JSON
   */
  async exportSession(sessionId: string, outputPath: string): Promise<void> {
    validateRequired(sessionId, 'Session ID');
    validateRequired(outputPath, 'Output path');

    const snapshot = await this.getSessionInfo(sessionId);
    if (!snapshot) {
      throw new Error(`Session ${sessionId} not found`);
    }

    await fs.writeFile(outputPath, JSON.stringify(snapshot, null, 2));
    logger.info(`Exported session ${sessionId} to ${outputPath}`);
  }

  /**
   * Import session from JSON
   */
  async importSession(
    sessionId: string,
    inputPath: string
  ): Promise<SessionSnapshot> {
    validateRequired(sessionId, 'Session ID');
    validateRequired(inputPath, 'Input path');

    const data = await fs.readFile(inputPath, 'utf-8');
    const snapshot: SessionSnapshot = JSON.parse(data);

    // Update timestamp
    snapshot.timestamp = new Date().toISOString();

    // Save snapshot
    const snapshotPath = path.join(this.dataDir, `${sessionId}_snapshot.json`);
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));

    // Save individual files
    await fs.writeFile(
      path.join(this.dataDir, `${sessionId}_cookies.json`),
      JSON.stringify(snapshot.cookies, null, 2)
    );
    await fs.writeFile(
      path.join(this.dataDir, `${sessionId}_localStorage.json`),
      JSON.stringify(snapshot.localStorage, null, 2)
    );
    await fs.writeFile(
      path.join(this.dataDir, `${sessionId}_sessionStorage.json`),
      JSON.stringify(snapshot.sessionStorage, null, 2)
    );

    logger.info(`Imported session ${sessionId} from ${inputPath}`);
    return snapshot;
  }

  /**
   * Private: Read storage file
   */
  private async readStorageFile(
    sessionId: string,
    filename: string
  ): Promise<Record<string, string>> {
    try {
      const filePath = path.join(this.dataDir, `${sessionId}_${filename}`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (_error) {
      return {};
    }
  }
}

/**
 * Create cookie-session manager instance
 */
export function createCookieSessionManager(
  dataDir?: string
): CookieSessionManager {
  return new CookieSessionManager(dataDir);
}
