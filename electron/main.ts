/**
 * Electron Main Process
 * UndetectBrowser Desktop Client
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { createRealisticBrowser } from '../src/core/realistic-browser-factory';
import type { RealisticBrowserInstance } from '../src/core/realistic-browser-factory';
import type { ProxyConfig } from '../src/core/proxy-manager';

// Storage for profiles
const store = new Store();

// Active browser instances
const activeBrowsers = new Map<string, RealisticBrowserInstance>();

// Main window
let mainWindow: BrowserWindow | null = null;

// Development mode
const isDev = process.env.NODE_ENV === 'development';

/**
 * Create main window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'UndetectBrowser - Антидетект Браузер',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#1a1a2e',
    autoHideMenuBar: true,
  });

  // Load app
  if (isDev) {
    mainWindow.loadFile(path.join(__dirname, '../electron/renderer/index.html'));
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * App ready
 */
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Quit when all windows are closed
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Close all browsers before quit
 */
app.on('before-quit', async () => {
  for (const [profileId, browser] of activeBrowsers.entries()) {
    try {
      await browser.close();
      activeBrowsers.delete(profileId);
    } catch (error) {
      console.error(`Failed to close browser ${profileId}:`, error);
    }
  }
});

// ============================================================================
// IPC Handlers - Profile Management
// ============================================================================

/**
 * Get all profiles
 */
ipcMain.handle('profiles:getAll', async () => {
  const profiles = store.get('profiles', []) as any[];
  return { success: true, data: profiles };
});

/**
 * Create new profile
 */
ipcMain.handle('profiles:create', async (_event, profileData) => {
  const profiles = store.get('profiles', []) as any[];

  const newProfile = {
    id: `profile-${Date.now()}`,
    name: profileData.name || `Профиль ${profiles.length + 1}`,
    country: profileData.country || 'US',
    proxy: profileData.proxy || null,
    userSeed: `seed-${Date.now()}`,
    fingerprint: null,
    created: new Date().toISOString(),
    lastUsed: null,
    status: 'inactive',
    notes: profileData.notes || '',
  };

  profiles.push(newProfile);
  store.set('profiles', profiles);

  return { success: true, data: newProfile };
});

/**
 * Update profile
 */
ipcMain.handle('profiles:update', async (_event, profileId, updates) => {
  const profiles = store.get('profiles', []) as any[];
  const index = profiles.findIndex((p: any) => p.id === profileId);

  if (index === -1) {
    return { success: false, error: 'Profile not found' };
  }

  profiles[index] = { ...profiles[index], ...updates };
  store.set('profiles', profiles);

  return { success: true, data: profiles[index] };
});

/**
 * Delete profile
 */
ipcMain.handle('profiles:delete', async (_event, profileId) => {
  const profiles = store.get('profiles', []) as any[];
  const filtered = profiles.filter((p: any) => p.id !== profileId);

  store.set('profiles', filtered);

  // Close browser if active
  if (activeBrowsers.has(profileId)) {
    const browser = activeBrowsers.get(profileId)!;
    await browser.close();
    activeBrowsers.delete(profileId);
  }

  return { success: true };
});

// ============================================================================
// IPC Handlers - Browser Control
// ============================================================================

/**
 * Launch browser for profile
 */
