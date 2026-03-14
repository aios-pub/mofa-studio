/**
 * 应用常量定义
 */

// 应用信息
export const APP_NAME = "AmosClaw";
export const APP_VERSION = "0.1.0";

// 窗口尺寸
export const FLOATING_BALL_SIZE = 60;
export const EXPANDED_MENU_WIDTH = 280;

// 默认配置
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Agent 状态颜色映射
export const AGENT_STATUS_COLORS: Record<string, string> = {
  idle: "#22c55e", // 绿色
  thinking: "#eab308", // 黄色
  tool: "#3b82f6", // 蓝色
  waiting: "#f97316", // 橙色
  error: "#ef4444", // 红色
  offline: "#6b7280", // 灰色
};

// Agent 状态文本
export const AGENT_STATUS_TEXT: Record<string, string> = {
  idle: "空闲",
  thinking: "思考中",
  tool: "调用工具",
  waiting: "等待输入",
  error: "错误",
  offline: "离线",
};

// 存储键名
export const STORAGE_KEYS = {
  THEME: "amos-claw-theme",
  LANGUAGE: "amos-claw-language",
  WINDOW_MODE: "amos-claw-window-mode",
  RECENT_CONVERSATIONS: "amos-claw-recent-conversations",
} as const;
