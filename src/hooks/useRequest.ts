/**
 * Data request hook
 * Provides unified data request state management
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ==================== Type definitions ====================

export interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface UseRequestOptions<T> {
  /** Whether to execute immediately */
  immediate?: boolean;
  /** Initial data */
  initialData?: T;
  /** Success callback */
  onSuccess?: (data: T) => void;
  /** Failure callback */
  onError?: (error: Error) => void;
  /** Completion callback */
  onFinally?: () => void;
  /** Retry count */
  retryCount?: number;
  /** Retry delay */
  retryDelay?: number;
  /** Debounce delay */
  debounceWait?: number;
  /** Conditional execution; skipped when it returns false */
  ready?: () => boolean;
  /** Dependency array; re-runs on change */
  deps?: unknown[];
  /** Convert response data */
  transform?: (data: unknown) => T;
}

export interface UseRequestReturn<T, TArgs extends unknown[] = unknown[]> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  run: (...args: TArgs) => Promise<T | null>;
  runAsync: (...args: TArgs) => Promise<T>;
  refresh: () => Promise<T | null>;
  refreshAsync: () => Promise<T>;
  cancel: () => void;
  mutate: (data: T | ((prev: T | null) => T)) => void;
  reset: () => void;
}

// ==================== useRequest Hook ====================

export function useRequest<T, TArgs extends unknown[] = unknown[]>(
  service: (...args: TArgs) => Promise<T>,
  options: UseRequestOptions<T> = {}
): UseRequestReturn<T, TArgs> {
  const {
    immediate = true,
    initialData = null,
    onSuccess,
    onError,
    onFinally,
    retryCount = 0,
    retryDelay = 1000,
    debounceWait = 0,
    ready,
    deps = [],
    transform,
  } = options;

  const [state, setState] = useState<RequestState<T>>({
    data: initialData as T | null,
    loading: false,
    error: null,
  });

  const cancelRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef(0);
  const argsRef = useRef<TArgs | null>(null);

  // Cancel request
  const cancel = useCallback(() => {
    cancelRef.current = true;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setState((prev) => ({ ...prev, loading: false }));
  }, []);

  // Update data
  const mutate = useCallback((data: T | ((prev: T | null) => T)) => {
    setState((prev) => ({
      ...prev,
      data: typeof data === 'function' ? (data as (prev: T | null) => T)(prev.data) : data,
    }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    cancel();
    setState({
      data: initialData as T | null,
      loading: false,
      error: null,
    });
    retryRef.current = 0;
    argsRef.current = null;
  }, [initialData, cancel]);

  // Execute request
  const runAsync = useCallback(
    async (...args: TArgs): Promise<T> => {
      // Check whether ready
      if (ready && !ready()) {
        return Promise.reject(new Error('Not ready'));
      }

      cancelRef.current = false;
      argsRef.current = args;
      setState((prev) => ({ ...prev, loading: true, error: null }));

      let attempts = 0;
      const maxAttempts = retryCount + 1;

      const executeRequest = async (): Promise<T> => {
        try {
          let result: T = await service(...args);

          // Convert data
          if (transform) {
            result = transform(result) as T;
          }

          // Check whether cancelled
          if (cancelRef.current) {
            throw new Error('Request cancelled');
          }

          setState({ data: result, loading: false, error: null });
          onSuccess?.(result);
          onFinally?.();

          return result;
        } catch (error) {
          // Check whether cancelled
          if (cancelRef.current) {
            throw new Error('Request cancelled');
          }

          // Retry logic
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            return executeRequest();
          }

          const err = error instanceof Error ? error : new Error(String(error));
          setState((prev) => ({ ...prev, loading: false, error: err }));
          onError?.(err);
          onFinally?.();

          throw err;
        }
      };

      return executeRequest();
    },
    [service, ready, transform, retryCount, retryDelay, onSuccess, onError, onFinally]
  );

  // Execute synchronously (without throwing)
  const run = useCallback(
    async (...args: TArgs): Promise<T | null> => {
      try {
        return await runAsync(...args);
      } catch {
        return null;
      }
    },
    [runAsync]
  );

  // Refresh (with previous parameters)
  const refreshAsync = useCallback(async (): Promise<T> => {
    if (argsRef.current) {
      return runAsync(...argsRef.current);
    }
    return runAsync(...([] as unknown as TArgs));
  }, [runAsync]);

  const refresh = useCallback(async (): Promise<T | null> => {
    try {
      return await refreshAsync();
    } catch {
      return null;
    }
  }, [refreshAsync]);

  // Execute immediately
  useEffect(() => {
    if (immediate) {
      if (debounceWait > 0) {
        debounceTimerRef.current = setTimeout(() => {
          run(...([] as unknown as TArgs));
        }, debounceWait);
        return () => {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
        };
      } else {
        run(...([] as unknown as TArgs));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, debounceWait, ...deps]);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    run,
    runAsync,
    refresh,
    refreshAsync,
    cancel,
    mutate,
    reset,
  };
}

// ==================== useQuery Hook ====================

export interface UseQueryOptions<T> extends Omit<UseRequestOptions<T>, 'immediate'> {
  /** Cache key */
  cacheKey?: string;
  /** Cache duration (milliseconds) */
  cacheTime?: number;
  /** Refetch when the window regains focus */
  refetchOnWindowFocus?: boolean;
  /** Refetch when dependencies change */
  refetchDeps?: unknown[];
}

const queryCache = new Map<string, { data: unknown; timestamp: number }>();

export function useQuery<T>(
  service: () => Promise<T>,
  options: UseQueryOptions<T> = {}
): UseRequestReturn<T, []> {
  const {
    cacheKey,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus = false,
    refetchDeps = [],
    ...restOptions
  } = options;

  const request = useRequest<T, []>(service, {
    immediate: true,
    ...restOptions,
    deps: refetchDeps,
  });

  // Read from cache
  useEffect(() => {
    if (cacheKey && queryCache.has(cacheKey)) {
      const cached = queryCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cacheTime) {
        request.mutate(cached.data as T);
      }
    }
  }, [cacheKey, cacheTime, request]);

  // Write to cache
  useEffect(() => {
    if (cacheKey && request.data !== null) {
      queryCache.set(cacheKey, {
        data: request.data,
        timestamp: Date.now(),
      });
    }
  }, [cacheKey, request.data]);

  // Refetch when the window regains focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      request.refresh();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, request]);

  return request;
}

// ==================== useMutation Hook ====================

export interface UseMutationOptions<T> extends Omit<UseRequestOptions<T>, 'immediate' | 'deps'> {}

export function useMutation<T, TArgs extends unknown[] = unknown[]>(
  service: (...args: TArgs) => Promise<T>,
  options: UseMutationOptions<T> = {}
): UseRequestReturn<T, TArgs> {
  return useRequest(service, {
    ...options,
    immediate: false,
  });
}

export default useRequest;
