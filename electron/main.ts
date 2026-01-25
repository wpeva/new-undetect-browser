/**
 * Electron Main Process - Desktop Wrapper
 * UndetectBrowser Desktop Client
 *
 * This is a simplified Electron wrapper that launches the backend server
 * and opens the frontend web interface in a desktop window.
 */

import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

// Constants
const SERVER_PORT = 3000;
const FRONTEND_PORT = 3001;
const BACKEND_URL = `http://localhost:${SERVER_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let frontendProcess: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development';

/**
 * Start backend server
 */
async function startBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../server/index-v2.js');
    console.log('[Electron] Starting backend:', serverPath);

    backendProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        PORT: SERVER_PORT.toString(),
        NODE_ENV: 'development',
        ELECTRON_MODE: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    backendProcess.stdout?.on('data', (data) => {
      console.log('[Backend]', data.toString());
    });

    backendProcess.stderr?.on('data', (data) => {
      console.error('[Backend Error]', data.toString());
    });

    backendProcess.on('error', reject);

    // Wait 3 seconds for server to start
    setTimeout(resolve, 3000);
  });
}

/**
 * Start frontend dev server
 */
async function startFrontend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const frontendDir = path.join(__dirname, '../../frontend');
    console.log('[Electron] Starting frontend:', frontendDir);

    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      shell: true,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    frontendProcess.stdout?.on('data', (data) => {
      console.log('[Frontend]', data.toString());
    });

    frontendProcess.stderr?.on('data', (data) => {
      console.error('[Frontend Error]', data.toString());
    });

    frontendProcess.on('error', reject);

    // Wait 5 seconds for frontend to start
    setTimeout(resolve, 5000);
  });
}

/**
 * Create main window
 */
function createWindow() {
  console.log('[Electron] Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'UndetectBrowser',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
  });

  // Load frontend
  mainWindow.loadURL(FRONTEND_URL).catch((err) => {
    console.error('[Electron] Failed to load:', err);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (isDev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

/**
 * Initialize app
 */
async function initialize() {
  console.log('[Electron] Initializing...');

  try {
    await startBackend();
    await startFrontend();
    createWindow();
  } catch (error) {
    console.error('[Electron] Failed to initialize:', error);
    app.quit();
  }
}

// App events
app.whenReady().then(initialize);

app.on('window-all-closed', () => {
  console.log('[Electron] All windows closed');

  // Kill servers
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  if (frontendProcess) {
    frontendProcess.kill();
    frontendProcess = null;
  }

  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('[Electron] Quitting...');

  if (backendProcess) {
    backendProcess.kill();
  }
  if (frontendProcess) {
    frontendProcess.kill();
  }
});

console.log('[Electron] UndetectBrowser Desktop Wrapper');
console.log('[Electron] User data:', app.getPath('userData'));
