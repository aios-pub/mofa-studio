/**
 * WebSocket adapter interface
 * Define the interface all WebSocket implementations must follow
 */

import type {
  WebSocketConfig,
  ConnectionState,
  WebSocketEventHandler,
  ConnectionMode,
} from './types';

/** WebSocket adapter interface */
export interface WebSocketAdapter {
  /** Get connection mode */
  readonly mode: ConnectionMode;

  /** Get the current connection state */
  readonly state: ConnectionState;

  /** Connect to the server */
  connect(): Promise<void>;

  /** Disconnect */
  disconnect(): void;

  /** Send message */
  emit<T = unknown>(event: string, data: T): void;

  /** Subscribe to events */
  on<T = unknown>(event: string, handler: WebSocketEventHandler<T>): () => void;

  /** Unsubscribe from event */
  off<T = unknown>(event: string, handler?: WebSocketEventHandler<T>): void;

  /** Subscribe once */
  once<T = unknown>(event: string, handler: WebSocketEventHandler<T>): void;

  /** Check whether connected */
  isConnected(): boolean;
}

/** WebSocket adapter base class */
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

    // Return the unsubscribe function
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
