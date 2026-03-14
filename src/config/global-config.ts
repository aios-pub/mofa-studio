/**
 * 全局应用配置
 * 参考 slash-admin 的配置模式
 */

import pkg from '../../package.json';

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
  /** 路由模式 */
  routerMode: 'frontend' | 'backend';
  /** 应用标题 */
  appTitle: string;
};

/**
 * 全局配置常量
 * 从环境变量和 package.json 读取配置
 */
export const GLOBAL_CONFIG: GlobalConfig = {
  appName: 'Amos Claw',
  appVersion: pkg.version,
  defaultRoute: import.meta.env.VITE_APP_DEFAULT_ROUTE || '/workbench',
  publicPath: import.meta.env.VITE_APP_PUBLIC_PATH || '/',
  apiBaseUrl: import.meta.env.VITE_APP_API_BASE_URL || '/api',
  routerMode: (import.meta.env.VITE_APP_ROUTER_MODE as 'frontend' | 'backend') || 'frontend',
  appTitle: import.meta.env.VITE_APP_TITLE || 'Amos Claw - AI Agent Management',
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
  ThemeMode: 'amos-claw-theme-mode',
  Settings: 'amos-claw-settings',
  Token: 'amos-claw-token',
  User: 'amos-claw-user',
  Language: 'amos-claw-language',
} as const;

/**
 * 主题模式枚举
 */
export const ThemeMode = {
  Light: 'light',
  Dark: 'dark',
  System: 'system',
} as const;

export type ThemeModeType = (typeof ThemeMode)[keyof typeof ThemeMode];

/**
 * 主题布局枚举
 */
export const ThemeLayout = {
  Vertical: 'vertical',
  Horizontal: 'horizontal',
  Mini: 'mini',
} as const;

export type ThemeLayoutType = (typeof ThemeLayout)[keyof typeof ThemeLayout];

/**
 * 主题颜色预设枚举
 */
export const ThemeColorPresets = {
  Default: 'default',
  Cyan: 'cyan',
  Purple: 'purple',
  Blue: 'blue',
  Orange: 'orange',
  Red: 'red',
} as const;

export type ThemeColorPresetsType = (typeof ThemeColorPresets)[keyof typeof ThemeColorPresets];

/**
 * HTML data 属性
 */
export const HtmlDataAttribute = {
  ThemeMode: 'data-theme-mode',
  ColorPalette: 'data-color-palette',
} as const;
