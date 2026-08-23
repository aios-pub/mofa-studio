/**
 * Debounce and throttle hook
 * Provides debounce/throttle for values and callbacks
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ==================== Debounced value ====================

/**
 * Debounced value hook
 * @param value Value to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced value
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

// ==================== Throttled value ====================

/**
 * Throttled value hook
 * @param value Value to throttle
 * @param interval Interval in milliseconds
 * @returns Throttled value
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

// ==================== Debounced callback ====================

/**
 * Debounced callback hook
 * @param callback Callback to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced callback
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

  // Cleanup
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
 * Throttled callback hook
 * @param callback Callback to throttle
 * @param interval Interval in milliseconds
 * @returns Throttled callback
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
        // Ensure the last call is executed
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

// ==================== Debounce with immediate execution ====================

/**
 * Debounced callback hook with immediate execution option
 * @param callback Callback to debounce
 * @param delay Delay in milliseconds
 * @param immediate Whether to execute the first call immediately
 * @returns Debounced callback and cancel function
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

  // Cleanup
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return { run, cancel, flush };
}

export default useDebounce;
