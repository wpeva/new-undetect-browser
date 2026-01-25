/**
 * UndetectBrowser JavaScript/TypeScript SDK
 *
 * Official SDK for interacting with UndetectBrowser Anti-Detection Platform.
 *
 * @example
 * ```typescript
 * import { AntidetectClient } from '@anthropic/antidetect-sdk';
 *
 * const client = new AntidetectClient({
 *   baseUrl: 'http://localhost:3000',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Create a profile
 * const profile = await client.profiles.create({
 *   name: 'My Profile',
 *   os: 'windows',
 *   browser: 'chrome'
 * });
 *
 * // Launch browser
 * const session = await client.sessions.launch(profile.id);
 *
 * // Use the browser...
 *
 * // Stop session
 * await client.sessions.stop(session.id);
 * ```
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface ClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export interface Profile {
  id: string;
  name: string;
  os: 'windows' | 'macos' | 'linux';
  browser: 'chrome' | 'firefox' | 'edge';
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  proxy?: ProxyConfig;
  fingerprint?: FingerprintConfig;
  cookies?: Cookie[];
  localStorage?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  status: 'idle' | 'running' | 'error';
}

export interface CreateProfileOptions {
  name: string;
  os?: 'windows' | 'macos' | 'linux';
  browser?: 'chrome' | 'firefox' | 'edge';
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  proxy?: ProxyConfig;
  fingerprint?: Partial<FingerprintConfig>;
}

export interface ProxyConfig {
  enabled: boolean;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface FingerprintConfig {
  canvas: boolean;
  webgl: boolean;
  audio: boolean;
  fonts: boolean;
  timezone?: string;
  language?: string;
  screen?: {
    width: number;
    height: number;
    colorDepth: number;
  };
  hardwareConcurrency?: number;
  deviceMemory?: number;
  webglVendor?: string;
  webglRenderer?: string;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface Session {
  id: string;
  profileId: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  wsEndpoint?: string;
  cdpEndpoint?: string;
  startedAt?: string;
  detectionScore?: number;
}

export interface LaunchOptions {
  headless?: boolean;
  args?: string[];
  timeout?: number;
}

export interface Proxy {
  id: string;
  name: string;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
  status: 'unknown' | 'working' | 'failed';
  lastChecked?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface DashboardStats {
  totalProfiles: number;
  activeProfiles: number;
  totalSessions: number;
  activeSessions: number;
  averageDetectionScore: number;
  successRate: number;
}

// ============================================================================
// Error Classes
// ============================================================================

export class AntidetectError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AntidetectError';
  }
}

export class AuthenticationError extends AntidetectError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends AntidetectError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AntidetectError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// API Resources
// ============================================================================

class ProfilesResource {
  constructor(private client: AntidetectClient) {}

  /**
   * List all profiles
   */
  async list(options?: { page?: number; limit?: number }): Promise<PaginatedResponse<Profile>> {
    const response = await this.client.request<PaginatedResponse<Profile>>('GET', '/profiles', {
      params: options,
    });
    return response;
  }

  /**
   * Get a profile by ID
   */
  async get(id: string): Promise<Profile> {
    const response = await this.client.request<Profile>('GET', `/profiles/${id}`);
    return response;
  }

  /**
   * Create a new profile
   */
  async create(options: CreateProfileOptions): Promise<Profile> {
    const response = await this.client.request<Profile>('POST', '/profiles', {
      data: options,
    });
    return response;
  }

  /**
   * Update a profile
   */
  async update(id: string, updates: Partial<CreateProfileOptions>): Promise<Profile> {
    const response = await this.client.request<Profile>('PUT', `/profiles/${id}`, {
      data: updates,
    });
    return response;
  }

  /**
   * Delete a profile
   */
  async delete(id: string): Promise<void> {
    await this.client.request('DELETE', `/profiles/${id}`);
  }

  /**
   * Duplicate a profile
   */
  async duplicate(id: string, name?: string): Promise<Profile> {
    const response = await this.client.request<Profile>('POST', `/profiles/${id}/duplicate`, {
      data: { name },
    });
    return response;
  }

  /**
   * Export profile data
   */
  async export(id: string): Promise<Record<string, any>> {
    const response = await this.client.request<Record<string, any>>('GET', `/profiles/${id}/export`);
    return response;
  }

  /**
   * Import profile data
   */
  async import(data: Record<string, any>): Promise<Profile> {
    const response = await this.client.request<Profile>('POST', '/profiles/import', {
      data,
    });
    return response;
  }
}