ipcMain.handle('browser:launch', async (_event, profileId) => {
  try {
    // Get profile
    const profiles = store.get('profiles', []) as any[];
    const profile = profiles.find((p: any) => p.id === profileId);

    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    // Close existing browser if any
    if (activeBrowsers.has(profileId)) {
      const existingBrowser = activeBrowsers.get(profileId)!;
      await existingBrowser.close();
      activeBrowsers.delete(profileId);
    }

    // Create browser with full proxy isolation and enhanced privacy protection
    // Note: Enhanced privacy args (WebRTC blocking, DNS leak protection, etc.)
    // are automatically added by createRealisticBrowser
    const browser = await createRealisticBrowser({
      country: profile.country,
      userSeed: profile.userSeed,
      proxy: profile.proxy,
      launchOptions: {
        headless: false,
        args: [
          '--start-maximized',
          // Enhanced privacy args are automatically added via getEnhancedPrivacyArgs()
          // Includes: WebRTC blocking, DNS leak protection, forced proxy routing
        ],
      },
    });

    // Store fingerprint
    const fingerprint = browser.getFingerprint();
    profile.fingerprint = {
      timezone: fingerprint.timezone,
      locale: fingerprint.locale,
      languages: fingerprint.languages,
      platform: fingerprint.platform,
    };
    profile.lastUsed = new Date().toISOString();
    profile.status = 'active';

    // Update profile
    const profileIndex = profiles.findIndex((p: any) => p.id === profileId);
    profiles[profileIndex] = profile;
    store.set('profiles', profiles);

    // Store browser instance
    activeBrowsers.set(profileId, browser);

    // Open new page
    const page = await browser.newPage();
    await page.goto('https://www.google.com');

    return {
      success: true,
      data: {
        profileId,
        fingerprint: profile.fingerprint,
        country: browser.getProxyCountry(),
      },
    };
  } catch (error: any) {
    console.error('Browser launch error:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Close browser for profile
 */
ipcMain.handle('browser:close', async (_event, profileId) => {
  try {
    if (!activeBrowsers.has(profileId)) {
      return { success: false, error: 'Browser not active' };
    }

    const browser = activeBrowsers.get(profileId)!;
    await browser.close();
    activeBrowsers.delete(profileId);

    // Update profile status
    const profiles = store.get('profiles', []) as any[];
    const profileIndex = profiles.findIndex((p: any) => p.id === profileId);
    if (profileIndex !== -1) {
      profiles[profileIndex].status = 'inactive';
      store.set('profiles', profiles);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Browser close error:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Get browser status
 */
ipcMain.handle('browser:status', async (_event, profileId) => {
  const isActive = activeBrowsers.has(profileId);
  return {
    success: true,
    data: {
      active: isActive,
      profileId,
    },
  };
});

// ============================================================================
// IPC Handlers - Proxy Management
// ============================================================================

/**
 * Test proxy connection
 */
ipcMain.handle('proxy:test', async (_event, proxyConfig: ProxyConfig) => {
  try {
    // Create temporary browser to test proxy
    const browser = await createRealisticBrowser({
      proxy: proxyConfig,
      launchOptions: {
        headless: true,
      },
    });

    const page = await browser.newPage();

    // Test connection
    await page.goto('https://httpbin.org/ip', { timeout: 10000 });
    const ip = await page.evaluate(() => document.body.innerText);

    await browser.close();

    return {
      success: true,
      data: {
        working: true,
        ip: JSON.parse(ip).origin,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// ============================================================================
// IPC Handlers - Settings
// ============================================================================

/**
 * Get settings
 */
ipcMain.handle('settings:get', async () => {
  const settings = store.get('settings', {
    theme: 'dark',
    language: 'ru',
    autoUpdate: true,
  });

  return { success: true, data: settings };
});

/**
 * Update settings
 */
ipcMain.handle('settings:update', async (_event, newSettings) => {
  const currentSettings = store.get('settings', {});
  const updated = { ...currentSettings, ...newSettings };
  store.set('settings', updated);

  return { success: true, data: updated };
});

// ============================================================================
// IPC Handlers - System
// ============================================================================

/**
 * Open file dialog
 */
ipcMain.handle('system:openFileDialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
  });

  if (result.canceled) {
    return { success: false };
  }

  return { success: true, data: result.filePaths[0] };
});

/**
 * Get app version
 */
ipcMain.handle('system:getVersion', async () => {
  return { success: true, data: app.getVersion() };
});

console.log('UndetectBrowser Desktop Client Started');
console.log('Storage path:', app.getPath('userData'));
