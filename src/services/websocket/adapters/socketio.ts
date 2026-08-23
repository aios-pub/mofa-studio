/**
 * Socket.IO 适配器
 * 动态加载 Socket.IO 客户端
 */

import type {
  WebSocketConfig,
  WebSocketEventHandler,
  ConnectionMode,
} from '../types';
import { BaseWebSocketAdapter } from '../base';

// Socket.IO 客户端类型定义
interface SocketIOClient {
  connect(): void;
  disconnect(): void;
  connected: boolean;
  emit<T = unknown>(event: string, data: T): void;
  on<T = unknown>(event: string, handler: (data: T) => void): void;
  off(event: string, handler?: (...args: unknown[]) => void): void;
  once<T = unknown>(event: string, handler: (data: T) => void): void;
}

interface SocketIOConstructor {
  (url: string, options?: Record<string, unknown>): SocketIOClient;
}

let socketIO: SocketIOConstructor | null = null;

// 动态加载 Socket.IO
async function loadSocketIO(): Promise<SocketIOConstructor> {
  if (socketIO) return socketIO;

  try {
    // 尝试从 CDN 加载 Socket.IO
    // @ts-ignore - 动态加载
    const module = await import('https://cdn.socket.io/4.7.2/socket.io.esm.min.js');
    socketIO = module.default || module.io;
    return socketIO!;
  } catch {
    // e.g.果 CDN 加载Failed，尝试从 npm 包加载
    try {
      // @ts-ignore
      const module = await import('socket.io-client');
      socketIO = module.io || module.default;
      return socketIO!;
    } catch (error) {
      throw new Error('Failed to load Socket.IO client. Please install socket.io-client or ensure CDN is accessible.');
    }
  }
}

export class SocketIOAdapter extends BaseWebSocketAdapter {
  readonly mode: ConnectionMode = 'socketio';
  private socket: SocketIOClient | null = null;
  private io: SocketIOConstructor | null = null;

  constructor(config: WebSocketConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    this.setState('connecting');
    this.resetReconnectAttempts();

    try {
      // 加载 Socket.IO 客户端
      if (!this.io) {
        this.io = await loadSocketIO();
      }

      // 构建 URL
      let url = this.config.url;
      if (this.config.namespace) {
        url = `${url}${this.config.namespace}`;
      }

      // 创建连接选项
      const options: Record<string, unknown> = {
        transports: ['websocket', 'polling'],
        reconnection: false, // 我们自己处理重连
        auth: {},
      };

      // 添加认证令牌
      if (this.config.authToken) {
        options.auth = { token: this.config.authToken };
      }

      // 创建 Socket 连接
      this.socket = this.io(url, options);

      // 设置事件监听
      this.setupEventListeners();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket.IO connection timeout'));
        }, 10000);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          this.setState('connected');
          this.emitInternal('connect', { mode: this.mode });
          resolve();
        });

        this.socket!.on('connect_error', (error: Error) => {
          clearTimeout(timeout);
          this.setState('error');
          this.emitInternal('error', { error, mode: this.mode });
          reject(error);
        });
      });
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  disconnect(): void {
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setState('disconnected');
    this.emitInternal('disconnect', { mode: this.mode });
  }

  emit<T = unknown>(event: string, data: T): void {
    if (!this.isConnected() || !this.socket) {
      console.warn('Socket.IO is not connected, cannot emit event:', event);
      return;
    }

    try {
      this.socket.emit(event, data);
    } catch (error) {
      console.error('Failed to emit Socket.IO event:', error);
    }
  }

  on<T = unknown>(event: string, handler: WebSocketEventHandler<T>): () => void {
    if (this.socket) {
      this.socket.on(event, handler as (data: T) => void);
    }
    return this.addHandler(event, handler);
  }

  off<T = unknown>(event: string, handler?: WebSocketEventHandler<T>): void {
    if (this.socket) {
      this.socket.off(event, handler as (...args: unknown[]) => void);
    }
    this.removeHandler(event, handler);
  }

  once<T = unknown>(event: string, handler: WebSocketEventHandler<T>): void {
    if (this.socket) {
      this.socket.once(event, handler);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('disconnect', (reason: string) => {
      this.handleDisconnect(reason);
    });

    this.socket.on('error', (error: Error) => {
      this.handleError(error);
    });

    // 监听所有Messages
    this.socket.on('message', (data: unknown) => {
      this.emitInternal('message', data);
    });
  }

  private handleDisconnect(reason: string): void {
    this.setState('disconnected');
    this.emitInternal('disconnect', { reason, mode: this.mode });

    // e.g.果不是主动断开，尝试重连
    if (reason !== 'client namespace disconnect') {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    this.setState('error');
    this.emitInternal('error', { error, mode: this.mode });
  }
}
