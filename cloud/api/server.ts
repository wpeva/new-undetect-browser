/**
 * Cloud API Server - REST API for browser session management
 *
 * Features:
 * - Session CRUD operations
 * - Script execution
 * - Health checks and monitoring
 * - WebSocket integration
 * - Rate limiting and security
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { SessionManager, SessionConfig } from './session-manager';
import { WebSocketServer } from './websocket';

// Extend Express Request type
interface TypedRequest<T = any> extends Request {
  body: T;
}

interface CreateSessionRequest {
  country?: string;
  os?: string;
  browserVersion?: string;
  protectionLevel?: 'basic' | 'standard' | 'advanced' | 'paranoid';
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    type?: 'http' | 'https' | 'socks5';
  };
  maxDuration?: number;
}

interface ExecuteScriptRequest {
  script: string;
  timeout?: number;
  context?: 'page' | 'worker' | 'serviceworker';
}

export interface ServerConfig {
  port?: number;
  host?: string;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
  apiPrefix?: string;
  enableSwagger?: boolean;
}

/**
 * Cloud API Server class
 */
export class CloudAPIServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private sessionManager: SessionManager;
  private wsServer: WebSocketServer;
  private config: Required<ServerConfig>;

  constructor(config: ServerConfig = {}) {
    this.config = {
      port: config.port || 3000,
      host: config.host || '0.0.0.0',
      cors: config.cors || { origin: '*', credentials: true },
      rateLimit: config.rateLimit || { windowMs: 15 * 60 * 1000, max: 100 },
      apiPrefix: config.apiPrefix || '/api/v1',
      enableSwagger: config.enableSwagger !== false,
    };

    this.app = express();
    this.httpServer = createServer(this.app);
    this.sessionManager = new SessionManager();
    this.wsServer = new WebSocketServer(this.httpServer, this.sessionManager);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());

    // CORS
    this.app.use(cors(this.config.cors));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(this.config.apiPrefix, limiter);

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[API] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    const router = express.Router();

    // Health check
    router.get('/health', this.handleHealth.bind(this));

    // Server stats
    router.get('/stats', this.handleStats.bind(this));

    // Session routes
    router.post('/sessions', this.handleCreateSession.bind(this));
    router.get('/sessions', this.handleListSessions.bind(this));
    router.get('/sessions/:id', this.handleGetSession.bind(this));
    router.delete('/sessions/:id', this.handleDestroySession.bind(this));
    router.post('/sessions/:id/execute', this.handleExecuteScript.bind(this));
    router.put('/sessions/:id/activity', this.handleUpdateActivity.bind(this));

    // Apply router
    this.app.use(this.config.apiPrefix, router);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'Undetect Browser Cloud API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: `${this.config.apiPrefix}/health`,
          stats: `${this.config.apiPrefix}/stats`,
          sessions: `${this.config.apiPrefix}/sessions`,
          docs: this.config.enableSwagger ? '/api-docs' : null,
        },
        websocket: {
          enabled: true,
          path: '/socket.io',
        },
      });
    });

    // Swagger/OpenAPI docs
    if (this.config.enableSwagger) {
      this.setupSwagger();
    }
  }

  /**
   * Setup Swagger documentation
   */
  private setupSwagger(): void {
    // Serve static OpenAPI spec
    this.app.get('/api-docs/openapi.json', (req: Request, res: Response) => {
      res.json(this.getOpenAPISpec());
    });

    // Serve Swagger UI (simple HTML)
    this.app.get('/api-docs', (req: Request, res: Response) => {
      res.send(this.getSwaggerUIHTML());
    });
  }

  /**
   * Health check endpoint
   */
  private async handleHealth(req: Request, res: Response): Promise<void> {
    const stats = this.sessionManager.getStats();
    const wsStats = this.wsServer.getStats();

    res.json({
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      sessions: {
        total: stats.total,
        byStatus: stats.byStatus,
      },
      websocket: {
        connected: wsStats.connectedClients,
        subscriptions: wsStats.totalSubscriptions,
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
    });
  }

  /**
   * Server statistics endpoint
   */
  private async handleStats(req: Request, res: Response): Promise<void> {
    const sessionStats = this.sessionManager.getStats();
    const wsStats = this.wsServer.getStats();

    res.json({
      sessions: sessionStats,
      websocket: wsStats,
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    });
  }

  /**
   * Create session endpoint
   */
  private async handleCreateSession(
    req: TypedRequest<CreateSessionRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const config: SessionConfig = {
        country: req.body.country,
        os: req.body.os,
        browserVersion: req.body.browserVersion,
        protectionLevel: req.body.protectionLevel || 'standard',
        proxy: req.body.proxy,
        maxDuration: req.body.maxDuration,
      };

      const session = await this.sessionManager.create(config);

      res.status(201).json({
        success: true,
        session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List sessions endpoint
   */
  private async handleListSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, minCreatedAt, maxCreatedAt } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (minCreatedAt) filters.minCreatedAt = new Date(minCreatedAt as string);
      if (maxCreatedAt) filters.maxCreatedAt = new Date(maxCreatedAt as string);

      const sessions = await this.sessionManager.list(filters);

      res.json({
        success: true,
        count: sessions.length,
        sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get session endpoint
   */
  private async handleGetSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await this.sessionManager.get(req.params.id);

      res.json({
        success: true,
        session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Destroy session endpoint
   */
  private async handleDestroySession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.sessionManager.destroy(req.params.id);

      res.json({
        success: true,
        message: `Session ${req.params.id} destroyed`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute script endpoint
   */
  private async handleExecuteScript(
    req: TypedRequest<ExecuteScriptRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { script, timeout, context } = req.body;

      if (!script) {
        res.status(400).json({
          success: false,
          error: 'Script is required',
        });
        return;
      }

      const result = await this.sessionManager.execute(req.params.id, script, {
        timeout,
        context,
      });

      res.json({
        success: result.success,
        result: result.result,
        error: result.error,
        executionTime: result.executionTime,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update session activity endpoint
   */
  private async handleUpdateActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.sessionManager.updateActivity(req.params.id);

      res.json({
        success: true,
        message: 'Activity updated',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Not found',
        path: req.path,
      });
    });

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('[API] Error:', err);

      const statusCode = (err as any).statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      });
    });
  }

  /**
   * Get OpenAPI specification
   */
  private getOpenAPISpec(): any {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Undetect Browser Cloud API',
        version: '1.0.0',
        description: 'REST API for managing anti-detection browser sessions',
        contact: {
          name: 'API Support',
          url: 'https://antidetect.io/support',
        },
      },
      servers: [
        {
          url: `http://localhost:${this.config.port}${this.config.apiPrefix}`,
          description: 'Local development server',
        },
        {
          url: `https://api.antidetect.io${this.config.apiPrefix}`,
          description: 'Production server',
        },
      ],
      paths: {
        '/health': {
          get: {
            summary: 'Health check',
            description: 'Get server health status and statistics',
            responses: {
              '200': {
                description: 'Server is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'healthy' },
                        timestamp: { type: 'string', format: 'date-time' },
                        uptime: { type: 'number' },
                        sessions: { type: 'object' },
                        websocket: { type: 'object' },
                        memory: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/sessions': {
          post: {
            summary: 'Create session',
            description: 'Create a new browser session',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      country: { type: 'string', example: 'US' },
                      os: { type: 'string', enum: ['windows', 'mac', 'linux'], example: 'windows' },
                      browserVersion: { type: 'string', example: '120.0.0.0' },
                      protectionLevel: {
                        type: 'string',
                        enum: ['basic', 'standard', 'advanced', 'paranoid'],
                        example: 'standard',
                      },
                      maxDuration: { type: 'number', example: 3600 },
                    },
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Session created',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        session: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
          get: {
            summary: 'List sessions',
            description: 'Get all active sessions',
            parameters: [
              {
                name: 'status',
                in: 'query',
                schema: { type: 'string' },
                description: 'Filter by status',
              },
            ],
            responses: {
              '200': {
                description: 'List of sessions',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        count: { type: 'number' },
                        sessions: { type: 'array' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/sessions/{id}': {
          get: {
            summary: 'Get session',
            description: 'Get session details by ID',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: {
              '200': {
                description: 'Session details',
              },
              '404': {
                description: 'Session not found',
              },
            },
          },
          delete: {
            summary: 'Destroy session',
            description: 'Terminate and clean up session',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: {
              '200': {
                description: 'Session destroyed',
              },
            },
          },
        },
        '/sessions/{id}/execute': {
          post: {
            summary: 'Execute script',
            description: 'Execute JavaScript in session',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      script: { type: 'string' },
                      timeout: { type: 'number' },
                    },
                    required: ['script'],
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Script executed',
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Session: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              cdpEndpoint: { type: 'string' },
              wsEndpoint: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    };
  }

  /**
   * Get Swagger UI HTML
   */
  private getSwaggerUIHTML(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Undetect Browser Cloud API - Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api-docs/openapi.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout',
        deepLinking: true
      });
    };
  </script>
</body>
</html>
    `;
  }

  /**
   * Start server
   */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.config.port, this.config.host, () => {
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║        🌐 Undetect Browser Cloud API Server                   ║
║                                                                ║
║        Server:     http://${this.config.host}:${this.config.port}                         ║
║        API:        ${this.config.apiPrefix}                              ║
║        Health:     ${this.config.apiPrefix}/health                       ║
║        Stats:      ${this.config.apiPrefix}/stats                        ║
║        Docs:       /api-docs                                   ║
║        WebSocket:  ws://${this.config.host}:${this.config.port}/socket.io            ║
║                                                                ║
║        Status:     🟢 Running                                  ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
        `);
        resolve();
      });
    });
  }

  /**
   * Stop server
   */
  public async stop(): Promise<void> {
    console.log('[API] Shutting down...');

    // Shutdown WebSocket server
    await this.wsServer.shutdown();

    // Shutdown session manager
    await this.sessionManager.shutdown();

    // Close HTTP server
    return new Promise((resolve, reject) => {
      this.httpServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('[API] Server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get Express app (for testing)
   */
  public getApp(): express.Application {
    return this.app;
  }

  /**
   * Get Session Manager
   */
  public getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Get WebSocket Server
   */
  public getWebSocketServer(): WebSocketServer {
    return this.wsServer;
  }
}

export default CloudAPIServer;
