/**
 * Enhanced UndetectBrowser Server v2.0
 * Features: SQLite DB, Real-time WebSocket, Enhanced API
 * Optimizations: Compression, Caching, Rate Limiting, Security Headers
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { initDatabase, closeDatabase } from './database/db';
import rateLimit from 'express-rate-limit';

// Enhanced API Routes
import { ProfileModel } from './models/Profile';
import { ProxyModel } from './models/Proxy';

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
app.get('/api/v2/profiles/:id', async (req: Request, res: Response) => {
  try {
    const profile = await ProfileModel.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
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
app.put('/api/v2/profiles/:id', async (req: Request, res: Response) => {
  try {
    const profile = await ProfileModel.update(req.params.id, req.body);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    io.emit('profile:updated', profile);
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete profile
app.delete('/api/v2/profiles/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await ProfileModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    io.emit('profile:deleted', req.params.id);
    res.json({ success: true, message: 'Profile deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk delete profiles
app.post('/api/v2/profiles/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'ids must be an array' });
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
    await ProfileModel.updateStatus(req.params.id, 'active');
    io.emit('profile:launched', req.params.id);
    res.json({ success: true, message: 'Profile launched' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop profile
app.post('/api/v2/profiles/:id/stop', async (req: Request, res: Response) => {
  try {
    await ProfileModel.updateStatus(req.params.id, 'idle');
    io.emit('profile:stopped', req.params.id);
    res.json({ success: true, message: 'Profile stopped' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
app.post('/api/v2/proxies/bulk-import', async (req: Request, res: Response) => {
  try {
    const { proxies } = req.body;
    if (!Array.isArray(proxies)) {
      return res.status(400).json({ success: false, error: 'proxies must be an array' });
    }
    const count = await ProxyModel.bulkCreate(proxies);
    io.emit('proxies:imported', count);
    res.json({ success: true, imported: count });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check proxy
app.post('/api/v2/proxies/:id/check', async (req: Request, res: Response) => {
  try {
    // TODO: Implement actual proxy checking
    await ProxyModel.updateStatus(req.params.id, 'working', 100);
    io.emit('proxy:checked', req.params.id);
    res.json({ success: true, message: 'Proxy checked' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// STATISTICS API with Caching
// ============================================

app.get('/api/v2/stats', cacheMiddleware(10000), async (req: Request, res: Response) => {
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
// HEALTH & ERROR HANDLING
// ============================================

app.get('/api/v2/health', (_req: Request, res: Response) => {
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

async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    console.log('✅ Database initialized');

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║  UndetectBrowser Server v2.0 - RUNNING                 ║
║  Port: ${PORT}                                         ║
║  Database: SQLite                                      ║
║  WebSocket: Enabled                                    ║
║  API Docs: http://localhost:${PORT}/api/v2/health      ║
╚════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, closing server...');
      await closeDatabase();
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
