/**
 * useSSE Hook
 * Provides SSE (Server-Sent Events) connection management
 */

import { useEffect, useState, useCallback, useRef } from 'react';

/** SSE connection state */
export type SSEConnectionState = 'connecting' | 'open' | 'closed' | 'error';

/** SSE Hook configuration */
interface UseSSEOptions {
  /** Auto-connect */
  autoConnect?: boolean;
  /** Reconnect interval (milliseconds) */
  reconnectInterval?: number;
  /** Maximum retry count */
  maxReconnectAttempts?: number;
  /** Message parser */
  parseMessage?: (data: string) => unknown;
}

/** SSE hook return value */
interface UseSSEReturn {
  /** Connection state */
  state: SSEConnectionState;
  /** Whether connected */
  isConnected: boolean;
  /** Last message */
  lastMessage: unknown | null;
  /** Connection */
  connect: () => void;
  /** Disconnect */
  disconnect: () => void;
  /** Reconnect */
  reconnect: () => void;
  /** Error information */
  error: Event | null;
}

/**
 * SSE Hook
 */
export function useSSE(
  url: string | (() => string),
  options: UseSSEOptions = {}
): UseSSEReturn {
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    parseMessage = JSON.parse,
  } = options;

  const [state, setState] = useState<SSEConnectionState>('closed');
  const [lastMessage, setLastMessage] = useState<unknown | null>(null);
  const [error, setError] = useState<Event | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualCloseRef = useRef(false);

  // Get the URL (function form supported)
  const getUrl = useCallback(() => (typeof url === 'function' ? url() : url), [url]);

  // Clean up connections
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Connection
  const connect = useCallback(() => {
    cleanup();

    isManualCloseRef.current = false;
    setState('connecting');
    setError(null);
    reconnectAttemptsRef.current = 0;

    try {
      const es = new EventSource(getUrl());
      eventSourceRef.current = es;

      es.onopen = () => {
        setState('open');
        reconnectAttemptsRef.current = 0;
      };

      es.onmessage = (event) => {
        try {
          const parsed = parseMessage(event.data);
          setLastMessage(parsed);
        } catch {
          setLastMessage(event.data);
        }
      };

      es.onerror = (err) => {
        setError(err);
        setState('error');

        // If closed manually or max retries reached, stop reconnecting
        if (isManualCloseRef.current || reconnectAttemptsRef.current >= maxReconnectAttempts) {
          cleanup();
          setState('closed');
          return;
        }

        // EventSource reconnects automatically, but we control it manually to support configuration
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isManualCloseRef.current) {
            connect();
          }
        }, reconnectInterval);
      };
    } catch (err) {
      setError(err as Event);
      setState('error');
    }
  }, [cleanup, getUrl, parseMessage, maxReconnectAttempts, reconnectInterval]);

  // Disconnect
  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    cleanup();
    setState('closed');
  }, [cleanup]);

  // Reconnect
  const reconnect = useCallback(() => {
    disconnect();
    isManualCloseRef.current = false;
    connect();
  }, [disconnect, connect]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && getUrl()) {
      connect();
    }

    return () => {
      isManualCloseRef.current = true;
      cleanup();
    };
  }, [autoConnect]); // only re-run when autoConnect changes

  return {
    state,
    isConnected: state === 'open',
    lastMessage,
    connect,
    disconnect,
    reconnect,
    error,
  };
}

export default useSSE;
