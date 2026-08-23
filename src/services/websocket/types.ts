/**
 * WebSocket connection type definitions
 */

/** Connection mode */
export type ConnectionMode = 'socketio' | 'wss';

/** Connection state */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/** WebSocket event types */
export type WebSocketEventType =
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'message'
  | 'reconnect'
  | 'reconnect_attempt';

/** WebSocket event handlers */
export type WebSocketEventHandler<T = unknown> = (data: T) => void;

/** WebSocket configuration */
export interface WebSocketConfig {
  /** Connection mode */
  mode: ConnectionMode;
  /** Server URL */
  url: string;
  /** Namespace (Socket.IO only) */
  namespace?: string;
  /** Auth token */
  authToken?: string;
  /** Auto-reconnect */
  autoReconnect?: boolean;
  /** Reconnect interval (ms) */
  reconnectInterval?: number;
  /** Maximum retry count */
  maxReconnectAttempts?: number;
  /** Heartbeat interval (ms) */
  heartbeatInterval?: number;
}

/** WebSocket Messages */
export interface WebSocketMessage<T = unknown> {
  /** Event name */
  event: string;
  /** Message data */
  data: T;
  /** Timestamp */
  timestamp: number;
}

/** WebSocket connector interface */
export interface WebSocketConnector {
  /** Connection */
  connect(): Promise<void>;
  /** Disconnect */
  disconnect(): void;
  /** Send message */
  emit<T = unknown>(event: string, data: T): void;
  /** Subscribe to events */
  on<T = unknown>(event: string, handler: WebSocketEventHandler<T>): () => void;
  /** Unsubscribe */
  off(event: string, handler?: WebSocketEventHandler): void;
  /** Get connection state */
  getState(): ConnectionState;
  /** Get connection mode */
  getMode(): ConnectionMode;
}

/** Connection state change event */
export interface ConnectionStateChangedEvent {
  state: ConnectionState;
  previousState?: ConnectionState;
  error?: Error;
}

/** Monitoring event types */
export interface MonitoringEvent {
  type: 'agent_status' | 'activity' | 'metrics' | 'alert';
  payload: unknown;
  timestamp: string;
}

/** Chat event types */
export interface ChatEvent {
  type: 'message' | 'typing' | 'read' | 'error';
  conversationId: string;
  payload: unknown;
  timestamp: string;
}
