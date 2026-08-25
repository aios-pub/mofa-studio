/**
 * WebSocket manager
 * Unified WebSocket connection management with Socket.IO/WSS switching
 */

import type {
  WebSocketConfig,
  ConnectionState,
  WebSocketEventHandler,
  ConnectionMode,
} from "./types";
import type { WebSocketAdapter } from "./base";
import { NativeWebSocketAdapter } from "./adapters/wss";

/** WebSocket manager configuration */
export interface WebSocketManagerConfig extends Partial<WebSocketConfig> {
  /** Server URL (required) */
  url: string;
  /** Default connection mode */
  defaultMode?: ConnectionMode;
}

/** Storage key */
const STORAGE_KEY = "mofa-studio-ws-mode";

/**
 * WebSocket manager
 * Provides unified WebSocket connection management with Socket.IO/WSS switching
 */
export class WebSocketManager {
  private adapter: WebSocketAdapter | null = null;
  private config: WebSocketManagerConfig;
  private _mode: ConnectionMode;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();

  constructor(config: WebSocketManagerConfig) {
    this.config = config;
    // Read mode from storage or use the configured default
    this._mode =
      this.loadMode() ?? config.defaultMode ?? config.mode ?? "native";
  }

  /**
   * Internal trigger event
   */
  private emitInternal<T = unknown>(event: string, data: T): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(
            `Error in WebSocket event handler for "${event}":`,
            error,
          );
        }
      });
    }
  }

  /** Get the current connection mode */
  get mode(): ConnectionMode {
    return this._mode;
  }

  /** Get the current connection state */
  get state(): ConnectionState {
    return this.adapter?.state ?? "disconnected";
  }

  /** Whether connected */
  isConnected(): boolean {
    return this.adapter?.isConnected() ?? false;
  }

  /**
   * Switch connection mode
   * @param mode New connection mode
   * @param reconnect Whether to reconnect automatically
   */
  async switchMode(mode: ConnectionMode, reconnect = true): Promise<void> {
    if (this._mode === mode && this.adapter) {
      return;
    }

    // Save mode to storage
    this.saveMode(mode);
    const wasConnected = this.isConnected();

    // Disconnect the current connection
    if (this.adapter) {
      this.adapter.disconnect();
      this.adapter = null;
    }

    this._mode = mode;

    // If previously connected, reconnect automatically
    if (reconnect && wasConnected) {
      await this.connect();
    }
  }

  /**
   * Connect to the server
   */
  async connect(): Promise<void> {
    if (this.adapter?.isConnected()) {
      return;
    }

    // Create adapter
    this.adapter = this.createAdapter(this._mode);

    // Forward state change events
    this.adapter.on("state_change", (data) => {
      this.emitInternal("state_change", data);
    });

    await this.adapter.connect();
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.adapter) {
      this.adapter.disconnect();
    }
  }

  /**
   * Send message
   */
  emit<T = unknown>(event: string, data: T): void {
    if (!this.adapter) {
      console.warn("WebSocket not initialized");
      return;
    }
    this.adapter.emit(event, data);
  }

  /**
   * Subscribe to events
   */
  on<T = unknown>(
    event: string,
    handler: WebSocketEventHandler<T>,
  ): () => void {
    // Add to the manager's own event handlers
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as WebSocketEventHandler);

    // Also subscribe to adapter events
    if (this.adapter) {
      this.adapter.on(event, handler);
    }

    // Return the unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe
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
   * One-time subscription
   */
  once<T = unknown>(event: string, handler: WebSocketEventHandler<T>): void {
    this.adapter?.once(event, handler);
  }

  /**
   * Create adapter for the given mode
   */
  private createAdapter(mode: ConnectionMode): WebSocketAdapter {
    const adapterConfig: WebSocketConfig = {
      ...this.config,
      mode,
    };

    switch (mode) {
      case "native":
      default:
        return new NativeWebSocketAdapter(adapterConfig);
    }
  }

  /**
   * Load mode from storage
   */
  private loadMode(): ConnectionMode | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "native" || saved === "wss") {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return null;
  }

  /**
   * Save mode to storage
   */
  private saveMode(mode: ConnectionMode): void {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors
    }
  }
}

// Create global WebSocket manager instance
let globalManager: WebSocketManager | null = null;

/**
 * Get the global WebSocket manager instance
 */
export function getWebSocketManager(
  config?: WebSocketManagerConfig,
): WebSocketManager {
  if (!globalManager && config) {
    globalManager = new WebSocketManager(config);
  }
  if (!globalManager) {
    throw new Error(
      "WebSocketManager not initialized. Call getWebSocketManager with config first.",
    );
  }
  return globalManager;
}

/**
 * Initialize global WebSocket manager
 */
export function initWebSocketManager(
  config: WebSocketManagerConfig,
): WebSocketManager {
  globalManager = new WebSocketManager(config);
  return globalManager;
}
