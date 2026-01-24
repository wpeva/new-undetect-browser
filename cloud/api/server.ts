/**
 * Cloud Anti-Detect Browser API Server
 *
 * REST API server for managing browser sessions in cloud deployment.
 * Provides endpoints for session creation, management, and automation.
 *
 * Features:
 * - Session lifecycle management
 * - WebSocket support for real-time control
 * - Redis for session state
 * - PostgreSQL for profile storage
 * - Load balancing ready
 * - Health checks and metrics
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createClient } from 'redis';
import { Pool } from 'pg';
import puppeteer, { Browser, Page } from 'puppeteer';
import { StealthEngine } from '../../src/core/stealth-engine';
import { FingerprintProfile } from '../../src/types';

// ========== Configuration ==========
const PORT = parseInt(process.env.PORT || '3000', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const POSTGRES_URL = process.env.DATABASE_URL || 'postgresql://antidetect:password@postgres:5432/antidetect';
const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS || '100', 10);
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || '1800000', 10); // 30 minutes
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

// ========== Types ==========
export interface ServerConfig {
  port?: number;
  redisUrl?: string;
  postgresUrl?: string;
  maxSessions?: number;
  sessionTimeout?: number;
  chromePath?: string;
}

export interface SessionConfig {
  fingerprint?: Partial<FingerprintProfile>;
  profileId?: string;
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  proxy?: string;
  stealthLevel?: 'basic' | 'advanced' | 'paranoid';
  timeout?: number;
}

// Type aliases for backward compatibility
export type BrowserProfile = SessionConfig;

export interface ExecuteScriptOptions {
  code: string;
  pageIndex?: number;
}

export interface ExecuteScriptResult {
  success: boolean;
  result?: any;
  error?: string;
}

// Placeholder export for CloudAPIServer (for compatibility)
export class CloudAPIServer {
  constructor(_config?: ServerConfig) {
    // Placeholder - actual implementation is in the standalone server below
  }

  async start(): Promise<void> {
    throw new Error('CloudAPIServer.start() is not implemented - use the standalone server instead');
  }

  async stop(): Promise<void> {
    throw new Error('CloudAPIServer.stop() is not implemented - use the standalone server instead');
  }

  getSessionManager(): any {
    throw new Error('CloudAPIServer.getSessionManager() is not implemented - use the standalone server instead');
  }

  getWebSocketServer(): any {
    throw new Error('CloudAPIServer.getWebSocketServer() is not implemented - use the standalone server instead');
  }
}

interface BrowserSession {
  id: string;
  browser: Browser;
  pages: Page[];
  config: SessionConfig;
  createdAt: Date;
  lastActivity: Date;
  cdpUrl: string;
}

interface SessionInfo {
  id: string;
  cdpUrl: string;
  wsUrl: string;
  createdAt: string;
  lastActivity: string;
  pagesCount: number;
  config: SessionConfig;
}

// ========== Global State ==========
const sessions = new Map<string, BrowserSession>();
let redisClient: ReturnType<typeof createClient>;
let pgPool: Pool;
let sessionCleanupInterval: NodeJS.Timeout;

// ========== Express App ==========
const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ========== Database Initialization ==========
async function initDatabase() {
  // Redis
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => console.error('Redis error:', err));
  await redisClient.connect();
  console.log('Connected to Redis');

  // PostgreSQL
  pgPool = new Pool({ connectionString: POSTGRES_URL });
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id VARCHAR(255) PRIMARY KEY,
      fingerprint JSONB NOT NULL,
      config JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      profile_id VARCHAR(255) REFERENCES profiles(id),
      config JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      last_activity TIMESTAMP DEFAULT NOW(),
      status VARCHAR(50) DEFAULT 'active'
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
  `);
  console.log('Connected to PostgreSQL and initialized schema');
}

// ========== Session Management ==========
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

async function createBrowserSession(config: SessionConfig): Promise<BrowserSession> {
  // Check session limit
  if (sessions.size >= MAX_SESSIONS) {
    throw new Error(`Maximum sessions (${MAX_SESSIONS}) reached`);
  }

  const sessionId = generateSessionId();
  const cdpPort = 9222 + sessions.size; // Allocate CDP port

  // Launch browser
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: config.headless !== false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      `--remote-debugging-port=${cdpPort}`,
      ...(config.proxy ? [`--proxy-server=${config.proxy}`] : []),
    ],
    defaultViewport: config.viewport || { width: 1920, height: 1080 },
    ...(config.userAgent && {
      // Note: userAgent is set per-page, not in launch
    }),
  });

  // Create initial page
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  // Set user agent if provided (must be done before stealth)
  const userAgent: string = config.userAgent ||
    (config.fingerprint && 'userAgent' in config.fingerprint && typeof config.fingerprint.userAgent === 'string' ? config.fingerprint.userAgent : '') ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  await page.setUserAgent(userAgent);

  // Apply stealth protections
  const stealth = new StealthEngine({
    level: config.stealthLevel || 'advanced',
    customFingerprint: config.fingerprint as FingerprintProfile | undefined,
  });
  await stealth.applyProtections(page, userAgent);

  const now = new Date();
  const session: BrowserSession = {
    id: sessionId,
    browser,
    pages: [page],
    config,
    createdAt: now,
    lastActivity: now,
    cdpUrl: `ws://localhost:${cdpPort}`,
  };

  sessions.set(sessionId, session);

  // Store in Redis
  await redisClient.setEx(
    `session:${sessionId}`,
    Math.floor((config.timeout || SESSION_TIMEOUT) / 1000),
    JSON.stringify({
      id: sessionId,
      cdpUrl: session.cdpUrl,
      config,
      createdAt: now.toISOString(),
    })
  );

  // Store in PostgreSQL
  await pgPool.query(
    'INSERT INTO sessions (id, profile_id, config, created_at, last_activity) VALUES ($1, $2, $3, $4, $5)',
    [sessionId, config.profileId || null, JSON.stringify(config), now, now]
  );

  console.log(`Created session ${sessionId} with CDP port ${cdpPort}`);
  return session;
}

async function destroyBrowserSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Close browser
  await session.browser.close();

  // Remove from memory
  sessions.delete(sessionId);

  // Remove from Redis
  await redisClient.del(`session:${sessionId}`);

  // Update PostgreSQL
  await pgPool.query(
    'UPDATE sessions SET status = $1, last_activity = $2 WHERE id = $3',
    ['closed', new Date(), sessionId]
  );

  console.log(`Destroyed session ${sessionId}`);
}

function updateSessionActivity(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivity = new Date();
  }
}

function getSessionInfo(session: BrowserSession): SessionInfo {
  return {
    id: session.id,
    cdpUrl: session.cdpUrl,
    wsUrl: session.cdpUrl.replace('ws://', 'ws://'),
    createdAt: session.createdAt.toISOString(),
    lastActivity: session.lastActivity.toISOString(),
    pagesCount: session.pages.length,
    config: session.config,
  };
}

// Session cleanup (remove idle sessions)
function startSessionCleanup(): void {
  sessionCleanupInterval = setInterval(async () => {
    const now = Date.now();
    const sessionsToDestroy: string[] = [];

    for (const [sessionId, session] of sessions.entries()) {
      const idleTime = now - session.lastActivity.getTime();
      const timeout = session.config.timeout || SESSION_TIMEOUT;

      if (idleTime > timeout) {
        console.log(`Session ${sessionId} idle for ${idleTime}ms, destroying...`);
        sessionsToDestroy.push(sessionId);
      }
    }

    for (const sessionId of sessionsToDestroy) {
      try {
        await destroyBrowserSession(sessionId);
      } catch (error) {
        console.error(`Error destroying session ${sessionId}:`, error);
      }
    }
  }, 60000); // Check every minute
}

// ========== API Routes ==========

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    sessions: {
      active: sessions.size,
      max: MAX_SESSIONS,
    },
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// Metrics (Prometheus format)
app.get('/metrics', (_req: Request, res: Response) => {
  const mem = process.memoryUsage();
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP browser_sessions_active Number of active browser sessions
# TYPE browser_sessions_active gauge
browser_sessions_active ${sessions.size}

# HELP browser_sessions_max Maximum number of browser sessions
# TYPE browser_sessions_max gauge
browser_sessions_max ${MAX_SESSIONS}

# HELP nodejs_memory_heap_used_bytes Node.js heap memory used
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${mem.heapUsed}

# HELP nodejs_memory_heap_total_bytes Node.js heap memory total
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${mem.heapTotal}

# HELP nodejs_memory_external_bytes Node.js external memory
# TYPE nodejs_memory_external_bytes gauge
nodejs_memory_external_bytes ${mem.external}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds counter
process_uptime_seconds ${process.uptime()}
  `.trim());
});

// Create session
app.post('/api/sessions/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const config: SessionConfig = req.body;

    // Validate config
    if (config.timeout && config.timeout > 3600000) {
      res.status(400).json({ error: 'Maximum timeout is 1 hour' });
      return;
    }

    const session = await createBrowserSession(config);
    res.status(201).json({
      success: true,
      session: getSessionInfo(session),
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create session',
    });
  }
});

// Get session info
app.get('/api/sessions/:sessionId', (req: Request, res: Response): void => {
  const { sessionId } = req.params;

  if (!sessionId) {
    res.status(400).json({
      success: false,
      error: 'Session ID is required',
    });
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.status(404).json({
      success: false,
      error: 'Session not found',
    });
    return;
  }

  updateSessionActivity(sessionId);
  res.json({
    success: true,
    session: getSessionInfo(session),
  });
});

// List all sessions
app.get('/api/sessions', (_req: Request, res: Response) => {
  const sessionsList = Array.from(sessions.values()).map(getSessionInfo);
  res.json({
    success: true,
    sessions: sessionsList,
    total: sessionsList.length,
  });
});

// Destroy session
app.delete('/api/sessions/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
      return;
    }

    await destroyBrowserSession(sessionId);
    res.json({
      success: true,
      message: `Session ${sessionId} destroyed`,
    });
  } catch (error: any) {
    console.error('Error destroying session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to destroy session',
    });
  }
});

// Execute code in session
app.post('/api/sessions/:sessionId/execute', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { code, pageIndex = 0 } = req.body;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    if (!code) {
      res.status(400).json({
        success: false,
        error: 'Code is required',
      });
      return;
    }

    const page = session.pages[pageIndex];
    if (!page) {
      res.status(400).json({
        success: false,
        error: `Page ${pageIndex} not found`,
      });
      return;
    }

    updateSessionActivity(sessionId);
    const result = await page.evaluate(code);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error executing code:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute code',
    });
  }
});

// Navigate page
app.post('/api/sessions/:sessionId/navigate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { url, pageIndex = 0 } = req.body;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    if (!url) {
      res.status(400).json({
        success: false,
        error: 'URL is required',
      });
      return;
    }

    const page = session.pages[pageIndex];
    if (!page) {
      res.status(400).json({
        success: false,
        error: `Page ${pageIndex} not found`,
      });
      return;
    }

    updateSessionActivity(sessionId);
    await page.goto(url, { waitUntil: 'networkidle2' });

    res.json({
      success: true,
      message: `Navigated to ${url}`,
    });
  } catch (error: any) {
    console.error('Error navigating:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to navigate',
    });
  }
});

// Screenshot
app.post('/api/sessions/:sessionId/screenshot', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { pageIndex = 0, fullPage = false } = req.body;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    const page = session.pages[pageIndex];
    if (!page) {
      res.status(400).json({
        success: false,
        error: `Page ${pageIndex} not found`,
      });
      return;
    }

    updateSessionActivity(sessionId);
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage,
    });

    res.json({
      success: true,
      screenshot,
    });
  } catch (error: any) {
    console.error('Error taking screenshot:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to take screenshot',
    });
  }
});

// ========== WebSocket Support ==========
httpServer.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, _request) => {
  console.log('WebSocket connection established');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('WebSocket message:', data);

      // Handle WebSocket commands
      // This can be extended for real-time session control
      ws.send(JSON.stringify({ success: true, echo: data }));
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ success: false, error: 'Invalid message' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// ========== Error Handling ==========
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ========== Server Startup ==========
async function start() {
  try {
    // Initialize database connections
    await initDatabase();

    // Start session cleanup
    startSessionCleanup();

    // Start HTTP server
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Cloud Anti-Detect Browser API Server running on port ${PORT}`);
      console.log(`Max sessions: ${MAX_SESSIONS}`);
      console.log(`Session timeout: ${SESSION_TIMEOUT}ms`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      clearInterval(sessionCleanupInterval);

      // Close all sessions
      const sessionIds = Array.from(sessions.keys());
      for (const sessionId of sessionIds) {
        try {
          await destroyBrowserSession(sessionId);
        } catch (error) {
          console.error(`Error destroying session ${sessionId}:`, error);
        }
      }

      // Close connections
      await redisClient.quit();
      await pgPool.end();

      httpServer.close(() => {
        console.log('Server shut down');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
start();
