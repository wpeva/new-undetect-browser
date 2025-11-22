/**
 * Cloud API Module - Main entry point
 *
 * Exports all API components for easy integration
 */

export { CloudAPIServer } from './server';
export type { ServerConfig } from './server';
export type {
  SessionManager,
  Session,
  SessionConfig,
  BrowserProfile,
  ExecuteScriptOptions,
  ExecuteScriptResult,
} from './session-manager';
export type {
  WebSocketServer,
  WebSocketConfig,
  ClientMessage,
  ServerMessage,
  CDPMessage,
  CDPResponse,
} from './websocket';

// Re-export default server
import { CloudAPIServer } from './server';
export default CloudAPIServer;
