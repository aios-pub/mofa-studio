/**
 * Socket.IO adapter
 * Dynamically load the Socket.IO client
 */

import type {
  WebSocketConfig,
  WebSocketEventHandler,
  ConnectionMode,
} from '../types';
import { BaseWebSocketAdapter } from '../base';

// Socket.IO client type definitions
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

// Dynamically load Socket.IO
async function loadSocketIO(): Promise<SocketIOConstructor> {
  if (socketIO) return socketIO;

  try {
    // Try loading Socket.IO from CDN
    // @ts-ignore - dynamic import
    const module = await import('https://cdn.socket.io/4.7.2/socket.io.esm.min.js');
    socketIO = module.default || module.io;
    return socketIO!;
  } catch {
    // If CDN loading fails, try loading from the npm package
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
      // Load the Socket.IO client
      if (!this.io) {
        this.io = await loadSocketIO();
      }

      // Build URL
      let url = this.config.url;
      if (this.config.namespace) {
        url = `${url}${this.config.namespace}`;
      }

      // Create connection options
      const options: Record<string, unknown> = {
        transports: ['websocket', 'polling'],
        reconnection: false, // we handle reconnection ourselves
        auth: {},
      };

      // Add auth token
      if (this.config.authToken) {
        options.auth = { token: this.config.authToken };
      }

      // Create socket connection
      this.socket = this.io(url, options);

      // Set up event listeners
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

    // Listen to all messages
    this.socket.on('message', (data: unknown) => {
      this.emitInternal('message', data);
    });
  }

  private handleDisconnect(reason: string): void {
    this.setState('disconnected');
    this.emitInternal('disconnect', { reason, mode: this.mode });

    // If not disconnected intentionally, try to reconnect
    if (reason !== 'client namespace disconnect') {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    this.setState('error');
    this.emitInternal('error', { error, mode: this.mode });
  }
}
