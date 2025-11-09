/**
 * UndetectBrowser Web Server
 * REST API for browser automation and management
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { UndetectBrowser } from '../src/index';
import { logger } from '../src/utils/logger';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web/build')));

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

/**
 * Health check
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    memory: process.memoryUsage(),
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
app.post('/api/browser/launch', async (req: Request, res: Response) => {
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
      logLevel: 'info',
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
app.post('/api/browser/:sessionId/navigate', async (req: Request, res: Response) => {
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

    res.json({
      success: true,
      url,
      title: await page.title(),
    });
  } catch (error: any) {
    logger.error('Navigation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Take screenshot
 */
app.post('/api/browser/:sessionId/screenshot', async (req: Request, res: Response) => {
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

    res.json({
      success: true,
      screenshot: `data:image/png;base64,${screenshot}`,
    });
  } catch (error: any) {
    logger.error('Screenshot failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get page info
 */
app.get('/api/browser/:sessionId/info', async (req: Request, res: Response) => {
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

    res.json({
      success: true,
      sessionId,
      status: session.status,
      duration: Date.now() - session.startTime,
      pages: pageInfo,
    });
  } catch (error: any) {
    logger.error('Get info failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Close browser session
 */
app.post('/api/browser/:sessionId/close', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = browserSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    await session.browser.close();
    browserSessions.delete(sessionId);

    io.emit('browser:closed', { sessionId, timestamp: Date.now() });

    res.json({
      success: true,
      message: 'Browser closed successfully',
    });
  } catch (error: any) {
    logger.error('Close browser failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * List all active sessions
 */
app.get('/api/browser/sessions', (req: Request, res: Response) => {
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
app.post('/api/browser/:sessionId/execute', async (req: Request, res: Response) => {
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

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    logger.error('Script execution failed:', error);
    res.status(500).json({
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

app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../web/build/index.html'));
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
