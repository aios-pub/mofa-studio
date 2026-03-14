/**
 * 工具函数库
 * 参考 slash-admin 的实现
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ==================== 类名工具 ====================

/**
 * 合并 Tailwind CSS 类名
 * 使用 clsx 处理条件类名，使用 tailwind-merge 处理冲突
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ==================== URL 工具 ====================

/**
 * 安全拼接 URL
 * 自动处理多余的斜杠
 * @param parts URL 片段
 * @returns 拼接后的 URL
 */
export function urlJoin(...parts: string[]): string {
  return parts
    .map((part, index) => {
      if (index === 0) {
        return part.replace(/\/+$/, '');
      }
      if (index === parts.length - 1) {
        return part.replace(/^\/+/, '');
      }
      return part.replace(/^\/+/, '').replace(/\/+$/, '');
    })
    .join('/');
}

// ==================== 数组检查工具 ====================

/**
 * 检查数组中是否有任意一个元素满足条件
 * @param arr 数组
 * @param predicate 条件函数
 * @returns 是否有满足条件的元素
 */
export function checkAny<T>(arr: T[], predicate: (item: T) => boolean): boolean {
  return arr.some(predicate);
}

/**
 * 检查数组中是否所有元素都满足条件
 * @param arr 数组
 * @param predicate 条件函数
 * @returns 是否所有元素都满足条件
 */
export function checkAll<T>(arr: T[], predicate: (item: T) => boolean): boolean {
  return arr.every(predicate);
}

// ==================== 存储工具 ====================

/**
 * 本地存储工具
 */
export const storage = {
  /**
   * 获取存储项
   * @param key 键名
   * @param defaultValue 默认值
   * @returns 存储的值或默认值
   */
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue ?? null;
      }
      return JSON.parse(item) as T;
    } catch {
      return defaultValue ?? null;
    }
  },

  /**
   * 获取字符串存储项
   * @param key 键名
   * @returns 存储的字符串或 null
   */
  getString(key: string): string | null {
    return localStorage.getItem(key);
  },

  /**
   * 设置存储项
   * @param key 键名
   * @param value 值
   */
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  /**
   * 设置字符串存储项
   * @param key 键名
   * @param value 字符串值
   */
  setString(key: string, value: string): void {
    localStorage.setItem(key, value);
  },

  /**
   * 移除存储项
   * @param key 键名
   */
  remove(key: string): void {
    localStorage.removeItem(key);
  },

  /**
   * 清除所有存储项
   */
  clear(): void {
    localStorage.clear();
  },

  /**
   * 清除匹配前缀的存储项
   * @param prefix 键名前缀
   */
  clearByPrefix(prefix: string): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  },
};

/**
 * 会话存储工具
 */
export const sessionStorage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = window.sessionStorage.getItem(key);
      if (item === null) {
        return defaultValue ?? null;
      }
      return JSON.parse(item) as T;
    } catch {
      return defaultValue ?? null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to sessionStorage:', error);
    }
  },

  remove(key: string): void {
    window.sessionStorage.removeItem(key);
  },

  clear(): void {
    window.sessionStorage.clear();
  },
};

// ==================== 剪贴板工具 ====================

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns 是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // 回退方案：使用 document.execCommand
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    return successful;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// ==================== 颜色工具 ====================

/**
 * 将十六进制颜色转换为带透明度的颜色
 * @param hex 十六进制颜色值
 * @param alpha 透明度 (0-1)
 * @returns rgba 颜色字符串
 */
export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return hex;
  }

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ==================== 字符串工具 ====================

/**
 * 首字母大写
 * @param str 字符串
 * @returns 首字母大写的字符串
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 生成唯一 ID
 * @param prefix 前缀
 * @returns 唯一 ID
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ==================== 日期工具 ====================

/**
 * 格式化相对时间
 * @param date 日期
 * @returns 相对时间字符串
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const target = new Date(date);
  const diff = now.getTime() - target.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  if (weeks < 4) return `${weeks} 周前`;
  if (months < 12) return `${months} 月前`;
  return `${years} 年前`;
}

// ==================== 防抖节流工具 ====================

/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;

  return function (...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 节流函数
 * @param fn 要执行的函数
 * @param delay 间隔时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function (...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

// ==================== 验证工具 ====================

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 验证手机号格式（中国）
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 验证 URL 格式
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ==================== 树形数据工具 ====================

export * from './tree';

// ==================== 数字格式化工具 ====================

export * from './format-number';

// ==================== 通用工具函数 ====================

export * from './helpers';

export default {
  cn,
  urlJoin,
  checkAny,
  checkAll,
  storage,
  sessionStorage,
  copyToClipboard,
  hexToRgba,
  capitalize,
  generateId,
  formatFileSize,
  formatRelativeTime,
  debounce,
  throttle,
  isValidEmail,
  isValidPhone,
  isValidUrl,
};
