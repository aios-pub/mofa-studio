/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 应用标题 */
  readonly VITE_APP_TITLE: string;
  /** 应用版本 */
  readonly VITE_APP_VERSION: string;
  /** 服务端 URL (同时作为 API 基础 URL) */
  readonly VITE_APP_SERVER_URL: string;
  /** API 超时时间 */
  readonly VITE_APP_API_TIMEOUT: string;
  /** 是否启用 Mock 数据 */
  readonly VITE_APP_ENABLE_MOCK: string;
  /** 悬浮球模式 */
  readonly VITE_APP_FLOATING_MODE: "floating" | "window";
  /** 是否启用分析 */
  readonly VITE_APP_ENABLE_ANALYTICS: string;
  /** 是否启用调试 */
  readonly VITE_APP_ENABLE_DEBUG: string;
  /** 默认路由 */
  readonly VITE_APP_DEFAULT_ROUTE: string;
  /** 静态资源公共路径 */
  readonly VITE_APP_PUBLIC_PATH: string;
  /** 路由模式 */
  readonly VITE_APP_ROUTER_MODE: "frontend" | "backend";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
