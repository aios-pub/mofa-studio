/**
 * WebSocket service module entry
 * Export all WebSocket-related types and features
 */

// Type definitions
export * from './types';

// Manager
export { WebSocketManager, getWebSocketManager, initWebSocketManager } from './manager';
export type { WebSocketManagerConfig } from './manager';

// Adapter
export { NativeWebSocketAdapter } from './adapters/wss';
export { SocketIOAdapter } from './adapters/socketio';
export type { WebSocketAdapter } from './base';
export { BaseWebSocketAdapter } from './base';
