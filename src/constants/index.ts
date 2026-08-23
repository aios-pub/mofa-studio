/**
 * 应用常量定义
 */

// App information
export const APP_NAME = "mofa-studio";
export const APP_VERSION = "0.1.0";

// Window dimensions
export const FLOATING_BALL_SIZE = 60;
export const EXPANDED_MENU_WIDTH = 280;

// Default configuration
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Agent status color mapping
export const AGENT_STATUS_COLORS: Record<string, string> = {
  idle: "#22c55e", // 绿色
  thinking: "#eab308", // 黄色
  tool: "#3b82f6", // 蓝色
  waiting: "#f97316", // 橙色
  error: "#ef4444", // 红色
  offline: "#6b7280", // 灰色
};

// Agent status text
export const AGENT_STATUS_TEXT: Record<string, string> = {
  idle: "空闲",
  thinking: "思考中",
  tool: "调用工具",
  waiting: "等待输入",
  error: "错误",
  offline: "离线",
};

// Storage key names
export const STORAGE_KEYS = {
  THEME: "mofa-studio-theme",
  LANGUAGE: "mofa-studio-language",
  WINDOW_MODE: "mofa-studio-window-mode",
  RECENT_CONVERSATIONS: "mofa-studio-recent-conversations",
} as const;
