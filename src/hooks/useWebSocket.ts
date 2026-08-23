/**
 * useWebSocket Hook
 * 提供统一的 WebSocket 连接管理
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  WebSocketManager,
  initWebSocketManager,
} from '@/services/websocket';
import type {
  ConnectionState,
  ConnectionMode,
  WebSocketEventHandler,
} from '@/services/websocket';

// Re-export types
export type { ConnectionState, ConnectionMode, WebSocketEventHandler };
import { GLOBAL_CONFIG } from '@/config/global-config';

/** WebSocket Hook configuration */
interface UseWebSocketOptions {
  /** 认证令牌 */
  authToken?: string;
  /** 自动连接 */
  autoConnect?: boolean;
  /** 命名空间 (仅 Socket.IO) */
  namespace?: string;
  /** 连接模式 */
  mode?: ConnectionMode;
}

/** WebSocket Hook 返回值 */
interface UseWebSocketReturn {
  /** 连接状态 */
  state: ConnectionState;
  /** 当前连接模式 */
  mode: ConnectionMode;
  /** 是否已连接 */
  isConnected: boolean;
  /** 连接 */
  connect: () => Promise<void>;
  /** 断开连接 */
  disconnect: () => void;
  /** Send message */
  emit: <T = unknown>(event: string, data: T) => void;
  /** 订阅事件 */
  on: <T = unknown>(event: string, handler: WebSocketEventHandler<T>) => () => void;
  /** 切换连接模式 */
  switchMode: (mode: ConnectionMode) => Promise<void>;
}

// 全局 WebSocket 管理器
let wsManager: WebSocketManager | null = null;

/**
 * 初始化 WebSocket 管理器
 */
function getManager(authToken?: string): WebSocketManager {
  if (!wsManager) {
    wsManager = initWebSocketManager({
      url: GLOBAL_CONFIG.wsURL,
      authToken,
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
    });
  }
  return wsManager;
}

/**
 * WebSocket Hook
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { authToken, autoConnect = true, mode: initialMode } = options;

  const [state, setState] = useState<ConnectionState>('disconnected');
  const [mode, setMode] = useState<ConnectionMode>(initialMode ?? 'socketio');
  const managerRef = useRef<WebSocketManager | null>(null);

  // 初始化管理器
  useEffect(() => {
    managerRef.current = getManager(authToken);
    setMode(managerRef.current.mode);

    // 监听状态变化
    const unsubscribe = managerRef.current.on('state_change', (data: { newState: ConnectionState }) => {
      setState(data.newState);
    });

    // 设置初始状态
    setState(managerRef.current.state);

    return () => {
      unsubscribe();
    };
  }, [authToken]);

  // 自动连接
  useEffect(() => {
    if (autoConnect && managerRef.current && !managerRef.current.isConnected()) {
      managerRef.current.connect().catch(console.error);
    }
  }, [autoConnect]);

  // 连接
  const connect = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.connect();
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(() => {
    managerRef.current?.disconnect();
  }, []);

  // Send message
  const emit = useCallback(<T = unknown,>(event: string, data: T) => {
    managerRef.current?.emit(event, data);
  }, []);

  // 订阅事件
  const on = useCallback(<T = unknown,>(event: string, handler: WebSocketEventHandler<T>) => {
    if (!managerRef.current) return () => {};
    return managerRef.current.on(event, handler);
  }, []);

  // 切换模式
  const switchMode = useCallback(async (newMode: ConnectionMode) => {
    if (managerRef.current) {
      await managerRef.current.switchMode(newMode);
      setMode(newMode);
    }
  }, []);

  return {
    state,
    mode,
    isConnected: state === 'connected',
    connect,
    disconnect,
    emit,
    on,
    switchMode,
  };
}

/**
 * WebSocket 事件订阅 Hook
 * 用于订阅特定事件
 */
export function useWebSocketEvent<T = unknown>(
  event: string,
  handler: WebSocketEventHandler<T>,
  deps: React.DependencyList = [],
): void {
  useEffect(() => {
    const manager = getManager();
    const unsubscribe = manager.on(event, handler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

/**
 * WebSocket 连接状态 Hook
 * 仅获取连接状态
 */
export function useWebSocketState(): ConnectionState {
  const [state, setState] = useState<ConnectionState>('disconnected');

  useEffect(() => {
    const manager = getManager();
    setState(manager.state);

    const unsubscribe = manager.on('state_change', (data: { newState: ConnectionState }) => {
      setState(data.newState);
    });

    return unsubscribe;
  }, []);

  return state;
}

export default useWebSocket;
