/**
 * Global application configuration
 */

import pkg from "../../package.json";

/** Floating ball mode types */
export type FloatingMode = "floating" | "window";

/**
 * Server configuration
 */
export const SERVER_CONFIG = {
  /** Local development environment */
  development: {
    baseURL: "http://localhost:3002",
    wsURL: "ws://localhost:3002",
  },
  /** Production environment */
  production: {
    baseURL: "https://agentos.aios.pub",
    wsURL: "wss://agentos.aios.pub",
  },
} as const;

/**
 * Get server URL
 */
export function getServerURL(): string {
  const envURL = import.meta.env.VITE_APP_SERVER_URL;
  if (envURL) return envURL;

  return import.meta.env.DEV
    ? SERVER_CONFIG.development.baseURL
    : SERVER_CONFIG.production.baseURL;
}

/**
 * Get WebSocket URL
 */
export function getWebSocketURL(): string {
  return import.meta.env.DEV
    ? SERVER_CONFIG.development.wsURL
    : SERVER_CONFIG.production.wsURL;
}

/**
 * Whether to enable Mock data
 */
export function isMockEnabled(): boolean {
  const mockEnv = import.meta.env.VITE_APP_ENABLE_MOCK;
  // If the environment variable is set, use its value
  if (mockEnv !== undefined) {
    return mockEnv === "true" || mockEnv === "1";
  }
  // Default: mock enabled in development, disabled in production
  return import.meta.env.DEV;
}

/**
 * Global configuration type definition
 */
export type GlobalConfig = {
  /** Application name */
  appName: string;
  /** Application version */
  appVersion: string;
  /** Default route */
  defaultRoute: string;
  /** Static assets public path */
  publicPath: string;
  /** Server URL (also serves as API base URL) */
  serverURL: string;
  /** API request timeout (ms) */
  apiTimeout: number;
  /** Routing mode */
  routerMode: "frontend" | "backend";
  /** Application title */
  appTitle: string;
  /** Floating ball mode */
  floatingMode: FloatingMode;
  /** Is floating ball mode */
  isFloatingMode: boolean;
  /** Whether to enable analytics */
  enableAnalytics: boolean;
  /** Whether to enable debug */
  enableDebug: boolean;
  /** WebSocket URL */
  wsURL: string;
  /** Whether to enable Mock */
  enableMock: boolean;
};

/**
 * Parse boolean environment variable
 */
function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1";
}

/**
 * Parse numeric environment variable
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get floating ball mode
 */
function getFloatingMode(): FloatingMode {
  const mode = import.meta.env.VITE_APP_FLOATING_MODE;
  if (mode === "floating" || mode === "window") {
    return mode;
  }
  return "window"; // default to window mode
}

/**
 * Global configuration constants
 * Read configuration from environment variables and package.json
 */
export const GLOBAL_CONFIG: GlobalConfig = {
  appName: "mofa-studio",
  appVersion: pkg.version,
  defaultRoute: import.meta.env.VITE_APP_DEFAULT_ROUTE || "/workbench",
  publicPath: import.meta.env.VITE_APP_PUBLIC_PATH || "/",
  serverURL: getServerURL(),
  apiTimeout: parseNumber(import.meta.env.VITE_APP_API_TIMEOUT, 30000),
  routerMode:
    (import.meta.env.VITE_APP_ROUTER_MODE as "frontend" | "backend") ||
    "frontend",
  appTitle: import.meta.env.VITE_APP_TITLE || "mofa-studio - AI Agent Management",
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
  wsURL: getWebSocketURL(),
  enableMock: isMockEnabled(),
};

/**
 * Layout configuration
 */
export const LAYOUT_CONFIG = {
  /** Sidebar width */
  navWidth: 260,
  /** Collapsed sidebar width */
  navWidthMini: 80,
  /** Header height */
  headerHeight: 64,
  /** Horizontal nav height */
  navHeightHorizontal: 48,
  /** Multi-tab height */
  multiTabsHeight: 40,
} as const;

/**
 * Storage key name enum
 */
export const StorageEnum = {
  ThemeMode: "mofa-studio-theme-mode",
  Settings: "mofa-studio-settings",
  Token: "mofa-studio-token",
  User: "mofa-studio-user",
  Language: "mofa-studio-language",
} as const;

/**
 * Theme mode enum
 */
export const ThemeMode = {
  Light: "light",
  Dark: "dark",
  System: "system",
} as const;

export type ThemeModeType = (typeof ThemeMode)[keyof typeof ThemeMode];

/**
 * Theme layout enum
 */
export const ThemeLayout = {
  Vertical: "vertical",
  Horizontal: "horizontal",
  Mini: "mini",
} as const;

export type ThemeLayoutType = (typeof ThemeLayout)[keyof typeof ThemeLayout];

/**
 * Theme color preset enum
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
 * HTML data attributes
 */
export const HtmlDataAttribute = {
  ThemeMode: "data-theme-mode",
  ColorPalette: "data-color-palette",
} as const;
