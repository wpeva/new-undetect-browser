/**
 * Auto Recovery System
 * Monitors application health and automatically fixes issues
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { logger } from './logger';
import { isWindows, ensureDir, getChromePath, normalizePath } from './windows-compat';

export interface HealthStatus {
  healthy: boolean;
  issues: string[];
  timestamp: Date;
  checks: Record<string, boolean>;
}

export interface RecoveryResult {
  success: boolean;
  fixed: string[];
  failed: string[];
  message: string;
}

/**
 * Auto Recovery Manager
 * Continuously monitors and fixes application issues
 */
export class AutoRecoveryManager extends EventEmitter {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly projectRoot: string;
  private isRecovering = false;

  constructor(projectRoot?: string) {
    super();
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Start automatic health monitoring
   */
  startMonitoring(intervalMs = 30000): void {
    if (this.checkInterval) {
      return;
    }

    logger.info('Starting auto-recovery monitoring', { interval: intervalMs });

    // Initial check
    this.checkAndRecover();

    // Periodic checks
    this.checkInterval = setInterval(() => {
      this.checkAndRecover();
    }, intervalMs);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Auto-recovery monitoring stopped');
    }
  }

  /**
   * Perform health check
   */
  async checkHealth(): Promise<HealthStatus> {
    const checks: Record<string, boolean> = {};
    const issues: string[] = [];

    // Check 1: Data directories
    const dataDirs = ['data', 'data/profiles', 'data/sessions', 'data/logs'];
    checks['data_directories'] = true;

    for (const dir of dataDirs) {
      const fullPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        checks['data_directories'] = false;
        issues.push(`Missing directory: ${dir}`);
      }
    }

    // Check 2: .env file
    const envPath = path.join(this.projectRoot, '.env');
    checks['env_file'] = fs.existsSync(envPath);
    if (!checks['env_file']) {
      issues.push('Missing .env file');
    }

    // Check 3: dist folder (if in production mode)
    if (process.env['NODE_ENV'] === 'production') {
      const distPath = path.join(this.projectRoot, 'dist');
      checks['dist_folder'] = fs.existsSync(distPath) &&
        fs.readdirSync(distPath).length > 0;
      if (!checks['dist_folder']) {
        issues.push('Missing or empty dist folder');
      }
    } else {
      checks['dist_folder'] = true;
    }

    // Check 4: Browser availability
    checks['browser_available'] = getChromePath() !== null;
    if (!checks['browser_available']) {
      // Check if Puppeteer has its own browser
      const puppeteerCache = path.join(
        process.env['USERPROFILE'] || process.env['HOME'] || '',
        '.cache',
        'puppeteer'
      );
      checks['browser_available'] = fs.existsSync(puppeteerCache);
    }
    if (!checks['browser_available']) {
      issues.push('No browser found (Chrome/Chromium)');
    }

    // Check 5: Write permissions
    checks['write_permissions'] = await this.checkWritePermissions();
    if (!checks['write_permissions']) {
      issues.push('No write permissions in data directory');
    }

    // Check 6: Memory availability
    const freeMemMB = Math.floor(require('os').freemem() / (1024 * 1024));
    checks['memory_available'] = freeMemMB > 512;
    if (!checks['memory_available']) {
      issues.push(`Low memory: ${freeMemMB}MB available`);
    }

    // Check 7: Database file (if using SQLite)
    const dbPath = process.env['DB_PATH'] || './data/undetect.db';
    const fullDbPath = path.isAbsolute(dbPath)
      ? dbPath
      : path.join(this.projectRoot, dbPath);

    if (fs.existsSync(fullDbPath)) {
      try {
        // Check if database file is accessible
        fs.accessSync(fullDbPath, fs.constants.R_OK | fs.constants.W_OK);
        checks['database'] = true;
      } catch {
        checks['database'] = false;
        issues.push('Database file is locked or inaccessible');
      }
    } else {
      // Database doesn't exist yet - that's OK, it will be created
      checks['database'] = true;
    }

    const healthy = Object.values(checks).every(v => v);

