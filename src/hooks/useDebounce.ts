/**
 * 防抖和节流 Hook
 * 提供值和回调的防抖/节流功能
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ==================== 防抖值 ====================

/**
 * 防抖值 Hook
 * @param value 需要防抖的值
 * @param delay 延迟时间（milliseconds）
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ==================== 节流值 ====================

/**
 * 节流值 Hook
 * @param value 需要节流的值
 * @param interval 间隔时间（milliseconds）
 * @returns 节流后的值
 */
export function useThrottle<T>(value: T, interval: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [value, interval]);

  return throttledValue;
}

// ==================== 防抖回调 ====================

/**
 * 防抖回调 Hook
 * @param callback 需要防抖的回调函数
 * @param delay 延迟时间（milliseconds）
 * @returns 防抖后的回调函数
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  // 清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * 节流回调 Hook
 * @param callback 需要节流的回调函数
 * @param interval 间隔时间（milliseconds）
 * @returns 节流后的回调函数
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number = 300
): (...args: Parameters<T>) => void {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= interval) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        // 确保最后一次调用会被执行
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, interval - timeSinceLastCall);
      }
    },
    [callback, interval]
  );

  // 清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

// ==================== 带立即执行的防抖 ====================

/**
 * 带立即执行选项的防抖回调 Hook
 * @param callback 需要防抖的回调函数
 * @param delay 延迟时间（milliseconds）
 * @param immediate 是否立即执行第一次调用
 * @returns 防抖后的回调函数和取消函数
 */
export function useDebouncedCallbackWithImmediate<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  immediate: boolean = false
): {
  run: (...args: Parameters<T>) => void;
  cancel: () => void;
  flush: () => void;
} {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const argsRef = useRef<Parameters<T> | undefined>(undefined);
  const immediateRef = useRef(immediate);

  const run = useCallback(
    (...args: Parameters<T>) => {
      argsRef.current = args;

      if (immediateRef.current) {
        immediateRef.current = false;
        callback(...args);
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    cancel();
    if (argsRef.current) {
      callback(...argsRef.current);
    }
  }, [callback, cancel]);

  // 清理
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return { run, cancel, flush };
}

export default useDebounce;