class SessionsResource {
  constructor(private client: AntidetectClient) {}

  /**
   * List all sessions
   */
  async list(): Promise<Session[]> {
    const response = await this.client.request<Session[]>('GET', '/sessions');
    return response;
  }

  /**
   * Get a session by ID
   */
  async get(id: string): Promise<Session> {
    const response = await this.client.request<Session>('GET', `/sessions/${id}`);
    return response;
  }

  /**
   * Launch a browser session
   */
  async launch(profileId: string, options?: LaunchOptions): Promise<Session> {
    const response = await this.client.request<Session>('POST', `/profiles/${profileId}/launch`, {
      data: options,
    });
    return response;
  }

  /**
   * Stop a browser session
   */
  async stop(sessionId: string): Promise<void> {
    await this.client.request('POST', `/sessions/${sessionId}/stop`);
  }

  /**
   * Get session detection score
   */
  async getDetectionScore(sessionId: string): Promise<{ score: number; details: Record<string, number> }> {
    const response = await this.client.request<{ score: number; details: Record<string, number> }>(
      'GET',
      `/sessions/${sessionId}/detection-score`
    );
    return response;
  }

  /**
   * Take a screenshot
   */
  async screenshot(sessionId: string): Promise<{ base64: string }> {
    const response = await this.client.request<{ base64: string }>(
      'GET',
      `/sessions/${sessionId}/screenshot`
    );
    return response;
  }

  /**
   * Execute JavaScript in the browser
   */
  async execute(sessionId: string, script: string): Promise<any> {
    const response = await this.client.request<any>('POST', `/sessions/${sessionId}/execute`, {
      data: { script },
    });
    return response;
  }

  /**
   * Navigate to a URL
   */
  async navigate(sessionId: string, url: string): Promise<void> {
    await this.client.request('POST', `/sessions/${sessionId}/navigate`, {
      data: { url },
    });
  }
}

class ProxiesResource {
  constructor(private client: AntidetectClient) {}

  /**
   * List all proxies
   */
  async list(): Promise<Proxy[]> {
    const response = await this.client.request<Proxy[]>('GET', '/proxies');
    return response;
  }

  /**
   * Get a proxy by ID
   */
  async get(id: string): Promise<Proxy> {
    const response = await this.client.request<Proxy>('GET', `/proxies/${id}`);
    return response;
  }

  /**
   * Add a new proxy
   */
  async create(proxy: Omit<Proxy, 'id' | 'status' | 'lastChecked'>): Promise<Proxy> {
    const response = await this.client.request<Proxy>('POST', '/proxies', {
      data: proxy,
    });
    return response;
  }

  /**
   * Update a proxy
   */
  async update(id: string, updates: Partial<Proxy>): Promise<Proxy> {
    const response = await this.client.request<Proxy>('PUT', `/proxies/${id}`, {
      data: updates,
    });
    return response;
  }

  /**
   * Delete a proxy
   */
  async delete(id: string): Promise<void> {
    await this.client.request('DELETE', `/proxies/${id}`);
  }

  /**
   * Test a proxy connection
   */
  async test(id: string): Promise<{ status: string; latency: number; ip?: string }> {
    const response = await this.client.request<{ status: string; latency: number; ip?: string }>(
      'POST',
      `/proxies/${id}/test`
    );
    return response;
  }

  /**
   * Import proxies from text
   */
  async import(text: string, format?: 'ip:port' | 'ip:port:user:pass'): Promise<Proxy[]> {
    const response = await this.client.request<Proxy[]>('POST', '/proxies/import', {
      data: { text, format },
    });
    return response;
  }
}

class AnalyticsResource {
  constructor(private client: AntidetectClient) {}

  /**
   * Get dashboard statistics
   */
  async getDashboard(): Promise<DashboardStats> {
    const response = await this.client.request<DashboardStats>('GET', '/analytics/dashboard');
    return response;
  }

