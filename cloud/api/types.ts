/**
 * Cloud API Type Definitions
 *
 * Centralized type definitions for the Cloud API
 */

// Re-export types from modules
export type {
  Session,
  SessionConfig,
  BrowserProfile,
  ExecuteScriptOptions,
  ExecuteScriptResult,
} from './session-manager';

export type {
  WebSocketConfig,
  ClientMessage,
  ServerMessage,
  CDPMessage,
  CDPResponse,
} from './websocket';

export type { ServerConfig } from './server';

/**
 * API Response types
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  count: number;
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  uptime: number;
  sessions: {
    total: number;
    byStatus: Record<string, number>;
  };
  websocket: {
    connected: number;
    subscriptions: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

/**
 * Statistics response
 */
export interface StatsResponse {
  sessions: {
    total: number;
    byStatus: Record<string, number>;
    oldestSession: Date | null;
    newestSession: Date | null;
  };
  websocket: {
    connectedClients: number;
    subscribedSessions: number;
    totalSubscriptions: number;
  };
  server: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
  };
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  stack?: string;
}

/**
 * Session events
 */
export type SessionEvent =
  | 'session:created'
  | 'session:ready'
  | 'session:active'
  | 'session:idle'
  | 'session:terminating'
  | 'session:terminated'
  | 'session:error'
  | 'session:activity'
  | 'session:status'
  | 'session:stored'
  | 'session:destroyed';

/**
 * WebSocket events
 */
export type WebSocketEvent =
  | 'connected'
  | 'disconnected'
  | 'subscribed'
  | 'unsubscribed'
  | 'message'
  | 'error'
  | 'ping'
  | 'pong';

/**
 * Protection levels
 */
export type ProtectionLevel = 'basic' | 'standard' | 'advanced' | 'paranoid';

/**
 * Session status
 */
export type SessionStatus =
  | 'initializing'
  | 'ready'
  | 'active'
  | 'idle'
  | 'terminating'
  | 'terminated'
  | 'error';

/**
 * Operating systems
 */
export type OperatingSystem = 'windows' | 'mac' | 'linux';

/**
 * Proxy types
 */
export type ProxyType = 'http' | 'https' | 'socks5';

/**
 * Script execution contexts
 */
export type ExecutionContext = 'page' | 'worker' | 'serviceworker';
