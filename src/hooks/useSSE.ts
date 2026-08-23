/**
 * useSSE Hook
 * 提供 SSE (Server-Sent Events) 连接管理
 */

import { useEffect, useState, useCallback, useRef } from 'react';

/** SSE 连接状态 */
export type SSEConnectionState = 'connecting' | 'open' | 'closed' | 'error';

/** SSE Hook configuration */
interface UseSSEOptions {
  /** 自动连接 */
  autoConnect?: boolean;
  /** 重连间隔（milliseconds） */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** Messages解析函数 */
  parseMessage?: (data: string) => unknown;
}

/** SSE Hook 返回值 */
interface UseSSEReturn {
  /** 连接状态 */
  state: SSEConnectionState;
  /** 是否已连接 */
  isConnected: boolean;
  /** 最后一条Messages */
  lastMessage: unknown | null;
  /** 连接 */
  connect: () => void;
  /** 断开连接 */
  disconnect: () => void;
  /** 重新连接 */
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

  // 获取 URL（支持函数形式）
  const getUrl = useCallback(() => (typeof url === 'function' ? url() : url), [url]);

  // 清理连接
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

  // 连接
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

        // e.g.果是手动关闭或达到最大重连次数，则不再重连
        if (isManualCloseRef.current || reconnectAttemptsRef.current >= maxReconnectAttempts) {
          cleanup();
          setState('closed');
          return;
        }

        // EventSource 会自动重连，但我们手动控制以支持配置
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

  // 断开连接
  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    cleanup();
    setState('closed');
  }, [cleanup]);

  // 重新连接
  const reconnect = useCallback(() => {
    disconnect();
    isManualCloseRef.current = false;
    connect();
  }, [disconnect, connect]);

  // 自动连接
  useEffect(() => {
    if (autoConnect && getUrl()) {
      connect();
    }

    return () => {
      isManualCloseRef.current = true;
      cleanup();
    };
  }, [autoConnect]); // 仅在 autoConnect 变化时执行

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
