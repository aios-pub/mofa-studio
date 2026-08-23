/**
 * Boolean state management hook
 * Provides convenient boolean operation methods
 */

import { useCallback, useState } from 'react';

export interface UseBooleanReturn {
  /** Current value */
  value: boolean;
  /** Set to true */
  setTrue: () => void;
  /** Set to false */
  setFalse: () => void;
  /** Toggle value */
  toggle: () => void;
  /** Set the given value */
  setValue: (value: boolean) => void;
}

/**
 * Boolean state management hook
 * @param defaultValue Default value, defaults to false
 * @returns Boolean state and operation methods
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
 * Supports toggling between multiple values
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
 * Counter state management
 */
export interface UseCounterOptions {
  /** Minimum */
  min?: number;
  /** Maximum */
  max?: number;
  /** Step size */
  step?: number;
}

export interface UseCounterReturn {
  /** Current value */
  count: number;
  /** Increment count */
  increment: () => void;
  /** Decrement count */
  decrement: () => void;
  /** Reset count */
  reset: () => void;
  /** Set count */
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
