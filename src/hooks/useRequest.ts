/**
 * 数据请求 Hook
 * 提供统一的数据请求状态管理
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ==================== 类型定义 ====================

export interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface UseRequestOptions<T> {
  /** 是否立即执行 */
  immediate?: boolean;
  /** 初始数据 */
  initialData?: T;
  /** 成功回调 */
  onSuccess?: (data: T) => void;
  /** 失败回调 */
  onError?: (error: Error) => void;
  /** 完成回调 */
  onFinally?: () => void;
  /** 重试次数 */
  retryCount?: number;
  /** 重试延迟 */
  retryDelay?: number;
  /** 防抖延迟 */
  debounceWait?: number;
  /** 条件执行，返回 false 时不执行 */
  ready?: () => boolean;
  /** 依赖数组，变化时重新执行 */
  deps?: unknown[];
  /** 转换响应数据 */
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

  // 取消请求
  const cancel = useCallback(() => {
    cancelRef.current = true;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setState((prev) => ({ ...prev, loading: false }));
  }, []);

  // 更新数据
  const mutate = useCallback((data: T | ((prev: T | null) => T)) => {
    setState((prev) => ({
      ...prev,
      data: typeof data === 'function' ? (data as (prev: T | null) => T)(prev.data) : data,
    }));
  }, []);

  // 重置状态
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

  // 执行请求
  const runAsync = useCallback(
    async (...args: TArgs): Promise<T> => {
      // 检查是否准备好
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

          // 转换数据
          if (transform) {
            result = transform(result) as T;
          }

          // 检查是否已取消
          if (cancelRef.current) {
            throw new Error('Request cancelled');
          }

          setState({ data: result, loading: false, error: null });
          onSuccess?.(result);
          onFinally?.();

          return result;
        } catch (error) {
          // 检查是否已取消
          if (cancelRef.current) {
            throw new Error('Request cancelled');
          }

          // 重试逻辑
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

  // 同步执行（不抛出错误）
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

  // 刷新（使用上次的参数）
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

  // 立即执行
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

  // 组件卸载时取消
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
  /** 缓存 key */
  cacheKey?: string;
  /** 缓存时间（毫秒） */
  cacheTime?: number;
  /** 窗口聚焦时重新请求 */
  refetchOnWindowFocus?: boolean;
  /** 依赖变化时重新请求 */
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

  // 从缓存读取
  useEffect(() => {
    if (cacheKey && queryCache.has(cacheKey)) {
      const cached = queryCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cacheTime) {
        request.mutate(cached.data as T);
      }
    }
  }, [cacheKey, cacheTime, request]);

  // 写入缓存
  useEffect(() => {
    if (cacheKey && request.data !== null) {
      queryCache.set(cacheKey, {
        data: request.data,
        timestamp: Date.now(),
      });
    }
  }, [cacheKey, request.data]);

  // 窗口聚焦时重新请求
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
