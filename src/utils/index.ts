/**
 * Utility library
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ==================== Class name utilities ====================

/**
 * Merge Tailwind CSS class names
 * Use clsx for conditional class names and tailwind-merge for conflicts
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ==================== URL utilities ====================

/**
 * Safely join URL
 * Automatically handle redundant slashes
 * @param parts URL segments
 * @returns Joined URL
 */
export function urlJoin(...parts: string[]): string {
  return parts
    .map((part, index) => {
      if (index === 0) {
        return part.replace(/\/+$/, "");
      }
      if (index === parts.length - 1) {
        return part.replace(/^\/+/, "");
      }
      return part.replace(/^\/+/, "").replace(/\/+$/, "");
    })
    .join("/");
}

// ==================== Array check utilities ====================

/**
 * Check whether any array element satisfies the condition
 * @param arr Array
 * @param predicate Predicate function
 * @returns Whether any element satisfies the condition
 */
export function checkAny<T>(
  arr: T[],
  predicate: (item: T) => boolean,
): boolean {
  return arr.some(predicate);
}

/**
 * Check whether all array elements satisfy the condition
 * @param arr Array
 * @param predicate Predicate function
 * @returns Whether all elements satisfy the condition
 */
export function checkAll<T>(
  arr: T[],
  predicate: (item: T) => boolean,
): boolean {
  return arr.every(predicate);
}

// ==================== Storage utilities ====================

/**
 * Local storage utilities
 */
export const storage = {
  /**
   * Get storage item
   * @param key Key name
   * @param defaultValue Default value
   * @returns Stored value or default
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
   * Get string storage item
   * @param key Key name
   * @returns Stored string or null
   */
  getString(key: string): string | null {
    return localStorage.getItem(key);
  },

  /**
   * Set storage item
   * @param key Key name
   * @param value Value
   */
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  },

  /**
   * Set string storage item
   * @param key Key name
   * @param value String value
   */
  setString(key: string, value: string): void {
    localStorage.setItem(key, value);
  },

  /**
   * Remove storage item
   * @param key Key name
   */
  remove(key: string): void {
    localStorage.removeItem(key);
  },

  /**
   * Remove all storage items
   */
  clear(): void {
    localStorage.clear();
  },

  /**
   * Remove storage items matching a prefix
   * @param prefix Key prefix
   */
  clearByPrefix(prefix: string): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },
};

/**
 * Conversation storage utilities
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
      console.error("Failed to save to sessionStorage:", error);
    }
  },

  remove(key: string): void {
    window.sessionStorage.removeItem(key);
  },

  clear(): void {
    window.sessionStorage.clear();
  },
};

// ==================== Clipboard utilities ====================

/**
 * Copy text to clipboard
 * @param text Text to copy
 * @returns Whether successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback: use document.execCommand
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    return successful;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

// ==================== Color utilities ====================

/**
 * Convert hex color to color with opacity
 * @param hex Hex color value
 * @param alpha Opacity (0-1)
 * @returns rgba color string
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

// ==================== String utilities ====================

/**
 * Capitalize first letter
 * @param str String
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate unique ID
 * @param prefix Prefix
 * @returns Unique ID
 */
export function generateId(prefix = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Format file size
 * @param bytes Number of bytes
 * @returns Formatted string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ==================== Date utilities ====================

/**
 * Parse backend date strings uniformly into Date objects
 * Backend format example: "2026-04-13T07:41:16.516682" (ISO 8601 without timezone)
 */
export function parseDate(date: Date | string | number): Date {
  return new Date(date);
}

/**
 * Format date to standard display format
 * @param date Backend date string or Date object
 * @param format Format type: 'datetime' | 'date' | 'time' | 'short'
 * @returns Formatted string
 */
export function formatDate(
  date: Date | string | number | undefined | null,
  format: 'datetime' | 'date' | 'time' | 'short' = 'datetime',
): string {
  if (!date) return '-';
  const d = parseDate(date);
  if (isNaN(d.getTime())) return '-';

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    datetime: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
    date: { year: 'numeric', month: '2-digit', day: '2-digit' },
    time: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
    short: { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
  };
  return d.toLocaleString('zh-CN', optionsMap[format]);
}

/**
 * Format relative time
 * @param date Date
 * @returns Relative time string
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

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  if (weeks < 4) return `${weeks} 周前`;
  if (months < 12) return `${months} 月前`;
  return `${years} 年前`;
}

// ==================== Debounce/throttle utilities ====================

/**
 * Debounce function
 * @param fn Function to execute
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;

  return function (...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 * @param fn Function to execute
 * @param delay Interval in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
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

// ==================== Validation utilities ====================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone number format (China)
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ==================== Tree data utilities ====================

export * from "./tree";

// ==================== Number formatting utilities ====================

export * from "./format-number";

// ==================== Common utilities ====================

export * from "./helpers";

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
