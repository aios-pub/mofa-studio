/**
 * 生命周期管理 Hook
 * 提供组件挂载/卸载状态检测
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 获取组件挂载状态的函数
 * @returns 返回一个函数，调用后返回组件是否已挂载
 */
export function useMountedState(): () => boolean {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}

/**
 * 组件是否已挂载
 * @returns 是否已挂载
 */
export function useMounted(): boolean {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted.current;
}

/**
 * 组件卸载时的回调
 * @param callback 卸载时执行的回调函数
 */
export function useUnmount(callback: () => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return () => {
      callbackRef.current();
    };
  }, []);
}

/**
 * 组件首次渲染后的回调
 * @param callback 首次渲染后执行的回调函数
 */
export function useMount(callback: () => void): void {
  useEffect(() => {
    callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * 上一轮渲染的值
 * @param value 当前值
 * @returns 上一轮渲染的值
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * 上一轮渲染的值（带初始值）
 * @param value 当前值
 * @param initialValue 初始值
 * @returns 上一轮渲染的值
 */
export function usePreviousWithInitial<T>(value: T, initialValue: T): T {
  const ref = useRef<T>(initialValue);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * 组件更新时的回调
 * @param callback 更新时执行的回调函数
 * @param deps 依赖数组
 */
export function useUpdateEffect(
  callback: () => void | (() => void),
  deps: React.DependencyList
): void {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    return callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * 强制组件重新渲染
 * @returns 强制更新的函数
 */
export function useForceUpdate(): () => void {
  const [, setState] = useState(0);

  return useCallback(() => {
    setState((prev) => prev + 1);
  }, []);
}

/**
 * 只在依赖变化时执行回调（跳过首次渲染）
 * @param callback 执行的回调
 * @param deps 依赖数组
 */
export function useDidChange(
  callback: () => void,
  deps: React.DependencyList
): void {
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default {
  useMountedState,
  useMounted,
  useUnmount,
  useMount,
  usePrevious,
  usePreviousWithInitial,
  useUpdateEffect,
  useForceUpdate,
  useDidChange,
};