  /**
   * Get detection score history
   */
  async getDetectionHistory(options?: {
    profileId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{ date: string; score: number }>> {
    const response = await this.client.request<Array<{ date: string; score: number }>>(
      'GET',
      '/analytics/detection-history',
      { params: options }
    );
    return response;
  }

  /**
   * Get session history
   */
  async getSessionHistory(options?: {
    profileId?: string;
    limit?: number;
  }): Promise<Array<{ sessionId: string; profileId: string; startedAt: string; duration: number; status: string }>> {
    const response = await this.client.request<any>('GET', '/analytics/sessions', {
      params: options,
    });
    return response;
  }
}

// ============================================================================
// WebSocket Client for Real-time Updates
// ============================================================================

export class RealtimeClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private baseUrl: string,
    private apiKey?: string
  ) {
    super();
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/ws';
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    this.ws = new WebSocket(wsUrl, { headers });

    this.ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.emit('message', message);
        this.emit(message.event, message.data);
      } catch (error) {
        this.emit('error', error);
      }
    });

    this.ws.on('close', () => {
      this.emit('disconnected');
      this.attemptReconnect();
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a message to the server
   */
  send(event: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  /**
   * Subscribe to profile updates
   */
  subscribeToProfile(profileId: string): void {
    this.send('subscribe', { type: 'profile', id: profileId });
  }

  /**
   * Subscribe to session updates
   */
  subscribeToSession(sessionId: string): void {
    this.send('subscribe', { type: 'session', id: sessionId });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.emit('reconnecting', this.reconnectAttempts);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      this.emit('reconnect_failed');
    }
  }
}

// ============================================================================
// Main Client
// ============================================================================

export class AntidetectClient {
  private http: AxiosInstance;
  private config: ClientConfig;

  public profiles: ProfilesResource;
  public sessions: SessionsResource;
  public proxies: ProxiesResource;
  public analytics: AnalyticsResource;

  constructor(config: ClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      ...config,
    };

    // Normalize base URL
    this.config.baseUrl = this.config.baseUrl.replace(/\/$/, '');
    if (!this.config.baseUrl.includes('/api')) {
      this.config.baseUrl += '/api/v2';
    }

    // Create axios instance
    this.http = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      },
    });

    // Initialize resources
    this.profiles = new ProfilesResource(this);
    this.sessions = new SessionsResource(this);
    this.proxies = new ProxiesResource(this);
    this.analytics = new AnalyticsResource(this);
  }

  /**
   * Make an API request
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    options?: { data?: any; params?: any }
  ): Promise<T> {
    try {
      const response = await this.http.request<ApiResponse<T>>({
        method,
        url: path,
        data: options?.data,
        params: options?.params,
      });

      if (response.data.success === false) {
        throw new AntidetectError(response.data.error || 'Unknown error');
      }

      return response.data.data as T;
    } catch (error) {
      if (error instanceof AntidetectError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiResponse<any>>;
        const status = axiosError.response?.status;
        const message = axiosError.response?.data?.error || axiosError.message;

        if (status === 401) {
          throw new AuthenticationError(message);
        }

        if (status === 404) {
          throw new NotFoundError('Resource');
        }

        if (status === 400) {
          throw new ValidationError(message);
        }

        throw new AntidetectError(message, 'API_ERROR', status);
      }

      throw new AntidetectError((error as Error).message);
    }
  }

  /**
   * Get server health status
   */
  async health(): Promise<{ status: string; version: string }> {
    const response = await this.request<{ status: string; version: string }>('GET', '/health');
    return response;
  }

  /**
   * Create a realtime client for WebSocket connections
   */
  realtime(): RealtimeClient {
    return new RealtimeClient(
      this.config.baseUrl.replace('/api/v2', ''),
      this.config.apiKey
    );
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new AntidetectClient instance
 *
 * @example
 * ```typescript
 * const client = createClient({
 *   baseUrl: 'http://localhost:3000',
 *   apiKey: 'your-api-key'
 * });
 * ```
 */
export function createClient(config: ClientConfig): AntidetectClient {
  return new AntidetectClient(config);
}

// Default export
export default AntidetectClient;
