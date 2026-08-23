/**
 * Lifecycle management hook
 * Provides component mount/unmount detection
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Function that gets the component's mounted state
 * @returns A function that returns whether the component is mounted
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
 * Whether the component is mounted
 * @returns Whether mounted
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
 * Callback on unmount
 * @param callback Callback executed on unmount
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
 * Callback after first render
 * @param callback Callback executed after first render
 */
export function useMount(callback: () => void): void {
  useEffect(() => {
    callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Value from the previous render
 * @param value Current value
 * @returns Value from the previous render
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Value from the previous render (with initial value)
 * @param value Current value
 * @param initialValue Initial value
 * @returns Value from the previous render
 */
export function usePreviousWithInitial<T>(value: T, initialValue: T): T {
  const ref = useRef<T>(initialValue);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Callback on update
 * @param callback Callback executed on update
 * @param deps Dependency array
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
 * Force component re-render
 * @returns Force update function
 */
export function useForceUpdate(): () => void {
  const [, setState] = useState(0);

  return useCallback(() => {
    setState((prev) => prev + 1);
  }, []);
}

/**
 * Run callback only when dependencies change (skip first render)
 * @param callback Callback to execute
 * @param deps Dependency array
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
