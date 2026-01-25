/**
 * Enhanced UndetectBrowser Server v2.0
 * Features: SQLite DB, Real-time WebSocket, Enhanced API
 * Optimizations: Compression, Caching, Rate Limiting, Security Headers
 * Windows Compatible: Auto-recovery, Error handling
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { createServer } from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { initDatabase, closeDatabase } from './database/db';
import rateLimit from 'express-rate-limit';

// Enhanced API Routes
import { ProfileModel } from './models/Profile';
import { ProxyModel } from './models/Proxy';

// Utilities
import { checkProxy, ProxyCheckResult } from './utils/proxy-checker';
import { getGeoIP } from './utils/geoip';

// Browser management
import { createRealisticBrowser, RealisticBrowserInstance } from '../src/core/realistic-browser-factory';
import type { ProxyConfig as BrowserProxyConfig } from '../src/core/proxy-manager';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Platform detection
const isWindows = process.platform === 'win32';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================
// BROWSER SESSION MANAGEMENT
// ============================================

// Active browser instances
const activeBrowsers = new Map<string, RealisticBrowserInstance>();

// Cleanup browser on exit
async function cleanupBrowsers() {
  console.log('[CLEANUP] Closing all active browsers...');
  for (const [profileId, browser] of activeBrowsers.entries()) {
    try {
      await browser.close();
      console.log(`[CLEANUP] Closed browser for profile: ${profileId}`);
    } catch (error) {
      console.error(`[CLEANUP] Failed to close browser ${profileId}:`, error);
    }
  }
  activeBrowsers.clear();
}

// ============================================
// PERFORMANCE & SECURITY MIDDLEWARE
// ============================================

// Enhanced security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Compression middleware (gzip/deflate)
import compression from 'compression';
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 20 : 100,
  message: 'Too many requests, please slow down.',
});

app.use('/api/', limiter);

// Body parsers with size limits
app.use(express.json({ limit: IS_PRODUCTION ? '10mb' : '50mb' }));
app.use(express.urlencoded({ extended: true, limit: IS_PRODUCTION ? '10mb' : '50mb' }));

// Request logging with performance timing
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Response caching middleware
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

function cacheMiddleware(ttl: number = CACHE_TTL) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      cache.set(key, { data, timestamp: Date.now() });
      return originalJson(data);
    };

    next();
  };
}

// ============================================
// PROFILES API - Enhanced with Caching
// ============================================

// Get all profiles (with caching)
app.get('/api/v2/profiles', cacheMiddleware(30000), async (req: Request, res: Response) => {
  try {
    const { group_id, status, search, limit, offset } = req.query;
    const profiles = await ProfileModel.findAll({
      group_id: group_id as string,
      status: status as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: profiles, count: profiles.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single profile
app.get('/api/v2/profiles/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Profile ID is required' });
      return;
    }
    const profile = await ProfileModel.findById(id);
    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create profile
app.post('/api/v2/profiles', async (req: Request, res: Response) => {
  try {
    const profile = await ProfileModel.create(req.body);
    io.emit('profile:created', profile);
    res.status(201).json({ success: true, data: profile });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update profile
app.put('/api/v2/profiles/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Profile ID is required' });
      return;
    }
    const profile = await ProfileModel.update(id, req.body);
    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }
    io.emit('profile:updated', profile);
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete profile
app.delete('/api/v2/profiles/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Profile ID is required' });
      return;
    }
    const deleted = await ProfileModel.delete(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }
    io.emit('profile:deleted', id);
    res.json({ success: true, message: 'Profile deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk delete profiles
app.post('/api/v2/profiles/bulk-delete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      res.status(400).json({ success: false, error: 'ids must be an array' });
      return;
    }
    const count = await ProfileModel.bulkDelete(ids);
    io.emit('profiles:bulk-deleted', ids);
    res.json({ success: true, deleted: count });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Launch profile
app.post('/api/v2/profiles/:id/launch', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Profile ID is required' });
      return;
    }

    // Get profile data
    const profile = await ProfileModel.findById(id);
    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    // Close existing browser if any
    if (activeBrowsers.has(id)) {
      try {
        const existingBrowser = activeBrowsers.get(id);
        await existingBrowser?.close();
        activeBrowsers.delete(id);
      } catch (error) {
        console.error(`Failed to close existing browser for ${id}:`, error);
      }
    }

    // Convert proxy config - fingerprint may contain proxy settings as JSON string
    let proxyConfig: BrowserProxyConfig | undefined;
    let fingerprintData: any = {};

    try {
      if (profile.fingerprint) {
        fingerprintData = typeof profile.fingerprint === 'string'
          ? JSON.parse(profile.fingerprint)
          : profile.fingerprint;
      }
    } catch {
      fingerprintData = {};
    }

    // Check if profile has proxy_id and load proxy config
    if (profile.proxy_id) {
      const proxy = await ProxyModel.findById(profile.proxy_id);
      if (proxy) {
        proxyConfig = {
          enabled: true,
          type: proxy.type || 'http',
          host: proxy.host,
          port: proxy.port,
          username: proxy.username,
          password: proxy.password,
        };
        console.log(`[BROWSER] Using proxy: ${proxy.host}:${proxy.port}`);
      }
    }

    // Also check fingerprint data for legacy proxy config
    if (!proxyConfig && fingerprintData.proxy && fingerprintData.proxy.enabled) {
      const p = fingerprintData.proxy;
      proxyConfig = {
        enabled: true,
        type: p.type || 'http',
        host: p.host,
        port: p.port,
        username: p.username,
        password: p.password,
      };
    }

    // Launch browser
    console.log(`[BROWSER] Launching browser for profile: ${profile.name} (${id})`);
    const browser = await createRealisticBrowser({
      proxy: proxyConfig,
      country: fingerprintData.country || 'US',
      userSeed: fingerprintData.userSeed || `seed-${id}`,
      launchOptions: {
        headless: process.env.HEADLESS === 'true',
        args: [
          '--start-maximized',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      },
    });

    // Store browser instance
    activeBrowsers.set(id, browser);

    // Open initial page (use about:blank to avoid DNS issues on first load)
    const page = await browser.newPage();
    await page.goto('about:blank');

    // Update profile status
    await ProfileModel.updateStatus(id, 'active');

    // Emit socket event
    io.emit('profile:launched', { id, name: profile.name });

    res.json({
      success: true,
      message: 'Browser launched successfully',
      data: {
        profileId: id,
        status: 'active',
        fingerprint: browser.getFingerprint()
      }
    });
  } catch (error: any) {
    console.error(`[BROWSER] Failed to launch browser:`, error);
    const profileId = req.params.id;
    if (profileId) {
      await ProfileModel.updateStatus(profileId, 'error');
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to launch browser' });
  }
});

// Stop profile
app.post('/api/v2/profiles/:id/stop', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Profile ID is required' });
      return;
    }

    // Close browser if active
    if (activeBrowsers.has(id)) {
      try {
        console.log(`[BROWSER] Closing browser for profile: ${id}`);
        const browser = activeBrowsers.get(id);
        await browser?.close();
        activeBrowsers.delete(id);
      } catch (error) {
        console.error(`[BROWSER] Failed to close browser:`, error);
      }
    }

    // Update profile status
    await ProfileModel.updateStatus(id, 'idle');

    // Emit socket event
    io.emit('profile:stopped', { id });

    res.json({ success: true, message: 'Browser stopped successfully' });
  } catch (error: any) {
    console.error(`[BROWSER] Failed to stop browser:`, error);
    res.status(500).json({ success: false, error: error.message || 'Failed to stop browser' });
  }
});

// ============================================
// PROXIES API - Enhanced
// ============================================

// Get all proxies
app.get('/api/v2/proxies', async (req: Request, res: Response) => {
  try {
    const { status, type, country } = req.query;
    const proxies = await ProxyModel.findAll({
      status: status as string,
      type: type as any,
      country: country as string,
    });
    res.json({ success: true, data: proxies, count: proxies.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create proxy
app.post('/api/v2/proxies', async (req: Request, res: Response) => {
  try {
    const proxy = await ProxyModel.create(req.body);
    io.emit('proxy:created', proxy);
    res.status(201).json({ success: true, data: proxy });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bulk import proxies
app.post('/api/v2/proxies/bulk-import', async (req: Request, res: Response): Promise<void> => {
  try {
    const { proxies } = req.body;
    if (!Array.isArray(proxies)) {
      res.status(400).json({ success: false, error: 'proxies must be an array' });
      return;
    }
    const count = await ProxyModel.bulkCreate(proxies);
    io.emit('proxies:imported', count);
    res.json({ success: true, imported: count });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check proxy - Real implementation with HTTP request through proxy
app.post('/api/v2/proxies/:id/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Proxy ID is required' });
      return;
    }
    // Get proxy from database
    const proxy = await ProxyModel.findById(id);
    if (!proxy) {
      res.status(404).json({ success: false, error: 'Proxy not found' });
      return;
    }

    // Perform real proxy check
    const result: ProxyCheckResult = await checkProxy({
      type: proxy.type,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
    });

    if (result.success) {
      // Update proxy with real data
      await ProxyModel.update(id, {
        status: 'working',
        speed: result.latencyMs,
        country: result.country || proxy.country,
        city: result.city || proxy.city,
      });
      await ProxyModel.updateStatus(id, 'working', result.latencyMs);

      io.emit('proxy:checked', {
        id: id,
        status: 'working',
        realIP: result.realIP,
        latency: result.latencyMs,
        country: result.country,
        city: result.city,
      });

      res.json({
        success: true,
        message: 'Proxy is working',
        data: {
          realIP: result.realIP,
          latencyMs: result.latencyMs,
          country: result.country,
          city: result.city,
        },
      });
    } else {
      // Mark proxy as failed
      await ProxyModel.updateStatus(id, 'failed');

      io.emit('proxy:checked', {
        id: id,
        status: 'failed',
        error: result.error,
      });

      res.json({
        success: false,
        message: 'Proxy check failed',
        error: result.error,
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check all proxies
app.post('/api/v2/proxies/check-all', strictLimiter, async (_req: Request, res: Response) => {
  try {
    const proxies = await ProxyModel.findAll();

    // Start checking in background
    res.json({
      success: true,
      message: `Starting check for ${proxies.length} proxies`,
      total: proxies.length,
    });

    // Check proxies in batches (don't await - runs in background)
    (async () => {
      for (const proxy of proxies) {
        try {
          const result = await checkProxy({
            type: proxy.type,
            host: proxy.host,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
          });

          if (result.success) {
            await ProxyModel.update(proxy.id, {
              status: 'working',
              speed: result.latencyMs,
              country: result.country || proxy.country,
              city: result.city || proxy.city,
            });
            await ProxyModel.updateStatus(proxy.id, 'working', result.latencyMs);
          } else {
            await ProxyModel.updateStatus(proxy.id, 'failed');
          }

          io.emit('proxy:checked', {
            id: proxy.id,
            status: result.success ? 'working' : 'failed',
            latency: result.latencyMs,
          });
        } catch (err) {
          await ProxyModel.updateStatus(proxy.id, 'failed');
          io.emit('proxy:checked', { id: proxy.id, status: 'failed' });
        }
      }

      io.emit('proxies:check-complete', { total: proxies.length });
    })();
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get geolocation for IP
app.get('/api/v2/geoip/:ip', cacheMiddleware(300000), async (req: Request, res: Response) => {
  try {
    const ip = req.params.ip;
    if (!ip) {
      res.status(400).json({ success: false, error: 'IP address is required' });
      return;
    }
    const result = await getGeoIP(ip);
    res.json({ success: result.success, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// STATISTICS API with Caching
// ============================================

app.get('/api/v2/stats', cacheMiddleware(10000), async (_req: Request, res: Response) => {
  try {
    const profileCount = await ProfileModel.count();
    const proxyStats = await ProxyModel.countByStatus();

    res.json({
      success: true,
      data: {
        profiles: {
          total: profileCount,
          active: await ProfileModel.count({ status: 'active' }),
          idle: await ProfileModel.count({ status: 'idle' }),
        },
        proxies: proxyStats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// WEBSOCKET
// ============================================

io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.on('profile:launch', async (profileId: string) => {
    try {
      await ProfileModel.updateStatus(profileId, 'active');
      io.emit('profile:status', { profileId, status: 'active' });
    } catch (error) {
      socket.emit('error', { message: 'Failed to launch profile' });
    }
  });

  socket.on('profile:stop', async (profileId: string) => {
    try {
      await ProfileModel.updateStatus(profileId, 'idle');
      io.emit('profile:status', { profileId, status: 'idle' });
    } catch (error) {
      socket.emit('error', { message: 'Failed to stop profile' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ============================================
// BACKWARD COMPATIBILITY - Redirect /api to /api/v2
// ============================================

// Profiles aliases
app.get('/api/profiles', (req, res, next) => { req.url = '/api/v2/profiles' + (req.url.split('?')[1] ? '?' + req.url.split('?')[1] : ''); next('route'); });
app.get('/api/profiles/:id', (req, res) => res.redirect(`/api/v2/profiles/${req.params.id}`));
app.post('/api/profiles', (req, res, next) => { req.url = '/api/v2/profiles'; next('route'); });
app.put('/api/profiles/:id', (req, res, next) => { req.url = `/api/v2/profiles/${req.params.id}`; next('route'); });
app.delete('/api/profiles/:id', (req, res, next) => { req.url = `/api/v2/profiles/${req.params.id}`; next('route'); });
app.post('/api/profiles/:id/launch', (req, res, next) => { req.url = `/api/v2/profiles/${req.params.id}/launch`; next('route'); });
app.post('/api/profiles/:id/stop', (req, res, next) => { req.url = `/api/v2/profiles/${req.params.id}/stop`; next('route'); });

// Proxies aliases
app.get('/api/proxies', (req, res, next) => { req.url = '/api/v2/proxies' + (req.url.split('?')[1] ? '?' + req.url.split('?')[1] : ''); next('route'); });
app.post('/api/proxies', (req, res, next) => { req.url = '/api/v2/proxies'; next('route'); });
app.post('/api/proxies/:id/check', (req, res, next) => { req.url = `/api/v2/proxies/${req.params.id}/check`; next('route'); });

// Stats alias
app.get('/api/stats', (req, res, next) => { req.url = '/api/v2/stats'; next('route'); });

// ============================================
// HEALTH & ERROR HANDLING
// ============================================

app.get('/api/v2/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '2.0', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '2.0', timestamp: new Date().toISOString() });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============================================
// SERVER STARTUP
// ============================================

// Ensure data directories exist
function ensureDirectories(): void {
  const dirs = ['data', 'data/profiles', 'data/sessions', 'data/logs', 'data/cache'];
  for (const dir of dirs) {
    const fullPath = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`[INIT] Created directory: ${dir}`);
    }
  }
}

// Auto-fix common startup issues
async function autoFix(): Promise<boolean> {
  // Fix 1: Ensure data directories
  ensureDirectories();

  // Fix 2: Check if port is available (Windows-compatible)
  return new Promise((resolve) => {
    const testServer = createServer();
    testServer.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[WARN] Port ${PORT} is in use`);
        if (isWindows) {
          console.log(`[INFO] To free the port, run: netstat -ano | findstr :${PORT}`);
        } else {
          console.log(`[INFO] To free the port, run: lsof -i :${PORT}`);
        }
      }
      resolve(false);
    });
    testServer.once('listening', () => {
      testServer.close();
      resolve(true);
    });
    testServer.listen(PORT);
  });
}

async function startServer() {
  console.log('\n[INIT] Starting UndetectBrowser Server v2.0...');
  console.log(`[INIT] Platform: ${process.platform} (${process.arch})`);
  console.log(`[INIT] Node.js: ${process.version}`);
  console.log(`[INIT] Working directory: ${process.cwd()}`);

  try {
    // Run auto-fix
    const portAvailable = await autoFix();

    if (!portAvailable) {
      console.error(`[ERROR] Cannot start server - port ${PORT} is not available`);
      console.log('[INFO] Change PORT in .env file or free the port');
      process.exit(1);
    }

    // Initialize database with retry
    let dbInitialized = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await initDatabase();
        dbInitialized = true;
        console.log('[OK] Database initialized');
        break;
      } catch (dbError: any) {
        console.log(`[WARN] Database init attempt ${attempt}/3 failed: ${dbError.message}`);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!dbInitialized) {
      console.error('[ERROR] Failed to initialize database after 3 attempts');
      console.log('[INFO] Check data directory permissions and SQLite availability');
      process.exit(1);
    }

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║  UndetectBrowser Server v2.0 - RUNNING                 ║
╠════════════════════════════════════════════════════════╣
║  Port:      ${String(PORT).padEnd(41)}║
║  Database:  SQLite                                     ║
║  WebSocket: Enabled                                    ║
║  Platform:  ${(isWindows ? 'Windows' : process.platform).padEnd(41)}║
╠════════════════════════════════════════════════════════╣
║  API:       http://localhost:${String(PORT).padEnd(25)}║
║  Health:    http://localhost:${PORT}/api/v2/health${' '.repeat(Math.max(0, 13 - String(PORT).length))}║
╚════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log(`\n[SHUTDOWN] ${signal} received, closing server...`);
      try {
        // Close all browsers first
        await cleanupBrowsers();
        console.log('[SHUTDOWN] Browsers closed');
      } catch (e) {
        console.log('[SHUTDOWN] Browser cleanup error (ignoring)');
      }
      try {
        await closeDatabase();
        console.log('[SHUTDOWN] Database closed');
      } catch (e) {
        console.log('[SHUTDOWN] Database close error (ignoring)');
      }
      httpServer.close(() => {
        console.log('[SHUTDOWN] Server closed');
        process.exit(0);
      });
      // Force exit after 10 seconds
      setTimeout(() => {
        console.log('[SHUTDOWN] Forcing exit...');
        process.exit(0);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Windows-specific: Handle Ctrl+C properly
    if (isWindows) {
      process.on('SIGHUP', () => shutdown('SIGHUP'));
    }

    // Uncaught exception handler
    process.on('uncaughtException', (error: Error) => {
      console.error('[ERROR] Uncaught exception:', error.message);
      console.error(error.stack);
      // Don't exit - try to keep running
    });

    process.on('unhandledRejection', (reason: any) => {
      console.error('[ERROR] Unhandled rejection:', reason);
    });

  } catch (error: any) {
    console.error('[ERROR] Failed to start server:', error.message);

    // Provide helpful error messages
    if (error.code === 'EACCES') {
      console.log('[INFO] Permission denied. Try running as administrator or use a port > 1024');
    } else if (error.code === 'ENOENT') {
      console.log('[INFO] File not found. Run: npm run fix');
    }

    process.exit(1);
  }
}

startServer();
