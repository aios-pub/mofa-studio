/**
 * WebSocket 服务模块入口
 * 导出所有 WebSocket 相关的类型和功能
 */

// 类型定义
export * from './types';

// 管理器
export { WebSocketManager, getWebSocketManager, initWebSocketManager } from './manager';
export type { WebSocketManagerConfig } from './manager';

// 适配器
export { NativeWebSocketAdapter } from './adapters/wss';
export { SocketIOAdapter } from './adapters/socketio';
export type { WebSocketAdapter } from './base';
export { BaseWebSocketAdapter } from './base';
