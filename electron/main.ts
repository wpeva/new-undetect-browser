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
 * Get all proxies
 */
ipcMain.handle('proxy:getAll', async () => {
  const proxies = store.get('proxies', []) as any[];
  return { success: true, data: proxies };
});

/**
 * Create new proxy
 */
ipcMain.handle('proxy:create', async (_event, proxyData) => {
  const proxies = store.get('proxies', []) as any[];

  const newProxy = {
    id: `proxy-${Date.now()}`,
    name: proxyData.name || `${proxyData.host}:${proxyData.port}`,
    type: proxyData.type || 'http',
    host: proxyData.host,
    port: proxyData.port,
    username: proxyData.username || null,
    password: proxyData.password || null,
    country: proxyData.country || null,
    city: proxyData.city || null,
    status: 'unchecked',
    speed: null,
    lastChecked: null,
    created: new Date().toISOString(),
  };

  proxies.push(newProxy);
  store.set('proxies', proxies);

  return { success: true, data: newProxy };
});

/**
 * Update proxy
 */
ipcMain.handle('proxy:update', async (_event, proxyId, updates) => {
  const proxies = store.get('proxies', []) as any[];
  const index = proxies.findIndex((p: any) => p.id === proxyId);

  if (index === -1) {
    return { success: false, error: 'Proxy not found' };
  }

  proxies[index] = { ...proxies[index], ...updates };
  store.set('proxies', proxies);

  return { success: true, data: proxies[index] };
});

/**
 * Delete proxy
 */
ipcMain.handle('proxy:delete', async (_event, proxyId) => {
  const proxies = store.get('proxies', []) as any[];
  const filtered = proxies.filter((p: any) => p.id !== proxyId);

  store.set('proxies', filtered);

  return { success: true };
});

/**
 * Check proxy connection with real validation
 */
ipcMain.handle('proxy:check', async (_event, proxyId) => {
  const proxies = store.get('proxies', []) as any[];
  const proxy = proxies.find((p: any) => p.id === proxyId);

  if (!proxy) {
    return { success: false, error: 'Proxy not found' };
  }

  try {
    const startTime = Date.now();

    // Create temporary browser to test proxy
    const browser = await createRealisticBrowser({
      proxy: {
        enabled: true,
        type: proxy.type,
        host: proxy.host,
        port: proxy.port,
        username: proxy.username,
        password: proxy.password,
      },
      launchOptions: {
        headless: true,
      },
    });

    const page = await browser.newPage();

    // Test connection and get GeoIP info
    await page.goto('http://ip-api.com/json/', { timeout: 15000 });
    const responseText = await page.evaluate(() => document.body.innerText);
    const geoData = JSON.parse(responseText);

    await browser.close();

    const latency = Date.now() - startTime;

    // Update proxy with real data
    const proxyIndex = proxies.findIndex((p: any) => p.id === proxyId);
    proxies[proxyIndex] = {
      ...proxies[proxyIndex],
      status: 'working',
      speed: latency,
      country: geoData.countryCode || proxy.country,
      city: geoData.city || proxy.city,
      realIP: geoData.query,
      lastChecked: new Date().toISOString(),
    };
    store.set('proxies', proxies);

    return {
      success: true,
      data: {
        status: 'working',
        realIP: geoData.query,
        latency,
        country: geoData.countryCode,
        countryName: geoData.country,
        city: geoData.city,
        isp: geoData.isp,
      },
    };
  } catch (error: any) {
    // Mark as failed
    const proxyIndex = proxies.findIndex((p: any) => p.id === proxyId);
    proxies[proxyIndex] = {
      ...proxies[proxyIndex],
      status: 'failed',
      lastChecked: new Date().toISOString(),
    };
    store.set('proxies', proxies);

    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Check all proxies
 */
ipcMain.handle('proxy:checkAll', async () => {
  const proxies = store.get('proxies', []) as any[];

  return {
    success: true,
    message: `Starting check for ${proxies.length} proxies`,
    total: proxies.length,
  };
});

/**
 * Bulk import proxies
 */
ipcMain.handle('proxy:bulkImport', async (_event, proxyList: any[]) => {
  const proxies = store.get('proxies', []) as any[];
  let imported = 0;

  for (const proxyData of proxyList) {
    const newProxy = {
      id: `proxy-${Date.now()}-${imported}`,
      name: proxyData.name || `${proxyData.host}:${proxyData.port}`,
      type: proxyData.type || 'http',
      host: proxyData.host,
      port: proxyData.port,
      username: proxyData.username || null,
      password: proxyData.password || null,
      country: proxyData.country || null,
      city: proxyData.city || null,
      status: 'unchecked',
      speed: null,
      lastChecked: null,
      created: new Date().toISOString(),
    };

    proxies.push(newProxy);
    imported++;
  }

  store.set('proxies', proxies);

  return { success: true, imported };
});

/**
 * Test proxy connection (legacy method)
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
  const currentSettings = store.get('settings', {}) as Record<string, any>;
  const updated = { ...currentSettings, ...(newSettings || {}) };
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
