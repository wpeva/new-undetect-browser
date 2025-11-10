/**
 * Enhanced UndetectBrowser Server v2.0
 * Features: SQLite DB, Real-time WebSocket, Enhanced API
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { initDatabase, closeDatabase } from './database/db';

// Enhanced API Routes
import { ProfileModel } from './models/Profile';
import { ProxyModel } from './models/Proxy';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// PROFILES API - Enhanced
// ============================================

// Get all profiles
app.get('/api/v2/profiles', async (req: Request, res: Response) => {
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
// STATISTICS API
// ============================================

app.get('/api/v2/stats', async (req: Request, res: Response) => {
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
