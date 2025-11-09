/**
 * UndetectBrowser Web Server
 * REST API for browser automation and management
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { UndetectBrowser } from '../src/index';
import { logger, LogLevel } from '../src/utils/logger';

// Import middlewares
import { authenticate, optionalAuth, authorize, login, register, AuthRequest } from './middleware/auth';
import { apiLimiter, authLimiter, browserLaunchLimiter, screenshotLimiter, strictLimiter } from './middleware/rate-limit';

// Import routes
import profileRoutes from './routes/profiles';

const app = express();
const PORT = process.env.PORT || 3000;
const ENABLE_AUTH = process.env.ENABLE_AUTH === 'true'; // Enable auth via environment variable

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development, enable in production
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web/build')));

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Create HTTP server and Socket.IO
const httpServer = new Server(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Browser instances storage
const browserInstances = new Map<string, any>();
const browserSessions = new Map<string, { browser: any; startTime: number; status: string }>();

// ============================================
// API Routes
// ============================================

// ============================================
// Authentication Routes
// ============================================

/**
 * POST /api/auth/register
 * Register new user
 */
app.post('/api/auth/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        error: 'Username, password, and email are required',
      });
    }

    const result = await register(username, password, email);
    if (!result) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists',
      });
    }

    logger.info(`User registered: ${username}`);

    return res.status(201).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error: any) {
    logger.error('Registration failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
app.post('/api/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    const result = await login(username, password);
    if (!result) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    logger.info(`User logged in: ${username}`);

    return res.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error: any) {
    logger.error('Login failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
app.get('/api/auth/me', authenticate, (req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

// ============================================
// Profile Routes
// ============================================

app.use('/api/profiles', ENABLE_AUTH ? authenticate : optionalAuth, profileRoutes);

// ============================================
// System Routes
// ============================================

/**
 * Health check
 */
app.get('/api/health', (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    memory: process.memoryUsage(),
    authEnabled: ENABLE_AUTH,
  });
});

/**
 * Get system stats
 */
app.get('/api/stats', (req: Request, res: Response) => {
  const stats = {
    activeBrowsers: browserSessions.size,
    totalMemory: process.memoryUsage().heapTotal,
    usedMemory: process.memoryUsage().heapUsed,
    uptime: process.uptime(),
    sessions: Array.from(browserSessions.entries()).map(([id, session]) => ({
      id,
      status: session.status,
      duration: Date.now() - session.startTime,
    })),
  };

  res.json(stats);
});

/**
 * Launch new browser
 */
app.post('/api/browser/launch', browserLaunchLimiter, ENABLE_AUTH ? authenticate : optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { profileId, config } = req.body;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info(`Launching browser for session: ${sessionId}`);

    const browser = new UndetectBrowser({
      stealth: {
        level: config?.stealthLevel || 'paranoid',
        webdriverEvasion: true,
        fingerprintSpoofing: true,
        behavioralSimulation: true,
        networkProtection: true,
        advancedEvasions: true,
        headlessProtection: true,
        automationProtection: true,
      },
      logLevel: LogLevel.INFO,
    });

    const instance = await browser.launch({
      headless: config?.headless !== false,
      profileId: profileId || undefined,
      profile: {
        name: config?.profileName || 'Default Profile',
        userAgent: config?.userAgent,
        viewport: config?.viewport || { width: 1920, height: 1080 },
        timezone: config?.timezone || 'America/New_York',
        locale: config?.locale || 'en-US',
      },
    });

    browserSessions.set(sessionId, {
      browser: instance,
      startTime: Date.now(),
      status: 'active',
    });

    // Emit socket event
    io.emit('browser:launched', { sessionId, timestamp: Date.now() });

    res.json({
      success: true,
      sessionId,
      message: 'Browser launched successfully',
    });
  } catch (error: any) {
    logger.error('Failed to launch browser:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Navigate to URL
 */
app.post('/api/browser/:sessionId/navigate', ENABLE_AUTH ? authenticate : optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { url } = req.body;

    const session = browserSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const page = await session.browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    io.emit('browser:navigated', { sessionId, url, timestamp: Date.now() });

    return res.json({
      success: true,
      url,
      title: await page.title(),
    });
  } catch (error: any) {
    logger.error('Navigation failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Take screenshot
 */
app.post('/api/browser/:sessionId/screenshot', screenshotLimiter, ENABLE_AUTH ? authenticate : optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = browserSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const pages = await session.browser.pages();
    if (pages.length === 0) {
      return res.status(400).json({ success: false, error: 'No pages available' });
    }

    const screenshot = await pages[0].screenshot({ encoding: 'base64' });

    return res.json({
      success: true,
      screenshot: `data:image/png;base64,${screenshot}`,
    });
  } catch (error: any) {
    logger.error('Screenshot failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get page info
 */
app.get('/api/browser/:sessionId/info', ENABLE_AUTH ? authenticate : optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = browserSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const pages = await session.browser.pages();
    const pageInfo = await Promise.all(
      pages.map(async (page: any) => ({
        title: await page.title(),
        url: page.url(),
      }))
    );

    return res.json({
      success: true,
      sessionId,
      status: session.status,
      duration: Date.now() - session.startTime,
      pages: pageInfo,
    });
  } catch (error: any) {
    logger.error('Get info failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Close browser session
 */
app.post('/api/browser/:sessionId/close', ENABLE_AUTH ? authenticate : optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = browserSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    await session.browser.close();
    browserSessions.delete(sessionId);

    io.emit('browser:closed', { sessionId, timestamp: Date.now() });

    return res.json({
      success: true,
      message: 'Browser closed successfully',
    });
  } catch (error: any) {
    logger.error('Close browser failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * List all active sessions
 */
app.get('/api/browser/sessions', ENABLE_AUTH ? authenticate : optionalAuth, (req: AuthRequest, res: Response) => {
  const sessions = Array.from(browserSessions.entries()).map(([id, session]) => ({
    id,
    status: session.status,
    duration: Date.now() - session.startTime,
    startTime: session.startTime,
  }));

  res.json({
    success: true,
    sessions,
    total: sessions.length,
  });
});

/**
 * Execute script in page
 */
app.post('/api/browser/:sessionId/execute', strictLimiter, ENABLE_AUTH ? authenticate : optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { script } = req.body;

    const session = browserSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const pages = await session.browser.pages();
    if (pages.length === 0) {
      return res.status(400).json({ success: false, error: 'No pages available' });
    }

    const result = await pages[0].evaluate(script);

    return res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    logger.error('Script execution failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// WebSocket Handlers
// ============================================

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe:stats', () => {
    // Send stats every 2 seconds
    const interval = setInterval(() => {
      const stats = {
        activeBrowsers: browserSessions.size,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      };
      socket.emit('stats:update', stats);
    }, 2000);

    socket.on('disconnect', () => {
      clearInterval(interval);
    });
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// ============================================
// Serve Frontend
// ============================================

// Serve index.html for root path
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

// ============================================
// Start Server
// ============================================

httpServer.listen(PORT, () => {
  logger.info(`🚀 UndetectBrowser Server running on http://localhost:${PORT}`);
  logger.info(`📊 API available at http://localhost:${PORT}/api`);
  logger.info(`🌐 WebSocket available at ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing browsers...');

  for (const [sessionId, session] of browserSessions.entries()) {
    try {
      await session.browser.close();
      logger.info(`Closed browser session: ${sessionId}`);
    } catch (error) {
      logger.error(`Error closing session ${sessionId}:`, error);
    }
  }

  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
