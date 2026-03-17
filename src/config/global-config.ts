/**
 * 全局应用配置
 */

import pkg from "../../package.json";

/** 悬浮球模式类型 */
export type FloatingMode = "floating" | "window";

/**
 * 全局配置类型定义
 */
export type GlobalConfig = {
  /** 应用名称 */
  appName: string;
  /** 应用版本 */
  appVersion: string;
  /** 默认路由 */
  defaultRoute: string;
  /** 静态资源公共路径 */
  publicPath: string;
  /** API 基础 URL */
  apiBaseUrl: string;
  /** API 请求超时时间 (ms) */
  apiTimeout: number;
  /** 路由模式 */
  routerMode: "frontend" | "backend";
  /** 应用标题 */
  appTitle: string;
  /** 悬浮球模式 */
  floatingMode: FloatingMode;
  /** 是否为悬浮球模式 */
  isFloatingMode: boolean;
  /** 是否启用分析 */
  enableAnalytics: boolean;
  /** 是否启用调试 */
  enableDebug: boolean;
};

/**
 * 解析布尔值环境变量
 */
function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1";
}

/**
 * 解析数字环境变量
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 获取悬浮球模式
 */
function getFloatingMode(): FloatingMode {
  const mode = import.meta.env.VITE_APP_FLOATING_MODE;
  if (mode === "floating" || mode === "window") {
    return mode;
  }
  return "window"; // 默认使用窗口模式
}

/**
 * 全局配置常量
 * 从环境变量和 package.json 读取配置
 */
export const GLOBAL_CONFIG: GlobalConfig = {
  appName: "Amos Claw",
  appVersion: pkg.version,
  defaultRoute: import.meta.env.VITE_APP_DEFAULT_ROUTE || "/workbench",
  publicPath: import.meta.env.VITE_APP_PUBLIC_PATH || "/",
  apiBaseUrl: import.meta.env.VITE_APP_API_BASE_URL || "/api",
  apiTimeout: parseNumber(import.meta.env.VITE_APP_API_TIMEOUT, 30000),
  routerMode:
    (import.meta.env.VITE_APP_ROUTER_MODE as "frontend" | "backend") ||
    "frontend",
  appTitle: import.meta.env.VITE_APP_TITLE || "Amos Claw - AI Agent Management",
  floatingMode: getFloatingMode(),
  isFloatingMode: getFloatingMode() === "floating",
  enableAnalytics: parseBoolean(
    import.meta.env.VITE_APP_ENABLE_ANALYTICS,
    false,
  ),
  enableDebug: parseBoolean(
    import.meta.env.VITE_APP_ENABLE_DEBUG,
    import.meta.env.DEV,
  ),
};

/**
 * 布局配置
 */
export const LAYOUT_CONFIG = {
  /** 侧边栏宽度 */
  navWidth: 260,
  /** 收缩侧边栏宽度 */
  navWidthMini: 80,
  /** 头部高度 */
  headerHeight: 64,
  /** 水平导航高度 */
  navHeightHorizontal: 48,
  /** 多标签页高度 */
  multiTabsHeight: 40,
} as const;

/**
 * 存储键名枚举
 */
export const StorageEnum = {
  ThemeMode: "amos-claw-theme-mode",
  Settings: "amos-claw-settings",
  Token: "amos-claw-token",
  User: "amos-claw-user",
  Language: "amos-claw-language",
} as const;

/**
 * 主题模式枚举
 */
export const ThemeMode = {
  Light: "light",
  Dark: "dark",
  System: "system",
} as const;

export type ThemeModeType = (typeof ThemeMode)[keyof typeof ThemeMode];

/**
 * 主题布局枚举
 */
export const ThemeLayout = {
  Vertical: "vertical",
  Horizontal: "horizontal",
  Mini: "mini",
} as const;

export type ThemeLayoutType = (typeof ThemeLayout)[keyof typeof ThemeLayout];

/**
 * 主题颜色预设枚举
 */
export const ThemeColorPresets = {
  Default: "default",
  Cyan: "cyan",
  Purple: "purple",
  Blue: "blue",
  Orange: "orange",
  Red: "red",
} as const;

export type ThemeColorPresetsType =
  (typeof ThemeColorPresets)[keyof typeof ThemeColorPresets];

/**
 * HTML data 属性
 */
export const HtmlDataAttribute = {
  ThemeMode: "data-theme-mode",
  ColorPalette: "data-color-palette",
} as const;
