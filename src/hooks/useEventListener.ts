/**
 * 事件监听 Hook
 * 提供通用的事件监听和常用事件状态
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// ==================== 通用事件监听 ====================

/**
 * 通用事件监听 Hook
 * @param target 目标元素或 ref
 * @param eventName 事件名称
 * @param handler 事件处理函数
 * @param options 事件选项
 */
export function useEventListener<
  T extends HTMLElement | Window | Document | MediaQueryList,
  E extends Event
>(
  target: T | React.RefObject<T | null>,
  eventName: string,
  handler: (event: E) => void,
  options?: boolean | AddEventListenerOptions
): void {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const targetElement = 'current' in target ? target.current : target;
    if (!targetElement) return;

    const eventListener = (event: Event) => {
      savedHandler.current(event as E);
    };

    targetElement.addEventListener(eventName, eventListener, options);

    return () => {
      targetElement.removeEventListener(eventName, eventListener, options);
    };
  }, [target, eventName, options]);
}

// ==================== Window dimensions ====================

export interface WindowSize {
  width: number;
  height: number;
}

/**
 * Window dimensions Hook
 * @returns 窗口宽度和高度
 */
export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const handleResize = useCallback(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEventListener(window as any, 'resize', handleResize);

  return windowSize;
}

// ==================== 鼠标位置 ====================

export interface MousePosition {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
}

const initialMousePosition: MousePosition = {
  x: 0,
  y: 0,
  clientX: 0,
  clientY: 0,
  pageX: 0,
  pageY: 0,
};

/**
 * 鼠标位置 Hook
 * @returns 鼠标位置信息
 */
export function useMousePosition(): MousePosition {
  const [position, setPosition] = useState<MousePosition>(initialMousePosition);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    setPosition({
      x: event.clientX,
      y: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY,
    });
  }, []);

  useEventListener(window as any, 'mousemove', handleMouseMove);

  return position;
}

/**
 * 元素内鼠标位置 Hook
 * @param ref 元素 ref
 * @returns 相对于元素的鼠标位置
 */
export function useMousePositionInElement<T extends HTMLElement>(
  ref: React.RefObject<T | null>
): { x: number; y: number; isInside: boolean } {
  const [state, setState] = useState({ x: 0, y: 0, isInside: false });

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const isInside =
      x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

    setState({ x, y, isInside });
  }, [ref]);

  useEventListener(window as any, 'mousemove', handleMouseMove);

  return state;
}

// ==================== 滚动位置 ====================

export interface ScrollPosition {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right' | null;
  isAtTop: boolean;
  isAtBottom: boolean;
}

/**
 * 滚动位置 Hook
 * @returns 滚动位置信息
 */
export function useScrollPosition(): ScrollPosition {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    x: 0,
    y: 0,
    direction: null,
    isAtTop: true,
    isAtBottom: false,
  });

  const lastScrollY = useRef(0);
  const lastScrollX = useRef(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const currentScrollX = window.scrollX;

    const direction: ScrollPosition['direction'] =
      currentScrollY > lastScrollY.current
        ? 'down'
        : currentScrollY < lastScrollY.current
          ? 'up'
          : currentScrollX > lastScrollX.current
            ? 'right'
            : currentScrollX < lastScrollX.current
              ? 'left'
              : null;

    lastScrollY.current = currentScrollY;
    lastScrollX.current = currentScrollX;

    const isAtTop = currentScrollY === 0;
    const isAtBottom =
      window.innerHeight + currentScrollY >= document.body.scrollHeight - 1;

    setScrollPosition({
      x: currentScrollX,
      y: currentScrollY,
      direction,
      isAtTop,
      isAtBottom,
    });
  }, []);

  useEventListener(window as any, 'scroll', handleScroll, { passive: true });

  return scrollPosition;
}

/**
 * 元素滚动位置 Hook
 * @param ref 元素 ref
 * @returns 元素滚动位置信息
 */
export function useElementScrollPosition<T extends HTMLElement>(
  ref: React.RefObject<T | null>
): { scrollLeft: number; scrollTop: number; scrollHeight: number; scrollWidth: number } {
  const [scrollInfo, setScrollInfo] = useState({
    scrollLeft: 0,
    scrollTop: 0,
    scrollHeight: 0,
    scrollWidth: 0,
  });

  const handleScroll = useCallback(() => {
    if (!ref.current) return;

    setScrollInfo({
      scrollLeft: ref.current.scrollLeft,
      scrollTop: ref.current.scrollTop,
      scrollHeight: ref.current.scrollHeight,
      scrollWidth: ref.current.scrollWidth,
    });
  }, [ref]);

  useEventListener(ref, 'scroll', handleScroll, { passive: true });

  return scrollInfo;
}

// ==================== 网络状态 ====================

export interface NetworkState {
  isOnline: boolean;
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
}

/**
 * 网络状态 Hook
 * @returns 网络状态信息
 */
export function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  const handleOnline = useCallback(() => {
    setNetworkState((prev) => ({ ...prev, isOnline: true }));
  }, []);

  const handleOffline = useCallback(() => {
    setNetworkState((prev) => ({ ...prev, isOnline: false }));
  }, []);

  useEventListener(window as any, 'online', handleOnline);
  useEventListener(window as any, 'offline', handleOffline);

  // 获取网络信息 (Network Information API)
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const connection = (navigator as any).connection;
    if (!connection) return;

    const updateConnectionInfo = () => {
      setNetworkState((prev) => ({
        ...prev,
        downlink: connection.downlink,
        effectiveType: connection.effectiveType,
        saveData: connection.saveData,
      }));
    };

    updateConnectionInfo();

    connection.addEventListener('change', updateConnectionInfo);
    return () => connection.removeEventListener('change', updateConnectionInfo);
  }, []);

  return networkState;
}

// ==================== 点击外部 ====================

/**
 * 点击外部 Hook
 * @param ref 元素 ref
 * @param handler 点击外部时的回调
 */
export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      savedHandler.current(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref]);
}

export default {
  useEventListener,
  useWindowSize,
  useMousePosition,
  useMousePositionInElement,
  useScrollPosition,
  useElementScrollPosition,
  useNetworkState,
  useClickOutside,
};
