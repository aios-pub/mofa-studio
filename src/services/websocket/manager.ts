/**
 * WebSocket 管理器
 * 统一管理 WebSocket 连接，支持 Socket.IO 和 WSS 模式切换
 */

import type {
  WebSocketConfig,
  ConnectionState,
  WebSocketEventHandler,
  ConnectionMode,
} from './types';
import type { WebSocketAdapter } from './base';
import { NativeWebSocketAdapter } from './adapters/wss';
import { SocketIOAdapter } from './adapters/socketio';

/** WebSocket 管理器配置 */
export interface WebSocketManagerConfig extends Partial<WebSocketConfig> {
  /** 服务器 URL (必须) */
  url: string;
  /** 默认连接模式 */
  defaultMode?: ConnectionMode;
}

/** 存储键 */
const STORAGE_KEY = 'amos-claw-ws-mode';

/**
 * WebSocket 管理器
 * 提供统一的 WebSocket 连接管理，支持 Socket.IO 和 WSS 模式切换
 */
export class WebSocketManager {
  private adapter: WebSocketAdapter | null = null;
  private config: WebSocketManagerConfig;
  private _mode: ConnectionMode;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();

  constructor(config: WebSocketManagerConfig) {
    this.config = config;
    // 从存储中读取模式，或使用配置的默认模式
    this._mode = this.loadMode() ?? config.defaultMode ?? config.mode ?? 'socketio';
  }

  /**
   * 内部触发事件
   */
  private emitInternal<T = unknown>(event: string, data: T): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for "${event}":`, error);
        }
      });
    }
  }

  /** 获取当前连接模式 */
  get mode(): ConnectionMode {
    return this._mode;
  }

  /** 获取当前连接状态 */
  get state(): ConnectionState {
    return this.adapter?.state ?? 'disconnected';
  }

  /** 是否已连接 */
  isConnected(): boolean {
    return this.adapter?.isConnected() ?? false;
  }

  /**
   * 切换连接模式
   * @param mode 新的连接模式
   * @param reconnect 是否自动重连
   */
  async switchMode(mode: ConnectionMode, reconnect = true): Promise<void> {
    if (this._mode === mode && this.adapter) {
      return;
    }

    // 保存模式到存储
    this.saveMode(mode);
    const wasConnected = this.isConnected();

    // 断开当前连接
    if (this.adapter) {
      this.adapter.disconnect();
      this.adapter = null;
    }

    this._mode = mode;

    // 如果之前是连接状态，自动重连
    if (reconnect && wasConnected) {
      await this.connect();
    }
  }

  /**
   * 连接到服务器
   */
  async connect(): Promise<void> {
    if (this.adapter?.isConnected()) {
      return;
    }

    // 创建适配器
    this.adapter = this.createAdapter(this._mode);

    // 转发状态变化事件
    this.adapter.on('state_change', (data) => {
      this.emitInternal('state_change', data);
    });

    await this.adapter.connect();
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.adapter) {
      this.adapter.disconnect();
    }
  }

  /**
   * 发送消息
   */
  emit<T = unknown>(event: string, data: T): void {
    if (!this.adapter) {
      console.warn('WebSocket not initialized');
      return;
    }
    this.adapter.emit(event, data);
  }

  /**
   * 订阅事件
   */
  on<T = unknown>(event: string, handler: WebSocketEventHandler<T>): () => void {
    // 添加到管理器自己的事件处理器
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as WebSocketEventHandler);

    // 同时订阅适配器事件
    if (this.adapter) {
      this.adapter.on(event, handler);
    }

    // 返回取消订阅函数
    return () => this.off(event, handler);
  }

  /**
   * 取消订阅
   */
  off<T = unknown>(event: string, handler?: WebSocketEventHandler<T>): void {
    if (handler) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler as WebSocketEventHandler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
        }
      }
    } else {
      this.eventHandlers.delete(event);
    }
    this.adapter?.off(event, handler);
  }

  /**
   * 一次性订阅
   */
  once<T = unknown>(event: string, handler: WebSocketEventHandler<T>): void {
    this.adapter?.once(event, handler);
  }

  /**
   * 创建指定模式的适配器
   */
  private createAdapter(mode: ConnectionMode): WebSocketAdapter {
    const adapterConfig: WebSocketConfig = {
      ...this.config,
      mode,
    };

    switch (mode) {
      case 'wss':
        return new NativeWebSocketAdapter(adapterConfig);
      case 'socketio':
      default:
        return new SocketIOAdapter(adapterConfig);
    }
  }

  /**
   * 从存储加载模式
   */
  private loadMode(): ConnectionMode | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'socketio' || saved === 'wss') {
        return saved;
      }
    } catch {
      // 忽略存储错误
    }
    return null;
  }

  /**
   * 保存模式到存储
   */
  private saveMode(mode: ConnectionMode): void {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // 忽略存储错误
    }
  }
}

// 创建全局 WebSocket 管理器实例
let globalManager: WebSocketManager | null = null;

/**
 * 获取全局 WebSocket 管理器实例
 */
export function getWebSocketManager(config?: WebSocketManagerConfig): WebSocketManager {
  if (!globalManager && config) {
    globalManager = new WebSocketManager(config);
  }
  if (!globalManager) {
    throw new Error('WebSocketManager not initialized. Call getWebSocketManager with config first.');
  }
  return globalManager;
}

/**
 * 初始化全局 WebSocket 管理器
 */
export function initWebSocketManager(config: WebSocketManagerConfig): WebSocketManager {
  globalManager = new WebSocketManager(config);
  return globalManager;
}
