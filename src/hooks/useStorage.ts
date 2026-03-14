/**
 * 本地存储 Hook
 * 提供与 localStorage/sessionStorage 同步的状态管理
 */

import { useCallback, useState, useEffect } from 'react';

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

/**
 * 从存储中解析 JSON 值
 */
function parseJSON<T>(value: string | null, fallback: T): T {
  if (value === null) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * useLocalStorage Hook
 * 与 localStorage 同步的状态管理
 * @param key 存储键名
 * @param initialValue 初始值
 * @returns [storedValue, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>, () => void] {
  return useStorage(key, initialValue, localStorage);
}

/**
 * useSessionStorage Hook
 * 与 sessionStorage 同步的状态管理
 * @param key 存储键名
 * @param initialValue 初始值
 * @returns [storedValue, setValue, removeValue]
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>, () => void] {
  return useStorage(key, initialValue, sessionStorage);
}

/**
 * 通用存储 Hook
 */
function useStorage<T>(
  key: string,
  initialValue: T,
  storage: Storage
): [T, SetValue<T>, () => void] {
  // 获取初始值
  const getStoredValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = storage.getItem(key);
      return parseJSON(item, initialValue);
    } catch (error) {
      console.warn(`Error reading storage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key, storage]);

  const [storedValue, setStoredValue] = useState<T>(getStoredValue);

  // 设置值
  const setValue: SetValue<T> = useCallback(
    (value) => {
      if (typeof window === 'undefined') {
        console.warn(
          `Setting storage key "${key}" outside of browser context`
        );
        return;
      }

      try {
        // 支持函数式更新
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // 保存到状态
        setStoredValue(valueToStore);

        // 保存到存储
        if (valueToStore === undefined) {
          storage.removeItem(key);
        } else {
          storage.setItem(key, JSON.stringify(valueToStore));
        }

        // 触发 storage 事件（用于跨标签页同步）
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: JSON.stringify(valueToStore),
            storageArea: storage,
          })
        );
      } catch (error) {
        console.warn(`Error setting storage key "${key}":`, error);
      }
    },
    [key, storage, storedValue]
  );

  // 删除值
  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      storage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing storage key "${key}":`, error);
    }
  }, [initialValue, key, storage]);

  // 监听其他标签页的变化
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key || event.storageArea !== storage) {
        return;
      }

      // 如果值被删除
      if (event.newValue === null) {
        setStoredValue(initialValue);
        return;
      }

      // 更新值
      const newValue = parseJSON(event.newValue, initialValue);
      setStoredValue(newValue);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [initialValue, key, storage]);

  return [storedValue, setValue, removeValue];
}

/**
 * useStorageState Hook
 * 简化版的存储状态，自动选择 localStorage
 */
export function useStorageState<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>] {
  const [value, setValue] = useLocalStorage(key, initialValue);
  return [value, setValue];
}

/**
 * usePersistedState Hook
 * 带有版本控制的持久化状态
 */
export interface PersistedStateOptions<T> {
  /** 版本号，用于数据迁移 */
  version?: number;
  /** 迁移函数 */
  migrate?: (oldState: any, oldVersion: number) => T;
  /** 存储类型 */
  storage?: 'local' | 'session';
}

export function usePersistedState<T>(
  key: string,
  initialValue: T,
  options: PersistedStateOptions<T> = {}
): [T, SetValue<T>, () => void] {
  const { version = 0, migrate, storage: storageType = 'local' } = options;

  const fullKey = `${key}_v${version}`;
  const storage = storageType === 'local' ? localStorage : sessionStorage;

  const getStoredValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      // 先检查当前版本
      const currentVersionItem = storage.getItem(fullKey);
      if (currentVersionItem !== null) {
        return parseJSON(currentVersionItem, initialValue);
      }

      // 如果当前版本不存在，检查旧版本并迁移
      if (migrate) {
        for (let v = version - 1; v >= 0; v--) {
          const oldKey = `${key}_v${v}`;
          const oldItem = storage.getItem(oldKey);
          if (oldItem !== null) {
            const oldState = parseJSON(oldItem, null);
            if (oldState !== null) {
              const migratedState = migrate(oldState, v);
              // 清理旧数据
              storage.removeItem(oldKey);
              return migratedState;
            }
          }
        }
      }

      return initialValue;
    } catch (error) {
      console.warn(`Error reading persisted state "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key, fullKey, migrate, storage, version]);

  const [state, setState] = useState<T>(getStoredValue);

  const setValue: SetValue<T> = useCallback(
    (value) => {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const valueToStore =
          value instanceof Function ? value(state) : value;

        setState(valueToStore);

        if (valueToStore === undefined) {
          storage.removeItem(fullKey);
        } else {
          storage.setItem(fullKey, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting persisted state "${key}":`, error);
      }
    },
    [fullKey, state, storage, key]
  );

  const clearValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      storage.removeItem(fullKey);
      setState(initialValue);
    } catch (error) {
      console.warn(`Error clearing persisted state "${key}":`, error);
    }
  }, [fullKey, initialValue, key, storage]);

  return [state, setValue, clearValue];
}

export default useLocalStorage;
