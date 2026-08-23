/**
 * 通用工具函数
 */

// ==================== UUID 生成 ====================

/**
 * 生成 UUID v4
 * @returns UUID 字符串
 */
export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成短 ID
 * @param length 长度，默认 8
 * @returns 短 ID 字符串
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
 * 生成唯一 ID（带前缀）
 * @param prefix 前缀
 * @returns 唯一 ID
 */
export function uniqueId(prefix = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ==================== 异步工具 ====================

/**
 * 延迟执行
 * @param ms 延迟时间（milliseconds）
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带超时的 Promise
 * @param promise Promise
 * @param ms 超时时间
 * @param error 超时Error information
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
 * 重试函数
 * @param fn 要执行的函数
 * @param retries 重试次数
 * @param delay 重试间隔
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

// ==================== 空值检查 ====================

/**
 * 检查值是否为空
 * @param value 要检查的值
 * @returns 是否为空
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
 * 检查值是否不为空
 * @param value 要检查的值
 * @returns 是否不为空
 */
export function isNotEmpty<T>(value: T | null | undefined): value is T {
  return !isEmpty(value);
}

/**
 * 检查值是否为 null 或 undefined
 * @param value 要检查的值
 * @returns 是否为 null 或 undefined
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 检查值是否不为 null 或 undefined
 * @param value 要检查的值
 * @returns 是否不为 null 或 undefined
 */
export function isNotNil<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// ==================== 对象操作 ====================

/**
 * 省略对象的某些属性
 * @param obj 对象
 * @param keys 要省略的键
 * @returns 新对象
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
 * 选取对象的某些属性
 * @param obj 对象
 * @param keys 要选取的键
 * @returns 新对象
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
 * 合并对象（深度）
 * @param target 目标对象
 * @param sources 源对象
 * @returns 合并后的对象
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

// ==================== 深度比较 ====================

/**
 * 深度比较两个值是否相等
 * @param a 第一个值
 * @param b 第二个值
 * @returns 是否相等
 */
export function isEqual(a: unknown, b: unknown): boolean {
  // 相同引用
  if (a === b) {
    return true;
  }

  // 其中一个为 null 或 undefined
  if (a == null || b == null) {
    return false;
  }

  // 类型不同
  if (typeof a !== typeof b) {
    return false;
  }

  // 数组比较
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => isEqual(item, b[index]));
  }

  // 对象比较
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
 * 浅比较两个值是否相等
 * @param a 第一个值
 * @param b 第二个值
 * @returns 是否相等
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

// ==================== 数组操作 ====================

/**
 * 数组去重
 * @param arr 数组
 * @param key 去重键（对象数组）
 * @returns 去重后的数组
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
 * 数组分组
 * @param arr 数组
 * @param key 分组键或函数
 * @returns 分组后的对象
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
 * 数组排序
 * @param arr 数组
 * @param key 排序键或函数
 * @param order Sort direction
 * @returns 排序后的数组
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

// ==================== 函数工具 ====================

/**
 * 无操作函数
 */
export function noop(): void {
  // do nothing
}

/**
 * 身份函数
 * @param value 值
 * @returns 原值
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * 创建范围数组
 * @param start 开始
 * @param end 结束
 * @param step 步长
 * @returns 数组
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
