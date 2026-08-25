/**
 * useWebSocket Hook
 * Provides unified WebSocket connection management
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
  /** Auth token */
  authToken?: string;
  /** Auto-connect */
  autoConnect?: boolean;
  /** Namespace (Socket.IO only) */
  namespace?: string;
  /** Connection mode */
  mode?: ConnectionMode;
}

/** WebSocket hook return value */
interface UseWebSocketReturn {
  /** Connection state */
  state: ConnectionState;
  /** Current connection mode */
  mode: ConnectionMode;
  /** Whether connected */
  isConnected: boolean;
  /** Connection */
  connect: () => Promise<void>;
  /** Disconnect */
  disconnect: () => void;
  /** Send message */
  emit: <T = unknown>(event: string, data: T) => void;
  /** Subscribe to events */
  on: <T = unknown>(event: string, handler: WebSocketEventHandler<T>) => () => void;
  /** Switch connection mode */
  switchMode: (mode: ConnectionMode) => Promise<void>;
}

// Global WebSocket manager
let wsManager: WebSocketManager | null = null;

/**
 * Initialize WebSocket manager
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
  const [mode, setMode] = useState<ConnectionMode>(initialMode ?? 'native');
  const managerRef = useRef<WebSocketManager | null>(null);

  // Initialize manager
  useEffect(() => {
    managerRef.current = getManager(authToken);
    setMode(managerRef.current.mode);

    // Watch state changes
    const unsubscribe = managerRef.current.on('state_change', (data: { newState: ConnectionState }) => {
      setState(data.newState);
    });

    // Set initial state
    setState(managerRef.current.state);

    return () => {
      unsubscribe();
    };
  }, [authToken]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && managerRef.current && !managerRef.current.isConnected()) {
      managerRef.current.connect().catch(console.error);
    }
  }, [autoConnect]);

  // Connection
  const connect = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.connect();
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    managerRef.current?.disconnect();
  }, []);

  // Send message
  const emit = useCallback(<T = unknown,>(event: string, data: T) => {
    managerRef.current?.emit(event, data);
  }, []);

  // Subscribe to events
  const on = useCallback(<T = unknown,>(event: string, handler: WebSocketEventHandler<T>) => {
    if (!managerRef.current) return () => {};
    return managerRef.current.on(event, handler);
  }, []);

  // Switch mode
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
 * WebSocket event subscription hook
 * For subscribing to specific events
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
 * WebSocket connection state hook
 * Get connection state only
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
