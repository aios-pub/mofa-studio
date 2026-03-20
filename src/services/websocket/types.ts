/**
 * WebSocket 连接类型定义
 */

/** 连接模式 */
export type ConnectionMode = 'socketio' | 'wss';

/** 连接状态 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/** WebSocket 事件类型 */
export type WebSocketEventType =
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'message'
  | 'reconnect'
  | 'reconnect_attempt';

/** WebSocket 事件处理器 */
export type WebSocketEventHandler<T = unknown> = (data: T) => void;

/** WebSocket 配置 */
export interface WebSocketConfig {
  /** 连接模式 */
  mode: ConnectionMode;
  /** 服务器 URL */
  url: string;
  /** 命名空间 (仅 Socket.IO) */
  namespace?: string;
  /** 认证令牌 */
  authToken?: string;
  /** 自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔 (ms) */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 心跳间隔 (ms) */
  heartbeatInterval?: number;
}

/** WebSocket 消息 */
export interface WebSocketMessage<T = unknown> {
  /** 事件名 */
  event: string;
  /** 消息数据 */
  data: T;
  /** 时间戳 */
  timestamp: number;
}

/** WebSocket 连接器接口 */
export interface WebSocketConnector {
  /** 连接 */
  connect(): Promise<void>;
  /** 断开连接 */
  disconnect(): void;
  /** 发送消息 */
  emit<T = unknown>(event: string, data: T): void;
  /** 订阅事件 */
  on<T = unknown>(event: string, handler: WebSocketEventHandler<T>): () => void;
  /** 取消订阅 */
  off(event: string, handler?: WebSocketEventHandler): void;
  /** 获取连接状态 */
  getState(): ConnectionState;
  /** 获取连接模式 */
  getMode(): ConnectionMode;
}

/** 连接状态变化事件 */
export interface ConnectionStateChangedEvent {
  state: ConnectionState;
  previousState?: ConnectionState;
  error?: Error;
}

/** 监控事件类型 */
export interface MonitoringEvent {
  type: 'agent_status' | 'activity' | 'metrics' | 'alert';
  payload: unknown;
  timestamp: string;
}

/** 聊天事件类型 */
export interface ChatEvent {
  type: 'message' | 'typing' | 'read' | 'error';
  conversationId: string;
  payload: unknown;
  timestamp: string;
}
