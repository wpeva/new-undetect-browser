/**
 * Application Initialization Module
 * Handles startup validation, auto-recovery, and environment setup
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { logger, LogLevel } from './utils/logger';
import {
  isWindows,
  ensureDir,
  getChromePath,
  getPlatformInfo,
  getUserDataPath,
} from './utils/windows-compat';
import { setupGlobalErrorHandlers, analyzeError } from './utils/error-handler';
import { autoRecovery, AutoRecoveryManager } from './utils/auto-recovery';

export interface InitOptions {
  /** Enable auto-recovery monitoring */
  enableAutoRecovery?: boolean;
  /** Auto-recovery check interval in ms */
  recoveryInterval?: number;
  /** Log level */
  logLevel?: LogLevel;
  /** Project root directory */
  projectRoot?: string;
  /** Skip browser check */
  skipBrowserCheck?: boolean;
  /** Environment file path */
  envPath?: string;
}

export interface InitResult {
  success: boolean;
  warnings: string[];
  errors: string[];
  platformInfo: Record<string, any>;
  chromePath: string | null;
  dataPath: string;
}

/**
 * Initialize the application
 * Call this at the start of your application
 */
export async function initializeApp(options: InitOptions = {}): Promise<InitResult> {
  const {
    enableAutoRecovery = true,
    recoveryInterval = 60000,
    logLevel = LogLevel.INFO,
    projectRoot = process.cwd(),
    skipBrowserCheck = false,
    envPath,
  } = options;

  const warnings: string[] = [];
  const errors: string[] = [];

  logger.setLevel(logLevel);
  logger.info('Initializing UndetectBrowser application');

  // Step 1: Load environment variables
  const envFile = envPath || path.join(projectRoot, '.env');
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    logger.debug('Environment loaded from', { path: envFile });
  } else {
    warnings.push('.env file not found - using defaults');
    logger.warn('.env file not found', { path: envFile });
  }

  // Step 2: Setup global error handlers
  setupGlobalErrorHandlers();
  logger.debug('Global error handlers installed');

  // Step 3: Create required directories
  const directories = [
    'data',
    'data/profiles',
    'data/sessions',
    'data/logs',
    'data/cache',
    'data/temp',
  ];

  for (const dir of directories) {
    const fullPath = path.join(projectRoot, dir);
    try {
      ensureDir(fullPath);
    } catch (error) {
      const appError = analyzeError(error, { directory: dir });
      errors.push(`Failed to create ${dir}: ${appError.message}`);
    }
  }

  // Step 4: Check browser availability
  let chromePath: string | null = null;

  if (!skipBrowserCheck) {
    chromePath = getChromePath();

    if (!chromePath) {
      warnings.push('No Chrome/Chromium found - Puppeteer will download its own browser');
      logger.warn('No system browser found');
    } else {
      logger.info('Browser found', { path: chromePath });
    }
  }

  // Step 5: Get platform info
  const platformInfo = getPlatformInfo();
  logger.info('Platform info', {
    platform: platformInfo.platform,
    nodeVersion: platformInfo.nodeVersion,
    memory: `${platformInfo.freeMemoryMB}MB free`,
  });

  // Step 6: Platform-specific setup
  if (isWindows) {
    // Set console encoding on Windows
    try {
      process.stdout.setDefaultEncoding?.('utf8');
    } catch {
      // Ignore if not supported
    }

    // Check for common Windows issues
    if (platformInfo.freeMemoryMB < 1024) {
      warnings.push(`Low memory: ${platformInfo.freeMemoryMB}MB free (recommend 2GB+)`);
    }
  }

  // Step 7: Verify write permissions
  const dataPath = path.join(projectRoot, 'data');
  try {
    const testFile = path.join(dataPath, '.init-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  } catch (error) {
    const appError = analyzeError(error);
    errors.push(`Cannot write to data directory: ${appError.message}`);
  }

  // Step 8: Start auto-recovery if enabled
  if (enableAutoRecovery) {
    autoRecovery.startMonitoring(recoveryInterval);

    autoRecovery.on('health-issue', (health) => {
      logger.warn('Health issue detected', { issues: health.issues });
    });

    autoRecovery.on('recovery-success', (result) => {
      logger.info('Auto-recovery successful', { fixed: result.fixed });
    });

    logger.info('Auto-recovery enabled', { interval: recoveryInterval });
  }

  // Step 9: Final status
  const success = errors.length === 0;

  if (success) {
    logger.info('Application initialized successfully', {
      warnings: warnings.length,
    });
  } else {
    logger.error('Application initialization had errors', {
      errors: errors.length,
      warnings: warnings.length,
    });
  }

  return {
    success,
    warnings,
    errors,
    platformInfo,
    chromePath,
    dataPath,
  };
}

/**
 * Quick initialization for simple use cases
 */
export async function quickInit(): Promise<boolean> {
  try {
    const result = await initializeApp({
      enableAutoRecovery: true,
      logLevel: LogLevel.INFO,
    });

    if (result.warnings.length > 0) {
      console.warn('Initialization warnings:', result.warnings);
    }

    if (result.errors.length > 0) {
      console.error('Initialization errors:', result.errors);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize:', error);
    return false;
  }
}

/**
 * Shutdown the application cleanly
 */
export async function shutdownApp(): Promise<void> {
  logger.info('Shutting down application');

  // Stop auto-recovery
  autoRecovery.stopMonitoring();

  logger.info('Application shutdown complete');
}

// Export recovery manager for direct access
export { autoRecovery };