    return {
      healthy,
      issues,
      timestamp: new Date(),
      checks,
    };
  }

  /**
   * Attempt to fix detected issues
   */
  async recover(): Promise<RecoveryResult> {
    if (this.isRecovering) {
      return {
        success: false,
        fixed: [],
        failed: [],
        message: 'Recovery already in progress',
      };
    }

    this.isRecovering = true;
    const fixed: string[] = [];
    const failed: string[] = [];

    try {
      logger.info('Starting auto-recovery');

      // Fix 1: Create missing directories
      const dataDirs = ['data', 'data/profiles', 'data/sessions', 'data/logs', 'data/cache', 'data/temp'];

      for (const dir of dataDirs) {
        const fullPath = path.join(this.projectRoot, dir);
        if (!fs.existsSync(fullPath)) {
          try {
            ensureDir(fullPath);
            fixed.push(`Created directory: ${dir}`);
          } catch (e) {
            failed.push(`Failed to create directory: ${dir}`);
          }
        }
      }

      // Fix 2: Create .env if missing
      const envPath = path.join(this.projectRoot, '.env');
      const envExamplePath = path.join(this.projectRoot, '.env.example');

      if (!fs.existsSync(envPath)) {
        try {
          if (fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            fixed.push('Created .env from .env.example');
          } else {
            const defaultEnv = this.generateDefaultEnv();
            fs.writeFileSync(envPath, defaultEnv);
            fixed.push('Created default .env');
          }
        } catch (e) {
          failed.push('Failed to create .env file');
        }
      }

      // Fix 3: Fix Windows-specific permission issues
      if (isWindows) {
        try {
          // Ensure data directory is writable
          const dataPath = path.join(this.projectRoot, 'data');
          if (fs.existsSync(dataPath)) {
            // Try to write a test file
            const testFile = path.join(dataPath, '.write-test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
          }
        } catch (e) {
          failed.push('Data directory is not writable');
        }
      }

      // Fix 4: Clean up temp files
      const tempPath = path.join(this.projectRoot, 'data', 'temp');
      if (fs.existsSync(tempPath)) {
        try {
          const files = fs.readdirSync(tempPath);
          let cleanedCount = 0;

          for (const file of files) {
            const filePath = path.join(tempPath, file);
            const stat = fs.statSync(filePath);

            // Delete files older than 24 hours
            const age = Date.now() - stat.mtimeMs;
            if (age > 24 * 60 * 60 * 1000) {
              try {
                if (stat.isDirectory()) {
                  fs.rmSync(filePath, { recursive: true, force: true });
                } else {
                  fs.unlinkSync(filePath);
                }
                cleanedCount++;
              } catch {
                // Ignore cleanup errors
              }
            }
          }

          if (cleanedCount > 0) {
            fixed.push(`Cleaned ${cleanedCount} temp files`);
          }
        } catch {
          // Ignore temp cleanup errors
        }
      }

      const success = failed.length === 0;
      const message = success
        ? `Recovery complete. Fixed ${fixed.length} issues.`
        : `Recovery partially complete. Fixed ${fixed.length}, failed ${failed.length}.`;

      this.emit('recovery-complete', { success, fixed, failed });

      return { success, fixed, failed, message };
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Check and recover if needed
   */
  private async checkAndRecover(): Promise<void> {
    try {
      const health = await this.checkHealth();

      if (!health.healthy) {
        logger.warn('Health check failed', { issues: health.issues });
        this.emit('health-issue', health);

        const result = await this.recover();

        if (result.success) {
          logger.info('Auto-recovery successful', { fixed: result.fixed });
          this.emit('recovery-success', result);
        } else {
          logger.warn('Auto-recovery incomplete', {
            fixed: result.fixed,
            failed: result.failed,
          });
          this.emit('recovery-failed', result);
        }
      }
    } catch (error) {
      logger.error('Health check error', { error });
    }
  }

  /**
   * Check write permissions
   */
  private async checkWritePermissions(): Promise<boolean> {
    try {
      const dataPath = path.join(this.projectRoot, 'data');
      ensureDir(dataPath);

      const testFile = path.join(dataPath, '.permission-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate default .env content
   */
  private generateDefaultEnv(): string {
    const chromePath = getChromePath();
    const jwtSecret = Array.from({ length: 64 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        .charAt(Math.floor(Math.random() * 62))
    ).join('');

    return `# UndetectBrowser Configuration
# Auto-generated by recovery system

PORT=3000
NODE_ENV=development
HOST=127.0.0.1

JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h

CORS_ORIGIN=*
ENABLE_COMPRESSION=true
CACHE_ENABLED=true

DB_PATH=./data/undetect.db

REDIS_ENABLED=false
POSTGRES_ENABLED=false

PUPPETEER_EXECUTABLE_PATH=${chromePath ? chromePath.replace(/\\/g, '/') : ''}
CHROME_PATH=${chromePath ? chromePath.replace(/\\/g, '/') : ''}
PUPPETEER_SKIP_DOWNLOAD=${chromePath ? 'true' : 'false'}
HEADLESS=false

CLOUD_MODE=false
LOG_LEVEL=info
`;
  }
}

// Export singleton instance
export const autoRecovery = new AutoRecoveryManager();
