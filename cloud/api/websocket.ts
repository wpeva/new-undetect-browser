/**
 * WebSocket Server - Real-time bidirectional communication
 *
 * Features:
 * - Real-time session events
 * - Browser automation commands
 * - CDP proxy for direct browser control
 * - Session monitoring and logs
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { SessionManager, Session } from './session-manager';

export interface WebSocketConfig {
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  path?: string;
  pingTimeout?: number;
  pingInterval?: number;
}

export interface ClientMessage {
  type: string;
  sessionId?: string;
  data?: any;
  requestId?: string;
}

export interface ServerMessage {
  type: string;
  sessionId?: string;
  data?: any;
  requestId?: string;
  timestamp: Date;
}

export interface CDPMessage {
  id: number;
  method: string;
  params?: any;
  sessionId?: string;
}

export interface CDPResponse {
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * WebSocket Server class
 */
export class WebSocketServer {
  private io: SocketIOServer;
  private sessions: SessionManager;
  private connectedClients: Map<string, Socket>; // socketId -> Socket
  private sessionClients: Map<string, Set<string>>; // sessionId -> Set<socketId>

  constructor(httpServer: HttpServer, sessions: SessionManager, config: WebSocketConfig = {}) {
    this.sessions = sessions;
    this.connectedClients = new Map();
    this.sessionClients = new Map();

    // Initialize Socket.IO server
    this.io = new SocketIOServer(httpServer, {
      cors: config.cors || {
        origin: '*',
        credentials: true,
      },
      path: config.path || '/socket.io',
      pingTimeout: config.pingTimeout || 60000,
      pingInterval: config.pingInterval || 25000,
    });

    this.setupEventHandlers();
    this.setupSessionEventForwarding();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      this.sendMessage(socket, {
        type: 'connected',
        data: {
          socketId: socket.id,
          serverTime: new Date(),
        },
        timestamp: new Date(),
      });

      // Handle client messages
      socket.on('message', async (message: ClientMessage) => {
        await this.handleClientMessage(socket, message);
      });

      // Handle session subscription
      socket.on('subscribe', async (data: { sessionId: string }) => {
        await this.handleSubscribe(socket, data.sessionId);
      });

      // Handle session unsubscription
      socket.on('unsubscribe', async (data: { sessionId: string }) => {
        await this.handleUnsubscribe(socket, data.sessionId);
      });

      // Handle CDP messages
      socket.on('cdp', async (message: CDPMessage) => {
        await this.handleCDPMessage(socket, message);
      });

      // Handle script execution
      socket.on('execute', async (data: { sessionId: string; script: string; requestId?: string }) => {
        await this.handleExecuteScript(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', (reason: string) => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}, reason: ${reason}`);
        this.handleDisconnect(socket);
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        console.error(`[WebSocket] Socket error for ${socket.id}:`, error);
        this.sendMessage(socket, {
          type: 'error',
          data: {
            message: 'Socket error occurred',
            error: error.message,
          },
          timestamp: new Date(),
        });
      });

      // Handle ping/pong for keepalive
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });
    });

    console.log('[WebSocket] Server initialized');
  }

  /**
   * Setup session event forwarding
   */
  private setupSessionEventForwarding(): void {
    // Forward session events to subscribed clients
    this.sessions.on('session:created', (session: Session) => {
      this.broadcastToSession(session.id, {
        type: 'session:created',
        sessionId: session.id,
        data: session,
        timestamp: new Date(),
      });
    });

    this.sessions.on('session:ready', (session: Session) => {
      this.broadcastToSession(session.id, {
        type: 'session:ready',
        sessionId: session.id,
        data: session,
        timestamp: new Date(),
      });
    });

    this.sessions.on('session:status', (data: { session: Session; oldStatus: string; newStatus: string }) => {
      this.broadcastToSession(data.session.id, {
        type: 'session:status',
        sessionId: data.session.id,
        data: {
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          session: data.session,
        },
        timestamp: new Date(),
      });
    });

    this.sessions.on('session:activity', (session: Session) => {
      this.broadcastToSession(session.id, {
        type: 'session:activity',
        sessionId: session.id,
        data: {
          lastActivity: session.lastActivity,
        },
        timestamp: new Date(),
      });
    });

    this.sessions.on('session:error', (session: Session) => {
      this.broadcastToSession(session.id, {
        type: 'session:error',
        sessionId: session.id,
        data: {
          error: session.error,
          session: session,
        },
        timestamp: new Date(),
      });
    });

    this.sessions.on('session:terminating', (session: Session) => {
      this.broadcastToSession(session.id, {
        type: 'session:terminating',
        sessionId: session.id,
        data: session,
        timestamp: new Date(),
      });
    });

    this.sessions.on('session:destroyed', (session: Session) => {
      this.broadcastToSession(session.id, {
        type: 'session:destroyed',
        sessionId: session.id,
        data: session,
        timestamp: new Date(),
      });

      // Clean up subscriptions
      this.sessionClients.delete(session.id);
    });
  }

  /**
   * Handle client message
   */
  private async handleClientMessage(socket: Socket, message: ClientMessage): Promise<void> {
    try {
      console.log(`[WebSocket] Message from ${socket.id}:`, message.type);

      switch (message.type) {
        case 'ping':
          this.sendMessage(socket, {
            type: 'pong',
            requestId: message.requestId,
            timestamp: new Date(),
          });
          break;

        case 'session:list':
          const sessions = await this.sessions.list();
          this.sendMessage(socket, {
            type: 'session:list',
            data: sessions,
            requestId: message.requestId,
            timestamp: new Date(),
          });
          break;

        case 'session:get':
          if (!message.sessionId) {
            throw new Error('sessionId is required');
          }
          const session = await this.sessions.get(message.sessionId);
          this.sendMessage(socket, {
            type: 'session:get',
            sessionId: message.sessionId,
            data: session,
            requestId: message.requestId,
            timestamp: new Date(),
          });
          break;

        case 'session:stats':
          const stats = this.sessions.getStats();
          this.sendMessage(socket, {
            type: 'session:stats',
            data: stats,
            requestId: message.requestId,
            timestamp: new Date(),
          });
          break;

        default:
          this.sendMessage(socket, {
            type: 'error',
            data: {
              message: `Unknown message type: ${message.type}`,
            },
            requestId: message.requestId,
            timestamp: new Date(),
          });
      }
    } catch (error) {
      console.error(`[WebSocket] Error handling message:`, error);
      this.sendMessage(socket, {
        type: 'error',
        data: {
          message: error instanceof Error ? error.message : String(error),
        },
        requestId: message.requestId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle subscribe to session
   */
  private async handleSubscribe(socket: Socket, sessionId: string): Promise<void> {
    try {
      // Verify session exists
      await this.sessions.get(sessionId);

      // Add client to session subscribers
      if (!this.sessionClients.has(sessionId)) {
        this.sessionClients.set(sessionId, new Set());
      }
      this.sessionClients.get(sessionId)!.add(socket.id);

      console.log(`[WebSocket] Client ${socket.id} subscribed to session ${sessionId}`);

      this.sendMessage(socket, {
        type: 'subscribed',
        sessionId,
        data: {
          sessionId,
          subscribedAt: new Date(),
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(`[WebSocket] Error subscribing to session:`, error);
      this.sendMessage(socket, {
        type: 'error',
        data: {
          message: `Failed to subscribe to session: ${error instanceof Error ? error.message : String(error)}`,
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle unsubscribe from session
   */
  private async handleUnsubscribe(socket: Socket, sessionId: string): Promise<void> {
    const clients = this.sessionClients.get(sessionId);
    if (clients) {
      clients.delete(socket.id);
      if (clients.size === 0) {
        this.sessionClients.delete(sessionId);
      }
    }

    console.log(`[WebSocket] Client ${socket.id} unsubscribed from session ${sessionId}`);

    this.sendMessage(socket, {
      type: 'unsubscribed',
      sessionId,
      data: {
        sessionId,
        unsubscribedAt: new Date(),
      },
      timestamp: new Date(),
    });
  }

  /**
   * Handle CDP message (Chrome DevTools Protocol)
   */
  private async handleCDPMessage(socket: Socket, message: CDPMessage): Promise<void> {
    try {
      if (!message.sessionId) {
        throw new Error('sessionId is required for CDP messages');
      }

      const session = await this.sessions.get(message.sessionId);

      // In production, forward to actual CDP endpoint
      // For now, simulate response
      const response: CDPResponse = {
        id: message.id,
        result: {
          success: true,
          method: message.method,
          simulated: true,
        },
      };

      this.sendMessage(socket, {
        type: 'cdp:response',
        sessionId: message.sessionId,
        data: response,
        timestamp: new Date(),
      });
    } catch (error) {
      const response: CDPResponse = {
        id: message.id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : String(error),
        },
      };

      this.sendMessage(socket, {
        type: 'cdp:response',
        data: response,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle script execution
   */
  private async handleExecuteScript(
    socket: Socket,
    data: { sessionId: string; script: string; requestId?: string }
  ): Promise<void> {
    try {
      const result = await this.sessions.execute(data.sessionId, data.script);

      this.sendMessage(socket, {
        type: 'execute:result',
        sessionId: data.sessionId,
        data: result,
        requestId: data.requestId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.sendMessage(socket, {
        type: 'error',
        sessionId: data.sessionId,
        data: {
          message: `Failed to execute script: ${error instanceof Error ? error.message : String(error)}`,
        },
        requestId: data.requestId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: Socket): void {
    // Remove from connected clients
    this.connectedClients.delete(socket.id);

    // Remove from all session subscriptions
    this.sessionClients.forEach((clients, sessionId) => {
      clients.delete(socket.id);
      if (clients.size === 0) {
        this.sessionClients.delete(sessionId);
      }
    });
  }

  /**
   * Send message to specific socket
   */
  private sendMessage(socket: Socket, message: ServerMessage): void {
    socket.emit('message', message);
  }

  /**
   * Broadcast message to all clients subscribed to a session
   */
  private broadcastToSession(sessionId: string, message: ServerMessage): void {
    const clients = this.sessionClients.get(sessionId);
    if (clients) {
      clients.forEach(socketId => {
        const socket = this.connectedClients.get(socketId);
        if (socket) {
          this.sendMessage(socket, message);
        }
      });
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcast(message: ServerMessage): void {
    this.io.emit('message', message);
  }

  /**
   * Get connected clients count
   */
  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get session subscribers count
   */
  public getSessionSubscribersCount(sessionId: string): number {
    return this.sessionClients.get(sessionId)?.size || 0;
  }

  /**
   * Get statistics
   */
  public getStats(): {
    connectedClients: number;
    subscribedSessions: number;
    totalSubscriptions: number;
  } {
    let totalSubscriptions = 0;
    this.sessionClients.forEach(clients => {
      totalSubscriptions += clients.size;
    });

    return {
      connectedClients: this.connectedClients.size,
      subscribedSessions: this.sessionClients.size,
      totalSubscriptions,
    };
  }

  /**
   * Shutdown WebSocket server
   */
  public async shutdown(): Promise<void> {
    console.log('[WebSocket] Shutting down...');

    // Notify all clients
    this.broadcast({
      type: 'server:shutdown',
      data: {
        message: 'Server is shutting down',
      },
      timestamp: new Date(),
    });

    // Close all connections
    this.io.close();

    console.log('[WebSocket] Shutdown complete');
  }
}

export default WebSocketServer;
