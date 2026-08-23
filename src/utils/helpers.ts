/**
 * Common utility functions
 */

// ==================== UUID generation ====================

/**
 * Generate UUID v4
 * @returns UUID string
 */
export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate short ID
 * @param length Length, defaults to 8
 * @returns Short ID string
 */
export function shortId(length = 8): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate unique ID (with prefix)
 * @param prefix Prefix
 * @returns Unique ID
 */
export function uniqueId(prefix = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ==================== Async utilities ====================

/**
 * Delayed execution
 * @param ms Delay in milliseconds
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Promise with timeout
 * @param promise Promise
 * @param ms Timeout
 * @param error Timeout error
 * @returns Promise
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  error = "Timeout",
): Promise<T> {
  const timer = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(error)), ms);
  });
  return Promise.race([promise, timer]);
}

/**
 * Retry function
 * @param fn Function to execute
 * @param retries Retry count
 * @param delay Retry interval
 * @returns Promise
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < retries - 1) {
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ==================== Null checks ====================

/**
 * Check whether the value is empty
 * @param value Value to check
 * @returns Whether empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * Check whether the value is not empty
 * @param value Value to check
 * @returns Whether value is not empty
 */
export function isNotEmpty<T>(value: T | null | undefined): value is T {
  return !isEmpty(value);
}

/**
 * Check whether the value is null or undefined
 * @param value Value to check
 * @returns Whether value is null or undefined
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check whether the value is not null or undefined
 * @param value Value to check
 * @returns Whether value is not null or undefined
 */
export function isNotNil<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// ==================== Object operations ====================

/**
 * Omit some properties of an object
 * @param obj Object
 * @param keys Keys to omit
 * @returns New object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Pick some properties of an object
 * @param obj Object
 * @param keys Keys to pick
 * @returns New object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Merge objects (deep)
 * @param target Target object
 * @param sources Source objects
 * @returns Merged object
 */
export function deepMerge<T extends object>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;

  const source = sources.shift();

  if (source === undefined) return target;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = (target as Record<string, unknown>)[key];

      if (
        typeof sourceValue === "object" &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === "object" &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        (target as Record<string, unknown>)[key] = deepMerge(
          targetValue as object,
          sourceValue as object,
        );
      } else {
        (target as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return deepMerge(target, ...sources);
}

// ==================== Deep comparison ====================

/**
 * Deep-compare two values for equality
 * @param a First value
 * @param b Second value
 * @returns Whether equal
 */
export function isEqual(a: unknown, b: unknown): boolean {
  // Same reference
  if (a === b) {
    return true;
  }

  // Either value is null or undefined
  if (a == null || b == null) {
    return false;
  }

  // Different types
  if (typeof a !== typeof b) {
    return false;
  }

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => isEqual(item, b[index]));
  }

  // Object comparison
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) {
      return false;
    }

    return keysA.every((key) => {
      return (
        Object.prototype.hasOwnProperty.call(b, key) &&
        isEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        )
      );
    });
  }

  return false;
}

/**
 * Shallow-compare two values for equality
 * @param a First value
 * @param b Second value
 * @returns Whether equal
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every((key) => {
    return (
      Object.prototype.hasOwnProperty.call(b, key) &&
      (a as Record<string, unknown>)[key] ===
        (b as Record<string, unknown>)[key]
    );
  });
}

// ==================== Array operations ====================

/**
 * Array deduplication
 * @param arr Array
 * @param key Deduplication key (for object arrays)
 * @returns Deduplicated array
 */
export function unique<T>(arr: T[], key?: keyof T): T[] {
  if (key) {
    const seen = new Set();
    return arr.filter((item) => {
      const k = item[key];
      if (seen.has(k)) {
        return false;
      }
      seen.add(k);
      return true;
    });
  }
  return [...new Set(arr)];
}

/**
 * Array grouping
 * @param arr Array
 * @param key Group key or function
 * @returns Grouped object
 */
export function groupBy<T, K extends string | number>(
  arr: T[],
  key: keyof T | ((item: T) => K),
): Record<K, T[]> {
  return arr.reduce(
    (result, item) => {
      const groupKey = typeof key === "function" ? key(item) : (item[key] as K);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<K, T[]>,
  );
}

/**
 * Array sorting
 * @param arr Array
 * @param key Sort key or function
 * @param order Sort direction
 * @returns Sorted array
 */
export function sortBy<T>(
  arr: T[],
  key: keyof T | ((item: T) => number | string),
  order: "asc" | "desc" = "asc",
): T[] {
  return [...arr].sort((a, b) => {
    const valueA = typeof key === "function" ? key(a) : a[key];
    const valueB = typeof key === "function" ? key(b) : b[key];

    if (valueA < valueB) return order === "asc" ? -1 : 1;
    if (valueA > valueB) return order === "asc" ? 1 : -1;
    return 0;
  });
}

// ==================== Function utilities ====================

/**
 * No-op function
 */
export function noop(): void {
  // do nothing
}

/**
 * Identity function
 * @param value Value
 * @returns Original value
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * Create range array
 * @param start Start
 * @param end End
 * @param step Step size
 * @returns Array
 */
export function range(start: number, end?: number, step = 1): number[] {
  const result: number[] = [];

  if (end === undefined) {
    end = start;
    start = 0;
  }

  for (let i = start; i < end; i += step) {
    result.push(i);
  }

  return result;
}

export default {
  uuid,
  shortId,
  uniqueId,
  sleep,
  timeout,
  retry,
  isEmpty,
  isNotEmpty,
  isNil,
  isNotNil,
  omit,
  pick,
  deepMerge,
  isEqual,
  shallowEqual,
  unique,
  groupBy,
  sortBy,
  noop,
  identity,
  range,
};
