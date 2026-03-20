/**
 * 原生 WebSocket (WSS) 适配器
 */

import type {
  WebSocketConfig,
  WebSocketEventHandler,
  ConnectionMode,
  WebSocketMessage,
} from '../types';
import { BaseWebSocketAdapter } from '../base';

export class NativeWebSocketAdapter extends BaseWebSocketAdapter {
  readonly mode: ConnectionMode = 'wss';
  private socket: WebSocket | null = null;
  private heartbeatTimer?: ReturnType<typeof setInterval>;

  constructor(config: WebSocketConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    this.setState('connecting');
    this.resetReconnectAttempts();

    return new Promise((resolve, reject) => {
      try {
        let url = this.config.url;

        // 添加认证令牌到 URL
        if (this.config.authToken) {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}token=${encodeURIComponent(this.config.authToken)}`;
        }

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          this.setState('connected');
          this.emitInternal('connect', { mode: this.mode });
          this.startHeartbeat();
          resolve();
        };

        this.socket.onclose = (event) => {
          this.handleClose(event);
        };

        this.socket.onerror = (error) => {
          this.handleError(error);
          reject(new Error('WebSocket connection failed'));
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };
      } catch (error) {
        this.setState('error');
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.setState('disconnected');
    this.emitInternal('disconnect', { mode: this.mode });
  }

  emit<T = unknown>(event: string, data: T): void {
    if (!this.isConnected() || !this.socket) {
      console.warn('WebSocket is not connected, cannot emit event:', event);
      return;
    }

    const message: WebSocketMessage<T> = {
      event,
      data,
      timestamp: Date.now(),
    };

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }

  on<T = unknown>(event: string, handler: WebSocketEventHandler<T>): () => void {
    return this.addHandler(event, handler);
  }

  off<T = unknown>(event: string, handler?: WebSocketEventHandler<T>): void {
    this.removeHandler(event, handler);
  }

  once<T = unknown>(event: string, handler: WebSocketEventHandler<T>): void {
    const onceHandler: WebSocketEventHandler<T> = (data) => {
      this.off(event, onceHandler);
      handler(data);
    };
    this.addHandler(event, onceHandler);
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat();
    this.socket = null;

    if (event.code === 1000) {
      // 正常关闭
      this.setState('disconnected');
    } else {
      // 异常关闭，尝试重连
      this.setState('disconnected');
      this.scheduleReconnect();
    }

    this.emitInternal('disconnect', {
      code: event.code,
      reason: event.reason,
      mode: this.mode,
    });
  }

  private handleError(_error: Event): void {
    this.setState('error');
    this.emitInternal('error', { mode: this.mode });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.emitInternal(message.event, message.data);
      // 同时触发通用的 message 事件
      this.emitInternal('message', message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private startHeartbeat(): void {
    if (!this.config.heartbeatInterval) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.emit('ping', { timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}
