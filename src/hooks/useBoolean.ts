/**
 * 布尔值状态管理 Hook
 * 提供便捷的布尔值操作方法
 */

import { useCallback, useState } from 'react';

export interface UseBooleanReturn {
  /** 当前值 */
  value: boolean;
  /** 设置为 true */
  setTrue: () => void;
  /** 设置为 false */
  setFalse: () => void;
  /** 切换值 */
  toggle: () => void;
  /** 设置指定值 */
  setValue: (value: boolean) => void;
}

/**
 * 布尔值状态管理 Hook
 * @param defaultValue 默认值，默认为 false
 * @returns 布尔值状态和操作方法
 */
export function useBoolean(defaultValue = false): UseBooleanReturn {
  const [value, setValue] = useState(defaultValue);

  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue((v) => !v), []);

  return {
    value,
    setTrue,
    setFalse,
    toggle,
    setValue,
  };
}

export default useBoolean;

/**
 * useToggle Hook
 * 支持在多个值之间切换
 */
export function useToggle<T>(options: [T, T]): [T, () => void];
export function useToggle<T>(options: T[]): [T, (value?: T) => void];
export function useToggle<T>(options: T[]): [T, (value?: T) => void] {
  const [index, setIndex] = useState(0);

  const toggle = useCallback(
    (value?: T) => {
      if (value !== undefined) {
        const newIndex = options.indexOf(value);
        if (newIndex !== -1) {
          setIndex(newIndex);
        }
      } else {
        setIndex((prev) => (prev + 1) % options.length);
      }
    },
    [options]
  );

  return [options[index], toggle];
}

/**
 * useCounter Hook
 * 计数器状态管理
 */
export interface UseCounterOptions {
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步长 */
  step?: number;
}

export interface UseCounterReturn {
  /** 当前值 */
  count: number;
  /** 增加计数 */
  increment: () => void;
  /** 减少计数 */
  decrement: () => void;
  /** 重置计数 */
  reset: () => void;
  /** 设置计数 */
  setCount: (value: number) => void;
}

export function useCounter(
  initialValue = 0,
  options: UseCounterOptions = {}
): UseCounterReturn {
  const { min, max, step = 1 } = options;
  const [count, setCount] = useState(initialValue);

  const clamp = useCallback(
    (value: number) => {
      let result = value;
      if (min !== undefined) result = Math.max(min, result);
      if (max !== undefined) result = Math.min(max, result);
      return result;
    },
    [min, max]
  );

  const increment = useCallback(() => {
    setCount((prev) => clamp(prev + step));
  }, [step, clamp]);

  const decrement = useCallback(() => {
    setCount((prev) => clamp(prev - step));
  }, [step, clamp]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const handleSetCount = useCallback(
    (value: number) => {
      setCount(clamp(value));
    },
    [clamp]
  );

  return {
    count,
    increment,
    decrement,
    reset,
    setCount: handleSetCount,
  };
}
