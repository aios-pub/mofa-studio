/**
 * Local storage hook
 * Provides state management synced with localStorage/sessionStorage
 */

import { useCallback, useState, useEffect } from 'react';

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

/**
 * Parse JSON value from storage
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
 * State management synced with localStorage
 * @param key Storage key names
 * @param initialValue Initial value
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
 * State management synced with sessionStorage
 * @param key Storage key names
 * @param initialValue Initial value
 * @returns [storedValue, setValue, removeValue]
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>, () => void] {
  return useStorage(key, initialValue, sessionStorage);
}

/**
 * Generic storage hook
 */
function useStorage<T>(
  key: string,
  initialValue: T,
  storage: Storage
): [T, SetValue<T>, () => void] {
  // Get initial value
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

  // Set value
  const setValue: SetValue<T> = useCallback(
    (value) => {
      if (typeof window === 'undefined') {
        console.warn(
          `Setting storage key "${key}" outside of browser context`
        );
        return;
      }

      try {
        // Supports functional updates
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // Save to state
        setStoredValue(valueToStore);

        // Save to storage
        if (valueToStore === undefined) {
          storage.removeItem(key);
        } else {
          storage.setItem(key, JSON.stringify(valueToStore));
        }

        // Dispatch a storage event (for cross-tab sync)
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

  // Delete value
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

  // Watch other tabs' changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key || event.storageArea !== storage) {
        return;
      }

      // If the value was deleted
      if (event.newValue === null) {
        setStoredValue(initialValue);
        return;
      }

      // Update value
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
 * Simplified storage state, auto-selects localStorage
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
 * Persistent state with version control
 */
export interface PersistedStateOptions<T> {
  /** Version number for data migration */
  version?: number;
  /** Migration functions */
  migrate?: (oldState: any, oldVersion: number) => T;
  /** Storage type */
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
      // Check the current version first
      const currentVersionItem = storage.getItem(fullKey);
      if (currentVersionItem !== null) {
        return parseJSON(currentVersionItem, initialValue);
      }

      // If the current version does not exist, check the old version and migrate
      if (migrate) {
        for (let v = version - 1; v >= 0; v--) {
          const oldKey = `${key}_v${v}`;
          const oldItem = storage.getItem(oldKey);
          if (oldItem !== null) {
            const oldState = parseJSON(oldItem, null);
            if (oldState !== null) {
              const migratedState = migrate(oldState, v);
              // Clean up old data
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
