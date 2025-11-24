/**
 * Windows Compatibility Utilities
 * Ensures cross-platform compatibility and provides Windows-specific fixes
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export const isWindows = process.platform === 'win32';
export const isMac = process.platform === 'darwin';
export const isLinux = process.platform === 'linux';

/**
 * Normalize path for current platform
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath) return inputPath;

  // Convert forward slashes to platform-specific separator
  let normalized = inputPath.replace(/[/\\]/g, path.sep);

  // Handle Windows drive letters
  if (isWindows && /^[a-zA-Z]:/.test(normalized)) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return path.normalize(normalized);
}

/**
 * Convert path to POSIX style (for URLs, configs, etc.)
 */
export function toPosixPath(inputPath: string): string {
  if (!inputPath) return inputPath;
  return inputPath.replace(/\\/g, '/');
}

/**
 * Get Chrome/Chromium executable path
 */
export function getChromePath(): string | null {
  // Check environment variables first
  const envPaths = [
    process.env['PUPPETEER_EXECUTABLE_PATH'],
    process.env['CHROME_PATH'],
    process.env['CHROMIUM_PATH'],
  ];

  for (const envPath of envPaths) {
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }
  }

  // Platform-specific paths
  const platformPaths: string[] = [];

  if (isWindows) {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || path.join(os.homedir(), 'AppData', 'Local');

    platformPaths.push(
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFiles, 'Chromium', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Chromium', 'Application', 'chrome.exe'),
      // Edge as fallback
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  } else if (isMac) {
    platformPaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      path.join(os.homedir(), 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
    );
  } else {
    // Linux
    platformPaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    );
  }

  for (const chromePath of platformPaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  return null;
}

/**
 * Get user data directory for the application
 */
export function getUserDataPath(): string {
  const appName = 'UndetectBrowser';

  if (isWindows) {
    return path.join(process.env['APPDATA'] || os.homedir(), appName);
  } else if (isMac) {
    return path.join(os.homedir(), 'Library', 'Application Support', appName);
  } else {
    return path.join(os.homedir(), '.config', appName.toLowerCase());
  }
}

/**
 * Get temporary directory
 */
export function getTempPath(): string {
  return path.join(os.tmpdir(), 'undetect-browser');
}

/**
 * Ensure directory exists (cross-platform)
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Safe file deletion (handles Windows file locks)
 */
export async function safeDelete(filePath: string, maxRetries = 3): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (error: any) {
      if (error.code === 'EBUSY' || error.code === 'EPERM') {
        // File is locked, wait and retry
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  return false;
}

/**
 * Safe directory deletion (recursive, handles Windows issues)
 */
export async function safeDeleteDir(dirPath: string, maxRetries = 3): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
      return true;
    } catch (error: any) {
      if (error.code === 'EBUSY' || error.code === 'EPERM' || error.code === 'ENOTEMPTY') {
        await new Promise(resolve => setTimeout(resolve, 200 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  return false;
}

/**
 * Get platform-specific environment for child processes
 */
export function getProcessEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };

  if (isWindows) {
    // Ensure proper console encoding on Windows
    env['CHCP'] = '65001';

    // Disable Windows error dialogs
    env['ELECTRON_NO_ATTACH_CONSOLE'] = '1';
  }

  return env;
}

/**
 * Check if running with admin/root privileges
 */
export function isElevated(): boolean {
  if (isWindows) {
    try {
      const { execSync } = require('child_process');
      execSync('net session', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  } else {
    return process.getuid?.() === 0;
  }
}

/**
 * Get available memory in MB
 */
export function getAvailableMemoryMB(): number {
  return Math.floor(os.freemem() / (1024 * 1024));
}

/**
 * Get CPU count
 */
export function getCPUCount(): number {
  return os.cpus().length;
}

/**
 * Platform info for debugging
 */
export function getPlatformInfo(): Record<string, any> {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    osType: os.type(),
    osRelease: os.release(),
    hostname: os.hostname(),
    totalMemoryMB: Math.floor(os.totalmem() / (1024 * 1024)),
    freeMemoryMB: getAvailableMemoryMB(),
    cpuCount: getCPUCount(),
    isWindows,
    isMac,
    isLinux,
    isElevated: isElevated(),
    userDataPath: getUserDataPath(),
    tempPath: getTempPath(),
    chromePath: getChromePath(),
  };
}
