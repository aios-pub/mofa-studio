/**
 * WebSocket 适配器接口
 * 定义所有 WebSocket 实现必须遵循的接口
 */

import type {
  WebSocketConfig,
  ConnectionState,
  WebSocketEventHandler,
  ConnectionMode,
} from './types';

/** WebSocket 适配器接口 */
export interface WebSocketAdapter {
  /** 获取连接模式 */
  readonly mode: ConnectionMode;

  /** 获取当前连接状态 */
  readonly state: ConnectionState;

  /** 连接到服务器 */
  connect(): Promise<void>;

  /** 断开连接 */
  disconnect(): void;

  /** Send message */
  emit<T = unknown>(event: string, data: T): void;

  /** 订阅事件 */
  on<T = unknown>(event: string, handler: WebSocketEventHandler<T>): () => void;

  /** 取消订阅事件 */
  off<T = unknown>(event: string, handler?: WebSocketEventHandler<T>): void;

  /** 一次性订阅事件 */
  once<T = unknown>(event: string, handler: WebSocketEventHandler<T>): void;

  /** 检查是否已连接 */
  isConnected(): boolean;
}

/** WebSocket 适配器基类 */
export abstract class BaseWebSocketAdapter implements WebSocketAdapter {
  abstract readonly mode: ConnectionMode;
  protected _state: ConnectionState = 'disconnected';
  protected config: WebSocketConfig;
  protected eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  protected reconnectAttempts = 0;
  protected reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  get state(): ConnectionState {
    return this._state;
  }

  protected setState(newState: ConnectionState): void {
    const oldState = this._state;
    this._state = newState;
    this.emitInternal('state_change', { oldState, newState });
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract emit<T = unknown>(event: string, data: T): void;
  abstract on<T = unknown>(event: string, handler: WebSocketEventHandler<T>): () => void;
  abstract off<T = unknown>(event: string, handler?: WebSocketEventHandler<T>): void;
  abstract once<T = unknown>(event: string, handler: WebSocketEventHandler<T>): void;
  abstract isConnected(): boolean;

  protected emitInternal<T = unknown>(event: string, data: T): void {
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

  protected addHandler<T = unknown>(event: string, handler: WebSocketEventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as WebSocketEventHandler);

    // 返回取消订阅函数
    return () => this.off(event, handler);
  }

  protected removeHandler<T = unknown>(event: string, handler?: WebSocketEventHandler<T>): void {
    if (!handler) {
      this.eventHandlers.delete(event);
    } else {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler as WebSocketEventHandler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
        }
      }
    }
  }

  protected scheduleReconnect(): void {
    if (!this.config.autoReconnect) return;

    const maxAttempts = this.config.maxReconnectAttempts ?? 5;
    if (this.reconnectAttempts >= maxAttempts) {
      console.warn(`Max reconnect attempts (${maxAttempts}) reached`);
      this.setState('error');
      return;
    }

    this.reconnectAttempts++;
    const interval = this.config.reconnectInterval ?? 3000;

    this.emitInternal('reconnect_attempt', {
      attempt: this.reconnectAttempts,
      maxAttempts,
      interval,
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnect failed:', error);
      });
    }, interval);
  }

  protected clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  protected resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    this.clearReconnectTimer();
  }
}
